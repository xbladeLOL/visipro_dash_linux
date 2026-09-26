#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Vérification de l'OS"
case "$(uname -s)" in
  Linux*) ;;
  *) echo "Ce script est prévu pour Linux."; exit 1 ;;
esac

echo "[2/6] Vérification de Node.js et npm"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est introuvable. Installe Node.js >= 20.18.0 via nvm ou NodeSource, puis relance ce script."
  exit 1
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >= 20 est requis. Version actuelle: $(node --version)"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm est introuvable."
  exit 1
fi

echo "[3/6] Configuration de l'environnement"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env créé depuis .env.example. Vérifie AUTH_SECRET et DATABASE_URL avant production."
fi

echo "[4/6] Installation des dépendances npm"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[5/6] Prisma"
npm run db:generate

echo "[6/6] Base de données"
if command -v psql >/dev/null 2>&1; then
  echo "psql détecté. Vérifie que PostgreSQL tourne et que DATABASE_URL pointe vers une base existante."
else
  echo "psql introuvable. Installe PostgreSQL client/serveur si nécessaire."
fi
echo "Pour initialiser le schéma: npm run db:push"
echo "Pour charger les données démo: npm run db:seed"
echo "Installation terminée. Lance: npm run dev"
