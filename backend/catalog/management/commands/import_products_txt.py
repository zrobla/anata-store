from __future__ import annotations

from dataclasses import dataclass
from html import escape
from pathlib import Path
import hashlib
import re
import subprocess
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
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
)
from inventory.models import InventoryItem, InventorySource


@dataclass
class ParsedRow:
    raw_name: str
    brand_slug: str
    category_slug: str
    product_name: str
    base_name: str
    price_amount: int | None
    ram: str | None = None
    storage: str | None = None
    size: str | None = None
    pcs: str | None = None
    network: str | None = None
    used_default_price: bool = False


class Command(BaseCommand):
    help = "Importe une liste produits texte, cree categories manquantes, et telecharge les images locales."

    BRAND_LABELS = {
        "samsung": "Samsung",
        "apple": "Apple",
        "xiaomi": "Xiaomi",
        "redmi": "Redmi",
        "google": "Google",
        "hp": "HP",
        "dell": "Dell",
        "lenovo": "Lenovo",
        "canon": "Canon",
        "premax": "Premax",
        "anata": "Anata",
    }

    STATIC_OFFICIAL_IMAGE_URLS = {
        "samsung_s25ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg",
        "samsung_s25plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-plus-sm-s936.jpg",
        "samsung_s25": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-sm-s931.jpg",
        "samsung_s24ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra.jpg",
        "samsung_s24plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-sm-s926.jpg",
        "samsung_s24": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24.jpg",
        "samsung_s23ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg",
        "samsung_s23plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-plus-5g.jpg",
        "samsung_s23": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-5g.jpg",
        "samsung_s22ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-ultra-5g.jpg",
        "samsung_s22plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-plus-5g.jpg",
        "samsung_s22": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s22-5g.jpg",
        "samsung_s21ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-ultra-5g.jpg",
        "samsung_s21plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-plus-5g.jpg",
        "samsung_s21": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-5g.jpg",
        "samsung_s21fe": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-fe-5g.jpg",
        "samsung_s20ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20-ultra-.jpg",
        "samsung_s20plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20-plus.jpg",
        "samsung_s20": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s20.jpg",
        "samsung_note20ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-note20-ultra-.jpg",
        "samsung_note20": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-note20.jpg",
        "samsung_flip7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip7.jpg",
        "samsung_flip6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip6.jpg",
        "samsung_flip5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5.jpg",
        "samsung_fold7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold7.jpg",
        "samsung_fold6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold6.jpg",
        "samsung_fold5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5.jpg",
        "samsung_fold4": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold4.jpg",
        "google_pixel7a": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-7a-r.jpg",
        "google_pixel7pro": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel7-pro-new.jpg",
        "google_pixel7": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel7.jpg",
        "google_pixel8a": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg",
        "google_pixel8pro": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg",
        "google_pixel8": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8.jpg",
        "google_pixel9profold": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-fold.jpg",
        "google_pixel9proxl": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-xl.jpg",
        "google_pixel9pro": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro.jpg",
        "google_pixel9a": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9a.jpg",
        "google_pixel9": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9.jpg",
        "google_pixelwatch4": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-watch-4.jpg",
        "google_pixelwatch3": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-watch-3.jpg",
        "google_pixelbudspro2": "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-buds-pro-2.jpg",
        "xiaomi_15ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-15-ultra.jpg",
        "xiaomi_14ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg",
        "apple_iphone16promax": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg",
        "apple_iphone16pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg",
        "apple_iphone16plus": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-plus.jpg",
        "apple_iphone16": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg",
        "apple_iphone15promax": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
        "apple_iphone15pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg",
        "apple_iphone15plus": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-plus.jpg",
        "apple_iphone15": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg",
        "apple_iphone14promax": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg",
        "apple_iphone14pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro.jpg",
        "apple_iphone14": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg",
        "apple_iphone13promax": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro-max.jpg",
        "apple_iphone13pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro.jpg",
        "apple_iphone13": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg",
        "apple_iphone12promax": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro-max-.jpg",
        "apple_iphone12pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro.jpg",
        "apple_iphone12": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12.jpg",
    }
    BAD_IMAGE_SHA1 = {
        # Placeholder generique non representatif detecte sur plusieurs references.
        "75a8c1a57a87c61644503c2e46fee5c08407c28c",
    }

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Chemin vers produits.txt")
        parser.add_argument(
            "--price-multiplier",
            type=int,
            default=1000,
            help="Multiplicateur prix (default: 1000, ex 220 -> 220000 FCFA)",
        )
        parser.add_argument(
            "--download-images",
            action="store_true",
            help="Telecharge les images locales dans media/seed",
        )
        parser.add_argument(
            "--media-base-url",
            type=str,
            default="http://127.0.0.1:8000",
            help="Base URL publique pour servir les images locales",
        )
        parser.add_argument(
            "--search-online",
            action="store_true",
            help="Tente une recherche GSMArena en ligne (plus lent).",
        )
        parser.add_argument(
            "--default-price-when-missing",
            type=int,
            default=0,
            help="Prix FCFA a utiliser si la ligne n'a pas de prix (default: 0).",
        )

    @staticmethod
    def _clean_spaces(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()

    @staticmethod
    def _normalize_cmp(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", value.lower())

    @staticmethod
    def _is_heading_without_price(line: str) -> bool:
        # Une ligne de titre ne doit pas contenir de chiffres (ex: "MACHINE A COMPTER").
        return "-" not in line and len(line.split()) <= 6 and line.upper() == line and not re.search(r"\d", line)

    def _detect_brand(self, name: str, current_brand: str | None) -> str:
        upper = name.upper()
        if (
            upper.startswith("APPLE ")
            or upper.startswith("IPHONE ")
            or "MACBOOK" in upper
            or re.search(r"\bIPHONE\b", upper)
        ):
            return "apple"
        if upper.startswith("XIAOMI "):
            return "xiaomi"
        if upper.startswith("REDMI "):
            return "redmi"
        if upper.startswith("PIXEL "):
            return "google"
        if upper.startswith("SAM ") or upper.startswith("SAMSUNG ") or upper.startswith("SAMSUNG,"):
            return "samsung"
        if "SAMSUNG" in upper and len(upper.split()) <= 4:
            return "samsung"
        if upper.startswith("HP "):
            return "hp"
        if upper.startswith("DELL "):
            return "dell"
        if upper.startswith("LENOVO "):
            return "lenovo"
        if upper.startswith("CANON "):
            return "canon"
        if upper.startswith("UPS "):
            return "premax"
        if upper.startswith("CC"):
            return "premax"
        return current_brand or "anata"

    def _detect_category(self, name: str, brand_slug: str) -> str:
        upper = name.upper()
        if "MACBOOK" in upper or "IMAC" in upper:
            return "ordinateurs"
        if any(keyword in upper for keyword in ("WATCH", "MONTRE")):
            return "montres-connectees"
        if "BUDS" in upper or "ECOUTEUR" in upper:
            return "ecouteurs"
        if "TAB " in upper:
            return "tablettes"
        if any(keyword in upper for keyword in ("LASER", "MFP", "JET", "CANON", "IMPRIMANTE")):
            return "imprimantes"
        if any(keyword in upper for keyword in ("UPS", "ONDULEUR")):
            return "onduleurs"
        if any(keyword in upper for keyword in ("ECRAN", "LED")):
            return "ecrans"
        if any(
            keyword in upper
            for keyword in (
                "DESK",
                "BOOK",
                "LAPTOP",
                "VICTUS",
                "THINKPAD",
                "INSPIRON",
                "OMNIBOOK",
                "SPECTRE",
                "ENVY",
                "PAV",
                "X360",
                "G10",
                "G9",
                "G4",
                "SLIM",
                "I 3",
                "I 5",
                "I 7",
            )
        ):
            return "ordinateurs"
        if any(keyword in upper for keyword in ("MACHINE A COMPTER", "CC")):
            return "machines-a-compter"
        if brand_slug in {"hp", "dell", "lenovo"}:
            return "ordinateurs"
        return "smartphones"

    @staticmethod
    def _extract_price_from_line(line: str, price_multiplier: int) -> tuple[str, int | None, bool]:
        # Forme historique: "... - 220" (interprete avec multiplicateur).
        m_dash = re.search(r"-\s*([0-9][0-9\s]*)\s*$", line)
        if m_dash:
            left = line[: m_dash.start()]
            raw_unit = m_dash.group(1).replace(" ", "")
            if raw_unit.isdigit():
                unit_price = int(raw_unit)
                if unit_price > 0:
                    return left, unit_price * price_multiplier, True
            return left, None, True

        # Forme WhatsApp: "... 580 mille"
        m_mille = re.search(r"([0-9][0-9\s]*)\s*mille\b", line, flags=re.IGNORECASE)
        if m_mille:
            left = line[: m_mille.start()]
            raw_unit = re.sub(r"\s+", "", m_mille.group(1))
            if raw_unit.isdigit():
                return left, int(raw_unit) * 1000, True
            return left, None, True

        # Forme FCFA: "... 850.000f" / "... 1 170 000 FCFA"
        m_fcfa = re.search(r"([0-9]{1,3}(?:[.\s][0-9]{3})+)\s*f(?:cfa)?\b", line, flags=re.IGNORECASE)
        if m_fcfa:
            left = line[: m_fcfa.start()]
            compact = re.sub(r"[.\s]", "", m_fcfa.group(1))
            if compact.isdigit():
                return left, int(compact), True
            return left, None, True

        return line, None, False

    @staticmethod
    def _is_unpriced_product_candidate(left: str) -> bool:
        upper = left.upper()
        return upper.startswith(
            (
                "XIAOMI ",
                "REDMI ",
                "PIXEL ",
                "SAM ",
                "SAMSUNG ",
                "HP ",
                "DELL ",
                "LENOVO ",
                "CANON ",
                "UPS ",
                "CC",
                "IPHONE ",
                "APPLE ",
                "MACBOOK ",
            )
        )

    def _extract_specs(self, text: str) -> tuple[str, dict[str, str]]:
        attributes: dict[str, str] = {}
        cleaned = text

        m_pair = re.search(r"\b(\d{1,2})\s*/\s*(\d{2,4})\s*GB\b", cleaned, flags=re.IGNORECASE)
        if m_pair:
            attributes["ram"] = f"{m_pair.group(1)}GB"
            attributes["storage"] = f"{m_pair.group(2)}GB"
            cleaned = cleaned.replace(m_pair.group(0), " ")

        gb_tokens = re.findall(r"\b(\d{1,3})\s*GB\b", cleaned, flags=re.IGNORECASE)
        g_tokens = re.findall(r"\b(\d{2,4})\s*G\b", cleaned, flags=re.IGNORECASE)
        tb_tokens = re.findall(r"\b(\d)\s*TB\b", cleaned, flags=re.IGNORECASE)
        if "ram" not in attributes and len(gb_tokens) >= 2:
            attributes["ram"] = f"{gb_tokens[0]}GB"
            attributes["storage"] = f"{gb_tokens[1]}GB"
        elif len(gb_tokens) == 1 and "storage" not in attributes:
            attributes["storage"] = f"{gb_tokens[0]}GB"
        elif len(gb_tokens) >= 2 and "storage" not in attributes:
            attributes["storage"] = f"{gb_tokens[-1]}GB"
        elif not gb_tokens and g_tokens and "storage" not in attributes:
            attributes["storage"] = f"{g_tokens[-1]}GB"

        if tb_tokens:
            attributes["storage"] = f"{tb_tokens[-1]}TB"

        m_mm = re.search(r"\b(\d{2,3})\s*MM\b", cleaned, flags=re.IGNORECASE)
        if m_mm:
            attributes["size"] = f"{m_mm.group(1)}MM"
            cleaned = cleaned.replace(m_mm.group(0), " ")

        m_pcs = re.search(r"\b(\d+)\s*PCS\b", cleaned, flags=re.IGNORECASE)
        if m_pcs:
            attributes["pcs"] = f"{m_pcs.group(1)}PCS"
            cleaned = cleaned.replace(m_pcs.group(0), " ")

        if re.search(r"\b5G\b", cleaned, flags=re.IGNORECASE):
            attributes["network"] = "5G"
            cleaned = re.sub(r"\b5G\b", " ", cleaned, flags=re.IGNORECASE)

        cleaned = re.sub(r"\b\d+\s*GB\b", " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b\d+\s*G\b", " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b\d+\s*TB\b", " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"[🔵⚫️🟣💼🟠⚪️🐽▪️◼️🔘🟢➡️🇫🇷]", " ", cleaned)
        cleaned = self._clean_spaces(cleaned)
        return cleaned, attributes

    def _parse_rows(self, content: str, price_multiplier: int) -> list[ParsedRow]:
        rows: list[ParsedRow] = []
        current_brand: str | None = None

        for raw in content.splitlines():
            line = self._clean_spaces(raw)
            line = re.sub(r"^[➡️>]+", "", line).strip()
            if not line:
                continue
            if line.startswith("##") or line.upper().startswith("LISTE PRODUITS"):
                continue
            if line.upper().startswith("ANATA STORE"):
                continue
            if line.startswith("*Garantie"):
                continue
            if "Qualite & Prix" in line or "Telephones pour tous" in line:
                continue
            if self._is_heading_without_price(line):
                current_brand = self._detect_brand(line, current_brand)
                continue

            left_raw, price_amount, has_explicit_price = self._extract_price_from_line(line, price_multiplier)
            left = self._clean_spaces(left_raw)
            if not re.search(r"\d", left):
                allowed_no_digit = re.search(
                    r"\b(SAM|SAMSUNG|PIXEL|IPHONE|APPLE|XIAOMI|REDMI|HP|DELL|LENOVO|CANON|UPS|CC|BUDS|WATCH|TAB|FOLD|FLIP|NOTE|MACBOOK)\b",
                    left.upper(),
                )
                if not allowed_no_digit:
                    continue
            if not has_explicit_price and not self._is_unpriced_product_candidate(left):
                continue

            brand_slug = self._detect_brand(left, current_brand)
            current_brand = brand_slug
            category_slug = self._detect_category(left, brand_slug)

            base_raw, attrs = self._extract_specs(left)
            base_raw = base_raw.strip(" -:.,")
            if not base_raw:
                continue

            brand_label = self.BRAND_LABELS.get(brand_slug, brand_slug.upper())
            upper_base = base_raw.upper()
            if upper_base.startswith("SAM "):
                base_raw = base_raw[4:].strip()
            elif upper_base.startswith("SAMSUNG "):
                base_raw = base_raw[8:].strip()
            elif upper_base.startswith("XIAOMI "):
                base_raw = base_raw[7:].strip()
            elif upper_base.startswith("REDMI "):
                base_raw = base_raw[6:].strip()
            elif upper_base.startswith("PIXEL "):
                base_raw = f"Pixel {base_raw[6:].strip()}"
            elif upper_base.startswith("APPLE "):
                base_raw = base_raw[6:].strip()
            elif upper_base.startswith("IPHONE "):
                base_raw = f"iPhone {base_raw[7:].strip()}"
            if brand_slug == "apple":
                if re.match(r"^\d", base_raw):
                    base_raw = f"iPhone {base_raw}"
                base_raw = re.sub(r"(?i)promax", " Pro Max ", base_raw)
                base_raw = re.sub(r"(?i)pro", " Pro ", base_raw)
                base_raw = re.sub(r"(?i)plus", " Plus ", base_raw)
                base_raw = re.sub(r"(?i)simple", "", base_raw)
                base_raw = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", base_raw)
                base_raw = self._clean_spaces(base_raw)
            base_raw = base_raw.strip(" -:.,")

            product_name = f"{brand_label} {base_raw}".strip()
            rows.append(
                ParsedRow(
                    raw_name=left,
                    brand_slug=brand_slug,
                    category_slug=category_slug,
                    product_name=product_name,
                    base_name=base_raw,
                    price_amount=price_amount,
                    ram=attrs.get("ram"),
                    storage=attrs.get("storage"),
                    size=attrs.get("size"),
                    pcs=attrs.get("pcs"),
                    network=attrs.get("network"),
                    used_default_price=price_amount is None,
                )
            )
        return rows

    def _find_existing_product(self, brand: Brand, base_name: str) -> Product | None:
        model_norm = self._normalize_cmp(base_name)
        if not model_norm:
            return None
        candidates = Product.objects.filter(brand=brand)
        best_match: tuple[int, Product] | None = None
        for product in candidates:
            norm_name = self._normalize_cmp(product.name)
            if not norm_name:
                continue
            if norm_name == model_norm:
                return product
            if model_norm in norm_name or norm_name in model_norm:
                # Evite de fusionner des modeles differents mais proches (ex: Note15 vs Note15Pro).
                if abs(len(model_norm) - len(norm_name)) > 2:
                    continue
                score = min(len(model_norm), len(norm_name))
                if best_match is None or score > best_match[0]:
                    best_match = (score, product)
        return best_match[1] if best_match else None

    @staticmethod
    def _upsert_variant_attributes(variant: ProductVariant, row: ParsedRow):
        attrs = {
            "ram": row.ram,
            "storage": row.storage,
            "size": row.size,
            "pcs": row.pcs,
            "network": row.network,
        }
        for key, value in attrs.items():
            if not value:
                continue
            VariantAttributeValue.objects.update_or_create(
                variant=variant,
                attribute_key=key,
                defaults={"value": value, "label": value},
            )

    @staticmethod
    def _variant_signature(row: ParsedRow) -> str:
        parts = [row.ram or "STD", row.storage or "STD", row.size or "STD", row.pcs or "STD", row.network or "STD"]
        return "-".join(parts)

    def _build_sku(self, product_slug: str, row: ParsedRow) -> str:
        prefix = row.brand_slug[:4].upper()
        product_code = re.sub(r"[^A-Z0-9]+", "", product_slug.upper())[:46] or "ITEM"
        sig = re.sub(r"[^A-Z0-9]+", "", self._variant_signature(row).upper())[:40] or "STD"
        return f"{prefix}-{product_code}-{sig}"[:120]

    def _find_variant_for_update(self, product: Product, row: ParsedRow) -> ProductVariant | None:
        target = {
            "ram": row.ram,
            "storage": row.storage,
            "size": row.size,
            "pcs": row.pcs,
            "network": row.network,
        }
        active_variants = product.variants.filter(is_active=True)
        if not active_variants.exists():
            return None

        for variant in active_variants:
            attrs = {
                item.attribute_key: item.value
                for item in variant.attribute_values.filter(attribute_key__in=target.keys())
            }
            if all((target[key] is None) or attrs.get(key) == target[key] for key in target):
                return variant
        if all(value is None for value in target.values()) and active_variants.count() == 1:
            return active_variants.first()
        return None

    def _official_lookup_key(self, row: ParsedRow) -> str:
        compact = self._normalize_cmp(row.base_name)
        return f"{row.brand_slug}_{compact}"

    def _fetch_url(self, url: str) -> str | None:
        request = Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.gsmarena.com/",
            },
        )
        try:
            with urlopen(request, timeout=12) as response:
                if response.status != 200:
                    return None
                return response.read().decode("utf-8", errors="ignore")
        except URLError:
            return None
        except OSError:
            return None

    def _lookup_gsmarena_bigpic(self, query: str) -> str | None:
        search_url = f"https://m.gsmarena.com/results.php3?sSearch={quote(query)}"
        html = self._fetch_url(search_url)
        if not html:
            return None

        match = re.search(r'href="([^"]+\.php)"', html, flags=re.IGNORECASE)
        if not match:
            return None
        details_url = f"https://m.gsmarena.com/{match.group(1).lstrip('/')}"
        details_html = self._fetch_url(details_url)
        if not details_html:
            return None

        image_match = re.search(
            r"https://fdn2\.gsmarena\.com/vv/bigpic/[a-z0-9\-\.]+\.jpg",
            details_html,
            flags=re.IGNORECASE,
        )
        return image_match.group(0) if image_match else None

    def _resolve_official_image_url(
        self,
        row: ParsedRow,
        query_cache: dict[str, str | None],
        search_online: bool,
    ) -> str | None:
        key = self._official_lookup_key(row)
        if key in self.STATIC_OFFICIAL_IMAGE_URLS:
            return self.STATIC_OFFICIAL_IMAGE_URLS[key]

        if not search_online:
            return None

        if row.category_slug not in {"smartphones", "tablettes", "montres-connectees", "ecouteurs"}:
            return None

        query = f"{self.BRAND_LABELS.get(row.brand_slug, row.brand_slug)} {row.base_name}"
        if query in query_cache:
            return query_cache[query]
        found = self._lookup_gsmarena_bigpic(query)
        query_cache[query] = found
        return found

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
  <text x="600" y="680" text-anchor="middle" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="30">Catalogue officiel import TXT</text>
</svg>
"""

    def _seed_image_from_source(
        self,
        *,
        source_url: str | None,
        file_stem: str,
        product_name: str,
        download_images: bool,
        media_base_url: str,
    ) -> str | None:
        media_root = getattr(settings, "MEDIA_ROOT", Path(settings.BASE_DIR) / "media")
        media_dir = Path(media_root) / "seed"
        media_dir.mkdir(parents=True, exist_ok=True)
        jpg_file = media_dir / f"{file_stem}.jpg"
        svg_file = media_dir / f"{file_stem}.svg"
        base_url = media_base_url.rstrip("/")

        if jpg_file.exists():
            return f"{base_url}/media/seed/{jpg_file.name}"

        if download_images and source_url and getattr(self, "remote_images_enabled", True):
            try:
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
                with urlopen(request, timeout=8) as response:
                    if response.status == 200:
                        payload = response.read()
                        digest = hashlib.sha1(payload).hexdigest()
                        if digest in self.BAD_IMAGE_SHA1:
                            raise OSError("generic placeholder image blocked")
                        jpg_file.write_bytes(payload)
                        self.remote_failures = 0
                        return f"{base_url}/media/seed/{jpg_file.name}"
            except (URLError, OSError):
                self.remote_failures = getattr(self, "remote_failures", 0) + 1
                if self.remote_failures >= 3:
                    self.remote_images_enabled = False
                pass

            if getattr(self, "remote_images_enabled", True):
                try:
                    result = subprocess.run(
                        ["curl", "-L", "--fail", "-o", str(jpg_file), source_url],
                        check=False,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=14,
                    )
                    if result.returncode == 0 and jpg_file.exists():
                        digest = hashlib.sha1(jpg_file.read_bytes()).hexdigest()
                        if digest in self.BAD_IMAGE_SHA1:
                            try:
                                jpg_file.unlink()
                            except OSError:
                                pass
                            raise OSError("generic placeholder image blocked")
                        self.remote_failures = 0
                        return f"{base_url}/media/seed/{jpg_file.name}"
                except (OSError, subprocess.SubprocessError):
                    self.remote_failures = getattr(self, "remote_failures", 0) + 1
                    if self.remote_failures >= 3:
                        self.remote_images_enabled = False
                    pass

        if not svg_file.exists():
            svg_file.write_text(self._build_local_seed_svg(product_name), encoding="utf-8")
        return f"{base_url}/media/seed/{svg_file.name}"

    def _attach_product_image(
        self,
        *,
        product: Product,
        row: ParsedRow,
        media_base_url: str,
        download_images: bool,
        query_cache: dict[str, str | None],
        search_online: bool,
    ) -> tuple[bool, bool]:
        source_url = self._resolve_official_image_url(row, query_cache, search_online)
        local_url = self._seed_image_from_source(
            source_url=source_url,
            file_stem=product.slug,
            product_name=product.name,
            download_images=download_images,
            media_base_url=media_base_url,
        )
        if not local_url:
            return False, False

        media_asset, media_created = MediaAsset.objects.update_or_create(
            url=local_url,
            defaults={"alt": product.name, "kind": MediaAsset.IMAGE, "sort_order": 1},
        )
        _, link_created = ProductMedia.objects.update_or_create(
            product=product,
            media_asset=media_asset,
            defaults={"sort_order": 1},
        )
        return media_created, link_created

    def handle(self, *args, **options):
        file_path = Path(options["file"]).expanduser()
        if not file_path.exists():
            raise CommandError(f"Fichier introuvable: {file_path}")

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            raise CommandError(f"Lecture impossible: {exc}") from exc

        price_multiplier = int(options["price_multiplier"])
        download_images = bool(options["download_images"])
        search_online = bool(options["search_online"])
        default_price_when_missing = int(options["default_price_when_missing"])
        media_base_url = str(options["media_base_url"]).strip() or "http://127.0.0.1:8000"

        if price_multiplier < 1:
            raise CommandError("--price-multiplier doit etre >= 1")
        if default_price_when_missing < 0:
            raise CommandError("--default-price-when-missing doit etre >= 0")

        parsed_rows = self._parse_rows(content, price_multiplier)
        if not parsed_rows:
            raise CommandError("Aucune ligne exploitable detectee dans le fichier.")
        self.remote_images_enabled = True
        self.remote_failures = 0

        if connection.vendor == "sqlite":
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA busy_timeout = 120000")

        Attribute.objects.get_or_create(
            key="ram",
            defaults={"label": "RAM", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 1},
        )
        Attribute.objects.get_or_create(
            key="storage",
            defaults={"label": "Stockage", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 2},
        )
        Attribute.objects.get_or_create(
            key="color",
            defaults={"label": "Couleur", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 3},
        )
        Attribute.objects.get_or_create(
            key="size",
            defaults={"label": "Taille", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 4},
        )
        Attribute.objects.get_or_create(
            key="pcs",
            defaults={"label": "Pieces", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 5},
        )
        Attribute.objects.get_or_create(
            key="network",
            defaults={"label": "Reseau", "type": Attribute.SELECT, "is_filterable": True, "sort_order": 6},
        )

        stock_source, _ = InventorySource.objects.get_or_create(
            name="Entrepot Abidjan",
            defaults={"type": InventorySource.INTERNAL, "lead_time_days": 0, "is_active": True},
        )

        created_products = 0
        updated_products = 0
        created_variants = 0
        updated_variants = 0
        created_categories = 0
        created_brands = 0
        media_created_count = 0
        media_linked_count = 0
        missing_price_rows = 0
        query_cache: dict[str, str | None] = {}

        for index, row in enumerate(parsed_rows, start=1):
            if index % 25 == 0:
                self.stdout.write(f"Progression import: {index}/{len(parsed_rows)}")
            with transaction.atomic():
                brand, brand_created = Brand.objects.get_or_create(
                    slug=row.brand_slug,
                    defaults={
                        "name": self.BRAND_LABELS.get(row.brand_slug, row.brand_slug.upper()),
                        "description": f"Catalogue {self.BRAND_LABELS.get(row.brand_slug, row.brand_slug.upper())}",
                        "is_active": True,
                    },
                )
                if brand_created:
                    created_brands += 1
                else:
                    brand_update_fields: list[str] = []
                    if not brand.is_active:
                        brand.is_active = True
                        brand_update_fields.append("is_active")
                    expected_brand_name = self.BRAND_LABELS.get(row.brand_slug, row.brand_slug.upper())
                    if not brand.name:
                        brand.name = expected_brand_name
                        brand_update_fields.append("name")
                    if brand_update_fields:
                        brand.save(update_fields=[*brand_update_fields, "updated_at"])

                category_label = row.category_slug.replace("-", " ").title()
                category, category_created = Category.objects.get_or_create(
                    slug=row.category_slug,
                    defaults={"name": category_label, "sort_order": 99, "is_active": True},
                )
                if category_created:
                    created_categories += 1
                elif not category.is_active:
                    category.is_active = True
                    category.save(update_fields=["is_active", "updated_at"])

                existing_product = self._find_existing_product(brand, row.base_name)
                product_slug = existing_product.slug if existing_product else slugify(
                    f"{row.brand_slug}-{row.base_name.replace('+', ' plus ')}"
                )
                product_slug = product_slug[:70] or slugify(f"{row.brand_slug}-item")
                product, product_created = Product.objects.update_or_create(
                    slug=product_slug,
                    defaults={
                        "name": row.product_name,
                        "brand": brand,
                        "category": category,
                        "short_description": f"{row.product_name} - import catalogue Anata Store.",
                        "description": f"{row.product_name} catalogue officiel, prix mis a jour via import TXT.",
                        "is_active": True,
                        "is_featured": existing_product is None,
                        "badges": ["Import TXT", "Prix mis a jour"],
                        "seo_title": row.product_name,
                        "seo_description": f"{row.product_name} disponible chez Anata Store.",
                    },
                )
                if product_created:
                    created_products += 1
                else:
                    updated_products += 1

                variant = self._find_variant_for_update(product, row)
                if variant:
                    update_fields = ["is_active", "updated_at"]
                    variant.is_active = True
                    if row.price_amount is not None:
                        variant.price_amount = row.price_amount
                        variant.promo_price_amount = None
                        update_fields.extend(["price_amount", "promo_price_amount"])
                    updated_variants += 1
                    variant.save(update_fields=update_fields)
                else:
                    final_price = row.price_amount if row.price_amount is not None else default_price_when_missing
                    sku = self._build_sku(product.slug, row)
                    variant, variant_created = ProductVariant.objects.update_or_create(
                        sku=sku,
                        defaults={
                            "product": product,
                            "price_amount": final_price,
                            "promo_price_amount": None,
                            "is_active": True,
                        },
                    )
                    if variant_created:
                        created_variants += 1
                    else:
                        updated_variants += 1

                self._upsert_variant_attributes(variant, row)
                InventoryItem.objects.update_or_create(
                    variant=variant,
                    source=stock_source,
                    defaults={"qty_on_hand": 5, "low_stock_threshold": 1},
                )

                media_created, media_linked = self._attach_product_image(
                    product=product,
                    row=row,
                    media_base_url=media_base_url,
                    download_images=download_images,
                    query_cache=query_cache,
                    search_online=search_online,
                )
                if media_created:
                    media_created_count += 1
                if media_linked:
                    media_linked_count += 1
                if row.used_default_price:
                    missing_price_rows += 1

        self.stdout.write(self.style.SUCCESS("Import produits TXT termine."))
        self.stdout.write(
            self.style.SUCCESS(
                (
                    f"Produits: +{created_products} / maj {updated_products} | "
                    f"Variantes: +{created_variants} / maj {updated_variants} | "
                    f"Marques +{created_brands} | Categories +{created_categories} | "
                    f"Media assets +{media_created_count} | Media links +{media_linked_count} | "
                    f"Lignes sans prix: {missing_price_rows}"
                )
            )
        )
