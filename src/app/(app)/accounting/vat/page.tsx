import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function VatPage() {
  const [invoices, expenses] = await Promise.all([prisma.invoice.aggregate({ _sum: { tax: true } }), prisma.expense.aggregate({ _sum: { taxAmount: true } })]);
  const collected = Number(invoices._sum.tax ?? 0);
  const deductible = Number(expenses._sum.taxAmount ?? 0);
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">TVA</h1><p className="text-muted-foreground">Estimation issue des données saisies. Ne remplace pas un avis comptable.</p></div><div className="grid gap-4 md:grid-cols-3"><Card><h2 className="text-sm text-muted-foreground">TVA collectée</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(collected)}</p></Card><Card><h2 className="text-sm text-muted-foreground">TVA déductible</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(deductible)}</p></Card><Card><h2 className="text-sm text-muted-foreground">Différence estimée</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(collected - deductible)}</p></Card></div></div>;
}
