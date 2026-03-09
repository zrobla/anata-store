#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_VENV="$BACKEND_DIR/.anata"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

RUNTIME_DIR="$ROOT_DIR/.devcontainer/runtime"
LOG_DIR="$ROOT_DIR/.devcontainer/logs"
mkdir -p "$RUNTIME_DIR" "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"

if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  BACKEND_PUBLIC_URL="https://${CODESPACE_NAME}-${BACKEND_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  FRONTEND_PUBLIC_URL="https://${CODESPACE_NAME}-${FRONTEND_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  BACKEND_PUBLIC_URL="http://127.0.0.1:${BACKEND_PORT}"
  FRONTEND_PUBLIC_URL="http://127.0.0.1:${FRONTEND_PORT}"
fi

ensure_backend_env() {
  cd "$BACKEND_DIR"
  if [[ ! -d "$BACKEND_VENV" ]]; then
    python3 -m venv "$BACKEND_VENV"
  fi
  source "$BACKEND_VENV/bin/activate"
  if ! python -c "import django" >/dev/null 2>&1; then
    pip install -r requirements.txt >/dev/null
  fi

  if [[ ! -f ".env" && -f ".env.example" ]]; then
    cp .env.example .env
  fi

  # Keep backend reachable from forwarded Codespaces hostnames.
  if grep -q '^DJANGO_ALLOWED_HOSTS=' .env; then
    sed -i 's/^DJANGO_ALLOWED_HOSTS=.*/DJANGO_ALLOWED_HOSTS=*/' .env
  else
    echo "DJANGO_ALLOWED_HOSTS=*" >>.env
  fi

  python manage.py migrate >/dev/null
  python manage.py seed_rbac >/dev/null

  if ! python manage.py shell -c 'from catalog.models import Category, Product; import sys; sys.exit(0 if Category.objects.exists() and Product.objects.filter(is_active=True).exists() else 1)' >/dev/null 2>&1; then
    python manage.py seed_demo_store >/dev/null
  fi

  local multibrand_seed_file="$BACKEND_DIR/catalog/data/produits.txt"
  if [[ -f "$multibrand_seed_file" ]]; then
    if ! python manage.py shell -c 'from catalog.models import Brand; import sys; sys.exit(0 if Brand.objects.filter(is_active=True).exclude(slug="samsung").exists() else 1)' >/dev/null 2>&1; then
      python manage.py import_products_txt --file "$multibrand_seed_file" --media-base-url "http://127.0.0.1:${BACKEND_PORT}" >/dev/null
    fi
  fi
}

write_frontend_env() {
  local env_file="$FRONTEND_DIR/.env.local"
  cat >"$env_file" <<EOF
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_SITE_URL=${FRONTEND_PUBLIC_URL}
INTERNAL_API_ORIGIN=http://127.0.0.1:${BACKEND_PORT}
NEXT_PUBLIC_WHATSAPP_NUMBER=2250700000000
NEXT_PUBLIC_WHATSAPP_PREFILL=Bonjour Anata Store, je veux des conseils pour choisir mon smartphone selon mon budget.
EOF
}

ensure_frontend_deps() {
  cd "$FRONTEND_DIR"
  if [[ ! -d "node_modules" ]]; then
    if command -v corepack >/dev/null 2>&1; then
      corepack enable || true
    fi
    pnpm install >/dev/null
  fi
}

is_port_busy() {
  local port="$1"
  ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$port$"
}

is_pid_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

start_backend() {
  if is_pid_running "$BACKEND_PID_FILE"; then
    return 0
  fi
  if is_port_busy "$BACKEND_PORT"; then
    return 0
  fi

  cd "$BACKEND_DIR"
  # shellcheck disable=SC1090
  source "$BACKEND_VENV/bin/activate"
  nohup python manage.py runserver "0.0.0.0:${BACKEND_PORT}" --noreload >"$BACKEND_LOG" 2>&1 &
  echo "$!" >"$BACKEND_PID_FILE"
}

start_frontend() {
  if is_pid_running "$FRONTEND_PID_FILE"; then
    return 0
  fi
  if is_port_busy "$FRONTEND_PORT"; then
    return 0
  fi

  cd "$FRONTEND_DIR"
  nohup pnpm dev --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
  echo "$!" >"$FRONTEND_PID_FILE"
}

ensure_backend_env
ensure_frontend_deps
write_frontend_env
start_backend
start_frontend

cat <<EOF
[codespaces] Services ready
- Frontend: ${FRONTEND_PUBLIC_URL}
- Backend API proxy: ${FRONTEND_PUBLIC_URL}/api/v1
- Backend direct: ${BACKEND_PUBLIC_URL}/api/v1
- Logs: ${LOG_DIR}
EOF
