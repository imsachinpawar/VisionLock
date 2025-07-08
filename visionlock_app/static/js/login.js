// login.js

// Auto logout on return
if (sessionStorage.getItem("autoLogout")) {
  fetch("/logout/", {
    method: "POST",
    headers: { "X-CSRFToken": getCSRFToken() }
  }).then(() => {
    sessionStorage.removeItem("autoLogout");
    window.location.href = "/login/";
  });
}

function getCSRFToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

const video = document.getElementById("video-stream");
const canvas = document.getElementById("face-canvas");
const ctx = canvas.getContext("2d");
let morseDigits = [], currentSymbolSequence = [], blinkDetector;
const EAR_THRESHOLD = 0.2, BLINK_DURATION = 150;
let blinkStart = null;

const morseMap = {
  "....": "0", "..._": "1", ".._.": "2", "..__": "3",
  "._..": "4", "._._": "5", ".__.": "6", ".___": "7",
  "_...": "8", "_.._": "9"
};

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getEAR(landmarks) {
  const vertical1 = distance(landmarks[159], landmarks[145]);
  const vertical2 = distance(landmarks[386], landmarks[374]);
  const horizontal = distance(landmarks[33], landmarks[133]);
  return ((vertical1 + vertical2) / (2.0 * horizontal));
}

function showDigitTemporarily(digit) {
  const display = document.getElementById("morse-display");
  display.innerText = digit;
  setTimeout(() => display.innerText = "", 1000);
}

function processBlink(symbol) {
  if (morseDigits.length >= 4) return;
  currentSymbolSequence.push(symbol);
  document.getElementById("morse-display").innerText += symbol;

  if (currentSymbolSequence.length === 4) {
    const code = currentSymbolSequence.join("");
    const digit = morseMap[code];
    if (digit !== undefined) {
      morseDigits.push(digit);
      document.getElementById("morse-output").value = morseDigits.join("");
      currentSymbolSequence = [];
      showDigitTemporarily(digit);
    } else {
      alert("\u26a0\ufe0f Invalid Morse: " + code);
      currentSymbolSequence = [];
      document.getElementById("morse-display").innerText = "";
    }
  }

  if (morseDigits.length === 4) {
    alert("\u2705 Morse PIN captured");
    blinkDetector.stop();
    stopCapture(video.srcObject);
  }
}

function stopCapture(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.style.display = "none";
  }
}

const faceMesh = new window.FaceMesh({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

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
  document.getElementById("morse-output").value = "";
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";
  blinkDetector = new Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 320,
    height: 240
  });
  blinkDetector.start();
});

document.getElementById("erase-digit").addEventListener("click", () => {
  if (morseDigits.length > 0) {
    morseDigits.pop();
    document.getElementById("morse-output").value = morseDigits.join("");
    currentSymbolSequence = [];
    document.getElementById("morse-display").innerText = "";
  } else {
    alert("No digit to erase.");
  }
});

document.getElementById("start-face").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";

  setTimeout(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");

    fetch("/api/match-face/", {
      method: "POST",
      body: JSON.stringify({ image: imageData }),
      headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
      stopCapture(stream);
      if (data.username) {
        document.getElementById("username-display").value = data.username;
        alert("\u2705 Face recognized: " + data.username);
      } else {
        alert("\u274c Face not recognized");
      }
    });
  }, 3000);
});

document.getElementById("login-btn").addEventListener("click", async () => {
  const username = document.getElementById("username-display").value.trim();
  const pin = document.getElementById("morse-output").value.trim();

  if (!username || !pin) {
    alert("Please complete all fields.");
    return;
  }

  const response = await fetch("/api/verify-login/", {
    method: "POST",
    body: JSON.stringify({ username, morse_pin: pin }),
    headers: { "Content-Type": "application/json" }
  });

  const data = await response.json();
  if (data.status === "success") {
    alert("\u2705 Login successful!");
    sessionStorage.setItem("autoLogout", "true");
    window.location.href = "https://myportfolio-5tb9.onrender.com/";
  } else {
    alert("\u274c Login failed: " + data.message);

    if (!video.srcObject || video.readyState < 2) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = "block";
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const snapshot = canvas.toDataURL("image/jpeg");
    const attemptedUser = username || "Unknown";

    fetch("/api/alert-admin/", {
      method: "POST",
      body: JSON.stringify({ image: snapshot, username: attemptedUser }),
      headers: { "Content-Type": "application/json" }
    });
  }
});

document.getElementById("reset-pin-btn").addEventListener("click", () => {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.style.display = "block";

    setTimeout(() => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      stopCapture(stream);

      fetch("/api/match-face/", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" }
      })
      .then(res => res.json())
      .then(data => {
        if (!data.username) return alert("\u274c Face not recognized");

        const new_pin = prompt("Enter your new 4-digit Morse PIN:");
        if (!new_pin || new_pin.length !== 4) return alert("Invalid new PIN");

        fetch("/api/reset-pin/", {
          method: "POST",
          body: JSON.stringify({ image: imageData, new_pin }),
          headers: { "Content-Type": "application/json" }
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            alert("\ud83d\udd01 PIN reset successful!");
          } else {
            alert("\u274c Reset failed: " + data.message);
          }
        });
      });
    }, 3000);
  });
});
