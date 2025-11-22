import { useState } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Proprietaires = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const proprietaires = [
    {
      id: 1,
      nom: "Kofi Mensah",
      telephone: "+228 90 12 34 56",
      email: "kofi.mensah@email.com",
      biensCount: 3,
      revenusMensuels: "450000",
    },
    {
      id: 2,
      nom: "Ama Diop",
      telephone: "+228 91 23 45 67",
      email: "ama.diop@email.com",
      biensCount: 5,
      revenusMensuels: "850000",
    },
    {
      id: 3,
      nom: "Ibrahim Traoré",
      telephone: "+228 92 34 56 78",
      email: "ibrahim.traore@email.com",
      biensCount: 2,
      revenusMensuels: "300000",
    },
  ];

  const getInitials = (nom: string) => {
    return nom
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propriétaires</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos propriétaires et leurs biens
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un propriétaire
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Proprietaires List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {proprietaires.map((proprio) => (
          <Card key={proprio.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(proprio.nom)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-xl">{proprio.nom}</CardTitle>
                  <CardDescription>{proprio.biensCount} biens</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{proprio.telephone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{proprio.email}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Revenus mensuels</p>
                <p className="text-lg font-bold text-primary">
                  {parseInt(proprio.revenusMensuels).toLocaleString()} CFA
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Proprietaires;
