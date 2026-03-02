# UI Map — V1 Legacy (P1) — Storefront + Seller Studio

## A) Storefront (Next.js)

### Global
- Header sticky: Search autosuggest, categories drawer, cart icon
- Footer: contact, livraison, retours, garantie, FAQ, blog

### Routes
- `/` Home (sections from Home Builder)
  - HERO
  - BRANDS
  - DEALS
  - BEST_SELLERS
  - NEW_ARRIVALS
  - CATEGORY_GRID
  - BANNERS

- `/c/[categorySlug]` Category listing (PLP)
- `/b/[brandSlug]` Brand hub page (PLP + sections)
- `/s` Search results page (PLP) with query & faceted filters
- `/p/[productSlug]` Product detail page (PDP)
  - Gallery (zoom), variant selector, availability, delivery ETA
  - Bundles & “souvent achetés ensemble”
  - Compare CTA
  - Reviews + Q&A

- `/compare` Compare 2–4 products
- `/cart` Cart page
- `/checkout` One-page checkout (COD only)
- `/order/success/[orderId]` Order success + next steps
- `/account/orders` My orders (customer auth strategy: session/OTP/JWT)
- `/account/orders/[orderId]` Order tracking + timeline
- `/returns/request` Return request form
- `/pages/[slug]` Static content pages (garantie, retours, FAQ, livraison, contact)
- `/blog` Blog index
- `/blog/[slug]` Blog post

### UX components (premium)
- Skeleton loaders for PLP/PDP/cart
- Sticky add-to-cart on PDP (mobile)
- Toast notifications (add to cart, order placed)
- Image optimization + lazy loading
- Accessibility: keyboard navigation for filters & variant selection


## B) Seller Studio (Next.js + React Admin)

### Navigation groups
1) Dashboard
2) Catalog
3) Inventory
4) Orders & COD
5) Promotions
6) Moderation
7) Content
8) Security
9) Audit

### Routes / Screens
- `/seller` Dashboard
  - KPI: commandes, CA, top produits, ruptures, COD encaissé vs attendu

**Catalog Studio**
- `/seller/catalog/products` (list + filters)
- `/seller/catalog/products/create`
- `/seller/catalog/products/[id]/edit`
  - Tabs: Basic, Variants (matrix editor), Media (drag/drop), SEO, Badges
- `/seller/catalog/brands`
- `/seller/catalog/categories`
- `/seller/catalog/attributes`

**Inventory**
- `/seller/inventory/sources`
- `/seller/inventory/items` (variant x source)
- `/seller/inventory/ledger`

**Orders & Fulfillment**
- `/seller/orders` (table view)
- `/seller/orders/kanban` (NEW/CONFIRMED/PACKING/OUT/DELIVERED)
- `/seller/orders/[id]` (detail, timeline, actions)
- `/seller/orders/[id]/print` (invoice/bon livraison PDF)

**COD**
- `/seller/cod/collections` (register cash received)
- `/seller/cod/reconciliation` (by date, by driver, export)

**Promotions (P1)**
- `/seller/promotions/deals`
- `/seller/promotions/coupons`
- `/seller/promotions/bundles`

**Moderation**
- `/seller/moderation/reviews` (approve/reject)
- `/seller/moderation/qna` (approve/reject + answer)
- `/seller/moderation/returns` (approve/reject + status)

**Content Studio**
- `/seller/content/home` (home builder blocks)
- `/seller/content/pages`
- `/seller/content/blog`

**Security**
- `/seller/security/users`
- `/seller/security/roles`

**Audit**
- `/seller/audit` (audit logs list + filters)

### RBAC UI behavior
- Menu items are hidden if the user lacks permission.
- Actions (approve/reject, status change, delete) are disabled + show tooltip if unauthorized.
