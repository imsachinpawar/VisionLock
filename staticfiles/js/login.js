// login.js (Frontend EAR logic for Phase 2 Login)
import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
import { Camera } from "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

const EAR_THRESHOLD = 0.2;
const BLINK_DURATION = 150;
let earBlinkBuffer = [];
let morseLoginSymbols = [];
let morseLoginDigits = [];
const morseDigitMap = {
  "....": "0", "..._": "1", ".._.": "2", "..__": "3",
  "._..": "4", "._._": "5", ".__.": "6", ".___": "7",
  "_...": "8", "_.._": "9"
};

let usernameDetected = "";
let currentSymbol = "";
let symbolGroup = [];

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
  symbolGroup.push(symbol);
  document.getElementById("morse-login-output").textContent += symbol;

  if (symbolGroup.length === 4) {
    const code = symbolGroup.join("");
    const digit = morseDigitMap[code];
    if (digit !== undefined) {
      morseLoginDigits.push(digit);
    } else {
      alert("⚠️ Unknown Morse pattern: " + code);
    }
    symbolGroup = [];
  }

  if (morseLoginDigits.length === 4) {
    document.getElementById("morse-login-output").textContent += "\nPIN: " + morseLoginDigits.join("");
    stopCamera();
  }
}

let blinkStart = null;
function detectBlink(ear) {
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

const video = document.getElementById("login-video");
let cam = null;

function stopCamera() {
  if (cam) cam.stop();
  video.style.display = "none";
}

const faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults(results => {
  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    const ear = getEAR(landmarks);
    detectBlink(ear);
  }
});

document.getElementById("start-blink-login").addEventListener("click", async () => {
  morseLoginDigits = [];
  symbolGroup = [];
  document.getElementById("morse-login-output").textContent = "";
  video.style.display = "block";
  cam = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 320,
    height: 240
  });
  cam.start();
});

document.getElementById("detect-face").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";
  video.play();

  setTimeout(() => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg");
    fetch("/api/match-face/", {
      method: "POST",
      body: JSON.stringify({ image: imageData }),
      headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
      if (data.username) {
        document.getElementById("username-display").textContent = data.username;
      } else {
        alert("Face not recognized");
      }
      stopCamera();
    });
  }, 3000);
});

document.getElementById("verify-login").addEventListener("click", () => {
  const username = document.getElementById("username-display").textContent.trim();
  const pin = morseLoginDigits.join("");

  fetch("/api/verify-login/", {
    method: "POST",
    body: JSON.stringify({ username, morse_pin: pin }),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      window.location.href = "/dashboard/";
    } else {
      alert("❌ Login failed: " + data.message);
    }
  });
});