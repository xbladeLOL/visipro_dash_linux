import nodemailer from "visipro-smtp";
import { renderProspectingEmail } from "./content";
import { z } from "zod";
import { deliveryMode, EmailError, tokenFor } from "./validation";

export type Outgoing = {
  id: string;
  recipientKey: string;
  recipient: string;
  subject: string;
  body: string;
  mockupUrl?: string | null;
};
export type SendResult = {
  outcome:
    | "accepted"
    | "simulated"
    | "temporary_failure"
    | "permanent_failure"
    | "uncertain";
  messageId?: string;
  code?: string;
  detail: string;
};
export interface EmailProvider {
  mode: "simulation" | "smtp";
  send(message: Outgoing, attemptId: string): Promise<SendResult>;
}
export function smtpResult(error: unknown): SendResult {
  const code =
    typeof error === "object" && error && "responseCode" in error
      ? Number(error.responseCode)
      : 0;
  if (code >= 400 && code < 500)
    return {
      outcome: "temporary_failure",
      code: String(code),
      detail: "Refus temporaire explicite du serveur SMTP",
    };
  if (code >= 500 && code < 600)
    return {
      outcome: "permanent_failure",
      code: String(code),
      detail: "Refus définitif explicite du serveur SMTP",
    };
  return {
    outcome: "uncertain",
    detail:
      "Résultat réseau incertain. Vérification auprès du fournisseur obligatoire avant toute nouvelle tentative.",
  };
}
export function getProvider(): EmailProvider {
  if (deliveryMode() === "simulation")
    return {
      mode: "simulation",
      async send(message, attemptId) {
        return {
          outcome: "simulated",
          messageId: `simulation:${message.id}:${attemptId}`,
          detail:
            "Simulation locale : aucun fournisseur contacté, aucun e-mail envoyé",
        };
      },
    };
  if (process.env.EMAIL_REAL_SEND_ENABLED !== "true")
    throw new EmailError(
      "Envoi réel verrouillé par EMAIL_REAL_SEND_ENABLED",
      503,
    );
  const from = z.string().email().parse(process.env.EMAIL_FROM);
  const replyTo = z.string().email().parse(process.env.EMAIL_REPLY_TO);
  const host = z.string().min(1).parse(process.env.SMTP_HOST);
  const user = z.string().min(1).parse(process.env.SMTP_USER);
  const pass = z.string().min(1).parse(process.env.SMTP_PASSWORD);
  const port = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .parse(process.env.SMTP_PORT ?? 587);
  const base = new URL(process.env.EMAIL_PUBLIC_URL ?? "");
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new EmailError(
      "EMAIL_PUBLIC_URL doit être une URL HTTPS publique sans identifiants",
      503,
    );
  const identity = z
    .string()
    .trim()
    .min(5)
    .max(500)
    .refine((value) => !/[\r\n]/.test(value))
    .parse(process.env.EMAIL_SENDER_IDENTITY);
  tokenFor("configuration-check", "configuration-check");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    mode: "smtp",
    async send(message, attemptId) {
      const unsubscribe = new URL(
        `/email-unsubscribe/${tokenFor(message.id, message.recipientKey)}`,
        base,
      ).toString();
      const {html,text} = renderProspectingEmail(message,{identity,unsubscribeUrl:unsubscribe});
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const sending = transport.sendMail({
          from: { name: "VisiPro", address: from },
          to: { address: message.recipient, name: "" },
          replyTo,
          subject: message.subject,
          text,
          html,
          messageId: `<${attemptId}@${from.split("@")[1]}>`,
          headers: { "List-Unsubscribe": `<${unsubscribe}>` },
        });
        const result = await Promise.race([
          sending,
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => {
              transport.close();
              reject(new Error("Dispatch deadline exceeded"));
            }, 60000);
          }),
        ]);
        if (!result.accepted.length)
          return {
            outcome: "permanent_failure",
            detail: "Aucun destinataire accepté par le fournisseur",
          };
        return {
          outcome: "accepted",
          messageId: result.messageId,
          code: /^\d{3}/.exec(result.response ?? "")?.[0],
          detail:
            "Accepté par le serveur SMTP ; livraison en boîte de réception non confirmée",
        };
      } catch (error) {
        return smtpResult(error);
      } finally {
        if (deadline) clearTimeout(deadline);
        transport.close();
      }
    },
  };
}
