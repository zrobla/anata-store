from __future__ import annotations

import unicodedata
from io import BytesIO
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

from django.db import transaction
from django.utils.text import slugify

from audit.services import log_action
from catalog.models import (
    Brand,
    Category,
    MediaAsset,
    Product,
    ProductMedia,
    ProductVariant,
    VariantAttributeValue,
)
from inventory.models import InventoryItem, InventorySource

MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024

XML_NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XML_NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
XML_NS_CONTENT_TYPES = "http://schemas.openxmlformats.org/package/2006/content-types"

IMPORT_COLUMNS = [
    {
        "name": "product_name",
        "required": True,
        "description": "Nom commercial du produit",
        "example": "Sam-S25 Ultra",
    },
    {
        "name": "product_slug",
        "required": False,
        "description": "Slug unique du produit (auto-genere si vide)",
        "example": "sam-s25-ultra",
    },
    {
        "name": "brand_slug",
        "required": True,
        "description": "Slug marque existante en base",
        "example": "samsung",
    },
    {
        "name": "category_slug",
        "required": True,
        "description": "Slug categorie existante en base",
        "example": "smartphones",
    },
    {
        "name": "short_description",
        "required": False,
        "description": "Description courte",
        "example": "Flagship IA, photo pro",
    },
    {
        "name": "description",
        "required": False,
        "description": "Description detaillee",
        "example": "Ecran AMOLED, batterie longue duree...",
    },
    {
        "name": "is_active",
        "required": False,
        "description": "Produit actif (true/false)",
        "example": "true",
    },
    {
        "name": "is_featured",
        "required": False,
        "description": "Produit mis en avant (true/false)",
        "example": "true",
    },
    {
        "name": "badges",
        "required": False,
        "description": "Badges separes par virgule",
        "example": "Nouveau, Livraison 24h",
    },
    {
        "name": "seo_title",
        "required": False,
        "description": "Titre SEO",
        "example": "Sam-S25 Ultra Boutique en Ligne Anata Store",
    },
    {
        "name": "seo_description",
        "required": False,
        "description": "Description SEO",
        "example": "Achetez le Sam-S25 Ultra a Treichville avec livraison rapide.",
    },
    {
        "name": "variant_sku",
        "required": True,
        "description": "SKU unique de la variante",
        "example": "SAM-S25U-256-BLK",
    },
    {
        "name": "variant_barcode",
        "required": False,
        "description": "Code barre/IMEI commercial",
        "example": "8806095812345",
    },
    {
        "name": "price_amount",
        "required": True,
        "description": "Prix standard FCFA (entier)",
        "example": 1345860,
    },
    {
        "name": "promo_price_amount",
        "required": False,
        "description": "Prix promo FCFA (entier)",
        "example": 1299860,
    },
    {
        "name": "variant_is_active",
        "required": False,
        "description": "Variante active (true/false)",
        "example": "true",
    },
    {
        "name": "color",
        "required": False,
        "description": "Attribut couleur",
        "example": "Noir",
    },
    {
        "name": "storage",
        "required": False,
        "description": "Attribut stockage",
        "example": "256GB",
    },
    {
        "name": "ram",
        "required": False,
        "description": "Attribut RAM",
        "example": "12GB",
    },
    {
        "name": "image_url",
        "required": False,
        "description": "URL image principale du produit",
        "example": "https://images.exemple.com/sam-s25-u-front.jpg",
    },
    {
        "name": "stock_source_name",
        "required": False,
        "description": "Nom du point de stock",
        "example": "Main Store Treichville",
    },
    {
        "name": "stock_source_type",
        "required": False,
        "description": "Type stock: INTERNAL | PARTNER | CONSIGNMENT",
        "example": "INTERNAL",
    },
    {
        "name": "stock_qty",
        "required": False,
        "description": "Quantite en stock",
        "example": 8,
    },
    {
        "name": "stock_low_threshold",
        "required": False,
        "description": "Seuil alerte stock faible",
        "example": 2,
    },
    {
        "name": "stock_lead_time_days",
        "required": False,
        "description": "Delai en jours",
        "example": 1,
    },
]

