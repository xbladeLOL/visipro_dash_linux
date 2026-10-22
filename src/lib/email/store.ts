import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deliveryMode,
  draftSchema,
  EmailError,
  maskEmail,
  payloadHash,
  recipientKey,
  settingsSchema,
  type DraftInput,
} from "./validation";
import { nextSlot } from "./schedule";

export type Tx = Prisma.TransactionClient;
export function emailTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
  db: PrismaClient = prisma,
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      // All workers and email mutations share this transaction-scoped lock.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(734911, 1)::text`;
      return fn(tx);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 15000,
      timeout: 30000,
    },
  );
}
export async function getSettings(tx: Tx) {
  return tx.emailSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}
export async function audit(
  tx: Tx,
  actorId: string | null,
  id: string,
  action: string,
) {
  await tx.auditLog.create({
    data: { actorId, entityId: id, entityType: "Email", action },
  });
}
export async function replan(tx: Tx, now = new Date()) {
  const settings = await getSettings(tx);
  const active = await tx.emailQueue.findMany({
    where: {
      deletedAt: null,
      OR: [
        { status: { in: ["approved", "scheduled"] } },
        {
          status: "failed",
          reviewRequired: false,
          retryAt: { not: null },
          retryCount: { lt: 3 },
          approvedAt: { not: null },
        },
      ],
    },
    orderBy: [{ notBefore: "asc" }, { approvedAt: "asc" }, { id: "asc" }],
  });
  active.sort(
    (a, b) =>
      Math.max(a.notBefore?.getTime() ?? 0, a.retryAt?.getTime() ?? 0) -
      Math.max(b.notBefore?.getTime() ?? 0, b.retryAt?.getTime() ?? 0),
  );
  const recent = await tx.emailSendAttempt.findMany({
    where: { startedAt: { gte: new Date(now.getTime() - 3 * 86400000) } },
    select: { startedAt: true, finishedAt: true },
  });
  const latest = await tx.emailSendAttempt.findFirst({
    orderBy: { startedAt: "desc" },
  });
  let last: Date | null = latest
    ? new Date(
        Math.max(latest.startedAt.getTime(), latest.finishedAt?.getTime() ?? 0),
      )
    : null;
  const used = recent.map((attempt) => attempt.startedAt);
  for (const message of active) {
    if (
      await tx.emailSuppression.findUnique({
        where: { recipientKey: message.recipientKey },
      })
    ) {
      await tx.emailQueue.update({
        where: { id: message.id },
        data: {
          status: "suppressed",
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      continue;
    }
    if (message.approvalMode !== deliveryMode()) {
      await tx.emailQueue.update({
        where: { id: message.id },
        data: {
          status: "draft",
          approvedAt: null,
          approvedBy: null,
          approvalMode: null,
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      await audit(tx, null, message.id, "DELIVERY_MODE_CHANGED_APPROVAL_RESET");
      continue;
    }
    if (!settings.enabled) {
      await tx.emailQueue.update({
        where: { id: message.id },
        data: {
          status: message.status === "failed" ? "failed" : "approved",
          scheduledAt: null,
        },
      });
      continue;
    }
    const from = new Date(
      Math.max(
        Math.floor(now.getTime() / 60000) * 60000,
        message.notBefore?.getTime() ?? 0,
        message.retryAt?.getTime() ?? 0,
      ),
    );
    const scheduledAt = nextSlot(settings, from, last, used);
    await tx.emailQueue.update({
      where: { id: message.id },
      data: {
        status: message.status === "failed" ? "failed" : "scheduled",
        scheduledAt,
      },
    });
    used.push(scheduledAt);
    last = scheduledAt;
  }
  return settings;
}
export async function insertDraft(tx: Tx, raw: unknown) {
  const input = draftSchema.parse(raw);
  const hash = payloadHash(input);
  const existing = await tx.emailQueue.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    if (existing.payloadHash !== hash)
      throw new EmailError(
        "Cette clé d'idempotence correspond à un autre contenu",
        409,
      );
    return { id: existing.id, status: existing.status, duplicate: true };
  }
  const key = recipientKey(input.recipient);
  if (await tx.emailSuppression.findUnique({ where: { recipientKey: key } }))
    throw new EmailError("Destinataire exclu", 409);
  if (await tx.emailQueue.findUnique({ where: { recipientKey: key } }))
    throw new EmailError("Un message existe déjà pour cette adresse", 409);
  if (
    input.prospectId &&
    !(await tx.prospect.findUnique({ where: { id: input.prospectId } }))
  )
    throw new EmailError("Prospect introuvable", 404);
  const message = await tx.emailQueue.create({
    data: { ...input, recipientKey: key, payloadHash: hash },
  });
  await audit(tx, null, message.id, "DRAFT_IMPORTED");
  return { id: message.id, status: message.status, duplicate: false };
}
export async function editDraft(
  tx: Tx,
  id: string,
  version: number,
  input: Omit<DraftInput, "idempotencyKey">,
  actorId: string,
  now = new Date(),
) {
  const message = await editable(tx, id, version);
  const parsed = draftSchema.parse({
    ...input,
    idempotencyKey: message.idempotencyKey,
  });
  const key = recipientKey(parsed.recipient);
  if (await tx.emailSuppression.findUnique({ where: { recipientKey: key } }))
    throw new EmailError("Destinataire exclu");
  if (
    key !== message.recipientKey &&
    (await tx.emailQueue.findUnique({ where: { recipientKey: key } }))
  )
    throw new EmailError("Adresse déjà présente", 409);
  if (
    parsed.prospectId &&
    !(await tx.prospect.findUnique({ where: { id: parsed.prospectId } }))
  )
    throw new EmailError("Prospect introuvable", 404);
  await tx.emailQueue.update({
    where: { id },
    data: {
      ...parsed,
      recipientKey: key,
      status: "draft",
      approvedAt: null,
      approvedBy: null,
      approvalMode: null,
      scheduledAt: null,
      notBefore: null,
      retryAt: null,
      reviewRequired: false,
      version: { increment: 1 },
    },
  });
  await audit(tx, actorId, id, "DRAFT_EDITED_APPROVAL_RESET");
  await replan(tx, now);
}
async function editable(tx: Tx, id: string, version: number) {
  const message = await tx.emailQueue.findUnique({ where: { id } });
  if (!message || message.deletedAt)
    throw new EmailError("Message introuvable", 404);
  if (message.version !== version)
    throw new EmailError("Le message a changé. Rechargez la page.", 409);
  if (
    message.status === "sent" ||
    message.status === "sending" ||
    message.status === "suppressed" ||
    message.reviewRequired
  )
    throw new EmailError(
      "Ce message ne peut pas être modifié dans cet état",
      409,
    );
  return message;
}
export async function approveDrafts(
  tx: Tx,
  selected: { id: string; version: number }[],
  actorId: string,
  now = new Date(),
) {
  if (!selected.length || selected.length > 100)
    throw new EmailError("Sélectionnez entre 1 et 100 brouillons");
  for (const { id, version } of selected) {
    const message = await editable(tx, id, version);
    if (message.status !== "draft")
      throw new EmailError("Seuls les brouillons peuvent être approuvés", 409);
    if (
      await tx.emailSuppression.findUnique({
        where: { recipientKey: message.recipientKey },
      })
    )
      throw new EmailError("Destinataire exclu");
    await tx.emailQueue.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: now,
        approvedBy: actorId,
        approvalMode: deliveryMode(),
        notBefore: new Date(now.getTime() + 5 * 60000),
        version: { increment: 1 },
      },
    });
    await audit(tx, actorId, id, "DRAFT_APPROVED");
  }
  await replan(tx, now);
}
export async function changeSettings(
  tx: Tx,
  raw: unknown,
  revision: number,
  actorId: string,
  now = new Date(),
) {
  const parsed = settingsSchema.parse(raw);
  const current = await getSettings(tx);
  if (current.revision !== revision)
    throw new EmailError("Les paramètres ont changé. Rechargez la page.", 409);
  await tx.emailSettings.update({
    where: { id: current.id },
    data: {
      ...parsed,
      resumeAfter: new Date(now.getTime() + parsed.intervalMinutes * 60000),
      revision: { increment: 1 },
    },
  });
  await audit(
    tx,
    actorId,
    "settings",
    parsed.enabled ? "SETTINGS_SAVED_ACTIVE" : "SETTINGS_SAVED_PAUSED",
  );
  await replan(tx, now);
}
export async function reschedule(
  tx: Tx,
  id: string,
  version: number,
  at: Date,
  actorId: string,
  now = new Date(),
) {
  const message = await editable(tx, id, version);
  if (!["approved", "scheduled"].includes(message.status))
    throw new EmailError("Validez d'abord le brouillon");
  if (!Number.isFinite(at.getTime()) || at.getTime() < now.getTime() + 60000)
    throw new EmailError("Choisissez une date future");
  await tx.emailQueue.update({
    where: { id },
    data: { notBefore: at, version: { increment: 1 } },
  });
  await audit(tx, actorId, id, "EMAIL_RESCHEDULED");
  await replan(tx, now);
}
export async function cancelEmail(
  tx: Tx,
  id: string,
  version: number,
  actorId: string,
  remove = false,
  now = new Date(),
) {
  const message = await tx.emailQueue.findUnique({ where: { id } });
  if (!message || message.deletedAt)
    throw new EmailError("Message introuvable", 404);
  if (message.version !== version || message.status === "sending")
    throw new EmailError("Message modifié ou en cours d'envoi", 409);
  const scrub = remove
    ? {
        companyName: "Supprimé",
        recipient: "",
        subject: "Supprimé",
        body: "",
        personalization: null,
        companyUrl: null,
        mockupUrl: null,
        prospectId: null,
        deletedAt: now,
      }
    : {};
  await tx.emailQueue.update({
    where: { id },
    data: {
      ...scrub,
      ...(!["sent", "suppressed"].includes(message.status)
        ? { status: "cancelled" as const }
        : {}),
      scheduledAt: null,
      version: { increment: 1 },
    },
  });
  await audit(
    tx,
    actorId,
    id,
    remove ? "EMAIL_CONTENT_REMOVED" : "EMAIL_CANCELLED",
  );
  await replan(tx, now);
}
export async function suppressRecipient(
  tx: Tx,
  email: string,
  reason: "opposition" | "reply" | "manual",
  actorId: string | null,
  now = new Date(),
) {
  const key = recipientKey(email);
  await suppressKey(tx, key, maskEmail(email), reason, actorId, now);
}
export async function suppressKey(
  tx: Tx,
  key: string,
  maskedEmail: string,
  reason: string,
  actorId: string | null,
  now = new Date(),
) {
  await tx.emailSuppression.upsert({
    where: { recipientKey: key },
    create: { recipientKey: key, maskedEmail, reason, actorId },
    update: {},
  });
  await tx.emailQueue.updateMany({
    where: { recipientKey: key, status: { notIn: ["sent", "sending"] } },
    data: {
      status: "suppressed",
      scheduledAt: null,
      version: { increment: 1 },
    },
  });
  await audit(tx, actorId, key, `RECIPIENT_SUPPRESSED_${reason.toUpperCase()}`);
  await replan(tx, now);
}
export async function reconcile(
  tx: Tx,
  id: string,
  version: number,
  accepted: boolean,
  actorId: string,
  now = new Date(),
) {
  const message = await tx.emailQueue.findUnique({ where: { id } });
  if (
    !message ||
    message.version !== version ||
    message.status !== "failed" ||
    !message.reviewRequired
  )
    throw new EmailError("Message non concerné", 409);
  // User explicitly checked the provider's logs; never automatic for ambiguous attempts.
  await tx.emailQueue.update({
    where: { id },
    data: accepted
      ? {
          status: "sent",
          sentAt: now,
          reviewRequired: false,
          version: { increment: 1 },
        }
      : {
          status: "draft",
          approvedAt: null,
          approvedBy: null,
          approvalMode: null,
          reviewRequired: false,
          retryAt: null,
          version: { increment: 1 },
        },
  });
  await audit(
    tx,
    actorId,
    id,
    accepted
      ? "PROVIDER_ACCEPTANCE_CONFIRMED_MANUALLY"
      : "PROVIDER_NON_ACCEPTANCE_CONFIRMED_MANUALLY",
  );
  await replan(tx, now);
}
