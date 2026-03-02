from django.contrib import admin

from inventory.models import InventoryItem, InventorySource, StockLedger


@admin.register(InventorySource)
class InventorySourceAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "lead_time_days", "is_active")
    search_fields = ("name",)
    list_filter = ("type", "is_active")


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("variant", "source", "qty_on_hand", "low_stock_threshold", "lead_time_days")
    search_fields = ("variant__sku", "source__name")
    list_filter = ("source__type",)


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ("variant", "source", "movement_type", "qty_delta", "reason", "created_at")
    search_fields = ("variant__sku", "reason")
    list_filter = ("movement_type",)
