import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteProprietaireDialogProps {
  proprietaire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteProprietaireDialog = ({ proprietaire, open, onOpenChange }: DeleteProprietaireDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Check if proprietaire has biens
      const { data: biens } = await supabase
        .from("biens")
        .select("id")
        .eq("proprietaire_id", proprietaire.id);

      if (biens && biens.length > 0) {
        throw new Error("Impossible de supprimer : ce propriétaire possède des biens");
      }

      const { error } = await supabase.from("proprietaires").delete().eq("id", proprietaire.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietaires"] });
      toast.success("Propriétaire supprimé avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le propriétaire <strong>{proprietaire?.nom}</strong> sera définitivement
            supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
