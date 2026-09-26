"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateInitialCashBalance(formData: FormData) {
  const amount = Number(formData.get("initialCashBalance"));
  if (!Number.isFinite(amount)) return;
  const settings = await prisma.companySettings.findFirst({ select: { id: true } });
  if (!settings) return;
  await prisma.companySettings.update({ where: { id: settings.id }, data: { initialCashBalance: amount } });
  revalidatePath("/settings/company");
  revalidatePath("/accounting/cash-flow");
}
