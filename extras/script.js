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

/* ---- 7. Secret Modes ---- */
SECTIONS.push({ id: "secret", async render(el) {
  const modes = await LB.getSecretModes();
  el.innerHTML = `<h2>🗝️ Secret Modes</h2>
    <p class="ex-sub">Spend gems to unlock hidden game modes.</p>
    ${modes.map(m => `<div class="ex-row" style="margin-bottom:8px"><span style="font-size:1.6rem">${m.emoji}</span>
      <div style="flex:1;min-width:140px"><div style="font-weight:800;font-size:.85rem">${m.name}</div><div class="ex-sub" style="margin:0">${m.desc}</div></div>
      ${m.owned ? '<span class="ex-stat" style="font-size:.85rem">✅ Unlocked</span>' : `<button class="ex-btn" data-sec="${m.id}">${costLabel(m.cost)}</button>`}</div>`).join("")}<div class="ex-msg"></div>`;
  el.querySelectorAll("[data-sec]").forEach(b => b.onclick = async () => {
    const m = modes.find(x => x.id === b.dataset.sec);
    const r = await LB.unlockCosmetic("secret-mode", m.id, m.cost);
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't unlock.");
    await refreshWallet(); await this.render(el); say(el, `${m.emoji} ${m.name} unlocked!`);
  });
}});

/* ---- 9. Question Bounty ---- */
SECTIONS.push({ id: "bounty", async render(el) {
  const mine = (await LB.getMyCustomQuestions()).filter(q => q.status === "approved");
  el.innerHTML = `<h2>💰 Question Bounty</h2>
    <p class="ex-sub">Put ${LB.BOUNTY_MIN}–${LB.BOUNTY_MAX} coins on a Kids' Quiz question you wrote. The first classmate to answer it right wins the pot!</p>
    ${mine.length ? mine.map(q => `<div class="ex-row" style="margin-bottom:8px"><div style="flex:1;min-width:150px;font-weight:700;font-size:.8rem">${q.prompt.replace(/</g, "&lt;")}</div>
      ${q.bounty ? `<span class="ex-stat" style="font-size:.8rem">${q.bounty.claimedBy ? "✅ Won by a classmate" : "💰 " + q.bounty.amount + " on the line"}</span>`
        : `<input class="ex-input" style="width:60px" type="number" min="${LB.BOUNTY_MIN}" max="${LB.BOUNTY_MAX}" value="10" data-amt="${q.id}"><button class="ex-btn" data-bounty="${q.id}">Add</button>`}</div>`).join("")
      : '<p class="ex-empty">No approved questions yet — write one in Kids\' Quiz and get a parent to approve it!</p>'}<div class="ex-msg"></div>`;
  el.querySelectorAll("[data-bounty]").forEach(b => b.onclick = async () => {
    const r = await LB.setQuestionBounty(b.dataset.bounty, Number(el.querySelector(`[data-amt="${b.dataset.bounty}"]`).value));
    if (!r.ok) return say(el, FAIL[r.reason] || ({ "not-approved": "Only approved questions.", "already-set": "Already has a bounty." }[r.reason]) || "Couldn't add.");
    await refreshWallet(); await this.render(el); say(el, "💰 Bounty posted!");
  });
}});

/* ---- 10. Class Fund ---- */
SECTIONS.push({ id: "fund", async render(el) {
  const f = await LB.getClassFund();
  const next = f.tiers.find(t => !t.reached);
  const goal = next ? next.at : f.tiers[f.tiers.length - 1].at;
  el.innerHTML = `<h2>🏫 Class Fund</h2>
    <p class="ex-sub">The whole class chips in coins. Every milestone unlocks a bonus for EVERYONE.</p>
    <div class="ex-row"><span class="ex-stat">🪙 ${f.total} / ${goal}</span><span class="ex-sub" style="margin:0">you gave ${f.mine}</span></div>
    <div style="height:10px;border-radius:10px;background:#eee4f7;margin:8px 0;overflow:hidden"><div style="height:100%;width:${Math.min(100, Math.round(f.total / goal * 100))}%;background:linear-gradient(90deg,#f7c548,#e4572e)"></div></div>
    ${f.tiers.map(t => `<div class="ex-row" style="margin-bottom:4px"><span style="flex:1;font-weight:800;font-size:.8rem">${t.reached ? "✅" : "🔒"} ${t.label} <span class="ex-sub" style="display:inline;margin:0">(${t.at} coins)</span></span>
      ${t.reached && !t.claimed ? `<button class="ex-btn" data-tier="${t.index}">Claim ${t.coins ? "🪙" + t.coins : ""}${t.gems ? " 💎" + t.gems : ""}${t.cosmetic ? " " + esc(t.cosmetic.name) : ""}</button>` : t.claimed ? '<span class="ex-sub" style="margin:0">claimed</span>' : ""}</div>`).join("")}
    <div class="ex-row" style="margin-top:10px"><input class="ex-input" id="cf-amt" type="number" min="1" max="100" value="10"><button class="ex-btn" id="cf-give">Donate</button></div>
    ${f.donors.length ? `<p class="ex-sub" style="margin-top:8px">Top donors: ${f.donors.map(d => `${d.name} (${d.donated})`).join(", ")}</p>` : ""}<div class="ex-msg"></div>`;
  el.querySelector("#cf-give").onclick = async () => {
    const r = await LB.donateClassFund(Number(el.querySelector("#cf-amt").value));
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't donate.");
    await refreshWallet(); await this.render(el); say(el, "🏫 Thank you!");
  };
  el.querySelectorAll("[data-tier]").forEach(b => b.onclick = async () => {
    const r = await LB.claimClassFundTier(Number(b.dataset.tier));
    if (!r.ok) return say(el, "Not available.");
    await refreshWallet(); await this.render(el); say(el, `🎉 ${r.coins ? "+🪙" + r.coins : ""}${r.gems ? " +💎" + r.gems : ""}${r.cosmetic ? " · new: " + r.cosmetic.name + " (equip it in 🎨 Customize)" : ""}`);
  });
}});

/* ---- 11. Class Boss ---- */
SECTIONS.push({ id: "classboss", async render(el) {
  const b = await LB.getClassBoss();
  const pct = Math.max(0, Math.round((1 - Math.min(1, b.damage / b.hp)) * 100));
  el.innerHTML = `<h2>${b.boss.emoji} Class Boss: ${b.boss.name}</h2>
    <p class="ex-sub">Every correct answer by anyone in the class hurts today's boss. Beat it together — answer ${b.minHits}+ yourself to share the loot!</p>
    <div style="height:14px;border-radius:10px;background:#eee4f7;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#e4572e,#f7c548)"></div></div>
    <div class="ex-row" style="margin-top:6px"><span class="ex-stat">${Math.max(0, b.hp - b.damage)} / ${b.hp} HP</span><span class="ex-sub" style="margin:0">your hits: ${b.mine}</span></div>
    ${b.top.length ? `<p class="ex-sub">Top: ${b.top.map(t => `${t.name} (${t.hits})`).join(", ")}</p>` : ""}
    ${b.defeated ? (b.eligible ? (b.claimed ? '<p class="ex-sub">✅ Loot claimed today.</p>' : '<button class="ex-btn" id="cb-claim">🎁 Claim loot</button>') : `<p class="ex-sub">🎉 Defeated! (You needed ${b.minHits} hits to share the loot.)</p>`) : ""}<div class="ex-msg"></div>`;
  const c = el.querySelector("#cb-claim");
  if (c) c.onclick = async () => {
    const r = await LB.claimClassBoss();
    if (!r.ok) return say(el, "Not available.");
    await refreshWallet(); await this.render(el); say(el, `🪙 +${r.coins}${r.card ? " · 🎴 " + r.card.emoji : ""}`);
  };
}});

/* ---- 16. Team Battle ---- */
SECTIONS.push({ id: "team", async render(el) {
  const t = await LB.getTeamBattle();
  const sum = t.cur.red + t.cur.blue;
  const redPct = sum ? Math.round(t.cur.red / sum * 100) : 50;
  const nm = k => k === "red" ? "🔴 Red" : "🔵 Blue";
  el.innerHTML = `<h2>⚔️ Team Battle</h2>
    <p class="ex-sub">You're on <b>${nm(t.myTeam)}</b>. All correct answers this week count for your team.</p>
    <div style="display:flex;height:16px;border-radius:10px;overflow:hidden"><div style="width:${redPct}%;background:#e4572e"></div><div style="flex:1;background:#4a90d9"></div></div>
    <div class="ex-row" style="justify-content:space-between;margin-top:4px"><span class="ex-stat" style="font-size:.9rem">🔴 ${t.cur.red}</span><span class="ex-sub" style="margin:0">your hits: ${t.myCur}</span><span class="ex-stat" style="font-size:.9rem">🔵 ${t.cur.blue}</span></div>
    <p class="ex-sub">Last week: ${t.prevWinner ? nm(t.prevWinner) + " won (" + t.prev.red + " vs " + t.prev.blue + ")" : "no winner"}.</p>
    ${t.eligible ? (t.claimed ? '<p class="ex-sub">✅ Winner reward claimed.</p>' : '<button class="ex-btn" id="tm-claim">🏆 Claim winner reward</button>') : t.prevWinner === t.myTeam ? `<p class="ex-sub">Your team won — but you needed ${t.minHits}+ correct last week to share the reward.</p>` : ""}<div class="ex-msg"></div>`;
  const c = el.querySelector("#tm-claim");
  if (c) c.onclick = async () => {
    const r = await LB.claimTeamReward();
    if (!r.ok) return say(el, "Not available.");
    await refreshWallet(); await this.render(el); say(el, "🪙 +20 · 💎 +1!");
  };
}});

