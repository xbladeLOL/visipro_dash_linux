"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setEngineBusinessStatus, startEngineScan } from "@/lib/prospect-engine";

const detectionPath = "/commercial/detection";
export async function startScan(formData: FormData) {
  const query=String(formData.get("query") ?? "").trim(); const city=String(formData.get("city") ?? "").trim();
  const limit=Math.max(1,Math.min(100,Number(formData.get("limit") ?? 30)));
  if (!query || !city) redirect(`${detectionPath}?error=${encodeURIComponent("Métier et ville obligatoires")}`);
  let jobId:string;
  try { jobId=(await startEngineScan({query,city,limit})).jobId; }
  catch(error) { redirect(`${detectionPath}?error=${encodeURIComponent(error instanceof Error ? error.message : "Erreur inconnue")}`); }
  redirect(`${detectionPath}?scan=${jobId}`);
}

export async function importDetectedProspect(formData: FormData) {
  const externalId=String(formData.get("id") ?? ""); const source=`VisiPro Detection:${externalId}`;
  const existing=await prisma.prospect.findFirst({where:{source}});
  if (!existing) await prisma.prospect.create({data:{companyName:String(formData.get("name") ?? "Entreprise"),phone:String(formData.get("phone") ?? "")||null,website:String(formData.get("website") ?? "")||null,email:String(formData.get("email") ?? "")||null,address:String(formData.get("address") ?? "")||null,city:String(formData.get("city") ?? "")||null,activity:String(formData.get("category") ?? "")||null,source,stage:"TO_ANALYZE",notes:String(formData.get("notes") ?? "")||null}});
  await setEngineBusinessStatus(externalId,"APPROVED"); revalidatePath(detectionPath); revalidatePath("/commercial/prospects");
}
export async function rejectDetectedProspect(formData: FormData) { await setEngineBusinessStatus(String(formData.get("id")),"REJECTED",String(formData.get("reason") ?? "Rejeté depuis le dashboard")); revalidatePath(detectionPath); }
export async function suppressDetectedProspect(formData: FormData) { await setEngineBusinessStatus(String(formData.get("id")),"DO_NOT_CONTACT","Ne pas contacter"); revalidatePath(detectionPath); }
