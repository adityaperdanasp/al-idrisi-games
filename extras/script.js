/* =================================================================
   Extras -- one page for every "spend your coins/gems" perk that isn't a
   cosmetic (PM round 9): Streak Freeze, Piggy Bank, Loadout, Pet
   Adventure, Lucky Wheel, Booster (+ more sections appended by later
   batches). Each section is a self-contained {id, render(el)} entry in
   SECTIONS; render() re-draws itself after any action, so no section
   depends on another's state except the shared wallet header.
   ================================================================= */
const LB = window.AIGLeaderboard;
const player = window.AIGPlayer && AIGPlayer.getPlayer();
const $ = id => document.getElementById(id);
const SECTIONS = [];

function mmss(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + "h " : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
}
function costLabel(c) { return c.coins ? `🪙${c.coins}` : `💎${c.gems}`; }
const FAIL = { "insufficient-funds": "Not enough coins/gems yet!", max: "You already have the max.", "daily-limit": "Come back tomorrow!", busy: "Already in progress.", cap: "That's over the limit.", "bad-amount": "Enter a whole number.", empty: "Nothing to take out.", "not-ready": "Not ready yet." };
function say(el, text) { const m = el.querySelector(".ex-msg"); if (m) m.textContent = text; }

function mount(section) {
  const el = document.createElement("section");
  el.className = "ex-card"; el.id = "ex-" + section.id;
  $("ex-sections").appendChild(el);
  section.el = el;
  section.refresh = () => section.render(el);
  section.refresh();
}
async function refreshWallet() {
  const w = await LB.getWallet();
  $("ex-wallet").innerHTML = `🪙 ${w.coins || 0} &nbsp;💎 ${w.gems || 0}`;
}

/* ---- 1. Streak Freeze ---- */
SECTIONS.push({ id: "freeze", async render(el) {
  const [n, streak] = await Promise.all([LB.getStreakFreezes(), LB.getStreak()]);
  el.innerHTML = `<h2>🧊 Streak Freeze</h2>
    <p class="ex-sub">Missed a day? A freeze covers it so your 🔥 streak doesn't reset (up to 2 missed days in a row).</p>
    <div class="ex-row"><span class="ex-stat">${n}/${LB.STREAK_FREEZE_MAX}</span><span class="ex-sub" style="margin:0">freezes · streak ${streak.count || 0} days</span>
    <button class="ex-btn" id="fz-buy" ${n >= LB.STREAK_FREEZE_MAX ? "disabled" : ""}>Buy ${costLabel(LB.STREAK_FREEZE_COST)}</button></div><div class="ex-msg"></div>`;
  el.querySelector("#fz-buy").onclick = async () => {
    const r = await LB.buyStreakFreeze();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy.");
    await refreshWallet(); await this.render(el); say(el, "🧊 Freeze added!");
  };
}});

/* ---- 2. Piggy Bank ---- */
SECTIONS.push({ id: "piggy", async render(el) {
  const p = await LB.getPiggy();
  el.innerHTML = `<h2>🐷 Piggy Bank</h2>
    <p class="ex-sub">Save coins and earn 10% interest every week (up to 4 weeks). Max ${LB.PIGGY_CAP} coins.</p>
    <div class="ex-row"><span class="ex-stat">🪙 ${p.amount}</span><span class="ex-sub" style="margin:0">+${p.interest} interest ready (${p.weeks} week${p.weeks === 1 ? "" : "s"})</span></div>
    <div class="ex-row" style="margin-top:10px"><input class="ex-input" id="pg-amt" type="number" min="1" value="20" inputmode="numeric">
    <button class="ex-btn" id="pg-dep">Deposit</button><button class="ex-btn alt" id="pg-wd" ${p.amount ? "" : "disabled"}>Take out all</button></div><div class="ex-msg"></div>`;
  el.querySelector("#pg-dep").onclick = async () => {
    const r = await LB.depositPiggy(Number(el.querySelector("#pg-amt").value));
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't deposit.");
    await refreshWallet(); await this.render(el); say(el, "🐷 Saved!");
  };
  el.querySelector("#pg-wd").onclick = async () => {
    const r = await LB.withdrawPiggy();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't withdraw.");
    await refreshWallet(); await this.render(el); say(el, `🪙 +${r.total} (${r.interest} was interest!)`);
  };
}});

