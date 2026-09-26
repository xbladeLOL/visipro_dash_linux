"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateDocumentTotals, calculateLineTotal } from "@/lib/financial";
import { buildDocumentNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";

export async function createInvoice(formData: FormData) {
  const quantity = Number(formData.get("quantity") || 1);
  const unitPrice = Number(formData.get("unitPrice") || 0);
  const taxRate = Number(formData.get("taxRate") || 20);
  const line = calculateLineTotal({ quantity, unitPrice, taxRate });
  const totals = calculateDocumentTotals([{ quantity, unitPrice, taxRate }]);
  const settings = await prisma.companySettings.findFirst();
  const count = await prisma.invoice.count({ where: { issuedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } } });

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number: buildDocumentNumber(settings?.invoicePrefix ?? "FAC", count),
        clientId: String(formData.get("clientId") ?? ""),
        issuedAt: new Date(),
        dueDate: addDays(new Date(), Number(formData.get("paymentDelay") || 30)),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paidAmount: 0,
        remainingAmount: totals.total,
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
    await tx.auditLog.create({ data: { entityType: "Invoice", entityId: invoice.id, action: "INVOICE_CREATED", metadata: { total: totals.total } } });
  });

  redirect("/sales/invoices");
}

export async function deleteInvoice(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { invoiceId: id } });
    await tx.payment.deleteMany({ where: { invoiceId: id } });
    await tx.document.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.delete({ where: { id } });
    await tx.auditLog.create({ data: { entityType: "Invoice", entityId: id, action: "INVOICE_DELETED" } });
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/payments");
  revalidatePath("/dashboard");
}

export async function deleteAllInvoices() {
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { invoiceId: { not: null } } });
    await tx.payment.deleteMany();
    await tx.document.deleteMany({ where: { invoiceId: { not: null } } });
    await tx.invoice.deleteMany();
    await tx.auditLog.create({ data: { entityType: "Invoice", entityId: "all", action: "ALL_INVOICES_DELETED" } });
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/payments");
  revalidatePath("/dashboard");
}
