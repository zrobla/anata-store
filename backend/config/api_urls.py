from django.urls import include, path
from rest_framework.routers import DefaultRouter

from audit.views import SellerAuditLogViewSet
from catalog.views import (
    AttributeViewSet,
    BrandViewSet,
    CategoryViewSet,
    ProductViewSet,
    SearchSuggestView,
    SellerProductImportExcelView,
    SellerProductImportTemplateView,
    SellerProductViewSet,
    SellerVariantViewSet,
)
from content.views import (
    PublicBlogPostViewSet,
    PublicContentPageViewSet,
    PublicHomeSectionViewSet,
    SellerBlogPostViewSet,
    SellerContentPageViewSet,
    SellerHomeSectionViewSet,
)
from inventory.views import InventoryItemViewSet, InventorySourceViewSet
from orders.views import (
    CartItemUpdateView,
    CartView,
    CheckoutCODView,
    DeliveryZoneViewSet,
    MeOrderDetailView,
    MeOrderListView,
    SellerCODCollectionCreateView,
    SellerCODReconciliationView,
    SellerOrderStatusUpdateView,
    SellerOrderViewSet,
)
from promotions.views import SellerBundleViewSet, SellerCouponViewSet, SellerDealViewSet
from trust.views import QuestionCreateView, ReviewCreateView

router = DefaultRouter()
router.register(r"catalog/brands", BrandViewSet, basename="catalog-brand")
router.register(r"catalog/categories", CategoryViewSet, basename="catalog-category")
router.register(r"catalog/attributes", AttributeViewSet, basename="catalog-attribute")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"content/pages", PublicContentPageViewSet, basename="content-pages")
router.register(r"content/blog", PublicBlogPostViewSet, basename="content-blog")
router.register(r"content/home", PublicHomeSectionViewSet, basename="content-home")
router.register(r"delivery/zones", DeliveryZoneViewSet, basename="delivery-zone")
router.register(r"seller/products", SellerProductViewSet, basename="seller-product")
router.register(r"seller/variants", SellerVariantViewSet, basename="seller-variant")
router.register(r"seller/inventory/sources", InventorySourceViewSet, basename="seller-inventory-source")
router.register(r"seller/inventory/items", InventoryItemViewSet, basename="seller-inventory-item")
router.register(r"seller/deals", SellerDealViewSet, basename="seller-deal")
router.register(r"seller/coupons", SellerCouponViewSet, basename="seller-coupon")
router.register(r"seller/bundles", SellerBundleViewSet, basename="seller-bundle")
router.register(r"seller/orders", SellerOrderViewSet, basename="seller-order")
router.register(r"seller/content/pages", SellerContentPageViewSet, basename="seller-content-page")
router.register(r"seller/content/blog", SellerBlogPostViewSet, basename="seller-content-blog")
router.register(r"seller/content/home", SellerHomeSectionViewSet, basename="seller-content-home")
router.register(r"seller/audit-logs", SellerAuditLogViewSet, basename="seller-audit-logs")

urlpatterns = [
    path("", include(router.urls)),
    path("search/suggest", SearchSuggestView.as_view(), name="search-suggest"),
    path(
        "seller/products/import/template",
        SellerProductImportTemplateView.as_view(),
        name="seller-product-import-template",
    ),
    path(
        "seller/products/import/excel",
        SellerProductImportExcelView.as_view(),
        name="seller-product-import-excel",
    ),
    path("reviews", ReviewCreateView.as_view(), name="review-create"),
    path("questions", QuestionCreateView.as_view(), name="question-create"),
    path("cart", CartView.as_view(), name="cart-detail"),
    path("cart/items", CartView.as_view(), name="cart-add-item"),
    path("cart/items/<uuid:item_id>", CartItemUpdateView.as_view(), name="cart-item-update"),
    path("checkout/cod", CheckoutCODView.as_view(), name="checkout-cod"),
    path("me/orders", MeOrderListView.as_view(), name="me-orders"),
    path("me/orders/<uuid:order_id>", MeOrderDetailView.as_view(), name="me-order-detail"),
    path(
        "seller/orders/<uuid:order_id>/status",
        SellerOrderStatusUpdateView.as_view(),
        name="seller-order-status-update",
    ),
    path("seller/cod/collections", SellerCODCollectionCreateView.as_view(), name="seller-cod-collection"),
    path(
        "seller/cod/reconciliation",
        SellerCODReconciliationView.as_view(),
        name="seller-cod-reconciliation",
    ),
]
