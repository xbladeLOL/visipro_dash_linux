"use server";

import { revalidatePath } from "next/cache";
import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveInvoiceStatus, roundMoney } from "@/lib/financial";
import { paymentSchema } from "@/lib/validations";

export async function createPayment(formData: FormData) {
  const input = paymentSchema.parse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined
  });

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
    const newPaid = roundMoney(Number(invoice.paidAmount) + input.amount);
    const remaining = Math.max(0, roundMoney(Number(invoice.total) - newPaid));
    const status = resolveInvoiceStatus(Number(invoice.total), newPaid, invoice.dueDate);
    const payment = await tx.payment.create({ data: { ...input, amount: input.amount, clientId: invoice.clientId } });
    await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: newPaid, remainingAmount: remaining, status } });
    await tx.transaction.create({ data: { type: TransactionType.INCOME, date: input.paidAt, amount: input.amount, categoryLabel: "Paiement facture", clientId: invoice.clientId, invoiceId: invoice.id, paymentId: payment.id, paymentMethod: input.method, reference: input.reference, notes: input.notes } });
    await tx.auditLog.create({ data: { entityType: "Invoice", entityId: invoice.id, action: status === "PAID" ? "INVOICE_MARKED_PAID" : "PAYMENT_CREATED", metadata: { paymentId: payment.id, amount: input.amount } } });
  });
  revalidatePath("/sales/invoices");
  revalidatePath("/sales/payments");
  revalidatePath("/dashboard");
}

export async function deletePayment(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id }, include: { invoice: true } });
    await tx.transaction.deleteMany({ where: { paymentId: payment.id } });
    await tx.payment.delete({ where: { id: payment.id } });

    const newPaid = roundMoney(Number(payment.invoice.paidAmount) - Number(payment.amount));
    const paidAmount = Math.max(0, newPaid);
    const remainingAmount = Math.max(0, roundMoney(Number(payment.invoice.total) - paidAmount));
    const status = resolveInvoiceStatus(Number(payment.invoice.total), paidAmount, payment.invoice.dueDate);

    await tx.invoice.update({ where: { id: payment.invoiceId }, data: { paidAmount, remainingAmount, status } });
    await tx.auditLog.create({ data: { entityType: "Payment", entityId: payment.id, action: "PAYMENT_DELETED", metadata: { invoiceId: payment.invoiceId, amount: Number(payment.amount) } } });
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/payments");
  revalidatePath("/dashboard");
}

export async function deleteAllPayments() {
  await prisma.$transaction(async (tx) => {
    const invoices = await tx.invoice.findMany({ where: { payments: { some: {} } }, select: { id: true, total: true, dueDate: true } });
    await tx.transaction.deleteMany({ where: { paymentId: { not: null } } });
    await tx.payment.deleteMany();

    for (const invoice of invoices) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: 0,
          remainingAmount: invoice.total,
          status: resolveInvoiceStatus(Number(invoice.total), 0, invoice.dueDate)
        }
      });
    }

    await tx.auditLog.create({ data: { entityType: "Payment", entityId: "all", action: "ALL_PAYMENTS_DELETED" } });
  });

  revalidatePath("/sales/invoices");
  revalidatePath("/sales/payments");
  revalidatePath("/dashboard");
}
