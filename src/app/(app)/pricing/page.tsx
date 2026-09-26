import Link from "next/link";
import { PricingCatalogStatus } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { archivePricingCatalog, backfillPricingDetails, createPricingCatalog, duplicatePricingCatalog, ensureDefaultPricingCatalog } from "@/features/pricing/actions";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<PricingCatalogStatus, string> = { GLOBAL: "Générale", TEMPLATE: "Modèle", CLIENT_SPECIFIC: "Personnalisée", ARCHIVED: "Archivée" };

export default async function PricingPage() {
  await ensureDefaultPricingCatalog();
  await backfillPricingDetails();
  const [catalogs, clients, prospects] = await Promise.all([
    prisma.pricingCatalog.findMany({ include: { client: true, prospect: true, _count: { select: { items: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.client.findMany({ orderBy: { legalName: "asc" } }),
    prisma.prospect.findMany({ where: { stage: { notIn: ["WON", "LOST"] } }, orderBy: { companyName: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Grilles tarifaires</h1><p className="text-muted-foreground">Tarifs, versions, grilles personnalisées et exports commerciaux.</p></div>
      </div>
      <Card>
        <form action={createPricingCatalog} className="grid gap-3 md:grid-cols-4">
          <Input name="name" placeholder="Nom de la nouvelle grille" required />
          <Input name="version" placeholder="Version" defaultValue="2026" />
          <Button className="md:col-span-2">Créer une nouvelle grille</Button>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Nom</th><th>Statut</th><th>Cible</th><th>Prestations</th><th>Créée</th><th>Modifiée</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{catalogs.map((catalog) => <tr key={catalog.id} className="border-t align-top"><td className="py-3 font-medium">{catalog.name}<span className="block text-xs text-muted-foreground">Version {catalog.version}</span></td><td>{statusLabels[catalog.status]}</td><td>{catalog.client?.legalName ?? catalog.prospect?.companyName ?? "-"}</td><td>{catalog._count.items}</td><td>{catalog.createdAt.toLocaleDateString("fr-FR")}</td><td>{catalog.updatedAt.toLocaleDateString("fr-FR")}</td><td className="space-y-2 text-right"><div className="flex flex-wrap justify-end gap-2"><Link href={`/pricing/${catalog.id}`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Modifier</Link><Link href={`/pricing/${catalog.id}/preview`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Aperçu</Link><a href={`/api/pricing/${catalog.id}/export?format=csv`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">CSV</a><a href={`/api/pricing/${catalog.id}/export?format=json`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">JSON</a><form action={archivePricingCatalog}><input type="hidden" name="id" value={catalog.id} /><ConfirmSubmitButton message="Archiver cette grille ?" variant="ghost" className="h-7 px-2 text-xs text-red-600">Archiver</ConfirmSubmitButton></form></div><form action={duplicatePricingCatalog} className="grid gap-2 rounded-lg border p-2 text-left"><input type="hidden" name="id" value={catalog.id} /><Input name="name" placeholder="Nom de la copie" defaultValue={`${catalog.name} - copie`} /><div className="grid gap-2 md:grid-cols-2"><select name="clientId" className="h-9 rounded-lg border bg-card px-2 text-xs"><option value="">Client optionnel</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}</select><select name="prospectId" className="h-9 rounded-lg border bg-card px-2 text-xs"><option value="">Prospect optionnel</option>{prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.companyName}</option>)}</select></div><Button variant="secondary" className="h-8 text-xs">Dupliquer / personnaliser</Button></form></td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  );
}
