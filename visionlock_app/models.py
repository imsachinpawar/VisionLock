from django.db import models

class UserProfile(models.Model):
    username = models.CharField(max_length=100, unique=True)
    morse_pin = models.CharField(max_length=255)
    face_encoding = models.TextField()  # Stored as JSON list