/* ---- 13. Bo's Story ---- */
const STORY = [
  { at: 0, title: "Bo Wakes Up", text: "Bo the little brain opens two sleepy eyes. \"Where am I?\" The world of BrainBox glows all around — numbers floating like fireflies, words fluttering like butterflies. \"I think I'm supposed to help someone learn,\" Bo whispers. That someone is YOU!" },
  { at: 20, title: "The Number Forest", text: "Bo hops into the Number Forest. Trees grow taller every time you answer right! \"Look — a 7 tree and an 8 tree. If they hold hands, they make 56!\" Bo giggles. Together you count all the way to the forest edge." },
  { at: 50, title: "The Word River", text: "A shimmering river of letters flows past. Some words sink, some float. \"Antonyms and synonyms — opposites and twins!\" says Bo, building a bridge from 'happy' to 'glad'. You cross without getting wet." },
  { at: 100, title: "Star Harbor", text: "Night falls and stars drip from the sky like honey. Bo climbs a ladder of light to a tiny harbor between planets. \"Every star was once a cloud,\" Bo explains. \"Just like you were once new to all this — and look how far you've come!\"" },
  { at: 200, title: "The Dino Chase", text: "RAWR! A dino bursts out of the fog. Bo squeaks and jumps into a car (the Blaze, of course). \"Don't panic — think! Splash him with water and ZOOM with nitro!\" You both escape, laughing so hard the dino starts laughing too." },
  { at: 350, title: "Boss of the Arena", text: "Ogres, werewolves, and a Dragon Lord line up in the arena. Bo whispers, \"Three right answers in a row and you can unleash a SPECIAL MOVE.\" You do. The whole arena shakes. Bo does a tiny victory dance." },
  { at: 500, title: "The Secret Mountain", text: "Beyond the clouds sits a mountain nobody has climbed. Bo tightens tiny boots. \"Hard problems are just mountains you haven't climbed YET.\" Step by step, answer by answer, you both reach the top and see the whole BrainBox world sparkling below." },
  { at: 800, title: "Bo's Big Secret", text: "At the summit Bo finally tells you the secret: \"I'm not just a brain. I'm YOUR brain — every question you've answered made me grow.\" Bo glows brighter than any star. \"Thank you for learning with me. Ready for the next adventure?\"" }
];
SECTIONS.push({ id: "story", async render(el) {
  const [title, read] = await Promise.all([LB.getTitle(), LB.getStoryRead()]);
  const total = title ? title.count : 0;
  el.innerHTML = `<h2>📖 Bo's Story</h2>
    <p class="ex-sub">A new chapter unlocks as you answer more questions (${total} so far). Read each one for the first time to earn 🪙${LB.STORY_READ_REWARD}!</p>
    ${STORY.map((ep, i) => {
      const open = total >= ep.at;
      return `<div class="ex-row" style="margin-bottom:6px"><span style="flex:1;font-weight:800;font-size:.82rem">${open ? (read["e" + i] ? "✅" : "📗") : "🔒"} ${i + 1}. ${open ? ep.title : "???"}${open ? "" : ` <span class="ex-sub" style="display:inline;margin:0">(unlocks at ${ep.at} correct)</span>`}</span>
        ${open ? `<button class="ex-btn alt" data-ep="${i}">Read</button>` : ""}</div>`;
    }).join("")}
    <div id="st-reader" style="display:none;background:#fdf6ea;border-radius:12px;padding:12px;margin-top:8px"><div id="st-title" style="font-family:'Baloo 2',sans-serif;font-weight:800"></div><p id="st-text" style="font-weight:700;font-size:.82rem;line-height:1.5;margin:6px 0 0"></p></div><div class="ex-msg"></div>`;
  el.querySelectorAll("[data-ep]").forEach(b => b.onclick = async () => {
    const i = Number(b.dataset.ep);
    const r = await LB.markStoryRead(i);
    el.querySelector("#st-reader").style.display = "block";
    el.querySelector("#st-title").textContent = STORY[i].title;
    el.querySelector("#st-text").textContent = STORY[i].text;
    if (r.first) { await refreshWallet(); say(el, `🪙 +${r.coins} for reading!`); b.textContent = "Read ✅"; }
  });
}});

/* ---- 14. Mastery Map ---- */
SECTIONS.push({ id: "mastery", async render(el) {
  const GAMES = [
    { id: "mathville", label: "🏘️ MathVille", href: t => `../mathville/index.html?focus=1&quicktopic=math:${encodeURIComponent(t)}` },
    { id: "solarquest", label: "🪐 SolarQuest", href: t => `../mathville/index.html?focus=1&quicktopic=sci:${encodeURIComponent(t)}` },
    { id: "language-arts", label: "📖 Language & Arts", href: null }
  ];
  const maps = await Promise.all(GAMES.map(g => LB.getMasteryMap(g.id)));
  const pretty = t => t.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  let total = 0, mastered = 0;
  const body = GAMES.map((g, i) => {
    const entries = Object.entries(maps[i]).filter(([t]) => !["drive-mode", "plane-mode", "ninja-runner", "speed-round", "focus-round", "azka-pr", "weekly-boss-rush", "perk-test"].includes(t));
    if (!entries.length) return "";
    entries.forEach(([, m]) => { total++; if (m) mastered++; });
    return `<div class="ex-sub" style="margin:8px 0 4px;font-weight:800;color:#3d2e22">${g.label}</div><div class="ex-chip-row">${entries.map(([t, m]) =>
      `<${g.href && !m ? `a href="${g.href(t)}"` : "span"} class="ex-item" style="text-decoration:none;color:inherit;flex:0 1 auto;padding:6px 10px;${m ? "background:#e5f5e8" : ""}"><span style="font-weight:800;font-size:.72rem">${m ? "⭐" : "🔓"} ${pretty(t)}</span></${g.href && !m ? "a" : "span"}>`).join("")}</div>`;
  }).join("");
  el.innerHTML = `<h2>🗺️ Mastery Map</h2>
    <p class="ex-sub">${total ? `${mastered}/${total} topics mastered.` : "Play a few rounds and your topics show up here."} Tap a 🔓 topic to practice it (⭐ = mastered).</p>${body}`;
}});

