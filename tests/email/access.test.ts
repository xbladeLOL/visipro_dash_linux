import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));
import { requireEmailUser } from "@/lib/email/access";
describe("email permissions", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects anonymous access", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireEmailUser()).rejects.toThrow("Authentification");
  });
  it("does not trust a stale session role", async () => {
    mocks.auth.mockResolvedValue({
      user: { email: "member@example.test", role: "OWNER" },
    });
    mocks.findUnique.mockResolvedValue({ id: "member", role: "MEMBER" });
    await expect(requireEmailUser()).rejects.toThrow("administrateur");
  });
  it("accepts the current database admin role", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "owner@example.test" } });
    mocks.findUnique.mockResolvedValue({ id: "owner", role: "OWNER" });
    expect((await requireEmailUser()).id).toBe("owner");
  });
});
