import { Card, CardTitle } from "@/components/ui/card";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { getDashboardMetrics, getMonthlyFinancials, getUnsubscribeFeedbackStats } from "@/features/dashboard/queries";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const [metrics, chart, unsubscribeStats] = await Promise.all([getDashboardMetrics(), getMonthlyFinancials(), getUnsubscribeFeedbackStats()]);
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
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-semibold">Motifs de désinscription</h2><p className="text-sm text-muted-foreground">Réponses facultatives recueillies après une opposition aux sollicitations.</p></div>
          <div className="text-left sm:text-right"><div className="text-2xl font-semibold">{unsubscribeStats.totalResponses}</div><div className="text-xs text-muted-foreground">réponse{unsubscribeStats.totalResponses > 1 ? "s" : ""} · {formatPercent(unsubscribeStats.responseRate)} des oppositions</div></div>
        </div>
        {unsubscribeStats.reasons.length ? <div className="mt-6 space-y-4">{unsubscribeStats.reasons.map((reason) => <div key={reason.reasonCode}><div className="mb-1 flex items-center justify-between gap-4 text-sm"><span>{reason.label}</span><strong>{formatPercent(reason.percentage)} <span className="font-normal text-muted-foreground">({reason.count})</span></strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${reason.percentage * 100}%` }} /></div></div>)}</div> : <p className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Aucune réponse au questionnaire pour le moment. Les statistiques apparaîtront ici dès la première réponse.</p>}
        <p className="mt-5 text-xs text-muted-foreground">{unsubscribeStats.totalSuppressions} opposition{unsubscribeStats.totalSuppressions > 1 ? "s" : ""} enregistrée{unsubscribeStats.totalSuppressions > 1 ? "s" : ""} au total. Les commentaires libres ne sont pas affichés ici.</p>
      </Card>
    </div>
  );
}
