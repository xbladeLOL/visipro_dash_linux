import { describe, expect, it } from "vitest";
import {
  inWindow,
  localParts,
  nextSlot,
  parseLocalDate,
} from "@/lib/email/schedule";
import { draftSchema, settingsSchema } from "@/lib/email/validation";
import { getProvider, smtpResult } from "@/lib/email/provider";
const config = {
  intervalMinutes: 300,
  dailyLimit: 2,
  startMinute: 540,
  endMinute: 1080,
  weekdays: [1, 2, 3, 4, 5],
  timezone: "Europe/Paris",
  resumeAfter: new Date("2026-01-01Z"),
};
describe("email schedule and safe provider", () => {
  it("allows midnight and the last minute with all-day settings, preserving weekdays", () => {
    const allDay = { ...config, startMinute: 0, endMinute: 1440 };
    expect(inWindow(new Date("2026-10-21T22:00Z"), allDay)).toBe(true);
    expect(inWindow(new Date("2026-10-22T21:59Z"), allDay)).toBe(true);
    expect(inWindow(new Date("2026-10-23T22:00Z"), allDay)).toBe(false);
    expect(nextSlot(allDay, new Date("2026-10-22T21:59Z"), null, []))
      .toEqual(new Date("2026-10-22T21:59Z"));
  });
  it("keeps the elapsed interval and local daily quota across midnight in all-day mode", () => {
    const allDay = { ...config, startMinute: 0, endMinute: 1440 };
    const used = [new Date("2026-10-22T12:00Z"), new Date("2026-10-22T17:00Z")];
    expect(nextSlot(allDay, new Date("2026-10-22T18:00Z"), used[1], used))
      .toEqual(new Date("2026-10-22T22:00Z"));
    expect(nextSlot(allDay, new Date("2026-10-22T21:00Z"), new Date("2026-10-22T20:00Z"), []))
      .toEqual(new Date("2026-10-23T01:00Z"));
  });
  it("enforces five elapsed hours", () => {
    expect(
      nextSlot(
        config,
        new Date("2026-10-22T08:00Z"),
        new Date("2026-10-22T07:00Z"),
        [],
      ),
    ).toEqual(new Date("2026-10-22T12:00Z"));
  });
  it("moves past evenings and weekends", () => {
    expect(nextSlot(config, new Date("2026-10-23T17:00Z"), null, [])).toEqual(
      new Date("2026-10-26T08:00Z"),
    );
    expect(inWindow(new Date("2026-10-22T16:00Z"), config)).toBe(false);
  });
  it("counts the daily quota in the configured timezone", () => {
    const used = [new Date("2026-10-22T07:00Z"), new Date("2026-10-22T12:00Z")];
    expect(
      nextSlot(config, new Date("2026-10-22T13:00Z"), used[1], used),
    ).toEqual(new Date("2026-10-23T07:00Z"));
  });
  it("handles DST and rejects ambiguous/nonexistent local input", () => {
    expect(
      localParts(new Date("2026-10-26T08:00Z"), config.timezone).minute,
    ).toBe(540);
    expect(() => parseLocalDate("2026-10-25T02:30", config.timezone)).toThrow(
      "ambiguë",
    );
    expect(() => parseLocalDate("2026-03-29T02:30", config.timezone)).toThrow(
      "inexistante",
    );
    expect(parseLocalDate("2026-10-26T09:00", config.timezone)).toEqual(
      new Date("2026-10-26T08:00Z"),
    );
  });
  it("respects the resume guard", () => {
    expect(
      nextSlot(
        { ...config, resumeAfter: new Date("2026-10-22T12:00Z") },
        new Date("2026-10-22T07:00Z"),
        null,
        [],
      ),
    ).toEqual(new Date("2026-10-22T12:00Z"));
  });
  it("rejects header injection, unknown approval fields and non-web URLs", () => {
    const draft = {
      idempotencyKey: "draft:001",
      companyName: "Entreprise",
      recipient: "pro@example.test",
      subject: "Votre présence en ligne",
      body: "Bonjour, voici notre proposition.",
    };
    expect(
      draftSchema.parse({ ...draft, recipient: "Pro@Example.test" }).recipient,
    ).toBe("pro@example.test");
    expect(
      draftSchema.safeParse({
        ...draft,
        subject: "Bonjour\r\nBcc: other@example.test",
      }).success,
    ).toBe(false);
    expect(
      draftSchema.safeParse({ ...draft, status: "approved" }).success,
    ).toBe(false);
    expect(
      draftSchema.safeParse({ ...draft, companyUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
  it("rejects unusable settings", () => {
    const settings = {
      enabled: false,
      intervalMinutes: 300,
      dailyLimit: 2,
      startMinute: 540,
      endMinute: 1080,
      weekdays: [1],
      timezone: "Europe/Paris",
      retentionDays: 90,
    };
    expect(
      settingsSchema.safeParse({ ...settings, weekdays: [] }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...settings, endMinute: 500 }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...settings, timezone: "Unknown/Zone" })
        .success,
    ).toBe(false);
  });
  it("never retries ambiguous network results automatically", () => {
    expect(smtpResult(new Error("timeout secret"))).toEqual({
      outcome: "uncertain",
      detail: expect.not.stringContaining("secret"),
    });
    expect(smtpResult({ responseCode: 451 }).outcome).toBe("temporary_failure");
    expect(smtpResult({ responseCode: 550 }).outcome).toBe("permanent_failure");
  });
  it("simulation never needs network credentials", async () => {
    const before = process.env.EMAIL_DELIVERY_MODE;
    process.env.EMAIL_DELIVERY_MODE = "simulation";
    try {
      const result = await getProvider().send(
        {
          id: "1",
          recipientKey: "key",
          recipient: "nobody@example.test",
          subject: "Test",
          body: "Test local",
        },
        "attempt",
      );
      expect(result.outcome).toBe("simulated");
    } finally {
      process.env.EMAIL_DELIVERY_MODE = before;
    }
  });
  it("locks real sending without the explicit environment gate", () => {
    const before = process.env.EMAIL_DELIVERY_MODE;
    process.env.EMAIL_DELIVERY_MODE = "smtp";
    try {
      expect(() => getProvider()).toThrow("verrouillé");
    } finally {
      process.env.EMAIL_DELIVERY_MODE = before;
    }
  });
});
