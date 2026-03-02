from __future__ import annotations

from django.db import models

from common.models import BaseUUIDModel


class Deal(BaseUUIDModel):
    PERCENT = "PERCENT"
    AMOUNT = "AMOUNT"
    TYPE_CHOICES = [(PERCENT, "Percent"), (AMOUNT, "Amount")]

    PRODUCT = "PRODUCT"
    CATEGORY = "CATEGORY"
    BRAND = "BRAND"
    SCOPE_CHOICES = [(PRODUCT, "Product"), (CATEGORY, "Category"), (BRAND, "Brand")]

    name = models.CharField(max_length=180)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    value = models.PositiveIntegerField()
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    scope_ref_id = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-starts_at", "name"]


class Coupon(BaseUUIDModel):
    PERCENT = "PERCENT"
    AMOUNT = "AMOUNT"
    TYPE_CHOICES = [(PERCENT, "Percent"), (AMOUNT, "Amount")]

    code = models.CharField(max_length=60, unique=True)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    value = models.PositiveIntegerField()
    min_cart_amount = models.PositiveIntegerField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]


class Bundle(BaseUUIDModel):
    name = models.CharField(max_length=180)
    primary_product = models.ForeignKey(
        "catalog.Product", on_delete=models.PROTECT, related_name="bundles"
    )
    savings_amount = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


class BundleItem(BaseUUIDModel):
    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, related_name="bundle_items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT, related_name="+")
    qty = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = [("bundle", "variant")]
