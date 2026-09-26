import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function CashFlowPage() {
  const settings = await prisma.companySettings.findFirst();
  const income = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "INCOME" } });
  const expenses = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "EXPENSE" } });
  const receivable = await prisma.invoice.aggregate({ _sum: { remainingAmount: true }, where: { remainingAmount: { gt: 0 } } });
  const balance = Number(settings?.initialCashBalance ?? 0) + Number(income._sum.amount ?? 0) - Number(expenses._sum.amount ?? 0);
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Trésorerie</h1><p className="text-muted-foreground">Solde actuel et prévision simple.</p></div><div className="grid gap-4 md:grid-cols-4"><Card><h2 className="text-sm text-muted-foreground">Solde actuel</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(balance)}</p></Card><Card><h2 className="text-sm text-muted-foreground">Entrées totales</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(income._sum.amount ?? 0))}</p></Card><Card><h2 className="text-sm text-muted-foreground">Sorties totales</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(expenses._sum.amount ?? 0))}</p></Card><Card><h2 className="text-sm text-muted-foreground">À encaisser</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(Number(receivable._sum.remainingAmount ?? 0))}</p></Card></div></div>;
}
