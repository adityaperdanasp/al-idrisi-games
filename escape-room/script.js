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
    skip: { emoji: "🗝️", name: "Skip Door", hint: true },
    smoke: { emoji: "🌫️", name: "Smoke" },
    emp: { emoji: "⚡", name: "EMP" }
  };
  const FINDABLE = ["fifty", "peek", "clock", "key", "torch", "smoke", "emp"];
  const ARTIFACTS = ["🏺", "📜", "💎", "👑", "🗿", "⚱️", "🪙", "🧭", "🔮", "⚔️", "🛡️", "📿"];
  const KEYS = { sound: "aig_er_sound", haptics: "aig_er_haptics", reduced: "aig_er_reduced", tutorial: "aig_er_tutorial_seen", isNew: "aig_er_round1_seen", history: "aig_er_history", artifacts: "aig_er_artifacts", achSeen: "aig_er_ach_seen", pace: "aig_er_pace", classClaim: "aig_er_class_claim" };
  const BUFFS = [
    { e: "🕶️", n: "Stealth", d: "Guard 25% slower", apply: st => { st.mods.guardMul *= 0.75; } },
    { e: "⏱️", n: "Extra Time", d: "+40s on the clock", apply: st => { st.secondsLeft += 40; st.durTotal += 40; } },
    { e: "🎯", n: "Sharp Eye", d: "+2 50/50", apply: st => { st.inv.fifty = (st.inv.fifty || 0) + 2; } },
    { e: "🧠", n: "Calm Mind", d: "+3s on every question", apply: st => { st.mods.qBonus += 3000; } },
    { e: "🌫️", n: "Smoke Pack", d: "+2 smoke bombs", apply: st => { st.inv.smoke = (st.inv.smoke || 0) + 2; } },
    { e: "💰", n: "Greedy", d: "Score +30%", bad: "Guard 20% faster", apply: st => { st.mods.scoreMul *= 1.3; st.mods.guardMul *= 1.2; } },
    { e: "🎰", n: "All In", d: "Score +60%", bad: "Timers 20% shorter", apply: st => { st.mods.scoreMul *= 1.6; st.mods.qMul *= 0.8; } }
  ];
  const RIVALS = { slow: { rate: 1 / 75, e: "🐢" }, bot: { rate: 1 / 55, e: "🤖" }, fast: { rate: 1 / 40, e: "🚀" } };
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const $ = id => document.getElementById(id);
  const page = $("er-page"), vault = $("er-vault"), doorEl = $("er-door"), lockEl = $("er-lock");
  const hudTimer = $("er-hud-timer"), hudRoom = $("er-hud-room"), hudTotal = $("er-hud-total"), hudScore = $("er-hud-score"), hudTurn = $("er-hud-turn");
  const alarmFill = $("er-alarm-fill"), alarmEl = $("er-alarm"), roomTrack = $("er-room-track"), comboDotsEl = $("er-combo-dots");
  const boEl = $("er-bo");
  const heroEl = $("er-hero"), guardEl = $("er-guard"), bossEl = $("er-boss"), gasEl = $("er-gas"), flashEl = $("er-flash"), lockPanel = $("er-lockpanel");

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
    fail: () => tone([300, 220, 160], 0.25, 0.12, "sawtooth"),
    swish: () => tone([900, 500], 0.07, 0.07, "triangle"),
    warn: () => tone([520, 520], 0.1, 0.1, "square"),
    boom: () => { noise(0.4, 0.3, 200); tone([70], 0.4, 0.22, "sawtooth"); },
    slow: () => tone([150], 0.7, 0.12, "sine")
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
    currentQ: null, qShownAt: 0, qTimerId: null, answered: false, lastBoAt: 0, lockEmoji: "🔒", puzTimers: [], heroLeft: 12, durTotal: 300, creepTick: 0,
    tense: true, selTense: true, selRival: "bot", hold: false, danger: 0, pose: "idle", nextHaz: 8, empUntil: 0, smokeUntil: 0, bossAtkIn: 3.5, activeSec: 0, lastTickAt: 0,
    mods: { guardMul: 1, qBonus: 0, scoreMul: 1, qMul: 1 }, scoreBoost: 0, rival: null, rivalRoom: 0, rivalDone: false, rivalBeaten: false, chase: false, bigN: null, seedLabel: "", shortUsed: false, hazSeen: false
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
  function renderBoard() {
    const LB = window.AIGLeaderboard; if (!LB || !LB.getEscapeRoomDailyTop) return;
    Promise.all([LB.getEscapeRoomDailyTop(), LB.getEscapeRoomWeeklyRank()]).then(([day, wk]) => {
      const medals = ["🥇", "🥈", "🥉"], f = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`, GOAL = 8;
      const total = wk ? wk.total : 0, wkKey = LB.treasureDigWeekKey ? LB.treasureDigWeekKey() : "";
      let claimed = false; try { claimed = localStorage.getItem(KEYS.classClaim) === wkKey; } catch (e) {}
      const el = $("er-board"), nm = r => String(r.name || r.id).slice(0, 14);
      el.innerHTML = `📅 <b>Fastest escape today</b><br>${day.length ? day.map((r, i) => `${medals[i]} ${nm(r)} — ${f(r.sec)}`).join("<br>") : "No escapes yet today"}<br>🏆 <b>Class escapes this week</b>: ${Math.min(total, GOAL)}/${GOAL}` +
        (total >= GOAL ? (claimed ? " ✅" : ` <button type="button" id="er-class-claim" class="er-chip-btn" style="padding:2px 8px">🎁 Claim</button>`) : "");
      el.classList.remove("hidden");
      const cb = $("er-class-claim"); if (cb) cb.onclick = async () => { try { await LB.creditWallet({ coins: 25, gems: 1 }); localStorage.setItem(KEYS.classClaim, wkKey); } catch (e) {} cb.outerHTML = "✅ +25 🪙 +1 💎"; };
    }).catch(() => {});
  }
  refreshStartInfo(); renderBoard();

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
      s.style.left = "78%"; s.style.top = "55%";
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
    renderGuard();
    gasEl.style.height = Math.max(0, Math.min(75, (1 - state.secondsLeft / state.durTotal) * 70)) + "%";
    gasEl.classList.toggle("danger", state.secondsLeft <= 30);
    hudTurn.classList.toggle("hidden", state.mode !== "coop");
    hudTurn.textContent = `👤 P${state.turn}`;
    renderRoomTrack();
  }
  function renderGuard() {
    alarmFill.style.width = Math.min(100, state.alarm / ALARM_MAX * 100) + "%";
    alarmEl.classList.toggle("hot", state.alarm >= ALARM_MAX - 1);
    const gx = state.heroLeft - 4 - (1 - Math.min(1, state.alarm / ALARM_MAX)) * (state.heroLeft + 14);
    vault.style.setProperty("--gx", gx + "%");
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
  // The lock is drawn IN the scene: pins rise, lasers switch off, dial rings
  // light up, boss bolts break -- progress you can see, not just dots.
  function renderDots() {
    const type = state.lockType, need = needFor(type), L = LOCKS[type];
    const filled = type === "classic" || type === "nomistake" ? state.combo : state.correctInDoor;
    const kind = type === "rapid" ? "lasers" : type === "dial" ? "rings" : type === "boss" ? "bolts" : "pins";
    lockPanel.dataset.kind = kind; lockPanel.innerHTML = "";
    for (let i = 0; i < need; i++) {
      let el;
      if (kind === "pins") { el = document.createElement("i"); el.className = "er-pin" + (i < filled ? " lit" : ""); }
      else if (kind === "rings") { el = document.createElement("div"); el.className = "er-ring" + (i < filled ? " on" : ""); el.textContent = i < filled ? String((i * 3 + 4) % 10) : "?"; }
      else if (kind === "bolts") { el = document.createElement("span"); el.className = "er-bolt" + (i >= filled ? " on" : ""); el.textContent = "🔩"; }
      else { el = document.createElement("div"); el.className = "er-laser" + (i < filled ? " off" : ""); el.style.top = (14 + i * 30) + "%"; }
      lockPanel.appendChild(el);
    }
    bossEl.classList.toggle("hidden", type !== "boss");
    $("er-boss-hp-fill").style.width = Math.max(0, (need - filled) / need * 100) + "%";
    $("er-lock-label").textContent = L.label + (L.total ? ` (${state.asked}/${L.total})` : "");
  }
  function heroReact(cls, ms) {
    heroEl.classList.remove("idle", "cheer", "hit", "run"); void heroEl.offsetWidth; heroEl.classList.add(cls);
    setTimeout(() => { if (!heroEl.classList.contains("run")) { heroEl.classList.remove(cls); heroEl.classList.add("idle"); } }, ms);
  }
  function flashScene(white) { flashEl.classList.toggle("white", !!white); flashEl.classList.remove("go"); void flashEl.offsetWidth; flashEl.classList.add("go"); }
  function zapLasers() { lockPanel.querySelectorAll(".er-laser:not(.off)").forEach(l => { l.classList.add("zap"); setTimeout(() => l.classList.remove("zap"), 350); }); }
  function bossReact(kind) { bossEl.classList.remove("hurt", "attack"); void bossEl.offsetWidth; bossEl.classList.add(kind); setTimeout(() => bossEl.classList.remove(kind), 450); }
  // The guard catches you: it lunges at the hero, red flash, time fine.
  function caughtByGuard() {
    if (state.chase) { clearTimeout(state.chaseEnd); clearInterval(state.chaseIv); finishGame(false, { caught: true }); return; }
    state.alarm = state.tense ? 1.6 : 2; sfx.alarm(); vib([80, 40, 80]);
    vault.style.setProperty("--gx", (state.heroLeft - 1) + "%");
    guardEl.classList.add("grab"); heroReact("hit", 600); flashScene(false); shakeDoor();
    setTimeout(() => { guardEl.classList.remove("grab"); updateHud(); }, 750);
    const fine = state.tense ? 20 : ALARM_FINE_SEC; adjustTime(-fine, `🚨 -${fine}s caught!`);
    boSay("The guard caught you! Stay calm...");
  }
  function addAlarm(delta) {
    state.alarm = Math.min(ALARM_MAX, state.alarm + delta);
    if (state.alarm >= ALARM_MAX && !state.ended) caughtByGuard(); else updateHud();
  }
  function adjustTime(delta, label) {
    state.secondsLeft = Math.max(0, state.secondsLeft + delta);
    if (label) floatText(label, delta > 0);
    updateHud();
    if (state.secondsLeft <= 0 && !state.ended) finishGame(false);
  }
  function addScore(n) { const extra = n * (state.mods.scoreMul - 1); state.score += n + extra; state.scoreBoost += extra; hudScore.textContent = Math.round(state.score); }

  // ---- timer / pause ---------------------------------------------------------------------------------------
  function startTimer() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (state.paused || state.ended) return;
      state.secondsLeft--; state.elapsed++;
      if (!state.tense && ++state.creepTick % 10 === 0) addAlarm(0.34); // chill mode: the guard creeps closer
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
    doorEl.classList.remove("open");
    state.heroLeft = 12; heroEl.style.transition = "none"; heroEl.style.left = "12%"; void heroEl.offsetWidth; heroEl.style.transition = "";
    heroEl.classList.remove("run", "cheer", "hit"); heroEl.classList.add("idle"); vault.classList.remove("running");
    lockEl.textContent = type === "boss" ? "👹" : state.lockEmoji;
    $("er-room-name").textContent = `${theme.emoji} ${theme.name}${type === "boss" ? " -- BOSS" : ""}`;
    $("er-vault-flavor").textContent = theme.flavor;
    vault.style.setProperty("--dark", String(Math.min(10, state.mode === "endless" ? state.room : state.room * 2)));
    state.bossAtkIn = 3.5;
    renderDots(); updateHud();
  }
  function spinLock() { if (motionReduced()) return; lockEl.classList.remove("spin"); void lockEl.offsetWidth; lockEl.classList.add("spin"); }
  function shakeDoor() { if (motionReduced()) return; vault.classList.remove("shake"); void vault.offsetWidth; vault.classList.add("shake"); }

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
    } else if (kind === "smoke") {
      state.smokeUntil = performance.now() + 6000; state.alarm = Math.max(0, state.alarm - 1.2); boSay("Smoke bomb! The guard is confused."); renderGuard();
    } else if (kind === "emp") {
      state.empUntil = performance.now() + 9000; floatText("⚡ Lasers & lights off!", true);
    } else if (kind === "skip") {
      stopQTimer(); state.answered = true; $("er-question-overlay").classList.add("hidden");
      openDoor(true); return;
    }
    renderInventory();
  }

  // ---- question flow --------------------------------------------------------------------------------------------------------
  function stopQTimer() { clearInterval(state.qTimerId); state.qTimerId = null; state.qFrac = undefined; if (state.bigN != null && !state.chase) bigText(null); }
  function startQTimer(ms, onTimeout) {
    const wrap = $("er-qtimer"), fill = $("er-qtimer-fill");
    wrap.classList.remove("hidden", "low"); fill.style.width = "100%";
    let left = ms; stopQTimer();
    state.qTimerId = setInterval(() => {
      if (state.paused || state.hold || document.hidden || blockedByOverlay()) return;
      left -= 100; state.qFrac = left / ms; fill.style.width = Math.max(0, left / ms * 100) + "%"; wrap.classList.toggle("low", left < ms * 0.3);
      if (state.tense && left <= 3000 && left > 0) { const n = Math.ceil(left / 1000); if (state.bigN !== n) { bigText(n); sfx.tick(); } }
      else if (state.bigN != null && !state.chase) bigText(null);
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
    if (state.tense) {
      let t = Math.max(6500, 15500 - state.room * 900 + state.mods.qBonus) * state.mods.qMul;
      if (state.diff === "easy") t *= 1.25; else if (state.diff === "hard") t *= 0.85;
      t = Math.round(t); if (L.qMs) t = Math.min(L.qMs, t);
      if (state.lockType === "boss" && state.correctInDoor >= needFor("boss") - 1) t = Math.min(t, 6000);
      startQTimer(t, () => handleAnswer(null, null, q));
    } else if (L.qMs) startQTimer(L.qMs, () => handleAnswer(null, null, q)); else $("er-qtimer").classList.add("hidden");
    renderInventory();
  }

  function handleAnswer(btn, opt, q) {
    if (state.answered || state.ended) return;
    state.answered = true; stopQTimer();
    const isCorrect = opt !== null && opt === q.correctLabel;
    const L = LOCKS[state.lockType], D = DIFFS[state.diff];
    const decisive = state.tense && (state.alarm / ALARM_MAX > 0.8 || state.secondsLeft <= 10 || (state.lockType === "boss" && state.correctInDoor >= needFor("boss") - 1));
    if (decisive) { vault.classList.add("slowmo"); sfx.slow(); }
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
      state.alarm = Math.max(0, state.alarm - 0.5);
      heroReact("cheer", 600); zoomScene();
      if (state.lockType === "boss") bossReact("hurt");
    } else {
      state.streak = 0; state.anyWrongRun = true; state.wrongInDoor++;
      state.reviewLog.push({ door: state.room + 1, prompt: q.prompt, yours: opt === null ? "(time ran out)" : opt, correct: q.correctLabel });
      sfx.wrong(); vib([30, 30, 30]); shakeDoor(); heroReact("hit", 500); zapLasers();
      if (state.lockType === "boss") bossReact("attack");
      if (state.keyArmed) { state.keyArmed = false; keySaved = true; floatText("🔑 saved!", true); }
      else {
        adjustTime(-(D.timeWrong + (L.wrongExtra || 0)), `-${D.timeWrong + (L.wrongExtra || 0)}s`);
        if (rng() < TRAP_CHANCE) { state.nextTrap = rng() < 0.5 ? "blackout" : "shuffle"; }
        addAlarm(1 + (L.alarmExtra || 0));
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
      vault.classList.remove("slowmo");
      $("er-question-overlay").classList.add("hidden");
      if (state.ended) return;
      const proceed = () => { if (outcome === "open") openDoor(false); else askQuestion(); };
      if (state.tense && isCorrect && outcome === "continue" && (state.lockType === "classic" || state.lockType === "nomistake") && Math.random() < 0.45) { showTiming(proceed); return; }
      if (state.lockType === "dial" && isCorrect && outcome !== "jam") { showCrank(proceed); return; }
      if (outcome === "open") openDoor(false);
      else if (outcome === "jam") {
        state.asked = 0; state.correctInDoor = 0; renderDots();
        adjustTime(-5, "🔧 Lock jammed! -5s"); boSay("The lock jammed -- try again!");
        if (!state.ended) askQuestion();
      } else askQuestion();
    }, decisive ? 1300 : 650);
  }

  // ---- doors opening / rewards ------------------------------------------------------------------------------------------------
  function openDoor(skipped) {
    const wasBoss = state.lockType === "boss";
    const red = state.path === "red";
    state.room++;
    doorEl.classList.add("open"); lockEl.textContent = "🔓";
    sfx.clunk(); setTimeout(() => sfx.unlock(), 250); sparks(); vib([40, 30, 60]);
    flashScene(true); bossEl.classList.add("hidden");
    // the hero sprints to the open door
    state.heroLeft = 66; heroEl.style.left = "66%"; heroEl.classList.remove("idle", "cheer", "hit"); heroEl.classList.add("run"); vault.classList.add("running");
    setTimeout(() => { heroEl.classList.remove("run"); heroEl.classList.add("idle"); vault.classList.remove("running"); updateHud(); }, 1000);
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
    if (state.mode !== "endless" && state.room >= CLASSIC_DOORS) { if (state.tense) exitChase(); else finishGame(true); return; }
    const steps = [];
    const cpDue = state.mode === "endless" ? state.room % 5 === 0 : state.room === 3;
    if (cpDue) steps.push(showCheckpoint);
    if (state.cleanDoors >= 3 && !state.secretUsed) steps.push(showSecretRoom);
    const puzzleDue = state.mode === "endless" ? state.room % 4 === 0 : (state.room === 2 || state.room === 4);
    if (puzzleDue) steps.push(showPuzzle);
    if (state.tense && state.room >= 2 && (state.mode === "endless" || state.room < CLASSIC_DOORS - 1) && Math.random() < 0.3) steps.push(showBomb);
    if (state.tense && !state.shortUsed && state.room >= 1 && (state.mode === "endless" || state.room + 3 <= CLASSIC_DOORS - 1) && Math.random() < 0.3) steps.push(showShortcut);
    (function run() { const s = steps.shift(); if (s && !state.ended) s(run); else nextDoor(); })();
  }
  function nextDoor() {
    if (state.ended) return;
    // Walk into the next room: quick fade, hero back at the start, new door.
    vault.classList.add("wipe");
    setTimeout(() => {
      if (state.ended) return;
      setupDoor(); vault.classList.remove("wipe");
      const pathEligible = state.lockType !== "boss" && (state.mode === "endless" ? state.room > 0 && state.room % 2 === 1 : state.room >= 1 && state.room <= 4);
      if (pathEligible) { $("er-path-overlay").classList.remove("hidden"); return; }
      if (state.tense && state.lockType === "boss") { showCine("👹", "VAULT BOSS", () => setTimeout(askQuestion, 300)); return; }
      setTimeout(askQuestion, 500);
    }, 380);
  }

  // ---- dial crank (physical lock interaction): drag the knob to the green dot ----
  function showCrank(done) {
    const dial = $("er-crank-dial"), knob = $("er-crank-knob"), target = $("er-crank-target"), msg = $("er-crank-msg"), auto = $("er-crank-auto");
    const targetDeg = 50 + Math.floor(Math.random() * 260);
    target.style.transform = `rotate(${targetDeg}deg)`; knob.style.transform = "rotate(0deg)"; msg.textContent = "";
    auto.style.display = "none";
    $("er-crank-overlay").classList.remove("hidden");
    let angle = 0, dragging = false, startPtr = 0, startAngle = 0, lastTick = 0, finished = false;
    const ptrAngle = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90; };
    const finish = bonus => {
      if (finished) return; finished = true; clearTimeout(autoT);
      msg.textContent = bonus ? "🔓 Click!" : "🔓 Auto-cracked"; sfx.unlock(); sparks(); vib(30);
      if (bonus) { addScore(5); state.scoreExtra += 5; }
      setTimeout(() => { $("er-crank-overlay").classList.add("hidden"); if (!state.ended) done(); }, 500);
    };
    dial.onpointerdown = e => { if (finished) return; dragging = true; startPtr = ptrAngle(e); startAngle = angle; try { dial.setPointerCapture(e.pointerId); } catch (err) {} };
    dial.onpointermove = e => {
      if (!dragging || finished) return;
      angle = startAngle + (ptrAngle(e) - startPtr); knob.style.transform = `rotate(${angle}deg)`;
      const t = Math.floor(angle / 15); if (t !== lastTick) { lastTick = t; sfx.tick(); vib(4); }
    };
    dial.onpointerup = () => {
      if (!dragging || finished) return; dragging = false;
      const diff = Math.abs((((angle - targetDeg) % 360) + 540) % 360 - 180);
      if (diff <= 30) finish(true); else { msg.textContent = "Almost! Try again..."; sfx.wrong(); }
    };
    auto.onclick = () => finish(false);
    const autoT = setTimeout(() => { if (!finished) auto.style.display = ""; }, 7000);
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

  // =====================================================================================
  // TENSION ENGINE -- the clock never stops: the guard walks toward you for real, questions
  // have timers, lasers and lights sweep the room (JUMP / DUCK), bosses throw attacks, a
  // rival thief races you, the heartbeat music follows the danger and the final door is a
  // chase. "Chill" mode keeps the old relaxed escape.
  // =====================================================================================
  const OVERLAY_IDS = ["er-path-overlay", "er-puzzle-overlay", "er-crank-overlay", "er-checkpoint-overlay", "er-buffs-overlay", "er-cine", "er-settings-overlay", "er-pause-overlay", "er-event-overlay", "er-tutorial-overlay", "er-start-overlay", "er-end-overlay"];
  function blockedByOverlay() { return OVERLAY_IDS.some(id => { const e = $(id); return e && !e.classList.contains("hidden"); }); }
  function bigText(t, ms) {
    const b = $("er-bigcount"); clearTimeout(b._t);
    if (t === null || t === undefined) { b.classList.add("hidden"); state.bigN = null; return; }
    state.bigN = t; b.classList.remove("hidden"); b.innerHTML = `<span>${t}</span>`;
    if (ms) b._t = setTimeout(() => { b.classList.add("hidden"); state.bigN = null; }, ms);
  }
  function zoomScene() { vault.classList.add("zoom"); setTimeout(() => vault.classList.remove("zoom"), 220); }
  function guardRate() { // alarm units per second -- the guard walks toward you for real
    let T = Math.max(26, 72 - state.room * 8); T *= { easy: 1.25, normal: 1, hard: 0.8 }[state.diff];
    let m = state.mods.guardMul;
    if (state.path === "red") m *= 1.35;
    if (state.lockType === "boss") m *= 0.5;
    if (performance.now() < state.smokeUntil) m *= 0.25;
    if (state.chase) m = 1.2;
    return ALARM_MAX / (T / m);
  }
  function renderRival() {
    const chip = $("er-hud-rival"); if (!state.rival) { chip.classList.add("hidden"); return; }
    const r = Math.floor(state.rivalRoom), diff = state.room - r;
    chip.classList.remove("hidden"); chip.textContent = `${state.rival.e} door ${r} (${diff >= 0 ? "you +" + diff : "behind " + (-diff)})`;
    chip.style.color = diff >= 0 ? "#7ef0a3" : "#ff8a8a";
  }
  function computeDanger() {
    const g = state.alarm / ALARM_MAX; let d = 0;
    if (g > 0.55) d = Math.max(d, (g - 0.55) / 0.45 * 0.9);
    if (state.qFrac !== undefined && state.qFrac < 0.3) d = Math.max(d, 0.75);
    if (state.secondsLeft <= 30 && state.running) d = Math.max(d, 0.7);
    if (state.chase) d = Math.max(d, 0.6);
    state.danger = Math.min(1, d);
    const el = $("er-danger"); el.style.opacity = state.danger; el.classList.toggle("on", state.danger > 0.3);
    heroEl.classList.toggle("scared", state.danger > 0.55);
  }
  // -- real-time tick (50 ms)
  function tick() {
    const now = performance.now(); let dt = (now - state.lastTickAt) / 1000; state.lastTickAt = now; if (dt > 0.25) dt = 0.25;
    if (!state.running || state.ended || state.paused || state.hold || document.hidden || blockedByOverlay()) return;
    state.activeSec += dt;
    if (state.rival) {
      state.rivalRoom += state.rival.rate * dt; renderRival();
      if (!state.rivalDone && state.mode !== "endless" && state.rivalRoom >= CLASSIC_DOORS) { state.rivalDone = true; floatText(`${state.rival.e} escaped first!`, false); sfx.alarm(); addAlarm(1.2); boSay("Your rival tripped the alarm!"); }
    }
    if (!state.tense) return;
    state.alarm = Math.min(ALARM_MAX, state.alarm + guardRate() * dt);
    if (state.alarm >= ALARM_MAX && !state.ended) { caughtByGuard(); if (state.ended) return; }
    renderGuard();
    if (!state.chase && now > state.empUntil && state.activeSec > 8) {
      if (state.lockType === "boss" && !bossEl.classList.contains("hidden")) {
        state.bossAtkIn -= dt;
        if (state.bossAtkIn <= 0) { const enraged = state.correctInDoor >= needFor("boss") - 1; launchHazard(Math.random() < 0.5 ? "high" : "low", { warn: enraged ? 560 : 760, travel: 850, boss: true }); state.bossAtkIn = enraged ? 2.4 : 3.8; }
      } else if (state.lockType !== "boss") {
        state.nextHaz -= dt;
        if (state.nextHaz <= 0) { launchHazard(Math.random() < 0.5 ? "high" : "low", {}); state.nextHaz = Math.max(3.5, 8.5 - state.room * 0.6) + Math.random() * 2.5; }
      }
    }
    computeDanger();
  }
  // -- JUMP / DUCK
  function setPose(p, ms) {
    if (!state.running || state.ended) return;
    clearTimeout(state.poseT); state.pose = p; heroEl.classList.remove("jump", "duck"); heroEl.classList.add(p); sfx.swish();
    state.poseT = setTimeout(() => { state.pose = "idle"; heroEl.classList.remove("jump", "duck"); }, ms);
  }
  const doJump = () => setPose("jump", 720), doDuck = () => setPose("duck", 950);
  function launchHazard(kind, o) {
    o = o || {}; const high = kind === "high", warn = o.warn || 750, travel = o.travel || 1000;
    const w = document.createElement("div"); w.className = "er-haz-warn"; w.textContent = high ? "⬇ DUCK!" : "⬆ JUMP!"; w.style.bottom = high ? "52%" : "26%"; vault.appendChild(w); sfx.warn();
    if (!state.hazSeen) { state.hazSeen = true; boSay("Top half of the room = JUMP, bottom half = DUCK!"); }
    setTimeout(() => {
      w.remove(); if (state.ended) return;
      const h = document.createElement("div"); h.className = "er-haz " + (high ? "high" : "low") + (o.boss ? " boss" : ""); if (o.boss) h.textContent = high ? "🦇" : "🔥"; vault.appendChild(h);
      requestAnimationFrame(() => requestAnimationFrame(() => { h.style.transition = `left ${travel}ms linear`; h.style.left = "-16%"; }));
      setTimeout(() => {
        if (state.ended) return;
        const safe = high ? state.pose === "duck" : state.pose === "jump";
        if (safe) { floatText("✔ dodged!", true); sfx.swish(); } else hazardHit();
      }, travel * 0.8);
      setTimeout(() => h.remove(), travel + 100);
    }, warn);
  }
  function hazardHit() {
    sfx.wrong(); vib([60, 30, 60]); heroReact("hit", 500); flashScene(false); shakeDoor();
    adjustTime(-3, "💥 -3s"); addAlarm(0.8);
  }
  // -- heartbeat music (tempo follows danger)
  function startPulse() {
    stopPulse(); state.pulseOn = true;
    const beat = () => {
      if (!state.pulseOn) return;
      if (!state.paused && !state.ended && !blockedByOverlay() && soundOn()) { tone([75], 0.14, 0.18 + state.danger * 0.14, "sine"); if (state.danger > 0.45) setTimeout(() => tone([60], 0.1, 0.14, "sine"), 170); }
      state.pulseT = setTimeout(beat, Math.round(900 - state.danger * 520));
    };
    beat();
  }
  function stopPulse() { state.pulseOn = false; clearTimeout(state.pulseT); }
  // -- cinematic boss intro
  function showCine(emoji, name, done) {
    $("er-cine-em").textContent = emoji; $("er-cine-nm").textContent = name;
    const c = $("er-cine"); c.classList.remove("hidden", "rumble"); void c.offsetWidth; c.classList.add("rumble"); sfx.boom(); vib(200);
    let fin = false; const end = () => { if (fin) return; fin = true; c.classList.add("hidden"); if (!state.ended) done(); };
    c.onclick = end; setTimeout(end, 1900);
  }
  // -- boost cards before the run
  function showBuffs(done) {
    const cards = shuffle(BUFFS).slice(0, 3);
    $("er-buff-cards").innerHTML = cards.map((b, i) => `<button type="button" data-i="${i}"><span class="e">${b.e}</span>${b.n}<small>${b.d}</small>${b.bad ? `<small class="bad">⚠ ${b.bad}</small>` : ""}</button>`).join("");
    $("er-buff-cards").querySelectorAll("button").forEach(btn => btn.onclick = () => {
      const b = cards[+btn.dataset.i]; b.apply(state); $("er-buffs-overlay").classList.add("hidden"); floatText(`${b.e} ${b.n}!`, true); updateHud(); done();
    });
    $("er-buffs-overlay").classList.remove("hidden");
  }
  // -- checkpoint: sneak out with 70% or push deeper
  function showCheckpoint(done) {
    $("er-cp-sub").textContent = `You're at door ${state.room} with ${Math.round(state.score)} points. Sneak out with 70% of everything, or push deeper for the full prize.`;
    $("er-checkpoint-overlay").classList.remove("hidden");
    $("er-cp-out").onclick = () => { $("er-checkpoint-overlay").classList.add("hidden"); finishGame(false, { cashout: true }); };
    $("er-cp-go").onclick = () => { $("er-checkpoint-overlay").classList.add("hidden"); done(); };
  }
  // -- timing mini-game for pins (pick the lock)
  function showTiming(done) {
    $("er-ev-title").textContent = "🔧 Pick the lock!"; $("er-ev-sub").textContent = "Hit STOP when the white bar is in the green zone.";
    $("er-ev-body").innerHTML = `<div class="er-timing"><div class="zone"></div><div class="mark" id="er-mark"></div></div><button class="er-btn er-btn-red" id="er-stop" type="button">🛑 STOP!</button>`;
    $("er-event-overlay").classList.remove("hidden");
    const mark = $("er-mark"), speed = 0.9 + Math.random() * 0.5, t0 = performance.now(); let stopped = false;
    const pos = () => { const p = ((performance.now() - t0) / 1000 * speed) % 2; return p < 1 ? p : 2 - p; };
    const frame = () => { if (stopped || state.ended) return; const x = pos(); mark.style.left = `calc(${x * 100}% - ${x * 10}px)`; requestAnimationFrame(frame); }; frame();
    $("er-stop").onclick = () => {
      if (stopped) return; stopped = true; const x = pos(), ok = x > 0.34 && x < 0.66;
      if (ok) { sfx.unlock(); state.alarm = Math.max(0, state.alarm - 0.6); adjustTime(2, "🔧 +2s"); addScore(5); } else { sfx.wrong(); addAlarm(0.35); floatText("Slipped!", false); }
      setTimeout(() => { $("er-event-overlay").classList.add("hidden"); if (!state.ended) done(); }, 450);
    };
  }
  // -- chained timed questions (bomb, shortcut)
  function chain(o) {
    return new Promise(resolve => {
      let i = 0, left = o.total || 0;
      const next = () => {
        if (state.ended) { resolve(false); return; }
        if (i >= o.n) { $("er-question-overlay").classList.add("hidden"); resolve(true); return; }
        const q = rollQuestion("mixed", tierFor()); state.currentQ = q; state.answered = false; state.qShownAt = performance.now();
        const t0 = performance.now();
        renderQuestion(q, (btn, opt) => {
          if (state.answered || state.ended) return; state.answered = true; stopQTimer();
          const ok = opt === q.correctLabel;
          document.querySelectorAll("#er-q-grid .er-q-btn").forEach(b => { b.disabled = true; if (b.textContent === q.correctLabel) b.classList.add("correct"); else if (b === btn) b.classList.add("wrong"); });
          if (window.AIGLeaderboard) { try { AIGLeaderboard.recordTopicAttempt("escape-room", q.key || "escape-room", ok); } catch (e) {} }
          if (o.total) left -= performance.now() - t0;
          setTimeout(() => { if (!ok) { $("er-question-overlay").classList.add("hidden"); resolve(false); } else { i++; sfx.click(); next(); } }, 550);
        }, `${o.banner} ${i + 1}/${o.n}`);
        $("er-turn").classList.add("hidden"); $("er-inv").innerHTML = "";
        startQTimer(o.total ? Math.max(1500, left) : o.msEach, () => { if (!state.answered) { state.answered = true; $("er-question-overlay").classList.add("hidden"); resolve(false); } });
      };
      next();
    });
  }
  function showBomb(done) {
    sfx.warn(); flashScene(false); shakeDoor(); boSay("A time bomb! Answer 2 before it blows!");
    chain({ banner: "💣 BOMB!", n: 2, total: 10000 }).then(ok => {
      if (state.ended) return;
      if (ok) { adjustTime(10, "💣 Defused +10s"); addScore(30); sfx.win(); } else { sfx.boom(); flashScene(false); adjustTime(-10, "💥 Boom! -10s"); addAlarm(1.2); }
      done();
    });
  }
  function showShortcut(done) {
    state.shortUsed = true;
    $("er-ev-title").textContent = "🕳️ Vent shortcut!"; $("er-ev-sub").textContent = "Skip 2 rooms! Answer 3 in a row (6s each). Wrong answer = -10s.";
    $("er-ev-body").innerHTML = `<button class="er-btn er-btn-primary" id="er-sc-go">🚀 Crawl in!</button><button class="er-btn er-btn-secondary" id="er-sc-no">No thanks</button>`;
    $("er-event-overlay").classList.remove("hidden");
    $("er-sc-no").onclick = () => { $("er-event-overlay").classList.add("hidden"); done(); };
    $("er-sc-go").onclick = () => {
      $("er-event-overlay").classList.add("hidden");
      chain({ banner: "🕳️ Vent", n: 3, msEach: 6000 }).then(ok => {
        if (state.ended) return;
        if (ok) { state.room += 2; addScore(80); state.scoreDoors += 80; floatText("🕳️ Skipped 2 rooms!", true); sfx.win(); updateHud(); } else { adjustTime(-10, "🕳️ Stuck! -10s"); sfx.wrong(); }
        done();
      });
    };
  }
  // -- final door: run for the exit!
  function exitChase() {
    state.chase = true; state.alarm = Math.min(state.alarm, 1.5); renderGuard();
    $("er-question-overlay").classList.add("hidden"); lockPanel.innerHTML = ""; bossEl.classList.add("hidden");
    vault.classList.add("running"); heroEl.classList.remove("idle", "cheer", "hit"); heroEl.classList.add("run");
    bigText("RUN!", 1100); sfx.alarm(); boSay("RUN! The guard is right behind you!");
    let k = 0; const total = 7;
    state.chaseIv = setInterval(() => { if (state.ended || k >= total) { clearInterval(state.chaseIv); return; } launchHazard(Math.random() < 0.5 ? "high" : "low", { warn: 600, travel: 900 }); k++; }, 1700);
    state.chaseEnd = setTimeout(() => { if (state.ended) return; state.chase = false; finishGame(true, { chaseBonus: 60 }); }, 1200 + total * 1700 + 1500);
  }

  // ---- end of run ---------------------------------------------------------------------------------------------------------------------------
  function finishGame(escaped, opts) {
    opts = opts || {};
    if (state.ended) return;
    state.ended = true; state.running = false;
    clearInterval(state.timerId); clearInterval(state.tickId); clearTimeout(state.chaseEnd); clearInterval(state.chaseIv); stopPulse(); stopQTimer(); clearPuzTimers();
    document.querySelectorAll(".er-haz, .er-haz-warn").forEach(e => e.remove()); bigText(null);
    vault.classList.remove("slowmo", "zoom", "running"); $("er-danger").style.opacity = 0; $("er-danger").classList.remove("on"); heroEl.classList.remove("scared", "jump", "duck");
    ["er-question-overlay", "er-path-overlay", "er-puzzle-overlay", "er-pause-overlay", "er-crank-overlay", "er-event-overlay", "er-checkpoint-overlay", "er-buffs-overlay", "er-cine"].forEach(id => $(id).classList.add("hidden"));
    page.classList.remove("urgent"); hudTimer.classList.remove("urgent");
    const done = escaped || opts.cashout;
    const timeBonus = escaped ? Math.min(state.secondsLeft, 300) * 2 : opts.cashout ? Math.min(state.secondsLeft, 300) : 0;
    const flawless = escaped && !state.anyWrongRun, noHints = escaped && state.hintsUsed === 0;
    const flawBonus = flawless ? 100 : 0, hintBonus = noHints ? 80 : 0, chaseBonus = opts.chaseBonus || 0;
    const rivalBonus = done && state.rival && !state.rivalDone ? 50 : 0; state.rivalBeaten = rivalBonus > 0;
    let total = Math.round(state.score + timeBonus + flawBonus + hintBonus + chaseBonus + rivalBonus), cutLoss = 0;
    if (opts.cashout) { const t2 = Math.round(total * 0.7); cutLoss = t2 - total; total = t2; }
    const endless = state.mode === "endless";
    $("er-end-emoji").textContent = escaped ? "🏆" : opts.cashout ? "🏃" : opts.caught ? "😵" : state.room >= 4 ? "🥳" : state.room >= 2 ? "🙂" : "💪";
    $("er-end-emoji").className = "er-end-emoji " + (escaped ? "victory" : "lights-out");
    $("er-end-title").textContent = escaped ? "You escaped the vault!" : opts.cashout ? "Smart exit!" : opts.caught ? "Caught at the exit!" : endless ? `You reached door ${state.room + 1}!` : "Time's up!";
    $("er-end-sub").textContent = escaped
      ? `You broke out with ${fmt(state.secondsLeft)} left on the clock${state.mode === "coop" ? ` -- P1 got ${state.coopCorrect[1]} right, P2 got ${state.coopCorrect[2]}` : ""}!`
      : opts.cashout ? `You slipped out after ${state.room} door${state.room === 1 ? "" : "s"} and kept 70% of your haul.`
      : opts.caught ? "So close! The guard grabbed you right before the exit." : endless ? `You cleared ${state.room} door${state.room === 1 ? "" : "s"} before the clock ran out.` : `You made it through ${state.room}/${CLASSIC_DOORS} doors before time ran out.`;
    const rows = [["✅ Answers", Math.round(state.scoreAnswers)], ["🚪 Doors", state.scoreDoors], ["🗝️ Secret room", state.scoreExtra], ["🃏 Boost", Math.round(state.scoreBoost)], ["⏱️ Time bonus", timeBonus], ["🏃 Great escape", chaseBonus], ["🥷 Rival beaten", rivalBonus], ["💎 Flawless", flawBonus], ["🧠 No hints", hintBonus], ["✂️ Sneak-out (70%)", cutLoss]].filter(r => r[1] !== 0);
    $("er-breakdown").innerHTML = rows.map(r => `<div><span>${r[0]}</span><span>${r[1] > 0 ? "+" : ""}${r[1]}</span></div>`).join("") + `<div class="total"><span>Total</span><span>${total}</span></div>`;
    $("er-end-bonus").textContent = ""; $("er-end-rank").textContent = ""; $("er-end-artifact").textContent = "";
    $("er-end-seed").textContent = `🎲 Seed: ${state.seedLabel}${state.rival ? `  ·  ${state.rival.e} ${state.rivalBeaten ? "beaten!" : "got there first"}` : ""}`;
    if (state.artifactsFound.length) $("er-end-artifact").textContent = "🏺 Found: " + state.artifactsFound.map(a => ARTIFACTS[a.idx] + (a.isNew ? "✨" : "")).join(" ");
    if (escaped) { sfx.win(); } else sfx.fail();
    if (escaped && state.mode === "classic" && state.elapsed > 20) { try { const pace = CLASSIC_DOORS / state.elapsed, old = parseFloat(localStorage.getItem(KEYS.pace) || "0"); if (pace > old) localStorage.setItem(KEYS.pace, String(pace)); } catch (e) {} }
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
        if (AIGLeaderboard.touchEscapeRoomDailyBest) AIGLeaderboard.touchEscapeRoomDailyBest(state.elapsed).catch(() => {});
      }
    }
    refreshStartInfo(); renderBoard();
    const show = () => {
      $("er-end-overlay").classList.remove("hidden");
      [...$("er-breakdown").children].forEach((c, i) => { c.style.opacity = 0; setTimeout(() => { c.style.opacity = 1; c.classList.add("er-rise"); sfx.tick(); }, 300 + i * 260); });
    };
    if (escaped && !motionReduced()) { $("er-sunrise").classList.remove("hidden"); confetti(); setTimeout(() => { $("er-sunrise").classList.add("hidden"); show(); }, 2300); }
    else { if (escaped) confetti(); else { flashScene(false); shakeDoor(); } show(); }
  }

  // ---- start / restart -----------------------------------------------------------------------------------------------------------------------------
  function startGame(sameSeed) {
    state.mode = state.selMode; state.diff = state.selDiff; state.tense = state.selTense;
    const seedVal = ($("er-seed").value || "").trim();
    if (seedVal) { state.seedLabel = seedVal; state.seed = hashStr("er|" + seedVal); }
    else if (!sameSeed) { state.seedLabel = String(rand(1000, 9999)); state.seed = hashStr("er|" + state.seedLabel); }
    state.rng = mulberry32(state.seed); state.locks = []; state._pool = null;
    Object.assign(state, { room: 0, combo: 0, asked: 0, correctInDoor: 0, wrongInDoor: 0, path: "blue", secondsLeft: DIFFS[state.diff].dur, elapsed: 0, paused: false, ended: false, running: true,
      score: 0, scoreAnswers: 0, scoreDoors: 0, scoreExtra: 0, streak: 0, alarm: 0, hintsUsed: 0, nextTrap: null, keyArmed: false, cleanDoors: 0, anyWrongRun: false, secretUsed: false, bossBeaten: false,
      turn: 1, coopCorrect: { 1: 0, 2: 0 }, reviewLog: [], artifactsFound: [], answered: false, lastBoAt: 0, creepTick: 0, durTotal: DIFFS[state.diff].dur, heroLeft: 12,
      hold: true, danger: 0, pose: "idle", nextHaz: 8, empUntil: 0, smokeUntil: 0, bossAtkIn: 3.5, activeSec: 0, lastTickAt: performance.now(), mods: { guardMul: 1, qBonus: 0, scoreMul: 1, qMul: 1 }, scoreBoost: 0,
      rivalRoom: 0, rivalDone: false, rivalBeaten: false, chase: false, bigN: null, shortUsed: false, hazSeen: false });
    const rv = state.selRival;
    state.rival = rv === "none" ? null : rv === "ghost" ? { rate: Math.max(0.008, parseFloat(localStorage.getItem(KEYS.pace) || "0") || 1 / 60), e: "👻" } : RIVALS[rv];
    state.inv = { fifty: 1, clock: 1, skip: 1, smoke: 1 };
    if (DIFFS[state.diff].extraItem) state.inv[DIFFS[state.diff].extraItem] = 1;
    try { localStorage.setItem(KEYS.isNew, "1"); } catch (e) {}
    $("er-new-badge").classList.add("hidden");
    ["er-end-overlay", "er-start-overlay", "er-question-overlay", "er-path-overlay", "er-puzzle-overlay", "er-pause-overlay", "er-crank-overlay", "er-event-overlay", "er-checkpoint-overlay", "er-buffs-overlay", "er-cine"].forEach(id => $(id).classList.add("hidden"));
    $("er-sunrise").classList.add("hidden"); document.querySelectorAll(".er-haz, .er-haz-warn").forEach(e => e.remove());
    $("er-btn-jump").classList.toggle("hidden", !state.tense); $("er-btn-duck").classList.toggle("hidden", !state.tense);
    clearInterval(state.tickId); clearTimeout(state.chaseEnd); clearInterval(state.chaseIv); stopPulse();
    setupDoor(); renderRival(); updateHud();
    const go = async () => {
      if (state.tense) { startPulse(); }
      for (const t of ["3", "2", "1", "GO!"]) { bigText(t); sfx.tick(); await new Promise(r => setTimeout(r, motionReduced() ? 180 : 520)); if (state.ended) return; }
      bigText(null); state.hold = false; state.lastTickAt = performance.now();
      state.tickId = setInterval(tick, 50);
      startTimer(); boSay(state.mode === "endless" ? "How deep can you go?" : state.tense ? "The guard is coming. Move fast!" : "Let's get out of here!");
      setTimeout(askQuestion, 200);
    };
    if (state.tense) showBuffs(go); else go();
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
  // tension controls: JUMP / DUCK buttons, scene taps (top half = jump, bottom half = duck) and arrow keys
  $("er-btn-jump").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); doJump(); });
  $("er-btn-duck").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); doDuck(); });
  vault.addEventListener("pointerdown", e => {
    if (!state.running || state.ended || !state.tense || e.target.closest(".er-ctrl")) return;
    const r = vault.getBoundingClientRect(); ((e.clientY - r.top) / r.height < 0.5) ? doJump() : doDuck();
  });
  document.addEventListener("keydown", e => {
    if (!state.running || state.ended) return;
    if (e.key === "ArrowUp" || e.key === "w") { doJump(); e.preventDefault(); } else if (e.key === "ArrowDown" || e.key === "s") { doDuck(); e.preventDefault(); }
  });
  document.querySelectorAll("#er-tense-row .er-opt").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#er-tense-row .er-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); state.selTense = b.dataset.tense === "1";
  }));
  document.querySelectorAll("#er-rival-row .er-opt").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#er-rival-row .er-opt").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); state.selRival = b.dataset.rival;
  }));
  $("er-daily-seed").addEventListener("click", () => { const d = new Date(); $("er-seed").value = "DAY" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  setupDoor();
}
