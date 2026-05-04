from django.contrib import admin
from .models import Brand, Category, Phone, PhoneImage, Review


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}


class PhoneImageInline(admin.TabularInline):
    model = PhoneImage
    extra = 1


@admin.register(Phone)
class PhoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'price', 'discount_price', 'stock', 'condition', 'is_active', 'is_featured']
    list_filter = ['brand', 'category', 'condition', 'is_active', 'is_featured']
    search_fields = ['name', 'model_number', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PhoneImageInline]
    list_editable = ['stock', 'is_active', 'is_featured']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['phone', 'user', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['phone__name', 'user__username']
