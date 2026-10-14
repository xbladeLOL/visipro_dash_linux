#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

SERVICE_NAME="visipro-dashboard.service"
TEMPLATE_FILE="visipro-dashboard.service.template"
PROJECT_DIR=$(pwd -P)
SERVICE_USER=$(id -un)
SERVICE_GROUP=$(id -gn)
NODE_BIN=$(command -v node || true)

if [[ -z "${NODE_BIN}" ]]; then
  echo "Erreur : Node.js n'est pas installé ou n'est pas dans le PATH." >&2
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  echo "Erreur : systemd n'est pas disponible sur ce serveur." >&2
  exit 1
fi

if ! command -v tailscale >/dev/null 2>&1; then
  echo "Erreur : Tailscale n'est pas installé ou n'est pas dans le PATH." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Erreur : le fichier .env est manquant." >&2
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "Création du build de production..."
  npm run build
fi

for value in "${PROJECT_DIR}" "${SERVICE_USER}" "${SERVICE_GROUP}" "${NODE_BIN}"; do
  if [[ "${value}" == *$'\n'* || "${value}" == *'&'* || "${value}" == *'|'* ]]; then
    echo "Erreur : une valeur système contient un caractère non pris en charge." >&2
    exit 1
  fi
done

UNIT_FILE=$(mktemp)
trap 'rm -f -- "${UNIT_FILE}"' EXIT

sed \
  -e "s|__USER__|${SERVICE_USER}|g" \
  -e "s|__GROUP__|${SERVICE_GROUP}|g" \
  -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
  -e "s|__NODE_BIN__|${NODE_BIN}|g" \
  "${TEMPLATE_FILE}" > "${UNIT_FILE}"

echo "Installation du service ${SERVICE_NAME}..."
sudo install -m 0644 "${UNIT_FILE}" "/etc/systemd/system/${SERVICE_NAME}"
sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"

echo "Activation persistante de Tailscale Funnel vers le port 3003..."
sudo tailscale funnel --bg 3003

echo
echo "Installation terminée."
echo "Le dashboard reste actif après déconnexion SSH et redémarre avec le serveur."
echo "Adresse publique : sudo tailscale funnel status"
echo "État : sudo systemctl status ${SERVICE_NAME}"
echo "Logs : journalctl -u ${SERVICE_NAME} -f"
