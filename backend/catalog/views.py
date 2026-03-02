from __future__ import annotations

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasPermissionKey
from audit.services import log_action
from catalog.models import Attribute, Brand, Category, Product, ProductVariant
from catalog.serializers import (
    AttributeSerializer,
    BrandSerializer,
    CategorySerializer,
    ProductListItemSerializer,
    ProductSerializer,
    SellerProductSerializer,
    SellerVariantSerializer,
)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"

    def get_queryset(self):
        return Brand.objects.filter(is_active=True)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"

    def get_queryset(self):
        return Category.objects.filter(is_active=True)


class AttributeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttributeSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"

    def get_queryset(self):
        return Attribute.objects.filter(is_filterable=True).order_by("sort_order", "label")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related("brand", "category")

        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q)
                | Q(short_description__icontains=q)
                | Q(brand__name__icontains=q)
                | Q(category__name__icontains=q)
            )

        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        brand_slug = self.request.query_params.get("brand")
        if brand_slug:
            queryset = queryset.filter(brand__slug=brand_slug)

        price_min = self.request.query_params.get("price_min")
        if price_min:
            queryset = queryset.filter(variants__price_amount__gte=int(price_min))

        price_max = self.request.query_params.get("price_max")
        if price_max:
            queryset = queryset.filter(variants__price_amount__lte=int(price_max))

        attrs = self.request.query_params.get("attrs")
        if attrs:
            for pair in attrs.split(","):
                if ":" not in pair:
                    continue
                key, value = pair.split(":", 1)
                queryset = queryset.filter(
                    variants__attribute_values__attribute_key=key,
                    variants__attribute_values__value=value,
                )

        availability = self.request.query_params.get("availability")
        if availability == "IN_STOCK":
            queryset = queryset.filter(
                variants__inventory_items__source__type="INTERNAL",
                variants__inventory_items__qty_on_hand__gt=0,
            )
        elif availability == "AVAILABLE_SOON":
            queryset = queryset.exclude(
                variants__inventory_items__source__type="INTERNAL",
                variants__inventory_items__qty_on_hand__gt=0,
            ).filter(
                variants__inventory_items__source__type__in=["PARTNER", "CONSIGNMENT"],
                variants__inventory_items__qty_on_hand__gt=0,
            )
        elif availability == "OUT_OF_STOCK":
            queryset = queryset.exclude(variants__inventory_items__qty_on_hand__gt=0)

        sort_key = self.request.query_params.get("sort")
        if sort_key == "price_asc":
            queryset = queryset.order_by("variants__price_amount")
        elif sort_key == "price_desc":
            queryset = queryset.order_by("-variants__price_amount")
        elif sort_key == "promo":
            queryset = queryset.order_by("variants__promo_price_amount", "variants__price_amount")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListItemSerializer
        return ProductSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get("page_size", 24))
        except ValueError:
            page_size = 24
        page_size = min(max(page_size, 1), 100)

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        items_qs = queryset[start : start + page_size]

        serializer = self.get_serializer(items_qs, many=True)
        return Response(
            {
                "meta": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                },
                "items": serializer.data,
            }
        )


class SearchSuggestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"products": [], "brands": [], "categories": []})

        products = list(
            Product.objects.filter(is_active=True, name__icontains=q).values("name", "slug")[:6]
        )
        brands = list(Brand.objects.filter(is_active=True, name__icontains=q).values("name", "slug")[:6])
        categories = list(
            Category.objects.filter(is_active=True, name__icontains=q).values("name", "slug")[:6]
        )
        return Response({"products": products, "brands": brands, "categories": categories})


class SellerProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("brand", "category").all()
    serializer_class = SellerProductSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "catalog.read"
        return "catalog.write"

    def perform_create(self, serializer):
        product = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="create",
            resource="product",
            resource_id=str(product.id),
            after=SellerProductSerializer(product).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def perform_update(self, serializer):
        before = SellerProductSerializer(self.get_object()).data
        product = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="update",
            resource="product",
            resource_id=str(product.id),
            before=before,
            after=SellerProductSerializer(product).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        before = SellerProductSerializer(instance).data
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        log_action(
            actor_user=request.user,
            action="soft_delete",
            resource="product",
            resource_id=str(instance.id),
            before=before,
            after={"is_active": False},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(status=204)


class SellerVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related("product").all()
    serializer_class = SellerVariantSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "catalog.read"
        return "catalog.write"

    def perform_create(self, serializer):
        variant = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="create",
            resource="variant",
            resource_id=str(variant.id),
            after=SellerVariantSerializer(variant).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def perform_update(self, serializer):
        before = SellerVariantSerializer(self.get_object()).data
        variant = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="update",
            resource="variant",
            resource_id=str(variant.id),
            before=before,
            after=SellerVariantSerializer(variant).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        before = SellerVariantSerializer(instance).data
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        log_action(
            actor_user=request.user,
            action="soft_delete",
            resource="variant",
            resource_id=str(instance.id),
            before=before,
            after={"is_active": False},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(status=204)