/* ---- 3. Loadout ---- */
SECTIONS.push({ id: "loadout", async render(el) {
  const [inv, armed] = await Promise.all([LB.getInventory(), LB.getArmedLoadout()]);
  el.innerHTML = `<h2>🎒 Round Loadout</h2>
    <p class="ex-sub">Buy one-time items, then tap to <b>arm</b> one. It's used automatically at the start of your next Ninja Runner, Plane Mode or Boss Rush round.</p>
    <div class="ex-chip-row">${LB.LOADOUT_ITEMS.map(i => `
      <div class="ex-item${armed === i.id ? " armed" : ""}" data-arm="${i.id}">
        <div class="ex-item-emoji">${i.emoji}</div><div class="ex-item-name">${i.name}</div>
        <div class="ex-item-own">Owned: ${inv[i.id] || 0}${armed === i.id ? " · ARMED" : ""}</div>
        <button class="ex-btn" data-buy="${i.id}" style="margin-top:6px;padding:5px 10px;font-size:.72rem">${costLabel(i.cost)}</button>
      </div>`).join("")}</div>
    <p class="ex-sub" style="margin-top:8px">${LB.LOADOUT_ITEMS.map(i => `${i.emoji} ${i.desc}`).join(" · ")}</p><div class="ex-msg"></div>`;
  el.querySelectorAll("[data-buy]").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const r = await LB.buyLoadout(b.dataset.buy);
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy.");
    await refreshWallet(); await this.render(el); say(el, "🎒 Added to your bag!");
  });
  el.querySelectorAll("[data-arm]").forEach(c => c.onclick = async () => {
    const id = c.dataset.arm;
    const r = await LB.armLoadout(armed === id ? null : id);
    if (!r.ok) return say(el, "Buy one first!");
    await this.render(el);
    say(el, armed === id ? "Disarmed." : "✅ Armed for your next round!");
  });
}});

/* ---- 4. Pet Adventure ---- */
let petTimer = null;
SECTIONS.push({ id: "pet", async render(el) {
  clearInterval(petTimer);
  const a = await LB.getPetAdventure();
  const away = a.state === "away";
  el.innerHTML = `<h2>🐾 Pet Adventure</h2>
    <p class="ex-sub">Send your pet exploring for 1 hour. It comes back with loot — coins, a card, or even a gem! (${a.startsLeftToday} trips left today)</p>
    <div class="ex-row"><span class="ex-stat" id="pa-status">${a.state === "none" ? "At home 🏠" : a.state === "ready" ? "Back with loot! 🎁" : "Exploring…"}</span>
    ${a.state === "none" ? `<button class="ex-btn" id="pa-go" ${a.startsLeftToday ? "" : "disabled"}>Send ${costLabel(LB.PET_ADVENTURE_COST)}</button>` : ""}
    ${a.state === "ready" ? `<button class="ex-btn" id="pa-claim">Claim loot</button>` : ""}</div><div class="ex-msg"></div>`;
  if (away) petTimer = setInterval(() => {
    const left = a.endsAt - Date.now();
    if (left <= 0) { clearInterval(petTimer); this.render(el); return; }
    const s = el.querySelector("#pa-status"); if (s) s.textContent = "Back in " + mmss(left);
  }, 500);
  const go = el.querySelector("#pa-go");
  if (go) go.onclick = async () => {
    const r = await LB.startPetAdventure();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't start.");
    await refreshWallet(); await this.render(el);
  };
  const claim = el.querySelector("#pa-claim");
  if (claim) claim.onclick = async () => {
    const r = await LB.claimPetAdventure();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't claim.");
    await refreshWallet(); await this.render(el);
    const l = r.loot;
    say(el, l.type === "coins" ? `🪙 +${l.amount} coins!` : l.type === "gems" ? "💎 +1 gem!" : `🎴 New card: ${l.card ? l.card.emoji + " " + (l.card.name || "") : ""}`);
  };
}});

