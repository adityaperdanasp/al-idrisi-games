/* =================================================================
   Audit batch 11 -- Language & Arts menu additions, kept in their own
   file (loaded after script.js) so script.js stays untouched:
   - 🌉 Glass Bridge as a real menu card (it used to live only behind the
     animated banner on the chapter trail, which kids rarely noticed).
   - ▶ Continue: jumps straight into the next chapter that still needs
     stars, so a kid doesn't have to hunt for where they left off.
   Uses script.js's globals (QUESTION_BANK, PROGRESS, startChapter,
   launchGlassBridge, showScreen); paths stay relative so this works on
   both playalidrisi.fun/azkacraft/ and the standalone azkasocial.fun.
   ================================================================= */
(function () {
  const grid = document.querySelector("#screen-landing .mode-grid");
  if (!grid) return;
  const card = (id, cls, icon, title, sub) => {
    const b = document.createElement("button");
    b.id = id; b.type = "button"; b.className = "mode-card " + cls;
    b.innerHTML = `<div class="mode-icon">${icon}</div><div class="mode-title">${title}</div><div class="mode-sub" id="${id}-sub">${sub}</div>`;
    grid.appendChild(b); return b;
  };
  const glass = card("btn-glass-menu", "mode-solo", "🌉", "Glass Bridge", "Cross 10 glass tiles");
  const cont = card("btn-continue-menu", "mode-mp", "▶️", "Continue", "Your next chapter");
  glass.addEventListener("click", () => {
    if (typeof launchGlassBridge === "function") launchGlassBridge();
    else { const b = document.getElementById("bo-bridge-banner"); if (b) b.click(); }
  });
  function nextChapter() {
    try {
      const chs = (QUESTION_BANK && QUESTION_BANK.chapters) || [];
      return chs.find(c => !((PROGRESS.chapters[c.id] || {}).stars >= 3)) || chs[0] || null;
    } catch (e) { return null; }
  }
  function paint() {
    const ch = nextChapter();
    const sub = document.getElementById("btn-continue-menu-sub");
    if (sub) sub.textContent = ch ? `Chapter ${ch.id}: ${ch.title || ch.name || ""}`.trim() : "Your next chapter";
  }
  cont.addEventListener("click", () => {
    const ch = nextChapter();
    if (!ch) { if (typeof showScreen === "function") showScreen("screen-map", { flip: true }); return; }
    try { multiplayer = null; } catch (e) {}
    startChapter(ch.id);
  });
  setTimeout(paint, 800); setTimeout(paint, 2500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) paint(); });
})();
