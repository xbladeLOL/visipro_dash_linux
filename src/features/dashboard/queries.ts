import { startOfMonth, startOfYear, subMonths } from "date-fns";
import { InvoiceStatus, ProspectStage, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMrr } from "@/lib/financial";

export async function getDashboardMetrics() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const yearStart = startOfYear(now);

  const [monthRevenue, prevMonthRevenue, yearRevenue, expensesMonth, pendingInvoices, overdueInvoices, prospects, wonProspects, activeProjects, subscriptions] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: TransactionType.INCOME, date: { gte: monthStart } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: TransactionType.INCOME, date: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: TransactionType.INCOME, date: { gte: yearStart } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: TransactionType.EXPENSE, date: { gte: monthStart } } }),
    prisma.invoice.aggregate({ _sum: { remainingAmount: true }, where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] } } }),
    prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
    prisma.prospect.count(),
    prisma.prospect.count({ where: { stage: ProspectStage.WON } }),
    prisma.project.count({ where: { status: { notIn: ["DELIVERED", "ARCHIVED"] } } }),
    prisma.subscription.findMany({ select: { amount: true, interval: true, status: true } })
  ]);

  const revenue = Number(monthRevenue._sum.amount ?? 0);
  const previousRevenue = Number(prevMonthRevenue._sum.amount ?? 0);
  const expenses = Number(expensesMonth._sum.amount ?? 0);

  return {
    revenueMonth: revenue,
    revenueYear: Number(yearRevenue._sum.amount ?? 0),
    monthGrowth: previousRevenue === 0 ? 0 : (revenue - previousRevenue) / previousRevenue,
    expensesMonth: expenses,
    estimatedProfit: revenue - expenses,
    cashToCollect: Number(pendingInvoices._sum.remainingAmount ?? 0),
    overdueInvoices,
    prospects,
    conversionRate: prospects === 0 ? 0 : wonProspects / prospects,
    activeProjects,
    mrr: calculateMrr(subscriptions.map((subscription) => ({ amount: Number(subscription.amount), interval: subscription.interval, status: subscription.status })))
  };
}

export async function getMonthlyFinancials() {
  const rows = await prisma.transaction.findMany({
    where: { date: { gte: subMonths(new Date(), 11) } },
    orderBy: { date: "asc" },
    select: { date: true, amount: true, type: true }
  });
  const buckets = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
  for (const row of rows) {
    const month = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
    const current = buckets.get(month) ?? { month, revenue: 0, expenses: 0, profit: 0 };
    if (row.type === TransactionType.INCOME) current.revenue += Number(row.amount);
    if (row.type === TransactionType.EXPENSE) current.expenses += Number(row.amount);
    current.profit = current.revenue - current.expenses;
    buckets.set(month, current);
  }
  return [...buckets.values()];
}
