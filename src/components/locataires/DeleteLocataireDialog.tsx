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

interface DeleteLocataireDialogProps {
  locataire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteLocataireDialog = ({ locataire, open, onOpenChange }: DeleteLocataireDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Vérifier s'il a des contrats actifs
      const { data: contratsActifs, error: checkError } = await supabase
        .from("contrats")
        .select("id")
        .eq("locataire_id", locataire.id)
        .eq("statut", "actif");

      if (checkError) throw checkError;

      if (contratsActifs && contratsActifs.length > 0) {
        throw new Error("Impossible de supprimer un locataire avec des contrats actifs");
      }

      const { error } = await supabase.from("locataires").delete().eq("id", locataire.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      toast.success("Locataire supprimé avec succès");
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
            Êtes-vous sûr de vouloir supprimer le locataire <strong>{locataire?.nom}</strong> ?
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
