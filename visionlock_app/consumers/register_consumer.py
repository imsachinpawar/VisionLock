# visionlock_app/consumers/register_consumer.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from modules.blink_detector.tcn_predictor import TCNPredictor
import base64
import cv2
import numpy as np
from asgiref.sync import sync_to_async

class RegisterConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.predictor = TCNPredictor("modules/blink_detector/tcn_model.pkl")
        await self.accept()
        print("✅ WebSocket connection established")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if "image" in data:
                image_data = data["image"].split(",")[1]
                decoded = base64.b64decode(image_data)
                np_data = np.frombuffer(decoded, np.uint8)
                frame = cv2.imdecode(np_data, cv2.IMREAD_COLOR)

                # Predict from frame
                blink = self.predictor.predict_from_frame(frame)

                if blink in [".", "_"]:
                    await self.send(text_data=json.dumps({"morse": blink}))
                else:
                    await self.send(text_data=json.dumps({"error": "Blink prediction failed"}))

            else:
                await self.send(text_data=json.dumps({"error": "Missing image field"}))

        except Exception as e:
            await self.send(text_data=json.dumps({"error": f"Processing error: {str(e)}"}))

    async def disconnect(self, close_code):
        print("🔌 WebSocket disconnected")
