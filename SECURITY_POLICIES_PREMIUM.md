# Security Policies Premium - MVP E-commerce Smartphones

## 1) Identite, UUID et modelisation

1. Toutes les entites metier utilisent des UUID (preferer UUIDv7, fallback UUIDv4).
2. Les references externes restent opaques (jamais d'ID incrementaux exposes publiquement).
3. Les tables critiques imposent des contraintes d'unicite:
   - `product.slug`, `brand.slug`, `category.slug`, `variant.sku`, `coupon.code`, `order.order_number`.
4. Index obligatoires sur:
   - UUID PK
   - colonnes de filtrage API (slug, status, created_at)
   - FK des parcours critiques (order/order_item/cart_item/inventory_item).

## 2) Authentification et autorisation

1. Seller Studio:
   - JWT access token court (15 min)
   - refresh token rotation (7 jours max)
   - revocation listee (blacklist serveur)
2. Customer:
   - session server-side ou JWT selon implementation, mais CSRF actif si cookie auth.
3. Password policy seller:
   - min 12 caracteres
   - verification breach list
   - hash Argon2id (ou bcrypt cost eleve minimal)
4. MFA recommande pour `OWNER_ADMIN`.
5. RBAC strict par permission fine (catalog.read, orders.status, cod.reconcile, etc.).
6. Deny-by-default: toute action non autorisee retourne 403 et est auditee.

## 3) API Security (backend)

1. Validation stricte des payloads (schema serializer).
2. Sanitization des champs texte riches (allowlist HTML pour CMS).
3. Pagination obligatoire sur endpoints liste.
4. Rate limiting minimal:
   - `/products`, `/search/suggest`: 60 req/min/IP
   - `/checkout/cod`: 10 req/15 min/session
   - `/reviews`, `/questions`: 10 req/heure/user
   - auth endpoints: anti-bruteforce progressif
5. Idempotency-Key requis sur `POST /checkout/cod` pour eviter doublons commandes.
6. Concurrence stock:
   - transaction DB + lock de lignes (`SELECT ... FOR UPDATE`) sur variantes.
   - si stock insuffisant => HTTP 409.
7. Erreurs API sans fuite technique (pas de stacktrace en production).

## 4) Frontend Security (storefront + seller)

1. CSP stricte (script-src non-inline, nonce/hash si besoin).
2. Security headers obligatoires:
   - `Strict-Transport-Security`
   - `Content-Security-Policy`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Frame-Options: DENY`
3. Cookies `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict` selon UX).
4. Donnees sensibles jamais dans localStorage.
5. Protection XSS/CSRF active sur formulaires checkout, account, seller.

## 5) Donnees, chiffrement et confidentialite

1. TLS 1.2+ obligatoire partout (idealement TLS 1.3).
2. Chiffrement at-rest (volume DB + backups).
3. Secrets hors repo (env manager/vault), rotation trimestrielle minimum.
4. Masquage des PII dans logs (telephone, email, adresse partielle).
5. Retention logs:
   - audit logs: minimum 12 mois
   - logs applicatifs: 30 a 90 jours selon cout.

## 6) Audit, fraude COD et traçabilite

1. Chaque mutation seller cree un audit log.
2. Actions auditees minimum:
   - creation/modification/suppression catalog
   - changement statut commande
   - enregistrement encaissement COD
   - modifications roles/permissions
3. Anti-fraude COD basique:
   - score risque client (annulations/no-show)
   - seuil alertes sur commandes suspectes
   - verification manuelle possible avant `CONFIRMED`.

## 7) Infrastructure et exploitation

1. CORS strict (allowlist domaine storefront + seller).
2. Environnements separes: dev/staging/prod.
3. Sauvegardes:
   - full backup quotidien
   - PITR si possible
   - test de restauration mensuel documente
4. Monitoring:
   - erreurs applicatives (Sentry ou equivalent)
   - metriques API (latence, 4xx/5xx, saturation DB)
   - alerting sur checkout failures et 409 anormaux.

## 8) DevSecOps minimum obligatoire

1. SAST sur PR (Bandit/Semgrep/Equivalent).
2. Dependency scan (pip/npm audit) bloqueur sur vuln high/critical.
3. Secret scan pre-merge.
4. Images conteneurs signees et scannees.
5. Deploiement prod bloque si tests + scans + migrations ne passent pas.

