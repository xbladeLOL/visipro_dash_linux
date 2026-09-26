"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PricingBillingType, PricingCatalogStatus, PricingDiscountType, PricingPdfMode, PricingPriceType } from "@prisma/client";
import { calculateDocumentTotals, calculateLineTotal } from "@/lib/financial";
import { buildDocumentNumber } from "@/lib/numbering";
import { defaultDeliveryTimeDisclaimer, defaultEstimatedTimeDisclaimer, defaultPricingCatalog, defaultPricingIntro, defaultPricingTerms, detailedPricingTerms, optionHourEstimates, parseFeatures, parseList, pricingBackfillByName } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultPricingCatalog() {
  const existing = await prisma.pricingCatalog.findFirst({ where: { name: "Grille tarifaire VisiPro" }, select: { id: true } });
  if (existing) return existing.id;

  const catalog = await prisma.pricingCatalog.create({
    data: {
      name: "Grille tarifaire VisiPro",
      status: PricingCatalogStatus.GLOBAL,
      version: "2026",
      introduction: defaultPricingIntro,
      terms: defaultPricingTerms,
      footerText: "VisiPro - Solutions digitales pour entreprises locales",
      validUntil: addDays(new Date(), 90)
    }
  });

  for (const [categoryIndex, category] of defaultPricingCatalog.entries()) {
    const createdCategory = await prisma.pricingCategory.create({ data: { catalogId: catalog.id, name: category.name, displayOrder: categoryIndex } });
    for (const [itemIndex, item] of category.items.entries()) {
      await prisma.pricingItem.create({
        data: {
          catalogId: catalog.id,
          categoryId: createdCategory.id,
          name: item.name,
          shortDescription: "short" in item ? item.short : undefined,
          basePrice: item.price,
          priceType: "type" in item && item.type ? item.type : PricingPriceType.STARTING_AT,
          billingType: "billing" in item && item.billing ? item.billing : PricingBillingType.ONE_TIME,
          features: "features" in item ? item.features : [],
          displayOrder: itemIndex,
          isPack: "isPack" in item ? Boolean(item.isPack) : false,
          showSavings: "showSavings" in item ? Boolean(item.showSavings) : false
        }
      });
    }
  }

  return catalog.id;
}

export async function backfillPricingDetails() {
  const items = await prisma.pricingItem.findMany({ select: { id: true, name: true, shortDescription: true, longDescription: true, estimatedHoursMin: true, estimatedHoursMax: true, deliverables: true, features: true } });
  for (const item of items) {
    const optionEstimate = optionHourEstimates[item.name];
    const preset = pricingBackfillByName[item.name] ?? (item.name in optionHourEstimates ? { estimatedHoursMin: optionEstimate?.[0], estimatedHoursMax: optionEstimate?.[1], deliverables: Array.isArray(item.features) ? item.features.map(String) : [] } : undefined);
    if (!preset) continue;
    await prisma.pricingItem.update({
      where: { id: item.id },
      data: {
        shortDescription: item.shortDescription || preset.shortDescription,
        longDescription: item.longDescription || preset.longDescription,
        estimatedHoursMin: item.estimatedHoursMin ?? preset.estimatedHoursMin,
        estimatedHoursMax: item.estimatedHoursMax ?? preset.estimatedHoursMax,
        estimatedDeliveryDaysMin: preset.estimatedDeliveryDaysMin,
        estimatedDeliveryDaysMax: preset.estimatedDeliveryDaysMax,
        revisionsIncluded: preset.revisionsIncluded,
        revisionPolicy: preset.revisionPolicy,
        deliverables: preset.deliverables ?? (Array.isArray(item.features) ? item.features.map(String) : []),
        clientRequirements: preset.clientRequirements ?? [],
        notIncluded: preset.notIncluded ?? [],
        estimatedTimeDisclaimer: defaultEstimatedTimeDisclaimer,
        deliveryTimeDisclaimer: defaultDeliveryTimeDisclaimer
      }
    });
  }
  await prisma.pricingCatalog.updateMany({ where: { terms: defaultPricingTerms }, data: { terms: detailedPricingTerms } });
}

