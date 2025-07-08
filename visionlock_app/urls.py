from django.urls import path
from . import views
from .views import auto_logout_view

urlpatterns = [
    path("api/match-face/", views.match_face),
    path("api/register-user/", views.register_user),
    path("api/verify-login/", views.verify_login),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("logout/", views.logout_view, name="logout"),
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("", views.index, name="index"),
    path('api/reset-pin/', views.reset_pin, name='reset_pin'),
    path('logout/', auto_logout_view, name='auto_logout'),
    path("api/alert-admin/", views.alert_admin, name="alert_admin"),
]
