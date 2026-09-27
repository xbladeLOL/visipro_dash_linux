import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateInitialCashBalance } from "@/features/settings/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function CompanySettingsPage() {
  const settings = await prisma.companySettings.findFirst();
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold">Paramètres entreprise</h1><p className="text-muted-foreground">Informations réutilisables dans devis, factures et exports.</p></div><Card><div className="grid gap-3 text-sm lg:grid-cols-2"><div>Nom : {settings?.name ?? "VisiPro"}</div><div>Raison sociale : {settings?.legalName ?? "-"}</div><div>SIRET : {settings?.siret ?? "-"}</div><div>TVA : {settings?.vatNumber ?? "-"}</div><div>Email : {settings?.email ?? "-"}</div><div>Téléphone : {settings?.phone ?? "-"}</div><div>Devise : {settings?.currency ?? "EUR"}</div><div>TVA par défaut : {Number(settings?.defaultVatRate ?? 20)}%</div><div>Préfixe devis : {settings?.quotePrefix ?? "DEV"}</div><div>Préfixe facture : {settings?.invoicePrefix ?? "FAC"}</div></div></Card><Card><h2 className="font-semibold">Trésorerie de départ</h2><p className="mt-2 text-sm text-muted-foreground">Solde de départ utilisé comme base du calcul de trésorerie. Le « Solde actuel » de la page Trésorerie ajoute ensuite toutes les entrées et retire toutes les sorties.</p><form action={updateInitialCashBalance} className="mt-4 flex flex-wrap items-end gap-2"><div className="w-full space-y-1 sm:w-auto"><label className="text-sm font-medium" htmlFor="initialCashBalance">Solde initial</label><Input id="initialCashBalance" name="initialCashBalance" type="number" step="0.01" defaultValue={Number(settings?.initialCashBalance ?? 0)} required /></div><Button variant="secondary" className="w-full sm:w-auto">Enregistrer</Button>{settings ? <span className="pb-2 text-sm text-muted-foreground">Actuel : {formatCurrency(Number(settings.initialCashBalance))}</span> : null}</form></Card></div>;
}
