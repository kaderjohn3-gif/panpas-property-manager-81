import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EditContratDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditContratDialog = ({ contrat, open, onOpenChange }: EditContratDialogProps) => {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [caution, setCaution] = useState("");
  const [avanceMois, setAvanceMois] = useState("");
  const [statut, setStatut] = useState<"actif" | "termine">("actif");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (contrat) {
      setDateDebut(contrat.date_debut || "");
      setDateFin(contrat.date_fin || "");
      setLoyerMensuel(contrat.loyer_mensuel?.toString() || "");
      setCaution(contrat.caution?.toString() || "");
      setAvanceMois(contrat.avance_mois?.toString() || "0");
      setStatut(contrat.statut || "actif");
    }
  }, [contrat]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contrats")
        .update({
          date_debut: dateDebut,
          date_fin: dateFin || null,
          loyer_mensuel: parseFloat(loyerMensuel),
          caution: parseFloat(caution),
          avance_mois: parseInt(avanceMois),
          statut,
        })
        .eq("id", contrat.id);
      if (error) throw error;

      // Si le contrat devient terminé, mettre à jour le statut du bien
      if (statut === "termine" && contrat.statut === "actif") {
        const { error: bienError } = await supabase
          .from("biens")
          .update({ statut: "disponible" })
          .eq("id", contrat.bien_id);
        if (bienError) throw bienError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      toast.success("Contrat modifié avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Contrat</DialogTitle>
          <DialogDescription>Mettre à jour les informations du contrat</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dateDebut">Date de début *</Label>
            <Input id="dateDebut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFin">Date de fin</Label>
            <Input id="dateFin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loyer">Loyer mensuel (FCFA) *</Label>
            <Input
              id="loyer"
              type="number"
              step="0.01"
              value={loyerMensuel}
              onChange={(e) => setLoyerMensuel(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caution">Caution (FCFA) *</Label>
            <Input
              id="caution"
              type="number"
              step="0.01"
              value={caution}
              onChange={(e) => setCaution(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avance">Mois d'avance payés</Label>
            <Input
              id="avance"
              type="number"
              value={avanceMois}
              onChange={(e) => setAvanceMois(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select value={statut} onValueChange={(v: any) => setStatut(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
