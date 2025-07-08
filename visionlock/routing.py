# visionlock/routing.py

from django.urls import path
from visionlock_app.consumers.register_consumer import RegisterConsumer
from visionlock_app.consumers.login_consumer import LoginBlinkConsumer

websocket_urlpatterns = [
    path("ws/register-blink/", RegisterConsumer.as_asgi()),   # 🔐 Handles Morse PIN registration
    path("ws/login-blink/", LoginBlinkConsumer.as_asgi()),    # 🔓 Handles Morse PIN login
]
