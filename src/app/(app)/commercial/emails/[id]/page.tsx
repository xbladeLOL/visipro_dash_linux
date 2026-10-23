import { notFound } from "next/navigation";
import { renderEmailBody } from "@/lib/email/content";
import { prisma } from "@/lib/prisma";
import { requireEmailUser } from "@/lib/email/access";
import { emailTransaction, getSettings } from "@/lib/email/store";
import { dateLabel, statusLabels } from "@/lib/email/display";
import {
  approveEmails,
  cancelMessage,
  excludeRecipient,
  reconcileMessage,
  saveEmail,
  scheduleMessage,
} from "@/features/emails/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
export default async function EmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEmailUser();
  const { id } = await params;
  const message = await prisma.emailQueue.findUnique({
    where: { id },
    include: { attempts: { orderBy: { startedAt: "desc" } } },
  });
  if (!message || message.deletedAt) notFound();
  const settings = await emailTransaction(getSettings);
  const preview = renderEmailBody(message);
  const canEdit =
    !["sent", "sending", "suppressed"].includes(message.status) &&
    !message.reviewRequired;
  const hidden = (
    <>
      <input type="hidden" name="id" value={message.id} />
      <input type="hidden" name="version" value={message.version} />
    </>
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{message.companyName}</h1>
        <p className="mt-2">
          {message.recipient} ·{" "}
          {message.simulated && message.status === "sent"
            ? "Simulation terminée"
            : statusLabels[message.status]}
        </p>
        <p className="text-sm text-muted-foreground">
          Créé le {dateLabel(message.createdAt, settings.timezone)} · Validation
          : {dateLabel(message.approvedAt, settings.timezone)} · Prévu :{" "}
          {dateLabel(message.scheduledAt, settings.timezone)}
        </p>
      </div>
      {message.reviewRequired && (
        <Card className="space-y-3 border-amber-500">
          <p className="font-semibold">
            Le fournisseur a peut-être accepté ce message. Aucun nouvel essai
            automatique.
          </p>
          <p>
            Vérifiez ses journaux avec l’identifiant de la tentative. Confirmez
            ensuite le résultat ci-dessous. En cas de doute, conservez le
            blocage.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={reconcileMessage}>
              {hidden}
              <input type="hidden" name="accepted" value="true" />
              <ConfirmSubmitButton message="Avez-vous vérifié auprès du fournisseur que le message a été accepté ?">
                Acceptation confirmée par le fournisseur
              </ConfirmSubmitButton>
            </form>
            <form action={reconcileMessage}>
              {hidden}
              <input type="hidden" name="accepted" value="false" />
              <ConfirmSubmitButton
                variant="secondary"
                message="Avez-vous la confirmation du fournisseur que le message n’a pas été accepté ? Un nouveau brouillon nécessitera votre validation."
              >
                Non-acceptation confirmée : remettre en brouillon
              </ConfirmSubmitButton>
            </form>
          </div>
        </Card>
      )}
      <Card className="space-y-3">
        <h2 className="font-semibold">Aperçu du message enregistré</h2>
        <p className="text-sm text-muted-foreground">
          Pour un lien nommé, écrivez [Découvrir la
          maquette](https://adresse-de-la-maquette). Le champ Maquette VisiPro
          ajoute automatiquement ce lien s’il n’est pas déjà dans le texte.
          Enregistrez vos modifications pour actualiser cet aperçu.
        </p>
        <div
          data-testid="email-content-preview"
          className="break-words rounded-lg border bg-card p-5"
          dangerouslySetInnerHTML={{ __html: preview.html }}
        />
        {message.status === "sent" && (
          <p className="text-sm text-muted-foreground">
            Rendu avec le format actuel ; les messages déjà envoyés ne sont pas
            modifiés et cet aperçu n’est pas une copie archivée de l’envoi.
          </p>
        )}
      </Card>
      <Card>
        <form action={saveEmail} className="grid gap-4 sm:grid-cols-2">
          {hidden}
          <label>
            Entreprise
            <Input
              name="companyName"
              required
              defaultValue={message.companyName}
              maxLength={200}
              disabled={!canEdit}
            />
          </label>
          <label>
            Destinataire
            <Input
              name="recipient"
              type="email"
              required
              defaultValue={message.recipient}
              disabled={!canEdit}
            />
          </label>
          <label className="sm:col-span-2">
            Objet
            <Input
              name="subject"
              required
              defaultValue={message.subject}
              maxLength={300}
              disabled={!canEdit}
            />
          </label>
          <label className="sm:col-span-2">
            Message intégral
            <Textarea
              name="body"
              required
              defaultValue={message.body}
              minLength={10}
              maxLength={30000}
              rows={15}
              disabled={!canEdit}
            />
          </label>
          <label>
            Site de l’entreprise
            <Input
              name="companyUrl"
              type="url"
              defaultValue={message.companyUrl ?? ""}
              disabled={!canEdit}
            />
          </label>
          <label>
            Maquette VisiPro
            <Input
              name="mockupUrl"
              type="url"
              defaultValue={message.mockupUrl ?? ""}
              disabled={!canEdit}
            />
          </label>
          <label className="sm:col-span-2">
            Justification de la personnalisation
            <Textarea
              name="personalization"
              defaultValue={message.personalization ?? ""}
              maxLength={5000}
              disabled={!canEdit}
            />
          </label>
          <input
            type="hidden"
            name="prospectId"
            value={message.prospectId ?? ""}
          />
          {canEdit && (
            <>
              <Button>Enregistrer comme brouillon</Button>
              <p className="text-sm text-muted-foreground">
                Toute modification retire l’approbation précédente.
              </p>
            </>
          )}
        </form>
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
          Pied de message ajouté lors d’un envoi réel : VisiPro, identité et
          coordonnées configurées, lien d’opposition personnel et possibilité de
          répondre.
        </p>
      </Card>
      <div className="flex flex-wrap gap-3">
        {message.status === "draft" && (
          <form action={approveEmails}>
            <input
              type="hidden"
              name="selected"
              value={`${message.id}:${message.version}`}
            />
            <Button>Approuver ce brouillon</Button>
          </form>
        )}
        {["approved", "scheduled"].includes(message.status) && (
          <form action={scheduleMessage} className="flex flex-wrap gap-2">
            {hidden}
            <label>
              Pas avant ({settings.timezone})
              <Input name="notBefore" type="datetime-local" required />
            </label>
            <Button variant="secondary">Reprogrammer</Button>
          </form>
        )}
        {!["sending", "sent", "suppressed", "cancelled"].includes(
          message.status,
        ) && (
          <form action={cancelMessage}>
            {hidden}
            <Button variant="secondary">Annuler l’envoi</Button>
          </form>
        )}
        {message.status !== "sending" && (
          <form action={cancelMessage}>
            {hidden}
            <input name="remove" type="hidden" value="true" />
            <ConfirmSubmitButton
              variant="ghost"
              message="Supprimer le contenu de cet e-mail ? Une trace minimale anti-doublon sera conservée."
            >
              Supprimer le contenu
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
      <Card>
        <h2 className="font-semibold">Arrêter les sollicitations</h2>
        <form action={excludeRecipient} className="mt-3 flex flex-wrap gap-3">
          <input name="recipient" type="hidden" value={message.recipient} />
          <select
            aria-label="Motif d’arrêt"
            name="reason"
            className="rounded-lg border bg-card p-2"
          >
            <option value="opposition">
              Le prospect refuse les sollicitations
            </option>
            <option value="reply">
              Le prospect a répondu : arrêter les relances
            </option>
            <option value="manual">Exclusion manuelle</option>
          </select>
          <ConfirmSubmitButton message="Exclure cette adresse de toute nouvelle prospection ? Un message en transmission ne peut pas être rappelé.">
            Exclure le destinataire
          </ConfirmSubmitButton>
        </form>
        <p className="mt-2 text-sm text-muted-foreground">
          Les réponses sont signalées manuellement : aucune boîte de réception
          n’est connectée.
        </p>
      </Card>
      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-semibold">Historique des tentatives</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode / résultat</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {message.attempts.map((attempt) => (
              <tr key={attempt.id} className="border-t align-top">
                <td className="py-3">
                  {dateLabel(attempt.startedAt, settings.timezone)}
                  <br />
                  Fin : {dateLabel(attempt.finishedAt, settings.timezone)}
                </td>
                <td>
                  {attempt.mode}
                  <br />
                  {
                    {
                      pending: "En cours",
                      accepted: "Accepté par le fournisseur",
                      simulated: "Simulé",
                      temporary_failure: "Refus temporaire",
                      permanent_failure: "Refus définitif",
                      uncertain: "Incertain : vérifier",
                    }[attempt.outcome]
                  }
                </td>
                <td className="max-w-md py-3">
                  <p>{attempt.detail}</p>
                  <p>Code : {attempt.providerCode ?? "—"}</p>
                  <p className="break-all">
                    Identifiant fournisseur : {attempt.providerMessageId ?? "—"}
                  </p>
                  <p className="break-all text-muted-foreground">
                    Tentative : {attempt.id}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!message.attempts.length && <p>Aucune tentative.</p>}
      </Card>
    </div>
  );
}
