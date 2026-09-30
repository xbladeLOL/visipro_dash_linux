import Link from "next/link";
import { Prisma, ProspectStage } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteProspect, updateProspectStage } from "@/features/prospects/actions";
import { formatProspectStage } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const stages = Object.values(ProspectStage);
const pageSize = 25;

const stageStyles: Record<ProspectStage, string> = {
  NEW: "bg-slate-100 text-slate-700", TO_ANALYZE: "bg-amber-100 text-amber-800",
  TO_CONTACT: "bg-blue-100 text-blue-800", CONTACTED: "bg-indigo-100 text-indigo-800",
  TO_FOLLOW_UP: "bg-orange-100 text-orange-800", REPLIED: "bg-violet-100 text-violet-800",
  MEETING: "bg-purple-100 text-purple-800", QUOTE_TO_PREPARE: "bg-cyan-100 text-cyan-800",
  QUOTE_SENT: "bg-sky-100 text-sky-800", NEGOTIATION: "bg-fuchsia-100 text-fuchsia-800",
  WON: "bg-emerald-100 text-emerald-800", LOST: "bg-rose-100 text-rose-800"
};

type SearchParams = { q?: string; stage?: string; city?: string; page?: string };

function prospectUrl(params: SearchParams, changes: SearchParams) {
  const next = new URLSearchParams();
  const merged = { ...params, ...changes };
  if (merged.q) next.set("q", merged.q);
  if (merged.stage) next.set("stage", merged.stage);
  if (merged.city) next.set("city", merged.city);
  if (merged.page && merged.page !== "1") next.set("page", merged.page);
  const query = next.toString();
  return `/commercial/prospects${query ? `?${query}` : ""}`;
}

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const selectedStage = stages.includes(params.stage as ProspectStage) ? params.stage as ProspectStage : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const search = params.q?.trim();
  const city = params.city?.trim();
  const where: Prisma.ProspectWhereInput = {
    stage: selectedStage,
    city: city ? { contains: city, mode: "insensitive" } : undefined,
    OR: search ? [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { activity: { contains: search, mode: "insensitive" } }
    ] : undefined
  };

  const [total, stageCounts] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.groupBy({ by: ["stage"], _count: { _all: true } })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const prospects = await prisma.prospect.findMany({
    where, orderBy: [{ createdAt: "desc" }, { companyName: "asc" }],
    skip: (currentPage - 1) * pageSize, take: pageSize
  });
  const counts = new Map(stageCounts.map((item) => [item.stage, item._count._all]));
  const allProspectsCount = stageCounts.reduce((sum, item) => sum + item._count._all, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-3xl font-semibold">Prospects</h1><p className="text-muted-foreground">Analysez et traitez rapidement votre file commerciale.</p></div>
        <Link href="/commercial/prospects/new" className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">+ Nouveau prospect</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={prospectUrl(params, { stage: "", page: "1" })} className={`rounded-xl border p-4 transition hover:border-primary ${!selectedStage ? "border-primary bg-primary/5" : "bg-card"}`}>
          <div className="text-sm text-muted-foreground">Tous les prospects</div><div className="mt-1 text-2xl font-semibold">{allProspectsCount}</div>
        </Link>
        {stages.map((stage) => <Link key={stage} href={prospectUrl(params, { stage, page: "1" })} className={`rounded-xl border p-4 transition hover:border-primary ${selectedStage === stage ? "border-primary bg-primary/5" : "bg-card"}`}><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${stageStyles[stage]}`}>{formatProspectStage(stage)}</span><strong className="text-xl">{counts.get(stage) ?? 0}</strong></div></Link>)}
      </div>

      <Card><form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_auto_auto]">
        <Input name="q" placeholder="Entreprise, activité, téléphone, email…" defaultValue={params.q ?? ""} />
        <Input name="city" placeholder="Filtrer par ville" defaultValue={params.city ?? ""} />
        {selectedStage ? <input type="hidden" name="stage" value={selectedStage} /> : null}
        <Button variant="secondary">Rechercher</Button>
        {(search || city || selectedStage) ? <Link href="/commercial/prospects" className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm hover:bg-muted">Réinitialiser</Link> : null}
      </form></Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{selectedStage ? formatProspectStage(selectedStage) : "Tous les prospects"}</h2><p className="text-sm text-muted-foreground">{total} résultat{total > 1 ? "s" : ""} · page {currentPage} sur {totalPages}</p></div><p className="text-xs text-muted-foreground">Cliquez sur une entreprise pour ouvrir sa fiche complète.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Entreprise</th><th className="px-4 py-3">Coordonnées</th><th className="px-4 py-3">Localisation</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Suivi</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {prospects.map((prospect) => <tr key={prospect.id} className="border-t align-top transition hover:bg-muted/40">
              <td className="px-4 py-3"><Link className="font-semibold text-foreground hover:text-primary hover:underline" href={`/commercial/prospects/${prospect.id}`}>{prospect.companyName}</Link><div className="mt-1 text-xs text-muted-foreground">{prospect.activity ?? "Activité non renseignée"}</div><div className="mt-1 text-xs font-medium">{formatCurrency(Number(prospect.potentialValue))}</div></td>
              <td className="px-4 py-3"><div>{prospect.phone ?? "Aucun téléphone"}</div><div className="mt-1 max-w-52 truncate text-xs text-muted-foreground" title={prospect.email ?? undefined}>{prospect.email ?? "Aucun email"}</div></td>
              <td className="px-4 py-3"><div>{prospect.city ?? "Ville inconnue"}</div><div className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={prospect.address ?? undefined}>{prospect.address ?? "Adresse non renseignée"}</div></td>
              <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${stageStyles[prospect.stage]}`}>{formatProspectStage(prospect.stage)}</span></td>
              <td className="px-4 py-3"><div className="max-w-48">{prospect.nextAction ?? "Aucune action"}</div><div className="mt-1 text-xs text-muted-foreground">{prospect.nextFollowUpAt ? `Relance le ${prospect.nextFollowUpAt.toLocaleDateString("fr-FR")}` : "Aucune relance prévue"}</div></td>
              <td className="px-4 py-3"><div className="flex justify-end gap-2"><form action={updateProspectStage} className="flex gap-1"><input type="hidden" name="id" value={prospect.id} /><select aria-label={`Modifier le statut de ${prospect.companyName}`} name="stage" defaultValue={prospect.stage} className="h-8 max-w-32 rounded-lg border bg-card px-2 text-xs">{stages.map((stage) => <option key={stage} value={stage}>{formatProspectStage(stage)}</option>)}</select><button className="h-8 rounded-lg border px-2 text-xs hover:bg-muted">OK</button></form><form action={deleteProspect}><input type="hidden" name="id" value={prospect.id} /><ConfirmSubmitButton message="Supprimer ce prospect ?" variant="ghost" className="h-8 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton></form></div></td>
            </tr>)}
            {prospects.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Aucun prospect ne correspond à ces filtres.</td></tr> : null}
          </tbody>
        </table></div>
        {totalPages > 1 ? <div className="flex items-center justify-between gap-3 border-t p-4"><Link aria-disabled={currentPage === 1} className={`rounded-lg border px-3 py-2 text-sm ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={prospectUrl(params, { page: String(currentPage - 1) })}>← Précédent</Link><span className="text-sm text-muted-foreground">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} sur {total}</span><Link aria-disabled={currentPage === totalPages} className={`rounded-lg border px-3 py-2 text-sm ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={prospectUrl(params, { page: String(currentPage + 1) })}>Suivant →</Link></div> : null}
      </Card>
    </div>
  );
}
