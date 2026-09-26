import Link from "next/link";
import { notFound } from "next/navigation";
import { PricingBillingType, PricingCatalogStatus, PricingDiscountType, PricingPdfMode } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addPricingCategory, addPricingItem, archivePricingCatalog, createQuoteFromPricing, updatePricingCatalogSettings } from "@/features/pricing/actions";
import { formatPricingPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<PricingCatalogStatus, string> = { GLOBAL: "Générale", TEMPLATE: "Modèle", CLIENT_SPECIFIC: "Personnalisée", ARCHIVED: "Archivée" };
const billingLabels: Record<PricingBillingType, string> = { ONE_TIME: "Ponctuel", MONTHLY: "Mensuel", YEARLY: "Annuel", CUSTOM: "Personnalisé" };

export default async function PricingCatalogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; category?: string; status?: string }> }) {
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const catalog = await prisma.pricingCatalog.findUnique({
    where: { id },
    include: { client: true, prospect: true, categories: { orderBy: { displayOrder: "asc" } }, items: { include: { category: true }, orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }] } }
  });
  if (!catalog) notFound();

  const filteredItems = catalog.items.filter((item) => {
    const matchesSearch = filters.q ? `${item.name} ${item.shortDescription ?? ""}`.toLowerCase().includes(filters.q.toLowerCase()) : true;
    const matchesCategory = filters.category ? item.categoryId === filters.category : true;
    const matchesStatus = filters.status === "inactive" ? !item.isActive : filters.status === "all" ? true : item.isActive;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const activeItems = catalog.items.filter((item) => item.isActive).length;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border bg-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">← Retour aux grilles</Link>
            <div><h1 className="text-3xl font-semibold tracking-tight">{catalog.name}</h1><p className="text-muted-foreground">{catalog.items.length} prestations · {catalog.categories.length} catégories · {statusLabels[catalog.status]}{catalog.client || catalog.prospect ? ` · ${catalog.client?.legalName ?? catalog.prospect?.companyName}` : ""}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/pricing/${catalog.id}/preview`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Aperçu client</Link>
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-lg border px-4 text-sm hover:bg-muted">Exporter</summary>
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border bg-card p-2 shadow-xl">
                <a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=COMPACT`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">PDF compact</a>
                <a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=STANDARD`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">PDF standard</a>
                <a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=DETAILED`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">PDF détaillé</a>
                <a href={`/api/pricing/${catalog.id}/export?format=html`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">HTML / PNG</a>
                <a href={`/api/pricing/${catalog.id}/export?format=csv`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">CSV</a>
                <a href={`/api/pricing/${catalog.id}/export?format=json`} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">JSON</a>
                <span className="block rounded-lg px-3 py-2 text-sm text-muted-foreground">DOCX bientôt</span>
              </div>
            </details>
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-lg border px-4 text-sm hover:bg-muted">⋯</summary>
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border bg-card p-2 shadow-xl"><form action={archivePricingCatalog}><input type="hidden" name="id" value={catalog.id} /><ConfirmSubmitButton message="Archiver cette grille ?" variant="ghost" className="w-full justify-start text-red-600">Archiver la grille</ConfirmSubmitButton></form></div>
            </details>
          </div>
        </div>
      </header>

      <Card>
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Rechercher une prestation..." />
          <select name="category" defaultValue={filters.category ?? ""} className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="">Catégorie : Toutes</option>{catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select name="status" defaultValue={filters.status ?? "active"} className="h-10 rounded-lg border bg-card px-3 text-sm"><option value="active">Actives</option><option value="inactive">Masquées</option><option value="all">Toutes</option></select>
          <Button variant="secondary">Filtrer</Button>
        </form>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link href={`/pricing/${catalog.id}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${!filters.category ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Toutes</Link>
          {catalog.categories.map((category) => <Link key={category.id} href={`/pricing/${catalog.id}?category=${category.id}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${filters.category === category.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{category.name}</Link>)}
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">{filteredItems.length} prestation(s) affichée(s), {activeItems} active(s)</div><Link href={`/pricing/${catalog.id}/items/new`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">+ Nouvelle prestation</Link></div>
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_180px_180px_120px_120px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid"><div>Prestation</div><div>Catégorie</div><div>Prix</div><div>Statut</div><div className="text-right">Actions</div></div>
            {filteredItems.map((item) => <div key={item.id} className="grid gap-4 border-b px-5 py-5 last:border-0 lg:grid-cols-[minmax(0,1.6fr)_180px_180px_120px_120px] lg:items-center"><div className="min-w-0"><div className="font-semibold">{item.name}</div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.shortDescription || "Aucune description courte."}</p><div className="mt-2 text-xs text-muted-foreground lg:hidden">{item.category.name} · {billingLabels[item.billingType]}</div></div><div className="hidden text-sm lg:block">{item.category.name}</div><div><div className="font-medium">{formatPricingPrice({ basePrice: Number(item.basePrice), minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice })}</div><div className="text-xs text-muted-foreground">{billingLabels[item.billingType]}</div></div><div><span className={`rounded-full px-2 py-1 text-xs ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "Visible" : "Masquée"}</span></div><div className="flex justify-end gap-2"><Link href={`/pricing/${catalog.id}/items/${item.id}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Modifier</Link></div></div>)}
            {filteredItems.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Aucune prestation ne correspond aux filtres.</div> : null}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-semibold">Ajout rapide</h2>
            <form action={addPricingItem} className="mt-4 space-y-3"><input type="hidden" name="catalogId" value={catalog.id} /><select name="categoryId" className="h-10 w-full rounded-lg border bg-card px-3 text-sm" required><option value="">Catégorie</option>{catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Input name="name" placeholder="Nom prestation" required /><Input name="basePrice" type="number" step="0.01" placeholder="Prix" /><Button className="w-full">Ajouter prestation</Button></form>
          </Card>
          <Card>
            <h2 className="font-semibold">Nouvelle catégorie</h2>
            <form action={addPricingCategory} className="mt-4 space-y-3"><input type="hidden" name="catalogId" value={catalog.id} /><Input name="name" placeholder="Nom catégorie" required /><Button className="w-full" variant="secondary">Ajouter catégorie</Button></form>
          </Card>
          <Card>
            <h2 className="font-semibold">Créer un devis</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sélection rapide depuis les prestations visibles.</p>
            <form action={createQuoteFromPricing} className="mt-4 space-y-2"><input type="hidden" name="catalogId" value={catalog.id} /><div className="max-h-80 space-y-2 overflow-auto pr-1">{catalog.items.filter((item) => item.isActive).map((item) => <label key={item.id} className="flex gap-2 rounded-lg border p-2 text-sm hover:bg-muted"><input type="checkbox" name="itemId" value={item.id} /><span>{item.name}</span></label>)}</div><Button className="w-full">Créer un devis</Button></form>
          </Card>
          <Card>
            <h2 className="font-semibold">Options PDF</h2>
            <p className="mt-2 text-sm text-muted-foreground">Contrôle les informations visibles côté client. Les coûts internes ne sont jamais exportés.</p>
            <form action={updatePricingCatalogSettings} className="mt-4 space-y-3 text-sm">
              <input type="hidden" name="id" value={catalog.id} /><input type="hidden" name="name" value={catalog.name} /><input type="hidden" name="version" value={catalog.version} /><input type="hidden" name="status" value={catalog.status} /><input type="hidden" name="title" value={catalog.title} /><input type="hidden" name="subtitle" value={catalog.subtitle} /><input type="hidden" name="introduction" value={catalog.introduction} /><input type="hidden" name="companyName" value={catalog.companyName} /><input type="hidden" name="phone" value={catalog.phone ?? ""} /><input type="hidden" name="email" value={catalog.email ?? ""} /><input type="hidden" name="website" value={catalog.website ?? ""} /><input type="hidden" name="address" value={catalog.address ?? ""} /><input type="hidden" name="primaryColor" value={catalog.primaryColor} /><input type="hidden" name="secondaryColor" value={catalog.secondaryColor} /><input type="hidden" name="currency" value={catalog.currency} /><input type="hidden" name="terms" value={catalog.terms} /><input type="hidden" name="globalDiscountType" value={PricingDiscountType.NONE} /><input type="hidden" name="globalDiscountValue" value={Number(catalog.globalDiscountValue)} />
              <select name="defaultPdfMode" defaultValue={catalog.defaultPdfMode} className="h-10 w-full rounded-lg border bg-card px-3 text-sm">{Object.values(PricingPdfMode).map((mode) => <option key={mode} value={mode}>{mode === "COMPACT" ? "Compact" : mode === "DETAILED" ? "Détaillé" : "Standard"}</option>)}</select>
              <label className="flex items-center gap-2"><input name="showPricesOnPdf" type="checkbox" defaultChecked={catalog.showPricesOnPdf} /> Prix</label>
              <label className="flex items-center gap-2"><input name="showDescriptionsOnPdf" type="checkbox" defaultChecked={catalog.showDescriptionsOnPdf} /> Descriptions</label>
              <label className="flex items-center gap-2"><input name="showFeaturesOnPdf" type="checkbox" defaultChecked={catalog.showFeaturesOnPdf} /> Éléments inclus</label>
              <label className="flex items-center gap-2"><input name="showDeliveryTimeOnPdf" type="checkbox" defaultChecked={catalog.showDeliveryTimeOnPdf} /> Délais</label>
              <label className="flex items-center gap-2"><input name="showEstimatedTimeOnPdf" type="checkbox" defaultChecked={catalog.showEstimatedTimeOnPdf} /> Heures de travail</label>
              <label className="flex items-center gap-2"><input name="showRevisionsOnPdf" type="checkbox" defaultChecked={catalog.showRevisionsOnPdf} /> Révisions</label>
              <label className="flex items-center gap-2"><input name="showRequirementsOnPdf" type="checkbox" defaultChecked={catalog.showRequirementsOnPdf} /> Prérequis client</label>
              <label className="flex items-center gap-2"><input name="showExclusionsOnPdf" type="checkbox" defaultChecked={catalog.showExclusionsOnPdf} /> Exclusions</label>
              <Button className="w-full" variant="secondary">Enregistrer PDF</Button>
            </form>
          </Card>
        </aside>
      </section>
    </div>
  );
}
