# reco-100-produits

Date: 2026-03-05

## Objectif
Limiter le catalogue actif a 100 produits parents (singletons), avec leurs variantes, pour garder un MVP premium lisible, performant et maintenable.

## Regle de gouvernance
- Les 100 produits listes ci-dessous restent `is_active=true`.
- Tous les autres produits passent `is_active=false`.
- Toutes les variantes des produits hors Top 100 passent aussi `is_active=false`.
- Les variantes des 100 produits restent actives (sauf decision metier contraire).

## Methode de selection (objective)
- Seulement des produits avec prix exploitable (>0) et media present.
- Priorite aux categories coeur du MVP: smartphones et derives.
- Quotas cibles: 60 smartphones, 12 tablettes, 10 montres, 8 ecouteurs, 10 ordinateurs.

## Liste des 100 produits actifs

### Smartphones (60)

| # | Slug | Nom | Marque | Min prix |
|---:|---|---|---|---:|
| 1 | `apple-iphone-12` | Apple iPhone 12 | Apple | 120 000 FCFA |
| 2 | `apple-iphone-12-pro` | Apple iPhone 12 Pro | Apple | 170 000 FCFA |
| 3 | `apple-iphone-12-pro-max` | Apple iPhone 12 Pro Max | Apple | 190 000 FCFA |
| 4 | `apple-iphone-13` | Apple iPhone 13 | Apple | 175 000 FCFA |
| 5 | `apple-iphone-13-pro` | Apple iPhone 13 Pro | Apple | 225 000 FCFA |
| 6 | `apple-iphone-13-pro-max` | Apple iPhone 13 Pro Max | Apple | 250 000 FCFA |
| 7 | `apple-iphone-14` | Apple iPhone 14 | Apple | 210 000 FCFA |
| 8 | `apple-iphone-14-pro` | Apple iPhone 14 Pro | Apple | 275 000 FCFA |
| 9 | `apple-iphone-14-pro-max` | Apple iPhone 14 Pro Max | Apple | 300 000 FCFA |
| 10 | `apple-iphone-15` | Apple iPhone 15 | Apple | 290 000 FCFA |
| 11 | `apple-iphone-15-pro` | Apple iPhone 15 Pro | Apple | 370 000 FCFA |
| 12 | `apple-iphone-15-pro-max` | Apple iPhone 15 Pro Max | Apple | 450 000 FCFA |
| 13 | `apple-iphone-16-pro` | Apple iPhone 16 Pro | Apple | 470 000 FCFA |
| 14 | `apple-iphone-16-pro-max` | Apple iPhone 16 Pro Max | Apple | 580 000 FCFA |
| 15 | `google-pixel-7a` | Google Pixel 7A | Google | 220 000 FCFA |
| 16 | `google-pixel-7` | Google Pixel 7 | Google | 250 000 FCFA |
| 17 | `google-pixel-7pro` | Google Pixel 7PRO | Google | 280 000 FCFA |
| 18 | `google-pixel-8a` | Google Pixel 8A | Google | 250 000 FCFA |
| 19 | `google-pixel-8` | Google Pixel 8 | Google | 300 000 FCFA |
| 20 | `google-pixel-8pro` | Google Pixel 8PRO | Google | 330 000 FCFA |
| 21 | `google-pixel-9a` | Google Pixel 9A | Google | 280 000 FCFA |
| 22 | `google-pixel-9` | Google Pixel 9 | Google | 360 000 FCFA |
| 23 | `google-pixel-9pro` | Google Pixel 9PRO | Google | 470 000 FCFA |
| 24 | `google-pixel-9pro-xl` | Google Pixel 9PRO XL | Google | 520 000 FCFA |
| 25 | `google-pixel-9pro-fold` | Google Pixel 9PRO FOLD | Google | 700 000 FCFA |
| 26 | `google-pixel-10` | Google Pixel 10 | Google | 400 000 FCFA |
| 27 | `google-pixel-10pro` | Google Pixel 10PRO | Google | 620 000 FCFA |
| 28 | `google-pixel-10pro-fold` | Google Pixel 10PRO FOLD | Google | 850 000 FCFA |
| 29 | `sam-a07` | Sam-A07 | Samsung | 85 000 FCFA |
| 30 | `sam-a17` | Sam-A17 | Samsung | 149 000 FCFA |
| 31 | `sam-a26` | Sam-A26 | Samsung | 179 000 FCFA |
| 32 | `sam-a36` | Sam-A36 | Samsung | 219 000 FCFA |
| 33 | `sam-a56` | Sam-A56 | Samsung | 279 000 FCFA |
| 34 | `sam-flip5` | Sam-Flip5 | Samsung | 539 000 FCFA |
| 35 | `sam-flip6` | Sam-Flip6 | Samsung | 619 000 FCFA |
| 36 | `sam-flip7` | Sam-Flip7 | Samsung | 759 000 FCFA |
| 37 | `sam-fold4` | Sam-Fold4 | Samsung | 909 000 FCFA |
| 38 | `sam-fold5` | Sam-Fold5 | Samsung | 1 059 000 FCFA |
| 39 | `sam-fold6` | Sam-Fold6 | Samsung | 1 209 000 FCFA |
| 40 | `sam-fold7` | Sam-Fold7 | Samsung | 1 359 000 FCFA |
| 41 | `sam-s25` | Sam-S25 | Samsung | 669 000 FCFA |
| 42 | `sam-s25-u` | Sam-S25 U | Samsung | 1 159 000 FCFA |
| 43 | `sam-s25-plus` | Sam-S25+ | Samsung | 769 000 FCFA |
| 44 | `sam-s25ed` | Sam-S25ED | Samsung | 859 000 FCFA |
| 45 | `sam-s25fe` | Sam-S25FE | Samsung | 519 000 FCFA |
| 46 | `sam-s25fe-plus` | Sam-S25FE+ | Samsung | 569 000 FCFA |
| 47 | `samsung-a06` | Samsung A06 | Samsung | 55 000 FCFA |
| 48 | `samsung-a16` | Samsung A16 | Samsung | 80 000 FCFA |
| 49 | `samsung-a35` | Samsung A35 | Samsung | 160 000 FCFA |
| 50 | `samsung-a55` | Samsung A55 | Samsung | 170 000 FCFA |
| 51 | `samsung-s20` | Samsung S20 | Samsung | 200 000 FCFA |
| 52 | `samsung-s21` | Samsung S21 | Samsung | 230 000 FCFA |
| 53 | `samsung-s22` | Samsung S22 | Samsung | 230 000 FCFA |
| 54 | `samsung-s23` | Samsung S23 | Samsung | 270 000 FCFA |
| 55 | `samsung-s24` | Samsung S24 | Samsung | 290 000 FCFA |
| 56 | `samsung-s24ultra` | Samsung S24ULTRA | Samsung | 460 000 FCFA |
| 57 | `samsung-s25ultra` | Samsung S25ULTRA | Samsung | 515 000 FCFA |
| 58 | `samsung-note20ultra` | Samsung NOTE20ULTRA | Samsung | 400 000 FCFA |
| 59 | `samsung-fold-3` | Samsung FOLD 3 | Samsung | 400 000 FCFA |
| 60 | `samsung-flip-4` | Samsung FLIP 4 | Samsung | 270 000 FCFA |

