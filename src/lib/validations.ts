import { z } from "zod";
import { ProspectStage } from "@prisma/client";

export const moneySchema = z.coerce.number().min(0).max(1_000_000_000);

export const prospectSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  activity: z.string().optional(),
  potentialValue: moneySchema.default(0),
  stage: z.nativeEnum(ProspectStage),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextFollowUpAt: z.coerce.date().optional()
});

export const paymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: moneySchema,
  paidAt: z.coerce.date(),
  method: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional()
});

export const expenseSchema = z.object({
  date: z.coerce.date(),
  vendor: z.string().min(2),
  description: z.string().min(2),
  categoryId: z.string().optional(),
  amountExcludingTax: moneySchema,
  taxAmount: moneySchema.default(0),
  paymentMethod: z.string().min(1),
  notes: z.string().optional()
});
