/* =================================================================
   Bo's World (PM round 12) -- one page, several tabs. TABS is an array of
   { id, label, render(el) }; later batches push more entries.
     🏠 Home     (item 1)  furnish Bo's house with coins
     ⬆️ Bo Level (item 2)  Bo grows as you answer; daily gift
     🐾 Familiar (item 3)  adopt a companion that follows you into games
     🎧 Radio    (item 10) calm synthesized background sounds
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const TABS = [];
let current = "home";

function bubble(text) { const s = document.getElementById("bh-say"); if (s) s.textContent = text; }
function boHeader(text, aura) {
  return `<div class="bh-bo ${aura ? "aura" : ""}"><img src="../icon-192.png" alt="Bo"><div class="bh-say" id="bh-say">${K.esc(text)}</div></div>`;
}

/* ---- 1. Bo's Home ---- */
TABS.push({ id: "home", label: "🏠 Home", async render(el) {
  const home = await LB.getBoHome();
  let sel = null;
  const draw = async () => {
    const h = await LB.getBoHome();
    const byId = Object.fromEntries(h.furniture.map(f => [f.id, f]));
    const slots = Array.from({ length: 12 }, (_, i) => {
      const locked = i >= h.total, id = h.slots[i];
      return `<button class="bh-slot ${id ? "has" : ""} ${locked ? "lock" : ""}" data-i="${i}" ${locked ? "disabled" : ""}>${locked ? "🔒" : id ? byId[id].emoji : "＋"}</button>`;
    }).join("");
    let panel;
    if (sel === null) panel = `<div class="kit-sub" style="text-align:center;margin:10px 0 0">Tap a spot to decorate. More spots unlock as Bo levels up (now level ${h.level}: ${h.rows} row${h.rows === 1 ? "" : "s"}).</div>`;
    else {
      const cur = h.slots[sel];
      panel = `<div class="kit-sub" style="margin:10px 0 4px;font-weight:800">Spot ${sel + 1}${cur ? ` — ${byId[cur].emoji} ${byId[cur].name}` : ""}</div>${cur ? '<button class="kit-btn alt" id="bh-clear">Take it away</button>' : ""}
        <div class="bh-shop">${h.furniture.map(f => `<button class="bh-item" data-f="${f.id}"><span class="e">${f.emoji}</span>${f.name}<br><small>${h.owned[f.id] ? "Owned — place" : "🪙" + f.cost}</small></button>`).join("")}</div>`;
    }
    el.innerHTML = `${boHeader(h.moodText, h.level >= 8)}<div class="bh-room">${slots}</div>${panel}<div class="kit-bonus" id="bh-msg" style="margin-top:8px"></div>`;
    el.querySelectorAll(".bh-slot:not(.lock)").forEach(b => b.onclick = () => { sel = +b.dataset.i; draw(); });
    const clr = el.querySelector("#bh-clear"); if (clr) clr.onclick = async () => { await LB.placeFurniture(sel, null); sel = null; draw(); };
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = async () => {
      const id = b.dataset.f;
      if (!h.owned[id]) { const r = await LB.buyFurniture(id); if (!r.ok) { $("bh-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins yet — answer some questions!" : "Couldn't buy that."; return; } }
      await LB.placeFurniture(sel, id); sel = null; await draw();
    });
  };
  await draw();
}});

/* ---- 2. Bo Level ---- */
TABS.push({ id: "level", label: "⬆️ Bo Level", async render(el) {
  const b = await LB.getBoStatus();
  const pct = b.maxed ? 100 : Math.round(b.xpInto / b.xpNext * 100);
  el.innerHTML = `<div class="kit-card">${boHeader(`I'm level ${b.level}! Every answer you get right helps me grow.`, b.level >= 8)}
    <div style="font-family:'Baloo 2',sans-serif;font-weight:800;text-align:center;font-size:1.4rem">Bo · Level ${b.level}</div>
    <div class="kit-bar" style="margin:6px 0"><i style="width:${pct}%;background:linear-gradient(90deg,#c08be8,#7c3aed)"></i></div>
    <div class="kit-sub" style="text-align:center;margin:0 0 12px">${b.maxed ? "Max level reached! 🌟" : `${b.xpInto}/${b.xpNext} right answers to level ${b.level + 1}`}</div>
    <button class="kit-btn block" id="bl-gift" ${b.giftReady ? "" : "disabled"}>${b.level < 2 ? "🎁 Bo's gift unlocks at level 2" : b.giftReady ? `🎁 Open Bo's daily gift (🪙${b.giftReward.coins}${b.giftReward.gems ? " 💎" + b.giftReward.gems : ""})` : "🎁 Come back tomorrow for another gift"}</button>
    <div class="kit-bonus" id="bl-msg"></div></div>
    <div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;font-weight:800">What Bo unlocks</div>${b.perks.map(p => `<div class="bh-perk ${b.level >= p.lvl ? "" : "off"}"><span>${b.level >= p.lvl ? "✅" : "🔒"}</span><span><b>Lv ${p.lvl}</b> — ${K.esc(p.text)}</span></div>`).join("")}</div>`;
  el.querySelector("#bl-gift").onclick = async () => {
    const r = await LB.claimBoGift();
    if (!r.ok) return;
    $("bl-msg").textContent = `🎉 +🪙${r.reward.coins}${r.reward.gems ? " +💎" + r.reward.gems : ""}!`;
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    setTimeout(() => this.render(el), 1200);
  };
}});

