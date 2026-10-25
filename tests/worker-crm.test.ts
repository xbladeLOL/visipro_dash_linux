import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { handle } from "@/lib/worker-crm";

const key = "test-worker-key-".repeat(3);
let now = 1_000_000;
function setup() {
  const db = {
    prospect: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "new-prospect", stage: "TO_CONTACT" }) },
    emailSuppression: { findUnique: vi.fn().mockResolvedValue(null) },
    emailQueue: { findMany: vi.fn().mockResolvedValue([]) },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(callback => callback(db));
  return { db, deps: { db: db as unknown as PrismaClient, key, recipientKey: (email: string) => `test:${email}`, now: () => (now += 60001) } };
}
const identity = { action: "lookup", siren: "123456789", email: "Pro@example.test", website: "https://example.test" };
const create = { ...identity, action: "create", companyName: "Entreprise", sources: ["https://example.test"], mockupUrl: "https://test-mockup.pages.dev/" };
const request = (data: unknown, token = key) => new Request("https://example.test/api/worker-crm", {
  method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(data),
});
describe("worker CRM validation and typed database access", () => {
  it("requires a configured key and authenticates before database access", async () => {
    const { db, deps } = setup();
    expect((await handle(request(identity), { ...deps, key: undefined })).status).toBe(503);
    expect((await handle(request(identity, "wrong"), deps)).status).toBe(401);
    expect(db.prospect.findMany).not.toHaveBeenCalled();
  });
  it("answers health without database writes", async () => {
    const { db, deps } = setup();
    expect((await handle(request({ action: "health" }), deps)).status).toBe(200);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects non-object JSON and malformed fields without throwing", async () => {
    const { db, deps } = setup();
    for (const input of [null, [], 123, { ...identity, website: "javascript:alert(1)" }, { ...create, phone: 123 }, { ...create, sources: [12] }]) {
      expect((await handle(request(input), deps)).status).toBe(400);
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("looks up prospects and reports recipient suppression", async () => {
    const { db, deps } = setup();
    db.prospect.findMany.mockResolvedValue([{ id: "existing", companyName: "Entreprise", email: "pro@example.test", website: null, stage: "NEW", notes: null }]);
    db.emailSuppression.findUnique.mockResolvedValue({ recipientKey: "test:pro@example.test" });
    const response = await handle(request(identity), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matches: [{ id: "existing" }], suppressionChecked: true, suppressed: true });
    expect(db.prospect.create).not.toHaveBeenCalled();
  });
  it("blocks creation for excluded recipients", async () => {
    const { db, deps } = setup();
    db.emailSuppression.findUnique.mockResolvedValue({ recipientKey: "test:pro@example.test" });
    expect((await handle(request(create), deps)).status).toBe(409);
    expect(db.prospect.create).not.toHaveBeenCalled();
  });
  it("creates only a TO_CONTACT prospect under the transaction lock", async () => {
    const { db, deps } = setup();
    expect((await handle(request(create), deps)).status).toBe(201);
    expect(db.$executeRaw).toHaveBeenCalledOnce();
    expect(db.prospect.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stage: "TO_CONTACT", email: "pro@example.test" }) }));
  });
});
