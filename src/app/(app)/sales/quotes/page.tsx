import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({ include: { client: true, prospect: true }, orderBy: { issuedAt: "desc" } });
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Devis</h1><p className="text-muted-foreground">Numérotation, lignes, statuts et conversion future en facture.</p></div><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Numéro</th><th>Destinataire</th><th>Date</th><th>Total</th><th>Statut</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id} className="border-t"><td className="py-3 font-medium">{quote.number}</td><td>{quote.client?.legalName ?? quote.prospect?.companyName ?? "-"}</td><td>{quote.issuedAt.toLocaleDateString("fr-FR")}</td><td>{formatCurrency(Number(quote.total))}</td><td>{quote.status}</td></tr>)}</tbody></table></Card></div>;
}
