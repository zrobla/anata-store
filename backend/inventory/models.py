from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import BaseUUIDModel


class InventorySource(BaseUUIDModel):
    INTERNAL = "INTERNAL"
    PARTNER = "PARTNER"
    CONSIGNMENT = "CONSIGNMENT"
    TYPE_CHOICES = [(INTERNAL, "Internal"), (PARTNER, "Partner"), (CONSIGNMENT, "Consignment")]

    name = models.CharField(max_length=120)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    lead_time_days = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"


class InventoryItem(BaseUUIDModel):
    variant = models.ForeignKey(
        "catalog.ProductVariant", on_delete=models.CASCADE, related_name="inventory_items"
    )
    source = models.ForeignKey(InventorySource, on_delete=models.PROTECT, related_name="items")
    qty_on_hand = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(null=True, blank=True)
    lead_time_days = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = [("variant", "source")]
        ordering = ["variant", "source"]


class StockLedger(BaseUUIDModel):
    IN = "IN"
    OUT = "OUT"
    ADJUST = "ADJUST"
    RESERVE = "RESERVE"
    RELEASE = "RELEASE"
    MOVEMENT_CHOICES = [
        (IN, "In"),
        (OUT, "Out"),
        (ADJUST, "Adjust"),
        (RESERVE, "Reserve"),
        (RELEASE, "Release"),
    ]

    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE, related_name="ledger_entries")
    source = models.ForeignKey(
        InventorySource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries",
    )
    movement_type = models.CharField(max_length=10, choices=MOVEMENT_CHOICES)
    qty_delta = models.IntegerField()
    reason = models.CharField(max_length=255)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_actions",
    )

    class Meta:
        ordering = ["-created_at"]
