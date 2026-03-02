from __future__ import annotations

from dataclasses import dataclass
import secrets

from django.db import transaction

from catalog.models import ProductVariant
from inventory.services import StockConflictError, reserve_internal_stock
from orders.models import Cart, CartItem, DeliveryZone, Order, OrderItem, StockReservation


class CartNotFoundError(Exception):
    pass


@dataclass
class CheckoutResult:
    order: Order


def get_or_create_cart(*, user, session_key: str | None) -> Cart:
    if user and user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(owner_user=user)
        return cart

    if session_key:
        cart = Cart.objects.filter(session_key=session_key).first()
        if cart:
            return cart
        cart = Cart.objects.filter(id=session_key).first()
        if cart:
            if not cart.session_key:
                cart.session_key = session_key
                cart.save(update_fields=["session_key", "updated_at"])
            return cart
        cart = Cart.objects.create(session_key=session_key)
        return cart

    cart = Cart.objects.create(session_key=secrets.token_urlsafe(24))
    return cart


def add_item_to_cart(*, cart: Cart, variant_id, qty: int) -> CartItem:
    variant = ProductVariant.objects.get(id=variant_id, is_active=True)
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        variant=variant,
        defaults={"qty": qty, "unit_price_amount": variant.active_price_amount},
    )
    if not created:
        cart_item.qty += qty
        cart_item.unit_price_amount = variant.active_price_amount
        cart_item.save(update_fields=["qty", "unit_price_amount", "updated_at"])
    return cart_item


@transaction.atomic
def checkout_cod(*, cart: Cart, address: dict, delivery_zone_id, customer_user=None) -> CheckoutResult:
    zone = DeliveryZone.objects.get(id=delivery_zone_id, is_active=True)
    actor_user = customer_user if getattr(customer_user, "is_authenticated", False) else None
    cart_items = list(
        cart.items.select_related("variant", "variant__product").filter(variant__is_active=True).all()
    )
    if not cart_items:
        raise StockConflictError("Cart is empty")

    order = Order.objects.create(
        order_number=Order.generate_order_number(),
        customer_user=actor_user,
        status=Order.NEW,
        payment_method=Order.COD,
        address_json=address,
        delivery_zone=zone,
    )

    subtotal = 0

    for item in cart_items:
        reserve_internal_stock(variant=item.variant, qty=item.qty, actor_user=actor_user)
        line_total = item.unit_price_amount * item.qty
        subtotal += line_total
        OrderItem.objects.create(
            order=order,
            variant=item.variant,
            product_snapshot_json={
                "name": item.variant.product.name,
                "sku": item.variant.sku,
                "attrs": {
                    a.attribute_key: a.value for a in item.variant.attribute_values.all()
                },
            },
            qty=item.qty,
            unit_price_amount=item.unit_price_amount,
            line_total_amount=line_total,
        )
        StockReservation.objects.create(
            order=order,
            variant=item.variant,
            qty_reserved=item.qty,
            status=StockReservation.COMMITTED,
        )

    order.subtotal_amount = subtotal
    order.delivery_fee_amount = zone.fee_amount
    order.total_amount = subtotal + zone.fee_amount
    order.save(update_fields=["subtotal_amount", "delivery_fee_amount", "total_amount", "updated_at"])

    cart.items.all().delete()
    return CheckoutResult(order=order)
