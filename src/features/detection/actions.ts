"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setEngineBusinessStatus, startEngineScan } from "@/lib/prospect-engine";

const detectionPath = "/commercial/detection";
export async function startScan(formData: FormData) {
  const customQuery=String(formData.get("query") ?? "").trim(); const city=String(formData.get("city") ?? "").trim();
  const queries=[...new Set([...formData.getAll("queries").map(String).map(value=>value.trim()).filter(Boolean),...(customQuery?[customQuery]:[])])];
  const limit=Math.max(1,Math.min(100,Number(formData.get("limit") ?? 30)));
  const requireEmail=formData.get("requireEmail")==="true";
  if (!queries.length || !city) redirect(`${detectionPath}?error=${encodeURIComponent("Au moins un secteur et une ville sont obligatoires")}`);
  let result:{jobId:string;jobIds:string[];queued:number};
  try { result=await startEngineScan({queries,city,limit,requireEmail}); }
  catch(error) { redirect(`${detectionPath}?error=${encodeURIComponent(error instanceof Error ? error.message : "Erreur inconnue")}`); }
  redirect(`${detectionPath}?scan=${result.jobId}&batch=${result.queued}${requireEmail?"&hasEmail=true":""}`);
}

export async function importDetectedProspect(formData: FormData) {
  const externalId=String(formData.get("id") ?? ""); const source=`VisiPro Detection:${externalId}`;
  const existing=await prisma.prospect.findFirst({where:{source}});
  if (!existing) await prisma.prospect.create({data:{companyName:String(formData.get("name") ?? "Entreprise"),phone:String(formData.get("phone") ?? "")||null,website:String(formData.get("website") ?? "")||null,email:String(formData.get("email") ?? "")||null,address:String(formData.get("address") ?? "")||null,city:String(formData.get("city") ?? "")||null,activity:String(formData.get("category") ?? "")||null,source,stage:"TO_ANALYZE",notes:String(formData.get("notes") ?? "")||null}});
  await setEngineBusinessStatus(externalId,"APPROVED"); revalidatePath(detectionPath); revalidatePath("/commercial/prospects");
}
export async function rejectDetectedProspect(formData: FormData) { await setEngineBusinessStatus(String(formData.get("id")),"REJECTED",String(formData.get("reason") ?? "Rejeté depuis le dashboard")); revalidatePath(detectionPath); }
export async function suppressDetectedProspect(formData: FormData) { await setEngineBusinessStatus(String(formData.get("id")),"DO_NOT_CONTACT","Ne pas contacter"); revalidatePath(detectionPath); }
