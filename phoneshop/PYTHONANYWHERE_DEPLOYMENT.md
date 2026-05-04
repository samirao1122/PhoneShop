# PythonAnywhere Deployment Guide

Follow these steps to deploy your Django phone shop API on PythonAnywhere.

---

## **STEP 1: Create a PythonAnywhere Account**

1. Visit https://www.pythonanywhere.com
2. Sign up for a **free account** (or paid if you want custom domains)
3. Verify your email

---

## **STEP 2: Upload Your Project via Git**

1. Go to **Consoles** → **Bash Console**
2. Clone your repository (if on GitHub):
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo/phoneshop
   ```

   OR upload manually via **Files** tab and upload the `phoneshop` folder

---

## **STEP 3: Create a Virtual Environment**

In the Bash console:

```bash
cd ~/your-repo/phoneshop

# Create virtual environment
mkvirtualenv --python=/usr/bin/python3.10 phoneshop_venv

# Activate it (should show (phoneshop_venv) in prompt)
source ~/.virtualenvs/phoneshop_venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## **STEP 4: Configure Django Settings**

Update your `phoneshop/settings.py` for the environment:

### Set environment variables:
In Bash console, create a `.env` file:

```bash
cat > ~/your-repo/phoneshop/.env << EOF
SECRET_KEY=your-long-random-secret-key-change-this
DEBUG=False
ALLOWED_HOSTS=yourusername.pythonanywhere.com,localhost,127.0.0.1
EOF
```

**Generate a secure SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## **STEP 5: Collect Static Files**

In Bash console:

```bash
cd ~/your-repo/phoneshop

# Activate venv first
source ~/.virtualenvs/phoneshop_venv/bin/activate

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin panel)
python manage.py createsuperuser
```

---

## **STEP 6: Configure Web App**

1. Go to **Web** tab
2. Click **Add a new web app**
3. Choose **Manual configuration**
4. Select **Python 3.10**
5. Click **Next**

---

## **STEP 7: Configure WSGI File**

1. In the Web tab, find **WSGI configuration file** → Edit
2. Replace the entire contents with:

```python
import os
import sys

# Add your project to the path
path = os.path.expanduser('~/your-repo/phoneshop')
if path not in sys.path:
    sys.path.insert(0, path)

# Set Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'phoneshop.settings'

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = os.path.join(path, '.env')
load_dotenv(env_path)

# Get WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

3. Click **Save**

---

## **STEP 8: Configure Static Files**

In the **Web** tab, scroll down to **Static files:**

| URL            | Directory                                          |
|----------------|----------------------------------------------------|
| `/static/`     | `/home/yourusername/your-repo/phoneshop/staticfiles` |
| `/media/`      | `/home/yourusername/your-repo/phoneshop/media`       |

---

## **STEP 9: Set Virtualenv**

In the **Web** tab, find **Virtualenv:**
```
/home/yourusername/.virtualenvs/phoneshop_venv
```

---

## **STEP 10: Reload Web App**

1. Click the green **Reload** button at the top of the **Web** tab
2. Wait 30 seconds for the reload to complete

---

## **STEP 11: Test Your Deployment**

Visit: `https://yourusername.pythonanywhere.com/`

Expected endpoints:
- API Root: `/api/` 
- API Schema: `/api/schema/`
- Admin Panel: `/admin/`
- Products: `/api/products/`
- Orders: `/api/orders/`
- Users: `/api/users/`

---

## **STEP 12: Set Up CORS for Frontend**

Update `phoneshop/settings.py` with your frontend URL:

```python
# For custom domain or frontend:
ALLOWED_HOSTS = ['yourusername.pythonanywhere.com', 'yourdomain.com']

CORS_ALLOWED_ORIGINS = [
    "https://yourusername.pythonanywhere.com",
    "https://yourdomain.com",
    "https://your-frontend-url.com",
]

CSRF_TRUSTED_ORIGINS = [
    "https://yourusername.pythonanywhere.com",
    "https://yourdomain.com",
    "https://your-frontend-url.com",
]
```

Then reload the web app again.

---

## **Troubleshooting**

### **Error: Module not found**
- Check virtualenv path is correct
- Ensure all packages are installed: `pip install -r requirements.txt`

### **500 Error / Static files not loading**
- Run `python manage.py collectstatic --noinput`
- Check static file paths in Web tab

### **Database errors**
- Run `python manage.py migrate`
- Check file permissions on `db.sqlite3`

### **Check Logs**
In **Web** tab, view:
- **Server log** (errors)
- **Error log** (detailed errors)

---

## **Optional: Use PostgreSQL Instead of SQLite**

For production, use PostgreSQL instead of SQLite:

1. Create a PythonAnywhere MySQL account
2. Update `settings.py`:

```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(default='sqlite:///db.sqlite3')
}
```

3. Install `dj-database-url`: `pip install dj-database-url psycopg2-binary`
4. Set database URL in environment

---

## **Next Steps**

✅ Your API is now live at `https://yourusername.pythonanywhere.com`

- Connect your frontend to this URL
- Set up a custom domain (paid plan)
- Enable HTTPS (automatic with pythonanywhere.com subdomain)
- Monitor logs in Web tab
