from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Brand, Category, Product, ProductVariant


User = get_user_model()


class Phase2ModulesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_superuser(
            email="owner@example.com",
            username="owner",
            password="strong-pass-123",
        )
        self.client.force_authenticate(self.seller)

        brand = Brand.objects.create(name="Samsung", slug="samsung")
        category = Category.objects.create(name="Smartphones", slug="smartphones")
        self.product = Product.objects.create(
            name="Samsung Phase2",
            slug="samsung-phase2",
            brand=brand,
            category=category,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="SAM-P2-001",
            price_amount=120000,
            is_active=True,
        )

    def test_public_review_and_question_create(self):
        self.client.force_authenticate(user=None)
        review_resp = self.client.post(
            "/api/v1/reviews",
            {"product_id": str(self.product.id), "rating": 5, "title": "Top", "body": "RAS"},
            format="json",
        )
        self.assertEqual(review_resp.status_code, 201)

        qna_resp = self.client.post(
            "/api/v1/questions",
            {"product_id": str(self.product.id), "question": "La garantie est de 12 mois ?"},
            format="json",
        )
        self.assertEqual(qna_resp.status_code, 201)

    def test_seller_variants_endpoint(self):
        create_resp = self.client.post(
            "/api/v1/seller/variants/",
            {
                "product": str(self.product.id),
                "sku": "SAM-P2-002",
                "price_amount": 130000,
                "promo_price_amount": 125000,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, 201)

        list_resp = self.client.get("/api/v1/seller/variants/")
        self.assertEqual(list_resp.status_code, 200)

    def test_seller_promotions_endpoints(self):
        deal_resp = self.client.post(
            "/api/v1/seller/deals/",
            {
                "name": "Deal Flash",
                "starts_at": "2026-03-01T10:00:00Z",
                "ends_at": "2026-03-31T23:59:00Z",
                "type": "PERCENT",
                "value": 10,
                "scope": "PRODUCT",
                "scope_ref_id": str(self.product.id),
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(deal_resp.status_code, 201)

        coupon_resp = self.client.post(
            "/api/v1/seller/coupons/",
            {
                "code": "MVP10",
                "description": "Coupon test",
                "type": "AMOUNT",
                "value": 10000,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(coupon_resp.status_code, 201)

        bundle_resp = self.client.post(
            "/api/v1/seller/bundles/",
            {
                "name": "Starter Bundle",
                "primary_product": str(self.product.id),
                "savings_amount": 5000,
                "is_active": True,
                "items": [{"variant_id": str(self.variant.id), "qty": 1}],
            },
            format="json",
        )
        self.assertEqual(bundle_resp.status_code, 201)
