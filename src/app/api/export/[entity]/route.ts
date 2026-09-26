import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CsvRow = Record<string, string>;

const exporters: Record<string, () => Promise<CsvRow[]>> = {
  clients: async () => (await prisma.client.findMany()).map((c) => ({ id: c.id, legalName: c.legalName, email: c.email ?? "", siret: c.siret ?? "" })),
  invoices: async () => (await prisma.invoice.findMany({ include: { client: true } })).map((i) => ({ number: i.number, client: i.client.legalName, total: i.total.toString(), status: String(i.status) })),
  expenses: async () => (await prisma.expense.findMany()).map((e) => ({ date: e.date.toISOString(), vendor: e.vendor, total: e.totalAmount.toString() })),
  transactions: async () => (await prisma.transaction.findMany()).map((t) => ({ date: t.date.toISOString(), type: String(t.type), amount: t.amount.toString(), reference: t.reference ?? "" }))
};

function isExportEntity(entity: string): entity is keyof typeof exporters {
  return entity in exporters;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { entity } = await params;
  if (!isExportEntity(entity)) return new Response("Not found", { status: 404 });
  const exporter = exporters[entity];
  const rows = await exporter();
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=${entity}.csv` } });
}
