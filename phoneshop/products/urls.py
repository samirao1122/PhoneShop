from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrandViewSet, CategoryViewSet, PhoneViewSet, PhoneImageViewSet, ReviewViewSet

router = DefaultRouter()
router.register('brands', BrandViewSet, basename='brand')
router.register('categories', CategoryViewSet, basename='category')
router.register('phones', PhoneViewSet, basename='phone')
router.register('phone-images', PhoneImageViewSet, basename='phone-image')
router.register('reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
]
