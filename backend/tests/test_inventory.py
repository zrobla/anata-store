from django.test import TestCase

from catalog.models import Brand, Category, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource
from inventory.services import compute_variant_availability


class InventoryAvailabilityTests(TestCase):
    def setUp(self):
        brand = Brand.objects.create(name="Samsung", slug="samsung")
        category = Category.objects.create(name="Smartphones", slug="smartphones")
        product = Product.objects.create(name="Galaxy S", slug="galaxy-s", brand=brand, category=category)
        self.variant = ProductVariant.objects.create(product=product, sku="SGS-8-256", price_amount=100000)

    def test_in_stock_when_internal_has_qty(self):
        source_internal = InventorySource.objects.create(name="Main Warehouse", type=InventorySource.INTERNAL)
        InventoryItem.objects.create(variant=self.variant, source=source_internal, qty_on_hand=3)

        availability = compute_variant_availability(self.variant)
        self.assertEqual(availability["status"], "IN_STOCK")
        self.assertIsNone(availability["lead_time_days"])

    def test_available_soon_when_partner_has_qty(self):
        source_partner = InventorySource.objects.create(
            name="Partner A", type=InventorySource.PARTNER, lead_time_days=4
        )
        InventoryItem.objects.create(variant=self.variant, source=source_partner, qty_on_hand=2)

        availability = compute_variant_availability(self.variant)
        self.assertEqual(availability["status"], "AVAILABLE_SOON")
        self.assertEqual(availability["lead_time_days"], 4)

    def test_out_of_stock_when_no_qty(self):
        source_internal = InventorySource.objects.create(name="Main Warehouse", type=InventorySource.INTERNAL)
        InventoryItem.objects.create(variant=self.variant, source=source_internal, qty_on_hand=0)

        availability = compute_variant_availability(self.variant)
        self.assertEqual(availability["status"], "OUT_OF_STOCK")
