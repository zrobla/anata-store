"""Couverture de la surface « articles » et des photos du studio boutique."""

import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import Permission, Role
from catalog.models import Brand, Category, MediaAsset, Product, ProductVariant
from inventory.models import InventoryItem, InventorySource

User = get_user_model()

MEDIA_TEST_ROOT = tempfile.mkdtemp(prefix="anata-test-media-")


def photo_file(name="photo.jpg", size=(2400, 1800), fmt="JPEG"):
    buffer = io.BytesIO()
    Image.new("RGB", size, (30, 90, 180)).save(buffer, format=fmt)
    buffer.seek(0)
    buffer.name = name
    return buffer


@override_settings(MEDIA_ROOT=MEDIA_TEST_ROOT)
class SellerArticleTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_TEST_ROOT, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Samsung", slug="samsung")
        self.category = Category.objects.create(name="Smartphones", slug="smartphones")
        InventorySource.objects.create(name="Boutique", type=InventorySource.INTERNAL)

        user = User.objects.create_user(email="gerant@anatastore.ci", username="gerant", password="strong-pass-123")
        role = Role.objects.create(key="STORE_MANAGER", name="Gerant")
        for key in ("catalog.read", "catalog.write"):
            role.permissions.add(Permission.objects.create(key=key, description=key))
        user.roles.add(role)
        self.user = user
        self.client.force_authenticate(user=user)

    def payload(self, **overrides):
        data = {
            "nom": "Galaxy A56",
            "marque": str(self.brand.id),
            "categorie": str(self.category.id),
            "prix": 185000,
            "quantite": 4,
        }
        data.update(overrides)
        return data

    def test_created_article_is_immediately_sellable(self):
        """L'invariant central: un article cree depuis le studio n'apparait jamais « epuise »."""
        response = self.client.post("/api/v1/seller/articles/", self.payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertEqual(body["disponibilite"], "EN_VENTE")
        self.assertEqual(body["quantite"], 4)

        product = Product.objects.get(id=body["id"])
        self.assertTrue(product.slug, "Le slug doit etre genere automatiquement")
        variant = product.variants.get()
        self.assertTrue(variant.sku, "Le SKU doit etre genere automatiquement")
        self.assertEqual(variant.availability_info()["status"], "IN_STOCK")
        self.assertTrue(InventoryItem.objects.filter(variant=variant).exists())

    def test_slug_stays_unique_for_duplicate_names(self):
        first = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()
        second = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        slugs = {Product.objects.get(id=first["id"]).slug, Product.objects.get(id=second["id"]).slug}
        self.assertEqual(len(slugs), 2)

    def test_partial_update_touches_price_and_stock_together(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        response = self.client.patch(
            f"/api/v1/seller/articles/{article['id']}/",
            {"prix": 175000, "prix_promo": 160000, "quantite": 1, "seuil_alerte": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertEqual(body["prix"], 175000)
        self.assertEqual(body["prix_promo"], 160000)
        self.assertEqual(body["disponibilite"], "STOCK_BAS")

    def test_promo_price_above_normal_price_is_rejected(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        response = self.client.patch(
            f"/api/v1/seller/articles/{article['id']}/",
            {"prix_promo": 200000},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("promotionnel", response.json()["detail"])

    def test_retiring_an_article_keeps_the_record(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        response = self.client.delete(f"/api/v1/seller/articles/{article['id']}/")
        self.assertEqual(response.status_code, 204)

        product = Product.objects.get(id=article["id"])
        self.assertFalse(product.is_active)
        self.assertFalse(product.variants.filter(is_active=True).exists())

    def test_photo_upload_is_resized_and_becomes_the_public_thumbnail(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        response = self.client.post(
            f"/api/v1/seller/articles/{article['id']}/photos/",
            {"file": photo_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.content)

        photos = response.json()
        self.assertEqual(len(photos), 1)
        self.assertTrue(photos[0]["is_primary"])

        asset = MediaAsset.objects.get()
        with Image.open(asset.image.path) as stored:
            self.assertLessEqual(max(stored.size), 1600, "La photo doit etre redimensionnee")

        public = self.client.get(f"/api/v1/products/{Product.objects.get(id=article['id']).slug}/")
        self.assertEqual(public.status_code, 200)
        self.assertTrue(public.json()["media"][0]["url"].endswith(asset.image.name))

    def test_choosing_another_photo_as_primary_reorders_the_gallery(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()
        url = f"/api/v1/seller/articles/{article['id']}/photos/"
        self.client.post(url, {"file": photo_file("a.jpg")}, format="multipart")
        photos = self.client.post(url, {"file": photo_file("b.jpg")}, format="multipart").json()

        second = next(photo for photo in photos if not photo["is_primary"])
        response = self.client.post(f"{url}{second['id']}/principale/")
        self.assertEqual(response.status_code, 200)

        promoted = next(photo for photo in response.json() if photo["id"] == second["id"])
        self.assertTrue(promoted["is_primary"])

    def test_deleting_a_photo_removes_the_stored_file(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()
        url = f"/api/v1/seller/articles/{article['id']}/photos/"
        photos = self.client.post(url, {"file": photo_file()}, format="multipart").json()

        response = self.client.delete(f"{url}{photos[0]['id']}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_non_image_upload_returns_a_readable_message(self):
        article = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()

        broken = io.BytesIO(b"ceci n'est pas une image")
        broken.name = "facture.pdf"
        response = self.client.post(
            f"/api/v1/seller/articles/{article['id']}/photos/",
            {"file": broken},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("image", response.json()["detail"].lower())

    def test_read_only_account_cannot_modify_articles(self):
        reader = User.objects.create_user(email="lecteur@anatastore.ci", username="lecteur", password="strong-pass-123")
        role = Role.objects.create(key="READER", name="Lecture seule")
        role.permissions.add(Permission.objects.get(key="catalog.read"))
        reader.roles.add(role)

        self.client.force_authenticate(user=reader)
        self.assertEqual(self.client.get("/api/v1/seller/articles/").status_code, 200)
        self.assertEqual(
            self.client.post("/api/v1/seller/articles/", self.payload(), format="json").status_code, 403
        )

    def test_existing_catalog_product_is_readable_as_an_article(self):
        """Les articles importes avant cette interface doivent rester editables."""
        product = Product.objects.create(
            name="Ancien produit", slug="ancien-produit", brand=self.brand, category=self.category
        )
        ProductVariant.objects.create(product=product, sku="ANCIEN-1", price_amount=90000)

        response = self.client.get(f"/api/v1/seller/articles/{product.id}/")
        self.assertEqual(response.status_code, 200)

        body = response.json()
        self.assertEqual(body["prix"], 90000)
        self.assertEqual(body["quantite"], 0)
        self.assertEqual(body["disponibilite"], "EPUISE")

        # Renseigner une quantite doit creer le stock manquant, pas echouer.
        updated = self.client.patch(
            f"/api/v1/seller/articles/{product.id}/", {"quantite": 3}, format="json"
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["disponibilite"], "EN_VENTE")
