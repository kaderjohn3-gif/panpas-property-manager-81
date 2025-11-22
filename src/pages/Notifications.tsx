import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, RefreshCw, Search, CheckCircle2, Mail, Smartphone, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Notifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [receiverName, setReceiverName] = useState("");
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, locataires(nom, telephone)")
        .order("date_envoi", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const checkOverdueRents = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-overdue-rents");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Vérification terminée: ${data.notificationsCreated} nouveau(x) rappel(s) créé(s)`);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const markAsReceived = useMutation({
    mutationFn: async ({ id, receiverName }: { id: string; receiverName: string }) => {
      const { error } = await supabase
        .from("notifications")
        .update({
          date_reception: new Date().toISOString(),
          recu_par: receiverName,
          statut: "recu",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedNotif(null);
      setReceiverName("");
      toast.success("Notification marquée comme reçue");
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getStatutBadge = (statut: string, hasReception: boolean) => {
    if (statut === "recu" || hasReception) return <Badge className="bg-green-500 hover:bg-green-600">Reçu</Badge>;
    if (statut === "envoye") return <Badge variant="default">Envoyé</Badge>;
    if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
    if (statut === "erreur") return <Badge variant="destructive">Erreur</Badge>;
    return <Badge variant="outline">{statut}</Badge>;
  };

  const getCanalIcon = (canal: string) => {
    if (canal === "email") return <Mail className="h-4 w-4" />;
    if (canal === "sms") return <Smartphone className="h-4 w-4" />;
    if (canal === "whatsapp") return <MessageSquare className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const getTypeBadge = (type: string) => {
    if (type === "rappel_loyer") return <Badge variant="destructive">Rappel Loyer</Badge>;
    if (type === "confirmation") return <Badge variant="default">Confirmation</Badge>;
    return <Badge variant="outline">{type}</Badge>;
  };

  const filteredNotifications = notifications?.filter((n) =>
    n.locataires?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: notifications?.length || 0,
    envoyes: notifications?.filter((n) => n.statut === "envoye").length || 0,
    recus: notifications?.filter((n) => n.date_reception).length || 0,
    en_attente: notifications?.filter((n) => n.statut === "en_attente").length || 0,
  };
  const tauxReception = stats.envoyes > 0 ? Math.round((stats.recus / stats.envoyes) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Rappels</h1>
          <p className="text-muted-foreground">Suivi automatique des loyers en retard avec accusés de réception</p>
        </div>
        <Button
          onClick={() => checkOverdueRents.mutate()}
          disabled={checkOverdueRents.isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checkOverdueRents.isPending ? "animate-spin" : ""}`} />
          {checkOverdueRents.isPending ? "Vérification..." : "Vérifier maintenant"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.envoyes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.recus}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de Réception</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tauxReception}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Historique des notifications
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : filteredNotifications && filteredNotifications.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date d'envoi</TableHead>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Réception</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(notif.date_envoi).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {notif.locataires?.nom || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCanalIcon(notif.canal_envoi || "systeme")}
                          <span className="text-xs capitalize">{notif.canal_envoi || "système"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(notif.type)}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{notif.message}</p>
                      </TableCell>
                      <TableCell>{getStatutBadge(notif.statut, !!notif.date_reception)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {notif.date_reception ? (
                          <div className="text-xs">
                            <div className="font-medium text-green-600">
                              {new Date(notif.date_reception).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {notif.recu_par && <div className="text-muted-foreground">par {notif.recu_par}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non reçu</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!notif.date_reception && notif.statut === "envoye" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedNotif(notif)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Marquer reçu
                          </Button>
                        )}
                        {notif.dernier_erreur && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={notif.dernier_erreur}
                          >
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Aucune notification trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Comment ça fonctionne ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Le système vérifie automatiquement les loyers en retard chaque jour</p>
          <p>✓ Un délai de grâce de 5 jours est accordé après le début du mois</p>
          <p>✓ Une seule notification est envoyée par mois par locataire en retard</p>
          <p>✓ Vous pouvez lancer une vérification manuelle avec le bouton "Vérifier maintenant"</p>
          <p>✓ Les accusés de réception permettent de suivre qui a été informé et confirmé</p>
          <p>✓ Le taux de réception vous aide à identifier les locataires difficiles à joindre</p>
        </CardContent>
      </Card>

      {/* Dialog for marking as received */}
      <Dialog open={!!selectedNotif} onOpenChange={() => setSelectedNotif(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme reçu</DialogTitle>
            <DialogDescription>
              Confirmez la réception de cette notification par le locataire
            </DialogDescription>
          </DialogHeader>
          {selectedNotif && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Locataire:</p>
                <p className="text-sm text-muted-foreground">{selectedNotif.locataires?.nom}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Message:</p>
                <p className="text-sm text-muted-foreground">{selectedNotif.message}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reçu par (optionnel):</label>
                <Input
                  placeholder="Nom de la personne qui a reçu"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedNotif(null);
                setReceiverName("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (selectedNotif) {
                  markAsReceived.mutate({
                    id: selectedNotif.id,
                    receiverName: receiverName || selectedNotif.locataires?.nom || "Non spécifié",
                  });
                }
              }}
              disabled={markAsReceived.isPending}
            >
              {markAsReceived.isPending ? "Enregistrement..." : "Confirmer réception"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
