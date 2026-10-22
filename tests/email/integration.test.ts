import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  approveDrafts,
  cancelEmail,
  changeSettings,
  editDraft,
  emailTransaction,
  insertDraft,
  reconcile,
  reschedule,
  suppressRecipient,
} from "@/lib/email/store";
import { dispatchOne, purgeExpired, recoverStale } from "@/lib/email/worker";
import { tokenFor } from "@/lib/email/validation";
import { unsubscribe } from "@/lib/email/unsubscribe";
import { POST } from "@/app/api/email-drafts/route";
import type { EmailProvider, SendResult } from "@/lib/email/provider";
const suite = process.env.EMAIL_TEST_DATABASE ? describe : describe.skip;
const now = new Date("2030-01-07T08:00:21Z"); // Monday 09:00 Paris; non-zero seconds checks worker polling.
const hours = (n: number) => new Date(now.getTime() + n * 3600000);
const settingsInput = {
  enabled: true,
  intervalMinutes: 300,
  dailyLimit: 2,
  startMinute: 540,
  endMinute: 1080,
  weekdays: [1, 2, 3, 4, 5],
  timezone: "Europe/Paris",
  retentionDays: 90,
};
const input = (suffix = "a") => ({
  idempotencyKey: `test-draft:${suffix}`,
  companyName: `Entreprise ${suffix}`,
  recipient: `${suffix}@example.test`,
  subject: "Votre présence en ligne",
  body: "Bonjour, voici une proposition personnalisée VisiPro.",
});
suite("email integration on isolated PostgreSQL", () => {
  let db: PrismaClient;
  let second: PrismaClient;
  let actor: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !process.env.EMAIL_TEST_DATABASE?.startsWith("visipro_email_test_") ||
      url.pathname !== `/${process.env.EMAIL_TEST_DATABASE}` ||
      url.hostname !== "127.0.0.1" ||
      url.port !== "15439"
    )
      throw new Error("Refusing to mutate any non-test database");
    db = new PrismaClient();
    second = new PrismaClient();
    actor = (
      await db.user.create({
        data: { email: "email-test-owner@example.test", role: "OWNER" },
      })
    ).id;
  });
  beforeEach(async () => {
    // This database was created by this test run; only synthetic fixtures are removed.
    await db.emailSendAttempt.deleteMany();
    await db.emailQueue.deleteMany();
    await db.emailSuppression.deleteMany();
    await db.emailSettings.deleteMany();
    await db.emailApiRateLimit.deleteMany();
    await db.auditLog.deleteMany();
    await db.emailSettings.create({
      data: {
        id: "singleton",
        ...settingsInput,
        resumeAfter: new Date("2030-01-01T00:00Z"),
      },
    });
  });
  afterAll(async () => {
    await Promise.all([
      db?.$disconnect(),
      second?.$disconnect(),
      prisma.$disconnect(),
    ]);
  });
  async function draft(suffix = "a") {
    const result = await emailTransaction(
      (tx) => insertDraft(tx, input(suffix)),
      db,
    );
    return db.emailQueue.findUniqueOrThrow({ where: { id: result.id } });
  }
  async function ready(suffix = "a") {
    const message = await draft(suffix);
    await emailTransaction(
      (tx) =>
        approveDrafts(
          tx,
          [{ id: message.id, version: message.version }],
          actor,
          hours(-1),
        ),
      db,
    );
    return db.emailQueue.findUniqueOrThrow({ where: { id: message.id } });
  }
  function provider(
    outcome: SendResult["outcome"] = "simulated",
  ): EmailProvider & { send: ReturnType<typeof vi.fn> } {
    return {
      mode: "simulation",
      send: vi.fn(async () => ({
        outcome,
        detail: "Simulated fixture result",
      })),
    };
  }
  it("imports an idempotent draft, rejects recipient duplicates and changed replay payloads", async () => {
    const a = await draft();
    expect(a.status).toBe("draft");
    expect(
      (await emailTransaction((tx) => insertDraft(tx, input()), db)).duplicate,
    ).toBe(true);
    await expect(
      emailTransaction(
        (tx) => insertDraft(tx, { ...input(), subject: "Changed content" }),
        db,
      ),
    ).rejects.toThrow("idempotence");
    await expect(
      emailTransaction(
        (tx) =>
          insertDraft(tx, { ...input(), idempotencyKey: "different:key" }),
        db,
      ),
    ).rejects.toThrow("existe déjà");
    expect(await db.emailQueue.count()).toBe(1);
  });
  it("edits reset approval and obsolete versions cannot approve", async () => {
    const message = await ready();
    const { idempotencyKey: _key, ...fields } = input();
    void _key;
    await emailTransaction(
      (tx) =>
        editDraft(
          tx,
          message.id,
          message.version,
          { ...fields, subject: "Objet corrigé" },
          actor,
          now,
        ),
      db,
    );
    const updated = await db.emailQueue.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(updated.status).toBe("draft");
    expect(updated.approvedAt).toBeNull();
    expect(updated.scheduledAt).toBeNull();
    await expect(
      emailTransaction(
        (tx) =>
          approveDrafts(
            tx,
            [{ id: message.id, version: message.version }],
            actor,
            now,
          ),
        db,
      ),
    ).rejects.toThrow("a changé");
  });
  it("approves one or several drafts atomically and honours a manual lower bound", async () => {
    const a = await draft("a");
    const b = await draft("b");
    await emailTransaction(
      (tx) =>
        approveDrafts(
          tx,
          [a, b].map((x) => ({ id: x.id, version: x.version })),
          actor,
          hours(-1),
        ),
      db,
    );
    const rows = await db.emailQueue.findMany({
      orderBy: { scheduledAt: "asc" },
    });
    expect(rows.every((x) => x.status === "scheduled")).toBe(true);
    expect(
      rows[1].scheduledAt!.getTime() - rows[0].scheduledAt!.getTime(),
    ).toBeGreaterThanOrEqual(300 * 60000);
    const first = rows[0];
    await emailTransaction(
      (tx) => reschedule(tx, first.id, first.version, hours(24), actor, now),
      db,
    );
    expect(
      (
        await db.emailQueue.findUniqueOrThrow({ where: { id: first.id } })
      ).scheduledAt!.getTime(),
    ).toBeGreaterThanOrEqual(hours(24).getTime());
    const c = await draft("c");
    await expect(
      emailTransaction(
        (tx) =>
          approveDrafts(
            tx,
            [
              { id: c.id, version: c.version },
              { id: "missing", version: 1 },
            ],
            actor,
            now,
          ),
        db,
      ),
    ).rejects.toThrow();
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: c.id } })).status,
    ).toBe("draft");
  });
  it("enforces the 5-hour interval and daily quota across worker restarts", async () => {
    await ready("a");
    await ready("b");
    await ready("c");
    const mock = provider();
    expect(await dispatchOne(mock, now, db)).toBe(true);
    await db.$disconnect(); // Reconnected on next query: state persists in PostgreSQL.
    expect(await dispatchOne(mock, hours(4.9), db)).toBe(false);
    expect(await dispatchOne(mock, hours(5.02), second)).toBe(true);
    expect(await dispatchOne(mock, hours(7), db)).toBe(false);
    expect(mock.send).toHaveBeenCalledTimes(2);
    expect(await db.emailSendAttempt.count()).toBe(2);
  });
  it("does not send evenings/weekends, then resumes on a permitted day", async () => {
    await ready();
    const mock = provider();
    expect(await dispatchOne(mock, new Date("2030-01-11T18:00Z"), db)).toBe(
      false,
    );
    expect(await dispatchOne(mock, new Date("2030-01-12T09:00Z"), db)).toBe(
      false,
    );
    expect(await dispatchOne(mock, new Date("2030-01-14T08:00:21Z"), db)).toBe(
      true,
    );
  });
  it("pauses and recalculates deadlines without an unexpected immediate send", async () => {
    await ready();
    let s = await db.emailSettings.findUniqueOrThrow({
      where: { id: "singleton" },
    });
    await emailTransaction(
      (tx) =>
        changeSettings(
          tx,
          { ...settingsInput, enabled: false },
          s.revision,
          actor,
          now,
        ),
      db,
    );
    const mock = provider();
    expect(await dispatchOne(mock, now, db)).toBe(false);
    s = await db.emailSettings.findUniqueOrThrow({
      where: { id: "singleton" },
    });
    await emailTransaction(
      (tx) => changeSettings(tx, settingsInput, s.revision, actor, now),
      db,
    );
    expect(await dispatchOne(mock, now, db)).toBe(false);
    expect(await dispatchOne(mock, hours(5.02), db)).toBe(true);
  });
  it("retries only explicit temporary refusals, after cooldown, with a finite limit", async () => {
    const message = await ready();
    const mock = provider("temporary_failure");
    await dispatchOne(mock, now, db);
    let failed = await db.emailQueue.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(failed.status).toBe("failed");
    expect(failed.scheduledAt).not.toBeNull();
    expect(failed.reviewRequired).toBe(false);
    expect(await dispatchOne(mock, hours(1), db)).toBe(false);
    await dispatchOne(mock, hours(5.02), db);
    await dispatchOne(mock, hours(24.02), db);
    failed = await db.emailQueue.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(failed.retryCount).toBe(3);
    expect(failed.retryAt).toBeNull();
    expect(await dispatchOne(mock, hours(48), db)).toBe(false);
    expect(mock.send).toHaveBeenCalledTimes(3);
  });
  it("never retries an ambiguous response without explicit manual reconciliation", async () => {
    const message = await ready();
    const mock = provider("uncertain");
    await dispatchOne(mock, now, db);
    let row = await db.emailQueue.findUniqueOrThrow({
      where: { id: message.id },
    });
    expect(row.reviewRequired).toBe(true);
    expect(await dispatchOne(mock, hours(24), db)).toBe(false);
    await emailTransaction(
      (tx) => reconcile(tx, row.id, row.version, false, actor, hours(24)),
      db,
    );
    row = await db.emailQueue.findUniqueOrThrow({ where: { id: row.id } });
    expect(row.status).toBe("draft");
    expect(row.approvedAt).toBeNull();
  });
  it("recovers interrupted sending as uncertain, never as pending work", async () => {
    const message = await ready();
    await db.emailQueue.update({
      where: { id: message.id },
      data: { status: "sending" },
    });
    await db.emailSendAttempt.create({
      data: {
        emailId: message.id,
        mode: "simulation",
        workerId: "dead-worker",
        settingsRevision: 1,
        startedAt: hours(-1),
      },
    });
    await emailTransaction((tx) => recoverStale(tx, now), db);
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: message.id } }))
        .reviewRequired,
    ).toBe(true);
    expect((await db.emailSendAttempt.findFirstOrThrow()).outcome).toBe(
      "uncertain",
    );
    expect(await dispatchOne(provider(), hours(24), db)).toBe(false);
  });
  it("exclusions, replies and signed opposition links block dispatch and future imports", async () => {
    const a = await ready("a");
    await emailTransaction(
      (tx) => suppressRecipient(tx, a.recipient, "reply", actor, now),
      db,
    );
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("suppressed");
    const b = await ready("b");
    await unsubscribe(tokenFor(b.id, b.recipientKey));
    await expect(unsubscribe(`${b.id}.${"0".repeat(64)}`)).rejects.toThrow(
      "invalide",
    );
    expect(await dispatchOne(provider(), now, db)).toBe(false);
    await expect(
      emailTransaction(
        (tx) =>
          insertDraft(tx, { ...input("b"), idempotencyKey: "another:import" }),
        db,
      ),
    ).rejects.toThrow("exclu");
  });
  it("two independent workers cannot dispatch the same or another message concurrently", async () => {
    await ready("a");
    await ready("b");
    const mock = provider();
    const results = await Promise.all([
      dispatchOne(mock, now, db),
      dispatchOne(mock, now, second),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(await db.emailSendAttempt.count()).toBe(1);
  });
  it("a settings change during transmission stops subsequent starts", async () => {
    await ready("a");
    await ready("b");
    let release!: (result: SendResult) => void;
    let signal!: () => void;
    const started = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const mock: EmailProvider = {
      mode: "simulation",
      send: vi.fn(() => {
        signal();
        return new Promise<SendResult>((resolve) => {
          release = resolve;
        });
      }),
    };
    const dispatch = dispatchOne(mock, now, db);
    await started;
    const current = await db.emailSettings.findUniqueOrThrow({
      where: { id: "singleton" },
    });
    await emailTransaction(
      (tx) =>
        changeSettings(
          tx,
          { ...settingsInput, enabled: false },
          current.revision,
          actor,
          now,
        ),
      second,
    );
    expect(await dispatchOne(mock, now, second)).toBe(false);
    release({ outcome: "simulated", detail: "Completed in-flight simulation" });
    await dispatch;
    expect(await dispatchOne(mock, hours(24), db)).toBe(false);
  });
  it("cancels/deletes content but preserves duplicate prevention and attempt history", async () => {
    const message = await ready();
    await dispatchOne(provider(), now, db);
    const sent = await db.emailQueue.findUniqueOrThrow({
      where: { id: message.id },
    });
    await emailTransaction(
      (tx) => cancelEmail(tx, sent.id, sent.version, actor, true, now),
      db,
    );
    const deleted = await db.emailQueue.findUniqueOrThrow({
      where: { id: sent.id },
    });
    expect(deleted.body).toBe("");
    expect(deleted.recipient).toBe("");
    expect(await db.emailSendAttempt.count()).toBe(1);
    await expect(
      emailTransaction(
        (tx) =>
          insertDraft(tx, { ...input(), idempotencyKey: "new:duplicate" }),
        db,
      ),
    ).rejects.toThrow("existe déjà");
  });
  it("the API only imports drafts, enforces bearer auth and strict fields", async () => {
    const request = (data: unknown, key = process.env.EMAIL_IMPORT_API_KEY) =>
      new Request("http://localhost/api/email-drafts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(data),
      });
    expect((await POST(request(input(), "bad-key"))).status).toBe(401);
    expect(
      (await POST(request({ ...input(), status: "approved" }))).status,
    ).toBe(400);
    expect((await POST(request(input()))).status).toBe(201);
    expect((await POST(request(input()))).status).toBe(200);
    expect((await db.emailQueue.findFirstOrThrow()).status).toBe("draft");
    expect(
      (await POST(request({ ...input(), body: "x".repeat(60000) }))).status,
    ).toBe(413);
  });
  it("rate limits persist across requests and include rejected field validation", async () => {
    for (let i = 0; i < 60; i++) {
      const request = new Request("http://localhost/api/email-drafts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.EMAIL_IMPORT_API_KEY}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      expect((await POST(request)).status).toBe(400);
    }
    const response = await POST(
      new Request("http://localhost/api/email-drafts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.EMAIL_IMPORT_API_KEY}`,
        },
        body: JSON.stringify(input()),
      }),
    );
    expect(response.status).toBe(429);
  });
  it("requires fresh approval when switching from simulation to SMTP", async () => {
    const message = await ready();
    process.env.EMAIL_DELIVERY_MODE = "smtp";
    try {
      const { replan } = await import("@/lib/email/store");
      await emailTransaction((tx) => replan(tx, now), db);
      const row = await db.emailQueue.findUniqueOrThrow({
        where: { id: message.id },
      });
      expect(row.status).toBe("draft");
      expect(row.approvedAt).toBeNull();
    } finally {
      process.env.EMAIL_DELIVERY_MODE = "simulation";
    }
  });
  it("rejects a stale settings revision", async () => {
    await emailTransaction(
      (tx) => changeSettings(tx, settingsInput, 1, actor, now),
      db,
    );
    await expect(
      emailTransaction(
        (tx) =>
          changeSettings(
            tx,
            { ...settingsInput, dailyLimit: 100 },
            1,
            actor,
            now,
          ),
        db,
      ),
    ).rejects.toThrow("paramètres ont changé");
    expect(
      (await db.emailSettings.findUniqueOrThrow({ where: { id: "singleton" } }))
        .dailyLimit,
    ).toBe(2);
  });
  it("retention only scrubs expired terminal content; pending drafts survive", async () => {
    const a = await draft("a");
    const b = await draft("b");
    await db.emailQueue.update({
      where: { id: a.id },
      data: { status: "cancelled", updatedAt: new Date("2020-01-01Z") },
    });
    await emailTransaction((tx) => purgeExpired(tx, now), db);
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: a.id } }))
        .deletedAt,
    ).not.toBeNull();
    expect(
      (await db.emailQueue.findUniqueOrThrow({ where: { id: b.id } })).body,
    ).not.toBe("");
  });
});
