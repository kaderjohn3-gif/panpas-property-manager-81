import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { AddPaiementDialog } from "@/components/paiements/AddPaiementDialog";

const Paiements = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: paiements, isLoading } = useQuery({
    queryKey: ["paiements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*, locataires(nom), biens(nom)")
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatutBadge = (statut: string) => {
    if (statut === "paye") return <Badge>Payé</Badge>;
    if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
    return <Badge variant="destructive">Retard</Badge>;
  };

  const filteredPaiements = paiements?.filter((p) =>
    p.locataires?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground">Suivi des paiements et loyers</p>
        </div>
        <AddPaiementDialog />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <CardTitle>Historique des paiements</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaiements?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{p.locataires?.nom}</TableCell>
                    <TableCell>{p.biens?.nom}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell className="font-bold">{parseFloat(p.montant.toString()).toLocaleString()} FCFA</TableCell>
                    <TableCell>{getStatutBadge(p.statut)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Paiements;