/* ---- 20. Calendar ---- */
let calOffset = 0;
SECTIONS.push({ id: "calendar", async render(el) {
  const now = new Date();
  const d0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + calOffset, 1));
  const y = d0.getUTCFullYear(), m = d0.getUTCMonth();
  const { days } = await LB.getCalendarMonth(y, m);
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const startDow = (d0.getUTCDay() + 6) % 7; // Monday-first
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("");
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push("");
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const active = Object.keys(days).length;
  const label = d0.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  el.innerHTML = `<h2>🗓️ ${label}</h2>
    <p class="ex-sub">⭐ = a day you played. A full week of stamps earns a 🏅 medal. ${active} day${active === 1 ? "" : "s"} this month!</p>
    <div style="display:grid;grid-template-columns:repeat(7,1fr) 28px;gap:4px;text-align:center;font-weight:800;font-size:.7rem">
      ${["M","T","W","T","F","S","S"].map(x => `<div style="color:#8a7a6a">${x}</div>`).join("")}<div></div>
      ${weeks.map(w => { const played = w.filter(d => d && days[d]).length; const full = w.filter(Boolean).length === 7 && played === 7;
        return w.map(d => `<div style="aspect-ratio:1;border-radius:8px;display:grid;place-items:center;${d ? (days[d] ? "background:#ffe9a8" : "background:#fdf6ea") : ""}">${d ? (days[d] ? "⭐" : d) : ""}</div>`).join("") + `<div style="display:grid;place-items:center">${full ? "🏅" : ""}</div>`; }).join("")}
    </div>
    <div class="ex-row" style="justify-content:space-between;margin-top:10px"><button class="ex-btn alt" id="cal-prev">◀</button><button class="ex-btn alt" id="cal-next" ${calOffset >= 0 ? "disabled" : ""}>▶</button></div>`;
  el.querySelector("#cal-prev").onclick = () => { calOffset--; this.render(el); };
  el.querySelector("#cal-next").onclick = () => { calOffset++; this.render(el); };
}});

/* =================================================================
   PM round 10, batch 2 -- shown at the TOP of the page (moved to the front
   below): Season, Flash Challenge, Rotating Shop, Mystery Egg, Dino.
   ================================================================= */
const R10_START = SECTIONS.length;

/* ---- 9. Season banner ---- */
SECTIONS.push({ id: "season", async render(el) {
  const st = await LB.getSeasonStatus();
  if (!st) { el.style.display = "none"; return; }
  el.style.display = "";
  el.style.background = "linear-gradient(135deg,#fff3c4,#ffd9ec)";
  el.innerHTML = `<h2>${st.season.emoji} ${st.season.name}</h2>
    <p class="ex-sub" style="color:#6b3f9b;font-size:.85rem">${st.season.msg}</p>
    <div class="ex-row"><button class="ex-btn" id="ss-claim" ${st.claimed ? "disabled" : ""}>${st.claimed ? "Gift opened ✓" : "🎁 Open seasonal gift (🪙20 💎1)"}</button></div><div class="ex-msg"></div>`;
  el.querySelector("#ss-claim").onclick = async () => {
    const r = await LB.claimSeasonGift();
    if (!r.ok) return say(el, FAIL[r.reason] || "Already opened!");
    await refreshWallet(); await this.render(el); say(el, "🎉 Happy holidays! +🪙20 +💎1");
  };
}});

/* ---- 13. Flash Challenge ---- */
SECTIONS.push({ id: "flash", async render(el) {
  const [st, board] = await Promise.all([LB.getFlashStatus(), LB.getFlashBoard()]);
  const me = player.id;
  el.innerHTML = `<h2>⚡ Flash Challenge</h2>
    <p class="ex-sub">60 seconds, mixed questions. Best of ${LB.FLASH_MAX_PLAYS} tries a day goes on the class board. Coins for your first 2 tries — today's bonus: <b>×${st.mult}</b>!</p>
    <div class="ex-row"><span class="ex-stat">Best ${st.best}</span><span class="ex-sub" style="margin:0">${st.left} ${st.left === 1 ? "try" : "tries"} left today</span>
    <a class="ex-btn" style="text-decoration:none;${st.left ? "" : "opacity:.45;pointer-events:none"}" href="../mathville/index.html?flash=1">Play ⚡</a></div>
    <div style="margin-top:10px">${board.length ? board.map((b, i) => `<div class="ex-row" style="justify-content:space-between;padding:4px 0;${b.id === me ? "font-weight:800;color:#8c2f6b" : ""}"><span>${["🥇","🥈","🥉"][i] || (i + 1) + "."} ${b.name}</span><span>${b.best}</span></div>`).join("") : '<div class="ex-empty">No scores yet today — be the first!</div>'}</div>`;
}});

/* ---- 11. Rotating Shop ---- */
let shopTimer = null;
SECTIONS.push({ id: "shop", async render(el) {
  clearInterval(shopTimer);
  const shop = await LB.getRotatingShop();
  const cost = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
  el.innerHTML = `<h2>🛍️ Rotating Shop</h2>
    <p class="ex-sub">4 items, 35% off — new picks in <b id="sh-left"></b>.</p>
    <div class="ex-chip-row">${shop.items.map((it, i) => `<button class="ex-item" data-i="${i}" ${it.owned ? "disabled" : ""}>
      <div class="ex-item-emoji">${it.preview}</div><div class="ex-item-name">${it.name}</div>
      <div class="ex-item-own">${it.owned ? "Owned ✓" : `<s>${cost(it.originalCost)}</s> <b>${cost(it.cost)}</b>`}</div></button>`).join("")}</div><div class="ex-msg"></div>`;
  const tick = () => { const n = el.querySelector("#sh-left"); if (n) n.textContent = mmss(shop.endsAt - Date.now()); if (shop.endsAt <= Date.now()) { clearInterval(shopTimer); this.render(el); } };
  tick(); shopTimer = setInterval(tick, 1000);
  el.querySelectorAll(".ex-item").forEach(b => b.onclick = async () => {
    const it = shop.items[+b.dataset.i];
    const r = await LB.unlockCosmetic(it.type, it.id, it.cost);
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy.");
    await refreshWallet(); await this.render(el); say(el, `${it.preview} ${it.name} is yours! Equip it in 🎨 Customize.`);
  });
}});

/* ---- 12. Mystery Egg ---- */
const RARITY = { common: ["Common", "#9aa5b1"], rare: ["Rare", "#3b82f6"], epic: ["Epic", "#a855f7"], legendary: ["Legendary", "#f59e0b"] };
SECTIONS.push({ id: "gacha", async render(el) {
  const g = await LB.getGachaStatus();
  el.innerHTML = `<h2>🥚 Mystery Egg</h2>
    <p class="ex-sub">Crack an egg for a random cosmetic you don't own yet. Every ${g.pityAt + 1}th egg without an Epic is guaranteed Epic or better. ${g.left}/${g.total} still to find.</p>
    <div id="gc-stage" style="text-align:center;font-size:3.4rem;min-height:84px;line-height:84px">🥚</div>
    <div id="gc-result" class="ex-prize"></div>
    <div class="ex-row" style="justify-content:center"><button class="ex-btn" id="gc-1">1 egg 🪙${LB.GACHA_COST}</button><button class="ex-btn alt" id="gc-5">5 eggs 🪙${LB.GACHA_X5_COST}</button></div>
    <div class="ex-sub" style="text-align:center;margin:8px 0 0">Pity: ${g.pity}/${g.pityAt} · eggs opened: ${g.rolls}</div><div class="ex-msg"></div>`;
  const stage = el.querySelector("#gc-stage"), res = el.querySelector("#gc-result");
  const go = async n => {
    el.querySelectorAll(".ex-btn").forEach(b => b.disabled = true);
    stage.style.transition = "transform .12s"; let k = 0;
    const shake = setInterval(() => { stage.style.transform = `rotate(${k++ % 2 ? 14 : -14}deg) scale(1.1)`; }, 120);
    const r = await LB.rollGacha(n);
    await new Promise(x => setTimeout(x, 900));
    clearInterval(shake); stage.style.transform = "none";
    if (!r.ok) { stage.textContent = "🥚"; await this.render(el); return say(el, FAIL[r.reason] || "Something went wrong — your coins are safe."); }
    stage.textContent = "💥";
    await refreshWallet();
    const html = r.results.map(x => x.refund ? `<div>🪙 Own everything! +${x.refund} back</div>` : `<div style="color:${RARITY[x.rarity][1]}">${x.preview} <b>${x.name}</b> — ${RARITY[x.rarity][0]}!</div>`).join("");
    const top = r.results.find(x => x.rarity === "legendary") || r.results.find(x => x.rarity === "epic") || r.results[0];
    setTimeout(async () => { await this.render(el); el.querySelector("#gc-stage").textContent = top && top.preview ? top.preview : "🎉"; el.querySelector("#gc-result").innerHTML = html; if (window.AIGSkin && r.results.some(x => x.rarity === "epic" || x.rarity === "legendary")) AIGSkin.burst(innerWidth / 2, innerHeight / 2); }, 350);
  };
  el.querySelector("#gc-1").onclick = () => go(1);
  el.querySelector("#gc-5").onclick = () => go(5);
}});

/* ---- 4. Dino Companion ---- */
SECTIONS.push({ id: "dino", async render(el) {
  const d = await LB.getDino();
  const cost = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
  const pct = d.next ? Math.min(100, Math.round(d.total / d.next.need * 100)) : 100;
  el.innerHTML = `<h2>🦖 Dino Companion</h2>
    <p class="ex-sub">Your very own dino! Answer questions to help it grow, then pay to evolve it. Reach Mega Rex to unlock the free Mega Rex chasing-dino skin.</p>
    <div style="text-align:center"><div style="font-size:${3 + d.stage * .7}rem;line-height:1.1">${d.def.emoji}</div><div class="ex-stat">${d.def.name}</div></div>
    <div class="ex-row" style="justify-content:center;margin:8px 0">${d.stages.map((s, i) => `<span style="font-size:1.1rem;opacity:${i <= d.stage ? 1 : .3}">${s.emoji}</span>`).join('<span style="opacity:.4">›</span>')}</div>
    ${d.next ? `<div style="background:#eee4f7;border-radius:100px;height:10px;overflow:hidden"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c08be8,#8c2f6b)"></div></div>
    <div class="ex-sub" style="text-align:center;margin:6px 0 10px">${d.total}/${d.next.need} correct answers to evolve into ${d.next.name}</div>
    <div class="ex-row" style="justify-content:center"><button class="ex-btn" id="dn-go" ${d.total >= d.next.need ? "" : "disabled"}>${d.stage === 0 ? "Hatch" : "Evolve"} ${cost(d.next.cost)}</button></div>` : '<div class="ex-sub" style="text-align:center">Fully grown! 🎉 Equip Mega Rex in 🎨 Customize → Dino Skin.</div>'}<div class="ex-msg"></div>`;
  const b = el.querySelector("#dn-go");
  if (b) b.onclick = async () => {
    const r = await LB.evolveDino();
    if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't evolve.");
    await refreshWallet(); await this.render(el); say(el, `${r.def.emoji} It grew into ${r.def.name}!`);
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 2);
  };
}});

// Newest features first: pull this batch's sections to the front.
SECTIONS.unshift(...SECTIONS.splice(R10_START));

/* =================================================================
   PM round 10, batch 3 -- Adventure, Clubs, Tournament, Card Battle,
   Garden, Parent Missions, Certificates (also pulled to the top).
   ================================================================= */
const R10B_START = SECTIONS.length;
const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// A small local quiz generator (tier 1 easy / 2 medium / 3 hard) for the
// adventure gates and card battles -> { prompt, options[4], answer }.
function makeQuiz(tier) {
  let prompt, ans;
  if (tier <= 1) { const a = rnd(12, 60), b = rnd(11, 39); if (Math.random() < .5) { prompt = `${a} + ${b} = ?`; ans = a + b; } else { const x = Math.max(a, b), y = Math.min(a, b); prompt = `${x} − ${y} = ?`; ans = x - y; } }
  else if (tier === 2) { const a = rnd(6, 12), b = rnd(3, 9); prompt = `${a} × ${b} = ?`; ans = a * b; }
  else { const a = rnd(12, 25), b = rnd(3, 9); prompt = `${a} × ${b} = ?`; ans = a * b; }
  const opts = new Set([ans]);
  while (opts.size < 4) { const d = rnd(1, 9) * (Math.random() < .5 ? -1 : 1) * (tier > 1 ? 2 : 1); if (ans + d > 0) opts.add(ans + d); }
  return { prompt, options: shuf([...opts]), answer: ans };
}

/* ---- 14. Bo's Adventure (season 2) ---- */
const ADV = {
  start: { text: "Bo finds a glowing map in the Number Forest. Two paths shine: the Whispering Woods 🌲 and Crystal Mountain 🏔️.", choices: [["🌲 Whispering Woods", "woods", 1], ["🏔️ Crystal Mountain", "mountain", 1]] },
  woods: { text: "A wise owl blocks a rushing river. \"Cross,\" hoots the owl, \"and I'll show you the way!\"", choices: [["🌉 Build a bridge", "end-builder", 2], ["🐟 Ride a giant fish", "cave", 1]] },
  mountain: { text: "An ice door glitters with a lock made of numbers.", choices: [["🔑 Pick the lock", "treasure", 2], ["🔨 Smash it!", "end-oops", 1]] },
  cave: { text: "In a warm cave, a sleepy dragon snores on a pile of shiny things — and there sits the Number Crystal!", choices: [["🤫 Tiptoe past", "end-hero", 3], ["🎵 Sing a lullaby", "end-friend", 2]] },
  treasure: { text: "Inside the mountain: the Number Crystal… and a tiny dragon egg that wiggles!", choices: [["💎 Take the crystal", "end-hero", 3], ["🥚 Take the egg", "end-friend", 1]] },
  "end-hero": { ending: "hero", title: "🏆 Crystal Hero", text: "Bo carries the Number Crystal home and the whole forest lights up. Everyone cheers your name!" },
  "end-friend": { ending: "friend", title: "🐉 Dragon Friend", text: "The dragon wakes up, hugs Bo (gently!) and becomes your best friend. It gives you a ride home." },
  "end-builder": { ending: "builder", title: "🌉 Master Builder", text: "Your bridge is so good the owl makes you the forest's official builder. Bo hangs the blueprint on the wall." },
  "end-oops": { ending: "oops", title: "🧊 The Great Slip", text: "SMASH! The door slides open… and Bo slides all the way down the mountain. Wheeee! (The crystal can wait.)" }
};
let advGate = null;
SECTIONS.push({ id: "adventure", async render(el) {
  const a = await LB.getAdventure();
  const node = ADV[a.node] || ADV.start;
  const endCount = Object.keys(a.endings).length;
  let body;
  if (node.ending) {
    const r = await LB.claimAdventureEnding(node.ending);
    if (r.first) refreshWallet();
    body = `<div class="ex-prize" style="font-size:1.2rem">${node.title}</div><p class="ex-sub" style="font-size:.85rem">${node.text}</p>
      ${r.first ? `<div class="ex-msg">🎉 New ending! +🪙${r.coins}</div>` : ""}<button class="ex-btn" id="ad-again">Start a new adventure</button>`;
  } else if (advGate) {
    const g = advGate;
    body = `<p class="ex-sub" style="font-size:.85rem">${node.text}</p><div class="ex-prize">🧠 Solve it to go: ${g.label}</div><div class="ex-prize" style="font-size:1.3rem">${g.q.prompt}</div>
      <div class="ex-chip-row">${g.q.options.map(o => `<button class="ex-item" data-ans="${o}"><span class="ex-item-name">${o}</span></button>`).join("")}</div><div class="ex-msg"></div><button class="ex-btn alt" id="ad-back" style="margin-top:8px">← Choose again</button>`;
  } else {
    body = `<p class="ex-sub" style="font-size:.85rem">${node.text}</p><div class="ex-chip-row">${node.choices.map((c, i) => `<button class="ex-item" data-c="${i}"><span class="ex-item-name">${c[0]}</span><span class="ex-item-own">${["★", "★★", "★★★"][c[2] - 1]} puzzle</span></button>`).join("")}</div>`;
  }
  el.innerHTML = `<h2>🗺️ Bo's Adventure</h2><p class="ex-sub" style="margin-bottom:4px">Season 2 · ${endCount}/4 endings found — each new ending pays 🪙${LB.ADVENTURE_ENDING_COINS}.</p>${body}`;
  const again = el.querySelector("#ad-again");
  if (again) again.onclick = async () => { advGate = null; await LB.saveAdventureNode("start"); this.render(el); };
  const back = el.querySelector("#ad-back");
  if (back) back.onclick = () => { advGate = null; this.render(el); };
  el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { const c = node.choices[+b.dataset.c]; advGate = { label: c[0], to: c[1], tier: c[2], q: makeQuiz(c[2]) }; this.render(el); });
  el.querySelectorAll("[data-ans]").forEach(b => b.onclick = async () => {
    if (+b.dataset.ans === advGate.q.answer) {
      const to = advGate.to; advGate = null;
      await LB.saveAdventureNode(to); this.render(el);
    } else { advGate.q = makeQuiz(advGate.tier); say(el, "Oops! Bo gets a new puzzle — try again 💪"); setTimeout(() => this.render(el), 700); }
  });
}});

