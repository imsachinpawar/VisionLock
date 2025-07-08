# visionlock_app/forms.py

from django import forms
from .models import UserProfile

class RegistrationForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['username', 'morse_pin', 'face_id']
