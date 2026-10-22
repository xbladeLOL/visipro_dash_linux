import { randomUUID } from "node:crypto";
import { type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailTransaction, getSettings, replan, type Tx } from "./store";
import { getProvider, type EmailProvider, type SendResult } from "./provider";
import { deliveryMode } from "./validation";
import { nextSlot } from "./schedule";

const LEASE_MS = 5 * 60000;
export async function recoverStale(tx: Tx, now: Date) {
  const stale = await tx.emailSendAttempt.findMany({
    where: {
      outcome: "pending",
      startedAt: { lt: new Date(now.getTime() - LEASE_MS) },
    },
  });
  for (const attempt of stale) {
    await tx.emailSendAttempt.update({
      where: { id: attempt.id },
      data: {
        outcome: "uncertain",
        finishedAt: now,
        detail:
          "Worker interrompu : vérifier les journaux du fournisseur avant toute reprise",
      },
    });
    await tx.emailQueue.update({
      where: { id: attempt.emailId },
      data: {
        status: "failed",
        reviewRequired: true,
        scheduledAt: null,
        version: { increment: 1 },
      },
    });
  }
}
export async function dispatchOne(
  provider: EmailProvider,
  now = new Date(),
  db: PrismaClient = prisma,
  workerId = randomUUID(),
) {
  const reservation = await emailTransaction(async (tx) => {
    await recoverStale(tx, now);
    const settings = await getSettings(tx);
    await tx.emailSettings.update({
      where: { id: settings.id },
      data: { workerHeartbeat: now },
    });
    if (!settings.enabled || settings.resumeAfter > now) return null;
    // One globally in-flight attempt, even if several workers run concurrently.
    if (await tx.emailSendAttempt.findFirst({ where: { outcome: "pending" } }))
      return null;
    const retryable = await tx.emailQueue.findMany({
      where: {
        status: "failed",
        reviewRequired: false,
        retryAt: { lte: now },
        retryCount: { lt: 3 },
        approvedAt: { not: null },
        deletedAt: null,
      },
    });
    for (const message of retryable)
      await tx.emailQueue.update({
        where: { id: message.id },
        data: { status: "approved" },
      });
    await replan(tx, now);
    const message = await tx.emailQueue.findFirst({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    });
    if (!message) return null;
    if (
      await tx.emailSuppression.findUnique({
        where: { recipientKey: message.recipientKey },
      })
    )
      return null;
    const history = await tx.emailSendAttempt.findMany({
      where: { startedAt: { gte: new Date(now.getTime() - 3 * 86400000) } },
    });
    const last = await tx.emailSendAttempt.findFirst({
      orderBy: { startedAt: "desc" },
    });
    const lastAt = last
      ? new Date(
          Math.max(last.startedAt.getTime(), last.finishedAt?.getTime() ?? 0),
        )
      : null;
    if (
      nextSlot(
        settings,
        new Date(Math.floor(now.getTime() / 60000) * 60000),
        lastAt,
        history.map((attempt) => attempt.startedAt),
      ) > now
    )
      return null;
    if (provider.mode !== deliveryMode())
      throw new Error("Mode du worker différent de la configuration");
    const attempt = await tx.emailSendAttempt.create({
      data: {
        emailId: message.id,
        mode: provider.mode,
        workerId,
        settingsRevision: settings.revision,
        startedAt: now,
      },
    });
    await tx.emailQueue.update({
      where: { id: message.id },
      data: {
        status: "sending",
        simulated: provider.mode === "simulation",
        scheduledAt: null,
        version: { increment: 1 },
      },
    });
    return { message, attempt };
  }, db);
  if (!reservation) return false;
  // Dispatch boundary: a pause/exclusion committed later cannot recall an already-started request.
  let result: SendResult;
  try {
    result = await provider.send(reservation.message, reservation.attempt.id);
  } catch {
    result = {
      outcome: "uncertain",
      detail: "Résultat inconnu : contrôle manuel requis",
    };
  }
  // Preserve injected clocks in tests. Real execution measures completion for conservative cooldown.
  const finish = db === prisma ? new Date() : now;
  await emailTransaction(async (tx) => {
    const attempt = await tx.emailSendAttempt.findUniqueOrThrow({
      where: { id: reservation.attempt.id },
    });
    // A stale worker may return late after being marked uncertain; never overwrite a manual reconciliation.
    if (attempt.outcome !== "pending") return;
    const message = await tx.emailQueue.findUniqueOrThrow({
      where: { id: reservation.message.id },
    });
    const settings = await getSettings(tx);
    const accepted =
      result.outcome === "accepted" || result.outcome === "simulated";
    const temporary = result.outcome === "temporary_failure";
    const excluded = await tx.emailSuppression.findUnique({
      where: { recipientKey: message.recipientKey },
    });
    const retryCount = message.retryCount + (temporary ? 1 : 0);
    await tx.emailSendAttempt.update({
      where: { id: attempt.id },
      data: {
        outcome: result.outcome,
        finishedAt: finish,
        providerMessageId: result.messageId?.slice(0, 500),
        providerCode: result.code?.slice(0, 20),
        detail: result.detail.slice(0, 1000),
      },
    });
    await tx.emailQueue.update({
      where: { id: message.id },
      data: {
        status: accepted
          ? "sent"
          : result.outcome === "uncertain"
            ? "failed"
            : excluded
              ? "suppressed"
              : "failed",
        sentAt: accepted ? finish : null,
        simulated: provider.mode === "simulation",
        reviewRequired: result.outcome === "uncertain",
        retryCount,
        retryAt:
          temporary && retryCount < 3
            ? new Date(
                finish.getTime() +
                  Math.max(settings.intervalMinutes, 15 * 2 ** retryCount) *
                    60000,
              )
            : null,
        version: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        entityType: "Email",
        entityId: message.id,
        action: `EMAIL_${result.outcome.toUpperCase()}`,
      },
    });
    await replan(tx, finish);
  }, db);
  return true;
}
export async function workerTick() {
  return dispatchOne(getProvider());
}
export async function purgeExpired(tx: Tx, now = new Date()) {
  const settings = await getSettings(tx);
  const cutoff = new Date(now.getTime() - settings.retentionDays * 86400000);
  // No automatic removal: explicit admin action only, limited to finished/cancelled content.
  return tx.emailQueue.updateMany({
    where: {
      status: { in: ["sent", "cancelled", "suppressed", "failed"] },
      reviewRequired: false,
      updatedAt: { lt: cutoff },
      deletedAt: null,
    },
    data: {
      recipient: "",
      companyName: "Contenu expiré",
      subject: "Contenu expiré",
      body: "",
      personalization: null,
      companyUrl: null,
      mockupUrl: null,
      prospectId: null,
      deletedAt: now,
    },
  });
}
