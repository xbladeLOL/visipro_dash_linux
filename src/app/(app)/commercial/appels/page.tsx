import { PhoneCall, RotateCcw, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { PhoneQualificationStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { updatePhoneQualification } from "@/features/prospects/actions";
import { toPhoneHref, toWebsiteHref } from "@/lib/contact-links";
import { prisma } from "@/lib/prisma";

const pageSize = 30;
const views = {
  "a-qualifier": {
    status: PhoneQualificationStatus.PENDING,
    label: "À qualifier",
    description: "Vérifiez le site puis décidez si le prospect doit être appelé."
  },
  "a-appeler": {
    status: PhoneQualificationStatus.TO_CALL,
    label: "À appeler",
    description: "Prospects validés, avec appel direct depuis votre téléphone."
  },
  ecartes: {
    status: PhoneQualificationStatus.NOT_A_FIT,
    label: "Écartés",
    description: "Sites jugés corrects, conservés ici pour pouvoir revenir sur une décision."
  }
} as const;

type ViewKey = keyof typeof views;
type SearchParams = { vue?: string; q?: string; page?: string };

function callsUrl(view: ViewKey, q?: string, page?: number) {
  const params = new URLSearchParams();
  if (view !== "a-qualifier") params.set("vue", view);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/commercial/appels${query ? `?${query}` : ""}`;
}

export default async function CallsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = (params.vue && params.vue in views ? params.vue : "a-qualifier") as ViewKey;
  const currentView = views[view];
  const q = params.q?.trim();
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const withPhone: Prisma.ProspectWhereInput = {
    AND: [{ phone: { not: null } }, { NOT: { phone: "" } }]
  };
  const where: Prisma.ProspectWhereInput = {
    AND: [
      withPhone,
      { phoneQualificationStatus: currentView.status },
      ...(q ? [{ OR: [
        { companyName: { contains: q, mode: "insensitive" as const } },
        { activity: { contains: q, mode: "insensitive" as const } },
        { city: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } }
      ] }] : [])
    ]
  };

  const [total, grouped] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.groupBy({
      by: ["phoneQualificationStatus"],
      where: withPhone,
      _count: { _all: true }
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: view === "a-appeler"
      ? [{ phoneQualifiedAt: "desc" }, { companyName: "asc" }]
      : [{ createdAt: "desc" }, { companyName: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      companyName: true,
      activity: true,
      city: true,
      phone: true,
      website: true,
      phoneQualifiedAt: true
    }
  });
  const counts = new Map(grouped.map((item) => [item.phoneQualificationStatus, item._count._all]));

  return <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold">Prospects téléphoniques</h1>
      <p className="mt-1 text-muted-foreground">Qualifiez les sites puis retrouvez les prospects prêts à appeler.</p>
    </div>

    <div className="grid grid-cols-3 gap-2" aria-label="Étapes de qualification téléphonique">
      {(Object.entries(views) as [ViewKey, typeof views[ViewKey]][]).map(([key, item]) =>
        <Link key={key} href={callsUrl(key)} aria-current={view === key ? "page" : undefined}
          className="flex min-h-20 flex-col justify-center rounded-xl border bg-card px-3 py-3 text-center transition hover:border-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary/5">
          <span className="text-xs font-medium sm:text-sm">{item.label}</span>
          <strong className="mt-1 text-xl">{counts.get(item.status) ?? 0}</strong>
        </Link>)}
    </div>

    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-semibold">{currentView.label}</h2><p className="mt-1 text-sm text-muted-foreground">{currentView.description}</p></div>
        <form className="flex w-full gap-2 sm:max-w-md">
          {view !== "a-qualifier" ? <input type="hidden" name="vue" value={view} /> : null}
          <input name="q" defaultValue={q ?? ""} aria-label="Rechercher un prospect" placeholder="Entreprise, ville, téléphone…" className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" />
          <button aria-label="Rechercher" className="inline-flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border bg-card hover:bg-muted"><Search className="h-4 w-4" /></button>
        </form>
      </div>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {prospects.map((prospect) => {
        const phone = prospect.phone ?? "";
        const website = prospect.website ? toWebsiteHref(prospect.website) : "";
        return <Card key={prospect.id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href={`/commercial/prospects/${prospect.id}`} className="text-lg font-semibold hover:underline">{prospect.companyName}</Link>
              <p className="mt-1 text-sm text-muted-foreground">{[prospect.activity, prospect.city].filter(Boolean).join(" · ") || "Activité et ville non renseignées"}</p>
            </div>
            {prospect.phoneQualifiedAt && view !== "a-qualifier" ? <span className="text-xs text-muted-foreground">Classé le {prospect.phoneQualifiedAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</span> : null}
          </div>

          <div className="grid gap-2 rounded-xl bg-muted/60 p-3 text-sm sm:grid-cols-2">
            <div><span className="block text-xs font-medium text-muted-foreground">Téléphone</span><a href={toPhoneHref(phone)} className="mt-1 inline-flex min-h-11 items-center font-semibold hover:underline">{phone}</a></div>
            <div><span className="block text-xs font-medium text-muted-foreground">Site actuel</span>{website ? <a href={website} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center break-all font-medium text-primary hover:underline">Voir le site ↗</a> : <span className="mt-1 inline-flex min-h-11 items-center text-muted-foreground">Aucun site détecté</span>}</div>
          </div>

          {view === "a-qualifier" ? <div className="grid gap-2 sm:grid-cols-2">
            <form action={updatePhoneQualification}><input type="hidden" name="id" value={prospect.id} /><input type="hidden" name="status" value={PhoneQualificationStatus.TO_CALL} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"><ThumbsUp className="h-4 w-4" />Site à créer / refaire</button></form>
            <form action={updatePhoneQualification}><input type="hidden" name="id" value={prospect.id} /><input type="hidden" name="status" value={PhoneQualificationStatus.NOT_A_FIT} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-muted"><ThumbsDown className="h-4 w-4" />Site actuel correct</button></form>
          </div> : null}

          {view === "a-appeler" ? <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <a href={toPhoneHref(phone)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700"><PhoneCall className="h-5 w-5" />Appeler {prospect.companyName}</a>
            <form action={updatePhoneQualification}><input type="hidden" name="id" value={prospect.id} /><input type="hidden" name="status" value={PhoneQualificationStatus.PENDING} /><button className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm hover:bg-muted"><RotateCcw className="h-4 w-4" />Requalifier</button></form>
          </div> : null}

          {view === "ecartes" ? <div className="grid gap-2 sm:grid-cols-2">
            <form action={updatePhoneQualification}><input type="hidden" name="id" value={prospect.id} /><input type="hidden" name="status" value={PhoneQualificationStatus.PENDING} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-muted"><RotateCcw className="h-4 w-4" />Revoir la qualification</button></form>
            <form action={updatePhoneQualification}><input type="hidden" name="id" value={prospect.id} /><input type="hidden" name="status" value={PhoneQualificationStatus.TO_CALL} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"><PhoneCall className="h-4 w-4" />Ajouter aux appels</button></form>
          </div> : null}
        </Card>;
      })}
    </div>

    {prospects.length === 0 ? <Card className="py-12 text-center text-muted-foreground">{q ? "Aucun prospect ne correspond à cette recherche." : `Aucun prospect dans « ${currentView.label} ».`}</Card> : null}

    {totalPages > 1 ? <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <Link aria-disabled={page === 1} className={`rounded-lg border px-3 py-2 text-sm ${page === 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={callsUrl(view, q, page - 1)}>← Précédent</Link>
      <span className="text-sm text-muted-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur {total}</span>
      <Link aria-disabled={page === totalPages} className={`rounded-lg border px-3 py-2 text-sm ${page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={callsUrl(view, q, page + 1)}>Suivant →</Link>
    </nav> : null}
  </div>;
}
