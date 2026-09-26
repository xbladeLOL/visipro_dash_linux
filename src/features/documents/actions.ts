"use server";

import { DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createDocument(formData: FormData) {
  await prisma.document.create({
    data: {
      name: String(formData.get("name") ?? ""),
      type: String(formData.get("type") || DocumentType.OTHER) as DocumentType,
      storageProvider: "external-placeholder",
      storageKey: String(formData.get("storageKey") || "") || `manual/${Date.now()}`,
      url: String(formData.get("url") || "") || undefined,
      clientId: String(formData.get("clientId") || "") || undefined,
      prospectId: String(formData.get("prospectId") || "") || undefined,
      projectId: String(formData.get("projectId") || "") || undefined,
      quoteId: String(formData.get("quoteId") || "") || undefined,
      invoiceId: String(formData.get("invoiceId") || "") || undefined,
      expenseId: String(formData.get("expenseId") || "") || undefined
    }
  });

  redirect("/documents");
}

export async function deleteDocument(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
}
