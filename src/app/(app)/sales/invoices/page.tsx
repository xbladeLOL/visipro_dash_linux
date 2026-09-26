import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Card } from "@/components/ui/card";
import { deleteAllInvoices, deleteInvoice } from "@/features/invoices/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({ include: { client: true }, orderBy: { issuedAt: "desc" } });
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">Factures</h1><p className="text-muted-foreground">Facturation, statuts et montants à encaisser.</p></div><form action={deleteAllInvoices}><ConfirmSubmitButton message="Supprimer toutes les factures, paiements et transactions liées ?" variant="secondary" className="text-red-600">Supprimer toutes</ConfirmSubmitButton></form></div><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Numéro</th><th>Client</th><th>Date</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th><th className="text-right">Actions</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t"><td className="py-3 font-medium">{invoice.number}</td><td>{invoice.client.legalName}</td><td>{invoice.issuedAt.toLocaleDateString("fr-FR")}</td><td>{formatCurrency(Number(invoice.total))}</td><td>{formatCurrency(Number(invoice.paidAmount))}</td><td>{formatCurrency(Number(invoice.remainingAmount))}</td><td>{invoice.status}</td><td className="text-right"><form action={deleteInvoice}><input type="hidden" name="id" value={invoice.id} /><ConfirmSubmitButton message="Supprimer cette facture, ses paiements et transactions liées ?" variant="ghost" className="h-8 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton></form></td></tr>)}</tbody></table></Card></div>;
}
