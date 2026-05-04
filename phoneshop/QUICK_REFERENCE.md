# Quick Deployment Checklist for PythonAnywhere

## Pre-Deployment ✅

- [ ] Update `phoneshop/settings.py` to use environment variables (Already done)
- [ ] Add `.env` file with production settings (Create on PythonAnywhere)
- [ ] Generate secure SECRET_KEY
- [ ] Add `python-dotenv` to requirements.txt (Already done)
- [ ] Ensure STATIC_ROOT and MEDIA_ROOT are configured (Already done)

---

## On PythonAnywhere 🚀

### 1. **Create Account**
   - [ ] Sign up at https://www.pythonanywhere.com
   - [ ] Verify email

### 2. **Upload Project**
   - [ ] Use Git: `git clone https://github.com/your-repo.git`
   - [ ] OR upload files via Files tab

### 3. **Setup Virtual Environment**
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 phoneshop_venv
   source ~/.virtualenvs/phoneshop_venv/bin/activate
   pip install -r requirements.txt
   ```

### 4. **Create .env File**
   In Bash console:
   ```bash
   cat > ~/.env << EOF
   SECRET_KEY=YOUR_GENERATED_SECRET_KEY
   DEBUG=False
   ALLOWED_HOSTS=yourusername.pythonanywhere.com
   EOF
   ```

### 5. **Initialize Database**
   ```bash
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser  # Optional
   ```

### 6. **Configure Web App**
   - [ ] Web tab → Add new web app → Manual → Python 3.10
   - [ ] Set Virtualenv path: `/home/yourusername/.virtualenvs/phoneshop_venv`
   - [ ] Edit WSGI file (use provided WSGI_PYTHONANYWHERE.py)
   - [ ] Setup static files in Web tab:
     - `/static/` → `/home/yourusername/your-repo/phoneshop/staticfiles`
     - `/media/` → `/home/yourusername/your-repo/phoneshop/media`

### 7. **Test & Deploy**
   - [ ] Click **Reload** button
   - [ ] Visit `https://yourusername.pythonanywhere.com/`
   - [ ] Test API endpoints
   - [ ] Check logs if errors

---

## API Endpoints After Deployment

```
Base URL: https://yourusername.pythonanywhere.com

✅ GET  / (or /api/) - API Root
✅ GET  /api/schema/ - Auto API Docs
✅ GET  /admin/ - Django Admin
✅ GET  /api/products/ - List phones
✅ GET  /api/orders/ - Order management
✅ GET  /api/users/ - User management
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 Error | Check Error log in Web tab |
| Static files missing | Run `collectstatic` again |
| Module not found | Verify virtualenv path |
| CORS errors | Update ALLOWED_HOSTS & CORS settings |
| Database locked | Restart web app |

---

## Commands Reference

**View logs:**
```bash
tail -f /var/log/yourusername.pythonanywhere.com.error.log
```

**SSH into PythonAnywhere:**
```bash
# From Bash console in PythonAnywhere
```

**Reload app after changes:**
```
Web tab → Green "Reload" button
```

---

## File Locations on PythonAnywhere

```
/home/yourusername/
├── your-repo/phoneshop/          ← Your project
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                       ← Create this with secrets
│   ├── db.sqlite3
│   ├── staticfiles/               ← After collectstatic
│   ├── media/
│   └── phoneshop/settings.py
├── .virtualenvs/
│   └── phoneshop_venv/            ← Virtual environment
```

---

## Next: Connect Your Frontend

Update your frontend API URL to:
```
https://yourusername.pythonanywhere.com/api/
```

Configure CORS in settings.py for your frontend URL.

---

**Deployment complete!** 🎉
