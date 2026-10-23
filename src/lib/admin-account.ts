import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";

const adminInput = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(100),
    password: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Le mot de passe dépasse 72 octets (limite bcrypt).",
      ),
  })
  .strict();

export class AdminCreationError extends Error {}
export async function createAdminAccount(db: PrismaClient, input: unknown) {
  const parsed = adminInput.safeParse(input);
  if (!parsed.success)
    throw new AdminCreationError(
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  const { email, name, password } = parsed.data;
  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing)
    throw new AdminCreationError(
      "Un compte utilise déjà cette adresse. Aucun compte ni mot de passe existant n'a été modifié.",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash, role: "ADMIN" },
        select: { id: true, email: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          entityType: "User",
          entityId: user.id,
          action: "ADMIN_CREATED_FROM_SERVER_CLI",
        },
      });
      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AdminCreationError(
        "Cette adresse existe déjà. Aucun compte existant n'a été modifié.",
      );
    // Never expose a database URL, query payload or password hash on terminal errors.
    throw new AdminCreationError(
      "Création impossible. Vérifiez DATABASE_URL, la connexion PostgreSQL et la présence des tables User et AuditLog. Aucune donnée métier n'a été modifiée.",
    );
  }
}
