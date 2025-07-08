// register.js
import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
import { Camera } from "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

let morseDigits = [];
let currentSymbolSequence = [];
const morseMap = {
  "....": "0", "..._": "1", ".._.": "2", "..__": "3",
  "._..": "4", "._._": "5", ".__.": "6", ".___": "7",
  "_...": "8", "_.._": "9"
};

const EAR_THRESHOLD = 0.2;
const BLINK_DURATION = 150;
let blinkStart = null;

function getEAR(landmarks) {
  const vertical1 = distance(landmarks[159], landmarks[145]);
  const vertical2 = distance(landmarks[386], landmarks[374]);
  const horizontal = distance(landmarks[33], landmarks[133]);
  return ((vertical1 + vertical2) / (2.0 * horizontal));
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function processBlink(symbol) {
  currentSymbolSequence.push(symbol);
  document.getElementById("morse-display").innerText += symbol;
  if (currentSymbolSequence.length === 4) {
    const code = currentSymbolSequence.join("");
    const digit = morseMap[code];
    if (digit !== undefined) {
      morseDigits.push(digit);
      document.getElementById("morse-output").value = morseDigits.join("");
    } else {
      alert("⚠️ Unknown Morse pattern: " + code);
    }
    currentSymbolSequence = [];
  }
  if (morseDigits.length === 4) {
    alert("✅ Morse PIN captured: " + morseDigits.join(""));
    blinkDetector.stop();
    stopCapture(video.srcObject);
  }
}

let video = document.getElementById("video-stream");
let blinkDetector;

const faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults(results => {
  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    const ear = getEAR(landmarks);
    const now = performance.now();
    if (ear < EAR_THRESHOLD) {
      if (!blinkStart) blinkStart = now;
    } else {
      if (blinkStart) {
        const duration = now - blinkStart;
        blinkStart = null;
        processBlink(duration < BLINK_DURATION ? "." : "_");
      }
    }
  }
});

document.getElementById("start-morse").addEventListener("click", async () => {
  morseDigits = [];
  currentSymbolSequence = [];
  document.getElementById("morse-display").innerText = "";
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";
  video.play();
  blinkDetector = new Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 320,
    height: 240
  });
  blinkDetector.start();
});

document.getElementById("start-voice").addEventListener("click", () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (e) => document.getElementById("voice-result").value = e.results[0][0].transcript.trim();
  recognition.onerror = (e) => alert("Voice input failed: " + e.error);
  recognition.start();
});

function stopCapture(stream) {
  stream.getTracks().forEach(track => track.stop());
  video.style.display = "none";
}

document.getElementById("start-face").addEventListener("click", async () => {
  const canvas = document.getElementById("face-canvas");
  const context = canvas.getContext("2d");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";

  setTimeout(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");
    fetch("/api/match-face/", {
      method: "POST",
      body: JSON.stringify({ image: imageData }),
      headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
      if (data.username) {
        document.getElementById("face-result").value = data.username;
        alert("✅ Face recognized: " + data.username);
      } else {
        alert("❌ Face not recognized");
      }
      stopCapture(stream);
    });
  }, 3000);
});

document.getElementById("submit-registration").addEventListener("click", () => {
  const username = document.getElementById("voice-result").value.trim();
  const morsePIN = document.getElementById("morse-output").value.trim();
  const faceName = document.getElementById("face-result").value.trim();
  if (!username || !morsePIN || !faceName) {
    alert("🚨 Complete all steps before submitting.");
    return;
  }
  fetch("/api/register-user/", {
    method: "POST",
    body: JSON.stringify({ username, morse_pin: morsePIN, face_name: faceName }),
    headers: { "Content-Type": "application/json" },
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      alert("🎉 Registration successful!");
      window.location.href = "/login/";
    } else {
      alert("❌ Registration failed: " + data.message);
    }
  });
});
