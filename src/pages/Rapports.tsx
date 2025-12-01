import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, DollarSign, Receipt, Users, Printer } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { generateRapportPDF, imageToBase64 } from "@/lib/pdf-generator";
import logo from "@/assets/logo-panpas.jpg";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Rapports = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const handlePrintReport = async () => {
    if (!financialData) {
      toast.error("Aucune donnée à imprimer");
      return;
    }
    try {
      const logoBase64 = await imageToBase64(logo);
      await generateRapportPDF(financialData, selectedMonth, logoBase64);
      toast.success("Rapport généré avec succès");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erreur lors de la génération du rapport");
    }
  };
  
  const monthStart = startOfMonth(new Date(selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedMonth));

  // Générer les 12 derniers mois pour le sélecteur
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: fr })
    };
  });

  // Données pour l'évolution sur 12 mois
  const { data: evolutionData } = useQuery({
    queryKey: ["evolution-12-mois"],
    queryFn: async () => {
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), 11 - i);
        return {
          month: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale: fr })
        };
      });

      const monthlyData = await Promise.all(
        last12Months.map(async ({ month, label }) => {
          const monthStart = startOfMonth(new Date(month));
          const monthEnd = endOfMonth(new Date(month));

          const { data: paiements } = await supabase
            .from("paiements")
            .select("montant")
            .gte("date_paiement", format(monthStart, 'yyyy-MM-dd'))
            .lte("date_paiement", format(monthEnd, 'yyyy-MM-dd'));

          const { data: depenses } = await supabase
            .from("depenses")
            .select("montant")
            .gte("date_depense", format(monthStart, 'yyyy-MM-dd'))
            .lte("date_depense", format(monthEnd, 'yyyy-MM-dd'));

          const revenus = paiements?.reduce((sum, p) => sum + Number(p.montant), 0) || 0;
          const charges = depenses?.reduce((sum, d) => sum + Number(d.montant), 0) || 0;

          return {
            mois: label,
            revenus,
            depenses: charges,
            benefice: revenus - charges
          };
        })
      );

      // Calculer les prévisions basées sur la tendance des 3 derniers mois
      const last3Months = monthlyData.slice(-3);
      const avgRevenus = last3Months.reduce((sum, m) => sum + m.revenus, 0) / 3;
      const avgDepenses = last3Months.reduce((sum, m) => sum + m.depenses, 0) / 3;
      
      // Tendance simple (moyenne des 3 derniers mois)
      const nextMonth1 = subMonths(new Date(), -1);
      const nextMonth2 = subMonths(new Date(), -2);
      
      return {
        historical: monthlyData,
        forecast: [
          {
            mois: format(nextMonth1, 'MMM yy', { locale: fr }),
            revenus: avgRevenus,
            depenses: avgDepenses,
            benefice: avgRevenus - avgDepenses,
            prevision: true
          },
          {
            mois: format(nextMonth2, 'MMM yy', { locale: fr }),
            revenus: avgRevenus * 1.02, // Croissance de 2%
            depenses: avgDepenses,
            benefice: (avgRevenus * 1.02) - avgDepenses,
            prevision: true
          }
        ]
      };
    },
  });

  // Récupérer les données financières
  const { data: financialData, isLoading } = useQuery({
    queryKey: ["financial-report", selectedMonth],
    queryFn: async () => {
      // Récupérer les propriétaires avec leurs biens
      const { data: proprietaires } = await supabase
        .from("proprietaires")
        .select("id, nom");

      // Récupérer tous les paiements du mois
      const { data: paiements } = await supabase
        .from("paiements")
        .select("montant, bien_id, biens(proprietaire_id)")
        .gte("date_paiement", format(monthStart, 'yyyy-MM-dd'))
        .lte("date_paiement", format(monthEnd, 'yyyy-MM-dd'));

      // Récupérer toutes les dépenses du mois
      const { data: depenses } = await supabase
        .from("depenses")
        .select("montant, bien_id, biens(proprietaire_id)")
        .gte("date_depense", format(monthStart, 'yyyy-MM-dd'))
        .lte("date_depense", format(monthEnd, 'yyyy-MM-dd'));

      // Agréger par propriétaire
      const dataByProprietaire = proprietaires?.map(prop => {
        const revenus = paiements
          ?.filter(p => p.biens?.proprietaire_id === prop.id)
          .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

        const charges = depenses
          ?.filter(d => d.biens?.proprietaire_id === prop.id)
          .reduce((sum, d) => sum + Number(d.montant), 0) || 0;

        return {
          nom: prop.nom,
          revenus,
          depenses: charges,
          benefice: revenus - charges
        };
      }) || [];

      const totalRevenus = dataByProprietaire.reduce((sum, d) => sum + d.revenus, 0);
      const totalDepenses = dataByProprietaire.reduce((sum, d) => sum + d.depenses, 0);

      return {
        byProprietaire: dataByProprietaire,
        totals: {
          revenus: totalRevenus,
          depenses: totalDepenses,
          benefice: totalRevenus - totalDepenses
        }
      };
    },
  });

  // Données pour le graphique en camembert des revenus par propriétaire
  const pieData = financialData?.byProprietaire
    .filter(d => d.revenus > 0)
    .map(d => ({
      name: d.nom,
      value: d.revenus
    })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            <FileText className="h-8 w-8 text-primary" />
            Rapports Financiers
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Analyse des revenus et dépenses par propriétaire</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px] h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePrintReport} className="gap-2 h-11">
            <Printer className="h-4 w-4" />
            Imprimer le Rapport
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Chargement des données...</div>
      ) : (
        <>
          {/* Cartes de résumé */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="hover-lift overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-success/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-success">
                  {financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="h-5 w-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-destructive">
                  {financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift overflow-hidden relative group sm:col-span-2 lg:col-span-1">
              <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${(financialData?.totals.benefice || 0) >= 0 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                  <DollarSign className={`h-5 w-5 ${(financialData?.totals.benefice || 0) >= 0 ? 'text-primary' : 'text-destructive'}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={`text-3xl font-bold ${(financialData?.totals.benefice || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique d'évolution sur 12 mois avec prévisions */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Évolution sur 12 Mois avec Prévisions
              </CardTitle>
              <p className="text-sm text-muted-foreground">Historique et projection des 2 prochains mois</p>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={400} minWidth={300}>
                  <LineChart data={[...(evolutionData?.historical || []), ...(evolutionData?.forecast || [])]}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="mois" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                      contentStyle={{ fontSize: 12, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line 
                      type="monotone" 
                      dataKey="revenus" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={3}
                      name="Revenus"
                      connectNulls
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="depenses" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={3}
                      name="Dépenses"
                      connectNulls
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benefice" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Bénéfice"
                      connectNulls
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Les prévisions sont basées sur la moyenne des 3 derniers mois
              </p>
            </CardContent>
          </Card>

          {/* Graphique comparatif par propriétaire */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Revenus vs Dépenses par Propriétaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={400} minWidth={300}>
                  <BarChart data={financialData?.byProprietaire || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="nom" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                      contentStyle={{ fontSize: 12, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenus" fill="hsl(var(--success))" name="Revenus" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="depenses" fill="hsl(var(--destructive))" name="Dépenses" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique du bénéfice net par propriétaire */}
            <Card>
              <CardHeader>
                <CardTitle>Bénéfice Net par Propriétaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300} minWidth={250}>
                    <BarChart data={financialData?.byProprietaire || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="nom" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="benefice" fill="#3b82f6" name="Bénéfice">
                        {financialData?.byProprietaire.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.benefice >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Répartition des revenus par propriétaire */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300} minWidth={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau détaillé */}
          <Card>
            <CardHeader>
              <CardTitle>Détails par Propriétaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium whitespace-nowrap">Propriétaire</th>
                      <th className="text-right p-2 font-medium whitespace-nowrap">Revenus</th>
                      <th className="text-right p-2 font-medium whitespace-nowrap">Dépenses</th>
                      <th className="text-right p-2 font-medium whitespace-nowrap">Bénéfice</th>
                      <th className="text-right p-2 font-medium whitespace-nowrap">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData?.byProprietaire.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-2 font-medium">{item.nom}</td>
                        <td className="text-right p-2 text-green-600 whitespace-nowrap">
                          {item.revenus.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="text-right p-2 text-red-600 whitespace-nowrap">
                          {item.depenses.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className={`text-right p-2 font-medium whitespace-nowrap ${item.benefice >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {item.benefice.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="text-right p-2 whitespace-nowrap">
                          {item.revenus > 0 ? `${((item.benefice / item.revenus) * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-muted/50">
                      <td className="p-2">TOTAL</td>
                      <td className="text-right p-2 text-green-600 whitespace-nowrap">
                        {financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="text-right p-2 text-red-600 whitespace-nowrap">
                        {financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className={`text-right p-2 whitespace-nowrap ${(financialData?.totals.benefice || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="text-right p-2 whitespace-nowrap">
                        {financialData?.totals.revenus ? 
                          `${((financialData.totals.benefice / financialData.totals.revenus) * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Rapports;
