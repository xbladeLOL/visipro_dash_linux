import Link from "next/link";
import { ProspectStage } from "@prisma/client";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createProspect, deleteProspect, updateProspectStage } from "@/features/prospects/actions";
import { formatProspectStage } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const stages = Object.values(ProspectStage);

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string }> }) {
  const params = await searchParams;
  const prospects = await prisma.prospect.findMany({
    where: {
      stage: params.stage ? (params.stage as ProspectStage) : undefined,
      OR: params.q ? [{ companyName: { contains: params.q, mode: "insensitive" } }, { city: { contains: params.q, mode: "insensitive" } }, { activity: { contains: params.q, mode: "insensitive" } }] : undefined
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Prospects</h1><p className="text-muted-foreground">CRM, pipeline et relances commerciales.</p></div>
        <Link href="/commercial/prospects/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">+ Nouveau prospect</Link>
      </div>
      <Card>
        <form action={createProspect} className="grid gap-3 md:grid-cols-4">
          <Input name="companyName" placeholder="Entreprise" required />
          <Input name="contactName" placeholder="Contact" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Téléphone" />
          <Input name="city" placeholder="Ville" />
          <Input name="source" placeholder="Source" />
          <Input name="activity" placeholder="Activité" />
          <Input name="potentialValue" type="number" step="0.01" placeholder="Valeur potentielle" />
          <select name="stage" className="h-10 rounded-lg border bg-card px-3 text-sm">{stages.map((stage) => <option key={stage} value={stage}>{formatProspectStage(stage)}</option>)}</select>
          <Textarea name="notes" placeholder="Notes" className="md:col-span-2" />
          <Input name="nextAction" placeholder="Prochaine action" />
          <Button className="md:col-span-4">Créer le prospect</Button>
        </form>
      </Card>
      <div className="grid gap-4 xl:grid-cols-4">
        {stages.map((stage) => (
          <Card key={stage} className="p-3">
            <h2 className="mb-3 text-sm font-semibold">{formatProspectStage(stage)}</h2>
            <div className="space-y-2">
              {prospects.filter((prospect) => prospect.stage === stage).map((prospect) => (
                <Link href={`/commercial/prospects/${prospect.id}`} key={prospect.id} className="block rounded-xl border bg-background p-3 text-sm hover:bg-muted">
                  <div className="font-medium">{prospect.companyName}</div>
                  <div className="text-muted-foreground">{prospect.city ?? "Ville inconnue"}</div>
                  <div className="mt-2 font-medium">{formatCurrency(Number(prospect.potentialValue))}</div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Tous les prospects</h2>
            <p className="text-sm text-muted-foreground">Vue tableau pour modifier le pipeline ou supprimer une fiche.</p>
          </div>
          <form className="flex gap-2">
            <Input name="q" placeholder="Rechercher" defaultValue={params.q ?? ""} />
            <Button variant="secondary">Filtrer</Button>
          </form>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Entreprise</th>
              <th>Contact</th>
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
      </Card>
    </div>
  );
}