export async function createPricingCatalog(formData: FormData) {
  const name = String(formData.get("name") || "Nouvelle grille tarifaire");
  const catalog = await prisma.pricingCatalog.create({ data: { name, status: PricingCatalogStatus.TEMPLATE, version: String(formData.get("version") || new Date().getFullYear()), introduction: defaultPricingIntro, terms: defaultPricingTerms } });
  redirect(`/pricing/${catalog.id}`);
}

export async function updatePricingCatalogSettings(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.pricingCatalog.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "Grille tarifaire"),
      status: String(formData.get("status") || PricingCatalogStatus.TEMPLATE) as PricingCatalogStatus,
      version: String(formData.get("version") || "2026"),
      title: String(formData.get("title") || "GRILLE TARIFAIRE"),
      subtitle: String(formData.get("subtitle") || ""),
      introduction: String(formData.get("introduction") || ""),
      companyName: String(formData.get("companyName") || "VisiPro"),
      phone: String(formData.get("phone") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      website: String(formData.get("website") || "") || undefined,
      address: String(formData.get("address") || "") || undefined,
      primaryColor: String(formData.get("primaryColor") || "#111827"),
      secondaryColor: String(formData.get("secondaryColor") || "#64748b"),
      footerText: String(formData.get("footerText") || "") || undefined,
      validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : undefined,
      currency: String(formData.get("currency") || "EUR"),
      terms: String(formData.get("terms") || ""),
      globalDiscountType: String(formData.get("globalDiscountType") || PricingDiscountType.NONE) as PricingDiscountType,
      globalDiscountValue: Number(formData.get("globalDiscountValue") || 0),
      showOriginalPrices: formData.get("showOriginalPrices") === "on",
      defaultPdfMode: String(formData.get("defaultPdfMode") || PricingPdfMode.STANDARD) as PricingPdfMode,
      showPricesOnPdf: formData.get("showPricesOnPdf") === "on",
      showDescriptionsOnPdf: formData.get("showDescriptionsOnPdf") === "on",
      showFeaturesOnPdf: formData.get("showFeaturesOnPdf") === "on",
      showDeliveryTimeOnPdf: formData.get("showDeliveryTimeOnPdf") === "on",
      showEstimatedTimeOnPdf: formData.get("showEstimatedTimeOnPdf") === "on",
      showRevisionsOnPdf: formData.get("showRevisionsOnPdf") === "on",
      showRequirementsOnPdf: formData.get("showRequirementsOnPdf") === "on",
      showExclusionsOnPdf: formData.get("showExclusionsOnPdf") === "on"
    }
  });
  revalidatePath(`/pricing/${id}`);
  revalidatePath(`/pricing/${id}/preview`);
  revalidatePath("/pricing");
}

export async function addPricingCategory(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const count = await prisma.pricingCategory.count({ where: { catalogId } });
  await prisma.pricingCategory.create({ data: { catalogId, name: String(formData.get("name") || "Nouvelle catégorie"), description: String(formData.get("description") || "") || undefined, displayOrder: count } });
  revalidatePath(`/pricing/${catalogId}`);
}

export async function updatePricingCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  await prisma.pricingCategory.update({ where: { id }, data: { name: String(formData.get("name") || "Catégorie"), description: String(formData.get("description") || "") || undefined, displayOrder: Number(formData.get("displayOrder") || 0), isActive: formData.get("isActive") === "on" } });
  revalidatePath(`/pricing/${catalogId}`);
  revalidatePath(`/pricing/${catalogId}/preview`);
}

export async function deletePricingCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  await prisma.pricingCategory.delete({ where: { id } });
  revalidatePath(`/pricing/${catalogId}`);
}

