import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, DollarSign, Receipt, Users, Printer, Search, History, Download, Trash2, Building2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { generateRapportPDF, generateProprietaireRapportPDF, generateAgenceRapportPDF, imageToBase64 } from "@/lib/pdf-generator";
import logo from "@/assets/logo-panpas.jpg";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const Rapports = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchHistory, setSearchHistory] = useState("");
  const [searchProprietaire, setSearchProprietaire] = useState("");
  const queryClient = useQueryClient();

  type CompleteReportData = {
    proprietaires: any[];
    biens: any[];
    contrats: any[];
    paiements: any[];
    depenses: any[];
  };

  const monthDate = parse(selectedMonth, "yyyy-MM", new Date());
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const isContratActifDansPeriode = (contrat: any, start: Date, end: Date) => {
    const debut = new Date(contrat.date_debut);
    const fin = contrat.date_fin ? new Date(contrat.date_fin) : null;
    return debut <= end && (!fin || fin >= start);
  };

  // Fetch proprietaires
  const { data: proprietaires } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proprietaires").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  // Historique des rapports
  const { data: rapportsHistorique, isLoading: loadingHistorique } = useQuery({
    queryKey: ["rapports-historique"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rapports_historique")
        .select("*")
        .order("date_generation", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Delete report
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rapports_historique").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapports-historique"] });
      toast.success("Rapport supprimé");
    },
    onError: (error: any) => toast.error(`Erreur: ${error.message}`),
  });

  // Save report
  const saveMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const { error } = await supabase.from("rapports_historique").insert({
        mois_concerne: reportData.mois_concerne,
        total_revenus: reportData.total_revenus,
        total_depenses: reportData.total_depenses,
        benefice_net: reportData.benefice_net,
        donnees_json: reportData.donnees_json,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rapports-historique"] }),
  });

  const monthOptions = Array.from({ length: 60 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy", { locale: fr }) };
  });

  // Fetch complete data for reports
  const { data: reportData, isLoading } = useQuery<CompleteReportData>({
    queryKey: ["complete-report-data", selectedMonth],
    queryFn: async () => {
      const start = format(monthStart, "yyyy-MM-dd");
      const end = format(monthEnd, "yyyy-MM-dd");

      try {
        const [proprietairesRes, biensRes, contratsRes, paiementsRes, depensesRes] = await Promise.all([
          supabase.from("proprietaires").select("*"),
          supabase.from("biens").select("*"),
          supabase.from("contrats").select("*, locataires(*)"),
          supabase
            .from("paiements")
            .select("*, biens(*), locataires(*)")
            .or(
              `and(mois_concerne.gte.${start},mois_concerne.lte.${end}),and(mois_concerne.is.null,date_paiement.gte.${start},date_paiement.lte.${end})`
            ),
          supabase
            .from("depenses")
            .select("*, biens(*)")
            .gte("date_depense", start)
            .lte("date_depense", end),
        ]);

        if (proprietairesRes.error) throw proprietairesRes.error;
        if (biensRes.error) throw biensRes.error;
        if (contratsRes.error) throw contratsRes.error;
        if (paiementsRes.error) throw paiementsRes.error;
        if (depensesRes.error) throw depensesRes.error;

        return {
          proprietaires: proprietairesRes.data || [],
          biens: biensRes.data || [],
          contrats: contratsRes.data || [],
          paiements: paiementsRes.data || [],
          depenses: depensesRes.data || [],
        };
      } catch (e: any) {
        toast.error(`Erreur chargement rapports: ${e.message}`);
        throw e;
      }
    },
  });

  // Generate proprietaire report
  const handleGenerateProprietaireReport = async (propId: string) => {
    if (!reportData) return;

    const logoBase64 = await imageToBase64(logo);
    const prop = reportData.proprietaires.find((p) => p.id === propId);
    if (!prop) return;

    const propBiens = reportData.biens.filter((b) => b.proprietaire_id === propId);

    const contratsDuMois = reportData.contrats.filter((c) => {
      const isPropBien = propBiens.some((b) => b.id === c.bien_id);
      return isPropBien && isContratActifDansPeriode(c, monthStart, monthEnd);
    });

    const propPaiements = reportData.paiements.filter((p) => p.biens?.proprietaire_id === propId);
    const propDepenses = reportData.depenses.filter((d) => d.biens?.proprietaire_id === propId);

    const locatairesData = contratsDuMois.map((c) => {
      const bien = propBiens.find((b) => b.id === c.bien_id);

      const paiementsLoc = propPaiements.filter(
        (p) => p.locataire_id === c.locataire_id && p.bien_id === c.bien_id && (p.type === "loyer" || p.type === "avance")
      );

      const montantPaye = paiementsLoc.reduce((s, p) => s + Number(p.montant), 0);
      const loyerMensuel = Number(c.loyer_mensuel);
      const arrieres = Math.max(0, loyerMensuel - montantPaye);

      const moisPayes = paiementsLoc
        .map((p) => {
          const d = p.mois_concerne ? new Date(p.mois_concerne) : new Date(p.date_paiement);
          return d.toLocaleDateString("fr-FR", { month: "short" });
        })
        .filter(Boolean);

      const caution = propPaiements
        .filter((p) => p.locataire_id === c.locataire_id && p.bien_id === c.bien_id && p.type === "caution")
        .reduce((s, p) => s + Number(p.montant), 0);

      return {
        nom: c.locataires?.nom || "N/A",
        bien_nom: bien?.nom || "",
        loyer: loyerMensuel,
        loyers_payes: moisPayes,
        montant_paye: montantPaye,
        arrieres,
        caution_payee: caution,
      };
    });

    const totalLoyers = propPaiements
      .filter((p) => p.type === "loyer" || p.type === "avance")
      .reduce((s, p) => s + Number(p.montant), 0);

    const totalDepenses = propDepenses.reduce((s, d) => s + Number(d.montant), 0);
    const avgCommission =
      propBiens.length > 0
        ? propBiens.reduce((s, b) => s + Number(b.commission_pourcentage), 0) / propBiens.length
        : 10;

    const commission = Math.round((totalLoyers * avgCommission) / 100);

    const biensOccupes = new Set(contratsDuMois.map((c) => c.bien_id));
    const nombreOccupes = biensOccupes.size;
    const nombreLibres = Math.max(0, propBiens.length - nombreOccupes);

    const totalArrieres = locatairesData.reduce((s, l) => s + Number(l.arrieres), 0);

    const data = {
      proprietaire: { id: prop.id, nom: prop.nom, telephone: prop.telephone, email: prop.email },
      biens: propBiens,
      locataires: locatairesData,
      depenses: propDepenses.map((d) => ({
        description: d.description,
        montant: Number(d.montant),
        categorie: d.categorie,
        bien_nom: d.biens?.nom || "",
      })),
      totals: {
        nombre_chambres: propBiens.length,
        nombre_libres: nombreLibres,
        total_loyers: totalLoyers,
        total_arrieres: totalArrieres,
        total_cautions: propPaiements.filter((p) => p.type === "caution").reduce((s, p) => s + Number(p.montant), 0),
        total_depenses: totalDepenses,
        commission,
        somme_a_verser: totalLoyers - totalDepenses - commission,
      },
    };

    await generateProprietaireRapportPDF(data, selectedMonth, logoBase64);
    toast.success(`Rapport généré pour ${prop.nom}`);
  };

  // Generate agency report
  const handleGenerateAgencyReport = async () => {
    if (!reportData) return;
    const logoBase64 = await imageToBase64(logo);

    const contratsDuMois = reportData.contrats.filter((c) => isContratActifDansPeriode(c, monthStart, monthEnd));
    const biensOccupes = new Set(contratsDuMois.map((c) => c.bien_id));
    const locatairesUniques = new Set(contratsDuMois.map((c) => c.locataire_id));

    const proprietairesData = reportData.proprietaires.map((prop) => {
      const propBiens = reportData.biens.filter((b) => b.proprietaire_id === prop.id);
      const propPaiements = reportData.paiements.filter((p) => p.biens?.proprietaire_id === prop.id);
      const propDepenses = reportData.depenses.filter((d) => d.biens?.proprietaire_id === prop.id);

      const totalLoyers = propPaiements
        .filter((p) => p.type === "loyer" || p.type === "avance")
        .reduce((s, p) => s + Number(p.montant), 0);

      const totalDep = propDepenses.reduce((s, d) => s + Number(d.montant), 0);
      const avgComm =
        propBiens.length > 0
          ? propBiens.reduce((s, b) => s + Number(b.commission_pourcentage), 0) / propBiens.length
          : 10;

      const commission = Math.round((totalLoyers * avgComm) / 100);

      return {
        nom: prop.nom,
        total_loyers: totalLoyers,
        total_depenses: totalDep,
        commission,
        somme_versee: totalLoyers - totalDep - commission,
      };
    });

    const data = {
      proprietaires: proprietairesData,
      totals: {
        total_loyers: proprietairesData.reduce((s, p) => s + p.total_loyers, 0),
        total_depenses: proprietairesData.reduce((s, p) => s + p.total_depenses, 0),
        total_commissions: proprietairesData.reduce((s, p) => s + p.commission, 0),
        benefice_net: proprietairesData.reduce((s, p) => s + p.commission, 0),
        nombre_biens: reportData.biens.length,
        nombre_occupes: biensOccupes.size,
        nombre_locataires: locatairesUniques.size,
      },
    };

    await generateAgenceRapportPDF(data, selectedMonth, logoBase64);
    await saveMutation.mutateAsync({
      mois_concerne: selectedMonth,
      total_revenus: data.totals.total_loyers,
      total_depenses: data.totals.total_depenses,
      benefice_net: data.totals.total_commissions,
      donnees_json: data,
    });
    toast.success("Rapport agence généré et sauvegardé");
  };

  const filteredHistorique = rapportsHistorique?.filter(r =>
    r.mois_concerne.includes(searchHistory) ||
    new Date(r.date_generation).toLocaleDateString("fr-FR").includes(searchHistory)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            <FileText className="h-8 w-8 text-primary" />
            Rapports
          </h1>
          <p className="text-muted-foreground mt-1">Rapports par propriétaire et rapport général</p>
        </div>
      </div>

      <Tabs defaultValue="proprietaires" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="proprietaires" className="gap-2"><Building2 className="h-4 w-4" />Propriétaires</TabsTrigger>
          <TabsTrigger value="agence" className="gap-2"><FileText className="h-4 w-4" />Agence</TabsTrigger>
          <TabsTrigger value="historique" className="gap-2"><History className="h-4 w-4" />Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="proprietaires" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un propriétaire..."
                value={searchProprietaire}
                onChange={(e) => setSearchProprietaire(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {(() => {
            const filteredProps = proprietaires?.filter(p =>
              p.nom.toLowerCase().includes(searchProprietaire.toLowerCase())
            ) || [];
            return filteredProps.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProps.map(prop => (
              <Card key={prop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {prop.nom}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{prop.telephone}</p>
                  <Button onClick={() => handleGenerateProprietaireReport(prop.id)} className="w-full gap-2" disabled={isLoading}>
                    <Printer className="h-4 w-4" />
                    Générer Rapport
                  </Button>
                </CardContent>
              </Card>
            ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{searchProprietaire ? `Aucun propriétaire trouvé pour "${searchProprietaire}"` : "Aucun propriétaire enregistré"}</p>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="agence" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateAgencyReport} className="gap-2" disabled={isLoading}>
              <Printer className="h-4 w-4" />
              Générer Rapport Agence
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aperçu du mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Biens gérés</p>
                  <p className="text-2xl font-bold">{reportData?.biens.length || 0}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Occupés</p>
                  <p className="text-2xl font-bold text-green-600">{reportData?.biens.filter(b => b.statut === "occupe").length || 0}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Libres</p>
                  <p className="text-2xl font-bold text-red-600">{reportData?.biens.filter(b => b.statut === "disponible").length || 0}</p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Locataires</p>
                  <p className="text-2xl font-bold text-purple-600">{reportData?.contrats.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historique</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchHistory} onChange={(e) => setSearchHistory(e.target.value)} className="pl-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistorique ? (
                <div className="text-center py-12">Chargement...</div>
              ) : filteredHistorique && filteredHistorique.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mois</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                      <TableHead className="text-right">Dépenses</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistorique.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{new Date(r.mois_concerne + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</Badge></TableCell>
                        <TableCell>{new Date(r.date_generation).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="text-right text-green-600">{Number(r.total_revenus).toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell className="text-right text-red-600">{Number(r.total_depenses).toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Aucun rapport dans l'historique</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rapports;
