import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Building2, Search, Edit, Trash2, FileText } from "lucide-react";
import { AddContratDialog } from "@/components/locataires/AddContratDialog";
import { EditLocataireDialog } from "@/components/locataires/EditLocataireDialog";
import { DeleteLocataireDialog } from "@/components/locataires/DeleteLocataireDialog";
import { EditContratDialog } from "@/components/locataires/EditContratDialog";
import { DeleteContratDialog } from "@/components/locataires/DeleteContratDialog";
import { ContratDetailsDialog } from "@/components/locataires/ContratDetailsDialog";

const Locataires = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocataire, setSelectedLocataire] = useState<any>(null);
  const [selectedContrat, setSelectedContrat] = useState<any>(null);
  const [editLocataireOpen, setEditLocataireOpen] = useState(false);
  const [deleteLocataireOpen, setDeleteLocataireOpen] = useState(false);
  const [editContratOpen, setEditContratOpen] = useState(false);
  const [deleteContratOpen, setDeleteContratOpen] = useState(false);
  const [viewContratOpen, setViewContratOpen] = useState(false);

  const { data: contrats, isLoading } = useQuery({
    queryKey: ["contrats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats")
        .select("*, locataires(*), biens(*, proprietaires(*))")
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Locataires
          </h1>
          <p className="text-muted-foreground mt-1">Gérer les locataires et leurs contrats</p>
        </div>
        <AddContratDialog />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="pl-9 h-11" 
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContrats?.map((contrat, index) => (
            <Card key={contrat.id} className="hover-lift group" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-lg">
                    {getInitials(contrat.locataires?.nom || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{contrat.locataires?.nom}</CardTitle>
                  <Badge variant="secondary" className="mt-1">Actif</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{contrat.locataires?.telephone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{contrat.biens?.nom}</span>
                </div>
                <div className="pt-3 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loyer</span>
                    <span className="font-bold">{contrat.loyer_mensuel.toLocaleString()} FCFA</span>
                  </div>
                  {contrat.avance_mois > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avance</span>
                      <Badge variant="outline">{contrat.avance_mois} mois</Badge>
                    </div>
                  )}
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedContrat(contrat);
                        setViewContratOpen(true);
                      }}
                      className="w-full"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Voir le Contrat
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLocataire(contrat.locataires);
                          setEditLocataireOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Locataire
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedContrat(contrat);
                          setEditContratOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Contrat
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContrat(contrat);
                          setDeleteContratOpen(true);
                        }}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedLocataire && (
        <>
          <EditLocataireDialog
            locataire={selectedLocataire}
            open={editLocataireOpen}
            onOpenChange={setEditLocataireOpen}
          />
          <DeleteLocataireDialog
            locataire={selectedLocataire}
            open={deleteLocataireOpen}
            onOpenChange={setDeleteLocataireOpen}
          />
        </>
      )}

      {selectedContrat && (
        <>
          <ContratDetailsDialog
            contrat={selectedContrat}
            open={viewContratOpen}
            onOpenChange={setViewContratOpen}
          />
          <EditContratDialog
            contrat={selectedContrat}
            open={editContratOpen}
            onOpenChange={setEditContratOpen}
          />
          <DeleteContratDialog
            contrat={selectedContrat}
            open={deleteContratOpen}
            onOpenChange={setDeleteContratOpen}
          />
        </>
      )}
    </div>
  );
};

export default Locataires;
