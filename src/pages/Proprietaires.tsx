import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, Search, Edit, Trash2, Building2 } from "lucide-react";
import { AddProprietaireDialog } from "@/components/proprietaires/AddProprietaireDialog";
import { EditProprietaireDialog } from "@/components/proprietaires/EditProprietaireDialog";
import { DeleteProprietaireDialog } from "@/components/proprietaires/DeleteProprietaireDialog";
import { ProprietaireBiensDialog } from "@/components/proprietaires/ProprietaireBiensDialog";

const Proprietaires = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProprietaire, setEditingProprietaire] = useState<any>(null);
  const [deletingProprietaire, setDeletingProprietaire] = useState<any>(null);
  const [viewingBiens, setViewingBiens] = useState<any>(null);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Propriétaires
          </h1>
          <p className="text-muted-foreground mt-1">Gérer les propriétaires de vos biens immobiliers</p>
        </div>
        <AddProprietaireDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, téléphone ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProprietaires?.map((proprietaire, index) => (
            <Card key={proprietaire.id} className="hover-lift group" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-lg">
                    {getInitials(proprietaire.nom)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{proprietaire.nom}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {proprietaire.biens?.length || 0} bien(s)
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{proprietaire.telephone}</span>
                </div>
                {proprietaire.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{proprietaire.email}</span>
                  </div>
                )}
                {proprietaire.adresse && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                <div className="flex flex-col gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingBiens(proprietaire)}
                    className="w-full"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Voir les biens ({proprietaire.biens?.length || 0})
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProprietaire(proprietaire)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingProprietaire(proprietaire)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
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

      {editingProprietaire && (
        <EditProprietaireDialog
          proprietaire={editingProprietaire}
          open={!!editingProprietaire}
          onOpenChange={(open) => !open && setEditingProprietaire(null)}
        />
      )}

      {deletingProprietaire && (
        <DeleteProprietaireDialog
          proprietaire={deletingProprietaire}
          open={!!deletingProprietaire}
          onOpenChange={(open) => !open && setDeletingProprietaire(null)}
        />
      )}

      {viewingBiens && (
        <ProprietaireBiensDialog
          proprietaire={viewingBiens}
          open={!!viewingBiens}
          onOpenChange={(open) => !open && setViewingBiens(null)}
        />
      )}
    </div>
  );
};

export default Proprietaires;
