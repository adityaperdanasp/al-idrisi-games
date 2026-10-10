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
    document.querySelectorAll("#vq-mode-seg button").forEach(b => b.classList.toggle("on", (b.dataset.t === "1") === tenseMode));
    document.querySelectorAll("#vq-rival-seg button").forEach(b => b.classList.toggle("on", b.dataset.r === rivalPick));
    if (id === "endless") {
      $("vq-intro-title").innerHTML = "♾️ ENDLESS RUN";
      $("vq-intro-story").innerHTML = "Gates never stop. The world changes every 6 questions and the run gets faster and faster. How many can you answer?";
      $("vq-intro-loadout").innerHTML = `${HEROES[loadout.hero].icon} ${loadout.hero.toUpperCase()} · ${petIcon()}<br>🏆 Your best: ${vq.endlessBest || 0} gates`;
      show("vq-intro"); return;
    }
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
  // The run is now a real-time chase: the zombie walks toward you, gates have a countdown,
  // obstacles need JUMP / SLIDE / lane changes, bosses shoot, lava rises, weather hits, a
  // rival races you and the heartbeat music follows the danger. CHILL mode keeps the old run.
  let G = null;           // current run
  let rafId = 0;
  const ents = $("vq-ents"), fieldEl = $("vq-field"), heroEl = $("vq-hero");
  let tenseMode = true; try { tenseMode = localStorage.getItem("vq_tense") !== "0"; } catch (e) {}
  let rivalPick = "bot";
  const R = () => (G && G.rng ? G.rng() : Math.random());
  const rr = (a, b) => Math.floor(R() * (b - a + 1)) + a;
  const rshuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rr(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const OB = {
    lava: { h: "low", em: "🔥" }, tnt: { h: "full", em: "TNT" }, wall: { h: "full", em: "🧱" }, web: { h: "web", em: "🕸️" },
    bat: { h: "high", em: "🦇" }, cart: { h: "full", em: "🛒", drift: true }, piston: { h: "full", em: "🟥", piston: true },
    creeper: { h: "full", em: "🟩", drift: true }, fireball: { h: "high", em: "☄️", drift: true }, void: { h: "pit", em: "🕳️" }
  };
  const WORLD_OB = { 1: ["lava", "tnt", "web"], 2: ["lava", "tnt", "bat", "cart"], 3: ["piston", "lava", "creeper", "bat"], 4: ["fireball", "lava", "creeper", "bat"], 5: ["void", "bat", "creeper", "fireball"] };
  const PICKUPS = [{ id: "boots", em: "⚡" }, { id: "shield", em: "🛡️" }, { id: "magnet", em: "🧲" }, { id: "clock", em: "⏱️" }, { id: "heart", em: "❤️" }];
  const RIVALS = { slow: { pace: 12, e: "🐢" }, bot: { pace: 8, e: "🤖" }, fast: { pace: 5.5, e: "🚀" } };
  const BUFFS = [
    { e: "🕶️", n: "Stealth", d: "Zombie 25% slower", a: g => { g.zomMul *= 0.75; } },
    { e: "⏱️", n: "Slow Time", d: "Run 12% slower", a: g => { g.speedBuff *= 0.88; } },
    { e: "🛡️", n: "Iron Skin", d: "+1 shield", a: g => { g.shields++; } },
    { e: "💨", n: "Sprinter", d: "+2 dashes", a: g => { g.dashCharges += 2; } },
    { e: "🧲", n: "Magnet", d: "Grab nearby coins", a: g => { g.magnet = true; } },
    { e: "💰", n: "Greedy", d: "Coins +40%", bad: "Zombie 20% faster", a: g => { g.coinMul *= 1.4; g.zomMul *= 1.2; } },
    { e: "🎰", n: "All In", d: "Coins ×2", bad: "Run 15% faster", a: g => { g.coinMul *= 2; g.speedBuff *= 1.15; } }
  ];
  const laneLeft = (lane, y) => 50 + ((22 + 28 * lane) - 50) * (0.35 + 0.65 * y);
  const yTop = y => (0.04 + 0.96 * y) * 100;
  const scaleAt = y => 0.4 + 0.75 * y;
  const laneOf = it => Math.round(it.laneF);

  // heartbeat music
  let pulseOn = false, pulseT = null;
  function kick(vol) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
      o.type = "sine"; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.22);
    } catch (e) {}
  }
  function startPulse() { stopPulse(); pulseOn = true; const beat = () => { if (!pulseOn) return; const d = G ? G.danger || 0 : 0; if (G && !G.paused && !G.finished) { kick(0.08 + d * 0.1); if (d > 0.45) setTimeout(() => kick(0.06), 160); } pulseT = setTimeout(beat, Math.round(860 - d * 480)); }; beat(); }
  function stopPulse() { pulseOn = false; clearTimeout(pulseT); }

  function buildGroup(i) {
    const ev = [], boss = G.boss;
    ev.push({ kind: "coin" });
    if (G.tense && !boss) { if (i > 0) { const n = (G.idx >= 10 && R() < 0.4) ? 2 : 1; for (let k = 0; k < n; k++) ev.push({ kind: "obst" }); } }
    else if (!G.tense && (i > 0 || boss)) ev.push({ kind: "obst", fire: boss });
    ev.push(G.tense && R() < 0.4 ? { kind: "pick" } : { kind: "coin" });
    if (G.tense && !boss && !G.endless && G.nQ >= 5 && (i === 2 || i === 5)) ev.push({ kind: "fork" });
    ev.push({ kind: "gate", q: i });
    return ev;
  }
  function extendPlan() {
    const i = G.nextQ++, tier = G.nextQ < 5 ? "easy" : G.nextQ < 11 ? "medium" : "hard";
    G.w = 1 + Math.floor(i / 6) % 5; G.W = WORLDS[G.w - 1];
    fieldEl.classList.remove("w1", "w2", "w3", "w4", "w5"); fieldEl.classList.add("w" + G.w);
    let q, tries = 0; do { q = makeQuestion(tier, true); } while (G.questionSeen.has(q.prompt) && tries++ < 6);
    G.questionSeen.add(q.prompt); G.questions.push(q);
    buildGroup(i).forEach(e => G.plan.push(e));
  }
  const tierForEndless = n => n < 5 ? "easy" : n < 11 ? "medium" : "hard";

  async function startLevel(id, opts) {
    opts = opts || {};
    hide("vq-intro"); hide("vq-win"); hide("vq-fail");
    const endless = !!opts.endless, bonus = !!opts.bonus;
    const m = (id || "w1l1").match(/^w(\d)l(\d)$/) || ["", "1", "1"], w = +m[1], l = +m[2], W = WORLDS[w - 1];
    try { await Promise.race([window.AIGQuestionPools ? window.AIGQuestionPools.ensurePools() : Promise.resolve(), delay(1200)]); } catch (e) {}
    const tense = !!tenseMode && !bonus;
    const idx = endless ? 10 : levelIdx(id), boss = !endless && !bonus && l === 5;
    const gid = vq.gadget, glv = gid ? gadgetLv(gid) : 0, hero = loadout.hero, stage = petStage();
    const maxHearts = 3 + (gid === "apple" ? (glv >= 4 ? 2 : 1) : 0);
    const hpBase = boss ? 5 + Math.floor((w - 1) / 2) : 0, shieldBase = boss && tense ? (w === 1 ? 1 : 2) : 0;
    const nQ = bonus ? 0 : endless ? Infinity : boss ? (tense ? hpBase + shieldBase + 2 : 8) : (l <= 2 ? 6 : 7);
    const seedLabel = ($("vq-seed").value || "").trim() || String(rand(1000, 9999));
    const veh = tense && !boss && !bonus && !endless ? (l === 3 ? (w === 5 ? "elytra" : "cart") : ((w === 2 || w === 4) && l === 2) ? "boat" : "") : "";
    G = {
      id, w, l, idx, boss, endless, bonus, nQ, tense, W, questions: [], questionSeen: new Set(), plan: [], planPos: 0, dist: 0, rows: [], nextQ: 0,
      qi: 0, elapsed: 0, coins: 0, hearts: maxHearts, maxHearts, mistakes: 0, correct: 0, streak: 0, lane: 1, hero,
      running: true, paused: false, ending: false, endAt: 0, finished: false,
      shields: (hero === "knight" ? 1 : 0) + (gid === "shield" ? (glv >= 3 ? 2 : 1) : 0),
      swordCharges: gid === "sword" ? 1 + Math.floor(glv / 2) : 0, petBlock: stage >= 2 ? 1 : 0,
      abilityCharges: HEROES[hero].ability ? 2 : 0, slowUntil: 0, hackNext: false, wizNext: false,
      baseSpeed: (0.17 + 0.005 * idx) * (tense ? 1.3 : 1), potion: gid === "potion" ? 1 - (0.04 + glv * 0.04) : 1, speedBuff: 1, vehicle: veh, vehMul: { cart: 1.25, boat: 1.1, elytra: 1.2 }[veh] || 1,
      magnet: gid === "magnet", magnetUntil: 0, compassEvery: gid === "compass" ? Math.max(2, 6 - glv) : 0, coinMul: 1, zomMul: 1, zom: 0, danger: 0,
      bossHp: hpBase, bossMax: hpBase, bossShield: shieldBase, bossShieldMax: shieldBase, bossT: 2.4,
      bestMs: vq.best && vq.best[id] || 0, lastT: 0, pose: "idle", jumpCd: 0, poseT: null, invUntil: 0, dashUntil: 0, dashCharges: 1, bootsUntil: 0, clockUntil: 0,
      rush: 0, forkMode: "", forkLeft: 0, lavaOn: tense && !boss && !bonus && (w === 3 || w === 4), lavaF: 0.02, weatherT: 16 + Math.random() * 6, decisive: false, bigN: null,
      seedLabel, rng: mulberry32(hashStr("vq|" + seedLabel + "|" + id)), rival: null, rivalQ: 0, rivalBeaten: false, swats: 0
    };
    const rv = rivalPick;
    if (tense || endless) G.rival = rv === "ghost" ? { pace: G.bestMs && nQ && nQ !== Infinity ? Math.max(3, G.bestMs / 1000 / nQ) : 8, e: "👻" } : RIVALS[rv];
    G.SPACING = tense ? 0.42 : SPACING;
    if (bonus) {
      G.baseSpeed *= 1.6; G.SPACING = 0.4;
      for (let i = 0; i < 18; i++) G.plan.push({ kind: "coin", dense: true });
    } else if (endless) { G.w = 1; G.W = WORLDS[0]; for (let i = 0; i < 3; i++) extendPlan(); }
    else {
      const tier = tierFor(w, l); let guard = 0;
      while (G.questions.length < nQ && guard++ < 60) { const q = makeQuestion(tier, w >= 2); if (G.questionSeen.has(q.prompt)) continue; G.questionSeen.add(q.prompt); G.questions.push(q); }
      for (let i = 0; i < nQ; i++) buildGroup(i).forEach(e => G.plan.push(e));
    }
    // screen setup
    hide("vq-home"); show("vq-game");
    fieldEl.className = `vq-field w${endless ? 1 : w}${veh ? " veh-" + veh : ""}`;
    ents.innerHTML = ""; fieldEl.querySelectorAll(".vq-warn,.vq-shot").forEach(e => e.remove());
    $("vq-hero-mc").dataset.skin = hero; $("vq-hero-mc").classList.add("run"); heroEl.className = "vq-hero";
    $("vq-pet").textContent = petIcon(); $("vq-pet").style.fontSize = `${1.1 + stage * 0.28}rem`;
    $("vq-boss").classList.toggle("hidden", !boss); if (boss) { $("vq-boss-em").textContent = W.bossEm; $("vq-boss-fill").style.width = "100%"; }
    $("vq-ghost").classList.toggle("hidden", !G.bestMs || endless || bonus);
    $("vq-floor").style.setProperty("--spd", String(G.baseSpeed / 0.2));
    const par = ["⛰️", "🪨", "🌋", "🔥", "✨"][(endless ? 0 : w - 1)]; $("vq-par1").firstChild.textContent = Array(24).fill(par).join(" ");
    fieldEl.style.setProperty("--vqdark", tense && !boss ? String([0, 0.05, 0.14, 0.24, 0.32, 0.4][endless ? 2 : w]) : "0");
    $("vq-lava").style.height = "0"; $("vq-danger").style.opacity = 0; $("vq-rushfx").classList.add("hidden"); $("vq-bigcount").classList.add("hidden");
    const cart = $("vq-cartem"); cart.classList.toggle("hidden", !veh); cart.textContent = { cart: "🛒", boat: "🚤", elytra: "🪽" }[veh] || "";
    if (veh === "elytra") { G.pose = "jump"; heroEl.classList.add("jump"); }
    $("vq-ability").classList.toggle("hidden", !HEROES[hero].ability); $("vq-abrow").classList.toggle("solo", !HEROES[hero].ability);
    $("vq-jump").classList.toggle("hidden", !tense); $("vq-slide").classList.toggle("hidden", !tense);
    document.querySelector(".vq-ctrl4").classList.toggle("chill", !tense);
    renderAbility(); renderHud(); placeHero(true); updateSign();
    $("vq-prog-fill").style.width = "0%";
    G.paused = true;
    if (bonus) $("vq-sign").textContent = "💰 TREASURE ROOM! Grab every coin!";
    if (boss && tense) await showCine(W.bossEm, W.boss.toUpperCase());
    if (!G || G.finished) return;
    if ((tense || endless) && !bonus) { const b = await chooseBuff(); if (!G || G.finished) return; if (b) { b.a(G); toast(`${b.e} ${b.n}!`); renderHud(); placeHero(true); } }
    await countdown();
    if (!G || G.finished) return;
    G.paused = false; G.lastT = 0;
    if (tense && settings.sound) startPulse();
    cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop);
  }
  function showCine(emoji, name) {
    return new Promise(res => {
      $("vq-cine-em").textContent = emoji; $("vq-cine-nm").textContent = name;
      const c = $("vq-cine"); c.classList.remove("hidden"); sfx.hit(); buzz(200);
      let fin = false; const end = () => { if (fin) return; fin = true; c.classList.add("hidden"); res(); };
      c.onclick = end; setTimeout(end, 1900);
    });
  }
  function chooseBuff() {
    return new Promise(res => {
      const cards = shuffle(BUFFS).slice(0, 3);
      $("vq-buff-cards").innerHTML = cards.map((b, i) => `<button type="button" data-i="${i}"><span class="e">${b.e}</span>${b.n}<small>${b.d}</small>${b.bad ? `<small class="bad">⚠ ${b.bad}</small>` : ""}</button>`).join("");
      $("vq-buff-cards").querySelectorAll("button").forEach(btn => btn.onclick = () => { hide("vq-buffs"); res(cards[+btn.dataset.i]); });
      show("vq-buffs");
    });
  }
  async function countdown() {
    const c = $("vq-countdown"); c.classList.remove("hidden");
    for (const t of ["3", "2", "1", "GO!"]) { c.innerHTML = `<span>${t}</span>`; sfx.tick(); await delay(settings.motion ? 300 : 600); if (!G || G.finished) break; }
    c.classList.add("hidden");
  }
  function zomVis() { return G.tense ? G.zom : (G.maxHearts - G.hearts) / G.maxHearts; }
  function placeHero(instant) {
    const hero = $("vq-hero"), pet = $("vq-pet"), cartEl = $("vq-cartem");
    const left = laneLeft(G.lane, HERO_Y), top = yTop(HERO_Y);
    if (instant) { hero.style.transition = "none"; pet.style.transition = "none"; }
    hero.style.left = left + "%"; hero.style.top = top + "%";
    pet.style.left = (left + (G.lane === 2 ? -11 : 11)) + "%"; pet.style.top = (top + 1) + "%";
    cartEl.style.left = left + "%"; cartEl.style.top = (top - 3) + "%";
    placeZombie();
    if (instant) { void hero.offsetWidth; hero.style.transition = ""; pet.style.transition = ""; }
  }
  function placeZombie() {
    const z = $("vq-zombie"), zy = 1.16 - 0.30 * Math.min(1, zomVis());
    z.style.left = laneLeft(G.lane, HERO_Y) + "%"; z.style.top = yTop(zy) + "%";
    z.style.display = (G.bonus || (G.boss && G.tense)) ? "none" : "";
  }
  function renderHud() {
    let h = ""; for (let i = 0; i < G.maxHearts; i++) h += i < G.hearts ? "❤️" : "🖤";
    if (G.shields > 0) h += ` 🛡️${G.shields}`;
    $("vq-hearts").textContent = h;
    $("vq-run-coins").textContent = G.coins;
    $("vq-combo").textContent = `x${G.streak}`;
    if (G.boss) $("vq-boss-fill").style.width = `${Math.max(0, G.bossHp / Math.max(1, G.bossMax) * 100)}%`;
    $("vq-dash").textContent = `💨 DASH ×${G.dashCharges}`; $("vq-dash").disabled = G.dashCharges <= 0 || G.bonus;
    heroEl.classList.toggle("fire", G.streak >= 3); heroEl.classList.toggle("volt", G.streak >= 8 || G.rush > 0);
    $("vq-rushfx").classList.toggle("hidden", !(G.rush > 0));
    const rv = $("vq-rival"); rv.classList.toggle("hidden", !G.rival);
    if (G.rival) { const r = Math.floor(G.rivalQ); rv.textContent = `${G.rival.e} Q${r} (${G.qi >= r ? "you +" + (G.qi - r) : "behind " + (r - G.qi)})`; rv.style.color = G.qi >= r ? "#7ef0a3" : "#ff8a8a"; }
  }
  function renderAbility() {
    const info = HEROES[G.hero]; if (!info.ability) return;
    const ab = $("vq-ability");
    ab.textContent = `${info.icon} ${info.ability} ×${G.abilityCharges}`;
    ab.disabled = G.abilityCharges <= 0;
  }
  function updateSign() {
    if (G.bonus) return;
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
    fieldEl.appendChild(p); setTimeout(() => p.remove(), 1000);
  }
  function setLane(l) {
    if (!G || !G.running || G.paused || G.finished) return;
    l = Math.max(0, Math.min(2, l)); if (l === G.lane) return;
    G.lane = l; placeHero(false); beep(300 + l * 80, 0.04, "square", 0.025);
  }
  function setPose(p, ms) {
    if (!G || !G.running || G.paused || G.finished || !G.tense) return;
    if (p === "jump" && (G.elapsed < G.jumpCd || G.vehicle === "elytra")) return;
    clearTimeout(G.poseT); G.pose = p; heroEl.classList.remove("jump", "slide"); heroEl.classList.add(p);
    if (p === "jump") G.jumpCd = G.elapsed + 0.9; beep(p === "jump" ? 520 : 260, 0.06, "triangle", 0.04);
    G.poseT = setTimeout(() => { if (!G) return; G.pose = G.vehicle === "elytra" ? "jump" : "idle"; heroEl.classList.remove("jump", "slide"); if (G.vehicle === "elytra") heroEl.classList.add("jump"); }, ms);
  }
  function useDash() {
    if (!G || G.paused || G.finished || G.dashCharges <= 0 || G.bonus) return;
    G.dashCharges--; G.dashUntil = G.elapsed + 0.8; G.invUntil = Math.max(G.invUntil, G.elapsed + 0.8); G.zom = Math.max(0, G.zom - 0.25);
    heroEl.classList.add("dash"); setTimeout(() => heroEl.classList.remove("dash"), 800); popup("💨 DASH!", G.lane, HERO_Y - 0.1, "#7ec8ff"); sfx.block(); buzz(30); renderHud();
  }

  // ---------------- spawning ----------------
  function mkEnt(html) { const el = document.createElement("div"); el.className = "vq-ent"; el.innerHTML = html; return el; }
  function spawnEvent(ev, y0) {
    const row = { kind: ev.kind, y: y0 || 0, resolved: false, items: [] };
    if (ev.kind === "coin") {
      const n = ev.dense ? rr(2, 3) : R() < 0.25 ? 3 : R() < 0.5 ? 2 : 1;
      rshuffle([0, 1, 2]).slice(0, n).forEach(ln => {
        const gem = R() < (ev.dense ? 0.2 : 0.12), el = mkEnt(`<div class="vq-coin ${gem ? "gem" : ""}"></div>`);
        row.items.push({ lane: ln, laneF: ln, val: (gem ? 3 : 1) * (G.forkMode === "risk" ? 2 : 1), el, inner: el.firstChild });
      });
    } else if (ev.kind === "pick") {
      const p = PICKUPS[rr(0, PICKUPS.length - 1)], ln = rr(0, 2), el = mkEnt(`<div class="vq-pickup">${p.em}</div>`);
      row.items.push({ lane: ln, laneF: ln, pick: p.id, el, inner: el.firstChild });
    } else if (ev.kind === "fork") {
      [[0, "safe", "🛡 SAFE<br>no obstacles"], [2, "risk", "💰 RISK<br>coins ×2"]].forEach(([ln, kind, label]) => {
        const el = mkEnt(`<div class="vq-forksign ${kind}">${label}</div>`); row.items.push({ lane: ln, laneF: ln, fork: kind, el, inner: el.firstChild });
      });
    } else if (ev.kind === "obst") {
      if (G.forkMode === "safe" && G.forkLeft > 0) return null;
      const n = Math.min(2, (G.w >= 2 && R() < 0.35 ? 2 : 1) + (G.forkMode === "risk" ? 1 : 0));
      const pool = G.tense ? WORLD_OB[G.w] : ["lava", "tnt", "wall"];
      rshuffle([0, 1, 2]).slice(0, n).forEach(ln => {
        const type = ev.fire ? "fireball" : pool[rr(0, pool.length - 1)], k = OB[type], h = G.tense ? k.h : "full";
        const drift = G.tense && k.drift, el = mkEnt(`<div class="vq-block ${type === "cart" ? "cartob" : type} ${drift ? "drift" : ""}" data-h="${h}">${k.em}</div>`);
        const it = { lane: ln, laneF: ln, type, h, drift, piston: G.tense && k.piston, el, inner: el.firstChild };
        if (drift) it.target = ln === 0 ? 1 : ln === 2 ? 1 : (R() < 0.5 ? 0 : 2);
        row.items.push(it);
      });
    } else if (ev.kind === "gate") {
      const q = G.questions[ev.q]; row.q = ev.q; row.question = q;
      if (G.forkLeft > 0) { G.forkLeft--; if (G.forkLeft <= 0) G.forkMode = ""; }
      const lanes = q.labels.length === 3 ? [0, 1, 2] : [0, 2];
      q.labels.forEach((label, i) => {
        const shown = q.lettered ? "ABC"[i] : label, long = !q.lettered && String(label).length > 6;
        const el = mkEnt(`<div class="vq-gate ${q.kind === "tf" ? "tf" : ""} ${G.tense && G.w >= 4 && !G.fogOff ? "fog" : ""}" style="${q.lettered ? "font-size:1rem;width:64px;" : long ? "font-size:.44rem;width:90px;" : ""}">${shown}</div>`);
        row.items.push({ lane: lanes[i], laneF: lanes[i], el, inner: el.firstChild, answer: i, gone: false });
      });
      if (lanes.length === 2) { const el = mkEnt(`<div class="vq-block wall">🧱</div>`); row.items.push({ lane: 1, laneF: 1, el, inner: el.firstChild, answer: -1 }); }
      row.shift = G.tense && !G.boss && G.w >= 3 && lanes.length === 3 && R() < 0.6;
      const hint = () => { const it = row.items.find(x => x.answer === q.correct); if (it) it.inner.classList.add("hint"); };
      if (G.hackNext) { G.hackNext = false; hint(); }
      if (G.compassEvery && (ev.q + 1) % G.compassEvery === 0) hint();
      if (G.wizNext) { G.wizNext = false; crumble(row); }
    }
    row.items.forEach(it => { ents.appendChild(it.el); });
    G.rows.push(row);
    return row;
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
  function curSpeed() {
    let sp = G.baseSpeed * G.potion * G.speedBuff * G.vehMul;
    sp *= 1 + (G.tense ? 0.04 : 0.03) * Math.min(G.qi, 14);
    if (G.tense) sp *= 1 + Math.min(0.25, G.streak * 0.04) + (G.rush > 0 ? 0.1 : 0);
    if (G.elapsed < G.slowUntil) sp *= 0.55;
    if (G.elapsed < G.dashUntil) sp *= 1.8;
    if (G.elapsed < G.bootsUntil) sp *= 1.35;
    if (G.elapsed < G.clockUntil) sp *= 0.6;
    if (G.decisive) sp *= 0.5;
    return sp;
  }
  function step(dt) {
    G.elapsed += dt;
    const speed = curSpeed(), dy = speed * dt;
    G.dist += dy;
    // zombie walks toward you for real
    if (G.tense && !G.bonus && !(G.boss) && !G.ending) {
      G.zom += dt / (75 - Math.min(G.idx, 24) * 1.6) * G.zomMul;
      if (G.zom >= 1) { G.zom = 0.45; popup("🧟 CAUGHT!", G.lane, HERO_Y, "#ff6b6b"); takeHit(false, G.lane, true); if (!G || G.finished) return; }
      placeZombie();
    }
    // lava rising (worlds 3-4)
    if (G.lavaOn && !G.ending) {
      G.lavaF += 0.0065 * dt; $("vq-lava").style.height = (G.lavaF * 100) + "%";
      if (G.lavaF >= 0.18) { G.lavaF = 0.03; popup("🌋 LAVA!", G.lane, HERO_Y, "#ff9a2e"); takeHit(false, G.lane, true); if (!G || G.finished) return; }
    }
    // rival
    if (G.rival) { G.rivalQ += dt / G.rival.pace; if (Math.floor(G.rivalQ) !== G.rivalShown) { G.rivalShown = Math.floor(G.rivalQ); renderHud(); } }
    // weather
    if (G.tense && !G.boss && !G.bonus && G.elapsed > 8 && !G.ending) { G.weatherT -= dt; if (G.weatherT <= 0) { doWeather(); G.weatherT = 14 + Math.random() * 8; } }
    // boss attacks
    if (G.boss && G.tense && !G.ending) { G.bossT -= dt; if (G.bossT <= 0) { fireWave(); G.bossT = G.bossShield > 0 ? 3.6 : 2.4; } }
    // endless: keep the plan filled
    if (G.endless) while (G.plan.length - G.planPos < 6) extendPlan();
    // spawn
    while (!G.ending && G.planPos < G.plan.length && G.dist >= G.planPos * G.SPACING) {
      const over = G.dist - G.planPos * G.SPACING, r = spawnEvent(G.plan[G.planPos], over); G.planPos++;
      if (r) r.y = over;
    }
    // move + resolve
    for (let i = G.rows.length - 1; i >= 0; i--) {
      const row = G.rows[i], prev = row.y; row.y += dy;
      if (G.tense) {
        row.items.forEach(it => {
          if (it.drift && row.y > 0.28) it.laneF += (it.target - it.laneF) * Math.min(1, dt * 2.6);
          if (it.piston && !it.pistonSet && row.y > 0.42) { it.pistonSet = true; it.retracted = R() < 0.5; if (it.retracted) it.inner.classList.add("retract"); }
          if (row.shift && !row.shiftSet && row.y > 0.4) { row.shiftSet = true; const g3 = row.items.filter(x => x.answer >= 0); const a = rr(0, g3.length - 1); let b2 = (a + 1 + rr(0, g3.length - 2)) % g3.length; const t = g3[a].lane; g3[a].target = g3[b2].lane; g3[b2].target = t; popup("⇄ SWAP!", G.lane, 0.5, "#fcdb05"); sfx.block(); }
          if (it.target !== undefined && it.answer !== undefined) it.laneF += (it.target - it.laneF) * Math.min(1, dt * 3.2);
          if (it.fog === undefined && it.answer !== undefined && it.inner.classList.contains("fog") && (row.y > 0.4 || G.fogOff)) { it.fog = false; it.inner.classList.remove("fog"); }
        });
      }
      if (!row.resolved && prev < HERO_Y && row.y >= HERO_Y) { row.resolved = true; resolveRow(row); if (!G || G.finished) return; }
      row.items.forEach(it => {
        const y = row.y;
        it.el.style.left = laneLeft(it.laneF, y) + "%";
        it.el.style.top = yTop(y) + "%";
        it.el.style.transform = `translate(-50%,-100%) scale(${scaleAt(y).toFixed(3)})`;
        it.el.style.zIndex = String(Math.round(y * 100));
        it.el.style.opacity = y < 0.04 ? "0" : "";
      });
      if (row.y > 1.25) { row.items.forEach(it => it.el.remove()); G.rows.splice(i, 1); }
    }
    if (!G || G.finished) return;
    // countdown to the next gate + slow-mo on decisive gates
    const ng = G.rows.find(r => r.kind === "gate" && !r.resolved);
    if (G.tense && ng) {
      const eta = (HERO_Y - ng.y) / Math.max(0.01, speed);
      G.decisive = eta > 0 && eta < 1.4 && (G.hearts === 1 || (G.boss && G.bossHp <= 1 && G.bossShield === 0));
      fieldEl.classList.toggle("slowmo", G.decisive);
      const n = eta > 0 && eta <= 3 ? Math.ceil(eta) : null;
      if (n !== G.bigN) { G.bigN = n; const b = $("vq-bigcount"); if (n) { b.classList.remove("hidden"); b.innerHTML = `<span>${n}</span>`; sfx.tick(); } else b.classList.add("hidden"); }
      G.eta = eta;
    } else { G.decisive = false; G.eta = undefined; fieldEl.classList.remove("slowmo"); if (G.bigN) { G.bigN = null; $("vq-bigcount").classList.add("hidden"); } }
    // danger vignette + heartbeat tempo
    let d = 0;
    if (G.tense) {
      const zv = Math.min(1, G.zom); if (zv > 0.6) d = Math.max(d, (zv - 0.6) / 0.4 * 0.9);
      if (G.eta !== undefined && G.eta < 2.2 && G.eta > 0) d = Math.max(d, 0.6);
      if (G.lavaOn && G.lavaF > 0.13) d = Math.max(d, (G.lavaF - 0.13) / 0.05 * 0.8);
    }
    if (G.hearts === 1 && G.tense) d = Math.max(d, 0.55);
    G.danger = Math.min(1, d);
    const dg = $("vq-danger"); dg.style.opacity = G.danger; dg.classList.toggle("on", G.danger > 0.3);
    $("vq-prog-fill").style.width = G.endless ? `${(G.qi % 10) * 10}%` : G.bonus ? `${Math.min(100, G.planPos / G.plan.length * 100)}%` : `${Math.min(100, (G.qi / G.nQ) * 100)}%`;
    if (G.bestMs && !G.endless && !G.bonus) { const gp = Math.min(1, (G.elapsed * 1000) / G.bestMs); $("vq-ghost").style.left = `${gp * 100}%`; }
    // end
    if (G.bonus) { if (!G.ending && G.planPos >= G.plan.length && G.rows.length === 0) { G.ending = true; G.endAt = G.elapsed + 0.4; } }
    else if (!G.ending && !G.endless && (G.qi >= G.nQ || (G.boss && G.bossHp <= 0 && G.bossShield <= 0))) {
      G.ending = true; G.endAt = G.elapsed + 0.9;
      if (G.boss && G.bossHp <= 0) { $("vq-boss-em").textContent = "💥"; }
    }
    if (G.ending && G.elapsed >= G.endAt) finishRun();
  }

  // ---------------- weather + boss waves ----------------
  function doWeather() {
    const t = rand(0, 2);
    if (t === 0) { toast("🌋 EARTHQUAKE!"); fieldEl.classList.remove("shake"); void fieldEl.offsetWidth; fieldEl.classList.add("shake"); sfx.hit(); buzz(150); const r = spawnEvent({ kind: "obst" }, 0.02); if (r) r.y = 0.02; }
    else if (t === 1) { toast("🦇 BAT SWARM!"); fieldEl.classList.add("bats"); sfx.bad(); setTimeout(() => fieldEl.classList.remove("bats"), 3000); }
    else { toast("⚡ LIGHTNING!"); const f = $("vq-flash"); f.style.background = "#fff"; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); setTimeout(() => { f.style.background = ""; }, 600); G.fogOff = true; setTimeout(() => { if (G) G.fogOff = false; }, 1500); sfx.hit(); }
  }
  function bossShots(w) {
    const lanes = [0, 1, 2];
    if (w === 1) return [{ lane: rr(0, 2), at: 0 }];
    if (w === 2) { const l = rr(0, 2); return [{ lane: l, at: 0 }, { lane: l, at: 450 }, { lane: l, at: 900 }]; }
    if (w === 3) { const safe = rr(0, 2); return lanes.filter(l => l !== safe).map(l => ({ lane: l, at: 0 })); }
    if (w === 4) { const s1 = rr(0, 2), s2 = (s1 + 1 + rr(0, 1)) % 3; return [...lanes.filter(l => l !== s1).map(l => ({ lane: l, at: 0 })), ...lanes.filter(l => l !== s2).map(l => ({ lane: l, at: 700 }))]; }
    const dir = R() < 0.5 ? [0, 1, 2] : [2, 1, 0]; return dir.map((l, i) => ({ lane: l, at: i * 420 }));
  }
  function fireWave() {
    const atk = ["🪨", "🏹", "💥", "🔥", "☄️"][G.w - 1], enraged = G.bossShield <= 0, warn = enraged ? 650 : 950, g0 = G;
    bossShots(G.w).forEach(s => {
      const wEl = document.createElement("div"); wEl.className = "vq-warn"; wEl.textContent = "⚠️"; wEl.style.left = laneLeft(s.lane, HERO_Y) + "%"; wEl.style.top = (yTop(HERO_Y) - 2) + "%"; fieldEl.appendChild(wEl);
      setTimeout(() => {
        wEl.remove(); if (G !== g0 || G.finished) return;
        const sh = document.createElement("div"); sh.className = "vq-shot"; sh.textContent = atk; sh.style.left = laneLeft(s.lane, HERO_Y) + "%"; sh.style.top = "16%"; fieldEl.appendChild(sh);
        requestAnimationFrame(() => requestAnimationFrame(() => { sh.style.top = yTop(HERO_Y) + "%"; }));
        setTimeout(() => {
          sh.remove(); if (G !== g0 || G.finished) return;
          if (G.lane === s.lane && G.pose !== "jump") { popup(`${atk} HIT!`, s.lane, HERO_Y, "#ff6b6b"); takeHit(false, s.lane); } else if (G.lane === s.lane) popup("⬆ jumped!", s.lane, HERO_Y, "#7ef0a3");
        }, 320);
      }, warn + s.at);
    });
    sfx.tick();
  }

  // ---------------- resolution ----------------
  function takeHit(isObstacle, lane, force) {
    if (G.elapsed < G.invUntil && !force) { popup("💨", lane, HERO_Y, "#7ec8ff"); return; }
    if (isObstacle && G.petBlock > 0) { G.petBlock--; popup(`${petIcon()} SAVE!`, lane, HERO_Y, "#7ef0a3"); sfx.block(); return; }
    if (isObstacle && G.swordCharges > 0) { G.swordCharges--; popup("⚔️ SMASH!", lane, HERO_Y, "#7ef0a3"); sfx.block(); return; }
    if (G.shields > 0) { G.shields--; popup("🛡️ BLOCK!", lane, HERO_Y, "#7ef0a3"); sfx.block(); renderHud(); G.invUntil = G.elapsed + 0.5; return; }
    G.hearts--; G.mistakes++; G.streak = 0; G.rush = 0; G.invUntil = G.elapsed + 0.7;
    if (G.tense) G.zom = Math.min(1, G.zom + 0.14);
    if (G.lavaOn) G.lavaF += 0.04;
    sfx.hit(); buzz(120);
    heroEl.classList.remove("hit"); void heroEl.offsetWidth; heroEl.classList.add("hit");
    const f = $("vq-flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    fieldEl.classList.remove("shake"); void fieldEl.offsetWidth; fieldEl.classList.add("shake");
    popup("-1 ❤️", lane, HERO_Y, "#ff6b6b");
    renderHud(); placeHero(false);
    if (G.hearts <= 0) failRun();
  }
  function resolveRow(row) {
    if (row.kind === "coin") {
      const mult = (G.rush > 0 ? 2 : 1) * G.coinMul;
      row.items.forEach(it => {
        const near = Math.abs(laneOf(it) - G.lane) <= ((G.magnet || G.elapsed < G.magnetUntil) ? 1 : 0);
        if (near) { const v = Math.max(1, Math.round(it.val * mult)); G.coins += v; it.inner.classList.add("gone"); popup(`+${v}`, it.lane, HERO_Y); sfx.coin(); }
      });
      renderHud();
    } else if (row.kind === "pick") {
      row.items.forEach(it => {
        if (laneOf(it) !== G.lane) return;
        it.inner.classList.add("gone"); sfx.heart();
        if (it.pick === "boots") { G.bootsUntil = G.elapsed + 3; G.zom = Math.max(0, G.zom - 0.15); popup("⚡ BOOTS", G.lane, HERO_Y - 0.1, "#fcdb05"); }
        else if (it.pick === "shield") { G.shields++; popup("🛡️ +1", G.lane, HERO_Y - 0.1, "#7ef0a3"); }
        else if (it.pick === "magnet") { G.magnetUntil = G.elapsed + 8; popup("🧲 MAGNET", G.lane, HERO_Y - 0.1, "#fcdb05"); }
        else if (it.pick === "clock") { G.clockUntil = G.elapsed + 4; popup("⏱ SLOW", G.lane, HERO_Y - 0.1, "#7ec8ff"); }
        else if (it.pick === "heart") { if (G.hearts < G.maxHearts) { G.hearts++; popup("+1 ❤️", G.lane, HERO_Y - 0.1, "#ff9ec4"); } else { G.coins += 5; popup("+5", G.lane, HERO_Y - 0.1); } }
        renderHud();
      });
    } else if (row.kind === "fork") {
      const it = row.items.find(x => laneOf(x) === G.lane), mode = it ? it.fork : "safe";
      G.forkMode = mode; G.forkLeft = 2; popup(mode === "risk" ? "💰 RISKY ROUTE!" : "🛡 SAFE ROUTE", G.lane, 0.6, mode === "risk" ? "#ffb347" : "#7ef0a3"); sfx.block();
    } else if (row.kind === "obst") {
      for (const it of row.items) {
        if (laneOf(it) !== G.lane) continue;
        const h = it.h || "full";
        if (G.vehicle === "elytra" && (h === "low" || h === "pit" || h === "web")) continue;
        if (it.piston && it.retracted) { popup("✔ retracted", G.lane, HERO_Y, "#7ef0a3"); continue; }
        if ((h === "low" || h === "pit") && G.pose === "jump") { popup("⬆ jumped!", G.lane, HERO_Y, "#7ef0a3"); continue; }
        if (h === "high" && G.pose === "slide") { popup("⬇ ducked!", G.lane, HERO_Y, "#7ec8ff"); continue; }
        if (h === "web") { G.slowUntil = G.elapsed + 2.2; G.zom = Math.min(1, G.zom + 0.1); it.inner.classList.add("gone"); popup("🕸 stuck!", G.lane, HERO_Y, "#ddd"); continue; }
        it.inner.classList.add("gone"); takeHit(true, G.lane); break;
      }
    } else if (row.kind === "gate") {
      const q = row.question, mine = row.items.find(it => it.answer !== undefined && laneOf(it) === G.lane);
      const ok = mine && mine.answer === q.correct && !mine.gone;
      const right = row.items.find(it => it.answer === q.correct);
      if (right) { right.inner.classList.add("good"); right.inner.classList.remove("fog"); }
      try { LB.recordTopicAttempt("vaultquest", q.key || "math", !!ok); } catch (e) {}
      fieldEl.classList.remove("slowmo"); G.decisive = false;
      if (ok) {
        G.correct++; G.streak++; G.qi++;
        bumpMission("correct");
        sfx.good(); buzz(30); popup(G.streak > 1 ? `✔ x${G.streak}` : "✔", G.lane, HERO_Y, "#7ef0a3");
        heroEl.classList.remove("cheer"); void heroEl.offsetWidth; heroEl.classList.add("cheer");
        fieldEl.classList.add("zoom"); setTimeout(() => fieldEl.classList.remove("zoom"), 200);
        G.zom = Math.max(0, G.zom - 0.07); if (G.lavaOn) G.lavaF = Math.max(0, G.lavaF - 0.035);
        if (G.rush > 0) G.rush--;
        if (G.tense && G.streak % 5 === 0) { G.rush = 3; toast("🔥 RUSH! Coins ×2, faster!"); sfx.heart(); }
        if (G.boss) {
          if (G.bossShield > 0) { G.bossShield--; popup("🛡️ cracked!", G.lane, 0.3, "#7ec8ff"); if (G.bossShield === 0 && G.tense) { toast("😡 ENRAGED!"); } }
          else G.bossHp = Math.max(0, G.bossHp - 1);
          const b = $("vq-boss"); b.classList.remove("hurt"); void b.offsetWidth; b.classList.add("hurt");
        }
        if (G.streak > 0 && G.streak % 3 === 0 && G.hearts < G.maxHearts) { G.hearts++; sfx.heart(); popup("+1 ❤️", G.lane, HERO_Y - 0.12, "#ff9ec4"); placeHero(false); }
        renderHud();
      } else {
        if (mine && mine.answer !== q.correct && mine.answer >= 0) mine.inner.classList.add("bad");
        G.qi++;
        popup(mine ? "✘" : "✘ too slow!", G.lane, HERO_Y, "#ff6b6b");
        takeHit(false, G.lane, true);
      }
      if (!G || G.finished) return;
      updateSign(); renderHud();
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
  function stopLoop() { cancelAnimationFrame(rafId); stopPulse(); if (fieldEl) { fieldEl.classList.remove("slowmo", "bats", "zoom"); } clearTimeout(G && G.poseT); $("vq-bigcount").classList.add("hidden"); $("vq-danger").style.opacity = 0; $("vq-rushfx").classList.add("hidden"); }
  function failRun() {
    if (G.finished) return; G.finished = true; stopLoop(); sfx.lose();
    G.running = false; $("vq-hero-mc").classList.remove("run");
    bumpMission("coins", G.coins);
    if (G.endless) {
      const reward = Math.floor(G.coins * 0.6 + G.qi * 3), prev = vq.endlessBest || 0; if (G.qi > prev) vq.endlessBest = G.qi;
      try { LB.creditWallet({ coins: reward }); } catch (e) {} save(); refreshWallet();
      setTimeout(() => { $("vq-fail-sub").innerHTML = `♾️ You answered <b>${G.qi}</b> gates!${G.qi > prev ? " 🏆 NEW BEST!" : ` (best ${prev})`}<br>Coins grabbed: ${G.coins} · Reward: 🪙 ${reward}`; show("vq-fail"); }, 700);
      return;
    }
    save();
    setTimeout(() => { $("vq-fail-sub").innerHTML = `You reached question ${Math.min(G.qi + 1, G.nQ)} of ${G.nQ}.<br>Coins grabbed: ${G.coins}<br>Tip: ${G.tense ? "dodge with JUMP/SLIDE and keep answering to push the zombie back!" : "slow down and read the sign!"}`; show("vq-fail"); }, 700);
  }
  async function finishBonus() {
    G.finished = true; stopLoop(); sfx.win();
    const total = Math.round(G.coins * 1.5);
    try { await LB.creditWallet({ coins: total }); } catch (e) {}
    bumpMission("coins", G.coins); await save(); await refreshWallet();
    toast(`💰 Treasure room: +${total} coins!`);
    leaveGame();
  }
  async function finishRun() {
    if (G.finished) return;
    if (G.bonus) { await finishBonus(); return; }
    if (G.boss && (G.bossHp > 0 || G.bossShield > 0)) { // boss survived
      G.finished = true; stopLoop(); sfx.lose();
      bumpMission("coins", G.coins); save();
      $("vq-fail-sub").innerHTML = `${G.W.boss} survived with ${G.bossHp} HP left!<br>You need ${G.bossMax + G.bossShieldMax} right gates to win.<br>Try again!`;
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
    let mult = (G.hero === "miner" ? 1.25 : 1) * (1 + 0.05 * stage) * (G.tense ? 1.2 : 1);
    if (vq.gadget === "magnet") mult *= 1 + 0.05 * glv;
    if (vq.gadget === "bell") mult *= 1 + 0.08 * glv;
    const rivalBeaten = !!G.rival && Math.floor(G.rivalQ) < G.nQ; G.rivalBeaten = rivalBeaten;
    const rivalBonus = rivalBeaten ? 10 : 0;
    const base = G.coins + 5 + stars * 3 + (G.boss ? 10 : 0);
    const total = Math.round(base * mult) + rivalBonus;
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
      ["✨ Crew/pet/mode bonus", `x${mult.toFixed(2)}`],
      G.rival ? [`${G.rival.e} Rival`, rivalBeaten ? "Beaten! +10 🪙" : "Was faster"] : null,
      ["💰 Total earned", `🪙 ${total}${G.boss && firstClear ? " + 💎 2" : ""}`],
      ["🐾 Pet XP", `+${xp}${nowStage > hadStage ? " — EVOLVED!" : ""}`],
      ["🎲 Seed", G.seedLabel]
    ].filter(Boolean).map((r, i) => `<div class="vq-rise" style="animation-delay:${0.3 + i * 0.22}s"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("");
    $("vq-win-class").textContent = "";
    LB.getVaultQuestClassBest(G.id).then(cb => {
      if (!cb) return;
      $("vq-win-class").textContent = ms <= cb.ms ? "🏆 You hold the class record!" : `Class record: ${fmtTime(cb.ms)} by ${prettyName(cb.id)}`;
    }).catch(() => {});
    show("vq-win-chest"); hide("vq-win-next"); hide("vq-win-home"); hide("vq-win-bonus");
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
  $("vq-intro-go").onclick = () => pendingLevel === "endless" ? startLevel("w1l1", { endless: true }) : startLevel(pendingLevel);
  $("vq-intro-back").onclick = () => hide("vq-intro");
  $("vq-fail-retry").onclick = () => startLevel(G.id, { endless: G.endless });
  $("vq-fail-home").onclick = () => { hide("vq-fail"); leaveGame(); };
  $("vq-win-chest").onclick = () => {
    hide("vq-win-chest");
    const kind = G.stars === 3 ? "diamond" : G.stars === 2 ? "iron" : "wood";
    hide("vq-win");
    openChest(kind, null, () => {
      show("vq-win"); show("vq-win-home");
      if (G.nextId) show("vq-win-next");
      if (G.boss && !G.endless) show("vq-win-bonus");
    });
  };
  $("vq-win-bonus").onclick = () => { hide("vq-win"); startLevel(G.id, { bonus: true }); };
  $("vq-win-next").onclick = () => { hide("vq-win"); leaveGame(); const n = G.nextId; selWorld = +n.match(/^w(\d)/)[1]; renderHome(); openIntro(n); };
  $("vq-win-home").onclick = () => { hide("vq-win"); const n = G.nextId; if (n) { selWorld = +n.match(/^w(\d)/)[1]; } leaveGame(); };
  $("vq-pause-btn").onclick = () => setPaused(true);
  $("vq-resume").onclick = () => setPaused(false);
  $("vq-quit").onclick = () => { hide("vq-pause"); leaveGame(); };
  $("vq-ability").onclick = useAbility;
  $("vq-left").addEventListener("pointerdown", e => { e.preventDefault(); setLane(G ? G.lane - 1 : 1); });
  $("vq-right").addEventListener("pointerdown", e => { e.preventDefault(); setLane(G ? G.lane + 1 : 1); });
  $("vq-jump").addEventListener("pointerdown", e => { e.preventDefault(); setPose("jump", 620); });
  $("vq-slide").addEventListener("pointerdown", e => { e.preventDefault(); setPose("slide", 800); });
  $("vq-dash").addEventListener("pointerdown", e => { e.preventDefault(); useDash(); });
  $("vq-endless-btn").onclick = () => { if (starsOf("w1l5") === 0) { toast("Beat World 1's boss first!"); return; } openIntro("endless"); };
  document.querySelectorAll("#vq-mode-seg button").forEach(b => b.onclick = () => { tenseMode = b.dataset.t === "1"; try { localStorage.setItem("vq_tense", tenseMode ? "1" : "0"); } catch (e) {} document.querySelectorAll("#vq-mode-seg button").forEach(x => x.classList.toggle("on", x === b)); });
  document.querySelectorAll("#vq-rival-seg button").forEach(b => b.onclick = () => { rivalPick = b.dataset.r; document.querySelectorAll("#vq-rival-seg button").forEach(x => x.classList.toggle("on", x === b)); });
  $("vq-daily-seed").onclick = () => { $("vq-seed").value = "DAY" + todayStr().replace(/-/g, ""); };
  document.addEventListener("keydown", e => {
    if (!G || G.finished || $("vq-game").classList.contains("hidden")) return;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { setPose("jump", 620); e.preventDefault(); return; }
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { setPose("slide", 800); e.preventDefault(); return; }
    if (e.key === "Shift" || e.key === "e" || e.key === "E") { useDash(); e.preventDefault(); return; }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { setLane(G.lane - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { setLane(G.lane + 1); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter") { useAbility(); e.preventDefault(); }
    else if (e.key === "Escape" || e.key === "p") setPaused(!G.paused);
  });
  let touchX = null;
  const field = $("vq-field");
  let touchY = null;
  field.addEventListener("pointerdown", e => { touchX = e.clientX; touchY = e.clientY; });
  field.addEventListener("pointerup", e => {
    if (touchX === null || !G) return;
    const dx = e.clientX - touchX, dy = touchY === null ? 0 : e.clientY - touchY; touchX = null; touchY = null;
    if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) setPose(dy < 0 ? "jump" : "slide", dy < 0 ? 620 : 800);
    else if (Math.abs(dx) > 28) setLane(G.lane + (dx > 0 ? 1 : -1));
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
