from __future__ import annotations

from django.db import models

from common.models import BaseUUIDModel


class Brand(BaseUUIDModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    logo_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Category(BaseUUIDModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class Attribute(BaseUUIDModel):
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    SELECT = "SELECT"
    TYPE_CHOICES = [(TEXT, "Text"), (NUMBER, "Number"), (SELECT, "Select")]

    key = models.CharField(max_length=80, unique=True)
    label = models.CharField(max_length=120)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    is_filterable = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "label"]


class AttributeValue(BaseUUIDModel):
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=120)
    label = models.CharField(max_length=120, blank=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        unique_together = [("attribute", "value")]
        ordering = ["sort_order", "value"]


class Product(BaseUUIDModel):
    name = models.CharField(max_length=180)
    slug = models.SlugField(unique=True)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    badges = models.JSONField(default=list, blank=True)
    seo_title = models.CharField(max_length=180, blank=True)
    seo_description = models.CharField(max_length=320, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class ProductVariant(BaseUUIDModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=120, unique=True)
    barcode = models.CharField(max_length=120, blank=True)
    price_amount = models.PositiveIntegerField()
    promo_price_amount = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku"]

    @property
    def active_price_amount(self) -> int:
        return self.promo_price_amount or self.price_amount

    def availability_info(self) -> dict[str, int | str | None]:
        from inventory.services import compute_variant_availability

        return compute_variant_availability(self)


class VariantAttributeValue(BaseUUIDModel):
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="attribute_values"
    )
    attribute_key = models.CharField(max_length=80)
    value = models.CharField(max_length=120)
    label = models.CharField(max_length=120, blank=True)

    class Meta:
        unique_together = [("variant", "attribute_key")]


class MediaAsset(BaseUUIDModel):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    KIND_CHOICES = [(IMAGE, "Image"), (VIDEO, "Video")]

    url = models.URLField()
    alt = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default=IMAGE)
    sort_order = models.IntegerField(default=0)


class ProductMedia(BaseUUIDModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media_links")
    media_asset = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, related_name="product_links")
    sort_order = models.IntegerField(default=0)

    class Meta:
        unique_together = [("product", "media_asset")]


class VariantMedia(BaseUUIDModel):
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="media_links"
    )
    media_asset = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, related_name="variant_links")
    sort_order = models.IntegerField(default=0)

    class Meta:
        unique_together = [("variant", "media_asset")]
