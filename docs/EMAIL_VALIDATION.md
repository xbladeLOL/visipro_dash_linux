# Validation — E-mails de prospection VisiPro

Date : 22 octobre 2026. Dossier travaillé : `C:\Users\xblad\Desktop\VisiPro-dev`.

## Résultat

Intégration fonctionnelle de développement : stockage PostgreSQL, import sécurisé de brouillons, interface, programmation, exclusions, historique et worker autonome. Aucun e-mail réel envoyé. Aucun déploiement, transfert vers le clone propre ou push Git effectué.

Configuration initiale : simulation, programmation désactivée, cinq heures entre tentatives, deux tentatives quotidiennes, lundi–vendredi de 09:00 à 18:00, Europe/Paris.

## Vérifications réalisées

| Vérification | Résultat |
| --- | --- |
| Installation reproductible (`npm ci`) et génération Prisma | Réussies |
| TypeScript strict (`tsc --noEmit`) | Réussi |
| ESLint du dashboard | Réussi, zéro erreur et zéro avertissement |
| Build de production Next.js 15.5.27 | Réussi, nouvelles routes compilées |
| Tests automatisés | 36 réussis : 5 financiers existants, 10 planificateur/validation/fournisseur, 3 permissions, 18 intégration PostgreSQL |
| Installation des migrations sur base vide | Réussie |
| Migration additive sur schéma historique contenant un client fictif | Client conservé |
| Arrêt et redémarrage effectif de PostgreSQL de test | Tables et données persistantes conservées |
| Deux workers concurrents | Une seule transmission réservée |
| Arrêt/redémarrage d'un processus worker | Pas de doublon ; intervalle toujours appliqué |
| Résultat réseau incertain ou worker interrompu | Blocage et contrôle manuel ; pas de réessai automatique |
| Changement de paramètres en cours de transmission | Prochains départs arrêtés ; transmission engagée conservée |
| Changement de simulation vers SMTP | Nouvelle approbation requise avant tout départ |
| Parcours Microsoft Edge sans interface visible | Réussi : connexion, import API, modification, approbation individuelle/multiple, paramètres, worker simulé, historique, opposition publique |
| Contrôle visuel des captures | Interface cohérente avec le dashboard existant |

Le test navigateur démarre le build de production, un vrai processus worker et un vrai serveur PostgreSQL isolé. Les seules réponses d'envoi proviennent du simulateur local. Les processus créés pour ce test sont arrêtés à la fin.

La protection des routes a aussi été corrigée : le middleware historique à la racine n'était pas chargé avec l'arborescence `src/app`. Il est maintenant dans `src/middleware.ts`, en runtime Node.js, avec une configuration partagée indépendante de Prisma. L'accès anonyme aux pages protégées redirige réellement vers la connexion. L'import et l'opposition appliquent leur propre authentification.

## Fichiers concernés

- `prisma/schema.prisma` : cinq modèles et deux enums e-mails.
- `prisma/migrations/20261022000100_existing_schema/migration.sql` : baseline historique.
- `prisma/migrations/20261022000200_email_prospection/migration.sql` : migration additive.
- `prisma/migrations/migration_lock.toml`.
- `src/lib/email/access.ts`, `validation.ts`, `schedule.ts`, `store.ts`, `provider.ts`, `worker.ts`, `unsubscribe.ts`, `display.ts` : permissions, contrôles, planification, stockage et envoi.
- `src/features/emails/actions.ts` : actions authentifiées de l'interface.
- `src/app/(app)/commercial/emails/layout.tsx`.
- `src/app/(app)/commercial/emails/page.tsx` : file, compteurs, filtres, tri, pagination, validation multiple et création manuelle.
- `src/app/(app)/commercial/emails/[id]/page.tsx` : contenu, édition, validation, programmation, annulation, exclusion et tentatives.
- `src/app/(app)/commercial/emails/settings/page.tsx` : programmation et conservation.
- `src/app/api/email-drafts/route.ts` : import JSON authentifié, limité et idempotent.
- `src/app/email-unsubscribe/[token]/page.tsx` : confirmation publique d'opposition.
- `src/auth.config.ts`, `src/auth.ts`, `src/middleware.ts` : configuration partagée et protection effective des routes ; ancien `middleware.ts` déplacé sous `src/`.
- `src/components/app-sidebar.tsx` : menu Prospection → E-mails.
- `scripts/email-worker.ts` : processus permanent.
- `scripts/test-emails.ts`, `scripts/test-email-browser.ts` : bancs de test isolés.
- `tests/email/schedule.test.ts`, `access.test.ts`, `integration.test.ts`.
- `visipro-email-worker.service.template` : modèle systemd, non installé.
- `package.json`, `package-lock.json`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `README.md`.
- `docs/EMAIL_PROSPECTION.md` : utilisation, API, sécurité, limites, migrations et tests.

Les scripts autonomes déjà présents sous `prospection/` sont exclus des outils du dashboard. Ils ne sont pas modifiés.

## Captures des données fictives

- `../.email-test-results/email-queue.png`
- `../.email-test-results/email-settings.png`
- `../.email-test-results/email-history.png`

## Limites et décisions restant à prendre

1. Le fournisseur réel et l'adresse expéditrice n'ont pas été fournis. L'adaptateur SMTP est implémenté, mais aucune connexion ni livraison auprès d'un fournisseur réel n'a été testée. L'activation réelle demeure verrouillée par défaut.
2. La réception des réponses et rebonds n'est pas connectée. Une réponse est signalée manuellement pour arrêter les sollicitations. « Accepté » ne signifie pas « livré ».
3. Un seul message est autorisé par adresse. La suppression efface le contenu et conserve une empreinte pour prévenir sa réimportation. Aucun outil de campagne de relances n'a été ajouté.
4. Une transmission déjà engagée ne peut pas être rappelée. Un résultat incertain exige la vérification des journaux du fournisseur avant toute remise en brouillon.
5. Le service systemd n'a pas été exécuté sur Ubuntu. La migration de production, sa baseline, la sauvegarde/restauration et la configuration du fournisseur devront être vérifiées sur une copie avant déploiement autorisé.
6. L'audit npm effectué après mise à jour indique encore **15 vulnérabilités : 12 élevées, 3 modérées, aucune critique** dans les dépendances de l'application et de ses outils (notamment chaînes Prisma, Tailwind/PostCSS, sharp et Next.js). Le transport SMTP introduit utilise une version corrigée isolée. L'audit résiduel doit être traité et réévalué avant de qualifier l'ensemble de prêt pour la production ; aucune correction majeure forcée n'a été appliquée.
7. La politique de conservation et les informations données aux prospects doivent être validées pour l'activité réelle. Le nettoyage est manuel, avec confirmation ; aucune donnée métier préexistante n'a été supprimée pendant le développement.

## Suite proposée

Revoir cette version Desktop et les captures, confirmer le fournisseur et l'identité expéditrice, puis autoriser séparément la préparation du transfert vers le clone GitHub propre. Le déploiement Ubuntu et tout essai d'envoi réel restent soumis à une autorisation explicite.
