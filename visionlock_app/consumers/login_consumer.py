# visionlock_app/consumers/login_consumer.py

import json
import base64
import numpy as np
from channels.generic.websocket import AsyncWebsocketConsumer
from modules.blink_detector.tcn_predictor import TCNPredictor

class LoginBlinkConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.predictor = TCNPredictor()  # Load the TCN model once
        await self.accept()
        print("✅ WebSocket connection accepted for login.")
        await self.send(text_data=json.dumps({"status": "WebSocket connected"}))

    async def disconnect(self, close_code):
        print(f"🔌 Login WebSocket disconnected with code: {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            # Validate input
            if "image" not in data:
                await self.send(text_data=json.dumps({"error": "No image field provided."}))
                return

            # Extract and decode base64 image
            image_b64 = data["image"].split(",")[1] if "," in data["image"] else data["image"]
            image_bytes = base64.b64decode(image_b64)
            np_frame = np.frombuffer(image_bytes, dtype=np.uint8)

            # 🚧 TODO: Replace with OpenCV decoding & blink preprocessing logic
            # For now, simulate with dummy blink input
            dummy_blink_sequence = [0, 1, 0]

            prediction = self.predictor.predict(dummy_blink_sequence)
            print(f"📡 LoginBlinkConsumer prediction: {prediction}")

            if prediction in [".", "_"]:
                await self.send(text_data=json.dumps({"morse": prediction}))
            else:
                await self.send(text_data=json.dumps({"error": "Model returned invalid prediction."}))

        except Exception as e:
            print(f"❌ Exception in LoginBlinkConsumer.receive(): {e}")
            await self.send(text_data=json.dumps({"error": "Internal server error"}))
