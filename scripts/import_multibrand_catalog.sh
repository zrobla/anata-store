#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="${PYTHON_BIN:-$BACKEND_DIR/.anata/bin/python}"
PRODUCTS_FILE="${PRODUCTS_FILE:-$BACKEND_DIR/catalog/data/produits.txt}"
MEDIA_BASE_URL="${MEDIA_BASE_URL:-http://127.0.0.1:8000}"
DOWNLOAD_IMAGES="${DOWNLOAD_IMAGES:-0}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[import-multibrand] Python introuvable: $PYTHON_BIN" >&2
  exit 1
fi

if [[ ! -f "$PRODUCTS_FILE" ]]; then
  echo "[import-multibrand] Fichier produits introuvable: $PRODUCTS_FILE" >&2
  exit 1
fi

cd "$BACKEND_DIR"

args=(
  manage.py
  import_products_txt
  --file "$PRODUCTS_FILE"
  --media-base-url "$MEDIA_BASE_URL"
)

if [[ "$DOWNLOAD_IMAGES" == "1" ]]; then
  args+=(--download-images)
fi

"$PYTHON_BIN" "${args[@]}"