/* ---- 15. Clubs ---- */
SECTIONS.push({ id: "club", async render(el) {
  const mine = await LB.getMyClub();
  if (mine) {
    const pct = Math.min(100, Math.round(mine.score / mine.goal * 100));
    el.innerHTML = `<h2>${esc(mine.emoji)} ${esc(mine.name)}</h2>
      <p class="ex-sub">Your club's answers this week add up. Reach the goal and every member can claim 🪙${mine.reward}.</p>
      <div style="background:#eee4f7;border-radius:100px;height:12px;overflow:hidden"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c08be8,#8c2f6b)"></div></div>
      <div class="ex-sub" style="margin:6px 0 10px">${mine.score}/${mine.goal} correct this week</div>
      ${mine.members.map(m => `<div class="ex-row" style="justify-content:space-between;padding:3px 0"><span>${m.id === player.id ? "⭐ " : ""}${esc(m.name)}</span><b>${m.score}</b></div>`).join("")}
      <div class="ex-row" style="margin-top:10px"><button class="ex-btn" id="cl-claim" ${mine.claimed || mine.score < mine.goal ? "disabled" : ""}>${mine.claimed ? "Claimed ✓" : "Claim goal reward"}</button><button class="ex-btn alt" id="cl-leave">Leave club</button></div><div class="ex-msg"></div>`;
    el.querySelector("#cl-claim").onclick = async () => { const r = await LB.claimClubGoal(); if (!r.ok) return say(el, FAIL[r.reason] || "Not yet!"); await refreshWallet(); await this.render(el); say(el, `🎉 +🪙${r.coins}`); };
    el.querySelector("#cl-leave").onclick = async () => { if (confirm("Leave this club?")) { await LB.leaveClub(); this.render(el); } };
    return;
  }
  const clubs = await LB.listClubs();
  el.innerHTML = `<h2>🏰 Clubs</h2><p class="ex-sub">Team up with up to ${LB.CLUB_MAX} friends. Your answers add up on the weekly club board.</p>
    <div class="ex-row"><input class="ex-input" id="cl-name" maxlength="20" placeholder="Club name" style="width:150px"><input class="ex-input" id="cl-emoji" maxlength="2" value="🏰" style="width:56px;text-align:center"><button class="ex-btn" id="cl-make">Create</button></div><div class="ex-msg"></div>
    <div style="margin-top:10px">${clubs.length ? clubs.map((c, i) => `<div class="ex-row" style="justify-content:space-between;padding:4px 0"><span>${["🥇","🥈","🥉"][i] || (i + 1) + "."} ${esc(c.emoji)} <b>${esc(c.name)}</b> <small>(${c.size}/${LB.CLUB_MAX})</small></span><span>${c.score} <button class="ex-btn alt" data-join="${esc(c.id)}" ${c.full ? "disabled" : ""} style="padding:5px 10px">${c.full ? "Full" : "Join"}</button></span></div>`).join("") : '<div class="ex-empty">No clubs yet — start the first one!</div>'}</div>`;
  const F = { taken: "That name is taken.", "bad-name": "Pick a name (3+ letters).", full: "That club is full.", "in-club": "You're already in a club.", gone: "That club is gone." };
  el.querySelector("#cl-make").onclick = async () => { const r = await LB.createClub(el.querySelector("#cl-name").value, el.querySelector("#cl-emoji").value); if (!r.ok) return say(el, F[r.reason] || "Couldn't create."); this.render(el); };
  el.querySelectorAll("[data-join]").forEach(b => b.onclick = async () => { const r = await LB.joinClub(b.dataset.join); if (!r.ok) return say(el, F[r.reason] || "Couldn't join."); this.render(el); });
}});

