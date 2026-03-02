from __future__ import annotations

import secrets
import string

from django.conf import settings
from django.db import models
from django.utils import timezone

from common.models import BaseUUIDModel


class Cart(BaseUUIDModel):
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carts",
    )
    session_key = models.CharField(max_length=64, blank=True, db_index=True)
    currency = models.CharField(max_length=3, default="XOF")


class CartItem(BaseUUIDModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT, related_name="cart_items")
    qty = models.PositiveIntegerField(default=1)
    unit_price_amount = models.PositiveIntegerField()

    class Meta:
        unique_together = [("cart", "variant")]


class DeliveryZone(BaseUUIDModel):
    name = models.CharField(max_length=120)
    fee_amount = models.PositiveIntegerField(default=0)
    eta_days_min = models.PositiveIntegerField(default=1)
    eta_days_max = models.PositiveIntegerField(default=3)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


class Order(BaseUUIDModel):
    NEW = "NEW"
    CONFIRMED = "CONFIRMED"
    PACKING = "PACKING"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (NEW, "New"),
        (CONFIRMED, "Confirmed"),
        (PACKING, "Packing"),
        (OUT_FOR_DELIVERY, "Out for delivery"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
    ]

    COD = "COD"
    PAYMENT_CHOICES = [(COD, "Cash On Delivery")]

    order_number = models.CharField(max_length=24, unique=True)
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEW)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default=COD)
    address_json = models.JSONField()
    delivery_zone = models.ForeignKey(
        DeliveryZone,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    subtotal_amount = models.PositiveIntegerField(default=0)
    delivery_fee_amount = models.PositiveIntegerField(default=0)
    total_amount = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    @staticmethod
    def generate_order_number() -> str:
        date_part = timezone.now().strftime("%Y%m%d")
        random_part = "".join(secrets.choice(string.digits) for _ in range(6))
        return f"TW-{date_part}-{random_part}"


class OrderItem(BaseUUIDModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.PROTECT, related_name="order_items")
    product_snapshot_json = models.JSONField()
    qty = models.PositiveIntegerField(default=1)
    unit_price_amount = models.PositiveIntegerField()
    line_total_amount = models.PositiveIntegerField()


class StockReservation(BaseUUIDModel):
    ACTIVE = "ACTIVE"
    RELEASED = "RELEASED"
    COMMITTED = "COMMITTED"
    STATUS_CHOICES = [(ACTIVE, "Active"), (RELEASED, "Released"), (COMMITTED, "Committed")]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="stock_reservations")
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.CASCADE, related_name="stock_reservations"
    )
    qty_reserved = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ACTIVE)


class CODCollection(BaseUUIDModel):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="cod_collections")
    amount = models.PositiveIntegerField()
    collected_by = models.CharField(max_length=120)
    proof_url = models.URLField(blank=True)
    collected_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cod_records",
    )
