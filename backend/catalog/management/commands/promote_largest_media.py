from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import Product


class Command(BaseCommand):
    help = (
        "Reordonne les ProductMedia de chaque produit actif: l'image avec la "
        "plus haute resolution (taille fichier en octets) passe en primary "
        "(sort_order=0). Corrige le rendu flou de l'image principale sur les "
        "PDPs lorsque la primary etait une miniature gsmarena 160x212."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="N'ecrit rien, affiche seulement ce qui serait promu.",
        )
        parser.add_argument(
            "--only-slug",
            type=str,
            default="",
            help="Restreindre a un produit (par slug).",
        )
        parser.add_argument(
            "--min-delta-bytes",
            type=int,
            default=512,
            help=(
                "Seuil minimum de delta en octets entre la primary actuelle et "
                "le candidat pour declencher une promotion. Evite les bascules "
                "inutiles entre deux images de poids quasi identique."
            ),
        )

    @staticmethod
    def _seed_path(url: str) -> Path | None:
        marker = "/media/seed/"
        if marker not in url:
            return None
        rel = url.split(marker, 1)[1].strip("/")
        if not rel:
            return None
        return Path(settings.MEDIA_ROOT) / "seed" / rel

    def handle(self, *args, **options):
        dry_run = bool(options["dry_run"])
        only_slug = (options.get("only_slug") or "").strip()
        min_delta = int(options.get("min_delta_bytes") or 0)

        products = Product.objects.filter(is_active=True).select_related("brand", "category")
        if only_slug:
            products = products.filter(slug=only_slug)

        promoted = 0
        skipped_single = 0
        skipped_optimal = 0
        skipped_below_threshold = 0
        scanned = 0

        for product in products.order_by("category__slug", "slug"):
            scanned += 1
            links = list(
                product.media_links.select_related("media_asset").order_by("sort_order", "created_at")
            )
            if len(links) < 2:
                skipped_single += 1
                continue

            sizes: list[tuple[int, object]] = []
            for link in links:
                url = link.media_asset.url or ""
                path = self._seed_path(url)
                size = path.stat().st_size if (path and path.exists()) else 0
                sizes.append((size, link))

            sizes.sort(key=lambda item: (-item[0],))

            current_primary_size = next(
                (size for size, link in [(s, l) for s, l in sizes] if l == links[0]), 0
            )
            top_size, top_link = sizes[0]

            if top_link == links[0]:
                skipped_optimal += 1
                continue

            if top_size - current_primary_size < min_delta:
                skipped_below_threshold += 1
                continue

            old_name = links[0].media_asset.url.rsplit("/", 1)[-1]
            new_name = top_link.media_asset.url.rsplit("/", 1)[-1]
            self.stdout.write(
                f"  {product.slug} : {old_name} ({current_primary_size}b) -> {new_name} ({top_size}b)"
            )

            if not dry_run:
                for new_order, (_size, link) in enumerate(sizes):
                    if link.sort_order != new_order:
                        link.sort_order = new_order
                        link.save(update_fields=["sort_order", "updated_at"])

            promoted += 1

        verb = "Simul" if dry_run else "Promot"
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n{verb}ions ProductMedia primary"))
        self.stdout.write(f"  Produits scannes      : {scanned}")
        self.stdout.write(f"  Produits {'simul' if dry_run else 'promu'}{'es' if dry_run else 's'}     : {promoted}")
        self.stdout.write(f"  Image unique          : {skipped_single}")
        self.stdout.write(f"  Deja optimal          : {skipped_optimal}")
        self.stdout.write(f"  Sous le seuil         : {skipped_below_threshold}")
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry-run: aucune ecriture en base."))
        else:
            self.stdout.write(self.style.SUCCESS("\nOK."))
