/* =================================================================
   Crafting Table (was "Workshop") -- upgrade what you own:
   Standard -> Gold (60 coins) -> Holo (3 gems). Tiers live at
   players/{id}/tiers/{type}::{id}; skin.js and the games read them.
   Audit batch 2: a forge mini-game on every upgrade (hit the hot zone; a
   PERFECT strike refunds 15 coins), filters per type, "ready to craft"
   highlights, a daily crafting quest, a crafting log, a "Try" button that
   plays your effect, and a 3x3 crafting-grid header.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const DESC = {
  "answer-fx": "Gold: 50% more particles + glow · Holo: double + rainbow shimmer", "touch-trail": "Gold: bigger + sparkles · Holo: shimmering rainbow",
  "combo-sticker": "Gold: golden glow · Holo: rainbow shimmer", "ninja-costume": "Gold: golden aura · Holo: rainbow aura", "bossrush-fighter": "Gold: golden aura · Holo: rainbow aura",
  "hub-theme": "Gold: more decorations · Holo: even more, bigger", "card-bg": "Gold: gentle shine · Holo: rainbow shimmer", "plane-ammo": "Each tier makes the ammo's special power stronger"
};
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const today = () => new Date().toISOString().slice(0, 10);
let filter = "all";

if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("⚒️"));
else load();

function forge() {
  // Hammer bar slides back and forth; tap when it is inside the hot zone.
  return new Promise(resolve => {
    const o = document.createElement("div"); o.className = "kit-overlay";
    o.innerHTML = `<div class="kit-modal"><div class="kit-big">🔨</div><h2>Forge it!</h2><p class="kit-sub">Tap STRIKE when the marker is in the glowing zone. A perfect strike gives coins back!</p>
      <div class="ws-forge"><i class="ws-zone"></i><i class="ws-perf"></i><b id="ws-mk"></b></div><button class="kit-btn block" id="ws-hit" type="button">STRIKE!</button></div>`;
    document.body.appendChild(o);
    let x = 0, dir = 1, raf = 0; const mk = o.querySelector("#ws-mk");
    const tick = () => { x += dir * 1.6; if (x > 100 || x < 0) { dir *= -1; x = Math.max(0, Math.min(100, x)); } mk.style.left = x + "%"; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    o.querySelector("#ws-hit").onclick = () => {
      cancelAnimationFrame(raf); const perfect = x >= 46 && x <= 54, good = x >= 35 && x <= 65;
      o.querySelector(".kit-sub").textContent = perfect ? "🔥 PERFECT STRIKE!" : good ? "✨ Nice strike!" : "Clang! Still upgraded.";
      setTimeout(() => { o.remove(); resolve(perfect ? "perfect" : good ? "good" : "ok"); }, 700);
    };
  });
}
// Audit round 2: materials + recipes. Every right answer anywhere in BrainBox mines materials
// (🪵 wood every 10, ⛓️ iron every 40, 💎 diamond every 150 right answers, lifetime). Recipes turn
// them into collectibles for a display shelf; crafting is a 3-strike forge where each good strike
// adds a quality star (⭐ to ⭐⭐⭐). Spent materials and the shelf are kept per player.
const RECIPES = [
  { id: "chair", em: "🪑", name: "Oak Chair", need: { wood: 4 } },
  { id: "lantern", em: "🏮", name: "Lantern", need: { wood: 2, iron: 1 } },
  { id: "shield", em: "🛡️", name: "Iron Shield", need: { wood: 2, iron: 3 } },
  { id: "cup", em: "🏆", name: "Champion Cup", need: { wood: 5, iron: 2 } },
  { id: "sword", em: "🗡️", name: "Diamond Sword", need: { iron: 3, diamond: 1 } },
  { id: "crown", em: "👑", name: "Royal Crown", need: { iron: 3, diamond: 2 } },
  { id: "rocket", em: "🚀", name: "Block Rocket", need: { wood: 6, iron: 4, diamond: 1 } }
];
const MAT = { wood: "🪵", iron: "⛓️", diamond: "💎" };
function shelf() { try { return JSON.parse(ls.get("ws_shelf", "[]")) || []; } catch (e) { return []; } }
function spent() { try { return JSON.parse(ls.get("ws_spent", "{}")) || {}; } catch (e) { return {}; } }
async function materials() {
  const tc = await LB.getTotalCorrect().catch(() => 0), sp = spent();
  return { wood: Math.floor(tc / 10) - (sp.wood || 0), iron: Math.floor(tc / 40) - (sp.iron || 0), diamond: Math.floor(tc / 150) - (sp.diamond || 0), tc };
}
function forge3() {
  return new Promise(resolve => {
    let hits = 0, good = 0;
    const one = () => forge().then(r => { hits++; if (r !== "ok") good++; if (hits < 3) one(); else resolve(good); });
    one();
  });
}
async function drawCrafts() {
  const m = await materials(), sh = shelf(), host = $("ws-crafts"); if (!host) return;
  const can = r => Object.entries(r.need).every(([k, n]) => (m[k] || 0) >= n);
  host.innerHTML = `<div class="kit-card"><div class="ws-h">🧱 Crafting bench</div><div class="ws-d">Your right answers mine materials: ${MAT.wood} every 10 · ${MAT.iron} every 40 · ${MAT.diamond} every 150 (${m.tc} so far)</div>
    <div class="ws-mats">${Object.keys(MAT).map(k => `<span>${MAT[k]} <b>${Math.max(0, m[k])}</b></span>`).join("")}</div>
    ${RECIPES.map(r => `<div class="ws-row ${can(r) ? "ready" : ""}"><span class="ws-e">${r.em}</span><span class="ws-b"><span class="ws-n">${r.name}</span><br><span class="ws-d">${Object.entries(r.need).map(([k, n]) => `${MAT[k]}${n}`).join(" + ")}</span></span><button class="kit-btn" data-r="${r.id}" ${can(r) ? "" : "disabled"} style="padding:6px 12px;font-size:.78rem">Craft</button></div>`).join("")}
    <div class="ws-h" style="margin-top:10px">🗄️ Display shelf</div><div class="ws-shelf">${sh.length ? sh.map(x => `<span title="${K.esc(x.name)}">${x.em}<small>${"⭐".repeat(x.q)}</small></span>`).join("") : '<small class="ws-d">Craft something to put it on your shelf.</small>'}</div></div>`;
  host.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => {
    const r = RECIPES.find(x => x.id === b.dataset.r), mm = await materials();
    if (!Object.entries(r.need).every(([k, n]) => (mm[k] || 0) >= n)) return;
    const good = await forge3(), q = Math.min(3, 1 + Math.floor(good / 1.5));
    const sp = spent(); Object.entries(r.need).forEach(([k, n]) => { sp[k] = (sp[k] || 0) + n; }); ls.set("ws_spent", JSON.stringify(sp));
    const sh = shelf(); sh.push({ id: r.id, em: r.em, name: r.name, q, at: today() }); ls.set("ws_shelf", JSON.stringify(sh.slice(-40)));
    logCraft(`Crafted ${r.name} ${"⭐".repeat(q)}`);
    K.toastAdv(`${r.em} ${r.name} crafted — ${"⭐".repeat(q)} quality!`);
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    drawCrafts();
  });
}
function logCraft(text) { let l = []; try { l = JSON.parse(ls.get("ws_log", "[]")); } catch (e) {} l.unshift(`${today()} · ${text}`); ls.set("ws_log", JSON.stringify(l.slice(0, 10))); }

async function load() {
  const [w, wal] = await Promise.all([LB.getWorkshop(), LB.getWallet()]);
  const coins = wal.coins || 0, gems = wal.gems || 0;
  $("ws-wallet").textContent = `🪙 ${coins}   💎 ${gems}`;
  const quest = ls.get("ws_quest", "") === today() ? "done" : ls.get("ws_quest_claim", "") === today() ? "claimed" : "open";
  $("ws-quest").innerHTML = `<div class="kit-card ws-q"><b>📜 Daily craft:</b> upgrade 1 item today ${quest === "open" ? "— 0/1" : quest === "done" ? `— ✅ <button class="kit-btn" id="ws-claim" type="button" style="padding:5px 12px;font-size:.78rem">Claim 🪙10</button>` : "— claimed ✔"}</div>`;
  const cb = $("ws-claim"); if (cb) cb.onclick = async () => { ls.set("ws_quest_claim", today()); ls.set("ws_quest", ""); try { await LB.creditWallet({ coins: 10 }); } catch (e) {} K.toastAdv("Daily craft complete! +10 coins"); load(); };
  drawCrafts();
  if (!w.groups.length) { $("ws-main").innerHTML = '<div class="kit-card"><div class="kit-sub" style="margin:0;text-align:center">You don\'t own anything upgradeable yet — buy an effect, trail, sticker, theme or costume first (🎨 Customize, Extras shop, Mystery Egg).</div></div>'; return; }
  $("ws-filters").innerHTML = [["all", "All"]].concat(w.groups.map(g => [g.type, g.label])).map(([t, l]) => `<button type="button" class="ws-f ${filter === t ? "on" : ""}" data-f="${K.esc(t)}">${K.esc(l)}</button>`).join("");
  $("ws-filters").querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filter = b.dataset.f; load(); });
  const groups = w.groups.filter(g => filter === "all" || g.type === filter);
  $("ws-main").innerHTML = groups.map(g => `<div class="kit-card"><div class="ws-h">${K.esc(g.label)}</div><div class="ws-d">${K.esc(DESC[g.type] || "")}</div>${g.items.map(it => {
    const nxt = w.costs[it.tier + 1], label = nxt ? (nxt.coins ? `🪙${nxt.coins}` : `💎${nxt.gems}`) : "";
    const can = nxt && ((nxt.coins || 0) <= coins) && ((nxt.gems || 0) <= gems);
    return `<div class="ws-row ${can ? "ready" : ""}"><span class="ws-e">${it.preview}</span><span class="ws-b"><span class="ws-n">${K.esc(it.name)}</span><br><span class="ws-t t${it.tier}">${w.names[it.tier]}</span>${can ? ' <span class="ws-rd">ready to craft!</span>' : ""}</span><button class="kit-btn alt" data-try="1" type="button" style="padding:6px 9px;font-size:.75rem">👀</button>${nxt ? `<button class="kit-btn" data-t="${K.esc(it.type)}" data-i="${K.esc(it.id)}" data-n="${K.esc(it.name)}" style="padding:6px 12px;font-size:.78rem">→ ${w.names[it.tier + 1]} ${label}</button>` : '<span class="ws-d">⭐ Max</span>'}</div>`;
  }).join("")}</div>`).join("") + '<div class="kit-bonus" id="ws-msg"></div>';
  $("ws-main").querySelectorAll("[data-try]").forEach(b => b.onclick = e => { const r = b.getBoundingClientRect(); if (window.AIGSkin) AIGSkin.burst(r.left + r.width / 2, r.top); });
  $("ws-main").querySelectorAll("[data-t]").forEach(b => b.onclick = async () => {
    const strike = await forge();
    const r = await LB.upgradeTier(b.dataset.t, b.dataset.i);
    if (!r.ok) { $("ws-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins/gems yet!" : "Couldn't upgrade that."; return; }
    if (strike === "perfect") { try { await LB.creditWallet({ coins: 15 }); } catch (e) {} }
    if (ls.get("ws_quest_claim", "") !== today()) ls.set("ws_quest", today());
    logCraft(`${b.dataset.n} → ${w.names[r.tier]}${strike === "perfect" ? " (perfect strike +15🪙)" : ""}`);
    if (window.AIGSkin) { await AIGSkin.refresh(); AIGSkin.burst(innerWidth / 2, innerHeight / 3); }
    if (r.tier === 3) K.toastAdv(`Holo crafted: ${b.dataset.n}!`);
    await load(); $("ws-msg").textContent = `✨ Upgraded to ${w.names[r.tier]}!${strike === "perfect" ? " Perfect strike: +15 🪙 back!" : ""}`;
  });
  let l = []; try { l = JSON.parse(ls.get("ws_log", "[]")); } catch (e) {}
  $("ws-log").innerHTML = l.length ? `<div class="kit-card"><div class="ws-h">📒 Crafting log</div>${l.map(x => `<div class="ws-d" style="padding:3px 0">${K.esc(x)}</div>`).join("")}</div>` : "";
}
