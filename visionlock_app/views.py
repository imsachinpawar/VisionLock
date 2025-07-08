import os
import json
import uuid
import base64
import numpy as np
from PIL import Image
from io import BytesIO
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.core.mail import EmailMessage
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import logout
from django.contrib.auth.hashers import check_password, make_password
from .models import UserProfile
import face_recognition

def auto_logout_view(request):
    logout(request)
    return JsonResponse({"status": "logged out"})

def decode_face_image(base64_image):
    try:
        header, encoded = base64_image.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        return np.array(image)
    except Exception:
        return None

@csrf_exempt
def alert_admin(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body)
        image_data = data.get("image", "")
        username = data.get("username", "Unknown")

        if not image_data or not image_data.startswith("data:image"):
            return JsonResponse({"error": "Invalid or missing image data"}, status=400)

        # Decode base64 image
        header, encoded = image_data.split(",", 1)
        binary_data = base64.b64decode(encoded)

        # Generate filename and path
        filename = f"failed_attempt_{uuid.uuid4().hex}.jpg"
        temp_dir = getattr(settings, "TEMP_IMAGE_DIR", os.path.join(settings.BASE_DIR, "temp_images"))
        os.makedirs(temp_dir, exist_ok=True)  # ✅ ensure directory exists
        temp_path = os.path.join(temp_dir, filename)

        # Save image
        with open(temp_path, "wb") as f:
            f.write(binary_data)

        # Send email with attachment
        email = EmailMessage(
            subject="🚨 Failed Login Attempt Alert",
            body=f"A failed login attempt was detected.\n\nUsername: {username}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.ALERT_ADMIN_EMAIL],
        )
        email.attach(filename, binary_data, "image/jpeg")
        email.send(fail_silently=False)

        return JsonResponse({"status": "alert_sent"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def match_face(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            image_data = data.get("image")
            if not image_data:
                return JsonResponse({"username": None}, status=400)

            image_np = decode_face_image(image_data)
            if image_np is None:
                return JsonResponse({"username": None}, status=400)

            encodings = face_recognition.face_encodings(image_np)
            if not encodings:
                return JsonResponse({"username": None}, status=200)

            input_encoding = encodings[0]
            best_match = None
            best_distance = float("inf")

            for user in UserProfile.objects.all():
                if user.face_encoding:
                    db_encoding = np.array(json.loads(user.face_encoding))
                    distance = np.linalg.norm(db_encoding - input_encoding)
                    if distance < 0.6 and distance < best_distance:
                        best_match = user
                        best_distance = distance

            if best_match:
                return JsonResponse({
                    "username": best_match.username,
                    "face_encoding": best_match.face_encoding
                })

            return JsonResponse({
                "username": None,
                "face_encoding": input_encoding.tolist()
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def register_user(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            morse_pin = data.get("morse_pin")
            face_encoding = data.get("face_encoding")

            if not username or not morse_pin or not face_encoding:
                return JsonResponse({"status": "failed", "message": "Missing fields"}, status=400)

            if UserProfile.objects.filter(username=username).exists():
                return JsonResponse({"status": "failed", "message": "Username already exists"}, status=409)

            hashed_pin = make_password(morse_pin)
            UserProfile.objects.create(
                username=username,
                morse_pin=hashed_pin,
                face_encoding=json.dumps(face_encoding)
            )

            return JsonResponse({"status": "success"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def verify_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            morse_pin = data.get("morse_pin")

            if not username or not morse_pin:
                return JsonResponse({"status": "failed", "message": "Missing credentials"}, status=400)

            user = UserProfile.objects.get(username=username)

            if check_password(morse_pin, user.morse_pin):
                request.session['user'] = username
                return JsonResponse({"status": "success"})
            else:
                return JsonResponse({"status": "failed", "message": "PIN mismatch"}, status=401)

        except UserProfile.DoesNotExist:
            return JsonResponse({"status": "failed", "message": "User not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def reset_pin(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            image_data = data.get("image")
            new_pin = data.get("new_pin")

            if not image_data or not new_pin:
                return JsonResponse({"status": "failed", "message": "Missing data"}, status=400)

            image_np = decode_face_image(image_data)
            if image_np is None:
                return JsonResponse({"status": "failed", "message": "Invalid image"}, status=400)

            encodings = face_recognition.face_encodings(image_np)
            if not encodings:
                return JsonResponse({"status": "failed", "message": "No face found"}, status=400)

            input_encoding = encodings[0]

            for user in UserProfile.objects.all():
                if user.face_encoding:
                    db_encoding = np.array(json.loads(user.face_encoding))
                    distance = np.linalg.norm(db_encoding - input_encoding)
                    if distance < 0.6:
                        user.morse_pin = make_password(new_pin)
                        user.save()
                        return JsonResponse({"status": "success", "message": "PIN reset successfully"})

            return JsonResponse({"status": "failed", "message": "Face not recognized"}, status=404)

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)

def dashboard(request):
    username = request.session.get('user')
    if not username:
        return redirect('login')
    return render(request, 'dashboard.html', {"username": username})

def logout_view(request):
    request.session.flush()
    return redirect('login')

def index(request):
    return render(request, 'index.html')

def register(request):
    return render(request, 'register.html')

def login(request):
    return render(request, 'login.html')
