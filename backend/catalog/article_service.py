"""Vue « article » du catalogue, pensee pour la gestion quotidienne de la boutique.

Cote base de donnees, un produit vendable = un Product + au moins une ProductVariant
(qui porte le prix) + un InventoryItem (qui porte la quantite). Un gerant ne doit pas
avoir a connaitre ce decoupage: il saisit un nom, un prix et une quantite.

Ce module fait la traduction dans les deux sens et garantit l'invariant qui compte:
un article cree ici est immediatement vendable (sans stock rattache, la boutique
l'afficherait « epuise » sans explication).

Cas particulier des capacites de stockage: un 512 Go ne se vend pas au prix d'un
128 Go. Quand le gerant saisit une **grille de prix par capacite**, chaque capacite
devient une vraie declinaison (une ProductVariant portant l'attribut « storage »),
pour que le client choisisse sa version et paie le bon prix. Le **stock reste
global** a l'article: la quantite saisie est recopiee sur chaque capacite.
"""

from __future__ import annotations

from django.db import transaction
from django.utils.text import slugify

from catalog.models import Product, ProductVariant, VariantAttributeValue
from catalog.options import (
    CAPACITES,
    CLE_CAPACITE,
    capacite_canonique,
    normaliser_capacites,
    normaliser_couleurs,
    options_effectives,
    rang_capacite,
)
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


