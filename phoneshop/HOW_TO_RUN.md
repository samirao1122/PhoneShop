# Mobile Phone Shop — Django REST API

## Project Structure
```
phoneshop/
├── manage.py
├── requirements.txt
├── phoneshop/          ← main project settings & URLs
│   ├── settings.py
│   └── urls.py
├── products/           ← phones, brands, categories, reviews
├── orders/             ← cart, orders, wishlist
└── users/              ← auth, profile
```

---

## STEP 1 — Install Python (if not installed)
Download Python 3.10+ from https://python.org

---

## STEP 2 — Create Virtual Environment
```bash
# Navigate to project folder
cd phoneshop

# Create virtual env
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

---

## STEP 3 — Install Dependencies
```bash
pip install -r requirements.txt
```

---

## STEP 4 — Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## STEP 5 — Create Admin User
```bash
python manage.py createsuperuser
# Enter: username, email, password
```

---

## STEP 6 — Run Server
```bash
python manage.py runserver
```
Server starts at: http://127.0.0.1:8000

---

## STEP 7 — Access APIs

| URL | Description |
|-----|-------------|
| http://127.0.0.1:8000/api/docs/ | **Swagger UI — interactive docs** |
| http://127.0.0.1:8000/admin/ | Django Admin Panel |

---

## ALL API ENDPOINTS

### AUTH
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register/ | Register new user |
| POST | /api/auth/login/ | Login → get JWT tokens |
| POST | /api/auth/token/refresh/ | Refresh access token |
| GET | /api/auth/me/ | Get current user info |
| PUT/PATCH | /api/auth/profile/ | Update profile |
| POST | /api/auth/change-password/ | Change password |
| POST | /api/auth/logout/ | Logout |
| GET | /api/auth/users/ | List all users (admin) |

### BRANDS
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/brands/ | List all brands |
| POST | /api/brands/ | Create brand (admin) |
| GET | /api/brands/{slug}/ | Brand detail |
| PUT/PATCH | /api/brands/{slug}/ | Update brand (admin) |
| DELETE | /api/brands/{slug}/ | Delete brand (admin) |
| GET | /api/brands/{slug}/phones/ | Phones of a brand |

### CATEGORIES
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/categories/ | List all categories |
| POST | /api/categories/ | Create category (admin) |
| GET | /api/categories/{slug}/ | Category detail |
| PUT/PATCH | /api/categories/{slug}/ | Update (admin) |
| DELETE | /api/categories/{slug}/ | Delete (admin) |
| GET | /api/categories/{slug}/phones/ | Phones of category |

### PHONES
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/phones/ | List all phones |
| POST | /api/phones/ | Add phone (admin) |
| GET | /api/phones/{slug}/ | Phone detail |
| PUT/PATCH | /api/phones/{slug}/ | Update phone (admin) |
| DELETE | /api/phones/{slug}/ | Delete phone (admin) |
| GET | /api/phones/featured/ | Featured phones |
| GET | /api/phones/search/?q=iphone | Search phones |
| POST | /api/phones/{slug}/toggle_featured/ | Toggle featured (admin) |
| POST | /api/phones/{slug}/update_stock/ | Update stock (admin) |

**Filters for /api/phones/:**
```
?brand=samsung           filter by brand slug or id
?category=smartphones    filter by category
?min_price=100           minimum price
?max_price=500           maximum price
?condition=new           new / refurbished / used
?in_stock=true           only in-stock phones
?ram=8GB                 filter by RAM
?storage=128GB           filter by storage
?search=iphone           search in name/description
?ordering=price          sort by price (use -price for descending)
```

### REVIEWS
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/reviews/?phone=1 | List reviews for a phone |
| POST | /api/reviews/ | Add review (auth required) |
| GET | /api/reviews/{id}/ | Review detail |
| PUT/PATCH | /api/reviews/{id}/ | Edit review (own only) |
| DELETE | /api/reviews/{id}/ | Delete review (own only) |

### CART
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/cart/ | View cart |
| POST | /api/cart/add/ | Add item to cart |
| PUT | /api/cart/update_item/ | Update item quantity |
| DELETE | /api/cart/remove_item/ | Remove item |
| DELETE | /api/cart/clear/ | Clear entire cart |

### ORDERS
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/orders/ | List my orders |
| POST | /api/orders/ | Create order from cart |
| GET | /api/orders/{id}/ | Order detail |
| PATCH | /api/orders/{id}/ | Update order |
| DELETE | /api/orders/{id}/ | Cancel order |
| PATCH | /api/orders/{id}/update_status/ | Update status (admin) |

### WISHLIST
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/wishlist/ | My wishlist |
| POST | /api/wishlist/ | Add to wishlist |
| DELETE | /api/wishlist/{id}/ | Remove from wishlist |

---

## EXAMPLE USAGE (using curl)

### 1. Register
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ali","email":"ali@email.com","password":"mypass123","password2":"mypass123"}'
```

### 2. Login
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ali","password":"mypass123"}'
```
→ Copy the **access** token from response

### 3. Create a Brand (admin)
```bash
curl -X POST http://127.0.0.1:8000/api/brands/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Samsung","slug":"samsung","description":"Korean electronics giant"}'
```

### 4. Add a Phone (admin)
```bash
curl -X POST http://127.0.0.1:8000/api/phones/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": 1,
    "name": "Galaxy S24",
    "slug": "galaxy-s24",
    "price": "85000",
    "stock": 50,
    "ram": "8GB",
    "storage": "256GB",
    "description": "Latest Samsung flagship"
  }'
```

### 5. Add to Cart
```bash
curl -X POST http://127.0.0.1:8000/api/cart/add/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": 1, "quantity": 2}'
```

### 6. Place Order
```bash
curl -X POST http://127.0.0.1:8000/api/orders/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "cod",
    "full_name": "Ali Hassan",
    "email": "ali@email.com",
    "phone_number": "03001234567",
    "address": "House 5, Street 10",
    "city": "Gujranwala",
    "postal_code": "52250"
  }'
```
