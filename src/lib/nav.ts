import { BarChart3, BriefcaseBusiness, Building2, FileText, Gauge, Landmark, ListTodo, Settings, Users } from "lucide-react";

export const navGroups = [
  { label: "Pilotage", items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge }, { href: "/today", label: "Aujourd'hui", icon: ListTodo }] },
  { label: "Commercial", items: [{ href: "/commercial/prospects", label: "Prospects", icon: Users }, { href: "/commercial/clients", label: "Clients", icon: Building2 }, { href: "/pricing", label: "Grilles tarifaires", icon: FileText }] },
  { label: "Production", items: [{ href: "/projects", label: "Projets", icon: BriefcaseBusiness }, { href: "/tasks", label: "Tâches", icon: ListTodo }] },
  { label: "Ventes", items: [{ href: "/sales/quotes", label: "Devis", icon: FileText }, { href: "/sales/invoices", label: "Factures", icon: FileText }, { href: "/sales/payments", label: "Paiements", icon: Landmark }, { href: "/sales/subscriptions", label: "Abonnements", icon: Landmark }] },
  { label: "Comptabilité", items: [{ href: "/accounting/transactions", label: "Transactions", icon: Landmark }, { href: "/accounting/expenses", label: "Dépenses", icon: FileText }, { href: "/accounting/recurring-expenses", label: "Dépenses récurrentes", icon: FileText }, { href: "/accounting/cash-flow", label: "Trésorerie", icon: BarChart3 }, { href: "/accounting/result", label: "Résultat", icon: BarChart3 }, { href: "/accounting/vat", label: "TVA", icon: BarChart3 }] },
  { label: "Système", items: [{ href: "/analytics", label: "Statistiques", icon: BarChart3 }, { href: "/documents", label: "Documents", icon: FileText }, { href: "/settings/company", label: "Paramètres", icon: Settings }] }
];

export const quickActions = [
  { href: "/commercial/prospects/new", label: "Nouveau prospect", description: "Créer une opportunité CRM" },
  { href: "/commercial/clients/new", label: "Nouveau client", description: "Créer une fiche client" },
  { href: "/projects/new", label: "Nouveau projet", description: "Lancer une production" },
  { href: "/tasks/new", label: "Nouvelle tâche", description: "Créer une action à suivre" },
  { href: "/sales/quotes/new", label: "Nouveau devis", description: "Chiffrer une prestation" },
  { href: "/sales/invoices/new", label: "Nouvelle facture", description: "Créer une facture brouillon" },
  { href: "/sales/subscriptions", label: "Nouvel abonnement", description: "Ajouter du MRR" },
  { href: "/sales/payments", label: "Nouveau paiement", description: "Enregistrer un règlement" },
  { href: "/accounting/expenses", label: "Nouvelle dépense", description: "Ajouter un achat" },
  { href: "/accounting/recurring-expenses", label: "Dépense récurrente", description: "Ajouter un débit mensuel" },
  { href: "/documents/new", label: "Nouveau document", description: "Référencer un fichier" }
];