### Tablettes (12)

| # | Slug | Nom | Marque | Min prix |
|---:|---|---|---|---:|
| 61 | `sam-tab-a11` | Sam-Tab A11 | Samsung | 199 000 FCFA |
| 62 | `sam-tab-a11-plus` | Sam-Tab A11+ | Samsung | 319 000 FCFA |
| 63 | `sam-tab-s11` | Sam-Tab S11 | Samsung | 569 000 FCFA |
| 64 | `sam-tab-s11-u` | Sam-Tab S11 U | Samsung | 959 000 FCFA |
| 65 | `sam-tab-s11-plus` | Sam-Tab S11+ | Samsung | 719 000 FCFA |
| 66 | `samsung-tab-a9` | Samsung TAB A9 | Samsung | 70 000 FCFA |
| 67 | `samsung-tab-a9plus` | Samsung TAB A9PLUS | Samsung | 115 000 FCFA |
| 68 | `samsung-tab-s6lite` | Samsung TAB S6LITE | Samsung | 160 000 FCFA |
| 69 | `samsung-tab-s8` | Samsung TAB S8 | Samsung | 320 000 FCFA |
| 70 | `samsung-tab-s9` | Samsung TAB S9 | Samsung | 320 000 FCFA |
| 71 | `samsung-tab-s10fe` | Samsung TAB S10FE | Samsung | 300 000 FCFA |
| 72 | `samsung-tab-s10fe-plus` | Samsung TAB S10FE+ | Samsung | 380 000 FCFA |

### Montres connectees (10)

