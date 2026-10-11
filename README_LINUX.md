# VisiPro Dashboard - Linux

## Prérequis

- Linux x86_64.
- Node.js `>=20.18.0` et npm `>=10`.
- PostgreSQL local ou installable via le script.
- Git recommandé mais non obligatoire.

Le projet n'utilise pas Docker dans cette version clean. `install.sh` peut installer et configurer PostgreSQL localement sur les distributions Linux courantes.

## Installation

```bash
chmod +x install.sh check.sh start.sh stop.sh
./install.sh
```

Le script :

- vérifie Linux ;
- vérifie Node.js/npm ;
- installe PostgreSQL si `psql` est absent (`apt`, `dnf` ou `pacman`) ;
- démarre/active le service PostgreSQL ;
- crée l'utilisateur `visipro` et la base `visipro` ;
- crée `.env` depuis `.env.example` si absent ;
- demande l'URL et la clé API du moteur de prospection ;
- installe les dépendances avec `npm ci` ;
- lance `prisma generate` ;
- lance `prisma db push`.

Tu peux personnaliser la base créée via variables d'environnement avant installation :

```bash
VISIPRO_DB_NAME=visipro VISIPRO_DB_USER=visipro VISIPRO_DB_PASSWORD=mot_de_passe ./install.sh
```

## Configuration

Édite `.env` :

```env
DATABASE_URL="postgresql://visipro:visipro_local_password@localhost:5432/visipro?schema=public"
AUTH_SECRET="une-valeur-longue-et-secrete"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PROSPECT_ENGINE_URL="http://127.0.0.1:8080"
PROSPECT_ENGINE_API_KEY="clé affichée par l'installateur du moteur"
```

Générer un secret :

```bash
openssl rand -base64 32
```

## Base De Données

`install.sh` crée automatiquement :

- base : `visipro`
- utilisateur : `visipro`
- mot de passe : `visipro_local_password`

Configuration manuelle équivalente si tu ne veux pas que le script le fasse :

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE visipro LOGIN PASSWORD 'visipro_local_password';
CREATE DATABASE visipro OWNER visipro;
\q
```

Puis, si installation manuelle :

```bash
npm run db:push
npm run db:seed
```

Compte seed : `admin@visipro.local` / `visipro-demo`.

## Lancement Développement

```bash
npm run dev
```

Ouvrir : `http://localhost:3000`.

## Prospection automatisée

Installe d'abord `visipro-prospect-engine` avec son fichier `installer.sh`. Copie la clé API affichée à la fin dans `PROSPECT_ENGINE_API_KEY`. Dans le dashboard, ouvre **Commercial → Détection** pour lancer une recherche, suivre son avancement, filtrer les scores et transférer un candidat validé vers le CRM.

Si le dashboard et le moteur tournent sur le même serveur, conserve `PROSPECT_ENGINE_URL=http://127.0.0.1:8080`. La clé reste uniquement côté serveur et n'est jamais exposée au navigateur.

## Build Production

```bash
npm run build
```

## Lancement Production

```bash
npm run build
./start.sh
```

`start.sh` lance ensemble :

- le dashboard Next.js sur le port `3000` ;
- le tunnel public Tailscale Funnel vers ce même port.

Le script demande le mot de passe `sudo` au moment d'activer Funnel. Laisse le terminal ouvert. `Ctrl+C` arrête le tunnel et le dashboard.

Pour utiliser un autre port :

```bash
PORT=3003 ./start.sh
```

Le tunnel est alors automatiquement dirigé vers le port `3003`.

## Diagnostic

```bash
./check.sh
```

## Mise À Jour

```bash
npm ci
npm run db:generate
npm run build
```

Si le schéma Prisma change :

```bash
npm run db:push
```

## Problèmes Courants

- `DATABASE_URL is missing` : vérifier `.env`.
- `password authentication failed` : vérifier utilisateur/mot de passe PostgreSQL.
- `database does not exist` : créer la base `visipro`.
- `sudo est requis` : l'installation PostgreSQL nécessite des droits administrateur.
- `Gestionnaire de paquets non reconnu` : installe PostgreSQL manuellement puis relance `./install.sh`.
- `Prisma Client did not initialize` : lancer `npm run db:generate`.
- Port `3000` occupé : lancer avec `PORT=3001 npm run dev`.

## Exports PDF

Les exports PDF sont générés côté serveur sans navigateur headless. Aucun paquet système Playwright/Puppeteer n'est requis.
