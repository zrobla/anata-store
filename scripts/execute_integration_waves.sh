#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="$ROOT_DIR/dev/reports/waves_$STAMP"
STATUS_FILE="$REPORT_DIR/status.tsv"
REPORT_FILE="$REPORT_DIR/final_execution_report.md"
ANALYSIS_FILE="$REPORT_DIR/analysis_report.md"

mkdir -p "$REPORT_DIR"
echo -e "step\tstatus\tlog" >"$STATUS_FILE"

run_step() {
  local step="$1"
  local script="$2"
  local log_file="$REPORT_DIR/${step}.log"

  echo "[WAVES] $step -> $script"
  if bash "$script" >"$log_file" 2>&1; then
    echo -e "${step}\tOK\t${log_file}" >>"$STATUS_FILE"
  else
    echo -e "${step}\tFAIL\t${log_file}" >>"$STATUS_FILE"
    build_report "FAIL"
    build_analysis "FAIL"
    echo "[WAVES] Echec sur ${step}. Voir ${log_file}"
    exit 1
  fi
}

build_analysis() {
  local overall="$1"
  {
    echo "# Rapport d'analyse d'execution"
    echo
    echo "- Horodatage: ${STAMP}"
    echo "- Statut global: ${overall}"
    echo "- Mode: execution stricte par vagues avec blocage inter-phase"
    echo
    echo "## Resultats par phase"
    echo
    for phase in 1 2 3; do
      exec_status="$(awk -F'\t' -v s="phase_${phase}_execute" '$1==s{print $2}' "$STATUS_FILE")"
      check_status="$(awk -F'\t' -v s="phase_${phase}_check" '$1==s{print $2}' "$STATUS_FILE")"
      echo "- Phase ${phase}: execute=${exec_status:-NA}, check=${check_status:-NA}"
    done
    echo
    echo "## Fichiers de preuve"
    echo
    echo "- ${STATUS_FILE}"
    echo "- ${REPORT_FILE}"
    echo "- Logs phase: ${REPORT_DIR}/phase_*.log"
  } >"$ANALYSIS_FILE"
}

build_report() {
  local overall="$1"
  {
    echo "# Rapport d'execution des vagues"
    echo
    echo "- Horodatage: ${STAMP}"
    echo "- Statut global: **${overall}**"
    echo
    echo "## Journal des etapes"
    echo
    echo "| Etape | Statut | Log |"
    echo "|---|---|---|"
    tail -n +2 "$STATUS_FILE" | while IFS=$'\t' read -r step status log; do
      echo "| ${step} | ${status} | ${log} |"
    done
    echo
    echo "## Regle de blocage"
    echo
    echo "Chaque phase execute d'abord le script d'implementation puis le script de check."
    echo "La phase suivante ne demarre que si le check precedent est vert."
  } >"$REPORT_FILE"
}

run_step "phase_1_execute" "$ROOT_DIR/scripts/phase_1_execute.sh"
run_step "phase_1_check" "$ROOT_DIR/scripts/phase_1_check.sh"

run_step "phase_2_execute" "$ROOT_DIR/scripts/phase_2_execute.sh"
run_step "phase_2_check" "$ROOT_DIR/scripts/phase_2_check.sh"

run_step "phase_3_execute" "$ROOT_DIR/scripts/phase_3_execute.sh"
run_step "phase_3_check" "$ROOT_DIR/scripts/phase_3_check.sh"

build_report "SUCCESS"
build_analysis "SUCCESS"
echo "[WAVES] Terminee. Rapport: $REPORT_FILE"
