import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addProspectCategory, deleteProspectCategory, renameProspectCategory } from "@/features/prospects/actions";
import { prisma } from "@/lib/prisma";

export default async function ProspectCategoriesPage() {
  const categories = await prisma.prospectCategory.findMany({
    include: { _count: { select: { prospects: true } } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Catégories de prospects</h1>
          <p className="text-muted-foreground">Secteurs utilisés pour classer et filtrer les prospects.</p>
        </div>
        <Link href="/commercial/prospects" className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">← Retour aux prospects</Link>
      </div>
      <Card>
        <h2 className="font-semibold">Nouvelle catégorie</h2>
        <form action={addProspectCategory} className="mt-4 flex flex-wrap gap-2">
          <Input name="name" placeholder="Nom de la catégorie" required className="max-w-xs" />
          <Button variant="secondary">Ajouter</Button>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Nom</th>
              <th>Prospects</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t align-middle">
                <td className="py-3">
                  <form action={renameProspectCategory} className="flex gap-2">
                    <input type="hidden" name="id" value={category.id} />
                    <Input name="name" defaultValue={category.name} required className="max-w-xs" />
                    <Button variant="secondary" className="shrink-0">OK</Button>
                  </form>
                </td>
                <td>{category._count.prospects}</td>
                <td className="text-right">
                  <form action={deleteProspectCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <ConfirmSubmitButton message={`Supprimer la catégorie « ${category.name} » ? Les prospects seront conservés sans catégorie.`} variant="ghost" className="h-8 px-2 text-xs text-red-600">Supprimer</ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Aucune catégorie. Ajoutez-en une pour apparaître dans le formulaire de prospect.</div> : null}
      </Card>
    </div>
  );
}
