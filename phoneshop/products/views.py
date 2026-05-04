from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Q
from .models import Brand, Category, Phone, PhoneImage, Review
from .serializers import (
    BrandSerializer, CategorySerializer,
    PhoneListSerializer, PhoneDetailSerializer,
    PhoneImageSerializer, ReviewSerializer
)


class BrandViewSet(viewsets.ModelViewSet):
    """
    CRUD for Brands
    - List: GET /api/brands/
    - Create: POST /api/brands/  (admin only)
    - Retrieve: GET /api/brands/{id}/
    - Update: PUT/PATCH /api/brands/{id}/  (admin only)
    - Delete: DELETE /api/brands/{id}/  (admin only)
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return []  # Allow anyone to view brands

    @action(detail=True, methods=['get'])
    def phones(self, request, slug=None):
        """GET /api/brands/{slug}/phones/ — all phones for a brand"""
        brand = self.get_object()
        phones = Phone.objects.filter(brand=brand, is_active=True)
        serializer = PhoneListSerializer(phones, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD for Categories
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return []  # Allow anyone to view categories

    @action(detail=True, methods=['get'])
    def phones(self, request, slug=None):
        """GET /api/categories/{slug}/phones/"""
        category = self.get_object()
        phones = Phone.objects.filter(category=category, is_active=True)
        serializer = PhoneListSerializer(phones, many=True, context={'request': request})
        return Response(serializer.data)


class PhoneViewSet(viewsets.ModelViewSet):
    """
    CRUD for Phones
    - List: GET /api/phones/?search=samsung&brand=1&min_price=100&max_price=500
    - Create: POST /api/phones/ (admin)
    - Retrieve: GET /api/phones/{slug}/
    - Update: PUT/PATCH /api/phones/{slug}/ (admin)
    - Delete: DELETE /api/phones/{slug}/ (admin)
    - Featured: GET /api/phones/featured/
    - Search: GET /api/phones/search/?q=iphone
    """
    queryset = Phone.objects.filter(is_active=True).select_related('brand', 'category')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand__name', 'description', 'model_number', 'processor', 'os']
    ordering_fields = ['price', 'created_at', 'name', 'stock']
    lookup_field = 'slug'

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Filter by brand
        brand = params.get('brand')
        if brand:
            qs = qs.filter(brand__slug=brand) if not brand.isdigit() else qs.filter(brand_id=brand)

        # Filter by category
        category = params.get('category')
        if category:
            qs = qs.filter(category__slug=category) if not category.isdigit() else qs.filter(category_id=category)

        # Filter by price range
        min_price = params.get('min_price')
        max_price = params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)

        # Filter by condition
        condition = params.get('condition')
        if condition:
            qs = qs.filter(condition=condition)

        # Filter by stock availability
        in_stock = params.get('in_stock')
        if in_stock == 'true':
            qs = qs.filter(stock__gt=0)

        # Filter by RAM / Storage
        ram = params.get('ram')
        if ram:
            qs = qs.filter(ram__icontains=ram)

        storage = params.get('storage')
        if storage:
            qs = qs.filter(storage__icontains=storage)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PhoneDetailSerializer
        return PhoneListSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """GET /api/phones/featured/ — featured phones"""
        phones = self.get_queryset().filter(is_featured=True)
        serializer = PhoneListSerializer(phones, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """GET /api/phones/search/?q=iphone — full text search"""
        q = request.query_params.get('q', '')
        if not q:
            return Response({'error': 'Please provide a search query ?q=...'}, status=400)
        phones = self.get_queryset().filter(
            Q(name__icontains=q) | Q(brand__name__icontains=q) |
            Q(description__icontains=q) | Q(processor__icontains=q) | Q(os__icontains=q)
        )
        serializer = PhoneListSerializer(phones, many=True, context={'request': request})
        return Response({'count': phones.count(), 'results': serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def toggle_featured(self, request, slug=None):
        """POST /api/phones/{slug}/toggle_featured/ — toggle featured status"""
        phone = self.get_object()
        phone.is_featured = not phone.is_featured
        phone.save()
        return Response({'is_featured': phone.is_featured})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def update_stock(self, request, slug=None):
        """POST /api/phones/{slug}/update_stock/ — update stock quantity"""
        phone = self.get_object()
        stock = request.data.get('stock')
        if stock is None:
            return Response({'error': 'stock field is required'}, status=400)
        try:
            phone.stock = int(stock)
            phone.save()
            return Response({'stock': phone.stock})
        except (ValueError, TypeError):
            return Response({'error': 'stock must be an integer'}, status=400)


class PhoneImageViewSet(viewsets.ModelViewSet):
    """CRUD for Phone Gallery Images"""
    queryset = PhoneImage.objects.all()
    serializer_class = PhoneImageSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return []  # Allow anyone to view phone images

    def get_queryset(self):
        qs = super().get_queryset()
        phone_id = self.request.query_params.get('phone')
        if phone_id:
            qs = qs.filter(phone_id=phone_id)
        return qs


class ReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD for Reviews
    - List: GET /api/reviews/?phone=1
    - Create: POST /api/reviews/ (authenticated users)
    - Update/Delete: Only by the review author
    """
    queryset = Review.objects.all().select_related('user', 'phone')
    serializer_class = ReviewSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'rating']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return []  # Allow anyone to read reviews

    def get_queryset(self):
        qs = super().get_queryset()
        phone_id = self.request.query_params.get('phone')
        if phone_id:
            qs = qs.filter(phone_id=phone_id)
        return qs

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own reviews'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.user != request.user and not request.user.is_staff:
            return Response({'error': 'You can only delete your own reviews'}, status=403)
        return super().destroy(request, *args, **kwargs)
