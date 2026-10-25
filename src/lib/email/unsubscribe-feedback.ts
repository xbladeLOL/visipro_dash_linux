import { EmailError } from "./validation";

export const unsubscribeFeedbackReasons = [
  { value: "ALREADY_HAS_WEBSITE", label: "J'ai déjà un site web" },
  { value: "ALREADY_HAS_PROVIDER", label: "Je travaille déjà avec un autre prestataire" },
  { value: "HANDLED_INTERNALLY", label: "Je gère déjà ce besoin en interne" },
  { value: "NO_NEED", label: "Je n'ai pas besoin de ce service" },
  { value: "NOT_RELEVANT", label: "L'offre ne correspond pas à mon activité" },
  { value: "NOT_A_PRIORITY", label: "Ce n'est pas une priorité pour le moment" },
  { value: "BUDGET", label: "Le budget ne correspond pas" },
  { value: "ALREADY_CUSTOMER", label: "Je suis déjà client de VisiPro" },
  { value: "NOT_DECISION_MAKER", label: "Je ne suis pas la bonne personne" },
  { value: "WRONG_CONTACT", label: "Cette adresse ou ce contact n'est pas le bon" },
  { value: "BUSINESS_CLOSED", label: "L'entreprise a cessé son activité" },
  { value: "TOO_MANY_SOLICITATIONS", label: "Je reçois trop de sollicitations" },
  { value: "OTHER", label: "Autre raison" },
] as const;

export type UnsubscribeFeedbackReason =
  (typeof unsubscribeFeedbackReasons)[number]["value"];

const reasonLabels = new Map<string, string>(
  unsubscribeFeedbackReasons.map((reason) => [reason.value, reason.label]),
);

export function unsubscribeFeedbackReasonLabel(reasonCode: string) {
  return reasonLabels.get(reasonCode) ?? "Autre raison";
}

export function normalizeUnsubscribeFeedback(reasonCode: unknown, comment: unknown) {
  const normalizedReason = String(reasonCode ?? "");
  if (!reasonLabels.has(normalizedReason))
    throw new EmailError("Motif de desinscription invalide", 400);
  const normalizedComment = String(comment ?? "").trim();
  if (normalizedComment.length > 500)
    throw new EmailError("Le commentaire est limite a 500 caracteres", 400);
  return {
    reasonCode: normalizedReason,
    comment: normalizedComment || null,
  };
}
