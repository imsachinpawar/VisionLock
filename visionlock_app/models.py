from django.db import models

class UserProfile(models.Model):
    username = models.CharField(max_length=100, unique=True)
    email = models.EmailField(unique=True)
    morse_pin = models.CharField(max_length=256)  # hashed
    face_encoding = models.JSONField()  # Stores DenseNet or 128-d/1024-d array

    def __str__(self):
        return self.username
