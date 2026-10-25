import { ResponsiveTable } from "@/components/ui/responsive-table";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { EmailStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireEmailUser } from "@/lib/email/access";
import { emailTransaction, getSettings } from "@/lib/email/store";
import { dateLabel, statusLabels } from "@/lib/email/display";
import { deliveryMode } from "@/lib/email/validation";
import { approveEmails, createEmail } from "@/features/emails/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type PowerState = {
  status?: string;
  wakeAt?: number;
  attempts?: number;
  confirmedAt?: number;
  failedAt?: number;
  failureReason?: string;
};

async function getPowerState(): Promise<PowerState | null> {
  try {
    return JSON.parse(
      await readFile(
        path.join(process.cwd(), ".visipro", "power", "wake.json"),
        "utf8",
      ),
    ) as PowerState;
  } catch {
    return null;
  }
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireEmailUser();
  const params = await searchParams;
  const [settings, powerState] = await Promise.all([
    emailTransaction(getSettings),
    getPowerState(),
  ]);
  const status = Object.values(EmailStatus).includes(
    params.status as EmailStatus,
  )
    ? (params.status as EmailStatus)
    : undefined;
  const search = params.q?.slice(0, 200) ?? "";
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(params.page ?? "1") || 1),
  );
  const where: Prisma.EmailQueueWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { recipient: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const order: Prisma.EmailQueueOrderByWithRelationInput =
    params.sort === "oldest"
      ? { createdAt: "asc" }
      : params.sort === "next"
        ? { scheduledAt: { sort: "asc", nulls: "last" } }
        : params.sort === "company"
          ? { companyName: "asc" }
          : { createdAt: "desc" };
  const [rows, total, counts, next] = await Promise.all([
    prisma.emailQueue.findMany({
      where,
      orderBy: [order, { id: "asc" }],
      skip: (page - 1) * 50,
      take: 50,
    }),
    prisma.emailQueue.count({ where }),
    prisma.emailQueue.groupBy({
      by: ["status", "simulated"],
      _count: true,
      where: { deletedAt: null },
    }),
    prisma.emailQueue.findFirst({
      where: {
        status: { in: ["scheduled", "failed"] },
        scheduledAt: { not: null },
        deletedAt: null,
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);
  const suppressions = await prisma.emailSuppression.findMany({where:{recipientKey:{in:rows.map(row=>row.recipientKey)}},select:{recipientKey:true}});
  const suppressedKeys = new Set(suppressions.map(row=>row.recipientKey));
  const count = (value: EmailStatus, simulated?: boolean) =>
    counts
      .filter(
        (row) =>
          row.status === value &&
          (simulated === undefined || row.simulated === simulated),
      )
      .reduce((sum, row) => sum + row._count, 0);
  const pagination = (number: number) => {
    const query = new URLSearchParams();
    for (const key of ["status", "q", "sort"])
      if (params[key]) query.set(key, params[key]!);
    query.set("page", String(number));
    return `/commercial/emails?${query}`;
  };
  const heartbeat =
    settings.workerHeartbeat &&
    Date.now() - settings.workerHeartbeat.getTime() < 120000;
  const powerStatus =
    powerState?.status === "online_confirmed"
      ? "PC en ligne confirmé par Tailscale"
      : powerState?.status === "failed"
        ? "Échec du réveil : le PC n’est pas revenu en ligne"
        : ["waking", "sent", "awaiting_online"].includes(
              powerState?.status ?? "",
            )
          ? "Paquets de réveil envoyés, confirmation Tailscale en attente"
          : powerState?.status === "pending"
            ? "Réveil programmé"
            : powerState?.status === "cancelled"
              ? "Réveil annulé"
              : "Aucun réveil programmé";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">E-mails de prospection</h1>
        <p className="text-muted-foreground">
          Préparez, validez et programmez vos messages. L’envoi fonctionne sans
          IA.
        </p>
      </div>
      {params.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400 p-3 text-red-700"
        >
          {params.error.slice(0, 1000)}
        </p>
      )}
      {params.saved && (
        <p role="status" className="rounded-lg border p-3">
          Modification enregistrée.
        </p>
      )}
      <Card>
        <p className="font-semibold">
          {deliveryMode() === "simulation"
            ? "Mode simulé : aucun e-mail réel n’est envoyé"
            : process.env.EMAIL_REAL_SEND_ENABLED === "true"
              ? "Mode SMTP · envoi réel"
              : "Mode SMTP · envoi réel verrouillé"}{" "}
          · {settings.enabled ? "Programmation active" : "En pause"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Worker e-mail du serveur : {heartbeat ? "actif" : "aucun signal récent"} · Dernier
          signal : {dateLabel(settings.workerHeartbeat, settings.timezone)}. Les
          échéances d’e-mail ne sont pas une garantie d’envoi si ce worker est arrêté.
        </p>
      </Card>
      <Card
        className={
          powerState?.status === "failed"
            ? "border-red-400 bg-red-50/60 dark:bg-red-950/20"
            : undefined
        }
      >
        <p className="font-semibold">PC du worker de maquettes</p>
        <p className="mt-2 text-sm">{powerStatus}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Réveil prévu :{" "}
          {dateLabel(
            powerState?.wakeAt ? new Date(powerState.wakeAt * 1000) : null,
            settings.timezone,
          )}
          {typeof powerState?.attempts === "number"
            ? ` · ${powerState.attempts} tentative(s) WOL`
            : ""}
          . Ce statut est distinct du worker e-mail du serveur.
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {[
          ["À valider", count("draft")],
          ["Programmés", count("scheduled")],
          ["Acceptés (réels)", count("sent", false)],
          ["Échecs", count("failed")],
          ["Simulations terminées", count("sent", true)],
          [
            "Prochain créneau",
            dateLabel(next?.scheduledAt ?? null, settings.timezone),
          ],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="underline" href="/commercial/emails">
          Tous les messages
        </Link>
        <Link className="underline" href="/commercial/emails?status=sent">
          Historique des acceptations et simulations
        </Link>
        <Link className="underline" href="/commercial/emails?status=failed">
          Erreurs et vérifications
        </Link>
      </div>
      <Card>
        <form className="flex flex-wrap gap-3">
          <Input
            name="q"
            placeholder="Entreprise, adresse ou objet"
            defaultValue={search}
            className="sm:w-72"
            aria-label="Recherche"
          />
          <select
            aria-label="Statut"
            name="status"
            defaultValue={status ?? ""}
            className="min-w-0 w-full rounded-lg border bg-card p-2 sm:w-auto"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Tri"
            name="sort"
            defaultValue={params.sort ?? "newest"}
            className="min-w-0 w-full rounded-lg border bg-card p-2 sm:w-auto"
          >
            <option value="newest">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="next">Prochain envoi</option>
            <option value="company">Entreprise</option>
          </select>
          <Button variant="secondary">Filtrer</Button>
        </form>
      </Card>
      <form id="bulk-approval" action={approveEmails} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button>Valider les brouillons cochés</Button>
        <span className="text-sm text-muted-foreground">
          50 messages par page · {total} résultat(s)
        </span>
      </form>
      <Card className="overflow-x-auto">
        <ResponsiveTable className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Valider</th>
              <th className="p-2">Entreprise / destinataire</th>
              <th className="p-2">Message</th>
              <th className="p-2">Création</th>
              <th className="p-2">Programmation</th>
              <th className="p-2">Statut</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((message) => (
              <tr key={message.id} className="border-b align-top">
                <td className="p-2">
                  {message.status === "draft" && (
                    <input
                      aria-label={`Valider ${message.companyName}`}
                      form="bulk-approval"
                      name="selected"
                      type="checkbox"
                      value={`${message.id}:${message.version}`}
                    />
                  )}
                </td>
                <td className="p-2">
                  <p className="font-semibold">{message.companyName}</p>
                  <p>{message.recipient}</p>
                </td>
                <td className="max-w-xs p-2">
                  <p className="font-medium">{message.subject}</p>
                  <p className="text-muted-foreground">
                    {message.body.slice(0, 110)}
                    {message.body.length > 110 ? "…" : ""}
                  </p>
                </td>
                <td className="whitespace-nowrap p-2">
                  {dateLabel(message.createdAt, settings.timezone)}
                </td>
                <td className="whitespace-nowrap p-2">
                  {dateLabel(message.scheduledAt, settings.timezone)}
                </td>
                <td className="p-2">
                  {message.status === "sent" && message.simulated
                    ? "Simulation terminée"
                    : statusLabels[message.status]}
                  {suppressedKeys.has(message.recipientKey) && <p className="font-semibold text-red-700">Opposition enregistrée — ne plus contacter</p>}
                  {message.reviewRequired && (
                    <p className="font-semibold text-amber-700">
                      Résultat incertain · contrôle manuel
                    </p>
                  )}
                </td>
                <td className="p-2">
                  <Link
                    className="underline"
                    href={`/commercial/emails/${message.id}`}
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
        {!rows.length && (
          <p className="py-6 text-muted-foreground">
            Aucun message pour ces filtres.
          </p>
        )}
      </Card>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {page > 1 && <Link href={pagination(page - 1)}>← Précédent</Link>}
        <span>Page {page}</span>
        {page * 50 < total && (
          <Link href={pagination(page + 1)}>Suivant →</Link>
        )}
      </div>
      <Card>
        <details>
          <summary className="cursor-pointer font-semibold">
            Créer un brouillon manuellement
          </summary>
          <form action={createEmail} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              Entreprise
              <Input required name="companyName" maxLength={200} />
            </label>
            <label>
              Adresse professionnelle
              <Input required name="recipient" type="email" maxLength={254} />
            </label>
            <label className="sm:col-span-2">
              Objet
              <Input required name="subject" maxLength={300} />
            </label>
            <label className="sm:col-span-2">
              Message
              <Textarea
                required
                name="body"
                minLength={10}
                maxLength={30000}
                rows={8}
              />
            </label>
            <label>
              Site de l’entreprise
              <Input name="companyUrl" type="url" />
            </label>
            <label>
              Maquette VisiPro
              <Input name="mockupUrl" type="url" />
            </label>
            <label className="sm:col-span-2">
              Éléments de personnalisation
              <Textarea name="personalization" maxLength={5000} />
            </label>
            <Button>Créer le brouillon</Button>
          </form>
        </details>
      </Card>
      <p className="text-sm text-muted-foreground">
        Horaires affichés en {settings.timezone}. « Accepté » désigne
        l’acceptation par le fournisseur, sans confirmation de livraison en
        boîte de réception.
      </p>
    </div>
  );
}