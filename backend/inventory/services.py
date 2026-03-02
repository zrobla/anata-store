from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from inventory.models import InventoryItem, InventorySource, StockLedger


@dataclass
class AvailabilityInfo:
    status: str
    lead_time_days: int | None = None


class StockConflictError(Exception):
    pass


def compute_variant_availability(variant) -> dict[str, str | int | None]:
    items = list(
        InventoryItem.objects.filter(variant=variant, source__is_active=True).select_related("source")
    )

    internal_qty = sum(
        item.qty_on_hand for item in items if item.source.type == InventorySource.INTERNAL and item.qty_on_hand > 0
    )
    if internal_qty > 0:
        return {"status": "IN_STOCK", "lead_time_days": None}

    partner_items = [
        item
        for item in items
        if item.source.type in {InventorySource.PARTNER, InventorySource.CONSIGNMENT}
        and item.qty_on_hand > 0
    ]
    if partner_items:
        lead_times = []
        for item in partner_items:
            lead = item.lead_time_days if item.lead_time_days is not None else item.source.lead_time_days
            if lead is not None:
                lead_times.append(lead)
        return {
            "status": "AVAILABLE_SOON",
            "lead_time_days": min(lead_times) if lead_times else None,
        }

    return {"status": "OUT_OF_STOCK", "lead_time_days": None}


@transaction.atomic
def reserve_internal_stock(*, variant, qty: int, actor_user=None, reason: str = "COD checkout"):
    items = (
        InventoryItem.objects.select_for_update()
        .filter(
            variant=variant,
            source__type=InventorySource.INTERNAL,
            source__is_active=True,
            qty_on_hand__gt=0,
        )
        .select_related("source")
        .order_by("-qty_on_hand")
    )

    total_available = sum(item.qty_on_hand for item in items)
    if total_available < qty:
        raise StockConflictError(f"Insufficient internal stock for variant={variant.id}")

    remaining = qty
    for item in items:
        if remaining <= 0:
            break
        take = min(item.qty_on_hand, remaining)
        item.qty_on_hand -= take
        item.save(update_fields=["qty_on_hand", "updated_at"])
        remaining -= take
        StockLedger.objects.create(
            variant=variant,
            source=item.source,
            movement_type=StockLedger.RESERVE,
            qty_delta=-take,
            reason=reason,
            actor_user=actor_user,
        )

    return True
