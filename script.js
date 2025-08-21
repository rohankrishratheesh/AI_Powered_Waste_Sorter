// Use your Teachable Machine model
const TM_URL = "https://teachablemachine.withgoogle.com/models/bfIkKtBXS/";

let model = null;
let webcam = null;       // tmImage.Webcam instance
let rafId = null;        // requestAnimationFrame id

document.addEventListener("DOMContentLoaded", () => {
  const cameraBtn = document.getElementById("cameraBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const captureBtn = document.getElementById("captureBtn");
  const cameraSection = document.getElementById("cameraSection");
  const uploadSection = document.getElementById("uploadSection");
  const cameraCanvasContainer = document.getElementById("cameraCanvasContainer");
  const cameraPredictions = document.getElementById("cameraPredictions");
  const fileInput = document.getElementById("fileInput");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");
  const uploadedImage = document.getElementById("uploadedImage");
  const uploadPredictions = document.getElementById("uploadPredictions");

  // ---- Load TM model once
  async function loadModel() {
    const modelURL = TM_URL + "model.json";
    const metadataURL = TM_URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
  }

  // ---- Start / stop camera
  async function startCamera() {
    stopCamera(); 
    cameraCanvasContainer.innerHTML = `<div class="placeholder">Starting camera…</div>`;
    cameraPredictions.innerHTML = "";
    captureBtn.disabled = true;

    webcam = new tmImage.Webcam(420, 320, true);
    try {
      await webcam.setup({ facingMode: "environment" });
    } catch (e) {
      await webcam.setup();
    }
    await webcam.play();

    cameraCanvasContainer.innerHTML = "";
    cameraCanvasContainer.appendChild(webcam.canvas);

    previewLoop(); // live preview
    captureBtn.disabled = false;
  }

  function stopCamera() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (webcam) {
      try { webcam.stop(); } catch (_) {}
      webcam = null;
    }
    captureBtn.disabled = true;
  }

  function previewLoop() {
    if (!webcam) return;
    webcam.update();
    rafId = requestAnimationFrame(previewLoop);
  }

  // ---- Predict once from an element
  async function predictFromElement(el, outDiv) {
    if (!model) return;
    const preds = await model.predict(el);
    preds.sort((a, b) => b.probability - a.probability);

    const top = preds[0];

    outDiv.innerHTML = "";
    preds.forEach(p => {
      const prob = (p.probability * 100).toFixed(2);
      const row = document.createElement("div");
      if (p.className === top.className) {
        row.innerHTML = `<b style="color:green">${p.className}: ${prob}%</b>`;
      } else {
        row.textContent = `${p.className}: ${prob}%`;
      }
      outDiv.appendChild(row);
    });

    const icons = {
      "Compost": "🌱",
      "Recycle": "♻️",
      "E-Waste": "⚡",
      "Trash": "🗑️"
    };
    const final = document.createElement("div");
    final.style.marginTop = "12px";
    final.style.fontWeight = "700";
    final.style.fontSize = "18px";
    final.style.textAlign = "center";
    final.style.color = "#2563eb";
    final.textContent = `${icons[top.className] || "✅"} Detected Category: ${top.className}`;
    outDiv.appendChild(final);
  }

  // ---- Switch UI modes
  function setActiveMode(mode) {
    if (mode === "camera") {
      cameraBtn.classList.add("active");
      uploadBtn.classList.remove("active");
      cameraSection.style.display = "block";
      uploadSection.style.display = "none";
      startCamera();
    } else {
      uploadBtn.classList.add("active");
      cameraBtn.classList.remove("active");
      cameraSection.style.display = "none";
      uploadSection.style.display = "block";
      stopCamera();

      uploadPlaceholder.style.display = "flex";
      uploadedImage.style.display = "none";
      uploadedImage.src = "";
      uploadPredictions.innerHTML = "";
    }
  }

  // ---- Events
  cameraBtn.addEventListener("click", () => setActiveMode("camera"));
  uploadBtn.addEventListener("click", () => setActiveMode("upload"));

  captureBtn.addEventListener("click", async () => {
    if (webcam && model) {
      webcam.update();
      await predictFromElement(webcam.canvas, cameraPredictions);
    }
  });

  // ---- Upload flow (fixed: works on first click + first browse)
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    // Show preview in UI
    uploadedImage.src = url;
    uploadedImage.style.display = "block";
    uploadPlaceholder.style.display = "none";

    // Use a fresh hidden image for prediction
    const tempImg = new Image();
    tempImg.onload = async () => {
      await predictFromElement(tempImg, uploadPredictions);
      URL.revokeObjectURL(url);
      fileInput.value = ""; // allow same file again
    };
    tempImg.src = url;
  });

  // ---- Boot (default = Upload mode)
  (async function boot() {
    try {
      await loadModel();
      setActiveMode("upload");
    } catch (err) {
      alert("Failed to load model. Check your TM model URL in script.js");
      console.error(err);
    }
  })();
});
