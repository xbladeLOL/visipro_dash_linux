import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main id="main-content" className="min-w-0 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:p-8">{children}</main>
      </div>
    </div>
  );
}
