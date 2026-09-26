import { NextRequest } from "next/server";
import { formatDeliveryRange, formatHoursRange, formatPricingPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function features(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function encodeWinAnsi(value: string) {
  const map: Record<string, number> = { "€": 128, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "œ": 156, "Œ": 140, "Ÿ": 159 };
  const bytes: number[] = [];
  for (const char of value.replace(/[\r\n]+/g, " ")) {
    const mapped = map[char];
    if (mapped) bytes.push(mapped);
    else bytes.push(char.charCodeAt(0) <= 255 ? char.charCodeAt(0) : 63);
  }
  return Buffer.from(bytes).toString("binary").replace(/[()\\]/g, (match) => `\\${match}`);
}

function wrapText(value: string, max = 86) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pushBlock(pages: string[][], block: string[]) {
  let page = pages[pages.length - 1];
  if (!page || page.length + block.length > 42) {
    page = [];
    pages.push(page);
  }
  page.push(...block);
}

function createPdf(pages: string[][]) {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageKids: string[] = [];
  pages.forEach((pageLines) => {
    const content = `BT\n/F1 11 Tf\n50 790 Td\n15 TL\n${pageLines.map((line) => `(${encodeWinAnsi(line)}) Tj`).join("\nT*")}\nET`;
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    pageKids.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${pages.length * 2 + 3} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageKids.join(" ")}] /Count ${pages.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const mode = (request.nextUrl.searchParams.get("mode") ?? "") || undefined;
  const catalog = await prisma.pricingCatalog.findUnique({ where: { id }, include: { client: true, prospect: true, categories: { include: { items: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } });
  if (!catalog) return new Response("Not found", { status: 404 });

  const filename = `VisiPro_Grille_Tarifaire_${slug(catalog.client?.legalName ?? catalog.prospect?.companyName ?? catalog.version)}`;

  if (format === "pdf") {
    const pdfMode = mode ?? catalog.defaultPdfMode;
    const showPrices = catalog.showPricesOnPdf;
    const showDescriptions = catalog.showDescriptionsOnPdf;
    const showFeatures = catalog.showFeaturesOnPdf && pdfMode !== "COMPACT";
    const showDelivery = catalog.showDeliveryTimeOnPdf && pdfMode !== "COMPACT";
    const showHours = catalog.showEstimatedTimeOnPdf && pdfMode === "DETAILED";
    const showRevisions = catalog.showRevisionsOnPdf && pdfMode === "DETAILED";
    const showRequirements = catalog.showRequirementsOnPdf && pdfMode === "DETAILED";
    const showExclusions = catalog.showExclusionsOnPdf && pdfMode === "DETAILED";
    const pages: string[][] = [];
    pushBlock(pages, [catalog.companyName, catalog.title, catalog.subtitle, "", ...wrapText(catalog.introduction, 82), ""]);
    for (const category of catalog.categories.filter((entry) => entry.isActive)) {
      pushBlock(pages, ["", category.name.toUpperCase(), ""]);
      for (const item of category.items.filter((entry) => entry.isActive)) {
        const block = [`${item.name}${showPrices ? ` — ${formatPricingPrice({ basePrice: Number(item.basePrice), minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice })}` : ""}`];
        const description = pdfMode === "DETAILED" ? item.longDescription || item.shortDescription : item.shortDescription;
        if (showDescriptions && description) block.push(...wrapText(description, 82));
        if (showFeatures) {
          const deliverables = features(item.deliverables).length ? features(item.deliverables) : features(item.features);
          if (deliverables.length) block.push("Comprend", ...deliverables.map((entry) => `✓ ${entry}`));
        }
        const hours = formatHoursRange(item.estimatedHoursMin ? Number(item.estimatedHoursMin) : null, item.estimatedHoursMax ? Number(item.estimatedHoursMax) : null);
        const delivery = formatDeliveryRange(item.estimatedDeliveryDaysMin, item.estimatedDeliveryDaysMax);
        if (showHours && item.showEstimatedTimeOnPdf && hours) block.push(`Temps de travail estimé : ${hours}`);
        if (showDelivery && item.showDeliveryTimeOnPdf && delivery) block.push(`Délai indicatif : ${delivery}`);
        if (showRevisions && item.revisionsIncluded !== null) block.push(`${item.revisionsIncluded} série(s) de corrections incluse(s)`);
        if (showRequirements && item.showRequirementsOnPdf && features(item.clientRequirements).length) block.push("Éléments nécessaires", ...features(item.clientRequirements).map((entry) => `• ${entry}`));
        if (showExclusions && item.showExclusionsOnPdf && features(item.notIncluded).length) block.push("Non inclus", ...features(item.notIncluded).map((entry) => `• ${entry}`));
        block.push("");
        pushBlock(pages, block);
      }
    }
    pushBlock(pages, ["", "Informations tarifaires", ...wrapText(catalog.terms, 82)]);
    return new Response(createPdf(pages), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}_${pdfMode}.pdf"` } });
  }

  if (format === "csv") {
    const rows = [["categorie", "prestation", "description", "prix", "type", "frequence", "actif"]];
    for (const category of catalog.categories) {
      for (const item of category.items) {
        rows.push([category.name, item.name, item.shortDescription ?? "", formatPricingPrice({ basePrice: Number(item.basePrice), minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice }), item.priceType, item.billingType, item.isActive ? "oui" : "non"]);
      }
    }
    return new Response(rows.map((row) => row.map(csvEscape).join(",")).join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` } });
  }

  if (format === "html") {
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${catalog.title}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:${catalog.primaryColor}}h1{font-size:42px}section{break-inside:avoid;margin:32px 0}.item{border:1px solid #ddd;border-radius:16px;padding:18px;margin:12px 0}.price{font-weight:700;float:right}li{margin:4px 0}@media print{body{margin:24px}.item{break-inside:avoid}}</style></head><body><h1>${catalog.title}</h1><p>${catalog.subtitle}</p><p>${catalog.introduction}</p>${catalog.categories.filter((category) => category.isActive).map((category) => `<section><h2>${category.name}</h2>${category.items.filter((item) => item.isActive).map((item) => `<div class="item"><span class="price">${formatPricingPrice({ basePrice: Number(item.basePrice), minPrice: item.minPrice ? Number(item.minPrice) : null, maxPrice: item.maxPrice ? Number(item.maxPrice) : null, customPriceText: item.customPriceText, priceType: item.priceType, billingType: item.billingType, currency: item.currency, showPrice: item.showPrice })}</span><h3>${item.name}</h3><p>${item.shortDescription ?? ""}</p><ul>${features(item.features).map((feature) => `<li>${feature}</li>`).join("")}</ul></div>`).join("")}</section>`).join("")}<footer><pre>${catalog.terms}</pre></footer></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.html"` } });
  }

  const payload = { ...catalog, categories: catalog.categories.map((category) => ({ ...category, items: category.items })) };
  return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.json"` } });
}
