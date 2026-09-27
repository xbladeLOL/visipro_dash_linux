import Link from "next/link";
import { notFound } from "next/navigation";
import { applyDiscount, formatDeliveryRange, formatHoursRange, formatPricingAmount, formatPricingPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

function features(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function PricingPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await prisma.pricingCatalog.findUnique({ where: { id }, include: { client: true, prospect: true, categories: { where: { isActive: true }, include: { items: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } });
  if (!catalog) notFound();
  const target = catalog.client?.legalName ?? catalog.prospect?.companyName;

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-5xl flex-col gap-3 px-4 print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><Link href={`/pricing/${catalog.id}`} className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm hover:bg-muted sm:h-auto sm:py-2">Retour éditeur</Link><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=STANDARD`} className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:h-auto sm:py-2">PDF standard</a><a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=COMPACT`} className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm hover:bg-muted sm:h-auto sm:py-2">Compact</a><a href={`/api/pricing/${catalog.id}/export?format=pdf&mode=DETAILED`} className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm hover:bg-muted sm:h-auto sm:py-2">Détaillé</a><a href={`/api/pricing/${catalog.id}/export?format=csv`} className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm hover:bg-muted sm:h-auto sm:py-2">CSV</a><a href={`/api/pricing/${catalog.id}/export?format=json`} className="inline-flex h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm hover:bg-muted sm:h-auto sm:py-2">JSON</a></div></div>
      <main className="mx-auto max-w-5xl bg-white p-5 shadow-xl print:max-w-none print:p-8 print:shadow-none sm:p-8 lg:p-10" style={{ color: catalog.primaryColor }}>
        <header className="border-b pb-8">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:justify-between">
            <div><div className="text-sm font-semibold tracking-[0.2em] sm:tracking-[0.3em]" style={{ color: catalog.secondaryColor }}>{catalog.companyName}</div><h1 className="mt-6 break-words text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{catalog.title}</h1><p className="mt-3 text-lg sm:text-xl" style={{ color: catalog.secondaryColor }}>{catalog.subtitle}</p>{target ? <p className="mt-4 inline-block rounded-full border px-4 py-2 text-sm">Préparée pour {target}</p> : null}</div>
            <div className="text-left text-sm lg:text-right" style={{ color: catalog.secondaryColor }}><div>{catalog.email}</div><div>{catalog.phone}</div><div>{catalog.website}</div><div>{catalog.address}</div><div className="mt-4">Version {catalog.version}</div>{catalog.validUntil ? <div>Valable jusqu&apos;au {catalog.validUntil.toLocaleDateString("fr-FR")}</div> : null}</div>
          </div>
          <p className="mt-8 max-w-3xl text-base leading-7" style={{ color: catalog.secondaryColor }}>{catalog.introduction}</p>
        </header>

        <section className="mt-10 space-y-10">
          {catalog.categories.map((category) => <div key={category.id} className="break-inside-avoid"><div className="mb-4"><h2 className="text-2xl font-semibold">{category.name}</h2>{category.description ? <p className="mt-1 text-sm" style={{ color: catalog.secondaryColor }}>{category.description}</p> : null}</div><div className="grid gap-4 lg:grid-cols-2">{category.items.map((item) => { const original = Number(item.basePrice); const discounted = applyDiscount(original, item.discountType, Number(item.discountValue)); const hasDiscount = discounted !== original; const deliverables = features(item.deliverables).length ? features(item.deliverables) : features(item.features); const delivery = formatDeliveryRange(item.estimatedDeliveryDaysMin, item.estimatedDeliveryDaysMax); const hours = formatHoursRange(item.estimatedHoursMin ? Number(item.estimatedHoursMin) : null, item.estimatedHoursMax ? Number(item.estimatedHoursMax) : null); return <article key={item.id} className="break-inside-avoid rounded-2xl border p-5"><div className="flex flex-col items-start justify-between gap-4 lg:flex-row"><div><h3 className="text-lg font-semibold">{item.name}</h3>{catalog.showDescriptionsOnPdf && item.shortDescription ? <p className="mt-2 text-sm leading-6" style={{ color: catalog.secondaryColor }}>{item.shortDescription}</p> : null}</div>{catalog.showPricesOnPdf ? <div className="text-right"><div className="text-lg font-semibold">{hasDiscount ? formatPricingAmount(discounted, item.currency) : formatPricingPrice({ basePrice: original, minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice })}</div>{hasDiscount && item.showOriginalPrice ? <div className="text-xs line-through" style={{ color: catalog.secondaryColor }}>{formatPricingAmount(original, item.currency)}</div> : null}</div> : null}</div>{catalog.showFeaturesOnPdf && item.showDeliverablesOnPdf && deliverables.length ? <div className="mt-4"><div className="text-sm font-semibold">Comprend</div><ul className="mt-2 space-y-2 text-sm" style={{ color: catalog.secondaryColor }}>{deliverables.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul></div> : null}<div className="mt-4 grid gap-2 text-sm lg:grid-cols-2">{catalog.showDeliveryTimeOnPdf && item.showDeliveryTimeOnPdf && delivery ? <div><strong>Délai indicatif</strong><span className="block" style={{ color: catalog.secondaryColor }}>{delivery}</span></div> : null}{catalog.showEstimatedTimeOnPdf && item.showEstimatedTimeOnPdf && hours ? <div><strong>Temps estimé</strong><span className="block" style={{ color: catalog.secondaryColor }}>{hours}</span></div> : null}</div></article>; })}</div></div>)}
        </section>

        <section className="mt-12 break-inside-avoid rounded-2xl bg-slate-50 p-6"><h2 className="font-semibold">Informations tarifaires</h2><div className="mt-3 whitespace-pre-line text-sm leading-7" style={{ color: catalog.secondaryColor }}>{catalog.terms}</div></section>
        <footer className="mt-10 border-t pt-6 text-center text-xs" style={{ color: catalog.secondaryColor }}>{catalog.footerText ?? `${catalog.companyName} - Grille tarifaire`}</footer>
      </main>
    </div>
  );
}
