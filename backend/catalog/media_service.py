"""Traitement des photos produit envoyees depuis le studio.

Objectif: le gerant photographie avec son telephone et depose le fichier tel quel.
On se charge de redresser, redimensionner et compresser pour que la boutique reste rapide.
"""

from __future__ import annotations

import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError

from catalog.models import MediaAsset, Product, ProductMedia

# Une photo de telephone recente pese couramment 3-8 Mo.
MAX_UPLOAD_SIZE = 12 * 1024 * 1024
MAX_PHOTOS_PER_PRODUCT = 8

# Cote long maximum conserve: au-dela, le poids penalise le chargement sans gain visible.
MAX_DIMENSION = 1600
JPEG_QUALITY = 85


class PhotoUploadError(Exception):
    """Erreur fonctionnelle a afficher telle quelle au gerant."""


def _normalize_image(uploaded_file) -> ContentFile:
    try:
        image = Image.open(uploaded_file)
        image.load()
    except UnidentifiedImageError as exc:
        raise PhotoUploadError(
            "Ce fichier n'est pas une image reconnue. "
            "Envoyez une photo au format JPG, PNG ou WEBP."
        ) from exc
    except OSError as exc:
        raise PhotoUploadError("Cette image est illisible ou endommagee. Reessayez avec une autre photo.") from exc

    # Les photos prises au telephone portent leur orientation dans les metadonnees EXIF:
    # sans cette correction, elles s'affichent couchees sur le site.
    image = ImageOps.exif_transpose(image)

    if image.mode in {"RGBA", "LA", "P"}:
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.jpg")


def validate_upload(uploaded_file) -> None:
    if uploaded_file is None:
        raise PhotoUploadError("Aucune photo recue. Choisissez un fichier puis reessayez.")

    if uploaded_file.size > MAX_UPLOAD_SIZE:
        max_mb = MAX_UPLOAD_SIZE // (1024 * 1024)
        raise PhotoUploadError(f"Photo trop lourde (maximum {max_mb} Mo). Reduisez-la puis reessayez.")

    if uploaded_file.name.lower().endswith((".heic", ".heif")):
        raise PhotoUploadError(
            "Format iPhone (HEIC) non pris en charge. "
            "Dans Reglages > Appareil photo > Formats, choisissez « Plus compatible », "
            "ou partagez la photo par WhatsApp pour la convertir en JPG."
        )


@transaction.atomic
def attach_photo_to_product(product: Product, uploaded_file, alt: str = "") -> ProductMedia:
    """Normalise la photo, la stocke et la rattache en fin de galerie produit."""
    validate_upload(uploaded_file)

    existing_count = product.media_links.count()
    if existing_count >= MAX_PHOTOS_PER_PRODUCT:
        raise PhotoUploadError(
            f"Cet article a deja {MAX_PHOTOS_PER_PRODUCT} photos. "
            "Supprimez-en une avant d'en ajouter une nouvelle."
        )

    normalized = _normalize_image(uploaded_file)

    last_link = product.media_links.order_by("-sort_order").first()
    next_order = (last_link.sort_order + 1) if last_link else 0

    asset = MediaAsset.objects.create(
        alt=(alt or product.name)[:200],
        kind=MediaAsset.IMAGE,
        sort_order=next_order,
    )
    asset.image.save(normalized.name, normalized, save=True)

    return ProductMedia.objects.create(product=product, media_asset=asset, sort_order=next_order)


@transaction.atomic
def set_primary_photo(product: Product, link: ProductMedia) -> None:
    """Place la photo choisie en tete: c'est elle qui represente l'article sur la boutique."""
    others = product.media_links.exclude(pk=link.pk).order_by("sort_order", "created_at")
    link.sort_order = 0
    link.save(update_fields=["sort_order", "updated_at"])
    for index, other in enumerate(others, start=1):
        if other.sort_order != index:
            other.sort_order = index
            other.save(update_fields=["sort_order", "updated_at"])


@transaction.atomic
def detach_photo(link: ProductMedia) -> None:
    """Retire la photo de l'article et supprime le fichier s'il n'est plus utilise ailleurs."""
    asset = link.media_asset
    link.delete()

    still_used = asset.product_links.exists() or asset.variant_links.exists()
    if still_used:
        return

    stored_image = asset.image
    asset.delete()
    if stored_image:
        stored_image.delete(save=False)
