from __future__ import annotations

import hashlib
from collections import Counter, defaultdict
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.management.commands.repair_product_media import Command as RepairCommand
from catalog.models import Product


class Command(BaseCommand):
    help = (
        "Audite la qualite des images du catalogue actif: detecte les hashes "
        "blacklistes (BAD_IMAGE_SHA1), les visuels partages entre plusieurs "
        "produits, et les media manquants. Sort en code 1 si une anomalie "
        "est detectee, pour servir de garde-fou CI/dev."
    )

    DUPLICATE_THRESHOLD = 2

    def add_arguments(self, parser):
        parser.add_argument(
            "--fail-on-duplicates",
            action="store_true",
            help="Sort en code 1 meme si seul un partage de hash est detecte (sans BAD_IMAGE_SHA1).",
        )
        parser.add_argument(
            "--quiet",
            action="store_true",
            help="N'affiche que le resume final.",
        )

    @staticmethod
    def _path_from_media_url(url: str) -> Path | None:
        marker = "/media/seed/"
        if marker not in url:
            return None
        rel = url.split(marker, 1)[1].strip("/")
        if not rel:
            return None
        return Path(settings.MEDIA_ROOT) / "seed" / rel

    @staticmethod
    def _sha1_of_file(path: Path) -> str | None:
        if not path.exists() or not path.is_file():
            return None
        return hashlib.sha1(path.read_bytes()).hexdigest()

    def handle(self, *args, **options):
        fail_on_duplicates = bool(options["fail_on_duplicates"])
        quiet = bool(options["quiet"])

        bad_hashes = set(RepairCommand.BAD_IMAGE_SHA1)
        products = (
            Product.objects.filter(is_active=True)
            .select_related("brand", "category")
            .order_by("category__slug", "brand__slug", "slug")
        )

        total = products.count()
        missing: list[str] = []
        external: list[tuple[str, str]] = []
        bad_blacklisted: list[tuple[str, str]] = []
        hash_to_slugs: dict[str, list[str]] = defaultdict(list)
        kind_counter: Counter[str] = Counter()

        for product in products:
            link = (
                product.media_links.select_related("media_asset")
                .order_by("sort_order", "created_at")
                .first()
            )
            if not link:
                missing.append(product.slug)
                continue

            url = link.media_asset.url or ""
            path = self._path_from_media_url(url)
            if not path:
                external.append((product.slug, url))
                continue

            if not path.exists():
                missing.append(product.slug)
                continue

            kind_counter[path.suffix.lower()] += 1
            digest = self._sha1_of_file(path)
            if not digest:
                missing.append(product.slug)
                continue

            hash_to_slugs[digest].append(product.slug)
            if digest in bad_hashes:
                bad_blacklisted.append((product.slug, digest))

        duplicates = {h: slugs for h, slugs in hash_to_slugs.items() if len(slugs) >= self.DUPLICATE_THRESHOLD}

        if not quiet:
            self.stdout.write(self.style.MIGRATE_HEADING("Audit qualite images catalogue"))
            self.stdout.write(f"  Produits actifs analyses: {total}")
            for suffix, count in sorted(kind_counter.items()):
                self.stdout.write(f"  Format {suffix or '(aucun)'}: {count}")
            self.stdout.write(f"  Media manquants: {len(missing)}")
            self.stdout.write(f"  Media externes (hors /media/seed/): {len(external)}")
            self.stdout.write(f"  Hashes partages (>={self.DUPLICATE_THRESHOLD} produits): {len(duplicates)}")
            self.stdout.write(f"  Visuels blacklistes (BAD_IMAGE_SHA1): {len(bad_blacklisted)}")

        if missing:
            self.stdout.write(self.style.WARNING("\nProduits avec media manquant:"))
            for slug in missing:
                self.stdout.write(f"  - {slug}")

        if external and not quiet:
            self.stdout.write(self.style.WARNING("\nProduits avec media externe (non audite):"))
            for slug, url in external:
                self.stdout.write(f"  - {slug} -> {url}")

        if duplicates:
            self.stdout.write(self.style.WARNING("\nGroupes de produits partageant la meme image:"))
            for digest, slugs in sorted(duplicates.items(), key=lambda item: -len(item[1])):
                self.stdout.write(f"  {digest[:10]} ({len(slugs)} produits):")
                for slug in slugs:
                    self.stdout.write(f"    - {slug}")

        if bad_blacklisted:
            self.stdout.write(self.style.ERROR("\nProduits avec un visuel blackliste:"))
            for slug, digest in bad_blacklisted:
                self.stdout.write(f"  - {slug} ({digest[:10]})")

        has_critical = bool(missing or bad_blacklisted)
        has_duplicates = bool(duplicates)
        should_fail = has_critical or (fail_on_duplicates and has_duplicates)

        if should_fail:
            self.stdout.write(self.style.ERROR("\nAudit FAILED."))
            raise SystemExit(1)

        if has_duplicates:
            self.stdout.write(
                self.style.WARNING(
                    "\nAudit OK avec partages de hash (utilise --fail-on-duplicates pour les bloquer)."
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("\nAudit OK: aucune anomalie detectee."))
