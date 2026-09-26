"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createClient(formData: FormData) {
  const client = await prisma.client.create({
    data: {
      legalName: String(formData.get("legalName") ?? ""),
      tradeName: String(formData.get("tradeName") || "") || undefined,
      contactName: String(formData.get("contactName") || "") || undefined,
      email: String(formData.get("email") || "") || undefined,
      phone: String(formData.get("phone") || "") || undefined,
      website: String(formData.get("website") || "") || undefined,
      address: String(formData.get("address") || "") || undefined,
      siret: String(formData.get("siret") || "") || undefined,
      vatNumber: String(formData.get("vatNumber") || "") || undefined,
      notes: String(formData.get("notes") || "") || undefined
    }
  });

  redirect(`/commercial/clients/${client.id}`);
}

export async function deleteClient(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const invoices = await tx.invoice.findMany({ where: { clientId: id }, select: { id: true } });
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const quotes = await tx.quote.findMany({ where: { clientId: id }, select: { id: true } });
    const quoteIds = quotes.map((quote) => quote.id);
    const projects = await tx.project.findMany({ where: { clientId: id }, select: { id: true } });
    const projectIds = projects.map((project) => project.id);
    const expenses = await tx.expense.findMany({ where: { clientId: id }, select: { id: true } });
    const expenseIds = expenses.map((expense) => expense.id);

    await tx.auditLog.create({ data: { entityType: "Client", entityId: id, action: "CLIENT_FORCE_DELETED_TEST_MODE" } });
    await tx.transaction.deleteMany({ where: { OR: [{ clientId: id }, { invoiceId: { in: invoiceIds } }, { expenseId: { in: expenseIds } }] } });
    await tx.payment.deleteMany({ where: { OR: [{ clientId: id }, { invoiceId: { in: invoiceIds } }] } });
    await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await tx.expense.updateMany({ where: { receiptDocumentId: { not: null }, id: { in: expenseIds } }, data: { receiptDocumentId: null } });
    await tx.document.deleteMany({ where: { OR: [{ clientId: id }, { invoiceId: { in: invoiceIds } }, { quoteId: { in: quoteIds } }, { projectId: { in: projectIds } }, { expenseId: { in: expenseIds } }] } });
    await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
    await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await tx.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await tx.quote.deleteMany({ where: { id: { in: quoteIds } } });
    await tx.task.updateMany({ where: { clientId: id }, data: { clientId: null } });
    await tx.activity.deleteMany({ where: { OR: [{ clientId: id }, { projectId: { in: projectIds } }] } });
    await tx.projectChecklistItem.deleteMany({ where: { projectId: { in: projectIds } } });
    await tx.task.updateMany({ where: { projectId: { in: projectIds } }, data: { projectId: null } });
    await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    await tx.subscription.deleteMany({ where: { clientId: id } });
    await tx.contact.deleteMany({ where: { clientId: id } });
    await tx.client.delete({ where: { id } });
  });
  revalidatePath("/commercial/clients");
}
