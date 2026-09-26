# VisiPro Dashboard

Version clean et portable Linux du dashboard interne VisiPro.

Stack : Next.js App Router, TypeScript strict, Prisma, PostgreSQL, Auth.js, Tailwind CSS, Recharts.

## Démarrage Rapide Linux

```bash
chmod +x install.sh check.sh start.sh
./install.sh
```

Configure `.env`, puis :

```bash
npm run db:push
npm run db:seed
npm run dev
```

Documentation détaillée : `README_LINUX.md`.

## Commandes

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run db:generate
npm run db:push
npm run db:seed
```

## Sécurité

Le fichier `.env` réel n'est pas versionné. Utilise `.env.example` comme modèle.
