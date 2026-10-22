import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { emailTransaction } from "@/lib/email/store";
import { findUnsubscribe, unsubscribe } from "@/lib/email/unsubscribe";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Opposition aux e-mails VisiPro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
async function confirm(token: string) {
  "use server";
  try {
    await unsubscribe(token);
  } catch {
    redirect("/email-unsubscribe/invalid");
  }
  redirect(`/email-unsubscribe/${token}?done=1`);
}
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  try {
    await emailTransaction((tx) => findUnsubscribe(tx, token));
  } catch {
    notFound();
  }
  const { done } = await searchParams;
  return (
    <main className="mx-auto max-w-lg space-y-5 p-8">
      <h1 className="text-2xl font-semibold">E-mails VisiPro</h1>
      {done ? (
        <p>
          Votre opposition a été enregistrée. Aucun nouvel e-mail de prospection
          ne sera programmé pour cette adresse. Un message déjà en cours de
          transmission peut encore arriver.
        </p>
      ) : (
        <>
          <p>
            Confirmez pour ne plus recevoir d’e-mails de prospection de VisiPro.
            Aucun compte n’est nécessaire.
          </p>
          <form action={confirm.bind(null, token)}>
            <Button>Ne plus recevoir de sollicitations</Button>
          </form>
        </>
      )}
    </main>
  );
}
