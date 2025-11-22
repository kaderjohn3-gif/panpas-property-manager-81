import { StatsCard } from "@/components/dashboard/StatsCard";
import { Building2, Users, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  // Mock data - sera remplacé par des données réelles
  const stats = [
    {
      title: "Biens totaux",
      value: 45,
      icon: Building2,
      description: "32 occupés, 13 disponibles",
      trend: { value: "+3 ce mois", isPositive: true },
    },
    {
      title: "Propriétaires",
      value: 28,
      icon: Users,
      description: "Actifs dans le système",
    },
    {
      title: "Locataires",
      value: 32,
      icon: UserCheck,
      description: "Contrats en cours",
      trend: { value: "+2 ce mois", isPositive: true },
    },
    {
      title: "Revenus mensuels",
      value: "4.2M CFA",
      icon: TrendingUp,
      description: "Loyers collectés",
      trend: { value: "+12%", isPositive: true },
    },
  ];

  const recentAlerts = [
    { id: 1, type: "warning", message: "5 paiements en retard", date: "Aujourd'hui" },
    { id: 2, type: "info", message: "3 contrats arrivent à échéance", date: "Cette semaine" },
    { id: 3, type: "success", message: "8 paiements reçus aujourd'hui", date: "Aujourd'hui" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre activité immobilière
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                {alert.type === "warning" && (
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                )}
                {alert.type === "info" && (
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                )}
                {alert.type === "success" && (
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.date}</p>
                </div>
              </div>
            ))}
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
                32
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
                13
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
