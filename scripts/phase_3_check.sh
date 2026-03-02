#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
source .anata/bin/activate

python manage.py check

python manage.py shell -c "
from django.test import Client

c = Client()
r = c.get('/api/v1/content/home/')
assert r.status_code == 200
print('PHASE_3_CHECK_OK')
"
