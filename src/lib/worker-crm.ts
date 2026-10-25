import { createHash, timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type WorkerDependencies = {
  db: PrismaClient;
  key?: string;
  recipientKey: (email: string) => string;
  now?: () => number;
};
type LookupDatabase = Pick<Prisma.TransactionClient, "prospect" | "emailSuppression" | "emailQueue">;
const digest = (value: string) => createHash("sha256").update(value).digest();
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
const reply = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers });
const norm = (value: string) => new URL(value).hostname.toLowerCase().replace(/^www\./, "");
let bucket = { since: 0, count: 0 };

function isSources(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 &&
    value.every((source: unknown) => typeof source === "string" && /^https?:\/\//.test(source));
}

export async function handle(req: Request, deps: WorkerDependencies): Promise<Response> {
  const key = deps.key;
  if (typeof key !== "string" || key.length < 32)
    return reply(503, { error: "WORKER_CRM_NOT_CONFIGURED" });
  const token = req.headers.get("authorization") || "";
  if (token.length > 512 || !timingSafeEqual(digest(token), digest("Bearer " + key)))
    return reply(401, { error: "UNAUTHORIZED" });
  const now = deps.now?.() ?? Date.now();
  if (now - bucket.since > 60000) bucket = { since: now, count: 0 };
  if (++bucket.count > 60) return reply(429, { error: "RATE_LIMITED" });
  if (req.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });
  let text = "";
  try {
    const reader = req.body?.getReader();
    if (!reader) return reply(400, { error: "BODY_REQUIRED" });
    let size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12000) {
        await reader.cancel();
        return reply(413, { error: "BODY_TOO_LARGE" });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return reply(400, { error: "INVALID_BODY" });
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { return reply(400, { error: "INVALID_JSON" }); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return reply(400, { error: "INVALID_IDENTITY" });
  const input = parsed as Record<string, unknown>;
  if (input.action === "health")
    return reply(200, { ok: true, scope: "prospect-lookup-and-create-to-contact-only", capabilities:{dashboardHistory:true} });
  if ((input.action !== "lookup" && input.action !== "create") ||
      typeof input.siren !== "string" || !/^\d{9}$/.test(input.siren) ||
      typeof input.email !== "string" || !/^\S+@\S+\.\S+$/.test(input.email) || input.email.length > 254)
    return reply(400, { error: "INVALID_IDENTITY" });
  const website = input.website;
  let domain: string;
  try {
    if (typeof website !== "string") throw new Error();
    const url = new URL(website);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
    domain = norm(website);
  } catch { return reply(400, { error: "INVALID_WEBSITE" }); }
  // Keep the validated string outside transaction callbacks.
  if (typeof website !== "string") return reply(400, { error: "INVALID_WEBSITE" });
  const marker = "[VISIPRO_WORKER_SIREN:" + input.siren + "]";
  const email = input.email.toLowerCase();
  const find = async (db: LookupDatabase) => {
    const candidates = await db.prospect.findMany({
      where: { OR: [
        { email: { equals: email, mode: "insensitive" } },
        { website: { contains: domain, mode: "insensitive" } },
        { notes: { contains: marker } },
      ] },
      take: 20,
      select: { id: true, companyName: true, email: true, website: true, stage: true, notes: true },
    });
    if (candidates.length >= 20) throw new Error("LOOKUP_TOO_BROAD");
    return candidates.filter(prospect => {
      if (prospect.notes?.includes(marker) || prospect.email?.toLowerCase() === email) return true;
      try { return prospect.website !== null && norm(prospect.website) === domain; }
      catch { return false; }
    }).map(({ id, companyName, email, website, stage }) => ({ id, companyName, email, website, stage }));
  };
  try {
    const suppressed = async (db: LookupDatabase) => Boolean(await db.emailSuppression.findUnique({
      where: { recipientKey: deps.recipientKey(email) }, select: { recipientKey: true },
    }));
    const history = async (db: LookupDatabase, ids: string[]) => {
      const rows = await db.emailQueue.findMany({where:{OR:[
        {recipientKey:deps.recipientKey(email)},
        {companyUrl:{contains:domain,mode:"insensitive"}},
        ...(ids.length ? [{prospectId:{in:ids}}] : [])
      ]},take:20,select:{id:true,recipientKey:true,companyUrl:true,prospectId:true,status:true,deletedAt:true,sentAt:true,updatedAt:true}});
      if(rows.length>=20)throw new Error("HISTORY_TOO_BROAD");
      return rows.filter(row => row.recipientKey===deps.recipientKey(email) || (row.prospectId!==null&&ids.includes(row.prospectId)) || (()=>{try{return row.companyUrl!==null&&norm(row.companyUrl)===domain}catch{return false}})()).map(({id,status,deletedAt,sentAt,updatedAt})=>({id,status,deleted:!!deletedAt,sentAt,updatedAt}));
    };
    if (input.action === "lookup") {
      const matches = await find(deps.db);
      const opposition = await deps.db.emailSuppression.findUnique({where:{recipientKey:deps.recipientKey(email)},select:{reason:true,createdAt:true}});
      const communication = await history(deps.db,matches.map(row=>row.id));
      return reply(200,{matches,suppressionChecked:true,suppressed:!!opposition,opposition:opposition?{reason:opposition.reason,at:opposition.createdAt}:undefined,historyChecked:true,communication,eligible:!matches.length&&!opposition&&!communication.length,coverage:"dashboard_only"});
    }
    const allowed = ["action", "siren", "email", "website", "companyName", "phone", "address", "city", "activity", "sources", "notes", "mockupUrl"];
    const companyName = input.companyName;
    const sources = input.sources;
    const mockupUrl = input.mockupUrl;
    if (Object.keys(input).some(field => !allowed.includes(field)) ||
        typeof companyName !== "string" || !companyName.trim() || companyName.length > 200 ||
        !isSources(sources) || typeof mockupUrl !== "string" || !/^https:\/\/[a-z0-9-]+\.pages\.dev\/$/.test(mockupUrl))
      return reply(400, { error: "INVALID_PROSPECT" });
    const optional: Partial<Record<"phone" | "address" | "city" | "activity" | "notes", string>> = {};
    for (const field of ["phone", "address", "city", "activity", "notes"] as const) {
      const value = input[field];
      if (value !== undefined) {
        if (typeof value !== "string" || value.length > 4000) return reply(400, { error: "INVALID_FIELD" });
        optional[field] = value;
      }
    }
    return await deps.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(87326411)`;
      if (await suppressed(tx)) return reply(409, { error: "RECIPIENT_SUPPRESSED" });
      const old = await find(tx);
      if (old.length > 1) return reply(409, { error: "AMBIGUOUS_PROSPECT" });
      if (old.length === 1) return reply(200, { crmId: old[0].id, stage: old[0].stage, existing: true });
      if((await history(tx,[])).length)return reply(409,{error:"RECIPIENT_ALREADY_KNOWN"});
      const prospect = await tx.prospect.create({
        data: {
          companyName: companyName.trim(), email, website,
          phone: optional.phone, address: optional.address, city: optional.city, activity: optional.activity,
          source: sources.join(" ; "), notes: marker + "\n" + (optional.notes || "") + "\nMaquette : " + mockupUrl,
          stage: "TO_CONTACT", nextAction: "Valider le brouillon et envoyer manuellement si souhaité",
          activities: { create: { type: "NOTE", content: "Maquette préparée : " + mockupUrl + " . Aucun email envoyé par le worker." } },
        }, select: { id: true, stage: true },
      });
      return reply(201, { crmId: prospect.id, stage: prospect.stage, existing: false });
    });
  } catch { return reply(503, { error: "CRM_UNAVAILABLE" }); }
}
