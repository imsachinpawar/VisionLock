let faceEncoding = null;
let morseDigits = [];
let currentSymbolSequence = [];
let otpVerified = false;
let pinVerified = false;

const EAR_THRESHOLD = 0.2;
const BLINK_DURATION = 150;
let blinkStart = null;

const morseMap = {
  "....": "0", "..._": "1", ".._.": "2", "..__": "3",
  "._..": "4", "._._": "5", ".__.": "6", ".___": "7",
  "_...": "8", "_.._": "9"
};

const video = document.getElementById("video-stream");
const canvas = document.getElementById("face-canvas");
const ctx = canvas.getContext("2d");

function getEAR(landmarks) {
  const v1 = distance(landmarks[159], landmarks[145]);
  const v2 = distance(landmarks[386], landmarks[374]);
  const h = distance(landmarks[33], landmarks[133]);
  return ((v1 + v2) / (2.0 * h));
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function stopCapture(stream) {
  if (stream) stream.getTracks().forEach(track => track.stop());
  video.style.display = "none";
}

function processBlink(symbol) {
  currentSymbolSequence.push(symbol);

  // Show live symbol stream
  document.getElementById("morse-live-output").textContent = currentSymbolSequence.join("");

  if (currentSymbolSequence.length === 4) {
    const code = currentSymbolSequence.join("");
    const digit = morseMap[code];

    if (digit !== undefined) {
      morseDigits.push(digit);
      document.getElementById("morse-pin").value = morseDigits.join("");
    } else {
      alert("Invalid Morse code: " + code);
    }

    // Clear sequence and live display
    currentSymbolSequence = [];
    document.getElementById("morse-live-output").textContent = "";

    // Show verify only after 4 digits
    if (morseDigits.length === 4) {
      document.getElementById("verify-pin").style.display = "block";
      stopCapture(video.srcObject);
    }
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

document.getElementById("start-face").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData })
    })
      .then(res => res.json())
      .then(data => {
        if (data.username && data.email) {
          document.getElementById("username").value = data.username;
          document.getElementById("user-email").value = data.email;
          faceEncoding = data.face_encoding;
          alert("Face verified ✅");
          document.getElementById("start-face").closest(".input-group").style.display = "none";
        } else {
          alert("❌ Face not matched");
        }
      });
  }, 5000);
});

document.getElementById("start-blink").addEventListener("click", async () => {
  morseDigits = [];
  currentSymbolSequence = [];
  document.getElementById("morse-pin").value = "";
  document.getElementById("verify-pin").style.display = "none";

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.style.display = "block";

  new window.Camera(video, {
    onFrame: async () => await faceMesh.send({ image: video }),
    width: 320,
    height: 240
  }).start();
});

document.getElementById("verify-pin").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const morse_pin = document.getElementById("morse-pin").value.trim();

  fetch("/api/verify-login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, morse_pin })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        pinVerified = true;
        document.getElementById("verify-pin").style.display = "none";
        document.getElementById("erase-pin").style.display = "none";
        document.getElementById("start-blink").style.display = "none";
        document.getElementById("otp-section").style.display = "block";
        alert("PIN Verified ✅\nOTP sent to email.");
        fetch("/api/send-otp/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: document.getElementById("user-email").value })
        });
      } else {
        captureSnapshotAndAlert(username);
        alert("❌ Incorrect PIN — Admin alerted.");
      }
    });
});

document.getElementById("verify-otp").addEventListener("click", () => {
  const otp = document.getElementById("otp-field").value.trim();
  const email = document.getElementById("user-email").value.trim();
  if (!otp || !email) return alert("Enter OTP and ensure face is scanned.");

  fetch("/api/verify-otp/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message === "OTP verified") {
        otpVerified = true;
        document.getElementById("otp-section").style.display = "none";
        document.getElementById("login-btn").style.display = "block";
        alert("OTP Verified ✅ — Login unlocked");
      }
    });
});

document.getElementById("erase-pin").addEventListener("click", () => {
  morseDigits = [];
  currentSymbolSequence = [];
  document.getElementById("morse-pin").value = "";
  document.getElementById("verify-pin").style.display = "none";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData })
      })
        .then(res => res.json())
        .then(data => {
          if (!data.username) return alert("❌ Face not recognized");
          const new_pin = prompt("Enter new 4-digit Morse PIN (e.g., 1234):");
          if (!new_pin || new_pin.length !== 4) return alert("❌ Invalid PIN format");
          fetch("/api/reset-pin/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageData, new_pin })
          })
            .then(res => res.json())
            .then(data => {
              if (data.status === "success") {
                alert("🔁 PIN reset successfully");
              } else {
                alert("❌ Reset failed: " + data.message);
              }
            });
        });
    }, 3000);
  });
});

document.getElementById("login-btn").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const pin = document.getElementById("morse-pin").value.trim();

  if (!otpVerified || !pinVerified) return alert("Complete all steps before logging in.");

  const res = await fetch("/api/verify-login/", {
    method: "POST",
    body: JSON.stringify({ username, morse_pin: pin }),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();
  if (data.status === "success") {
    sessionStorage.setItem("autoLogout", "true");
    window.location.href = "https://myportfolio-5tb9.onrender.com/";
  } else {
    alert("❌ Login failed: " + data.message);
    await captureSnapshotAndAlert(username);
  }
});

async function captureSnapshotAndAlert(username) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for camera to warm up

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  const image = canvas.toDataURL("image/jpeg");
  stopCapture(stream);

  await fetch("/api/alert-admin/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image,
      username: username || "Unknown"
    })
  });
}