IMPORT_HEADER_FR = {
    "product_name": "nom_produit",
    "product_slug": "slug_produit",
    "brand_slug": "slug_marque",
    "category_slug": "slug_categorie",
    "short_description": "description_courte",
    "description": "description_longue",
    "is_active": "produit_actif",
    "is_featured": "produit_mis_en_avant",
    "badges": "badges",
    "seo_title": "seo_titre",
    "seo_description": "seo_description",
    "variant_sku": "sku_variante",
    "variant_barcode": "code_barres_variante",
    "price_amount": "prix_fcfa",
    "promo_price_amount": "prix_promo_fcfa",
    "variant_is_active": "variante_active",
    "color": "couleur",
    "storage": "stockage",
    "ram": "ram",
    "image_url": "url_image",
    "stock_source_name": "nom_source_stock",
    "stock_source_type": "type_source_stock",
    "stock_qty": "quantite_stock",
    "stock_low_threshold": "seuil_stock_bas",
    "stock_lead_time_days": "delai_stock_jours",
}

REQUIRED_IMPORT_COLUMNS = [column["name"] for column in IMPORT_COLUMNS if column["required"]]
REQUIRED_IMPORT_HEADERS_FR = [IMPORT_HEADER_FR.get(column, column) for column in REQUIRED_IMPORT_COLUMNS]
ATTRIBUTE_COLUMNS = ("color", "storage", "ram")
VALID_SOURCE_TYPES = {choice[0] for choice in InventorySource.TYPE_CHOICES}


def _normalize_header_token(value: Any) -> str:
    if value is None:
        return ""
    cleaned = str(value).strip().lower().replace("-", "_")
    normalized = unicodedata.normalize("NFKD", cleaned)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return "".join(char if char.isalnum() else "_" for char in ascii_only).strip("_")


def _build_import_header_map() -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for column in IMPORT_COLUMNS:
        canonical = column["name"]
        french = IMPORT_HEADER_FR.get(canonical, canonical)
        for alias in (canonical, canonical.replace("_", " "), french, french.replace("_", " ")):
            normalized_alias = _normalize_header_token(alias)
            if normalized_alias and normalized_alias not in alias_map:
                alias_map[normalized_alias] = canonical
    return alias_map


IMPORT_HEADER_TO_CANONICAL = _build_import_header_map()


def _xlsx_qname(namespace: str, tag: str) -> str:
    return f"{{{namespace}}}{tag}"


