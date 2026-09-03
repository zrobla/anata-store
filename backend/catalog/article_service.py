"""Vue « article » du catalogue, pensee pour la gestion quotidienne de la boutique.

Cote base de donnees, un produit vendable = un Product + au moins une ProductVariant
(qui porte le prix) + un InventoryItem (qui porte la quantite). Un gerant ne doit pas
avoir a connaitre ce decoupage: il saisit un nom, un prix et une quantite.

Ce module fait la traduction dans les deux sens et garantit l'invariant qui compte:
un article cree ici est immediatement vendable (sans stock rattache, la boutique
l'afficherait « epuise » sans explication).
"""

from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify

from catalog.models import Product, ProductVariant
from inventory.models import InventoryItem, InventorySource


class ArticleError(Exception):
    """Erreur fonctionnelle a afficher telle quelle au gerant."""


def default_internal_source() -> InventorySource:
    source = InventorySource.objects.filter(type=InventorySource.INTERNAL, is_active=True).order_by("created_at").first()
    if source is None:
        source = InventorySource.objects.create(
            name="Boutique Treichville",
            type=InventorySource.INTERNAL,
            is_active=True,
        )
    return source


def unique_product_slug(name: str, exclude_pk=None) -> str:
    base = slugify(name) or "article"
    queryset = Product.objects.all()
    if exclude_pk is not None:
        queryset = queryset.exclude(pk=exclude_pk)
    candidate = base
    suffix = 2
    while queryset.filter(slug=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def unique_variant_sku(product: Product, exclude_pk=None) -> str:
    base = (slugify(product.name) or "article").upper().replace("-", "")[:24] or "ARTICLE"
    queryset = ProductVariant.objects.all()
    if exclude_pk is not None:
        queryset = queryset.exclude(pk=exclude_pk)
    candidate = base
    suffix = 2
    while queryset.filter(sku=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def main_variant(product: Product) -> ProductVariant | None:
    """La variante qui represente l'article: la moins chere encore en vente."""
    return (
        product.variants.filter(is_active=True).order_by("price_amount", "created_at").first()
        or product.variants.order_by("created_at").first()
    )


def main_inventory_item(variant: ProductVariant | None) -> InventoryItem | None:
    if variant is None:
        return None
    return (
        InventoryItem.objects.filter(variant=variant, source__type=InventorySource.INTERNAL)
        .order_by("created_at")
        .first()
    )


def read_article(product: Product) -> dict:
    """Assemble la fiche telle qu'elle est presentee dans le studio."""
    variant = main_variant(product)
    item = main_inventory_item(variant)
    photo_link = product.media_links.select_related("media_asset").order_by("sort_order", "created_at").first()

    return {
        "product": product,
        "variant": variant,
        "inventory_item": item,
        "prix": variant.price_amount if variant else None,
        "prix_promo": variant.promo_price_amount if variant else None,
        "quantite": item.qty_on_hand if item else 0,
        "seuil_alerte": item.low_stock_threshold if item else None,
        "photo_link": photo_link,
        "nombre_variantes": product.variants.count(),
    }


def _validate_prices(prix, prix_promo) -> None:
    if prix is not None and prix < 0:
        raise ArticleError("Le prix ne peut pas etre negatif.")
    if prix_promo is not None:
        if prix_promo < 0:
            raise ArticleError("Le prix promotionnel ne peut pas etre negatif.")
        if prix is not None and prix_promo >= prix:
            raise ArticleError("Le prix promotionnel doit etre inferieur au prix normal.")


@transaction.atomic
def create_article(
    *,
    nom: str,
    marque,
    categorie,
    prix: int,
    prix_promo: int | None = None,
    quantite: int = 0,
    seuil_alerte: int | None = None,
    description_courte: str = "",
    description: str = "",
    en_ligne: bool = True,
    mis_en_avant: bool = False,
) -> Product:
    _validate_prices(prix, prix_promo)
    if quantite < 0:
        raise ArticleError("La quantite ne peut pas etre negative.")

    product = Product.objects.create(
        name=nom.strip(),
        slug=unique_product_slug(nom),
        brand=marque,
        category=categorie,
        short_description=description_courte.strip(),
        description=description.strip(),
        is_active=en_ligne,
        is_featured=mis_en_avant,
    )

    variant = ProductVariant.objects.create(
        product=product,
        sku=unique_variant_sku(product),
        price_amount=prix,
        promo_price_amount=prix_promo,
        is_active=en_ligne,
    )

    # Sans cette ligne, l'article s'afficherait « epuise » sur la boutique.
    InventoryItem.objects.create(
        variant=variant,
        source=default_internal_source(),
        qty_on_hand=quantite,
        low_stock_threshold=seuil_alerte,
    )

    return product


@transaction.atomic
def update_article(product: Product, changes: dict) -> Product:
    """Applique uniquement les champs fournis, sur les trois objets concernes."""
    variant = main_variant(product)

    prix = changes.get("prix", variant.price_amount if variant else None)
    prix_promo = changes["prix_promo"] if "prix_promo" in changes else (variant.promo_price_amount if variant else None)
    _validate_prices(prix, prix_promo)

    product_fields = []
    if "nom" in changes and changes["nom"].strip() != product.name:
        product.name = changes["nom"].strip()
        product_fields += ["name"]
    for key, field in (
        ("marque", "brand"),
        ("categorie", "category"),
        ("description_courte", "short_description"),
        ("description", "description"),
        ("en_ligne", "is_active"),
        ("mis_en_avant", "is_featured"),
    ):
        if key in changes:
            setattr(product, field, changes[key])
            product_fields.append(field)
    if product_fields:
        product.save(update_fields=[*set(product_fields), "updated_at"])

    if variant is not None:
        variant_fields = []
        if "prix" in changes:
            variant.price_amount = changes["prix"]
            variant_fields.append("price_amount")
        if "prix_promo" in changes:
            variant.promo_price_amount = changes["prix_promo"]
            variant_fields.append("promo_price_amount")
        if "en_ligne" in changes:
            variant.is_active = changes["en_ligne"]
            variant_fields.append("is_active")
        if variant_fields:
            variant.save(update_fields=[*variant_fields, "updated_at"])

    if "quantite" in changes or "seuil_alerte" in changes:
        if changes.get("quantite", 0) < 0:
            raise ArticleError("La quantite ne peut pas etre negative.")
        item = main_inventory_item(variant)
        if item is None and variant is not None:
            item = InventoryItem.objects.create(
                variant=variant,
                source=default_internal_source(),
                qty_on_hand=0,
            )
        if item is not None:
            item_fields = []
            if "quantite" in changes:
                item.qty_on_hand = changes["quantite"]
                item_fields.append("qty_on_hand")
            if "seuil_alerte" in changes:
                item.low_stock_threshold = changes["seuil_alerte"]
                item_fields.append("low_stock_threshold")
            item.save(update_fields=[*item_fields, "updated_at"])

    return product


@transaction.atomic
def retire_article(product: Product) -> None:
    """Retire de la vente sans rien effacer: l'historique des commandes reste intact."""
    product.is_active = False
    product.save(update_fields=["is_active", "updated_at"])
    product.variants.filter(is_active=True).update(is_active=False)
