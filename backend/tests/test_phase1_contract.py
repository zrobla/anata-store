from django.test import TestCase

from catalog.models import Attribute, Brand, Category, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource


class Phase1ContractTests(TestCase):
    def setUp(self):
        self.brand = Brand.objects.create(name="Samsung", slug="samsung")
        self.category = Category.objects.create(name="Smartphones", slug="smartphones")
        Attribute.objects.create(
            key="ram",
            label="RAM",
            type=Attribute.SELECT,
            is_filterable=True,
            sort_order=1,
        )
        self.product = Product.objects.create(
            name="Samsung Test",
            slug="samsung-test",
            brand=self.brand,
            category=self.category,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="SAM-TST-001",
            price_amount=100000,
            promo_price_amount=95000,
            is_active=True,
        )
        source = InventorySource.objects.create(name="Main", type=InventorySource.INTERNAL, is_active=True)
        InventoryItem.objects.create(variant=self.variant, source=source, qty_on_hand=3)

    def test_catalog_attributes_endpoint_returns_filterable_attributes(self):
        response = self.client.get("/api/v1/catalog/attributes/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload, list)
        self.assertGreaterEqual(len(payload), 1)
        self.assertIn("key", payload[0])

    def test_search_suggest_endpoint_returns_expected_shape(self):
        response = self.client.get("/api/v1/search/suggest", {"q": "sam"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("products", payload)
        self.assertIn("brands", payload)
        self.assertIn("categories", payload)
        self.assertGreaterEqual(len(payload["products"]), 1)

    def test_products_list_returns_meta_and_items(self):
        response = self.client.get("/api/v1/products/", {"page": 1, "page_size": 12})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("meta", payload)
        self.assertIn("items", payload)
        self.assertIn("total", payload["meta"])
        self.assertIsInstance(payload["items"], list)
