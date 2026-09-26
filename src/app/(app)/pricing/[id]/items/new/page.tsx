import Link from "next/link";
import { notFound } from "next/navigation";
import { PricingBillingType, PricingPriceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createPricingItemAndRedirect } from "@/features/pricing/actions";
import { prisma } from "@/lib/prisma";

const priceTypeLabels: Record<PricingPriceType, string> = { FIXED: "Prix fixe", STARTING_AT: "À partir de", FROM_TO: "Fourchette", ON_QUOTE: "Sur devis", CUSTOM_TEXT: "Texte personnalisé" };
const billingTypeLabels: Record<PricingBillingType, string> = { ONE_TIME: "Ponctuel", MONTHLY: "Mensuel", YEARLY: "Annuel", CUSTOM: "Personnalisé" };

export default async function NewPricingItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await prisma.pricingCatalog.findUnique({ where: { id }, include: { categories: { orderBy: { displayOrder: "asc" } } } });
  if (!catalog) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl border bg-card p-6">
        <Link href={`/pricing/${catalog.id}`} className="text-sm text-muted-foreground hover:text-foreground">← Retour à la grille</Link>
        <h1 className="mt-3 text-3xl font-semibold">Nouvelle prestation</h1>
        <p className="text-muted-foreground">Crée une prestation puis complète-la dans l’éditeur dédié.</p>
      </header>
      <Card>
        <form action={createPricingItemAndRedirect} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="catalogId" value={catalog.id} />
          <label className="space-y-2 text-sm font-medium">Nom<Input name="name" required placeholder="Site vitrine Pro" /></label>
          <label className="space-y-2 text-sm font-medium">Catégorie<select name="categoryId" className="h-11 w-full rounded-xl border bg-card px-3 text-sm" required><option value="">Choisir une catégorie</option>{catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="space-y-2 text-sm font-medium">Prix<Input name="basePrice" type="number" step="0.01" placeholder="890" /></label>
          <label className="space-y-2 text-sm font-medium">Type de prix<select name="priceType" defaultValue={PricingPriceType.STARTING_AT} className="h-11 w-full rounded-xl border bg-card px-3 text-sm">{Object.values(PricingPriceType).map((type) => <option key={type} value={type}>{priceTypeLabels[type]}</option>)}</select></label>
          <label className="space-y-2 text-sm font-medium">Facturation<select name="billingType" defaultValue={PricingBillingType.ONE_TIME} className="h-11 w-full rounded-xl border bg-card px-3 text-sm">{Object.values(PricingBillingType).map((type) => <option key={type} value={type}>{billingTypeLabels[type]}</option>)}</select></label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">Description courte<Textarea name="shortDescription" className="min-h-32" /></label>
          <Button className="md:col-span-2">Créer et ouvrir l’éditeur</Button>
        </form>
      </Card>
    </div>
  );
}
