import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PaymentStatusChart } from "@/components/dashboard/PaymentStatusChart";
import { Building2, Users, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const queryClient = useQueryClient();

  // Realtime subscription - Synchronisation complète
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
      .on("postgres_changes", { event: "*", schema: "public", table: "depenses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "proprietaires" }, () => {
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

      // Calculate commissions (10% of monthly revenue)
      const { data: biensWithCommissions } = await supabase
        .from("biens")
        .select("commission_pourcentage, loyer_mensuel, statut");
      
      const commissionTotale = biensWithCommissions
        ?.filter(b => b.statut === "occupe")
        .reduce((sum, b) => sum + (b.loyer_mensuel * (b.commission_pourcentage / 100)), 0) || 0;

      return {
        totalBiens,
        biensOccupes,
        biensDisponibles,
        totalProprietaires,
        totalLocataires,
        revenusMensuels,
        paiementsEnRetard,
        paiementsDuJour,
        commissionMensuelle: commissionTotale,
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
    {
      title: "Commission du mois",
      value: `${((stats?.commissionMensuelle || 0) / 1000).toFixed(0)}K CFA`,
      icon: TrendingUp,
      description: "Commission PANPAS (10%)",
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground text-lg">Vue d'ensemble de votre activité immobilière</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsCards.map((stat, index) => (
          <div key={stat.title} className="animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <OccupancyChart />
      </div>

      <div className="grid gap-4">
        <PaymentStatusChart />
      </div>

      {/* Recent Alerts & Activities */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Alertes récentes
            </CardTitle>
            <CardDescription>Notifications importantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-sm transition-all">
                  {alert.type === "warning" && <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />}
                  {alert.type === "success" && <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Aucune alerte pour le moment</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Biens par statut
            </CardTitle>
            <CardDescription>Répartition de votre portefeuille</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-success/5 to-success/10 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center ring-2 ring-success/30">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Biens occupés</p>
                  <p className="text-xs text-muted-foreground">Contrats actifs</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xl font-bold h-10 px-4">
                {stats?.biensOccupes || 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Biens disponibles</p>
                  <p className="text-xs text-muted-foreground">Prêts à louer</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xl font-bold h-10 px-4">
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
