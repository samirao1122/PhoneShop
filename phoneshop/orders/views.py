from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem, Order, OrderItem, Wishlist
from .serializers import (
    CartSerializer, CartItemSerializer,
    OrderSerializer, CreateOrderSerializer,
    WishlistSerializer
)


class CartViewSet(viewsets.ViewSet):
    """
    Cart management for the logged-in user
    - GET /api/cart/          — view cart
    - POST /api/cart/add/     — add item
    - PUT /api/cart/update/   — update quantity
    - DELETE /api/cart/remove/— remove item
    - DELETE /api/cart/clear/ — clear entire cart
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add(self, request):
        """POST /api/cart/add/ — body: {phone: id, quantity: int}"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        data = request.data.copy()
        data['cart'] = cart.id
        serializer = CartItemSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            phone = serializer.validated_data['phone']
            quantity = serializer.validated_data['quantity']
            cart_item, created = CartItem.objects.get_or_create(cart=cart, phone=phone)
            if not created:
                new_qty = cart_item.quantity + quantity
                if new_qty > phone.stock:
                    return Response({'error': f'Only {phone.stock} units available'}, status=400)
                cart_item.quantity = new_qty
                cart_item.save()
            else:
                cart_item.quantity = quantity
                cart_item.save()
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['put'])
    def update_item(self, request):
        """PUT /api/cart/update_item/ — body: {phone: id, quantity: int}"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        phone_id = request.data.get('phone')
        quantity = request.data.get('quantity')
        if not phone_id or quantity is None:
            return Response({'error': 'phone and quantity are required'}, status=400)
        try:
            cart_item = CartItem.objects.get(cart=cart, phone_id=phone_id)
            if int(quantity) <= 0:
                cart_item.delete()
                return Response({'message': 'Item removed from cart'})
            if int(quantity) > cart_item.phone.stock:
                return Response({'error': f'Only {cart_item.phone.stock} units available'}, status=400)
            cart_item.quantity = int(quantity)
            cart_item.save()
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found in cart'}, status=404)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """DELETE /api/cart/remove_item/ — body: {phone: id}"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        phone_id = request.data.get('phone')
        if not phone_id:
            return Response({'error': 'phone is required'}, status=400)
        try:
            cart_item = CartItem.objects.get(cart=cart, phone_id=phone_id)
            cart_item.delete()
            cart_serializer = CartSerializer(cart, context={'request': request})
            return Response(cart_serializer.data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found in cart'}, status=404)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """DELETE /api/cart/clear/ — removes all items"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        return Response({'message': 'Cart cleared successfully'})


class OrderViewSet(viewsets.ModelViewSet):
    """
    Order management
    - GET /api/orders/        — list user's orders (admin sees all)
    - POST /api/orders/       — create order from cart
    - GET /api/orders/{id}/   — order detail
    - PATCH /api/orders/{id}/ — update status (admin only)
    - DELETE /api/orders/{id}/— cancel order
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all().prefetch_related('items')
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def create(self, request):
        """Create order from cart"""
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        cart = get_object_or_404(Cart, user=request.user)
        cart_items = cart.items.select_related('phone').all()

        if not cart_items.exists():
            return Response({'error': 'Your cart is empty'}, status=400)

        # Check stock availability
        for item in cart_items:
            if item.phone.stock < item.quantity:
                return Response({
                    'error': f'Only {item.phone.stock} units of {item.phone} available'
                }, status=400)

        # Calculate totals
        subtotal = sum(item.subtotal for item in cart_items)
        shipping_cost = 200 if subtotal < 5000 else 0  # Free shipping above 5000
        total = subtotal + shipping_cost

        # Create order
        order = Order.objects.create(
            user=request.user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            total_amount=total,
            **serializer.validated_data
        )

        # Create order items and reduce stock
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                phone=item.phone,
                phone_name=str(item.phone),
                quantity=item.quantity,
                unit_price=item.phone.effective_price,
                subtotal=item.subtotal,
            )
            item.phone.stock -= item.quantity
            item.phone.save()

        # Clear cart
        cart_items.delete()

        return Response(OrderSerializer(order).data, status=201)

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        # Only admin can change status
        if 'status' in request.data and not request.user.is_staff:
            return Response({'error': 'Only admin can update order status'}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if order.user != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=403)
        if order.status not in ['pending', 'confirmed']:
            return Response({'error': 'Only pending or confirmed orders can be cancelled'}, status=400)
        order.status = 'cancelled'
        order.save()
        return Response({'message': f'Order #{order.order_number} cancelled successfully'})

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_status(self, request, pk=None):
        """PATCH /api/orders/{id}/update_status/ — admin updates order status"""
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Choose from: {valid_statuses}'}, status=400)
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)


class WishlistViewSet(viewsets.ModelViewSet):
    """
    Wishlist management
    - GET /api/wishlist/        — list wishlist items
    - POST /api/wishlist/       — add phone to wishlist
    - DELETE /api/wishlist/{id}/— remove from wishlist
    """
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('phone', 'phone__brand')

    def create(self, request):
        phone_id = request.data.get('phone')
        if not phone_id:
            return Response({'error': 'phone is required'}, status=400)
        wishlist_item, created = Wishlist.objects.get_or_create(user=request.user, phone_id=phone_id)
        if not created:
            return Response({'message': 'Already in wishlist'}, status=200)
        serializer = WishlistSerializer(wishlist_item, context={'request': request})
        return Response(serializer.data, status=201)
