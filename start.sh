#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

PORT="${PORT:-3000}"
DASHBOARD_URL="http://127.0.0.1:${PORT}"
DASHBOARD_PID=""
PID_FILE=".visipro-dashboard.pid"
PORT_FILE=".visipro-dashboard.port"

cleanup() {
  if [[ -n "${DASHBOARD_PID}" ]] && kill -0 "${DASHBOARD_PID}" 2>/dev/null; then
    echo
    echo "Arrêt du dashboard..."
    # Next.js est lancé dans un groupe de processus dédié. Arrêter le groupe
    # évite de laisser le processus enfant `next start` occuper le port.
    kill -- "-${DASHBOARD_PID}" 2>/dev/null || kill "${DASHBOARD_PID}" 2>/dev/null || true
    wait "${DASHBOARD_PID}" 2>/dev/null || true
  fi
  rm -f -- "${PID_FILE}" "${PORT_FILE}"
}

trap cleanup EXIT INT TERM

if ! command -v tailscale >/dev/null 2>&1; then
  echo "Erreur : Tailscale n'est pas installé ou n'est pas dans le PATH." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Erreur : curl est nécessaire pour vérifier le démarrage du dashboard." >&2
  exit 1
fi

if ! command -v setsid >/dev/null 2>&1; then
  echo "Erreur : setsid (paquet util-linux) est nécessaire pour gérer proprement le processus dashboard." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Erreur : le fichier .env est manquant." >&2
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "Aucun build de production trouvé. Lance d'abord : npm run build" >&2
  exit 1
fi

echo "Démarrage du dashboard sur ${DASHBOARD_URL}..."
# Ne pas passer par `npm run start`, qui crée un processus enfant pouvant
# survivre à npm. `setsid` crée un groupe que cleanup arrête entièrement.
PORT="${PORT}" setsid node node_modules/next/dist/bin/next start &
DASHBOARD_PID=$!
printf '%s\n' "${DASHBOARD_PID}" > "${PID_FILE}"
printf '%s\n' "${PORT}" > "${PORT_FILE}"

for _ in {1..30}; do
  if curl --silent --fail --output /dev/null "${DASHBOARD_URL}"; then
    break
  fi

  if ! kill -0 "${DASHBOARD_PID}" 2>/dev/null; then
    wait "${DASHBOARD_PID}" || true
    echo "Erreur : le dashboard s'est arrêté pendant son démarrage." >&2
    exit 1
  fi

  sleep 1
done

if ! curl --silent --fail --output /dev/null "${DASHBOARD_URL}"; then
  echo "Erreur : le dashboard ne répond pas après 30 secondes." >&2
  exit 1
fi

if ! kill -0 "${DASHBOARD_PID}" 2>/dev/null; then
  wait "${DASHBOARD_PID}" || true
  echo "Erreur : un autre programme répond sur ${DASHBOARD_URL}, mais le nouveau dashboard n'a pas démarré." >&2
  exit 1
fi

echo "Dashboard prêt. Activation du tunnel public Tailscale Funnel..."
echo "Laisse ce terminal ouvert. Ctrl+C arrêtera le dashboard et le tunnel."
echo

# Funnel reste au premier plan : sa fermeture déclenche aussi l'arrêt du dashboard.
sudo tailscale funnel "${PORT}"
