import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EditBienDialogProps {
  bien: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditBienDialog = ({ bien, open, onOpenChange }: EditBienDialogProps) => {
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"maison" | "boutique" | "chambre" | "magasin">("maison");
  const [adresse, setAdresse] = useState("");
  const [proprietaireId, setProprietaireId] = useState("");
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [description, setDescription] = useState("");
  const [commissionPourcentage, setCommissionPourcentage] = useState("10");
  const queryClient = useQueryClient();

  const { data: proprietaires } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proprietaires").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (bien) {
      setNom(bien.nom || "");
      setType(bien.type || "maison");
      setAdresse(bien.adresse || "");
      setProprietaireId(bien.proprietaire_id || "");
      setLoyerMensuel(bien.loyer_mensuel?.toString() || "");
      setDescription(bien.description || "");
      setCommissionPourcentage(bien.commission_pourcentage?.toString() || "10");
    }
  }, [bien]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("biens")
        .update({
          nom,
          type,
          adresse,
          proprietaire_id: proprietaireId,
          loyer_mensuel: parseFloat(loyerMensuel),
          description: description || null,
          commission_pourcentage: parseFloat(commissionPourcentage),
        })
        .eq("id", bien.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      toast.success("Bien modifié avec succès");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Bien</DialogTitle>
          <DialogDescription>Mettre à jour les informations du bien</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du bien *</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maison">Maison</SelectItem>
                <SelectItem value="boutique">Boutique</SelectItem>
                <SelectItem value="chambre">Chambre</SelectItem>
                <SelectItem value="magasin">Magasin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse *</Label>
            <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proprietaire">Propriétaire *</Label>
            <Select value={proprietaireId} onValueChange={setProprietaireId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un propriétaire" />
              </SelectTrigger>
              <SelectContent>
                {proprietaires?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission">Commission PANPAS (%) *</Label>
            <Input
              id="commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionPourcentage}
              onChange={(e) => setCommissionPourcentage(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Pourcentage de commission sur le loyer mensuel
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
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
