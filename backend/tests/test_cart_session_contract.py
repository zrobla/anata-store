from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Brand, Category, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource
from orders.models import DeliveryZone


class CartSessionContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        brand = Brand.objects.create(name="Samsung", slug="samsung")
        category = Category.objects.create(name="Smartphones", slug="smartphones")
        product = Product.objects.create(name="Galaxy S", slug="galaxy-s", brand=brand, category=category)
        self.variant = ProductVariant.objects.create(product=product, sku="SM-S-128-BLK", price_amount=100000)
        source = InventorySource.objects.create(name="Warehouse", type=InventorySource.INTERNAL)
        InventoryItem.objects.create(variant=self.variant, source=source, qty_on_hand=10)
        self.zone = DeliveryZone.objects.create(name="Abidjan", fee_amount=3000, eta_days_min=1, eta_days_max=2)

    def test_cart_session_is_returned_in_body_and_supports_query_param_flow(self):
        add_resp = self.client.post(
            "/api/v1/cart/items",
            {"variant_id": str(self.variant.id), "qty": 1},
            format="json",
        )
        self.assertEqual(add_resp.status_code, 200)
        add_payload = add_resp.json()
        session = add_payload.get("session")
        self.assertTrue(session)
        self.assertEqual(len(add_payload.get("items", [])), 1)

        cart_item_id = add_payload["items"][0]["id"]

        get_resp = self.client.get(f"/api/v1/cart?cart_session={session}")
        self.assertEqual(get_resp.status_code, 200)
        get_payload = get_resp.json()
        self.assertEqual(get_payload.get("session"), session)
        self.assertEqual(len(get_payload.get("items", [])), 1)

        patch_resp = self.client.patch(
            f"/api/v1/cart/items/{cart_item_id}?cart_session={session}",
            {"qty": 3},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, 200)
        patch_payload = patch_resp.json()
        self.assertEqual(patch_payload.get("session"), session)
        self.assertEqual(patch_payload["items"][0]["qty"], 3)

        delete_resp = self.client.delete(f"/api/v1/cart/items/{cart_item_id}?cart_session={session}")
        self.assertEqual(delete_resp.status_code, 200)
        delete_payload = delete_resp.json()
        self.assertEqual(delete_payload.get("session"), session)
        self.assertEqual(delete_payload.get("items"), [])

    def test_cors_contract_exposes_cart_session_headers(self):
        options_resp = self.client.options(
            "/api/v1/cart/items",
            HTTP_ORIGIN="http://127.0.0.1:3000",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-cart-session",
        )
        self.assertEqual(options_resp.status_code, 200)

        allow_headers = options_resp.headers.get("Access-Control-Allow-Headers", "").lower()
        expose_headers = options_resp.headers.get("Access-Control-Expose-Headers", "")

        self.assertIn("x-cart-session", allow_headers)
        self.assertIn("X-Cart-Session", expose_headers)

    def test_guest_checkout_cod_works_with_cart_session(self):
        add_resp = self.client.post(
            "/api/v1/cart/items",
            {"variant_id": str(self.variant.id), "qty": 1},
            format="json",
        )
        self.assertEqual(add_resp.status_code, 200)
        session = add_resp.json().get("session")
        self.assertTrue(session)

        checkout_resp = self.client.post(
            f"/api/v1/checkout/cod?cart_session={session}",
            {
                "address": {
                    "full_name": "Client Guest",
                    "phone": "0700000000",
                    "city": "Abidjan",
                    "commune": "Cocody",
                    "quartier": "Riviera",
                },
                "delivery_zone_id": str(self.zone.id),
            },
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, 201)
        payload = checkout_resp.json()
        self.assertIn("order_id", payload)
        self.assertEqual(payload.get("status"), "NEW")
