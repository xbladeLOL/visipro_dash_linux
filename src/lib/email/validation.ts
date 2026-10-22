import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[\r\n\x00-\x1f\x7f]/.test(value),
      "Une seule ligne est autorisée",
    );
const webUrl = z
  .string()
  .url()
  .max(2048)
  .refine(
    (value) => ["https:", "http:"].includes(new URL(value).protocol),
    "URL HTTP(S) requise",
  )
  .optional();
export const draftSchema = z
  .object({
    idempotencyKey: z
      .string()
      .min(8)
      .max(128)
      .regex(/^[a-zA-Z0-9_.:-]+$/),
    companyName: singleLine(200),
    recipient: z
      .string()
      .trim()
      .min(3)
      .max(254)
      .email()
      .refine((value) => !/[\r\n\x00-\x1f\x7f]/.test(value))
      .transform((value) => value.toLowerCase()),
    subject: singleLine(300),
    body: z
      .string()
      .trim()
      .min(10)
      .max(30000)
      .refine((value) => !value.includes("\0")),
    companyUrl: webUrl,
    mockupUrl: webUrl,
    personalization: z.string().trim().max(5000).optional(),
    prospectId: z.string().cuid().optional(),
  })
  .strict();
export type DraftInput = z.infer<typeof draftSchema>;

export const settingsSchema = z
  .object({
    enabled: z.boolean(),
    intervalMinutes: z.number().int().min(1).max(10080),
    dailyLimit: z.number().int().min(1).max(100),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .transform((value) => [...new Set(value)]),
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("fr", { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }, "Fuseau horaire invalide"),
    retentionDays: z.number().int().min(30).max(1095),
  })
  .strict()
  .refine(
    (value) => value.endMinute > value.startMinute,
    "La fin doit être après le début (pas de plage nocturne)",
  );

export class EmailError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function recipientKey(email: string) {
  const secret = process.env.EMAIL_RECIPIENT_HASH_SECRET;
  if (!secret || secret.length < 32)
    throw new EmailError(
      "EMAIL_RECIPIENT_HASH_SECRET doit contenir au moins 32 caractères",
      503,
    );
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
}
export function payloadHash(input: DraftInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
export function tokenFor(emailId: string, key: string) {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32)
    throw new EmailError(
      "EMAIL_UNSUBSCRIBE_SECRET doit contenir au moins 32 caractères",
      503,
    );
  return `${emailId}.${createHmac("sha256", secret).update(`${emailId}:${key}`).digest("hex")}`;
}
export function constantEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function deliveryMode(): "simulation" | "smtp" {
  const mode = process.env.EMAIL_DELIVERY_MODE ?? "simulation";
  if (mode !== "simulation" && mode !== "smtp")
    throw new EmailError("Mode d'envoi non reconnu", 503);
  return mode;
}
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}