/* ---- 16. Weekend Tournament ---- */
SECTIONS.push({ id: "tourney", async render(el) {
  const t = await LB.getTournament();
  const nm = e => e ? esc(e.name) : "—";
  const match = m => `<div style="background:#fdf6ea;border-radius:10px;padding:6px 10px;margin:4px 0;font-size:.78rem"><div style="${m.win && m.a && m.win.id === m.a.id ? "font-weight:800;color:#8c2f6b" : ""}">${nm(m.a)} <span style="float:right">${m.sa}</span></div><div style="${m.win && m.b && m.win.id === m.b.id ? "font-weight:800;color:#8c2f6b" : ""}">${nm(m.b)} <span style="float:right">${m.sb}</span></div></div>`;
  const cur = t.current;
  const live = t.phase === "live" && cur.entrants.length >= 2;
  const shown = cur.rounds.filter(r => r.some(m => m.a && m.b)); // hide rounds that are only byes
  el.innerHTML = `<h2>🏆 Weekend Tournament</h2>
    <p class="ex-sub">Sign up Mon–Fri (first ${t.size} in). On the weekend, play ⚡ Flash Challenge: quarter-finals = Saturday's best score, semi-finals = Sunday's, final = both days added. Winner earns a title + 🪙${t.reward.coins} 💎${t.reward.gems}.</p>
    <div class="ex-row"><span class="ex-stat">${cur.entrants.length}/${t.size}</span><span class="ex-sub" style="margin:0">signed up · ${t.phase === "entry" ? "sign-ups open" : "matches are live"} · ${t.titles} title${t.titles === 1 ? "" : "s"} won</span>
    ${t.phase === "entry" ? `<button class="ex-btn" id="tn-join" ${t.mine || cur.entrants.length >= t.size ? "disabled" : ""}>${t.mine ? "You're in ✓" : "Sign up"}</button>` : ""}</div>
    <div class="ex-row" style="margin-top:6px"><span class="ex-sub" style="margin:0">💰 VIP pot: 🪙${cur.pot}${t.mine && t.phase === "entry" ? "" : ""}</span>${t.phase === "entry" && t.mine ? `<button class="ex-btn alt" id="tn-ticket" ${cur.tickets[player.id] ? "disabled" : ""}>${cur.tickets[player.id] ? "Ticket bought ✓" : `🎟️ VIP ticket 🪙${LB.TOURNEY_TICKET}`}</button>` : ""}</div>
    ${t.canClaim ? `<div class="ex-row" style="margin-top:8px"><button class="ex-btn" id="tn-claim">🏆 You won last week! Claim prize${t.last.pot ? ` (+ 🪙${t.last.pot} pot)` : ""}</button></div>` : ""}
    <div class="ex-msg"></div>
    ${live ? shown.map((r, i) => `<div class="ex-sub" style="margin:8px 0 2px;font-weight:800;color:#3d2e22">${["Quarter-finals", "Semi-finals", "Final"].slice(3 - shown.length)[i]}</div>${r.map(match).join("")}`).join("") + (cur.champion ? `<div class="ex-prize">👑 Leading: ${nm(cur.champion)}</div>` : "")
      : cur.entrants.length ? `<div class="ex-chip-row" style="margin-top:8px">${cur.entrants.map(e => `<span class="ex-item" style="flex:0 1 auto;padding:6px 10px;font-weight:800;font-size:.74rem;cursor:default">${esc(e.name)}</span>`).join("")}</div>` : ""}
    ${t.last.entrants.length >= 2 && t.last.champion ? `<div class="ex-sub" style="margin-top:10px">Last week's champion: <b>👑 ${esc(t.last.champion.name)}</b></div>` : ""}`;
  const j = el.querySelector("#tn-join");
  if (j) j.onclick = async () => { const r = await LB.enterTournament(); if (!r.ok) return say(el, r.reason === "full" ? "The bracket is full!" : "Sign-ups are closed."); this.render(el); };
  const tk = el.querySelector("#tn-ticket");
  if (tk) tk.onclick = async () => { const r = await LB.buyTournamentTicket(); if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy a ticket."); await refreshWallet(); await this.render(el); say(el, "🎟️ Ticket bought — the champion wins the whole pot!"); };
  const c = el.querySelector("#tn-claim");
  if (c) c.onclick = async () => { const r = await LB.claimTournamentTitle(); if (!r.ok) return say(el, "Not ready."); await refreshWallet(); await this.render(el); say(el, "👑 Champion! Prize paid."); };
}});

/* ---- 17. Card Battle ---- */
const RAR_BASE = { common: 3, rare: 5, epic: 7, legendary: 9 };
const cardAtk = c => (RAR_BASE[c.rarity] || 3) + (String(c.id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3);
let battleSel = [];
SECTIONS.push({ id: "battle", async render(el) {
  const [col, st] = await Promise.all([LB.getCollection(), LB.getBattleStatus()]);
  const mine = col.pool.filter(c => col.owned[c.id]);
  if (mine.length < 3) { el.innerHTML = `<h2>⚔️ Card Battle</h2><p class="ex-sub">Collect 3 cards first (they drop from daily bonuses, the season pass and boss wins), then bring them here to battle!</p><div class="ex-empty">${mine.length}/3 cards</div>`; return; }
  el.innerHTML = `<h2>⚔️ Card Battle</h2>
    <p class="ex-sub">Pick 3 cards (their power is the number). Each round, solve a puzzle: a right answer gives +4 power. Win 2 of 3 rounds → 🪙${st.reward}. ${st.left} win${st.left === 1 ? "" : "s"} of coins left today.</p>
    <div class="ex-chip-row" id="bt-pick">${mine.map(c => `<button class="ex-item ${battleSel.includes(c.id) ? "armed" : ""}" data-id="${c.id}" style="flex:0 1 72px"><div class="ex-item-emoji">${c.emoji}</div><div class="ex-item-own">⚔️ ${cardAtk(c)}</div></button>`).join("")}</div>
    <div class="ex-row" style="margin-top:10px"><button class="ex-btn" id="bt-go" ${battleSel.length === 3 ? "" : "disabled"}>Battle! (${battleSel.length}/3)</button></div><div id="bt-arena"></div><div class="ex-msg"></div>`;
  el.querySelectorAll("#bt-pick .ex-item").forEach(b => b.onclick = () => {
    const id = b.dataset.id; battleSel = battleSel.includes(id) ? battleSel.filter(x => x !== id) : battleSel.length < 3 ? [...battleSel, id] : battleSel; this.render(el);
  });
  el.querySelector("#bt-go").onclick = async () => {
    const deck = battleSel.map(id => col.pool.find(c => c.id === id));
    const avg = deck.reduce((a, c) => a + cardAtk(c), 0) / 3;
    const foes = [0, 1, 2].map(() => { const p = col.pool[rnd(0, col.pool.length - 1)]; return { ...p, atk: Math.max(2, Math.round(avg + rnd(-2, 2))) }; });
    const arena = el.querySelector("#bt-arena"); el.querySelector("#bt-go").disabled = true;
    let wins = 0;
    for (let i = 0; i < 3; i++) {
      const q = makeQuiz(2);
      const right = await new Promise(res => {
        arena.innerHTML = `<div class="ex-prize" style="font-size:1.6rem">${deck[i].emoji} ${cardAtk(deck[i])} <small>vs</small> ${foes[i].atk} ${foes[i].emoji}</div><div class="ex-prize" style="font-size:1.1rem">Round ${i + 1}: ${q.prompt}</div><div class="ex-chip-row">${q.options.map(o => `<button class="ex-item" data-a="${o}"><span class="ex-item-name">${o}</span></button>`).join("")}</div>`;
        arena.querySelectorAll("[data-a]").forEach(b => b.onclick = () => res(+b.dataset.a === q.answer));
      });
      const me = cardAtk(deck[i]) + (right ? 4 : 0), foe = foes[i].atk + rnd(0, 2);
      const won = me > foe; if (won) wins++;
      arena.innerHTML = `<div class="ex-prize">${right ? "✅ Right! +4" : "❌ Missed"} — ${me} vs ${foe}: ${won ? "You win the round! 🎉" : "They win the round."}</div>`;
      await new Promise(r => setTimeout(r, 1100));
    }
    battleSel = [];
    if (wins >= 2) { const r = await LB.claimBattleWin(); await refreshWallet(); await this.render(el); say(el, `🏆 Victory ${wins}-${3 - wins}! ${r.coins ? `+🪙${r.coins}` : "(daily coin limit reached)"}`); }
    else { await this.render(el); say(el, `Defeat ${wins}-${3 - wins} — try a different deck!`); }
  };
}});

/* ---- 18. Idle Garden ---- */
let gardenTimer = null, gardenPick = "carrot";
SECTIONS.push({ id: "garden", async render(el) {
  clearInterval(gardenTimer);
  const g = await LB.getGarden();
  const cost = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
  el.innerHTML = `<h2>🌱 Idle Garden</h2>
    <p class="ex-sub">Plant a seed, come back later, harvest coins. Every right answer you give while it grows makes it ripen 1 minute sooner!</p>
    <div class="ex-chip-row" id="gd-plants" style="margin-bottom:8px">${g.plants.map(p => `<button class="ex-item ${p.id === gardenPick ? "armed" : ""}" data-p="${p.id}" style="flex:0 1 auto;padding:6px 10px"><span class="ex-item-name">${p.emoji} ${p.name}</span><div class="ex-item-own">🪙${p.seed} → 🪙${p.yield} · ${p.growMin >= 60 ? p.growMin / 60 + "h" : p.growMin + "m"}</div></button>`).join("")}</div>
    <div class="ex-chip-row">${g.slots.map(s => s.empty
      ? `<button class="ex-item" data-plant="${s.i}" style="flex:0 1 30%"><div class="ex-item-emoji">🟫</div><div class="ex-item-own">Plant here</div></button>`
      : `<button class="ex-item ${s.ready ? "armed" : ""}" data-harv="${s.i}" style="flex:0 1 30%"><div class="ex-item-emoji">${s.ready ? s.plant.emoji : "🌱"}</div><div class="ex-item-own" data-ms="${s.readyAt}">${s.ready ? "Harvest!" : mmss(s.msLeft)}</div></button>`).join("")}</div>
    ${g.nextPlotCost ? `<div class="ex-row" style="margin-top:10px"><button class="ex-btn alt" id="gd-plot">+1 plot ${cost(g.nextPlotCost)}</button><span class="ex-sub" style="margin:0">${g.plots}/${g.maxPlots} plots</span></div>` : ""}<div class="ex-msg"></div>`;
  el.querySelectorAll("#gd-plants .ex-item").forEach(b => b.onclick = () => { gardenPick = b.dataset.p; el.querySelectorAll("#gd-plants .ex-item").forEach(x => x.classList.toggle("armed", x === b)); });
  el.querySelectorAll("[data-plant]").forEach(b => b.onclick = async () => { const r = await LB.plantSeed(+b.dataset.plant, gardenPick); if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't plant."); await refreshWallet(); this.render(el); });
  el.querySelectorAll("[data-harv]").forEach(b => b.onclick = async () => { const r = await LB.harvestPlot(+b.dataset.harv); if (!r.ok) return say(el, r.reason === "not-ready" ? "Still growing — answer some questions to speed it up!" : "Nothing to harvest."); await refreshWallet(); await this.render(el); say(el, `${r.plant.emoji} +🪙${r.coins}!`); });
  const plot = el.querySelector("#gd-plot");
  if (plot) plot.onclick = async () => { const r = await LB.buyGardenPlot(); if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy."); await refreshWallet(); this.render(el); };
  gardenTimer = setInterval(() => {
    let ripe = false;
    el.querySelectorAll("[data-ms]").forEach(n => { const left = +n.dataset.ms - Date.now(); if (left <= 0) ripe = true; else n.textContent = mmss(left); });
    if (ripe) { clearInterval(gardenTimer); this.render(el); }
  }, 1000);
}});

/* ---- 19. Parent Missions ---- */
SECTIONS.push({ id: "missions", async render(el) {
  const list = await LB.getMissions();
  if (!list.length) { el.style.display = "none"; return; }
  el.style.display = "";
  el.innerHTML = `<h2>📝 Missions from Mom & Dad</h2><p class="ex-sub">Real-world missions from your parent. Do it, tap "I did it!", and your parent will approve.</p>
    ${list.map(m => `<div class="ex-row" style="justify-content:space-between;padding:6px 0;border-top:1px solid #f0e8f7"><div><b>${esc(m.text)}</b><div class="ex-sub" style="margin:0">${m.reward ? "🎁 " + esc(m.reward) : ""}${m.bonus ? ` · 🪙${m.bonus | 0}` : ""}</div></div>
      ${m.status === "open" ? `<button class="ex-btn" data-done="${m.id}">I did it!</button>` : m.status === "done" ? '<span class="ex-sub" style="margin:0">⏳ Waiting for a parent</span>'
        : m.bonus && !m.credited ? `<button class="ex-btn" data-bonus="${m.id}">Claim 🪙${m.bonus | 0}</button>` : '<span class="ex-sub" style="margin:0">✅ Approved!</span>'}</div>`).join("")}<div class="ex-msg"></div>`;
  el.querySelectorAll("[data-done]").forEach(b => b.onclick = async () => { await LB.completeMission(b.dataset.done); this.render(el); });
  el.querySelectorAll("[data-bonus]").forEach(b => b.onclick = async () => { const r = await LB.claimMissionBonus(b.dataset.bonus); await refreshWallet(); await this.render(el); if (r.ok) say(el, `🎉 +🪙${r.coins}`); });
}});

/* ---- 20. Certificates & Memory Book ---- */
function drawCertificate(cert, name) {
  const c = document.createElement("canvas"); c.width = 900; c.height = 640;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 900, 640); g.addColorStop(0, "#fff8e1"); g.addColorStop(1, "#ffe3f1");
  x.fillStyle = g; x.fillRect(0, 0, 900, 640);
  x.strokeStyle = "#d4af37"; x.lineWidth = 10; x.strokeRect(24, 24, 852, 592);
  x.strokeStyle = "#8c2f6b"; x.lineWidth = 3; x.strokeRect(42, 42, 816, 556);
  x.textAlign = "center"; x.fillStyle = "#8c2f6b";
  x.font = "800 30px 'Baloo 2', sans-serif"; x.fillText("BRAINBOX", 450, 100);
  x.font = "800 52px 'Baloo 2', sans-serif"; x.fillStyle = "#3d2e22"; x.fillText("Certificate of Achievement", 450, 175);
  x.font = "120px serif"; x.fillText(cert.emoji, 450, 320);
  x.font = "700 26px 'Nunito', sans-serif"; x.fillStyle = "#6b5a4a"; x.fillText("proudly presented to", 450, 375);
  x.font = "800 60px 'Baloo 2', sans-serif"; x.fillStyle = "#8c2f6b"; x.fillText(name, 450, 445);
  x.font = "700 28px 'Nunito', sans-serif"; x.fillStyle = "#3d2e22"; x.fillText(`who ${cert.desc}!`, 450, 500);
  x.font = "800 34px 'Baloo 2', sans-serif"; x.fillStyle = "#d4af37"; x.fillText(cert.title, 450, 552);
  x.font = "700 20px 'Nunito', sans-serif"; x.fillStyle = "#8a7a6a"; x.fillText(cert.date || "", 450, 590);
  return c.toDataURL("image/png");
}
SECTIONS.push({ id: "certs", async render(el) {
  const d = await LB.getCertificates();
  const earned = d.certs.filter(c => c.earned).length;
  el.innerHTML = `<h2>📜 Memory Book</h2><p class="ex-sub">${earned}/${d.certs.length} milestones. Tap one you've earned to make a certificate you can save and show off!</p>
    <div class="ex-chip-row">${d.certs.map(c => `<button class="ex-item" data-c="${c.id}" ${c.earned ? "" : "disabled"} style="flex:0 1 46%;${c.earned ? "" : "opacity:.45"}"><div class="ex-item-emoji">${c.earned ? c.emoji : "🔒"}</div><div class="ex-item-name">${c.title}</div><div class="ex-item-own">${c.earned ? c.date : c.desc}</div></button>`).join("")}</div><div id="ct-view"></div>`;
  el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
    const cert = d.certs.find(x => x.id === b.dataset.c);
    const url = drawCertificate(cert, d.name);
    el.querySelector("#ct-view").innerHTML = `<img src="${url}" alt="Certificate" style="width:100%;border-radius:12px;margin-top:12px;box-shadow:0 3px 10px rgba(0,0,0,.15)"><div class="ex-row" style="justify-content:center;margin-top:8px"><a class="ex-btn" style="text-decoration:none" download="brainbox-${cert.id}.png" href="${url}">💾 Save picture</a></div><div class="ex-sub" style="text-align:center;margin-top:6px">On a phone you can also press-and-hold the picture.</div>`;
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
  });
}});

SECTIONS.unshift(...SECTIONS.splice(R10B_START));

/* =================================================================
   PM round 11, batch 3 -- Weekly Report, Mega Quest, Advent Calendar,
   plus quick links to the new Game Room pages. Pulled to the top.
   ================================================================= */
const R11_START = SECTIONS.length;

/* ---- 18. Advent Calendar ---- */
SECTIONS.push({ id: "advent", async render(el) {
  const a = await LB.getAdvent();
  if (a.over && !a.done || a.done && a.over) {
    el.innerHTML = `<h2>🎁 Advent Calendar</h2><p class="ex-sub">${a.done ? "You opened every gift — amazing!" : "This calendar has ended."} Ready for a fresh one?</p><button class="ex-btn" id="av-restart">Start a new calendar</button>`;
    el.querySelector("#av-restart").onclick = async () => { await LB.restartAdvent(); this.render(el); };
    return;
  }
  const cell = d => {
    const opened = !!a.opened[d], due = d <= a.today;
    const r = a.rewards[d - 1], label = r.gems ? "💎" : "🪙";
    return `<button class="ex-item" data-d="${d}" ${opened || !due ? "disabled" : ""} style="flex:0 0 calc(16.6% - 7px);padding:8px 2px;${opened ? "background:#e5f5e8" : due ? "background:#ffe9a8;border-color:#f7c548" : "opacity:.5"}">
      <div class="ex-item-emoji" style="font-size:1.1rem">${opened ? "✅" : due ? "🎁" : "🔒"}</div><div class="ex-item-own">${d}${!opened && due ? " " + label : ""}</div></button>`;
  };
  const step = Math.floor(a.ontime / 7), canBonus = step >= 1 && !a.bonusClaimed[step];
  el.innerHTML = `<h2>🎁 Advent Calendar</h2>
    <p class="ex-sub">A new gift every day for 30 days. Missed one? It waits for you — but opening each gift on its OWN day builds an on-time streak (${a.ontime} now): every 7 in a row pays a 🪙20 💎1 bonus!</p>
    <div class="ex-chip-row" style="gap:6px">${Array.from({ length: 30 }, (_, i) => cell(i + 1)).join("")}</div>
    <div class="ex-row" style="margin-top:10px"><button class="ex-btn" id="av-bonus" ${canBonus ? "" : "disabled"}>${canBonus ? "Claim streak bonus 🪙20 💎1" : "On-time streak: " + a.ontime + "/" + (Math.floor(a.ontime / 7) + 1) * 7}</button></div><div class="ex-msg"></div>`;
  el.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => {
    const r = await LB.openAdventDay(+b.dataset.d);
    if (!r.ok) return say(el, "Not ready yet!");
    await refreshWallet(); await this.render(el);
    say(el, `🎉 Day ${b.dataset.d}: +${r.reward.coins ? "🪙" + r.reward.coins : ""}${r.reward.gems ? " 💎" + r.reward.gems : ""}`);
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 2);
  });
  el.querySelector("#av-bonus").onclick = async () => { const r = await LB.claimAdventStreak(); if (!r.ok) return; await refreshWallet(); await this.render(el); say(el, "🔥 Streak bonus! +🪙20 +💎1"); };
}});

