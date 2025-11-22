import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Biens = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const biens = [
    {
      id: 1,
      nom: "Maison Kara Centre",
      type: "Maison",
      adresse: "Quartier Kara Centre, Kara",
      proprietaire: "M. Kofi Mensah",
      statut: "occupé",
      loyer: "150000",
    },
    {
      id: 2,
      nom: "Boutique Avenue Principale",
      type: "Boutique",
      adresse: "Avenue Principale, Kara",
      proprietaire: "Mme. Ama Diop",
      statut: "disponible",
      loyer: "200000",
    },
    {
      id: 3,
      nom: "Chambre Résidence Étoile",
      type: "Chambre",
      adresse: "Résidence Étoile, Kara",
      proprietaire: "M. Ibrahim Traoré",
      statut: "occupé",
      loyer: "45000",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des biens</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous vos biens immobiliers
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un bien
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Biens Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {biens.map((bien) => (
          <Card key={bien.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{bien.nom}</CardTitle>
                  <CardDescription>{bien.type}</CardDescription>
                </div>
                <Badge
                  variant={bien.statut === "occupé" ? "default" : "secondary"}
                  className={
                    bien.statut === "occupé"
                      ? "bg-success text-success-foreground"
                      : ""
                  }
                >
                  {bien.statut === "occupé" ? "Occupé" : "Disponible"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="text-sm font-medium">{bien.adresse}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Propriétaire</p>
                <p className="text-sm font-medium">{bien.proprietaire}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                <p className="text-lg font-bold text-primary">
                  {parseInt(bien.loyer).toLocaleString()} CFA
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Biens;
