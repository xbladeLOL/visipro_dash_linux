import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { getAnalytics } from "@/features/analytics/queries";
import { formatCurrency, formatPercent } from "@/lib/utils";

type DistributionRow = { label: string; count: number; percentage: number };

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <Card><CardTitle>{label}</CardTitle><div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div><p className="mt-1 text-sm text-muted-foreground">{helper}</p></Card>;
}

function Distribution({ rows, empty = "Aucune donnée pour le moment." }: { rows: DistributionRow[]; empty?: string }) {
  const visible = rows.filter((row) => row.count > 0);
  if (!visible.length) return <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-4">{visible.map((row) => <div key={row.label}>
    <div className="mb-1 flex items-center justify-between gap-4 text-sm"><span>{row.label}</span><strong>{row.count} <span className="font-normal text-muted-foreground">· {formatPercent(row.percentage)}</span></strong></div>
    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(row.percentage * 100, 1)}%` }} /></div>
  </div>)}</div>;
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return <div id={id} className="scroll-mt-24"><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>;
}

function MonthlyCounts({ rows }: { rows: { month: string; count: number }[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return <div className="grid h-48 grid-cols-12 items-end gap-1 sm:gap-2">{rows.map((row) => <div key={row.month} className="flex min-w-0 flex-col items-center gap-2">
    <span className="text-xs font-medium">{row.count}</span>
    <div className="flex h-28 w-full items-end rounded-md bg-muted"><div className="w-full rounded-md bg-primary" style={{ height: `${row.count ? Math.max((row.count / max) * 100, 6) : 0}%` }} /></div>
    <span className="w-full truncate text-center text-[10px] text-muted-foreground" title={row.month}>{row.month.split(" ")[0]}</span>
  </div>)}</div>;
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  const maxExpense = data.finance.expensesByCategory[0]?.amount ?? 0;
  const maxService = data.production.services[0]?.value ?? 0;

  return <div className="space-y-10">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><h1 className="text-3xl font-semibold tracking-tight">Statistiques</h1><p className="text-muted-foreground">Vue complète des performances financières, commerciales et opérationnelles de VisiPro.</p></div>
      <p className="text-xs text-muted-foreground">Actualisé le {data.generatedAt.toLocaleDateString("fr-FR")} à {data.generatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
    </div>

    <nav aria-label="Sections statistiques" className="flex gap-2 overflow-x-auto pb-1">
      {[["finance", "Finances"], ["ventes", "Ventes"], ["prospection", "Prospection"], ["emails", "E-mails"], ["production", "Production"]].map(([href, label]) => <Link key={href} href={`#${href}`} className="whitespace-nowrap rounded-full border bg-card px-4 py-2 text-sm hover:bg-muted">{label}</Link>)}
    </nav>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="CA du mois" value={formatCurrency(data.summary.revenueMonth)} helper={`${formatCurrency(data.summary.revenueYear)} depuis janvier`} />
      <StatCard label="Résultat annuel" value={formatCurrency(data.summary.profitYear)} helper="Revenus encaissés − dépenses" />
      <StatCard label="MRR" value={formatCurrency(data.summary.mrr)} helper={`${formatCurrency(data.summary.arr)} de revenu récurrent annualisé`} />
      <StatCard label="Encaissement" value={formatPercent(data.summary.collectionRate)} helper={`${formatCurrency(data.summary.remainingTotal)} restant à percevoir`} />
      <StatCard label="Clients" value={String(data.summary.clients)} helper={`${formatCurrency(data.summary.averageInvoice)} par facture en moyenne`} />
      <StatCard label="Prospects" value={String(data.summary.prospects)} helper={`${data.sales.newProspects30Days} ajoutés sur 30 jours`} />
      <StatCard label="Projets actifs" value={String(data.summary.activeProjects)} helper={`${data.production.overdueProjects} échéance${data.production.overdueProjects > 1 ? "s" : ""} dépassée${data.production.overdueProjects > 1 ? "s" : ""}`} />
      <StatCard label="Tâches ouvertes" value={String(data.summary.openTasks)} helper={`${data.production.overdueTasks} en retard`} />
    </section>

    <section className="space-y-5">
      <SectionHeading id="finance" title="Finances et facturation" description="Encaissements, dépenses, marge et état des factures." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturé" value={formatCurrency(data.summary.invoiceTotal)} helper="Factures non annulées" />
        <StatCard label="Encaissé" value={formatCurrency(data.summary.paidTotal)} helper={formatPercent(data.summary.collectionRate) + " du montant facturé"} />
        <StatCard label="À encaisser" value={formatCurrency(data.summary.remainingTotal)} helper="Solde de toutes les factures" />
        <StatCard label="Factures en retard" value={String(data.summary.overdueInvoiceCount)} helper={formatCurrency(data.summary.overdueAmount) + " en souffrance"} />
      </div>
      <Card><div className="mb-5"><h3 className="text-lg font-semibold">Évolution sur 12 mois</h3><p className="text-sm text-muted-foreground">Transactions encaissées, dépenses et résultat mensuel.</p></div><MonthlyChart data={data.finance.months} /></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h3 className="mb-5 text-lg font-semibold">État des factures</h3><Distribution rows={data.finance.invoiceStatuses} /></Card>
        <Card><h3 className="text-lg font-semibold">Dépenses par catégorie</h3><p className="mb-5 text-sm text-muted-foreground">Top des dépenses sur les 12 derniers mois.</p>{data.finance.expensesByCategory.length ? <div className="space-y-4">{data.finance.expensesByCategory.map((row) => <div key={row.label}><div className="mb-1 flex justify-between gap-4 text-sm"><span>{row.label}</span><strong>{formatCurrency(row.amount)}</strong></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-rose-500" style={{ width: `${maxExpense ? Math.max((row.amount / maxExpense) * 100, 1) : 0}%` }} /></div></div>)}</div> : <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Aucune dépense enregistrée.</p>}</Card>
      </div>
      <Card className="overflow-x-auto"><h3 className="text-lg font-semibold">Principaux clients</h3><p className="mb-4 text-sm text-muted-foreground">Classement selon le montant total facturé.</p>{data.finance.topClients.length ? <table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Client</th><th>Factures</th><th>Facturé</th><th>Encaissé</th><th>Taux</th></tr></thead><tbody>{data.finance.topClients.map((client) => <tr key={client.name} className="border-b last:border-0"><td className="py-3 font-medium">{client.name}</td><td>{client.invoices}</td><td>{formatCurrency(client.total)}</td><td>{formatCurrency(client.paid)}</td><td>{formatPercent(client.total === 0 ? 0 : client.paid / client.total)}</td></tr>)}</tbody></table> : <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Aucune facture client enregistrée.</p>}</Card>
    </section>

    <section className="space-y-5">
      <SectionHeading id="ventes" title="Ventes et devis" description="Volume, valeur et transformation des propositions commerciales." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Devis" value={String(data.sales.quoteCount)} helper={formatCurrency(data.sales.quoteValue) + " proposés"} />
        <StatCard label="Valeur acceptée" value={formatCurrency(data.sales.acceptedQuoteValue)} helper="Total des devis acceptés" />
        <StatCard label="Taux d’acceptation" value={formatPercent(data.sales.quoteAcceptanceRate)} helper="Parmi les devis décidés" />
        <StatCard label="Pipeline estimé" value={formatCurrency(data.sales.pipelineValue)} helper="Potentiel des prospects ouverts" />
      </div>
      <Card><h3 className="mb-5 text-lg font-semibold">État des devis</h3><Distribution rows={data.sales.quoteStatuses} /></Card>
    </section>

    <section className="space-y-5">
      <SectionHeading id="prospection" title="Prospection" description="Acquisition, avancement du pipeline et résultats commerciaux." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prospects gagnés" value={String(data.sales.wonProspects)} helper={formatPercent(data.sales.conversionRate) + " de tous les prospects"} />
        <StatCard label="Prospects perdus" value={String(data.sales.lostProspects)} helper={`${data.sales.lostProspects30Days} perdus sur 30 jours`} />
        <StatCard label="Taux de victoire" value={formatPercent(data.sales.winRate)} helper="Gagnés parmi les dossiers décidés" />
        <StatCard label="Nouveaux prospects" value={String(data.sales.newProspects30Days)} helper="Créés sur les 30 derniers jours" />
        <StatCard label="Relances en retard" value={String(data.sales.overdueFollowUps)} helper={`${data.sales.scheduledFollowUps} relance${data.sales.scheduledFollowUps > 1 ? "s" : ""} planifiée${data.sales.scheduledFollowUps > 1 ? "s" : ""}`} />
        <StatCard label="Âge moyen du pipeline" value={`${Math.round(data.sales.averageProspectAgeDays)} j`} helper="Prospects encore ouverts" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h3 className="mb-5 text-lg font-semibold">Étapes du pipeline</h3><Distribution rows={data.sales.prospectStages} /></Card>
        <Card><h3 className="mb-5 text-lg font-semibold">Origine des prospects</h3><Distribution rows={data.sales.topSources} /></Card>
      </div>
      <Card><h3 className="mb-1 text-lg font-semibold">Complétude des fiches prospects</h3><p className="mb-5 text-sm text-muted-foreground">Présence réelle des coordonnées et informations détectées.</p><Distribution rows={data.sales.dataCompleteness} /></Card>
    </section>

    <section className="space-y-5">
      <SectionHeading id="emails" title="E-mails et désinscriptions" description="Activité d’envoi, fiabilité et motifs d’opposition." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="E-mails envoyés" value={String(data.emails.sent)} helper={`${data.emails.createdLast30Days} créés sur 30 jours`} />
        <StatCard label="Succès d’envoi" value={formatPercent(data.emails.sendSuccessRate)} helper={`${data.emails.failed} échec${data.emails.failed > 1 ? "s" : ""}`} />
        <StatCard label="Désinscriptions" value={String(data.emails.suppressions)} helper="Oppositions enregistrées" />
        <StatCard label="Réponses au questionnaire" value={String(data.emails.feedbackTotal)} helper={formatPercent(data.emails.feedbackRate) + " des désinscriptions"} />
        <StatCard label="Tentatives d’envoi" value={String(data.emails.attempts)} helper={`${data.emails.retried} e-mail${data.emails.retried > 1 ? "s" : ""} relancé${data.emails.retried > 1 ? "s" : ""}`} />
        <StatCard label="À vérifier" value={String(data.emails.reviewRequired)} helper="E-mails nécessitant une revue" />
        <StatCard label="Commentaires reçus" value={String(data.emails.feedbackWithComment)} helper="Commentaires facultatifs renseignés" />
        <StatCard label="Délai avant opposition" value={data.emails.averageUnsubscribeDelayDays === null ? "—" : `${data.emails.averageUnsubscribeDelayDays.toFixed(1)} j`} helper="Moyenne mesurée après l’envoi" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h3 className="mb-5 text-lg font-semibold">État de la file d’e-mails</h3><Distribution rows={data.emails.statuses} /></Card>
        <Card><h3 className="mb-1 text-lg font-semibold">Résultat des tentatives</h3><p className="mb-5 text-sm text-muted-foreground">Réponses techniques réellement retournées par le fournisseur.</p><Distribution rows={data.emails.attemptOutcomes} /></Card>
        <Card><h3 className="mb-1 text-lg font-semibold">Motifs de désinscription</h3><p className="mb-5 text-sm text-muted-foreground">Motif obligatoire pour les nouvelles désinscriptions.</p><Distribution rows={data.emails.feedbackReasons} empty="Aucune réponse au questionnaire pour le moment." /></Card>
        <Card><h3 className="mb-1 text-lg font-semibold">Désinscriptions sur 12 mois</h3><p className="mb-5 text-sm text-muted-foreground">Oppositions effectivement enregistrées par mois.</p><MonthlyCounts rows={data.emails.unsubscribeMonths} /></Card>
      </div>
    </section>

    <section className="space-y-5">
      <SectionHeading id="production" title="Production et services" description="Charge de travail, avancement, délais et valeur du portefeuille." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valeur des projets" value={formatCurrency(data.production.projectValue)} helper="Ensemble du portefeuille" />
        <StatCard label="Avancement moyen" value={`${Math.round(data.production.averageProgress)} %`} helper="Sur les projets actifs" />
        <StatCard label="Abonnements actifs" value={String(data.production.activeSubscriptions)} helper={`${data.production.monthlySubscriptions} facturés mensuellement`} />
        <StatCard label="Retards" value={String(data.production.overdueProjects + data.production.overdueTasks)} helper={`${data.production.overdueProjects} projets · ${data.production.overdueTasks} tâches`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card><h3 className="mb-5 text-lg font-semibold">État des projets</h3><Distribution rows={data.production.projectStatuses} /></Card>
        <Card><h3 className="mb-5 text-lg font-semibold">État des tâches</h3><Distribution rows={data.production.taskStatuses} /></Card>
        <Card><h3 className="mb-5 text-lg font-semibold">Priorité des tâches</h3><Distribution rows={data.production.taskPriorities} /></Card>
      </div>
      <Card><h3 className="text-lg font-semibold">Performance par service</h3><p className="mb-5 text-sm text-muted-foreground">Valeur des projets rattachés à chaque service.</p>{data.production.services.length ? <div className="space-y-4">{data.production.services.map((service) => <div key={service.name}><div className="mb-1 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{service.name}</span><span>{service.projects} projet{service.projects > 1 ? "s" : ""} · {service.delivered} livré{service.delivered > 1 ? "s" : ""} · <strong>{formatCurrency(service.value)}</strong></span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${maxService ? Math.max((service.value / maxService) * 100, 1) : 0}%` }} /></div></div>)}</div> : <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Aucun projet rattaché à un service.</p>}</Card>
    </section>
  </div>;
}
