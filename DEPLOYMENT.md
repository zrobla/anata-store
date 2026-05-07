# Deploiement Anata Store V1

Guide minimal pour deployer le MVP Anata Store en production. Cible: serveur Linux unique, 1-2 GB RAM, sans CDN externe.

## 1) Pre-requis

- Python 3.13+ avec `python3 -m venv`
- Node 20+ et pnpm 10+
- Git
- (optionnel) systemd / supervisor / pm2 pour le supervision des process

## 2) Variables d'environnement

### Backend (`backend/.env`)

Copier `backend/.env.example` -> `backend/.env`, puis modifier :

```env
# Obligatoire en production
DJANGO_SECRET_KEY=<une cle aleatoire de 50+ caracteres>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=anata-store.ci,www.anata-store.ci
DJANGO_CSRF_TRUSTED_ORIGINS=https://anata-store.ci,https://www.anata-store.ci

CORS_ALLOWED_ORIGINS=https://anata-store.ci

# DB par defaut: SQLite (suffisant pour MVP)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.anata-store.ci/api/v1
INTERNAL_API_ORIGIN=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=https://anata-store.ci
NEXT_PUBLIC_WHATSAPP_NUMBER=2250700000000
NEXT_PUBLIC_WHATSAPP_PREFILL=Bonjour Anata Store, je veux des conseils...
```

## 3) Installation

```bash
# Backend
cd backend
python3 -m venv .anata
source .anata/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_rbac

# Frontend
cd ../frontend
pnpm install --frozen-lockfile
pnpm exec next build
```

## 4) Demarrage des services

### Backend (port 8000)

```bash
cd backend
source .anata/bin/activate
DJANGO_DEBUG=false python manage.py runserver 0.0.0.0:8000 --noreload --insecure
# OU en prod robuste:
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

> Note: `--insecure` permet a `runserver` de servir `/static/` meme avec `DEBUG=False`. Les fichiers `/media/` sont servis via une URL pattern explicite (cf `config/urls.py`).

### Frontend (port 3000)

```bash
cd frontend
pnpm exec next start --port 3000
```

Le frontend Next.js proxifie automatiquement `/api/v1/*` et `/media/*` vers `INTERNAL_API_ORIGIN`. En production multi-machines, utiliser un reverse proxy (nginx/caddy) qui termine TLS et route vers les deux services.

## 5) Garde-fous qualite avant mise en ligne

```bash
cd backend
.anata/bin/python manage.py check                       # 0 issues attendu
.anata/bin/python manage.py check_media_quality         # exit 0, 0 BAD_IMAGE_SHA1
.anata/bin/python -m django test --settings=config.settings -v 0  # 21/21 OK

cd ../frontend
pnpm exec tsc --noEmit                                  # 0 erreur
pnpm exec next build                                    # build prod sans erreur
```

## 6) Catalogue: import et reparation media

### Re-importer le catalogue depuis un fichier de produits

```bash
cd backend
.anata/bin/python manage.py import_products_txt path/to/produits.txt
```

### Reparer/rafraichir les images d'un produit

```bash
# Cas 1: corriger les visuels blacklistes (BAD_IMAGE_SHA1) ou manquants
.anata/bin/python manage.py repair_product_media

# Cas 2: rejouer un produit specifique
.anata/bin/python manage.py repair_product_media --refresh-all --name-contains "iPhone 15 Pro"

# Cas 3: rejouer toutes les marques X
.anata/bin/python manage.py repair_product_media --refresh-all --only-brand samsung

# ATTENTION: --refresh-all sur l'ensemble du catalogue peut regresser certaines images
# si une URL gsmarena est devenue obsolete. Toujours filtrer par --only-brand ou --name-contains.
```

## 7) Recovery

### Restaurer la BDD a partir d'un backup

```bash
cd backend
cp db.sqlite3 db.sqlite3.broken    # garder l'etat actuel pour analyse
cp /path/to/backup/db.sqlite3 db.sqlite3
.anata/bin/python manage.py check_media_quality
```

### Re-creer un seller admin si perdu

```bash
.anata/bin/python manage.py createsuperuser
.anata/bin/python manage.py seed_rbac    # idempotent
```

## 8) Points d'attention V1.1

- Le serving `/media/` est fait par Django (pas optimal a l'echelle). En V1.1, mettre nginx ou un CDN devant.
- SQLite supporte le trafic MVP. Au-dela de ~50 ecritures/seconde concurrentes, migrer vers PostgreSQL (changer `DB_ENGINE` + `DB_*`).
- Les URLs `gsmarena.com` rotent regulierement. Si `repair_product_media` produit des SVG fallback, ajouter le visuel manquant dans `LOCAL_SEED_BY_TOKEN` plutot que de dependre d'une URL externe.

## 9) Sanity check post-deploiement

```bash
# Front
curl -sI https://anata-store.ci/                       # 200
curl -sI https://anata-store.ci/c/smartphones          # 200

# API
curl -s  https://api.anata-store.ci/api/v1/catalog/categories/ | head
curl -sI https://api.anata-store.ci/media/seed/apple-iphone-15-pro.jpg  # 200

# Parcours achat: ajouter un item, creer une commande COD
# (cf section "smoke test" dans le journal de livraison)
```
