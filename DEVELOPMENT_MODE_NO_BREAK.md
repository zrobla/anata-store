# Mode Developpement MVP - Sans Cassures

## 1) Objectif

Assurer un developpement rapide du MVP premium sans regression fonctionnelle, sans rupture API et sans dette securite critique.

## 2) Environnements

1. `dev` (local): iteration rapide, seed data de demo.
2. `staging`: miroir production (meme config securite, scale reduit).
3. `prod`: durci, observabilite complete, sauvegardes actives.

Regle: aucune feature ne part en production sans passage staging vert.

## 3) Workflow git anti-casse

1. Branche principale protegee (`main`).
2. Branches courtes `feat/*`, `fix/*`, `chore/*`.
3. Pull request obligatoire avec:
   - review technique
   - checks CI verts
   - verification securite
4. Merge squashe autorise, rebase force interdit sur `main`.

## 4) Contrat API et versionning

1. OpenAPI versionne dans le repo (`specs/openapi_v1_mvp_premium.yaml`).
2. Toute modification API doit:
   - mettre a jour la spec
   - passer une validation YAML/schema
   - passer les tests de contrat
3. Breaking changes interdites en `v1`.
4. Si breaking change necessaire: nouvelle version (`/api/v2`) ou feature flag temporaire.

## 5) Strategie migrations DB

1. Une PR = migrations coherentes + rollback pense.
2. Migrations idempotentes et deterministes.
3. Donnees critiques migrees par scripts verifies sur staging.
4. Jamais de migration destructive sans plan de transition en 2 etapes:
   - etape A: ajout nouveau champ + double ecriture
   - etape B: bascule lecture + suppression differee.

## 6) Quality gates CI (bloquants)

1. Lint + format backend/frontend.
2. Tests unitaires:
   - disponibilite variant
   - reservation stock checkout COD
   - calcul promo coupon/deal
3. Tests integration API sur parcours critique:
   - PLP/PDP
   - panier
   - checkout COD
   - tracking commande
4. Tests securite automatiques (SAST + dependency scan + secret scan).
5. Validation OpenAPI.

## 7) Feature flags et rollout progressif

1. Flags minimum:
   - `DEALS_ENABLED`
   - `COUPONS_ENABLED`
   - `WHATSAPP_NOTIF_ENABLED`
2. Toute feature P1 activee via flag.
3. Rollout progressif staging -> subset prod -> global.
4. Kill switch documente pour retours arriere rapides.

## 8) Observabilite et exploitation

1. Logs structures JSON avec `request_id` et `user_id` (si auth).
2. Traces sur endpoints critiques (`/checkout/cod`, status updates).
3. Dashboards obligatoires:
   - taux conversion checkout
   - erreurs 5xx
   - conflits stock 409
   - latence endpoints catalog.
4. Alertes temps reel sur incidents checkout, auth, DB.

## 9) Procedure release sans brisures

1. Freeze court pre-release.
2. Tag release + changelog.
3. Backup pre-deploiement.
4. Deploiement zero-downtime (ou fenetre controlee si necessaire).
5. Smoke tests post-deploiement:
   - navigation home -> PDP -> cart -> checkout COD
   - update statut commande seller
   - publication page contenu.
6. Plan rollback documente et teste.

## 10) Checklist "Ready to Build"

1. Stack choisie et verrouillee (versions backend/frontend/db/redis).
2. Environnement local reproductible (docker compose ou equivalent).
3. Seed de donnees smartphones realistiques.
4. Compte admin + roles seller preconfigures.
5. Playbook incident + runbook restore disponibles.

