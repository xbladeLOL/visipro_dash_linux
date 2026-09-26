"use server";

import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { RecurringExpenseStatus, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { roundMoney } from "@/lib/financial";
import { prisma } from "@/lib/prisma";

export async function createRecurringExpense(formData: FormData) {
  const amountExcludingTax = Number(formData.get("amountExcludingTax") || 0);
  const taxAmount = Number(formData.get("taxAmount") || 0);
  const startDate = formData.get("startDate") ? new Date(String(formData.get("startDate"))) : new Date();

  await prisma.recurringExpense.create({
    data: {
      name: String(formData.get("name") ?? ""),
      vendor: String(formData.get("vendor") ?? ""),
      description: String(formData.get("description") ?? ""),
      categoryId: String(formData.get("categoryId") || "") || undefined,
      amountExcludingTax,
      taxAmount,
      totalAmount: roundMoney(amountExcludingTax + taxAmount),
      paymentMethod: String(formData.get("paymentMethod") || "Carte"),
      startDate,
      nextRunAt: startDate,
      status: String(formData.get("status") || RecurringExpenseStatus.ACTIVE) as RecurringExpenseStatus,
      notes: String(formData.get("notes") || "") || undefined
    }
  });

  redirect("/accounting/recurring-expenses");
}

export async function generateCurrentMonthRecurringExpenses() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthKey = format(now, "yyyy-MM");

  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: {
      status: RecurringExpenseStatus.ACTIVE,
      startDate: { lte: monthEnd },
      OR: [{ endDate: null }, { endDate: { gte: monthStart } }]
    }
  });

  await prisma.$transaction(async (tx) => {
    for (const recurringExpense of recurringExpenses) {
      const existing = await tx.expense.count({
        where: {
          recurringExpenseId: recurringExpense.id,
          date: { gte: monthStart, lte: monthEnd }
        }
      });
      if (existing > 0) continue;

      const expense = await tx.expense.create({
        data: {
          date: now,
          vendor: recurringExpense.vendor,
          description: `${recurringExpense.description} (${monthKey})`,
          categoryId: recurringExpense.categoryId,
          amountExcludingTax: recurringExpense.amountExcludingTax,
          taxAmount: recurringExpense.taxAmount,
          totalAmount: recurringExpense.totalAmount,
          paymentMethod: recurringExpense.paymentMethod,
          recurringExpenseId: recurringExpense.id,
          notes: `Débit mensuel généré depuis ${recurringExpense.name}`
        }
      });
      await tx.transaction.create({
        data: {
          type: TransactionType.EXPENSE,
          date: now,
          amount: recurringExpense.totalAmount,
          categoryId: recurringExpense.categoryId,
          vendor: recurringExpense.vendor,
          expenseId: expense.id,
          paymentMethod: recurringExpense.paymentMethod,
          notes: `Dépense récurrente ${recurringExpense.name} - ${monthKey}`
        }
      });
      await tx.recurringExpense.update({ where: { id: recurringExpense.id }, data: { nextRunAt: addMonths(now, 1) } });
    }
    await tx.auditLog.create({ data: { entityType: "RecurringExpense", entityId: monthKey, action: "MONTHLY_RECURRING_EXPENSES_GENERATED", metadata: { count: recurringExpenses.length } } });
  });

  revalidatePath("/accounting/recurring-expenses");
  revalidatePath("/accounting/expenses");
  revalidatePath("/dashboard");
}

export async function deleteRecurringExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.recurringExpense.delete({ where: { id } });
  revalidatePath("/accounting/recurring-expenses");
}

export async function updateRecurringExpenseStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") || RecurringExpenseStatus.ACTIVE) as RecurringExpenseStatus;
  await prisma.recurringExpense.update({ where: { id }, data: { status } });
  revalidatePath("/accounting/recurring-expenses");
}
