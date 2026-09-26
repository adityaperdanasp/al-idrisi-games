/* =================================================================
   Workshop (PM round 14, items 15, 16, 17, 19) -- upgrade what you own:
   Standard -> Gold (60 coins) -> Holo (3 gems). What a tier does:
     effects / trails / stickers / themes  more, bigger, shinier particles
     ninja costumes / Boss Rush fighters   glowing aura in the game
     profile backgrounds                   shimmer
     plane ammo                            stronger version of its power
   Tiers live at players/{id}/tiers/{type}::{id}; skin.js and the games read them.
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
if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("✨"));
else load();
async function load() {
  const [w, wal] = await Promise.all([LB.getWorkshop(), LB.getWallet()]);
  $("ws-wallet").textContent = `🪙 ${wal.coins || 0}   💎 ${wal.gems || 0}`;
  if (!w.groups.length) { $("ws-main").innerHTML = '<div class="kit-card"><div class="kit-sub" style="margin:0;text-align:center">You don\'t own anything upgradeable yet — buy an effect, trail, sticker, theme or costume first (🎨 Customize, Extras shop, Mystery Egg).</div></div>'; return; }
  $("ws-main").innerHTML = w.groups.map(g => `<div class="kit-card"><div class="ws-h">${K.esc(g.label)}</div><div class="ws-d">${K.esc(DESC[g.type] || "")}</div>${g.items.map(it => {
    const nxt = w.costs[it.tier + 1], label = nxt ? (nxt.coins ? `🪙${nxt.coins}` : `💎${nxt.gems}`) : "";
    return `<div class="ws-row"><span class="ws-e">${it.preview}</span><span class="ws-b"><span class="ws-n">${K.esc(it.name)}</span><br><span class="ws-t t${it.tier}">${w.names[it.tier]}</span></span>${nxt ? `<button class="kit-btn" data-t="${K.esc(it.type)}" data-i="${K.esc(it.id)}" style="padding:6px 12px;font-size:.78rem">→ ${w.names[it.tier + 1]} ${label}</button>` : '<span class="ws-d">⭐ Max</span>'}</div>`;
  }).join("")}</div>`).join("") + '<div class="kit-bonus" id="ws-msg"></div>';
  $("ws-main").querySelectorAll("[data-t]").forEach(b => b.onclick = async () => {
    const r = await LB.upgradeTier(b.dataset.t, b.dataset.i);
    if (!r.ok) { $("ws-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins/gems yet!" : "Couldn't upgrade that."; return; }
    if (window.AIGSkin) { await AIGSkin.refresh(); AIGSkin.burst(innerWidth / 2, innerHeight / 3); }
    await load(); $("ws-msg").textContent = `✨ Upgraded to ${w.names[r.tier]}!`;
  });
}
