import { TransactionType } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ResultPage() {
  const transactions = await prisma.transaction.findMany({ include: { category: true } });
  const revenue = transactions.filter((t) => t.type === TransactionType.INCOME).reduce((sum, t) => sum + Number(t.amount), 0);
  const expenses = transactions.filter((t) => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + Number(t.amount), 0);
  const byCategory = new Map<string, number>();
  for (const transaction of transactions.filter((t) => t.type === TransactionType.EXPENSE)) byCategory.set(transaction.category?.name ?? transaction.categoryLabel ?? "Autres", (byCategory.get(transaction.category?.name ?? transaction.categoryLabel ?? "Autres") ?? 0) + Number(transaction.amount));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Compte de résultat</h1>
        <p className="text-muted-foreground">Vue simplifiée issue des transactions saisies.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm text-muted-foreground">Chiffre d&apos;affaires</h2>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(revenue)}</p>
        </Card>
        <Card>
          <h2 className="text-sm text-muted-foreground">Dépenses</h2>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(expenses)}</p>
        </Card>
        <Card>
          <h2 className="text-sm text-muted-foreground">Résultat avant impôt</h2>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(revenue - expenses)}</p>
        </Card>
      </div>
      <Card>
        <h2 className="font-semibold">Dépenses par catégorie</h2>
        <div className="mt-4 space-y-2">
          {[...byCategory.entries()].map(([name, value]) => (
            <div key={name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b py-2 text-sm">
              <span className="min-w-0 break-words">{name}</span>
              <span className="shrink-0">-{formatCurrency(value)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
