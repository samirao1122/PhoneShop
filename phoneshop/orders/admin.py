from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem, Wishlist


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_items', 'total_price', 'updated_at']
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['phone_name', 'unit_price', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'total_amount', 'payment_method', 'is_paid', 'created_at']
    list_filter = ['status', 'payment_method', 'is_paid']
    search_fields = ['order_number', 'user__username', 'full_name', 'email']
    list_editable = ['status', 'is_paid']
    inlines = [OrderItemInline]
    readonly_fields = ['order_number', 'subtotal', 'total_amount']


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'added_at']
