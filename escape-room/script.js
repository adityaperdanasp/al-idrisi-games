/* =================================================================
   Escape the Vault -- round 1 polish (30 items). Every door now has its
   OWN kind of lock (combo / rapid / dial / no-mistake / boss), time is a
   live resource (right answers add seconds, wrong ones cost seconds and
   raise an alarm), and the run is full of choices: items, red/blue doors,
   traps, a secret room and mini-puzzles. Run structure (lock order, items
   found, traps, artifact drops) is seeded, so "Same seed" replays the
   exact same vault -- questions themselves stay random.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("er-signedout-overlay").classList.remove("hidden");
  document.getElementById("er-start-overlay").classList.add("hidden");
} else {
  initEscapeRoom();
}

function initEscapeRoom() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const CLASSIC_DOORS = 6;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const DIFFS = {
    easy: { dur: 420, timeWrong: 3, bonusNeed: 0, tierShift: -1, extraItem: "peek" },
    normal: { dur: 300, timeWrong: 5, bonusNeed: 0, tierShift: 0 },
    hard: { dur: 210, timeWrong: 6, bonusNeed: 1, tierShift: 1 }
  };
  const TIME_CORRECT = 1, FAST_MS = 3000, FAST_BONUS = 1; // small gains: a clean run still feels the clock
  const ALARM_MAX = 5, ALARM_FINE_SEC = 30, TRAP_CHANCE = 0.35;
  const LOCKS = {
    classic: { label: "🔒 Combo Lock -- 2 right in a row", need: 2, scales: true },
    nomistake: { label: "🚫 No-Mistake Lock -- 3 in a row", need: 3, scales: true, alarmExtra: 1 },
    rapid: { label: "⚡ Rapid Lock -- 3 right out of 4 (8s each)", need: 3, total: 4, qMs: 8000 },
    dial: { label: "🎰 Dial Lock -- 3 right, mistakes only cost time", need: 3, scales: true },
    boss: { label: "👹 Vault Boss -- break 3 bolts (10s each)", need: 3, qMs: 10000, wrongExtra: 3 }
  };
  const ROOM_THEMES = [
    { name: "The Library", emoji: "📚", subject: "lang", flavor: "Dusty books whisper behind the lock." },
    { name: "The Lab", emoji: "🔬", subject: "sci", flavor: "Beakers bubble beside a humming lock." },
    { name: "The Engine Room", emoji: "⚙️", subject: "math", flavor: "Gears grind somewhere inside the wall." },
    { name: "The Dungeon", emoji: "🕯️", subject: "mixed", flavor: "Candlelight flickers on cold stone." },
    { name: "The Archive", emoji: "🗄️", subject: "mixed", flavor: "Endless cabinets and one locked door." },
    { name: "The Vault Core", emoji: "🏦", subject: "mixed", flavor: "The final door -- freedom is close!" }
  ];
  const ITEMS = {
    fifty: { emoji: "🎯", name: "50/50", hint: true },
    peek: { emoji: "🔍", name: "Peek", hint: true },
    clock: { emoji: "⏱️", name: "+15s", hint: true },
    key: { emoji: "🔑", name: "Spare Key" },
    torch: { emoji: "🔦", name: "Torch" },
    skip: { emoji: "🗝️", name: "Skip Door", hint: true }
  };
  const FINDABLE = ["fifty", "peek", "clock", "key", "torch"];
  const ARTIFACTS = ["🏺", "📜", "💎", "👑", "🗿", "⚱️", "🪙", "🧭", "🔮", "⚔️", "🛡️", "📿"];
  const KEYS = { sound: "aig_er_sound", haptics: "aig_er_haptics", reduced: "aig_er_reduced", tutorial: "aig_er_tutorial_seen", isNew: "aig_er_round1_seen", history: "aig_er_history", artifacts: "aig_er_artifacts", achSeen: "aig_er_ach_seen" };

  const $ = id => document.getElementById(id);
  const page = $("er-page"), vault = $("er-vault"), doorEl = $("er-door"), lockEl = $("er-lock");
  const hudTimer = $("er-hud-timer"), hudRoom = $("er-hud-room"), hudTotal = $("er-hud-total"), hudScore = $("er-hud-score"), hudTurn = $("er-hud-turn");
  const alarmFill = $("er-alarm-fill"), alarmEl = $("er-alarm"), roomTrack = $("er-room-track"), comboDotsEl = $("er-combo-dots");
  const boEl = $("er-bo");

  // ---- settings ------------------------------------------------------------
  function flag(key, def) { try { const v = localStorage.getItem(key); return v === null ? def : v === "1"; } catch (e) { return def; } }
  function setFlag(key, on) { try { localStorage.setItem(key, on ? "1" : "0"); } catch (e) {} }
  const soundOn = () => flag(KEYS.sound, true), hapticsOn = () => flag(KEYS.haptics, true);
  function motionReduced() {
    return flag(KEYS.reduced, false) || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function applyMotion() { document.documentElement.classList.toggle("er-reduced", motionReduced()); }
  applyMotion();
  function vib(p) { try { if (hapticsOn() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  // ---- synthesized sound effects (item 19/20) -------------------------------
  let ctx = null;
  function tone(freqs, dur, vol, type) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === "suspended") ctx.resume();
      let t = ctx.currentTime;
      freqs.forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
        t += dur * 0.6;
      });
    } catch (e) {}
  }
  function noise(dur, vol, freq) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === "suspended") ctx.resume();
      const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 600;
      const g = ctx.createGain(); g.gain.value = vol || 0.2;
      src.connect(f).connect(g).connect(ctx.destination); src.start();
    } catch (e) {}
  }
  const sfx = {
    click: () => tone([660], 0.06, 0.09),
    unlock: () => tone([523, 659, 784], 0.12, 0.12),
    clunk: () => { noise(0.35, 0.28, 280); tone([110], 0.35, 0.2, "sine"); },
    wrong: () => tone([190, 150], 0.16, 0.12, "sawtooth"),
    alarm: () => tone([880, 660, 880, 660], 0.12, 0.13, "square"),
    tick: () => tone([1000], 0.04, 0.05),
    heart: () => { tone([90], 0.1, 0.22, "sine"); setTimeout(() => tone([80], 0.1, 0.18, "sine"), 160); },
    item: () => tone([784, 988], 0.1, 0.1),
    win: () => tone([523, 659, 784, 1046], 0.18, 0.14),
    fail: () => tone([300, 220, 160], 0.25, 0.12, "sawtooth")
  };

  // ---- state ----------------------------------------------------------------
  const state = {
    mode: "classic", diff: "normal", selMode: "classic", selDiff: "normal",
    seed: 1, rng: null, locks: [],
    room: 0, lockType: "classic", combo: 0, asked: 0, correctInDoor: 0, wrongInDoor: 0, path: "blue",
    secondsLeft: 300, elapsed: 0, timerId: null, paused: false, ended: false, running: false,
    score: 0, scoreAnswers: 0, scoreDoors: 0, scoreExtra: 0, streak: 0, alarm: 0,
    inv: {}, hintsUsed: 0, nextTrap: null, keyArmed: false, cleanDoors: 0, anyWrongRun: false, secretUsed: false, bossBeaten: false,
    turn: 1, coopCorrect: { 1: 0, 2: 0 }, reviewLog: [], artifactsFound: [],
    currentQ: null, qShownAt: 0, qTimerId: null, answered: false, lastBoAt: 0, lockEmoji: "🔒", puzTimers: []
  };
  function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rng = () => (state.rng ? state.rng() : Math.random());
  const doorTotal = () => (state.mode === "endless" ? Infinity : CLASSIC_DOORS);

  // ---- cosmetics (item 26) -----------------------------------------------------
  const lockPreviews = { default: "🔒" };
  function applyTheme(id) { vault.dataset.theme = id; }
  function applyLockSkin(id) { state.lockEmoji = lockPreviews[id] || "🔒"; if (!state.running) lockEl.textContent = state.lockEmoji; }
  function renderSwatches(containerId, catalogKey, applyFn, previewMap) {
    const wrap = $(containerId);
    if (!window.AIGLeaderboard || !AIGLeaderboard.getCosmetics) { wrap.innerHTML = ""; return; }
    AIGLeaderboard.getCosmetics().then(cos => {
      const catalog = cos.costumes[catalogKey], equipped = cos.equippedCostumes[catalogKey];
      const owned = catalog.filter(c => c.owned);
      owned.forEach(c => { if (previewMap) previewMap[c.id] = c.preview; });
      wrap.innerHTML = owned.map(c => `<button type="button" class="er-swatch ${c.id === equipped ? "sel" : ""}" data-id="${c.id}" title="${c.name}">${c.preview}</button>`).join("");
      wrap.querySelectorAll(".er-swatch").forEach(b => b.onclick = async () => {
        await AIGLeaderboard.equipCosmetic(catalogKey, b.dataset.id);
        applyFn(b.dataset.id);
        renderSwatches(containerId, catalogKey, applyFn, previewMap);
      });
      const cur = owned.find(c => c.id === equipped);
      if (cur) applyFn(cur.id);
    }).catch(() => {});
  }
  renderSwatches("er-theme-swatches", "escapevault-theme", applyTheme, null);
  renderSwatches("er-lock-swatches", "escapevault-lock", applyLockSkin, lockPreviews);

  // ---- lifetime, history, achievements, album (items 23-25) ---------------------
  function loadJson(key, def) { try { return JSON.parse(localStorage.getItem(key) || "null") || def; } catch (e) { return def; } }
  function renderHistory() {
    const h = loadJson(KEYS.history, []);
    $("er-history").innerHTML = h.map(m => `<i class="${m.win ? "win" : "lose"}" title="${m.doors} doors, ${m.score} pts">${m.doors}</i>`).join("");
  }
  function renderAch(containerId, list) {
    $(containerId).innerHTML = (list || []).map(a => `<span class="er-ach ${a.unlocked ? "on" : ""}" title="${a.name}">${a.emoji}</span>`).join("");
  }
  function renderAchProgress(list) {
    const locked = (list || []).filter(a => !a.unlocked && a.target > 0).sort((a, b) => b.current / b.target - a.current / a.target).slice(0, 3);
    $("er-ach-prog").innerHTML = locked.map(a => `<div>${a.emoji} ${a.name} -- ${a.current}/${a.target}<b><i style="width:${Math.min(100, Math.round(a.current / a.target * 100))}%"></i></b></div>`).join("");
  }
  function loadAlbum() { return loadJson(KEYS.artifacts, {}); }
  function dropArtifact(chance) {
    if (rng() >= chance) return null;
    const idx = Math.floor(rng() * ARTIFACTS.length);
    const all = loadAlbum(); const had = all[idx] || 0; all[idx] = had + 1;
    try { localStorage.setItem(KEYS.artifacts, JSON.stringify(all)); } catch (e) {}
    state.artifactsFound.push({ idx, isNew: !had });
    return idx;
  }
  function renderAlbum() {
    const all = loadAlbum();
    $("er-album-count").textContent = `(${Object.keys(all).length}/${ARTIFACTS.length})`;
    $("er-album-grid").innerHTML = ARTIFACTS.map((e, i) => `<div class="${all[i] ? "" : "locked"}">${e}</div>`).join("");
  }
  function refreshStartInfo() {
    renderHistory();
    if (!window.AIGLeaderboard) return;
    AIGLeaderboard.getEscapeRoomLifetimeSummary().then(d => {
      const el = $("er-lifetime");
      if (d.runs > 0) {
        el.textContent = `🏅 Escapes: ${d.totalEscapes}/${d.runs} · Fastest: ${d.fastestEscapeSec ? Math.floor(d.fastestEscapeSec / 60) + ":" + String(d.fastestEscapeSec % 60).padStart(2, "0") : "--"} · Deepest endless: ${d.endlessBestDepth || 0}`;
        el.classList.remove("hidden");
      }
    }).catch(() => {});
    AIGLeaderboard.getEscapeRoomAchievements().then(list => { renderAch("er-ach-row", list); renderAchProgress(list); }).catch(() => {});
  }
  refreshStartInfo();

  // ---- helpers: floaters, Bo, sparks ----------------------------------------------
  function floatText(text, good) {
    const f = document.createElement("div");
    f.className = "er-float " + (good ? "good" : "bad");
    f.textContent = text;
    f.style.left = (35 + Math.random() * 25) + "%"; f.style.top = "130px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
  function boSay(text) {
    const now = performance.now();
    if (now - state.lastBoAt < 5000) return;
    state.lastBoAt = now;
    boEl.textContent = "🧠 " + text; boEl.classList.add("show");
    clearTimeout(boEl._t); boEl._t = setTimeout(() => boEl.classList.remove("show"), 2800);
  }
  function sparks() {
    if (motionReduced()) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("div");
      s.className = "er-spark"; s.textContent = ["✨", "⭐", "💫"][i % 3];
      s.style.left = "calc(50% - 6px)"; s.style.top = "95px";
      const a = (i / 10) * Math.PI * 2;
      s.style.setProperty("--sx", Math.cos(a) * 60 + "px"); s.style.setProperty("--sy", Math.sin(a) * 50 + "px");
      vault.appendChild(s); setTimeout(() => s.remove(), 650);
    }
  }
  function confetti() {
    if (motionReduced()) return;
    const colors = ["#F7C548", "#7ef0a3", "#7ec8ff", "#ff7a7a", "#c58aff"];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement("div");
      c.className = "er-confetti"; c.style.left = Math.random() * 100 + "%"; c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.6 + "s";
      document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
    }
  }

  // ---- lock plan / themes / tiers -----------------------------------------------------
  function lockTypeFor(i) {
    while (state.locks.length <= i) {
      const n = state.locks.length;
      let type;
      if (state.mode === "endless") type = n === 0 ? "classic" : (n + 1) % 5 === 0 ? "boss" : ["classic", "rapid", "dial", "nomistake"][Math.floor(rng() * 4)];
      else if (n === 0) type = "classic";
      else if (n === CLASSIC_DOORS - 1) type = "boss";
      else {
        // doors 2-5: shuffle the four lock kinds with the seeded rng so each appears once
        if (!state._pool || !state._pool.length) { const p = ["rapid", "dial", "nomistake", "classic"]; for (let k = p.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [p[k], p[j]] = [p[j], p[k]]; } state._pool = p; }
        type = state._pool.pop();
      }
      state.locks.push(type);
    }
    return state.locks[i];
  }
  function themeFor(i) {
    if (state.mode !== "endless") return ROOM_THEMES[Math.min(i, ROOM_THEMES.length - 1)];
    return lockTypeFor(i) === "boss" ? ROOM_THEMES[5] : ROOM_THEMES[i % 5];
  }
  function needFor(type) { const L = LOCKS[type]; return L.need + (L.scales ? DIFFS[state.diff].bonusNeed : 0); }
  function tierFor() {
    const base = state.mode === "endless" ? (state.room < 2 ? 0 : state.room < 5 ? 1 : 2) : (state.room <= 1 ? 0 : state.room <= 3 ? 1 : 2);
    const t = Math.max(0, Math.min(2, base + DIFFS[state.diff].tierShift + (state.path === "red" ? 1 : 0)));
    return ["easy", "medium", "hard"][t];
  }

  // ---- questions -------------------------------------------------------------------------
  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    const correctNum = Number(m[1].replace(/,/g, "")), suffix = m[2] || "";
    const options = new Set([correctNum]); let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const mag = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + mag * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump = 1; while (options.size < 4) options.add(correctNum + bump++);
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix), correctLabel: correctNum.toLocaleString("en-US") + suffix };
  }
  function rollMath(tier) { const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)]; return { key, ...buildMc(MATHVILLE_GENERATORS[key](tier)) }; }
  function rollQuestion(subject, tier) {
    const P = window.AIGQuestionPools;
    if (P && subject === "lang") { const q = P.pickLanguage(); if (q) return { key: "language", ...q }; }
    if (P && subject === "sci") { const q = P.pickScience(); if (q) return { key: "science", ...q }; }
    if (subject === "mixed" && P) return P.rollMixed(() => rollMath(tier));
    return rollMath(tier);
  }

  // ---- HUD ----------------------------------------------------------------------------------------
  function fmt(s) { return `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`; }
  function updateHud() {
    hudRoom.textContent = state.room;
    hudTotal.textContent = state.mode === "endless" ? "∞" : CLASSIC_DOORS;
    hudScore.textContent = Math.round(state.score);
    hudTimer.textContent = fmt(state.secondsLeft);
    const urgent = state.running && !state.ended && state.secondsLeft <= 30;
    hudTimer.classList.toggle("urgent", urgent);
    page.classList.toggle("urgent", urgent);
    alarmFill.style.width = Math.min(100, state.alarm / ALARM_MAX * 100) + "%";
    alarmEl.classList.toggle("hot", state.alarm >= ALARM_MAX - 1);
    hudTurn.classList.toggle("hidden", state.mode !== "coop");
    hudTurn.textContent = `👤 P${state.turn}`;
    renderRoomTrack();
  }
  function renderRoomTrack() {
    roomTrack.style.display = state.mode === "endless" ? "none" : "";
    if (state.mode === "endless") return;
    roomTrack.innerHTML = "";
    for (let i = 1; i <= CLASSIC_DOORS; i++) {
      const dot = document.createElement("div");
      dot.className = "er-room-dot" + (i <= state.room ? " done" : i === state.room + 1 && !state.ended ? " current" : "");
      dot.textContent = i <= state.room ? "✓" : (i === CLASSIC_DOORS ? "👹" : "🚪");
      roomTrack.appendChild(dot);
    }
  }
  function renderDots() {
    comboDotsEl.innerHTML = "";
    const type = state.lockType, need = needFor(type);
    const filled = type === "classic" || type === "nomistake" ? state.combo : state.correctInDoor;
    for (let i = 0; i < need; i++) {
      const d = document.createElement("div");
      d.className = "er-combo-dot" + (i < filled ? " lit" : "");
      if (type === "boss") { d.classList.add("big"); d.textContent = "🔩"; }
      else if (type === "dial") { d.classList.add("big"); d.textContent = i < filled ? String((i * 3 + 4) % 10) : "🎰"; }
      comboDotsEl.appendChild(d);
    }
    const L = LOCKS[type];
    $("er-lock-label").textContent = L.label + (L.total ? ` (${state.asked}/${L.total})` : "");
  }
  function adjustTime(delta, label) {
    state.secondsLeft = Math.max(0, state.secondsLeft + delta);
    if (label) floatText(label, delta > 0);
    updateHud();
    if (state.secondsLeft <= 0 && !state.ended) finishGame(false);
  }
  function addScore(n) { state.score += n; hudScore.textContent = Math.round(state.score); }

  // ---- timer / pause ---------------------------------------------------------------------------------------
  function startTimer() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (state.paused || state.ended) return;
      state.secondsLeft--; state.elapsed++;
      if (state.secondsLeft === 30) { sfx.alarm(); boSay("30 seconds left! Hurry!"); }
      else if (state.secondsLeft < 30 && state.secondsLeft > 0) { sfx.tick(); if (state.secondsLeft <= 10) sfx.heart(); }
      updateHud();
      if (state.secondsLeft <= 0) finishGame(false);
    }, 1000);
  }
  function pauseGame() {
    if (!state.running || state.ended || state.paused) return;
    state.paused = true; $("er-pause-overlay").classList.remove("hidden");
  }
  function resumeGame() { state.paused = false; $("er-pause-overlay").classList.add("hidden"); }

  // ---- door visuals ---------------------------------------------------------------------------------------------
  function setupDoor() {
    const type = lockTypeFor(state.room), theme = themeFor(state.room);
    state.lockType = type;
    state.combo = 0; state.asked = 0; state.correctInDoor = 0; state.wrongInDoor = 0; state.path = "blue";
    doorEl.classList.remove("open", "shake");
    lockEl.textContent = type === "boss" ? "👹" : state.lockEmoji;
    $("er-room-name").textContent = `${theme.emoji} ${theme.name}${type === "boss" ? " -- BOSS" : ""}`;
    $("er-vault-flavor").textContent = theme.flavor;
    vault.style.setProperty("--dark", String(Math.min(10, state.mode === "endless" ? state.room : state.room * 2)));
    renderDots(); updateHud();
  }
  function spinLock() { if (motionReduced()) return; lockEl.classList.remove("spin"); void lockEl.offsetWidth; lockEl.classList.add("spin"); }
  function shakeDoor() { if (motionReduced()) return; doorEl.classList.remove("shake"); void doorEl.offsetWidth; doorEl.classList.add("shake"); }

  // ---- inventory -----------------------------------------------------------------------------------------------------
  function renderInventory() {
    const inv = $("er-inv"); inv.innerHTML = "";
    Object.keys(ITEMS).forEach(k => {
      const n = state.inv[k] || 0;
      if (n <= 0) return;
      const b = document.createElement("button");
      b.type = "button"; b.textContent = `${ITEMS[k].emoji} ${ITEMS[k].name} ×${n}`;
      b.disabled = state.answered || (k === "skip" && state.lockType === "boss") || (k === "key" && state.keyArmed);
      b.addEventListener("click", () => useItem(k));
      inv.appendChild(b);
    });
    if (state.keyArmed) { const t = document.createElement("span"); t.textContent = "🔑 armed"; t.style.cssText = "font-size:.72rem;font-weight:800;color:#F7C548;align-self:center"; inv.appendChild(t); }
  }
  function useItem(kind) {
    if ((state.inv[kind] || 0) <= 0 || state.answered || state.ended) return;
    const grid = $("er-q-grid");
    if (kind === "skip" && state.lockType === "boss") return;
    state.inv[kind]--; if (ITEMS[kind].hint) state.hintsUsed++;
    sfx.item(); vib(15);
    if (kind === "fifty") {
      const wrong = [...grid.querySelectorAll(".er-q-btn")].filter(b => b.textContent !== state.currentQ.correctLabel && !b.classList.contains("gone"));
      shuffle(wrong).slice(0, 2).forEach(b => b.classList.add("gone"));
    } else if (kind === "peek") {
      [...grid.querySelectorAll(".er-q-btn")].find(b => b.textContent === state.currentQ.correctLabel).classList.add("peek");
    } else if (kind === "clock") adjustTime(15, "+15s");
    else if (kind === "key") { state.keyArmed = true; boSay("Spare key ready -- your next mistake is free!"); }
    else if (kind === "torch") {
      grid.classList.remove("blackout"); state.nextTrap = null; $("er-trap").textContent = "";
      state.alarm = Math.max(0, state.alarm - 1);
      vault.classList.add("lit"); setTimeout(() => vault.classList.remove("lit"), 4000);
      updateHud();
    } else if (kind === "skip") {
      stopQTimer(); state.answered = true; $("er-question-overlay").classList.add("hidden");
      openDoor(true); return;
    }
    renderInventory();
  }

  // ---- question flow --------------------------------------------------------------------------------------------------------
  function stopQTimer() { clearInterval(state.qTimerId); state.qTimerId = null; }
  function startQTimer(ms, onTimeout) {
    const wrap = $("er-qtimer"), fill = $("er-qtimer-fill");
    wrap.classList.remove("hidden"); fill.style.width = "100%";
    let left = ms; stopQTimer();
    state.qTimerId = setInterval(() => {
      if (state.paused) return;
      left -= 100; fill.style.width = Math.max(0, left / ms * 100) + "%";
      if (left <= 0) { stopQTimer(); onTimeout(); }
    }, 100);
  }
  function renderQuestion(q, onPick, banner) {
    $("er-q-prompt").textContent = q.prompt;
    const grid = $("er-q-grid"); grid.innerHTML = ""; grid.classList.remove("blackout");
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "er-q-btn"; b.type = "button"; b.textContent = opt;
      b.addEventListener("click", () => onPick(b, opt, q));
      grid.appendChild(b);
    });
    $("er-trap").textContent = banner || "";
    $("er-question-overlay").classList.remove("hidden");
  }
  function askQuestion() {
    if (state.ended) return;
    const L = LOCKS[state.lockType];
    const q = rollQuestion(themeFor(state.room).subject, tierFor());
    state.currentQ = q; state.answered = false; state.qShownAt = performance.now();
    renderQuestion(q, handleAnswer);
    const turnEl = $("er-turn");
    turnEl.classList.toggle("hidden", state.mode !== "coop");
    turnEl.textContent = `👤 Player ${state.turn}, it's your turn!`;
    // Trap armed by a previous mistake (item 10)
    const grid = $("er-q-grid");
    if (state.nextTrap === "blackout") {
      $("er-trap").textContent = "🔦 Lights out! Options are blurry...";
      grid.classList.add("blackout"); setTimeout(() => grid.classList.remove("blackout"), 3000);
    } else if (state.nextTrap === "shuffle") {
      $("er-trap").textContent = "🌀 Trap: the options will shuffle!";
      setTimeout(() => { if (!state.answered) shuffle([...grid.children]).forEach(c => grid.appendChild(c)); }, 2000);
    }
    state.nextTrap = null;
    if (L.qMs) startQTimer(L.qMs, () => handleAnswer(null, null, q)); else $("er-qtimer").classList.add("hidden");
    renderInventory();
  }

  function handleAnswer(btn, opt, q) {
    if (state.answered || state.ended) return;
    state.answered = true; stopQTimer();
    const isCorrect = opt !== null && opt === q.correctLabel;
    const L = LOCKS[state.lockType], D = DIFFS[state.diff];
    document.querySelectorAll("#er-q-grid .er-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct"); else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) { try { AIGLeaderboard.recordTopicAttempt("escape-room", q.key || "escape-room", isCorrect); } catch (e) {} }
    const quick = performance.now() - state.qShownAt < FAST_MS;
    let keySaved = false;
    if (isCorrect) {
      state.streak++;
      addScore(Math.round(10 * (1 + Math.min(state.streak, 10) * 0.1))); state.scoreAnswers += Math.round(10 * (1 + Math.min(state.streak, 10) * 0.1));
      if (state.mode === "coop") state.coopCorrect[state.turn]++;
      adjustTime(TIME_CORRECT, `+${TIME_CORRECT}s`);
      if (quick) { adjustTime(FAST_BONUS, `⚡ +${FAST_BONUS}s fast!`); }
      spinLock(); sfx.click(); vib(25);
    } else {
      state.streak = 0; state.anyWrongRun = true; state.wrongInDoor++;
      state.reviewLog.push({ door: state.room + 1, prompt: q.prompt, yours: opt === null ? "(time ran out)" : opt, correct: q.correctLabel });
      sfx.wrong(); vib([30, 30, 30]); shakeDoor();
      if (state.keyArmed) { state.keyArmed = false; keySaved = true; floatText("🔑 saved!", true); }
      else {
        adjustTime(-(D.timeWrong + (L.wrongExtra || 0)), `-${D.timeWrong + (L.wrongExtra || 0)}s`);
        state.alarm += 1 + (L.alarmExtra || 0);
        if (rng() < TRAP_CHANCE) { state.nextTrap = rng() < 0.5 ? "blackout" : "shuffle"; }
        if (state.alarm >= ALARM_MAX) {
          state.alarm = 2; sfx.alarm(); vib([80, 40, 80]);
          adjustTime(-ALARM_FINE_SEC, `🚨 -${ALARM_FINE_SEC}s guards!`);
          boSay("The guards caught you! Stay calm...");
        }
      }
    }
    if (state.ended) return;
    // lock progress
    let outcome = "continue";
    if (state.lockType === "classic" || state.lockType === "nomistake") {
      if (isCorrect) { state.combo++; if (state.combo >= needFor(state.lockType)) outcome = "open"; }
      else if (!keySaved) state.combo = 0;
    } else if (state.lockType === "rapid") {
      if (isCorrect || !keySaved) state.asked++;
      if (isCorrect) { state.correctInDoor++; if (state.correctInDoor >= L.need) outcome = "open"; }
      if (outcome !== "open" && state.asked >= L.total) { outcome = "jam"; }
    } else { // dial & boss
      if (isCorrect) { state.correctInDoor++; if (state.correctInDoor >= needFor(state.lockType)) outcome = "open"; }
    }
    renderDots(); updateHud();
    if (state.mode === "coop") state.turn = state.turn === 1 ? 2 : 1;
    setTimeout(() => {
      $("er-question-overlay").classList.add("hidden");
      if (state.ended) return;
      if (outcome === "open") openDoor(false);
      else if (outcome === "jam") {
        state.asked = 0; state.correctInDoor = 0; renderDots();
        adjustTime(-5, "🔧 Lock jammed! -5s"); boSay("The lock jammed -- try again!");
        if (!state.ended) askQuestion();
      } else askQuestion();
    }, 650);
  }

  // ---- doors opening / rewards ------------------------------------------------------------------------------------------------
  function openDoor(skipped) {
    const wasBoss = state.lockType === "boss";
    const red = state.path === "red";
    state.room++;
    doorEl.classList.add("open"); lockEl.textContent = "🔓";
    sfx.clunk(); setTimeout(() => sfx.unlock(), 250); sparks(); vib([40, 30, 60]);
    if (!skipped) {
      const pts = Math.round(50 * (red ? 1.5 : 1));
      addScore(pts); state.scoreDoors += pts;
      if (red) adjustTime(10, "🔴 +10s");
    }
    state.cleanDoors = (!skipped && state.wrongInDoor === 0) ? state.cleanDoors + 1 : 0;
    state.alarm = Math.max(0, state.alarm - 1);
    if (wasBoss) state.bossBeaten = true;
    // items and artifacts (items 9/25)
    if (!skipped && rng() < 0.5) {
      const kind = FINDABLE[Math.floor(rng() * FINDABLE.length)];
      state.inv[kind] = (state.inv[kind] || 0) + 1; floatText(`${ITEMS[kind].emoji} Found ${ITEMS[kind].name}!`, true); sfx.item();
    }
    const art = dropArtifact(0.35);
    if (art !== null) setTimeout(() => floatText(`${ARTIFACTS[art]} Artifact found!`, true), 500);
    if (state.mode !== "endless") boSay(state.room >= CLASSIC_DOORS - 1 ? "One more door! You can do it!" : "Door open! Nice one!");
    updateHud();
    setTimeout(afterDoor, 1100);
  }
  function afterDoor() {
    if (state.ended) return;
    if (state.mode !== "endless" && state.room >= CLASSIC_DOORS) { finishGame(true); return; }
    const steps = [];
    if (state.cleanDoors >= 3 && !state.secretUsed) steps.push(showSecretRoom);
    const puzzleDue = state.mode === "endless" ? state.room % 4 === 0 : (state.room === 2 || state.room === 4);
    if (puzzleDue) steps.push(showPuzzle);
    (function run() { const s = steps.shift(); if (s && !state.ended) s(run); else nextDoor(); })();
  }
  function nextDoor() {
    if (state.ended) return;
    setupDoor();
    const pathEligible = state.lockType !== "boss" && (state.mode === "endless" ? state.room > 0 && state.room % 2 === 1 : state.room >= 1 && state.room <= 4);
    if (pathEligible) { $("er-path-overlay").classList.remove("hidden"); return; }
    setTimeout(askQuestion, 700);
  }
  function choosePath(color) {
    state.path = color; $("er-path-overlay").classList.add("hidden");
    if (color === "red") boSay("Bold choice! Red door is tougher.");
    setTimeout(askQuestion, 400);
  }

  // ---- secret room (item 11) ------------------------------------------------------------------------------------------------------------
  function showSecretRoom(done) {
    state.secretUsed = true;
    const q = rollQuestion("mixed", "hard");
    state.answered = false; state.currentQ = q;
    renderQuestion(q, (btn, opt) => {
      if (state.answered) return; state.answered = true;
      const ok = opt === q.correctLabel;
      document.querySelectorAll("#er-q-grid .er-q-btn").forEach(b => { b.disabled = true; if (b.textContent === q.correctLabel) b.classList.add("correct"); else if (b === btn) b.classList.add("wrong"); });
      if (ok) {
        addScore(40); state.scoreExtra += 40; sfx.win(); sparks();
        if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: 8 }).catch(() => {});
        dropArtifact(1); floatText("🪙 +8 coins & artifact!", true);
      } else sfx.wrong();
      setTimeout(() => { $("er-question-overlay").classList.add("hidden"); done(); }, 900);
    }, "🗝️ SECRET ROOM! One bonus question -- 🪙8 and an artifact if you get it right.");
    $("er-qtimer").classList.add("hidden"); $("er-turn").classList.add("hidden"); $("er-inv").innerHTML = "";
    boSay("You found the secret room!");
  }

  // ---- mini-puzzles between doors (item 12) ----------------------------------------------------------------------------------------------
  function clearPuzTimers() { state.puzTimers.forEach(clearTimeout); state.puzTimers = []; }
  function puzzleDone(success, cb) {
    clearPuzTimers();
    $("er-puzzle-overlay").classList.add("hidden");
    if (success) { adjustTime(10, "🧩 +10s"); sfx.win(); }
    if (!state.ended) cb();
  }
  function showPuzzle(cb) {
    const body = $("er-puz-body"); body.innerHTML = "";
    $("er-puzzle-overlay").classList.remove("hidden");
    $("er-puz-skip").onclick = () => puzzleDone(false, cb);
    if (Math.random() < 0.5) {
      $("er-puz-title").textContent = "🔢 Sort the numbers";
      $("er-puz-sub").textContent = "Tap the numbers from smallest to biggest. Solve it for +10s!";
      const nums = []; while (nums.length < 6) { const n = rand(1, 99); if (!nums.includes(n)) nums.push(n); }
      const order = [...nums].sort((a, b) => a - b); let next = 0;
      const grid = document.createElement("div"); grid.className = "er-puz-grid";
      nums.forEach(n => {
        const b = document.createElement("button"); b.type = "button"; b.className = "er-puz-btn"; b.textContent = n;
        b.onclick = () => {
          if (b.classList.contains("done")) return;
          if (n === order[next]) { b.classList.add("done"); next++; sfx.click(); if (next >= order.length) setTimeout(() => puzzleDone(true, cb), 350); }
          else { b.classList.add("bad"); sfx.wrong(); setTimeout(() => b.classList.remove("bad"), 400); grid.querySelectorAll(".done").forEach(d => d.classList.remove("done")); next = 0; }
        };
        grid.appendChild(b);
      });
      body.appendChild(grid);
    } else {
      $("er-puz-title").textContent = "💡 Memory lights";
      $("er-puz-sub").textContent = "Watch the lights, then repeat the order. Solve it for +10s!";
      const colors = ["#e05555", "#55b36a", "#4f8be0", "#e0c250"];
      const seq = Array.from({ length: 4 }, () => rand(0, 3)); let input = 0, listening = false;
      const grid = document.createElement("div"); grid.className = "er-puz-grid"; grid.style.gridTemplateColumns = "repeat(2, 1fr)";
      const pads = colors.map((c, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "er-pad"; b.style.background = c; grid.appendChild(b); return b; });
      pads.forEach((b, i) => b.onclick = () => {
        if (!listening) return;
        b.classList.add("flash"); setTimeout(() => b.classList.remove("flash"), 200); sfx.click();
        if (i === seq[input]) { input++; if (input >= seq.length) { listening = false; setTimeout(() => puzzleDone(true, cb), 350); } }
        else { listening = false; sfx.wrong(); state.puzTimers.push(setTimeout(() => puzzleDone(false, cb), 500)); }
      });
      body.appendChild(grid);
      seq.forEach((p, k) => {
        state.puzTimers.push(setTimeout(() => { pads[p].classList.add("flash"); sfx.click(); }, 700 + k * 700));
        state.puzTimers.push(setTimeout(() => pads[p].classList.remove("flash"), 1050 + k * 700));
      });
      state.puzTimers.push(setTimeout(() => { listening = true; }, 700 + seq.length * 700));
    }
  }

  // ---- end of run ---------------------------------------------------------------------------------------------------------------------------
  function finishGame(escaped) {
    if (state.ended) return;
    state.ended = true; state.running = false;
    clearInterval(state.timerId); stopQTimer(); clearPuzTimers();
    ["er-question-overlay", "er-path-overlay", "er-puzzle-overlay", "er-pause-overlay"].forEach(id => $(id).classList.add("hidden"));
    page.classList.remove("urgent"); hudTimer.classList.remove("urgent");
    const timeBonus = escaped ? Math.min(state.secondsLeft, 300) * 2 : 0;
    const flawless = escaped && !state.anyWrongRun, noHints = escaped && state.hintsUsed === 0;
    const flawBonus = flawless ? 100 : 0, hintBonus = noHints ? 80 : 0;
    const total = Math.round(state.score + timeBonus + flawBonus + hintBonus);
    const endless = state.mode === "endless";
    $("er-end-emoji").textContent = escaped ? "🏆" : state.room >= 4 ? "🥳" : state.room >= 2 ? "🙂" : "💪";
    $("er-end-emoji").className = "er-end-emoji " + (escaped ? "victory" : "lights-out");
    $("er-end-title").textContent = escaped ? "You escaped the vault!" : endless ? `You reached door ${state.room + 1}!` : "Time's up!";
    $("er-end-sub").textContent = escaped
      ? `You broke out with ${fmt(state.secondsLeft)} left on the clock${state.mode === "coop" ? ` -- P1 got ${state.coopCorrect[1]} right, P2 got ${state.coopCorrect[2]}` : ""}!`
      : endless ? `You cleared ${state.room} door${state.room === 1 ? "" : "s"} before the clock ran out.` : `You made it through ${state.room}/${CLASSIC_DOORS} doors before time ran out.`;
    const rows = [["✅ Answers", Math.round(state.scoreAnswers)], ["🚪 Doors", state.scoreDoors], ["🗝️ Secret room", state.scoreExtra], ["⏱️ Time bonus", timeBonus], ["💎 Flawless", flawBonus], ["🧠 No hints", hintBonus]].filter(r => r[1] > 0);
    $("er-breakdown").innerHTML = rows.map(r => `<div><span>${r[0]}</span><span>+${r[1]}</span></div>`).join("") + `<div class="total"><span>Total</span><span>${total}</span></div>`;
    $("er-end-bonus").textContent = ""; $("er-end-rank").textContent = ""; $("er-end-artifact").textContent = "";
    if (state.artifactsFound.length) $("er-end-artifact").textContent = "🏺 Found: " + state.artifactsFound.map(a => ARTIFACTS[a.idx] + (a.isNew ? "✨" : "")).join(" ");
    if (escaped) { sfx.win(); } else sfx.fail();
    // history (item 24)
    const h = loadJson(KEYS.history, []); h.push({ win: escaped, score: total, doors: state.room, date: Date.now() });
    try { localStorage.setItem(KEYS.history, JSON.stringify(h.slice(-5))); } catch (e) {}
    const rankable = state.mode === "classic" && state.diff !== "easy";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardEscapeRoomBonus(Math.min(state.room, CLASSIC_DOORS), CLASSIC_DOORS, escaped ? state.secondsLeft : 0).then(result => {
        if (result && result.bonus) $("er-end-bonus").textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
      }).catch(() => {});
      AIGLeaderboard.touchEscapeRoomStats({ escaped, doors: state.room, flawless, noHints, bossBeaten: state.bossBeaten, secondsUsed: state.elapsed, rankable, endlessDepth: endless ? state.room : 0 })
        .then(() => AIGLeaderboard.getEscapeRoomAchievements())
        .then(list => {
          renderAch("er-end-ach", list);
          const seen = loadJson(KEYS.achSeen, []);
          const fresh = list.filter(a => a.unlocked && !seen.includes(a.id));
          if (fresh.length) $("er-end-artifact").textContent += (state.artifactsFound.length ? "  ·  " : "") + `🏅 New: ${fresh.map(a => a.emoji + " " + a.name).join(", ")}`;
          try { localStorage.setItem(KEYS.achSeen, JSON.stringify(list.filter(a => a.unlocked).map(a => a.id))); } catch (e) {}
        }).catch(() => {});
      if (escaped && rankable) {
        AIGLeaderboard.touchEscapeRoomWeeklyBest(state.elapsed)
          .then(() => AIGLeaderboard.getEscapeRoomWeeklyRank())
          .then(r => { if (r && r.rank) $("er-end-rank").textContent = `⚡ Fastest escape this week: #${r.rank} of ${r.total} (${fmt(state.elapsed)})`; })
          .catch(() => {});
      }
    }
    refreshStartInfo();
    const show = () => $("er-end-overlay").classList.remove("hidden");
    if (escaped && !motionReduced()) { $("er-sunrise").classList.remove("hidden"); confetti(); setTimeout(() => { $("er-sunrise").classList.add("hidden"); show(); }, 2300); }
    else { if (escaped) confetti(); show(); }
  }

  // ---- start / restart -----------------------------------------------------------------------------------------------------------------------------
  function startGame(sameSeed) {
    state.mode = state.selMode; state.diff = state.selDiff;
    if (!sameSeed) state.seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    state.rng = mulberry32(state.seed); state.locks = []; state._pool = null;
    Object.assign(state, { room: 0, combo: 0, asked: 0, correctInDoor: 0, wrongInDoor: 0, path: "blue", secondsLeft: DIFFS[state.diff].dur, elapsed: 0, paused: false, ended: false, running: true,
      score: 0, scoreAnswers: 0, scoreDoors: 0, scoreExtra: 0, streak: 0, alarm: 0, hintsUsed: 0, nextTrap: null, keyArmed: false, cleanDoors: 0, anyWrongRun: false, secretUsed: false, bossBeaten: false,
      turn: 1, coopCorrect: { 1: 0, 2: 0 }, reviewLog: [], artifactsFound: [], answered: false, lastBoAt: 0 });
    state.inv = { fifty: 1, clock: 1, skip: 1 };
    if (DIFFS[state.diff].extraItem) state.inv[DIFFS[state.diff].extraItem] = 1;
    try { localStorage.setItem(KEYS.isNew, "1"); } catch (e) {}
    $("er-new-badge").classList.add("hidden");
    ["er-end-overlay", "er-start-overlay", "er-question-overlay", "er-path-overlay", "er-puzzle-overlay", "er-pause-overlay"].forEach(id => $(id).classList.add("hidden"));
    $("er-sunrise").classList.add("hidden");
    setupDoor(); startTimer(); updateHud();
    boSay(state.mode === "endless" ? "How deep can you go?" : "Let's get out of here!");
    setTimeout(askQuestion, 700);
  }

  // ---- wiring -----------------------------------------------------------------------------------------------------------------------------------------
  $("er-start-btn").addEventListener("click", () => startGame(false));
  $("er-play-again-btn").addEventListener("click", () => startGame(false));
  $("er-same-seed-btn").addEventListener("click", () => startGame(true));
  $("er-path-red").addEventListener("click", () => choosePath("red"));
  $("er-path-blue").addEventListener("click", () => choosePath("blue"));
  $("er-pause-btn").addEventListener("click", pauseGame);
  $("er-resume-btn").addEventListener("click", resumeGame);
  $("er-review-btn").addEventListener("click", () => {
    $("er-review-list").innerHTML = state.reviewLog.length
      ? state.reviewLog.map(r => `<div class="item">Door ${r.door}: ${r.prompt}<br><span class="wrong">You: ${r.yours}</span> · <span class="right">Answer: ${r.correct}</span></div>`).join("")
      : `<div class="item">🎉 No mistakes this run!</div>`;
    $("er-review-overlay").classList.remove("hidden");
  });
  $("er-review-close").addEventListener("click", () => $("er-review-overlay").classList.add("hidden"));
  $("er-album-open").addEventListener("click", () => { renderAlbum(); $("er-album-overlay").classList.remove("hidden"); });
  $("er-album-close").addEventListener("click", () => $("er-album-overlay").classList.add("hidden"));
  document.querySelectorAll("#er-mode-row .er-opt").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#er-mode-row .er-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); state.selMode = b.dataset.mode;
  }));
  document.querySelectorAll("#er-diff-row .er-opt").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#er-diff-row .er-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); state.selDiff = b.dataset.diff;
  }));
  function paintSettings() {
    $("er-set-sound").classList.toggle("on", soundOn()); $("er-set-haptics").classList.toggle("on", hapticsOn()); $("er-set-motion").classList.toggle("on", motionReduced());
  }
  // Settings freezes the clock quietly (no pause overlay -- that would cover the settings card)
  $("er-settings-btn").addEventListener("click", () => {
    paintSettings(); $("er-settings-overlay").classList.remove("hidden");
    if (state.running && !state.paused) { state.paused = true; state.pausedBySettings = true; }
  });
  $("er-settings-close").addEventListener("click", () => {
    $("er-settings-overlay").classList.add("hidden");
    if (state.pausedBySettings) { state.paused = false; state.pausedBySettings = false; }
  });
  $("er-set-sound").addEventListener("click", () => { setFlag(KEYS.sound, !soundOn()); paintSettings(); });
  $("er-set-haptics").addEventListener("click", () => { setFlag(KEYS.haptics, !hapticsOn()); paintSettings(); });
  $("er-set-motion").addEventListener("click", () => { setFlag(KEYS.reduced, !flag(KEYS.reduced, false)); applyMotion(); paintSettings(); });
  $("er-tutorial-link").addEventListener("click", () => $("er-tutorial-overlay").classList.remove("hidden"));
  $("er-tutorial-close").addEventListener("click", () => { setFlag(KEYS.tutorial, true); $("er-tutorial-overlay").classList.add("hidden"); });
  if (!flag(KEYS.tutorial, false)) $("er-tutorial-overlay").classList.remove("hidden");
  if (!flag(KEYS.isNew, false)) $("er-new-badge").classList.remove("hidden");
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  setupDoor();
}
