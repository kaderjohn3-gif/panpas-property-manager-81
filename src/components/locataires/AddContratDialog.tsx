import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const AddContratDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  // Locataire info
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [pieceIdentite, setPieceIdentite] = useState("");
  
  // Contrat info
  const [bienId, setBienId] = useState("");
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split("T")[0]);
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [caution, setCaution] = useState("");
  const [avanceMois, setAvanceMois] = useState("0");
  
  const queryClient = useQueryClient();

  const { data: biensDisponibles } = useQuery({
    queryKey: ["biens-disponibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens")
        .select("*")
        .eq("statut", "disponible")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create locataire
      const { data: locataireData, error: locataireError } = await supabase
        .from("locataires")
        .insert({ nom, telephone, email: email || null, adresse: adresse || null, piece_identite: pieceIdentite || null })
        .select()
        .single();
      
      if (locataireError) throw locataireError;

      // 2. Create contrat
      const { error: contratError } = await supabase
        .from("contrats")
        .insert({
          locataire_id: locataireData.id,
          bien_id: bienId,
          date_debut: dateDebut,
          loyer_mensuel: parseFloat(loyerMensuel),
          caution: parseFloat(caution),
          avance_mois: parseInt(avanceMois),
        });
      
      if (contratError) throw contratError;

      // 3. Update bien status
      const { error: bienError } = await supabase
        .from("biens")
        .update({ statut: "occupe" })
        .eq("id", bienId);
      
      if (bienError) throw bienError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      toast.success("Contrat créé avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setStep(1);
    setNom("");
    setTelephone("");
    setEmail("");
    setAdresse("");
    setPieceIdentite("");
    setBienId("");
    setDateDebut(new Date().toISOString().split("T")[0]);
    setLoyerMensuel("");
    setCaution("");
    setAvanceMois("0");
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Contrat - Étape {step}/2</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Informations du locataire" : "Détails du contrat"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom complet *</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone *</Label>
              <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="piece">Pièce d'identité</Label>
              <Input id="piece" value={pieceIdentite} onChange={(e) => setPieceIdentite(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bien">Bien *</Label>
              <Select value={bienId} onValueChange={setBienId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un bien" />
                </SelectTrigger>
                <SelectContent>
                  {biensDisponibles?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom} - {b.loyer_mensuel.toLocaleString()} FCFA/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date de début *</Label>
              <Input id="date" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loyer">Loyer mensuel (FCFA) *</Label>
              <Input
                id="loyer"
                type="number"
                step="0.01"
                value={loyerMensuel}
                onChange={(e) => setLoyerMensuel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caution">Caution (FCFA) *</Label>
              <Input
                id="caution"
                type="number"
                step="0.01"
                value={caution}
                onChange={(e) => setCaution(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avance">Mois d'avance payés</Label>
              <Input
                id="avance"
                type="number"
                value={avanceMois}
                onChange={(e) => setAvanceMois(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2">
          {step === 2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Précédent
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleNext} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création..." : step === 1 ? "Suivant" : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
