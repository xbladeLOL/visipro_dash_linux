"use client";

import Link from "next/link";
import { Bell, Moon, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const quickActions = [
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

export function Topbar() {
  const { setTheme, theme } = useTheme();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-8">
      <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm text-muted-foreground md:max-w-xl">
        <Search className="h-4 w-4" />
        Recherche globale
        <span className="ml-auto hidden rounded-md border px-2 py-0.5 text-xs md:inline">Ctrl K</span>
      </button>
      <div className="ml-4 flex items-center gap-2">
        <Button variant="ghost" aria-label="Notifications"><Bell className="h-4 w-4" /></Button>
        <Button variant="ghost" aria-label="Dark mode" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Moon className="h-4 w-4" /></Button>
        <div className="relative">
          <Button type="button" onClick={() => setIsCreateOpen((open) => !open)}>+ Nouveau</Button>
          {isCreateOpen ? (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border bg-card p-2 shadow-soft">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsCreateOpen(false)}
                >
                  <span className="font-medium">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
