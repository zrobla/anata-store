#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
source .anata/bin/activate

python manage.py test \
  tests.test_inventory \
  tests.test_checkout \
  tests.test_rbac \
  tests.test_phase1_contract \
  tests.test_cart_session_contract \
  tests.test_phase1_e2e_purchase_flow

python manage.py shell -c "
from django.urls import reverse
from django.test import Client

reverse('catalog-attribute-list')
reverse('search-suggest')

c = Client()
r1 = c.get('/api/v1/catalog/attributes/')
r2 = c.get('/api/v1/search/suggest', {'q': 'sam'})
r3 = c.get('/api/v1/products/', {'page': 1, 'page_size': 5})
assert r1.status_code == 200
assert r2.status_code == 200
assert r3.status_code == 200
p3 = r3.json()
assert 'meta' in p3 and 'items' in p3
print('PHASE_1_CHECK_OK')
"
