from __future__ import annotations

from html import escape
from pathlib import Path
import subprocess
from urllib.parse import urlparse
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from catalog.models import (
    Attribute,
    Brand,
    Category,
    MediaAsset,
    Product,
    ProductMedia,
    ProductVariant,
    VariantAttributeValue,
    VariantMedia,
)
from inventory.models import InventoryItem, InventorySource
from orders.models import DeliveryZone


class Command(BaseCommand):
    help = "Seed Samsung catalog from WhatsApp-style list (supports --volume and optional image download)"
    MAX_DERIVED_GALLERY_IMAGES = 4

    BASE_PRODUCTS = [
        {"name": "Sam-Fold4", "category": "smartphones", "storages": ["256GB", "512GB"], "colors": ["Vert", "Blanc", "Noir"]},
        {"name": "Sam-Fold5", "category": "smartphones", "storages": ["256GB", "512GB"], "colors": ["Noir", "Blanc", "Bleu"]},
        {"name": "Sam-Fold6", "category": "smartphones", "storages": ["256GB", "512GB"], "colors": ["Bleu", "Gris", "Rose"]},
        {"name": "Sam-Fold7", "category": "smartphones", "storages": ["256GB", "512GB", "1TB"], "colors": ["Bleu", "Gris", "Graphite", "Noir Mat"]},
        {"name": "Sam-Flip5", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-Flip6", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-Flip7", "category": "smartphones", "storages": ["256GB", "512GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-S25 U", "category": "smartphones", "storages": ["256GB", "512GB", "1TB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-S25ED", "category": "smartphones", "storages": ["256GB", "512GB"], "colors": ["Bleu", "Noir", "Gris"]},
        {"name": "Sam-S25+", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Noir", "Gris", "Bleu"]},
        {"name": "Sam-S25", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Gris"]},
        {"name": "Sam-S25FE+", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Gris", "Noir", "Bleu"]},
        {"name": "Sam-S25FE", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Gris", "Noir", "Bleu"]},
        {"name": "Sam-A56", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-A36", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-A26", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-A17", "category": "smartphones", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-A07", "category": "smartphones", "storages": ["64GB", "128GB"], "colors": ["Bleu", "Noir", "Blanc"]},
        {"name": "Sam-Tab S11 U", "category": "tablettes", "storages": ["256GB", "512GB"], "colors": ["Gris", "Noir", "Bleu"]},
        {"name": "Sam-Tab S11+", "category": "tablettes", "storages": ["128GB", "256GB"], "colors": ["Bleu", "Noir", "Gris"]},
        {"name": "Sam-Tab S11", "category": "tablettes", "storages": ["128GB", "256GB"], "colors": ["Noir", "Blanc", "Bleu"]},
        {"name": "Sam-Tab A11+", "category": "tablettes", "storages": ["128GB", "256GB"], "colors": ["Noir", "Bleu", "Blanc"]},
        {"name": "Sam-Tab A11", "category": "tablettes", "storages": ["64GB", "128GB"], "colors": ["Blanc", "Noir", "Bleu"]},
        {"name": "Sam-Watch Ultra 2025", "category": "montres-connectees", "storages": [], "colors": ["Bleu", "Noir"]},
        {"name": "Sam-Watch Ultra", "category": "montres-connectees", "storages": [], "colors": ["Noir", "Orange", "Blanc"]},
        {"name": "Sam-Watch8 Classic", "category": "montres-connectees", "storages": [], "colors": ["Blanc", "Noir"]},
        {"name": "Sam-Watch 8", "category": "montres-connectees", "storages": [], "colors": ["Blanc", "Noir"]},
        {"name": "Sam-Buds Pro3", "category": "ecouteurs", "storages": [], "colors": ["Blanc", "Noir"]},
        {"name": "Sam-Buds 3", "category": "ecouteurs", "storages": [], "colors": ["Blanc", "Noir"]},
    ]

    COLOR_CODES = {
        "Vert": "GRN",
        "Blanc": "WHT",
        "Noir": "BLK",
        "Bleu": "BLU",
        "Gris": "GRY",
        "Rose": "PNK",
        "Graphite": "GPH",
        "Noir Mat": "MAT",
        "Orange": "ORG",
    }

    STORAGE_PRICE_ADDONS = {
        "64GB": 0,
        "128GB": 20000,
        "256GB": 60000,
        "512GB": 140000,
        "1TB": 280000,
    }

    MODEL_BASE_PRICES = {
        "sam-fold4": 849000,
        "sam-fold5": 999000,
        "sam-fold6": 1149000,
        "sam-fold7": 1299000,
        "sam-flip5": 519000,
        "sam-flip6": 599000,
        "sam-flip7": 699000,
        "sam-s25-u": 1099000,
        "sam-s25ed": 799000,
        "sam-s25": 649000,
        "sam-s25plus": 749000,
        "sam-s25feplus": 549000,
        "sam-s25fe": 499000,
        "sam-a56": 259000,
        "sam-a36": 199000,
        "sam-a26": 159000,
        "sam-a17": 129000,
        "sam-a07": 85000,
        "sam-tab-s11-u": 899000,
        "sam-tab-s11plus": 699000,
        "sam-tab-s11": 549000,
        "sam-tab-a11plus": 299000,
        "sam-tab-a11": 199000,
        "sam-watch-ultra-2025": 399000,
        "sam-watch-ultra": 349000,
        "sam-watch8-classic": 249000,
        "sam-watch-8": 199000,
        "sam-buds-pro3": 139000,
        "sam-buds-3": 89000,
    }

    MODEL_IMAGE_URLS = {
        "sam-fold4": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold4.jpg",
        "sam-fold5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5.jpg",
        "sam-fold6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold6.jpg",
        "sam-fold7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold7.jpg",
        "sam-flip5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5.jpg",
        "sam-flip6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip6.jpg",
        "sam-flip7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip7.jpg",
        "sam-s25-u": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg",
        "sam-s25ed": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-edge.jpg",
        "sam-s25plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-plus-sm-s936.jpg",
        "sam-s25": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-sm-s931.jpg",
        "sam-s25feplus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-fe.jpg",
        "sam-s25fe": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-fe.jpg",
        "sam-a56": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a56-.jpg",
        "sam-a36": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a36.jpg",
        "sam-a26": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a26.jpg",
        "sam-a17": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a17.jpg",
        "sam-a07": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a07.jpg",
        "sam-tab-s11-u": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s11-ultra.jpg",
        "sam-tab-s11plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s11-ultra.jpg",
        "sam-tab-s11": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s11.jpg",
        "sam-tab-a11plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-a11-plus.jpg",
        "sam-tab-a11": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-a11.jpg",
        "sam-watch-ultra-2025": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-ultra.jpg",
        "sam-watch-ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-ultra.jpg",
        "sam-watch8-classic": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch8-classic.jpg",
        "sam-watch-8": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch8.jpg",
    }

    MODEL_GALLERY_IMAGE_URLS = {
        "sam-s25-u": [
            "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg",
            "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s25-ultra-sm-s938-1.jpg",
            "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s25-ultra-sm-s938-2.jpg",
            "https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-s25-ultra-sm-s938-3.jpg",
        ],
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--volume",
            type=int,
            default=len(self.BASE_PRODUCTS),
            help="Nombre de produits a generer (ex: --volume 50)",
        )
        parser.add_argument(
            "--clear-existing",
            action="store_true",
            help="Desactive tous les produits/variantes existants avant le seed",
        )
        parser.add_argument(
            "--download-images",
            action="store_true",
            help="Telecharge des images produit locales (media/seed)",
        )
        parser.add_argument(
            "--media-base-url",
            type=str,
            default="http://127.0.0.1:8000",
            help="Base URL publique pour servir les images locales",
        )

    @staticmethod
    def _normalize_model_key(name: str) -> str:
        return slugify(name.lower().replace("+", "plus"))

    def _base_price_for(self, name: str, category: str) -> int:
        key = self._normalize_model_key(name)
        if key in self.MODEL_BASE_PRICES:
            return self.MODEL_BASE_PRICES[key]
        if category == "smartphones":
            return 299000
        if category == "tablettes":
            return 399000
        if category == "montres-connectees":
            return 179000
        return 89000

    @staticmethod
    def _default_ram(storage: str | None, category: str) -> str | None:
        if category in {"montres-connectees", "ecouteurs"}:
            return None
        if storage in {"64GB", "128GB"}:
            return "6GB"
        if storage in {"256GB"}:
            return "8GB"
        if storage in {"512GB", "1TB"}:
            return "12GB"
        return "8GB"

    def _seed_image_from_source(
        self,
        *,
        source_url: str | None,
        file_stem: str,
        product_name: str,
        download_images: bool,
        media_base_url: str,
        allow_svg_fallback: bool,
    ) -> str | None:
        media_root = getattr(settings, "MEDIA_ROOT", Path(settings.BASE_DIR) / "media")
        media_dir = Path(media_root) / "seed"
        media_dir.mkdir(parents=True, exist_ok=True)
        jpg_file = media_dir / f"{file_stem}.jpg"
        svg_file = media_dir / f"{file_stem}.svg"
        base_url = media_base_url.rstrip("/")

        if jpg_file.exists():
            return f"{base_url}/media/seed/{jpg_file.name}"

        try:
            if download_images and source_url:
                request = Request(
                    source_url,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                            "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
                        ),
                        "Referer": "https://www.gsmarena.com/",
                        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                    },
                )
                with urlopen(request, timeout=20) as response:
                    if response.status != 200:
                        raise URLError(f"Unexpected status {response.status}")
                    jpg_file.write_bytes(response.read())
                return f"{base_url}/media/seed/{jpg_file.name}"
        except (URLError, OSError):
            pass
        try:
            if download_images and source_url:
                result = subprocess.run(
                    ["curl", "-L", "--fail", "-o", str(jpg_file), source_url],
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=30,
                )
                if result.returncode == 0 and jpg_file.exists():
                    return f"{base_url}/media/seed/{jpg_file.name}"
        except (OSError, subprocess.SubprocessError):
            pass

        if not allow_svg_fallback:
            return None
        if not svg_file.exists():
            svg_file.write_text(self._build_local_seed_svg(product_name), encoding="utf-8")
        return f"{base_url}/media/seed/{svg_file.name}"

    def _derived_gallery_urls_from_primary(self, primary_url: str) -> list[str]:
        parsed = urlparse(primary_url)
        filename = Path(parsed.path).name
        if not filename.lower().endswith(".jpg"):
            return []
        if "/vv/bigpic/" not in parsed.path:
            return []
        stem = filename[:-4]
        return [
            f"https://fdn2.gsmarena.com/vv/pics/samsung/{stem}-{index}.jpg"
            for index in range(1, self.MAX_DERIVED_GALLERY_IMAGES + 1)
        ]

    def _candidate_gallery_source_urls(self, model_key: str) -> list[str]:
        primary_url = self.MODEL_IMAGE_URLS.get(model_key)
        explicit_gallery = self.MODEL_GALLERY_IMAGE_URLS.get(model_key, [])
        seen: set[str] = set()
        ordered_urls: list[str] = []

        def push(url: str | None) -> None:
            if not url or url in seen:
                return
            seen.add(url)
            ordered_urls.append(url)

        push(primary_url)
        for url in explicit_gallery:
            push(url)
        if primary_url:
            for url in self._derived_gallery_urls_from_primary(primary_url):
                push(url)
        return ordered_urls

    def _product_image_urls(
        self,
        *,
        model_key: str,
        product_slug: str,
        product_name: str,
        download_images: bool,
        media_base_url: str,
    ) -> list[str]:
        source_urls = self._candidate_gallery_source_urls(model_key)
        if source_urls:
            image_urls: list[str] = []
            for index, source_url in enumerate(source_urls, start=1):
                image_url = self._seed_image_from_source(
                    source_url=source_url,
                    file_stem=f"{product_slug}-{index}",
                    product_name=product_name,
                    download_images=download_images,
                    media_base_url=media_base_url,
                    allow_svg_fallback=index == 1,
                )
                if image_url:
                    image_urls.append(image_url)
            if image_urls:
                return image_urls

        image_url = self._seed_image_from_source(
            source_url=self.MODEL_IMAGE_URLS.get(model_key),
            file_stem=product_slug,
            product_name=product_name,
            download_images=download_images,
            media_base_url=media_base_url,
            allow_svg_fallback=True,
        )
        return [image_url] if image_url else []

    @staticmethod
    def _build_local_seed_svg(product_name: str) -> str:
        safe_name = escape(product_name)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-label="{safe_name}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="55%" stop-color="#0b2538" />
      <stop offset="100%" stop-color="#0e7490" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)" />
  <circle cx="980" cy="170" r="220" fill="#f97316" opacity="0.22" />
  <circle cx="160" cy="1030" r="260" fill="#06b6d4" opacity="0.2" />
  <rect x="210" y="220" width="780" height="760" rx="48" fill="#ffffff" opacity="0.08" />
  <text x="600" y="520" text-anchor="middle" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">ANATA STORE</text>
  <text x="600" y="600" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700">{safe_name}</text>
  <text x="600" y="680" text-anchor="middle" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="30">Samsung Official Catalog</text>
</svg>
"""

    def _build_products_seed(self, *, volume: int) -> list[dict]:
        rows = []
        base_count = len(self.BASE_PRODUCTS)
        for idx in range(volume):
            template = self.BASE_PRODUCTS[idx % base_count]
            cycle = idx // base_count
            product_position = idx + 1

            base_name = " ".join(template["name"].split())
            product_name = base_name if cycle == 0 else f"{base_name} Serie {cycle + 1}"
            product_slug = slugify(product_name.replace("+", " plus "))
            short_description = (
                f"{product_name} officiel Samsung, garantie 12 mois, livraison rapide CI."
            )
            description = (
                f"{product_name} - modele premium Samsung. Couleurs officielles et stockage "
                f"selon disponibilite. Paiement a la livraison (COD)."
            )

            storages = template["storages"] if template["storages"] else [None]
            variants = []
            base_price = self._base_price_for(base_name, template["category"])

            for storage_index, storage in enumerate(storages):
                storage_addon = self.STORAGE_PRICE_ADDONS.get(storage or "", 0)
                for color_index, color in enumerate(template["colors"]):
                    color_code = self.COLOR_CODES.get(color, "CLR")
                    storage_code = (
                        storage.replace("GB", "G").replace("TB", "T") if storage else "STD"
                    )
                    sku = f"SM{product_position:03d}-{storage_code}-{color_code}-{cycle + 1:02d}"

                    price = base_price + storage_addon + cycle * 12000
                    use_promo = ((product_position + storage_index + color_index) % 3) == 0
                    promo = int(price * 0.94) if use_promo else None

                    # Variantes alternent entre IN_STOCK et AVAILABLE_SOON
                    qty = ((product_position + storage_index + color_index) % 7) + 1
                    if ((product_position + storage_index + color_index) % 5) == 0:
                        qty = 0

                    variants.append(
                        {
                            "sku": sku,
                            "price": price,
                            "promo": promo,
                            "ram": self._default_ram(storage, template["category"]),
                            "storage": storage,
                            "color": color,
                            "qty": qty,
                        }
                    )

            rows.append(
                {
                    "name": product_name,
                    "slug": product_slug,
                    "model_key": self._normalize_model_key(base_name),
                    "category_key": template["category"],
                    "short_description": short_description,
                    "description": description,
                    "variants": variants,
                }
            )
        return rows

    @transaction.atomic
    def handle(self, *args, **options):
        volume = options.get("volume", len(self.BASE_PRODUCTS))
        if volume < 1:
            raise CommandError("--volume doit etre >= 1")
        clear_existing = bool(options.get("clear_existing"))
        download_images = bool(options.get("download_images"))
        media_base_url = options.get("media_base_url", "http://127.0.0.1:8000")

        ram_attr, _ = Attribute.objects.get_or_create(
            key="ram",
            defaults={"label": "RAM", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 1},
        )
        storage_attr, _ = Attribute.objects.get_or_create(
            key="storage",
            defaults={
                "label": "Stockage",
                "type": Attribute.SELECT,
                "is_filterable": True,
                "sort_order": 2,
            },
        )
        color_attr, _ = Attribute.objects.get_or_create(
            key="color",
            defaults={"label": "Couleur", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 3},
        )

        samsung, _ = Brand.objects.get_or_create(
            slug="samsung",
            defaults={
                "name": "Samsung",
                "description": "Catalogue Samsung smartphones, tablettes, montres et buds",
                "logo_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
                "is_active": True,
            },
        )

        smartphones, _ = Category.objects.get_or_create(
            slug="smartphones",
            defaults={"name": "Smartphones", "sort_order": 1, "is_active": True},
        )
        tablettes, _ = Category.objects.get_or_create(
            slug="tablettes",
            defaults={"name": "Tablettes", "sort_order": 2, "is_active": True},
        )
        montres, _ = Category.objects.get_or_create(
            slug="montres-connectees",
            defaults={"name": "Montres connectees", "sort_order": 3, "is_active": True},
        )
        ecouteurs, _ = Category.objects.get_or_create(
            slug="ecouteurs",
            defaults={"name": "Ecouteurs", "sort_order": 4, "is_active": True},
        )
        ordinateurs, _ = Category.objects.get_or_create(
            slug="ordinateurs",
            defaults={"name": "Ordinateurs", "sort_order": 5, "is_active": True},
        )

        internal_source, _ = InventorySource.objects.get_or_create(
            name="Entrepot Abidjan",
            defaults={"type": InventorySource.INTERNAL, "lead_time_days": 0, "is_active": True},
        )
        partner_source, _ = InventorySource.objects.get_or_create(
            name="Partenaire Dubai",
            defaults={"type": InventorySource.PARTNER, "lead_time_days": 5, "is_active": True},
        )

        if clear_existing:
            Product.objects.update(is_active=False)
            ProductVariant.objects.update(is_active=False)

        products_seed = self._build_products_seed(volume=volume)
        categories = {
            "smartphones": smartphones,
            "tablettes": tablettes,
            "montres-connectees": montres,
            "ecouteurs": ecouteurs,
            "ordinateurs": ordinateurs,
        }

        product_count = 0
        variant_count = 0

        for row in products_seed:
            product, _ = Product.objects.update_or_create(
                slug=row["slug"],
                defaults={
                    "name": row["name"],
                    "brand": samsung,
                    "category": categories[row["category_key"]],
                    "short_description": row["short_description"],
                    "description": row["description"],
                    "is_active": True,
                    "is_featured": True,
                    "badges": ["Original", "Garantie 12 mois"],
                    "seo_title": row["name"],
                    "seo_description": row["short_description"],
                },
            )
            product_count += 1

            image_urls = self._product_image_urls(
                model_key=row["model_key"],
                product_slug=row["slug"],
                product_name=row["name"],
                download_images=download_images,
                media_base_url=media_base_url,
            )
            media_assets: list[MediaAsset] = []
            for sort_order, image_url in enumerate(image_urls, start=1):
                media_asset, _ = MediaAsset.objects.update_or_create(
                    url=image_url,
                    defaults={
                        "alt": f"{row['name']} - Vue {sort_order}",
                        "kind": MediaAsset.IMAGE,
                        "sort_order": sort_order,
                    },
                )
                ProductMedia.objects.update_or_create(
                    product=product,
                    media_asset=media_asset,
                    defaults={"sort_order": sort_order},
                )
                media_assets.append(media_asset)

            if media_assets:
                ProductMedia.objects.filter(product=product).exclude(
                    media_asset_id__in=[asset.id for asset in media_assets]
                ).delete()
                primary_media_asset = media_assets[0]
            else:
                primary_media_asset = None

            for variant_row in row["variants"]:
                variant, _ = ProductVariant.objects.update_or_create(
                    sku=variant_row["sku"],
                    defaults={
                        "product": product,
                        "price_amount": variant_row["price"],
                        "promo_price_amount": variant_row["promo"],
                        "is_active": True,
                    },
                )
                variant_count += 1

                if variant_row["ram"]:
                    VariantAttributeValue.objects.update_or_create(
                        variant=variant,
                        attribute_key=ram_attr.key,
                        defaults={"value": variant_row["ram"], "label": variant_row["ram"]},
                    )
                else:
                    VariantAttributeValue.objects.filter(
                        variant=variant, attribute_key=ram_attr.key
                    ).delete()
                if variant_row["storage"]:
                    VariantAttributeValue.objects.update_or_create(
                        variant=variant,
                        attribute_key=storage_attr.key,
                        defaults={"value": variant_row["storage"], "label": variant_row["storage"]},
                    )
                VariantAttributeValue.objects.update_or_create(
                    variant=variant,
                    attribute_key=color_attr.key,
                    defaults={"value": variant_row["color"], "label": variant_row["color"]},
                )

                if primary_media_asset:
                    VariantMedia.objects.filter(variant=variant).exclude(
                        media_asset=primary_media_asset
                    ).delete()
                    VariantMedia.objects.update_or_create(
                        variant=variant,
                        media_asset=primary_media_asset,
                        defaults={"sort_order": 1},
                    )

                InventoryItem.objects.update_or_create(
                    variant=variant,
                    source=internal_source,
                    defaults={"qty_on_hand": variant_row["qty"], "low_stock_threshold": 2},
                )

                if variant_row["qty"] == 0:
                    InventoryItem.objects.update_or_create(
                        variant=variant,
                        source=partner_source,
                        defaults={"qty_on_hand": 5, "lead_time_days": 5, "low_stock_threshold": 1},
                    )
                else:
                    InventoryItem.objects.filter(variant=variant, source=partner_source).delete()

        DeliveryZone.objects.get_or_create(
            name="Abidjan",
            defaults={"fee_amount": 3000, "eta_days_min": 1, "eta_days_max": 2, "is_active": True},
        )
        DeliveryZone.objects.get_or_create(
            name="Interieur pays",
            defaults={"fee_amount": 6000, "eta_days_min": 2, "eta_days_max": 5, "is_active": True},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed OK: {product_count} produits, {variant_count} variantes (volume={volume}, "
                f"clear_existing={clear_existing}, download_images={download_images})."
            )
        )
