import {prisma} from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { emailTransaction } from "@/lib/email/store";
import { findUnsubscribe, unsubscribeWithFeedback } from "@/lib/email/unsubscribe";
import { unsubscribeFeedbackReasons } from "@/lib/email/unsubscribe-feedback";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Opposition aux e-mails VisiPro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
async function confirm(token: string, formData: FormData) {
  "use server";
  try {
    await unsubscribeWithFeedback(
      token,
      formData.get("reasonCode"),
      formData.get("comment"),
    );
  } catch {
    redirect("/email-unsubscribe/invalid");
  }
  redirect(`/email-unsubscribe/${token}?done=1`);
}
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let message;
  try {
    message = await emailTransaction((tx) => findUnsubscribe(tx, token));
  } catch {
    notFound();
  }
  const done = await prisma.emailSuppression.findUnique({where:{recipientKey:message.recipientKey}});
  const feedback = done ? await prisma.emailUnsubscribeFeedback.findUnique({where:{recipientKey:message.recipientKey}}) : null;
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl space-y-6">
        <div><p className="text-sm font-medium text-primary">VisiPro</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Préférences de contact</h1></div>
        {!done ? (
          <Card className="space-y-5">
            <div><h2 className="text-lg font-semibold">Ne plus recevoir nos sollicitations</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Vous pouvez nous indiquer pourquoi avant de confirmer. Cette réponse est facultative et aucun compte n’est nécessaire.</p></div>
            <form action={confirm.bind(null, token)} className="space-y-5">
              <fieldset><legend className="text-sm font-medium">Quelle est la raison principale ? <span className="font-normal text-muted-foreground">(facultatif)</span></legend><div className="mt-3 space-y-2">{unsubscribeFeedbackReasons.map((reason) => <label key={reason.value} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition hover:bg-muted/50"><input className="mt-0.5 h-4 w-4" type="radio" name="reasonCode" value={reason.value} /><span>{reason.label}</span></label>)}</div></fieldset>
              <label className="block text-sm font-medium">Un commentaire à nous laisser ? <span className="font-normal text-muted-foreground">(facultatif)</span><textarea name="comment" maxLength={500} rows={4} className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal" placeholder="Votre remarque en quelques mots…" /></label>
              <Button>Confirmer la désinscription</Button>
            </form>
          </Card>
        ) : (
          <>
            <Card className="border-emerald-200 bg-emerald-50/60">
              <h2 className="font-semibold text-emerald-900">Votre opposition est enregistrée</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">Aucun nouvel e-mail de prospection ne sera programmé pour cette adresse. Un message déjà en cours de transmission peut encore arriver.</p>
            </Card>
            {feedback ? <Card><h2 className="font-semibold">Merci pour votre réponse</h2><p className="mt-2 text-sm text-muted-foreground">Elle nous aidera à mieux cibler nos prochaines prises de contact.</p></Card> : null}
          </>
        )}
        <p className="text-center text-xs text-muted-foreground">La désinscription est effective même si vous ne répondez pas au questionnaire.</p>
      </div>
    </main>
  );
}
