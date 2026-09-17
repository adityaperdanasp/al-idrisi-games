/* =================================================================
   SHARE CARD — a small reusable canvas-based "result card" a kid can
   preview and download as a PNG to show off a game result. Deliberately
   client-side only (canvas.toBlob -> local object-URL download), no
   upload/sharing to any external service. Self-contained: injects its
   own <style> on first use, so any page can just include this script
   and call AIGShareCard.openPreview(opts) with no extra CSS wiring.
   ================================================================= */
window.AIGShareCard = (function () {
  const W = 640, H = 640;

  function injectStyleOnce() {
    if (document.getElementById("aig-share-card-style")) return;
    const style = document.createElement("style");
    style.id = "aig-share-card-style";
    style.textContent = `
      .aig-share-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(20, 24, 40, 0.72);
        display: flex; align-items: center; justify-content: center;
        padding: 20px; box-sizing: border-box;
      }
      .aig-share-card-wrap {
        background: #fff; border-radius: 20px; padding: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        max-width: 92vw;
      }
      .aig-share-canvas {
        display: block; width: min(78vw, 360px); height: auto;
        border-radius: 14px;
      }
      .aig-share-actions {
        display: flex; gap: 10px; margin-top: 14px;
      }
      .aig-share-actions button {
        flex: 1; border: none; border-radius: 100px;
        padding: 12px 14px; font-family: "Baloo 2", "Fredoka", system-ui, sans-serif;
        font-weight: 800; font-size: 0.95rem; cursor: pointer;
      }
      .aig-share-download {
        background: linear-gradient(135deg, #5b8def, #3a6fd8);
        color: #fff;
      }
      .aig-share-close {
        background: #eef1f8; color: #445;
      }
    `;
    document.head.appendChild(style);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // opts: { emoji, title, name, lines: [string...], accent: "#hex" }
  function drawCard(canvas, opts) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const accent = opts.accent || "#5b8def";

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, accent);
    bg.addColorStop(1, "#22315c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const pad = 28;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = "88px system-ui, -apple-system, sans-serif";
    ctx.fillText(opts.emoji || "🏆", W / 2, 190);

    ctx.font = "800 32px 'Baloo 2', system-ui, sans-serif";
    ctx.fillStyle = "#22315c";
    ctx.fillText(opts.title || "BrainBox", W / 2, 250);

    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillStyle = "#5c6f8a";
    ctx.fillText(opts.name || "", W / 2, 288);

    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillStyle = "#2b2b2b";
    (opts.lines || []).forEach((line, i) => {
      ctx.fillText(line, W / 2, 360 + i * 48);
    });

    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillStyle = "#9aa6bb";
    ctx.fillText("playalidrisi.fun — BrainBox", W / 2, H - 56);

    return canvas;
  }

  function openPreview(opts) {
    injectStyleOnce();
    const overlay = document.createElement("div");
    overlay.className = "aig-share-overlay";
    overlay.innerHTML = `
      <div class="aig-share-card-wrap">
        <canvas class="aig-share-canvas"></canvas>
        <div class="aig-share-actions">
          <button type="button" class="aig-share-download">📥 Save Image</button>
          <button type="button" class="aig-share-close">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector(".aig-share-canvas");
    drawCard(canvas, opts);

    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector(".aig-share-close").onclick = () => overlay.remove();
    overlay.querySelector(".aig-share-download").onclick = () => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "brainbox-result.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, "image/png");
    };
  }

  return { openPreview };
})();
