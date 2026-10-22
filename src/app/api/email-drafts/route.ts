import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { emailTransaction, insertDraft } from "@/lib/email/store";
import { constantEqual, EmailError } from "@/lib/email/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 48 * 1024;
async function readJson(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new EmailError("Content-Type application/json requis", 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES)
    throw new EmailError("Requête trop volumineuse", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new EmailError("Corps JSON requis");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new EmailError("Requête trop volumineuse", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EmailError("JSON invalide");
  }
}
export async function POST(request: Request) {
  const expected = process.env.EMAIL_IMPORT_API_KEY;
  if (!expected || expected.length < 32)
    return Response.json({ error: "Import non configuré" }, { status: 503 });
  const supplied = request.headers.get("authorization") ?? "";
  if (supplied.length > 512 || !constantEqual(supplied, `Bearer ${expected}`))
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const input = await readJson(request);
    const rateKey = createHash("sha256").update(expected).digest("hex");
    // Commit the rate counter independently, including rejected payloads.
    const allowed = await emailTransaction(async (tx) => {
      const now = new Date();
      const previous = await tx.emailApiRateLimit.findUnique({
        where: { key: rateKey },
      });
      const reset =
        !previous ||
        now.getTime() - previous.windowStart.getTime() >= 15 * 60000;
      if (!reset && previous.count >= 60) return false;
      await tx.emailApiRateLimit.upsert({
        where: { key: rateKey },
        create: { key: rateKey, windowStart: now, count: 1 },
        update: reset
          ? { windowStart: now, count: 1 }
          : { count: { increment: 1 } },
      });
      return true;
    });
    if (!allowed)
      return Response.json(
        { error: "Limite de 60 imports par 15 minutes atteinte" },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    const result = await emailTransaction((tx) => insertDraft(tx, input));
    return Response.json(result, {
      status: result.duplicate ? 200 : 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: "Données invalides",
          fields: error.issues.map((issue) => issue.path.join(".")),
        },
        { status: 400 },
      );
    if (error instanceof EmailError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Import indisponible" }, { status: 503 });
  }
}
