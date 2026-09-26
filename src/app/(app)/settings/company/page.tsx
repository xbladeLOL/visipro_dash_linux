import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function CompanySettingsPage() {
  const settings = await prisma.companySettings.findFirst();
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Paramètres entreprise</h1><p className="text-muted-foreground">Informations réutilisables dans devis, factures et exports.</p></div><Card><div className="grid gap-3 text-sm md:grid-cols-2"><div>Nom : {settings?.name ?? "VisiPro"}</div><div>Raison sociale : {settings?.legalName ?? "-"}</div><div>SIRET : {settings?.siret ?? "-"}</div><div>TVA : {settings?.vatNumber ?? "-"}</div><div>Email : {settings?.email ?? "-"}</div><div>Téléphone : {settings?.phone ?? "-"}</div><div>Devise : {settings?.currency ?? "EUR"}</div><div>TVA par défaut : {Number(settings?.defaultVatRate ?? 20)}%</div><div>Préfixe devis : {settings?.quotePrefix ?? "DEV"}</div><div>Préfixe facture : {settings?.invoicePrefix ?? "FAC"}</div></div></Card></div>;
}
