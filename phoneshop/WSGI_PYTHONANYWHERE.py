"""
WSGI config for PythonAnywhere deployment
Place this in: ~/your-repo/phoneshop/phoneshop/wsgi.py
"""

import os
import sys
from pathlib import Path

# Add your project directory to the Python path
project_dir = os.path.expanduser('~/your-repo/phoneshop')
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

# Set Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'phoneshop.settings'

# Load .env file for environment variables
try:
    from dotenv import load_dotenv
    env_path = os.path.join(project_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
except ImportError:
    pass

# Get the WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
