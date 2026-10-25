"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Reason = { value: string; label: string };

export function UnsubscribeForm({
  action,
  reasons,
}: {
  action: (formData: FormData) => void | Promise<void>;
  reasons: readonly Reason[];
}) {
  const [reasonCode, setReasonCode] = useState("");

  return <form action={action} className="space-y-5">
    <fieldset>
      <legend className="text-sm font-medium">Quelle est la raison principale ? <span className="text-red-600">*</span></legend>
      <p className="mt-1 text-xs text-muted-foreground">Choisissez une réponse pour pouvoir confirmer la désinscription.</p>
      <div className="mt-3 space-y-2">{reasons.map((reason) => <label key={reason.value} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
        <input className="mt-0.5 h-4 w-4" type="radio" name="reasonCode" value={reason.value} required checked={reasonCode === reason.value} onChange={(event) => setReasonCode(event.target.value)} />
        <span>{reason.label}</span>
      </label>)}</div>
    </fieldset>
    <label className="block text-sm font-medium">Un commentaire à nous laisser ? <span className="font-normal text-muted-foreground">(facultatif)</span>
      <textarea name="comment" maxLength={500} rows={4} className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal" placeholder="Votre remarque en quelques mots…" />
    </label>
    <Button disabled={!reasonCode}>Confirmer la désinscription</Button>
  </form>;
}
