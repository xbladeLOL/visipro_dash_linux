export type TaxLineInput = {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate?: number;
};

export type Totals = {
  subtotal: number;
  tax: number;
  total: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineTotal(line: TaxLineInput): Totals {
  const discount = line.discountRate ?? 0;
  const subtotal = roundMoney(line.quantity * line.unitPrice * (1 - discount / 100));
  const tax = roundMoney(subtotal * (line.taxRate / 100));
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
}

export function calculateDocumentTotals(lines: TaxLineInput[]): Totals {
  return lines.reduce<Totals>(
    (acc, line) => {
      const total = calculateLineTotal(line);
      return {
        subtotal: roundMoney(acc.subtotal + total.subtotal),
        tax: roundMoney(acc.tax + total.tax),
        total: roundMoney(acc.total + total.total)
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );
}

export function resolveInvoiceStatus(total: number, paid: number, dueDate: Date, now = new Date()) {
  if (paid <= 0 && dueDate < now) return "OVERDUE" as const;
  if (paid <= 0) return "SENT" as const;
  if (paid < total) return "PARTIALLY_PAID" as const;
  return "PAID" as const;
}

export function calculateMrr(subscriptions: Array<{ amount: number; interval: "MONTHLY" | "YEARLY"; status: string }>) {
  return roundMoney(
    subscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .reduce((sum, subscription) => sum + (subscription.interval === "YEARLY" ? subscription.amount / 12 : subscription.amount), 0)
  );
}
