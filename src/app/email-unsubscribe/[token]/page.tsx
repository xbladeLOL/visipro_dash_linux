import {prisma} from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UnsubscribeForm } from "@/components/unsubscribe-form";
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
            <div><h2 className="text-lg font-semibold">Ne plus recevoir nos sollicitations</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Sélectionnez la raison principale avant de confirmer. Le commentaire reste facultatif et aucun compte n’est nécessaire.</p></div>
            <UnsubscribeForm action={confirm.bind(null, token)} reasons={unsubscribeFeedbackReasons} />
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
        <p className="text-center text-xs text-muted-foreground">Le choix d’un motif est obligatoire. Le commentaire reste facultatif.</p>
      </div>
    </main>
  );
}
