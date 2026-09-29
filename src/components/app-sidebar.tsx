import Link from "next/link";
import Image from "next/image";
import { BarChart3, BriefcaseBusiness, Building2, FileText, Gauge, Landmark, ListTodo, Radar, Settings, Users } from "lucide-react";

const groups = [
  { label: "Pilotage", items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge }, { href: "/today", label: "Aujourd'hui", icon: ListTodo }] },
  { label: "Commercial", items: [{ href: "/commercial/prospects", label: "Prospects", icon: Users }, { href: "/commercial/detection", label: "Détection", icon: Radar }, { href: "/commercial/clients", label: "Clients", icon: Building2 }, { href: "/pricing", label: "Grilles tarifaires", icon: FileText }] },
  { label: "Production", items: [{ href: "/projects", label: "Projets", icon: BriefcaseBusiness }, { href: "/tasks", label: "Tâches", icon: ListTodo }] },
  { label: "Ventes", items: [{ href: "/sales/quotes", label: "Devis", icon: FileText }, { href: "/sales/invoices", label: "Factures", icon: FileText }, { href: "/sales/payments", label: "Paiements", icon: Landmark }, { href: "/sales/subscriptions", label: "Abonnements", icon: Landmark }] },
  { label: "Comptabilité", items: [{ href: "/accounting/transactions", label: "Transactions", icon: Landmark }, { href: "/accounting/expenses", label: "Dépenses", icon: FileText }, { href: "/accounting/recurring-expenses", label: "Dépenses récurrentes", icon: FileText }, { href: "/accounting/cash-flow", label: "Trésorerie", icon: BarChart3 }, { href: "/accounting/result", label: "Résultat", icon: BarChart3 }, { href: "/accounting/vat", label: "TVA", icon: BarChart3 }] },
  { label: "Système", items: [{ href: "/analytics", label: "Statistiques", icon: BarChart3 }, { href: "/documents", label: "Documents", icon: FileText }, { href: "/settings/company", label: "Paramètres", icon: Settings }] }
];

export function AppSidebar() {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r bg-card/70 p-4 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-xl px-2 py-3">
        <Image src="/visipro-logo.svg" alt="VisiPro" width={40} height={40} className="rounded-xl" priority />
        <div>
          <div className="font-semibold">VisiPro</div>
          <div className="text-xs text-muted-foreground">Business Control Center</div>
        </div>
      </Link>
      <nav className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
