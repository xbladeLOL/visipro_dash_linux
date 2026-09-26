import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id }, include: { projects: true, invoices: true, quotes: true, payments: true, subscriptions: true, documents: true } });
  if (!client) notFound();
  const revenue = client.invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">{client.legalName}</h1><p className="text-muted-foreground">{client.tradeName ?? client.email ?? "Fiche client"}</p></div><div className="grid gap-4 md:grid-cols-4"><Card><h2 className="text-sm text-muted-foreground">CA généré</h2><p className="mt-2 text-2xl font-semibold">{formatCurrency(revenue)}</p></Card><Card><h2 className="text-sm text-muted-foreground">Projets</h2><p className="mt-2 text-2xl font-semibold">{client.projects.length}</p></Card><Card><h2 className="text-sm text-muted-foreground">Factures</h2><p className="mt-2 text-2xl font-semibold">{client.invoices.length}</p></Card><Card><h2 className="text-sm text-muted-foreground">Abonnements</h2><p className="mt-2 text-2xl font-semibold">{client.subscriptions.length}</p></Card></div><Card><h2 className="font-semibold">Informations légales</h2><div className="mt-4 grid gap-2 text-sm md:grid-cols-2"><div>SIRET : {client.siret ?? "-"}</div><div>TVA : {client.vatNumber ?? "-"}</div><div>Email : {client.email ?? "-"}</div><div>Téléphone : {client.phone ?? "-"}</div><div>Site : {client.website ?? "-"}</div><div>Adresse : {client.address ?? "-"}</div></div></Card></div>;
}
