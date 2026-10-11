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
  $("wbs-raid").innerHTML = c.defeated ? `<div class="kit-sub" style="margin:0;text-align:center">🎉 Defeated this week! A new boss arrives on Monday (${weekLeft()}).</div>`
    : `<button class="kit-btn block" id="wbs-go" type="button">⚔️ Raid now — 10 questions, every right answer is a hit!</button><div class="kit-sub" style="text-align:center;margin:6px 0 0">Boss escapes in ${weekLeft()} · phase ${Math.min(3, phase + 1)}: ${["normal questions", "trickier questions", "fast questions (6s)"][phase]}</div>`;
  const go = $("wbs-go"); if (go) go.onclick = () => raid(c, phase, left);

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

// =================================================================
// Audit batch 2/3: a real raid on this page. Every right answer here is a
// normal right answer (so it counts toward the weekly boss damage like any
// game). Phase 2 uses medium/hard questions, phase 3 adds a 6-second timer;
// the boss roars every 4th question (timer), crits at a 5-streak are shown
// as big hits, and landing the final blow gets a title toast.
// =================================================================
function weekLeft() { const now = new Date(), d = now.getUTCDay(), n = new Date(now); n.setUTCDate(now.getUTCDate() + ((8 - d) % 7 || 7)); n.setUTCHours(0, 0, 0, 0); const ms = n - now, dd = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24; return dd ? `${dd}d ${h}h` : `${h}h`; }
function raid(c, phase, hpLeft) {
  const o = document.createElement("div"); o.className = "kit-overlay"; document.body.appendChild(o);
  let n = 0, hits = 0, streak = 0, tmr = null;
  const draw = (q, roar) => {
    o.innerHTML = `<div class="kit-modal"><div class="wbs-em" id="wbs-re" style="font-size:3.4rem">${c.boss.emoji}</div><div class="wbs-hp" style="margin:6px 0"><i style="width:${Math.max(0, Math.round((hpLeft - hits) / c.hp * 100))}%"></i><b>${Math.max(0, hpLeft - hits)} HP</b></div>
      <div class="kit-sub" style="margin:0 0 6px">Question ${n + 1}/10 · ⚔️ ${hits} hits${roar ? " · 🔥 ROAR! answer fast" : ""}</div>${roar || phase === 2 ? '<div class="kit-bar" style="margin-bottom:8px"><i id="wbs-t"></i></div>' : ""}
      <div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("")}</div><div id="wbs-dmg" class="wbs-dmg"></div></div>`;
  };
  const ask = () => {
    clearInterval(tmr);
    if (n >= 10) return end();
    const roar = (n + 1) % 4 === 0, q = K.question({ difficulty: phase >= 1 ? (n > 5 ? "hard" : "medium") : "medium" });
    draw(q, roar);
    if (roar || phase === 2) { let t = 6; tmr = setInterval(() => { t -= 0.1; const b = document.getElementById("wbs-t"); if (b) b.style.width = Math.max(0, t / 6 * 100) + "%"; if (t <= 0) { clearInterval(tmr); answer(null, q); } }, 100); }
    o.querySelectorAll(".kit-opt").forEach(b => b.onclick = () => answer(b, q));
  };
  const answer = (b, q) => {
    clearInterval(tmr); const ok = !!b && b.dataset.o === q.correctLabel; K.record("weekly-boss", q.key, ok, q);
    o.querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); }); if (b && !ok) b.classList.add("wrong");
    const em = document.getElementById("wbs-re"), dm = document.getElementById("wbs-dmg");
    if (ok) { hits++; streak++; const crit = streak % 5 === 0; if (em) { em.classList.remove("hit"); void em.offsetWidth; em.classList.add("hit"); } if (dm) dm.textContent = crit ? "💥 CRITICAL HIT!" : "⚔️ -1 HP"; if (hpLeft - hits === 0) K.toastAdv("You landed the FINAL BLOW!"); }
    else { streak = 0; if (dm) dm.textContent = b ? `🛡️ Blocked! It was ${q.correctLabel}` : `⏰ Too slow! It was ${q.correctLabel}`; }
    n++; setTimeout(ask, ok ? 700 : 1500);
  };
  const end = () => { o.innerHTML = `<div class="kit-modal"><div class="kit-big">⚔️</div><h2>Raid over!</h2><p class="kit-sub">You landed ${hits} hit${hits === 1 ? "" : "s"} on ${K.esc(c.boss.name)}.</p><div class="kit-bonus" id="wbs-rb"></div><button class="kit-btn block" type="button" id="wbs-rx">Back to the boss</button></div>`; o.querySelector("#wbs-rx").onclick = () => { o.remove(); setTimeout(load, 300); }; K.finish("weekly-boss", Math.min(8, hits), o.querySelector("#wbs-rb")); };
  ask();
}
