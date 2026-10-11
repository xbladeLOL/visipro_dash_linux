#!/usr/bin/env bash
set -euo pipefail

APP_DB_NAME="${VISIPRO_DB_NAME:-visipro}"
APP_DB_USER="${VISIPRO_DB_USER:-visipro}"
APP_DB_PASSWORD="${VISIPRO_DB_PASSWORD:-visipro_local_password}"

step() {
  echo ""
  echo "$1"
}

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "sudo est requis pour installer/configurer PostgreSQL. Installe sudo ou lance ce script avec un utilisateur administrateur."
    exit 1
  fi
}

run_as_postgres() {
  if [ "$(id -u)" -eq 0 ]; then
    runuser -u postgres -- "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo -u postgres "$@"
  else
    echo "sudo est requis pour exécuter une commande en tant qu'utilisateur postgres."
    exit 1
  fi
}

install_postgresql() {
  if command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL client détecté: $(psql --version)"
  else
    echo "PostgreSQL introuvable. Installation de PostgreSQL..."
    if command -v apt-get >/dev/null 2>&1; then
      run_sudo apt-get update
      run_sudo apt-get install -y postgresql postgresql-client
    elif command -v dnf >/dev/null 2>&1; then
      run_sudo dnf install -y postgresql-server postgresql
      if [ ! -d /var/lib/pgsql/data/base ]; then
        run_sudo postgresql-setup --initdb
      fi
    elif command -v pacman >/dev/null 2>&1; then
      run_sudo pacman -Sy --noconfirm postgresql
      if [ ! -d /var/lib/postgres/data/base ]; then
        run_as_postgres initdb -D /var/lib/postgres/data
      fi
    else
      echo "Gestionnaire de paquets non reconnu. Installe PostgreSQL manuellement puis relance ./install.sh."
      exit 1
    fi
  fi

  echo "Démarrage/activation du service PostgreSQL..."
  if command -v systemctl >/dev/null 2>&1; then
    if systemctl list-unit-files | grep -q '^postgresql.service'; then
      run_sudo systemctl enable --now postgresql
    elif systemctl list-unit-files | grep -q '^postgresql@'; then
      run_sudo systemctl enable --now postgresql
    elif systemctl list-unit-files | grep -q '^postgresql-[0-9]'; then
      unit="$(systemctl list-unit-files | awk '/^postgresql-[0-9]+\.service/ {print $1; exit}')"
      run_sudo systemctl enable --now "$unit"
    else
      run_sudo service postgresql start || true
    fi
  else
    run_sudo service postgresql start || true
  fi
}

configure_postgresql() {
  echo "Configuration de la base PostgreSQL '$APP_DB_NAME' et de l'utilisateur '$APP_DB_USER'..."
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql reste introuvable après installation."
    exit 1
  fi

  run_as_postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}';
  ELSE
    ALTER ROLE ${APP_DB_USER} WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${APP_DB_NAME} OWNER ${APP_DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${APP_DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${APP_DB_NAME} TO ${APP_DB_USER};
SQL

  export PGPASSWORD="$APP_DB_PASSWORD"
  if psql -h localhost -U "$APP_DB_USER" -d "$APP_DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "Connexion PostgreSQL VisiPro OK."
  else
    echo "La base a été créée, mais la connexion par mot de passe a échoué. Vérifie pg_hba.conf/authentification PostgreSQL."
    exit 1
  fi
}

step "[1/8] Vérification de l'OS"
case "$(uname -s)" in
  Linux*) ;;
  *) echo "Ce script est prévu pour Linux."; exit 1 ;;
esac

step "[2/8] Vérification de Node.js et npm"
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

step "[3/8] Installation/configuration PostgreSQL"
install_postgresql
configure_postgresql

step "[4/8] Configuration de l'environnement"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env créé depuis .env.example. Vérifie AUTH_SECRET et DATABASE_URL avant production."
fi
if grep -q '^DATABASE_URL=' .env; then
  echo "DATABASE_URL déjà présent dans .env."
else
  echo "DATABASE_URL=postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@localhost:5432/${APP_DB_NAME}?schema=public" >> .env
fi
if ! grep -q '^PROSPECT_ENGINE_URL=' .env; then
  ENGINE_URL="${VISIPRO_PROSPECT_ENGINE_URL:-http://127.0.0.1:8080}"
  if [ -t 0 ]; then
    read -r -p "URL du moteur de prospection [$ENGINE_URL] : " ENGINE_URL_INPUT
    ENGINE_URL="${ENGINE_URL_INPUT:-$ENGINE_URL}"
  fi
  echo "PROSPECT_ENGINE_URL=$ENGINE_URL" >> .env
fi
if ! grep -q '^PROSPECT_ENGINE_API_KEY=' .env; then
  ENGINE_KEY="${VISIPRO_PROSPECT_ENGINE_API_KEY:-}"
  if [ -t 0 ] && [ -z "$ENGINE_KEY" ]; then
    read -r -s -p "Clé API affichée par installer.sh du moteur de prospection : " ENGINE_KEY
    echo ""
  fi
  if [ -n "$ENGINE_KEY" ]; then
    echo "PROSPECT_ENGINE_API_KEY=$ENGINE_KEY" >> .env
  else
    echo "PROSPECT_ENGINE_API_KEY=configure_engine_key" >> .env
    echo "Attention : renseigne PROSPECT_ENGINE_API_KEY dans .env avant d'utiliser Détection."
  fi
fi

step "[5/8] Installation des dépendances npm"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

step "[6/8] Prisma generate"
npm run db:generate

step "[7/8] Initialisation du schéma Prisma"
npm run db:push

step "[8/8] Terminé"
echo "Pour charger les données démo: npm run db:seed"
echo "Installation terminée. Lance: npm run dev"
