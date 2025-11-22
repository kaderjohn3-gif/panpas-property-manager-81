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
  const [type, setType] = useState<"loyer" | "avance" | "caution">("loyer");
  const [montant, setMontant] = useState("");
  const [moisConcerne, setMoisConcerne] = useState(new Date().toISOString().slice(0, 7));
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
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

  const selectedContrat = contratsActifs?.find((c) => c.id === contratId);

  useEffect(() => {
    if (selectedContrat) {
      setMontant(selectedContrat.loyer_mensuel.toString());
    }
  }, [selectedContrat]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrat) return;

      const { error } = await supabase.from("paiements").insert({
        contrat_id: contratId,
        locataire_id: selectedContrat.locataire_id,
        bien_id: selectedContrat.bien_id,
        montant: parseFloat(montant),
        type,
        mois_concerne: type === "loyer" ? `${moisConcerne}-01` : null,
        date_paiement: datePaiement,
        notes: notes || null,
        statut: "paye",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      toast.success("Paiement enregistré avec succès");
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

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
            <Select value={contratId} onValueChange={setContratId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un contrat" />
              </SelectTrigger>
              <SelectContent>
                {contratsActifs?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.locataires?.nom} - {c.biens?.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedContrat && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Bien:</strong> {selectedContrat.biens?.nom}</p>
              <p><strong>Loyer:</strong> {selectedContrat.loyer_mensuel.toLocaleString()} FCFA</p>
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
                <SelectItem value="avance">Avance</SelectItem>
                <SelectItem value="caution">Caution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "loyer" && (
            <div className="space-y-2">
              <Label htmlFor="mois">Mois concerné *</Label>
              <Input
                id="mois"
                type="month"
                value={moisConcerne}
                onChange={(e) => setMoisConcerne(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
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
