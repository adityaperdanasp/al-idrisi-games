/* =================================================================
   Treasure Dig -- now with a clock that never stops. A lava flood chases
   you down the shaft, your torch burns out, questions have shrinking
   timers, rocks fall and bats dive while you think, and every 5 m a boss
   fights back with real attacks you have to dodge. Between levels there
   are traps, levers, bridges, bombs, mazes, shortcuts, tap-to-dig sprints
   and a minecart ride; at camps you choose to cash out, climb, gamble or
   fight a mini-boss. A rival (robot, your own ghost, or the class pace)
   races you down, the heartbeat music speeds up with the danger, and the
   same seed gives two kids the exact same tunnel. "Chill" mode keeps the
   old relaxed dig with no timers. Questions still come from the shared
   math / language / science pools.
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
  const ROW = 64, CAM_OFFSET = 36, LANE_PX = 48, DRAGON_GOAL = 150;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const TIERS = ["easy", "medium", "hard"];
  const BIOMES = [
    { name: "Topsoil", emoji: "🟫", deco: ["🦴", "🐚", "🌱"], story: "Soft earth and old bones. The lava is coming!" },
    { name: "Stone Caves", emoji: "🪨", deco: ["🪨", "🔩", "🕳️"], story: "Cold stone and echoing tunnels." },
    { name: "Crystal Cavern", emoji: "🔷", deco: ["🔹", "💎", "🟣"], story: "Crystals glow in the dark. Sparkly!" },
    { name: "Lava Depths", emoji: "🌋", deco: ["🔥", "🌋", "💀"], story: "It's getting HOT down here..." },
    { name: "Ancient City", emoji: "🏛️", deco: ["📜", "🏺", "🗿"], story: "A lost city, buried for ages." }
  ];
  const BOSSES = [
    { name: "Mole King", emoji: "🐀", atk: "🪨", lanes: 1, warn: 900 }, { name: "Stone Golem", emoji: "🗿", atk: "🪨", lanes: 1, warn: 800 },
    { name: "Crystal Spider", emoji: "🕷️", atk: "🕸️", lanes: 2, warn: 900 }, { name: "Lava Dragon", emoji: "🐲", atk: "🔥", lanes: 2, warn: 800 },
    { name: "Pharaoh Ghost", emoji: "👻", atk: "💀", lanes: 1, warn: 600 }
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
    { id: "secret", icon: "🗝️", name: "Treasure Hunter", text: "Open the secret vault" }, { id: "legend", icon: "👑", name: "Legend Found", text: "Find a legendary relic" },
    { id: "rival", icon: "🏁", name: "Rival Beaten", text: "Dig deeper than your rival" }, { id: "cart", icon: "🛒", name: "Cart Racer", text: "Finish a minecart ride" },
    { id: "climb", icon: "🧗", name: "Rope Master", text: "Climb out successfully" }, { id: "gamble", icon: "🎲", name: "High Roller", text: "Win a bag gamble" },
    { id: "swat", icon: "🦇", name: "Bat Swatter", text: "Swat 5 bats in one dig" }, { id: "lava", icon: "🌋", name: "Hot Foot", text: "Survive a lava burn" },
    { id: "arrow", icon: "🏹", name: "Acrobat", text: "Dodge 3 arrows in a row" }, { id: "puzzle", icon: "🧩", name: "Puzzle Pro", text: "Open a temple door" },
    { id: "detector", icon: "📡", name: "Treasure Sniffer", text: "Find a chest with the detector" }, { id: "npc", icon: "🤝", name: "Friendly Miner", text: "Make a deal with a stranger" }
  ];
  const MISSION_DEFS = [
    { type: "depth", text: n => `Dig down to ${n} m`, target: [4, 6], reward: 12, max: true },
    { type: "relics", text: n => `Find ${n} relic${n > 1 ? "s" : ""}`, target: [1, 2], reward: 14 },
    { type: "correct", text: n => `Answer ${n} questions right`, target: [10, 16], reward: 12 },
    { type: "boss", text: () => "Beat a boss", target: [1, 1], reward: 20 },
    { type: "cash", text: () => "Cash out at a camp", target: [1, 1], reward: 15 },
    { type: "combo", text: n => `Reach a ${n}x combo`, target: [4, 6], reward: 14, max: true },
    { type: "relicB", biome: true, text: (n, b) => `Find ${n} relic${n > 1 ? "s" : ""} in ${BIOMES[b || 0].name}`, target: [1, 2], reward: 18 },
    { type: "noHit", text: () => "Beat a boss without losing a heart", target: [1, 1], reward: 25 },
    { type: "swat", text: n => `Swat ${n} bats`, target: [3, 5], reward: 14 }
  ];
  const BUFFS = [
    { id: "time", e: "⏱", n: "Calm Mind", d: "+3s on every question", apply: S => { S.timeBonus += 3000; } },
    { id: "heart", e: "❤️", n: "Tough Skin", d: "+1 heart", apply: S => { S.energyMax++; S.energy++; } },
    { id: "tank", e: "🛢", n: "Big Tank", d: "Torch burns 40% slower", apply: S => { S.fuelMul *= 0.6; } },
    { id: "boots", e: "🧊", n: "Cool Boots", d: "Lava 25% slower", apply: S => { S.lavaMul *= 0.75; } },
    { id: "fifty", e: "🎯", n: "Sharp Eye", d: "+2 50/50", apply: S => { S.fifty += 2; } },
    { id: "dyn", e: "💥", n: "Demolition", d: "Start with 2 dynamite", apply: S => { S.dynamite += 2; } },
    { id: "greed", e: "💰", n: "Greedy", d: "+40% loot", bad: "Lava 20% faster", apply: S => { S.lootMul *= 1.4; S.lavaMul *= 1.2; } },
    { id: "risk", e: "🎰", n: "All In", d: "Loot ×2", bad: "Timers 20% shorter", apply: S => { S.lootMul *= 2; S.curse++; } }
  ];
  const PICK_NAMES = ["Wood", "Iron", "Diamond", "Gold"];
  const RIVALS = { slow: { speed: 0.06, name: "Turtle", e: "🐢" }, bot: { speed: 0.1, name: "Robot", e: "🤖" }, fast: { speed: 0.15, name: "Rocket", e: "🚀" } };
  const BO_LINES = {
    start: ["Lava's coming! Dig fast!", "Tap the left/right of the mine to dodge!", "Keep moving, don't let the lava catch you!"],
    good: ["Nice swing!", "Crack! Right answer!", "You're a natural digger!", "Boom! Keep it up!"],
    bad: ["Ouch, try again!", "Don't worry, read it slowly.", "That one was tricky!"],
    camp: ["A camp! Cash out or go deeper?", "Safe spot. Think about your bag..."],
    danger: ["The lava is close!! Hurry!", "Faster! I can feel the heat!", "Don't stop digging!"]
  };

  // ---------------- helpers ----------------
  const R = () => (S && S.rng ? S.rng() : Math.random());          // seeded randomness for the tunnel
  const rr = (a, b) => Math.floor(R() * (b - a + 1)) + a;
  const rpick = arr => arr[rr(0, arr.length - 1)];
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;  // cosmetic randomness
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
  function ctx() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch (e) { return null; } }
  function beep(freq, dur = 0.1, type = "square", vol = 0.05, when = 0) {
    if (!settings.sound) return;
    const c = ctx(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
      const t0 = c.currentTime + when;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }
  function kick(vol = 0.14) {
    if (!settings.sound) return; const c = ctx(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime;
      o.type = "sine"; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.22);
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
    tick: () => beep(440, 0.05, "square", 0.03),
    tock: () => beep(660, 0.07, "square", 0.05),
    swish: () => beep(900, 0.08, "triangle", 0.04),
    lava: () => { beep(90, 0.5, "sawtooth", 0.1); beep(60, 0.6, "sawtooth", 0.08, 0.1); },
    slow: () => beep(150, 0.7, "sine", 0.1)
  };
  const buzz = ms => { if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

  // adaptive heartbeat music: tempo + intensity follow the danger level
  let pulseOn = false, pulseTimer = null, beatN = 0;
  const BASS = [55, 65.4, 73.4, 82.4, 98];
  function startPulse() { if (pulseOn) return; pulseOn = true; beatN = 0; beat(); }
  function stopPulse() { pulseOn = false; clearTimeout(pulseTimer); }
  function beat() {
    if (!pulseOn) return;
    const d = S ? (S.danger || 0) : 0, depth = S ? S.depth : 0;
    const ms = Math.round(780 - d * 440 - Math.min(depth, 20) * 7);
    if (S && S.hold <= 0 && !S.ended) {
      kick(0.1 + d * 0.12);
      if (beatN % 2 === 0) beep(BASS[(Math.floor(beatN / 2) + depth) % BASS.length], 0.28, "triangle", 0.06 + d * 0.04);
      if (d > 0.45) beep(1200, 0.03, "square", 0.025, ms / 2000);
    }
    beatN++; pulseTimer = setTimeout(beat, ms);
  }

  // ---------------- persistent data ----------------
  let td = null, wallet = { coins: 0, gems: 0 }, cosmetics = null, tops = null;
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

  // ---------------- daily / missions / achievements ----------------
  function ensureDaily() {
    const today = todayStr();
    if (td.lastDay !== today) { td.streak = td.lastDay === yesterdayStr() ? (td.streak || 0) + 1 : 1; td.lastDay = today; }
    if (!td.missions || td.missions.day !== today) {
      const rng = mulberry32(hashStr(today + "|td|" + player.id));
      const idxs = MISSION_DEFS.map((d, i) => i).sort(() => rng() - 0.5).slice(0, 3);
      td.missions = { day: today, list: idxs.map(i => {
        const d = MISSION_DEFS[i], target = d.target[0] === d.target[1] ? d.target[0] : d.target[Math.floor(rng() * 2)];
        const m = { type: d.type, target, prog: 0, claimed: false, reward: d.reward }; if (d.biome) m.b = Math.floor(rng() * 5); return m;
      }) };
    }
  }
  function bump(type, n = 1, b) {
    if (!td.missions || !td.missions.list) return;
    const def = MISSION_DEFS.find(d => d.type === type);
    td.missions.list.forEach(m => { if (m.type !== type || m.claimed || (m.b !== undefined && m.b !== b)) return; m.prog = Math.min(m.target, def && def.max ? Math.max(m.prog || 0, n) : (m.prog || 0) + n); });
  }
  function unlockAch(id) {
    td.achv = td.achv || {}; if (td.achv[id]) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    td.achv[id] = true; toast(`🏅 ${a.name}! +5 🪙`); try { LB.creditWallet({ coins: 5 }); } catch (e) {}
  }
  function checkAch() {
    if (!S) return;
    if (S.depth >= 5) unlockAch("d5"); if (S.depth >= 10) unlockAch("d10"); if (S.depth >= 15) unlockAch("d15");
    if (S.bosses > 0) unlockAch("boss"); if (S.depth >= 5 && S.mistakes === 0) unlockAch("flawless");
    if (S.bestStreak >= 8) unlockAch("combo"); if (relicCount() >= 10) unlockAch("relic10");
    if (S.secretDone) unlockAch("secret"); if (RELICS.some(r => r.rar === "L" && td.relics[r.id] > 0)) unlockAch("legend");
    if (S.swats >= 5) unlockAch("swat");
  }

  // ---------------- run state helpers ----------------
  let S = null, rowsBuilt = 0, loopTimer = null, lastTick = 0;
  const world = $("td-world"), scene = $("td-scene"), cam = $("td-cam"), fx = $("td-fx"), heroEl = $("td-hero");
  let lavaEl = null, lavaFace = null, rivalEl = null;
  const hold = () => { if (S) S.hold++; };
  const release = () => { if (S) S.hold = Math.max(0, S.hold - 1); };
  const waitFor = setup => new Promise(res => { if (!S || S.ended) { res({ aborted: true }); return; } const st = S, w = v => { const i = st.waiters.indexOf(w); if (i >= 0) st.waiters.splice(i, 1); res(v); }; st.waiters.push(w); setup(w); });
  const dly = ms => delay(settings.motion ? 60 : ms);

  // ---------------- world rendering ----------------
  function buildRow(i) {
    const row = document.createElement("div");
    if (i === 0) {
      row.className = "td-row surface"; row.innerHTML = `<div class="td-wall"><span style="left:30%;top:14px">🌳</span></div><div class="td-cell dug"></div><div class="td-wall"><div class="td-sun">☀️</div><span style="left:40%;top:16px">🌲</span></div>`;
    } else {
      const b = biomeOf(i); row.className = `td-row b${b}`;
      const deco = () => Math.random() < 0.38 ? `<span style="left:${rand(8, 70)}%">${pick(BIOMES[b].deco)}</span>` : "";
      row.innerHTML = `<div class="td-wall">${deco()}</div><div class="td-cell"></div><div class="td-wall"><div class="td-rv"></div>${deco()}</div>`;
    }
    row._cell = row.querySelector(".td-cell"); row._rv = row.querySelector(".td-rv"); world.appendChild(row); world._rows[i] = row;
  }
  function resetWorld() {
    world.innerHTML = ""; world._rows = {}; rowsBuilt = 0;
    lavaEl = document.createElement("div"); lavaEl.className = "td-lava hidden"; lavaFace = document.createElement("div"); lavaFace.className = "td-lava-face"; lavaEl.appendChild(lavaFace); world.appendChild(lavaEl);
    rivalEl = document.createElement("div"); rivalEl.className = "td-rival hidden"; world.appendChild(rivalEl);
  }
  function renderWorld() {
    while (rowsBuilt <= S.depth + 8) buildRow(rowsBuilt++);
    Object.keys(world._rows).forEach(k => {
      const i = +k, c = world._rows[i]._cell;
      c.classList.toggle("dug", i <= S.depth);
      c.classList.toggle("target", i === S.depth + 1 && !S.ended);
      if (i > S.depth) c.classList.remove("breaking");
    });
    world.style.transform = `translateY(${CAM_OFFSET - S.depth * ROW}px)`;
    scene.dataset.biome = String(biomeOf(Math.max(1, S.depth)));
    renderDynamic();
  }
  const targetCell = () => world._rows[S.depth + 1] && world._rows[S.depth + 1]._cell;
  function initMotes() {
    const m = $("td-motes"); m.innerHTML = "";
    for (let i = 0; i < 8; i++) { const d = document.createElement("i"); d.style.left = rand(4, 96) + "%"; d.style.animationDelay = (-Math.random() * 6) + "s"; d.style.animationDuration = rand(5, 9) + "s"; m.appendChild(d); }
    const se = season(); if (se) for (let i = 0; i < 4; i++) { const e = document.createElement("i"); e.textContent = se.emoji; e.style.cssText = `left:${rand(6, 94)}%;background:none;width:auto;height:auto;font-size:.95rem;animation-delay:${-Math.random() * 6}s;animation-duration:${rand(6, 10)}s`; m.appendChild(e); }
  }

  // everything that changes every tick: lava, bars, darkness, danger
  function renderDynamic() {
    if (!S) return;
    const gap = S.depth - S.lava;
    $("td-lava-bar").classList.toggle("hidden", !S.pressure); $("td-fuel-bar").classList.toggle("hidden", !S.pressure);
    if (S.pressure) {
      lavaEl.classList.toggle("hidden", S.lava < -3);
      lavaEl.style.height = Math.max(10, S.lava * ROW + 420) + "px";
      lavaFace.textContent = gap < 3 ? "🐛" : "🔥";
      $("td-lava-fill").style.width = clamp(gap / 6, 0, 1) * 100 + "%";
      $("td-lava-bar").classList.toggle("low", gap < 2);
      $("td-fuel-fill").style.width = clamp(S.fuel, 0, 100) + "%";
      $("td-fuel-bar").classList.toggle("low", S.fuel < 25);
      $("td-heat").style.opacity = clamp((4 - gap) / 4, 0, 0.9);
      const depthDark = Math.min(0.8, S.depth * 0.04), fuelDark = S.fuel < 40 ? (40 - S.fuel) / 40 * 0.92 : 0;
      $("td-dark").style.setProperty("--dark", Math.max(depthDark, fuelDark, S.darkBase || 0));
    } else {
      lavaEl.classList.add("hidden"); $("td-heat").style.opacity = 0;
      $("td-dark").style.setProperty("--dark", Math.max(Math.min(0.8, S.depth * 0.045), S.darkBase || 0));
    }
    // rival marker
    if (S.rivalSpeed > 0) {
      rivalEl.classList.remove("hidden"); rivalEl.textContent = S.rivalIcon; rivalEl.style.top = Math.max(0, S.rival) * ROW + 8 + "px";
      const diff = S.depth - Math.floor(S.rival), chip = $("td-rival-chip");
      chip.textContent = `${S.rivalIcon} ${Math.floor(S.rival)} m (${diff >= 0 ? "you +" + diff : "behind " + (-diff)})`;
      chip.style.borderColor = diff >= 0 ? "#3fb86f" : "#e35252";
      const rf = Math.floor(S.rival);
      if (rf !== S.rvShown) { S.rvShown = rf; Object.keys(world._rows).forEach(k => { const r = world._rows[k]; if (r._rv) r._rv.classList.toggle("dug", +k <= rf); }); }
      const wallW = (scene.clientWidth - 150) / 2; rivalEl.style.left = (scene.clientWidth / 2 + 75 + wallW * 0.62 + 13 - 11) + "px";
    }
    // danger level -> vignette, bars, music tempo, camera, miner mood
    let d = 0;
    if (S.pressure) {
      d = Math.max(d, gap < 4 ? (4 - gap) / 4 : 0);
      if (S.fuel < 25) d = Math.max(d, (25 - S.fuel) / 25 * 0.8);
      if (S.qFrac !== undefined && S.qFrac < 0.3) d = Math.max(d, 0.75);
    }
    if (S.energy === 1 && !S.ended) d = Math.max(d, 0.55);
    S.danger = Math.min(1, d);
    $("td-danger").style.opacity = S.danger; $("td-danger").classList.toggle("on", S.danger > 0.3);
    cam.classList.toggle("wide", S.pressure && gap < 2 && !S.slowmo && !S.ended);
    heroEl.classList.toggle("scared", S.danger > 0.5 && !S.slowmo);
    heroEl.classList.toggle("joy", S.streak >= 3 && S.danger <= 0.5);
    if (S.pressure && gap < 2.2 && !S.dangerBo && S.live) { S.dangerBo = true; boLine("danger"); setTimeout(() => { if (S) S.dangerBo = false; }, 9000); }
  }

  function renderHud() {
    $("td-hud-depth").textContent = S.depth;
    $("td-hud-energy").textContent = "❤️".repeat(Math.max(0, S.energy)) + "🖤".repeat(Math.max(0, S.energyMax - S.energy)) + (S.shield ? " 🛡️" : "");
    $("td-hud-bagc").textContent = S.bag.coins; $("td-hud-bagg").textContent = S.bag.gems;
    const c = $("td-hud-combo"); c.classList.toggle("hidden", S.streak < 2); c.textContent = `🔥 x${S.streak}`; c.classList.toggle("hot", S.streak >= 3);
    $("td-miner").classList.toggle("fire", S.streak >= (hasSkill("fire") ? 2 : 3));
    $("td-rush").classList.toggle("hidden", !(S.rush > 0));
  }
  function setSheet(html) { $("td-sheet").innerHTML = html; return $("td-sheet"); }
  function flash(color) { const f = $("td-flash"); f.style.background = color; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }
  function shake() { scene.classList.remove("shake"); void scene.offsetWidth; scene.classList.add("shake"); }
  function zoomPulse() { cam.classList.add("zoom"); setTimeout(() => cam.classList.remove("zoom"), 220); }
  function floatText(text, dx = 0) { const f = document.createElement("div"); f.className = "td-float"; f.textContent = text; f.style.marginLeft = dx + "px"; scene.appendChild(f); setTimeout(() => f.remove(), 1000); }
  let boTimer = null;
  function bo(text) { $("td-bo-text").textContent = text; $("td-bo").classList.remove("off"); clearTimeout(boTimer); boTimer = setTimeout(() => $("td-bo").classList.add("off"), 3800); }
  const boLine = k => bo(pick(BO_LINES[k]));
  function setLane(l) { if (!S) return; S.lane = clamp(l, 0, 2); heroEl.style.transform = `translateX(${(S.lane - 1) * LANE_PX}px)`; }
  const laneLeft = l => `calc(50% + ${(l - 1) * LANE_PX}px)`;
  function showMonster(emoji) { const m = $("td-monster"); m.textContent = emoji; m.classList.remove("hidden", "hurt", "lunge"); }
  const hideMonster = () => $("td-monster").classList.add("hidden");
  function bigCount(n) { const b = $("td-bigcount"); if (n === null) { b.classList.add("hidden"); if (S) S.bigN = null; return; } if (S.bigN === n) return; S.bigN = n; b.classList.remove("hidden"); b.innerHTML = `<span>${n}</span>`; }

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
    let b2 = 1; while (options.size < 4) options.add(correctNum + b2++);
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix), correctLabel: correctNum.toLocaleString("en-US") + suffix };
  }
  function rollMath(tier) { const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)]; return { key, ...buildMc(MATHVILLE_GENERATORS[key](tier)) }; }
  function pickQ(tier) {
    for (let i = 0; i < 6; i++) {
      const P = window.AIGQuestionPools;
      let q = S.onlyPool === "sci" && P && P.pickScience ? P.pickScience() : null;
      if (q) q = { key: "science", ...q }; else q = P ? P.rollMixed(() => rollMath(tier)) : rollMath(tier);
      if (!S.seen.has(q.prompt) || i === 5) { S.seen.add(q.prompt); return q; }
    }
  }
  function qTimer(d, extra = 0) {
    if (!S.pressure) return 0;
    let t = Math.max(6000, 16000 - d * 650) + (S.timeBonus || 0) + extra;
    t *= Math.pow(0.8, S.curse || 0) * (S.timeMul || 1); if (S.rush > 0) t *= 0.75;
    return Math.max(2500, Math.round(t));
  }

  // ask(): question in the bottom sheet -> {ok, blast, timeout, aborted}
  function ask(o) {
    return waitFor(resolve => {
      let q = o.q || pickQ(o.tier), done = false, left = o.timerMs || 0, tid = null;
      const total = left;
      if (o.two) { const wrong = shuffle(q.options.filter(x => x !== q.correctLabel))[0]; q = { ...q, options: shuffle([q.correctLabel, wrong]) }; }
      S.cancelAsk = () => { done = true; clearInterval(tid); resolve({ aborted: true }); };
      function render() {
        S.lastQ = q;
        const sh = setSheet(`${o.header || ""}${total ? `<div class="td-timer" id="td-timer"><i></i></div>` : ""}<div class="td-q-prompt"></div><div class="td-q-grid"></div><div class="td-tools" id="td-tools"></div>`);
        sh.querySelector(".td-q-prompt").textContent = q.prompt;
        const grid = sh.querySelector(".td-q-grid");
        if (q.html) { const v = document.createElement("div"); v.className = "td-vis"; v.innerHTML = q.html; grid.parentNode.insertBefore(v, grid); }
        if (o.blocks) grid.classList.add("td-blocks");
        if (o.flash && !q.html && q.prompt.length <= 34 && !o.flashed) { o.flashed = true; toast("👁 FLASH! Memorize it!"); setTimeout(() => { const pe = $("td-sheet").querySelector(".td-q-prompt"); if (!done && pe) pe.textContent = "❓ It vanished! (you saw it...)"; }, 2300); }
        q.options.forEach(opt => { const b = document.createElement("button"); b.type = "button"; b.className = "td-q-btn"; b.textContent = opt; b.onclick = () => answer(b, opt); grid.appendChild(b); });
        if (o.lifelines) {
          const tools = $("td-tools");
          const mk = (label, n, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "td-tool-btn"; b.textContent = `${label} ×${n}`; b.disabled = n <= 0; b.onclick = fn; tools.appendChild(b); };
          mk("🎯 50/50", S.fifty, useFifty); mk("⏭ Skip", S.skip, useSkip);
          if (o.allowBlast) mk("💥 Blast", S.dynamite, useBlast);
        }
      }
      function startTimer() {
        if (!total) return; clearInterval(tid);
        tid = setInterval(() => {
          if (done || !S || S.hold > 0 || document.hidden) return;
          left -= 100; S.qFrac = left / total;
          const t = $("td-timer"); if (t) { t.firstChild.style.width = Math.max(0, left / total * 100) + "%"; t.classList.toggle("low", left < total * 0.3); }
          if (left <= 3000 && left > 0) { const n = Math.ceil(left / 1000); bigCount(n); if (left % 1000 < 100) sfx.tock(); } else bigCount(null);
          if (left <= 0) answer(null, null);
        }, 100);
      }
      function useFifty() {
        if (done || S.fifty <= 0) return; S.fifty--;
        shuffle([...$("td-sheet").querySelectorAll(".td-q-btn")].filter(b => b.textContent !== q.correctLabel)).slice(0, 2).forEach(b => { b.disabled = true; b.classList.add("dim"); });
        const t = $("td-tools"); if (t) t.querySelectorAll(".td-tool-btn").forEach(b => { if (b.textContent.startsWith("🎯")) { b.textContent = `🎯 50/50 ×${S.fifty}`; b.disabled = true; } });
      }
      function useSkip() { if (done || S.skip <= 0) return; S.skip--; q = pickQ(o.tier); left = total; render(); startTimer(); }
      function useBlast() { if (done || S.dynamite <= 0) return; done = true; clearInterval(tid); bigCount(null); S.qFrac = undefined; S.dynamite--; resolve({ ok: false, blast: true }); }
      function answer(btn, opt) {
        if (done) return; done = true; clearInterval(tid); bigCount(null); S.qFrac = undefined;
        const ok = opt === q.correctLabel;
        if (o.blocks) { const t = $("td-tool"); t.classList.remove("swing"); void t.offsetWidth; t.classList.add("swing"); sfx.dig(); }
        $("td-sheet").querySelectorAll(".td-q-btn").forEach(b => { b.disabled = true; if (b.textContent === q.correctLabel) b.classList.add("correct"); else if (b === btn) b.classList.add("wrong"); });
        try { LB.recordTopicAttempt("treasure-dig", q.key || "math", ok); } catch (e) {}
        const slow = !!o.decisive || S.energy === 1;
        if (slow) { S.slowmo = true; cam.classList.add("slowmo"); sfx.slow(); }
        setTimeout(() => { if (S) { S.slowmo = false; cam.classList.remove("slowmo"); } resolve({ ok, timeout: opt === null }); }, slow ? 1300 : (ok ? 500 : 800));
      }
      render(); startTimer();
    });
  }

  // ---------------- damage + rewards ----------------
  function gainCorrect() {
    S.correct++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
    if (S.streak % 4 === 0 && S.dynamite < 3) { S.dynamite++; floatText("💥 +1 dynamite"); }
    if (S.pressure && S.streak % 5 === 0) { S.rush = 3; toast("🔥 RUSH! Loot ×3, timers faster!"); sfx.warn(); }
    if (S.pressure) S.fuel = Math.min(100, S.fuel + 10);
    bump("correct"); bump("combo", S.streak);
    sfx.good(); buzz(25); zoomPulse(); boLine("good"); renderHud(); checkAch();
  }
  function hurt(reason) { // -> true if the dig is over
    S.streak = 0; S.mistakes++; S.rush = 0;
    if (S.helmet) { S.helmet = false; floatText("🪖 Blocked!"); sfx.block(); renderHud(); return false; }
    if (S.shield) { S.shield = false; floatText("🤖 Blocked!"); sfx.block(); renderHud(); return false; }
    if (reason === "boss") S.bossHits = (S.bossHits || 0) + 1;
    S.energy--; flash("rgba(220,40,40,.6)"); shake(); sfx.bad(); buzz(120); if (reason !== "lava") boLine("bad"); renderHud();
    heroEl.classList.add("stun"); setTimeout(() => heroEl.classList.remove("stun"), 500);
    if (S.energy <= 0) { endRun("dead"); return true; }
    return false;
  }
  function lavaHit() {
    S.lava = S.depth - 5; unlockAch("lava"); sfx.lava(); flash("rgba(255,120,0,.8)"); shake(); floatText("🌋 LAVA BURN!");
    hurt("lava");
  }
  function addBag(c, g) { S.bag.coins = Math.max(0, S.bag.coins + c); S.bag.gems = Math.max(0, S.bag.gems + g); renderHud(); }
  const pickMult = () => 1 + 0.15 * (td.pick || 0);
  const hasBuddy = id => look.buddy === id;
  const coinsMul = (base, extra = 1) => Math.round(base * S.modeMul * S.lootMul * pickMult() * shelfMult() * extra);

  function debris() {
    for (let i = 0; i < 8; i++) {
      const d = document.createElement("div"); d.className = "td-debris"; d.style.left = "50%"; d.style.top = "102px";
      d.style.setProperty("--dx", rand(-50, 50) + "px"); d.style.setProperty("--dy", rand(-40, 36) + "px"); scene.appendChild(d); setTimeout(() => d.remove(), 650);
    }
  }
  async function digDown(fast) {
    const cell = targetCell(), tool = $("td-tool");
    tool.classList.remove("swing"); void tool.offsetWidth; tool.classList.add("swing"); sfx.dig(); buzz(15);
    await dly(fast ? 90 : 240); if (S.ended) return;
    if (cell) { cell.classList.add("crack", "breaking"); } debris();
    await dly(fast ? 120 : 280); if (S.ended) return;
    S.depth++; bump("depth", S.depth);
    renderWorld(); renderHud();
    if (biomeOf(S.depth) !== biomeOf(S.depth - 1) || S.depth === 1) {
      const b = BIOMES[biomeOf(S.depth)], banner = document.createElement("div");
      banner.className = "td-biome-banner"; banner.textContent = `${b.emoji} ${b.name}`; scene.appendChild(banner); setTimeout(() => banner.remove(), 2700); bo(b.story);
    }
    await dly(fast ? 220 : 560); checkAch();
  }

  // ---------------- relics + loot ----------------
  function pickRelic(d, rich) {
    const se = season(); if (se && R() < 0.16) return rpick(se.relics);
    const r = R(); let rar;
    if (rich) rar = r < 0.2 ? "C" : r < 0.75 ? "R" : "L"; else rar = r < 0.7 ? "C" : r < 0.95 ? "R" : "L";
    const maxB = biomeOf(d); const b = R() < 0.55 ? maxB : rr(0, maxB);
    const list = RELICS.filter(x => x.b === b && x.rar === rar);
    return list.length ? rpick(list) : rpick(RELICS.filter(x => x.rar === rar));
  }
  async function relicFound(r) {
    const prev = td.relics[r.id] || 0; td.relics[r.id] = prev + 1;
    S.found.push({ r, isNew: prev === 0 });
    bump("relics"); bump("relicB", 1, biomeOf(Math.max(1, S.depth))); sfx.relic(); buzz(60);
    let bonus = 0; if (prev > 0) { bonus = DUP_BONUS[r.rar]; addBag(bonus, 0); }
    const cursed = r.rar !== "C" && S.pressure && S.curse < 2 && R() < 0.22;
    if (cursed) { S.curse++; addBag(20, 0); }
    $("td-relic-title").textContent = prev === 0 ? "✨ NEW RELIC! ✨" : "Relic found again";
    $("td-relic-emoji").textContent = r.emoji; $("td-relic-emoji").classList.remove("collected");
    $("td-relic-name").textContent = `${r.name} (${{ C: "Common", R: "Rare", L: "Legendary" }[r.rar]})`;
    $("td-relic-sub").textContent = cursed ? "💀 CURSED! +20 🪙 but your timers are 20% shorter now." : prev === 0 ? "Added to your museum!" : `Already in your museum -- +${bonus} 🪙 in your bag.`;
    $("td-relic-hint").textContent = "Tap it!"; show("td-relic"); hold();
    await waitFor(res => {
      const btn = $("td-relic-btn");
      const h = () => { btn.removeEventListener("click", h); spark(btn); sfx.coin(); $("td-relic-hint").textContent = ""; $("td-relic-emoji").classList.add("td-pop"); setTimeout(() => { $("td-relic-emoji").classList.remove("td-pop"); hide("td-relic"); res(); }, 600); };
      btn.addEventListener("click", h); S.relicCleanup = () => btn.removeEventListener("click", h);
    });
    hide("td-relic"); release();
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
  async function lootStep(d, path, fast) {
    const rock = path === "rock" ? 2 : 1, heat = S.streak >= (hasSkill("fire") ? 2 : 3) ? 1.5 : 1, rush = S.rush > 0 ? 3 : 1;
    if (hasBuddy("mole") && buddyLevel() >= 2) addBag(1, 0);
    if (R() < Math.min(0.85, 0.35 + d * 0.03)) {
      const coins = coinsMul(Math.min(14, 2 + Math.floor(d * 0.8)) * rock * heat * rush * (fast ? 1.25 : 1));
      const gem = R() < 0.08 + d * 0.02 + (hasBuddy("mole") ? 0.06 : 0) + (rock > 1 ? 0.05 : 0) + (hasSkill("gem") ? 0.04 : 0) + (hasBuddy("mole") && buddyLevel() >= 3 ? 0.05 : 0) ? 1 : 0;
      addBag(coins, gem); sfx.coin(); floatText(`+${coins} 🪙${gem ? " +1 💎" : ""}${rush > 1 ? " 🔥" : ""}`);
      await dly(500); if (S.ended) return;
    }
    if (S.rush > 0) { S.rush--; renderHud(); }
    if (R() < 0.1 + (td.pick || 0) * 0.03 + (hasBuddy("mole") ? 0.08 : 0) + (rock > 1 ? 0.1 : 0) + (heat > 1 ? 0.03 : 0)) { await relicFound(pickRelic(d, false)); if (S.ended) return; }
    if (R() < 0.05) addMapPiece(d);
    if (R() < 0.05) { const k = rpick(["fifty", "skip"]); S[k]++; toast(k === "fifty" ? "🎯 Found a 50/50!" : "⏭ Found a Skip!"); }
    if (R() < 0.13) await chestEvent(2, false);
  }

  // ---------------- hazards that run while you think ----------------
  function spawnRock() {
    const lane = rr(0, 2), warn = document.createElement("div"); warn.className = "td-warn"; warn.textContent = "⚠️"; warn.style.left = laneLeft(lane); fx.appendChild(warn); sfx.tick();
    setTimeout(() => {
      warn.remove(); if (!S || S.ended) return;
      const rock = document.createElement("div"); rock.className = "td-rock"; rock.textContent = "🪨"; rock.style.left = laneLeft(lane); fx.appendChild(rock);
      setTimeout(() => {
        rock.remove(); if (!S || S.ended) return;
        if (S.lane === lane) { S.fuel = Math.max(0, S.fuel - 15); floatText("🪨 -15 🔦"); sfx.bad(); shake(); buzz(80); heroEl.classList.add("stun"); setTimeout(() => heroEl.classList.remove("stun"), 500); }
      }, 290);
    }, 900);
  }
  function spawnBat() {
    const b = document.createElement("div"); b.className = "td-bat2"; b.textContent = "🦇";
    const fromLeft = Math.random() < 0.5; b.style.left = fromLeft ? "-8%" : "104%"; b.style.top = rand(30, 90) + "px"; fx.appendChild(b);
    let swatted = false;
    b.onpointerdown = e => { e.stopPropagation(); if (swatted) return; swatted = true; S.swats++; bump("swat"); spark(b); sfx.coin(); addBag(1, 0); floatText("+1 🪙 swat!"); b.remove(); checkAch(); };
    requestAnimationFrame(() => requestAnimationFrame(() => { b.style.left = `calc(50% + ${(S.lane - 1) * LANE_PX - 12}px)`; b.style.top = "62px"; }));
    setTimeout(() => { if (!swatted) { b.remove(); if (S && !S.ended) { S.fuel = Math.max(0, S.fuel - 10); floatText("🦇 -10 🔦"); sfx.bad(); buzz(50); } } }, 2300);
  }

  // main real-time clock
  function tick() {
    const now = performance.now(); let dt = (now - lastTick) / 1000; lastTick = now; if (dt > 0.25) dt = 0.25;
    if (!S || S.ended || !S.live || S.hold > 0 || document.hidden) return;
    S.elapsed += dt;
    if (S.rivalSpeed > 0) S.rival += S.rivalSpeed * dt;
    if (S.pressure && !S.calm) {
      S.lava += (0.07 + 0.006 * Math.min(S.depth, 20)) * S.lavaMul * dt;
      S.fuel = Math.max(0, S.fuel - 0.8 * S.fuelMul * dt);
      if (S.fuel <= 0) { S.burn += dt; if (S.burn >= 6) { S.burn = 0; floatText("🌑 Too dark!"); if (hurt("dark")) return; } } else S.burn = 0;
      if (S.lava >= S.depth - 0.3) { lavaHit(); if (S.ended) return; }
      if (S.hazards && S.depth >= 2) {
        S.nextRock -= dt; if (S.nextRock <= 0) { spawnRock(); S.nextRock = 4 + Math.random() * 3; }
        if (S.depth >= 3) { S.nextBat -= dt; if (S.nextBat <= 0) { spawnBat(); S.nextBat = (9 + Math.random() * 5) * ((season() || {}).batMul || 1); } }
        if (S.depth >= 6) { S.nextBiome -= dt; if (S.nextBiome <= 0) { biomeHazard(); S.nextBiome = 9 + Math.random() * 5; } }
      }
    }
    renderDynamic();
  }

  // ---------------- mini-games ----------------
  function tapDig(path) { // -> true if fast
    if (!S.pressure) return Promise.resolve(true);
    if (Math.random() < 0.3) return holdDig();
    const need = Math.max(3, (path === "rock" ? 9 : 5) - (S.rush > 0 ? 2 : 0) - (hasSkill("hands") ? 1 : 0)), total = 2300;
    return waitFor(res => {
      let taps = 0, left = total, tid = null, fin = false;
      setSheet(`<h2>⛏️ SMASH IT! Tap fast!</h2><div class="td-timer"><i id="td-tapbar"></i></div><button class="td-tapbtn" id="td-tap" type="button">⛏️ TAP!<small id="td-tapn">0 / ${need}</small></button>`);
      const finish = ok => { if (fin) return; fin = true; clearInterval(tid); res(ok); };
      $("td-tap").addEventListener("pointerdown", e => {
        e.preventDefault(); if (fin) return; taps++; sfx.dig(); buzz(10);
        const t = $("td-tool"); t.classList.remove("swing"); void t.offsetWidth; t.classList.add("swing"); debris();
        $("td-tapn").textContent = `${taps} / ${need}`; if (taps >= need) finish(true);
      });
      tid = setInterval(() => { if (S.hold > 0 || document.hidden) return; left -= 50; $("td-tapbar").style.width = Math.max(0, left / total * 100) + "%"; if (left <= 0) finish(false); }, 50);
    }).then(r => {
      if (r && r.aborted) return false;
      if (!r) { S.lava += 0.45; floatText("Too slow! 🌋 closer"); sfx.bad(); } else { S.fuel = Math.min(100, S.fuel + 5); }
      return !!r;
    });
  }

  function leverEvent() {
    sfx.warn(); flash("rgba(255,160,0,.4)"); showMonster("🕹️"); bo("A trap lever! Stop it in the green!");
    return waitFor(res => {
      setSheet(`<h2>⚠️ TRAP LEVER!</h2><p>Hit STOP when the white bar is in the green zone.</p><div class="td-lever"><div class="zone"></div><div class="mark" id="td-mark"></div></div><button class="td-btn red" id="td-stop" type="button">🛑 STOP!</button>`);
      const mark = $("td-mark"), speed = 0.9 + Math.random() * 0.5; let t0 = performance.now(), stopped = false;
      const frame = () => { if (stopped || !S || S.ended) return; const p = ((performance.now() - t0) / 1000 * speed) % 2; const x = p < 1 ? p : 2 - p; mark.style.left = `calc(${x * 100}% - ${x * 10}px)`; requestAnimationFrame(frame); };
      frame();
      $("td-stop").onclick = () => { if (stopped) return; stopped = true; const p = ((performance.now() - t0) / 1000 * speed) % 2, x = p < 1 ? p : 2 - p; res({ ok: x > 0.34 && x < 0.66 }); };
      S.cancelLever = () => { stopped = true; };
    }).then(r => {
      hideMonster(); if (!r || r.aborted) return;
      if (r.ok) { sfx.good(); addBag(3, 0); floatText("Disarmed! +3 🪙"); return dly(500); }
      return hurt("lever");
    });
  }
  async function trapEvent(d) {
    const t = rpick([{ e: "🌋", n: "Lava leak!" }, { e: "☁️", n: "Toxic gas!" }, { e: "🪨", n: "Rockfall!" }]);
    sfx.warn(); flash("rgba(255,120,0,.5)"); shake(); showMonster(t.e); bo(`${t.n} Answer fast!`);
    const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? qTimer(d, -4000) : 0, lifelines: false, header: `<h2>⚠️ ${t.n}</h2>` });
    hideMonster(); if (S.ended) return;
    if (r.ok) { gainCorrect(); addBag(2, 0); floatText("Dodged! +2 🪙"); await dly(400); } else hurt("trap");
  }
  async function chasmEvent(d) {
    sfx.warn(); shake(); showMonster("🕳️"); bo("A chasm! JUMP now!");
    const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: 5000, lifelines: false, header: `<h2>🕳️ CHASM! Jump in 5 seconds!</h2>` });
    hideMonster(); if (S.ended) return;
    if (r.ok) { gainCorrect(); heroEl.classList.add("jump"); setTimeout(() => heroEl.classList.remove("jump"), 700); addBag(2, 0); floatText("Jumped! +2 🪙"); await dly(700); } else hurt("chasm");
  }
  async function bridgeEvent(d) {
    sfx.warn(); showMonster("🌉"); bo("The bridge is cracking! Hurry across!");
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: 6000, lifelines: false, header: `<h2>🌉 Plank ${i + 1}/3 ${"🟫".repeat(3 - i)}${"💨".repeat(i)}</h2>` });
      if (S.ended) return;
      if (r.ok) gainCorrect(); else { ok = false; break; }
    }
    hideMonster();
    if (ok) { addBag(6, 0); floatText("Crossed! +6 🪙"); sfx.chest(); await dly(500); } else { S.lava += 0.3; hurt("bridge"); }
  }
  async function bombEvent(d) {
    sfx.warn(); shake(); showMonster("💣"); bo("A lit bomb! Answer 2 before it blows!");
    let left = 10000, ok = true;
    for (let i = 0; i < 2; i++) {
      const t0 = performance.now();
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: Math.max(1500, left), lifelines: false, header: `<h2>💣 BOMB! ${i + 1}/2 — ${Math.ceil(left / 1000)}s fuse</h2>` });
      if (S.ended) return;
      left -= performance.now() - t0;
      if (!r.ok) { ok = false; break; }
      gainCorrect();
    }
    if (ok) { hideMonster(); addBag(8, 0); floatText("Defused! +8 🪙"); await dly(400); }
    else { sfx.boom(); flash("rgba(255,200,80,.8)"); $("td-monster").textContent = "💥"; await dly(500); hideMonster(); hurt("bomb"); }
  }
  async function mazeEvent(d) {
    showMonster("🧭"); bo("A maze! Pick the right tunnels.");
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? 7000 : 0, lifelines: false, two: true, header: `<h2>🧭 Fork ${i + 1}/3 — left or right?</h2>` });
      if (S.ended) return;
      if (r.ok) gainCorrect(); else { ok = false; break; }
    }
    hideMonster();
    if (ok) { addBag(coinsMul(8), 0); floatText("Treasure room!"); sfx.chest(); await dly(500); if (S.ended) return; if (R() < 0.35) await relicFound(pickRelic(d, false)); }
    else { if (S.pressure) S.lava += 0.8; floatText("Dead end! 🌋 closer"); sfx.bad(); await dly(600); }
  }
  async function shortcutEvent(d) { // -> true if depth advanced
    setSheet(`<h2>🕳️ Secret tunnel!</h2><p>Skip 3 layers! Answer 3 in a row (6s each). Wrong = ouch.</p><div class="td-btnrow"><button class="td-btn green" id="td-sc-go">🚀 Go!</button><button class="td-btn dark" id="td-sc-no">No thanks</button></div>`);
    const c = await waitFor(res => { $("td-sc-go").onclick = () => res("go"); $("td-sc-no").onclick = () => res("no"); });
    if (S.ended || c !== "go") return false;
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? 6000 : 0, lifelines: false, header: `<h2>🚀 Tunnel ${i + 1}/3</h2>` });
      if (S.ended) return false;
      if (r.ok) gainCorrect(); else { ok = false; break; }
    }
    if (!ok) { hurt("shortcut"); return false; }
    await digDown(true); await digDown(true); await digDown(true); if (S.ended) return false;
    toast("🚀 Skipped 3 layers!"); await lootStep(S.depth, "soft"); return true;
  }

  async function chestEvent(need, secret) {
    showMonster("🧰"); sfx.chest(); toast(secret ? "🗝️ SECRET VAULT!" : "🔒 Locked chest!");
    let ok = true;
    for (let i = 0; i < need; i++) {
      const r = await ask({ tier: TIERS[tierIdxFor(S.depth + 1)], timerMs: S.pressure ? qTimer(S.depth + 1) : 0, lifelines: false, header: `<h2>🔒 ${secret ? "Secret vault" : "Locked chest"} — lock ${i + 1}/${need}</h2>` });
      if (S.ended) return;
      if (r.ok) gainCorrect(); else { S.streak = 0; renderHud(); ok = false; break; }
    }
    if (ok) {
      sfx.chest(); showMonster("✨"); buzz(80); flash("rgba(255,220,100,.6)");
      const coins = coinsMul((20 + S.depth * 3) * (secret ? 2 : 1)), gem = secret || R() < 0.4 ? 1 : 0;
      addBag(coins, gem); floatText(`+${coins} 🪙${gem ? " +1 💎" : ""}`); await dly(800); hideMonster(); if (S.ended) return;
      await relicFound(pickRelic(S.depth + 1, true));
      if (secret) { S.secretDone = true; checkAch(); }
    } else { toast("The lock jammed! 🔒"); sfx.bad(); await dly(600); hideMonster(); }
  }

  // ---------------- bosses ----------------
  function cinematic(emoji, name) {
    return waitFor(res => {
      $("td-cine-em").textContent = emoji; $("td-cine-nm").textContent = name; const c = $("td-cine"); c.classList.remove("hidden", "rumble"); void c.offsetWidth; c.classList.add("rumble");
      sfx.boom(); buzz(200); let done = false;
      const end = () => { if (done) return; done = true; c.classList.add("hidden"); res(); };
      c.onclick = end; setTimeout(end, 1900);
    });
  }
  function bossAttackLoop(b, getEnraged, bi) {
    let alive = true; const gapMs = Math.max(2400, 3800 - bi * 300), extraWarn = bi === 0 ? 300 : 0;
    const run = async () => {
      await delay(1600);
      while (alive && S && !S.ended) {
        if (S.hold > 0 || document.hidden) { await delay(300); continue; }
        const enraged = getEnraged(), warnMs = enraged ? Math.max(550, b.warn - 200) + extraWarn : b.warn + extraWarn;
        const n = Math.min(2, b.lanes + (enraged && b.lanes < 2 ? 1 : 0));
        const lanes = shuffle([0, 1, 2]).slice(0, n);
        const ws = lanes.map(l => { const w = document.createElement("div"); w.className = "td-warn"; w.textContent = "⚠️"; w.style.left = laneLeft(l); fx.appendChild(w); return w; });
        sfx.tick(); await delay(warnMs); ws.forEach(w => w.remove()); if (!alive || !S || S.ended) break;
        lanes.forEach(l => { const p = document.createElement("div"); p.className = "td-proj"; p.textContent = b.atk; p.style.left = laneLeft(l); fx.appendChild(p); setTimeout(() => p.remove(), 320); });
        await delay(300); if (!alive || !S || S.ended) break;
        if (lanes.includes(S.lane)) { floatText(`${b.atk} HIT!`); if (hurt("boss")) break; }
        await delay(enraged ? Math.round(gapMs * 0.55) : gapMs);
      }
    };
    run(); return () => { alive = false; fx.querySelectorAll(".td-warn,.td-proj").forEach(e => e.remove()); };
  }
  async function bossFight(d) {
    const b = BOSSES[(Math.floor(d / 5) - 1) % 5], tag = Math.floor((d / 5 - 1) / 5) > 0 ? "Elder " : "", bi = Math.floor(d / 5) - 1;
    let shield = bi === 0 ? 1 : 2, hp = 3 + Math.floor(d / 10); const maxHp = hp, maxShield = shield;
    S.calm = true; S.hazards = false; S.bossHits = 0; if (hasBuddy("owl") && buddyLevel() >= 3) S.fifty++;
    await cinematic(b.emoji, `${tag}${b.name}`.toUpperCase()); if (S.ended) return;
    showMonster(b.emoji); flash("rgba(160,0,0,.5)"); shake(); bo(`BOSS: ${tag}${b.name}! Dodge its attacks!`);
    setSheet(`<h2>⚔️ BOSS: ${tag}${esc(b.name)}</h2><p>Break the 🛡️ shield, then drain its HP. ${S.pressure ? "It attacks in lanes — tap the mine's left/right side to dodge!" : ""}</p><button class="td-btn red" id="td-fight">⚔️ Fight!</button>`);
    const go = await waitFor(res => { $("td-fight").onclick = () => res("go"); }); if (S.ended || !go || go.aborted) return;
    const stopAtk = S.pressure ? bossAttackLoop(b, () => shield <= 0, bi) : () => {};
    while ((hp > 0 || shield > 0) && !S.ended) {
      const last = hp === 1 && shield <= 0;
      const hpBar = `<div class="td-bosshp" style="border-color:#4f8fe0;margin-bottom:3px"><i style="width:${shield / maxShield * 100}%;background:#4f8fe0"></i></div><div class="td-bosshp"><i style="width:${hp / maxHp * 100}%"></i></div>`;
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? (last ? 5000 : qTimer(d, 3000)) : 0, lifelines: true, decisive: last, q: bossQ(bi, TIERS[tierIdxFor(d)]), header: `<h2>${last ? "💥 FINAL BLOW!" : (shield > 0 ? "🛡️ " : "") + b.emoji + " " + esc(b.name)}</h2>${hpBar}` });
      if (S.ended) { stopAtk(); return; }
      if (r.ok) {
        if (shield > 0) { shield--; floatText("🛡️ Shield cracked!"); if (shield === 0) { toast("😡 ENRAGED!"); sfx.warn(); } } else hp--;
        gainCorrect(); const m = $("td-monster"); m.classList.remove("hurt"); void m.offsetWidth; m.classList.add("hurt"); sfx.boom(); shake(); await dly(350);
      } else {
        const m = $("td-monster"); m.classList.remove("lunge", "hurt"); void m.offsetWidth; m.classList.add("lunge");
        await dly(250); if (hurt("boss")) { stopAtk(); return; }
      }
    }
    stopAtk();
    if (S.ended) return;
    $("td-monster").textContent = "💥"; sfx.boom(); flash("rgba(255,200,80,.7)"); await dly(700); hideMonster();
    S.bosses++; bump("boss"); td.dp = (td.dp || 0) + 2; if (!S.bossHits) bump("noHit"); if (hasBuddy("robot") && buddyLevel() >= 3) S.shield = true; S.energy = Math.min(S.energyMax, S.energy + 1);
    S.calm = false; S.lava = Math.min(S.lava, S.depth - 5); S.fuel = Math.min(100, S.fuel + 30);
    await digDown(); if (S.ended) return;
    const coins = coinsMul(10 + d * 2); addBag(coins, 1); floatText(`BOSS LOOT +${coins} 🪙 +1 💎`); await dly(900); if (S.ended) return;
    if (R() < 0.3) addMapPiece(d);
    await relicFound(pickRelic(d, true)); if (S.ended) return;
    checkAch(); renderHud(); S.hazards = true;
  }

  // ---------------- minecart bonus ride ----------------
  async function minecart(kind) {
    kind = kind || "cart"; if (S.ended) return;
    const tier = TIERS[tierIdxFor(S.depth)], laneX = [20, 50, 80];
    S.calm = true; hold();
    const plan = []; for (let i = 0; i < 3; i++) { plan.push({ k: "coin" }, { k: "rock" }, ...(kind === "cart" ? [{ k: "gap" }] : []), { k: "gate", q: pickQ(tier) }); }
    const r = await waitFor(res => {
      setSheet(`<h2>${kind === "river" ? "🛶 River rafting!" : "🛒 Minecart bonus ride!"}</h2><div class="td-cart-sign" id="td-cart-sign">Get ready…</div><div class="td-cart" id="td-cart"></div><div class="td-cart-ctrl"><button id="td-cl" type="button">◀</button><button id="td-cj" type="button">⬆</button><button id="td-cr" type="button">▶</button></div>`);
      const field = $("td-cart"); laneX.forEach(x => { const l = document.createElement("div"); l.className = "lane"; l.style.left = x + "%"; field.appendChild(l); });
      const me = document.createElement("div"); me.className = "me"; me.textContent = kind === "river" ? "🛶" : "🛒"; me.style.top = "86%"; field.appendChild(me);
      let lane = 1, pos = 0, y0 = 0, rows = [], gatesDone = 0, endAt = 0, coins = 0, correct = 0, finished = false, last = performance.now(), qi = 0;
      const setL = l => { lane = clamp(l, 0, 2); me.style.left = laneX[lane] + "%"; }; setL(1);
      $("td-cl").onpointerdown = e => { e.preventDefault(); setL(lane - 1); }; $("td-cr").onpointerdown = e => { e.preventDefault(); setL(lane + 1); };
      let jumpUntil = 0; const cJump = () => { jumpUntil = performance.now() + 650; me.style.marginTop = "-34px"; setTimeout(() => { me.style.marginTop = ""; }, 650); }; $("td-cj").onpointerdown = e => { e.preventDefault(); cJump(); };
      let sx = null, sy = 0; field.onpointerdown = e => { sx = e.clientX; sy = e.clientY; };
      field.onpointerup = e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (dy < -28 && Math.abs(dy) > Math.abs(dx)) { cJump(); return; } if (Math.abs(dx) > 24) setL(lane + (dx > 0 ? 1 : -1)); else { const rc = field.getBoundingClientRect(), f = (e.clientX - rc.left) / rc.width; setL(f < 0.4 ? lane - 1 : f > 0.6 ? lane + 1 : lane); } };
      const key = e => { if (e.key === "ArrowLeft") setL(lane - 1); else if (e.key === "ArrowRight") setL(lane + 1); else if (e.key === "ArrowUp") cJump(); }; document.addEventListener("keydown", key);
      const gates = plan.filter(p => p.k === "gate");
      gates.forEach(p => { const cor = p.q.correctLabel, wr = shuffle(p.q.options.filter(o => o !== cor)).slice(0, 2); p.labels = shuffle([cor, ...wr]); p.correctIdx = p.labels.indexOf(cor); p.lettered = p.labels.some(l => String(l).length > 8); });
      const sign = () => { const p = gates[qi]; if (!p) return; $("td-cart-sign").innerHTML = esc(p.q.prompt) + (p.lettered ? "<br>" + p.labels.map((l, i) => `<b style="color:#f7c548">${"ABC"[i]})</b> ${esc(l)}`).join(" &nbsp;") : ""); };
      sign();
      const cleanup = () => { finished = true; document.removeEventListener("keydown", key); };
      S.cancelCart = cleanup;
      const step = now => {
        if (finished || !S || S.ended) { cleanup(); return; }
        const dt = Math.min(0.05, (now - last) / 1000); last = now; y0 += 0.33 * dt;
        while (pos < plan.length && y0 >= pos * 0.55) {
          const p = plan[pos], row = { k: p.k, y: y0 - pos * 0.55, items: [], resolved: false, p };
          const mkEnt = (txt, cls) => { const e = document.createElement("div"); e.className = "ent" + (cls ? " " + cls : ""); e.textContent = txt; field.appendChild(e); return e; };
          if (p.k === "coin") shuffle([0, 1, 2]).slice(0, rand(1, 2)).forEach(l => row.items.push({ l, e: mkEnt("🪙") }));
          else if (p.k === "gap") shuffle([0, 1, 2]).slice(0, rand(1, 2)).forEach(l => row.items.push({ l, e: mkEnt("🕳️") }));
          else if (p.k === "rock") shuffle([0, 1, 2]).slice(0, rand(1, 2)).forEach(l => row.items.push({ l, e: mkEnt("🪨") }));
          else p.labels.forEach((lab, i) => row.items.push({ l: i, e: mkEnt(p.lettered ? "ABC"[i] : lab, "gate"), idx: i }));
          rows.push(row); pos++;
        }
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i], prev = row.y; row.y += 0.33 * dt;
          row.items.forEach(it => { it.e.style.left = laneX[it.l] + "%"; it.e.style.top = row.y * 100 + "%"; });
          if (!row.resolved && prev < 0.86 && row.y >= 0.86) {
            row.resolved = true;
            if (row.k === "coin") { row.items.forEach(it => { if (it.l === lane) { coins += 1; it.e.style.opacity = 0; sfx.coin(); } }); }
            else if (row.k === "gap") { const hit = row.items.find(it => it.l === lane); if (hit && performance.now() > jumpUntil) { S.fuel = Math.max(0, S.fuel - 15); hit.e.style.opacity = 0; sfx.bad(); buzz(60); floatText("🕳️ -15 🔦"); } else if (hit) floatText("✔ jumped!"); }
            else if (row.k === "rock") { const hit = row.items.find(it => it.l === lane); if (hit) { S.fuel = Math.max(0, S.fuel - 15); hit.e.style.opacity = 0; sfx.bad(); buzz(60); floatText("🪨 -15 🔦"); } }
            else {
              const it = row.items.find(x => x.l === lane), ok = it && it.idx === row.p.correctIdx;
              row.items.forEach(x => { if (x.idx === row.p.correctIdx) x.e.classList.add("good"); else if (x === it) x.e.classList.add("bad"); });
              try { LB.recordTopicAttempt("treasure-dig", row.p.q.key || "math", !!ok); } catch (e) {}
              gatesDone++; qi++; sign();
              if (ok) { correct++; gainCorrect(); }
              else { S.streak = 0; S.mistakes++; if (S.shield) { S.shield = false; sfx.block(); renderHud(); } else { S.energy--; renderHud(); flash("rgba(220,40,40,.6)"); sfx.bad(); if (S.energy <= 0) { cleanup(); endRun("dead"); return; } } }
              if (gatesDone >= 3) endAt = now + 900;
            }
          }
          if (row.y > 1.2) { row.items.forEach(it => it.e.remove()); rows.splice(i, 1); }
        }
        if (endAt && now >= endAt) { cleanup(); res({ coins, correct }); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    release(); S.calm = false;
    if (S.ended || !r || r.aborted) return;
    const bonus = coinsMul(r.coins + r.correct * 3); addBag(bonus, 0); unlockAch("cart"); toast(`🛒 Ride done! +${bonus} 🪙`); sfx.chest(); await dly(700);
  }

  // =====================================================================================
  // VARIETY PACK -- every biome plays differently, questions come in many shapes, and the
  // tunnel is full of side branches, mini-games, monsters, NPCs and seasonal surprises.
  // =====================================================================================
  const SEASONS = [
    { id: "halloween", from: [10, 1], to: [11, 2], name: "Halloween", emoji: "🎃", batMul: 0.55, banner: "🎃 Halloween event: extra bats and spooky relics!", relics: [{ id: "s_pumpkin", name: "Jack Lantern", emoji: "🎃", rar: "R", b: -1 }, { id: "s_ghost", name: "Tiny Ghost", emoji: "👻", rar: "R", b: -1 }, { id: "s_candy", name: "Candy Bone", emoji: "🍬", rar: "C", b: -1 }] },
    { id: "xmas", from: [12, 15], to: [1, 2], name: "Winter", emoji: "❄️", batMul: 1, banner: "🎄 Winter event: snowy relics hide in the mine!", relics: [{ id: "s_tree", name: "Crystal Tree", emoji: "🎄", rar: "R", b: -1 }, { id: "s_snow", name: "Snowman", emoji: "⛄", rar: "R", b: -1 }, { id: "s_gift", name: "Buried Gift", emoji: "🎁", rar: "C", b: -1 }] },
    { id: "merdeka", from: [8, 10], to: [8, 20], name: "Merdeka", emoji: "🇮🇩", batMul: 1, banner: "🇮🇩 Merdeka event: heroic relics are buried below!", relics: [{ id: "s_flag", name: "Red-White Flag", emoji: "🚩", rar: "R", b: -1 }, { id: "s_bamboo", name: "Bamboo Spear", emoji: "🎋", rar: "R", b: -1 }, { id: "s_cracker", name: "Kerupuk", emoji: "🍘", rar: "C", b: -1 }] }
  ];
  function season() {
    const d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
    return SEASONS.find(s => { const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1]; return a <= b ? (md >= a && md <= b) : (md >= a || md <= b); }) || null;
  }
  const SKILLS = [
    { id: "lamp", e: "🔦", n: "Bright Lamp", d: "Torch burns 15% slower", cost: 3 },
    { id: "helm", e: "🪖", n: "Thick Helmet", d: "Absorbs your first hit each dig", cost: 4 },
    { id: "hands", e: "⚡", n: "Quick Hands", d: "1 fewer tap to smash blocks", cost: 3 },
    { id: "gem", e: "💎", n: "Gem Eye", d: "+4% gem chance", cost: 5 },
    { id: "fire", e: "🔥", n: "Fire Pick", d: "Heat starts at a 2x combo", cost: 6 }
  ];
  const DAILY_RULES = [
    { id: "dark", n: "🌑 Blackout", d: "The mine starts in the dark", apply: st => { st.darkBase = 0.55; } },
    { id: "nolife", n: "🚫 No lifelines", d: "No 50/50 or skip today", apply: st => { st.fifty = 0; st.skip = 0; } },
    { id: "sci", n: "🔬 Science Day", d: "Only science questions", apply: st => { st.onlyPool = "sci"; } },
    { id: "sprint", n: "⚡ Sprint", d: "Timers are 30% shorter", apply: st => { st.timeMul = 0.7; } },
    { id: "gold", n: "💰 Gold Rush", d: "Loot ×2 but lava 25% faster", apply: st => { st.lootMul *= 2; st.lavaMul *= 1.25; } }
  ];
  const WORDS = [["planet", "🪐 orbits a star"], ["gravity", "🍎 pulls things down"], ["volcano", "🌋 erupts lava"], ["triangle", "🔺 3 sides"], ["magnet", "🧲 sticks to iron"], ["castle", "🏰 a king lives here"], ["jungle", "🌴 thick wild forest"], ["oxygen", "💨 we breathe it"], ["rainbow", "🌈 after the rain"], ["pyramid", "🔺 in Egypt"], ["library", "📚 full of books"], ["diamond", "💎 a hard gem"], ["compass", "🧭 shows north"], ["dolphin", "🐬 a smart sea animal"], ["eclipse", "🌑 moon blocks the sun"], ["fossil", "🦴 ancient remains"], ["crystal", "🔮 shiny mineral"], ["tunnel", "🚇 an underground path"], ["lantern", "🏮 a portable light"], ["treasure", "🧰 pirates seek it"]];
  const hasSkill = id => !!(td.skills && td.skills[id]);
  const buddyLevel = () => { const x = td.buddyXp || 0; return x >= 160 ? 3 : x >= 80 ? 2 : x >= 30 ? 1 : 0; };
  const shelfMult = () => 1 + (td.shelf || []).reduce((a, id) => { const r = allRelics().find(x => x.id === id); return a + (r ? { C: 0.01, R: 0.02, L: 0.04 }[r.rar] : 0); }, 0);
  const allRelics = () => RELICS.concat(...SEASONS.map(s => s.relics));
  const ruleOn = () => { try { return localStorage.getItem("td_rule_off") !== "1"; } catch (e) { return true; } };
  const todayRule = () => DAILY_RULES[hashStr("rule|" + todayStr()) % DAILY_RULES.length];

  // ---- jump (dodges rubble, arrows, hot floor, spikes) ----
  function doJump() {
    if (!S || !S.live || S.ended || S.hold > 0) return;
    const now = performance.now(); if (now < S.jumpCd) return;
    S.jumping = true; S.jumpCd = now + 900; heroEl.classList.add("jump"); sfx.swish();
    setTimeout(() => { if (S) S.jumping = false; heroEl.classList.remove("jump"); }, 620);
  }
  function warnAt(lane, txt, ms) { const w = document.createElement("div"); w.className = "td-warn"; w.textContent = txt || "⚠️"; w.style.left = laneLeft(lane); fx.appendChild(w); setTimeout(() => w.remove(), ms); return w; }
  function fuelHit(n, label) { if (!S || S.ended) return; S.fuel = Math.max(0, S.fuel - n); floatText(label || `-${n} 🔦`); sfx.bad(); shake(); buzz(80); heroEl.classList.add("stun"); setTimeout(() => heroEl.classList.remove("stun"), 500); }

  // ---- one signature hazard per biome ----
  function biomeHazard() {
    const b = biomeOf(S.depth);
    if (b === 1) landslide(); else if (b === 2) crystalShards(); else if (b === 3) hotFloor(); else if (b === 4) arrowTrap();
  }
  function landslide() {
    const lanes = Math.random() < 0.5 ? [0, 1] : [1, 2]; sfx.warn(); bo("Landslide! Get out of the way!");
    lanes.forEach(l => warnAt(l, "⚠️", 1000));
    setTimeout(() => {
      if (!S || S.ended) return;
      lanes.forEach(l => { const r = document.createElement("div"); r.className = "td-rock"; r.textContent = "🪨"; r.style.left = laneLeft(l); fx.appendChild(r); setTimeout(() => r.remove(), 320); });
      setTimeout(() => { if (S && !S.ended && lanes.includes(S.lane) && !S.jumping) fuelHit(15, "🪨 -15 🔦"); }, 300);
    }, 1000);
  }
  function crystalShards() {
    bo("Crystal shards! Tap them before they hit!");
    for (let i = 0; i < 3; i++) setTimeout(() => {
      if (!S || S.ended) return;
      let lane = rand(0, 2), smashed = false; const el = document.createElement("div"); el.className = "td-shard"; el.textContent = "💎"; el.style.left = laneLeft(lane); el.style.top = "-24px"; fx.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = "top 2.4s linear, left .35s ease"; el.style.top = "88px"; }));
      setTimeout(() => { if (!smashed) { lane = (lane + (Math.random() < 0.5 ? 1 : 2)) % 3; el.style.left = laneLeft(lane); } }, 900);
      el.onpointerdown = e => { e.stopPropagation(); if (smashed) return; smashed = true; spark(el); sfx.coin(); const gem = Math.random() < 0.25; addBag(gem ? 0 : 1, gem ? 1 : 0); floatText(gem ? "+1 💎" : "+1 🪙"); el.remove(); };
      setTimeout(() => { if (smashed) return; el.remove(); if (S && !S.ended && S.lane === lane && !S.jumping) fuelHit(10, "💎 -10 🔦"); }, 2450);
    }, i * 700);
  }
  function hotFloor() {
    const safe = rand(0, 2), hot = [0, 1, 2].filter(l => l !== safe); sfx.warn(); bo("The floor is hot! Find the stone lane!");
    hot.forEach(l => warnAt(l, "🔥", 1100)); warnAt(safe, "🪨", 1100);
    setTimeout(() => {
      if (!S || S.ended) return;
      const fl = hot.map(l => { const f = document.createElement("div"); f.className = "td-flame"; f.textContent = "🔥"; f.style.left = laneLeft(l); fx.appendChild(f); setTimeout(() => f.remove(), 700); return f; });
      void fl; if (hot.includes(S.lane) && !S.jumping) fuelHit(15, "🔥 -15 🔦");
    }, 1100);
  }
  function arrowOnce() {
    return new Promise(res => {
      warnAt(1, "⬆ JUMP!", 800); sfx.warn();
      setTimeout(() => {
        if (!S || S.ended) { res(true); return; }
        const a = document.createElement("div"); a.className = "td-arrow"; a.textContent = "🏹"; fx.appendChild(a);
        requestAnimationFrame(() => requestAnimationFrame(() => { a.style.transition = "left 850ms linear"; a.style.left = "-12%"; }));
        let ok = false;
        setTimeout(() => { ok = !!S && S.jumping; if (S && !S.ended) { if (ok) { floatText("✔ dodged!"); sfx.swish(); } else fuelHit(15, "🏹 -15 🔦"); } }, 850 * 0.8);
        setTimeout(() => { a.remove(); res(ok); }, 950);
      }, 800);
    });
  }
  function arrowTrap() { bo("Arrow trap! Jump (swipe up)!"); arrowOnce(); }

  // ---- new question shapes ----
  function mcPack(correctVal, nearFn, fmt) {
    fmt = fmt || String; const set = new Set([correctVal]); let g = 0;
    while (set.size < 4 && g++ < 60) { const c = nearFn(); if (c !== correctVal && c >= 0) set.add(c); }
    let b = 1; while (set.size < 4) set.add(correctVal + b++);
    return { options: shuffle([...set]).map(fmt), correctLabel: fmt(correctVal) };
  }
  function qPattern(tier) {
    const ti = TIERS.indexOf(tier); let seq, next;
    if (ti === 0) { const a = rand(1, 9), d = rand(2, 5); seq = [a, a + d, a + 2 * d, a + 3 * d]; next = a + 4 * d; }
    else if (ti === 1) { if (Math.random() < 0.5) { const a = rand(5, 40), d = rand(6, 13); seq = [a, a + d, a + 2 * d, a + 3 * d]; next = a + 4 * d; } else { const a = rand(2, 5); seq = [a, a * 2, a * 4, a * 8]; next = a * 16; } }
    else { if (Math.random() < 0.5) { const a = rand(2, 4); seq = [a, a * 3, a * 9, a * 27]; next = a * 81; } else { const n0 = rand(1, 4); seq = [n0 * n0, (n0 + 1) ** 2, (n0 + 2) ** 2, (n0 + 3) ** 2]; next = (n0 + 4) ** 2; } }
    return { prompt: `What comes next?  ${seq.join(", ")}, ?`, ...mcPack(next, () => next + rand(-9, 9)), key: "pattern" };
  }
  function clockSvg(h, m) {
    const hand = (ang, len, w) => `<line x1="60" y1="60" x2="${60 + len * Math.sin(ang * Math.PI / 180)}" y2="${60 - len * Math.cos(ang * Math.PI / 180)}" stroke="#f6e7cf" stroke-width="${w}" stroke-linecap="round"/>`;
    let ticks = ""; for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; ticks += `<text x="${60 + 46 * Math.sin(a)}" y="${60 - 46 * Math.cos(a) + 4}" fill="#f7c548" font-size="11" font-weight="800" text-anchor="middle">${i === 0 ? 12 : i}</text>`; }
    return `<svg viewBox="0 0 120 120" width="118" height="118"><circle cx="60" cy="60" r="56" fill="#3a281a" stroke="#f7c548" stroke-width="4"/>${ticks}${hand(((h % 12) / 12) * 360 + (m / 60) * 30, 26, 4)}${hand((m / 60) * 360, 38, 2.5)}<circle cx="60" cy="60" r="3" fill="#f7c548"/></svg>`;
  }
  function qClock(tier) {
    const ti = TIERS.indexOf(tier), mm = () => ti === 0 ? pick([0, 30]) : ti === 1 ? pick([0, 15, 30, 45]) : rand(0, 11) * 5, fmt = (h, m) => `${h}:${String(m).padStart(2, "0")}`;
    const h = rand(1, 12), m = mm(), correct = fmt(h, m), set = new Set([correct]); let g = 0; while (set.size < 4 && g++ < 60) set.add(fmt(rand(1, 12), mm()));
    return { prompt: "What time does the clock show?", options: shuffle([...set]), correctLabel: correct, html: clockSvg(h, m), key: "clock" };
  }
  function pieSvg(n, k) {
    let paths = ""; for (let i = 0; i < n; i++) { const a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2; paths += `<path d="M60 60 L${60 + 50 * Math.cos(a0)} ${60 + 50 * Math.sin(a0)} A50 50 0 ${(a1 - a0) > Math.PI ? 1 : 0} 1 ${60 + 50 * Math.cos(a1)} ${60 + 50 * Math.sin(a1)} Z" fill="${i < k ? "#f7c548" : "#3a281a"}" stroke="#f6e7cf" stroke-width="2"/>`; }
    return `<svg viewBox="0 0 120 120" width="110" height="110">${paths}</svg>`;
  }
  function qFraction(tier) {
    const ti = TIERS.indexOf(tier), n = ti === 0 ? pick([2, 3, 4]) : ti === 1 ? pick([5, 6, 8]) : pick([8, 10, 12]), k = rand(1, n - 1), correct = `${k}/${n}`, set = new Set([correct]); let g = 0;
    while (set.size < 4 && g++ < 60) set.add(`${rand(1, n - 1)}/${Math.random() < 0.3 ? n + rand(1, 2) : n}`);
    return { prompt: "What fraction of the circle is shaded?", options: shuffle([...set]), correctLabel: correct, html: pieSvg(n, k), key: "fraction" };
  }
  function qCount(tier) {
    const ti = TIERS.indexOf(tier), target = pick(["💎", "🪙", "🦴", "🔥"]), others = ["🪨", "🟫", "🔩"], n = rand(3 + ti * 2, 7 + ti * 3), arr = [];
    for (let i = 0; i < n; i++) arr.push(target); for (let i = 0; i < rand(5, 9 + ti * 3); i++) arr.push(pick(others));
    return { prompt: `How many ${target} are there?`, ...mcPack(n, () => n + rand(-3, 3)), html: `<div class="td-emojigrid">${shuffle(arr).join(" ")}</div>`, key: "count" };
  }
  const visualQ = tier => pick([qPattern, qClock, qFraction, qCount])(tier);
  function bossQ(bi, tier) {
    const k = bi % 5, P = window.AIGQuestionPools;
    if (k === 1) return qPattern(tier); if (k === 2) return pick([qFraction, qCount])(tier); if (k === 4) return qClock(tier);
    if (k === 3 && P && P.pickScience) { const q = P.pickScience(); if (q) return { key: "science", ...q }; }
    return null;
  }

  // ---- interactive puzzle questions ----
  const mkBtn = txt => { const b = document.createElement("button"); b.type = "button"; b.className = "td-q-btn"; b.textContent = txt; return b; };
  function interactive(o) {
    return waitFor(res => {
      let done = false, left = o.ms || 0, tid = null; const total = left;
      setSheet(`<h2>${o.title}</h2>${total ? `<div class="td-timer" id="td-timer"><i></i></div>` : ""}<div class="td-puzbox" id="td-puzbox"></div>`);
      const fin = (ok, timeout) => { if (done) return; done = true; clearInterval(tid); bigCount(null); S.qFrac = undefined; try { LB.recordTopicAttempt("treasure-dig", o.key || "puzzle", ok); } catch (e) {} setTimeout(() => res({ ok, timeout: !!timeout }), ok ? 450 : 750); };
      S.cancelAsk = () => { done = true; clearInterval(tid); res({ aborted: true }); };
      o.build($("td-puzbox"), fin);
      if (total) tid = setInterval(() => {
        if (done || !S || S.hold > 0 || document.hidden) return; left -= 100; S.qFrac = left / total;
        const t = $("td-timer"); if (t) { t.firstChild.style.width = Math.max(0, left / total * 100) + "%"; t.classList.toggle("low", left < total * 0.3); }
        if (left <= 3000 && left > 0) bigCount(Math.ceil(left / 1000)); else bigCount(null);
        if (left <= 0) fin(false, true);
      }, 100);
    });
  }
  function askOrder(tier, ms) {
    const ti = TIERS.indexOf(tier), n = ti === 0 ? 4 : 5, max = ti === 0 ? 50 : ti === 1 ? 500 : 5000, nums = [];
    while (nums.length < n) { const v = rand(1, max); if (!nums.includes(v)) nums.push(v); }
    const asc = Math.random() < 0.7, order = [...nums].sort((a, b) => asc ? a - b : b - a);
    return interactive({ title: `🔢 Tap from ${asc ? "SMALLEST to BIGGEST" : "BIGGEST to SMALLEST"}`, key: "puzzle", ms, build: (box, fin) => {
      let next = 0;
      nums.forEach(v => { const b = mkBtn(v.toLocaleString("en-US")); b.onclick = () => { if (b.disabled) return; if (v === order[next]) { b.disabled = true; b.classList.add("correct"); next++; sfx.coin(); if (next >= order.length) fin(true); } else { b.classList.add("wrong"); sfx.bad(); fin(false); } }; box.appendChild(b); });
    } });
  }
  function askMatch(tier, ms) {
    const ti = TIERS.indexOf(tier), lim = ti === 0 ? 6 : ti === 1 ? 9 : 12, facts = [], used = new Set();
    while (facts.length < 3) { const a = rand(2, lim), b = rand(2, lim); if (used.has(a * b)) continue; used.add(a * b); facts.push({ l: `${a} × ${b}`, r: String(a * b) }); }
    return interactive({ title: "🔗 Match each sum to its answer", key: "puzzle", ms, build: (box, fin) => {
      box.classList.add("two"); const left = shuffle(facts), right = shuffle(facts); let sel = null, matched = 0;
      const L = left.map(f => { const b = mkBtn(f.l); b.onclick = () => { if (b.disabled) return; L.forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = f; }; return b; });
      const Rb = right.map(f => { const b = mkBtn(f.r); b.onclick = () => { if (b.disabled || !sel) return; if (sel === f) { b.disabled = true; b.classList.add("correct"); const lb = L[left.indexOf(f)]; lb.disabled = true; lb.classList.add("correct"); lb.classList.remove("sel"); sel = null; matched++; sfx.coin(); if (matched >= 3) fin(true); } else { b.classList.add("wrong"); sfx.bad(); fin(false); } }; return b; });
      const c1 = document.createElement("div"), c2 = document.createElement("div"); c1.className = c2.className = "td-col"; L.forEach(b => c1.appendChild(b)); Rb.forEach(b => c2.appendChild(b)); box.appendChild(c1); box.appendChild(c2);
    } });
  }
  function askScramble(tier, ms) {
    const [word, hint] = pick(WORDS), letters = shuffle(word.split("").map((c, i) => ({ c, i })));
    return interactive({ title: `🔤 Unscramble the word: ${esc(hint)}`, key: "puzzle", ms, build: (box, fin) => {
      let typed = ""; const line = document.createElement("div"); line.className = "wordline"; line.textContent = "_ ".repeat(word.length).trim(); box.appendChild(line);
      letters.forEach(l => { const b = mkBtn(l.c.toUpperCase()); b.onclick = () => { if (b.disabled) return; if (word[typed.length] === l.c) { typed += l.c; b.disabled = true; b.classList.add("correct"); line.textContent = (typed + "_".repeat(word.length - typed.length)).toUpperCase().split("").join(" "); sfx.coin(); if (typed.length === word.length) fin(true); } else { b.classList.add("wrong"); sfx.bad(); fin(false); } }; box.appendChild(b); });
    } });
  }
  function askPads(ms, ti) {
    const colors = ["#e05555", "#55b36a", "#4f8be0", "#e0c250"], len = 4 + ti, seq = Array.from({ length: len }, () => rand(0, 3));
    return interactive({ title: "💡 Watch the lights, then repeat!", key: "puzzle", ms: ms ? ms + len * 800 + 1000 : 0, build: (box, fin) => {
      box.classList.add("two"); let input = 0, listening = false;
      const pads = colors.map((c, i) => { const b = mkBtn(""); b.className = "td-q-btn pad"; b.style.background = c; b.onclick = () => { if (!listening) return; b.classList.add("lit"); setTimeout(() => b.classList.remove("lit"), 200); sfx.coin(); if (i === seq[input]) { input++; if (input >= seq.length) { listening = false; fin(true); } } else { listening = false; sfx.bad(); fin(false); } }; box.appendChild(b); return b; });
      seq.forEach((p, k) => { setTimeout(() => { pads[p].classList.add("lit"); sfx.tick(); }, 800 + k * 750); setTimeout(() => pads[p].classList.remove("lit"), 1200 + k * 750); });
      setTimeout(() => { listening = true; }, 800 + seq.length * 750);
    } });
  }
  function askCatch(tier, fall) {
    return waitFor(res => {
      const q = pickQ(tier), correct = q.correctLabel, labels = shuffle([correct, ...shuffle(q.options.filter(o => o !== correct)).slice(0, 2)]), lettered = labels.some(l => String(l).length > 8);
      setSheet(`<h2>🪂 Catch the right answer!</h2><div class="td-q-prompt"></div><p>${lettered ? labels.map((l, i) => `<b>${"ABC"[i]})</b> ${esc(l)}`).join("&nbsp; ") : "Move under the falling answer you think is right!"}</p>`);
      $("td-sheet").querySelector(".td-q-prompt").textContent = q.prompt; S.lastQ = q;
      const els = labels.map((l, i) => { const e = document.createElement("div"); e.className = "td-fall"; e.textContent = lettered ? "ABC"[i] : l; e.style.left = laneLeft(i); e.style.top = "-20px"; fx.appendChild(e); return e; });
      requestAnimationFrame(() => requestAnimationFrame(() => els.forEach(e => { e.style.transition = `top ${fall}ms linear`; e.style.top = "84px"; })));
      const ci = labels.indexOf(correct); let done = false;
      const tm = setTimeout(() => {
        if (done || !S || S.ended) { els.forEach(e => e.remove()); return; } done = true; const ok = S.lane === ci;
        els.forEach((e, i) => { e.classList.add(i === ci ? "good" : "bad"); setTimeout(() => e.remove(), 700); });
        try { LB.recordTopicAttempt("treasure-dig", q.key || "math", ok); } catch (e) {} setTimeout(() => res({ ok }), 650);
      }, fall + 150);
      S.cancelAsk = () => { done = true; clearTimeout(tm); els.forEach(e => e.remove()); res({ aborted: true }); };
    });
  }
  async function askMain(d, ti, header, timerMs) {
    const tier = TIERS[ti], roll = Math.random();
    if (roll < 0.12) return ask({ q: visualQ(tier), tier, timerMs, lifelines: true, allowBlast: true, header });
    if (roll < 0.23) { const ms = S.pressure ? Math.round((timerMs || 12000) * 1.6) : 0, k = pick(["order", "match", "scramble"]); return k === "order" ? askOrder(tier, ms) : k === "match" ? askMatch(tier, ms) : askScramble(tier, ms); }
    if (roll < 0.31) return askCatch(tier, S.pressure ? 3300 : 5200);
    return ask({ tier, timerMs, lifelines: true, allowBlast: true, header, blocks: Math.random() < 0.25, flash: Math.random() < 0.1 });
  }

  // ---- extra events ----
  async function forkEvent(d) {
    const opts = [{ k: "treasure", e: "🧰", n: "Treasure nook", s: "1 lock, big loot" }, { k: "gauntlet", e: "🏹", n: "Arrow corridor", s: "Jump 3 arrows for loot" }, { k: "shortcut", e: "🚀", n: "Quick tunnel", s: "2 questions, skip a layer" }, { k: "merchant", e: "🛒", n: "Merchant cave", s: "Spend your bag coins" }, { k: "rest", e: "⛺", n: "Quiet cave", s: "Heal 1 ❤️ + refuel" }];
    const two = shuffle(opts).slice(0, 2);
    setSheet(`<h2>🚪 The tunnel splits!</h2><p>Pick a side:</p><div class="td-choice">${two.map(o => `<button type="button" data-k="${o.k}"><span class="e">${o.e}</span>${o.n}<small>${o.s}</small></button>`).join("")}</div>`);
    const c = await waitFor(res => $("td-sheet").querySelectorAll("button[data-k]").forEach(b => b.onclick = () => res(b.dataset.k)));
    if (S.ended || !c || c.aborted) return;
    if (c === "treasure") await chestEvent(1, false);
    else if (c === "gauntlet") {
      setSheet(`<h2>🏹 Arrow corridor!</h2><p>Jump over each arrow (swipe up or tap the button)!</p><button class="td-btn primary" id="td-jumpbig" type="button">⬆ JUMP!</button>`);
      $("td-jumpbig").onpointerdown = e => { e.preventDefault(); doJump(); };
      let clean = 0; for (let i = 0; i < 3; i++) { const ok = await arrowOnce(); if (S.ended) return; if (ok) clean++; await dly(450); }
      if (clean === 3) { unlockAch("arrow"); const co = coinsMul(14 + d); addBag(co, 0); floatText(`+${co} 🪙 clean run!`); if (Math.random() < 0.5) await relicFound(pickRelic(d, false)); } else if (clean > 0) { const co = coinsMul(4 * clean); addBag(co, 0); floatText(`+${co} 🪙`); }
    } else if (c === "shortcut") {
      let ok = true; for (let i = 0; i < 2; i++) { const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? 7000 : 0, lifelines: false, header: `<h2>🚀 Quick tunnel ${i + 1}/2</h2>` }); if (S.ended) return; if (r.ok) gainCorrect(); else { ok = false; break; } }
      if (ok && S.depth % 5 !== 3) { toast("🚀 Skipped a layer!"); await digDown(true); if (S.ended) return; await lootStep(S.depth, "soft"); } else if (!ok) hurt("shortcut");
    } else if (c === "merchant") await npcEvent(d, "merchant");
    else if (c === "rest") { S.energy = Math.min(S.energyMax, S.energy + 1); S.fuel = Math.min(100, S.fuel + 30); renderHud(); floatText("⛺ rested! +1 ❤️"); sfx.heart && sfx.heart(); await dly(700); }
  }
  async function cavernEvent(d) {
    showMonster("💎"); bo("Crystal cavern! Collect coins, dodge 🔺!");
    setSheet(`<h2>💎 Crystal cavern!</h2><p>Move under the falling coins and gems. Dodge the 🔺 spikes (or JUMP)!</p>`);
    await dly(900); if (S.ended) return;
    let got = 0, gems = 0, spawned = 0; const total = 13;
    await waitFor(res => {
      const iv = setInterval(() => {
        if (!S || S.ended) { clearInterval(iv); res(); return; } if (S.hold > 0 || document.hidden) return;
        if (spawned >= total) { clearInterval(iv); setTimeout(res, 900); return; } spawned++;
        const r = Math.random(), kind = r < 0.68 ? "coin" : r < 0.82 ? "gem" : "spike", lane = rand(0, 2), e = document.createElement("div");
        e.className = "td-fall"; e.textContent = kind === "coin" ? "🪙" : kind === "gem" ? "💎" : "🔺"; e.style.left = laneLeft(lane); e.style.top = "-20px"; fx.appendChild(e);
        requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transition = "top 900ms linear"; e.style.top = "88px"; }));
        setTimeout(() => { e.remove(); if (!S || S.ended || S.lane !== lane) return; if (kind === "spike") { if (!S.jumping) fuelHit(10, "🔺 -10 🔦"); } else { if (kind === "coin") got++; else gems++; sfx.coin(); } }, 920);
      }, 650);
    });
    hideMonster(); if (S.ended) return;
    const co = coinsMul(got * 2 + 4); addBag(co, gems); floatText(`+${co} 🪙${gems ? ` +${gems} 💎` : ""}`); await dly(700);
  }
  async function ladderEvent() {
    bo("A ladder! Climb to escape the lava!"); const ok = await climb(12, 4500); if (S.ended) return;
    if (ok) { S.lava = Math.min(S.lava, S.depth - 6); S.fuel = Math.min(100, S.fuel + 20); toast("🪜 Climbed! Lava pushed back"); } else toast("You slipped off the ladder...");
    await dly(500);
  }
  async function templeEvent(d) {
    showMonster("🏛️"); bo("A temple door with a puzzle!");
    const tier = TIERS[tierIdxFor(d)], r = Math.random() < 0.5 ? await askOrder(tier, S.pressure ? 16000 : 0) : await askPads(S.pressure ? 14000 : 0, tierIdxFor(d));
    hideMonster(); if (S.ended || !r || r.aborted) return;
    if (r.ok) { unlockAch("puzzle"); sfx.chest(); toast("🏛️ The door opens!"); addBag(coinsMul(10 + d), 0); await relicFound(pickRelic(d, true)); } else { toast("The door stays shut..."); await dly(500); }
  }
  async function monsterEvent(d) {
    const M = pick([{ e: "🕷️", n: "Cave spider", hp: 3 }, { e: "🟢", n: "Slime", hp: 4 }, { e: "🧟", n: "Zombie", hp: 5 }]);
    showMonster(M.e); sfx.warn(); bo(`A ${M.n}! Smash it!`);
    const r = await waitFor(res => {
      let hp = M.hp, left = 3300, fin = false;
      setSheet(`<h2>${M.e} ${M.n}!</h2><div class="td-timer"><i id="td-mbar"></i></div><button class="td-tapbtn" id="td-mhit" type="button">⚔️ HIT!<small id="td-mhp">HP ${hp}</small></button>`);
      const finish = ok => { if (fin) return; fin = true; clearInterval(tid); res({ ok }); };
      $("td-mhit").addEventListener("pointerdown", e => { e.preventDefault(); if (fin) return; hp--; sfx.dig(); const m = $("td-monster"); m.classList.remove("hurt"); void m.offsetWidth; m.classList.add("hurt"); $("td-mhp").textContent = `HP ${Math.max(0, hp)}`; if (hp <= 0) finish(true); });
      const tid = setInterval(() => { if (S.hold > 0 || document.hidden) return; left -= 50; $("td-mbar").style.width = Math.max(0, left / 3300 * 100) + "%"; if (left <= 0) finish(false); }, 50);
    });
    hideMonster(); if (!r || r.aborted || S.ended) return;
    if (r.ok) { const c = coinsMul(6 + M.hp * 2); addBag(c, 0); floatText(`+${c} 🪙`); sfx.coin(); if (Math.random() < 0.25) await relicFound(pickRelic(d, false)); } else hurt("monster");
  }
  async function detectorEvent(d) {
    const target = rand(0, 8); let taps = 0, found = false;
    await waitFor(res => {
      setSheet(`<h2>📡 Treasure detector!</h2><p>Tap a mound. 🔥 hot = very close, 🟠 warm, 🧊 cold. You get 4 taps!</p><div class="td-mounds" id="td-mounds"></div>`);
      const box = $("td-mounds");
      for (let i = 0; i < 9; i++) {
        const b = document.createElement("button"); b.type = "button"; b.className = "td-mound"; b.textContent = "🟫"; box.appendChild(b);
        b.onclick = () => {
          if (b.disabled || found) return; b.disabled = true; taps++;
          const dist = Math.max(Math.abs(i % 3 - target % 3), Math.abs(Math.floor(i / 3) - Math.floor(target / 3)));
          if (i === target) { found = true; b.textContent = "🧰"; sfx.chest(); setTimeout(() => res(), 700); }
          else { b.textContent = dist === 1 ? "🔥" : dist === 2 ? "🟠" : "🧊"; sfx.tick(); if (taps >= 4) setTimeout(() => res(), 700); }
        };
      }
    });
    if (S.ended) return;
    if (found) { unlockAch("detector"); const co = coinsMul(18 + d * 2); addBag(co, 1); floatText(`+${co} 🪙 +1 💎`); await dly(700); if (S.ended) return; if (Math.random() < 0.5) await relicFound(pickRelic(d, true)); } else { toast("Nothing found this time..."); await dly(400); }
  }
  async function dynamiteEvent() {
    const k = Math.random() < 0.5 ? 0 : 2; sfx.warn(); bo("Lit dynamite! Run to the OTHER side!");
    const dy = document.createElement("div"); dy.className = "td-fall"; dy.textContent = "🧨"; dy.style.left = laneLeft(k); dy.style.top = "84px"; fx.appendChild(dy);
    setSheet(`<h2>🧨 DYNAMITE!</h2><p>Get away from the fuse — move to the far side of the mine!</p>`);
    for (let n = 3; n >= 1; n--) { bigCount(n); sfx.tick(); await delay(settings.motion ? 300 : 850); if (S.ended) { dy.remove(); return; } }
    bigCount(null); sfx.boom(); flash("rgba(255,200,80,.8)"); shake(); dy.remove();
    if ([k, 1].includes(S.lane) && !S.jumping) { floatText("💥 BOOM!"); hurt("dynamite"); } else { const c = coinsMul(8); addBag(c, Math.random() < 0.3 ? 1 : 0); floatText(`+${c} 🪙 safe!`); }
  }
  async function quakeEvent(d) {
    shake(); sfx.boom(); flash("rgba(255,120,0,.4)");
    setSheet(`<h2>🌋 EARTHQUAKE!</h2><p>Quick, decide!</p><div class="td-choice"><button type="button" data-q="cover"><span class="e">🛡️</span>Take cover<small>Safe: costs 10 🔦</small></button><button type="button" class="rock" data-q="run"><span class="e">🏃</span>Run!<small>Dodge 3 rocks → coins. Hit → ouch</small></button></div>`);
    const c = await waitFor(res => $("td-sheet").querySelectorAll("button[data-q]").forEach(b => b.onclick = () => res(b.dataset.q)));
    if (S.ended || !c || c.aborted) return;
    if (c === "cover") { S.fuel = Math.max(0, S.fuel - 10); floatText("🛡️ ducked! −10 🔦"); await dly(800); return; }
    setSheet(`<h2>🏃 RUN!</h2><p>Move away from ⚠️!</p>`); let hits = 0;
    for (let i = 0; i < 3; i++) {
      const lane = rand(0, 2); warnAt(lane, "⚠️", 700); await delay(settings.motion ? 200 : 700); if (S.ended) return;
      const r = document.createElement("div"); r.className = "td-rock"; r.textContent = "🪨"; r.style.left = laneLeft(lane); fx.appendChild(r); await delay(300); r.remove();
      if (S && !S.ended && S.lane === lane && !S.jumping) { hits++; shake(); sfx.bad(); } await delay(350); if (S.ended) return;
    }
    if (hits === 0) { const c2 = coinsMul(10 + d); addBag(c2, 0); floatText(`+${c2} 🪙`); } else hurt("quake");
  }
  async function npcEvent(d, forced) {
    const type = forced || rpick(["merchant", "challenger", "healer"]);
    if (type === "merchant") {
      showMonster("🧑‍🔧"); bo("Psst! Wanna buy something?");
      const stock = [{ k: "fifty", e: "🎯", n: "50/50", c: 6 }, { k: "skip", e: "⏭", n: "Skip", c: 6 }, { k: "dyn", e: "💥", n: "Dynamite", c: 10 }, { k: "heart", e: "❤️", n: "Heal 1", c: 14 }];
      for (;;) {
        setSheet(`<h2>🛒 Merchant</h2><p>Your bag: 🪙 ${S.bag.coins}</p><div class="td-shop">${stock.map(s => `<button type="button" data-k="${s.k}" ${S.bag.coins < s.c ? "disabled" : ""}>${s.e} ${s.n}<br>🪙 ${s.c}</button>`).join("")}</div><button class="td-btn dark" id="td-leave" type="button">Leave</button>`);
        const c = await waitFor(res => { $("td-sheet").querySelectorAll("button[data-k]").forEach(b => b.onclick = () => res(b.dataset.k)); $("td-leave").onclick = () => res("leave"); });
        if (S.ended || !c || c.aborted || c === "leave") break;
        const it = stock.find(x => x.k === c); if (S.bag.coins < it.c) continue; addBag(-it.c, 0); unlockAch("npc"); sfx.coin();
        if (c === "fifty") S.fifty++; else if (c === "skip") S.skip++; else if (c === "dyn") S.dynamite = Math.min(3, S.dynamite + 1); else S.energy = Math.min(S.energyMax, S.energy + 1);
        renderHud();
      }
      hideMonster(); return;
    }
    if (type === "challenger") {
      showMonster("🧙"); bo("I challenge you to a riddle!");
      const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? qTimer(d) : 0, lifelines: false, header: `<h2>🧙 Riddle challenge! Right = reward, wrong = lose 5 🪙</h2>` });
      hideMonster(); if (S.ended) return;
      if (r.ok) { gainCorrect(); unlockAch("npc"); const c = coinsMul(16 + d); addBag(c, 0); floatText(`+${c} 🪙`); if (Math.random() < 0.35) await relicFound(pickRelic(d, false)); } else { addBag(-5, 0); floatText("−5 🪙"); S.streak = 0; renderHud(); }
      return;
    }
    showMonster("🧑‍⚕️"); bo("You look tired. Let me help!");
    if (S.energy >= S.energyMax) { setSheet(`<h2>🧑‍⚕️ Healer</h2><p>You're in perfect shape! He gives you a snack: +20 🔦</p>`); S.fuel = Math.min(100, S.fuel + 20); await dly(1200); hideMonster(); return; }
    setSheet(`<h2>🧑‍⚕️ Healer</h2><p>Heal 1 ❤️ for 8 🪙 from your bag?</p><div class="td-btnrow"><button class="td-btn green" id="td-heal" ${S.bag.coins < 8 ? "disabled" : ""}>Heal (8 🪙)</button><button class="td-btn dark" id="td-noheal">No thanks</button></div>`);
    const c = await waitFor(res => { $("td-heal").onclick = () => res("y"); $("td-noheal").onclick = () => res("n"); });
    hideMonster(); if (S.ended || !c || c.aborted) return;
    if (c === "y") { addBag(-8, 0); S.energy = Math.min(S.energyMax, S.energy + 1); unlockAch("npc"); renderHud(); floatText("❤️ healed!"); sfx.heart && sfx.heart(); await dly(600); }
  }
  function addMapPiece(d) {
    const b = biomeOf(Math.max(1, d)); td.mapB = td.mapB || [0, 0, 0, 0, 0]; td.mapB[b]++; toast(`🗺️ ${BIOMES[b].name} map piece ${Math.min(td.mapB[b], 3)}/3`); save();
  }

  function buddyInfoHtml() {
    if (look.buddy === "none") return "";
    const x = td.buddyXp || 0, lv = buddyLevel(), nxt = [30, 80, 160][lv];
    const perks = { mole: ["+1 🪙 every level", "+5% gem chance"], owl: ["+1 extra 50/50", "free 50/50 at every boss"], robot: ["shield returns at camps", "shield returns after bosses"] }[look.buddy] || [];
    return `<div class="td-shelfrow">🐾 Buddy level ${lv}/3 · XP ${x}${nxt ? ` / ${nxt}` : " (MAX)"}<br>${perks.slice(0, Math.max(0, lv - 1)).join(" · ") || "Dig more to level up! (level 2 unlocks a perk)"}</div>`;
  }
  function holdDig() {
    return waitFor(res => {
      let fin = false, t0 = 0, raf = 0, holding = false;
      setSheet(`<h2>⛏️ POWER SWING! Hold, then release in the green!</h2><div class="td-lever"><div class="zone" style="left:72%;width:22%"></div><div class="mark" id="td-pw" style="left:0;width:0;background:#f7c548"></div></div><button class="td-tapbtn" id="td-hold" type="button">⛏️ HOLD…<small>release in the green zone</small></button>`);
      const bar = $("td-pw");
      const finish = ok => { if (fin) return; fin = true; cancelAnimationFrame(raf); res(ok); };
      const frame = () => { if (fin || !holding) return; const p = Math.min(1, (performance.now() - t0) / 1300); bar.style.width = p * 100 + "%"; if (p >= 1) { finish(false); return; } raf = requestAnimationFrame(frame); };
      const btn = $("td-hold");
      btn.addEventListener("pointerdown", e => { e.preventDefault(); if (fin) return; holding = true; t0 = performance.now(); sfx.tick(); frame(); });
      const rel = () => { if (fin || !holding) return; holding = false; const p = Math.min(1, (performance.now() - t0) / 1300); finish(p >= 0.72 && p <= 0.94); };
      btn.addEventListener("pointerup", rel); btn.addEventListener("pointerleave", rel);
      setTimeout(() => finish(false), 6000);
    }).then(r => {
      if (r && r.aborted) return false;
      if (!r) { S.lava += 0.35; floatText("Missed! 🌋 closer"); sfx.bad(); } else { S.fuel = Math.min(100, S.fuel + 5); sfx.dig(); }
      return !!r;
    });
  }

  // ---------------- decisions: path, camp, climb, gamble, mini-boss ----------------
  function choosePath(d) {
    boLine("start");
    return waitFor(res => {
      const canBet = S.bag.coins >= 10;
      setSheet(`<h2>Level ${d}: choose your wall</h2><p>${BIOMES[biomeOf(d)].name} — how brave are you?</p><div class="td-choice"><button type="button" data-p="soft"><span class="e">🟫</span>Soft dirt<small>Easier question · normal loot</small></button><button type="button" class="rock" data-p="rock"><span class="e">🪨</span>Hard rock<small>Harder question · 2× loot · more relics</small></button></div>${canBet ? `<button type="button" class="td-btn dark" id="td-bet" style="margin-top:8px">🎰 Bet 10 🪙 (right: +10 · wrong: −10): <b id="td-bet-st">OFF</b></button>` : ""}`);
      S.bet = 0; const betBtn = $("td-bet"); if (betBtn) betBtn.onclick = () => { S.bet = S.bet ? 0 : 10; $("td-bet-st").textContent = S.bet ? "ON" : "OFF"; sfx.tick(); };
      $("td-sheet").querySelectorAll("button[data-p]").forEach(b => b.onclick = () => res(b.dataset.p));
    });
  }
  function climb(needN, totalMs) { // -> true on success
    return waitFor(res => {
      const need = needN || 22, total = totalMs || 6500; let n = 0, last = null, left = total, fin = false, tid = null;
      setSheet(`<h2>🧗 Climb out! Alternate L ↔ R!</h2><div class="td-timer"><i id="td-clbar"></i></div><div class="td-climbrow"><button class="td-tapbtn next" id="td-cl-l" type="button">🧗 LEFT</button><button class="td-tapbtn" id="td-cl-r" type="button">RIGHT 🧗</button></div><p class="td-sub" id="td-cl-n" style="margin-top:8px">0 / ${need}</p>`);
      const finish = ok => { if (fin) return; fin = true; clearInterval(tid); res(ok); };
      const hit = side => { if (fin || side === last) return; last = side; n++; sfx.swish(); buzz(8); $("td-cl-n").textContent = `${n} / ${need}`; $("td-cl-l").classList.toggle("next", side === "r"); $("td-cl-r").classList.toggle("next", side === "l"); if (n >= need) finish(true); };
      $("td-cl-l").addEventListener("pointerdown", e => { e.preventDefault(); hit("l"); }); $("td-cl-r").addEventListener("pointerdown", e => { e.preventDefault(); hit("r"); });
      tid = setInterval(() => { if (document.hidden) return; left -= 50; $("td-clbar").style.width = Math.max(0, left / total * 100) + "%"; if (left <= 0) finish(false); }, 50);
    }).then(r => (r && r.aborted) ? false : !!r);
  }
  async function campStep() { // -> "cash" | "go"
    S.energy = Math.min(S.energyMax, S.energy + 1); S.fuel = Math.min(100, S.fuel + 30); if (hasBuddy("robot") && buddyLevel() >= 2) S.shield = true; renderHud(); boLine("camp"); sfx.chest(); hold();
    let usedG = false, usedM = false;
    while (!S.ended) {
      const d = S.depth;
      setSheet(`<h2>🏕️ Camp! (time stops here)</h2><p>Healed 1 ❤️ and refuelled. Your bag: 🪙 ${S.bag.coins} · 💎 ${S.bag.gems}${S.found.length ? ` · 🏺 ${S.found.length}` : ""}<br>Faint later = lose <b>half</b> of coins & gems!</p><div class="td-btnrow"><button class="td-btn green" id="c-cash">🏠 Cash out</button><button class="td-btn primary" id="c-climb">🧗 Climb out (×1.25 / ×0.8)</button><button class="td-btn dark" id="c-gam" ${usedG ? "disabled" : ""}>🎲 Gamble bag ×2</button><button class="td-btn dark" id="c-mini" ${usedM ? "disabled" : ""}>⚔️ Mini-boss</button></div><button class="td-btn red" id="c-go" style="margin-top:8px">⬇ Keep digging!</button>`);
      const c = await waitFor(res => { ["cash", "climb", "gam", "mini", "go"].forEach(k => { $("c-" + k).onclick = () => res(k); }); });
      if (S.ended || !c || c.aborted) break;
      if (c === "cash") { release(); return "cash"; }
      if (c === "go") { release(); return "go"; }
      if (c === "climb") { const ok = await climb(); if (S.ended) break; S.cashMult = ok ? 1.25 : 0.8; if (ok) unlockAch("climb"); toast(ok ? "🧗 You climbed out fast! ×1.25" : "😓 Slipped on the way out... ×0.8"); release(); return "cash"; }
      if (c === "gam") {
        usedG = true; release();
        const r = await ask({ tier: "hard", timerMs: 9000, lifelines: false, header: `<h2>🎲 GAMBLE: right = bag ×2, wrong = lose half!</h2>` }); hold(); if (S.ended) break;
        if (r.ok) { addBag(S.bag.coins, S.bag.gems); gainCorrect(); unlockAch("gamble"); toast("🎲 JACKPOT! Bag doubled!"); sfx.chest(); } else { addBag(-Math.floor(S.bag.coins / 2), -Math.floor(S.bag.gems / 2)); S.streak = 0; toast("💸 Lost half of the bag..."); sfx.bad(); }
        await dly(500);
      }
      if (c === "mini") {
        usedM = true; release(); let ok = true;
        for (let i = 0; i < 3; i++) { const r = await ask({ tier: TIERS[tierIdxFor(d)], timerMs: S.pressure ? 8000 : 0, lifelines: false, header: `<h2>⚔️ Mini-boss ${i + 1}/3 ${["🐀", "🦂", "🐍"][i]}</h2>` }); if (S.ended) break; if (r.ok) gainCorrect(); else { ok = false; break; } }
        hold(); if (S.ended) break;
        if (ok) { const co = coinsMul(12 + d); addBag(co, 0); toast(`⚔️ Mini-boss beaten! +${co} 🪙`); await relicFound(pickRelic(d, true)); if (S.ended) break; } else { if (hurt("mini")) break; }
      }
    }
    return "go";
  }

  // ---------------- director: what happens on each level ----------------
  function pickEvent(d) {
    if (d < 2 || R() > (S.pressure ? 0.6 : 0.38)) return null;
    const pool = [["trap", 3], ["lever", 2]];
    if (S.pressure) { pool.push(["chasm", 2]); if (d >= 3) pool.push(["bomb", 2]); if (d >= 4) pool.push(["bridge", 2]); }
    if (d >= 3) pool.push(["maze", 2]);
    if (d >= 4 && (d % 5 === 1 || d % 5 === 2)) pool.push(["shortcut", 2]);
    const bb = biomeOf(d);
    pool.push(["monster", 2], ["npc", 2]);
    if (d >= 3) pool.push(["fork", 2], ["cavern", 2], ["dynamite", 2]);
    if (d >= 4) pool.push(["detector", 2], ["quake", 2], ["temple", bb === 4 ? 4 : 1]);
    if (d >= 5) pool.push(["river", bb === 2 ? 3 : 1]);
    if (S.pressure && d >= 3) pool.push(["ladder", 2]);
    const tot = pool.reduce((a, p) => a + p[1], 0); let r = R() * tot;
    for (const [n, w] of pool) { r -= w; if (r <= 0) return n; }
    return pool[0][0];
  }
  async function runEvent(ev, d) {
    if (ev === "trap") return trapEvent(d); if (ev === "lever") return leverEvent(); if (ev === "chasm") return chasmEvent(d);
    if (ev === "bomb") return bombEvent(d); if (ev === "bridge") return bridgeEvent(d); if (ev === "maze") return mazeEvent(d);
    if (ev === "monster") return monsterEvent(d); if (ev === "npc") return npcEvent(d); if (ev === "fork") return forkEvent(d); if (ev === "cavern") return cavernEvent(d);
    if (ev === "dynamite") return dynamiteEvent(); if (ev === "detector") return detectorEvent(d); if (ev === "quake") return quakeEvent(d); if (ev === "temple") return templeEvent(d);
    if (ev === "river") return minecart("river"); if (ev === "ladder") return ladderEvent();
  }
  async function runLoop() {
    while (!S.ended) {
      const d = S.depth + 1;
      if (d % 5 === 0) {
        await bossFight(d); if (S.ended) return;
        await minecart(); if (S.ended) return;
      } else {
        if (S.secret && d === S.secretAt && !S.secretDone) {
          setSheet(`<h2>🗝️ A secret door!</h2><p>Your map led you here. Crack 3 locks in a row for a jackpot!</p><button class="td-btn primary" id="td-secret">Open the door</button>`);
          await waitFor(res => { $("td-secret").onclick = () => res("go"); }); if (S.ended) return;
          await chestEvent(3, true); S.secretDone = true; save(); if (S.ended) return;
        }
        const ev = pickEvent(d);
        let skipped = false;
        if (ev === "shortcut") { skipped = await shortcutEvent(d); if (S.ended) return; }
        if (!skipped) {
          const path = await choosePath(d); if (S.ended || !path || path.aborted) return;
          if (ev && ev !== "shortcut") { await runEvent(ev, d); if (S.ended) return; }
          let dug = false;
          while (!dug && !S.ended) {
            const cell = targetCell(); if (cell) { cell.classList.toggle("hard", path === "rock"); cell.textContent = path === "rock" ? "🪨" : ""; }
            const ti = clamp(tierIdxFor(d) + (path === "rock" ? 1 : -1), 0, 2);
            const r = await askMain(d, ti, `<h2>⛏️ Level ${d} · ${path === "rock" ? "🪨 Hard rock" : "🟫 Soft dirt"}${S.bet ? " · 🎰 bet" : ""}</h2>`, qTimer(d, path === "rock" ? -1000 : 0));
            if (S.ended) return;
            if (r.blast) {
              sfx.boom(); flash("rgba(255,160,40,.7)"); shake(); buzz(150); floatText("💥 BLAST!");
              await digDown(); if (S.ended) return; if (S.depth % 5 !== 4) await digDown(); if (S.ended) return; dug = true; continue;
            }
            if (r.ok) {
              if (S.bet) { addBag(S.bet, 0); floatText(`🎰 +${S.bet} 🪙`); S.bet = 0; }
              gainCorrect(); const fast = await tapDig(path); if (S.ended) return;
              await digDown(); if (S.ended) return;
              await lootStep(d, path, fast); if (S.ended) return;
              dug = true;
              if (S.depth >= 10 && !S.tenDone) { S.tenDone = true; addBag(0, 1); toast("🏆 10 m! +1 💎 bonus"); }
            } else {
              if (S.bet) { addBag(-S.bet, 0); floatText(`🎰 −${S.bet} 🪙`); S.bet = 0; }
              if (hurt(r.timeout ? "timeout" : "wrong")) return;
            }
          }
        }
      }
      if (S.ended) return;
      if (S.depth % 5 === 3 || S.depth % 5 === 0) { const c = await campStep(); if (S.ended) return; if (c === "cash") return endRun("cash"); }
    }
  }

  // ---------------- end of run ----------------
  async function endRun(kind) {
    if (!S || S.finalised) return; S.ended = true; S.finalised = true; S.live = false;
    stopPulse(); if (window.AIGSynthBgm) AIGSynthBgm.stop();
    try { S.cancelAsk && S.cancelAsk(); S.cancelLever && S.cancelLever(); S.cancelCart && S.cancelCart(); S.relicCleanup && S.relicCleanup(); } catch (e) {}
    S.waiters.forEach(r => { try { r({ aborted: true }); } catch (e) {} }); S.waiters = [];
    ["td-relic", "td-cine", "td-buffs"].forEach(id => hide(id)); bigCount(null); cam.classList.remove("slowmo", "wide", "zoom"); $("td-rush").classList.add("hidden"); $("td-danger").style.opacity = 0;
    fx.innerHTML = ""; hideMonster(); renderWorld();
    const bagC = S.bag.coins, bagG = S.bag.gems, mult = kind === "cash" ? (S.cashMult || 1) : 1;
    const beatRival = S.rivalSpeed > 0 && S.depth > Math.floor(S.rival);
    const rivalBonus = beatRival ? 10 : 0;
    let bankC = (kind === "dead" ? Math.floor(bagC / 2) : Math.round(bagC * mult)) + rivalBonus; const bankG = kind === "dead" ? Math.floor(bagG / 2) : bagG;
    if (S.ruleOn) bankC = Math.round(bankC * 1.5);
    try { await LB.awardTreasureDigLoot(bankC, bankG); } catch (e) {}
    let bonus = null; try { const r = await LB.awardTreasureDigRoundBonus(S.depth, 10); bonus = r && r.bonus; } catch (e) {}
    const prevBest = td.bestDepth || 0;
    if (look.buddy !== "none") td.buddyXp = (td.buddyXp || 0) + Math.max(1, S.depth); td.dp = (td.dp || 0) + Math.floor(S.depth / 5);
    td.runs = (td.runs || 0) + 1; td.bosses = (td.bosses || 0) + S.bosses; td.bestDepth = Math.max(prevBest, S.depth);
    const wk = LB.treasureDigWeekKey(), today = todayStr();
    if (!td.week || td.week.key !== wk) td.week = { key: wk, depth: 0 }; td.week.depth = Math.max(td.week.depth, S.depth);
    if (!td.day || td.day.key !== today) td.day = { key: today, depth: 0 }; td.day.depth = Math.max(td.day.depth, S.depth);
    if (S.depth >= 5 && S.elapsed > 20 && (S.depth > prevBest || !td.pace)) td.pace = S.depth / S.elapsed;
    if (beatRival) unlockAch("rival");
    if (kind === "cash") { bump("cash"); if (bankC >= 30) unlockAch("cash"); }
    checkAch(); await save(); await refreshWallet();
    showEnd(kind, { bagC, bagG, bankC, bankG, bonus, prevBest, beatRival, rivalBonus, mult });
  }
  async function showEnd(kind, x) {
    const depth = S.depth, stars = depth >= 15 ? 3 : depth >= 10 ? 2 : depth >= 5 ? 1 : 0;
    $("td-end-emoji").textContent = kind === "cash" ? "💰" : depth >= 10 ? "🥳" : "😵";
    $("td-end-title").textContent = kind === "cash" ? (x.mult > 1 ? "Climbed out rich!" : "Safe and rich!") : depth >= 10 ? "You fainted deep down!" : "You fainted!";
    $("td-end-stars").innerHTML = ""; $("td-end-lines").innerHTML = ""; $("td-end-relics").innerHTML = ""; $("td-end-bonus").textContent = "";
    show("td-end"); if (kind === "dead") { flash("rgba(220,40,40,.8)"); shake(); } else confetti();
    const lines = [
      ["⬇ Depth", `${depth} m${depth > x.prevBest ? " 🏆 new best!" : ""}`],
      ["🎒 Bag", `🪙 ${x.bagC} · 💎 ${x.bagG}`],
      ["💰 Kept", `🪙 ${x.bankC} · 💎 ${x.bankG}${kind === "dead" && (x.bagC || x.bagG) ? " (half lost)" : ""}${x.mult !== 1 && kind === "cash" ? ` (×${x.mult})` : ""}`],
      [S.rivalIcon + " Rival", x.beatRival ? `Beaten! +10 🪙` : `Got ahead of you (${Math.floor(S.rival)} m)`],
      ["⚔️ Bosses", S.bosses], ["🔥 Best combo", `x${S.bestStreak}`], ["🎲 Seed", S.seedLabel]
    ];
    for (const l of lines) { const dv = document.createElement("div"); dv.className = "td-rise"; dv.innerHTML = `<span>${l[0]}</span><span>${l[1]}</span>`; $("td-end-lines").appendChild(dv); sfx.tick(); await delay(settings.motion ? 20 : 330); }
    $("td-end-stars").innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? "on" : ""}" style="animation-delay:${i * 0.2}s">⭐</span>`).join("");
    $("td-end-relics").innerHTML = S.found.length ? S.found.map(f => `<span class="${f.isNew ? "new" : ""}">${f.r.emoji} ${f.isNew ? "NEW " : ""}${esc(f.r.name)}</span>`).join("") : "<span>No relics this time</span>";
    $("td-end-bonus").textContent = x.bonus ? `Depth bonus: 🪙${x.bonus.coins || 0}${x.bonus.gems ? ` 💎${x.bonus.gems}` : ""}` : "";
    sfx[kind === "cash" ? "chest" : "bad"]();
  }
  function confetti() { for (let i = 0; i < 22; i++) { const c = document.createElement("div"); c.className = "td-confetti"; c.textContent = pick(["🪙", "💎", "✨", "⭐", "🎉"]); c.style.left = rand(2, 96) + "%"; c.style.animationDelay = Math.random() * 0.8 + "s"; document.body.appendChild(c); setTimeout(() => c.remove(), 3600); } }

  // ---------------- new run ----------------
  let mode = "hard", rivalPick = "bot";
  function chooseBuff() {
    return waitFor(res => {
      const cards = shuffle(BUFFS).slice(0, 3);
      $("td-buff-cards").innerHTML = cards.map((b, i) => `<button type="button" data-i="${i}"><span class="e">${b.e}</span>${esc(b.n)}<small>${esc(b.d)}</small>${b.bad ? `<small class="bad">⚠ ${esc(b.bad)}</small>` : ""}</button>`).join("");
      $("td-buff-cards").querySelectorAll("button").forEach(btn => btn.onclick = () => { hide("td-buffs"); res(cards[+btn.dataset.i]); });
      show("td-buffs");
    });
  }
  function makeState(seedStr, rv, potion) {
    const st = { depth: 0, energyMax: 3 + (potion > 0 ? 1 : 0), energy: 0, bag: { coins: 0, gems: 0 }, found: [], streak: 0, bestStreak: 0, dynamite: 0, rush: 0, curse: 0,
      fifty: 1 + (hasBuddy("owl") ? 1 : 0) + ((td.supplies && td.supplies.fifty) || 0), skip: 1 + ((td.supplies && td.supplies.skip) || 0),
      mistakes: 0, bosses: 0, correct: 0, secret: false, secretAt: 0, secretDone: false, shield: hasBuddy("robot"), ended: false, finalised: false, seen: new Set(), waiters: [],
      pressure: mode === "hard", modeMul: mode === "hard" ? 1.3 : 0.6, lootMul: 1, timeBonus: 0, fuelMul: 1, lavaMul: 1, lava: -4, fuel: 100, burn: 0, hold: 0, live: false, calm: false, hazards: true,
      lane: 1, nextRock: 5, nextBat: 10, swats: 0, elapsed: 0, danger: 0, bet: 0, cashMult: 1,
      rival: 0, rivalSpeed: rv.speed, rivalIcon: rv.e, seedLabel: seedStr, rng: mulberry32(hashStr("td|" + seedStr)) };
    st.energy = st.energyMax;
    st.jumping = false; st.jumpCd = 0; st.nextBiome = 9; st.bossHits = 0; st.rvShown = -1; st.darkBase = 0; st.timeMul = 1; st.onlyPool = ""; st.ruleOn = false; st.helmet = hasSkill("helm");
    if (hasSkill("lamp")) st.fuelMul *= 0.85;
    if (hasBuddy("owl") && buddyLevel() >= 2) st.fifty++;
    const sb = (td.mapB || []).findIndex(n => n >= 3); if (sb >= 0) { st.secret = true; st.secretAt = 5 * sb + 3; st.secretBiome = sb; }
    return st;
  }
  async function startDig() {
    hide("td-start"); hide("td-end");
    const potion = (td.supplies && td.supplies.potion) || 0;
    let seedStr = $("td-seed").value.trim(); if (!seedStr) seedStr = String(rand(1000, 9999));
    const rv = rivalPick === "ghost" ? { speed: td.pace || 0.08, name: "Your ghost", e: "👻" } : rivalPick === "class" ? { speed: tops && tops.week[0] ? Math.max(0.05, tops.week[0].depth / 240) : 0.1, name: "Class top", e: "🏆" } : RIVALS[rivalPick];
    S = makeState(seedStr, rv, potion);
    if (ruleOn()) { todayRule().apply(S); S.ruleOn = true; }
    td.supplies = { fifty: 0, skip: 0, potion: 0 }; if (S.secret) { td.mapB[S.secretBiome] -= 3; setTimeout(() => toast(`🗺️ Your ${BIOMES[S.secretBiome].name} map points to a secret vault at ${S.secretAt} m!`), 600); } save();
    $("td-jump-btn").classList.toggle("hidden", !S.pressure);
    resetWorld(); initMotes(); renderWorld(); renderHud(); hideMonster(); applyLook(); setLane(1); fx.innerHTML = "";
    const buff = await chooseBuff(); if (S.ended || !buff || buff.aborted) return; buff.apply(S); toast(`${buff.e} ${buff.n}!`); renderHud();
    setSheet(`<h2>Get ready…</h2><p>${S.pressure ? "🌋 The lava is coming. Tap the mine's left/right to dodge rocks!" : "😌 Chill dig — no timers."}</p>`);
    for (const t of ["3", "2", "1", "DIG!"]) { const b = $("td-bigcount"); b.classList.remove("hidden"); b.innerHTML = `<span>${t}</span>`; sfx.tick(); await delay(settings.motion ? 200 : 600); }
    bigCount(null);
    S.live = true; lastTick = performance.now();
    if (settings.sound) { if (S.pressure) startPulse(); else if (window.AIGSynthBgm) AIGSynthBgm.start(); }
    await runLoop();
  }

  // ---------------- overlays ----------------
  function openHome() {
    { const se = season(), sb = $("td-season"); if (se) { sb.textContent = se.banner; sb.classList.remove("hidden"); } else sb.classList.add("hidden");
      const rb = $("td-rule-btn"), rl = todayRule(), on = ruleOn(); rb.className = "td-rulebtn" + (on ? "" : " off"); rb.innerHTML = `📅 Daily rule: <b>${rl.n}</b> — ${rl.d}<br>${on ? "ON · rewards ×1.5" : "OFF (tap to turn on)"}`; }
    $("td-st-best").textContent = `Best: ${td.bestDepth || 0} m`;
    $("td-st-streak").textContent = `🔥 Day ${td.streak || 1}`;
    $("td-st-relics").textContent = `🏺 ${relicCount()}/${RELICS.length}`;
    $("td-board").textContent = "Loading top diggers…";
    LB.getTreasureDigTops().then(t => {
      tops = t; const medals = ["🥇", "🥈", "🥉"];
      $("td-board").innerHTML = `<b>🏆 Deepest this week</b><br>` + (t.week.length ? t.week.map((x, i) => `${medals[i]} ${esc(pretty(x.id))} — ${x.depth} m`).join("<br>") : "Nobody yet — be the first!") +
        `<br><b>📅 Deepest today</b><br>` + (t.day.length ? t.day.map((x, i) => `${medals[i]} ${esc(pretty(x.id))} — ${x.depth} m`).join("<br>") : "No digs today yet");
      const dr = $("td-dragon"), done = t.classTotal >= DRAGON_GOAL, claimed = td.classClaim === LB.treasureDigWeekKey();
      dr.classList.remove("hidden");
      dr.innerHTML = `🐲 <b>Class vs Lava Dragon</b> — ${Math.min(t.classTotal, DRAGON_GOAL)}/${DRAGON_GOAL} m total this week<div class="td-bar"><i style="width:${Math.min(100, t.classTotal / DRAGON_GOAL * 100)}%;background:#e35252"></i></div>` + (done ? (claimed ? "<br>✅ Reward claimed!" : `<button class="td-btn green" id="td-dragon-claim">🎁 Dragon defeated! Claim reward</button>`) : "<br>Dig together to beat it!");
      const cb = $("td-dragon-claim"); if (cb) cb.onclick = async () => { td.classClaim = LB.treasureDigWeekKey(); await LB.creditWallet({ coins: 25, gems: 1 }); await save(); sfx.chest(); toast("🐲 Class reward: +25 🪙 +1 💎"); openHome(); };
    }).catch(() => { $("td-board").textContent = ""; });
    show("td-start");
  }
  function idleSheet() { setSheet(`<h2>⛏️ Ready to dig?</h2><p>Open the menu to start.</p>`); }

  let workTab = "pick";
  const costTxt = c => c ? (c.coins ? `🪙 ${c.coins}` : `💎 ${c.gems}`) : "";
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
    } else if (workTab === "skills") {
      body.innerHTML = `<p class="td-sub">⭐ Dig Points: <b>${td.dp || 0}</b> (earned from bosses and deep digs)</p>` + SKILLS.map(sk => `<div class="td-skill"><span class="e">${sk.e}</span><span style="flex:1">${sk.n}<small>${sk.d}</small></span>${hasSkill(sk.id) ? `<button class="td-btn green" disabled>Owned</button>` : `<button class="td-btn primary" data-s="${sk.id}">⭐ ${sk.cost}</button>`}</div>`).join("");
      body.querySelectorAll("button[data-s]").forEach(b => b.onclick = async () => { const sk = SKILLS.find(x => x.id === b.dataset.s); if ((td.dp || 0) < sk.cost) { toast("Not enough Dig Points!"); return; } td.dp -= sk.cost; td.skills[sk.id] = true; await save(); sfx.chest(); toast(`${sk.e} ${sk.n} unlocked!`); renderWork(); });
    } else {
      const sections = workTab === "look" ? [["treasuredig-pick", "Pickaxe skin", "pick"], ["treasuredig-helmet", "Helmet", "helmet"]] : [["treasuredig-buddy", "Buddy", "buddy"]];
      body.innerHTML = money + (workTab === "buddy" ? buddyInfoHtml() : "") + sections.map(s => `<div class="bh" style="margin:8px 0 4px">${s[1]}</div><div class="td-grid g3" id="g-${s[0]}"></div>`).join("");
      sections.forEach(([type, , key]) => {
        const list = (cosmetics && cosmetics.costumes[type]) || [], g = $("g-" + type);
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
    const se = season(), list = RELICS.concat(...SEASONS.filter(x => x === se || x.relics.some(r => td.relics[r.id] > 0)).map(x => x.relics)), shelf = td.shelf = td.shelf || [];
    const paint = () => {
      $("td-museum-sub").textContent = `Found ${relicCount()} relics. Tap an owned relic to put it on your shelf (max 6) -- shelf relics give a coin bonus!`;
      $("td-shelfrow").innerHTML = `🪟 <b>Shelf</b> (+${Math.round((shelfMult() - 1) * 100)}% coins): ${shelf.length ? shelf.map(id => (allRelics().find(r => r.id === id) || {}).emoji || "").join(" ") : "empty"}`;
      $("td-museum-grid").innerHTML = list.map(r => { const n = td.relics[r.id] || 0; return `<div class="td-item ${n ? r.rar : ""} ${shelf.includes(r.id) ? "shelf" : ""}" data-id="${r.id}" data-n="${esc(n ? r.name : "???")}"><span class="big">${n ? r.emoji : "❓"}</span>${n > 1 ? `<span class="cnt">×${n}</span>` : ""}</div>`; }).join("");
      $("td-museum-grid").querySelectorAll(".td-item").forEach(el => el.onclick = () => {
        const id = el.dataset.id; if (!(td.relics[id] > 0)) { toast("???"); return; }
        const i = shelf.indexOf(id); if (i >= 0) { shelf.splice(i, 1); toast("Removed from shelf"); } else if (shelf.length >= 6) { toast("Shelf is full (6)"); } else { shelf.push(id); toast(`${el.dataset.n} is on the shelf!`); }
        save(); paint();
      });
      $("td-badge-grid").innerHTML = ACHIEVEMENTS.map(a => `<div class="td-item ${td.achv && td.achv[a.id] ? "" : "locked"}"><span class="big">${a.icon}</span>${esc(a.name)}<small>${esc(a.text)}</small></div>`).join("");
    };
    paint(); show("td-museum");
  }
  function openMissions() {
    const list = td.missions.list;
    $("td-mission-list").innerHTML = list.map((m, i) => {
      const d = MISSION_DEFS.find(x => x.type === m.type), done = m.prog >= m.target;
      const btn = m.claimed ? `<button class="td-btn green" disabled>Done ✔</button>` : done ? `<button class="td-btn primary" data-i="${i}">Claim 🪙${m.reward}</button>` : `<button class="td-btn dark" disabled>${m.prog}/${m.target}</button>`;
      return `<div class="td-row2"><span>${d.text(m.target, m.b)}</span>${btn}</div>`;
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
    { e: "⛏️", t: "Dig deeper!", x: "Pick soft dirt or hard rock, then answer the question before the timer runs out. Right answer = tap fast to smash the block!" },
    { e: "🌋", t: "Run from the lava!", x: "Lava floods down the shaft behind you and your torch keeps burning out. Right answers dig you further away and refuel the torch. Don't stop!" },
    { e: "🪨", t: "Dodge & swat", x: "While you think, rocks fall and bats dive. TAP the left/right side of the mine to move, tap bats to swat them, and swipe UP (or press ⬆) to JUMP rubble, spikes and arrows. Every biome has its own trap!" },
    { e: "⚔️", t: "Bosses & camps", x: "Bosses attack in lanes, so dodge while you answer. At camps time stops: cash out, climb, gamble or keep going. Faint and you lose half the bag!" }
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
  $("td-settings-btn").onclick = () => { show("td-settings"); hold(); };
  document.querySelectorAll(".td-close").forEach(b => b.onclick = () => { const o = b.closest(".td-overlay"); o.classList.add("hidden"); if (o.id === "td-settings") release(); });
  document.querySelectorAll("#td-work-tabs button").forEach(b => b.onclick = () => { workTab = b.dataset.t; renderWork(); });
  document.querySelectorAll("#td-mode button").forEach(b => b.onclick = () => { mode = b.dataset.m; document.querySelectorAll("#td-mode button").forEach(x => x.classList.toggle("on", x === b)); });
  document.querySelectorAll("#td-rival-pick button").forEach(b => b.onclick = () => { rivalPick = b.dataset.r; document.querySelectorAll("#td-rival-pick button").forEach(x => x.classList.toggle("on", x === b)); });
  $("td-daily-seed").onclick = () => { $("td-seed").value = "DAY" + todayStr().replace(/-/g, ""); };
  $("td-set-sound").onclick = () => { settings.sound = !settings.sound; applySettings(); if (!settings.sound) stopPulse(); };
  $("td-set-haptics").onclick = () => { settings.haptics = !settings.haptics; applySettings(); };
  $("td-set-motion").onclick = () => { settings.motion = !settings.motion; applySettings(); };
  $("td-tut-next").onclick = () => { if (tutI < TUT.length - 1) { tutI++; showTut(); } else { hide("td-tutorial"); try { localStorage.setItem("td_seen_tut2", "1"); } catch (e) {} } };
  // dodge: tap the left / right side of the mine, or use the arrow keys
  let sgx = null, sgy = 0;
  scene.addEventListener("pointerdown", e => { if (!S || S.ended || !S.live || e.target.closest(".td-bat2,.td-shard,.td-jumpbtn")) { sgx = null; return; } sgx = e.clientX; sgy = e.clientY; });
  scene.addEventListener("pointerup", e => {
    if (sgx === null || !S || S.ended || !S.live) return;
    const dx = e.clientX - sgx, dy = e.clientY - sgy; sgx = null;
    if (dy < -30 && Math.abs(dy) > Math.abs(dx)) { doJump(); return; }
    const r = scene.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
    if (f < 0.4) setLane(S.lane - 1); else if (f > 0.6) setLane(S.lane + 1);
  });
  $("td-jump-btn").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); doJump(); });
  $("td-rule-btn").onclick = () => { try { localStorage.setItem("td_rule_off", ruleOn() ? "1" : "0"); } catch (e) {} openHome(); };
  document.addEventListener("keydown", e => {
    if (!S || S.ended || !S.live) return;
    if (e.key === "ArrowLeft" || e.key === "a") setLane(S.lane - 1); else if (e.key === "ArrowRight" || e.key === "d") setLane(S.lane + 1); else if (e.key === "ArrowUp" || e.key === "w") doJump();
  });
  document.addEventListener("visibilitychange", () => { lastTick = performance.now(); });
  applySettings();
  lastTick = performance.now(); loopTimer = setInterval(tick, 50);

  // ---------------- boot ----------------
  (async function boot() {
    $("td-start-btn").disabled = true;
    try { td = await LB.getTreasureDig(); } catch (e) { td = null; }
    if (!td) td = { bestDepth: 0, runs: 0, bosses: 0, relics: {}, pick: 0, achv: {}, maps: 0, supplies: { fifty: 0, skip: 0, potion: 0 }, week: { key: "", depth: 0 }, day: { key: "", depth: 0 }, pace: 0, classClaim: "", streak: 0, lastDay: "", missions: { day: "", list: [] }, dailyDay: "" };
    td.relics = td.relics || {}; td.achv = td.achv || {}; td.shelf = td.shelf || []; td.dp = td.dp || 0; td.skills = td.skills || {}; td.buddyXp = td.buddyXp || 0; td.mapB = td.mapB || [0, 0, 0, 0, 0]; td.supplies = Object.assign({ fifty: 0, skip: 0, potion: 0 }, td.supplies || {});
    ensureDaily(); save();
    await refreshCosmetics(); await refreshWallet();
    if (LB.watchWallet) LB.watchWallet(w => { wallet = w; $("td-hud-coins").textContent = w.coins || 0; $("td-hud-gems").textContent = w.gems || 0; });
    S = { depth: 0, energyMax: 3, energy: 3, bag: { coins: 0, gems: 0 }, found: [], streak: 0, ended: true, finalised: true, seen: new Set(), waiters: [], shield: false, pressure: false, lava: -4, fuel: 100, rivalSpeed: 0, rival: 0, hold: 0, live: false, rush: 0, danger: 0 };
    resetWorld(); initMotes(); renderWorld(); renderHud(); idleSheet();
    $("td-start-btn").disabled = false; openHome();
    let seen = false; try { seen = !!localStorage.getItem("td_seen_tut2"); } catch (e) {}
    if (!seen) { tutI = 0; showTut(); }
  })();


}
