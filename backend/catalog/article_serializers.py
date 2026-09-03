"""Serializers de la vue « article »: vocabulaire metier, pas de jargon technique."""

from __future__ import annotations

from rest_framework import serializers

from catalog.article_service import read_article
from catalog.models import Brand, Category, Product
from catalog.serializers import _public_media_url


class ArticleSerializer(serializers.Serializer):
    """Un article = ce que le gerant manipule: un nom, une photo, un prix, une quantite."""

    id = serializers.UUIDField(read_only=True)
    nom = serializers.CharField(max_length=200)
    marque = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.all())
    marque_nom = serializers.SerializerMethodField()
    categorie = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    categorie_nom = serializers.SerializerMethodField()

    prix = serializers.IntegerField(min_value=0)
    prix_promo = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    quantite = serializers.IntegerField(min_value=0, required=False, default=0)
    seuil_alerte = serializers.IntegerField(min_value=0, required=False, allow_null=True)

    description_courte = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    en_ligne = serializers.BooleanField(required=False, default=True)
    mis_en_avant = serializers.BooleanField(required=False, default=False)

    photo_url = serializers.SerializerMethodField()
    nombre_photos = serializers.SerializerMethodField()
    nombre_variantes = serializers.SerializerMethodField()
    disponibilite = serializers.SerializerMethodField()
    adresse_web = serializers.CharField(source="slug", read_only=True)

    def _snapshot(self, obj: Product) -> dict:
        # read_article touche plusieurs tables: on ne l'appelle qu'une fois par objet.
        cache = self.context.setdefault("_article_cache", {})
        if obj.pk not in cache:
            cache[obj.pk] = read_article(obj)
        return cache[obj.pk]

    def get_marque_nom(self, obj: Product) -> str:
        return obj.brand.name if obj.brand else ""

    def get_categorie_nom(self, obj: Product) -> str:
        return obj.category.name if obj.category else ""

    def get_photo_url(self, obj: Product) -> str:
        link = self._snapshot(obj)["photo_link"]
        return _public_media_url(link.media_asset.effective_url, self.context.get("request")) if link else ""

    def get_nombre_photos(self, obj: Product) -> int:
        return obj.media_links.count()

    def get_nombre_variantes(self, obj: Product) -> int:
        return self._snapshot(obj)["nombre_variantes"]

    def get_disponibilite(self, obj: Product) -> str:
        snapshot = self._snapshot(obj)
        if not obj.is_active:
            return "HORS_LIGNE"
        quantite = snapshot["quantite"]
        if quantite <= 0:
            return "EPUISE"
        seuil = snapshot["seuil_alerte"]
        if seuil is not None and quantite <= seuil:
            return "STOCK_BAS"
        return "EN_VENTE"

    def to_representation(self, obj: Product) -> dict:
        snapshot = self._snapshot(obj)
        return {
            "id": str(obj.id),
            "nom": obj.name,
            "marque": str(obj.brand_id) if obj.brand_id else None,
            "marque_nom": self.get_marque_nom(obj),
            "categorie": str(obj.category_id) if obj.category_id else None,
            "categorie_nom": self.get_categorie_nom(obj),
            "prix": snapshot["prix"],
            "prix_promo": snapshot["prix_promo"],
            "quantite": snapshot["quantite"],
            "seuil_alerte": snapshot["seuil_alerte"],
            "description_courte": obj.short_description,
            "description": obj.description,
            "en_ligne": obj.is_active,
            "mis_en_avant": obj.is_featured,
            "photo_url": self.get_photo_url(obj),
            "nombre_photos": self.get_nombre_photos(obj),
            "nombre_variantes": snapshot["nombre_variantes"],
            "disponibilite": self.get_disponibilite(obj),
            "adresse_web": obj.slug,
        }


class ArticleUpdateSerializer(ArticleSerializer):
    """En modification, tout est optionnel: on n'applique que ce qui est envoye."""

    nom = serializers.CharField(max_length=200, required=False)
    marque = serializers.PrimaryKeyRelatedField(queryset=Brand.objects.all(), required=False)
    categorie = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False)
    prix = serializers.IntegerField(min_value=0, required=False)
    quantite = serializers.IntegerField(min_value=0, required=False)
    en_ligne = serializers.BooleanField(required=False)
    mis_en_avant = serializers.BooleanField(required=False)
    description_courte = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
