from __future__ import annotations

from rest_framework import serializers

from promotions.models import Bundle, BundleItem, Coupon, Deal


class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "starts_at",
            "ends_at",
            "type",
            "value",
            "scope",
            "scope_ref_id",
            "is_active",
            "created_at",
            "updated_at",
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "description",
            "type",
            "value",
            "min_cart_amount",
            "max_uses",
            "max_uses_per_user",
            "starts_at",
            "ends_at",
            "is_active",
            "created_at",
            "updated_at",
        ]


class BundleItemPayloadSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    qty = serializers.IntegerField(min_value=1)


class BundleSerializer(serializers.ModelSerializer):
    items = BundleItemPayloadSerializer(many=True, write_only=True, required=True)

    class Meta:
        model = Bundle
        fields = [
            "id",
            "name",
            "primary_product",
            "savings_amount",
            "is_active",
            "items",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        items = validated_data.pop("items")
        bundle = Bundle.objects.create(**validated_data)
        self._sync_items(bundle, items)
        return bundle

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if items is not None:
            self._sync_items(instance, items)
        return instance

    @staticmethod
    def _sync_items(bundle: Bundle, items: list[dict]) -> None:
        BundleItem.objects.filter(bundle=bundle).delete()
        for row in items:
            BundleItem.objects.create(bundle=bundle, variant_id=row["variant_id"], qty=row["qty"])

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["items"] = [
            {"variant_id": str(item.variant_id), "qty": item.qty}
            for item in instance.bundle_items.select_related("variant").all()
        ]
        return data
