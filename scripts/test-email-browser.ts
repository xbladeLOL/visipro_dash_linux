import { chromium, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { tokenFor } from "../src/lib/email/validation";
import { localParts } from "../src/lib/email/schedule";
const base = "http://127.0.0.1:15440";
const db = new PrismaClient();
const screenshotDir = path.resolve(".email-test-results");
const env = {
  ...process.env,
  PORT: "15440",
  AUTH_URL: base,
  NEXT_PUBLIC_APP_URL: base,
  AUTH_TRUST_HOST: "true",
  AUTH_SECRET: randomBytes(32).toString("hex"),
  EMAIL_DELIVERY_MODE: "simulation",
  EMAIL_REAL_SEND_ENABLED: "false",
};
let serverOutput = "";
let server: ChildProcess | undefined;
let worker: ChildProcess | undefined;
async function stop(child?: ChildProcess) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32")
    await new Promise<void>((resolve) => {
      const kill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      kill.on("exit", () => resolve());
      kill.on("error", () => resolve());
    });
  else {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 15000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
async function waitUntil(
  check: () => Promise<boolean>,
  message: string,
  milliseconds = 45000,
) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(message);
}
async function importDraft(suffix: string) {
  const response = await fetch(`${base}/api/email-drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.EMAIL_IMPORT_API_KEY}`,
    },
    body: JSON.stringify({
      idempotencyKey: `browser:${suffix}`,
      companyName: `Entreprise navigateur ${suffix}`,
      recipient: `browser-${suffix}@example.test`,
      subject: `Proposition ${suffix}`,
      body: "Bonjour, voici notre proposition personnalisée pour votre entreprise.",
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json()).id as string;
}
async function main() {
  if (
    !process.env.EMAIL_TEST_DATABASE?.startsWith("visipro_email_test_") ||
    new URL(process.env.DATABASE_URL!).pathname !==
      `/${process.env.EMAIL_TEST_DATABASE}`
  )
    throw new Error("Test database required");
  await mkdir(screenshotDir, { recursive: true });
  await db.emailSettings.update({
    where: { id: "singleton" },
    data: { enabled: false },
  });
  const password = randomBytes(18).toString("hex");
  await db.user.create({
    data: {
      email: "browser-owner@example.test",
      role: "OWNER",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      "15440",
    ],
    { env, windowsHide: true, stdio: "pipe" },
  );
  for (const stream of [server.stdout, server.stderr])
    stream?.on("data", (chunk) => {
      serverOutput = (serverOutput + chunk.toString()).slice(-16000);
    });
  await waitUntil(async () => {
    try {
      return (await fetch(`${base}/login`)).ok;
    } catch {
      return false;
    }
  }, "Next.js did not start");
  expect(
    (await fetch(`${base}/commercial/emails`, { redirect: "manual" })).status,
  ).toBe(307);
  expect(
    (await fetch(`${base}/api/email-drafts`, { method: "POST" })).status,
  ).toBe(401);
  const a = await importDraft("a");
  const b = await importDraft("b");
  const c = await importDraft("c");
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : "chromium",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1100 },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/login`);
    await page
      .locator('input[name="email"]')
      .fill("browser-owner@example.test");
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard");
    await page.goto(`${base}/commercial/emails/${a}`);
    await expect(
      page.getByRole("heading", { name: "Entreprise navigateur a" }),
    ).toBeVisible();
    await page
      .getByLabel("Objet", { exact: true })
      .fill("Objet corrigé dans le navigateur");
    await page
      .getByRole("button", { name: "Enregistrer comme brouillon" })
      .click();
    await page.waitForURL("**/commercial/emails?saved=1");
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: a } })).subject,
    ).toBe("Objet corrigé dans le navigateur");
    await page.goto(`${base}/commercial/emails/${a}`);
    await page.getByRole("button", { name: "Approuver ce brouillon" }).click();
    await page.waitForURL("**/commercial/emails?saved=1");
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: a } })).status,
    ).toBe("approved");
    await page
      .getByLabel("Valider Entreprise navigateur b", { exact: true })
      .check();
    await page
      .getByLabel("Valider Entreprise navigateur c", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Valider les brouillons cochés" })
      .click();
    await expect
      .poll(
        async () =>
          (await db.emailQueue.findUniqueOrThrow({ where: { id: b } })).status,
      )
      .toBe("approved");
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: c } })).status,
    ).toBe("approved");
    await page.goto(`${base}/commercial/emails/settings`);
    await page.getByLabel("Activer la programmation automatique").check();
    await page
      .getByRole("button", { name: "Enregistrer les paramètres" })
      .click();
    await page.waitForURL("**/commercial/emails/settings?saved=1");
    const settings = await db.emailSettings.findUniqueOrThrow({
      where: { id: "singleton" },
    });
    expect(settings.resumeAfter.getTime()).toBeGreaterThan(
      Date.now() + 299 * 60000,
    );
    await page.screenshot({
      path: path.join(screenshotDir, "email-settings.png"),
      fullPage: true,
    });
    // Shorten only synthetic deadlines; no real provider can be selected by this subprocess.
    const current = new Date();
    const p = localParts(current, settings.timezone);
    await db.emailSettings.update({
      where: { id: "singleton" },
      data: {
        resumeAfter: new Date(current.getTime() - 60000),
        startMinute: 0,
        endMinute: 1440,
        weekdays: [p.weekday],
      },
    });
    await db.emailQueue.updateMany({
      where: { id: { in: [a, b, c] } },
      data: { notBefore: new Date(current.getTime() - 60000) },
    });
    worker = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/email-worker.ts"],
      { env, windowsHide: true, stdio: "ignore" },
    );
    await waitUntil(
      async () =>
        (await db.emailQueue.findUniqueOrThrow({ where: { id: a } })).status ===
        "sent",
      "Worker did not simulate the approved message",
    );
    await stop(worker);
    worker = undefined;
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: a } })).simulated,
    ).toBe(true);
    expect(await db.emailSendAttempt.count({ where: { emailId: a } })).toBe(1);
    // Process restart cannot resend an accepted/simulated message or bypass cooldown.
    worker = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/email-worker.ts"],
      { env, windowsHide: true, stdio: "ignore" },
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await stop(worker);
    worker = undefined;
    expect(await db.emailSendAttempt.count({ where: { emailId: a } })).toBe(1);
    await page.goto(`${base}/commercial/emails/${a}`);
    await expect(
      page.getByText(
        "Simulation locale : aucun fournisseur contacté, aucun e-mail envoyé",
        { exact: true },
      ),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, "email-history.png"),
      fullPage: true,
    });
    await page.goto(`${base}/commercial/emails`);
    await expect(
      page.getByRole("heading", { name: "E-mails de prospection" }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotDir, "email-queue.png"),
      fullPage: true,
    });
    // Signed public link requires confirmation, works without session, and does not send mail.
    const row = await db.emailQueue.findUniqueOrThrow({ where: { id: b } });
    const token = tokenFor(row.id, row.recipientKey);
    const publicPage = await browser.newPage();
    await publicPage.goto(`${base}/email-unsubscribe/${token}`);
    expect(
      await db.emailSuppression.findUnique({
        where: { recipientKey: row.recipientKey },
      }),
    ).toBeNull();
    await publicPage
      .getByRole("button", { name: "Ne plus recevoir de sollicitations" })
      .click();
    await expect(
      publicPage.getByText("Votre opposition a été enregistrée.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await db.emailSuppression.findUnique({
        where: { recipientKey: row.recipientKey },
      }),
    ).not.toBeNull();
    await publicPage.close();
    expect(errors).toEqual([]);
    console.info(
      "Browser: login, API auth/import, edit, single/bulk approval, settings guard, real worker simulation/restart, history and public opposition passed.",
    );
  } finally {
    await browser.close();
    await writeFile(path.join(screenshotDir, "next-server.log"), serverOutput);
  }
}
main()
  .catch((error) => {
    console.error("Browser integration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stop(worker);
    await stop(server);
    await db.$disconnect();
    await writeFile(path.join(screenshotDir, "next-server.log"), serverOutput);
  });
