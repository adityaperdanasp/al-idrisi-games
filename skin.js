/* =================================================================
   AIGSkin (PM round 10, items 1/5/6/7/10) -- the global "look" layer.
   One tiny script every page can include; reads the player's equipped
   cosmetics once (cached in localStorage so the next page paints
   instantly) and applies:
     - world theme ambience: soft tint + drifting themed emoji over the page
     - touch trail: emoji left behind a moving finger/cursor
     - answer effect: the burst a correct answer sets off (juice.js calls
       AIGSkin.onAnswer)
     - combo sticker: the equipped sticker pops up on every 5th correct in a row
     - Bo hat: perches the equipped hat on every Bo avatar it can find
   Everything is decorative and wrapped in try/catch -- it must never be
   able to break a game. Honors prefers-reduced-motion (no ambience, no
   trail, no bursts) and aig_skin_off=1 in localStorage.
   ================================================================= */
(function () {
  const KEY = "aig_skin_prefs";
  const DEFAULTS = { theme: "default", trail: "none", answerFx: "default", sticker: "", boHat: "none", boHatEmoji: "" };
  let prefs = Object.assign({}, DEFAULTS);
  let lastX = window.innerWidth / 2, lastY = window.innerHeight * 0.6;

  const AMBIENT = {
    space: { icons: ["✨", "⭐", "🪐", "☄️"], tint: "rgba(90,60,200,.10)" },
    beach: { icons: ["🐚", "🌊", "🦀", "☀️"], tint: "rgba(80,200,220,.08)" },
    sunset: { icons: ["🌇", "🕊️", "✨"], tint: "rgba(255,120,100,.09)" },
    ocean: { icons: ["🫧", "🐠", "🐟", "🫧", "🐙"], tint: "rgba(20,110,200,.12)" },
    forest: { icons: ["🍃", "🦋", "🍄", "🍃"], tint: "rgba(40,150,70,.10)" },
    neon: { icons: ["💜", "⚡", "🔷", "✦"], tint: "rgba(150,40,220,.13)" },
    candy: { icons: ["🍬", "🍭", "🧁", "🍩"], tint: "rgba(255,120,190,.10)" },
    arctic: { icons: ["❄️", "🧊", "⛄", "❄️"], tint: "rgba(150,210,255,.14)" },
    volcano: { icons: ["🔥", "🌋", "✨", "🔥"], tint: "rgba(255,80,20,.12)" }
  };
  const TRAILS = {
    stars: ["⭐", "✨", "🌟"], hearts: ["❤️", "💖", "💗"], fire: ["🔥", "🔥", "✨"],
    bubbles: ["🫧", "🫧", "○"], snow: ["❄️", "❄️", "•"], rainbow: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"]
  };
  const BURSTS = {
    default: ["✨", "⭐"], hearts: ["💖", "💗", "💕", "❤️"], stars: ["🌠", "⭐", "🌟", "✨"],
    fireworks: ["🎆", "🎇", "✨", "💥"], animals: ["🐶", "🐱", "🐼", "🦊", "🐸", "🦄"],
    rainbow: ["🌈", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣"]
  };

  function off() { try { return localStorage.getItem("aig_skin_off") === "1"; } catch (e) { return false; } }
  function reduced() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }

  function ensureStyle() {
    if (document.getElementById("aig-skin-style")) return;
    const st = document.createElement("style");
    st.id = "aig-skin-style";
    st.textContent = `
      #aig-world{position:fixed;inset:0;z-index:3;pointer-events:none;overflow:hidden}
      .aig-amb{position:absolute;top:-8%;opacity:.0;animation:aigDrift linear infinite;will-change:transform,opacity}
      @keyframes aigDrift{0%{transform:translate(0,-6vh) rotate(0);opacity:0}12%{opacity:.55}88%{opacity:.5}100%{transform:translate(var(--dx,20px),112vh) rotate(var(--rot,180deg));opacity:0}}
      .aig-trail{position:fixed;z-index:99998;pointer-events:none;transform:translate(-50%,-50%);animation:aigTrail .7s ease-out forwards;will-change:transform,opacity}
      @keyframes aigTrail{0%{opacity:.95;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--tx,0px)),calc(-50% + var(--ty,30px))) scale(.3)}}
      .aig-burst{position:fixed;z-index:99999;pointer-events:none;transform:translate(-50%,-50%);animation:aigBurst .9s cubic-bezier(.15,.8,.3,1) forwards;will-change:transform,opacity}
      @keyframes aigBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(calc(-50% + var(--bx)),calc(-50% + var(--by))) scale(1.15) rotate(var(--br,0deg))}}
      .aig-sticker{position:fixed;left:50%;top:26%;z-index:99999;pointer-events:none;font-size:5.5rem;transform:translate(-50%,-50%);animation:aigSticker 1.5s cubic-bezier(.2,1.4,.4,1) forwards;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25))}
      @keyframes aigSticker{0%{opacity:0;transform:translate(-50%,-30%) scale(.2) rotate(-25deg)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(8deg)}40%{transform:translate(-50%,-50%) scale(1) rotate(-4deg)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%) scale(1) rotate(0)}}
      .aig-bo-hat{position:absolute;transform:translateX(-50%) rotate(-9deg);pointer-events:none;line-height:1;z-index:5}
    `;
    document.head.appendChild(st);
  }

  // ---- world ambience -------------------------------------------------
  function applyWorld() {
    const old = document.getElementById("aig-world");
    if (old) old.remove();
    const cfg = AMBIENT[prefs.theme];
    if (!cfg || reduced() || off() || !document.body) return;
    ensureStyle();
    const layer = document.createElement("div");
    layer.id = "aig-world";
    layer.style.background = `radial-gradient(ellipse at 50% 0%, ${cfg.tint}, transparent 70%)`;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("span");
      s.className = "aig-amb";
      s.textContent = cfg.icons[i % cfg.icons.length];
      s.style.left = (4 + Math.random() * 92) + "%";
      s.style.fontSize = (14 + Math.random() * 16) + "px";
      s.style.animationDuration = (11 + Math.random() * 11) + "s";
      s.style.animationDelay = (-Math.random() * 18) + "s";
      s.style.setProperty("--dx", (Math.random() * 80 - 40) + "px");
      s.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
  }

  // ---- touch trail ----------------------------------------------------
  let lastTrail = 0, trailCount = 0, trailIdx = 0, trailBound = false;
  function onMove(e) {
    lastX = e.clientX; lastY = e.clientY;
    if (prefs.trail === "none" || !TRAILS[prefs.trail] || reduced() || off()) return;
    const now = performance.now();
    if (now - lastTrail < 55 || trailCount > 36) return;
    lastTrail = now;
    const icons = TRAILS[prefs.trail];
    const el = document.createElement("span");
    el.className = "aig-trail";
    el.textContent = icons[trailIdx++ % icons.length];
    el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px";
    el.style.fontSize = (12 + Math.random() * 10) + "px";
    el.style.setProperty("--tx", (Math.random() * 30 - 15) + "px");
    el.style.setProperty("--ty", (prefs.trail === "fire" ? -30 : 26 + Math.random() * 20) + "px");
    document.body.appendChild(el);
    trailCount++;
    setTimeout(() => { el.remove(); trailCount--; }, 720);
  }
  function bindTrail() {
    if (trailBound) return;
    trailBound = true;
    window.addEventListener("pointermove", e => { try { onMove(e); } catch (err) { /* decorative */ } }, { passive: true });
    window.addEventListener("pointerdown", e => { lastX = e.clientX; lastY = e.clientY; }, { passive: true });
  }

  // ---- answer burst + combo sticker -----------------------------------
  function burst(x, y) {
    const icons = BURSTS[prefs.answerFx] || BURSTS.default;
    const n = prefs.answerFx === "fireworks" ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      el.className = "aig-burst";
      el.textContent = icons[i % icons.length];
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 50 + Math.random() * 70;
      el.style.left = x + "px"; el.style.top = y + "px";
      el.style.fontSize = (16 + Math.random() * 14) + "px";
      el.style.setProperty("--bx", Math.cos(a) * d + "px");
      el.style.setProperty("--by", Math.sin(a) * d + "px");
      el.style.setProperty("--br", (Math.random() * 240 - 120) + "deg");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 950);
    }
  }
  function popSticker() {
    if (!prefs.sticker) return;
    const el = document.createElement("div");
    el.className = "aig-sticker";
    el.textContent = prefs.sticker;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1550);
  }
  // combo = streak BEFORE this answer (same meaning as AIGJuice.answer's arg).
  function onAnswer(isCorrect, combo) {
    try {
      if (!isCorrect || off() || reduced() || !document.body) return;
      ensureStyle();
      // The default sparkle stays quiet for ordinary answers (it'd be noise
      // on every tap); a purchased effect fires every time, since that's
      // what it was bought for.
      if (prefs.answerFx !== "default" || (combo || 0) >= 2) burst(lastX, lastY);
      if (((combo || 0) + 1) % 5 === 0) popSticker();
    } catch (e) { /* decorative */ }
  }

  // ---- Bo hat -----------------------------------------------------------
  // Every Bo avatar is the app-icon image (or the hub's inline SVG hero), so
  // the hat is dropped in as a SIBLING right after it (an <img>/<svg> can't
  // hold children) and positioned from the avatar's own offsets.
  const BO_SELECTORS = 'img[src$="icon-192.png"], #sc-hero-icon';
  function applyHat() {
    document.querySelectorAll(".aig-bo-hat").forEach(h => h.remove());
    if (!prefs.boHatEmoji || off()) return;
    ensureStyle();
    document.querySelectorAll(BO_SELECTORS).forEach(el => {
      const host = el.parentElement;
      const er = el.getBoundingClientRect();
      const w = er.width;
      if (!host || w < 18 || w > 260) return;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const size = Math.round(w * 0.5);
      const h = document.createElement("span");
      h.className = "aig-bo-hat";
      h.textContent = prefs.boHatEmoji;
      h.style.fontSize = size + "px";
      const hr = host.getBoundingClientRect();
      h.style.left = (er.left - hr.left + host.scrollLeft + w / 2) + "px";
      h.style.top = (er.top - hr.top + host.scrollTop - size * 0.55) + "px";
      el.after(h);
    });
  }
  let hatTimer = null;
  function watchHat() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(() => {
      if (!prefs.boHatEmoji) return;
      clearTimeout(hatTimer);
      hatTimer = setTimeout(() => {
        const need = [...document.querySelectorAll(BO_SELECTORS)].some(el => el.getBoundingClientRect().width >= 18 && el.getBoundingClientRect().width <= 260 && !(el.nextElementSibling && el.nextElementSibling.classList.contains("aig-bo-hat")));
        if (need) applyHat();
      }, 600);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function applyAll() {
    try { applyWorld(); } catch (e) {}
    try { bindTrail(); } catch (e) {}
    try { applyHat(); } catch (e) {}
  }
  function load() {
    try { const c = JSON.parse(localStorage.getItem(KEY) || "null"); if (c) prefs = Object.assign({}, DEFAULTS, c); } catch (e) {}
    applyAll();
    watchHat();
    let tries = 0;
    (function fetchFresh() {
      if (window.AIGLeaderboard && AIGLeaderboard.getSkinPrefs) {
        AIGLeaderboard.getSkinPrefs().then(p => {
          prefs = Object.assign({}, DEFAULTS, p);
          try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
          applyAll();
        }).catch(() => {});
      } else if (tries++ < 40) setTimeout(fetchFresh, 250);
    })();
  }
  // Pages call this after buying/equipping something so it shows immediately.
  function refresh() {
    if (!(window.AIGLeaderboard && AIGLeaderboard.getSkinPrefs)) return Promise.resolve();
    return AIGLeaderboard.getSkinPrefs().then(p => {
      prefs = Object.assign({}, DEFAULTS, p);
      try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
      applyAll();
    }).catch(() => {});
  }

  window.AIGSkin = { onAnswer, refresh, popSticker, burst: (x, y) => burst(x == null ? lastX : x, y == null ? lastY : y), get prefs() { return prefs; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
