# Frontend MVP Premium (Next.js App Router)

## Lancer en local

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

## Parcours P0 inclus

- Home, PLP categorie/marque/recherche, PDP
- Panier et checkout COD
- Suivi commandes client
- Pages contenu et blog
- Seller Studio P0 (dashboard, produits, inventory, orders, contenu, audit)

## Acces Seller Studio

- URL locale: `http://127.0.0.1:3000/seller`
- Le Seller Studio n'est pas lie dans la navigation publique (header storefront).
- L'acces se fait par URL directe et exige un token JWT valide.
- Le frontend gere le refresh automatique du token en cas d'expiration de l'access token.

## Securite frontend

- Headers de securite dans `next.config.ts`
- Pas de wishlist
- API base URL configurable via env

## SEO MVP

- `NEXT_PUBLIC_SITE_URL` pour canonical/sitemap/robots
- Metadata dynamique sur Home, PDP, categorie, marque
- `robots.txt` et `sitemap.xml` generes via App Router
- JSON-LD `Organization`, `WebSite`, `Product`, `BreadcrumbList`
