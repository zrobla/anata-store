# Contexte Projet - Anata Store MVP Premium

Derniere mise a jour: 2026-03-02

## 1) Perimetre produit

Anata Store est un MVP e-commerce mono-vendeur oriente smartphones et derives (tablettes, montres, ecouteurs, ordinateurs), avec positionnement premium.

Contraintes MVP non negociables:
- Paiement: COD uniquement.
- Pas de wishlist.
- Pas de vocabulaire marketplace expose au public.
- Langue principale: francais (CI), devise XOF/FCFA.

## 2) Architecture technique

- Backend: Django + DRF (`backend/`)
- Frontend: Next.js App Router (`frontend/`)
- Donnees: SQLite locale en dev (`backend/db.sqlite3`)
- Auth seller/customer: JWT (SimpleJWT) + RBAC
- IDs metier: UUID

## 3) Etat d'implementation (niveau actuel)

Evaluation pratique du MVP (au 2026-03-02):

| Domaine | Niveau | Statut |
|---|---:|---|
| Core backend (catalog, stock, cart, checkout COD, orders) | 85% | Fonctionnel |
| Storefront frontend (home, listing, PDP, cart, checkout, compare) | 80% | Fonctionnel avec polish recent |
| Seller Studio (catalog, inventory, orders, content, audit) | 70% | Fonctionnel P0/P1 partiel |
| CMS public (pages slug + blog + home content) | 75% | Fonctionnel, contact renforce |
| Securite MVP premium | 80% | En place, durcissement possible |
| SEO technique de base | 75% | En place |
| Paiements en ligne hors COD (mobile money, carte) | 0% | Hors scope MVP actuel |

## 4) Features deja integrees

Storefront:
- Home, categories, marques, recherche (`/s`), PDP, compare, panier, checkout COD, confirmation commande.
- Suivi commandes client (`/account/orders`).
- Navigation mobile avec menu lateral.
- CTA WhatsApp flottant (mobile icon-only).
- Footer premium et branding "Boutique en ligne + boutique physique".

CMS / pages publiques:
- Pages CMS dynamiques via `/pages/[slug]` -> `/api/v1/content/pages/{slug}/`.
- Route dediee `contact` ajoutee: `/pages/contact`.
- Formulaire de contact multi-objets avec champs conditionnels.
- Endpoint frontend de soumission MVP: `POST /api/contact` (ticket ID retourne).

Backoffice seller:
- Dashboard seller, produits, inventory items, commandes, contenu pages, audit.
- RBAC applique cote backend seller API.

Catalogue et seed:
- Seed Samsung multi-produits via `seed_demo_store`.
- Option `--download-images` disponible.
- Option `--clear-existing` pour reinitialiser le catalogue.

Branding:
- Logo Anata Store integre.
- Favicon base sur `favicon.jpg` (version zoomee pour meilleure visibilite).

## 5) Securite actuellement en place

Backend:
- Middleware `RequestId` + headers securite.
- JWT access/refresh avec rotation et blacklist.
- RBAC deny-by-default sur endpoints seller.
- Rate limiting DRF (`catalog`, `checkout`, `interaction`).
- Checkout COD transactionnel avec gestion conflit stock (409).

Frontend:
- Security headers via `next.config.ts` (CSP, frame, referrer, nosniff).
- Metadata/SEO + JSON-LD (`Organization`, `WebSite`, `Store`).
- Pages non publiques sensibles exclues du robots.

Notes:
- En dev, CSP est assouplie pour Next HMR (`unsafe-inline`, `unsafe-eval`).
- En prod, verifier politique CSP stricte finale.

## 6) Verifications et execution par vagues

Pipeline scripts:
- `scripts/execute_integration_waves.sh`
- checks bloquants par phase (`phase_1_check`, `phase_2_check`, `phase_3_check`)

Dernier rapport vert connu:
- `dev/reports/waves_20260301_221911/final_execution_report.md` -> SUCCESS

## 7) Etat Git de reference

Dernier commit pousse sur `main`:
- `4f9264f feat: polish premium storefront branding and product card layout`

Etat local courant:
- Des changements non pousses existent (contact dedie, formulaire, endpoint contact, favicon zoom et ajustements associes).

## 8) Mode de reprise rapide

Depuis la racine projet:

```bash
cd "/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium"
./dev-up.sh
```

Notes d'environnement:
- Le venv backend actif est `backend/.anata` (activation manuelle: `source backend/.anata/bin/activate`).
- `dev-up.sh` gere migrations, seed RBAC et seed catalogue (par defaut avec telechargement images si active).

URLs locales:
- Frontend: `http://127.0.0.1:3000`
- Backend API: `http://127.0.0.1:8000/api/v1`
- Admin Django: `http://127.0.0.1:8000/admin`

## 9) Limites MVP encore ouvertes

- Paiements en ligne hors COD non integres (mobile money, carte, passerelles).
- Formulaire contact actuellement en mode MVP local (endpoint frontend), pas encore relie a un CRM/email provider ou stockage backend dedie.
- Quelques elements UX peuvent encore etre ajustes (micro-interactions, coherence responsive fine, tests e2e front complets).

## 10) Priorites recommandees pour la prochaine reprise

1. Finaliser et pousser les changements locaux non commits (contact + favicon).
2. Brancher le formulaire contact sur un canal operationnel (email support/CRM/ticket DB).
3. Ajouter tests e2e frontend parcours critique (home -> PDP -> cart -> checkout -> success).
4. Consolider CSP production (sans casser Next runtime).
5. Cloturer backlog MVP restant avant phase paiement online V2.

## 11) Documents de reference internes

- `README.md`
- `MVP_PREMIUM_ALIGNMENT.md`
- `SECURITY_POLICIES_PREMIUM.md`
- `DEVELOPMENT_MODE_NO_BREAK.md`
- `specs/openapi_v1_mvp_premium.yaml`
- `dev/quality_gates.yaml`
