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
      // Vérifier tous les contrats (actifs et terminés)
      const { data: contrats } = await supabase
        .from("contrats")
        .select("id, statut")
        .eq("bien_id", bien.id);

      if (contrats && contrats.length > 0) {
        const activeContrats = contrats.filter(c => c.statut === "actif");
        if (activeContrats.length > 0) {
          throw new Error(`Impossible de supprimer : ce bien a ${activeContrats.length} contrat(s) actif(s). Veuillez d'abord terminer les contrats.`);
        }
        throw new Error(`Impossible de supprimer : ce bien a ${contrats.length} contrat(s) associé(s). Veuillez d'abord supprimer les contrats terminés.`);
      }

      // Vérifier les paiements
      const { data: paiements } = await supabase
        .from("paiements")
        .select("id")
        .eq("bien_id", bien.id)
        .limit(1);

      if (paiements && paiements.length > 0) {
        throw new Error("Impossible de supprimer : ce bien a des paiements associés. Veuillez d'abord supprimer les paiements.");
      }

      // Vérifier les dépenses
      const { data: depenses } = await supabase
        .from("depenses")
        .select("id")
        .eq("bien_id", bien.id)
        .limit(1);

      if (depenses && depenses.length > 0) {
        throw new Error("Impossible de supprimer : ce bien a des dépenses associées. Veuillez d'abord supprimer les dépenses.");
      }

      // Si tout est OK, supprimer le bien
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
