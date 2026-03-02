from __future__ import annotations

from rest_framework import serializers

from catalog.models import ProductVariant
from orders.models import Cart, CartItem, CODCollection, DeliveryZone, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    variant_attributes = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "variant",
            "variant_sku",
            "product_name",
            "variant_attributes",
            "availability",
            "qty",
            "unit_price_amount",
        ]

    def get_variant_attributes(self, obj: CartItem) -> list[dict]:
        attrs = obj.variant.attribute_values.all().order_by("attribute_key")
        return [
            {
                "attribute_key": attr.attribute_key,
                "value": attr.value,
                "label": attr.label or attr.value,
            }
            for attr in attrs
        ]

    def get_availability(self, obj: CartItem) -> dict:
        return obj.variant.availability_info()


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "currency", "items", "created_at", "updated_at"]


class CartItemCreateSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    qty = serializers.IntegerField(min_value=1, default=1)

    def validate_variant_id(self, value):
        if not ProductVariant.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Variant not found or inactive")
        return value


class CartItemUpdateSerializer(serializers.Serializer):
    qty = serializers.IntegerField(min_value=1)


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ["id", "name", "fee_amount", "eta_days_min", "eta_days_max", "is_active"]


class AddressCISerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=180)
    phone = serializers.CharField(max_length=30)
    whatsapp = serializers.CharField(max_length=30, allow_blank=True, required=False)
    city = serializers.CharField(max_length=120)
    commune = serializers.CharField(max_length=120)
    quartier = serializers.CharField(max_length=120)
    landmark = serializers.CharField(max_length=255, allow_blank=True, required=False)
    notes = serializers.CharField(allow_blank=True, required=False)


class CheckoutCODRequestSerializer(serializers.Serializer):
    address = AddressCISerializer()
    delivery_zone_id = serializers.UUIDField()


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "variant",
            "product_snapshot_json",
            "qty",
            "unit_price_amount",
            "line_total_amount",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_method",
            "address_json",
            "delivery_zone",
            "items",
            "subtotal_amount",
            "delivery_fee_amount",
            "total_amount",
            "created_at",
            "updated_at",
        ]


class SellerOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in Order.STATUS_CHOICES])


class CODCollectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CODCollection
        fields = ["order", "amount", "collected_by", "proof_url", "collected_at"]
