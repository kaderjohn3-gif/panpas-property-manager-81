import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Edit, Trash2 } from "lucide-react";
import { AddPaiementDialog } from "@/components/paiements/AddPaiementDialog";
import { EditPaiementDialog } from "@/components/paiements/EditPaiementDialog";
import { DeletePaiementDialog } from "@/components/paiements/DeletePaiementDialog";
import { generateReceiptPDF, imageToBase64, PrintOptions } from "@/lib/pdf-generator";
import PrintOptionsDialog from "@/components/paiements/PrintOptionsDialog";
import { toast } from "sonner";
import logo from "@/assets/logo-panpas.jpg";

const Paiements = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaiement, setSelectedPaiement] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: paiements, isLoading } = useQuery({
    queryKey: ["paiements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select(`
          *,
          locataires(nom, telephone, email, adresse),
          biens(nom, adresse, type),
          contrats(loyer_mensuel)
        `)
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paiementToPrint, setPaiementToPrint] = useState<any>(null);

  const handlePrintReceipt = async (paiement: any, options?: PrintOptions) => {
    try {
      toast.loading("Génération de la facture PDF...");
      
      // Convert logo to base64
      const logoBase64 = await imageToBase64(logo);
      
      // Calculer le nombre de mois et les détails
      const loyerMensuel = parseFloat(paiement.contrats?.loyer_mensuel?.toString() || "0");
      const montant = parseFloat(paiement.montant.toString());
      let nombreMois = 1;
      let moisDetails: { mois: string; montant: number }[] = [];
      
      if ((paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres") && loyerMensuel > 0) {
        nombreMois = Math.round(montant / loyerMensuel);
        
        // Générer les détails pour chaque mois
        if (paiement.mois_concerne && nombreMois > 0) {
          const startDate = new Date(paiement.mois_concerne);
          for (let i = 0; i < nombreMois; i++) {
            const moisDate = new Date(startDate);
            moisDate.setMonth(moisDate.getMonth() + i);
            moisDetails.push({
              mois: moisDate.toISOString().slice(0, 7) + "-01",
              montant: loyerMensuel
            });
          }
        }
      }
      
      // Generate PDF
      await generateReceiptPDF(
        {
          id: paiement.id,
          date_paiement: paiement.date_paiement,
          montant: montant,
          type: paiement.type,
          mois_concerne: paiement.mois_concerne,
          notes: paiement.notes,
          locataire: {
            nom: paiement.locataires?.nom || "",
            telephone: paiement.locataires?.telephone || "",
            email: paiement.locataires?.email,
            adresse: paiement.locataires?.adresse,
          },
          bien: {
            nom: paiement.biens?.nom || "",
            adresse: paiement.biens?.adresse || "",
            type: paiement.biens?.type || "maison",
          },
          contrat: {
            loyer_mensuel: loyerMensuel,
          },
          nombreMois: nombreMois,
          moisDetails: moisDetails.length > 0 ? moisDetails : undefined,
        },
        logoBase64,
        options
      );
      
      toast.dismiss();
      toast.success("Facture générée avec succès !");
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erreur lors de la génération: ${error.message}`);
    }
  };

  const openPrintDialogFor = (p: any) => {
    setPaiementToPrint(p);
    setPrintDialogOpen(true);
  };

  const handleConfirmPrint = async (opts: { format: "a5" | "a4" | "custom"; orientation: "portrait" | "landscape" }) => {
    if (!paiementToPrint) return;
    await handlePrintReceipt(paiementToPrint, { format: opts.format, orientation: opts.orientation });
    setPaiementToPrint(null);
  };

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
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Locataire</TableHead>
                      <TableHead className="whitespace-nowrap">Bien</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Montant</TableHead>
                      <TableHead className="whitespace-nowrap">Statut</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPaiements?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{p.locataires?.nom}</TableCell>
                        <TableCell className="whitespace-nowrap">{p.biens?.nom}</TableCell>
                        <TableCell className="whitespace-nowrap">{p.type}</TableCell>
                        <TableCell className="font-bold whitespace-nowrap">{parseFloat(p.montant.toString()).toLocaleString()} FCFA</TableCell>
                        <TableCell className="whitespace-nowrap">{getStatutBadge(p.statut)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPrintDialogFor(p)}
                              title="Imprimer le reçu"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPaiement(p);
                                setEditOpen(true);
                              }}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPaiement(p);
                                setDeleteOpen(true);
                              }}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PrintOptionsDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen} onConfirm={handleConfirmPrint} />

      {selectedPaiement && (
        <>
          <EditPaiementDialog
            paiement={selectedPaiement}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeletePaiementDialog
            paiement={selectedPaiement}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </div>
  );
};

export default Paiements;
