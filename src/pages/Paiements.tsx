import { useState } from "react";
import { Plus, Search, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Paiements = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const paiements = [
    {
      id: 1,
      date: "05/04/2024",
      locataire: "Jean Kouassi",
      bien: "Maison Kara Centre",
      montant: "150000",
      type: "Loyer",
      mois: "Avril 2024",
      statut: "payé",
    },
    {
      id: 2,
      date: "08/04/2024",
      locataire: "Marie Adjovi",
      bien: "Chambre Résidence Étoile",
      montant: "45000",
      type: "Loyer",
      mois: "Avril 2024",
      statut: "payé",
    },
    {
      id: 3,
      date: "05/04/2024",
      locataire: "David Koffi",
      bien: "Appartement Plateau",
      montant: "200000",
      type: "Loyer",
      mois: "Avril 2024",
      statut: "en_attente",
    },
  ];

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "payé":
        return <Badge className="bg-success text-success-foreground">Payé</Badge>;
      case "en_attente":
        return <Badge variant="secondary">En attente</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">Paiements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les paiements de loyers
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Enregistrer un paiement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">4.2M CFA</div>
            <p className="text-xs text-muted-foreground mt-1">
              32 paiements reçus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">850K CFA</div>
            <p className="text-xs text-muted-foreground mt-1">
              5 paiements attendus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">320K CFA</div>
            <p className="text-xs text-muted-foreground mt-1">
              2 paiements en retard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un paiement..."
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

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Locataire</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((paiement) => (
                <TableRow key={paiement.id}>
                  <TableCell className="font-medium">{paiement.date}</TableCell>
                  <TableCell>{paiement.locataire}</TableCell>
                  <TableCell>{paiement.bien}</TableCell>
                  <TableCell>{paiement.type}</TableCell>
                  <TableCell>{paiement.mois}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {parseInt(paiement.montant).toLocaleString()} CFA
                  </TableCell>
                  <TableCell>{getStatutBadge(paiement.statut)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
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

export default Paiements;
