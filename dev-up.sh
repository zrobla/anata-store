#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
SKIP_FRONT_INSTALL="${SKIP_FRONT_INSTALL:-0}"
SEED_DEMO_STORE="${SEED_DEMO_STORE:-1}"
SEED_DOWNLOAD_IMAGES="${SEED_DOWNLOAD_IMAGES:-1}"
SEED_CLEAR_EXISTING="${SEED_CLEAR_EXISTING:-1}"
FRONT_API_BASE_URL="${FRONT_API_BASE_URL:-http://127.0.0.1:${BACKEND_PORT}/api/v1}"

BACKEND_PID=""
FRONTEND_PID=""

is_port_busy() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$port$"
    return $?
  fi
  return 1
}

show_port_listener() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P || true
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp | grep -E "(^|:)$port\\s" || true
  fi
}

sync_frontend_api_base() {
  local env_file="$FRONTEND_DIR/.env.local"
  local tmp_file
  tmp_file="$(mktemp)"

  if [[ -f "$env_file" ]]; then
    grep -v '^NEXT_PUBLIC_API_BASE_URL=' "$env_file" >"$tmp_file" || true
  fi
  echo "NEXT_PUBLIC_API_BASE_URL=${FRONT_API_BASE_URL}" >>"$tmp_file"
  mv "$tmp_file" "$env_file"
}

cleanup() {
  echo ""
  echo "[dev-up] Arret des services..."
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev-up] Verification backend..."
if [[ ! -d "$BACKEND_DIR/.anata" ]]; then
  echo "[dev-up] .anata absent, creation du venv..."
  python3 -m venv "$BACKEND_DIR/.anata"
fi

(
  cd "$BACKEND_DIR"
  source .anata/bin/activate
  if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
    cp .env.example .env
  fi
  python manage.py check
  python manage.py migrate
  python manage.py seed_rbac
  if [[ "$SEED_DEMO_STORE" == "1" ]]; then
    seed_args=(seed_demo_store --media-base-url "http://127.0.0.1:${BACKEND_PORT}")
    if [[ "$SEED_CLEAR_EXISTING" == "1" ]]; then
      seed_args+=(--clear-existing)
    fi
    if [[ "$SEED_DOWNLOAD_IMAGES" == "1" ]]; then
      seed_args+=(--download-images)
    fi
    python manage.py "${seed_args[@]}"
  fi
)

if is_port_busy "$BACKEND_PORT"; then
  echo "[dev-up] Port backend ${BACKEND_PORT} deja utilise."
  echo "[dev-up] Processus detecte sur ce port:"
  show_port_listener "$BACKEND_PORT"
  echo "[dev-up] Arrete le process en cours ou change BACKEND_PORT."
  exit 1
fi

echo "[dev-up] Verification frontend..."
sync_frontend_api_base
echo "[dev-up] NEXT_PUBLIC_API_BASE_URL -> ${FRONT_API_BASE_URL}"

if [[ "$SKIP_FRONT_INSTALL" != "1" ]] && [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "[dev-up] Installation frontend (pnpm install)..."
  (
    cd "$FRONTEND_DIR"
    pnpm install
  )
fi

if [[ "$SKIP_FRONT_INSTALL" == "1" ]] && [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "[dev-up] SKIP_FRONT_INSTALL=1 mais node_modules est absent."
  echo "[dev-up] Installe d'abord les deps frontend (pnpm install ou npm install)."
  exit 1
fi

if is_port_busy "$FRONTEND_PORT"; then
  echo "[dev-up] Port frontend ${FRONTEND_PORT} deja utilise."
  echo "[dev-up] Processus detecte sur ce port:"
  show_port_listener "$FRONTEND_PORT"
  echo "[dev-up] Arrete le process en cours ou change FRONTEND_PORT."
  exit 1
fi

echo "[dev-up] Backend Django -> http://127.0.0.1:${BACKEND_PORT}"
bash -lc "cd \"$BACKEND_DIR\" && source .anata/bin/activate && python manage.py runserver 0.0.0.0:${BACKEND_PORT}" &
BACKEND_PID=$!

echo "[dev-up] Frontend Next.js -> http://127.0.0.1:${FRONTEND_PORT}"
if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
  bash -lc "cd \"$FRONTEND_DIR\" && pnpm dev --port ${FRONTEND_PORT}" &
else
  echo "[dev-up] node_modules absent, tentative npm install..."
  bash -lc "cd \"$FRONTEND_DIR\" && npm install && npm run dev -- --port ${FRONTEND_PORT}" &
fi
FRONTEND_PID=$!

echo "[dev-up] Services lances."
echo "[dev-up] Ctrl+C pour arreter."

wait "$BACKEND_PID" "$FRONTEND_PID"