/* ---- 11. Bo's Weekly Report ---- */
SECTIONS.push({ id: "report", async render(el) {
  const r = await LB.getWeeklyReport();
  const trend = r.change === null ? "It's your first full week of data — welcome!" : r.change > 0 ? `You answered ${r.change}% MORE right than last week. 📈` : r.change < 0 ? `A bit fewer than last week (${r.change}%) — no stress, next week is a fresh start! 🌱` : "Exactly the same as last week — steady! 🎯";
  const pct = x => Math.round(x * 100) + "%";
  el.innerHTML = `<h2>📬 Bo's Weekly Report</h2>
    <p class="ex-sub" style="font-size:.85rem;color:#3d2e22">Hi ${esc(player.name)}! Here's how your week is going:</p>
    <div class="ex-row" style="justify-content:space-around;text-align:center"><div><div class="ex-stat">${r.cur}</div><div class="ex-sub" style="margin:0">right this week</div></div><div><div class="ex-stat">${r.prev}</div><div class="ex-sub" style="margin:0">last week</div></div><div><div class="ex-stat">🔥 ${r.streak}</div><div class="ex-sub" style="margin:0">day streak</div></div></div>
    <p class="ex-sub" style="margin-top:10px;font-size:.82rem;color:#3d2e22">${trend}</p>
    ${r.best ? `<p class="ex-sub" style="font-size:.82rem;color:#3d2e22">⭐ Your strongest topic: <b>${esc(r.pretty(r.best.topic))}</b> (${pct(r.best.acc)} right in ${esc(r.gameLabel(r.best.game))}).</p>` : ""}
    ${r.weak ? `<p class="ex-sub" style="font-size:.82rem;color:#3d2e22">💪 Let's grow: <b>${esc(r.pretty(r.weak.topic))}</b> (${pct(r.weak.acc)}). Try <a href="../bo-tutor/" style="color:#8c2f6b;font-weight:800">Bo's Tutor Session</a>!</p>` : ""}
    <div class="ex-row" style="background:#f6e3f0;border-radius:12px;padding:8px 12px"><span style="font-weight:800;font-size:.85rem">🎯 Goal for next week: ${r.goal} right answers</span></div>
    <div class="ex-row" style="margin-top:10px"><button class="ex-btn" id="rp-share">📤 Share with my parent</button><button class="ex-btn alt" id="rp-copy">📋 Copy</button><a class="ex-btn alt" id="rp-wa" style="text-decoration:none" target="_blank" rel="noopener">💬 WhatsApp</a><a class="ex-btn alt" id="rp-mail" style="text-decoration:none">✉️ Email</a></div><div class="ex-msg"></div>`;
  // A plain-text summary a child can send to a parent (nothing is sent automatically).
  const text = `📊 ${player.name}'s week on BrainBox\n✅ ${r.cur} right answers this week${r.change === null ? "" : ` (${r.change >= 0 ? "+" : ""}${r.change}% vs last week)`}\n🔥 ${r.streak}-day streak`
    + (r.best ? `\n⭐ Strongest: ${r.pretty(r.best.topic)} (${pct(r.best.acc)})` : "") + (r.weak ? `\n💪 To practise: ${r.pretty(r.weak.topic)} (${pct(r.weak.acc)})` : "") + `\n🎯 Goal for next week: ${r.goal} right answers`;
  el.querySelector("#rp-wa").href = "https://wa.me/?text=" + encodeURIComponent(text);
  el.querySelector("#rp-mail").href = "mailto:?subject=" + encodeURIComponent(`${player.name}'s week on BrainBox`) + "&body=" + encodeURIComponent(text);
  el.querySelector("#rp-copy").onclick = async () => { try { await navigator.clipboard.writeText(text); say(el, "📋 Copied! Paste it into a message."); } catch (e) { say(el, "Couldn't copy — try the Share button."); } };
  el.querySelector("#rp-share").onclick = async () => { if (navigator.share) { try { await navigator.share({ title: "My week on BrainBox", text }); } catch (e) { /* cancelled */ } } else { try { await navigator.clipboard.writeText(text); say(el, "📋 Copied! Paste it into a message."); } catch (e) { say(el, "Use the WhatsApp or Email buttons."); } } };
}});

