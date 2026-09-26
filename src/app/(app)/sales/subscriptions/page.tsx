import { SubscriptionInterval, SubscriptionStatus } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSubscription, deleteSubscription } from "@/features/subscriptions/actions";
import { calculateMrr } from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function SubscriptionsPage() {
  const [subscriptions, clients, services] = await Promise.all([
    prisma.subscription.findMany({ include: { client: true }, orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ orderBy: { legalName: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } })
  ]);
  const mrr = calculateMrr(subscriptions.map((subscription) => ({ amount: Number(subscription.amount), interval: subscription.interval, status: subscription.status })));

  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Abonnements / MRR</h1><p className="text-muted-foreground">Revenus récurrents mensuels et abonnements clients.</p></div><Card><div className="text-sm text-muted-foreground">MRR actuel</div><div className="mt-2 text-3xl font-semibold">{formatCurrency(mrr)}</div></Card><Card><form action={createSubscription} className="grid gap-3 md:grid-cols-6"><Input name="name" placeholder="Nom abonnement" required /><select name="clientId" className="h-10 rounded-lg border bg-card px-3 text-sm" required><option value="">Client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}</select><select name="serviceId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><Input name="amount" type="number" step="0.01" placeholder="Montant" required /><select name="interval" className="h-10 rounded-lg border bg-card px-3 text-sm">{Object.values(SubscriptionInterval).map((interval) => <option key={interval} value={interval}>{interval === "MONTHLY" ? "Mensuel" : "Annuel"}</option>)}</select><select name="status" className="h-10 rounded-lg border bg-card px-3 text-sm">{Object.values(SubscriptionStatus).map((status) => <option key={status} value={status}>{status === "ACTIVE" ? "Actif" : status === "PAUSED" ? "En pause" : "Annulé"}</option>)}</select><Input name="startDate" type="date" /><Button className="md:col-span-5">Ajouter l&apos;abonnement</Button></form></Card><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Nom</th><th>Client</th><th>Montant</th><th>Intervalle</th><th>Statut</th><th className="text-right">Actions</th></tr></thead><tbody>{subscriptions.map((subscription) => <tr key={subscription.id} className="border-t"><td className="py-3 font-medium">{subscription.name}</td><td>{subscription.client.legalName}</td><td>{formatCurrency(Number(subscription.amount))}</td><td>{subscription.interval === "MONTHLY" ? "Mensuel" : "Annuel"}</td><td>{subscription.status === "ACTIVE" ? "Actif" : subscription.status === "PAUSED" ? "En pause" : "Annulé"}</td><td className="text-right"><form action={deleteSubscription}><input type="hidden" name="id" value={subscription.id} /><ConfirmSubmitButton message="Supprimer cet abonnement ?" variant="ghost" className="h-8 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton></form></td></tr>)}</tbody></table></Card></div>;
}
