import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, User, DollarSign, Search } from "lucide-react";
import { AddBienDialog } from "@/components/biens/AddBienDialog";

const Biens = () => {
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Biens Immobiliers</h1>
          <p className="text-muted-foreground">Gérer votre portfolio de biens</p>
        </div>
        <AddBienDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, adresse ou propriétaire..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBiens?.map((bien) => (
            <Card key={bien.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{bien.nom}</CardTitle>
                  </div>
                  {getStatutBadge(bien.statut)}
                </div>
                <Badge variant="outline" className="w-fit">
                  {getTypeLabel(bien.type)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{bien.adresse}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{bien.proprietaires?.nom}</span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredBiens?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Aucun bien trouvé</div>
      )}
    </div>
  );
};

export default Biens;
