import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const AddPaiementDialog = () => {
  const [open, setOpen] = useState(false);
  const [contratId, setContratId] = useState("");
  const [type, setType] = useState<"loyer" | "avance" | "caution" | "arrieres">("loyer");
  const [montant, setMontant] = useState("");
  const [moisConcerne, setMoisConcerne] = useState(new Date().toISOString().slice(0, 7));
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [nombreMois, setNombreMois] = useState("1");
  const [moisArriereDebut, setMoisArriereDebut] = useState("");
  const [moisArriereFin, setMoisArriereFin] = useState("");
  const queryClient = useQueryClient();

  const { data: contratsActifs } = useQuery({
    queryKey: ["contrats-actifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats")
        .select("*, locataires(nom), biens(nom, loyer_mensuel)")
        .eq("statut", "actif")
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Récupérer les paiements existants pour ce contrat
  const { data: paiementsExistants } = useQuery({
    queryKey: ["paiements-contrat", contratId],
    queryFn: async () => {
      if (!contratId) return [];
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("contrat_id", contratId)
        .order("mois_concerne", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contratId,
  });

  const selectedContrat = contratsActifs?.find((c) => c.id === contratId);

  // Calculer le prochain mois à payer en fonction des paiements existants
  useEffect(() => {
    if (selectedContrat && paiementsExistants && (type === "loyer" || type === "avance")) {
      // Trouver le dernier mois payé (loyer ou avance)
      const paiementsLoyer = paiementsExistants.filter(p => 
        (p.type === "loyer" || p.type === "avance") && p.mois_concerne
      );
      
      if (paiementsLoyer.length > 0) {
        // Trier par mois_concerne décroissant
        const dernierPaiement = paiementsLoyer.sort((a, b) => 
          new Date(b.mois_concerne!).getTime() - new Date(a.mois_concerne!).getTime()
        )[0];
        
        // Calculer le mois suivant
        const dernierMois = new Date(dernierPaiement.mois_concerne!);
        dernierMois.setMonth(dernierMois.getMonth() + 1);
        setMoisConcerne(dernierMois.toISOString().slice(0, 7));
      } else {
        // Si aucun paiement, commencer à la date de début du contrat
        const dateDebut = new Date(selectedContrat.date_debut);
        setMoisConcerne(dateDebut.toISOString().slice(0, 7));
      }
    }
  }, [selectedContrat, paiementsExistants, type]);

  // Calculer le montant en fonction du nombre de mois (loyer ou avance)
  useEffect(() => {
    if (selectedContrat && (type === "loyer" || type === "avance")) {
      const mois = parseInt(nombreMois) || 1;
      setMontant((selectedContrat.loyer_mensuel * mois).toString());
    }
  }, [nombreMois, selectedContrat, type]);

  // Calculer le montant pour les arriérés
  useEffect(() => {
    if (selectedContrat && type === "arrieres" && moisArriereDebut && moisArriereFin) {
      const debut = new Date(`${moisArriereDebut}-01`);
      const fin = new Date(`${moisArriereFin}-01`);
      const moisDiff = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
      if (moisDiff > 0) {
        setMontant((selectedContrat.loyer_mensuel * moisDiff).toString());
      }
    }
  }, [moisArriereDebut, moisArriereFin, selectedContrat, type]);


  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrat) return;

      const nbMois = parseInt(nombreMois) || 1;

      if (type === "loyer" || type === "avance") {
        // Pour loyer et avance, créer plusieurs paiements si nbMois > 1
        const paiements = [];
        const moisDepart = new Date(`${moisConcerne}-01`);

        for (let i = 0; i < nbMois; i++) {
          const moisCourant = new Date(moisDepart);
          moisCourant.setMonth(moisCourant.getMonth() + i);
          
          paiements.push({
            contrat_id: contratId,
            locataire_id: selectedContrat.locataire_id,
            bien_id: selectedContrat.bien_id,
            montant: selectedContrat.loyer_mensuel,
            type: type,
            mois_concerne: moisCourant.toISOString().slice(0, 10),
            date_paiement: datePaiement,
            notes: nbMois > 1 
              ? `${type === "avance" ? "Avance" : "Loyer"} ${i + 1}/${nbMois} mois${notes ? ` - ${notes}` : ""}`
              : notes || null,
            statut: "paye" as const,
          });
        }

        const { error } = await supabase.from("paiements").insert(paiements);
        if (error) throw error;
      } else if (type === "arrieres") {
        // Pour les arriérés, créer un paiement pour chaque mois de la période
        if (!moisArriereDebut || !moisArriereFin) {
          throw new Error("Veuillez sélectionner la période des arriérés");
        }

        const debut = new Date(`${moisArriereDebut}-01`);
        const fin = new Date(`${moisArriereFin}-01`);
        const paiements = [];
        
        let moisCourant = new Date(debut);
        while (moisCourant <= fin) {
          paiements.push({
            contrat_id: contratId,
            locataire_id: selectedContrat.locataire_id,
            bien_id: selectedContrat.bien_id,
            montant: selectedContrat.loyer_mensuel,
            type: "loyer" as const,
            mois_concerne: moisCourant.toISOString().slice(0, 10),
            date_paiement: datePaiement,
            notes: `Arriéré${notes ? ` - ${notes}` : ""}`,
            statut: "paye" as const,
          });
          moisCourant.setMonth(moisCourant.getMonth() + 1);
        }

        const { error } = await supabase.from("paiements").insert(paiements);
        if (error) throw error;
      } else {
        // Caution - comportement normal
        const { error } = await supabase.from("paiements").insert({
          contrat_id: contratId,
          locataire_id: selectedContrat.locataire_id,
          bien_id: selectedContrat.bien_id,
          montant: parseFloat(montant),
          type: type,
          mois_concerne: null,
          date_paiement: datePaiement,
          notes: notes || null,
          statut: "paye",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["paiements-contrat"] });
      const nbMois = parseInt(nombreMois) || 1;
      toast.success(nbMois > 1 
        ? `Paiement de ${nbMois} mois enregistré avec succès`
        : "Paiement enregistré avec succès"
      );
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setContratId("");
    setType("loyer");
    setMontant("");
    setMoisConcerne(new Date().toISOString().slice(0, 7));
    setDatePaiement(new Date().toISOString().split("T")[0]);
    setNotes("");
    setNombreMois("1");
    setMoisArriereDebut("");
    setMoisArriereFin("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

  // Afficher le prochain mois à payer
  const prochainMoisAPayer = moisConcerne ? new Date(`${moisConcerne}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Paiement</DialogTitle>
          <DialogDescription>Enregistrer un paiement de loyer, avance ou caution</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contrat">Contrat / Locataire *</Label>
            <Select value={contratId} onValueChange={setContratId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  contratsActifs && contratsActifs.length > 0 
                    ? "Sélectionner un contrat actif" 
                    : "Aucun contrat actif disponible"
                } />
              </SelectTrigger>
              <SelectContent>
                {contratsActifs && contratsActifs.length > 0 ? (
                  contratsActifs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.locataires?.nom} - {c.biens?.nom}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Aucun contrat actif
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedContrat && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Bien:</strong> {selectedContrat.biens?.nom}</p>
              <p><strong>Loyer mensuel:</strong> {selectedContrat.loyer_mensuel.toLocaleString()} FCFA</p>
              {type === "loyer" && prochainMoisAPayer && (
                <p className="text-primary font-medium">
                  <strong>Prochain mois a payer:</strong> {prochainMoisAPayer}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Type de paiement *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loyer">Loyer</SelectItem>
                <SelectItem value="arrieres">Arriérés (mois impayés)</SelectItem>
                <SelectItem value="avance">Avance (plusieurs mois)</SelectItem>
                <SelectItem value="caution">Caution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "arrieres" && (
            <div className="space-y-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Sélectionnez la période des arriérés à régulariser
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="moisDebut">Du mois</Label>
                  <Input
                    id="moisDebut"
                    type="month"
                    value={moisArriereDebut}
                    onChange={(e) => setMoisArriereDebut(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moisFin">Au mois</Label>
                  <Input
                    id="moisFin"
                    type="month"
                    value={moisArriereFin}
                    onChange={(e) => setMoisArriereFin(e.target.value)}
                    required
                  />
                </div>
              </div>
              {selectedContrat && moisArriereDebut && moisArriereFin && (
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Total arriérés: {montant ? parseInt(montant).toLocaleString() : 0} FCFA
                </p>
              )}
            </div>
          )}

          {(type === "loyer" || type === "avance") && (
            <div className="space-y-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="mois">Mois de départ *</Label>
                <Input
                  id="mois"
                  type="month"
                  value={moisConcerne}
                  onChange={(e) => setMoisConcerne(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombreMois">Nombre de mois à payer *</Label>
                <Select value={nombreMois} onValueChange={setNombreMois}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContrat && parseInt(nombreMois) > 1 && (
                <div className="text-sm bg-background p-2 rounded border">
                  <p className="font-medium text-primary">
                    Période: {new Date(`${moisConcerne}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    {" → "}
                    {(() => {
                      const fin = new Date(`${moisConcerne}-01`);
                      fin.setMonth(fin.getMonth() + parseInt(nombreMois) - 1);
                      return fin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                    })()}
                  </p>
                  <p className="text-muted-foreground">
                    Total: {(selectedContrat.loyer_mensuel * parseInt(nombreMois)).toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montant">Montant total (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              disabled={type === "loyer" || type === "avance" || type === "arrieres"}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date du paiement *</Label>
            <Input
              id="date"
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