/* ---- 3. Familiar ---- */
TABS.push({ id: "familiar", label: "🐾 Familiar", async render(el) {
  const f = await LB.getFamiliar();
  if (!f.adopted) {
    el.innerHTML = `<div class="kit-card"><div class="kit-q">Choose your companion</div><p class="kit-sub" style="text-align:center">Your familiar follows you into every game and cheers when you get answers right. You can only adopt one, so choose well!</p>
      <div class="bh-shop" style="grid-template-columns:repeat(2,1fr)">${f.species.map(s => `<button class="bh-item" data-s="${s.id}"><span class="e" style="font-size:2.4rem">${s.emoji}</span>${s.name}<br><small>${s.quip}</small></button>`).join("")}</div>
      <input id="fm-name" class="ed-input" maxlength="14" placeholder="Give it a name (optional)" style="width:100%;margin-top:10px;padding:10px;border:2px solid #e6dcf5;border-radius:12px;font:inherit"><div class="kit-bonus" id="fm-msg" style="margin-top:8px"></div></div>`;
    el.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => { const r = await LB.adoptFamiliar(b.dataset.s, $("fm-name").value); if (r.ok) { if (window.AIGSkin) { await AIGSkin.refresh(); AIGSkin.burst(innerWidth / 2, innerHeight / 3); } this.render(el); } });
    return;
  }
  const a = f.adopted;
  el.innerHTML = `<div class="kit-card"><div class="bh-fam-big">${a.emoji}</div><div style="font-family:'Baloo 2',sans-serif;font-weight:800;text-align:center;font-size:1.3rem">${K.esc(a.name)} · Level ${a.level}</div>
    <div class="kit-bar" style="margin:8px 0"><i style="width:${a.level >= 10 ? 100 : Math.round(a.xpInto / 25 * 100)}%;background:linear-gradient(90deg,#c08be8,#7c3aed)"></i></div>
    <div class="kit-sub" style="text-align:center">${a.level >= 10 ? "Fully grown! 🌟" : `${a.xpInto}/25 to level ${a.level + 1}`} — it grows from your right answers and treats.</div>
    <button class="kit-btn block" id="fm-feed" ${a.hungry ? "" : "disabled"}>${a.hungry ? `🍖 Give a treat (🪙${f.treat.cost.coins}, +${f.treat.xp} growth)` : "😋 Full for today"}</button><div class="kit-bonus" id="fm-msg"></div></div>
    <div class="kit-sub" style="text-align:center">Look for ${a.emoji} in the bottom-left corner of every page!</div>`;
  el.querySelector("#fm-feed").onclick = async () => {
    const r = await LB.feedFamiliar();
    if (!r.ok) return $("fm-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins yet!" : "Already fed today!";
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    this.render(el);
  };
}});

/* ---- 10. Radio ---- */
TABS.push({ id: "radio", label: "🎧 Radio", async render(el) {
  const R = window.AIGRadio;
  if (!R) { el.innerHTML = '<div class="kit-card"><div class="kit-sub">Radio is loading…</div></div>'; setTimeout(() => this.render(el), 600); return; }
  const paint = () => {
    el.innerHTML = `<div class="kit-card"><div class="kit-q">Study radio</div><p class="kit-sub" style="text-align:center">Calm background sounds while you learn. It stays on while you move around this page; the 🎧 button in the corner of every Game Room page controls it too.</p>
      ${R.TRACKS.map(t => `<button class="bh-rad ${R.current === t.id ? "on" : ""}" data-id="${t.id}">${t.emoji} ${t.name}${R.current === t.id ? " — playing" : ""}</button>`).join("")}
      <button class="bh-rad" data-id="">⏹️ Turn off</button>
      <div class="kit-sub" style="margin:10px 0 4px;font-weight:800">Volume</div><input id="rd-vol" type="range" min="0" max="100" value="${Math.round(R.volume * 100)}" style="width:100%"></div>`;
    el.querySelectorAll(".bh-rad").forEach(b => b.onclick = () => { b.dataset.id ? R.play(b.dataset.id) : R.stop(); paint(); });
    el.querySelector("#rd-vol").oninput = e => R.setVolume(e.target.value / 100);
  };
  paint();
}});

/* ---- shell ---- */
function show(id) {
  current = id;
  $("bh-tabs").innerHTML = TABS.map(t => `<button class="bh-tab ${t.id === id ? "on" : ""}" data-t="${t.id}">${t.label}</button>`).join("");
  $("bh-tabs").querySelectorAll(".bh-tab").forEach(b => b.onclick = () => show(b.dataset.t));
  const el = $("bh-main"); el.innerHTML = '<div class="kit-card"><div class="kit-sub" style="margin:0;text-align:center">Loading…</div></div>';
  TABS.find(t => t.id === id).render(el);
}
if (!player) $("bh-overlay").innerHTML = K.signedOutHtml("🏠");
else show(new URLSearchParams(location.search).get("tab") || "home");
