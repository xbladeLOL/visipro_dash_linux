import {
  EmailStatus,
  InvoiceStatus,
  ProjectStatus,
  ProspectStage,
  QuoteStatus,
  SubscriptionInterval,
  SubscriptionStatus,
  TaskStatus,
  TransactionType,
} from "@prisma/client";
import { startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { calculateMrr } from "@/lib/financial";
import { prospectStageLabels, projectStatusLabels, taskStatusLabels } from "@/lib/labels";
import { unsubscribeFeedbackReasonLabel } from "@/lib/email/unsubscribe-feedback";

type CountRow<T extends string> = { key: T; label: string; count: number; percentage: number };

function countBy<T extends string>(values: T[], order: readonly T[], labels: Record<T, string>): CountRow<T>[] {
  const total = values.length;
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return order.map((key) => ({
    key,
    label: labels[key],
    count: counts.get(key) ?? 0,
    percentage: total === 0 ? 0 : (counts.get(key) ?? 0) / total,
  }));
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getAnalytics() {
  const now = new Date();
  const yearStart = startOfYear(now);
  const thirtyDaysAgo = subDays(now, 30);
  const chartStart = startOfMonth(subMonths(now, 11));

  const [
    transactions,
    invoices,
    quotes,
    prospects,
    clientCount,
    projects,
    tasks,
    subscriptions,
    emailStatusGroups,
    emailsLast30Days,
    suppressions,
    feedbackGroups,
    services,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: chartStart } },
      select: { date: true, amount: true, type: true, categoryLabel: true, category: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.invoice.findMany({
      select: {
        status: true,
        total: true,
        paidAmount: true,
        remainingAmount: true,
        issuedAt: true,
        client: { select: { id: true, legalName: true } },
      },
    }),
    prisma.quote.findMany({ select: { status: true, total: true, issuedAt: true } }),
    prisma.prospect.findMany({
      select: { stage: true, source: true, potentialValue: true, createdAt: true, lostAt: true },
    }),
    prisma.client.count(),
    prisma.project.findMany({
      select: {
        status: true,
        price: true,
        progress: true,
        deadline: true,
        serviceId: true,
      },
    }),
    prisma.task.findMany({ select: { status: true, priority: true, dueDate: true } }),
    prisma.subscription.findMany({ select: { amount: true, interval: true, status: true } }),
    prisma.emailQueue.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.emailQueue.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.emailSuppression.count(),
    prisma.emailUnsubscribeFeedback.groupBy({ by: ["reasonCode"], _count: { _all: true } }),
    prisma.service.findMany({ select: { id: true, name: true } }),
  ]);

  const financialMonths = Array.from({ length: 12 }, (_, index) => {
    const date = subMonths(now, 11 - index);
    return {
      key: monthKey(date),
      month: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(date),
      revenue: 0,
      expenses: 0,
      profit: 0,
    };
  });
  const monthMap = new Map(financialMonths.map((row) => [row.key, row]));
  const expenseCategories = new Map<string, number>();
  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const bucket = monthMap.get(monthKey(transaction.date));
    if (bucket) {
      if (transaction.type === TransactionType.INCOME) bucket.revenue += amount;
      if (transaction.type === TransactionType.EXPENSE) bucket.expenses += amount;
      bucket.profit = bucket.revenue - bucket.expenses;
    }
    if (transaction.type === TransactionType.EXPENSE) {
      const category = transaction.category?.name ?? transaction.categoryLabel ?? "Sans catégorie";
      expenseCategories.set(category, (expenseCategories.get(category) ?? 0) + amount);
    }
  }

  const activeInvoices = invoices.filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED);
  const invoiceTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const paidTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  const remainingTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const overdueInvoices = activeInvoices.filter((invoice) => invoice.status === InvoiceStatus.OVERDUE);
  const clientRevenue = new Map<string, { name: string; total: number; paid: number; invoices: number }>();
  for (const invoice of activeInvoices) {
    const current = clientRevenue.get(invoice.client.id) ?? { name: invoice.client.legalName, total: 0, paid: 0, invoices: 0 };
    current.total += Number(invoice.total);
    current.paid += Number(invoice.paidAmount);
    current.invoices += 1;
    clientRevenue.set(invoice.client.id, current);
  }

  const decidedQuoteStatuses = new Set<QuoteStatus>([QuoteStatus.ACCEPTED, QuoteStatus.REFUSED, QuoteStatus.EXPIRED]);
  const closedProjectStatuses = new Set<ProjectStatus>([ProjectStatus.DELIVERED, ProjectStatus.ARCHIVED]);
  const closedTaskStatuses = new Set<TaskStatus>([TaskStatus.DONE, TaskStatus.CANCELLED]);
  const closedProspectStages = new Set<ProspectStage>([ProspectStage.WON, ProspectStage.LOST]);
  const acceptedQuotes = quotes.filter((quote) => quote.status === QuoteStatus.ACCEPTED);
  const decidedQuotes = quotes.filter((quote) => decidedQuoteStatuses.has(quote.status));
  const wonProspects = prospects.filter((prospect) => prospect.stage === ProspectStage.WON);
  const lostProspects = prospects.filter((prospect) => prospect.stage === ProspectStage.LOST);
  const decidedProspects = wonProspects.length + lostProspects.length;
  const activeProjects = projects.filter((project) => !closedProjectStatuses.has(project.status));
  const openTasks = tasks.filter((task) => !closedTaskStatuses.has(task.status));
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < now);
  const overdueProjects = activeProjects.filter((project) => project.deadline && project.deadline < now);
  const mrr = calculateMrr(subscriptions.map((subscription) => ({
    amount: Number(subscription.amount),
    interval: subscription.interval,
    status: subscription.status,
  })));

  const emailCounts = new Map(emailStatusGroups.map((row) => [row.status, row._count._all]));
  const totalEmails = [...emailCounts.values()].reduce((sum, count) => sum + count, 0);
  const deliveredEmails = emailCounts.get(EmailStatus.sent) ?? 0;
  const failedEmails = emailCounts.get(EmailStatus.failed) ?? 0;
  const terminalEmails = deliveredEmails + failedEmails + (emailCounts.get(EmailStatus.suppressed) ?? 0);
  const feedbackTotal = feedbackGroups.reduce((sum, row) => sum + row._count._all, 0);

  const sourceCounts = new Map<string, number>();
  for (const prospect of prospects) {
    const source = prospect.source?.trim() || "Non renseignée";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const serviceById = new Map(services.map((service) => [service.id, service.name]));
  const serviceStats = new Map<string, { name: string; projects: number; value: number; delivered: number }>();
  for (const project of projects) {
    const id = project.serviceId ?? "unassigned";
    const current = serviceStats.get(id) ?? {
      name: project.serviceId ? serviceById.get(project.serviceId) ?? "Service supprimé" : "Sans service",
      projects: 0,
      value: 0,
      delivered: 0,
    };
    current.projects += 1;
    current.value += Number(project.price);
    if (project.status === ProjectStatus.DELIVERED) current.delivered += 1;
    serviceStats.set(id, current);
  }

  const invoiceStatusLabels: Record<InvoiceStatus, string> = {
    DRAFT: "Brouillon", SENT: "Envoyée", PARTIALLY_PAID: "Partiellement payée", PAID: "Payée", OVERDUE: "En retard", CANCELLED: "Annulée",
  };
  const quoteStatusLabels: Record<QuoteStatus, string> = {
    DRAFT: "Brouillon", SENT: "Envoyé", VIEWED: "Consulté", ACCEPTED: "Accepté", REFUSED: "Refusé", EXPIRED: "Expiré",
  };
  const emailStatusLabels: Record<EmailStatus, string> = {
    draft: "Brouillon", approved: "Approuvé", scheduled: "Planifié", sending: "En cours", sent: "Envoyé", failed: "Échec", cancelled: "Annulé", suppressed: "Bloqué",
  };

  const revenueYear = financialMonths
    .filter((row) => row.key >= monthKey(yearStart))
    .reduce((sum, row) => sum + row.revenue, 0);
  const expensesYear = financialMonths
    .filter((row) => row.key >= monthKey(yearStart))
    .reduce((sum, row) => sum + row.expenses, 0);
  const currentMonth = financialMonths.at(-1)!;

  return {
    generatedAt: now,
    summary: {
      revenueMonth: currentMonth.revenue,
      revenueYear,
      profitYear: revenueYear - expensesYear,
      mrr,
      arr: mrr * 12,
      invoiceTotal,
      paidTotal,
      remainingTotal,
      collectionRate: invoiceTotal === 0 ? 0 : paidTotal / invoiceTotal,
      averageInvoice: activeInvoices.length === 0 ? 0 : invoiceTotal / activeInvoices.length,
      overdueInvoiceCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0),
      clients: clientCount,
      prospects: prospects.length,
      activeProjects: activeProjects.length,
      openTasks: openTasks.length,
    },
    finance: {
      months: financialMonths.map((row) => ({
        month: row.month,
        revenue: row.revenue,
        expenses: row.expenses,
        profit: row.profit,
      })),
      expensesByCategory: [...expenseCategories.entries()]
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      invoiceStatuses: countBy(activeInvoices.map((invoice) => invoice.status), Object.values(InvoiceStatus), invoiceStatusLabels),
      topClients: [...clientRevenue.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    },
    sales: {
      quoteCount: quotes.length,
      quoteValue: quotes.reduce((sum, quote) => sum + Number(quote.total), 0),
      acceptedQuoteValue: acceptedQuotes.reduce((sum, quote) => sum + Number(quote.total), 0),
      quoteAcceptanceRate: decidedQuotes.length === 0 ? 0 : acceptedQuotes.length / decidedQuotes.length,
      quoteStatuses: countBy(quotes.map((quote) => quote.status), Object.values(QuoteStatus), quoteStatusLabels),
      pipelineValue: prospects
        .filter((prospect) => !closedProspectStages.has(prospect.stage))
        .reduce((sum, prospect) => sum + Number(prospect.potentialValue), 0),
      wonProspects: wonProspects.length,
      lostProspects: lostProspects.length,
      conversionRate: prospects.length === 0 ? 0 : wonProspects.length / prospects.length,
      winRate: decidedProspects === 0 ? 0 : wonProspects.length / decidedProspects,
      newProspects30Days: prospects.filter((prospect) => prospect.createdAt >= thirtyDaysAgo).length,
      lostProspects30Days: prospects.filter((prospect) => prospect.lostAt && prospect.lostAt >= thirtyDaysAgo).length,
      prospectStages: countBy(prospects.map((prospect) => prospect.stage), Object.values(ProspectStage), prospectStageLabels),
      topSources: [...sourceCounts.entries()]
        .map(([label, count]) => ({ label, count, percentage: prospects.length === 0 ? 0 : count / prospects.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    },
    emails: {
      total: totalEmails,
      sent: deliveredEmails,
      failed: failedEmails,
      createdLast30Days: emailsLast30Days,
      sendSuccessRate: terminalEmails === 0 ? 0 : deliveredEmails / terminalEmails,
      statuses: Object.values(EmailStatus).map((key) => ({
        key,
        label: emailStatusLabels[key],
        count: emailCounts.get(key) ?? 0,
        percentage: totalEmails === 0 ? 0 : (emailCounts.get(key) ?? 0) / totalEmails,
      })),
      suppressions,
      feedbackTotal,
      feedbackRate: suppressions === 0 ? 0 : feedbackTotal / suppressions,
      feedbackReasons: feedbackGroups
        .map((row) => ({
          label: unsubscribeFeedbackReasonLabel(row.reasonCode),
          count: row._count._all,
          percentage: feedbackTotal === 0 ? 0 : row._count._all / feedbackTotal,
        }))
        .sort((a, b) => b.count - a.count),
    },
    production: {
      projectValue: projects.reduce((sum, project) => sum + Number(project.price), 0),
      averageProgress: activeProjects.length === 0 ? 0 : activeProjects.reduce((sum, project) => sum + project.progress, 0) / activeProjects.length,
      overdueProjects: overdueProjects.length,
      overdueTasks: overdueTasks.length,
      projectStatuses: countBy(projects.map((project) => project.status), Object.values(ProjectStatus), projectStatusLabels),
      taskStatuses: countBy(tasks.map((task) => task.status), Object.values(TaskStatus), taskStatusLabels),
      services: [...serviceStats.values()].sort((a, b) => b.value - a.value),
      activeSubscriptions: subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.ACTIVE).length,
      monthlySubscriptions: subscriptions.filter((subscription) => subscription.interval === SubscriptionInterval.MONTHLY && subscription.status === SubscriptionStatus.ACTIVE).length,
    },
  };
}
