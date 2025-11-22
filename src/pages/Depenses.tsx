import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, DollarSign, Wrench, Zap, Droplet, Trash2 } from "lucide-react";
import { AddDepenseDialog } from "@/components/depenses/AddDepenseDialog";
import { DeleteDepenseDialog } from "@/components/depenses/DeleteDepenseDialog";
import { StatsCard } from "@/components/dashboard/StatsCard";

const Depenses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDepense, setDeletingDepense] = useState<any>(null);

  const { data: depenses, isLoading } = useQuery({
    queryKey: ["depenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depenses")
        .select("*, biens(nom, adresse)")
        .order("date_depense", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getCategorieColor = (categorie: string) => {
    const colors: Record<string, string> = {
      reparation: "bg-orange-500",
      electricite: "bg-yellow-500",
      eau: "bg-blue-500",
      vidange: "bg-purple-500",
      autre: "bg-gray-500",
    };
    return colors[categorie] || "bg-gray-500";
  };

  const getCategorieLabel = (categorie: string) => {
    const labels: Record<string, string> = {
      reparation: "Réparation",
      electricite: "Électricité",
      eau: "Eau",
      vidange: "Vidange",
      autre: "Autre",
    };
    return labels[categorie] || categorie;
  };

  const totalDepenses = depenses?.reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0) || 0;
  const reparations = depenses?.filter((d) => d.categorie === "reparation").reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0) || 0;
  const electricite = depenses?.filter((d) => d.categorie === "electricite").reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0) || 0;
  const autres = totalDepenses - reparations - electricite;

  const filteredDepenses = depenses?.filter(
    (d) =>
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.biens?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategorieLabel(d.categorie).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dépenses</h1>
          <p className="text-muted-foreground">Suivi et gestion des dépenses par bien</p>
        </div>
        <AddDepenseDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Dépenses" value={`${totalDepenses.toLocaleString()} FCFA`} icon={DollarSign} />
        <StatsCard title="Réparations" value={`${reparations.toLocaleString()} FCFA`} icon={Wrench} />
        <StatsCard title="Électricité" value={`${electricite.toLocaleString()} FCFA`} icon={Zap} />
        <StatsCard title="Autres" value={`${autres.toLocaleString()} FCFA`} icon={Droplet} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Historique des dépenses</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Bien</TableHead>
                      <TableHead className="whitespace-nowrap">Catégorie</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Montant</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepenses?.map((depense) => (
                      <TableRow key={depense.id}>
                        <TableCell className="whitespace-nowrap">{new Date(depense.date_depense).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{depense.biens?.nom}</TableCell>
                        <TableCell>
                          <Badge className={getCategorieColor(depense.categorie)}>
                            {getCategorieLabel(depense.categorie)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{depense.description}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {parseFloat(depense.montant.toString()).toLocaleString()} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingDepense(depense)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {!isLoading && filteredDepenses?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Aucune dépense trouvée</div>
          )}
        </CardContent>
      </Card>

      {deletingDepense && (
        <DeleteDepenseDialog
          depense={deletingDepense}
          open={!!deletingDepense}
          onOpenChange={(open) => !open && setDeletingDepense(null)}
        />
      )}
    </div>
  );
};

export default Depenses;