def _column_letter(index: int) -> str:
    value = index
    letters = ""
    while value > 0:
        value, remainder = divmod(value - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def _column_index(cell_ref: str) -> int:
    letters = "".join(char for char in cell_ref if char.isalpha()).upper()
    if not letters:
        return 0
    result = 0
    for char in letters:
        result = result * 26 + (ord(char) - 64)
    return max(result - 1, 0)


def _xml_bytes(element: ET.Element) -> bytes:
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def _build_worksheet_xml(rows: list[list[Any]]) -> bytes:
    ET.register_namespace("", XML_NS_MAIN)
    ET.register_namespace("r", XML_NS_REL)

    worksheet = ET.Element(_xlsx_qname(XML_NS_MAIN, "worksheet"))
    sheet_data = ET.SubElement(worksheet, _xlsx_qname(XML_NS_MAIN, "sheetData"))

    for row_index, row_values in enumerate(rows, start=1):
        row_node = ET.SubElement(sheet_data, _xlsx_qname(XML_NS_MAIN, "row"), {"r": str(row_index)})
        for col_index, raw_value in enumerate(row_values, start=1):
            if raw_value is None:
                continue

            value = raw_value
            cell_ref = f"{_column_letter(col_index)}{row_index}"
            attrs = {"r": cell_ref}

            if isinstance(value, bool):
                attrs["t"] = "b"
                cell = ET.SubElement(row_node, _xlsx_qname(XML_NS_MAIN, "c"), attrs)
                ET.SubElement(cell, _xlsx_qname(XML_NS_MAIN, "v")).text = "1" if value else "0"
                continue

            if isinstance(value, (int, float)):
                cell = ET.SubElement(row_node, _xlsx_qname(XML_NS_MAIN, "c"), attrs)
                ET.SubElement(cell, _xlsx_qname(XML_NS_MAIN, "v")).text = str(value)
                continue

            attrs["t"] = "inlineStr"
            cell = ET.SubElement(row_node, _xlsx_qname(XML_NS_MAIN, "c"), attrs)
            inline = ET.SubElement(cell, _xlsx_qname(XML_NS_MAIN, "is"))
            ET.SubElement(inline, _xlsx_qname(XML_NS_MAIN, "t")).text = str(value)

    return _xml_bytes(worksheet)


def _build_workbook_xml() -> bytes:
    ET.register_namespace("", XML_NS_MAIN)
    ET.register_namespace("r", XML_NS_REL)

    workbook = ET.Element(_xlsx_qname(XML_NS_MAIN, "workbook"))
    sheets = ET.SubElement(workbook, _xlsx_qname(XML_NS_MAIN, "sheets"))
    ET.SubElement(
        sheets,
        _xlsx_qname(XML_NS_MAIN, "sheet"),
        {
            "name": "import_produits",
            "sheetId": "1",
            _xlsx_qname(XML_NS_REL, "id"): "rId1",
        },
    )
    return _xml_bytes(workbook)


def _build_content_types_xml() -> bytes:
    types = ET.Element(
        "Types",
        {"xmlns": XML_NS_CONTENT_TYPES},
    )
    ET.SubElement(
        types,
        "Default",
        {
            "Extension": "rels",
            "ContentType": "application/vnd.openxmlformats-package.relationships+xml",
        },
    )
    ET.SubElement(
        types,
        "Default",
        {
            "Extension": "xml",
            "ContentType": "application/xml",
        },
    )
    ET.SubElement(
        types,
        "Override",
        {
            "PartName": "/xl/workbook.xml",
            "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
        },
    )
    ET.SubElement(
        types,
        "Override",
        {
            "PartName": "/xl/worksheets/sheet1.xml",
            "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
        },
    )
    return _xml_bytes(types)


def _build_root_rels_xml() -> bytes:
    relationships = ET.Element("Relationships", {"xmlns": XML_NS_PKG_REL})
    ET.SubElement(
        relationships,
        "Relationship",
        {
            "Id": "rId1",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            "Target": "xl/workbook.xml",
        },
    )
    return _xml_bytes(relationships)


def _build_workbook_rels_xml() -> bytes:
    relationships = ET.Element("Relationships", {"xmlns": XML_NS_PKG_REL})
    ET.SubElement(
        relationships,
        "Relationship",
        {
            "Id": "rId1",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
            "Target": "worksheets/sheet1.xml",
        },
    )
    return _xml_bytes(relationships)


def _build_xlsx_bytes(rows: list[list[Any]]) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _build_content_types_xml())
        archive.writestr("_rels/.rels", _build_root_rels_xml())
        archive.writestr("xl/workbook.xml", _build_workbook_xml())
        archive.writestr("xl/_rels/workbook.xml.rels", _build_workbook_rels_xml())
        archive.writestr("xl/worksheets/sheet1.xml", _build_worksheet_xml(rows))
    return output.getvalue()


def _read_xml(archive: ZipFile, path: str) -> ET.Element:
    try:
        content = archive.read(path)
    except KeyError as exc:
        raise ValueError(f"Fichier xlsx invalide: {path} absent") from exc
    return ET.fromstring(content)


