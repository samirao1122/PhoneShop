# PythonAnywhere Deployment Troubleshooting

## Common Issues & Solutions

---

### 1. **502 Bad Gateway Error**

**Cause:** WSGI file error or missing configuration

**Fix:**
1. Check the **Error log** in Web tab
2. Verify WSGI file path is correct
3. Ensure virtualenv path is set correctly
4. Click **Reload** button

```bash
# In Bash console, test WSGI:
cd ~/your-repo/phoneshop
source ~/.virtualenvs/phoneshop_venv/bin/activate
python -c "from phoneshop.wsgi import application; print('WSGI OK')"
```

---

### 2. **No module named 'django' or 'rest_framework'**

**Cause:** Virtual environment not activated or packages not installed

**Fix:**
```bash
# Activate venv and reinstall
source ~/.virtualenvs/phoneshop_venv/bin/activate
pip install -r requirements.txt

# Verify installation
pip list | grep Django
```

**In Web tab:** Verify virtualenv path is `/home/yourusername/.virtualenvs/phoneshop_venv`

---

### 3. **Static Files Not Loading (404)**

**Cause:** Static files not collected or path misconfigured

**Fix:**
```bash
cd ~/your-repo/phoneshop
source ~/.virtualenvs/phoneshop_venv/bin/activate
python manage.py collectstatic --noinput
```

**In Web tab - Static files section:**
```
URL: /static/
Directory: /home/yourusername/your-repo/phoneshop/staticfiles

URL: /media/
Directory: /home/yourusername/your-repo/phoneshop/media
```

Then click **Reload**.

---

### 4. **CORS Errors (403, Blocked by CORS)**

**Cause:** Frontend URL not in ALLOWED_HOSTS or CORS_ALLOWED_ORIGINS

**Fix in settings.py:**
```python
ALLOWED_HOSTS = ['yourusername.pythonanywhere.com', 'your-frontend-domain.com']

CORS_ALLOWED_ORIGINS = [
    "https://yourusername.pythonanywhere.com",
    "https://your-frontend-domain.com",
]

CSRF_TRUSTED_ORIGINS = [
    "https://yourusername.pythonanywhere.com",
    "https://your-frontend-domain.com",
]
```

Then **Reload** the web app.

---

### 5. **Database Locked / OperationalError**

**Cause:** SQLite doesn't handle concurrent requests well

**Fix:**
1. **Restart web app** (Web tab → Reload)
2. Check if another process has lock:
   ```bash
   fuser ~/your-repo/phoneshop/db.sqlite3
   ```

**Better solution:** Use PostgreSQL instead of SQLite for production

---

### 6. **SECRET_KEY Not Being Read from .env**

**Cause:** .env file not found or not being loaded

**Fix:**
1. Verify `.env` exists in project directory:
   ```bash
   cat ~/your-repo/phoneshop/.env
   ```

2. Ensure it has the correct permissions:
   ```bash
   chmod 644 ~/your-repo/phoneshop/.env
   ```

3. Reload web app (Web tab)

4. Check Error log for loading errors

---

### 7. **Import Error: No module named 'dotenv'**

**Cause:** python-dotenv not installed

**Fix:**
```bash
source ~/.virtualenvs/phoneshop_venv/bin/activate
pip install python-dotenv
pip freeze > requirements.txt  # Update requirements
```

---

### 8. **Media Files Not Uploading**

**Cause:** Incorrect MEDIA_ROOT path or permissions

**In settings.py:**
```python
MEDIA_ROOT = BASE_DIR / 'media'  # This is correct
```

**In Web tab:**
```
URL: /media/
Directory: /home/yourusername/your-repo/phoneshop/media
```

**Check permissions:**
```bash
ls -la ~/your-repo/phoneshop/media/
chmod -R 755 ~/your-repo/phoneshop/media/
```

---

### 9. **App Keeps Crashing / Restarting**

**Cause:** Infinite loop, out of memory, or code error

**Fix:**
1. **Check Error log** (Web tab)
2. **Check recent code changes**
3. Look for infinite loops or heavy operations
4. Use **Reload** to restart

**Temporary disable:**
```
Web tab → scroll down → Disable
Make fixes → Reload
```

---

### 10. **Migrations Error / Database Error**

**Cause:** Database not migrated or migration file issue

**Fix:**
```bash
cd ~/your-repo/phoneshop
source ~/.virtualenvs/phoneshop_venv/bin/activate
python manage.py migrate
python manage.py migrate --fake-initial  # If already created
```

**If schema mismatch:**
```bash
python manage.py makemigrations
python manage.py migrate
```

---

### 11. **DEBUG=True in Production (Security Risk)**

**Cause:** DEBUG not set to False in .env

**Fix:**
Edit `.env`:
```
DEBUG=False  # Must be False in production
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=yourusername.pythonanywhere.com
```

Then reload.

---

### 12. **403 Permission Denied**

**Cause:** File/directory permissions issues

**Fix:**
```bash
# Make directory accessible
chmod -R 755 ~/your-repo/phoneshop/
chmod -R 644 ~/your-repo/phoneshop/*.py
```

---

## Debugging Commands

### View Real-Time Logs
```bash
# In Web tab, click "Error log" and refresh page
# Then check logs
```

### Test Django Setup
```bash
source ~/.virtualenvs/phoneshop_venv/bin/activate
cd ~/your-repo/phoneshop
python manage.py shell
>>> from django.conf import settings
>>> print(settings.ALLOWED_HOSTS)
>>> print(settings.DEBUG)
```

### Check Virtual Environment
```bash
which python
python --version
pip list
```

### Check Database
```bash
python manage.py dbshell
.tables  # SQLite
```

---

## If Still Failing

1. **Clear browser cache** (sometimes old static files cached)
2. **Check all file paths** - must be absolute paths
3. **View Raw Server Log:**
   ```bash
   tail -f /var/log/yourusername.pythonanywhere.com.error.log
   tail -f /var/log/yourusername.pythonanywhere.com.access.log
   ```
4. **Reinstall from scratch:**
   ```bash
   # New bash console
   source ~/.virtualenvs/phoneshop_venv/bin/activate
   pip uninstall -r requirements.txt
   pip install -r requirements.txt
   ```

---

## PythonAnywhere Help Resources

- **Official Docs:** https://help.pythonanywhere.com/
- **Django Guide:** https://help.pythonanywhere.com/pages/Django/
- **Web App Config:** https://help.pythonanywhere.com/pages/WebAppNewbiesFAQ/
- **Support Email:** support@pythonanywhere.com

---

## Still Need Help?

Post details in PythonAnywhere forums with:
- Error log output
- Your configuration (blanked SECRET_KEY)
- Steps you've taken so far
