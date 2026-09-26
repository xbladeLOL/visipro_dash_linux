import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createQuote } from "@/features/quotes/actions";
import { prisma } from "@/lib/prisma";

export default async function NewQuotePage() {
  const [clients, prospects, services] = await Promise.all([
    prisma.client.findMany({ orderBy: { legalName: "asc" } }),
    prisma.prospect.findMany({ where: { stage: { notIn: ["WON", "LOST"] } }, orderBy: { companyName: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouveau devis</h1>
        <p className="text-muted-foreground">Crée un devis avec une première ligne de prestation.</p>
      </div>
      <Card>
        <form action={createQuote} className="grid gap-4 md:grid-cols-2">
          <select name="clientId" className="h-10 rounded-lg border bg-card px-3 text-sm">
            <option value="">Client existant</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}
          </select>
          <select name="prospectId" className="h-10 rounded-lg border bg-card px-3 text-sm">
            <option value="">Prospect</option>
            {prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.companyName}</option>)}
          </select>
          <select name="serviceId" className="h-10 rounded-lg border bg-card px-3 text-sm">
            <option value="">Service</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
          <Input name="description" placeholder="Description de la prestation" required />
          <Input name="quantity" type="number" step="0.01" defaultValue="1" placeholder="Quantité" />
          <Input name="unitPrice" type="number" step="0.01" placeholder="Prix unitaire HT" required />
          <Input name="taxRate" type="number" step="0.01" defaultValue="20" placeholder="TVA %" />
          <Textarea name="notes" placeholder="Notes" />
          <Button className="md:col-span-2">Créer le devis</Button>
        </form>
      </Card>
    </div>
  );
}
