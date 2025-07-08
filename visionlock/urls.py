from django.contrib import admin
from django.urls import path, include
from visionlock_app import views  # import the view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='home'),  # Root goes to homepage
    path('', include('visionlock_app.urls')),  # App routes
]
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
