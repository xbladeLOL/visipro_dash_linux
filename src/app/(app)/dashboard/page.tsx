import { Card, CardTitle } from "@/components/ui/card";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { getDashboardMetrics, getMonthlyFinancials } from "@/features/dashboard/queries";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const [metrics, chart] = await Promise.all([getDashboardMetrics(), getMonthlyFinancials()]);
  const cards = [
    ["CA du mois", formatCurrency(metrics.revenueMonth), formatPercent(metrics.monthGrowth)],
    ["CA année", formatCurrency(metrics.revenueYear), "Année courante"],
    ["Résultat estimé", formatCurrency(metrics.estimatedProfit), "CA - dépenses"],
    ["Trésorerie à encaisser", formatCurrency(metrics.cashToCollect), `${metrics.overdueInvoices} en retard`],
    ["Dépenses du mois", formatCurrency(metrics.expensesMonth), "Sorties enregistrées"],
    ["MRR", formatCurrency(metrics.mrr), "Revenus récurrents"],
    ["Prospects", String(metrics.prospects), `${formatPercent(metrics.conversionRate)} conversion`],
    ["Projets actifs", String(metrics.activeProjects), "Production"]
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vision globale commerciale, production et financière.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, helper]) => (
          <Card key={label}>
            <CardTitle>{label}</CardTitle>
            <div className="mt-3 text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
          </Card>
        ))}
      </section>
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">CA, dépenses et résultat</h2>
          <p className="text-sm text-muted-foreground">Graphique basé sur les transactions enregistrées.</p>
        </div>
        <MonthlyChart data={chart} />
      </Card>
    </div>
  );
}
