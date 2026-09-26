#!/usr/bin/env bash
set -euo pipefail

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
test -f .env && echo ".env: OK" || echo ".env: MANQUANT"
npm run db:generate >/dev/null && echo "Prisma generate: OK"
if command -v psql >/dev/null 2>&1; then
  echo "psql: $(psql --version)"
else
  echo "psql: non installé ou hors PATH"
fi
npm run lint
