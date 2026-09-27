"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { navGroups } from "@/lib/nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="-ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-foreground/40"
          />
          <div
            ref={panelRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[19rem] max-w-[86vw] flex-col overflow-y-auto overscroll-contain border-r bg-card shadow-soft outline-none"
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1">
                <Image src="/visipro-logo.svg" alt="VisiPro" width={36} height={36} className="rounded-xl" priority />
                <div className="min-w-0">
                  <div className="truncate font-semibold">VisiPro</div>
                  <div className="truncate text-xs text-muted-foreground">Business Control Center</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-6 px-4 py-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                            active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-xs text-muted-foreground">
              <Link href="/commercial/prospects/new" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 font-medium text-foreground hover:bg-muted">
                + Nouveau prospect
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
