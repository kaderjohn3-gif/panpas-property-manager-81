import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, Home, User, Phone, Mail, MapPin, Banknote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateContratPDF, imageToBase64 } from "@/lib/pdf-generator";
import logo from "@/assets/logo-panpas.jpg";
import { toast } from "sonner";

interface ContratDetailsDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContratDetailsDialog = ({ contrat, open, onOpenChange }: ContratDetailsDialogProps) => {
  if (!contrat) return null;

  const handlePrintContract = async () => {
    try {
      const logoBase64 = await imageToBase64(logo);
      await generateContratPDF(contrat, logoBase64);
      toast.success("Contrat généré avec succès");
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Détails du Contrat
          </DialogTitle>
          <DialogDescription>
            Contrat de location - {contrat.locataires?.nom}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Locataire */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              Locataire
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 pl-7">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contrat.locataires?.nom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contrat.locataires?.telephone}</span>
              </div>
              {contrat.locataires?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.locataires?.email}</span>
                </div>
              )}
              {contrat.locataires?.adresse && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.locataires?.adresse}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bien */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Home className="h-5 w-5" />
              Bien Loué
            </h3>
            <div className="grid gap-3 pl-7">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contrat.biens?.nom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contrat.biens?.adresse}</span>
              </div>
            </div>
          </div>

          {/* Détails Contrat */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Détails du Contrat
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 pl-7">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date de début</p>
                <p className="font-semibold">
                  {format(new Date(contrat.date_debut), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              {contrat.date_fin && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date de fin</p>
                  <p className="font-semibold">
                    {format(new Date(contrat.date_fin), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge variant={contrat.statut === "actif" ? "secondary" : "outline"}>
                  {contrat.statut === "actif" ? "Actif" : "Terminé"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Informations Financières */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Banknote className="h-5 w-5" />
              Informations Financières
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 pl-7">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                <p className="text-xl font-bold text-primary">
                  {contrat.loyer_mensuel.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Caution</p>
                <p className="text-xl font-bold">
                  {contrat.caution.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              {contrat.avance_mois > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avance</p>
                  <p className="text-xl font-bold">
                    {contrat.avance_mois} mois
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handlePrintContract} className="gap-2">
            <Download className="h-4 w-4" />
            Imprimer le Contrat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