| # | Slug | Nom | Marque | Min prix |
|---:|---|---|---|---:|
| 73 | `sam-watch-8` | Sam-Watch 8 | Samsung | 199 000 FCFA |
| 74 | `sam-watch8-classic` | Sam-Watch8 Classic | Samsung | 249 000 FCFA |
| 75 | `sam-watch-ultra` | Sam-Watch Ultra | Samsung | 349 000 FCFA |
| 76 | `sam-watch-ultra-2025` | Sam-Watch Ultra 2025 | Samsung | 399 000 FCFA |
| 77 | `samsung-watch-fe` | Samsung WATCH FE | Samsung | 80 000 FCFA |
| 78 | `samsung-watch-5pro` | Samsung WATCH 5PRO | Samsung | 140 000 FCFA |
| 79 | `samsung-watch-6` | Samsung WATCH 6 | Samsung | 90 000 FCFA |
| 80 | `samsung-watch-6-classic` | Samsung WATCH 6 CLASSIC | Samsung | 110 000 FCFA |
| 81 | `samsung-watch-7` | Samsung WATCH 7 | Samsung | 100 000 FCFA |
| 82 | `google-pixel-watch-4` | Google Pixel WATCH 4 | Google | 250 000 FCFA |

### Ecouteurs (8)

| # | Slug | Nom | Marque | Min prix |
|---:|---|---|---|---:|
| 83 | `google-pixel-buds-pro-2` | Google Pixel BUDS PRO 2 | Google | 120 000 FCFA |
| 84 | `sam-buds-3` | Sam-Buds 3 | Samsung | 89 000 FCFA |
| 85 | `sam-buds-pro3` | Sam-Buds Pro3 | Samsung | 139 000 FCFA |
| 86 | `samsung-buds-2-pro` | Samsung BUDS 2 PRO | Samsung | 65 000 FCFA |
| 87 | `samsung-buds-3` | Samsung BUDS 3 | Samsung | 60 000 FCFA |
| 88 | `samsung-buds-3-pro` | Samsung BUDS 3 PRO | Samsung | 75 000 FCFA |
| 89 | `samsung-buds-core` | Samsung BUDS CORE | Samsung | 35 000 FCFA |
| 90 | `samsung-buds-fe` | Samsung BUDS FE | Samsung | 35 000 FCFA |

### Ordinateurs (10)

| # | Slug | Nom | Marque | Min prix |
|---:|---|---|---|---:|
| 91 | `dell-dell-3520-i-3` | Dell DELL 3520 I 3 | Dell | 220 000 FCFA |
| 92 | `dell-dell-3530-i-5` | Dell DELL 3530 I 5 | Dell | 320 000 FCFA |
| 93 | `dell-dell-3530-i-7` | Dell DELL 3530 I 7 | Dell | 420 000 FCFA |
| 94 | `dell-dell-inspiron-i-7-tactile` | Dell DELL INSPIRON I 7 TACTILE | Dell | 450 000 FCFA |
| 95 | `lenovo-lenovo-thinkpad-e14-i-5` | Lenovo LENOVO THINKPAD E14 I 5 | Lenovo | 430 000 FCFA |
| 96 | `lenovo-lenovo-thinkpad-e16-i-7` | Lenovo LENOVO THINKPAD E16 I 7 | Lenovo | 600 000 FCFA |
| 97 | `hp-hp-victus-i-5-nvidia` | HP HP VICTUS I 5 NVIDIA | HP | 530 000 FCFA |
| 98 | `hp-hp-victus-i-7-nvidia` | HP HP VICTUS I 7 NVIDIA | HP | 730 000 FCFA |
| 99 | `hp-hp-spectre-14-x360-i-7` | HP HP SPECTRE 14 X360 I 7 | HP | 900 000 FCFA |
| 100 | `hp-hp-elitebook-840-i-7` | HP HP ELITEBOOK 840 I 7 | HP | 550 000 FCFA |

## Bloc technique Top100 (slugs source de verite)
Utiliser ce bloc pour les scripts d'activation/desactivation.

