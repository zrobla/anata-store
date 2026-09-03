from __future__ import annotations

from urllib.parse import urlparse, urlunparse

from django.utils.text import slugify
from rest_framework import serializers

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

LOCAL_MEDIA_HOSTS = {"127.0.0.1", "localhost"}


def _public_media_url(raw_url: str, request) -> str:
    if not raw_url:
        return ""
    if request is None:
        return raw_url
    if raw_url.startswith("/"):
        return request.build_absolute_uri(raw_url)

    parsed = urlparse(raw_url)
    if parsed.scheme in {"http", "https"} and parsed.hostname in LOCAL_MEDIA_HOSTS:
        return urlunparse(
            (
                request.scheme,
                request.get_host(),
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment,
            )
        )
    return raw_url


class BrandSerializer(serializers.ModelSerializer):
    active_products = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "description", "logo_url", "is_active", "active_products"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "sort_order", "is_active"]


class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ["id", "key", "label", "type", "is_filterable", "sort_order"]


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = ["id", "url", "alt", "kind", "sort_order"]

    def get_url(self, obj: MediaAsset) -> str:
        request = self.context.get("request")
        return _public_media_url(obj.effective_url, request)


class VariantAttributeValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantAttributeValue
        fields = ["attribute_key", "value", "label"]


class ProductVariantSerializer(serializers.ModelSerializer):
    attributes = VariantAttributeValueSerializer(source="attribute_values", many=True, read_only=True)
    availability = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "barcode",
            "price_amount",
            "promo_price_amount",
            "attributes",
            "availability",
            "is_active",
        ]

    def get_availability(self, obj: ProductVariant) -> dict:
        return obj.availability_info()


class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    media = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "description",
            "category",
            "brand",
            "is_active",
            "is_featured",
            "badges",
            "variants",
            "media",
        ]

    def get_media(self, obj: Product) -> list[dict]:
        links = obj.media_links.select_related("media_asset").order_by("sort_order")
        return MediaAssetSerializer(
            [link.media_asset for link in links], many=True, context=self.context
        ).data


class ProductListItemSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    min_promo_price = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category_slug",
            "brand_slug",
            "thumbnail_url",
            "min_price",
            "min_promo_price",
            "availability",
            "badges",
        ]

    def get_thumbnail_url(self, obj: Product) -> str:
        media_link = obj.media_links.select_related("media_asset").order_by("sort_order").first()
        request = self.context.get("request")
        return _public_media_url(media_link.media_asset.effective_url, request) if media_link else ""

    def get_min_price(self, obj: Product) -> int | None:
        variant = obj.variants.filter(is_active=True).order_by("price_amount").first()
        return variant.price_amount if variant else None

    def get_min_promo_price(self, obj: Product) -> int | None:
        variant = obj.variants.filter(is_active=True, promo_price_amount__isnull=False).order_by(
            "promo_price_amount"
        ).first()
        return variant.promo_price_amount if variant else None

    def get_availability(self, obj: Product) -> dict[str, int | str | None]:
        variants = obj.variants.filter(is_active=True)
        if not variants.exists():
            return {"status": "OUT_OF_STOCK", "lead_time_days": None}

        statuses = [variant.availability_info() for variant in variants]
        if any(status["status"] == "IN_STOCK" for status in statuses):
            return {"status": "IN_STOCK", "lead_time_days": None}

        soon = [status for status in statuses if status["status"] == "AVAILABLE_SOON"]
        if soon:
            lead_times = [s["lead_time_days"] for s in soon if s.get("lead_time_days") is not None]
            return {
                "status": "AVAILABLE_SOON",
                "lead_time_days": min(lead_times) if lead_times else None,
            }

        return {"status": "OUT_OF_STOCK", "lead_time_days": None}


class SellerProductPhotoSerializer(serializers.ModelSerializer):
    """Une photo telle que rattachee a un article, vue depuis le studio."""

    url = serializers.SerializerMethodField()
    alt = serializers.CharField(source="media_asset.alt", read_only=True)
    is_primary = serializers.SerializerMethodField()

    class Meta:
        model = ProductMedia
        fields = ["id", "url", "alt", "sort_order", "is_primary"]

    def get_url(self, obj: ProductMedia) -> str:
        return _public_media_url(obj.media_asset.effective_url, self.context.get("request"))

    def get_is_primary(self, obj: ProductMedia) -> bool:
        return obj.sort_order == 0


class SellerProductSerializer(serializers.ModelSerializer):
    # Le gerant saisit un nom, pas une adresse technique: on la fabrique pour lui.
    slug = serializers.SlugField(required=False, allow_blank=True)
    thumbnail_url = serializers.SerializerMethodField()
    photos_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "brand",
            "category",
            "short_description",
            "description",
            "is_active",
            "is_featured",
            "badges",
            "seo_title",
            "seo_description",
            "thumbnail_url",
            "photos_count",
            "created_at",
            "updated_at",
        ]

    def get_thumbnail_url(self, obj: Product) -> str:
        link = obj.media_links.select_related("media_asset").order_by("sort_order").first()
        return _public_media_url(link.media_asset.effective_url, self.context.get("request")) if link else ""

    def get_photos_count(self, obj: Product) -> int:
        return obj.media_links.count()

    def validate(self, attrs):
        # Slug absent a la creation: on le derive du nom en garantissant l'unicite.
        if not attrs.get("slug"):
            name = attrs.get("name") or getattr(self.instance, "name", "")
            if name:
                attrs["slug"] = self._unique_slug(slugify(name))
        return attrs

    def _unique_slug(self, base: str) -> str:
        base = base or "article"
        queryset = Product.objects.all()
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        candidate = base
        suffix = 2
        while queryset.filter(slug=candidate).exists():
            candidate = f"{base}-{suffix}"
            suffix += 1
        return candidate


class SellerVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "sku",
            "barcode",
            "price_amount",
            "promo_price_amount",
            "is_active",
            "created_at",
            "updated_at",
        ]
