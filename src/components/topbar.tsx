"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Moon, MoreHorizontal, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { quickActions } from "@/lib/nav";

function QuickActionList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          onClick={onNavigate}
          className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
        >
          <span className="font-medium">{action.label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span>
        </Link>
      ))}
    </>
  );
}

export function Topbar() {
  const { setTheme, theme } = useTheme();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMoreOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
        moreTriggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [isMoreOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:h-16 lg:px-8 lg:pt-0">
      <div className="flex w-full items-center gap-1 lg:hidden">
        <MobileNav />
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1">
          <Image src="/visipro-logo.svg" alt="VisiPro" width={32} height={32} className="rounded-lg" priority />
          <span className="truncate font-semibold">VisiPro</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Recherche globale"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="relative" ref={moreRef}>
            <button
              ref={moreTriggerRef}
              type="button"
              aria-label="Plus d'options"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen((open) => !open)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {isMoreOpen ? (
              <div className="absolute right-0 mt-2 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-2 shadow-soft">
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Bell className="h-4 w-4 shrink-0" />
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setIsMoreOpen(false);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Moon className="h-4 w-4 shrink-0" />
                  {theme === "dark" ? "Mode clair" : "Mode sombre"}
                </button>
                <div className="my-2 border-t" />
                <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Créer</div>
                <QuickActionList onNavigate={() => setIsMoreOpen(false)} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hidden w-full items-center lg:flex">
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
                <QuickActionList onNavigate={() => setIsCreateOpen(false)} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
