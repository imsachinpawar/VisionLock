from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("dashboard/", views.dashboard, name="dashboard"),
    path("logout/", views.logout_view, name="logout"),

    # Face Matching
    path("api/match-face/", views.match_face, name="match_face"),

    # Registration & Login
    path("api/register-user/", views.register_user, name="register_user"),
    path("api/verify-login/", views.verify_login, name="verify_login"),
    path("api/reset-pin/", views.reset_pin, name="reset_pin"),

    # OTP for email
    path("api/send-otp/", views.send_otp, name="send_otp"),
    path("api/verify-otp/", views.verify_otp, name="verify_otp"),

    # Security alert
    path("api/alert-admin/", views.alert_admin, name="alert_admin"),

    # Auto logout via frontend
    path("auto-logout/", views.auto_logout_view, name="auto_logout"),
]
