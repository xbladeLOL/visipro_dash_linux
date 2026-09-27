import Link from "next/link";
import Image from "next/image";
import { navGroups } from "@/lib/nav";

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
        {navGroups.map((group) => (
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
