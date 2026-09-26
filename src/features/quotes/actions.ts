"use server";

import { addDays } from "date-fns";
import { redirect } from "next/navigation";
import { calculateDocumentTotals, calculateLineTotal } from "@/lib/financial";
import { buildDocumentNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";

export async function createQuote(formData: FormData) {
  const clientId = String(formData.get("clientId") || "") || undefined;
  const prospectId = String(formData.get("prospectId") || "") || undefined;
  if (!clientId && !prospectId) throw new Error("Un devis doit être lié à un client ou à un prospect.");

  const quantity = Number(formData.get("quantity") || 1);
  const unitPrice = Number(formData.get("unitPrice") || 0);
  const taxRate = Number(formData.get("taxRate") || 20);
  const line = calculateLineTotal({ quantity, unitPrice, taxRate });
  const totals = calculateDocumentTotals([{ quantity, unitPrice, taxRate }]);
  const settings = await prisma.companySettings.findFirst();
  const count = await prisma.quote.count({ where: { issuedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } } });

  await prisma.quote.create({
    data: {
      number: buildDocumentNumber(settings?.quotePrefix ?? "DEV", count),
      clientId,
      prospectId,
      issuedAt: new Date(),
      validUntil: addDays(new Date(), 30),
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      status: "DRAFT",
      terms: settings?.paymentTerms,
      notes: String(formData.get("notes") || "") || undefined,
      items: {
        create: {
          serviceId: String(formData.get("serviceId") || "") || undefined,
          description: String(formData.get("description") ?? ""),
          quantity,
          unitPrice,
          taxRate,
          subtotal: line.subtotal,
          tax: line.tax,
          total: line.total
        }
      }
    }
  });

  redirect("/sales/quotes");
}