def _sku_libre(base: str, exclude_pk=None) -> str:
    queryset = ProductVariant.objects.all()
    if exclude_pk is not None:
        queryset = queryset.exclude(pk=exclude_pk)
    candidate = base
    suffix = 2
    while queryset.filter(sku=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def unique_variant_sku(product: Product, exclude_pk=None, capacite: str | None = None) -> str:
    base = (slugify(product.name) or "article").upper().replace("-", "")[:24] or "ARTICLE"
    if capacite:
        # Une reference lisible par capacite: GALAXYA56-256GO.
        base = f"{base[:18]}-{capacite.replace(' ', '').upper()}"
    return _sku_libre(base, exclude_pk=exclude_pk)


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


def capacite_de(variant: ProductVariant) -> str | None:
    """La capacite portee par une declinaison, quelle que soit son ecriture."""
    for attribut in variant.attribute_values.all():
        if attribut.attribute_key == CLE_CAPACITE:
            return capacite_canonique(attribut.label or attribut.value)
    return None


def lignes_capacites(product: Product) -> list[dict]:
    """La grille « capacite -> prix » telle qu'elle est montree au gerant.

    Une capacite retiree de la grille est desactivee, pas supprimee (des commandes
    la referencent) et ne doit plus apparaitre. Mais un article entierement mis
    hors ligne garde sa grille: elle est memorisee dans `Product.options`, ce qui
    permet de la retrouver intacte a la remise en ligne.
    """
    stockees = product.options if isinstance(product.options, dict) else {}
    memorisees = {valeur for valeur in (stockees.get("capacites") or []) if valeur}

    retenues: dict[str, ProductVariant] = {}
    for variant in product.variants.all():
        capacite = capacite_de(variant)
        if capacite is None:
            continue
        if not variant.is_active and capacite not in memorisees:
            continue
        precedente = retenues.get(capacite)
        if precedente is None or (variant.is_active and not precedente.is_active):
            retenues[capacite] = variant

    lignes = [
        {
            "capacite": capacite,
            "prix": variant.price_amount,
            "prix_promo": variant.promo_price_amount,
        }
        for capacite, variant in retenues.items()
    ]
    lignes.sort(key=lambda ligne: rang_capacite(ligne["capacite"]))
    return lignes


def _stock_global(product: Product) -> tuple[int, int | None]:
    """Quantite et seuil de l'article: le stock est global, pas par capacite.

    On retient le maximum: une vente sur une capacite ne doit pas faire croire
    que tout l'article s'est vide.
    """
    items = InventoryItem.objects.filter(
        variant__product=product,
        variant__is_active=True,
        source__type=InventorySource.INTERNAL,
    ).order_by("-qty_on_hand", "created_at")
    premier = items.first()
    if premier is None:
        return 0, None
    seuils = [item.low_stock_threshold for item in items if item.low_stock_threshold is not None]
    return premier.qty_on_hand, seuils[0] if seuils else None


def read_article(product: Product) -> dict:
    """Assemble la fiche telle qu'elle est presentee dans le studio."""
    variant = main_variant(product)
    item = main_inventory_item(variant)
    photo_link = product.media_links.select_related("media_asset").order_by("sort_order", "created_at").first()
    options = options_effectives(product)
    grille = lignes_capacites(product)
    quantite, seuil = _stock_global(product)

    return {
        "product": product,
        "variant": variant,
        "inventory_item": item,
        "prix": variant.price_amount if variant else None,
        "prix_promo": variant.promo_price_amount if variant else None,
        "quantite": quantite,
        "seuil_alerte": seuil,
        "photo_link": photo_link,
        "nombre_variantes": product.variants.count(),
        "couleurs": options["couleurs"],
        "capacites": options["capacites"],
        "capacites_prix": grille,
        # Deux prix differents dans la grille: la boutique affiche « a partir de ».
        "prix_variable": len({ligne["prix_promo"] or ligne["prix"] for ligne in grille}) > 1,
    }


def _options_validees(couleurs, capacites) -> dict[str, list[str]]:
    """Traduit une erreur de referentiel en message affichable au gerant."""
    try:
        return {
            "couleurs": normaliser_couleurs(couleurs),
            "capacites": normaliser_capacites(capacites),
        }
    except ValueError as error:
        raise ArticleError(str(error)) from error


def _lignes_validees(brutes) -> list[dict]:
    """Controle la grille saisie par le gerant et la remet en ordre."""
    if not brutes:
        return []

    lignes: list[dict] = []
    vues: set[str] = set()
    for brute in brutes:
        saisie = brute.get("capacite")
        capacite = capacite_canonique(saisie)
        if capacite is None:
            raise ArticleError(f"« {saisie} » ne fait pas partie des capacites proposees.")
        if capacite in vues:
            raise ArticleError(f"La capacite {capacite} est indiquee deux fois.")
        vues.add(capacite)

        prix = brute.get("prix")
        if prix is None or prix <= 0:
            raise ArticleError(f"Indiquez un prix de vente pour la capacite {capacite}.")
        promo = brute.get("prix_promo")
        if promo is not None and promo >= prix:
            raise ArticleError(
                f"Pour la capacite {capacite}, le prix promotionnel doit etre inferieur au prix normal."
            )

        lignes.append({"capacite": capacite, "prix": prix, "prix_promo": promo})

    if len(lignes) > len(CAPACITES):
        raise ArticleError(f"Vous ne pouvez pas depasser {len(CAPACITES)} capacites pour un article.")

    lignes.sort(key=lambda ligne: rang_capacite(ligne["capacite"]))
    return lignes


def _poser_capacite(variant: ProductVariant, capacite: str) -> None:
    existant = variant.attribute_values.filter(attribute_key=CLE_CAPACITE).first()
    if existant is None:
        VariantAttributeValue.objects.create(
            variant=variant, attribute_key=CLE_CAPACITE, value=capacite, label=capacite
        )
        return

    champs = []
    # « 256GB » venu de l'import designe deja la bonne capacite: on ne reecrit
    # que le libelle affiche, pour ne pas casser les filtres bases sur value.
    if capacite_canonique(existant.value) != capacite:
        existant.value = capacite
        champs.append("value")
    if existant.label != capacite:
        existant.label = capacite
        champs.append("label")
    if champs:
        existant.save(update_fields=champs)


def _poser_stock(variant: ProductVariant, source: InventorySource, quantite, seuil_alerte) -> None:
    item, cree = InventoryItem.objects.get_or_create(
        variant=variant,
        source=source,
        defaults={"qty_on_hand": quantite or 0, "low_stock_threshold": seuil_alerte},
    )
    if cree:
        return
    champs = []
    if quantite is not None and item.qty_on_hand != quantite:
        item.qty_on_hand = quantite
        champs.append("qty_on_hand")
    if seuil_alerte is not None and item.low_stock_threshold != seuil_alerte:
        item.low_stock_threshold = seuil_alerte
        champs.append("low_stock_threshold")
    if champs:
        item.save(update_fields=[*champs, "updated_at"])


def sync_capacites(
    product: Product,
    lignes: list[dict],
    *,
    quantite=None,
    seuil_alerte=None,
    en_ligne: bool = True,
) -> None:
    """Aligne les declinaisons du produit sur la grille de prix saisie.

    Une capacite retiree de la grille n'est jamais supprimee: des commandes la
    referencent. Elle est desactivee, ce qui la retire de la boutique en gardant
    l'historique intact.
    """
    existantes = list(product.variants.all())
    par_capacite: dict[str, ProductVariant] = {}
    sans_capacite: list[ProductVariant] = []
    for variant in existantes:
        capacite = capacite_de(variant)
        if capacite is None:
            sans_capacite.append(variant)
        elif capacite not in par_capacite or (variant.is_active and not par_capacite[capacite].is_active):
            par_capacite[capacite] = variant

    source = default_internal_source()
    gardees = set()

    for ligne in lignes:
        capacite = ligne["capacite"]
        variant = par_capacite.get(capacite)
        if variant is None and sans_capacite:
            # Premier passage en grille: on reutilise la declinaison unique de
            # l'article plutot que d'en creer une et d'orpheliner la premiere.
            variant = sans_capacite.pop(0)
        if variant is None:
            variant = ProductVariant(product=product, sku=unique_variant_sku(product, capacite=capacite))

        variant.price_amount = ligne["prix"]
        variant.promo_price_amount = ligne["prix_promo"]
        variant.is_active = en_ligne
        variant.save()

        _poser_capacite(variant, capacite)
        # Sans stock rattache, la capacite s'afficherait « epuisee » sans raison.
        _poser_stock(variant, source, quantite, seuil_alerte)
        gardees.add(variant.pk)

    # On ne retire que les capacites absentes de la grille. Les declinaisons
    # importees qui partagent une capacite (memoire vive differente, par ex.)
    # ne sont pas touchees: le gerant ne les a pas vues, on ne les supprime pas.
    retenues = {ligne["capacite"] for ligne in lignes}
    for variant in existantes:
        if variant.pk in gardees or not variant.is_active:
            continue
        capacite = capacite_de(variant)
        if capacite is None or capacite in retenues:
            continue
        variant.is_active = False
        variant.save(update_fields=["is_active", "updated_at"])


def demonter_grille(product: Product, *, prix=None, prix_promo=None, quantite=None, seuil_alerte=None) -> None:
    """Retour a un prix unique: une seule version reste en vente.

    Appele quand le gerant retire toutes les capacites. Les versions ecartees
    sont desactivees, jamais supprimees: des commandes les referencent.
    """
    capacitaires = [variant for variant in product.variants.all() if capacite_de(variant) is not None]
    if not capacitaires:
        return

    actives = [variant for variant in capacitaires if variant.is_active]
    gardee = min(actives or capacitaires, key=lambda variant: variant.price_amount)

    for variant in capacitaires:
        if variant.pk == gardee.pk or not variant.is_active:
            continue
        variant.is_active = False
        variant.save(update_fields=["is_active", "updated_at"])

    gardee.attribute_values.filter(attribute_key=CLE_CAPACITE).delete()
    gardee.is_active = product.is_active
    if prix is not None:
        gardee.price_amount = prix
    gardee.promo_price_amount = prix_promo
    gardee.save()
    _poser_stock(gardee, default_internal_source(), quantite, seuil_alerte)


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
    couleurs=None,
    capacites=None,
    capacites_prix=None,
) -> Product:
    grille = _lignes_validees(capacites_prix)
    if not grille:
        _validate_prices(prix, prix_promo)
    if quantite < 0:
        raise ArticleError("La quantite ne peut pas etre negative.")

    # Une capacite qui porte un prix est forcement proposee au client.
    options = _options_validees(
        couleurs,
        [ligne["capacite"] for ligne in grille] if grille else capacites,
    )

    product = Product.objects.create(
        name=nom.strip(),
        slug=unique_product_slug(nom),
        brand=marque,
        category=categorie,
        short_description=description_courte.strip(),
        description=description.strip(),
        is_active=en_ligne,
        is_featured=mis_en_avant,
        options=options,
    )

    if grille:
        # Un prix par capacite: autant de declinaisons vendables, un stock commun.
        sync_capacites(
            product,
            grille,
            quantite=quantite,
            seuil_alerte=seuil_alerte,
            en_ligne=en_ligne,
        )
        return product

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
    # Quand une grille de prix par capacite est envoyee, c'est elle qui fait foi:
    # le prix unique de l'article n'a plus de sens. Envoyee vide, elle demande
    # explicitement le retour a un prix unique.
    grille_envoyee = "capacites_prix" in changes
    grille = _lignes_validees(changes.get("capacites_prix"))

    if not grille:
        prix = changes.get("prix", variant.price_amount if variant else None)
        prix_promo = (
            changes["prix_promo"] if "prix_promo" in changes else (variant.promo_price_amount if variant else None)
        )
        _validate_prices(prix, prix_promo)

    if changes.get("quantite") is not None and changes["quantite"] < 0:
        raise ArticleError("La quantite ne peut pas etre negative.")

    product_fields = []

    if grille_envoyee or "couleurs" in changes or "capacites" in changes:
        # On repart des valeurs deja enregistrees, pas de celles deduites des
        # declinaisons importees: elles peuvent sortir du referentiel actuel.
        stockees = product.options if isinstance(product.options, dict) else {}
        if grille_envoyee:
            # La grille fait foi, y compris vide: plus de prix, plus de capacites.
            capacites_cibles = [ligne["capacite"] for ligne in grille]
        else:
            capacites_cibles = changes.get("capacites", stockees.get("capacites") or [])
        product.options = _options_validees(
            changes.get("couleurs", stockees.get("couleurs") or []),
            capacites_cibles,
        )
        product_fields.append("options")

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

    # Article sans capacite: la grille vide ne demande rien, on passe au prix unique.
    if grille_envoyee and not grille and any(capacite_de(v) is not None for v in product.variants.all()):
        demonter_grille(
            product,
            prix=changes.get("prix"),
            prix_promo=changes.get("prix_promo"),
            quantite=changes.get("quantite"),
            seuil_alerte=changes.get("seuil_alerte"),
        )
        return product

    if not grille and ("en_ligne" in changes or "quantite" in changes or "seuil_alerte" in changes):
        # Mettre en ligne, retirer, ou corriger le stock doit porter sur toutes
        # les capacites de l'article, pas seulement sur la moins chere.
        grille = lignes_capacites(product)

    if grille:
        sync_capacites(
            product,
            grille,
            quantite=changes.get("quantite"),
            seuil_alerte=changes.get("seuil_alerte"),
            en_ligne=product.is_active,
        )
        return product

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
