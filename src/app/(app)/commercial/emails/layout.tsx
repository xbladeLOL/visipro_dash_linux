import type { ReactNode } from "react";
import Link from "next/link";
import { requireEmailUser } from "@/lib/email/access";
export default async function EmailLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireEmailUser();
  return (
    <div className="space-y-6">
      <nav className="flex gap-5 text-sm">
        <Link href="/commercial/emails">File d’attente et historique</Link>
        <Link href="/commercial/emails/settings">
          Programmation et exclusions
        </Link>
      </nav>
      {children}
    </div>
  );
}
