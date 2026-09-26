import { ProspectStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createProspect } from "@/features/prospects/actions";
import { formatProspectStage } from "@/lib/labels";

export default function NewProspectPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nouveau prospect</h1>
        <p className="text-muted-foreground">Ajoute une opportunité au CRM VisiPro.</p>
      </div>
      <Card>
        <form action={createProspect} className="grid gap-4 md:grid-cols-2">
          <Input name="companyName" placeholder="Entreprise" required />
          <Input name="contactName" placeholder="Nom du contact" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Téléphone" />
          <Input name="website" placeholder="Site internet" />
          <Input name="city" placeholder="Ville" />
          <Input name="source" placeholder="Source" />
          <Input name="activity" placeholder="Activité" />
          <Input name="potentialValue" type="number" step="0.01" placeholder="Valeur potentielle" />
          <select name="stage" className="h-10 rounded-lg border bg-card px-3 text-sm">
            {Object.values(ProspectStage).map((stage) => <option key={stage} value={stage}>{formatProspectStage(stage)}</option>)}
          </select>
          <Input name="nextAction" placeholder="Prochaine action" />
          <Input name="nextFollowUpAt" type="date" />
          <Textarea name="notes" placeholder="Notes" className="md:col-span-2" />
          <Button className="md:col-span-2">Créer le prospect</Button>
        </form>
      </Card>
    </div>
  );
}
