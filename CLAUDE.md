# CLAUDE.md — Anata Store (MVP e-commerce premium)

> Fichier de contexte **chargé automatiquement** quand une session Claude Code s'ouvre dans
> ce dossier. But : reprendre le développement de l'app Django/Next.js **Anata Store** sans
> dépendre d'un ancien historique de session. **Réponds en français** (devise **XOF/FCFA**).
>
> ⚠️ Les règles de sécurité globales du poste (`~/.claude/CLAUDE.md` §A–E) s'appliquent et ne
> sont **jamais** surchargées : sur un doute → STOP et demander ; jamais `--force` ; **une
> cible = une opération** ; sauvegarde **avant** toute modif sensible ; **pas de push / pas de
> déploiement sans accord explicite** ; **aucune co-signature IA** dans les commits.

---

## 1) Ce qu'est le projet

- **Anata Store** — boutique e-commerce **mono-vendeur** orientée **smartphones** et dérivés,
  pour **M. BAH** (Treichville, Abidjan). Site en production : **`https://anatastore.ci`** (+ `www`).
- **Contraintes MVP V1 non négociables :**
  1. **Paiement = COD uniquement** (paiement à la livraison). Pas de mobile money / carte en V1.
  2. **Aucune wishlist.**
  3. **Aucun vocabulaire « marketplace / vendor / source » exposé au public** (c'est mono-vendeur côté client).
  4. Langue principale **français (CI)**, devise **XOF/FCFA**.

## 2) Emplacement & dépôt

- **Dossier local (ici)** : `/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium`
- **Git** : `git@github.com:zrobla/anata-store.git`, branche **`main`**.
- Le **code de production vit sur le VPS** sous `/opt/anata-store` (voir §6). Ce dossier local
  est la **source de développement** ; on déploie par **git pull sur le serveur**, jamais par rsync/écrasement.

## 3) Stack & architecture

| Couche | Techno | Emplacement |
|---|---|---|
| Backend | **Django + DRF** (Python 3.13+) | `backend/` |
| Frontend | **Next.js App Router** (Node 20+, pnpm 10+) | `frontend/` |
| DB (dev) | **SQLite** (`backend/db.sqlite3`) | migrer PostgreSQL au-delà du trafic MVP |
| Auth | **JWT (SimpleJWT)** + **RBAC** (rôles/permissions) | app `accounts` |
| IDs métier | **UUID** (jamais de PK séquentielle exposée) | — |
| API schema | **drf-spectacular** (OpenAPI) | `specs/openapi_v1_mvp_premium.yaml` |

- **`AUTH_USER_MODEL = accounts.User`** ; settings = `config/settings.py` ; URLs = `config/urls.py`
  (+ `config/api_urls.py`). Middlewares maison : `RequestIdMiddleware`, `SecurityHeadersMiddleware`.
- **Apps Django** : `accounts`, `audit`, `catalog`, `inventory`, `orders`, `content`, `promotions`, `trust`.
- **Venv backend** : **`backend/.anata`** (⚠️ activer celui-ci, jamais le Python système).
- **Frontend** : le hero d'accueil pointe sur **3 slugs codés en dur** dans `frontend/app/page.tsx`
  (constante `HERO_SLUGS`) ; helper `fetchHeroSlides()` dans `frontend/lib/api.ts` (fallback si un slug manque).

### 3.1) Studio boutique « Ma boutique » (`/seller`) — interface no-code du gérant

Espace de gestion pensé pour **M. BAH** (faible sensibilité digitale) : aucun terme technique
visible, typographie ≈1.05rem mini, zones tactiles ≥48px, mobile-first (barre de navigation
fixe en bas sur téléphone). Le chrome public (header/footer/CTA WhatsApp) est masqué sur
`/seller` via `components/chrome-public.tsx`.

**Couche « article » (backend)** — un produit vendable = `Product` + `ProductVariant` (prix) +
`InventoryItem` (quantité). Le gérant ne doit pas connaître ce découpage : la ressource
**`/api/v1/seller/articles/`** expose un objet métier unique (nom, prix, quantité, photos) et
crée les trois objets d'un coup.
- `catalog/article_service.py` — logique métier (slug + SKU auto-générés, garde-fous prix).
  ⚠️ **Invariant** : `create_article()` crée toujours l'`InventoryItem` — sans lui, l'article
  s'afficherait « épuisé » sur la boutique sans explication.
- `catalog/article_serializers.py`, `catalog/article_views.py` — API en vocabulaire français
  (`nom`, `prix`, `quantite`, `en_ligne`, `mis_en_avant`, `disponibilite`).
- Les endpoints techniques `/seller/products/` et `/seller/variants/` **restent en place**
  (import Excel, cas multi-variantes) ; la vue « article » édite la **variante principale**
  (la moins chère active) et le signale à l'écran quand il y en a plusieurs.

**Photos** — `MediaAsset.image` (`ImageField`, migration `catalog/0002`) coexiste avec l'ancien
`url` distant ; `MediaAsset.effective_url` donne la priorité au fichier envoyé, et les
serializers publics passent par lui. `catalog/media_service.py` normalise à l'envoi :
rotation EXIF (photos de téléphone couchées), conversion RGB, redimensionnement à 1600px,
JPEG qualité 85 — une photo de 212 Ko / 3024×4032 ressort à ~20 Ko. Max 12 Mo à l'entrée,
8 photos par article, HEIC refusé avec un message expliquant comment convertir.
**Pillow est désormais une dépendance** (`requirements.txt`).

**Écrans** — `app/seller/page.tsx` (« À faire aujourd'hui » : tâches priorisées cliquables),
`catalog/products` (Mes articles + assistant d'ajout en 3 étapes), `orders` (parcours de
commande avec l'action suivante unique + appel/WhatsApp), `vitrine` (mise en avant),
`content/pages` (texte simple → HTML via `lib/texte-riche.ts`), `audit` (historique en
phrases). Briques communes : `components/boutique/kit.tsx`.
`app/seller/inventory/items` subsiste en jargon technique mais **n'est plus dans la
navigation** (le stock se gère depuis la fiche article).

Tests : `backend/tests/test_seller_articles.py` (11 tests — invariant de vente, photos, RBAC).

## 4) Démarrer en local

```bash
cd "/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium"
./dev-up.sh                 # Django :8000 + Next.js :3000 (checks + migrations + seed RBAC)
# npm instable :  SKIP_FRONT_INSTALL=1 ./dev-up.sh
# reseed volontaire du catalogue :  SEED_DEMO_STORE=1 ./dev-up.sh   (par défaut le seed est OFF)
```

Backend seul :
```bash
cd backend && source .anata/bin/activate
python manage.py check
python manage.py migrate            # SAUVEGARDER db.sqlite3 avant toute migration (voir §7)
```
- **Studio boutique** (espace du gérant, cf. §3.1) : `http://127.0.0.1:3000/seller` — **non lié dans le
  header public**, accès par URL directe + compte JWT/RBAC. Pour gérer articles **et** commandes, le
  rôle `CATALOG_MANAGER` ne suffit pas (pas de `orders.*`) : utiliser `OWNER_ADMIN` ou cumuler les rôles.
- Le front proxifie `/api/v1/*` et `/media/*` vers `INTERNAL_API_ORIGIN` (`http://127.0.0.1:8000`).

## 5) Commandes de gestion utiles (`backend/…/management/commands/`)

- `import_products_txt <fichier>` — import catalogue (parsing prix format WhatsApp, réactivation marque/catégorie).
- `repair_product_media [--refresh-all] [--only-brand X] [--name-contains "…"]` — répare/rafraîchit les images.
  ⚠️ `--refresh-all` sur tout le catalogue peut régresser des visuels (URLs gsmarena obsolètes) → **filtrer**.
- `check_media_quality` — garde-fou qualité média (attendu : exit 0, 0 `BAD_IMAGE_SHA1`).
- `promote_largest_media`, `download_product_images`, `seed_demo_store`, `seed_rbac` (idempotent).

## 6) Production (VPS LWS) — contexte, ne rien toucher sans raison explicite

- Serveur : **`31.207.34.199`** (`vps120439.serveur-vps.net`), Debian 13. Runbook complet :
  **`~/MY VPS/VPS-ADMINISTRATION-REFERENCE.md`** (§3 Anata, §4 certs, §6 « Anata & DFL »).
- App sous **`/opt/anata-store`**, propriétaire système **`deploy`**. Deux services systemd :
  **`anata-django`** (gunicorn, `:8000` — api/admin) et **`anata-next`** (Next.js prod, `:3000` — front).
  Apache termine le TLS et proxifie. Cert : **`/etc/ssl/anata/`** (jamais `/etc/letsencrypt/live`).
- **Déploiement = git pull en tant que `deploy` sur le serveur**, puis build front + `restart` du service
  concerné (schéma dans `DEPLOYMENT.md` §6, ex. hero slugs). **Aucun déploiement sans accord explicite.**
- ⚠️ **Cert anata exp. ~28/09/2026, hors lignée certbot** : si le site doit rester en ligne au-delà,
  ré-émettre `certbot certonly --webroot -w /var/www/html -d anatastore.ci -d www.anatastore.ci --key-type ecdsa`.
- Un dispositif de **blocage commercial 503** (« fin de test ») existe et est conservé en backup ; le site
  est **réactivé depuis le 12/08/2026**. Détails : mémoire `anata-blocage-commercial` du projet MY VPS.

## 7) Garde-fous spécifiques (en plus de §A–E globales)

- **Migrations = surface destructive** : copier `backend/db.sqlite3` en horodaté **avant** tout `migrate` ;
  générer (`makemigrations`) → **relire le fichier** → appliquer. Jamais `flush`/`migrate zero`/`--fake` sur
  des données réelles sans accord + sauvegarde. Ne jamais éditer/supprimer une migration déjà appliquée.
- **ORM = règle du WHERE** : pas de `.all().delete()` ni `.update()` non filtré ; `.count()` + sauvegarde avant tout write en masse.
- **Secrets hors du code** : `DJANGO_SECRET_KEY`, `.env`, `db.sqlite3`, `media/` **ne se committent pas**
  (cf. `.gitignore`). En prod : `DJANGO_DEBUG=false` + `DJANGO_ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` corrects.
- **Git** : brancher avant de committer sur `main` si le changement est risqué ; **pas de push sans accord** ;
  **aucune co-signature / mention IA** dans les commits ou la doc livrée.
- Standards qualité web/app de l'agence (`~/CLAUDE.md` §5) : mobile-first, **typographie généreuse**
  (corps ≈ 1.2rem desktop, jamais < 1rem), accessibilité, SEO ; UUID publics ; rate-limiting endpoints publics.

## 8) État connu (relevé 2026-03-05, à revérifier avant d'affirmer)

- Storefront (catalogue, recherche, PDP, compare, panier, **checkout COD**) et Seller Studio :
  fonctionnels. Contact : page + formulaire présents.
- Données locales : ~358 produits (230 actifs), 646 variantes (419 actives). Apple : 14 produits actifs, galeries OK.
- **Points ouverts prioritaires** (§7 de `PROJECT_CONTEXT_STATUS.md`) :
  1. Corriger les **variantes actives à prix 0** (11 relevées).
  2. Contrôle cohérence **image ↔ produit** hors Apple.
  3. **CSP finale stricte** + tests e2e du parcours d'achat.
- Fichiers locaux non commités présents (docx/xlsx de prix, scripts `generate_prix_*`, `price_update_analysis.py`,
  `download_product_images.py`, `db.sqlite3.bak-*`) — **ne pas committer aveuglément** ; vérifier avant `git add`.

## 9) Garde-fous qualité avant toute mise en ligne (depuis `backend/`)

```bash
.anata/bin/python manage.py check                          # 0 issue
.anata/bin/python manage.py check_media_quality            # exit 0, 0 BAD_IMAGE_SHA1
.anata/bin/python -m django test --settings=config.settings -v 0   # tests au vert
cd ../frontend && pnpm exec tsc --noEmit && pnpm exec next build    # 0 erreur TS + build prod OK
```

## 10) Références

- `README.md`, `PROJECT_CONTEXT_STATUS.md`, `DEPLOYMENT.md`, `DEPLOY_NOTES.md`,
  `MVP_PREMIUM_ALIGNMENT.md`, `SECURITY_POLICIES_PREMIUM.md`, `DEVELOPMENT_MODE_NO_BREAK.md`.
- Specs : `specs/openapi_v1_mvp_premium.yaml`, `specs/data_model_v1.md`, `specs/ui_map_v1.md`, `dev/quality_gates.yaml`.
- Prod & infra : `~/MY VPS/VPS-ADMINISTRATION-REFERENCE.md` (§3/§4/§6) + mémoire projet MY VPS (`anata-blocage-commercial`).
- Portfolio : Anata Store a déjà une étude de cas Tech & Web (`portfolio/portfolio-anata-store.html`).
