import { useState } from "react";
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

export const AddDepenseDialog = () => {
  const [open, setOpen] = useState(false);
  const [bienId, setBienId] = useState("");
  const [categorie, setCategorie] = useState<"reparation" | "electricite" | "eau" | "vidange" | "autre">("reparation");
  const [description, setDescription] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDepense, setDateDepense] = useState(new Date().toISOString().split("T")[0]);
  const queryClient = useQueryClient();

  const { data: biens } = useQuery({
    queryKey: ["biens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("biens").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("depenses").insert({
        bien_id: bienId,
        categorie,
        description,
        montant: parseFloat(montant),
        date_depense: dateDepense,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depenses"] });
      toast.success("Dépense enregistrée avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setBienId("");
    setCategorie("reparation");
    setDescription("");
    setMontant("");
    setDateDepense(new Date().toISOString().split("T")[0]);
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
          Ajouter une dépense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Dépense</DialogTitle>
          <DialogDescription>Enregistrer une nouvelle dépense pour un bien</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bien">Bien concerné *</Label>
            <Select value={bienId} onValueChange={setBienId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {biens?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nom} - {b.adresse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie *</Label>
            <Select value={categorie} onValueChange={(v: any) => setCategorie(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reparation">Réparation</SelectItem>
                <SelectItem value="electricite">Électricité</SelectItem>
                <SelectItem value="eau">Eau</SelectItem>
                <SelectItem value="vidange">Vidange</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
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
            <Label htmlFor="date">Date de la dépense *</Label>
            <Input id="date" type="date" value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
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
