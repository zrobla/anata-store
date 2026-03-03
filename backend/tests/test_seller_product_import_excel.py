from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Brand, Category, Product, ProductMedia, ProductVariant, VariantAttributeValue
from catalog.product_import import build_product_import_workbook, read_xlsx_rows
from inventory.models import InventoryItem, InventorySource


User = get_user_model()


class SellerProductImportExcelTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_superuser(
            email="import-owner@example.com",
            username="import-owner",
            password="strong-pass-123",
        )
        self.client.force_authenticate(self.seller)

        self.brand = Brand.objects.create(name="Samsung", slug="samsung")
        self.category = Category.objects.create(name="Smartphones", slug="smartphones")

    def _build_xlsx_bytes(self, rows: list[dict]) -> bytes:
        return build_product_import_workbook(rows)

    def test_template_download_endpoint_returns_valid_xlsx(self):
        response = self.client.get("/api/v1/seller/products/import/template")
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response["Content-Type"],
        )
        headers = [str(value or "") for value in read_xlsx_rows(response.content)[0]]
        self.assertIn("product_name", headers)
        self.assertIn("variant_sku", headers)
        self.assertIn("price_amount", headers)

    def test_excel_import_creates_product_variant_media_and_stock(self):
        payload_rows = [
            {
                "product_name": "Sam-S25 Ultra",
                "product_slug": "sam-s25-ultra",
                "brand_slug": "samsung",
                "category_slug": "smartphones",
                "short_description": "Modele premium",
                "description": "Import test",
                "is_active": "true",
                "is_featured": "true",
                "badges": "Nouveau, Top vente",
                "variant_sku": "SAM-S25U-256-BLK",
                "variant_barcode": "8806095812345",
                "price_amount": 1345860,
                "promo_price_amount": 1299860,
                "variant_is_active": "true",
                "color": "Noir",
                "storage": "256GB",
                "ram": "12GB",
                "image_url": "https://example.com/sam-s25-ultra-front.jpg",
                "stock_source_name": "Main Store Treichville",
                "stock_source_type": "INTERNAL",
                "stock_qty": 6,
                "stock_low_threshold": 2,
                "stock_lead_time_days": 1,
            }
        ]
        upload = SimpleUploadedFile(
            "products-import.xlsx",
            self._build_xlsx_bytes(payload_rows),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post("/api/v1/seller/products/import/excel", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content)

        report = response.json()
        self.assertEqual(report["total_rows"], 1)
        self.assertEqual(report["processed_rows"], 1)
        self.assertEqual(len(report["errors"]), 0)
        self.assertEqual(report["created"]["products"], 1)
        self.assertEqual(report["created"]["variants"], 1)
        self.assertEqual(report["created"]["inventory_items"], 1)
        self.assertEqual(report["created"]["media_assets"], 1)
        self.assertEqual(report["created"]["media_links"], 1)

        product = Product.objects.get(slug="sam-s25-ultra")
        variant = ProductVariant.objects.get(sku="SAM-S25U-256-BLK")
        self.assertEqual(variant.product_id, product.id)
        self.assertTrue(product.is_featured)
        self.assertEqual(product.badges, ["Nouveau", "Top vente"])
        self.assertEqual(VariantAttributeValue.objects.filter(variant=variant).count(), 3)
        self.assertTrue(ProductMedia.objects.filter(product=product).exists())
        self.assertTrue(
            InventoryItem.objects.filter(
                variant=variant,
                source__name="Main Store Treichville",
                qty_on_hand=6,
            ).exists()
        )

    def test_excel_import_reports_error_but_continues_other_rows(self):
        payload_rows = [
            {
                "product_name": "Sam-A56",
                "product_slug": "sam-a56",
                "brand_slug": "samsung",
                "category_slug": "smartphones",
                "variant_sku": "SAM-A56-128-BLK",
                "price_amount": 286860,
            },
            {
                "product_name": "Sam-A36",
                "product_slug": "sam-a36",
                "brand_slug": "unknown-brand",
                "category_slug": "smartphones",
                "variant_sku": "SAM-A36-128-BLK",
                "price_amount": 219860,
            },
        ]
        upload = SimpleUploadedFile(
            "products-import.xlsx",
            self._build_xlsx_bytes(payload_rows),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        response = self.client.post("/api/v1/seller/products/import/excel", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content)

        report = response.json()
        self.assertEqual(report["total_rows"], 2)
        self.assertEqual(report["processed_rows"], 1)
        self.assertEqual(len(report["errors"]), 1)
        self.assertEqual(report["errors"][0]["row"], 3)

        self.assertTrue(Product.objects.filter(slug="sam-a56").exists())
        self.assertFalse(Product.objects.filter(slug="sam-a36").exists())
        self.assertTrue(ProductVariant.objects.filter(sku="SAM-A56-128-BLK").exists())
        self.assertFalse(ProductVariant.objects.filter(sku="SAM-A36-128-BLK").exists())
        self.assertEqual(InventorySource.objects.count(), 0)
