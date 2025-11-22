import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, Search } from "lucide-react";
import { AddProprietaireDialog } from "@/components/proprietaires/AddProprietaireDialog";

const Proprietaires = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: proprietaires, isLoading } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proprietaires")
        .select("*, biens(id, loyer_mensuel)")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const getInitials = (nom: string) => {
    return nom
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateRevenuMensuel = (biens: any[]) => {
    return biens.reduce((sum, bien) => sum + (bien.loyer_mensuel || 0), 0);
  };

  const filteredProprietaires = proprietaires?.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.telephone.includes(searchQuery) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Propriétaires</h1>
          <p className="text-muted-foreground">Gérer les propriétaires de vos biens immobiliers</p>
        </div>
        <AddProprietaireDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, téléphone ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProprietaires?.map((proprietaire) => (
            <Card key={proprietaire.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(proprietaire.nom)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{proprietaire.nom}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {proprietaire.biens?.length || 0} bien(s)
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{proprietaire.telephone}</span>
                </div>
                {proprietaire.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{proprietaire.email}</span>
                  </div>
                )}
                {proprietaire.adresse && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{proprietaire.adresse}</span>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Revenu mensuel</span>
                    <span className="font-bold text-primary">
                      {calculateRevenuMensuel(proprietaire.biens || []).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredProprietaires?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun propriétaire trouvé
        </div>
      )}
    </div>
  );
};

export default Proprietaires;