/* ---- 15. Mega Quest ---- */
SECTIONS.push({ id: "megaquest", async render(el) {
  const m = await LB.getMegaQuest();
  if (!m.active) {
    el.innerHTML = `<h2>🏔️ Mega Quest</h2><p class="ex-sub">A 4-week goal with a big prize (🪙150 💎5, plus 🪙30 at the halfway mark). Pick one:</p>
      <div class="ex-chip-row">${m.quests.map(q => `<button class="ex-item" data-q="${q.id}"><div class="ex-item-emoji">${q.emoji}</div><div class="ex-item-name">${q.name}</div><div class="ex-item-own">${q.desc}</div></button>`).join("")}</div>`;
    el.querySelectorAll("[data-q]").forEach(b => b.onclick = async () => { await LB.startMegaQuest(b.dataset.q); this.render(el); });
    return;
  }
  const a = m.active, pct = Math.round(a.progress / a.target * 100);
  const halfReady = a.progress >= a.target / 2 && !a.claims.half, fullReady = a.progress >= a.target && !a.claims.full;
  el.innerHTML = `<h2>${a.emoji} ${a.name}</h2><p class="ex-sub">${a.desc}. ${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left.</p>
    <div style="background:#eee4f7;border-radius:100px;height:14px;overflow:hidden;position:relative"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c08be8,#8c2f6b)"></div></div>
    <div class="ex-sub" style="margin:6px 0 10px">${a.progress}/${a.target} (${pct}%)</div>
    <div class="ex-row"><button class="ex-btn" id="mq-half" ${halfReady ? "" : "disabled"}>${a.claims.half ? "Halfway ✓" : "Halfway 🪙30"}</button><button class="ex-btn" id="mq-full" ${fullReady ? "" : "disabled"}>${a.claims.full ? "Done ✓" : "Finish 🪙150 💎5"}</button>
    ${a.claims.full || a.expired ? '<button class="ex-btn alt" id="mq-new">New quest</button>' : ""}</div><div class="ex-msg">${a.expired ? "Time ran out — pick a new quest and go again!" : ""}</div>`;
  const go = stage => async () => { const r = await LB.claimMegaQuest(stage); if (!r.ok) return; await refreshWallet(); await this.render(el); say(el, "🎉 Reward claimed!"); if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 2); };
  el.querySelector("#mq-half").onclick = go("half"); el.querySelector("#mq-full").onclick = go("full");
  const nb = el.querySelector("#mq-new"); if (nb) nb.onclick = async () => { await LB.endMegaQuest(); this.render(el); };
}});

/* ---- 17. Quick Review + 19. Topic Certificates ---- */
SECTIONS.push({ id: "review", async render(el) {
  const st = await LB.srsStats();
  el.innerHTML = `<h2>🔁 Quick Review</h2><p class="ex-sub">Questions you missed come back after 1, 3, 7 and 14 days so they really stick.</p>
    <div class="ex-row"><span class="ex-stat">${st.due} due</span><span class="ex-sub" style="margin:0">${st.total} saved · ${st.mastered} mastered · ${st.words} word cards</span>
    <a class="ex-btn" style="text-decoration:none;${st.due ? "" : "opacity:.5"}" href="../quick-review/">Review</a><a class="ex-btn alt" style="text-decoration:none" href="../word-book/">📕 Word Book</a></div>`;
}});
SECTIONS.push({ id: "topiccerts", async render(el) {
  const list = await LB.getTopicCerts();
  const earned = list.filter(c => c.earned);
  if (!list.length) { el.innerHTML = '<h2>🎓 Topic Certificates</h2><p class="ex-sub">Answer 30+ questions in a topic with 85% or more right to earn a certificate for it. Keep playing!</p>'; return; }
  el.innerHTML = `<h2>🎓 Topic Certificates</h2><p class="ex-sub">${earned.length} earned. A topic needs 30+ answers at 85%+ right. Tap an earned one to make a picture you can save.</p>
    <div class="ex-chip-row">${list.slice(0, 24).map((c, i) => `<button class="ex-item" data-i="${i}" ${c.earned ? "" : "disabled"} style="flex:0 1 46%;${c.earned ? "" : "opacity:.55"}"><div class="ex-item-emoji">${c.earned ? "🎓" : "📈"}</div><div class="ex-item-name">${esc(c.title)}</div><div class="ex-item-own">${esc(c.gameLabel)} · ${c.acc}% (${c.n})</div></button>`).join("")}</div><div id="tc-view"></div>`;
  el.querySelectorAll("[data-i]").forEach(b => b.onclick = () => {
    const c = list[+b.dataset.i];
    const url = drawCertificate({ emoji: "🎓", title: `${c.title} Master`, desc: `scored ${c.acc}% on ${c.n} ${c.gameLabel} questions in ${c.title}`, date: c.date }, player.name);
    el.querySelector("#tc-view").innerHTML = `<img src="${url}" alt="Certificate" style="width:100%;border-radius:12px;margin-top:12px;box-shadow:0 3px 10px rgba(0,0,0,.15)"><div class="ex-row" style="justify-content:center;margin-top:8px"><a class="ex-btn" style="text-decoration:none" download="brainbox-${esc(c.key)}.png" href="${url}">💾 Save picture</a></div>`;
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
  });
}});

/* =================================================================
   PM round 14 -- Wallet Goals (item 9) and quick links to the Garage.
   ================================================================= */
