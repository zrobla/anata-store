from __future__ import annotations

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasPermissionKey
from audit.services import log_action
from inventory.services import StockConflictError
from orders.models import CODCollection, CartItem, DeliveryZone, Order
from orders.serializers import (
    CODCollectionCreateSerializer,
    CartItemCreateSerializer,
    CartItemUpdateSerializer,
    CartSerializer,
    CheckoutCODRequestSerializer,
    DeliveryZoneSerializer,
    OrderSerializer,
    SellerOrderStatusSerializer,
)
from orders.services import add_item_to_cart, checkout_cod, get_or_create_cart


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _cart_session_key(request) -> str | None:
    return request.headers.get("X-Cart-Session") or request.query_params.get("cart_session")


class CartView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"

    def get(self, request):
        cart = get_or_create_cart(user=request.user, session_key=_cart_session_key(request))
        session_key = cart.session_key or str(cart.id)
        payload = CartSerializer(cart).data
        payload["session"] = session_key
        response = Response(payload)
        response["X-Cart-Session"] = session_key
        return response

    def post(self, request):
        serializer = CartItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_or_create_cart(user=request.user, session_key=_cart_session_key(request))
        add_item_to_cart(
            cart=cart,
            variant_id=serializer.validated_data["variant_id"],
            qty=serializer.validated_data["qty"],
        )
        session_key = cart.session_key or str(cart.id)
        payload = CartSerializer(cart).data
        payload["session"] = session_key
        response = Response(payload)
        response["X-Cart-Session"] = session_key
        return response


class CartItemUpdateView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, item_id):
        serializer = CartItemUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(user=request.user, session_key=_cart_session_key(request))
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.qty = serializer.validated_data["qty"]
        item.save(update_fields=["qty", "updated_at"])
        session_key = cart.session_key or str(cart.id)
        payload = CartSerializer(cart).data
        payload["session"] = session_key
        response = Response(payload)
        response["X-Cart-Session"] = session_key
        return response

    def delete(self, request, item_id):
        cart = get_or_create_cart(user=request.user, session_key=_cart_session_key(request))
        item = get_object_or_404(CartItem, id=item_id, cart=cart)
        item.delete()
        session_key = cart.session_key or str(cart.id)
        payload = CartSerializer(cart).data
        payload["session"] = session_key
        response = Response(payload)
        response["X-Cart-Session"] = session_key
        return response


class DeliveryZoneViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeliveryZone.objects.filter(is_active=True)
    serializer_class = DeliveryZoneSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "catalog"


class CheckoutCODView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "checkout"

    def post(self, request):
        serializer = CheckoutCODRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(user=request.user, session_key=_cart_session_key(request))

        try:
            result = checkout_cod(
                cart=cart,
                address=serializer.validated_data["address"],
                delivery_zone_id=serializer.validated_data["delivery_zone_id"],
                customer_user=request.user,
            )
        except StockConflictError as exc:
            return Response(
                {"code": "STOCK_CONFLICT", "message": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "order": OrderSerializer(result.order).data,
                "order_id": str(result.order.id),
                "order_number": result.order.order_number,
                "status": result.order.status,
            },
            status=status.HTTP_201_CREATED,
        )


class MeOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(customer_user=request.user).prefetch_related("items")
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get("page_size", 24))
        except ValueError:
            page_size = 24
        page_size = min(max(page_size, 1), 100)

        total = orders.count()
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        paged_orders = orders[start : start + page_size]
        return Response(
            {
                "meta": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                },
                "items": OrderSerializer(paged_orders, many=True).data,
            }
        )


class MeOrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order.objects.prefetch_related("items"), id=order_id)
        if order.customer_user_id != request.user.id:
            raise PermissionDenied("Order does not belong to current user")
        return Response(OrderSerializer(order).data)


class SellerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.prefetch_related("items").all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    required_permission = "orders.read"


class SellerOrderStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    required_permission = "orders.status"

    def patch(self, request, order_id):
        serializer = SellerOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(Order, id=order_id)
        before = {"status": order.status}
        order.status = serializer.validated_data["status"]
        order.save(update_fields=["status", "updated_at"])

        log_action(
            actor_user=request.user,
            action="update_status",
            resource="order",
            resource_id=str(order.id),
            before=before,
            after={"status": order.status},
            request_id=getattr(request, "request_id", ""),
            ip_address=_client_ip(request),
        )

        return Response({"id": str(order.id), "status": order.status})


class SellerCODCollectionCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    required_permission = "cod.write"

    def post(self, request):
        serializer = CODCollectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record = serializer.save(recorded_by=request.user)
        log_action(
            actor_user=request.user,
            action="create",
            resource="cod_collection",
            resource_id=str(record.id),
            after=CODCollectionCreateSerializer(record).data,
            request_id=getattr(request, "request_id", ""),
            ip_address=_client_ip(request),
        )
        return Response(CODCollectionCreateSerializer(record).data, status=status.HTTP_201_CREATED)


class SellerCODReconciliationView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    required_permission = "cod.reconcile"

    def get(self, request):
        start = request.query_params.get("from")
        end = request.query_params.get("to")

        queryset = CODCollection.objects.all()
        if start:
            queryset = queryset.filter(collected_at__date__gte=start)
        if end:
            queryset = queryset.filter(collected_at__date__lte=end)

        summary = queryset.values("collected_by").annotate(total_amount=Sum("amount")).order_by("collected_by")
        grand_total = queryset.aggregate(total=Sum("amount"))["total"] or 0

        return Response(
            {
                "from": start,
                "to": end,
                "generated_at": timezone.now(),
                "grand_total": grand_total,
                "by_collector": list(summary),
            }
        )
