import { addDays, endOfDay, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function TodayPage() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const soon = addDays(new Date(), 7);
  const [tasks, followUps, dueInvoices, overdueInvoices, projects] = await Promise.all([
    prisma.task.findMany({ where: { OR: [{ dueDate: { gte: todayStart, lte: todayEnd } }, { projectId: { not: null } }], status: { notIn: ["DONE", "CANCELLED"] } }, include: { project: true, client: true }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 10 }),
    prisma.prospect.findMany({ where: { OR: [{ nextFollowUpAt: { lte: todayEnd } }, { stage: "TO_FOLLOW_UP" }], stage: { notIn: ["WON", "LOST"] } }, take: 10 }),
    prisma.invoice.findMany({ where: { dueDate: { gte: todayStart, lte: soon }, status: { in: ["SENT", "PARTIALLY_PAID"] } }, include: { client: true }, take: 10 }),
    prisma.invoice.findMany({ where: { dueDate: { lt: todayStart }, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } }, include: { client: true }, take: 10 }),
    prisma.project.findMany({ where: { deadline: { lte: soon }, status: { notIn: ["DELIVERED", "ARCHIVED"] } }, include: { client: true }, take: 10 })
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Aujourd&apos;hui</h1><p className="text-muted-foreground">Les priorités opérationnelles de la journée.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="font-semibold">Tâches à faire</h2><ul className="mt-4 space-y-3 text-sm">{tasks.map((task) => <li key={task.id} className="rounded-lg border p-3">{task.title}<span className="block text-muted-foreground">{task.client?.legalName ?? task.project?.name ?? "Indépendante"}</span></li>)}</ul></Card>
        <Card><h2 className="font-semibold">Relances prospects</h2><ul className="mt-4 space-y-3 text-sm">{followUps.map((prospect) => <li key={prospect.id} className="rounded-lg border p-3">{prospect.companyName}<span className="block text-muted-foreground">{prospect.nextAction ?? "Relancer"}</span></li>)}</ul></Card>
        <Card><h2 className="font-semibold">Factures à échéance</h2><ul className="mt-4 space-y-3 text-sm">{dueInvoices.map((invoice) => <li key={invoice.id} className="rounded-lg border p-3">{invoice.number} - {invoice.client.legalName}<span className="block text-muted-foreground">Reste {formatCurrency(Number(invoice.remainingAmount))}</span></li>)}</ul></Card>
        <Card><h2 className="font-semibold">Factures en retard</h2><ul className="mt-4 space-y-3 text-sm">{overdueInvoices.map((invoice) => <li key={invoice.id} className="rounded-lg border border-red-200 p-3">{invoice.number} - {invoice.client.legalName}<span className="block text-red-600">{formatCurrency(Number(invoice.remainingAmount))}</span></li>)}</ul></Card>
        <Card className="xl:col-span-2"><h2 className="font-semibold">Projets proches deadline</h2><ul className="mt-4 grid gap-3 md:grid-cols-2">{projects.map((project) => <li key={project.id} className="rounded-lg border p-3 text-sm">{project.name}<span className="block text-muted-foreground">{project.client.legalName} - {project.progress}%</span></li>)}</ul></Card>
      </div>
    </div>
  );
}
