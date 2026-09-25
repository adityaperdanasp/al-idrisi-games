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
      ${t.reached && !t.claimed ? `<button class="ex-btn" data-tier="${t.index}">Claim 🪙${t.coins}</button>` : t.claimed ? '<span class="ex-sub" style="margin:0">claimed</span>' : ""}</div>`).join("")}
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
    await refreshWallet(); await this.render(el); say(el, `🪙 +${r.coins}!`);
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

/* ---- boot ---- */
if (!player || player.role === "parent" || !LB) {
  $("ex-page").innerHTML = '<div class="ex-topbar"><a href="../" class="ex-back">←</a><div class="ex-title">🎁 Extras</div></div><p class="ex-empty">Please sign in from the hub first.</p>';
} else {
  refreshWallet();
  SECTIONS.forEach(mount);
}