export async function reorderPricingCategories(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const ids = JSON.parse(String(formData.get("orderedIds") || "[]")) as string[];
  await prisma.$transaction(ids.map((id, index) => prisma.pricingCategory.update({ where: { id }, data: { displayOrder: index } })));
  revalidatePath(`/pricing/${catalogId}`);
  revalidatePath(`/pricing/${catalogId}/preview`);
}

export async function addPricingItem(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const count = await prisma.pricingItem.count({ where: { categoryId } });
  await prisma.pricingItem.create({ data: { catalogId, categoryId, name: String(formData.get("name") || "Nouvelle prestation"), basePrice: Number(formData.get("basePrice") || 0), displayOrder: count, features: [] } });
  revalidatePath(`/pricing/${catalogId}`);
}

export async function createPricingItemAndRedirect(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const count = await prisma.pricingItem.count({ where: { categoryId } });
  const item = await prisma.pricingItem.create({
    data: {
      catalogId,
      categoryId,
      name: String(formData.get("name") || "Nouvelle prestation"),
      shortDescription: String(formData.get("shortDescription") || "") || undefined,
      basePrice: Number(formData.get("basePrice") || 0),
      priceType: String(formData.get("priceType") || PricingPriceType.STARTING_AT) as PricingPriceType,
      billingType: String(formData.get("billingType") || PricingBillingType.ONE_TIME) as PricingBillingType,
      displayOrder: count,
      features: []
    }
  });
  redirect(`/pricing/${catalogId}/items/${item.id}`);
}

export async function updatePricingItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  await prisma.pricingItem.update({
    where: { id },
    data: {
      categoryId: String(formData.get("categoryId") ?? ""),
      name: String(formData.get("name") || "Prestation"),
      shortDescription: String(formData.get("shortDescription") || "") || undefined,
      longDescription: String(formData.get("longDescription") || "") || undefined,
      basePrice: Number(formData.get("basePrice") || 0),
      minPrice: formData.get("minPrice") ? Number(formData.get("minPrice")) : undefined,
      maxPrice: formData.get("maxPrice") ? Number(formData.get("maxPrice")) : undefined,
      customPriceText: String(formData.get("customPriceText") || "") || undefined,
      priceType: String(formData.get("priceType") || PricingPriceType.STARTING_AT) as PricingPriceType,
      billingType: String(formData.get("billingType") || PricingBillingType.ONE_TIME) as PricingBillingType,
      currency: String(formData.get("currency") || "EUR"),
      unit: String(formData.get("unit") || "") || undefined,
      taxRate: Number(formData.get("taxRate") || 20),
      features: parseFeatures(formData.get("features")),
      deliverables: parseList(formData.get("deliverables")),
      clientRequirements: parseList(formData.get("clientRequirements")),
      notIncluded: parseList(formData.get("notIncluded")),
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
      showPrice: formData.get("showPrice") === "on",
      displayOrder: Number(formData.get("displayOrder") || 0),
      internalCost: Number(formData.get("internalCost") || 0),
      estimatedHours: Number(formData.get("estimatedHours") || 0),
      estimatedHoursMin: formData.get("estimatedHoursMin") ? Number(formData.get("estimatedHoursMin")) : undefined,
      estimatedHoursMax: formData.get("estimatedHoursMax") ? Number(formData.get("estimatedHoursMax")) : undefined,
      estimatedDeliveryDaysMin: formData.get("estimatedDeliveryDaysMin") ? Number(formData.get("estimatedDeliveryDaysMin")) : undefined,
      estimatedDeliveryDaysMax: formData.get("estimatedDeliveryDaysMax") ? Number(formData.get("estimatedDeliveryDaysMax")) : undefined,
      revisionsIncluded: formData.get("revisionsIncluded") ? Number(formData.get("revisionsIncluded")) : undefined,
      revisionPolicy: String(formData.get("revisionPolicy") || "") || undefined,
      internalNotes: String(formData.get("internalNotes") || "") || undefined,
      estimatedTimeDisclaimer: String(formData.get("estimatedTimeDisclaimer") || "") || undefined,
      deliveryTimeDisclaimer: String(formData.get("deliveryTimeDisclaimer") || "") || undefined,
      showEstimatedTimeOnPdf: formData.get("showEstimatedTimeOnPdf") === "on",
      showDeliveryTimeOnPdf: formData.get("showDeliveryTimeOnPdf") === "on",
      showDeliverablesOnPdf: formData.get("showDeliverablesOnPdf") === "on",
      showRequirementsOnPdf: formData.get("showRequirementsOnPdf") === "on",
      showExclusionsOnPdf: formData.get("showExclusionsOnPdf") === "on",
      notes: String(formData.get("notes") || "") || undefined,
      discountType: String(formData.get("discountType") || PricingDiscountType.NONE) as PricingDiscountType,
      discountValue: Number(formData.get("discountValue") || 0),
      showOriginalPrice: formData.get("showOriginalPrice") === "on",
      isPack: formData.get("isPack") === "on",
      showSavings: formData.get("showSavings") === "on"
    }
  });
  revalidatePath(`/pricing/${catalogId}`);
  revalidatePath(`/pricing/${catalogId}/preview`);
}

