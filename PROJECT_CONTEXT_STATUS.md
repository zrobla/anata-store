# Contexte Projet - Anata Store MVP Premium

Derniere mise a jour: 2026-03-05

## 1) Perimetre MVP (rappel)

Anata Store est un MVP e-commerce mono-vendeur oriente smartphones et derives.

Contraintes MVP non negociables:
- Paiement: COD uniquement.
- Pas de wishlist.
- Pas de vocabulaire marketplace expose au public.
- Langue principale: francais (CI), devise XOF/FCFA.

## 2) Stack et execution

- Backend: Django + DRF (`backend/`)
- Frontend: Next.js App Router (`frontend/`)
- DB dev: SQLite (`backend/db.sqlite3`)
- Auth: JWT (SimpleJWT) + RBAC
- IDs metier: UUID
- Venv backend: `backend/.anata`

Demarrage local:

```bash
cd "/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium"
./dev-up.sh
```

Important:
- `dev-up.sh` ne reseed plus le catalogue par defaut.
- Variables par defaut: `SEED_DEMO_STORE=0`, `SEED_DOWNLOAD_IMAGES=0`, `SEED_CLEAR_EXISTING=0`.
- Pour reseed volontaire: `SEED_DEMO_STORE=1 ./dev-up.sh`.

## 3) Checkpoint fonctionnel courant

### Storefront / core
- Catalogue public, recherche, PDP, compare, panier, checkout COD: fonctionnels.
- Seller Studio: operationnel (catalog/inventory/orders/content).
- Contact: page publique + formulaire present.

### Correctifs recents majeurs
- Marque Apple restauree dans le public (retour dans la sidebar marques).
- Nettoyage des anciens produits Apple non coherents (`... Serie X`) du flux actif.
- Import TXT durci pour la section Apple:
  - detection Apple/iPhone/MacBook,
  - parsing des formats prix WhatsApp (`mille`, `850.000f`, fleches),
  - reactivation marque/categorie inactives au besoin.
- Media API durcie:
  - reecriture des URLs media locales vers l'hote reel de la requete (evite images cassees en acces LAN).
- Images Apple:
  - photos officielles `.jpg` modele par modele pour les iPhone actifs,
  - galeries multi-images ajoutees quand disponibles.

## 4) Etat donnees (BDD locale actuelle)

Mesure relevee le 2026-03-05:
- Produits total: `358` (singletons, sans variantes)
- Produits actifs: `230`
- Variantes total: `646`
- Variantes actives: `419`
- Variantes actives avec prix a 0: `11`
- Produits actifs sans media: `0`

Apple:
- Produits Apple actifs: `14`
- Produits Apple actifs avec `Serie` dans le nom: `0`
- Produits Apple visibles en public: `14`
- Produits Apple en galerie multi-images: `14/14`

## 5) Fichiers clefs modifies recemment

- `backend/catalog/management/commands/import_products_txt.py`
- `backend/catalog/serializers.py`
- `dev-up.sh`
- `backend/media/seed/apple-iphone-*.jpg` (+ vues secondaires `-2`, `-3`, etc.)

## 6) Verification rapide apres reprise

Depuis `backend/`:

```bash
./.anata/bin/python manage.py check
./.anata/bin/python manage.py shell -c "from catalog.models import Product, ProductVariant; print(Product.objects.filter(is_active=True).count(), ProductVariant.objects.filter(is_active=True).count())"
```

Checks API utiles:
- `GET /api/v1/catalog/brands/` -> `apple` present
- `GET /api/v1/products/?brand=apple` -> items > 0
- `GET /api/v1/products/apple-iphone-15-pro/` -> media count > 1

## 7) Points ouverts a traiter en priorite

1. Qualite catalogue: corriger les `11` variantes actives avec prix `0`.
2. Qualite media hors Apple: controle coherence image vs produit sur toutes marques.
3. Finaliser et pousser les changements locaux non commits.
4. Consolidation production: CSP finale stricte + tests e2e parcours achat.

## 8) Limites MVP assumees

- Paiement en ligne hors COD (mobile money, carte): hors scope MVP courant.
- Integrations CRM/support avancees: a finaliser en etape suivante.

## 9) References projet

- `README.md`
- `MVP_PREMIUM_ALIGNMENT.md`
- `SECURITY_POLICIES_PREMIUM.md`
- `DEVELOPMENT_MODE_NO_BREAK.md`
- `specs/openapi_v1_mvp_premium.yaml`
- `dev/quality_gates.yaml`
