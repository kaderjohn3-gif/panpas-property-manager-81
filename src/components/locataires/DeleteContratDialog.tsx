import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteContratDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteContratDialog = ({ contrat, open, onOpenChange }: DeleteContratDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Vérifier s'il y a des paiements associés
      const { data: paiements, error: checkError } = await supabase
        .from("paiements")
        .select("id")
        .eq("contrat_id", contrat.id);

      if (checkError) throw checkError;

      if (paiements && paiements.length > 0) {
        throw new Error("Impossible de supprimer un contrat avec des paiements associés");
      }

      // Supprimer le contrat
      const { error } = await supabase.from("contrats").delete().eq("id", contrat.id);
      if (error) throw error;

      // Mettre à jour le statut du bien
      const { error: bienError } = await supabase
        .from("biens")
        .update({ statut: "disponible" })
        .eq("id", contrat.bien_id);
      if (bienError) throw bienError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      toast.success("Contrat supprimé avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer ce contrat pour <strong>{contrat?.locataires?.nom}</strong> ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
