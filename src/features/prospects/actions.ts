"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProspectStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prospectSchema } from "@/lib/validations";

export async function createProspect(formData: FormData) {
  const parsed = prospectSchema.parse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    website: formData.get("website") || undefined,
    city: formData.get("city") || undefined,
    source: formData.get("source") || undefined,
    activity: formData.get("activity") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    potentialValue: formData.get("potentialValue") || 0,
    stage: formData.get("stage") || ProspectStage.NEW,
    notes: formData.get("notes") || undefined,
    nextAction: formData.get("nextAction") || undefined,
    nextFollowUpAt: formData.get("nextFollowUpAt") || undefined
  });
  await prisma.prospect.create({ data: parsed });
  revalidatePath("/commercial/prospects");
  redirect("/commercial/prospects");
}

export async function moveProspectStage(id: string, stage: ProspectStage) {
  await prisma.prospect.update({ where: { id }, data: { stage } });
  revalidatePath("/commercial/prospects");
}

export async function updateProspectStage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? ProspectStage.NEW) as ProspectStage;
  await prisma.prospect.update({ where: { id }, data: { stage } });
  revalidatePath("/commercial/prospects");
}

export async function deleteProspect(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quotes = await prisma.quote.count({ where: { prospectId: id } });
  if (quotes > 0) {
    revalidatePath("/commercial/prospects");
    return;
  }
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/commercial/prospects");
}

export async function addProspectCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.prospectCategory.upsert({ where: { name }, create: { name }, update: {} });
  revalidatePath("/commercial/prospects/categories");
  revalidatePath("/commercial/prospects");
  revalidatePath("/commercial/prospects/new");
}

export async function renameProspectCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.prospectCategory.update({ where: { id }, data: { name } });
  revalidatePath("/commercial/prospects/categories");
  revalidatePath("/commercial/prospects");
}

export async function deleteProspectCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.prospectCategory.delete({ where: { id } });
  revalidatePath("/commercial/prospects/categories");
  revalidatePath("/commercial/prospects");
}
