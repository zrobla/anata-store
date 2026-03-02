#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
source .anata/bin/activate

python manage.py migrate
python manage.py seed_demo_store --clear-existing --download-images --media-base-url http://127.0.0.1:8000
