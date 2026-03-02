# Alignement MVP Premium - E-commerce Smartphones (V1)

## 1) Cadrage produit

Le MVP vise une boutique smartphones premium, mono-vendeur, rapide sur mobile, avec parcours COD sans friction.

Contraintes V1 obligatoires:

1. Paiement unique: `COD`.
2. `WISHLIST` absente partout (DB, API, UI).
3. Aucune exposition publique du sourcing (INTERNAL/PARTNER/CONSIGNMENT), ni wording marketplace.
4. Langue UI: francais (CI), devise: XOF/FCFA.

## 2) Decisions d'alignement techniques

1. Tous les IDs metier en UUID (preferer UUIDv7; UUIDv4 acceptable si v7 non supporte).
2. API unique sous `/api/v1` avec contrat OpenAPI versionne.
3. Back-office seller strictement protege via JWT + RBAC.
4. Toute mutation seller ecrit un `audit_log` (actor/action/resource/before/after minimal).
5. Checkout COD transactionnel avec reservation de stock et retour `409` si conflit.

## 3) Scope MVP priorise (P0 puis P1)

## P0 - indispensable mise en production

1. Authentification et RBAC seller (roles + permissions du fichier enums).
2. Catalogue: brands/categories/products/variants/media/attributes.
3. Inventaire multi-source interne + calcul disponibilite publique:
   - `IN_STOCK` si stock INTERNAL > 0
   - `AVAILABLE_SOON` si PARTNER/CONSIGNMENT > 0 (avec lead_time min)
   - `OUT_OF_STOCK` sinon
4. Panier + checkout COD + creation commandes + timeline statuts.
5. Zone livraison CI + frais + ETA.
6. Pages confiance minimales: livraison, retours, garantie, FAQ, contact.
7. Observabilite et audit logs.

## P1 - premium business

1. Deals/coupons/bundles.
2. Avis + Q&A avec moderation.
3. COD reconciliation seller.
4. Blog + home builder avance.
5. Compare produit (2-4) et retours enrichis.

## 4) Ecart a traiter entre UI Map et OpenAPI

Routes UI presentes mais endpoints API non explicites dans la spec:

1. Moderation seller (`reviews`, `qna`, `returns`).
2. Security seller (`users`, `roles`).
3. Inventory ledger.
4. Retour client (`/returns/request`).
5. Impression documents commande (invoice/bon livraison).

Action: ajouter ces endpoints dans `openapi_v1_mvp_premium.yaml` avant implementation complete de ces ecrans.

## 5) Ordre d'implementation recommande (sans brisures)

1. Fondation securite + infra (UUID, auth, RBAC, audit, policies HTTP, secrets).
2. Domaine catalogue/inventaire + tests de logique stock.
3. Checkout COD transactionnel + tests concurrence.
4. Seller orders/COD + reconciliation.
5. CMS confiance + SEO de base.
6. Features P1 derriere feature flags.

## 6) Definition of Done (MVP)

Un lot est "Done" si:

1. Contrat OpenAPI a jour et valide.
2. Tests unitaires + integration + contrat passent.
3. Pas de breaking change non versionne.
4. Audit log present sur mutations seller.
5. Politiques securite appliquees selon `SECURITY_POLICIES_PREMIUM.md`.
6. Deploiement staging vert avant production.

