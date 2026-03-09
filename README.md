# MVP Premium Smartphones - Pack d'Alignement

Ce dossier aligne le MVP e-commerce smartphones (mono-vendeur) sur les specs legacy V1 et ajoute un socle securite/qualite pour developper sans regressions.

## Contenu

- `specs/openapi_v1_mvp_premium.yaml` : contrat API corrige (YAML valide).
- `specs/enums_v1.yaml` : enums, RBAC et contraintes V1.
- `specs/data_model_v1.md` : modele de donnees cible.
- `specs/ui_map_v1.md` : cartographie UI storefront + seller studio.
- `MVP_PREMIUM_ALIGNMENT.md` : scope MVP priorise et ordre d'implementation.
- `SECURITY_POLICIES_PREMIUM.md` : politiques securite premium e-commerce (UUID, auth, API, infra).
- `DEVELOPMENT_MODE_NO_BREAK.md` : mode de developpement anti-cassure.
- `security/security_baseline.yaml` : baseline securite machine-readable (UUID, auth, rate-limit, headers, backup, DevSecOps).
- `dev/quality_gates.yaml` : quality gates CI/CD anti-regression.
- `backend/` : squelette Django/DRF securise (JWT, RBAC, audit, inventory, checkout COD, endpoints P0, tests critiques).
- `frontend/` : squelette Next.js App Router P0 (storefront + seller studio routes essentielles).
- `dev-up.sh` : script de demarrage dev backend+frontend avec checks/migrations/seed RBAC.

## Contraintes non negociables V1

1. COD uniquement.
2. Aucun wishlist.
3. Aucune exposition publique d'un vocabulaire marketplace/vendor/source.

## Demarrage rapide

```bash
cd "/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium"
./dev-up.sh
```

Option si le reseau npm est instable:

```bash
SKIP_FRONT_INSTALL=1 ./dev-up.sh
```

## Codespaces (1 clic)

- Le projet inclut un devcontainer: [.devcontainer/devcontainer.json](/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium/.devcontainer/devcontainer.json)
- En ouvrant le repo dans GitHub Codespaces:
  - `postCreate` installe backend + frontend et initialise la base.
  - `postStart` lance automatiquement Django (`8000`) et Next.js (`3000`).
- Le frontend appelle l'API via proxy sur le port `3000` (meme domaine), pour eviter les blocages de port backend public.
- Les URLs Codespaces sont calculees automatiquement pour:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_SITE_URL`

Scripts utiles:

```bash
bash .devcontainer/post-start.sh
bash .devcontainer/stop-services.sh
bash scripts/import_multibrand_catalog.sh
bash scripts/restore_catalog_premium.sh
```

Le seed de base est Samsung-centric. Le script `scripts/import_multibrand_catalog.sh` injecte le catalogue multi-marques depuis `backend/catalog/data/produits.txt` (Apple, Google, Xiaomi, HP, Dell, Lenovo, etc.).
Le script `scripts/restore_catalog_premium.sh` remet le catalogue en coherence (import multi-marques + activation stricte Top100 + checks qualite media/brand naming).

## Acces Seller Studio

- URL locale: `http://127.0.0.1:3000/seller`
- Le lien Seller n'est pas expose dans le header public du storefront.
- Acces uniquement via URL directe + authentification JWT/RBAC backend.
- En local, utiliser un compte seller avec droits `catalog.*`, `inventory.*`, `orders.*` (ou superuser).
