from django.contrib import admin

from orders.models import CODCollection, Cart, CartItem, DeliveryZone, Order, OrderItem, StockReservation


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "owner_user", "session_key", "currency", "updated_at")
    search_fields = ("session_key", "owner_user__email")
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_user", "status", "payment_method", "total_amount", "created_at")
    search_fields = ("order_number", "customer_user__email")
    list_filter = ("status", "payment_method")
    inlines = [OrderItemInline]


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "fee_amount", "eta_days_min", "eta_days_max", "is_active")


@admin.register(StockReservation)
class StockReservationAdmin(admin.ModelAdmin):
    list_display = ("order", "variant", "qty_reserved", "status", "created_at")
    list_filter = ("status",)


@admin.register(CODCollection)
class CODCollectionAdmin(admin.ModelAdmin):
    list_display = ("order", "amount", "collected_by", "collected_at", "recorded_by")
    search_fields = ("order__order_number", "collected_by")
