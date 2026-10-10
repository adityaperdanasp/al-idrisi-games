/* =================================================================
   Vault Quest -- a Minecraft-style heist runner. The hero auto-runs
   down 3 lanes; every question puts its answers on gates, and you
   answer by RUNNING through the right one (dodging lava/TNT and grabbing
   coins on the way). A zombie chases you: every mistake lets it closer.
   5 worlds x 5 levels (the 5th is a boss), a crew of heroes with
   abilities, upgradeable gadgets, a growing pet, loot chests, daily
   missions + streak chest, and a ghost to race (your best / the class).
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("vq-signedout").classList.remove("hidden");
  document.getElementById("vq-home").classList.add("hidden");
} else {
  initVaultQuest();
}

function initVaultQuest() {
  const $ = id => document.getElementById(id);
  const LB = window.AIGLeaderboard;
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();

  // ---------------- config ----------------
  const LANE_X = [22, 50, 78];
  const HERO_Y = 0.82;
  const SPACING = 0.5;          // y-units between spawned events
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const WORLDS = [
    { id: 1, name: "Dirt Mine", icon: "⛏️", boss: "Zombie King", bossEm: "🧟", color: "#6b4a2a",
      story: "The Great Vault of Blockville was robbed! Follow the tunnels and get the treasure back.",
      lines: ["Torches light the first tunnel.", "Something moans in the dark...", "Spiders have webbed the path!", "The tunnel splits three ways.", "The Zombie King guards the exit!"] },
    { id: 2, name: "Iron Mine", icon: "🔩", boss: "Skeleton Archer", bossEm: "💀", color: "#5a5f66",
      story: "The thieves hid iron keys deep in the mine. Rattling bones echo ahead.",
      lines: ["Minecarts rattle on old rails.", "An arrow whizzes past!", "The floor creaks over a pit.", "Iron golems watch silently.", "The Skeleton Archer takes aim!"] },
    { id: 3, name: "Redstone Cave", icon: "🔴", boss: "Creeper", bossEm: "💥", color: "#8c2f2f",
      story: "Redstone wires hum through the cave. One wrong step... SSSS!",
      lines: ["Red dust glows on the walls.", "Pistons slam open and shut.", "Lava drips from the ceiling.", "You hear a hiss behind you...", "A giant Creeper blocks the way!"] },
    { id: 4, name: "Nether Fortress", icon: "🔥", boss: "Blaze", bossEm: "🔥", color: "#7a2210",
      story: "The thieves fled through a portal into the Nether. Stay cool!",
      lines: ["The portal swirls purple.", "Ghasts wail in the distance.", "Bridges of nether brick.", "The fortress gate opens.", "The Blaze spins up fireballs!"] },
    { id: 5, name: "End City", icon: "🟣", boss: "Ender Dragon", bossEm: "🐉", color: "#3e2a6b",
      story: "The last treasure is in the End. Beat the dragon and Blockville is saved!",
      lines: ["Endermen watch you quietly.", "Floating islands in the void.", "Purple towers glow ahead.", "The dragon roars above.", "The Ender Dragon dives!"] }
  ];
  const GADGETS = [
    { id: "apple", icon: "🍎", name: "Golden Apple", desc: lv => `+${lv >= 4 ? 2 : 1} heart at the start` },
    { id: "shield", icon: "🛡️", name: "Shield", desc: lv => `Blocks ${lv >= 3 ? 2 : 1} mistake${lv >= 3 ? "s" : ""} per level` },
    { id: "magnet", icon: "🧲", name: "Magnet", desc: lv => `Grabs nearby coins, +${lv * 5}% coins` },
    { id: "sword", icon: "⚔️", name: "Diamond Sword", desc: lv => `Smashes ${1 + Math.floor(lv / 2)} obstacle${1 + Math.floor(lv / 2) > 1 ? "s" : ""} per level` },
    { id: "potion", icon: "🧪", name: "Slow Potion", desc: lv => `Slows the run by ${4 + lv * 4}%` },
    { id: "compass", icon: "🧭", name: "Compass", desc: lv => `Points to the right gate every ${Math.max(2, 6 - lv)} questions` },
    { id: "bell", icon: "🔔", name: "Lucky Bell", desc: lv => `+${lv * 8}% coins at the end` }
  ];
  const HEROES = {
    miner: { icon: "⛏️", ability: null, blurb: "Coins x1.25" },
    ninja: { icon: "🥷", ability: "SLOW GATES", blurb: "Slows the run for 4s (2x per level)" },
    knight: { icon: "🛡️", ability: null, blurb: "Survives 1 mistake per level" },
    wizard: { icon: "🧙", ability: "CRUMBLE GATE", blurb: "Removes a wrong gate (2x per level)" },
    hacker: { icon: "💻", ability: "HACK ANSWER", blurb: "Highlights the answer (2x per level)" }
  };
  const PET_STAGES = [{ at: 0, name: "Baby" }, { at: 25, name: "Teen" }, { at: 70, name: "Adult" }, { at: 140, name: "Legend" }];
  const MISSION_DEFS = [
    { type: "levels", text: n => `Clear ${n} level${n > 1 ? "s" : ""}`, target: [1, 2], reward: 12 },
    { type: "coins", text: n => `Collect ${n} coins in runs`, target: [25, 40], reward: 12 },
    { type: "correct", text: n => `Run through ${n} right gates`, target: [10, 16], reward: 14 },
    { type: "stars", text: n => `Earn ${n} stars`, target: [3, 5], reward: 14 },
    { type: "flawless", text: () => "Clear a level without a mistake", target: [1, 1], reward: 18 },
    { type: "boss", text: () => "Defeat a boss", target: [1, 1], reward: 25 }
  ];
  const LEVEL_IDS = [];
  WORLDS.forEach(w => { for (let l = 1; l <= 5; l++) LEVEL_IDS.push(`w${w.id}l${l}`); });

  // ---------------- helpers ----------------
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayStr(d); };
  const levelIdx = id => LEVEL_IDS.indexOf(id);
  const fmtTime = ms => `${(ms / 1000).toFixed(1)}s`;
  const prettyName = id => String(id || "").split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const delay = ms => new Promise(r => setTimeout(r, ms));
  function show(id) { $(id).classList.remove("hidden"); }
  function hide(id) { $(id).classList.add("hidden"); }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "vq-toast px"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2300);
  }
  function tierFor(w, l) { const i = (w - 1) * 5 + l - 1; return i < 8 ? "easy" : i < 18 ? "medium" : "hard"; }

  // ---------------- settings + sound ----------------
  let settings = { sound: true, haptics: true, motion: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem("vq_settings") || "{}")); } catch (e) {}
  function applySettings() {
    document.documentElement.classList.toggle("vq-reduced", !!settings.motion);
    $("vq-set-sound").classList.toggle("on", settings.sound);
    $("vq-set-haptics").classList.toggle("on", settings.haptics);
    $("vq-set-motion").classList.toggle("on", settings.motion);
    try { localStorage.setItem("vq_settings", JSON.stringify(settings)); } catch (e) {}
  }
  let audioCtx = null;
  function beep(freq, dur = 0.1, type = "square", vol = 0.05, when = 0) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      const t0 = audioCtx.currentTime + when;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }
  const sfx = {
    coin: () => { beep(880, 0.07); beep(1320, 0.09, "square", 0.05, 0.06); },
    good: () => { beep(523, 0.1); beep(659, 0.1, "square", 0.05, 0.09); beep(784, 0.16, "square", 0.05, 0.18); },
    bad: () => { beep(200, 0.18, "sawtooth", 0.07); beep(140, 0.25, "sawtooth", 0.07, 0.12); },
    hit: () => beep(110, 0.22, "sawtooth", 0.08),
    block: () => beep(660, 0.08, "triangle"),
    heart: () => { beep(700, 0.1, "triangle"); beep(1000, 0.14, "triangle", 0.05, 0.1); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, "square", 0.05, i * 0.13)),
    lose: () => [400, 320, 240, 160].forEach((f, i) => beep(f, 0.2, "sawtooth", 0.06, i * 0.15)),
    tick: () => beep(440, 0.08, "square", 0.04),
    chest: () => [392, 523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, "triangle", 0.06, i * 0.09))
  };
  const buzz = ms => { if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

  // ---------------- persistent data ----------------
  let vq = null;            // vaultQuest doc
  let wallet = { coins: 0, gems: 0 };
  let cosmetics = null;     // from getCosmetics
  let loadout = { hero: "miner", pet: "wolf" };

  async function save() { try { await LB.saveVaultQuest(vq); } catch (e) { console.warn("save failed", e); } }
  async function refreshCosmetics() {
    try {
      cosmetics = await LB.getCosmetics();
      if (cosmetics) {
        loadout.hero = cosmetics.equippedCostumes["vaultquest-hero"] || "miner";
        loadout.pet = cosmetics.equippedCostumes["vaultquest-pet"] || "wolf";
      }
    } catch (e) { /* keep defaults */ }
  }
  const petStage = () => { let s = 0; PET_STAGES.forEach((st, i) => { if ((vq.petXp || 0) >= st.at) s = i; }); return s; };
  const petIcon = () => { const hit = cosmetics && cosmetics.costumes["vaultquest-pet"].find(p => p.id === loadout.pet); return hit ? hit.preview : "🐺"; };
  const gadgetLv = id => (vq.loot && vq.loot[id]) || 0;
  const starsOf = id => (vq.stars && vq.stars[id]) || 0;
  const isUnlocked = id => { const i = levelIdx(id); return i === 0 || starsOf(LEVEL_IDS[i - 1]) > 0; };

  // ---------------- daily missions + streak ----------------
  function ensureDaily() {
    const today = todayStr();
    if (vq.lastDay !== today) {
      vq.streak = vq.lastDay === yesterdayStr() ? (vq.streak || 0) + 1 : 1;
      vq.lastDay = today;
    }
    if (!vq.missions || vq.missions.day !== today) {
      const rng = mulberry32(hashStr(today + "|" + player.id));
      const idxs = MISSION_DEFS.map((d, i) => i).sort(() => rng() - 0.5).slice(0, 3);
      vq.missions = { day: today, list: idxs.map(i => {
        const d = MISSION_DEFS[i];
        const target = d.target[0] === d.target[1] ? d.target[0] : d.target[Math.floor(rng() * 2)];
        return { type: d.type, target, prog: 0, claimed: false, reward: d.reward };
      }) };
    }
  }
  function bumpMission(type, n = 1) {
    if (!vq.missions || !vq.missions.list) return;
    vq.missions.list.forEach(m => { if (m.type === type && !m.claimed) m.prog = Math.min(m.target, (m.prog || 0) + n); });
  }
  const missionDef = type => MISSION_DEFS.find(d => d.type === type);

  // ---------------- HOME ----------------
  let selWorld = 1;
  function renderHome() {
    $("vq-coins").textContent = wallet.coins || 0;
    $("vq-gems").textContent = wallet.gems || 0;
    let total = 0; LEVEL_IDS.forEach(id => total += starsOf(id));
    $("vq-total-stars").textContent = total;
    const dailyReady = vq.dailyDay !== todayStr();
    $("vq-streak").innerHTML = `🔥 Day streak: ${vq.streak || 1}${dailyReady ? "<br>🎁 Your daily chest is ready!" : ""}`;
    // world tabs
    $("vq-worlds").innerHTML = WORLDS.map(w => {
      const open = isUnlocked(`w${w.id}l1`);
      return `<div class="vq-world-tab ${w.id === selWorld ? "sel" : ""} ${open ? "" : "locked"}" data-w="${w.id}" title="${w.name}">${open ? w.icon : "🔒"}</div>`;
    }).join("");
    $("vq-worlds").querySelectorAll(".vq-world-tab").forEach(el => el.onclick = () => {
      const w = +el.dataset.w;
      if (!isUnlocked(`w${w}l1`)) { toast("Finish the previous world first!"); return; }
      selWorld = w; renderHome();
    });
    const W = WORLDS[selWorld - 1];
    $("vq-world-banner").style.background = W.color;
    $("vq-world-banner").innerHTML = `<div class="px">${W.icon} WORLD ${W.id}: ${W.name.toUpperCase()}</div><small>${W.story}</small>`;
    $("vq-levels").innerHTML = [1, 2, 3, 4, 5].map(l => {
      const id = `w${selWorld}l${l}`, st = starsOf(id), open = isUnlocked(id), boss = l === 5;
      return `<div class="vq-level ${boss ? "boss" : ""} ${st ? "done" : ""} ${open ? "" : "locked"}" data-id="${id}">
        <span class="px">${open ? (boss ? W.bossEm : l) : "🔒"}</span><span class="st">${open ? "★".repeat(st) + "☆".repeat(3 - st) : ""}</span></div>`;
    }).join("");
    $("vq-levels").querySelectorAll(".vq-level").forEach(el => el.onclick = () => {
      if (el.classList.contains("locked")) { toast("Clear the level before it first!"); return; }
      openIntro(el.dataset.id);
    });
  }

  // ---------------- overlays: crew / gadgets / pets / missions / daily ----------------
  async function openCrew() {
    await refreshCosmetics();
    const list = (cosmetics && cosmetics.costumes["vaultquest-hero"]) || [];
    $("vq-crew-grid").innerHTML = list.map(h => {
      const info = HEROES[h.id] || {};
      const sel = loadout.hero === h.id;
      const costTxt = h.cost ? (h.cost.coins ? `🪙 ${h.cost.coins}` : `💎 ${h.cost.gems}`) : "";
      const btn = h.owned ? (sel ? `<button class="vq-btn green" disabled>EQUIPPED</button>` : `<button class="vq-btn dark" data-act="equip" data-id="${h.id}">EQUIP</button>`)
        : `<button class="vq-btn gold" data-act="buy" data-id="${h.id}">BUY ${costTxt}</button>`;
      return `<div class="vq-card ${sel ? "sel" : ""} ${h.owned ? "" : "locked"}"><span class="big">${h.preview}</span>${h.id.toUpperCase()}<small>${info.blurb || ""}</small>${btn}</div>`;
    }).join("");
    $("vq-crew-grid").querySelectorAll("button[data-act]").forEach(b => b.onclick = async () => {
      const h = list.find(x => x.id === b.dataset.id);
      if (b.dataset.act === "buy") {
        const r = await LB.unlockCosmetic("vaultquest-hero", h.id, h.cost);
        if (!r.ok) { toast("Not enough coins yet!"); return; }
        sfx.chest(); toast(`${h.id.toUpperCase()} joined your crew!`);
      }
      await LB.equipCosmetic("vaultquest-hero", h.id);
      await refreshCosmetics(); await refreshWallet(); openCrew();
    });
    show("vq-crew");
  }
  async function openPets() {
    await refreshCosmetics();
    const list = (cosmetics && cosmetics.costumes["vaultquest-pet"]) || [];
    const stage = petStage(), nextAt = PET_STAGES[stage + 1] ? PET_STAGES[stage + 1].at : null, curAt = PET_STAGES[stage].at;
    $("vq-pet-big").textContent = petIcon();
    $("vq-pet-big").style.fontSize = `${3 + stage * 0.6}rem`;
    $("vq-pet-info").innerHTML = `${PET_STAGES[stage].name} pet · XP ${vq.petXp || 0}${nextAt ? ` / ${nextAt}` : " (MAX)"}<br>Bonus: +${stage * 5}% coins${stage >= 2 ? " · blocks 1 obstacle per level" : ""}`;
    $("vq-pet-bar").style.width = nextAt ? `${Math.round(((vq.petXp || 0) - curAt) / (nextAt - curAt) * 100)}%` : "100%";
    $("vq-pet-grid").innerHTML = list.map(p => {
      const sel = loadout.pet === p.id;
      const costTxt = p.cost ? `🪙 ${p.cost.coins}` : "";
      const btn = p.owned ? (sel ? `<button class="vq-btn green" disabled>WITH YOU</button>` : `<button class="vq-btn dark" data-act="equip" data-id="${p.id}">CHOOSE</button>`)
        : `<button class="vq-btn gold" data-act="buy" data-id="${p.id}">ADOPT ${costTxt}</button>`;
      return `<div class="vq-card ${sel ? "sel" : ""} ${p.owned ? "" : "locked"}"><span class="big">${p.preview}</span>${p.id.toUpperCase()}${btn}</div>`;
    }).join("");
    $("vq-pet-grid").querySelectorAll("button[data-act]").forEach(b => b.onclick = async () => {
      const p = list.find(x => x.id === b.dataset.id);
      if (b.dataset.act === "buy") {
        const r = await LB.unlockCosmetic("vaultquest-pet", p.id, p.cost);
        if (!r.ok) { toast("Not enough coins yet!"); return; }
        sfx.chest();
      }
      await LB.equipCosmetic("vaultquest-pet", p.id);
      await refreshCosmetics(); await refreshWallet(); openPets();
    });
    show("vq-pets");
  }
  function openGadgets() {
    $("vq-gadget-grid").innerHTML = GADGETS.map(g => {
      const lv = gadgetLv(g.id), sel = vq.gadget === g.id;
      const btn = lv ? (sel ? `<button class="vq-btn green" data-act="unequip" data-id="${g.id}">EQUIPPED</button>` : `<button class="vq-btn dark" data-act="equip" data-id="${g.id}">EQUIP</button>`)
        : `<button class="vq-btn dark" disabled>FIND IN CHESTS</button>`;
      return `<div class="vq-card ${sel ? "sel" : ""} ${lv ? "" : "locked"}"><span class="big">${g.icon}</span>${g.name}<br>${lv ? "Lv." + lv + "/5" : "???"}<small>${lv ? g.desc(lv) : g.desc(1)}</small>${btn}</div>`;
    }).join("");
    $("vq-gadget-grid").querySelectorAll("button[data-act]").forEach(b => b.onclick = async () => {
      vq.gadget = b.dataset.act === "equip" ? b.dataset.id : "";
      await save(); openGadgets();
    });
    show("vq-gadgets");
  }
  function openMissions() {
    const list = vq.missions.list;
    $("vq-mission-list").innerHTML = list.map((m, i) => {
      const d = missionDef(m.type), done = m.prog >= m.target;
      const btn = m.claimed ? `<button class="vq-btn green" disabled>DONE ✔</button>` : done ? `<button class="vq-btn gold" data-i="${i}">CLAIM 🪙${m.reward}</button>` : `<button class="vq-btn dark" disabled>${m.prog}/${m.target}</button>`;
      return `<div class="vq-row"><span>${d.text(m.target)}</span><span style="width:110px">${btn}</span></div>`;
    }).join("") + `<div class="vq-sub" style="margin-top:10px">Claim all 3 to win a 💎 gem!</div>`;
    $("vq-mission-list").querySelectorAll("button[data-i]").forEach(b => b.onclick = async () => {
      const m = list[+b.dataset.i];
      if (m.claimed || m.prog < m.target) return;
      m.claimed = true;
      const all = list.every(x => x.claimed);
      await LB.creditWallet({ coins: m.reward, gems: all ? 1 : 0 });
      await save(); await refreshWallet(); sfx.good();
      toast(all ? `+${m.reward} coins and a 💎 gem!` : `+${m.reward} coins!`);
      openMissions(); renderHome();
    });
    show("vq-missions");
  }
  async function claimDaily() {
    if (vq.dailyDay === todayStr()) { toast("Come back tomorrow for another chest!"); return; }
    vq.dailyDay = todayStr();
    const coins = 10 + Math.min(vq.streak || 1, 7) * 3, gems = (vq.streak || 1) % 3 === 0 ? 1 : 0;
    await LB.creditWallet({ coins, gems });
    await save(); await refreshWallet(); renderHome();
    openChest("daily", { coins, gems, fixed: true });
  }
  async function refreshWallet() { try { wallet = await LB.getWallet(); } catch (e) {} renderHome(); }

  // ---------------- chest ----------------
  let chestCb = null;
  function openChest(kind, fixed, cb) {
    chestCb = cb || null;
    $("vq-chest-title").textContent = kind === "daily" ? "DAILY CHEST!" : `${kind.toUpperCase()} CHEST!`;
    $("vq-chest-em").textContent = kind === "diamond" ? "💎" : kind === "iron" ? "🧰" : kind === "daily" ? "🎁" : "📦";
    $("vq-chest-em").classList.remove("shake");
    $("vq-chest-loot").innerHTML = "";
    show("vq-chest-open"); hide("vq-chest-done"); show("vq-chest");
    $("vq-chest-open").onclick = async () => {
      hide("vq-chest-open"); sfx.chest();
      $("vq-chest-em").classList.add("shake");
      await delay(settings.motion ? 100 : 900);
      const loot = fixed && fixed.fixed ? { coins: fixed.coins, gems: fixed.gems, gadget: null, petXp: 0 } : await rollLoot(kind);
      $("vq-chest-em").textContent = "✨";
      const chips = [];
      if (loot.coins) chips.push(`🪙 ${loot.coins}`);
      if (loot.gems) chips.push(`💎 ${loot.gems}`);
      if (loot.gadget) chips.push(`${GADGETS.find(g => g.id === loot.gadget).icon} ${loot.gadgetNew ? "NEW!" : "Lv." + gadgetLv(loot.gadget)}`);
      if (loot.petXp) chips.push(`🐾 +${loot.petXp} XP`);
      $("vq-chest-loot").innerHTML = chips.map(c => `<span>${c}</span>`).join("");
      sfx.good();
      show("vq-chest-done");
    };
    $("vq-chest-done").onclick = () => { hide("vq-chest"); if (chestCb) chestCb(); renderHome(); };
  }
  async function rollLoot(kind) {
    const T = { wood: { c: [8, 15], gad: 0.15, gem: 0, xp: 0 }, iron: { c: [15, 30], gad: 0.4, gem: 0.2, xp: 4 }, diamond: { c: [30, 60], gad: 0.8, gem: 1, xp: 10 } }[kind] || { c: [8, 15], gad: 0.15, gem: 0, xp: 0 };
    const loot = { coins: rand(T.c[0], T.c[1]), gems: Math.random() < T.gem ? (kind === "diamond" ? rand(1, 2) : 1) : 0, gadget: null, gadgetNew: false, petXp: T.xp };
    if (Math.random() < T.gad) {
      const upgradable = GADGETS.filter(g => gadgetLv(g.id) < 5);
      if (upgradable.length) {
        const pool = upgradable.flatMap(g => gadgetLv(g.id) === 0 ? [g, g, g] : [g]);   // new gadgets are likelier
        const g = pool[rand(0, pool.length - 1)];
        loot.gadgetNew = gadgetLv(g.id) === 0;
        vq.loot[g.id] = gadgetLv(g.id) + 1;
        loot.gadget = g.id;
        if (!vq.gadget) vq.gadget = g.id;
      } else loot.coins += 20;
    }
    vq.petXp = (vq.petXp || 0) + loot.petXp;
    await LB.creditWallet({ coins: loot.coins, gems: loot.gems });
    await save(); await refreshWallet();
    return loot;
  }

  // ---------------- level intro ----------------
  let pendingLevel = null;
  function openIntro(id) {
    pendingLevel = id;
    const m = id.match(/^w(\d)l(\d)$/), w = +m[1], l = +m[2], W = WORLDS[w - 1];
    $("vq-intro-title").innerHTML = `${W.icon} ${W.name}<br>LEVEL ${l}${l === 5 ? " — BOSS: " + W.boss.toUpperCase() : ""}`;
    const best = vq.best && vq.best[id];
    $("vq-intro-story").innerHTML = `${W.lines[l - 1]}${l === 5 ? `<br>${W.bossEm} Answer right to hurt the boss!` : ""}`;
    const g = vq.gadget ? GADGETS.find(x => x.id === vq.gadget) : null;
    $("vq-intro-loadout").innerHTML = `${HEROES[loadout.hero].icon} ${loadout.hero.toUpperCase()} · ${petIcon()} · ${g ? g.icon + " Lv." + gadgetLv(g.id) : "no gadget"}<br>` +
      `<span id="vq-intro-ghost">${best ? "👻 Your best: " + fmtTime(best) : "No record yet — set one!"}</span>`;
    show("vq-intro");
    LB.getVaultQuestClassBest(id).then(cb => {
      const el = $("vq-intro-ghost");
      if (cb && el && pendingLevel === id) el.innerHTML += `<br>🏆 Class record: ${fmtTime(cb.ms)} (${prettyName(cb.id)})`;
    }).catch(() => {});
  }

  // ---------------- question building ----------------
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
    let bump = 1; while (options.size < 4) options.add(correctNum + bump++);
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix), correctLabel: correctNum.toLocaleString("en-US") + suffix };
  }
  function rollMath(tier) { const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)]; return { key, ...buildMc(MATHVILLE_GENERATORS[key](tier)) }; }
  function rollQuestion(tier) {
    const P = window.AIGQuestionPools;
    let q;
    if (P && P.rollMixed) q = P.rollMixed(() => rollMath(tier)); else q = { subject: "math", ...rollMath(tier) };
    return q;
  }
  // -> { prompt, labels: [3 or 2 strings], correct: index, kind: "mc"|"tf", key }
  function makeQuestion(tier, allowTF) {
    const q = makeQuestionRaw(tier, allowTF);
    q.lettered = q.kind !== "tf" && q.labels.some(l => String(l).length > 10);
    return q;
  }
  function makeQuestionRaw(tier, allowTF) {
    const q = rollQuestion(tier);
    const opts = [...new Set(q.options.map(String))];
    const correct = String(q.correctLabel);
    if (!opts.includes(correct)) opts.push(correct);
    const key = q.key || (q.subject === "math" ? "math" : q.subject) || "math";
    if (allowTF && Math.random() < 0.22) {
      const truth = Math.random() < 0.5;
      const wrong = opts.filter(o => o !== correct);
      const shown = truth || !wrong.length ? correct : wrong[rand(0, wrong.length - 1)];
      return { prompt: `${q.prompt}  →  ${shown} ?`, labels: ["✔", "✘"], correct: shown === correct ? 0 : 1, kind: "tf", key };
    }
    const wrongs = shuffle(opts.filter(o => o !== correct)).slice(0, 2);
    if (wrongs.length < 2) { const l2 = shuffle([correct, wrongs[0] || "—"]); return { prompt: q.prompt, labels: l2, correct: l2.indexOf(correct), kind: "mc2", key }; }
    const labels = shuffle([correct, ...wrongs]);
    return { prompt: q.prompt, labels, correct: labels.indexOf(correct), kind: "mc", key };
  }

  // ---------------- GAME STATE ----------------
  let G = null;           // current run
  let rafId = 0;
  const ents = $("vq-ents");

  function laneLeft(lane, y) { return 50 + (LANE_X[lane] - 50) * (0.35 + 0.65 * y); }
  function yTop(y) { return (0.04 + 0.96 * y) * 100; }
  function scaleAt(y) { return 0.4 + 0.75 * y; }

  async function startLevel(id) {
    hide("vq-intro"); hide("vq-win"); hide("vq-fail");
    const m = id.match(/^w(\d)l(\d)$/), w = +m[1], l = +m[2], W = WORLDS[w - 1];
    try { await Promise.race([window.AIGQuestionPools ? window.AIGQuestionPools.ensurePools() : Promise.resolve(), delay(1200)]); } catch (e) {}
    const idx = levelIdx(id), boss = l === 5, nQ = boss ? 8 : (l <= 2 ? 6 : 7), tier = tierFor(w, l);
    const questions = []; const seen = new Set(); let guard = 0;
    while (questions.length < nQ && guard++ < 60) {
      const q = makeQuestion(tier, w >= 2);
      if (seen.has(q.prompt)) continue;
      seen.add(q.prompt); questions.push(q);
    }
    // gadget & hero effects
    const gid = vq.gadget, glv = gid ? gadgetLv(gid) : 0, hero = loadout.hero, stage = petStage();
    const maxHearts = 3 + (gid === "apple" ? (glv >= 4 ? 2 : 1) : 0);
    // plan of events
    const plan = [];
    for (let i = 0; i < nQ; i++) {
      plan.push({ kind: "coin" });
      if (i > 0 || boss) plan.push({ kind: "obst", fire: boss });
      plan.push({ kind: "coin" });
      plan.push({ kind: "gate", q: i });
    }
    G = {
      id, w, l, idx, boss, nQ, tier, W, questions, plan, planPos: 0, dist: 0, rows: [],
      qi: 0, elapsed: 0, coins: 0, hearts: maxHearts, maxHearts, mistakes: 0, correct: 0, streak: 0,
      lane: 1, hero, running: true, paused: false, ending: false, endAt: 0, finished: false,
      shields: (hero === "knight" ? 1 : 0) + (gid === "shield" ? (glv >= 3 ? 2 : 1) : 0),
      swordCharges: gid === "sword" ? 1 + Math.floor(glv / 2) : 0,
      petBlock: stage >= 2 ? 1 : 0,
      abilityCharges: HEROES[hero].ability ? 2 : 0, slowUntil: 0, hackNext: false, wizNext: false,
      baseSpeed: 0.17 + 0.005 * idx, potion: gid === "potion" ? 1 - (0.04 + glv * 0.04) : 1,
      magnet: gid === "magnet", compassEvery: gid === "compass" ? Math.max(2, 6 - glv) : 0,
      bossHp: boss ? 6 : 0, bossMax: 6, bestMs: vq.best && vq.best[id] || 0, lastT: 0, leveled: false
    };
    // screen setup
    hide("vq-home"); show("vq-game");
    $("vq-field").className = `vq-field w${w}`;
    ents.innerHTML = ""; $("vq-hero-mc").dataset.skin = hero; $("vq-hero-mc").classList.add("run");
    $("vq-pet").textContent = petIcon(); $("vq-pet").style.fontSize = `${1.1 + stage * 0.28}rem`;
    $("vq-boss").classList.toggle("hidden", !boss); if (boss) { $("vq-boss-em").textContent = W.bossEm; $("vq-boss-fill").style.width = "100%"; }
    $("vq-ghost").classList.toggle("hidden", !G.bestMs);
    $("vq-floor").style.setProperty("--spd", String(G.baseSpeed / 0.2));
    const ab = $("vq-ability");
    if (HEROES[hero].ability) { ab.classList.remove("hidden"); } else ab.classList.add("hidden");
    renderAbility(); renderHud(); placeHero(true); updateSign();
    $("vq-prog-fill").style.width = "0%";
    G.paused = true;
    await countdown();
    G.paused = false; G.lastT = 0;
    cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop);
  }
  async function countdown() {
    const c = $("vq-countdown"); c.classList.remove("hidden");
    for (const t of ["3", "2", "1", "GO!"]) { c.innerHTML = `<span>${t}</span>`; sfx.tick(); await delay(settings.motion ? 300 : 650); }
    c.classList.add("hidden");
  }
  function placeHero(instant) {
    const hero = $("vq-hero"), pet = $("vq-pet");
    const left = laneLeft(G.lane, HERO_Y), top = yTop(HERO_Y);
    if (instant) { hero.style.transition = "none"; pet.style.transition = "none"; }
    hero.style.left = left + "%"; hero.style.top = top + "%";
    pet.style.left = (left + (G.lane === 2 ? -11 : 11)) + "%"; pet.style.top = (top + 1) + "%";
    const z = $("vq-zombie"), lost = G.maxHearts - G.hearts, zy = 1.14 - 0.28 * (lost / G.maxHearts);
    z.style.left = left + "%"; z.style.top = yTop(zy) + "%";
    if (instant) { void hero.offsetWidth; hero.style.transition = ""; pet.style.transition = ""; }
  }
  function renderHud() {
    let h = ""; for (let i = 0; i < G.maxHearts; i++) h += i < G.hearts ? "❤️" : "🖤";
    if (G.shields > 0) h += ` 🛡️${G.shields}`;
    $("vq-hearts").textContent = h;
    $("vq-run-coins").textContent = G.coins;
    $("vq-combo").textContent = `x${G.streak}`;
    if (G.boss) $("vq-boss-fill").style.width = `${Math.max(0, G.bossHp / G.bossMax * 100)}%`;
  }
  function renderAbility() {
    const info = HEROES[G.hero]; if (!info.ability) return;
    const ab = $("vq-ability");
    ab.textContent = `${info.icon} ${info.ability} ×${G.abilityCharges}`;
    ab.disabled = G.abilityCharges <= 0;
  }
  function updateSign() {
    const q = G.questions[Math.min(G.qi, G.questions.length - 1)];
    const sign = $("vq-sign");
    const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    if (q && q.lettered) {
      sign.innerHTML = `<div>${esc(q.prompt)}<br>` + q.labels.map((l, i) => `<span style="color:#fcdb05">${"ABC"[i]})</span> ${esc(l)}`).join("&nbsp;&nbsp; ") + `</div>`;
      sign.style.fontSize = ".46rem";
    } else {
      sign.textContent = q ? q.prompt : "";
      sign.style.fontSize = q && q.prompt.length > 60 ? ".5rem" : q && q.prompt.length > 34 ? ".56rem" : ".62rem";
    }
  }
  function popup(text, lane, y, color) {
    const p = document.createElement("div"); p.className = "vq-popup"; p.textContent = text;
    p.style.left = laneLeft(lane, y) + "%"; p.style.top = (yTop(y) - 14) + "%"; if (color) p.style.color = color;
    $("vq-field").appendChild(p); setTimeout(() => p.remove(), 1000);
  }
  function setLane(l) {
    if (!G || !G.running || G.paused || G.finished) return;
    l = Math.max(0, Math.min(2, l)); if (l === G.lane) return;
    G.lane = l; placeHero(false); beep(300 + l * 80, 0.04, "square", 0.025);
  }

  // ---------------- spawning ----------------
  function spawnEvent(ev) {
    const row = { kind: ev.kind, y: 0, resolved: false, items: [] };
    if (ev.kind === "coin") {
      const n = Math.random() < 0.25 ? 3 : Math.random() < 0.5 ? 2 : 1;
      const lanes = shuffle([0, 1, 2]).slice(0, n);
      lanes.forEach(ln => {
        const gem = Math.random() < 0.12;
        const el = document.createElement("div"); el.className = "vq-ent"; el.innerHTML = `<div class="vq-coin ${gem ? "gem" : ""}"></div>`;
        row.items.push({ lane: ln, val: gem ? 3 : 1, el, inner: el.firstChild });
      });
    } else if (ev.kind === "obst") {
      const n = G.w >= 2 && Math.random() < 0.35 ? 2 : 1;
      const lanes = shuffle([0, 1, 2]).slice(0, n);
      lanes.forEach(ln => {
        const type = ev.fire ? "fire" : ["lava", "tnt", "wall"][rand(0, 2)];
        const el = document.createElement("div"); el.className = "vq-ent";
        el.innerHTML = `<div class="vq-block ${type}">${type === "lava" ? "🔥" : type === "tnt" ? "TNT" : type === "wall" ? "🧱" : ""}</div>`;
        row.items.push({ lane: ln, el, inner: el.firstChild });
      });
    } else if (ev.kind === "gate") {
      const q = G.questions[ev.q]; row.q = ev.q; row.question = q;
      const lanes = q.labels.length === 3 ? [0, 1, 2] : [0, 2];
      q.labels.forEach((label, i) => {
        const el = document.createElement("div"); el.className = "vq-ent";
        const shown = q.lettered ? "ABC"[i] : label;
        const long = !q.lettered && String(label).length > 6;
        el.innerHTML = `<div class="vq-gate ${q.kind === "tf" ? "tf" : ""}" style="${q.lettered ? "font-size:1rem;width:64px;" : long ? "font-size:.44rem;width:90px;" : ""}">${shown}</div>`;
        row.items.push({ lane: lanes[i], el, inner: el.firstChild, answer: i, gone: false });
      });
      if (lanes.length === 2) { // blocked middle lane
        const el = document.createElement("div"); el.className = "vq-ent";
        el.innerHTML = `<div class="vq-block wall">🧱</div>`;
        row.items.push({ lane: 1, el, inner: el.firstChild, answer: -1 });
      }
      // hints
      const hint = () => { const it = row.items.find(x => x.answer === q.correct); if (it) it.inner.classList.add("hint"); };
      if (G.hackNext) { G.hackNext = false; hint(); }
      if (G.compassEvery && (ev.q + 1) % G.compassEvery === 0) hint();
      if (G.wizNext) { G.wizNext = false; crumble(row); }
    }
    row.items.forEach(it => { ents.appendChild(it.el); });
    G.rows.push(row);
  }
  function crumble(row) {
    const wrong = row.items.filter(x => x.answer >= 0 && x.answer !== row.question.correct && !x.gone);
    if (!wrong.length) return;
    const it = wrong[rand(0, wrong.length - 1)]; it.gone = true; it.inner.classList.add("gone");
  }

  // ---------------- loop ----------------
  function loop(now) {
    if (!G || G.finished) return;
    now = now || performance.now();
    if (!G.lastT) G.lastT = now;
    let dt = (now - G.lastT) / 1000; G.lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (!G.paused) step(dt);
    if (G && !G.finished) rafId = requestAnimationFrame(loop);
  }
  function step(dt) {
    G.elapsed += dt;
    let speed = G.baseSpeed * G.potion * (1 + 0.03 * G.qi);
    if (G.elapsed < G.slowUntil) speed *= 0.55;
    const dy = speed * dt;
    G.dist += dy;
    // spawn
    while (!G.ending && G.planPos < G.plan.length && G.dist >= G.planPos * SPACING) {
      const over = G.dist - G.planPos * SPACING;
      spawnEvent(G.plan[G.planPos]); G.rows[G.rows.length - 1].y = over; G.planPos++;
    }
    // move + resolve
    for (let i = G.rows.length - 1; i >= 0; i--) {
      const row = G.rows[i], prev = row.y; row.y += dy;
      if (!row.resolved && prev < HERO_Y && row.y >= HERO_Y) { row.resolved = true; resolveRow(row); }
      row.items.forEach(it => {
        const y = row.y;
        it.el.style.left = laneLeft(it.lane, y) + "%";
        it.el.style.top = yTop(y) + "%";
        it.el.style.transform = `translate(-50%,-100%) scale(${scaleAt(y).toFixed(3)})`;
        it.el.style.zIndex = String(Math.round(y * 100));
        it.el.style.opacity = y < 0.04 ? "0" : "";
      });
      if (row.y > 1.25) { row.items.forEach(it => it.el.remove()); G.rows.splice(i, 1); }
    }
    if (!G || G.finished) return;
    $("vq-prog-fill").style.width = `${Math.min(100, (G.qi / G.nQ) * 100)}%`;
    if (G.bestMs) { const gp = Math.min(1, (G.elapsed * 1000) / G.bestMs); $("vq-ghost").style.left = `${gp * 100}%`; }
    // end
    if (!G.ending && (G.qi >= G.nQ || (G.boss && G.bossHp <= 0))) {
      G.ending = true; G.endAt = G.elapsed + 0.9;
      if (G.boss && G.bossHp <= 0) { $("vq-boss-em").textContent = "💥"; }
    }
    if (G.ending && G.elapsed >= G.endAt) finishRun();
  }

  // ---------------- resolution ----------------
  function takeHit(isObstacle, lane) {
    if (isObstacle && G.petBlock > 0) { G.petBlock--; popup(`${petIcon()} SAVE!`, lane, HERO_Y, "#7ef0a3"); sfx.block(); return; }
    if (isObstacle && G.swordCharges > 0) { G.swordCharges--; popup("⚔️ SMASH!", lane, HERO_Y, "#7ef0a3"); sfx.block(); return; }
    if (G.shields > 0) { G.shields--; popup("🛡️ BLOCK!", lane, HERO_Y, "#7ef0a3"); sfx.block(); renderHud(); return; }
    G.hearts--; G.mistakes++; G.streak = 0;
    sfx.hit(); buzz(120);
    const hero = $("vq-hero"); hero.classList.remove("hit"); void hero.offsetWidth; hero.classList.add("hit");
    const f = $("vq-flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    const field = $("vq-field"); field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake");
    popup("-1 ❤️", lane, HERO_Y, "#ff6b6b");
    renderHud(); placeHero(false);
    if (G.hearts <= 0) failRun();
  }
  function resolveRow(row) {
    if (row.kind === "coin") {
      row.items.forEach(it => {
        const near = Math.abs(it.lane - G.lane) <= (G.magnet ? 1 : 0);
        if (near) { G.coins += it.val; it.inner.classList.add("gone"); popup(`+${it.val}`, it.lane, HERO_Y); sfx.coin(); }
      });
      renderHud();
    } else if (row.kind === "obst") {
      const hit = row.items.find(it => it.lane === G.lane);
      if (hit) { hit.inner.classList.add("gone"); takeHit(true, G.lane); }
    } else if (row.kind === "gate") {
      const q = row.question, mine = row.items.find(it => it.lane === G.lane);
      const ok = mine && mine.answer === q.correct && !mine.gone;
      const right = row.items.find(it => it.answer === q.correct);
      if (right) right.inner.classList.add("good");
      try { LB.recordTopicAttempt("vaultquest", q.key || "math", !!ok); } catch (e) {}
      if (ok) {
        G.correct++; G.streak++; G.qi++;
        bumpMission("correct");
        sfx.good(); buzz(30); popup(G.streak > 1 ? `✔ x${G.streak}` : "✔", G.lane, HERO_Y, "#7ef0a3");
        const hero = $("vq-hero"); hero.classList.remove("cheer"); void hero.offsetWidth; hero.classList.add("cheer");
        if (G.boss) {
          G.bossHp = Math.max(0, G.bossHp - 1);
          const b = $("vq-boss"); b.classList.remove("hurt"); void b.offsetWidth; b.classList.add("hurt");
        }
        if (G.streak > 0 && G.streak % 3 === 0 && G.hearts < G.maxHearts) { G.hearts++; sfx.heart(); popup("+1 ❤️", G.lane, HERO_Y - 0.12, "#ff9ec4"); placeHero(false); }
        renderHud();
      } else {
        if (mine && mine.answer !== q.correct && mine.answer >= 0) mine.inner.classList.add("bad");
        G.qi++;
        popup("✘", G.lane, HERO_Y, "#ff6b6b");
        takeHit(false, G.lane);
      }
      if (!G || G.finished) return;
      updateSign();
    }
  }

  // ---------------- abilities ----------------
  function useAbility() {
    if (!G || G.paused || G.finished || G.abilityCharges <= 0) return;
    const h = G.hero;
    const next = G.rows.find(r => r.kind === "gate" && !r.resolved && r.y > 0);
    if (h === "ninja") { G.slowUntil = G.elapsed + 4; popup("🥷 SLOW", G.lane, HERO_Y - 0.1, "#7ec8ff"); }
    else if (h === "wizard") { if (next) crumble(next); else G.wizNext = true; popup("🧙 POOF", G.lane, HERO_Y - 0.1, "#c9a0ff"); }
    else if (h === "hacker") {
      if (next) { const it = next.items.find(x => x.answer === next.question.correct); if (it) it.inner.classList.add("hint"); } else G.hackNext = true;
      popup("💻 HACK", G.lane, HERO_Y - 0.1, "#7ef0a3");
    } else return;
    G.abilityCharges--; sfx.block(); renderAbility();
  }

  // ---------------- end of run ----------------
  function stopLoop() { cancelAnimationFrame(rafId); }
  function failRun() {
    if (G.finished) return; G.finished = true; stopLoop(); sfx.lose();
    G.running = false; $("vq-hero-mc").classList.remove("run");
    bumpMission("coins", G.coins); save();
    setTimeout(() => { $("vq-fail-sub").innerHTML = `You reached question ${Math.min(G.qi + 1, G.nQ)} of ${G.nQ}.<br>Coins grabbed: ${G.coins}<br>Tip: slow down and read the sign!`; show("vq-fail"); }, 700);
  }
  async function finishRun() {
    if (G.finished) return;
    if (G.boss && G.bossHp > 0) { // boss survived
      G.finished = true; stopLoop(); sfx.lose();
      bumpMission("coins", G.coins); save();
      $("vq-fail-sub").innerHTML = `${G.W.boss} survived with ${G.bossHp} HP left!<br>You need ${G.bossMax} right gates to win.<br>Try again!`;
      show("vq-fail"); return;
    }
    G.finished = true; stopLoop(); sfx.win();
    $("vq-hero-mc").classList.remove("run");
    const stars = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
    const ms = Math.round(G.elapsed * 1000);
    const prevBest = vq.best[G.id] || 0, newRecord = !prevBest || ms < prevBest;
    const firstClear = starsOf(G.id) === 0;
    vq.stars[G.id] = Math.max(starsOf(G.id), stars);
    if (newRecord) vq.best[G.id] = ms;
    const stage = petStage(), glv = vq.gadget ? gadgetLv(vq.gadget) : 0;
    let mult = (G.hero === "miner" ? 1.25 : 1) * (1 + 0.05 * stage);
    if (vq.gadget === "magnet") mult *= 1 + 0.05 * glv;
    if (vq.gadget === "bell") mult *= 1 + 0.08 * glv;
    const base = G.coins + 5 + stars * 3 + (G.boss ? 10 : 0);
    const total = Math.round(base * mult);
    const xp = 4 + stars * 3 + (G.boss ? 6 : 0);
    vq.petXp = (vq.petXp || 0) + xp;
    const hadStage = stage, nowStage = petStage();
    bumpMission("levels"); bumpMission("coins", G.coins); bumpMission("stars", stars);
    if (G.mistakes === 0) bumpMission("flawless");
    if (G.boss) bumpMission("boss");
    try { await LB.creditWallet({ coins: total, gems: G.boss && firstClear ? 2 : 0 }); } catch (e) {}
    await save(); await refreshWallet();
    // overlay
    $("vq-win-title").textContent = G.boss ? `${G.W.boss.toUpperCase()} DEFEATED!` : "LEVEL CLEAR!";
    $("vq-win-stars").innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? "on" : ""}" style="animation-delay:${i * 0.18}s">⭐</span>`).join("");
    $("vq-win-rows").innerHTML = [
      ["⏱ Time", `${fmtTime(ms)}${newRecord ? " 🏆 NEW RECORD!" : ""}`],
      ["🪙 Coins on the run", G.coins],
      ["🎁 Level bonus", `+${5 + stars * 3 + (G.boss ? 10 : 0)}`],
      ["✨ Crew/pet bonus", `x${mult.toFixed(2)}`],
      ["💰 Total earned", `🪙 ${total}${G.boss && firstClear ? " + 💎 2" : ""}`],
      ["🐾 Pet XP", `+${xp}${nowStage > hadStage ? " — EVOLVED!" : ""}`]
    ].map(r => `<div><span>${r[0]}</span><span>${r[1]}</span></div>`).join("");
    $("vq-win-class").textContent = "";
    LB.getVaultQuestClassBest(G.id).then(cb => {
      if (!cb) return;
      $("vq-win-class").textContent = ms <= cb.ms ? "🏆 You hold the class record!" : `Class record: ${fmtTime(cb.ms)} by ${prettyName(cb.id)}`;
    }).catch(() => {});
    show("vq-win-chest"); hide("vq-win-next"); hide("vq-win-home");
    $("vq-win-chest").textContent = `🧰 OPEN ${stars === 3 ? "DIAMOND" : stars === 2 ? "IRON" : "WOODEN"} CHEST`;
    const nextId = LEVEL_IDS[G.idx + 1];
    G.nextId = nextId; G.stars = stars;
    show("vq-win");
  }

  // ---------------- screen flow ----------------
  function leaveGame() {
    stopLoop(); if (G) { G.finished = true; G.running = false; }
    hide("vq-game"); hide("vq-pause"); show("vq-home");
    ents.innerHTML = ""; renderHome();
  }
  function setPaused(p) {
    if (!G || G.finished) return;
    G.paused = p; if (!p) { G.lastT = 0; }
    p ? show("vq-pause") : hide("vq-pause");
  }

  // ---------------- wiring ----------------
  $("vq-intro-go").onclick = () => startLevel(pendingLevel);
  $("vq-intro-back").onclick = () => hide("vq-intro");
  $("vq-fail-retry").onclick = () => startLevel(G.id);
  $("vq-fail-home").onclick = () => { hide("vq-fail"); leaveGame(); };
  $("vq-win-chest").onclick = () => {
    hide("vq-win-chest");
    const kind = G.stars === 3 ? "diamond" : G.stars === 2 ? "iron" : "wood";
    hide("vq-win");
    openChest(kind, null, () => {
      show("vq-win"); show("vq-win-home");
      if (G.nextId) show("vq-win-next");
    });
  };
  $("vq-win-next").onclick = () => { hide("vq-win"); leaveGame(); const n = G.nextId; selWorld = +n.match(/^w(\d)/)[1]; renderHome(); openIntro(n); };
  $("vq-win-home").onclick = () => { hide("vq-win"); const n = G.nextId; if (n) { selWorld = +n.match(/^w(\d)/)[1]; } leaveGame(); };
  $("vq-pause-btn").onclick = () => setPaused(true);
  $("vq-resume").onclick = () => setPaused(false);
  $("vq-quit").onclick = () => { hide("vq-pause"); leaveGame(); };
  $("vq-ability").onclick = useAbility;
  $("vq-left").addEventListener("pointerdown", e => { e.preventDefault(); setLane(G ? G.lane - 1 : 1); });
  $("vq-right").addEventListener("pointerdown", e => { e.preventDefault(); setLane(G ? G.lane + 1 : 1); });
  document.addEventListener("keydown", e => {
    if (!G || G.finished || $("vq-game").classList.contains("hidden")) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { setLane(G.lane - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { setLane(G.lane + 1); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter") { useAbility(); e.preventDefault(); }
    else if (e.key === "Escape" || e.key === "p") setPaused(!G.paused);
  });
  let touchX = null;
  const field = $("vq-field");
  field.addEventListener("pointerdown", e => { touchX = e.clientX; });
  field.addEventListener("pointerup", e => {
    if (touchX === null || !G) return;
    const dx = e.clientX - touchX; touchX = null;
    if (Math.abs(dx) > 28) setLane(G.lane + (dx > 0 ? 1 : -1));
    else { const r = field.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width; if (fx < 0.4) setLane(G.lane - 1); else if (fx > 0.6) setLane(G.lane + 1); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && !G.finished && !G.paused && !$("vq-game").classList.contains("hidden")) setPaused(true); });

  $("vq-crew-btn").onclick = openCrew;
  $("vq-gadget-btn").onclick = openGadgets;
  $("vq-pet-btn").onclick = openPets;
  $("vq-mission-btn").onclick = openMissions;
  $("vq-daily-btn").onclick = claimDaily;
  $("vq-settings-btn").onclick = () => show("vq-settings");
  document.querySelectorAll(".vq-close").forEach(b => b.onclick = () => b.closest(".vq-overlay").classList.add("hidden"));
  $("vq-set-sound").onclick = () => { settings.sound = !settings.sound; applySettings(); };
  $("vq-set-haptics").onclick = () => { settings.haptics = !settings.haptics; applySettings(); };
  $("vq-set-motion").onclick = () => { settings.motion = !settings.motion; applySettings(); };
  $("vq-tutorial-close").onclick = () => { hide("vq-tutorial"); try { localStorage.setItem("vq_seen_tutorial", "1"); } catch (e) {} };
  applySettings();

  // ---------------- boot ----------------
  (async function boot() {
    try { vq = await LB.getVaultQuest(); } catch (e) { vq = null; }
    if (!vq) vq = { stars: {}, best: {}, loot: {}, gadget: "", petXp: 0, streak: 0, lastDay: "", missions: { day: "", list: [] }, chests: 0 };
    vq.stars = vq.stars || {}; vq.best = vq.best || {}; vq.loot = vq.loot || {};
    ensureDaily(); await save();
    await refreshCosmetics();
    try { wallet = await LB.getWallet(); } catch (e) {}
    if (LB.watchWallet) LB.watchWallet(w => { wallet = w; $("vq-coins").textContent = w.coins || 0; $("vq-gems").textContent = w.gems || 0; });
    // start on the furthest unlocked world
    for (let w = 5; w >= 1; w--) if (isUnlocked(`w${w}l1`)) { selWorld = w; break; }
    renderHome();
    let seen = false; try { seen = !!localStorage.getItem("vq_seen_tutorial"); } catch (e) {}
    if (!seen) show("vq-tutorial");
  })();

}
