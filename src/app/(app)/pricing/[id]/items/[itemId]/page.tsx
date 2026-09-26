import Link from "next/link";
import type React from "react";
import { notFound } from "next/navigation";
import { PricingBillingType, PricingDiscountType, PricingPriceType } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { deletePricingItem, updatePricingItem } from "@/features/pricing/actions";
import { calculateHourlyRange, defaultDeliveryTimeDisclaimer, defaultEstimatedTimeDisclaimer, formatDeliveryRange, formatHoursRange, formatPricingPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const priceTypeLabels: Record<PricingPriceType, string> = { FIXED: "Prix fixe", STARTING_AT: "À partir de", FROM_TO: "Fourchette", ON_QUOTE: "Sur devis", CUSTOM_TEXT: "Texte personnalisé" };
const billingTypeLabels: Record<PricingBillingType, string> = { ONE_TIME: "Ponctuel", MONTHLY: "Mensuel", YEARLY: "Annuel", CUSTOM: "Personnalisé" };
const discountLabels: Record<PricingDiscountType, string> = { NONE: "Aucune", AMOUNT: "Montant", PERCENT: "Pourcentage" };

function jsonList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="h-11 rounded-xl border bg-card px-3 text-sm" />;
}

export default async function PricingItemEditPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const [catalog, item] = await Promise.all([
    prisma.pricingCatalog.findUnique({ where: { id }, include: { categories: { orderBy: { displayOrder: "asc" } } } }),
    itemId === "new" ? null : prisma.pricingItem.findUnique({ where: { id: itemId }, include: { category: true } })
  ]);
  if (!catalog || !item) notFound();

  const revenue = Number(item.basePrice);
  const cost = Number(item.internalCost);
  const margin = revenue - cost;
  const hourlyRange = calculateHourlyRange(revenue, cost, item.estimatedHoursMin ? Number(item.estimatedHoursMin) : null, item.estimatedHoursMax ? Number(item.estimatedHoursMax) : null);
  const timeLabel = formatHoursRange(item.estimatedHoursMin ? Number(item.estimatedHoursMin) : null, item.estimatedHoursMax ? Number(item.estimatedHoursMax) : null);
  const deliveryLabel = formatDeliveryRange(item.estimatedDeliveryDaysMin, item.estimatedDeliveryDaysMax);
  const price = formatPricingPrice({ basePrice: revenue, minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2"><Link href={`/pricing/${catalog.id}`} className="text-sm text-muted-foreground hover:text-foreground">← Retour à la grille</Link><div><h1 className="text-3xl font-semibold">Modifier la prestation</h1><p className="text-muted-foreground">{item.name}</p></div></div>
          <div className="flex gap-2"><Link href={`/pricing/${catalog.id}/preview`} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Aperçu client</Link></div>
        </div>
      </header>

      <form action={updatePricingItem} className="space-y-6">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="catalogId" value={catalog.id} />

        <Card>
          <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Informations commerciales</h2><p className="text-sm text-muted-foreground">Ce qui sera lu par le prospect dans la grille.</p></div><Button>Enregistrer</Button></div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nom de la prestation"><Input name="name" defaultValue={item.name} className="h-12 text-base" /></Field>
            <Field label="Catégorie"><Select name="categoryId" defaultValue={item.categoryId}>{catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
            <Field label="Description courte"><Textarea name="shortDescription" defaultValue={item.shortDescription ?? ""} className="min-h-28" placeholder="Résumé clair affiché dans la liste et le document client" /></Field>
            <Field label="Description longue"><Textarea name="longDescription" defaultValue={item.longDescription ?? ""} className="min-h-28" placeholder="Détails complémentaires si nécessaire" /></Field>
            <Field label="Éléments inclus"><Textarea name="features" defaultValue={jsonList(item.features).join("\n")} className="min-h-64 md:col-span-2" placeholder="Un élément par ligne" /></Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Prix et affichage</h2>
          <p className="mt-1 text-sm text-muted-foreground">Prix client, type d&apos;affichage et facturation.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <Field label="Prix principal"><Input name="basePrice" type="number" step="0.01" defaultValue={Number(item.basePrice)} className="h-12 text-base font-semibold" /></Field>
            <Field label="Type de prix"><Select name="priceType" defaultValue={item.priceType}>{Object.values(PricingPriceType).map((type) => <option key={type} value={type}>{priceTypeLabels[type]}</option>)}</Select></Field>
            <Field label="Facturation"><Select name="billingType" defaultValue={item.billingType}>{Object.values(PricingBillingType).map((type) => <option key={type} value={type}>{billingTypeLabels[type]}</option>)}</Select></Field>
            <Field label="Devise"><Input name="currency" defaultValue={item.currency} /></Field>
            <Field label="Prix min"><Input name="minPrice" type="number" step="0.01" defaultValue={item.minPrice ? Number(item.minPrice) : ""} /></Field>
            <Field label="Prix max"><Input name="maxPrice" type="number" step="0.01" defaultValue={item.maxPrice ? Number(item.maxPrice) : ""} /></Field>
            <Field label="Texte personnalisé"><Input name="customPriceText" defaultValue={item.customPriceText ?? ""} placeholder="Sur devis, offert, etc." /></Field>
            <Field label="TVA"><Input name="taxRate" type="number" step="0.01" defaultValue={Number(item.taxRate)} /></Field>
          </div>
          <div className="mt-5 rounded-2xl bg-muted p-5"><div className="text-sm text-muted-foreground">Aperçu du prix affiché</div><div className="mt-1 text-2xl font-semibold">{price}</div></div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Estimation du travail</h2>
          <p className="mt-1 text-sm text-muted-foreground">Temps de travail interne et délai calendaire estimatif. Ces deux notions sont séparées.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <Field label="Temps minimum (h)"><Input name="estimatedHoursMin" type="number" step="0.01" defaultValue={item.estimatedHoursMin ? Number(item.estimatedHoursMin) : ""} /></Field>
            <Field label="Temps maximum (h)"><Input name="estimatedHoursMax" type="number" step="0.01" defaultValue={item.estimatedHoursMax ? Number(item.estimatedHoursMax) : ""} /></Field>
            <Field label="Délai minimum (jours ouvrés)"><Input name="estimatedDeliveryDaysMin" type="number" defaultValue={item.estimatedDeliveryDaysMin ?? ""} /></Field>
            <Field label="Délai maximum (jours ouvrés)"><Input name="estimatedDeliveryDaysMax" type="number" defaultValue={item.estimatedDeliveryDaysMax ?? ""} /></Field>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-muted p-4"><div className="text-sm text-muted-foreground">Temps estimé</div><div className="mt-1 font-semibold">{timeLabel ?? "Non renseigné"}</div></div>
            <div className="rounded-2xl bg-muted p-4"><div className="text-sm text-muted-foreground">Délai indicatif</div><div className="mt-1 font-semibold">{deliveryLabel ?? "Non renseigné"}</div></div>
            <div className="rounded-2xl bg-muted p-4"><div className="text-sm text-muted-foreground">Taux horaire estimé</div><div className="mt-1 font-semibold">{hourlyRange ? `${formatCurrency(hourlyRange.low)} à ${formatCurrency(hourlyRange.high)} /h` : "Non calculable"}</div></div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Disclaimer temps"><Textarea name="estimatedTimeDisclaimer" defaultValue={item.estimatedTimeDisclaimer ?? defaultEstimatedTimeDisclaimer} className="min-h-24" /></Field>
            <Field label="Disclaimer délais"><Textarea name="deliveryTimeDisclaimer" defaultValue={item.deliveryTimeDisclaimer ?? defaultDeliveryTimeDisclaimer} className="min-h-24" /></Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Livrables, prérequis et exclusions</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <Field label="Livrables"><Textarea name="deliverables" defaultValue={jsonList(item.deliverables).join("\n")} className="min-h-56" placeholder="Un livrable par ligne" /></Field>
            <Field label="Éléments nécessaires client"><Textarea name="clientRequirements" defaultValue={jsonList(item.clientRequirements).join("\n")} className="min-h-56" placeholder="Un prérequis par ligne" /></Field>
            <Field label="Non inclus"><Textarea name="notIncluded" defaultValue={jsonList(item.notIncluded).join("\n")} className="min-h-56" placeholder="Une exclusion par ligne" /></Field>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
            <Field label="Révisions incluses"><Input name="revisionsIncluded" type="number" defaultValue={item.revisionsIncluded ?? ""} placeholder="Ex: 2" /></Field>
            <Field label="Politique de révision"><Textarea name="revisionPolicy" defaultValue={item.revisionPolicy ?? ""} className="min-h-24" /></Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Remise et visibilité</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-4">
            <Field label="Type de remise"><Select name="discountType" defaultValue={item.discountType}>{Object.values(PricingDiscountType).map((type) => <option key={type} value={type}>{discountLabels[type]}</option>)}</Select></Field>
            <Field label="Valeur remise"><Input name="discountValue" type="number" step="0.01" defaultValue={Number(item.discountValue)} /></Field>
            <Field label="Unité"><Input name="unit" defaultValue={item.unit ?? ""} /></Field>
            <Field label="Ordre"><Input name="displayOrder" type="number" defaultValue={item.displayOrder} /></Field>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="isActive" type="checkbox" defaultChecked={item.isActive} /> Visible dans la grille</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showPrice" type="checkbox" defaultChecked={item.showPrice} /> Afficher le prix</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={item.isFeatured} /> Mettre en avant</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showOriginalPrice" type="checkbox" defaultChecked={item.showOriginalPrice} /> Afficher prix barré</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="isPack" type="checkbox" defaultChecked={item.isPack} /> C&apos;est un pack</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showSavings" type="checkbox" defaultChecked={item.showSavings} /> Afficher économie</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showEstimatedTimeOnPdf" type="checkbox" defaultChecked={item.showEstimatedTimeOnPdf} /> Heures dans PDF</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showDeliveryTimeOnPdf" type="checkbox" defaultChecked={item.showDeliveryTimeOnPdf} /> Délais dans PDF</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showDeliverablesOnPdf" type="checkbox" defaultChecked={item.showDeliverablesOnPdf} /> Livrables dans PDF</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showRequirementsOnPdf" type="checkbox" defaultChecked={item.showRequirementsOnPdf} /> Prérequis dans PDF</label>
            <label className="flex items-center gap-2 rounded-xl border p-4 text-sm"><input name="showExclusionsOnPdf" type="checkbox" defaultChecked={item.showExclusionsOnPdf} /> Exclusions dans PDF</label>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Interne VisiPro</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jamais affiché dans le document client.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <Field label="Coût interne"><Input name="internalCost" type="number" step="0.01" defaultValue={Number(item.internalCost)} /></Field>
            <Field label="Ancien champ heures"><Input name="estimatedHours" type="number" step="0.01" defaultValue={Number(item.estimatedHours)} /></Field>
            <div className="rounded-2xl bg-muted p-4 text-sm"><div>Prix : <strong>{formatCurrency(revenue)}</strong></div><div>Coût : <strong>{formatCurrency(cost)}</strong></div><div>Marge brute : <strong>{formatCurrency(margin)}</strong></div><div>Marge horaire indicative : <strong>{hourlyRange ? `${formatCurrency(hourlyRange.low)} à ${formatCurrency(hourlyRange.high)} /h` : "-"}</strong></div></div>
            <Field label="Notes internes"><Textarea name="internalNotes" defaultValue={item.internalNotes ?? ""} className="min-h-36 md:col-span-2" /></Field>
            <Field label="Notes générales"><Textarea name="notes" defaultValue={item.notes ?? ""} className="min-h-36" /></Field>
          </div>
        </Card>

        <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur">
          <ConfirmSubmitButton formAction={deletePricingItem} message="Supprimer cette prestation ?" variant="ghost" className="text-red-600">Supprimer</ConfirmSubmitButton>
          <div className="flex gap-2"><Link href={`/pricing/${catalog.id}`} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Annuler</Link><Button>Enregistrer la prestation</Button></div>
        </div>
      </form>
    </div>
  );
}
