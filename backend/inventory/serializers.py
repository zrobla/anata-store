from rest_framework import serializers

from inventory.models import InventoryItem, InventorySource, StockLedger


class InventorySourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventorySource
        fields = ["id", "name", "type", "lead_time_days", "is_active", "created_at", "updated_at"]


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "variant",
            "source",
            "qty_on_hand",
            "low_stock_threshold",
            "lead_time_days",
            "created_at",
            "updated_at",
        ]


class StockLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockLedger
        fields = [
            "id",
            "variant",
            "source",
            "movement_type",
            "qty_delta",
            "reason",
            "actor_user",
            "created_at",
        ]