export async function deletePricingItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  await prisma.pricingItem.delete({ where: { id } });
  revalidatePath(`/pricing/${catalogId}`);
}

export async function reorderPricingItems(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const ids = JSON.parse(String(formData.get("orderedIds") || "[]")) as string[];
  await prisma.$transaction(ids.map((id, index) => prisma.pricingItem.update({ where: { id }, data: { displayOrder: index } })));
  revalidatePath(`/pricing/${catalogId}`);
  revalidatePath(`/pricing/${catalogId}/preview`);
}

export async function duplicatePricingCatalog(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") || "") || undefined;
  const prospectId = String(formData.get("prospectId") || "") || undefined;
  const source = await prisma.pricingCatalog.findUniqueOrThrow({ where: { id }, include: { categories: { include: { items: true }, orderBy: { displayOrder: "asc" } } } });
  const name = String(formData.get("name") || `${source.name} - copie`);
  const clone = await prisma.pricingCatalog.create({
    data: { name, status: clientId || prospectId ? PricingCatalogStatus.CLIENT_SPECIFIC : PricingCatalogStatus.TEMPLATE, version: source.version, title: source.title, subtitle: source.subtitle, introduction: source.introduction, logoUrl: source.logoUrl, companyName: source.companyName, phone: source.phone, email: source.email, website: source.website, address: source.address, primaryColor: source.primaryColor, secondaryColor: source.secondaryColor, footerText: source.footerText, validUntil: source.validUntil, currency: source.currency, terms: source.terms, globalDiscountType: source.globalDiscountType, globalDiscountValue: source.globalDiscountValue, showOriginalPrices: source.showOriginalPrices, defaultPdfMode: source.defaultPdfMode, showPricesOnPdf: source.showPricesOnPdf, showDescriptionsOnPdf: source.showDescriptionsOnPdf, showFeaturesOnPdf: source.showFeaturesOnPdf, showDeliveryTimeOnPdf: source.showDeliveryTimeOnPdf, showEstimatedTimeOnPdf: source.showEstimatedTimeOnPdf, showRevisionsOnPdf: source.showRevisionsOnPdf, showRequirementsOnPdf: source.showRequirementsOnPdf, showExclusionsOnPdf: source.showExclusionsOnPdf, sourceCatalogId: source.id, clientId, prospectId }
  });
  for (const category of source.categories) {
    const createdCategory = await prisma.pricingCategory.create({ data: { catalogId: clone.id, name: category.name, description: category.description, displayOrder: category.displayOrder, isActive: category.isActive } });
    for (const item of category.items) {
      await prisma.pricingItem.create({ data: { catalogId: clone.id, categoryId: createdCategory.id, name: item.name, shortDescription: item.shortDescription, longDescription: item.longDescription, basePrice: item.basePrice, minPrice: item.minPrice, maxPrice: item.maxPrice, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, unit: item.unit, taxRate: item.taxRate, features: Array.isArray(item.features) ? item.features.map(String) : [], deliverables: Array.isArray(item.deliverables) ? item.deliverables.map(String) : [], clientRequirements: Array.isArray(item.clientRequirements) ? item.clientRequirements.map(String) : [], notIncluded: Array.isArray(item.notIncluded) ? item.notIncluded.map(String) : [], isActive: item.isActive, isFeatured: item.isFeatured, showPrice: item.showPrice, displayOrder: item.displayOrder, internalCost: item.internalCost, estimatedHours: item.estimatedHours, estimatedHoursMin: item.estimatedHoursMin, estimatedHoursMax: item.estimatedHoursMax, estimatedDeliveryDaysMin: item.estimatedDeliveryDaysMin, estimatedDeliveryDaysMax: item.estimatedDeliveryDaysMax, revisionsIncluded: item.revisionsIncluded, revisionPolicy: item.revisionPolicy, internalNotes: item.internalNotes, estimatedTimeDisclaimer: item.estimatedTimeDisclaimer, deliveryTimeDisclaimer: item.deliveryTimeDisclaimer, showEstimatedTimeOnPdf: item.showEstimatedTimeOnPdf, showDeliveryTimeOnPdf: item.showDeliveryTimeOnPdf, showDeliverablesOnPdf: item.showDeliverablesOnPdf, showRequirementsOnPdf: item.showRequirementsOnPdf, showExclusionsOnPdf: item.showExclusionsOnPdf, notes: item.notes, discountType: item.discountType, discountValue: item.discountValue, showOriginalPrice: item.showOriginalPrice, isPack: item.isPack, showSavings: item.showSavings } });
    }
  }
  redirect(`/pricing/${clone.id}`);
}

