"use server";

import { SubscriptionInterval, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createSubscription(formData: FormData) {
  await prisma.subscription.create({
    data: {
      clientId: String(formData.get("clientId") ?? ""),
      serviceId: String(formData.get("serviceId") || "") || undefined,
      name: String(formData.get("name") ?? ""),
      amount: Number(formData.get("amount") || 0),
      interval: String(formData.get("interval") || SubscriptionInterval.MONTHLY) as SubscriptionInterval,
      startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : new Date(),
      status: String(formData.get("status") || SubscriptionStatus.ACTIVE) as SubscriptionStatus
    }
  });

  revalidatePath("/dashboard");
  redirect("/sales/subscriptions");
}

export async function deleteSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.subscription.delete({ where: { id } });
  revalidatePath("/sales/subscriptions");
  revalidatePath("/dashboard");
}
