import type { EmailStatus } from "@prisma/client";
export const statusLabels: Record<EmailStatus, string> = {
  draft: "À valider",
  approved: "Approuvé · en pause",
  scheduled: "Programmé",
  sending: "Transmission en cours",
  sent: "Accepté par le fournisseur",
  failed: "Échec",
  cancelled: "Annulé",
  suppressed: "Exclu",
};
export function dateLabel(value: Date | null, timezone: string) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", {
        timeZone: timezone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(value)
    : "—";
}
