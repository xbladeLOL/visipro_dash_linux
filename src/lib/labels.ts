import { Priority, ProjectStatus, ProspectStage, TaskStatus } from "@prisma/client";

export const prospectStageLabels: Record<ProspectStage, string> = {
  NEW: "Nouveau",
  TO_ANALYZE: "À analyser",
  TO_CONTACT: "À contacter",
  CONTACTED: "Contacté",
  TO_FOLLOW_UP: "À relancer",
  REPLIED: "Réponse obtenue",
  MEETING: "Rendez-vous",
  QUOTE_TO_PREPARE: "Devis à préparer",
  QUOTE_SENT: "Devis envoyé",
  NEGOTIATION: "Négociation",
  WON: "Gagné",
  LOST: "Perdu"
};

export function formatProspectStage(stage: ProspectStage) {
  return prospectStageLabels[stage];
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  TO_PREPARE: "À préparer",
  WAITING_CLIENT: "En attente client",
  IN_PROGRESS: "En cours",
  REVIEW: "En validation",
  READY_TO_DELIVER: "Prêt à livrer",
  DELIVERED: "Livré",
  ARCHIVED: "Archivé"
};

export function formatProjectStatus(status: ProjectStatus) {
  return projectStatusLabels[status];
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  WAITING: "En attente",
  DONE: "Terminée",
  CANCELLED: "Annulée"
};

export function formatTaskStatus(status: TaskStatus) {
  return taskStatusLabels[status];
}

export const priorityLabels: Record<Priority, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente"
};

export function formatPriority(priority: Priority) {
  return priorityLabels[priority];
}
