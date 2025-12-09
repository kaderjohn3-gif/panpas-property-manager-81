import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, DollarSign, Receipt, Users, Printer, Search, History, Download, Trash2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { generateRapportPDF, imageToBase64 } from "@/lib/pdf-generator";
import logo from "@/assets/logo-panpas.jpg";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Rapports = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [searchHistory, setSearchHistory] = useState("");
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(new Date(selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedMonth));

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

  // Supprimer un rapport
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rapports_historique")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapports-historique"] });
      toast.success("Rapport supprimé");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Sauvegarder un rapport
  const saveMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const { error } = await supabase
        .from("rapports_historique")
        .insert({
          mois_concerne: reportData.mois_concerne,
          total_revenus: reportData.total_revenus,
          total_depenses: reportData.total_depenses,
          benefice_net: reportData.benefice_net,
          donnees_json: reportData.donnees_json,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapports-historique"] });
    },
  });

  const handlePrintReport = async (saveToHistory = true) => {
    if (!financialData) {
      toast.error("Aucune donnée à imprimer");
      return;
    }
    try {
      const logoBase64 = await imageToBase64(logo);
      const reportData = await generateRapportPDF(financialData, selectedMonth, logoBase64);
      
      if (saveToHistory && reportData) {
        await saveMutation.mutateAsync(reportData);
      }
      
      toast.success("Rapport généré et sauvegardé");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erreur lors de la génération du rapport");
    }
  };

  const handleReprintFromHistory = async (rapport: any) => {
    try {
      const logoBase64 = await imageToBase64(logo);
      const financialData = rapport.donnees_json || {
        byProprietaire: [],
        totals: {
          revenus: Number(rapport.total_revenus),
          depenses: Number(rapport.total_depenses),
          benefice: Number(rapport.benefice_net),
        }
      };
      await generateRapportPDF(financialData, rapport.mois_concerne, logoBase64);
      toast.success("Rapport réimprimé");
    } catch (error) {
      console.error("Error reprinting:", error);
      toast.error("Erreur lors de la réimpression");
    }
  };

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: fr })
    };
  });

  const { data: evolutionData } = useQuery({
    queryKey: ["evolution-12-mois"],
    queryFn: async () => {
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), 11 - i);
        return {
          month: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale: fr })
        };
      });

      const monthlyData = await Promise.all(
        last12Months.map(async ({ month, label }) => {
          const monthStart = startOfMonth(new Date(month));
          const monthEnd = endOfMonth(new Date(month));

          const { data: paiements } = await supabase
            .from("paiements")
            .select("montant")
            .gte("date_paiement", format(monthStart, 'yyyy-MM-dd'))
            .lte("date_paiement", format(monthEnd, 'yyyy-MM-dd'));

          const { data: depenses } = await supabase
            .from("depenses")
            .select("montant")
            .gte("date_depense", format(monthStart, 'yyyy-MM-dd'))
            .lte("date_depense", format(monthEnd, 'yyyy-MM-dd'));

          const revenus = paiements?.reduce((sum, p) => sum + Number(p.montant), 0) || 0;
          const charges = depenses?.reduce((sum, d) => sum + Number(d.montant), 0) || 0;

          return {
            mois: label,
            revenus,
            depenses: charges,
            benefice: revenus - charges
          };
        })
      );

      const last3Months = monthlyData.slice(-3);
      const avgRevenus = last3Months.reduce((sum, m) => sum + m.revenus, 0) / 3;
      const avgDepenses = last3Months.reduce((sum, m) => sum + m.depenses, 0) / 3;

      const nextMonth1 = subMonths(new Date(), -1);
      const nextMonth2 = subMonths(new Date(), -2);

      return {
        historical: monthlyData,
        forecast: [
          {
            mois: format(nextMonth1, 'MMM yy', { locale: fr }),
            revenus: avgRevenus,
            depenses: avgDepenses,
            benefice: avgRevenus - avgDepenses,
            prevision: true
          },
          {
            mois: format(nextMonth2, 'MMM yy', { locale: fr }),
            revenus: avgRevenus * 1.02,
            depenses: avgDepenses,
            benefice: (avgRevenus * 1.02) - avgDepenses,
            prevision: true
          }
        ]
      };
    },
  });

  const { data: financialData, isLoading } = useQuery({
    queryKey: ["financial-report", selectedMonth],
    queryFn: async () => {
      const { data: proprietaires } = await supabase
        .from("proprietaires")
        .select("id, nom");

      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, bien_id, biens(proprietaire_id)")
        .gte("date_paiement", format(monthStart, 'yyyy-MM-dd'))
        .lte("date_paiement", format(monthEnd, 'yyyy-MM-dd'));

      const { data: depenses } = await supabase
        .from("depenses")
        .select("montant, bien_id, biens(proprietaire_id)")
        .gte("date_depense", format(monthStart, 'yyyy-MM-dd'))
        .lte("date_depense", format(monthEnd, 'yyyy-MM-dd'));

      const dataByProprietaire = proprietaires?.map(prop => {
        const revenus = paiements
          ?.filter(p => p.biens?.proprietaire_id === prop.id)
          .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

        const charges = depenses
          ?.filter(d => d.biens?.proprietaire_id === prop.id)
          .reduce((sum, d) => sum + Number(d.montant), 0) || 0;

        return {
          nom: prop.nom,
          revenus,
          depenses: charges,
          benefice: revenus - charges
        };
      }) || [];

      const totalRevenus = dataByProprietaire.reduce((sum, d) => sum + d.revenus, 0);
      const totalDepenses = dataByProprietaire.reduce((sum, d) => sum + d.depenses, 0);

      return {
        byProprietaire: dataByProprietaire,
        totals: {
          revenus: totalRevenus,
          depenses: totalDepenses,
          benefice: totalRevenus - totalDepenses
        }
      };
    },
  });

  const pieData = financialData?.byProprietaire
    .filter(d => d.revenus > 0)
    .map(d => ({
      name: d.nom,
      value: d.revenus
    })) || [];

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
            Rapports Financiers
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Analyse et historique des rapports</p>
        </div>
      </div>

      <Tabs defaultValue="rapports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="rapports" className="gap-2">
            <FileText className="h-4 w-4" />
            Rapports
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rapports" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[220px] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handlePrintReport(true)} className="gap-2 h-11">
              <Printer className="h-4 w-4" />
              Générer & Sauvegarder
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover-lift overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-success/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
                    <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold text-success">
                      {financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover-lift overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                    <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Receipt className="h-5 w-5 text-destructive" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold text-destructive">
                      {financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover-lift overflow-hidden relative group sm:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${(financialData?.totals.benefice || 0) >= 0 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                      <DollarSign className={`h-5 w-5 ${(financialData?.totals.benefice || 0) >= 0 ? 'text-primary' : 'text-destructive'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className={`text-3xl font-bold ${(financialData?.totals.benefice || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Evolution chart */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Évolution sur 12 Mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={350} minWidth={300}>
                      <LineChart data={[...(evolutionData?.historical || []), ...(evolutionData?.forecast || [])]}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis dataKey="mois" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                          contentStyle={{ fontSize: 11, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="revenus" stroke="hsl(var(--success))" strokeWidth={2} name="Revenus" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="depenses" stroke="hsl(var(--destructive))" strokeWidth={2} name="Dépenses" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="benefice" stroke="hsl(var(--primary))" strokeWidth={2} name="Bénéfice" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Charts grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Revenus vs Dépenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={financialData?.byProprietaire || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nom" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`} contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="revenus" fill="hsl(var(--success))" name="Revenus" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="depenses" fill="hsl(var(--destructive))" name="Dépenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Répartition des Revenus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detail table */}
              <Card>
                <CardHeader>
                  <CardTitle>Détail par Propriétaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Propriétaire</TableHead>
                          <TableHead className="text-right">Revenus</TableHead>
                          <TableHead className="text-right">Dépenses</TableHead>
                          <TableHead className="text-right">Bénéfice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData?.byProprietaire.map((prop, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{prop.nom}</TableCell>
                            <TableCell className="text-right text-success">{prop.revenus.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell className="text-right text-destructive">{prop.depenses.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell className={`text-right font-bold ${prop.benefice >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {prop.benefice.toLocaleString('fr-FR')} FCFA
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right text-success">{financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell className="text-right text-destructive">{financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA</TableCell>
                          <TableCell className={`text-right ${(financialData?.totals.benefice || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historique des Rapports Générés
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un rapport..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistorique ? (
                <div className="text-center py-12">Chargement...</div>
              ) : filteredHistorique && filteredHistorique.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead>Date Génération</TableHead>
                        <TableHead className="text-right">Revenus</TableHead>
                        <TableHead className="text-right">Dépenses</TableHead>
                        <TableHead className="text-right">Bénéfice</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistorique.map((rapport) => {
                        const moisDate = new Date(rapport.mois_concerne + "-01");
                        const moisLabel = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                        const benefice = Number(rapport.benefice_net);

                        return (
                          <TableRow key={rapport.id}>
                            <TableCell className="font-medium">
                              <Badge variant="outline">
                                {moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(rapport.date_generation).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              {Number(rapport.total_revenus).toLocaleString('fr-FR')} FCFA
                            </TableCell>
                            <TableCell className="text-right text-destructive">
                              {Number(rapport.total_depenses).toLocaleString('fr-FR')} FCFA
                            </TableCell>
                            <TableCell className={`text-right font-bold ${benefice >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {benefice.toLocaleString('fr-FR')} FCFA
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReprintFromHistory(rapport)}
                                  title="Réimprimer"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(rapport.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Aucun rapport dans l'historique</p>
                  <p className="text-sm mt-2">Générez un rapport pour le sauvegarder ici</p>
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