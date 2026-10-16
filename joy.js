/* =====================================================================
   joy.js -- "bikin Azka senang" layer (2026-10). Loaded on demand by leaderboard.js
   (so every game that already loads leaderboard.js gets it; no per-page edits).
   - Parent message (Parent Portal "Send a Message"): shown live as a Bo toast inside games.
   - Fokus quota: N correct answers while Fokus Azka is ON unlocks M minutes of free play
     (set by the parent in the Parent Portal: players/{id}/focusQuota).
   - Settings synced from the Parent Portal into localStorage so games can read them
     synchronously: azka_quota_cfg, azka_school_words, azka_persona.
   - Small local counters (today vs yesterday, correct-in-a-row cheers).
   Everything is wrapped in try/catch: this file must never break a game.
   ===================================================================== */
(function () {
  "use strict";
  if (window.AIGJoy) return;
  const SRC = (document.currentScript && document.currentScript.src) || "";
  const BASE = SRC.replace(/joy\.js.*$/, "");
  const db = () => { try { return window.AIGLeaderboard && AIGLeaderboard.db; } catch (e) { return null; } };
  const me = () => { try { const p = window.AIGPlayer && AIGPlayer.getPlayer(); return p && p.role !== "parent" ? p : null; } catch (e) { return null; } };
  const ls = {
    raw: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    rawSet: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const pad = n => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const CFG_KEY = "azka_quota_cfg", PROG_KEY = "azka_quota_prog", FREE_KEY = "azka_free_until", FOCUS_KEY = "azka_focus";
  const focusOn = () => ls.raw(FOCUS_KEY) === "1";

  /* ------------------------------ UI helpers ------------------------------ */
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement("style");
    s.textContent = `
      .joy-toast{position:fixed;left:50%;top:10px;transform:translate(-50%,-140%);z-index:100000;max-width:min(92vw,440px);width:max-content;display:flex;gap:10px;align-items:center;
        background:#fff8e6;color:#3b2a1a;border:3px solid #1b1b1b;border-radius:14px;padding:8px 12px;box-shadow:0 6px 0 rgba(0,0,0,.25);font:700 14px/1.35 "Nunito",system-ui,sans-serif;
        transition:transform .45s cubic-bezier(.2,1.4,.4,1);cursor:pointer}
      .joy-toast.show{transform:translate(-50%,0)}
      .joy-toast img{width:42px;height:42px;border-radius:10px;flex:none}
      .joy-toast .joy-t b{display:block;font:800 12px "Nunito",sans-serif;color:#8a4b00;text-transform:uppercase;letter-spacing:.04em}
      .joy-toast .joy-x{margin-left:6px;opacity:.55;font-size:16px}
      .joy-over{position:fixed;inset:0;z-index:100001;background:rgba(20,10,40,.72);display:flex;align-items:center;justify-content:center;padding:18px}
      .joy-card{background:#fffaf0;color:#3b2a1a;border:4px solid #1b1b1b;border-radius:18px;max-width:420px;width:100%;padding:20px;text-align:center;box-shadow:0 8px 0 rgba(0,0,0,.35);font:700 15px/1.45 "Nunito",system-ui,sans-serif}
      .joy-card h2{margin:6px 0 8px;font:800 22px "Baloo 2","Nunito",sans-serif}
      .joy-card .joy-big{font-size:54px;line-height:1}
      .joy-btn{margin-top:14px;border:3px solid #1b1b1b;background:#f5b53b;color:#1b1b1b;border-radius:12px;padding:10px 18px;font:800 16px "Baloo 2","Nunito",sans-serif;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.3)}
      .joy-btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.3)}
      .joy-confetti{position:fixed;top:-20px;font-size:22px;z-index:100002;pointer-events:none;animation:joyFall 2.2s linear forwards}
      @keyframes joyFall{to{transform:translateY(110vh) rotate(540deg);opacity:.9}}`;
    document.head.appendChild(s);
  }
  function confetti(n = 36) {
    css();
    const em = ["🎉", "⭐", "✨", "🎈", "💛", "🌟"];
    for (let i = 0; i < n; i++) {
      const e = document.createElement("div"); e.className = "joy-confetti"; e.textContent = em[i % em.length];
      e.style.left = Math.random() * 100 + "vw"; e.style.animationDelay = (Math.random() * 0.8).toFixed(2) + "s"; e.style.fontSize = (16 + Math.random() * 18) + "px";
      document.body.appendChild(e); setTimeout(() => e.remove(), 3400);
    }
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  function toast(titleHtml, bodyHtml, ms = 9000, onClose) {
    if (!document.body) return;
    css();
    const t = document.createElement("div"); t.className = "joy-toast";
    t.innerHTML = `<img src="${BASE}icon-192.png" alt=""><div class="joy-t"><b>${titleHtml}</b>${bodyHtml}</div><span class="joy-x">✕</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
    let done = false;
    const close = () => { if (done) return; done = true; t.classList.remove("show"); setTimeout(() => t.remove(), 500); if (onClose) onClose(); };
    t.addEventListener("click", close);
    if (ms) setTimeout(close, ms);
    return close;
  }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------- Parent message, shown live in games ------------------------
     The Parent Portal's "Send a Message" writes players/{id}/parentMessage {text, sentAt, read}; the hub shows it once on its
     landing screen. Here, any OTHER page (a game) also shows it right away as a Bo toast, even if it arrives mid-play. */
  const isHub = () => { try { const hubPath = new URL(BASE).pathname.replace(/\/+$/, ""); return location.pathname.replace(/\/(index\.html)?$/, "") === hubPath; } catch (e) { return false; } };
  function watchMessage() {
    const p = me(); if (!p || !db() || isHub()) return;
    try {
      db().ref(`players/${p.id}/parentMessage`).on("value", snap => {
        const v = snap.val();
        if (!v || v.read || !v.text || Date.now() - (v.sentAt || 0) > 7 * 86400000) return;
        try { snap.ref.child("read").set(true); } catch (e) {}
        buzz([60, 40, 60]); confetti(18);
        toast("💌 Pesan untukmu!", esc(v.text), 15000);
      });
    } catch (e) {}
  }

  /* ----------------------------- Remote settings --------------------------- */
  async function syncRemote(force) {
    const p = me(); if (!p || !db()) return;
    const last = Number(ls.raw("joy_sync_at") || 0);
    if (!force && Date.now() - last < 2 * 60 * 1000) return;
    try {
      const [q, w, pe] = await Promise.all([db().ref(`players/${p.id}/focusQuota`).get(), db().ref(`players/${p.id}/schoolWords`).get(), db().ref(`players/${p.id}/persona`).get()]);
      ls.set(CFG_KEY, q.exists() ? q.val() : null);
      ls.set("azka_school_words", w.exists() ? ((w.val() || {}).list || []) : []);
      ls.set("azka_persona", pe.exists() ? pe.val() : null);
      ls.rawSet("joy_sync_at", String(Date.now()));
      emit();
    } catch (e) {}
  }
  const emit = () => { try { window.dispatchEvent(new Event("joy-change")); } catch (e) {} };

  /* --------------------------------- Quota -------------------------------- */
  const cfg = () => { const c = ls.get(CFG_KEY, null); return c && c.enabled ? { target: Math.max(1, c.target | 0 || 30), freeMin: Math.max(1, c.freeMin | 0 || 20) } : null; };
  const prog = () => { const p = ls.get(PROG_KEY, null); return p && p.d === dayKey() ? p : { d: dayKey(), n: 0 }; };
  const freeLeftMs = () => Math.max(0, Number(ls.raw(FREE_KEY) || 0) - Date.now());
  function quotaLine() {
    const c = cfg();
    if (!c) return "";
    const left = freeLeftMs();
    if (left > 0) { const s = Math.ceil(left / 1000); return `🎉 Waktu bebas: sisa ${Math.floor(s / 60)}:${pad(s % 60)}`; }
    if (focusOn()) return `🎯 Target hari ini: ${Math.min(prog().n, c.target)}/${c.target} benar → ${c.freeMin} menit main bebas`;
    return "";
  }
  function grantFree(c) {
    ls.set(PROG_KEY, { d: dayKey(), n: 0 });
    ls.rawSet(FREE_KEY, String(Date.now() + c.freeMin * 60000));
    ls.rawSet(FOCUS_KEY, "0");
    css(); confetti(60); buzz([120, 60, 120, 60, 200]);
    const o = document.createElement("div"); o.className = "joy-over";
    o.innerHTML = `<div class="joy-card"><div class="joy-big">🎉</div><h2>Target tercapai!</h2><div>Hebat, Azka! Kamu dapat <b>${c.freeMin} menit main bebas</b>. Semua game terbuka.</div><button class="joy-btn" type="button">Main bebas! 🚀</button></div>`;
    document.body.appendChild(o);
    o.querySelector("button").onclick = () => { try { location.reload(); } catch (e) { o.remove(); } };
    emit();
  }
  function timeUp() {
    ls.rawSet(FREE_KEY, "0"); try { localStorage.removeItem(FREE_KEY); } catch (e) {}
    ls.rawSet(FOCUS_KEY, "1");
    css();
    const o = document.createElement("div"); o.className = "joy-over";
    o.innerHTML = `<div class="joy-card"><div class="joy-big">⏰</div><h2>Waktu bebas habis</h2><div>Seru ya! Yuk balik ke Fokus Azka dulu, kumpulkan target lagi.</div><button class="joy-btn" type="button">Oke! ⭐</button></div>`;
    document.body.appendChild(o);
    o.querySelector("button").onclick = () => { try { location.href = BASE; } catch (e) { o.remove(); } };
    emit();
  }
  function tick() {
    try {
      const fu = Number(ls.raw(FREE_KEY) || 0);
      if (fu && Date.now() > fu) { if (cfg()) timeUp(); else try { localStorage.removeItem(FREE_KEY); } catch (e) {} }
      const el = document.getElementById("lib-quota-line");
      if (el) { const t = quotaLine(); el.textContent = t; el.style.display = t ? "block" : "none"; }
    } catch (e) {}
  }

  /* ----------------------- Per-answer hook (from leaderboard.js) ------------ */
  let inRow = 0;
  function daily() { return ls.get("joy_daily", {}); }
  function bumpDaily() {
    const d = daily(), k = dayKey(); d[k] = (d[k] || 0) + 1;
    const keys = Object.keys(d).sort(); while (keys.length > 14) delete d[keys.shift()];
    ls.set("joy_daily", d);
  }
  function onAnswer(game, topic, ok) {
    try {
      if (!me()) return;
      if (!ok) { inRow = 0; return; }
      inRow++; bumpDaily();
      if (inRow > 0 && inRow % 5 === 0) { buzz(40); toast("🔥 Beruntun!", `${inRow} jawaban benar berturut-turut. Keren!`, 3500); }
      const c = cfg();
      if (c && focusOn()) {
        const p = prog(); p.n++; ls.set(PROG_KEY, p); tick(); emit();
        if (p.n >= c.target) grantFree(c);
      }
    } catch (e) {}
  }

  /* ---------------------------------- boot -------------------------------- */
  function boot() {
    try {
      if (!me()) return;
      watchMessage();
      syncRemote(false);
      tick();
      setInterval(tick, 1000);
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 1200)); else setTimeout(boot, 1200);

  window.AIGJoy = {
    BASE, onAnswer, quotaLine, toast, confetti, syncRemote, dayKey,
    daily, quotaConfig: cfg, quotaProgress: () => prog().n, freeLeftMs,
    schoolWords: () => { const l = ls.get("azka_school_words", []); return Array.isArray(l) ? l : []; },
    persona: () => ls.get("azka_persona", null)
  };
})();
