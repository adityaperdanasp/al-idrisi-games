/* =================================================================
   Weekly Boss (PM round 13, item 1) -- one big boss for the whole class
   each week. Every correct answer anyone gives this week hurts it; it has
   three phases with new taunts. Beat it together and everyone who helped
   gets a chest: bronze (10+ hits), silver (30+), gold (60+). Last week's
   chest can still be claimed here. Damage comes straight from the weekly
   correct-answer counters, so there is nothing extra to play or sync.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const TAUNTS = [
  ["You can't scratch me!", "Is that all you've got?", "Ha! Try harder!"],
  ["Ouch… you're stronger than I thought.", "Stop that! …okay, that hurt.", "My scales are cracking!"],
  ["No… not the last of my HP!", "I… I'm beginning to respect you.", "Just… one… more… hit…"]
];
if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("🐉"));
else load();

async function load() {
  const d = await AIGLeaderboard.getWeeklyBoss();
  const c = d.current;
  const left = Math.max(0, c.hp - c.damage), pct = Math.round(left / c.hp * 100);
  const phase = c.defeated ? 3 : pct > 66 ? 0 : pct > 33 ? 1 : 2;
  const taunt = c.defeated ? "…you win. This time." : TAUNTS[phase][Math.floor(Math.random() * 3)];
  $("wbs-boss").innerHTML = `<div class="wbs-em ${c.defeated ? "dead" : ""}" id="wbs-em">${c.boss.emoji}</div><div class="wbs-name">${K.esc(c.boss.name)}</div><div class="wbs-lore">${K.esc(c.boss.lore)} · Phase ${Math.min(3, phase + 1)}/3</div>
    <div class="wbs-hp"><i style="width:${pct}%"></i><b>${left} / ${c.hp} HP</b></div><div class="wbs-taunt">“${K.esc(taunt)}”</div>
    <div style="margin-top:10px;font-weight:800;font-size:.85rem">${c.players} player${c.players === 1 ? "" : "s"} fighting · the boss gets stronger as more classmates join</div>`;
  if (!c.defeated) { const em = $("wbs-em"); setInterval(() => { em.classList.remove("hit"); void em.offsetWidth; em.classList.add("hit"); }, 6000); }

  const tiers = d.tiers.slice().reverse();
  $("wbs-me").innerHTML = `<div style="font-family:'Baloo 2',sans-serif;font-weight:800;margin-bottom:4px">🎁 Your hits this week: ${c.mine}</div>
    ${tiers.map(t => `<div class="wbs-tier ${c.mine >= t.hits ? "got" : ""}"><span>${c.mine >= t.hits ? "✅" : "🔒"} ${t.label} (${t.hits}+ hits)</span><span>🪙${t.reward.coins}${t.reward.gems ? " 💎" + t.reward.gems : ""}</span></div>`).join("")}
    <button class="kit-btn block" id="wbs-claim" style="margin-top:10px" ${c.canClaim ? "" : "disabled"}>${c.claimed ? "Chest collected ✓" : c.canClaim ? `🎁 Open my ${c.tier.label}!` : c.defeated ? "Get 10+ hits to share the loot" : "Defeat the boss together to open chests"}</button><div class="kit-bonus" id="wbs-msg" style="margin-top:6px"></div>
    <div class="kit-sub" style="text-align:center;margin:8px 0 0">Every right answer in any game is a hit. Keep playing!</div>`;
  $("wbs-claim").onclick = () => claim(c.wk);

  $("wbs-top").innerHTML = `<div style="font-family:'Baloo 2',sans-serif;font-weight:800;margin-bottom:6px">⚔️ Top hitters</div>${c.top.length ? c.top.map((t, i) => `<div class="wbs-tier"><span>${["🥇", "🥈", "🥉"][i] || (i + 1) + "."} ${K.esc(t.name)}</span><span>${t.hits}</span></div>`).join("") : '<div class="kit-sub" style="margin:0">Be the first to strike!</div>'}`;

  const p = d.previous;
  if (p.players && (p.canClaim || (p.defeated && p.claimed))) {
    $("wbs-prev").hidden = false;
    $("wbs-prev").innerHTML = `<div style="font-family:'Baloo 2',sans-serif;font-weight:800">Last week: ${p.boss.emoji} ${K.esc(p.boss.name)} — ${p.defeated ? "defeated! 🎉" : "escaped"}</div>${p.canClaim ? `<button class="kit-btn block" id="wbs-claim-prev" style="margin-top:8px">🎁 Open last week's ${p.tier.label}</button>` : '<div class="kit-sub" style="margin:6px 0 0">Chest already collected ✓</div>'}`;
    const b = $("wbs-claim-prev"); if (b) b.onclick = () => claim(p.wk);
  }
  async function claim(wk) {
    const r = await AIGLeaderboard.claimWeeklyBoss(wk);
    if (r.ok) { if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); $("wbs-msg") && ($("wbs-msg").textContent = `🎉 ${r.tier.label}: +🪙${r.tier.reward.coins}${r.tier.reward.gems ? " +💎" + r.tier.reward.gems : ""}`); setTimeout(load, 1300); }
  }
}
