#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
source .anata/bin/activate

python manage.py test tests.test_phase2_modules

python manage.py shell -c "
from django.urls import reverse
from django.test import Client

reverse('review-create')
reverse('question-create')
reverse('seller-deal-list')
reverse('seller-coupon-list')
reverse('seller-bundle-list')
reverse('seller-variant-list')

c = Client()
r1 = c.post('/api/v1/reviews', data={'product_id': '00000000-0000-0000-0000-000000000000', 'rating': 5}, content_type='application/json')
r2 = c.post('/api/v1/questions', data={'product_id': '00000000-0000-0000-0000-000000000000', 'question': 'x'}, content_type='application/json')
assert r1.status_code in (400, 404)
assert r2.status_code in (400, 404)
print('PHASE_2_CHECK_OK')
"
