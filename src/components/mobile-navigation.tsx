"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gauge, Users, Mail, BriefcaseBusiness, Menu, X } from "lucide-react";
import { groups } from "./navigation-groups";

const shortcuts = [
  { href: "/dashboard", label: "Accueil", icon: Gauge },
  { href: "/commercial/prospects", label: "Prospects", icon: Users },
  { href: "/commercial/emails", label: "E-mails", icon: Mail },
  { href: "/projects", label: "Projets", icon: BriefcaseBusiness },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.body.style.overflow;
    if (open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (dialog.open) dialog.close();
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);

  return <>
    <button type="button" aria-label="Ouvrir le menu de navigation"
      aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-menu"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card lg:hidden"
      onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
    <dialog ref={dialogRef} id="mobile-menu" aria-labelledby="mobile-menu-title"
      onClose={() => setOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
      } }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(88vw,360px)] max-w-none border-r bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50 lg:hidden">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div><h2 id="mobile-menu-title" className="text-lg font-semibold">VisiPro</h2>
            <p className="text-xs text-muted-foreground">Toutes vos rubriques</p></div>
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <nav aria-label="Navigation mobile" className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {groups.map(group => <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="space-y-1">{group.items.map(item => <Link key={item.href} href={item.href}
              aria-current={active(item.href) ? "page" : undefined} onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground">
              <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />{item.label}
            </Link>)}</div>
          </div>)}
        </nav>
      </div>
    </dialog>
    <nav aria-label="Accès rapides" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {shortcuts.map(item => <Link key={item.href} href={item.href}
        aria-current={active(item.href) ? "page" : undefined}
        className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] text-muted-foreground aria-[current=page]:bg-muted aria-[current=page]:font-semibold aria-[current=page]:text-foreground">
        <item.icon aria-hidden="true" className="h-5 w-5" />{item.label}
      </Link>)}
      <button type="button" aria-label="Toutes les rubriques" aria-haspopup="dialog" aria-controls="mobile-menu" aria-expanded={open}
        onClick={() => setOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] text-muted-foreground">
        <Menu className="h-5 w-5" />Menu
      </button>
    </nav>
  </>;
}
