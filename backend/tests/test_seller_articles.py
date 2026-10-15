"""Couverture de la surface « articles » et des photos du studio boutique."""

import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import Permission, Role
from catalog.models import (
    Brand,
    Category,
    MediaAsset,
    Product,
    ProductVariant,
    VariantAttributeValue,
)
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

    # --- Couleurs et capacites disponibles -------------------------------- #

    def test_article_keeps_the_colors_and_capacities_chosen_by_the_manager(self):
        """Les caracteristiques cochees au studio doivent revenir telles quelles."""
        response = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(couleurs=["Noir", "Bleu"], capacites=["128 Go", "256 Go"]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertEqual(body["couleurs"], ["Noir", "Bleu"])
        self.assertEqual(body["capacites"], ["128 Go", "256 Go"])

        product = Product.objects.get(id=body["id"])
        self.assertEqual(product.options, {"couleurs": ["Noir", "Bleu"], "capacites": ["128 Go", "256 Go"]})

    def test_colors_and_capacities_are_normalised_and_deduplicated(self):
        """« 256GB » et « 256 Go » designent la meme capacite: une seule doit rester."""
        response = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(couleurs=["noir", "Noir"], capacites=["256GB", "256 Go", "1TB"]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertEqual(body["couleurs"], ["Noir"])
        self.assertEqual(body["capacites"], ["256 Go", "1 To"])

    def test_unknown_color_is_refused_with_a_readable_message(self):
        response = self.client.post(
            "/api/v1/seller/articles/", self.payload(couleurs=["Fuchsia"]), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Fuchsia", response.json()["detail"])

    def test_capacities_can_be_changed_without_touching_the_colors(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(couleurs=["Noir"], capacites=["128 Go"]),
            format="json",
        ).json()

        updated = self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/", {"capacites": ["256 Go"]}, format="json"
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["couleurs"], ["Noir"])
        self.assertEqual(updated.json()["capacites"], ["256 Go"])

    def test_imported_product_inherits_its_versions_from_the_variants(self):
        """Un produit importe n'a pas d'options enregistrees: on lit ses declinaisons."""
        product = Product.objects.create(
            name="iPhone importe", slug="iphone-importe", brand=self.brand, category=self.category
        )
        variant = ProductVariant.objects.create(product=product, sku="IMPORTE-1", price_amount=500000)
        VariantAttributeValue.objects.create(variant=variant, attribute_key="color", value="Noir", label="Noir")
        VariantAttributeValue.objects.create(variant=variant, attribute_key="storage", value="256GB", label="256GB")

        body = self.client.get(f"/api/v1/seller/articles/{product.id}/").json()
        self.assertEqual(body["couleurs"], ["Noir"])
        self.assertEqual(body["capacites"], ["256 Go"])

    def test_options_referential_is_served_to_the_studio(self):
        response = self.client.get("/api/v1/seller/articles/options/")
        self.assertEqual(response.status_code, 200)

        body = response.json()
        self.assertIn("1 To", body["capacites"])
        noms = [couleur["valeur"] for couleur in body["couleurs"]]
        self.assertIn("Noir", noms)
        self.assertTrue(all(couleur["code"].startswith("#") for couleur in body["couleurs"]))

    def test_public_product_page_exposes_the_available_versions(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(couleurs=["Noir", "Or"], capacites=["128 Go"]),
            format="json",
        ).json()

        public = APIClient().get(f"/api/v1/products/{created['adresse_web']}/")
        self.assertEqual(public.status_code, 200, public.content)

        body = public.json()
        self.assertEqual(body["capacites_disponibles"], ["128 Go"])
        self.assertEqual(
            body["couleurs_disponibles"],
            [{"nom": "Noir", "code": "#111827"}, {"nom": "Or", "code": "#D4AF6A"}],
        )

    # --- Prix par capacite (un 512 Go ne vaut pas un 128 Go) ---------------

    def grille(self, *lignes):
        return [{"capacite": c, "prix": p, "prix_promo": promo} for c, p, promo in lignes]

    def test_each_capacity_becomes_a_sellable_version_with_its_own_price(self):
        """Le coeur de la fonctionnalite: trois capacites = trois prix vendables."""
        response = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(
                prix=185000,
                quantite=3,
                capacites_prix=self.grille(
                    ("256 Go", 215000, 199000),
                    ("128 Go", 185000, None),
                    ("512 Go", 265000, None),
                ),
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()

        # Trie du plus petit au plus grand stockage, quel que soit l'ordre saisi.
        self.assertEqual([ligne["capacite"] for ligne in body["capacites_prix"]], ["128 Go", "256 Go", "512 Go"])
        self.assertEqual([ligne["prix"] for ligne in body["capacites_prix"]], [185000, 215000, 265000])
        self.assertEqual(body["capacites"], ["128 Go", "256 Go", "512 Go"])
        self.assertTrue(body["prix_variable"])
        self.assertEqual(body["prix"], 185000)  # « a partir de »

        product = Product.objects.get(pk=body["id"])
        variantes = list(product.variants.filter(is_active=True))
        self.assertEqual(len(variantes), 3)
        for variant in variantes:
            capacite = variant.attribute_values.get(attribute_key="storage").value
            self.assertIn(capacite, {"128 Go", "256 Go", "512 Go"})
            # Chaque version doit etre immediatement vendable, stock global recopie.
            item = InventoryItem.objects.get(variant=variant)
            self.assertEqual(item.qty_on_hand, 3)
            self.assertEqual(variant.availability_info()["status"], "IN_STOCK")

    def test_shoppers_see_one_price_per_capacity_on_the_public_page(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))),
            format="json",
        ).json()

        body = APIClient().get(f"/api/v1/products/{created['adresse_web']}/").json()
        versions = {
            variant["attributes"][0]["label"]: variant["price_amount"]
            for variant in body["variants"]
            if variant["attributes"]
        }
        self.assertEqual(versions, {"128 Go": 185000, "256 Go": 215000})

        liste = APIClient().get("/api/v1/products/", {"q": "Galaxy A56"}).json()
        vignette = next(item for item in liste["items"] if item["slug"] == created["adresse_web"])
        self.assertTrue(vignette["has_price_range"])
        self.assertEqual(vignette["min_price"], 185000)

    def test_capacity_prices_are_normalised_whatever_the_spelling(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("256GB", 215000, None), ("1tb", 420000, None))),
            format="json",
        ).json()
        self.assertEqual([ligne["capacite"] for ligne in created["capacites_prix"]], ["256 Go", "1 To"])

    def test_a_capacity_without_a_price_is_refused_with_a_readable_message(self):
        response = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=[{"capacite": "256 Go", "prix": 0}]),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Traceback", str(response.content))

    def test_promo_above_the_capacity_price_is_refused(self):
        response = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("256 Go", 200000, 250000))),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("256 Go", response.json()["detail"])

    def test_changing_the_grid_keeps_the_order_history_of_a_removed_capacity(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))),
            format="json",
        ).json()
        product = Product.objects.get(pk=created["id"])
        retiree = product.variants.get(attribute_values__value="256 Go")

        updated = self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/",
            {"capacites_prix": self.grille(("128 Go", 179000, None))},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["capacites_prix"], [{"capacite": "128 Go", "prix": 179000, "prix_promo": None}])
        self.assertFalse(updated.json()["prix_variable"])

        retiree.refresh_from_db()
        self.assertFalse(retiree.is_active)  # desactivee, jamais supprimee
        self.assertTrue(ProductVariant.objects.filter(pk=retiree.pk).exists())

    def test_adding_a_grid_reuses_the_existing_version_of_the_article(self):
        """Mettre un article simple en grille ne doit pas orpheliner sa declinaison."""
        created = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()
        product = Product.objects.get(pk=created["id"])
        origine = product.variants.get()

        self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/",
            {"capacites_prix": self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))},
            format="json",
        )
        origine.refresh_from_db()
        self.assertTrue(origine.is_active)
        self.assertEqual(origine.attribute_values.get(attribute_key="storage").value, "128 Go")
        self.assertEqual(product.variants.filter(is_active=True).count(), 2)

    def test_taking_the_article_offline_hides_every_capacity(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))),
            format="json",
        ).json()

        self.client.patch(f"/api/v1/seller/articles/{created['id']}/", {"en_ligne": False}, format="json")
        product = Product.objects.get(pk=created["id"])
        self.assertEqual(product.variants.filter(is_active=True).count(), 0)

        # La grille est memorisee: elle revient intacte a la remise en ligne.
        back = self.client.patch(f"/api/v1/seller/articles/{created['id']}/", {"en_ligne": True}, format="json")
        self.assertEqual(back.status_code, 200, back.content)
        self.assertEqual([ligne["prix"] for ligne in back.json()["capacites_prix"]], [185000, 215000])
        self.assertEqual(product.variants.filter(is_active=True).count(), 2)

    def test_stock_entered_once_applies_to_every_capacity(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(quantite=2, capacites_prix=self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))),
            format="json",
        ).json()

        updated = self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/", {"quantite": 7}, format="json"
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["quantite"], 7)
        quantites = {
            item.qty_on_hand
            for item in InventoryItem.objects.filter(variant__product_id=created["id"])
        }
        self.assertEqual(quantites, {7})

    def test_imported_product_grid_is_readable_and_editable(self):
        """Les 150 produits importes ont deja des prix par capacite: on les reprend."""
        product = Product.objects.create(
            name="Galaxy S24", slug="galaxy-s24", brand=self.brand, category=self.category
        )
        source = InventorySource.objects.get(type=InventorySource.INTERNAL)
        for sku, valeur, prix in (("S24-256", "256GB", 520000), ("S24-512", "512GB", 610000)):
            variant = ProductVariant.objects.create(product=product, sku=sku, price_amount=prix)
            VariantAttributeValue.objects.create(
                variant=variant, attribute_key="storage", value=valeur, label=valeur
            )
            InventoryItem.objects.create(variant=variant, source=source, qty_on_hand=2)

        body = self.client.get(f"/api/v1/seller/articles/{product.id}/").json()
        self.assertEqual(
            body["capacites_prix"],
            [
                {"capacite": "256 Go", "prix": 520000, "prix_promo": None},
                {"capacite": "512 Go", "prix": 610000, "prix_promo": None},
            ],
        )

        updated = self.client.patch(
            f"/api/v1/seller/articles/{product.id}/",
            {"capacites_prix": self.grille(("256 Go", 499000, None), ("512 Go", 610000, None))},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["capacites_prix"][0]["prix"], 499000)

        # L'ecriture d'origine est conservee, seul le libelle affiche est harmonise.
        attribut = VariantAttributeValue.objects.get(variant__sku="S24-256", attribute_key="storage")
        self.assertEqual(attribut.value, "256GB")
        self.assertEqual(attribut.label, "256 Go")

    def test_removing_every_capacity_goes_back_to_a_single_price(self):
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(capacites_prix=self.grille(("128 Go", 185000, None), ("256 Go", 215000, None))),
            format="json",
        ).json()

        updated = self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/",
            {"capacites_prix": [], "prix": 190000, "quantite": 5},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        body = updated.json()
        self.assertEqual(body["capacites_prix"], [])
        self.assertEqual(body["prix"], 190000)
        self.assertEqual(body["quantite"], 5)

        product = Product.objects.get(pk=created["id"])
        self.assertEqual(product.variants.filter(is_active=True).count(), 1)
        self.assertEqual(product.variants.get(is_active=True).availability_info()["status"], "IN_STOCK")

    def test_an_empty_grid_does_not_disturb_an_article_without_capacities(self):
        created = self.client.post("/api/v1/seller/articles/", self.payload(), format="json").json()
        updated = self.client.patch(
            f"/api/v1/seller/articles/{created['id']}/",
            {"capacites_prix": [], "prix": 170000, "quantite": 9},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["prix"], 170000)
        self.assertEqual(updated.json()["quantite"], 9)

    def test_the_listing_price_is_the_cheapest_version_a_customer_can_pay(self):
        """Le prix barre et le prix affiche doivent venir de la MEME version."""
        created = self.client.post(
            "/api/v1/seller/articles/",
            self.payload(
                nom="Galaxy S25 Ultra",
                capacites_prix=self.grille(("256 Go", 850000, None), ("512 Go", 995000, 949000)),
            ),
            format="json",
        ).json()

        liste = APIClient().get("/api/v1/products/", {"q": "S25 Ultra"}).json()
        vignette = next(item for item in liste["items"] if item["slug"] == created["adresse_web"])
        self.assertEqual(vignette["min_price"], 850000)
        # 949 000 est la promo du 512 Go: l'afficher ici annoncerait un prix inexistant.
        self.assertIsNone(vignette["min_promo_price"])
        self.assertTrue(vignette["has_price_range"])
