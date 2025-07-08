import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from visionlock_app.models import UserProfile

SIMILARITY_THRESHOLD = 0.90  # Recommended minimum similarity

def recognize_user(face_id_input):
    try:
        if isinstance(face_id_input, str):
            input_vector = np.array(json.loads(face_id_input))
        elif isinstance(face_id_input, list):
            input_vector = np.array(face_id_input)
        elif isinstance(face_id_input, np.ndarray):
            input_vector = face_id_input
        else:
            raise TypeError("Unsupported face_id_input format")

        if input_vector.ndim != 1:
            raise ValueError("Input face encoding must be a 1D vector")

        best_match = None
        highest_similarity = -1.0

        for user in UserProfile.objects.all():
            try:
                db_vector = np.array(json.loads(user.face_encoding))
                if db_vector.shape != input_vector.shape:
                    print(f"⚠️ Shape mismatch for {user.username}")
                    continue

                similarity = cosine_similarity([input_vector], [db_vector])[0][0]
                print(f"🧪 Similarity with {user.username}: {similarity:.4f}")

                if similarity > SIMILARITY_THRESHOLD and similarity > highest_similarity:
                    highest_similarity = similarity
                    best_match = user

            except Exception as e:
                print(f"⚠️ Skipping {user.username}: {e}")
                continue

        if best_match:
            print(f"✅ Match found: {best_match.username} with similarity {highest_similarity:.4f}")
        else:
            print("❌ No user matched with sufficient similarity.")

        return best_match

    except Exception as e:
        print(f"🚨 Error in recognize_user: {e}")
        return None
