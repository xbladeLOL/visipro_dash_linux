import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({ include: { client: true, category: true, invoice: true }, orderBy: { date: "desc" } });
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Transactions</h1><p className="text-muted-foreground">Table centrale prête pour synchronisation bancaire.</p></div><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Date</th><th>Type</th><th>Montant</th><th>Catégorie</th><th>Client/Fournisseur</th><th>Référence</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-t"><td className="py-3">{transaction.date.toLocaleDateString("fr-FR")}</td><td>{transaction.type}</td><td>{formatCurrency(Number(transaction.amount))}</td><td>{transaction.category?.name ?? transaction.categoryLabel ?? "-"}</td><td>{transaction.client?.legalName ?? transaction.vendor ?? "-"}</td><td>{transaction.reference ?? transaction.invoice?.number ?? "-"}</td></tr>)}</tbody></table></Card></div>;
}
