import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Building2, Search } from "lucide-react";
import { AddContratDialog } from "@/components/locataires/AddContratDialog";

const Locataires = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contrats, isLoading } = useQuery({
    queryKey: ["contrats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats")
        .select("*, locataires(*), biens(nom)")
        .eq("statut", "actif")
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getInitials = (nom: string) => {
    return nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredContrats = contrats?.filter((c) =>
    c.locataires?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Locataires</h1>
          <p className="text-muted-foreground">Gérer les locataires et leurs contrats</p>
        </div>
        <AddContratDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContrats?.map((contrat) => (
            <Card key={contrat.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(contrat.locataires?.nom || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{contrat.locataires?.nom}</CardTitle>
                  <Badge variant="secondary" className="mt-1">Actif</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.locataires?.telephone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.biens?.nom}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loyer</span>
                    <span className="font-bold">{contrat.loyer_mensuel.toLocaleString()} FCFA</span>
                  </div>
                  {contrat.avance_mois > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Avance</span>
                      <Badge variant="outline">{contrat.avance_mois} mois</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Locataires;
