import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmailError } from "./validation";
export async function requireEmailUser() {
  const session = await auth();
  if (!session?.user?.email)
    throw new EmailError("Authentification requise", 401);
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user || !["OWNER", "ADMIN"].includes(user.role))
    throw new EmailError(
      "Droits administrateur requis pour la prospection par e-mail",
      403,
    );
  return user;
}
