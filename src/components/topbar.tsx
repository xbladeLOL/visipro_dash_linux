"use client";

import Link from "next/link";
import { Bell, Moon, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MobileNavigation } from "@/components/mobile-navigation";
import { groups } from "@/components/navigation-groups";
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
  const createRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const title = groups.flatMap(group => group.items).find(item => pathname === item.href || pathname.startsWith(item.href + "/"))?.label ?? "VisiPro";
  useEffect(() => { setIsCreateOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isCreateOpen) return;
    const outside = (event: PointerEvent) => {
      if (!createRef.current?.contains(event.target as Node)) setIsCreateOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
        createRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isCreateOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between gap-2 border-b bg-background px-3 sm:px-4 lg:px-8">
      <MobileNavigation />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">{title}</span>
      <button className="hidden min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm text-muted-foreground lg:flex lg:max-w-xl">
        <Search className="h-4 w-4" />
        Recherche globale
        <span className="ml-auto hidden rounded-md border px-2 py-0.5 text-xs md:inline">Ctrl K</span>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-4">
        <Button className="hidden sm:inline-flex" variant="ghost" aria-label="Notifications"><Bell className="h-4 w-4" /></Button>
        <Button className="h-11 w-11 px-0" variant="ghost" aria-label="Changer le thème" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Moon className="h-4 w-4" /></Button>
        <div className="relative" ref={createRef}>
          <Button className="h-11 px-3" type="button" aria-expanded={isCreateOpen} aria-controls="quick-create" onClick={() => setIsCreateOpen((open) => !open)}>+ Nouveau</Button>
          {isCreateOpen ? (
            <div id="quick-create" className="absolute right-0 mt-2 max-h-[min(70dvh,36rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-2 shadow-soft">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block min-h-12 rounded-xl px-3 py-3 text-sm hover:bg-muted"
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
