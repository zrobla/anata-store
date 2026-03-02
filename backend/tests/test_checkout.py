from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Brand, Category, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource
from inventory.services import StockConflictError
from orders.models import Cart, CartItem, DeliveryZone
from orders.services import checkout_cod


User = get_user_model()


class CheckoutCodTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="client@example.com", username="client", password="strong-pass-123")
        brand = Brand.objects.create(name="Apple", slug="apple")
        category = Category.objects.create(name="Smartphones", slug="smartphones")
        product = Product.objects.create(name="iPhone", slug="iphone", brand=brand, category=category)
        self.variant = ProductVariant.objects.create(product=product, sku="IPH-128", price_amount=500000)
        source_internal = InventorySource.objects.create(name="Warehouse", type=InventorySource.INTERNAL)
        self.stock = InventoryItem.objects.create(variant=self.variant, source=source_internal, qty_on_hand=10)
        self.zone = DeliveryZone.objects.create(name="Abidjan", fee_amount=3000, eta_days_min=1, eta_days_max=2)

    def test_checkout_reserves_stock_and_creates_order(self):
        cart = Cart.objects.create(owner_user=self.user)
        CartItem.objects.create(cart=cart, variant=self.variant, qty=2, unit_price_amount=500000)

        result = checkout_cod(
            cart=cart,
            address={
                "full_name": "Client Test",
                "phone": "0700000000",
                "city": "Abidjan",
                "commune": "Cocody",
                "quartier": "Riviera",
            },
            delivery_zone_id=self.zone.id,
            customer_user=self.user,
        )

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.qty_on_hand, 8)
        self.assertEqual(result.order.items.count(), 1)
        self.assertEqual(result.order.total_amount, 1003000)

    def test_checkout_raises_409_conflict_equivalent_on_shortage(self):
        cart = Cart.objects.create(owner_user=self.user)
        CartItem.objects.create(cart=cart, variant=self.variant, qty=99, unit_price_amount=500000)

        with self.assertRaises(StockConflictError):
            checkout_cod(
                cart=cart,
                address={
                    "full_name": "Client Test",
                    "phone": "0700000000",
                    "city": "Abidjan",
                    "commune": "Cocody",
                    "quartier": "Riviera",
                },
                delivery_zone_id=self.zone.id,
                customer_user=self.user,
            )
