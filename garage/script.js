/* =================================================================
   Garage (PM round 14, items 1, 2, 7, 8, 11) -- every vehicle you own or
   rent, in one place:
     Upgrades  level 1 -> 5 for coins; each level takes real time (1h..12h)
               and can be rushed with gems. +4% Drive speed / +5% plane fire
               rate per level (bikes also +8% speed).
     Paint     hue (10 🪙), neon underglow (30 🪙), sticker (15 🪙); combos
               can be saved as 3 presets per vehicle.
     Rent      try an expensive vehicle for 24 hours at ~20% of its price.
   Vehicle designs come from ../vehicles.js (shared with MathVille).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const CATS = [["car", "🚗🏍️ Cars & Bikes"], ["plane", "✈️ Planes"], ["boat", "⛵ Boats"], ["rent", "🎟️ Rent"]];
const NEON = { none: "#94a3b8", blue: "#38bdf8", pink: "#f472b6", green: "#4ade80", gold: "#facc15", white: "#f8fafc" };
let tab = "car", G = null, paintFor = null, paintDraft = null;

if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("🔧"));
else init();

const fmtLeft = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const costLabel = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
const rentPrice = skin => skin.cost.coins ? Math.max(5, Math.ceil(skin.cost.coins * 0.2)) : 30;

async function init() {
  // Free starter skins are "owned" implicitly; record them so upgrades/paint (server-side) accept them.
  const owned0 = await LB.getOwnedVehicles("mathville");
  for (const cat of Object.keys(VEHICLE_SKINS)) for (const sk of VEHICLE_SKINS[cat]) if (!sk.cost && !owned0[sk.id]) await LB.unlockVehicle("mathville", sk.id, {});
  await load();
  setInterval(() => { if (Object.keys((G && G.queue) || {}).length) paint(); }, 30000);
}
async function load() {
  G = await LB.getGarage();
  const w = await LB.getWallet();
  $("gg-wallet").textContent = `🪙 ${w.coins || 0}   💎 ${w.gems || 0}`;
  paint();
}
const thumb = sk => {
  const p = (G.paints && G.paints[sk.id]) || {};
  const neon = NEON[p.neon] && p.neon && p.neon !== "none" ? `filter:drop-shadow(0 0 5px ${NEON[p.neon]}) drop-shadow(0 0 9px ${NEON[p.neon]});` : "";
  return `<span class="gg-th"><span style="${neon}display:grid;place-items:center">${sk.svg.replace("<svg ", `<svg style="${p.hue ? `filter:hue-rotate(${p.hue}deg)` : ""}" `)}</span>${p.sticker && p.sticker !== "none" ? `<span class="sticker">${p.sticker}</span>` : ""}</span>`;
};

function paint() {
  $("gg-tabs").innerHTML = CATS.map(([id, l]) => `<button class="gg-tab ${tab === id ? "on" : ""}" data-t="${id}">${l}</button>`).join("");
  $("gg-tabs").querySelectorAll(".gg-tab").forEach(b => b.onclick = () => { tab = b.dataset.t; paintFor = null; paint(); });
  const now = Date.now();
  if (tab === "rent") return paintRent(now);
  const list = VEHICLE_SKINS[tab].filter(sk => !sk.cost || G.owned[sk.id] || (G.rentals[sk.id] > now));
  $("gg-main").innerHTML = `<div class="kit-sub" style="margin:0 0 6px">Level up your vehicles: each level makes it a little better and takes some real time. Rush it with 💎 if you're impatient!</div>` +
    (list.length ? list.map(sk => card(sk, now)).join("") : '<div class="kit-sub">No vehicles here yet — buy one in a game or rent one in the 🎟️ Rent tab.</div>') + `<div class="kit-bonus" id="gg-msg"></div>`;
  wire(now);
}
function card(sk, now) {
  const lv = G.levels[sk.id] || 1, q = G.queue[sk.id], rented = G.rentals[sk.id] > now && sk.cost && !G.owned[sk.id];
  const step = LB.GARAGE_UPGRADE[lv + 1];
  const pips = Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("");
  let action;
  if (q) { const left = q.readyAt - now, gems = Math.max(1, Math.ceil(left / 3600000)); action = `<span class="gg-sub">⏳ Upgrading to Lv ${q.to} — ${fmtLeft(left)} left</span><button class="kit-btn" data-speed="${sk.id}">⚡ Rush 💎${gems}</button>`; }
  else if (lv >= 5) action = '<span class="gg-sub">⭐ Max level!</span>';
  else if (rented) action = '<span class="gg-sub">Rented vehicles can\'t be upgraded — buy it to level it up.</span>';
  else action = `<button class="kit-btn" data-up="${sk.id}">Upgrade to Lv ${lv + 1} · 🪙${step.coins} · ${step.hours}h</button>`;
  const edit = paintFor === sk.id ? paintPanel(sk) : "";
  return `<div class="gg-car">${thumb(sk)}<div class="gg-body"><div class="gg-name">${K.esc(sk.name)}${sk.kind === "bike" ? " 🏍️" : ""}${rented ? ` <small>⏳ rented ${fmtLeft(G.rentals[sk.id] - now)}</small>` : ""}</div><div class="gg-lv">${pips}</div>
    <div class="gg-sub">Lv ${lv}/5 · ${tab === "plane" ? `+${(lv - 1) * 5}% fire rate` : `+${(lv - 1) * 4}% speed${sk.kind === "bike" ? " +8% bike" : ""}`}</div>
    <div class="gg-btns">${action}<button class="kit-btn alt" data-paint="${sk.id}">🎨 Paint</button></div>${edit}</div></div>`;
}
function paintPanel(sk) {
  const d = paintDraft, P = LB.PAINT_PRICES, cur = (G.paints[sk.id]) || { hue: 0, neon: "none", sticker: "none" };
  const cost = (d.hue !== (cur.hue || 0) ? P.hue : 0) + (d.neon !== (cur.neon || "none") ? P.neon : 0) + (d.sticker !== (cur.sticker || "none") ? P.sticker : 0);
  const presets = cur.presets || {};
  return `<div class="gg-paint"><div class="gg-sub" style="font-weight:800">Colour shift (🪙${P.hue})</div><input type="range" id="pt-hue" min="0" max="350" step="10" value="${d.hue}" style="width:100%">
    <div class="gg-sub" style="font-weight:800">Neon underglow (🪙${P.neon})</div><div class="gg-sw">${LB.PAINT_NEONS.map(n => `<button data-neon="${n}" class="${d.neon === n ? "on" : ""}" style="border-color:${NEON[n]}">${n === "none" ? "Off" : n}</button>`).join("")}</div>
    <div class="gg-sub" style="font-weight:800">Sticker (🪙${P.sticker})</div><div class="gg-sw">${LB.PAINT_STICKERS.map(x => `<button data-st="${x}" class="${d.sticker === x ? "on" : ""}">${x === "none" ? "None" : x}</button>`).join("")}</div>
    <div class="gg-btns"><button class="kit-btn" id="pt-apply" ${cost ? "" : "disabled"}>Apply paint${cost ? ` · 🪙${cost}` : ""}</button><button class="kit-btn alt" id="pt-close">Close</button></div>
    <div class="gg-sub" style="font-weight:800;margin-top:8px">Presets (free to switch)</div>
    <div class="gg-btns">${[0, 1, 2].map(i => `<button class="kit-btn alt" data-ps="${i}">${presets[i] ? "Use #" + (i + 1) : "Empty #" + (i + 1)}</button><button class="kit-btn alt" data-pss="${i}" title="Save current look">💾</button>`).join("")}</div></div>`;
}
function wire(now) {
  const msg = t => { const m = $("gg-msg"); if (m) m.textContent = t; };
  const F = { "insufficient-funds": "Not enough coins/gems yet!", busy: "Two upgrades at a time — finish one first!", max: "Already max level." };
  $("gg-main").querySelectorAll("[data-up]").forEach(b => b.onclick = async () => { const r = await LB.startVehicleUpgrade(b.dataset.up); if (!r.ok) return msg(F[r.reason] || "Couldn't start that."); await load(); msg(`🔧 Upgrade started — ready in ${r.hours}h!`); });
  $("gg-main").querySelectorAll("[data-speed]").forEach(b => b.onclick = async () => { const r = await LB.speedUpVehicle(b.dataset.speed); if (!r.ok) return msg(F[r.reason] || "Couldn't rush that."); if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); await load(); msg(`⚡ Done! Now level ${r.to}.`); });
  $("gg-main").querySelectorAll("[data-paint]").forEach(b => b.onclick = () => { const id = b.dataset.paint; paintFor = paintFor === id ? null : id; const c = G.paints[id] || {}; paintDraft = { hue: c.hue || 0, neon: c.neon || "none", sticker: c.sticker || "none" }; paint(); });
  const hue = $("pt-hue"); if (hue) hue.oninput = e => { paintDraft.hue = +e.target.value; paint(); };
  $("gg-main").querySelectorAll("[data-neon]").forEach(b => b.onclick = () => { paintDraft.neon = b.dataset.neon; paint(); });
  $("gg-main").querySelectorAll("[data-st]").forEach(b => b.onclick = () => { paintDraft.sticker = b.dataset.st; paint(); });
  const ap = $("pt-apply"); if (ap) ap.onclick = async () => { const r = await LB.applyPaint(paintFor, paintDraft); if (!r.ok) return msg(F[r.reason] || "Couldn't paint that."); await load(); msg(`🎨 Painted! (−🪙${r.coins})`); };
  const cl = $("pt-close"); if (cl) cl.onclick = () => { paintFor = null; paint(); };
  $("gg-main").querySelectorAll("[data-pss]").forEach(b => b.onclick = async () => { await LB.savePaintPreset(paintFor, +b.dataset.pss); await load(); msg("💾 Preset saved."); });
  $("gg-main").querySelectorAll("[data-ps]").forEach(b => b.onclick = async () => { const r = await LB.applyPaintPreset(paintFor, +b.dataset.ps); if (r.ok) { const c = (await LB.getGarage()).paints[paintFor]; paintDraft = { hue: c.hue || 0, neon: c.neon || "none", sticker: c.sticker || "none" }; await load(); msg("🎨 Preset applied."); } else msg("That preset is empty — save one with 💾."); });
}
function paintRent(now) {
  const all = [];
  for (const cat of ["car", "plane", "boat"]) VEHICLE_SKINS[cat].forEach(sk => { if (sk.cost && !G.owned[sk.id]) all.push(sk); });
  $("gg-main").innerHTML = `<div class="kit-sub" style="margin:0 0 6px">Not sure about a vehicle? Rent it for 24 hours at about a fifth of the price — and use it in games while it lasts.</div>
    ${all.map(sk => { const r = G.rentals[sk.id] > now; return `<div class="gg-car">${thumb(sk)}<div class="gg-body"><div class="gg-name">${K.esc(sk.name)}${sk.kind === "bike" ? " 🏍️" : ""}</div><div class="gg-sub">Buy: ${costLabel(sk.cost)}</div>
      <div class="gg-btns">${r ? `<span class="gg-sub">⏳ Rented — ${fmtLeft(G.rentals[sk.id] - now)} left</span>` : `<button class="kit-btn" data-rent="${sk.id}" data-price="${rentPrice(sk)}">Rent 24h · 🪙${rentPrice(sk)}</button>`}<button class="kit-btn alt" data-buy="${sk.id}">Buy ${costLabel(sk.cost)}</button></div></div></div>`; }).join("") || '<div class="kit-sub">You own everything! 🎉</div>'}<div class="kit-bonus" id="gg-msg"></div>`;
  const msg = t => { $("gg-msg").textContent = t; };
  $("gg-main").querySelectorAll("[data-rent]").forEach(b => b.onclick = async () => { const r = await LB.rentVehicle(b.dataset.rent, +b.dataset.price); if (!r.ok) return msg(r.reason === "insufficient-funds" ? "Not enough coins yet!" : "Already rented or owned."); await load(); msg("🎟️ Rented for 24 hours!"); });
  $("gg-main").querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => {
    const sk = ["car", "plane", "boat"].flatMap(c => VEHICLE_SKINS[c]).find(x => x.id === b.dataset.buy);
    const r = await LB.unlockVehicle("mathville", sk.id, sk.cost); if (!r.ok) return msg("Not enough coins/gems yet!"); await load(); msg(`✅ ${sk.name} is yours!`);
  });
}
