import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Building2, Users, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "biens" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contrats" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Get total properties
      const { data: allBiens, error: biensError } = await supabase.from("biens").select("statut");
      if (biensError) throw biensError;

      const totalBiens = allBiens?.length || 0;
      const biensOccupes = allBiens?.filter((b) => b.statut === "occupe").length || 0;
      const biensDisponibles = allBiens?.filter((b) => b.statut === "disponible").length || 0;

      // Get total proprietaires
      const { count: totalProprietaires, error: propError } = await supabase
        .from("proprietaires")
        .select("*", { count: "exact", head: true });
      if (propError) throw propError;

      // Get active contracts
      const { data: contratsActifs, error: contratsError } = await supabase
        .from("contrats")
        .select("*")
        .eq("statut", "actif");
      if (contratsError) throw contratsError;

      const totalLocataires = contratsActifs?.length || 0;

      // Get monthly revenue (paiements du mois en cours)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: paiementsMois, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant")
        .gte("date_paiement", `${currentMonth}-01`)
        .lte("date_paiement", `${currentMonth}-31`);
      if (paiementsError) throw paiementsError;

      const revenusMensuels = paiementsMois?.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;

      // Get late payments
      const { data: paiementsRetard, error: retardError } = await supabase
        .from("paiements")
        .select("id")
        .eq("statut", "retard");
      if (retardError) throw retardError;

      const paiementsEnRetard = paiementsRetard?.length || 0;

      // Get today's payments
      const today = new Date().toISOString().split("T")[0];
      const { data: paiementsAujourdhui, error: todayError } = await supabase
        .from("paiements")
        .select("id")
        .eq("date_paiement", today);
      if (todayError) throw todayError;

      const paiementsDuJour = paiementsAujourdhui?.length || 0;

      return {
        totalBiens,
        biensOccupes,
        biensDisponibles,
        totalProprietaires,
        totalLocataires,
        revenusMensuels,
        paiementsEnRetard,
        paiementsDuJour,
      };
    },
  });

  const statsCards = [
    {
      title: "Biens totaux",
      value: stats?.totalBiens || 0,
      icon: Building2,
      description: `${stats?.biensOccupes || 0} occupés, ${stats?.biensDisponibles || 0} disponibles`,
    },
    {
      title: "Propriétaires",
      value: stats?.totalProprietaires || 0,
      icon: Users,
      description: "Actifs dans le système",
    },
    {
      title: "Locataires",
      value: stats?.totalLocataires || 0,
      icon: UserCheck,
      description: "Contrats en cours",
    },
    {
      title: "Revenus mensuels",
      value: `${((stats?.revenusMensuels || 0) / 1000000).toFixed(1)}M CFA`,
      icon: TrendingUp,
      description: "Loyers collectés ce mois",
    },
  ];

  const recentAlerts = [
    ...(stats?.paiementsEnRetard && stats.paiementsEnRetard > 0
      ? [
          {
            id: 1,
            type: "warning" as const,
            message: `${stats.paiementsEnRetard} paiement${stats.paiementsEnRetard > 1 ? "s" : ""} en retard`,
            date: "Aujourd'hui",
          },
        ]
      : []),
    ...(stats?.paiementsDuJour && stats.paiementsDuJour > 0
      ? [
          {
            id: 2,
            type: "success" as const,
            message: `${stats.paiementsDuJour} paiement${stats.paiementsDuJour > 1 ? "s" : ""} reçu${stats.paiementsDuJour > 1 ? "s" : ""} aujourd'hui`,
            date: "Aujourd'hui",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre activité immobilière</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Alerts & Activities */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alertes récentes</CardTitle>
            <CardDescription>Notifications importantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  {alert.type === "warning" && <AlertCircle className="h-5 w-5 text-warning mt-0.5" />}
                  {alert.type === "success" && <CheckCircle className="h-5 w-5 text-success mt-0.5" />}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune alerte pour le moment</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biens par statut</CardTitle>
            <CardDescription>Répartition de votre portefeuille</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Biens occupés</p>
                  <p className="text-xs text-muted-foreground">Contrats actifs</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg font-semibold">
                {stats?.biensOccupes || 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Biens disponibles</p>
                  <p className="text-xs text-muted-foreground">Prêts à louer</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg font-semibold">
                {stats?.biensDisponibles || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
