import { prisma } from "@/lib/prisma";
import { requireEmailUser } from "@/lib/email/access";
import { emailTransaction, getSettings } from "@/lib/email/store";
import { dateLabel } from "@/lib/email/display";
import {
  excludeRecipient,
  purgeEmailContent,
  saveEmailSettings,
} from "@/features/emails/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailSendingWindow } from "@/components/email-sending-window";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireEmailUser();
  const params = await searchParams;
  const settings = await emailTransaction(getSettings);
  const exclusions = await prisma.emailSuppression.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Programmation des e-mails</h1>
      {params.error && (
        <p role="alert" className="rounded border border-red-400 p-3">
          {params.error.slice(0, 1000)}
        </p>
      )}
      {params.saved && <p role="status">Paramètres enregistrés.</p>}
      <Card>
        <form
          action={saveEmailSettings}
          className="grid max-w-3xl gap-5 sm:grid-cols-2"
        >
          <input type="hidden" name="revision" value={settings.revision} />
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={settings.enabled}
            />
            Activer la programmation automatique
          </label>
          <label>
            Intervalle minimal
            <Input
              name="interval"
              type="number"
              min={1}
              required
              defaultValue={
                settings.intervalMinutes % 60 === 0
                  ? settings.intervalMinutes / 60
                  : settings.intervalMinutes
              }
            />
          </label>
          <label>
            Unité
            <select
              className="h-10 w-full rounded-lg border bg-card p-2"
              name="unit"
              defaultValue={
                settings.intervalMinutes % 60 === 0 ? "hours" : "minutes"
              }
            >
              <option value="hours">Heures</option>
              <option value="minutes">Minutes</option>
            </select>
          </label>
          <label>
            Maximum par jour
            <Input
              name="dailyLimit"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={settings.dailyLimit}
            />
          </label>
          <label>
            Fuseau horaire
            <Input name="timezone" required defaultValue={settings.timezone} />
          </label>
          <EmailSendingWindow startMinute={settings.startMinute} endMinute={settings.endMinute} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-2">Jours autorisés</legend>
            <div className="flex flex-wrap gap-4">
              {[
                [1, "Lundi"],
                [2, "Mardi"],
                [3, "Mercredi"],
                [4, "Jeudi"],
                [5, "Vendredi"],
                [6, "Samedi"],
                [0, "Dimanche"],
              ].map(([day, label]) => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day}
                    defaultChecked={settings.weekdays.includes(Number(day))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Conservation du contenu terminé (jours)
            <Input
              name="retentionDays"
              type="number"
              min={30}
              max={1095}
              defaultValue={settings.retentionDays}
              required
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Le nettoyage reste une action manuelle. Les brouillons et résultats
            incertains sont conservés jusqu’à votre décision.
          </p>
          <Button>Enregistrer les paramètres</Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          Chaque modification ou reprise reporte le premier envoi d’au moins un
          intervalle complet. Aucun rattrapage immédiat. La pause et les
          exclusions arrêtent les prochains départs ; elles ne rappellent pas
          une transmission déjà engagée. Les tentatives, y compris les refus et
          les simulations, consomment par prudence le quota et l’intervalle.
        </p>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Exclure un destinataire</h2>
        <form action={excludeRecipient} className="flex flex-wrap gap-3">
          <Input
            name="recipient"
            type="email"
            required
            placeholder="Adresse professionnelle"
            aria-label="Adresse à exclure"
            className="sm:w-80"
          />
          <select
            name="reason"
            aria-label="Motif"
            className="rounded-lg border bg-card p-2"
          >
            <option value="opposition">Opposition</option>
            <option value="reply">Réponse reçue</option>
            <option value="manual">Exclusion manuelle</option>
          </select>
          <Button variant="secondary">Exclure</Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Les 100 exclusions les plus récentes sont affichées. Toutes les
          exclusions restent appliquées, même après suppression d’un message.
        </p>
        <ul className="space-y-2">
          {exclusions.map((row) => (
            <li key={row.recipientKey} className="border-t pt-2 text-sm">
              {row.maskedEmail} ·{" "}
              {(
                {
                  opposition: "Opposition",
                  reply: "Réponse reçue",
                  manual: "Manuelle",
                } as Record<string, string>
              )[row.reason] ?? row.reason}{" "}
              · {dateLabel(row.createdAt, settings.timezone)}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Conservation des données</h2>
        <p>
          Le nettoyage efface le contenu et les coordonnées des messages
          terminés, annulés, exclus ou en échec définitif, sans activité depuis{" "}
          {settings.retentionDays} jours. Il conserve les dates, résultats
          techniques et empreintes nécessaires aux exclusions et à la prévention
          des doublons.
        </p>
        <form action={purgeEmailContent}>
          <ConfirmSubmitButton
            variant="secondary"
            message="Effacer les contenus arrivés à expiration ? Cette opération est irréversible et ne concerne pas les brouillons ni les résultats incertains."
          >
            Nettoyer les contenus expirés
          </ConfirmSubmitButton>
        </form>
      </Card>
    </div>
  );
}
