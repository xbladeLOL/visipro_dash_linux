#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
PID_FILE=".visipro-dashboard.pid"
PORT_FILE=".visipro-dashboard.port"
PORT="${PORT:-}"

if [[ -z "${PORT}" && -f "${PORT_FILE}" ]]; then PORT=$(tr -cd '0-9' < "${PORT_FILE}"); fi
PORT="${PORT:-3000}"

echo "Arrêt du tunnel Tailscale Funnel..."
if command -v tailscale >/dev/null 2>&1; then sudo tailscale funnel reset >/dev/null 2>&1 || true; fi

if [[ -f "${PID_FILE}" ]]; then
  DASHBOARD_PID=$(tr -cd '0-9' < "${PID_FILE}")
  if [[ -n "${DASHBOARD_PID}" ]] && kill -0 "${DASHBOARD_PID}" 2>/dev/null; then
    COMMAND=$(tr '\0' ' ' < "/proc/${DASHBOARD_PID}/cmdline" 2>/dev/null || true)
    if [[ "${COMMAND}" == *"next"* ]]; then
      echo "Arrêt du groupe Next.js ${DASHBOARD_PID}..."
      kill -- "-${DASHBOARD_PID}" 2>/dev/null || kill "${DASHBOARD_PID}" 2>/dev/null || true
      for _ in {1..10}; do kill -0 "${DASHBOARD_PID}" 2>/dev/null || break; sleep 1; done
    else
      echo "Le PID enregistré ne correspond plus à Next.js, il n'est pas arrêté."
    fi
  fi
fi

# Nettoie aussi les processus orphelins créés par les anciennes versions.
if command -v fuser >/dev/null 2>&1 && fuser "${PORT}/tcp" >/dev/null 2>&1; then
  echo "Libération du port ${PORT} encore occupé..."
  sudo fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

rm -f -- "${PID_FILE}" "${PORT_FILE}"
if command -v fuser >/dev/null 2>&1 && fuser "${PORT}/tcp" >/dev/null 2>&1; then echo "Erreur : le port ${PORT} est toujours occupé." >&2; exit 1; fi
echo "Dashboard et tunnel arrêtés. Le port ${PORT} est libre."
