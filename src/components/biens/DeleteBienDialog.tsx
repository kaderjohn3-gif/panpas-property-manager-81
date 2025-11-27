import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface DeleteBienDialogProps {
  bien: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteBienDialog = ({ bien, open, onOpenChange }: DeleteBienDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Vérifier seulement les contrats ACTIFS
      const { data: contratsActifs } = await supabase
        .from("contrats")
        .select("id")
        .eq("bien_id", bien.id)
        .eq("statut", "actif");

      if (contratsActifs && contratsActifs.length > 0) {
        throw new Error(`Impossible de supprimer : ce bien a ${contratsActifs.length} contrat(s) actif(s). Veuillez d'abord terminer les contrats.`);
      }

      // Supprimer d'abord les paiements associés (en cascade)
      const { error: paiementsError } = await supabase
        .from("paiements")
        .delete()
        .eq("bien_id", bien.id);

      if (paiementsError) throw paiementsError;

      // Supprimer les dépenses associées (en cascade)
      const { error: depensesError } = await supabase
        .from("depenses")
        .delete()
        .eq("bien_id", bien.id);

      if (depensesError) throw depensesError;

      // Supprimer les contrats terminés associés (en cascade)
      const { error: contratsError } = await supabase
        .from("contrats")
        .delete()
        .eq("bien_id", bien.id);

      if (contratsError) throw contratsError;

      // Supprimer le bien
      const { error } = await supabase.from("biens").delete().eq("id", bien.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      toast.success("Bien supprimé avec succès");
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
            Cette action est irréversible. Le bien <strong>{bien?.nom}</strong> sera définitivement supprimé.
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
