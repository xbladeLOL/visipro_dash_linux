import { emailTransaction, suppressKey } from "./store";
import { constantEqual, EmailError, maskEmail, tokenFor } from "./validation";
import {
  normalizeOptionalUnsubscribeFeedback,
  normalizeUnsubscribeFeedback,
} from "./unsubscribe-feedback";
export async function findUnsubscribe(tx: import("./store").Tx, token: string) {
  if (!/^[a-z0-9]{20,40}\.[a-f0-9]{64}$/.test(token))
    throw new EmailError("Lien invalide", 404);
  const message = await tx.emailQueue.findUnique({
    where: { id: token.split(".")[0] },
  });
  if (
    !message ||
    !constantEqual(token, tokenFor(message.id, message.recipientKey))
  )
    throw new EmailError("Lien invalide", 404);
  return message;
}
export async function unsubscribe(token: string) {
  await emailTransaction(async (tx) => {
    const message = await findUnsubscribe(tx, token);
    await suppressKey(
      tx,
      message.recipientKey,
      message.recipient ? maskEmail(message.recipient) : "Adresse masquée",
      "opposition",
      null,
    );
  });
}

export async function unsubscribeWithFeedback(
  token: string,
  reasonCode: unknown,
  comment: unknown,
) {
  const feedback = normalizeOptionalUnsubscribeFeedback(reasonCode, comment);
  await emailTransaction(async (tx) => {
    const message = await findUnsubscribe(tx, token);
    await suppressKey(
      tx,
      message.recipientKey,
      message.recipient ? maskEmail(message.recipient) : "Adresse masquée",
      "opposition",
      null,
    );
    if (feedback) {
      await tx.emailUnsubscribeFeedback.createMany({
        data: [{ recipientKey: message.recipientKey, ...feedback }],
        skipDuplicates: true,
      });
    }
  });
}

export async function saveUnsubscribeFeedback(
  token: string,
  reasonCode: unknown,
  comment: unknown,
) {
  const feedback = normalizeUnsubscribeFeedback(reasonCode, comment);
  await emailTransaction(async (tx) => {
    const message = await findUnsubscribe(tx, token);
    const suppression = await tx.emailSuppression.findUnique({
      where: { recipientKey: message.recipientKey },
      select: { recipientKey: true },
    });
    if (!suppression)
      throw new EmailError("L'opposition doit être enregistrée avant le questionnaire", 409);
    await tx.emailUnsubscribeFeedback.createMany({
      data: [{ recipientKey: message.recipientKey, ...feedback }],
      skipDuplicates: true,
    });
  });
}
