"use server";

import { revalidatePath } from "next/cache";
import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/financial";
import { expenseSchema } from "@/lib/validations";

export async function createExpense(formData: FormData) {
  const input = expenseSchema.parse({
    date: formData.get("date"),
    vendor: formData.get("vendor"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
    amountExcludingTax: formData.get("amountExcludingTax"),
    taxAmount: formData.get("taxAmount") || 0,
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined
  });
  const total = roundMoney(input.amountExcludingTax + input.taxAmount);
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({ data: { ...input, totalAmount: total } });
    await tx.transaction.create({ data: { type: TransactionType.EXPENSE, date: input.date, amount: total, categoryId: input.categoryId, vendor: input.vendor, expenseId: expense.id, paymentMethod: input.paymentMethod, notes: input.notes } });
    await tx.auditLog.create({ data: { entityType: "Expense", entityId: expense.id, action: "EXPENSE_CREATED", metadata: { total } } });
  });
  revalidatePath("/accounting/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id }, select: { receiptDocumentId: true } });
    await tx.transaction.deleteMany({ where: { expenseId: id } });
    await tx.expense.update({ where: { id }, data: { receiptDocumentId: null } });
    await tx.document.deleteMany({ where: { OR: [{ expenseId: id }, { id: expense?.receiptDocumentId ?? "" }] } });
    await tx.expense.delete({ where: { id } });
    await tx.auditLog.create({ data: { entityType: "Expense", entityId: id, action: "EXPENSE_DELETED_TEST_MODE" } });
  });

  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/transactions");
  revalidatePath("/dashboard");
}

export async function deleteAllExpenses() {
  await prisma.$transaction(async (tx) => {
    const expenses = await tx.expense.findMany({ select: { id: true, receiptDocumentId: true } });
    const expenseIds = expenses.map((expense) => expense.id);
    const receiptDocumentIds = expenses.flatMap((expense) => expense.receiptDocumentId ? [expense.receiptDocumentId] : []);

    await tx.transaction.deleteMany({ where: { expenseId: { in: expenseIds } } });
    await tx.expense.updateMany({ where: { id: { in: expenseIds } }, data: { receiptDocumentId: null } });
    await tx.document.deleteMany({ where: { OR: [{ expenseId: { in: expenseIds } }, { id: { in: receiptDocumentIds } }] } });
    await tx.expense.deleteMany({ where: { id: { in: expenseIds } } });
    await tx.auditLog.create({ data: { entityType: "Expense", entityId: "all", action: "ALL_EXPENSES_DELETED_TEST_MODE", metadata: { count: expenseIds.length } } });
  });

  revalidatePath("/accounting/expenses");
  revalidatePath("/accounting/transactions");
  revalidatePath("/dashboard");
}
