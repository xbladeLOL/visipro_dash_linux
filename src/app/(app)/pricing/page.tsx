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
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div><h1 className="text-3xl font-semibold">Grilles tarifaires</h1><p className="text-muted-foreground">Tarifs, versions, grilles personnalisées et exports commerciaux.</p></div>
      </div>
      <Card>
        <form action={createPricingCatalog} className="grid gap-3 lg:grid-cols-4">
          <Input name="name" placeholder="Nom de la nouvelle grille" required />
          <Input name="version" placeholder="Version" defaultValue="2026" />
          <Button className="lg:col-span-2">Créer une nouvelle grille</Button>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Nom</th><th>Statut</th><th>Cible</th><th>Prestations</th><th>Créée</th><th>Modifiée</th><th className="text-right">Actions</th></tr></thead>
          <tbody>{catalogs.map((catalog) => <tr key={catalog.id} className="border-t align-top"><td className="py-3 font-medium">{catalog.name}<span className="block text-xs text-muted-foreground">Version {catalog.version}</span></td><td>{statusLabels[catalog.status]}</td><td>{catalog.client?.legalName ?? catalog.prospect?.companyName ?? "-"}</td><td>{catalog._count.items}</td><td>{catalog.createdAt.toLocaleDateString("fr-FR")}</td><td>{catalog.updatedAt.toLocaleDateString("fr-FR")}</td><td className="space-y-2 text-right"><div className="flex flex-wrap justify-end gap-2"><Link href={`/pricing/${catalog.id}`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Modifier</Link><Link href={`/pricing/${catalog.id}/preview`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">Aperçu</Link><a href={`/api/pricing/${catalog.id}/export?format=csv`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">CSV</a><a href={`/api/pricing/${catalog.id}/export?format=json`} className="rounded-lg border px-3 py-1 text-xs hover:bg-muted">JSON</a><form action={archivePricingCatalog}><input type="hidden" name="id" value={catalog.id} /><ConfirmSubmitButton message="Archiver cette grille ?" variant="ghost" className="h-7 px-2 text-xs text-red-600">Archiver</ConfirmSubmitButton></form></div><form action={duplicatePricingCatalog} className="grid gap-2 rounded-lg border p-2 text-left"><input type="hidden" name="id" value={catalog.id} /><Input name="name" placeholder="Nom de la copie" defaultValue={`${catalog.name} - copie`} /><div className="grid gap-2 lg:grid-cols-2"><select name="clientId" className="h-9 w-full min-w-0 rounded-lg border bg-card px-2 text-xs"><option value="">Client optionnel</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}</select><select name="prospectId" className="h-9 w-full min-w-0 rounded-lg border bg-card px-2 text-xs"><option value="">Prospect optionnel</option>{prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.companyName}</option>)}</select></div><Button variant="secondary" className="h-8 text-xs">Dupliquer / personnaliser</Button></form></td></tr>)}</tbody>
        </table>
        </div>
        <div className="space-y-3 lg:hidden">
          {catalogs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Aucune grille tarifaire.</p> : null}
          {catalogs.map((catalog) => (
            <div key={catalog.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{catalog.name}</div>
                  <div className="text-xs text-muted-foreground">Version {catalog.version}</div>
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs">{statusLabels[catalog.status]}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="truncate">{catalog.client?.legalName ?? catalog.prospect?.companyName ?? "-"}</span>
                <span className="text-xs">{catalog._count.items} prestation(s)</span>
                <span className="text-xs">Modifiée {catalog.updatedAt.toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/pricing/${catalog.id}`} className="inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm hover:bg-muted">Modifier</Link>
                <Link href={`/pricing/${catalog.id}/preview`} className="inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm hover:bg-muted">Aperçu</Link>
                <a href={`/api/pricing/${catalog.id}/export?format=csv`} className="inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm hover:bg-muted">CSV</a>
                <a href={`/api/pricing/${catalog.id}/export?format=json`} className="inline-flex h-11 items-center justify-center rounded-lg border px-3 text-sm hover:bg-muted">JSON</a>
              </div>
              <form action={archivePricingCatalog} className="mt-2">
                <input type="hidden" name="id" value={catalog.id} />
                <ConfirmSubmitButton message="Archiver cette grille ?" variant="ghost" className="h-11 w-full text-sm text-red-600">Archiver</ConfirmSubmitButton>
              </form>
              <form action={duplicatePricingCatalog} className="mt-2 grid gap-2 rounded-lg border p-2 text-left">
                <input type="hidden" name="id" value={catalog.id} />
                <Input name="name" placeholder="Nom de la copie" defaultValue={`${catalog.name} - copie`} className="h-11" />
                <select name="clientId" className="h-11 w-full min-w-0 rounded-lg border bg-card px-2 text-sm"><option value="">Client optionnel</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}</select>
                <select name="prospectId" className="h-11 w-full min-w-0 rounded-lg border bg-card px-2 text-sm"><option value="">Prospect optionnel</option>{prospects.map((prospect) => <option key={prospect.id} value={prospect.id}>{prospect.companyName}</option>)}</select>
                <Button variant="secondary" className="h-11 text-sm">Dupliquer / personnaliser</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
