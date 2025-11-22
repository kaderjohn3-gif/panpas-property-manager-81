import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, User, DollarSign, Search, Edit, Trash2 } from "lucide-react";
import { AddBienDialog } from "@/components/biens/AddBienDialog";
import { EditBienDialog } from "@/components/biens/EditBienDialog";
import { DeleteBienDialog } from "@/components/biens/DeleteBienDialog";

const Biens = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBien, setEditingBien] = useState<any>(null);
  const [deletingBien, setDeletingBien] = useState<any>(null);

  const { data: biens, isLoading } = useQuery({
    queryKey: ["biens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens")
        .select("*, proprietaires(nom), contrats(statut)")
        .order("nom");
      if (error) throw error;
      return data;
    },
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

  const getStatutBadge = (statut: string) => {
    if (statut === "disponible") {
      return <Badge variant="secondary">Disponible</Badge>;
    }
    return <Badge>Occupé</Badge>;
  };

  const filteredBiens = biens?.filter(
    (b) =>
      b.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.proprietaires?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Biens Immobiliers
          </h1>
          <p className="text-muted-foreground mt-1">Gérer votre portfolio de biens</p>
        </div>
        <AddBienDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, adresse ou propriétaire..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBiens?.map((bien, index) => (
            <Card key={bien.id} className="hover-lift group" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg truncate">{bien.nom}</CardTitle>
                  </div>
                  {getStatutBadge(bien.statut)}
                </div>
                <Badge variant="outline" className="w-fit mt-2">
                  {getTypeLabel(bien.type)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{bien.adresse}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{bien.proprietaires?.nom}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Loyer mensuel</span>
                    </div>
                    <span className="font-bold text-primary">
                      {bien.loyer_mensuel.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingBien(bien)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingBien(bien)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredBiens?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Aucun bien trouvé</div>
      )}

      {editingBien && (
        <EditBienDialog
          bien={editingBien}
          open={!!editingBien}
          onOpenChange={(open) => !open && setEditingBien(null)}
        />
      )}

      {deletingBien && (
        <DeleteBienDialog
          bien={deletingBien}
          open={!!deletingBien}
          onOpenChange={(open) => !open && setDeletingBien(null)}
        />
      )}
    </div>
  );
};

export default Biens;
