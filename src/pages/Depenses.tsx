import { useState } from "react";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Depenses = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const depenses = [
    {
      id: 1,
      date: "12/04/2024",
      bien: "Maison Kara Centre",
      categorie: "Réparation",
      description: "Réparation toiture",
      montant: "85000",
    },
    {
      id: 2,
      date: "15/04/2024",
      bien: "Résidence Étoile",
      categorie: "Électricité",
      description: "Facture électricité Avril",
      montant: "35000",
    },
    {
      id: 3,
      date: "18/04/2024",
      bien: "Appartement Plateau",
      categorie: "Eau",
      description: "Facture eau Avril",
      montant: "12000",
    },
    {
      id: 4,
      date: "20/04/2024",
      bien: "Maison Kara Centre",
      categorie: "Vidange",
      description: "Vidange WC",
      montant: "25000",
    },
  ];

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case "Réparation":
        return "bg-destructive/10 text-destructive";
      case "Électricité":
        return "bg-warning/10 text-warning";
      case "Eau":
        return "bg-primary/10 text-primary";
      case "Vidange":
        return "bg-secondary/10 text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const totalDepenses = depenses.reduce(
    (acc, dep) => acc + parseInt(dep.montant),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dépenses</h1>
          <p className="text-muted-foreground mt-1">
            Suivez toutes les dépenses liées aux biens
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une dépense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalDepenses.toLocaleString()} CFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {depenses.length} dépenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Réparations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85K CFA</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Électricité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35K CFA</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Autres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">37K CFA</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une dépense..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Depenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depenses.map((depense) => (
                <TableRow key={depense.id}>
                  <TableCell className="font-medium">{depense.date}</TableCell>
                  <TableCell>{depense.bien}</TableCell>
                  <TableCell>
                    <Badge className={getCategorieColor(depense.categorie)}>
                      {depense.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell>{depense.description}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {parseInt(depense.montant).toLocaleString()} CFA
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Depenses;
