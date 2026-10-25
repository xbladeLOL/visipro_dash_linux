import { describe, expect, it } from "vitest";
import {
  normalizeUnsubscribeFeedback,
  unsubscribeFeedbackReasonLabel,
} from "../../src/lib/email/unsubscribe-feedback";

describe("unsubscribe feedback", () => {
  it("accepts a known reason and normalizes the optional comment", () => {
    expect(normalizeUnsubscribeFeedback("ALREADY_HAS_WEBSITE", "  Déjà équipé  ")).toEqual({
      reasonCode: "ALREADY_HAS_WEBSITE",
      comment: "Déjà équipé",
    });
  });

  it("stores an empty comment as null", () => {
    expect(normalizeUnsubscribeFeedback("NO_NEED", "   ").comment).toBeNull();
  });

  it("accepts the additional selectable reasons", () => {
    for (const reason of [
      "ALREADY_HAS_PROVIDER",
      "HANDLED_INTERNALLY",
      "NOT_RELEVANT",
      "ALREADY_CUSTOMER",
      "WRONG_CONTACT",
      "BUSINESS_CLOSED",
      "TOO_MANY_SOLICITATIONS",
    ]) {
      expect(normalizeUnsubscribeFeedback(reason, "").reasonCode).toBe(reason);
    }
  });

  it("requires a selected reason even when a comment is provided", () => {
    expect(() => normalizeUnsubscribeFeedback("", "")).toThrow("invalide");
    expect(() => normalizeUnsubscribeFeedback("", "Une précision")).toThrow("invalide");
  });

  it("rejects an unknown reason and an oversized comment", () => {
    expect(() => normalizeUnsubscribeFeedback("UNKNOWN", "")).toThrow("invalide");
    expect(() => normalizeUnsubscribeFeedback("OTHER", "x".repeat(501))).toThrow("500");
  });

  it("provides a safe label for historical unknown values", () => {
    expect(unsubscribeFeedbackReasonLabel("UNKNOWN")).toBe("Autre raison");
  });
});