const R14_START = SECTIONS.length;
SECTIONS.push({ id: "goals", async render(el) {
  const d = await LB.getGoals();
  const w = d.wallet, cost = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
  const have = c => c.coins ? (w.coins || 0) : (w.gems || 0), need = c => c.coins || c.gems;
  el.innerHTML = `<h2>🎯 Wallet Goals</h2><p class="ex-sub">Pick up to 3 things you're saving for and watch the bar fill. Buying one from here gives back 10% of the price (up to 🪙20)!</p>
    ${d.goals.length ? d.goals.map(g => { const pct = Math.min(100, Math.round(have(g.cost) / need(g.cost) * 100)), ok = pct >= 100;
      return `<div style="padding:8px 0;border-top:1px solid #f0e8f7"><div class="ex-row" style="justify-content:space-between"><b>${g.preview} ${esc(g.name)}</b><span>${cost(g.cost)}</span></div>
      <div style="background:#eee4f7;border-radius:100px;height:10px;overflow:hidden;margin:5px 0"><div style="width:${pct}%;height:100%;background:${ok ? "#34c759" : "linear-gradient(90deg,#c08be8,#8c2f6b)"}"></div></div>
      <div class="ex-row" style="justify-content:space-between"><span class="ex-sub" style="margin:0">${g.owned ? "You own this ✓" : ok ? "You can afford it!" : `${have(g.cost)}/${need(g.cost)}`}</span><span><button class="ex-btn" data-buy="${esc(g.type)}::${esc(g.id)}" ${ok && !g.owned ? "" : "disabled"}>Buy</button> <button class="ex-btn alt" data-rm="${esc(g.type)}::${esc(g.id)}">✕</button></span></div></div>`; }).join("") : '<div class="ex-empty">No goals yet — add one below!</div>'}
    ${d.goals.length < 3 ? `<div class="ex-row" style="margin-top:10px"><select class="ex-input" id="gl-pick" style="width:auto;max-width:70%">${d.pool.filter(p => !d.goals.some(g => g.type === p.type && g.id === p.id)).map(p => `<option value="${esc(p.type)}::${esc(p.id)}">${p.preview} ${esc(p.name)} (${cost(p.cost)})</option>`).join("")}</select><button class="ex-btn" id="gl-add">+ Goal</button></div>` : ""}<div class="ex-msg"></div>`;
  el.querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => { const [t, i] = b.dataset.buy.split("::"); const r = await LB.buyGoal(t, i); if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy."); await refreshWallet(); await this.render(el); say(el, `🎉 Goal reached!${r.refund ? ` +🪙${r.refund} back` : ""}`); if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); });
  el.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => { const [t, i] = b.dataset.rm.split("::"); await LB.setGoal(t, i, false); this.render(el); });
  const add = el.querySelector("#gl-add");
  if (add) add.onclick = async () => { const [t, i] = el.querySelector("#gl-pick").value.split("::"); const r = await LB.setGoal(t, i, true); if (!r.ok) return say(el, "Three goals is the max."); this.render(el); };
}});
/* ---- 6. Sponsor Shop ---- */
SECTIONS.push({ id: "sponsor", async render(el) {
  const sh = await LB.getSponsorShop();
  el.innerHTML = `<h2>🎪 Sponsor Shop</h2><p class="ex-sub">3 limited editions a week, paid in 💎. When the week ends they leave the shop — and become rare drops in the Mystery Egg. New picks in <b id="sp-left"></b>.</p>
    <div class="ex-chip-row">${sh.items.map((it, i) => `<button class="ex-item" data-i="${i}" ${it.owned ? "disabled" : ""}><div class="ex-item-emoji">${it.preview}</div><div class="ex-item-name">${esc(it.name)}</div><div class="ex-item-own">${it.owned ? "Owned ✓" : "💎" + it.cost.gems}</div></button>`).join("")}</div><div class="ex-msg"></div>`;
  el.querySelector("#sp-left").textContent = mmss(sh.endsAt - Date.now());
  el.querySelectorAll("[data-i]").forEach(b => b.onclick = async () => { const it = sh.items[+b.dataset.i]; const r = await LB.unlockCosmetic(it.type, it.id, it.cost); if (!r.ok) return say(el, FAIL[r.reason] || "Couldn't buy."); await refreshWallet(); await this.render(el); say(el, `${it.preview} ${it.name} is yours! Equip it in 🎨 Customize.`); });
}});

/* ---- 3. Daily Auction ---- */
let auctionTimer = null;
SECTIONS.push({ id: "auction", async render(el) {
  clearInterval(auctionTimer);
  const a = await LB.getAuction();
  if (!a.item) { el.style.display = "none"; return; }
  const need = Math.max(a.item.minBid, a.top ? a.top.amount + 5 : 0), y = a.yesterday;
  el.innerHTML = `<h2>🔨 Daily Auction</h2><p class="ex-sub">One rare item a day. Highest coin bid when the day ends wins it. If someone outbids you, your coins come straight back. Ends in <b id="au-left"></b>.</p>
    <div class="ex-row"><span style="font-size:2.2rem">${a.item.preview}</span><div><b>${esc(a.item.name)}</b><div class="ex-sub" style="margin:0">${a.item.owned ? "You already own this" : a.top ? `Top bid: 🪙${a.top.amount} by ${a.mine ? "you 🎉" : esc(a.top.name)}` : `No bids yet — starts at 🪙${a.item.minBid}`}</div></div></div>
    ${a.item.owned ? "" : `<div class="ex-row" style="margin-top:8px"><input class="ex-input" id="au-amt" type="number" min="${need}" value="${need}" inputmode="numeric" ${a.mine ? "disabled" : ""}><button class="ex-btn" id="au-bid" ${a.mine ? "disabled" : ""}>${a.mine ? "You're winning" : "Place bid"}</button></div>`}
    ${y ? `<div class="ex-row" style="margin-top:10px;background:#f6f0ff;border-radius:12px;padding:8px 12px"><span class="ex-sub" style="margin:0;flex:1">Yesterday: ${y.item.preview} ${esc(y.item.name)} → <b>${esc(y.top.name)}</b> (🪙${y.top.amount})</span>${y.canClaim ? '<button class="ex-btn" id="au-claim">🎁 Collect!</button>' : y.claimed ? '<span class="ex-sub" style="margin:0">collected ✓</span>' : ""}</div>` : ""}<div class="ex-msg"></div>`;
  const tick = () => { const n = el.querySelector("#au-left"); if (n) n.textContent = mmss(a.endsAt - Date.now()); };
  tick(); auctionTimer = setInterval(tick, 1000);
  const bid = el.querySelector("#au-bid");
  if (bid) bid.onclick = async () => { const r = await LB.bidAuction(+el.querySelector("#au-amt").value); if (!r.ok) return say(el, r.reason === "insufficient-funds" ? "Not enough coins for that bid!" : r.reason === "bad-amount" ? `Bid at least 🪙${r.need}.` : "Someone bid higher just now — try again!"); await refreshWallet(); await this.render(el); say(el, `🔨 You're the top bidder with 🪙${r.amount}!`); };
  const cl = el.querySelector("#au-claim");
  if (cl) cl.onclick = async () => { const r = await LB.claimAuction(y.day); if (r.ok) { if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); await this.render(el); say(el, `🎉 ${r.item.name} is yours! Equip it in 🎨 Customize.`); } };
}});

/* ---- 10. Gifts ---- */
SECTIONS.push({ id: "gifts", async render(el) {
  const g = await LB.getGiftStatus();
  el.innerHTML = `<h2>💌 Help a Friend</h2><p class="ex-sub">Give a friend a few coins (up to 🪙${g.max} each, 🪙20 a day). Below are friends saving up for something — Bo sends them a thank-you card from you. ${g.left} of 20 left today.</p>
    ${g.wishing.length ? g.wishing.map(w => `<div class="ex-row" style="justify-content:space-between;padding:4px 0"><span><b>${esc(w.name)}</b> <span class="ex-sub" style="display:inline;margin:0">wants ${esc(w.item)}</span></span><span><button class="ex-btn alt" data-to="${esc(w.id)}" data-n="5" style="padding:6px 10px">🪙5</button> <button class="ex-btn" data-to="${esc(w.id)}" data-n="10" style="padding:6px 10px">🪙10</button></span></div>`).join("") : '<div class="ex-empty">Nobody is saving for a goal right now.</div>'}
    ${g.cards.length ? `<div class="ex-sub" style="margin:10px 0 4px;font-weight:800;color:#3d2e22">💌 Thank-you cards for you</div>${g.cards.map(c => `<div class="ex-sub" style="margin:2px 0">🧠 Bo: “${esc(c.from)} sent you 🪙${c.n} on ${esc(c.day)} — what a kind friend!”</div>`).join("")}` : ""}<div class="ex-msg"></div>`;
  el.querySelectorAll("[data-to]").forEach(b => b.onclick = async () => { const r = await LB.giftCoins(b.dataset.to, +b.dataset.n); if (!r.ok) return say(el, r.reason === "insufficient-funds" ? "Not enough coins yet!" : r.reason === "daily-limit" ? "That's your daily gift limit — thank you for being kind!" : "Couldn't send that."); await refreshWallet(); await this.render(el); say(el, "💌 Sent! Bo will tell them it was from you."); });
}});

SECTIONS.unshift(...SECTIONS.splice(R14_START));

/* ---- Quick links ---- */
SECTIONS.push({ id: "gamelinks", async render(el) {
  el.innerHTML = `<h2>🎮 More to explore</h2><div class="ex-chip-row">
    <a class="ex-item" href="../garage/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🔧</div><div class="ex-item-name">Garage</div></a>
    <a class="ex-item" href="../weekly-boss/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🐉</div><div class="ex-item-name">Weekly Boss</div></a>
    <a class="ex-item" href="../world-map/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🗺️</div><div class="ex-item-name">World Map</div></a>
    <a class="ex-item" href="../ready-check/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">✅</div><div class="ex-item-name">Level-Up Check</div></a>
    <a class="ex-item" href="../bo-home/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🏠</div><div class="ex-item-name">Bo's World</div></a>
    <a class="ex-item" href="../game-room/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🎮</div><div class="ex-item-name">Game Room</div></a>
    <a class="ex-item" href="../bo-tutor/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🎓</div><div class="ex-item-name">Bo's Tutor</div></a>
    <a class="ex-item" href="../class-board/" style="text-decoration:none;color:inherit"><div class="ex-item-emoji">🏆</div><div class="ex-item-name">Class Board</div></a></div>`;
}});

SECTIONS.unshift(...SECTIONS.splice(R11_START));

/* ---- boot ---- */
if (!player || player.role === "parent" || !LB) {
  $("ex-page").innerHTML = '<div class="ex-topbar"><a href="../" class="ex-back">←</a><div class="ex-title">🎁 Extras</div></div><p class="ex-empty">Please sign in from the hub first.</p>';
} else {
  refreshWallet();
  SECTIONS.forEach(mount);
  // Jump bar -- the page has grown long, so every card gets a chip up top.
  const nav = document.createElement("div");
  nav.className = "ex-nav";
  const buildNav = () => {
    nav.innerHTML = SECTIONS.filter(x => x.el && x.el.style.display !== "none" && x.el.querySelector("h2")).map(x =>
      `<a href="#ex-${x.id}">${x.el.querySelector("h2").textContent.trim()}</a>`).join("");
  };
  [1200, 3000, 6000].forEach(t => setTimeout(buildNav, t));
  $("ex-sections").before(nav);
}
