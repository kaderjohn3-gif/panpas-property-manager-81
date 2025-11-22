import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

const Notifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
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

  const getStatutBadge = (statut: string) => {
    if (statut === "envoye") return <Badge variant="default">Envoyé</Badge>;
    if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
    return <Badge variant="outline">{statut}</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications & Rappels</h1>
          <p className="text-muted-foreground">Historique des rappels automatiques de loyer</p>
        </div>
        <Button
          onClick={() => checkOverdueRents.mutate()}
          disabled={checkOverdueRents.isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checkOverdueRents.isPending ? "animate-spin" : ""}`} />
          {checkOverdueRents.isPending ? "Vérification..." : "Vérifier maintenant"}
        </Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Statut</TableHead>
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
                    <TableCell>{getTypeBadge(notif.type)}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate">{notif.message}</p>
                    </TableCell>
                    <TableCell>{getStatutBadge(notif.statut)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
