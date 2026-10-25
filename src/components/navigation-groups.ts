import { BarChart3, BriefcaseBusiness, Building2, FileText, Gauge, Landmark, ListTodo, Radar, Settings, Users } from "lucide-react";

export const groups = [
  { label: "Pilotage", items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge }, { href: "/analytics", label: "Statistiques", icon: BarChart3 }, { href: "/today", label: "Aujourd'hui", icon: ListTodo }] },
  { label: "Commercial", items: [{ href: "/commercial/prospects", label: "Prospects", icon: Users }, { href: "/commercial/detection", label: "Détection", icon: Radar }, { href: "/commercial/clients", label: "Clients", icon: Building2 }, { href: "/commercial/emails", label: "E-mails", icon: FileText }, { href: "/pricing", label: "Grilles tarifaires", icon: FileText }] },
  { label: "Production", items: [{ href: "/projects", label: "Projets", icon: BriefcaseBusiness }, { href: "/tasks", label: "Tâches", icon: ListTodo }] },
  { label: "Ventes", items: [{ href: "/sales/quotes", label: "Devis", icon: FileText }, { href: "/sales/invoices", label: "Factures", icon: FileText }, { href: "/sales/payments", label: "Paiements", icon: Landmark }, { href: "/sales/subscriptions", label: "Abonnements", icon: Landmark }] },
  { label: "Comptabilité", items: [{ href: "/accounting/transactions", label: "Transactions", icon: Landmark }, { href: "/accounting/expenses", label: "Dépenses", icon: FileText }, { href: "/accounting/recurring-expenses", label: "Dépenses récurrentes", icon: FileText }, { href: "/accounting/cash-flow", label: "Trésorerie", icon: BarChart3 }, { href: "/accounting/result", label: "Résultat", icon: BarChart3 }, { href: "/accounting/vat", label: "TVA", icon: BarChart3 }] },
  { label: "Système", items: [{ href: "/documents", label: "Documents", icon: FileText }, { href: "/settings/company", label: "Paramètres", icon: Settings }] }
];
