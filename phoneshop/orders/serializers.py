from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Wishlist
from products.serializers import PhoneListSerializer


class CartItemSerializer(serializers.ModelSerializer):
    phone_detail = PhoneListSerializer(source='phone', read_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'phone', 'phone_detail', 'quantity', 'subtotal', 'added_at']
        read_only_fields = ['id', 'cart', 'added_at']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value

    def validate(self, data):
        phone = data.get('phone')
        quantity = data.get('quantity', 1)
        if phone and phone.stock < quantity:
            raise serializers.ValidationError(f"Only {phone.stock} units available in stock")
        return data


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price', 'total_items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'phone', 'phone_name', 'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['id', 'phone_name', 'unit_price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_name', 'order_number', 'status', 'payment_method',
            'is_paid', 'full_name', 'email', 'phone_number', 'address', 'city',
            'state', 'postal_code', 'country', 'subtotal', 'shipping_cost',
            'total_amount', 'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'order_number', 'subtotal', 'total_amount', 'created_at', 'updated_at']


class CreateOrderSerializer(serializers.Serializer):
    """Used to create an order from the user's cart"""
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_CHOICES)
    full_name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100, default='Pakistan')
    notes = serializers.CharField(required=False, allow_blank=True)


class WishlistSerializer(serializers.ModelSerializer):
    phone_detail = PhoneListSerializer(source='phone', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'phone', 'phone_detail', 'added_at']
        read_only_fields = ['id', 'user', 'added_at']
