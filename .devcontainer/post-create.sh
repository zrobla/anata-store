#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_VENV="$BACKEND_DIR/.anata"

echo "[codespaces] post-create: setup backend"
cd "$BACKEND_DIR"
if [[ ! -d "$BACKEND_VENV" ]]; then
  python3 -m venv "$BACKEND_VENV"
fi
source "$BACKEND_VENV/bin/activate"
python -m pip install --upgrade pip
pip install -r requirements.txt
if [[ ! -f ".env" && -f ".env.example" ]]; then
  cp .env.example .env
fi
python manage.py migrate
python manage.py seed_rbac
python manage.py seed_demo_store
if [[ -f "catalog/data/produits.txt" ]]; then
  python manage.py import_products_txt --file "catalog/data/produits.txt" --media-base-url "http://127.0.0.1:8000"
fi

echo "[codespaces] post-create: setup frontend"
cd "$FRONTEND_DIR"
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
fi
pnpm install
if [[ ! -f ".env.local" && -f ".env.example" ]]; then
  cp .env.example .env.local
fi

echo "[codespaces] post-create: done"
