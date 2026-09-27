import Link from "next/link";
import { ProspectStage } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteProspect, updateProspectStage } from "@/features/prospects/actions";
import { formatProspectStage } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const stages = Object.values(ProspectStage);

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; category?: string }> }) {
  const params = await searchParams;
  const [prospects, categories] = await Promise.all([
    prisma.prospect.findMany({
      where: {
        stage: params.stage ? (params.stage as ProspectStage) : undefined,
        categoryId: params.category || undefined,
        OR: params.q ? [{ companyName: { contains: params.q, mode: "insensitive" } }, { city: { contains: params.q, mode: "insensitive" } }, { activity: { contains: params.q, mode: "insensitive" } }] : undefined
      },
      include: { category: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.prospectCategory.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div><h1 className="text-3xl font-semibold">Prospects</h1><p className="text-muted-foreground">CRM, pipeline et relances commerciales.</p></div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <Link href="/commercial/prospects/categories" className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-muted lg:h-10 lg:flex-none">Catégories</Link>
          <Link href="/commercial/prospects/new" className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 lg:h-10 lg:flex-none">+ Nouveau prospect</Link>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {stages.map((stage) => (
          <Card key={stage} className="p-3">
            <h2 className="mb-3 text-sm font-semibold">{formatProspectStage(stage)}</h2>
            <div className="space-y-2">
              {prospects.filter((prospect) => prospect.stage === stage).map((prospect) => (
                <Link href={`/commercial/prospects/${prospect.id}`} key={prospect.id} className="block rounded-xl border bg-background p-3 text-sm hover:bg-muted">
                  <div className="font-medium">{prospect.companyName}</div>
                  <div className="text-muted-foreground">{prospect.city ?? "Ville inconnue"}</div>
                  {prospect.category ? <div className="mt-1 inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{prospect.category.name}</div> : null}
                  <div className="mt-2 font-medium">{formatCurrency(Number(prospect.potentialValue))}</div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div>
            <h2 className="font-semibold">Tous les prospects</h2>
            <p className="text-sm text-muted-foreground">Vue tableau pour modifier le pipeline ou supprimer une fiche.</p>
          </div>
          <form className="flex w-full flex-wrap gap-2 lg:w-auto">
            <Input name="q" placeholder="Rechercher" defaultValue={params.q ?? ""} />
            <select name="category" defaultValue={params.category ?? ""} className="h-11 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm lg:h-10 lg:flex-none"><option value="">Catégorie : Toutes</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <Button variant="secondary">Filtrer</Button>
          </form>
        </div>
        <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Entreprise</th>
              <th>Contact</th>
              <th>Catégorie</th>
              <th>Ville</th>
              <th>Valeur</th>
              <th>Statut</th>
              <th>Prochaine action</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id} className="border-t align-middle">
                <td className="py-3"><Link className="font-medium hover:underline" href={`/commercial/prospects/${prospect.id}`}>{prospect.companyName}</Link></td>
                <td>{prospect.contactName ?? "-"}</td>
                <td>{prospect.category?.name ?? "-"}</td>
                <td>{prospect.city ?? "-"}</td>
                <td>{formatCurrency(Number(prospect.potentialValue))}</td>
                <td>
                  <form action={updateProspectStage} className="flex gap-2">
                    <input type="hidden" name="id" value={prospect.id} />
                    <select name="stage" defaultValue={prospect.stage} className="h-8 rounded-lg border bg-card px-2 text-xs">
                      {stages.map((stage) => <option key={stage} value={stage}>{formatProspectStage(stage)}</option>)}
                    </select>
                    <button className="rounded-lg border px-2 text-xs hover:bg-muted">OK</button>
                  </form>
                </td>
                <td>{prospect.nextAction ?? "-"}</td>
                <td className="text-right">
                  <form action={deleteProspect}>
                    <input type="hidden" name="id" value={prospect.id} />
                    <ConfirmSubmitButton message="Supprimer ce prospect ?" variant="ghost" className="h-8 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="space-y-3 lg:hidden">
          {prospects.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Aucun prospect ne correspond aux filtres.</p> : null}
          {prospects.map((prospect) => (
            <div key={prospect.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/commercial/prospects/${prospect.id}`} className="min-w-0 font-medium hover:underline">{prospect.companyName}</Link>
                <div className="shrink-0 text-right font-medium">{formatCurrency(Number(prospect.potentialValue))}</div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {prospect.category ? <span className="rounded-full border px-2 py-0.5 text-xs">{prospect.category.name}</span> : null}
                {prospect.city ? <span className="text-xs">{prospect.city}</span> : null}
                {prospect.contactName ? <span className="truncate text-xs">{prospect.contactName}</span> : null}
              </div>
              {prospect.nextAction ? <div className="mt-2 text-sm"><span className="text-muted-foreground">Prochaine action : </span>{prospect.nextAction}</div> : null}
              <div className="mt-3 flex items-center gap-2">
                <form action={updateProspectStage} className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={prospect.id} />
                  <select name="stage" defaultValue={prospect.stage} className="h-11 min-w-0 flex-1 rounded-lg border bg-card px-2 text-sm">
                    {stages.map((stage) => <option key={stage} value={stage}>{formatProspectStage(stage)}</option>)}
                  </select>
                  <button className="h-11 shrink-0 rounded-lg border px-3 text-sm hover:bg-muted">OK</button>
                </form>
                <form action={deleteProspect} className="shrink-0">
                  <input type="hidden" name="id" value={prospect.id} />
                  <ConfirmSubmitButton message="Supprimer ce prospect ?" variant="ghost" className="h-11 px-3 text-sm text-red-600">Supprimer</ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
