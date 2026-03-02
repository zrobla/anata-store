from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Brand, Category, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource
from orders.models import DeliveryZone


class Phase1E2EPurchaseFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        brand = Brand.objects.create(name="Samsung", slug="samsung")
        category = Category.objects.create(name="Smartphones", slug="smartphones")
        product = Product.objects.create(name="Galaxy S Test", slug="galaxy-s-test", brand=brand, category=category)
        self.variant = ProductVariant.objects.create(
            product=product,
            sku="SM-S-TST-256",
            price_amount=500000,
            promo_price_amount=480000,
        )
        source = InventorySource.objects.create(name="Warehouse", type=InventorySource.INTERNAL)
        InventoryItem.objects.create(variant=self.variant, source=source, qty_on_hand=9)
        self.zone = DeliveryZone.objects.create(name="Abidjan", fee_amount=3000, eta_days_min=1, eta_days_max=2)

        user_model = get_user_model()
        self.customer = user_model.objects.create_user(
            username="phase1-customer",
            email="phase1.customer@example.com",
            password="Phase1Customer!2026",
        )
        self.other_customer = user_model.objects.create_user(
            username="phase1-other-customer",
            email="phase1.other@example.com",
            password="Phase1Other!2026",
        )

    def _token_for(self, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/token/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["access"]

    def test_authenticated_customer_can_checkout_and_track_own_order(self):
        access = self._token_for("phase1.customer@example.com", "Phase1Customer!2026")

        add_resp = self.client.post(
            "/api/v1/cart/items",
            {"variant_id": str(self.variant.id), "qty": 2},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(add_resp.status_code, 200)
        add_payload = add_resp.json()
        self.assertEqual(len(add_payload["items"]), 1)

        checkout_resp = self.client.post(
            "/api/v1/checkout/cod",
            {
                "address": {
                    "full_name": "Client Auth",
                    "phone": "0700000000",
                    "city": "Abidjan",
                    "commune": "Cocody",
                    "quartier": "Riviera",
                },
                "delivery_zone_id": str(self.zone.id),
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(checkout_resp.status_code, 201)
        checkout_payload = checkout_resp.json()
        self.assertIn("order_id", checkout_payload)
        order_id = checkout_payload["order_id"]

        list_resp = self.client.get(
            "/api/v1/me/orders",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(list_resp.status_code, 200)
        list_payload = list_resp.json()
        self.assertIn("items", list_payload)
        ids = [item["id"] for item in list_payload["items"]]
        self.assertIn(order_id, ids)

        detail_resp = self.client.get(
            f"/api/v1/me/orders/{order_id}",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(detail_resp.status_code, 200)
        detail_payload = detail_resp.json()
        self.assertEqual(detail_payload["id"], order_id)
        self.assertEqual(detail_payload["status"], "NEW")

    def test_customer_cannot_access_other_customer_order(self):
        owner_access = self._token_for("phase1.customer@example.com", "Phase1Customer!2026")

        self.client.post(
            "/api/v1/cart/items",
            {"variant_id": str(self.variant.id), "qty": 1},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {owner_access}",
        )
        checkout_resp = self.client.post(
            "/api/v1/checkout/cod",
            {
                "address": {
                    "full_name": "Client Auth",
                    "phone": "0700000000",
                    "city": "Abidjan",
                    "commune": "Cocody",
                    "quartier": "Riviera",
                },
                "delivery_zone_id": str(self.zone.id),
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {owner_access}",
        )
        self.assertEqual(checkout_resp.status_code, 201)
        order_id = checkout_resp.json()["order_id"]

        other_access = self._token_for("phase1.other@example.com", "Phase1Other!2026")
        forbidden_resp = self.client.get(
            f"/api/v1/me/orders/{order_id}",
            HTTP_AUTHORIZATION=f"Bearer {other_access}",
        )
        self.assertEqual(forbidden_resp.status_code, 403)
