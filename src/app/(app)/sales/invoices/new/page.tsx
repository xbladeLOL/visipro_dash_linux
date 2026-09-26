import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createInvoice } from "@/features/invoices/actions";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const [clients, services] = await Promise.all([prisma.client.findMany({ orderBy: { legalName: "asc" } }), prisma.service.findMany({ orderBy: { name: "asc" } })]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouvelle facture</h1>
        <p className="text-muted-foreground">Crée une facture brouillon avec une première ligne.</p>
      </div>
      <Card>
        <form action={createInvoice} className="grid gap-4 md:grid-cols-2">
          <select name="clientId" className="h-10 rounded-lg border bg-card px-3 text-sm" required>
            <option value="">Client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}
          </select>
          <select name="serviceId" className="h-10 rounded-lg border bg-card px-3 text-sm">
            <option value="">Service</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
          <Input name="description" placeholder="Description de la prestation" required />
          <Input name="quantity" type="number" step="0.01" defaultValue="1" placeholder="Quantité" />
          <Input name="unitPrice" type="number" step="0.01" placeholder="Prix unitaire HT" required />
          <Input name="taxRate" type="number" step="0.01" defaultValue="20" placeholder="TVA %" />
          <Input name="paymentDelay" type="number" defaultValue="30" placeholder="Délai paiement jours" />
          <Textarea name="notes" placeholder="Notes" />
          <Button className="md:col-span-2">Créer la facture</Button>
        </form>
      </Card>
    </div>
  );
}
