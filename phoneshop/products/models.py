from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Phone(models.Model):
    CONDITION_CHOICES = [
        ('new', 'New'),
        ('refurbished', 'Refurbished'),
        ('used', 'Used'),
    ]

    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='phones')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='phones')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    model_number = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='new')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    image = models.ImageField(upload_to='phones/', null=True, blank=True)
    image_url = models.URLField(blank=True, null=True)
    # Specifications
    ram = models.CharField(max_length=20, blank=True)
    storage = models.CharField(max_length=20, blank=True)
    battery = models.CharField(max_length=20, blank=True)
    display_size = models.CharField(max_length=20, blank=True)
    camera = models.CharField(max_length=50, blank=True)
    processor = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=50, blank=True, verbose_name='Operating System')
    color = models.CharField(max_length=50, blank=True)
    weight = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.brand.name} {self.name}"

    @property
    def effective_price(self):
        return self.discount_price if self.discount_price else self.price

    @property
    def in_stock(self):
        return self.stock > 0


class PhoneImage(models.Model):
    phone = models.ForeignKey(Phone, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='phones/gallery/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.phone}"


class Review(models.Model):
    phone = models.ForeignKey(Phone, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=200)
    comment = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('phone', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.phone} ({self.rating}/5)"
