"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireEmailUser } from "@/lib/email/access";
import {
  approveDrafts,
  audit,
  cancelEmail,
  changeSettings,
  editDraft,
  emailTransaction,
  getSettings,
  insertDraft,
  reconcile,
  reschedule,
  suppressRecipient,
} from "@/lib/email/store";
import { EmailError } from "@/lib/email/validation";
import { parseLocalDate } from "@/lib/email/schedule";
import { purgeExpired } from "@/lib/email/worker";
const root = "/commercial/emails";
function optional(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || undefined;
}
function fields(data: FormData) {
  return {
    companyName: String(data.get("companyName") ?? ""),
    recipient: String(data.get("recipient") ?? ""),
    subject: String(data.get("subject") ?? ""),
    body: String(data.get("body") ?? ""),
    companyUrl: optional(data, "companyUrl"),
    mockupUrl: optional(data, "mockupUrl"),
    personalization: optional(data, "personalization"),
    prospectId: optional(data, "prospectId"),
  };
}
async function run(back: string, work: (actorId: string) => Promise<unknown>) {
  let error: string | undefined;
  try {
    const user = await requireEmailUser();
    await work(user.id);
  } catch (e) {
    error =
      e instanceof EmailError
        ? e.message
        : e instanceof ZodError
          ? e.issues.map((issue) => issue.message).join(" ; ")
          : "Opération impossible. Vérifiez la saisie et la configuration, puis rechargez la page.";
  }
  revalidatePath(root, "layout");
  redirect(
    `${back}?${error ? `error=${encodeURIComponent(error)}` : "saved=1"}`,
  );
}
export async function createEmail(data: FormData) {
  await run(root, (actor) =>
    emailTransaction(async (tx) => {
      const result = await insertDraft(tx, {
        ...fields(data),
        idempotencyKey: `manual:${crypto.randomUUID()}`,
      });
      await audit(tx, actor, result.id, "DRAFT_CREATED_MANUALLY");
    }),
  );
}
export async function saveEmail(data: FormData) {
  const id = String(data.get("id"));
  await run(root, (actor) =>
    emailTransaction((tx) =>
      editDraft(tx, id, Number(data.get("version")), fields(data), actor),
    ),
  );
}
export async function approveEmails(data: FormData) {
  await run(root, (actor) =>
    emailTransaction((tx) =>
      approveDrafts(
        tx,
        data.getAll("selected").map((value) => {
          const [id, version] = String(value).split(":");
          return { id, version: Number(version) };
        }),
        actor,
      ),
    ),
  );
}
export async function cancelMessage(data: FormData) {
  await run(root, (actor) =>
    emailTransaction((tx) =>
      cancelEmail(
        tx,
        String(data.get("id")),
        Number(data.get("version")),
        actor,
        data.get("remove") === "true",
      ),
    ),
  );
}
export async function scheduleMessage(data: FormData) {
  await run(root, (actor) =>
    emailTransaction(async (tx) => {
      const settings = await getSettings(tx);
      await reschedule(
        tx,
        String(data.get("id")),
        Number(data.get("version")),
        parseLocalDate(String(data.get("notBefore")), settings.timezone),
        actor,
      );
    }),
  );
}
export async function saveEmailSettings(data: FormData) {
  const minute = (key: string) => {
    const value = String(data.get(key));
    if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
    const [h, m] = value.split(":").map(Number);
    return h > 23 || m > 59 ? NaN : h * 60 + m;
  };
  await run(`${root}/settings`, (actor) =>
    emailTransaction((tx) =>
      changeSettings(
        tx,
        {
          enabled: data.get("enabled") === "on",
          intervalMinutes:
            Number(data.get("interval")) *
            (data.get("unit") === "hours" ? 60 : 1),
          dailyLimit: Number(data.get("dailyLimit")),
          startMinute: data.get("allDay") === "on" ? 0 : minute("startTime"),
          endMinute: data.get("allDay") === "on" ? 1440 : minute("endTime"),
          weekdays: data.getAll("weekdays").map(Number),
          timezone: String(data.get("timezone")),
          retentionDays: Number(data.get("retentionDays")),
        },
        Number(data.get("revision")),
        actor,
      ),
    ),
  );
}
export async function excludeRecipient(data: FormData) {
  await run(root, (actor) =>
    emailTransaction(async (tx) => {
      const { z } = await import("zod");
      const address = z.string().email().parse(data.get("recipient"));
      const reason = z
        .enum(["opposition", "reply", "manual"])
        .parse(data.get("reason"));
      await suppressRecipient(tx, address, reason, actor);
    }),
  );
}
export async function reconcileMessage(data: FormData) {
  await run(root, (actor) =>
    emailTransaction((tx) =>
      reconcile(
        tx,
        String(data.get("id")),
        Number(data.get("version")),
        data.get("accepted") === "true",
        actor,
      ),
    ),
  );
}
export async function purgeEmailContent() {
  await run(`${root}/settings`, (actor) =>
    emailTransaction(async (tx) => {
      const result = await purgeExpired(tx);
      await audit(
        tx,
        actor,
        "retention",
        `EXPIRED_CONTENT_PURGED_${result.count}`,
      );
    }),
  );
}
