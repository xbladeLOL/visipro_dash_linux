import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { prisma } from "../src/lib/prisma";
import {
  AdminCreationError,
  createAdminAccount,
} from "../src/lib/admin-account";

async function question(label: string) {
  const reader = createInterface({ input: stdin, output: stdout });
  try {
    return await reader.question(label);
  } finally {
    reader.close();
  }
}
function secretQuestion(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(stdin.isRaw);
    let secret = "";
    function cleanup() {
      stdin.removeListener("keypress", onKey);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
    }
    function onKey(
      value: string | undefined,
      key: { name?: string; ctrl?: boolean; meta?: boolean; sequence?: string },
    ) {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new AdminCreationError("Opération annulée."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(secret);
        return;
      }
      if (key.name === "backspace") {
        secret = Array.from(secret).slice(0, -1).join("");
        return;
      }
      if (key.ctrl || key.meta || key.sequence?.startsWith("\x1b")) return;
      if (
        value &&
        !/[\x00-\x1f\x7f]/.test(value) &&
        Buffer.byteLength(secret, "utf8") < 1024
      )
        secret += value;
    }
    stdout.write(label);
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.on("keypress", onKey);
    stdin.resume();
  });
}
async function main() {
  if (!stdin.isTTY || !stdout.isTTY || process.argv.length > 2)
    throw new AdminCreationError(
      "Exécutez npm run admin:create dans un terminal interactif, sans argument ni mot de passe dans la commande.",
    );
  if (!process.env.DATABASE_URL)
    throw new AdminCreationError(
      "DATABASE_URL est absent. Lancez la commande depuis le dossier du dashboard contenant son fichier .env.",
    );
  console.info(
    "Création d'un administrateur VisiPro. Les données métier et les comptes existants sont conservés.",
  );
  const email = await question("Adresse e-mail de connexion : ");
  const name =
    (await question("Nom affiché [Administrateur VisiPro] : ")).trim() ||
    "Administrateur VisiPro";
  const password = await secretQuestion(
    "Mot de passe (12 caractères minimum, saisie masquée) : ",
  );
  const confirmation = await secretQuestion("Confirmez le mot de passe : ");
  if (password !== confirmation)
    throw new AdminCreationError(
      "Les mots de passe ne correspondent pas. Aucun compte créé.",
    );
  const user = await createAdminAccount(prisma, { email, name, password });
  console.info(`Compte administrateur créé : ${user.email}`);
  console.info(
    "Connectez-vous avec cette adresse et le mot de passe choisi. Aucun redémarrage ni seed n'est nécessaire. Les données existantes restent accessibles.",
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof AdminCreationError
        ? error.message
        : "Impossible de créer le compte. Vérifiez la configuration du dashboard et la disponibilité de PostgreSQL.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