/* ---- 5. Lucky Wheel ---- */
let wheelRot = 0;
SECTIONS.push({ id: "wheel", async render(el) {
  const st = await LB.getWheelStatus();
  el.innerHTML = `<h2>🎡 Lucky Wheel</h2>
    <p class="ex-sub">1 free spin every day. Extra spins cost ${costLabel(LB.WHEEL_EXTRA_COST)} (${st.extraLeft} left today).</p>
    <div class="ex-wheel-wrap"><div class="ex-pointer">▼</div><div class="ex-wheel" id="wl-wheel">${LB.WHEEL_PRIZES.map((p, i) => `<span style="transform: rotate(${i * 45 + 22.5 - 90}deg) translate(34px, -8px)">${p.label.replace(/^💨 Nothing$/, "💨").replace(/^🎴 Card$/, "🎴").replace(" ", "")}</span>`).join("")}</div></div>
    <div class="ex-prize" id="wl-prize"></div>
    <div class="ex-row" style="justify-content:center"><button class="ex-btn" id="wl-spin" ${st.freeAvailable || st.extraLeft ? "" : "disabled"}>${st.freeAvailable ? "Spin (free!)" : "Spin " + costLabel(LB.WHEEL_EXTRA_COST)}</button></div><div class="ex-msg"></div>`;
  el.querySelector("#wl-spin").onclick = async () => {
    const btn = el.querySelector("#wl-spin"); btn.disabled = true;
    const r = await LB.spinWheel();
    if (!r.ok) { btn.disabled = false; return say(el, FAIL[r.reason] || "Couldn't spin."); }
    const wheel = el.querySelector("#wl-wheel");
    // Always spin forward from wherever the wheel currently sits (wheelRot is
    // module-level, since render() re-creates the element after every spin).
    wheelRot = (Math.floor(wheelRot / 360) + 6) * 360 - (r.prizeIndex * 45 + 22.5);
    wheel.style.transform = `rotate(${wheelRot}deg)`;
    setTimeout(async () => {
      await refreshWallet();
      const prize = el.querySelector("#wl-prize");
      const label = r.card ? `🎴 ${r.card.emoji}` : r.prize.label;
      await SECTIONS.find(s => s.id === "wheel").renderKeepWheel(el, label, wheel.style.transform);
    }, 4200);
  };
}, async renderKeepWheel(el, label, transform) {
  await this.render(el);
  const w = el.querySelector("#wl-wheel"); w.style.transition = "none"; w.style.transform = transform; void w.offsetWidth; w.style.transition = "";
  el.querySelector("#wl-prize").textContent = "You won: " + label + "!";
}});

/* ---- 8. Booster ---- */
let boostTimer = null;
SECTIONS.push({ id: "booster", async render(el) {
  clearInterval(boostTimer);
  const b = await LB.getBooster();
  el.innerHTML = `<h2>⚡ Coin Booster</h2>
    <p class="ex-sub">2× coins for 30 minutes in every game. Once per day.</p>
    <div class="ex-row"><span class="ex-stat" id="bo-status">${b.active ? "Active!" : "Off"}</span>
    <button class="ex-btn" id="bo-buy" ${b.boughtToday ? "disabled" : ""}>${b.boughtToday ? "Used today" : "Activate " + costLabel(LB.BOOSTER_COST)}</button></div><div class="ex-msg"></div>`;
  if (b.active) boostTimer = setInterval(() => {
    const left = b.until - Date.now();
    if (left <= 0) { clearInterval(boostTimer); this.render(el); return; }
    const s = el.querySelector("#bo-status"); if (s) s.textContent = "Active · " + mmss(left);
  }, 500);
  el.querySelector("#bo-buy").onclick = async () => {
    const r = await LB.buyBooster();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't activate.");
    await refreshWallet(); await this.render(el); say(el, "⚡ 2× coins for 30 minutes!");
  };
}});

/* ---- boot ---- */
if (!player || player.role === "parent" || !LB) {
  $("ex-page").innerHTML = '<div class="ex-topbar"><a href="../" class="ex-back">←</a><div class="ex-title">🎁 Extras</div></div><p class="ex-empty">Please sign in from the hub first.</p>';
} else {
  refreshWallet();
  SECTIONS.forEach(mount);
}
