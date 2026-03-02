# Execution stricte des 3 vagues

## Principe

- Chaque vague execute 2 scripts:
  - `phase_N_execute.sh`
  - `phase_N_check.sh`
- La vague suivante ne demarre **jamais** si le check de la vague courante echoue.
- Un rapport horodate est genere dans `dev/reports/waves_<timestamp>/`.

## Commande unique

```bash
bash scripts/execute_integration_waves.sh
```

## Scripts

- `scripts/phase_1_execute.sh`
- `scripts/phase_1_check.sh`
- `scripts/phase_2_execute.sh`
- `scripts/phase_2_check.sh`
- `scripts/phase_3_execute.sh`
- `scripts/phase_3_check.sh`

## Rapport final

- Fichier principal: `dev/reports/waves_<timestamp>/final_execution_report.md`
- Journal detaille: `dev/reports/waves_<timestamp>/*.log`
- Statuts machine: `dev/reports/waves_<timestamp>/status.tsv`
