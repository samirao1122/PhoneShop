from rest_framework import serializers
from .models import Brand, Category, Phone, PhoneImage, Review


class BrandSerializer(serializers.ModelSerializer):
    phone_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description', 'phone_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_phone_count(self, obj):
        return obj.phones.filter(is_active=True).count()


class CategorySerializer(serializers.ModelSerializer):
    phone_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'phone_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_phone_count(self, obj):
        return obj.phones.filter(is_active=True).count()


class PhoneImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'phone', 'user', 'user_name', 'rating', 'title',
                  'comment', 'is_verified_purchase', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'is_verified_purchase', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PhoneListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    avg_rating = serializers.SerializerMethodField()

    class Meta:
        model = Phone
        fields = [
            'id', 'brand', 'brand_name', 'category', 'category_name',
            'name', 'slug', 'price', 'discount_price', 'effective_price',
            'stock', 'in_stock', 'condition', 'is_active', 'is_featured',
            'image', 'image_url', 'ram', 'storage', 'color', 'avg_rating', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return None


class PhoneDetailSerializer(PhoneListSerializer):
    images = PhoneImageSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    review_count = serializers.SerializerMethodField()

    class Meta(PhoneListSerializer.Meta):
        fields = PhoneListSerializer.Meta.fields + [
            'model_number', 'description', 'battery', 'display_size',
            'camera', 'processor', 'os', 'weight', 'images',
            'reviews', 'review_count', 'updated_at',
        ]

    def get_review_count(self, obj):
        return obj.reviews.count()
