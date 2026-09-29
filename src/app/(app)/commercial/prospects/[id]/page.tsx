import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatProspectStage } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { issuedAt: "desc" }, include: { items: true } },
      pricingCatalogs: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { items: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      convertedClient: true
    }
  });
  if (!prospect) notFound();
  const googleMapsUrl = prospect.notes?.match(/^Fiche Google\s*:\s*(https:\/\/www\.google\.com\/maps\S*)\s*$/m)?.[1]
    ?? (prospect.source?.startsWith("VisiPro Detection:")
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${prospect.companyName} ${prospect.address ?? prospect.city ?? ""}`)}`
      : undefined);
  const displayedNotes = prospect.notes?.replace(/^Fiche Google\s*:\s*https:\/\/www\.google\.com\/maps\S*\s*$/m, "").trim();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h1 className="text-3xl font-semibold">{prospect.companyName}</h1><p className="text-muted-foreground">{formatProspectStage(prospect.stage)} - potentiel {formatCurrency(Number(prospect.potentialValue))}</p></div>{prospect.convertedClient ? <Link href={`/commercial/clients/${prospect.convertedClient.id}`} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Voir client converti</Link> : null}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><h2 className="font-semibold">Entreprise</h2><dl className="mt-4 space-y-2 text-sm"><div>Contact : {prospect.contactName ?? "-"}</div><div>Email : {prospect.email ?? "-"}</div><div>Téléphone : {prospect.phone ?? "-"}</div><div>Site web : {prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer" className="underline">{prospect.website}</a> : "-"}</div><div>Adresse : {prospect.address ?? "-"}</div><div>Ville : {prospect.city ?? "-"}</div><div>Activité : {prospect.activity ?? "-"}</div><div>Source : {prospect.source ?? "-"}</div></dl>{googleMapsUrl?<a className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" href={googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir la fiche Google Maps de ${prospect.companyName}`}>Voir la fiche Google Maps ↗</a>:null}</Card>
        <Card><h2 className="font-semibold">Prochaine action</h2><p className="mt-4 text-sm text-muted-foreground">{prospect.nextAction ?? "Aucune action planifiée"}</p><p className="mt-3 text-sm">Relance : {prospect.nextFollowUpAt?.toLocaleDateString("fr-FR") ?? "-"}</p></Card>
        <Card><h2 className="font-semibold">Résumé lié</h2><dl className="mt-4 space-y-2 text-sm"><div>Devis : {prospect.quotes.length}</div><div>Grilles tarifaires : {prospect.pricingCatalogs.length}</div><div>Documents : {prospect.documents.length}</div><div>Activités : {prospect.activities.length}</div></dl></Card>
      </div>
      <Card><h2 className="font-semibold">Notes</h2><p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{displayedNotes || "Aucune note enregistrée."}</p></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="font-semibold">Devis associés</h2><div className="mt-4 space-y-3">{prospect.quotes.map((quote) => <div key={quote.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-3"><div className="font-medium">{quote.number}</div><div>{formatCurrency(Number(quote.total))}</div></div><div className="text-muted-foreground">{quote.status} - {quote.issuedAt.toLocaleDateString("fr-FR")} - {quote.items.length} ligne(s)</div></div>)}{prospect.quotes.length === 0 ? <p className="text-sm text-muted-foreground">Aucun devis associé.</p> : null}</div></Card>
        <Card><h2 className="font-semibold">Grilles tarifaires</h2><div className="mt-4 space-y-3">{prospect.pricingCatalogs.map((catalog) => <Link key={catalog.id} href={`/pricing/${catalog.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted"><div className="flex items-center justify-between gap-3"><div className="font-medium">{catalog.name}</div><div>{catalog._count.items} prestation(s)</div></div><div className="text-muted-foreground">{catalog.status} - modifiée le {catalog.updatedAt.toLocaleDateString("fr-FR")}</div></Link>)}{prospect.pricingCatalogs.length === 0 ? <p className="text-sm text-muted-foreground">Aucune grille tarifaire associée.</p> : null}</div></Card>
      </div>
      <Card><h2 className="font-semibold">Documents</h2><div className="mt-4 space-y-3">{prospect.documents.map((document) => <div key={document.id} className="rounded-lg border p-3 text-sm"><div className="font-medium">{document.name}</div><div className="text-muted-foreground">{document.type} - {document.storageKey}</div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer" className="underline">Ouvrir</a> : null}</div>)}{prospect.documents.length === 0 ? <p className="text-sm text-muted-foreground">Aucun document associé.</p> : null}</div></Card>
      <Card><h2 className="font-semibold">Timeline</h2><div className="mt-4 space-y-3">{prospect.activities.map((activity) => <div key={activity.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between"><div className="font-medium">{activity.type}</div><div className="text-xs text-muted-foreground">{activity.happenedAt.toLocaleDateString("fr-FR")}</div></div><p className="text-muted-foreground">{activity.content}</p></div>)}{prospect.activities.length === 0 ? <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p> : null}</div></Card>
    </div>
  );
}
