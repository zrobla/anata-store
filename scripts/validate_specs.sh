#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export ROOT_DIR
python3 - <<'PY'
import os
import yaml
from pathlib import Path

root_dir = Path(os.environ["ROOT_DIR"])
files = [
    root_dir / "specs" / "openapi_v1_mvp_premium.yaml",
    root_dir / "specs" / "enums_v1.yaml",
    root_dir / "security" / "security_baseline.yaml",
    root_dir / "dev" / "quality_gates.yaml",
]

for path in files:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit(f"{path}: invalid root type")
    print(f"{path}: OK")
PY

echo "Spec validation done."
