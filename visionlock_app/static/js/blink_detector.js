import { FaceMesh } from "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
import { Camera } from "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

let morseDigits = [];
let currentSymbolSequence = [];
const morseMap = {
    "....": "0", "..._": "1", ".._.": "2", "..__": "3",
    "._..": "4", "._._": "5", ".__.": "6", ".___": "7",
    "_...": "8", "_.._": "9"
};

// === VOICE INPUT ===
document.getElementById("start-voice").addEventListener("click", () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => document.getElementById("voice-result").value = e.results[0][0].transcript.trim();
    recognition.onerror = (e) => alert("Voice input failed: " + e.error);
    recognition.start();
});

// === BLINK MORSE PIN CAPTURE (MediaPipe Only) ===
document.getElementById("start-morse").addEventListener("click", async () => {
    morseDigits = [];
    currentSymbolSequence = [];
    const video = document.getElementById("video-stream");
    const morseDisplay = document.getElementById("morse-display");
    morseDisplay.innerText = "";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = "block";
        video.play();

        const blinkDetector = new BlinkMorseDetector(video, (symbol) => {
            currentSymbolSequence.push(symbol);
            morseDisplay.innerText += symbol;

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
                stopCapture(stream);
            }
        });

        blinkDetector.start();

    } catch (err) {
        console.error("Camera access error:", err);
        alert("🚨 Cannot access webcam");
    }
});

function stopCapture(stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById("video-stream").style.display = "none";
}

// === FACE CAPTURE ===
document.getElementById("start-face").addEventListener("click", async () => {
    const video = document.getElementById("video-stream");
    const canvas = document.getElementById("face-canvas");
    const context = canvas.getContext("2d");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

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
                    alert("❌ Face not recognized.");
                }
                stream.getTracks().forEach(track => track.stop());
            });
        }, 3000);

    } catch (err) {
        console.error("Webcam error:", err);
        alert("Camera access failed.");
    }
});

// === REGISTRATION SUBMIT ===
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
