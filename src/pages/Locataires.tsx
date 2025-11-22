import { useState } from "react";
import { Plus, Search, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Locataires = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const locataires = [
    {
      id: 1,
      nom: "Jean Kouassi",
      telephone: "+228 93 45 67 89",
      bien: "Maison Kara Centre",
      dateEntree: "01/01/2024",
      loyer: "150000",
      statut: "actif",
      avance: 2,
    },
    {
      id: 2,
      nom: "Marie Adjovi",
      telephone: "+228 94 56 78 90",
      bien: "Chambre Résidence Étoile",
      dateEntree: "15/02/2024",
      loyer: "45000",
      statut: "actif",
      avance: 0,
    },
    {
      id: 3,
      nom: "David Koffi",
      telephone: "+228 95 67 89 01",
      bien: "Appartement Plateau",
      dateEntree: "10/03/2024",
      loyer: "200000",
      statut: "retard",
      avance: 1,
    },
  ];

  const getInitials = (nom: string) => {
    return nom
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "actif":
        return <Badge className="bg-success text-success-foreground">À jour</Badge>;
      case "retard":
        return <Badge variant="destructive">En retard</Badge>;
      default:
        return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locataires</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos locataires et leurs contrats
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un locataire
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un locataire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Locataires List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locataires.map((locataire) => (
          <Card key={locataire.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(locataire.nom)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{locataire.nom}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {locataire.telephone}
                    </CardDescription>
                  </div>
                </div>
                {getStatutBadge(locataire.statut)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{locataire.bien}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Depuis le {locataire.dateEntree}</span>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                  <p className="text-lg font-bold text-primary">
                    {parseInt(locataire.loyer).toLocaleString()} CFA
                  </p>
                </div>
                {locataire.avance > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Avance : {locataire.avance} mois
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Locataires;