def _read_shared_strings(archive: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []

    shared_values: list[str] = []
    for string_item in root.findall(_xlsx_qname(XML_NS_MAIN, "si")):
        parts = [node.text or "" for node in string_item.findall(f".//{_xlsx_qname(XML_NS_MAIN, 't')}")]
        shared_values.append("".join(parts))
    return shared_values


def _first_sheet_path(archive: ZipFile) -> str:
    workbook = _read_xml(archive, "xl/workbook.xml")
    workbook_rels = _read_xml(archive, "xl/_rels/workbook.xml.rels")

    rel_index: dict[str, str] = {}
    for relation in workbook_rels.findall(f".//{{{XML_NS_PKG_REL}}}Relationship"):
        rel_id = relation.attrib.get("Id")
        target = relation.attrib.get("Target")
        if rel_id and target:
            rel_index[rel_id] = target

    sheets = workbook.findall(f".//{_xlsx_qname(XML_NS_MAIN, 'sheet')}")
    if not sheets:
        raise ValueError("Fichier xlsx invalide: aucune feuille detectee.")

    relation_id = sheets[0].attrib.get(_xlsx_qname(XML_NS_REL, "id"))
    if not relation_id or relation_id not in rel_index:
        raise ValueError("Fichier xlsx invalide: relation de feuille manquante.")

    target = rel_index[relation_id]
    if target.startswith("/"):
        return target.lstrip("/")
    if target.startswith("xl/"):
        return target
    return f"xl/{target}"


def _parse_cell_value(cell: ET.Element, shared_strings: list[str]) -> Any:
    cell_type = cell.attrib.get("t", "")
    if cell_type == "inlineStr":
        nodes = cell.findall(f".//{_xlsx_qname(XML_NS_MAIN, 't')}")
        return "".join(node.text or "" for node in nodes)

    value_node = cell.find(_xlsx_qname(XML_NS_MAIN, "v"))
    raw_value = value_node.text if value_node is not None else ""

    if cell_type == "s":
        try:
            index = int(raw_value or 0)
        except ValueError:
            return ""
        return shared_strings[index] if 0 <= index < len(shared_strings) else ""

    if cell_type == "b":
        return (raw_value or "").strip() == "1"

    if cell_type in {"str", "e"}:
        return raw_value or ""

    if raw_value is None or raw_value == "":
        return ""

    try:
        number = float(raw_value)
    except ValueError:
        return raw_value
    if number.is_integer():
        return int(number)
    return number


def read_xlsx_rows(file_obj) -> list[tuple[Any, ...]]:
    if isinstance(file_obj, (bytes, bytearray)):
        file_obj = BytesIO(file_obj)

    try:
        with ZipFile(file_obj) as archive:
            sheet_path = _first_sheet_path(archive)
            shared_strings = _read_shared_strings(archive)
            worksheet = _read_xml(archive, sheet_path)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Le fichier fourni n'est pas un .xlsx valide.") from exc

    rows: list[tuple[Any, ...]] = []
    row_nodes = worksheet.findall(f".//{_xlsx_qname(XML_NS_MAIN, 'sheetData')}/{_xlsx_qname(XML_NS_MAIN, 'row')}")
    for row_node in row_nodes:
        cells = row_node.findall(_xlsx_qname(XML_NS_MAIN, "c"))
        if not cells:
            rows.append(tuple())
            continue

        values_by_col: dict[int, Any] = {}
        max_col = 0
        for cell in cells:
            col = _column_index(cell.attrib.get("r", ""))
            values_by_col[col] = _parse_cell_value(cell, shared_strings)
            max_col = max(max_col, col)

        row_values: list[Any] = [None] * (max_col + 1)
        for col, value in values_by_col.items():
            row_values[col] = value
        rows.append(tuple(row_values))
    return rows


def build_product_import_workbook(
    rows: list[dict[str, Any]],
    *,
    use_french_headers: bool = False,
) -> bytes:
    headers = [
        IMPORT_HEADER_FR.get(column["name"], column["name"]) if use_french_headers else column["name"]
        for column in IMPORT_COLUMNS
    ]
    canonical_headers = [column["name"] for column in IMPORT_COLUMNS]
    sheet_rows: list[list[Any]] = [headers]
    for row in rows:
        sheet_rows.append([row.get(header) for header in canonical_headers])
    return _build_xlsx_bytes(sheet_rows)


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    return False


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _normalize_slug(value: Any) -> str:
    return slugify(_clean_text(value))


def _parse_bool(value: Any, default: bool) -> bool:
    if _is_empty(value):
        return default
    if isinstance(value, bool):
        return value

    normalized = _clean_text(value).lower()
    if normalized in {"1", "true", "yes", "oui", "vrai", "active"}:
        return True
    if normalized in {"0", "false", "no", "non", "faux", "inactive"}:
        return False
    raise ValueError(f"Booleen invalide: '{value}'")


def _parse_int(
    value: Any,
    *,
    field_name: str,
    required: bool,
    min_value: int | None = None,
) -> int | None:
    if _is_empty(value):
        if required:
            raise ValueError(f"Champ requis manquant: {field_name}")
        return None

    if isinstance(value, bool):
        raise ValueError(f"Valeur numerique invalide pour {field_name}: '{value}'")

    try:
        if isinstance(value, (int, float)):
            if isinstance(value, float) and not value.is_integer():
                raise ValueError
            parsed = int(value)
        else:
            normalized = _clean_text(value).replace(" ", "")
            parsed = int(normalized)
    except (TypeError, ValueError):
        raise ValueError(f"Valeur numerique invalide pour {field_name}: '{value}'") from None

    if min_value is not None and parsed < min_value:
        raise ValueError(f"Valeur invalide pour {field_name}: doit etre >= {min_value}")
    return parsed


def _parse_badges(value: Any) -> list[str]:
    raw = _clean_text(value)
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _extract_row_payload(header_index: dict[str, int], row_values: tuple[Any, ...]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for column in IMPORT_COLUMNS:
        key = column["name"]
        idx = header_index.get(key)
        payload[key] = row_values[idx] if idx is not None and idx < len(row_values) else None
    return payload


def _is_blank_row(payload: dict[str, Any]) -> bool:
    return all(_is_empty(value) for value in payload.values())


def _validate_headers(headers: tuple[Any, ...]) -> dict[str, int]:
    header_index: dict[str, int] = {}
    for idx, value in enumerate(headers):
        normalized = _normalize_header_token(value)
        if not normalized:
            continue
        canonical_name = IMPORT_HEADER_TO_CANONICAL.get(normalized)
        if canonical_name and canonical_name not in header_index:
            header_index[canonical_name] = idx
    missing = [column for column in REQUIRED_IMPORT_COLUMNS if column not in header_index]
    if missing:
        missing_display = [f"{IMPORT_HEADER_FR.get(column, column)} ({column})" for column in missing]
        raise ValueError(f"Colonnes obligatoires manquantes: {', '.join(missing_display)}")
    return header_index


def _upsert_variant_attribute(variant: ProductVariant, attribute_key: str, value: Any) -> None:
    cleaned_value = _clean_text(value)
    if not cleaned_value:
        return
    VariantAttributeValue.objects.update_or_create(
        variant=variant,
        attribute_key=attribute_key,
        defaults={"value": cleaned_value, "label": cleaned_value},
    )


def _upsert_product_media(product: Product, image_url: Any, counters: dict[str, dict[str, int]]) -> None:
    url = _clean_text(image_url)
    if not url:
        return

    media_asset, media_created = MediaAsset.objects.get_or_create(
        url=url,
        defaults={"alt": product.name, "kind": MediaAsset.IMAGE, "sort_order": 0},
    )
    if media_created:
        counters["created"]["media_assets"] += 1

    _, link_created = ProductMedia.objects.get_or_create(
        product=product,
        media_asset=media_asset,
        defaults={"sort_order": 0},
    )
    if link_created:
        counters["created"]["media_links"] += 1


def _resolve_inventory_source(payload: dict[str, Any], counters: dict[str, dict[str, int]]) -> InventorySource:
    source_name = _clean_text(payload.get("stock_source_name")) or "Main Store Treichville"
    source_type = _clean_text(payload.get("stock_source_type")).upper() or InventorySource.INTERNAL
    if source_type not in VALID_SOURCE_TYPES:
        valid = ", ".join(sorted(VALID_SOURCE_TYPES))
        raise ValueError(f"stock_source_type invalide: '{source_type}'. Attendu: {valid}")

    source_lead_time = _parse_int(
        payload.get("stock_lead_time_days"),
        field_name="stock_lead_time_days",
        required=False,
        min_value=0,
    )

    source, source_created = InventorySource.objects.get_or_create(
        name=source_name,
        defaults={"type": source_type, "lead_time_days": source_lead_time, "is_active": True},
    )
    if source_created:
        counters["created"]["inventory_sources"] += 1
    else:
        updated = False
        if source.type != source_type:
            source.type = source_type
            updated = True
        if source_lead_time is not None and source.lead_time_days != source_lead_time:
            source.lead_time_days = source_lead_time
            updated = True
        if not source.is_active:
            source.is_active = True
            updated = True
        if updated:
            source.save(update_fields=["type", "lead_time_days", "is_active", "updated_at"])
            counters["updated"]["inventory_sources"] += 1
    return source


def _upsert_inventory_item(
    variant: ProductVariant,
    payload: dict[str, Any],
    counters: dict[str, dict[str, int]],
) -> None:
    if _is_empty(payload.get("stock_qty")):
        return

    qty_on_hand = _parse_int(payload.get("stock_qty"), field_name="stock_qty", required=True, min_value=0)
    low_threshold = _parse_int(
        payload.get("stock_low_threshold"),
        field_name="stock_low_threshold",
        required=False,
        min_value=0,
    )
    lead_time_days = _parse_int(
        payload.get("stock_lead_time_days"),
        field_name="stock_lead_time_days",
        required=False,
        min_value=0,
    )
    source = _resolve_inventory_source(payload, counters)
    _, item_created = InventoryItem.objects.update_or_create(
        variant=variant,
        source=source,
        defaults={
            "qty_on_hand": qty_on_hand,
            "low_stock_threshold": low_threshold,
            "lead_time_days": lead_time_days,
        },
    )
    counters["created" if item_created else "updated"]["inventory_items"] += 1


def _import_one_row(payload: dict[str, Any], counters: dict[str, dict[str, int]]) -> None:
    product_name = _clean_text(payload.get("product_name"))
    if not product_name:
        raise ValueError("Champ requis manquant: product_name")

    product_slug = _normalize_slug(payload.get("product_slug")) or slugify(product_name)
    if not product_slug:
        raise ValueError("Impossible de generer product_slug")

    brand_slug = _normalize_slug(payload.get("brand_slug"))
    category_slug = _normalize_slug(payload.get("category_slug"))
    if not brand_slug:
        raise ValueError("Champ requis manquant: brand_slug")
    if not category_slug:
        raise ValueError("Champ requis manquant: category_slug")

    try:
        brand = Brand.objects.get(slug=brand_slug)
    except Brand.DoesNotExist:
        raise ValueError(f"Marque introuvable pour brand_slug='{brand_slug}'") from None

    try:
        category = Category.objects.get(slug=category_slug)
    except Category.DoesNotExist:
        raise ValueError(f"Categorie introuvable pour category_slug='{category_slug}'") from None

    product_defaults = {
        "name": product_name,
        "brand": brand,
        "category": category,
        "short_description": _clean_text(payload.get("short_description")),
        "description": _clean_text(payload.get("description")),
        "is_active": _parse_bool(payload.get("is_active"), True),
        "is_featured": _parse_bool(payload.get("is_featured"), False),
        "badges": _parse_badges(payload.get("badges")),
        "seo_title": _clean_text(payload.get("seo_title")),
        "seo_description": _clean_text(payload.get("seo_description")),
    }
    product, product_created = Product.objects.update_or_create(slug=product_slug, defaults=product_defaults)
    counters["created" if product_created else "updated"]["products"] += 1

    variant_sku = _clean_text(payload.get("variant_sku"))
    if not variant_sku:
        raise ValueError("Champ requis manquant: variant_sku")
    price_amount = _parse_int(payload.get("price_amount"), field_name="price_amount", required=True, min_value=0)
    promo_price_amount = _parse_int(
        payload.get("promo_price_amount"),
        field_name="promo_price_amount",
        required=False,
        min_value=0,
    )
    if promo_price_amount is not None and promo_price_amount > price_amount:
        raise ValueError("promo_price_amount doit etre <= price_amount")

    variant_defaults = {
        "product": product,
        "barcode": _clean_text(payload.get("variant_barcode")),
        "price_amount": price_amount,
        "promo_price_amount": promo_price_amount,
        "is_active": _parse_bool(payload.get("variant_is_active"), True),
    }
    variant, variant_created = ProductVariant.objects.update_or_create(sku=variant_sku, defaults=variant_defaults)
    counters["created" if variant_created else "updated"]["variants"] += 1

    for attribute_key in ATTRIBUTE_COLUMNS:
        _upsert_variant_attribute(variant, attribute_key, payload.get(attribute_key))

    _upsert_product_media(product, payload.get("image_url"), counters)
    _upsert_inventory_item(variant, payload, counters)


def generate_product_import_template() -> bytes:
    sample = {column["name"]: column["example"] for column in IMPORT_COLUMNS}
    return build_product_import_workbook([sample], use_french_headers=True)


def import_products_from_excel(uploaded_file, *, actor_user, request_id: str = "") -> dict[str, Any]:
    uploaded_file.seek(0)
    rows = read_xlsx_rows(uploaded_file)
    if not rows:
        raise ValueError("Le fichier Excel est vide.")

    headers = rows[0]
    header_index = _validate_headers(headers)

    report: dict[str, Any] = {
        "required_columns": REQUIRED_IMPORT_COLUMNS,
        "required_columns_template": REQUIRED_IMPORT_HEADERS_FR,
        "total_rows": 0,
        "processed_rows": 0,
        "skipped_empty_rows": 0,
        "created": {
            "products": 0,
            "variants": 0,
            "inventory_sources": 0,
            "inventory_items": 0,
            "media_assets": 0,
            "media_links": 0,
        },
        "updated": {
            "products": 0,
            "variants": 0,
            "inventory_sources": 0,
            "inventory_items": 0,
        },
        "errors": [],
    }

    for row_number, row_values in enumerate(rows[1:], start=2):
        payload = _extract_row_payload(header_index, row_values)
        if _is_blank_row(payload):
            report["skipped_empty_rows"] += 1
            continue

        report["total_rows"] += 1
        try:
            with transaction.atomic():
                _import_one_row(payload, report)
            report["processed_rows"] += 1
        except ValueError as exc:
            report["errors"].append(
                {
                    "row": row_number,
                    "error": str(exc),
                    "product_slug": _clean_text(payload.get("product_slug")),
                    "variant_sku": _clean_text(payload.get("variant_sku")),
                }
            )
        except Exception:
            report["errors"].append(
                {
                    "row": row_number,
                    "error": "Erreur interne lors de l'import de cette ligne.",
                    "product_slug": _clean_text(payload.get("product_slug")),
                    "variant_sku": _clean_text(payload.get("variant_sku")),
                }
            )

    log_action(
        actor_user=actor_user,
        action="bulk_import",
        resource="product",
        resource_id="excel-import",
        after=report,
        request_id=request_id,
    )
    return report
