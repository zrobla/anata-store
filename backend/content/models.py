from django.db import models

from common.models import BaseUUIDModel


class ContentPage(BaseUUIDModel):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    body_html = models.TextField()
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["slug"]


class BlogPost(BaseUUIDModel):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    excerpt = models.TextField(blank=True)
    body_html = models.TextField()
    cover_image_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class HomeSection(BaseUUIDModel):
    HERO = "HERO"
    BRANDS = "BRANDS"
    DEALS = "DEALS"
    BEST_SELLERS = "BEST_SELLERS"
    NEW_ARRIVALS = "NEW_ARRIVALS"
    CATEGORY_GRID = "CATEGORY_GRID"
    BANNER = "BANNER"
    CUSTOM = "CUSTOM"

    TYPE_CHOICES = [
        (HERO, "Hero"),
        (BRANDS, "Brands"),
        (DEALS, "Deals"),
        (BEST_SELLERS, "Best Sellers"),
        (NEW_ARRIVALS, "New Arrivals"),
        (CATEGORY_GRID, "Category Grid"),
        (BANNER, "Banner"),
        (CUSTOM, "Custom"),
    ]

    key = models.CharField(max_length=120, unique=True)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    payload_json = models.JSONField(default=dict)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "key"]
