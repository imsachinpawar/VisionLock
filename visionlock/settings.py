#==[ File: visionlock/settings.py ]==
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'your-secret-key'
DEBUG = True
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'visionlock_app',
    
]

ASGI_APPLICATION = "visionlock.asgi.application"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'visionlock.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'visionlock.wsgi.application'

# Channel layers - using in-memory for dev (you can switch to Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [ BASE_DIR / "visionlock_app" / "static" ]  # For development
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # For production (collectstatic)

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# == Email Configuration for Alerting Admin on Failed Logins ==
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # Or your SMTP provider
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'sachinpawar.ka@gmail.com'  # ✅ Replace with your admin email
EMAIL_HOST_PASSWORD = "xrvn nacy gonz jzzw"  # ✅ Use app password (not real password)
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# == Admin Recipient ==
ALERT_ADMIN_EMAIL = 'iemjenkin@gmail.com'  # ✅ Replace with actual recipient email

# == Temporary directory for failed login snapshots ==
TEMP_IMAGE_DIR = os.path.join(BASE_DIR, 'temp')
os.makedirs(TEMP_IMAGE_DIR, exist_ok=True)

