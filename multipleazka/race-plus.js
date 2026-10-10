/* =================================================================
   Math Race PLUS -- layered on top of script.js (loaded after it).
   Track themes + weather, obstacles you must dodge, random power-ups
   (boost / shield / oil ammo / clock / coins), a pit stop, lightning
   questions, many question shapes (missing number, mix, stories, arrays),
   adaptive difficulty, AI rivals with personalities + rubber-banding,
   oil attacks (synced in multiplayer), slipstream, a 3-race cup, a garage
   with upgrades + paint/sticker/trail, daily missions, track trophies,
   a heartbeat that follows the danger, camera shake/zoom, photo finish and
   race rewards. Everything wraps script.js functions; if anything here
   throws, the original game behaviour still runs.
   ================================================================= */
(function () {
  "use strict";
  if (typeof state === "undefined" || typeof handleAnswer !== "function" || typeof nextQuestion !== "function") return;
  const LB = window.AIGLeaderboard, $ = id => document.getElementById(id);
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, pick = a => a[rnd(0, a.length - 1)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const TRACKS = [
    { id: "city", name: "City", e: "🏙️", scen: "🏢 🌇 🏬 🌆 🏢 🏙️ 🌇 🏬 🏢 🌆", curve: 0 },
    { id: "desert", name: "Desert", e: "🏜️", scen: "🌵 🏜️ 🌵 🐪 🌵 🏜️ 🌵 🌵 🐪 🌵", curve: 2 },
    { id: "snow", name: "Snow", e: "❄️", scen: "🌲 ❄️ ⛄ 🌲 ❄️ 🏔️ 🌲 ❄️ ⛄ 🌲", curve: 3 },
    { id: "jungle", name: "Jungle", e: "🌴", scen: "🌴 🦜 🌿 🌴 🐒 🌿 🌴 🦜 🌿 🌴", curve: 4 },
    { id: "space", name: "Space", e: "🌌", scen: "⭐ 🪐 ✨ 🌙 ⭐ 🛰️ ✨ 🪐 ⭐ ☄️", curve: 2 }
  ];
  const WEATHERS = { clear: { n: "Clear", e: "☀️" }, rain: { n: "Rain", e: "🌧️" }, fog: { n: "Fog", e: "🌫️" }, storm: { n: "Storm", e: "⛈️" } };
  const PICKS = { boost: "⚡", shield: "🛡️", oil: "🛢", clock: "⏱️", coin: "🪙" };
  const TRAITS = {
    car: { s: 1, p: 0, o: 1, t: "balanced" }, plane: { s: 1.06, p: 0.02, o: 1, t: "fast but wobbly" }, ship: { s: 1, p: 0, o: 0.7, t: "steady" },
    bus: { s: 1, p: 0, o: 0.7, t: "steady" }, truck: { s: 0.96, p: 0, o: 0.4, t: "obstacles hurt much less" }, train: { s: 1.04, p: 0.015, o: 1, t: "quick on straights" },
    skateboard: { s: 1.05, p: 0.02, o: 1.2, t: "fast but fragile" }, helicopter: { s: 1.02, p: 0.01, o: 0.6, t: "hops over trouble" }, rocket: { s: 1.08, p: 0.03, o: 1.2, t: "very fast, very fragile" }
  };
  const RIVALS = { slow: { m: 1.4, n: "Turtle", e: "🐢" }, bot: { m: 1, n: "Robo", e: "🤖" }, fast: { m: 0.75, n: "Rocket", e: "🚀" } };
  const UPS = { engine: { n: "Engine", e: "🔧", d: "+3% speed per level", costs: [30, 80, 160] }, tires: { n: "Tires", e: "🛞", d: "+0.5s on every question per level", costs: [25, 70, 140] }, nitro: { n: "Nitro", e: "🚀", d: "Stronger nitro boosts", costs: [25, 70, 140] } };
  const MISSIONS = [
    { type: "wins", text: n => `Win ${n} solo race${n > 1 ? "s" : ""}`, target: [1, 2], reward: 14 },
    { type: "streak", text: n => `Get a ${n}-answer streak`, target: [6, 9], reward: 14 },
    { type: "correct", text: n => `Answer ${n} questions right`, target: [25, 40], reward: 12 },
    { type: "dodge", text: n => `Dodge ${n} obstacles`, target: [3, 5], reward: 16 },
    { type: "pickups", text: n => `Collect ${n} power-ups`, target: [3, 5], reward: 12 }
  ];
  const STORIES = [
    (a, b) => ({ t: `${a} cars have ${b} wheels each. How many wheels in all?`, ans: a * b }),
    (a, b) => ({ t: `A pack has ${b} stickers. How many in ${a} packs?`, ans: a * b }),
    (a, b) => ({ t: `${a} rows of ${b} seats. How many seats?`, ans: a * b }),
    (a, b) => ({ t: `${a * b} marbles shared equally by ${b} friends. How many each?`, ans: a }),
    (a, b) => ({ t: `${a * b} laps split into ${a} equal days. Laps per day?`, ans: b }),
    (a, b) => ({ t: `${b} boxes hold ${a} toy cars each. How many cars?`, ans: a * b })
  ];

  const O = { nextQuestion, handleAnswer, startQuestionTimer, resetRaceState, startRace, startSoloOpponent, endSoloRace, loseSoloRace, endGame, spawnSmoke, updateCar, renderPowerupTrack, checkPowerupPickup, goHome };
  const RP = { topic: "times", rival: "bot", cup: { on: false, race: 0, pts: 0 }, raceNo: 0, race: null, q: {}, meta: null, look: { paint: "default", sticker: "none", trail: "default" }, others: {}, seenAtk: {}, timeOverride: null, trailEmoji: "💨", pulseOn: false };
  window.RacePlus = RP;
  try { RP.topic = localStorage.getItem("mr_topic") || "times"; RP.rival = localStorage.getItem("mr_rival") || "bot"; } catch (e) {}

  // ---------------- settings UI ----------------
  function seg(id, attr, get, set) {
    document.querySelectorAll(`#${id} .seg-btn`).forEach(b => { b.classList.toggle("active", b.dataset[attr] === String(get())); b.addEventListener("click", () => { set(b.dataset[attr]); document.querySelectorAll(`#${id} .seg-btn`).forEach(x => x.classList.toggle("active", x === b)); }); });
  }
  seg("topic-seg", "topic", () => RP.topic, v => { RP.topic = v; try { localStorage.setItem("mr_topic", v); } catch (e) {} });
  seg("rival-seg", "rival", () => RP.rival, v => { RP.rival = v; try { localStorage.setItem("mr_rival", v); } catch (e) {} });
  seg("cup-seg", "cup", () => (RP.cup.on ? 1 : 0), v => { RP.cup = { on: v === "1", race: 0, pts: 0 }; });

  // ---------------- meta (garage / missions / trophies) ----------------
  function ensureMeta() {
    if (!RP.meta) return;
    const m = RP.meta, today = todayStr();
    if (m.lastDay !== today) { m.streak = m.lastDay && (Date.now() - new Date(m.lastDay).getTime()) < 2 * 86400000 + 3600000 ? (m.streak || 0) + 1 : 1; m.lastDay = today; }
    if (!m.missions || m.missions.day !== today) {
      const rng = mulberry32(hashStr(today + "|mr|" + ((window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().id) || "x")));
      const idx = MISSIONS.map((x, i) => i).sort(() => rng() - 0.5).slice(0, 3);
      m.missions = { day: today, list: idx.map(i => { const d = MISSIONS[i], t = d.target[Math.floor(rng() * 2)]; return { type: d.type, target: t, prog: 0, claimed: false, reward: d.reward }; }) };
    }
  }
  function saveMeta() { try { if (LB && LB.saveMathRaceMeta) LB.saveMathRaceMeta(RP.meta); } catch (e) {} }
  function bumpMission(type, n, mode) {
    if (!RP.meta || !RP.meta.missions) return;
    RP.meta.missions.list.forEach(m => { if (m.type === type && !m.claimed) m.prog = Math.min(m.target, mode === "max" ? Math.max(m.prog, n) : m.prog + n); });
  }
  if (LB && LB.getMathRaceMeta) LB.getMathRaceMeta().then(m => { RP.meta = m; ensureMeta(); saveMeta(); }).catch(() => {});
  const lvl = k => (RP.meta && RP.meta.garage && RP.meta.garage[k]) || 0;

  // ---------------- cosmetics ----------------
  let cosmetics = null;
  async function loadLook() {
    try { if (!LB || !LB.getCosmetics) return; cosmetics = await LB.getCosmetics(); const e = cosmetics.equippedCostumes; RP.look = { paint: e["mathrace-paint"] || "default", sticker: e["mathrace-sticker"] || "none", trail: e["mathrace-trail"] || "default" }; } catch (e) {}
    const find = (type, id) => { const l = cosmetics && cosmetics.costumes[type]; return l && l.find(x => x.id === id); };
    const tr = find("mathrace-trail", RP.look.trail); RP.trailEmoji = tr ? tr.preview : "💨";
    applyCosmetics();
  }
  function myCar() { const slot = state.solo ? "p1" : (typeof mySlot !== "undefined" && mySlot) || "p1"; return $("car-" + slot); }
  function applyCosmetics() {
    const car = myCar(); if (!car) return;
    const paint = cosmetics && cosmetics.costumes["mathrace-paint"] && cosmetics.costumes["mathrace-paint"].find(x => x.id === RP.look.paint);
    car.classList.toggle("mr-rainbow", !!(paint && paint.filter === "rainbow"));
    car.style.filter = paint && paint.filter && paint.filter !== "rainbow" ? paint.filter : "";
    const st = cosmetics && cosmetics.costumes["mathrace-sticker"] && cosmetics.costumes["mathrace-sticker"].find(x => x.id === RP.look.sticker);
    if (st && st.id !== "none") car.dataset.sticker = st.preview; else delete car.dataset.sticker;
  }
  loadLook();

  // ---------------- sound: heartbeat that follows the danger ----------------
  let actx = null;
  function kick(vol) {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime; o.type = "sine"; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2); o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.22); } catch (e) {}
  }
  function danger() {
    if (!RP.race || state.gameOver) return 0; let d = 0;
    const R = RP.race;
    if (state.solo && typeof soloOpponentProgress === "number") { const gap = soloOpponentProgress - state.progress; if (soloOpponentProgress > 0.15) d = Math.max(d, clamp(0.45 + gap * 3, 0, 1)); }
    if (state.progress > 0.8) d = Math.max(d, 0.5);
    if (typeof timerRemaining === "number" && timerRemaining > 0 && timerRemaining < 3.2 && timerId) d = Math.max(d, 0.8);
    if (R.q && R.q.dodge) d = Math.max(d, 0.7);
    return d;
  }
  function startPulse() { stopPulse(); RP.pulseOn = true; const beat = () => { if (!RP.pulseOn) return; if (!state.gameOver) { const d = danger(); kick(0.05 + d * 0.09); if (d > 0.5) setTimeout(() => kick(0.05), 170); RP.pulseT = setTimeout(beat, Math.round(820 - d * 440)); } else RP.pulseOn = false; }; beat(); }
  function stopPulse() { RP.pulseOn = false; clearTimeout(RP.pulseT); }

  // ---------------- race setup ----------------
  RP.newRace = function () {
    RP.raceNo++;
    const rng = mulberry32(hashStr((state.code || "solo" + Date.now()) + "|" + RP.raceNo)), r = (a, b) => a + rng() * (b - a), types = Object.keys(PICKS);
    const track = TRACKS[Math.floor(rng() * TRACKS.length)], wk = ["clear", "clear", "rain", "fog", "storm"][Math.floor(rng() * 5)];
    RP.race = {
      track, weather: wk, startedAt: Date.now(),
      obst: [r(0.22, 0.3), r(0.62, 0.7), r(0.8, 0.86)].map(p => ({ p, cleared: false, el: null })),
      picks: [r(0.1, 0.16), r(0.36, 0.44), r(0.56, 0.6)].map(p => ({ p, type: types[Math.floor(rng() * types.length)], got: false, el: null })),
      pitDone: false, pitOffer: false, pitActive: null, dodgeNext: false, blocking: null, ammo: null, boostReady: false, shieldReady: false, comeback: false,
      bestStreak: 0, dodged: 0, pickups: 0, correct: 0, recent: [], adapt: 0, tires: false, clockBonus: 0, oilQ: 0, aiSlowUntil: 0, aiProfile: pick(["sprinter", "steady", "closer", "chaos"]), prevP: 0, q: {}, bonusCoins: 0, photo: false
    };
    RP.others = {}; RP.seenAtk = {}; RP.timeOverride = null;
  };
  function trackEl() { const car = myCar(); return car && car.parentElement; }
  function renderDecor() {
    const track = trackEl(), car = myCar(); if (!track || !car || !RP.race) return;
    track.querySelectorAll(".mr-obst,.mr-pick,.mr-flag").forEach(e => e.remove());
    const R = RP.race, px = p => trackTravelX(track, car, p) + "px";
    [0.25, 0.5, 0.75].forEach(p => { const f = document.createElement("div"); f.className = "mr-flag"; f.textContent = "🚩"; f.style.left = px(p); track.appendChild(f); });
    R.obst.forEach(o => { const e = document.createElement("div"); e.className = "mr-obst"; e.textContent = pick(["🚧", "🪨", "🛢️"]); e.style.left = px(o.p); track.appendChild(e); o.el = e; });
    R.picks.forEach(pk => { const e = document.createElement("div"); e.className = "mr-pick"; e.textContent = PICKS[pk.type]; e.style.left = px(pk.p); track.appendChild(e); pk.el = e; });
  }
  RP.onRaceScreen = function () {
    const R = RP.race; if (!R) return;
    ["p1", "p2", "p3"].forEach(slot => { const c = $("car-" + slot); if (!c) return; const t = c.parentElement; t.dataset.theme = R.track.id; const s = t.querySelector(".scenery"); if (s) s.textContent = (R.track.scen + " ").repeat(3); });
    const w = $("mr-weather"); w.className = "mr-weather " + (R.weather === "clear" ? "" : R.weather); clearInterval(RP.stormT);
    if (R.weather === "storm") RP.stormT = setInterval(() => { if (state.gameOver) { clearInterval(RP.stormT); return; } w.classList.add("flash"); setTimeout(() => w.classList.remove("flash"), 140); }, 5000 + Math.random() * 3000);
    $("mr-trackinfo").textContent = `${R.track.e} ${R.track.name} · ${WEATHERS[R.weather].e} ${WEATHERS[R.weather].n}`;
    RP.defaultLabel = $("your-turn-label").textContent;
    renderDecor(); applyCosmetics(); updateAmmo();
    const tr = TRAITS[state.vehicle] || TRAITS.car; setTimeout(() => { if (!state.gameOver) showToast(`${(typeof VEHICLE_EMOJI !== "undefined" && VEHICLE_EMOJI[state.vehicle]) || "🏎️"} ${tr.t}`); }, 3300);
    if (state.solo) { const rv = RIVALS[RP.rival]; if (!activeGhostSeconds()) $("lane-name-p2").textContent = `${rv.e} ${rv.n}`; }
    setTimeout(() => { if (!state.gameOver && RP.race === R) startPulse(); }, 3300);
  };
  function showToast(t) { try { showPowerupToast(t); } catch (e) {} }

  // ---------------- questions ----------------
  function dTune() { const d = DIFFICULTY[state.difficulty]; return d; }
  function withAdapt(fn) {
    const d = dTune(), adapt = RP.race ? RP.race.adapt : 0, max0 = d.max; d.max = Math.max(d.min + 1, d.max + adapt);
    try { return fn(); } finally { d.max = max0; }
  }
  function qMissing(dd) {
    if (Math.random() < 0.65 || dd.divisionChance === 0) { const a = weightedRand(dd.min, dd.max, "times"), b = weightedRand(dd.min, dd.max, "times"); return Math.random() < 0.5 ? { text: `□ × ${b} = ${a * b}`, answer: a, key: `m${a}x${b}` } : { text: `${a} × □ = ${a * b}`, answer: b, key: `m${a}x${b}` }; }
    let divisor, quotient, dividend, g = 0; do { divisor = weightedRand(dd.min, dd.max, "divby"); quotient = rnd(dd.min, dd.max); dividend = divisor * quotient; } while (dividend > dd.maxDividend && g++ < 30);
    return { text: `${dividend} ÷ □ = ${quotient}`, answer: divisor, key: `d${dividend}/${divisor}` };
  }
  function span() { const k = state.difficulty; return k === "easy" ? 30 : k === "medium" ? 100 : k === "hard" ? 300 : 900; }
  function qAdd() { const n = span(), a = rnd(5, n), b = rnd(5, n); return { text: `${a} + ${b} = ?`, answer: a + b, key: null }; }
  function qSub() { const n = span(), a = rnd(10, n), b = rnd(3, a - 1); return { text: `${a} − ${b} = ?`, answer: a - b, key: null }; }
  function qTwo() {
    const dd = effectiveDifficulty(state.difficulty), a = rnd(2, Math.min(9, dd.max)), b = rnd(2, Math.min(9, dd.max)), c = rnd(2, 20);
    return Math.random() < 0.5 ? { text: `(${a} + ${b}) × ${c % 8 + 2} = ?`, answer: (a + b) * (c % 8 + 2), key: null } : { text: `${a} × ${b} + ${c} = ?`, answer: a * b + c, key: null };
  }
  function qStory(dd) { const a = rnd(dd.min, Math.min(dd.max, 12)), b = rnd(dd.min, Math.min(dd.max, 12)), s = pick(STORIES)(a, b); return { text: s.t, answer: s.ans, key: `m${a}x${b}` }; }
  function qArray(dd) { const rows = rnd(2, Math.min(6, dd.max)), cols = rnd(3, Math.min(8, dd.max)), e = pick(["🍎", "⭐", "🚗", "🍪", "🌸"]); return { text: `How many ${e} in total?`, answer: rows * cols, key: `m${rows}x${cols}`, html: Array.from({ length: rows }, () => e.repeat(cols)).join("<br>") }; }
  function makeQuestion() {
    const dd = effectiveDifficulty(state.difficulty), t = RP.topic, roll = Math.random();
    if (t === "times") return roll < (state.difficulty === "easy" ? 0.12 : 0.2) ? qMissing(dd) : null;
    if (t === "addsub") return roll < 0.38 ? qAdd() : roll < 0.76 ? qSub() : qTwo();
    if (roll < 0.28) return null;
    if (roll < 0.42) return qMissing(dd); if (roll < 0.52) return qAdd(); if (roll < 0.62) return qSub(); if (roll < 0.72) return qTwo(); if (roll < 0.86) return qStory(dd); return qArray(dd);
  }
  function arrayEl(html) {
    let el = $("mr-array");
    if (!el) { el = document.createElement("div"); el.id = "mr-array"; el.className = "mr-array"; const qt = $("question-text"); qt.parentNode.insertBefore(el, qt.nextSibling); }
    el.innerHTML = html ? `<div>${html}</div>` : ""; el.style.display = html ? "" : "none";
  }
  window.nextQuestion = function () {
    if (state.gameOver) return;
    const R = RP.race; if (!R) return O.nextQuestion();
    try {
      if (R.dodgeNext) { /* dodge goes first */ }
      else if (R.pitOffer) { R.pitOffer = false; R.pitDone = true; showPit(); return; }
      R.q = { lightning: false, dodge: false }; RP.timeOverride = null; if (R.oilQ > 0) R.oilQ--;
      let label = null;
      if (R.dodgeNext) { R.dodgeNext = false; R.q.dodge = true; label = "🚧 OBSTACLE! Dodge fast!"; RP.timeOverride = 5; }
      else if (R.pitActive) label = `🔧 PIT STOP ${R.pitActive.n + 1}/3`;
      else if (R.correct >= 2 && state.progress < 0.88 && Math.random() < 0.1) { R.q.lightning = true; label = "⚡ LIGHTNING! 4 seconds!"; RP.timeOverride = 4; }
      const wasLabel = $("your-turn-label"); wasLabel.classList.toggle("mr-dodge", !!R.q.dodge); wasLabel.classList.toggle("mr-lightning", !!R.q.lightning);
      let q = withAdapt(makeQuestion);
      if (q) {
        state.answerLocked = false; state.wrongAttempts = 0; lastQuestionKey = q.key || ("rp" + Math.random());
        state.currentAnswer = q.answer; $("question-text").textContent = q.text; arrayEl(q.html || "");
        if (state.answerMode === "type") renderKeypad(); else renderChoices();
        startQuestionTimer();
      } else { arrayEl(""); withAdapt(() => O.nextQuestion()); }
      const weak = typeof myTopicStats !== "undefined" && myTopicStats && topicsFromQuestionKey(lastQuestionKey).some(tp => { const s = myTopicStats[tp]; return s && s.wrong >= 2 && (s.streak || 0) < 5; });
      wasLabel.textContent = (label || RP.defaultLabel || wasLabel.textContent) + (weak && !label ? "  💡 Tricky one!" : "");
      const qt = $("question-text"); qt.classList.toggle("mr-fogtext", R.weather === "fog");
      if (R.weather === "fog") setTimeout(() => qt.classList.remove("mr-fogtext"), 1500);
    } catch (e) { console.warn("race-plus nextQuestion", e); if (!$("answer-options").children.length) O.nextQuestion(); }
  };
  window.startQuestionTimer = function () {
    const d = DIFFICULTY[state.difficulty], base = d.time, R = RP.race;
    try { if (R) { let t = RP.timeOverride != null ? RP.timeOverride : base; t += lvl("tires") * 0.5 + R.clockBonus - (R.oilQ > 0 ? 2 : 0); R.clockBonus = 0; d.time = Math.max(2.5, t); } O.startQuestionTimer(); } finally { d.time = base; }
  };

  // ---------------- answers ----------------
  function carUpdate() {
    if (state.solo) updateCar("p1", { progress: state.progress, correct: state.correct, vehicle: state.vehicle, pace: state.role }, true);
    else pushProgress(false);
  }
  function popup(t, type) { try { showPopup($("feedback-popup"), t, type || "good"); } catch (e) {} }
  function shakeScreen() { const s = $("screen-race"); s.classList.remove("mr-shake"); void s.offsetWidth; s.classList.add("mr-shake"); }
  function pitAnswer(ok, value) {
    state.answerLocked = true; clearQuestionTimer(); const R = RP.race;
    document.querySelectorAll(".answer-btn, .key").forEach(b => (b.disabled = true));
    topicsFromQuestionKey(lastQuestionKey).forEach(tp => { try { if (LB) LB.recordTopicAttempt("mathrace", tp, ok); } catch (e) {} updateLocalTopicStat(tp, ok); });
    if (ok) { R.pitActive.n++; popup("🔧 Nice!", "good"); if (R.pitActive.n >= 3) { R.pitActive = null; R.tires = true; showToast("🛞 Fresh tires! +8% speed"); } setTimeout(window.nextQuestion, 700); }
    else { R.pitActive = null; popup("Pit stop failed", "neutral"); showToast("🔧 No fresh tires this time"); revealCorrectAnswer(); }
  }
  window.handleAnswer = function (value) {
    if (state.gameOver || state.answerLocked) return;
    const R = RP.race; if (!R) return O.handleAnswer(value);
    const isCorrect = value !== null && Number(value) === state.currentAnswer;
    if (R.pitActive) { try { return pitAnswer(isCorrect, value); } catch (e) { console.warn(e); } }
    const role = state.role, baseStep = STEP[role], tr = TRAITS[state.vehicle] || TRAITS.car; let mult = 1;
    R.prevP = state.progress; const wasDodge = !!R.q.dodge, wasLightning = !!R.q.lightning, firstWrong = !isCorrect;
    try {
      if (isCorrect) {
        mult *= tr.s * (1 + 0.03 * lvl("engine")) * (R.tires ? 1.08 : 1);
        if (state.streak + 1 > 0 && (state.streak + 1) % 3 === 0 && lvl("nitro")) mult *= (1.5 + 0.1 * lvl("nitro")) / 1.5;
        if (R.comeback) { mult *= 2; R.comeback = false; showToast("🎁 Comeback boost!"); }
        if (R.boostReady) { mult *= 2; R.boostReady = false; }
        const ahead = state.solo && typeof soloOpponentProgress === "number" ? soloOpponentProgress : Math.max(0, ...Object.values(RP.others));
        if (ahead - state.progress > 0 && ahead - state.progress < 0.08) { mult *= 1.2; popup("💨 Slipstream!", "good"); }
      }
    } catch (e) { console.warn(e); }
    STEP[role] = baseStep * mult;
    try { O.handleAnswer(value); } finally { STEP[role] = baseStep; }
    try {
      R.recent.push(isCorrect); if (R.recent.length > 5) R.recent.shift();
      if (R.recent.length === 5) { const c = R.recent.filter(Boolean).length; if (c >= 4 && R.adapt < 3) { R.adapt++; R.recent = []; showToast("🎯 Level up! Questions get bigger"); } else if (c <= 2 && R.adapt > -2) { R.adapt--; R.recent = []; showToast("🎯 Easing off a little"); } }
      if (isCorrect) {
        R.correct++; R.bestStreak = Math.max(R.bestStreak, state.streak);
        if (state.gameOver) return;
        if (wasDodge && R.blocking) { R.blocking.cleared = true; R.blocking.el && R.blocking.el.classList.add("dodged"); R.blocking = null; R.dodged++; bumpMission("dodge", 1); popup("🚧 Dodged!", "good"); }
        if (wasLightning) { state.progress = Math.min(0.99, state.progress + STEP[role] * 0.8); popup("⚡ Lightning bonus!", "good"); carUpdate(); }
        const blocker = !wasDodge && R.obst.find(o => !o.cleared && o.p > R.prevP && o.p <= state.progress);
        if (blocker) { state.progress = Math.min(state.progress, blocker.p - 0.025); R.blocking = blocker; R.dodgeNext = true; carUpdate(); showToast("🚧 Obstacle ahead!"); }
        R.picks.forEach(pk => { if (!pk.got && pk.p > R.prevP && pk.p <= state.progress + 0.001) collect(pk); });
        if (!R.pitDone && !R.pitOffer && R.prevP < 0.5 && state.progress >= 0.5) R.pitOffer = true;
        if (state.solo && typeof soloOpponentProgress === "number" && state.progress - soloOpponentProgress < -0.25 && Math.random() < 0.35) { R.comeback = true; showToast("🎁 Comeback crate! Next answer jumps double"); }
        commentary();
      } else if (firstWrong && (state.answerMode === "choice" || state.wrongAttempts === 1)) {
        let pen = tr.p + (R.weather === "rain" ? 0.02 : 0);
        if (wasDodge && R.blocking) { pen += 0.05 * tr.o; R.blocking.cleared = true; R.blocking.el && R.blocking.el.classList.add("hit"); R.blocking = null; shakeScreen(); popup("💥 Crash!", "neutral"); if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) {} } }
        if (pen > 0) { state.progress = Math.max(0, state.progress - pen); carUpdate(); }
      }
    } catch (e) { console.warn("race-plus post", e); }
  };
  function collect(pk) {
    const R = RP.race; pk.got = true; R.pickups++; bumpMission("pickups", 1); pk.el && pk.el.classList.add("gone");
    if (pk.type === "boost") { R.boostReady = true; showToast("⚡ Boost! Your next correct answer jumps double."); }
    else if (pk.type === "shield") { state.powerupShieldReady = true; showToast("🛡️ Shield! Your next wrong answer keeps your streak."); }
    else if (pk.type === "oil") { R.ammo = "oil"; updateAmmo(); showToast("🛢 Oil slick! Tap the button to slow your rival."); }
    else if (pk.type === "clock") { R.clockBonus += 3; showToast("⏱️ +3 seconds on your next question."); }
    else { R.bonusCoins += 3; showToast("🪙 +3 bonus coins at the finish!"); }
  }
  function commentary() {
    const R = RP.race; if (state.gameOver) return;
    const ai = state.solo && typeof soloOpponentProgress === "number" ? soloOpponentProgress : null;
    if (state.progress >= 0.5 && state.progress - 0.1 < 0.5 && !R.said50) { R.said50 = true; showToast("🚩 Halfway there! The crowd goes wild! 👏"); }
    else if (ai !== null && !R.sawClose && Math.abs(ai - state.progress) < 0.05 && state.progress > 0.2) { R.sawClose = true; showToast("😮 Neck and neck! It's anyone's race!"); }
    else if (ai !== null && !R.sawStart && state.progress > 0.12) { R.sawStart = true; showToast(`${RIVALS[RP.rival].e} ${RIVALS[RP.rival].n} is a ${R.aiProfile === "sprinter" ? "fast starter" : R.aiProfile === "closer" ? "strong finisher" : R.aiProfile === "chaos" ? "wild card" : "steady driver"}!`); }
    else if (state.streak === 5 || state.streak === 10) { showToast(`🔥 ${state.streak} in a row! Unstoppable!`); const s = $("screen-race"); s.classList.remove("mr-zoom"); void s.offsetWidth; s.classList.add("mr-zoom"); }
    else if (state.progress >= 0.85 && !R.said85) { R.said85 = true; showToast("🏁 Final stretch! Almost there!"); }
  }

  // ---------------- ammo + attacks ----------------
  function updateAmmo() { const b = $("mr-ammo"), R = RP.race; if (!b) return; b.classList.toggle("hidden", !(R && R.ammo)); b.textContent = "🛢 Oil slick!"; }
  $("mr-ammo").addEventListener("click", () => {
    const R = RP.race; if (!R || !R.ammo || state.gameOver) return; R.ammo = null; updateAmmo();
    if (state.solo) { R.aiSlowUntil = performance.now() + 4500; showToast("🛢 Your rival slips on the oil!"); }
    else if (state.code && typeof db !== "undefined") { db.ref(`games/${state.code}/players/${state.seatKey}/attack`).set({ at: Date.now(), type: "oil" }).catch(() => {}); showToast("🛢 Oil slick sent!"); }
  });
  window.updateCar = function (slot, player, isMine) {
    O.updateCar(slot, player, isMine);
    try {
      const R = RP.race; if (!R || !player) return;
      const car = $("car-" + slot), p = Math.min(player.progress || 0, 1);
      if (car && R.track.curve) car.style.marginTop = (Math.sin(p * Math.PI * R.track.curve) * 5) + "px";
      if (!isMine) {
        RP.others[slot] = p;
        if (player.attack && player.attack.at > R.startedAt - 200 && player.attack.at > (RP.seenAtk[slot] || 0)) { RP.seenAtk[slot] = player.attack.at; R.oilQ = 2; popup("🛢 Oil slick! Careful!", "neutral"); shakeScreen(); }
      } else if (player.nitroAt && player.nitroAt !== RP.lastNitro) { RP.lastNitro = player.nitroAt; const s = $("screen-race"); s.classList.remove("mr-zoom"); void s.offsetWidth; s.classList.add("mr-zoom"); }
    } catch (e) {}
  };
  window.spawnSmoke = function (track, leftPx) {
    const puff = document.createElement("div"); puff.className = "smoke"; puff.textContent = RP.trailEmoji || "💨"; puff.style.left = Math.max(0, leftPx - 6) + "px"; track.appendChild(puff); setTimeout(() => puff.remove(), 900);
  };

  // ---------------- pit stop ----------------
  function showPit() { $("mr-pit").classList.remove("hidden"); }
  $("mr-pit-go").addEventListener("click", () => { $("mr-pit").classList.add("hidden"); if (RP.race) RP.race.pitActive = { n: 0 }; window.nextQuestion(); });
  $("mr-pit-skip").addEventListener("click", () => { $("mr-pit").classList.add("hidden"); window.nextQuestion(); });

  // ---------------- solo rival with personality + rubber band ----------------
  window.renderPowerupTrack = function () { /* replaced by Race Plus pickups */ };
  window.checkPowerupPickup = function () { /* replaced by Race Plus pickups */ };
  window.startSoloOpponent = function () {
    stopSoloOpponent(); soloOpponentProgress = 0; const R = RP.race; if (!R) return O.startSoloOpponent();
    const ghost = activeGhostSeconds(), rv = RIVALS[RP.rival], seconds = ghost || DIFFICULTY[state.difficulty].opponentSeconds * rv.m, prof = ghost ? "steady" : R.aiProfile, t0 = performance.now(), phase = Math.random() * 6;
    soloOpponentTimerId = setInterval(() => {
      if (state.gameOver) { stopSoloOpponent(); return; }
      const t = (performance.now() - t0) / 1000, f0 = t / seconds; let f = 1;
      if (prof === "sprinter") f = f0 < 0.4 ? 1.25 : 0.82; else if (prof === "closer") f = f0 < 0.5 ? 0.8 : 1.2; else if (prof === "chaos") f = 1 + 0.25 * Math.sin(t / 3.5 + phase);
      if (!ghost) { const gap = state.progress - soloOpponentProgress; f *= gap > 0.3 ? 1.18 : gap > 0.15 ? 1.08 : gap < -0.25 ? 0.88 : 1; }
      if (performance.now() < R.aiSlowUntil) f *= 0.5;
      soloOpponentProgress = Math.min(soloOpponentProgress + 0.1 / seconds * f, 1);
      updateCar("p2", { progress: soloOpponentProgress, correct: 0, pace: "parent" }, false);
      if (soloOpponentProgress >= 1) { stopSoloOpponent(); loseSoloRace(); }
    }, 100);
  };

  // ---------------- end of race: photo finish, rewards, cup, trophies ----------------
  function cleanup() { stopPulse(); clearInterval(RP.stormT); ["mr-weather", "mr-pit"].forEach(id => { const e = $(id); if (e) { if (id === "mr-weather") e.className = "mr-weather"; else e.classList.add("hidden"); } }); const a = $("mr-ammo"); if (a) a.classList.add("hidden"); const el = $("your-turn-label"); if (el) el.classList.remove("mr-dodge", "mr-lightning"); }
  function photo(done) {
    const p = $("mr-photo"); p.classList.remove("hidden"); state.gameOver = true; clearQuestionTimer(); stopPulse();
    try { new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    setTimeout(() => { p.classList.add("hidden"); done(); }, 1500);
  }
  function award(win, solo) {
    const R = RP.race; if (!R) return; let coins = 3 + (win ? 3 : 0) + Math.min(4, Math.floor(R.bestStreak / 3)) + R.bonusCoins, note = "";
    const cup = RP.cup;
    if (cup.on && solo) { cup.race++; cup.pts += win ? 3 : 1; note = ` · 🏆 Cup ${cup.race}/3: ${cup.pts} pts`; if (cup.race >= 3) { const gold = cup.pts >= 7; note += gold ? " — CUP WINNER! +15 🪙" : " — cup finished"; if (gold) { coins += 15; if (RP.meta) RP.meta.cups = (RP.meta.cups || 0) + 1; } RP.cup = { on: true, race: 0, pts: 0 }; } }
    try { if (LB && LB.creditWallet) LB.creditWallet({ coins }); } catch (e) {}
    if (RP.meta) {
      const m = RP.meta; m.races = (m.races || 0) + 1; if (win) m.wins = (m.wins || 0) + 1;
      const tk = m.tracks[R.track.id] = m.tracks[R.track.id] || {}; const el = raceStartTime ? Math.round((Date.now() - raceStartTime) / 1000) : 0;
      if (win) { tk.win = true; if (!tk.best || el < tk.best) tk.best = el; if (state.raceWrongTotal === 0) tk.clean = true; }
      if (solo && win) bumpMission("wins", 1); bumpMission("streak", R.bestStreak, "max"); bumpMission("correct", R.correct);
      saveMeta();
    }
    setTimeout(() => { const sub = $("over-sub"); if (sub) sub.textContent += `  +${coins} 🪙${note}`; }, 80);
  }
  window.endSoloRace = function () {
    const close = typeof soloOpponentProgress === "number" && soloOpponentProgress >= 0.9, R = RP.race;
    const run = () => { O.endSoloRace(); try { award(true, true); } catch (e) {} cleanup(); };
    if (close && R && !R.photo) { R.photo = true; photo(run); } else run();
  };
  window.loseSoloRace = function () {
    const R = RP.race, close = state.progress >= 0.85;
    const run = () => { O.loseSoloRace(); try { award(false, true); } catch (e) {} cleanup(); };
    if (close && R && !R.photo) { R.photo = true; photo(run); } else run();
  };
  window.endGame = function (finishers) {
    const R = RP.race; if (!R || RP.endingMP) return O.endGame(finishers);
    const close = finishers.length > 1 && Math.abs((finishers[0][1].finishedAt || 0) - (finishers[1][1].finishedAt || 0)) < 1500;
    const run = () => { O.endGame(finishers); try { award(finishers[0][0] === state.seatKey, false); } catch (e) {} cleanup(); RP.endingMP = false; };
    RP.endingMP = true; if (close) photo(run); else run();
  };
  window.goHome = function () { cleanup(); return O.goHome(); };
  const homeBtn = $("home-btn"); if (homeBtn) homeBtn.addEventListener("click", cleanup);

  // ---------------- lifecycle ----------------
  window.resetRaceState = function () { O.resetRaceState(); try { RP.newRace(); } catch (e) { console.warn(e); } };
  window.startRace = function () { O.startRace(); try { RP.onRaceScreen(); } catch (e) { console.warn(e); } };

  // ---------------- garage UI ----------------
  let gTab = "up";
  async function renderGarage() {
    const body = $("mr-garage-body"); document.querySelectorAll("#mr-garage-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.t === gTab));
    if (!RP.meta && LB && LB.getMathRaceMeta) { RP.meta = await LB.getMathRaceMeta(); ensureMeta(); }
    const m = RP.meta || { garage: {}, tracks: {}, missions: { list: [] } }; let wallet = { coins: 0, gems: 0 }; try { wallet = await LB.getWallet(); } catch (e) {}
    const money = `<p>Wallet: 🪙 ${wallet.coins || 0} · 💎 ${wallet.gems || 0}</p>`;
    if (gTab === "up") {
      body.innerHTML = money + Object.entries(UPS).map(([k, u]) => { const l = lvl(k), cost = u.costs[l]; return `<div class="mr-row"><span>${u.e} ${u.n} Lv ${l}/3<br><small>${u.d}</small><div class="mr-bar"><i style="width:${l / 3 * 100}%"></i></div></span>${cost ? `<button data-k="${k}">🪙 ${cost}</button>` : `<button disabled>MAX</button>`}</div>`; }).join("");
      body.querySelectorAll("button[data-k]").forEach(b => b.onclick = async () => { const k = b.dataset.k, cost = UPS[k].costs[lvl(k)]; const r = await LB.spendMathRaceCoins(cost); if (!r.ok) { alert("Not enough coins yet!"); return; } m.garage[k] = lvl(k) + 1; saveMeta(); renderGarage(); });
    } else if (gTab === "look") {
      await loadLook(); const secs = [["mathrace-paint", "Paint", "paint"], ["mathrace-sticker", "Sticker", "sticker"], ["mathrace-trail", "Trail", "trail"]];
      body.innerHTML = money + secs.map(s => `<h3 style="margin:8px 0 4px">${s[1]}</h3><div class="mr-grid" id="mrg-${s[0]}"></div>`).join("");
      secs.forEach(([type, , key]) => {
        const list = (cosmetics && cosmetics.costumes[type]) || [], g = $("mrg-" + type);
        g.innerHTML = list.map(it => { const sel = RP.look[key] === it.id; const btn = it.owned ? (sel ? `<button disabled>ON</button>` : `<button data-a="eq" data-id="${it.id}">Equip</button>`) : `<button data-a="buy" data-id="${it.id}">${it.cost && it.cost.coins ? "🪙 " + it.cost.coins : "💎 " + (it.cost && it.cost.gems)}</button>`; return `<div class="mr-item ${sel ? "sel" : ""}"><span class="big">${it.preview}</span>${esc(it.name)}${btn}</div>`; }).join("");
        g.querySelectorAll("button[data-a]").forEach(b => b.onclick = async () => { const it = list.find(x => x.id === b.dataset.id); if (b.dataset.a === "buy") { const r = await LB.unlockCosmetic(type, it.id, it.cost); if (!r.ok) { alert("Not enough yet!"); return; } } await LB.equipCosmetic(type, it.id); await loadLook(); renderGarage(); });
      });
    } else if (gTab === "mis") {
      const list = (m.missions && m.missions.list) || [];
      body.innerHTML = `<p>🔥 Day streak: <b>${m.streak || 1}</b></p>` + list.map((x, i) => { const d = MISSIONS.find(z => z.type === x.type), done = x.prog >= x.target; return `<div class="mr-row"><span>${d.text(x.target)}</span>${x.claimed ? "<button disabled>Done ✔</button>" : done ? `<button data-i="${i}">Claim 🪙${x.reward}</button>` : `<button disabled>${x.prog}/${x.target}</button>`}</div>`; }).join("") + `<p><small>Claim all 3 for a bonus 💎!</small></p>`;
      body.querySelectorAll("button[data-i]").forEach(b => b.onclick = async () => { const x = list[+b.dataset.i]; if (x.claimed || x.prog < x.target) return; x.claimed = true; const all = list.every(z => z.claimed); try { await LB.creditWallet({ coins: x.reward, gems: all ? 1 : 0 }); } catch (e) {} saveMeta(); renderGarage(); });
    } else {
      body.innerHTML = `<p>🏁 Races: ${m.races || 0} · 🥇 Wins: ${m.wins || 0} · 🏆 Cups: ${m.cups || 0}</p>` + TRACKS.map(t => { const k = (m.tracks || {})[t.id] || {}; return `<div class="mr-row"><span>${t.e} ${t.name}<br><small>${k.win ? "✅" : "⬜"} win · ${k.clean ? "✅" : "⬜"} no mistakes · ${k.best ? "⏱ " + k.best + "s" : "no record"}</small></span></div>`; }).join("");
    }
  }
  function openGarage() { $("mr-garage").classList.remove("hidden"); renderGarage(); }
  ["btn-garage-role", "btn-garage-pair"].forEach(id => { const b = $(id); if (b) b.addEventListener("click", openGarage); });
  $("mr-garage-close").addEventListener("click", () => { $("mr-garage").classList.add("hidden"); });
  document.querySelectorAll("#mr-garage-tabs .seg-btn").forEach(b => b.addEventListener("click", () => { gTab = b.dataset.t; renderGarage(); }));
})();