export async function archivePricingCatalog(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.pricingCatalog.update({ where: { id }, data: { status: PricingCatalogStatus.ARCHIVED } });
  revalidatePath("/pricing");
}

export async function createQuoteFromPricing(formData: FormData) {
  const catalogId = String(formData.get("catalogId") ?? "");
  const itemIds = formData.getAll("itemId").map(String);
  const catalog = await prisma.pricingCatalog.findUniqueOrThrow({ where: { id: catalogId } });
  if (!catalog.clientId && !catalog.prospectId) throw new Error("La grille doit être liée à un client ou prospect pour créer un devis.");
  const items = await prisma.pricingItem.findMany({ where: { id: { in: itemIds }, catalogId } });
  const lines = items.map((item) => ({ quantity: 1, unitPrice: Number(item.basePrice), taxRate: Number(item.taxRate), description: `${item.name}${item.shortDescription ? ` - ${item.shortDescription}` : ""}` }));
  const totals = calculateDocumentTotals(lines);
  const settings = await prisma.companySettings.findFirst();
  const count = await prisma.quote.count({ where: { issuedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } } });
  await prisma.quote.create({ data: { number: buildDocumentNumber(settings?.quotePrefix ?? "DEV", count), clientId: catalog.clientId, prospectId: catalog.prospectId, issuedAt: new Date(), validUntil: addDays(new Date(), 30), subtotal: totals.subtotal, tax: totals.tax, total: totals.total, status: "DRAFT", terms: settings?.paymentTerms, notes: `Créé depuis la grille tarifaire ${catalog.name}`, items: { create: lines.map((line) => ({ description: line.description, quantity: 1, unitPrice: line.unitPrice, taxRate: line.taxRate, ...calculateLineTotal(line) })) } } });
  redirect("/sales/quotes");
}
