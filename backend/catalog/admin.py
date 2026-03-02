from django.contrib import admin

from catalog.models import (
    Attribute,
    AttributeValue,
    Brand,
    Category,
    MediaAsset,
    Product,
    ProductMedia,
    ProductVariant,
    VariantAttributeValue,
    VariantMedia,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "sort_order", "is_active")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ("key", "label", "type", "is_filterable", "sort_order")
    search_fields = ("key", "label")
    list_filter = ("type", "is_filterable")


@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ("attribute", "value", "label", "sort_order")
    search_fields = ("attribute__key", "value", "label")


class VariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "brand", "category", "is_active", "is_featured")
    search_fields = ("name", "slug", "brand__name", "category__name")
    list_filter = ("is_active", "is_featured", "brand", "category")
    inlines = [VariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "price_amount", "promo_price_amount", "is_active")
    search_fields = ("sku", "product__name")
    list_filter = ("is_active",)


@admin.register(VariantAttributeValue)
class VariantAttributeValueAdmin(admin.ModelAdmin):
    list_display = ("variant", "attribute_key", "value", "label")
    search_fields = ("variant__sku", "attribute_key", "value")


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "url", "sort_order", "created_at")
    list_filter = ("kind",)


@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
    list_display = ("product", "media_asset", "sort_order")


@admin.register(VariantMedia)
class VariantMediaAdmin(admin.ModelAdmin):
    list_display = ("variant", "media_asset", "sort_order")
