import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient } from "@/features/clients/actions";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouveau client</h1>
        <p className="text-muted-foreground">Crée une fiche client exploitable pour projets, devis et factures.</p>
      </div>
      <Card>
        <form action={createClient} className="grid gap-4 md:grid-cols-2">
          <Input name="legalName" placeholder="Raison sociale / nom" required />
          <Input name="tradeName" placeholder="Nom commercial" />
          <Input name="contactName" placeholder="Contact principal" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Téléphone" />
          <Input name="website" placeholder="Site web" />
          <Input name="siret" placeholder="SIRET" />
          <Input name="vatNumber" placeholder="TVA intracommunautaire" />
          <Textarea name="address" placeholder="Adresse" />
          <Textarea name="notes" placeholder="Notes" />
          <Button className="md:col-span-2">Créer le client</Button>
        </form>
      </Card>
    </div>
  );
}
