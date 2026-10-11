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

/* Audit round 2: 📅 Daily Word Challenge -- 3 multiple-choice questions from chapters 1-5, the same
   set for everyone on a given day (seeded by the date), +3 coins the first time each day. */
(function dailyWords() {
  const grid = document.querySelector("#screen-landing .mode-grid");
  if (!grid) return;
  const day = new Date().toISOString().slice(0, 10);
  const done = () => { try { return localStorage.getItem("la_daily") === day; } catch (e) { return false; } };
  const b = document.createElement("button");
  b.type = "button"; b.className = "mode-card mode-mp"; b.style.gridColumn = "1 / -1";
  const paint = () => { b.innerHTML = `<div class="mode-icon">📅</div><div class="mode-title">Daily Word Challenge</div><div class="mode-sub">${done() ? "Done today ✓ — come back tomorrow" : "3 questions · +3 coins"}</div>`; };
  paint(); grid.appendChild(b);
  b.addEventListener("click", async () => {
    let bank; try { bank = (typeof QUESTION_BANK !== "undefined" && QUESTION_BANK) || await fetch("questions.json").then(r => r.json()); } catch (e) { return; }
    let seed = Number(day.replace(/-/g, ""));
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pool = bank.chapters.filter(c => c.id <= 5).flatMap(c => c.questions.filter(q => q.type === "mc" && Array.isArray(q.options)));
    const qs = []; while (qs.length < 3 && pool.length) qs.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px";
    document.body.appendChild(o);
    let i = 0, right = 0;
    const card = html => { o.innerHTML = `<div style="background:#fffdf5;border:3px solid #1b1b1b;max-width:380px;width:100%;padding:18px;font-family:inherit">${html}</div>`; };
    const ask = () => {
      if (i >= qs.length) {
        const first = !done(); if (first) { try { localStorage.setItem("la_daily", day); } catch (e) {} if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: 3 }).catch(() => {}); }
        card(`<div style="font-size:2.4rem;text-align:center">${right === 3 ? "🌟" : "📖"}</div><h3 style="text-align:center">${right}/3 right!</h3><p style="text-align:center">${first ? "+3 coins for today's challenge!" : "Today's coins were already collected."}</p><button type="button" id="la-dx" style="width:100%;padding:10px;font-weight:800;border:3px solid #1b1b1b;background:#6cc04a;color:#fff">Done</button>`);
        o.querySelector("#la-dx").onclick = () => { o.remove(); paint(); }; return;
      }
      const q = qs[i], opts = q.options.slice().sort(() => Math.random() - 0.5);
      card(`<div style="font-weight:800;opacity:.7">📅 Daily Word Challenge · ${i + 1}/3</div><p style="font-weight:800;font-size:1.05rem">${q.prompt.replace(/</g, "&lt;")}</p>${opts.map(x => `<button type="button" data-o="${String(x).replace(/"/g, "&quot;")}" style="display:block;width:100%;margin:6px 0;padding:10px;border:2px solid #1b1b1b;background:#fff;font-weight:700;text-align:left">${String(x).replace(/</g, "&lt;")}</button>`).join("")}<p id="la-dm" style="min-height:1.2em;font-weight:800"></p>`);
      o.querySelectorAll("[data-o]").forEach(btn => btn.onclick = () => {
        const ok = btn.dataset.o === String(q.answer);
        if (window.AIGLeaderboard && AIGLeaderboard.recordTopicAttempt) AIGLeaderboard.recordTopicAttempt("language-arts", "daily-words", ok);
        o.querySelectorAll("[data-o]").forEach(x => { x.disabled = true; if (x.dataset.o === String(q.answer)) x.style.background = "#c9f2b5"; });
        if (ok) right++; else btn.style.background = "#ffc4c4";
        o.querySelector("#la-dm").textContent = ok ? "✅ Yes!" : `It was “${q.answer}”.`;
        i++; setTimeout(ask, ok ? 900 : 1800);
      });
    };
    ask();
  });
})();
