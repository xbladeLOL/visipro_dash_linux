import { DocumentType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createDocument } from "@/features/documents/actions";
import { prisma } from "@/lib/prisma";

export default async function NewDocumentPage() {
  const [clients, prospects, projects, quotes, invoices, expenses] = await Promise.all([
    prisma.client.findMany({ orderBy: { legalName: "asc" } }),
    prisma.prospect.findMany({ orderBy: { companyName: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.quote.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.invoice.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.expense.findMany({ orderBy: { date: "desc" } })
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouveau document</h1>
        <p className="text-muted-foreground">Référence un document externe et relie-le aux objets métier.</p>
      </div>
      <Card>
        <form action={createDocument} className="grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="Nom du document" required />
          <select name="type" className="h-10 rounded-lg border bg-card px-3 text-sm">
            {Object.values(DocumentType).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <Input name="url" placeholder="URL externe optionnelle" />
          <Input name="storageKey" placeholder="Clé stockage optionnelle" />
          <select name="clientId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}</select>
          <select name="prospectId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Prospect</option>{prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.companyName}</option>)}</select>
          <select name="projectId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Projet</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
          <select name="quoteId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Devis</option>{quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.number}</option>)}</select>
          <select name="invoiceId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Facture</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}</select>
          <select name="expenseId" className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Dépense</option>{expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.vendor} - {expense.description}</option>)}</select>
          <Button className="md:col-span-2">Créer le document</Button>
        </form>
      </Card>
    </div>
  );
}
