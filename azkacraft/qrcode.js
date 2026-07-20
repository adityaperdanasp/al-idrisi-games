// AzkaSocial — QR code generation and scanning for Multiplayer pairing.
// Generation uses the qrcodejs CDN library (loaded in index.html).
// Scanning uses the device camera via getUserMedia + the jsQR CDN library
// (also loaded in index.html) so a friend can join by pointing their phone
// camera instead of typing the 6-character code.

function renderPairingQR(containerEl, code) {
  containerEl.innerHTML = "";
  if (typeof QRCode === "undefined") {
    containerEl.textContent = "QR unavailable — use the code above instead.";
    return;
  }
  const joinUrl = `${location.origin}${location.pathname}?join=${code}`;
  new QRCode(containerEl, {
    text: joinUrl,
    width: 180,
    height: 180,
    colorDark: "#1266d8",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}

let scanStream = null;
let scanRAF = null;

async function startQRScan(videoEl, canvasEl, onResult, onError) {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
  } catch (err) {
    if (onError) onError(err);
    return;
  }

  videoEl.srcObject = scanStream;
  await videoEl.play();

  const ctx = canvasEl.getContext("2d");

  function tick() {
    if (!scanStream) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);

      if (typeof jsQR !== "undefined") {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const match = code.data.match(/[?&]join=([A-Z0-9]{6})/i);
          const pairingCode = match ? match[1].toUpperCase() : null;
          if (pairingCode) {
            stopQRScan();
            onResult(pairingCode);
            return;
          }
        }
      }
    }
    scanRAF = requestAnimationFrame(tick);
  }
  tick();
}

function stopQRScan() {
  if (scanRAF) cancelAnimationFrame(scanRAF);
  scanRAF = null;
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
}

window.AzkaQR = { renderPairingQR, startQRScan, stopQRScan };
