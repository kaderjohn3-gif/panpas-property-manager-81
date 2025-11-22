import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, DollarSign, Receipt } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Rapports = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Rapports Financiers
          </h1>
          <p className="text-muted-foreground">Analyse des revenus et dépenses par propriétaire</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
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
      </div>

      {isLoading ? (
        <div className="text-center py-12">Chargement des données...</div>
      ) : (
        <>
          {/* Cartes de résumé */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(financialData?.totals.benefice || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique comparatif par propriétaire */}
          <Card>
            <CardHeader>
              <CardTitle>Revenus vs Dépenses par Propriétaire</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={financialData?.byProprietaire || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nom" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                  />
                  <Legend />
                  <Bar dataKey="revenus" fill="#10b981" name="Revenus" />
                  <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique du bénéfice net par propriétaire */}
            <Card>
              <CardHeader>
                <CardTitle>Bénéfice Net par Propriétaire</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData?.byProprietaire || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                    />
                    <Bar dataKey="benefice" fill="#3b82f6" name="Bénéfice">
                      {financialData?.byProprietaire.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.benefice >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Répartition des revenus par propriétaire */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
                    <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tableau détaillé */}
          <Card>
            <CardHeader>
              <CardTitle>Détails par Propriétaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Propriétaire</th>
                      <th className="text-right p-2 font-medium">Revenus</th>
                      <th className="text-right p-2 font-medium">Dépenses</th>
                      <th className="text-right p-2 font-medium">Bénéfice</th>
                      <th className="text-right p-2 font-medium">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData?.byProprietaire.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{item.nom}</td>
                        <td className="text-right p-2 text-green-600">
                          {item.revenus.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {item.depenses.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className={`text-right p-2 font-medium ${item.benefice >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {item.benefice.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="text-right p-2">
                          {item.revenus > 0 ? `${((item.benefice / item.revenus) * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-muted/50">
                      <td className="p-2">TOTAL</td>
                      <td className="text-right p-2 text-green-600">
                        {financialData?.totals.revenus.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="text-right p-2 text-red-600">
                        {financialData?.totals.depenses.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className={`text-right p-2 ${(financialData?.totals.benefice || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {financialData?.totals.benefice.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="text-right p-2">
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
