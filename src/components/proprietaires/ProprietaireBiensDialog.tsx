import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Banknote } from "lucide-react";

interface ProprietaireBiensDialogProps {
  proprietaire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProprietaireBiensDialog = ({
  proprietaire,
  open,
  onOpenChange,
}: ProprietaireBiensDialogProps) => {
  const { data: biens, isLoading } = useQuery({
    queryKey: ["proprietaire-biens", proprietaire?.id],
    queryFn: async () => {
      if (!proprietaire?.id) return [];
      const { data, error } = await supabase
        .from("biens")
        .select("*, contrats(id, statut)")
        .eq("proprietaire_id", proprietaire.id)
        .order("nom");
      if (error) throw error;
      return data;
    },
    enabled: !!proprietaire?.id && open,
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maison: "Maison",
      boutique: "Boutique",
      chambre: "Chambre",
      magasin: "Magasin",
    };
    return labels[type] || type;
  };

  const getStatutBadge = (bien: any) => {
    const hasActiveContract = bien.contrats?.some((c: any) => c.statut === "actif");
    return hasActiveContract ? (
      <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400">
        Occupé
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
        Disponible
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            Biens de {proprietaire?.nom}
          </DialogTitle>
          <DialogDescription>
            Liste complète des biens immobiliers
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Chargement des biens...
          </div>
        ) : !biens || biens.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Aucun bien enregistré pour ce propriétaire
            </p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {biens.map((bien) => (
              <Card key={bien.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">
                        {bien.nom}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(bien.type)}
                        </Badge>
                        {getStatutBadge(bien)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{bien.adresse}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Banknote className="h-4 w-4 flex-shrink-0" />
                    <span className="font-semibold text-primary">
                      {bien.loyer_mensuel.toLocaleString()} FCFA/mois
                    </span>
                  </div>
                  {bien.description && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      {bien.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Total: <strong>{biens?.length || 0}</strong> bien(s)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