```text
TOP100_SLUGS_START
apple-iphone-12
apple-iphone-12-pro
apple-iphone-12-pro-max
apple-iphone-13
apple-iphone-13-pro
apple-iphone-13-pro-max
apple-iphone-14
apple-iphone-14-pro
apple-iphone-14-pro-max
apple-iphone-15
apple-iphone-15-pro
apple-iphone-15-pro-max
apple-iphone-16-pro
apple-iphone-16-pro-max
google-pixel-7a
google-pixel-7
google-pixel-7pro
google-pixel-8a
google-pixel-8
google-pixel-8pro
google-pixel-9a
google-pixel-9
google-pixel-9pro
google-pixel-9pro-xl
google-pixel-9pro-fold
google-pixel-10
google-pixel-10pro
google-pixel-10pro-fold
sam-a07
sam-a17
sam-a26
sam-a36
sam-a56
sam-flip5
sam-flip6
sam-flip7
sam-fold4
sam-fold5
sam-fold6
sam-fold7
sam-s25
sam-s25-u
sam-s25-plus
sam-s25ed
sam-s25fe
sam-s25fe-plus
samsung-a06
samsung-a16
samsung-a35
samsung-a55
samsung-s20
samsung-s21
samsung-s22
samsung-s23
samsung-s24
samsung-s24ultra
samsung-s25ultra
samsung-note20ultra
samsung-fold-3
samsung-flip-4
sam-tab-a11
sam-tab-a11-plus
sam-tab-s11
sam-tab-s11-u
sam-tab-s11-plus
samsung-tab-a9
samsung-tab-a9plus
samsung-tab-s6lite
samsung-tab-s8
samsung-tab-s9
samsung-tab-s10fe
samsung-tab-s10fe-plus
sam-watch-8
sam-watch8-classic
sam-watch-ultra
sam-watch-ultra-2025
samsung-watch-fe
samsung-watch-5pro
samsung-watch-6
samsung-watch-6-classic
samsung-watch-7
google-pixel-watch-4
google-pixel-buds-pro-2
sam-buds-3
sam-buds-pro3
samsung-buds-2-pro
samsung-buds-3
samsung-buds-3-pro
samsung-buds-core
samsung-buds-fe
dell-dell-3520-i-3
dell-dell-3530-i-5
dell-dell-3530-i-7
dell-dell-inspiron-i-7-tactile
lenovo-lenovo-thinkpad-e14-i-5
lenovo-lenovo-thinkpad-e16-i-7
hp-hp-victus-i-5-nvidia
hp-hp-victus-i-7-nvidia
hp-hp-spectre-14-x360-i-7
hp-hp-elitebook-840-i-7
TOP100_SLUGS_END
```

## Implementation immediate (produits hors Top100 -> is_active=false)
Depuis la racine du projet:

```bash
cd "/home/kayz/Documents/M. BAH-TREICHVILLE/mvp-premium"
./backend/.anata/bin/python backend/manage.py shell <<'PY'
from pathlib import Path
from catalog.models import Product, ProductVariant

content = Path('reco-100-produits.md').read_text(encoding='utf-8')
start = content.index('TOP100_SLUGS_START') + len('TOP100_SLUGS_START')
end = content.index('TOP100_SLUGS_END')
target = {line.strip() for line in content[start:end].splitlines() if line.strip()}

Product.objects.filter(slug__in=target).update(is_active=True)
Product.objects.exclude(slug__in=target).update(is_active=False)
ProductVariant.objects.filter(product__slug__in=target).update(is_active=True)
ProductVariant.objects.exclude(product__slug__in=target).update(is_active=False)

print('products_active', Product.objects.filter(is_active=True).count())
print('variants_active', ProductVariant.objects.filter(is_active=True).count())
PY
```

## Revue hebdomadaire Top100 (sorties/entrees)
Objectif: ajuster chaque semaine le Top100 selon ventes + demandes reelles, sans cassure operationnelle.

### Donnees minimales a utiliser
- Ventes 28 jours: somme des `OrderItem.qty` par produit (hors commandes annulees).
- Demandes 28 jours: fichier manuel `dev/weekly_demand_inputs.csv` rempli chaque semaine (slug, demand_points), base sur WhatsApp, appels, demandes boutique, formulaire contact.

### Score hebdomadaire recommande
`score = 0.70 * ventes_normalisees + 0.30 * demandes_normalisees`

### Regles d'entree/sortie
1. Sortie candidate: produit Top100 avec score tres bas 2 semaines consecutives OU 0 vente sur 28 jours.
2. Entree candidate: produit hors Top100 avec score superieur a au moins une sortie candidate.
3. Changement limite: maximum 10 remplacements par semaine (stabilite catalogue).
4. Validation humaine obligatoire (owner/seller) avant activation.

### Processus sans casser
1. Generer un rapport hebdo (`dev/reports/top100_weekly_YYYYMMDD.md`) avec: Top100 actuel, sorties proposees, entrees proposees, impact par categorie.
2. Appliquer en staging/local d'abord.
3. Verifier: `products_active == 100`, pages marque/categorie OK, panier/checkout OK.
4. Appliquer en production et archiver le rapport + la version du fichier `reco-100-produits.md`.

## Rappels operationnels
- Ne pas supprimer les produits hors Top100: seulement `is_active=false`.
- Conserver les media/variantes pour pouvoir reactiver rapidement.
- Toute modification du Top100 doit etre committee avec message explicite (`chore: refresh top100 catalog week XX`).
