from __future__ import annotations

from rest_framework import permissions, viewsets

from accounts.permissions import HasPermissionKey
from audit.services import log_action
from promotions.models import Bundle, Coupon, Deal
from promotions.serializers import BundleSerializer, CouponSerializer, DealSerializer


class BaseSellerPromotionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "promotions.read"
        return "promotions.write"

    def _log(self, *, action: str, resource: str, resource_id: str, before=None, after=None):
        log_action(
            actor_user=self.request.user,
            action=action,
            resource=resource,
            resource_id=resource_id,
            before=before,
            after=after,
            request_id=getattr(self.request, "request_id", ""),
        )


class SellerDealViewSet(BaseSellerPromotionViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer

    def perform_create(self, serializer):
        deal = serializer.save()
        self._log(action="create", resource="deal", resource_id=str(deal.id), after=DealSerializer(deal).data)

    def perform_update(self, serializer):
        before = DealSerializer(self.get_object()).data
        deal = serializer.save()
        self._log(
            action="update",
            resource="deal",
            resource_id=str(deal.id),
            before=before,
            after=DealSerializer(deal).data,
        )


class SellerCouponViewSet(BaseSellerPromotionViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def perform_create(self, serializer):
        coupon = serializer.save()
        self._log(
            action="create",
            resource="coupon",
            resource_id=str(coupon.id),
            after=CouponSerializer(coupon).data,
        )

    def perform_update(self, serializer):
        before = CouponSerializer(self.get_object()).data
        coupon = serializer.save()
        self._log(
            action="update",
            resource="coupon",
            resource_id=str(coupon.id),
            before=before,
            after=CouponSerializer(coupon).data,
        )


class SellerBundleViewSet(BaseSellerPromotionViewSet):
    queryset = Bundle.objects.prefetch_related("bundle_items").all()
    serializer_class = BundleSerializer

    def perform_create(self, serializer):
        bundle = serializer.save()
        self._log(
            action="create",
            resource="bundle",
            resource_id=str(bundle.id),
            after=BundleSerializer(bundle).data,
        )

    def perform_update(self, serializer):
        before = BundleSerializer(self.get_object()).data
        bundle = serializer.save()
        self._log(
            action="update",
            resource="bundle",
            resource_id=str(bundle.id),
            before=before,
            after=BundleSerializer(bundle).data,
        )
