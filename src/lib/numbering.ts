export function buildDocumentNumber(prefix: string, count: number, date = new Date()) {
  return `${prefix}-${date.getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}
