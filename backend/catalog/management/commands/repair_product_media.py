from __future__ import annotations

from collections import Counter
from html import escape
from pathlib import Path
import hashlib
import re
import shutil
import subprocess
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import MediaAsset, Product, ProductMedia


class Command(BaseCommand):
    help = (
        "Repare les images produits: remplace les visuels generiques repetes, "
        "garantit un media principal coherent pour chaque produit actif."
    )

    OFFICIAL_URL_BY_TOKEN = [
        ("S25ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg"),
        ("S25U", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg"),
        ("S25PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-plus-sm-s936.jpg"),
        ("S25EDGE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-edge.jpg"),
        ("S25FEPLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-fe-r1.jpg"),
        ("S25FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-fe-r1.jpg"),
        ("S25", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-sm-s931.jpg"),
        ("S24ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra.jpg"),
        ("S24PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-sm-s926.jpg"),
        ("S24FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-fe-r1.jpg"),
        ("S24", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24.jpg"),
        ("S23ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg"),
        ("S23PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-plus-5g.jpg"),
        ("S23FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-fe-r1.jpg"),
        ("S23", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-5g.jpg"),
        ("S22ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-ultra-5g.jpg"),
        ("S22PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-plus-5g.jpg"),
        ("S22U", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-ultra-5g.jpg"),
        ("S22", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-5g.jpg"),
        ("S21ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-ultra-5g.jpg"),
        ("S21PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-plus-5g.jpg"),
        ("S21FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-fe-5g.jpg"),
        ("S21", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-5g.jpg"),
        ("S20ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20-ultra-.jpg"),
        ("S20PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20-plus.jpg"),
        ("S20FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20-fe.jpg"),
        ("S20", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20.jpg"),
        ("NOTE20ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-note20-ultra-.jpg"),
        ("NOTE20", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-note20.jpg"),
        ("NOTE10PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-note10-plus-r.jpg"),
        ("FOLD7", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold7.jpg"),
        ("FOLD6", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold6.jpg"),
        ("FOLD5", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5.jpg"),
        ("FOLD4", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold4.jpg"),
        ("FOLD3", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold3-5g.jpg"),
        ("FLIP7", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip7.jpg"),
        ("FLIP6", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip6.jpg"),
        ("FLIP5", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5.jpg"),
        ("FLIP4", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip4.jpg"),
        ("FLIP3", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip3-5g.jpg"),
        ("TABS10FEPLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s10-fe-plus.jpg"),
        ("TABS10FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s10-fe.jpg"),
        ("TABS9FEPLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s9-fe-plus.jpg"),
        ("TABS9FE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s9-fe.jpg"),
        ("TABS9", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s9.jpg"),
        ("TABS8", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s8.jpg"),
        ("TABA9PLUS", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-a9-plus.jpg"),
        ("TABA9", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-a9.jpg"),
        ("TABA8", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-a8-105-2021.jpg"),
        ("WATCHULTRA2025", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-ultra.jpg"),
        ("WATCHULTRA2024", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-ultra.jpg"),
        ("WATCHULTRA", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-ultra.jpg"),
        ("WATCH8CLASSIC", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch8-classic.jpg"),
        ("WATCH8", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch8.jpg"),
        ("WATCH7", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch7.jpg"),
        ("WATCH6CLASSIC", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch6-classic.jpg"),
        ("WATCH6", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch6.jpg"),
        ("WATCH5PRO", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch5-pro.jpg"),
        ("WATCH5", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch5.jpg"),
        ("WATCHFE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch-fe-r.jpg"),
        ("BUDS3PRO", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds3-pro.jpg"),
        ("BUDS3", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds3.jpg"),
        ("BUDS2PRO", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds2-pro.jpg"),
        ("BUDSFE", "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds-fe.jpg"),
        ("PIXEL10PROFOLD", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-fold.jpg"),
        ("PIXEL10PRO", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro.jpg"),
        ("PIXEL10", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9.jpg"),
        ("PIXEL9PROFOLD", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-fold.jpg"),
        ("PIXEL9PROXL", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-xl.jpg"),
        ("PIXEL9PRO", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro.jpg"),
        ("PIXEL9A", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9a.jpg"),
        ("PIXEL9", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9.jpg"),
        ("PIXEL8PRO", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg"),
        ("PIXEL8A", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg"),
        ("PIXEL8", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8.jpg"),
        ("PIXEL7PRO", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel7-pro-new.jpg"),
        ("PIXEL7A", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-7a-r.jpg"),
        ("PIXEL7", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel7.jpg"),
        ("PIXELWATCH4", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-watch-4.jpg"),
        ("PIXELWATCH3", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-watch-3.jpg"),
        ("PIXELBUDSPRO2", "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-buds-pro-2.jpg"),
        ("XIAOMI15ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-15-ultra.jpg"),
        ("XIAOMI14ULTRA", "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg"),
        ("REDMINOTE15PROPLUS", "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-pro-plus-5g.jpg"),
        ("REDMINOTE15PRO", "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-pro-5g.jpg"),
        ("REDMINOTE15", "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14.jpg"),
    ]
    BAD_IMAGE_SHA1 = {
        # Visuel smartphone generique detecte sur plusieurs references non smartphones.
        "75a8c1a57a87c61644503c2e46fee5c08407c28c",
    }

    LOCAL_SEED_BY_TOKEN = [
        ("S25ULTRA", "sam-s25-u-1.jpg"),
        ("S25U", "sam-s25-u-1.jpg"),
        ("S25PLUS", "sam-s25-plus-1.jpg"),
        ("S25EDGE", "sam-s25ed-1.jpg"),
        ("S25ED", "sam-s25ed-1.jpg"),
        ("S25FEPLUS", "sam-s25fe-plus-1.jpg"),
        ("S25FE", "sam-s25fe-1.jpg"),
        ("S25", "sam-s25-1.jpg"),
        ("FOLD7", "sam-fold7-1.jpg"),
        ("FOLD6", "sam-fold6-1.jpg"),
        ("FOLD5", "sam-fold5-1.jpg"),
        ("FOLD4", "sam-fold4-1.jpg"),
        ("FLIP7", "sam-flip7-1.jpg"),
        ("FLIP6", "sam-flip6-1.jpg"),
        ("FLIP5", "sam-flip5-1.jpg"),
        ("A56", "sam-a56-1.jpg"),
        ("A36", "sam-a36-1.jpg"),
        ("A26", "sam-a26-1.jpg"),
        ("A17", "sam-a17-1.jpg"),
        ("A07", "sam-a07-1.jpg"),
        ("TABS11U", "sam-tab-s11-u-1.jpg"),
        ("TABS11PLUS", "sam-tab-s11-plus-1.jpg"),
        ("TABS11", "sam-tab-s11-1.jpg"),
        ("TABA11PLUS", "sam-tab-a11-plus-1.jpg"),
        ("TABA11", "sam-tab-a11-1.jpg"),
        ("WATCHULTRA2025", "sam-watch-ultra-2025-1.jpg"),
        ("WATCHULTRA", "sam-watch-ultra-1.jpg"),
        ("WATCH8CLASSIC", "sam-watch8-classic-1.jpg"),
        ("WATCH8", "sam-watch-8-1.jpg"),
    ]

    MOBILE_CATEGORY_SLUGS = {"smartphones", "tablettes", "montres-connectees", "ecouteurs"}

    def add_arguments(self, parser):
        parser.add_argument(
            "--media-base-url",
            type=str,
            default="http://127.0.0.1:8000",
            help="Base URL publique utilisee dans les media assets.",
        )
        parser.add_argument(
            "--refresh-all",
            action="store_true",
            help="Regenere le media principal de tous les produits actifs.",
        )
        parser.add_argument(
            "--upgrade-mobile-svg",
            action="store_true",
            help="Passe en priorite les produits mobiles dont le media principal est en SVG.",
        )
        parser.add_argument(
            "--only-category",
            type=str,
            default="",
            help="Slug categorie a traiter uniquement (ex: ecouteurs).",
        )
        parser.add_argument(
            "--only-brand",
            type=str,
            default="",
            help="Slug marque a traiter uniquement (ex: samsung).",
        )
        parser.add_argument(
            "--name-contains",
            type=str,
            default="",
            help="Filtre texte insensible a la casse sur le nom produit.",
        )

    @staticmethod
    def _normalized_token(value: str) -> str:
        return re.sub(r"[^A-Z0-9]+", "", value.upper())

    @staticmethod
    def _path_from_media_url(url: str) -> Path | None:
        marker = "/media/seed/"
        if marker not in url:
            return None
        rel = url.split(marker, 1)[1].strip("/")
        if not rel:
            return None
        return Path(settings.MEDIA_ROOT) / "seed" / rel

    @staticmethod
    def _sha1_of_file(path: Path) -> str | None:
        if not path.exists() or not path.is_file():
            return None
        return hashlib.sha1(path.read_bytes()).hexdigest()

    @staticmethod
    def _download_image(source_url: str, destination: Path) -> bool:
        try:
            req = Request(
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
            with urlopen(req, timeout=14) as response:
                if response.status != 200:
                    return False
                content_type = (response.headers.get("Content-Type") or "").lower()
                payload = response.read()
                if not content_type.startswith("image/"):
                    return False
                if len(payload) < 1024:
                    return False
                digest = hashlib.sha1(payload).hexdigest()
                if digest in Command.BAD_IMAGE_SHA1:
                    return False
                destination.write_bytes(payload)
                return True
        except (URLError, OSError):
            pass

        try:
            result = subprocess.run(
                ["curl", "-L", "--fail", "-o", str(destination), source_url],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=18,
            )
            if result.returncode != 0 or not destination.exists():
                return False
            if destination.stat().st_size < 1024:
                return False
            digest = hashlib.sha1(destination.read_bytes()).hexdigest()
            if digest in Command.BAD_IMAGE_SHA1:
                return False
            header = destination.read_bytes()[:4]
            if header.startswith(b"\xff\xd8\xff") or header.startswith(b"\x89PNG") or header.startswith(b"RIFF"):
                return True
        except (OSError, subprocess.SubprocessError):
            return False
        return False

    def _resolve_local_seed_photo(self, product: Product) -> Path | None:
        token = self._normalized_token(f"{product.brand.name} {product.name}")
        for pattern, filename in self.LOCAL_SEED_BY_TOKEN:
            if pattern in token:
                candidate = Path(settings.MEDIA_ROOT) / "seed" / filename
                if candidate.exists() and candidate.is_file():
                    return candidate
        return None

    @staticmethod
    def _palette_for_category(category_slug: str) -> tuple[str, str, str]:
        palettes = {
            "smartphones": ("#0f172a", "#1d4ed8", "#f97316"),
            "tablettes": ("#0b2538", "#0891b2", "#f59e0b"),
            "montres-connectees": ("#111827", "#334155", "#22d3ee"),
            "ecouteurs": ("#1f2937", "#0ea5e9", "#fb7185"),
            "ordinateurs": ("#0f172a", "#14532d", "#16a34a"),
            "imprimantes": ("#1e1b4b", "#312e81", "#60a5fa"),
            "ecrans": ("#111827", "#4338ca", "#38bdf8"),
            "machines-a-compter": ("#3f3f46", "#0f172a", "#a3e635"),
            "onduleurs": ("#111827", "#064e3b", "#34d399"),
        }
        return palettes.get(category_slug, ("#0f172a", "#0b2538", "#0ea5e9"))

    def _build_svg(self, product_name: str, category_slug: str) -> str:
        c1, c2, c3 = self._palette_for_category(category_slug)
        safe_name = escape(product_name)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-label="{safe_name}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}" />
      <stop offset="60%" stop-color="{c2}" />
      <stop offset="100%" stop-color="{c3}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)" />
  <circle cx="980" cy="180" r="220" fill="#ffffff" opacity="0.12" />
  <circle cx="160" cy="1030" r="260" fill="#ffffff" opacity="0.08" />
  <rect x="180" y="220" width="840" height="760" rx="48" fill="#ffffff" opacity="0.08" />
  <text x="600" y="500" text-anchor="middle" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700">ANATA STORE</text>
  <text x="600" y="585" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">{safe_name}</text>
  <text x="600" y="670" text-anchor="middle" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="30">Visuel catalogue premium</text>
</svg>
"""

    def _resolve_official_url(self, product: Product) -> str | None:
        token = self._normalized_token(f"{product.brand.name} {product.name}")
        for pattern, url in self.OFFICIAL_URL_BY_TOKEN:
            if pattern in token:
                return url
        return None

    def _upsert_primary_media(self, product: Product, asset_url: str) -> None:
        primary_link = product.media_links.select_related("media_asset").order_by("sort_order", "created_at").first()
        if primary_link:
            asset = primary_link.media_asset
            asset.url = asset_url
            asset.alt = product.name
            asset.kind = MediaAsset.IMAGE
            asset.sort_order = 0
            asset.save(update_fields=["url", "alt", "kind", "sort_order"])
            if primary_link.sort_order != 0:
                primary_link.sort_order = 0
                primary_link.save(update_fields=["sort_order", "updated_at"])
            return

        asset = MediaAsset.objects.create(
            url=asset_url,
            alt=product.name,
            kind=MediaAsset.IMAGE,
            sort_order=0,
        )
        ProductMedia.objects.create(product=product, media_asset=asset, sort_order=0)

    def handle(self, *args, **options):
        media_base_url = str(options["media_base_url"]).strip() or "http://127.0.0.1:8000"
        refresh_all = bool(options["refresh_all"])
        upgrade_mobile_svg = bool(options["upgrade_mobile_svg"])
        only_category = str(options["only_category"]).strip().lower()
        only_brand = str(options["only_brand"]).strip().lower()
        name_contains = str(options["name_contains"]).strip().lower()
        base_url = media_base_url.rstrip("/")

        media_dir = Path(settings.MEDIA_ROOT) / "seed"
        media_dir.mkdir(parents=True, exist_ok=True)

        products = Product.objects.filter(is_active=True).select_related("brand", "category")
        if only_category:
            products = products.filter(category__slug=only_category)
        if only_brand:
            products = products.filter(brand__slug=only_brand)
        if name_contains:
            products = products.filter(name__icontains=name_contains)
        products = products.order_by("name")

        hash_counter: Counter[str] = Counter()
        for product in products:
            primary_link = product.media_links.select_related("media_asset").order_by("sort_order", "created_at").first()
            if not primary_link:
                continue
            media_path = self._path_from_media_url(primary_link.media_asset.url)
            if not media_path:
                continue
            digest = self._sha1_of_file(media_path)
            if digest:
                hash_counter[digest] += 1

        bad_hashes = {digest for digest, count in hash_counter.items() if count >= 12}
        if bad_hashes:
            self.stdout.write(f"Hashs generiques detectes: {len(bad_hashes)}")
            for digest in sorted(bad_hashes):
                self.stdout.write(f" - {digest} ({hash_counter[digest]} occurrences)")
        else:
            self.stdout.write("Aucun hash generique detecte.")

        repaired = 0
        official_applied = 0
        svg_applied = 0
        missing_fixed = 0

        total = products.count()
        for index, product in enumerate(products, start=1):
            if index % 25 == 0:
                self.stdout.write(f"Progression media: {index}/{total}")

            primary_link = product.media_links.select_related("media_asset").order_by("sort_order", "created_at").first()
            needs_fix = refresh_all
            missing_media = False

            if not primary_link:
                needs_fix = True
                missing_media = True
            else:
                media_path = self._path_from_media_url(primary_link.media_asset.url)
                digest = self._sha1_of_file(media_path) if media_path else None
                if not media_path or not media_path.exists():
                    needs_fix = True
                    missing_media = True
                elif digest and digest in bad_hashes:
                    needs_fix = True
                elif (
                    upgrade_mobile_svg
                    and product.category.slug in self.MOBILE_CATEGORY_SLUGS
                    and media_path.suffix.lower() == ".svg"
                ):
                    needs_fix = True

            if not needs_fix:
                continue

            official_url = self._resolve_official_url(product)
            jpg_file = media_dir / f"{product.slug}.jpg"
            svg_file = media_dir / f"{product.slug}.svg"
            final_url: str

            local_seed_photo = self._resolve_local_seed_photo(product)
            if local_seed_photo:
                if local_seed_photo.resolve() != jpg_file.resolve():
                    shutil.copyfile(local_seed_photo, jpg_file)
                final_url = f"{base_url}/media/seed/{jpg_file.name}"
                official_applied += 1
            elif official_url and self._download_image(official_url, jpg_file):
                final_url = f"{base_url}/media/seed/{jpg_file.name}"
                official_applied += 1
            else:
                svg_file.write_text(self._build_svg(product.name, product.category.slug), encoding="utf-8")
                final_url = f"{base_url}/media/seed/{svg_file.name}"
                svg_applied += 1

            self._upsert_primary_media(product, final_url)
            repaired += 1
            if missing_media:
                missing_fixed += 1

        self.stdout.write(self.style.SUCCESS("Reparation media terminee."))
        self.stdout.write(
            self.style.SUCCESS(
                (
                    f"Produits corriges: {repaired} | Officielles: {official_applied} | "
                    f"SVG premium: {svg_applied} | Manquants corriges: {missing_fixed}"
                )
            )
        )
