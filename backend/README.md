# Backend MVP Premium (Django + DRF)

## Setup rapide

```bash
python3 -m venv .anata
source .anata/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_rbac
python manage.py seed_demo_store
python manage.py runserver
```

## Ajouter des produits

Option rapide (recommandee):

```bash
python manage.py seed_demo_store
```

Remplacer l'ancien catalogue par la liste Samsung (WhatsApp) :

```bash
python manage.py seed_demo_store --clear-existing
```

Les images produits Samsung en ligne sont deja associees par defaut (URLs officielles).

Par defaut, le seed sert des images locales stables dans `media/seed` (SVG premium), pour eviter toute casse reseau.
Avec `--download-images`, le seed telecharge des photos produits vers `media/seed/*.jpg` (source GSMArena), puis les sert localement.

Telecharger des images locales en plus (si internet dispo) :

```bash
python manage.py seed_demo_store --clear-existing --download-images
```

Gros catalogue de test (ex: 50 produits) :

```bash
python manage.py seed_demo_store --volume 50
```

Cette commande cree:
- marques/categories
- produits Samsung depuis ta liste (Fold/Flip/S25/A/Tab/Watch/Buds)
- stock interne + stock partenaire (pour `AVAILABLE_SOON`)
- zones de livraison

Option manuelle:

1. Ouvrir `http://127.0.0.1:8000/admin/`
2. Se connecter avec `bah / marchesamsung`
3. Ajouter dans cet ordre:
   - `Catalog > Brand`, `Category`, `Product`, `Product variant`
   - `Inventory > Inventory source`, `Inventory item`
4. Rafraichir le front (`/`, `/s`, `/p/...`)

## Endpoints principaux

- Public: `/api/v1/catalog/*`, `/api/v1/products*`, `/api/v1/cart*`, `/api/v1/checkout/cod`
- Customer: `/api/v1/me/orders*`
- Seller: `/api/v1/seller/*`
- OpenAPI: `/api/v1/schema/`, `/api/v1/docs/`

## Securite incluse

- UUID sur entites metier
- JWT (access + refresh)
- RBAC permissions clef-valeur
- Audit log mutations seller
- Rate limit endpoints publics
- Security headers + request id middleware
- Checkout COD transactionnel avec lock DB et 409 en conflit stock
