import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, calculateLineTotal, calculateMrr, resolveInvoiceStatus } from "@/lib/financial";

describe("financial calculations", () => {
  it("calculates HT, TVA and TTC", () => {
    expect(calculateLineTotal({ quantity: 2, unitPrice: 100, taxRate: 20 })).toEqual({ subtotal: 200, tax: 40, total: 240 });
  });

  it("calculates document totals", () => {
    expect(calculateDocumentTotals([{ quantity: 1, unitPrice: 800, taxRate: 20 }, { quantity: 12, unitPrice: 50, taxRate: 20 }])).toEqual({ subtotal: 1400, tax: 280, total: 1680 });
  });

  it("resolves partial and full payment invoice statuses", () => {
    expect(resolveInvoiceStatus(1200, 600, new Date("2099-01-01"))).toBe("PARTIALLY_PAID");
    expect(resolveInvoiceStatus(1200, 1200, new Date("2099-01-01"))).toBe("PAID");
  });

  it("detects overdue invoices", () => {
    expect(resolveInvoiceStatus(1200, 0, new Date("2020-01-01"), new Date("2020-01-02"))).toBe("OVERDUE");
  });

  it("calculates MRR", () => {
    expect(calculateMrr([{ amount: 50, interval: "MONTHLY", status: "ACTIVE" }, { amount: 1200, interval: "YEARLY", status: "ACTIVE" }, { amount: 100, interval: "MONTHLY", status: "CANCELLED" }])).toBe(150);
  });
});
