# Rapport De Nettoyage

## Résumé

Création d'une version séparée `VisiPro-clean` destinée à Linux. Le projet source `dashboard` n'a pas été supprimé ni déplacé.

## Analyse Effectuée

- Inspection de `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `eslint.config.mjs`, `prisma.config.ts`.
- Inspection des routes App Router sous `src/app`.
- Inspection des composants sous `src/components`.
- Inspection des Server Actions sous `src/features`.
- Inspection des utilitaires sous `src/lib`.
- Inspection Prisma : `prisma/schema.prisma`, `prisma/seed.ts`.
- Recherche des imports statiques et usages des dépendances npm.
- Recherche des éléments Windows : `.exe`, PowerShell, C#, chemins Windows, Docker Compose.

## Fichiers Conservés

### Application

- `src/app/**` : routes actives, layouts, API routes.
- `src/components/**` : composants utilisés par les routes actives.
- `src/features/**` : Server Actions et queries utilisés.
- `src/lib/**` : Prisma, validations, pricing, financial, labels, utils.
- `src/auth.ts`, `middleware.ts` : Auth.js et protection des routes.

### Base De Données

- `prisma/schema.prisma` : modèle complet.
- `prisma/seed.ts` : seed utile pour environnement neuf.
- `prisma.config.ts` : configuration Prisma et seed.

### Config

- `package.json`, `package-lock.json`.
- `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`.
- `vitest.config.ts`, `tests/financial.test.ts` : tests métier utiles.
- `public/favicon.svg`, `public/visipro-logo.svg`.

## Fichiers Non Copiés

- `node_modules/` : dépendances installées par `npm ci`.
- `.next/` : build/cache généré automatiquement.
- `.env` : contient secrets locaux, volontairement exclu.
- `VisiPro Dashboard.exe` : lanceur Windows, non portable Linux.
- `scripts/VisiProLauncher.cs` : code Windows Forms, non portable Linux.
- `scripts/start-visipro.ps1` : PowerShell Windows.
- `scripts/setup-postgres-visipro-admin.ps1` : configuration Windows/admin PostgreSQL.
- `docker-compose.yml` : retiré de la version Linux clean pour éviter la dépendance Docker Desktop ; PostgreSQL local/service externe est documenté.

## Fichiers Supprimés De La Copie Clean

- `src/components/print-button.tsx` : obsolète après remplacement par téléchargement PDF direct.
- `src/components/drag-order-form.tsx` : plus importé après refonte UX des grilles tarifaires.

## Dépendances Conservées

- `next`, `react`, `react-dom` : application Next.js.
- `@prisma/client`, `prisma` : ORM et génération client.
- `next-auth`, `@auth/prisma-adapter`, `bcryptjs` : authentification credentials.
- `zod` : validation serveur.
- `date-fns` : dates métier.
- `lucide-react` : icônes.
- `next-themes` : thème clair/sombre.
- `recharts` : graphiques dashboard.
- `sonner` : toaster global.
- `clsx`, `tailwind-merge` : classes CSS utilitaires.
- `dotenv` : Prisma config charge `.env`.
- `typescript`, `eslint`, `eslint-config-next`, `tailwindcss`, `postcss`, `autoprefixer`, `tsx`, `vitest` : build/dev/test.

## Dépendances Supprimées

- `react-hook-form` : aucune importation détectée dans `src`, config ou tests.

## Adaptations Linux

- Suppression des scripts npm `db:start` / `db:stop` dépendants de Docker Compose.
- Ajout de `install.sh`, `check.sh`, `start.sh` avec shebang Linux.
- Ajout de `.nvmrc` (`20`) et `engines.node >=20.18.0`.
- Ajout de `.env.example` sans secrets réels.
- Ajout d'un `.gitignore` complet pour caches, builds et secrets.
- Documentation PostgreSQL Linux dans `README_LINUX.md`.

## Points D'Incertitude

- `tests/financial.test.ts` et `vitest.config.ts` sont conservés car `npm run test` existe et les tests valident la logique financière.
- `next-env.d.ts` est conservé car attendu par Next/TypeScript, même s'il est générable.
- Le lockfile est conservé et mis à jour pour garantir des installations reproductibles.

## Corrections Pour Linux

- Aucun import à casse manifestement incorrecte n'a été détecté lors du build.
- Aucun chemin `C:\...` n'est conservé dans la copie clean.
- Les scripts Windows et l'exécutable Windows ne sont pas copiés.

## Validation

À exécuter dans `VisiPro-clean` :

```bash
npm ci
npm run lint
npm run test
npm run build
```

Résultats de validation consignés dans la réponse finale de l'agent.

Validation effectuée pendant le nettoyage :

- `npm ci` : OK depuis un dossier sans `node_modules`.
- `npm run db:generate` : OK.
- `npx tsc --noEmit` : OK après génération Prisma.
- `npm run lint` : OK.
- `npm run test` : OK, 5 tests passés.
- `npm run build` : OK.
- `npm run start` : OK, requête `http://localhost:3000` retournée en HTTP 200.
- Test WSL Ubuntu : `install.sh` démarre correctement et s'arrête proprement avec le message attendu lorsque Node.js est absent (`Node.js >= 20.18.0` requis). L'installation complète Linux nécessite donc le prérequis Node documenté.

## Métriques

Mesure hors `node_modules/` et `.next/` :

- Projet original : 98 fichiers, 0,59 MB.
- Projet clean : 96 fichiers, 0,56 MB.
- Fichiers non copiés/supprimés du clean : 2 fichiers applicatifs directs, plus artefacts générés et scripts Windows.
- Dépendances npm supprimées : 1 (`react-hook-form`).

## Routes Vérifiées Par Build

Le build Next.js a compilé les routes principales : dashboard, prospects, clients, pricing, projets, tâches, devis, factures, paiements, abonnements, comptabilité, paramètres, API auth, API exports et API PDF pricing.

## Audit NPM

`npm ci` signale des vulnérabilités transitives npm existantes : 10 vulnérabilités. Elles n'ont pas été corrigées automatiquement pour éviter une mise à jour majeure ou cassante non demandée. À traiter séparément avec audit contrôlé.
