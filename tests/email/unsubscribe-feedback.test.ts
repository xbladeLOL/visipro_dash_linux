import { describe, expect, it } from "vitest";
import {
  normalizeUnsubscribeFeedback,
  normalizeOptionalUnsubscribeFeedback,
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

  it("allows a confirmation without feedback", () => {
    expect(normalizeOptionalUnsubscribeFeedback("", "")).toBeNull();
  });

  it("keeps a comment without a selected reason as an other reason", () => {
    expect(normalizeOptionalUnsubscribeFeedback("", "Une précision")).toEqual({
      reasonCode: "OTHER",
      comment: "Une précision",
    });
  });

  it("rejects an unknown reason and an oversized comment", () => {
    expect(() => normalizeUnsubscribeFeedback("UNKNOWN", "")).toThrow("invalide");
    expect(() => normalizeUnsubscribeFeedback("OTHER", "x".repeat(501))).toThrow("500");
  });

  it("provides a safe label for historical unknown values", () => {
    expect(unsubscribeFeedbackReasonLabel("UNKNOWN")).toBe("Autre raison");
  });
});
