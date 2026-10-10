/* =================================================================
   Treasure Dig -- a living mine instead of a list of boxes. You dig down
   through 5 biomes with a side-view camera, pick soft dirt or hard rock
   each level, dodge traps, crack locked chests, beat a boss every 5
   levels and decide at camps whether to cash out or keep going (faint
   and you lose half your bag). Relics fill a museum, the pickaxe can be
   upgraded, a buddy tags along, and daily missions + weekly depth keep
   it fresh. Questions still come from the shared math / language /
   science pools, so every swing is practice.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("td-signedout").classList.remove("hidden");
  document.getElementById("td-start").classList.add("hidden");
} else {
  initTreasureDig();
}

function initTreasureDig() {
  const $ = id => document.getElementById(id);
  const LB = window.AIGLeaderboard;
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();

  // ---------------- config ----------------
  const ROW = 64, CAM_OFFSET = 36;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const TIERS = ["easy", "medium", "hard"];
  const BIOMES = [
    { name: "Topsoil", emoji: "🟫", deco: ["🦴", "🐚", "🌱"], story: "Soft earth and old bones. Easy digging!" },
    { name: "Stone Caves", emoji: "🪨", deco: ["🪨", "🔩", "🕳️"], story: "Cold stone and echoing tunnels." },
    { name: "Crystal Cavern", emoji: "🔷", deco: ["🔹", "💎", "🟣"], story: "Crystals glow in the dark. Sparkly!" },
    { name: "Lava Depths", emoji: "🌋", deco: ["🔥", "🌋", "💀"], story: "It's getting HOT down here..." },
    { name: "Ancient City", emoji: "🏛️", deco: ["📜", "🏺", "🗿"], story: "A lost city, buried for ages." }
  ];
  const BOSSES = [
    { name: "Mole King", emoji: "🐀" }, { name: "Stone Golem", emoji: "🗿" }, { name: "Crystal Spider", emoji: "🕷️" },
    { name: "Lava Dragon", emoji: "🐲" }, { name: "Pharaoh Ghost", emoji: "👻" }
  ];
  const RELICS = [
    { id: "bone", name: "Dino Bone", emoji: "🦴", rar: "C", b: 0 }, { id: "shell", name: "Fossil Shell", emoji: "🐚", rar: "C", b: 0 },
    { id: "pot", name: "Clay Pot", emoji: "🏺", rar: "C", b: 0 }, { id: "compass", name: "Old Compass", emoji: "🧭", rar: "R", b: 0 },
    { id: "egg", name: "Dino Egg", emoji: "🥚", rar: "L", b: 0 },
    { id: "rock", name: "Odd Rock", emoji: "🪨", rar: "C", b: 1 }, { id: "bolt", name: "Rusty Bolt", emoji: "🔩", rar: "C", b: 1 },
    { id: "candle", name: "Miner's Candle", emoji: "🕯️", rar: "C", b: 1 }, { id: "chain", name: "Ancient Chain", emoji: "⛓️", rar: "R", b: 1 },
    { id: "sword", name: "Lost Sword", emoji: "🗡️", rar: "L", b: 1 },
    { id: "shard", name: "Blue Shard", emoji: "🔹", rar: "C", b: 2 }, { id: "amethyst", name: "Amethyst", emoji: "🟣", rar: "C", b: 2 },
    { id: "amber", name: "Amber", emoji: "🔶", rar: "C", b: 2 }, { id: "orb", name: "Crystal Ball", emoji: "🔮", rar: "R", b: 2 },
    { id: "crown", name: "Crystal Crown", emoji: "👑", rar: "L", b: 2 },
    { id: "glass", name: "Lava Glass", emoji: "🌋", rar: "C", b: 3 }, { id: "ember", name: "Ember Stone", emoji: "🔥", rar: "C", b: 3 },
    { id: "urn", name: "Fire Urn", emoji: "⚱️", rar: "C", b: 3 }, { id: "eye", name: "Dragon Eye", emoji: "🧿", rar: "R", b: 3 },
    { id: "scale", name: "Dragon Scale", emoji: "🐉", rar: "L", b: 3 },
    { id: "scroll", name: "Old Scroll", emoji: "📜", rar: "C", b: 4 }, { id: "lamp", name: "Oil Lamp", emoji: "🪔", rar: "C", b: 4 },
    { id: "brick", name: "Carved Brick", emoji: "🧱", rar: "C", b: 4 }, { id: "face", name: "Stone Face", emoji: "🗿", rar: "R", b: 4 },
    { id: "trident", name: "Golden Trident", emoji: "🔱", rar: "L", b: 4 }
  ];
  const DUP_BONUS = { C: 2, R: 6, L: 15 };
  const ACHIEVEMENTS = [
    { id: "d5", icon: "⛏️", name: "Digger", text: "Reach 5 m" }, { id: "d10", icon: "🏊", name: "Deep Diver", text: "Reach 10 m" },
    { id: "d15", icon: "🌋", name: "Core Explorer", text: "Reach 15 m" }, { id: "boss", icon: "⚔️", name: "Boss Smasher", text: "Beat a boss" },
    { id: "flawless", icon: "✨", name: "Flawless", text: "5 m with no mistakes" }, { id: "combo", icon: "🔥", name: "On Fire", text: "Combo of 8" },
    { id: "relic10", icon: "🏺", name: "Collector", text: "10 different relics" }, { id: "cash", icon: "💰", name: "Smart Miner", text: "Cash out 30+ coins" },
    { id: "secret", icon: "🗝️", name: "Treasure Hunter", text: "Open the secret vault" }, { id: "legend", icon: "👑", name: "Legend Found", text: "Find a legendary relic" }
  ];
  const MISSION_DEFS = [
    { type: "depth", text: n => `Dig down to ${n} m`, target: [4, 6], reward: 12, max: true },
    { type: "relics", text: n => `Find ${n} relic${n > 1 ? "s" : ""}`, target: [1, 2], reward: 14 },
    { type: "correct", text: n => `Answer ${n} questions right`, target: [10, 16], reward: 12 },
    { type: "boss", text: () => "Beat a boss", target: [1, 1], reward: 20 },
    { type: "cash", text: () => "Cash out at a camp", target: [1, 1], reward: 15 },
    { type: "combo", text: n => `Reach a ${n}x combo`, target: [4, 6], reward: 14, max: true }
  ];
  const PICK_NAMES = ["Wood", "Iron", "Diamond", "Gold"];
  const BO_LINES = {
    start: ["Let's dig! Pick soft dirt or hard rock.", "Careful down there. I'll cheer you on!", "Treasure time! Swing that pickaxe."],
    good: ["Nice swing!", "Crack! Right answer!", "You're a natural digger!", "Boom! Keep it up!"],
    bad: ["Ouch, try again!", "Don't worry, read it slowly.", "That one was tricky!"],
    camp: ["A camp! Cash out or go deeper?", "Safe spot. Think about your bag..."]
  };

  // ---------------- helpers ----------------
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = arr => arr[rand(0, arr.length - 1)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayStr(d); };
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const pretty = id => String(id || "").split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const show = id => $(id).classList.remove("hidden");
  const hide = id => $(id).classList.add("hidden");
  function toast(msg) { const t = document.createElement("div"); t.className = "td-toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
  const biomeOf = d => Math.floor((Math.max(1, d) - 1) / 5) % 5;
  const tierIdxFor = d => d <= 3 ? 0 : d <= 7 ? 1 : 2;

  // ---------------- settings + sound ----------------
  let settings = { sound: true, haptics: true, motion: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem("td_settings") || "{}")); } catch (e) {}
  function applySettings() {
    document.documentElement.classList.toggle("td-reduced", !!settings.motion);
    $("td-set-sound").classList.toggle("on", settings.sound);
    $("td-set-haptics").classList.toggle("on", settings.haptics);
    $("td-set-motion").classList.toggle("on", settings.motion);
    try { localStorage.setItem("td_settings", JSON.stringify(settings)); } catch (e) {}
    if (!settings.sound && window.AIGSynthBgm) AIGSynthBgm.stop();
  }
  let actx = null;
  function beep(freq, dur = 0.1, type = "square", vol = 0.05, when = 0) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = freq;
      const t0 = actx.currentTime + when;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }
  const sfx = {
    dig: () => { beep(140, 0.09, "sawtooth", 0.08); beep(90, 0.14, "square", 0.07, 0.07); },
    coin: () => { beep(880, 0.07); beep(1320, 0.1, "square", 0.05, 0.06); },
    good: () => { beep(523, 0.1); beep(659, 0.1, "square", 0.05, 0.09); beep(784, 0.16, "square", 0.05, 0.18); },
    bad: () => { beep(200, 0.18, "sawtooth", 0.07); beep(140, 0.25, "sawtooth", 0.07, 0.12); },
    block: () => beep(660, 0.08, "triangle"),
    boom: () => { beep(70, 0.4, "sawtooth", 0.1); beep(50, 0.5, "square", 0.08, 0.05); },
    relic: () => [523, 659, 784, 988, 1175].forEach((f, i) => beep(f, 0.16, "triangle", 0.06, i * 0.08)),
    chest: () => [392, 523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, "triangle", 0.06, i * 0.09)),
    warn: () => { beep(300, 0.12, "square", 0.06); beep(300, 0.12, "square", 0.06, 0.2); },
    tick: () => beep(440, 0.05, "square", 0.03)
  };
  const buzz = ms => { if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

  // ---------------- persistent data ----------------
  let td = null, wallet = { coins: 0, gems: 0 }, cosmetics = null;
  let look = { pick: "default", helmet: "default", buddy: "none" };
  async function save() { try { await LB.saveTreasureDig(td); } catch (e) { console.warn("save failed", e); } }
  async function refreshCosmetics() {
    try {
      cosmetics = await LB.getCosmetics();
      if (cosmetics) {
        const e = cosmetics.equippedCostumes;
        look = { pick: e["treasuredig-pick"] || "default", helmet: e["treasuredig-helmet"] || "default", buddy: e["treasuredig-buddy"] || "none" };
      }
    } catch (e) {}
    applyLook();
  }
  const costume = (type, id) => { const l = cosmetics && cosmetics.costumes[type]; const hit = l && l.find(x => x.id === id); return hit ? hit.preview : null; };
  function applyLook() {
    $("td-tool").textContent = costume("treasuredig-pick", look.pick) || "⛏️";
    $("td-helmet").textContent = costume("treasuredig-helmet", look.helmet) || "⛑️";
    const bud = look.buddy !== "none" ? costume("treasuredig-buddy", look.buddy) : null;
    $("td-buddy").textContent = bud || ""; $("td-buddy").classList.toggle("hidden", !bud);
  }
  async function refreshWallet() { try { wallet = await LB.getWallet(); } catch (e) {} }
  const relicCount = () => Object.keys(td.relics || {}).filter(k => td.relics[k] > 0).length;

  // ---------------- daily / missions ----------------
  function ensureDaily() {
    const today = todayStr();
    if (td.lastDay !== today) { td.streak = td.lastDay === yesterdayStr() ? (td.streak || 0) + 1 : 1; td.lastDay = today; }
    if (!td.missions || td.missions.day !== today) {
      const rng = mulberry32(hashStr(today + "|td|" + player.id));
      const idxs = MISSION_DEFS.map((d, i) => i).sort(() => rng() - 0.5).slice(0, 3);
      td.missions = { day: today, list: idxs.map(i => {
        const d = MISSION_DEFS[i], target = d.target[0] === d.target[1] ? d.target[0] : d.target[Math.floor(rng() * 2)];
        return { type: d.type, target, prog: 0, claimed: false, reward: d.reward };
      }) };
    }
  }
  function bump(type, n = 1) {
    if (!td.missions || !td.missions.list) return;
    const def = MISSION_DEFS.find(d => d.type === type);
    td.missions.list.forEach(m => { if (m.type !== type || m.claimed) return; m.prog = Math.min(m.target, def && def.max ? Math.max(m.prog || 0, n) : (m.prog || 0) + n); });
  }
  function checkAch() {
    const have = td.achv = td.achv || {};
    const cond = {
      d5: S && S.depth >= 5, d10: S && S.depth >= 10, d15: S && S.depth >= 15, boss: S && S.bosses > 0,
      flawless: S && S.depth >= 5 && S.mistakes === 0, combo: S && S.bestStreak >= 8, relic10: relicCount() >= 10,
      secret: S && S.secretDone, legend: RELICS.some(r => r.rar === "L" && td.relics[r.id] > 0)
    };
    ACHIEVEMENTS.forEach(a => {
      if (have[a.id] || !cond[a.id]) return;
      have[a.id] = true; toast(`🏅 ${a.name}! +5 🪙`); try { LB.creditWallet({ coins: 5 }); } catch (e) {}
    });
  }

  // ---------------- world rendering ----------------
  let S = null, rowsBuilt = 0;
  const world = $("td-world"), scene = $("td-scene");
  function buildRow(i) {
    const row = document.createElement("div");
    if (i === 0) {
      row.className = "td-row surface"; row.innerHTML = `<div class="td-wall"><span style="left:30%;top:14px">🌳</span></div><div class="td-cell dug"></div><div class="td-wall"><div class="td-sun">☀️</div><span style="left:40%;top:16px">🌲</span></div>`;
    } else {
      const b = biomeOf(i); row.className = `td-row b${b}`;
      const deco = () => Math.random() < 0.38 ? `<span style="left:${rand(8, 70)}%">${pick(BIOMES[b].deco)}</span>` : "";
      row.innerHTML = `<div class="td-wall">${deco()}</div><div class="td-cell"></div><div class="td-wall">${deco()}</div>`;
    }
    row._cell = row.querySelector(".td-cell"); world.appendChild(row); world._rows[i] = row;
  }
  function renderWorld() {
    while (rowsBuilt <= S.depth + 8) buildRow(rowsBuilt++);
    Object.keys(world._rows).forEach(k => {
      const i = +k, c = world._rows[i]._cell;
      c.classList.toggle("dug", i <= S.depth);
      c.classList.toggle("target", i === S.depth + 1 && !S.ended);
      if (i > S.depth) { c.classList.remove("breaking"); }
    });
    world.style.transform = `translateY(${CAM_OFFSET - S.depth * ROW}px)`;
    $("td-dark").style.setProperty("--dark", Math.min(0.8, S.depth * 0.05));
  }
  function resetWorld() { world.innerHTML = ""; world._rows = {}; rowsBuilt = 0; }
  function targetCell() { return world._rows[S.depth + 1] && world._rows[S.depth + 1]._cell; }
  function initMotes() {
    const m = $("td-motes"); m.innerHTML = "";
    for (let i = 0; i < 8; i++) { const d = document.createElement("i"); d.style.left = rand(4, 96) + "%"; d.style.animationDelay = (-Math.random() * 6) + "s"; d.style.animationDuration = rand(5, 9) + "s"; m.appendChild(d); }
  }
  function bat() { if (!S || S.depth < 3 || document.querySelector(".td-bat")) return; const b = document.createElement("div"); b.className = "td-bat"; b.textContent = "🦇"; b.style.top = rand(20, 80) + "px"; scene.appendChild(b); setTimeout(() => b.remove(), 7000); }
  setInterval(() => { if (Math.random() < 0.35) bat(); }, 5000);

  function renderHud() {
    $("td-hud-depth").textContent = S.depth;
    $("td-hud-energy").textContent = "❤️".repeat(Math.max(0, S.energy)) + "🖤".repeat(Math.max(0, S.energyMax - S.energy)) + (S.shield ? " 🛡️" : "");
    $("td-hud-bagc").textContent = S.bag.coins; $("td-hud-bagg").textContent = S.bag.gems;
    const c = $("td-hud-combo"); c.classList.toggle("hidden", S.streak < 2); c.textContent = `🔥 x${S.streak}`; c.classList.toggle("hot", S.streak >= 3);
    $("td-miner").classList.toggle("fire", S.streak >= 3);
  }
  function setSheet(html) { $("td-sheet").innerHTML = html; return $("td-sheet"); }
  function flash(color) { const f = $("td-flash"); f.style.background = color; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function shake() { scene.classList.remove("shake"); void scene.offsetWidth; scene.classList.add("shake"); }
  function floatText(text, dx = 0) { const f = document.createElement("div"); f.className = "td-float"; f.textContent = text; f.style.marginLeft = dx + "px"; scene.appendChild(f); setTimeout(() => f.remove(), 1000); }
  let boTimer = null;
  function bo(text) { $("td-bo-text").textContent = text; $("td-bo").classList.remove("off"); clearTimeout(boTimer); boTimer = setTimeout(() => $("td-bo").classList.add("off"), 3800); }
  const boLine = k => bo(pick(BO_LINES[k]));
  const dly = ms => delay(settings.motion ? 60 : ms);

  // ---------------- questions ----------------
  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    if (!m) return { prompt: q.prompt, options: shuffle([String(q.answer), "0", "1", "2"]), correctLabel: String(q.answer) };
    const correctNum = Number(m[1].replace(/,/g, "")), suffix = m[2] || "";
    const options = new Set([correctNum]); let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const mag = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + mag * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump2 = 1; while (options.size < 4) options.add(correctNum + bump2++);
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix), correctLabel: correctNum.toLocaleString("en-US") + suffix };
  }
  function rollMath(tier) { const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)]; return { key, ...buildMc(MATHVILLE_GENERATORS[key](tier)) }; }
  function pickQ(tier) {
    for (let i = 0; i < 6; i++) {
      const P = window.AIGQuestionPools;
      const q = P ? P.rollMixed(() => rollMath(tier)) : rollMath(tier);
      if (!S.seen.has(q.prompt) || i === 5) { S.seen.add(q.prompt); return q; }
    }
  }

  // ask(): shows a question in the bottom sheet -> {ok, blast, timeout}
  function ask(o) {
    return new Promise(resolve => {
      let q = pickQ(o.tier), done = false, left = o.timerMs || 0, tid = null;
      const total = left;
      function render() {
        S.lastQ = q;
        const sh = setSheet(`${o.header || ""}${total ? `<div class="td-timer" id="td-timer"><i></i></div>` : ""}<div class="td-q-prompt"></div><div class="td-q-grid"></div><div class="td-tools" id="td-tools"></div>`);
        sh.querySelector(".td-q-prompt").textContent = q.prompt;
        const grid = sh.querySelector(".td-q-grid");
        q.options.forEach(opt => {
          const b = document.createElement("button"); b.type = "button"; b.className = "td-q-btn"; b.textContent = opt;
          b.onclick = () => answer(b, opt); grid.appendChild(b);
        });
        if (o.lifelines) {
          const tools = $("td-tools");
          const mk = (label, n, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "td-tool-btn"; b.textContent = `${label} ×${n}`; b.disabled = n <= 0; b.onclick = fn; tools.appendChild(b); return b; };
          mk("🎯 50/50", S.fifty, useFifty); mk("⏭ Skip", S.skip, useSkip);
          if (o.allowBlast) mk("💥 Blast", S.dynamite, useBlast);
        }
      }
      function startTimer() {
        if (!total) return;
        clearInterval(tid);
        tid = setInterval(() => {
          if (document.hidden || done) return;
          left -= 100;
          const t = $("td-timer"); if (t) { t.firstChild.style.width = Math.max(0, left / total * 100) + "%"; t.classList.toggle("low", left < total * 0.3); }
          if (left <= 3000 && left % 1000 === 0) sfx.tick();
          if (left <= 0) answer(null, null);
        }, 100);
      }
      function useFifty() {
        if (done || S.fifty <= 0) return; S.fifty--;
        const wrong = shuffle([...$("td-sheet").querySelectorAll(".td-q-btn")].filter(b => b.textContent !== q.correctLabel)).slice(0, 2);
        wrong.forEach(b => { b.disabled = true; b.classList.add("dim"); }); renderToolsOnly();
      }
      function useSkip() { if (done || S.skip <= 0) return; S.skip--; q = pickQ(o.tier); left = total; render(); startTimer(); }
      function useBlast() { if (done || S.dynamite <= 0) return; done = true; clearInterval(tid); S.dynamite--; resolve({ ok: false, blast: true }); }
      function renderToolsOnly() { const t = $("td-tools"); if (!t) return; t.querySelectorAll(".td-tool-btn").forEach(b => { if (b.textContent.startsWith("🎯")) { b.textContent = `🎯 50/50 ×${S.fifty}`; b.disabled = true; } }); }
      function answer(btn, opt) {
        if (done) return; done = true; clearInterval(tid);
        const ok = opt === q.correctLabel;
        $("td-sheet").querySelectorAll(".td-q-btn").forEach(b => { b.disabled = true; if (b.textContent === q.correctLabel) b.classList.add("correct"); else if (b === btn) b.classList.add("wrong"); });
        if (LB && LB.recordTopicAttempt) { try { LB.recordTopicAttempt("treasure-dig", q.key || "math", ok); } catch (e) {} }
        setTimeout(() => resolve({ ok, timeout: opt === null }), ok ? 550 : 900);
      }
      render(); startTimer();
    });
  }

  // ---------------- run flow ----------------
  function gainCorrect() {
    S.correct++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
    if (S.streak % 4 === 0 && S.dynamite < 3) { S.dynamite++; floatText("💥 +1 dynamite", 0); }
    bump("correct"); bump("combo", S.streak);
    sfx.good(); buzz(25); boLine("good"); renderHud(); checkAch();
  }
  async function mistake() { // -> true if the dig is over
    S.streak = 0; S.mistakes++;
    if (S.shield) { S.shield = false; floatText("🤖 Blocked!"); sfx.block(); renderHud(); return false; }
    S.energy--; flash("rgba(220,40,40,.6)"); shake(); sfx.bad(); buzz(120); boLine("bad"); renderHud();
    if (S.energy <= 0) { await delay(500); return true; }
    return false;
  }
  function addBag(c, g) { S.bag.coins += c; S.bag.gems += g; renderHud(); }
  function debris() {
    const cell = targetCell(); if (!cell) return;
    for (let i = 0; i < 8; i++) {
      const d = document.createElement("div"); d.className = "td-debris"; d.style.left = "50%"; d.style.top = "102px";
      d.style.setProperty("--dx", rand(-50, 50) + "px"); d.style.setProperty("--dy", rand(-40, 36) + "px"); scene.appendChild(d); setTimeout(() => d.remove(), 650);
    }
  }
  async function digDown() {
    const cell = targetCell(), tool = $("td-tool");
    tool.classList.remove("swing"); void tool.offsetWidth; tool.classList.add("swing"); sfx.dig(); buzz(15);
    await dly(260);
    cell.classList.add("crack"); debris(); cell.classList.add("breaking");
    await dly(320);
    S.depth++; bump("depth", S.depth);
    renderWorld(); renderHud();
    if (biomeOf(S.depth) !== biomeOf(S.depth - 1) || S.depth === 1) {
      const b = BIOMES[biomeOf(S.depth)], banner = document.createElement("div");
      banner.className = "td-biome-banner"; banner.textContent = `${b.emoji} ${b.name}`; scene.appendChild(banner); setTimeout(() => banner.remove(), 2700); bo(b.story);
    }
    await dly(650);
    checkAch();
  }

  function pickRelic(d, rich) {
    const r = Math.random(); let rar;
    if (rich) rar = r < 0.2 ? "C" : r < 0.75 ? "R" : "L"; else rar = r < 0.7 ? "C" : r < 0.95 ? "R" : "L";
    const maxB = biomeOf(d); const b = Math.random() < 0.55 ? maxB : rand(0, maxB);
    const list = RELICS.filter(x => x.b === b && x.rar === rar);
    return list.length ? pick(list) : pick(RELICS.filter(x => x.rar === rar));
  }
  async function relicFound(r) {
    const prev = td.relics[r.id] || 0; td.relics[r.id] = prev + 1;
    S.found.push({ r, isNew: prev === 0 });
    bump("relics"); sfx.relic(); buzz(60);
    let bonus = 0; if (prev > 0) { bonus = DUP_BONUS[r.rar]; addBag(bonus, 0); }
    $("td-relic-title").textContent = prev === 0 ? "✨ NEW RELIC! ✨" : "Relic found again";
    $("td-relic-emoji").textContent = r.emoji; $("td-relic-emoji").classList.remove("collected");
    $("td-relic-name").textContent = `${r.name} (${{ C: "Common", R: "Rare", L: "Legendary" }[r.rar]})`;
    $("td-relic-sub").textContent = prev === 0 ? "Added to your museum!" : `Already in your museum -- +${bonus} 🪙 in your bag.`;
    $("td-relic-hint").textContent = "Tap it!"; show("td-relic");
    await new Promise(res => {
      const btn = $("td-relic-btn");
      const h = () => { btn.removeEventListener("click", h); spark(btn); sfx.coin(); $("td-relic-hint").textContent = ""; $("td-relic-emoji").classList.add("td-pop"); setTimeout(() => { $("td-relic-emoji").classList.remove("td-pop"); hide("td-relic"); res(); }, 650); };
      btn.addEventListener("click", h);
    });
    save(); checkAch();
  }
  function spark(anchor) {
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span"); s.className = "td-sparkle"; s.textContent = pick(["✨", "⭐", "💫"]);
      const a = (360 / 8) * i, d = rand(40, 70), rad = a * Math.PI / 180;
      s.style.setProperty("--sx", Math.cos(rad) * d + "px"); s.style.setProperty("--sy", Math.sin(rad) * d + "px");
      anchor.appendChild(s); void s.offsetWidth; s.classList.add("firing"); setTimeout(() => s.remove(), 700);
    }
  }
  const pickMult = () => 1 + 0.15 * (td.pick || 0);
  const hasBuddy = id => look.buddy === id;

  async function lootStep(d, path) {
    const rock = path === "rock" ? 2 : 1, heat = S.streak >= 3 ? 1.5 : 1;
    if (Math.random() < Math.min(0.85, 0.35 + d * 0.03)) {
      const coins = Math.round(Math.min(14, 2 + Math.floor(d * 0.8)) * rock * pickMult() * heat);
      const gem = Math.random() < 0.08 + d * 0.02 + (hasBuddy("mole") ? 0.06 : 0) + (rock > 1 ? 0.05 : 0) ? 1 : 0;
      addBag(coins, gem); sfx.coin(); floatText(`+${coins} 🪙${gem ? " +1 💎" : ""}`);
      await dly(600);
    }
    if (Math.random() < 0.1 + (td.pick || 0) * 0.03 + (hasBuddy("mole") ? 0.08 : 0) + (rock > 1 ? 0.1 : 0) + (heat > 1 ? 0.03 : 0)) await relicFound(pickRelic(d, false));
    if (Math.random() < 0.04) { td.maps = (td.maps || 0) + 1; toast(`🗺️ Map piece ${Math.min(td.maps, 4)}/4`); save(); }
    if (Math.random() < 0.05) { const k = pick(["fifty", "skip"]); S[k]++; toast(k === "fifty" ? "🎯 Found a 50/50!" : "⏭ Found a Skip!"); }
    if (Math.random() < 0.13) await chestEvent(2, false);
  }

  function showMonster(emoji) { const m = $("td-monster"); m.textContent = emoji; m.classList.remove("hidden", "hurt"); }
  const hideMonster = () => $("td-monster").classList.add("hidden");

  async function chestEvent(need, secret) {
    showMonster("🧰"); sfx.chest(); toast(secret ? "🗝️ SECRET VAULT!" : "🔒 Locked chest!");
    let ok = true;
    for (let i = 0; i < need; i++) {
      const r = await ask({ tier: TIERS[tierIdxFor(S.depth + 1)], timerMs: S.mode === "speed" ? 12000 : 0, lifelines: false, header: `<h2>🔒 ${secret ? "Secret vault" : "Locked chest"} — lock ${i + 1}/${need}</h2>` });
      if (r.ok) { gainCorrect(); } else { S.streak = 0; renderHud(); ok = false; break; }
    }
    if (ok) {
      sfx.chest(); showMonster("✨"); buzz(80); flash("rgba(255,220,100,.6)");
      const coins = Math.round((20 + S.depth * 3) * pickMult() * (secret ? 2 : 1)), gem = secret || Math.random() < 0.4 ? 1 : 0;
      addBag(coins, gem); floatText(`+${coins} 🪙${gem ? " +1 💎" : ""}`); await dly(800); hideMonster();
      await relicFound(pickRelic(S.depth + 1, true));
      if (secret) { S.secretDone = true; checkAch(); }
    } else { toast("The lock jammed! 🔒"); sfx.bad(); await dly(700); hideMonster(); }
  }

  async function trapEvent(d) { // -> true if dead
    const t = pick([{ e: "🌋", n: "Lava leak!" }, { e: "☁️", n: "Toxic gas!" }, { e: "🪨", n: "Rockfall!" }]);
    sfx.warn(); flash("rgba(255,120,0,.5)"); shake(); showMonster(t.e); bo(`${t.n} Answer fast!`);
    const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: 9000, lifelines: false, header: `<h2>⚠️ ${t.n}</h2>` });
    hideMonster();
    if (r.ok) { gainCorrect(); addBag(2, 0); floatText("Dodged! +2 🪙"); await dly(500); return false; }
    return mistake();
  }

  async function bossFight(d) { // -> "dead" | "won"
    const b = BOSSES[(Math.floor(d / 5) - 1) % 5], tag = Math.floor((d / 5 - 1) / 5) > 0 ? "Elder " : "";
    let hp = 3 + Math.floor(d / 10); const maxHp = hp;
    showMonster(b.emoji); sfx.warn(); flash("rgba(160,0,0,.5)"); shake(); bo(`BOSS: ${tag}${b.name}!`);
    setSheet(`<h2>⚔️ BOSS: ${tag}${esc(b.name)}</h2><p>Answer ${hp} questions right to beat it. Wrong answers cost a heart!</p><button class="td-btn red" id="td-fight">⚔️ Fight!</button>`);
    await new Promise(res => { $("td-fight").onclick = res; });
    while (hp > 0) {
      const r = await ask({ tier: TIERS[Math.min(2, tierIdxFor(d) + (d >= 6 ? 0 : 0))], timerMs: S.mode === "speed" ? 15000 : 0, lifelines: true, header: `<h2>${b.emoji} ${esc(b.name)}</h2><div class="td-bosshp"><i style="width:${hp / maxHp * 100}%"></i></div>` });
      if (r.ok) {
        hp--; gainCorrect(); const m = $("td-monster"); m.classList.remove("hurt"); void m.offsetWidth; m.classList.add("hurt"); sfx.boom(); shake(); await dly(400);
      } else if (await mistake()) { hideMonster(); return "dead"; }
    }
    $("td-monster").textContent = "💥"; sfx.boom(); flash("rgba(255,200,80,.7)"); await dly(700); hideMonster();
    S.bosses++; bump("boss"); S.energy = Math.min(S.energyMax, S.energy + 1);
    await digDown();
    const coins = Math.round((10 + d * 2) * pickMult()); addBag(coins, 1); floatText(`BOSS LOOT +${coins} 🪙 +1 💎`); await dly(900);
    if (Math.random() < 0.25) { td.maps = (td.maps || 0) + 1; toast(`🗺️ Map piece ${Math.min(td.maps, 4)}/4`); }
    await relicFound(pickRelic(d, true)); checkAch(); renderHud();
    return "won";
  }

  function choosePath(d) {
    boLine("start");
    return new Promise(res => {
      setSheet(`<h2>Level ${d}: choose your wall</h2><p>${BIOMES[biomeOf(d)].name} — how brave are you?</p><div class="td-choice"><button type="button" data-p="soft"><span class="e">🟫</span>Soft dirt<small>Easier question · normal loot</small></button><button type="button" class="rock" data-p="rock"><span class="e">🪨</span>Hard rock<small>Harder question · 2× loot · more relics</small></button></div>`);
      $("td-sheet").querySelectorAll("button[data-p]").forEach(b => b.onclick = () => res(b.dataset.p));
    });
  }
  function campStep() {
    S.energy = Math.min(S.energyMax, S.energy + 1); renderHud(); boLine("camp"); sfx.chest();
    return new Promise(res => {
      setSheet(`<h2>🏕️ Camp!</h2><p>You rest and heal 1 ❤️.<br>Your bag: 🪙 ${S.bag.coins} · 💎 ${S.bag.gems}${S.found.length ? ` · 🏺 ${S.found.length}` : ""}<br>If you faint later you lose <b>half</b> of the coins and gems!</p><button class="td-btn green" id="td-cash">🏠 Cash out & go home (keep all)</button><button class="td-btn primary" id="td-go">⬇ Keep digging!</button>`);
      $("td-cash").onclick = () => res("cash"); $("td-go").onclick = () => res("go");
    });
  }

  async function runLoop() {
    while (!S.ended) {
      const d = S.depth + 1;
      if (d % 5 === 0) {
        if (await bossFight(d) === "dead") return endRun("dead");
      } else {
        if (S.secret && d === 4 && !S.secretDone) {
          setSheet(`<h2>🗝️ A secret door!</h2><p>Your map led you here. Crack 3 locks in a row for a jackpot!</p><button class="td-btn primary" id="td-secret">Open the door</button>`);
          await new Promise(res => { $("td-secret").onclick = res; });
          await chestEvent(3, true); S.secretDone = true; save();
        }
        let path = await choosePath(d), dug = false;
        if (d >= 3 && Math.random() < 0.2 && await trapEvent(d)) return endRun("dead");
        while (!dug) {
          const cell = targetCell(); if (cell) cell.classList.toggle("hard", path === "rock"); if (cell) cell.textContent = path === "rock" ? "🪨" : "";
          const ti = Math.max(0, Math.min(2, tierIdxFor(d) + (path === "rock" ? 1 : -1)));
          const r = await ask({ tier: TIERS[ti], timerMs: S.mode === "speed" ? 12000 : 0, lifelines: true, allowBlast: true, header: `<h2>⛏️ Level ${d} · ${path === "rock" ? "🪨 Hard rock" : "🟫 Soft dirt"}</h2>` });
          if (r.blast) {
            sfx.boom(); flash("rgba(255,160,40,.7)"); shake(); buzz(150); floatText("💥 BLAST!");
            await digDown(); if (S.depth % 5 !== 4) await digDown(); dug = true; path = "soft"; continue;
          }
          if (r.ok) { gainCorrect(); await digDown(); await lootStep(d, path); dug = true; if (S.depth >= 10 && !S.tenDone) { S.tenDone = true; addBag(0, 1); toast("🏆 10 m! +1 💎 bonus"); } }
          else if (await mistake()) return endRun("dead");
        }
      }
      if (S.ended) return;
      if (S.depth % 5 === 3 || S.depth % 5 === 0) { if (await campStep() === "cash") return endRun("cash"); }
    }
  }

  // ---------------- end of run ----------------
  async function endRun(kind) {
    if (S.ended && S.finalised) return; S.ended = true; S.finalised = true;
    if (window.AIGSynthBgm) AIGSynthBgm.stop();
    renderWorld(); hideMonster();
    const bagC = S.bag.coins, bagG = S.bag.gems;
    const bankC = kind === "dead" ? Math.floor(bagC / 2) : bagC, bankG = kind === "dead" ? Math.floor(bagG / 2) : bagG;
    try { await LB.awardTreasureDigLoot(bankC, bankG); } catch (e) {}
    let bonus = null;
    try { const r = await LB.awardTreasureDigRoundBonus(S.depth, 10); bonus = r && r.bonus; } catch (e) {}
    const prevBest = td.bestDepth || 0;
    td.runs = (td.runs || 0) + 1; td.bosses = (td.bosses || 0) + S.bosses; td.bestDepth = Math.max(prevBest, S.depth);
    const wk = LB.treasureDigWeekKey();
    if (!td.week || td.week.key !== wk) td.week = { key: wk, depth: 0 };
    td.week.depth = Math.max(td.week.depth, S.depth);
    if (kind === "cash") { bump("cash"); if (bankC >= 30) { td.achv = td.achv || {}; if (!td.achv.cash) { td.achv.cash = true; toast("🏅 Smart Miner! +5 🪙"); try { LB.creditWallet({ coins: 5 }); } catch (e) {} } } }
    checkAch(); await save(); await refreshWallet();
    const depth = S.depth, stars = depth >= 15 ? 3 : depth >= 10 ? 2 : depth >= 5 ? 1 : 0;
    $("td-end-emoji").textContent = kind === "cash" ? "💰" : depth >= 10 ? "🥳" : "😵";
    $("td-end-title").textContent = kind === "cash" ? "Safe and rich!" : depth >= 10 ? "You fainted deep down!" : "You fainted!";
    $("td-end-stars").innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? "on" : ""}" style="animation-delay:${i * 0.2}s">⭐</span>`).join("");
    $("td-end-lines").innerHTML = [
      ["⬇ Depth", `${depth} m${depth > prevBest ? " 🏆 new best!" : ""}`],
      ["🎒 Bag", `🪙 ${bagC} · 💎 ${bagG}`],
      ["💰 Kept", `🪙 ${bankC} · 💎 ${bankG}${kind === "dead" && (bagC || bagG) ? " (half lost)" : ""}`],
      ["⚔️ Bosses", S.bosses], ["🔥 Best combo", `x${S.bestStreak}`]
    ].map(r => `<div><span>${r[0]}</span><span>${r[1]}</span></div>`).join("");
    $("td-end-relics").innerHTML = S.found.length ? S.found.map(f => `<span class="${f.isNew ? "new" : ""}">${f.r.emoji} ${f.isNew ? "NEW " : ""}${esc(f.r.name)}</span>`).join("") : "<span>No relics this time</span>";
    $("td-end-bonus").textContent = bonus ? `Depth bonus: 🪙${bonus.coins || 0}${bonus.gems ? ` 💎${bonus.gems}` : ""}` : "";
    show("td-end"); sfx[kind === "cash" ? "chest" : "bad"]();
  }

  // ---------------- new run ----------------
  let mode = "chill";
  async function startDig() {
    hide("td-start"); hide("td-end");
    const potion = (td.supplies && td.supplies.potion) || 0;
    S = { depth: 0, energyMax: 3 + (potion > 0 ? 1 : 0), energy: 0, bag: { coins: 0, gems: 0 }, found: [], streak: 0, bestStreak: 0, dynamite: 0,
      fifty: 1 + (hasBuddy("owl") ? 1 : 0) + ((td.supplies && td.supplies.fifty) || 0), skip: 1 + ((td.supplies && td.supplies.skip) || 0),
      mistakes: 0, bosses: 0, correct: 0, secret: (td.maps || 0) >= 4, secretDone: false, shield: hasBuddy("robot"), ended: false, mode, seen: new Set() };
    S.energy = S.energyMax;
    td.supplies = { fifty: 0, skip: 0, potion: 0 }; if (S.secret) td.maps -= 4;
    save();
    resetWorld(); initMotes(); renderWorld(); renderHud(); hideMonster(); applyLook();
    if (settings.sound && window.AIGSynthBgm) AIGSynthBgm.start();
    if (S.secret) toast("🗺️ Your map is complete! A secret vault awaits at 4 m.");
    await runLoop();
  }

  // ---------------- overlays ----------------
  function openHome() {
    $("td-st-best").textContent = `Best: ${td.bestDepth || 0} m`;
    $("td-st-streak").textContent = `🔥 Day ${td.streak || 1}`;
    $("td-st-relics").textContent = `🏺 ${relicCount()}/${RELICS.length}`;
    $("td-board").textContent = "Loading this week's top diggers…";
    LB.getTreasureDigWeeklyTop().then(top => {
      const medals = ["🥇", "🥈", "🥉"];
      $("td-board").innerHTML = `<b>🏆 Deepest this week</b><br>` + (top.length ? top.map((t, i) => `${medals[i]} ${esc(pretty(t.id))} — ${t.depth} m`).join("<br>") : "Nobody yet — be the first!");
    }).catch(() => { $("td-board").textContent = ""; });
    show("td-start");
  }
  function idleSheet() { setSheet(`<h2>⛏️ Ready to dig?</h2><p>Open the menu to start.</p>`); }

  let workTab = "pick";
  function costTxt(c) { return c ? (c.coins ? `🪙 ${c.coins}` : `💎 ${c.gems}`) : ""; }
  async function renderWork() {
    await refreshCosmetics(); await refreshWallet();
    const body = $("td-work-body");
    document.querySelectorAll("#td-work-tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === workTab));
    const money = `<p class="td-sub">Your wallet: 🪙 ${wallet.coins || 0} · 💎 ${wallet.gems || 0}</p>`;
    if (workTab === "pick") {
      const lv = td.pick || 0, next = LB.TD_PICK_COSTS[lv];
      body.innerHTML = `${money}<div class="td-big">⛏️</div><div class="bh">${PICK_NAMES[lv]} Pickaxe · Lv ${lv}/3</div><p class="td-sub">Each level: +15% coins and +3% relic chance.<br>Now: +${lv * 15}% coins.</p>` +
        (next ? `<button class="td-btn primary" id="td-buy-pick">Upgrade to ${PICK_NAMES[lv + 1]} — 🪙 ${next}</button>` : `<p class="td-sub">MAX level! ✨</p>`);
      const b = $("td-buy-pick"); if (b) b.onclick = async () => { const r = await LB.buyTreasureDigPick(td); if (!r.ok) { toast("Not enough coins yet!"); return; } sfx.chest(); toast("Pickaxe upgraded!"); renderWork(); };
    } else if (workTab === "pack") {
      const items = [["fifty", "🎯", "50/50", "Removes 2 wrong answers", 8], ["skip", "⏭", "Skip", "Swap for a new question", 8], ["potion", "🧪", "Energy potion", "+1 ❤️ for next dig", 15]];
      body.innerHTML = `${money}<p class="td-sub">Buy extras for your NEXT dig (max 3 each).</p>` + items.map(it => `<div class="td-row2"><span>${it[1]} ${it[2]} <small style="color:#cbb593">(${it[3]}) · have ${td.supplies[it[0]] || 0}</small></span><button class="td-btn green" data-k="${it[0]}" data-c="${it[4]}">🪙 ${it[4]}</button></div>`).join("");
      body.querySelectorAll("button[data-k]").forEach(b => b.onclick = async () => {
        const k = b.dataset.k; if ((td.supplies[k] || 0) >= 3) { toast("Max 3!"); return; }
        const r = await LB.spendTreasureDigCoins(+b.dataset.c); if (!r.ok) { toast("Not enough coins yet!"); return; }
        td.supplies[k] = (td.supplies[k] || 0) + 1; await save(); sfx.coin(); renderWork();
      });
    } else {
      const sections = workTab === "look" ? [["treasuredig-pick", "Pickaxe skin", "pick"], ["treasuredig-helmet", "Helmet", "helmet"]] : [["treasuredig-buddy", "Buddy", "buddy"]];
      body.innerHTML = money + sections.map(s => `<div class="bh" style="margin:8px 0 4px">${s[1]}</div><div class="td-grid g3" id="g-${s[0]}"></div>`).join("");
      sections.forEach(([type, , key]) => {
        const list = (cosmetics && cosmetics.costumes[type]) || [];
        const g = $("g-" + type);
        g.innerHTML = list.map(it => {
          const sel = look[key] === it.id;
          const btn = it.owned ? (sel ? `<button class="td-btn green" disabled>ON</button>` : `<button class="td-btn dark" data-a="eq" data-id="${it.id}">Equip</button>`) : `<button class="td-btn primary" data-a="buy" data-id="${it.id}">${costTxt(it.cost)}</button>`;
          return `<div class="td-item ${sel ? "sel" : ""} ${it.owned ? "" : "locked"}"><span class="big">${it.preview}</span>${esc(it.name.split(" -- ")[0])}${it.name.includes(" -- ") ? `<small>${esc(it.name.split(" -- ")[1])}</small>` : ""}${btn}</div>`;
        }).join("");
        g.querySelectorAll("button[data-a]").forEach(b => b.onclick = async () => {
          const it = list.find(x => x.id === b.dataset.id);
          if (b.dataset.a === "buy") { const r = await LB.unlockCosmetic(type, it.id, it.cost); if (!r.ok) { toast("Not enough yet!"); return; } sfx.chest(); }
          await LB.equipCosmetic(type, it.id); renderWork();
        });
      });
    }
  }
  function openMuseum() {
    $("td-museum-sub").textContent = `Found ${relicCount()}/${RELICS.length} relics. Rarer ones hide in harder rock and bosses!`;
    $("td-museum-grid").innerHTML = RELICS.map(r => { const n = td.relics[r.id] || 0; return `<div class="td-item ${n ? r.rar : ""}" data-n="${esc(n ? r.name : "???")}"><span class="big">${n ? r.emoji : "❓"}</span>${n > 1 ? `<span class="cnt">×${n}</span>` : ""}</div>`; }).join("");
    $("td-museum-grid").querySelectorAll(".td-item").forEach(el => el.onclick = () => toast(el.dataset.n));
    $("td-badge-grid").innerHTML = ACHIEVEMENTS.map(a => `<div class="td-item ${td.achv && td.achv[a.id] ? "" : "locked"}"><span class="big">${a.icon}</span>${esc(a.name)}<small>${esc(a.text)}</small></div>`).join("");
    show("td-museum");
  }
  function openMissions() {
    const list = td.missions.list;
    $("td-mission-list").innerHTML = list.map((m, i) => {
      const d = MISSION_DEFS.find(x => x.type === m.type), done = m.prog >= m.target;
      const btn = m.claimed ? `<button class="td-btn green" disabled>Done ✔</button>` : done ? `<button class="td-btn primary" data-i="${i}">Claim 🪙${m.reward}</button>` : `<button class="td-btn dark" disabled>${m.prog}/${m.target}</button>`;
      return `<div class="td-row2"><span>${d.text(m.target)}</span>${btn}</div>`;
    }).join("") + `<p class="td-sub" style="margin-top:10px">Claim all 3 for a bonus 💎!</p>`;
    $("td-mission-list").querySelectorAll("button[data-i]").forEach(b => b.onclick = async () => {
      const m = list[+b.dataset.i]; if (m.claimed || m.prog < m.target) return; m.claimed = true;
      const all = list.every(x => x.claimed); await LB.creditWallet({ coins: m.reward, gems: all ? 1 : 0 });
      await save(); sfx.good(); toast(all ? `+${m.reward} 🪙 and a 💎!` : `+${m.reward} 🪙`); openMissions();
    });
    show("td-missions");
  }
  async function claimDaily() {
    if (td.dailyDay === todayStr()) { toast("Come back tomorrow for another chest!"); return; }
    td.dailyDay = todayStr(); const coins = 8 + Math.min(td.streak || 1, 7) * 3, gems = (td.streak || 1) % 3 === 0 ? 1 : 0;
    await LB.creditWallet({ coins, gems }); await save(); sfx.chest(); toast(`🎁 Daily chest: +${coins} 🪙${gems ? " +1 💎" : ""}`);
  }

  const TUT = [
    { e: "⛏️", t: "Dig deeper!", x: "Pick soft dirt or hard rock, then answer the question to swing your pickaxe. Right answer = the block breaks!" },
    { e: "💰", t: "Loot & relics", x: "Coins and gems go in your BAG. Relics go in your museum. Cash out at camps to keep it all. Faint and you lose half!" },
    { e: "⚔️", t: "Bosses & tricks", x: "A boss waits every 5 m. Streaks give 💥 dynamite to blast through 2 layers. Use 🎯 50/50 and ⏭ Skip when stuck." }
  ];
  let tutI = 0;
  function showTut() { const t = TUT[tutI]; $("td-tut-emoji").textContent = t.e; $("td-tut-title").textContent = t.t; $("td-tut-text").textContent = t.x; $("td-tut-next").textContent = tutI === TUT.length - 1 ? "Let's dig!" : "Next"; show("td-tutorial"); }

  // ---------------- wiring ----------------
  $("td-start-btn").onclick = startDig;
  $("td-again").onclick = startDig;
  $("td-end-home").onclick = () => { hide("td-end"); idleSheet(); openHome(); };
  $("td-open-work").onclick = () => { renderWork(); show("td-work"); };
  $("td-open-museum").onclick = openMuseum;
  $("td-open-missions").onclick = openMissions;
  $("td-open-daily").onclick = claimDaily;
  $("td-settings-btn").onclick = () => show("td-settings");
  document.querySelectorAll(".td-close").forEach(b => b.onclick = () => b.closest(".td-overlay").classList.add("hidden"));
  document.querySelectorAll("#td-work-tabs button").forEach(b => b.onclick = () => { workTab = b.dataset.t; renderWork(); });
  document.querySelectorAll("#td-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; document.querySelectorAll("#td-mode button").forEach(x => x.classList.toggle("on", x === b)); });
  $("td-set-sound").onclick = () => { settings.sound = !settings.sound; applySettings(); };
  $("td-set-haptics").onclick = () => { settings.haptics = !settings.haptics; applySettings(); };
  $("td-set-motion").onclick = () => { settings.motion = !settings.motion; applySettings(); };
  $("td-tut-next").onclick = () => { if (tutI < TUT.length - 1) { tutI++; showTut(); } else { hide("td-tutorial"); try { localStorage.setItem("td_seen_tut", "1"); } catch (e) {} } };
  applySettings();

  // ---------------- boot ----------------
  (async function boot() {
    $("td-start-btn").disabled = true;
    try { td = await LB.getTreasureDig(); } catch (e) { td = null; }
    if (!td) td = { bestDepth: 0, runs: 0, bosses: 0, relics: {}, pick: 0, achv: {}, maps: 0, supplies: { fifty: 0, skip: 0, potion: 0 }, week: { key: "", depth: 0 }, streak: 0, lastDay: "", missions: { day: "", list: [] }, dailyDay: "" };
    td.relics = td.relics || {}; td.achv = td.achv || {}; td.supplies = Object.assign({ fifty: 0, skip: 0, potion: 0 }, td.supplies || {});
    ensureDaily(); save();
    await refreshCosmetics(); await refreshWallet();
    if (LB.watchWallet) LB.watchWallet(w => { wallet = w; $("td-hud-coins").textContent = w.coins || 0; $("td-hud-gems").textContent = w.gems || 0; });
    S = { depth: 0, energyMax: 3, energy: 3, bag: { coins: 0, gems: 0 }, found: [], streak: 0, ended: true, seen: new Set(), shield: false };
    resetWorld(); initMotes(); renderWorld(); renderHud(); idleSheet();
    $("td-start-btn").disabled = false; openHome();
    let seen = false; try { seen = !!localStorage.getItem("td_seen_tut"); } catch (e) {}
    if (!seen) { tutI = 0; showTut(); }
  })();

}
