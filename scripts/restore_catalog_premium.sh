#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="${PYTHON_BIN:-$BACKEND_DIR/.anata/bin/python}"
RECO_FILE="${RECO_FILE:-$ROOT_DIR/reco-100-produits.md}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[restore-catalog] Python introuvable: $PYTHON_BIN" >&2
  exit 1
fi

if [[ ! -f "$RECO_FILE" ]]; then
  echo "[restore-catalog] Fichier reco introuvable: $RECO_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "[restore-catalog] Import multimarques..."
bash "$ROOT_DIR/scripts/import_multibrand_catalog.sh"

echo "[restore-catalog] Application Top100..."
"$PYTHON_BIN" "$BACKEND_DIR/manage.py" shell -c "
from pathlib import Path
from catalog.models import Product, ProductVariant

content = Path('$RECO_FILE').read_text(encoding='utf-8')
start = content.index('TOP100_SLUGS_START') + len('TOP100_SLUGS_START')
end = content.index('TOP100_SLUGS_END')
target = {line.strip() for line in content[start:end].splitlines() if line.strip()}

Product.objects.filter(slug__in=target).update(is_active=True)
Product.objects.exclude(slug__in=target).update(is_active=False)
ProductVariant.objects.filter(product__slug__in=target).update(is_active=True)
ProductVariant.objects.exclude(product__slug__in=target).update(is_active=False)

print('products_active', Product.objects.filter(is_active=True).count())
print('variants_active', ProductVariant.objects.filter(is_active=True).count())
"

echo "[restore-catalog] Verification qualite..."
"$PYTHON_BIN" "$BACKEND_DIR/manage.py" shell -c "
import re
from catalog.models import Product

apple_bad = []
for slug, name in Product.objects.filter(is_active=True, brand__slug='apple').values_list('slug', 'name'):
    if re.search(r'(\\bSAM\\b|SAMSUNG|GALAXY|FOLD|FLIP|NOTE)', name, re.I):
        apple_bad.append((slug, name))

active_without_media = Product.objects.filter(is_active=True).exclude(media_links__isnull=False).count()

print('apple_brand_mismatch', len(apple_bad))
print('active_without_media', active_without_media)
"

echo "[restore-catalog] Termine."

