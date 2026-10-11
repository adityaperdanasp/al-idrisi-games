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
  paint(); fun();
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
  if (q) { const left = q.readyAt - now, gems = Math.max(1, Math.ceil(left / 3600000)); action = `<span class="gg-sub">⏳ Upgrading to Lv ${q.to} — ${fmtLeft(left)} left</span><button class="kit-btn" data-speed="${sk.id}">⚡ Rush 💎${gems}</button><button class="kit-btn alt" data-tune="${sk.id}">🔧 Tune-up quiz</button>`; }
  else if (lv >= 5) action = '<span class="gg-sub">⭐ Max level!</span>';
  else if (rented) action = '<span class="gg-sub">Rented vehicles can\'t be upgraded — buy it to level it up.</span>';
  else action = `<button class="kit-btn" data-up="${sk.id}">Upgrade to Lv ${lv + 1} · 🪙${step.coins} · ${step.hours}h</button>`;
  const edit = paintFor === sk.id ? paintPanel(sk) : "";
  return `<div class="gg-car">${thumb(sk)}<div class="gg-body"><div class="gg-name">${K.esc(sk.name)}${sk.kind === "bike" ? " 🏍️" : ""}${rented ? ` <small>⏳ rented ${fmtLeft(G.rentals[sk.id] - now)}</small>` : ""}</div><div class="gg-lv">${pips}</div>
    <div class="gg-sub">Lv ${lv}/5 · ${tab === "plane" ? `+${(lv - 1) * 5}% fire rate` : `+${(lv - 1) * 4}% speed${sk.kind === "bike" ? " +8% bike" : ""}`}${lv < 5 ? ` <b style="color:#2f6a2f">→ Lv ${lv + 1}: ${tab === "plane" ? `+${lv * 5}% fire rate` : `+${lv * 4}% speed`}</b>` : ""}</div>
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
  $("gg-main").querySelectorAll("[data-tune]").forEach(b => b.onclick = () => tuneQuiz(b.dataset.tune));
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

// =================================================================
// Audit batch 2 -- fun zone: test drive (dodge cones), drag race against
// Bo-Bot (quick maths), tune-up quiz that shaves minutes off an upgrade,
// collection progress and a daily garage job.
// =================================================================
const today = () => new Date().toISOString().slice(0, 10);
const lsg = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lss = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
// Audit round 2: a 🏟️ test track (3 laps, a quick question at every corner -- right = clean
// corner, wrong = spin-out; best lap total kept), a weekly racing contract (win 3 drag races this
// week = 20 coins), and set bonuses (own every car / plane / boat = 15 coins each, once).
const weekKey = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
function contract() { let c = {}; try { c = JSON.parse(lsg("gg_contract", "{}")) || {}; } catch (e) {} if (c.w !== weekKey()) c = { w: weekKey(), wins: 0, paid: false }; return c; }
function fun() {
  const all = ["car", "plane", "boat"].flatMap(c => VEHICLE_SKINS[c]); const own = all.filter(sk => !sk.cost || G.owned[sk.id]).length;
  const job = lsg("gg_job", "") === today() ? (lsg("gg_jobpaid", "") === today() ? "paid" : "done") : "open";
  $("gg-fun").innerHTML = `<div class="gg-funrow"><button class="kit-btn" id="gg-td" type="button">🏁 Test drive</button><button class="kit-btn" id="gg-dr" type="button">🚦 Drag race</button><a class="kit-btn alt" href="../mathville/?drive=1">🚗 Drive Mode</a></div>
    <div class="gg-sub" style="margin-top:8px">🏆 Collection: <b>${own}/${all.length}</b> vehicles <span class="gg-cbar"><i style="width:${Math.round(own / all.length * 100)}%"></i></span></div>
    <div class="gg-funrow" style="margin-top:6px"><button class="kit-btn" id="gg-tt" type="button">🏟️ Test track${lsg("gg_track_best", "") ? ` (best ${lsg("gg_track_best", "")}s)` : ""}</button></div>
    <div class="gg-sub">📜 Weekly contract: win 3 drag races — ${(() => { const c = contract(); return c.paid ? "paid ✔" : c.wins >= 3 ? `✅ <button class="kit-btn" id="gg-ct" type="button" style="padding:4px 10px;font-size:.75rem">Claim 🪙20</button>` : `${c.wins}/3`; })()}</div>
    <div class="gg-sub">🎖️ Sets: ${["car", "plane", "boat"].map(c => { const set = VEHICLE_SKINS[c], have = set.filter(sk => !sk.cost || G.owned[sk.id]).length, full = have === set.length, paid = lsg("gg_set_" + c, "") === "1"; return `${c === "car" ? "🚗" : c === "plane" ? "✈️" : "⛵"} ${have}/${set.length}${full && !paid ? ` <button class="kit-btn" data-set="${c}" type="button" style="padding:3px 8px;font-size:.7rem">Claim 🪙15</button>` : full ? " ✔" : ""}`; }).join(" · ")}</div>
    <div class="gg-sub">🧰 Daily job: finish a test drive or drag race ${job === "open" ? "— 0/1" : job === "done" ? `— ✅ <button class="kit-btn" id="gg-job" type="button" style="padding:4px 10px;font-size:.75rem">Claim 🪙8</button>` : "— paid ✔"}</div>`;
  $("gg-td").onclick = testDrive; $("gg-dr").onclick = dragRace; $("gg-tt").onclick = testTrack;
  const ct = $("gg-ct"); if (ct) ct.onclick = async () => { const c = contract(); c.paid = true; lss("gg_contract", JSON.stringify(c)); try { await LB.creditWallet({ coins: 20 }); } catch (e) {} K.toastAdv("Racing contract complete! +20 coins"); load(); };
  $("gg-fun").querySelectorAll("[data-set]").forEach(b => b.onclick = async () => { lss("gg_set_" + b.dataset.set, "1"); try { await LB.creditWallet({ coins: 15 }); } catch (e) {} K.toastAdv("Full set bonus! +15 coins"); load(); });
  const jb = $("gg-job"); if (jb) jb.onclick = async () => { lss("gg_jobpaid", today()); try { await LB.creditWallet({ coins: 8 }); } catch (e) {} K.toastAdv("Garage job done! +8 coins"); load(); };
}
function jobDone() { if (lsg("gg_job", "") !== today()) lss("gg_job", today()); }
function overlay(html) { const o = document.createElement("div"); o.className = "kit-overlay"; o.innerHTML = `<div class="kit-modal">${html}</div>`; document.body.appendChild(o); return o; }
function testDrive() {
  const sk = VEHICLE_SKINS.car.find(x => !x.cost || G.owned[x.id]) || VEHICLE_SKINS.car[0];
  const o = overlay(`<h2>🏁 Test drive</h2><p class="kit-sub">Tap ◀ ▶ to dodge the cones for 20 seconds!</p><div class="gg-road" id="gg-road"><div class="gg-me" id="gg-me">${sk.svg}</div></div><div class="gg-funrow"><button class="kit-btn" id="gg-l" type="button">◀</button><b id="gg-tdt">20</b><button class="kit-btn" id="gg-r" type="button">▶</button></div>`);
  const road = o.querySelector("#gg-road"), me = o.querySelector("#gg-me"); let lane = 1, hits = 0, t0 = performance.now(), cones = [], next = 0, raf;
  const place = () => { me.style.left = (lane * 33.3 + 16.6) + "%"; }; place();
  o.querySelector("#gg-l").onclick = () => { lane = Math.max(0, lane - 1); place(); }; o.querySelector("#gg-r").onclick = () => { lane = Math.min(2, lane + 1); place(); };
  const loop = now => {
    const el = (now - t0) / 1000; o.querySelector("#gg-tdt").textContent = Math.max(0, Math.ceil(20 - el));
    if (now > next) { const c = document.createElement("span"); c.className = "gg-cone"; c.textContent = "🚧"; c.dataset.lane = Math.floor(Math.random() * 3); c.style.left = (c.dataset.lane * 33.3 + 16.6) + "%"; c.dataset.y = -10; road.appendChild(c); cones.push(c); next = now + Math.max(420, 900 - el * 25); }
    cones.forEach(c => { c.dataset.y = +c.dataset.y + 1.6 + el * 0.06; c.style.top = c.dataset.y + "%"; if (+c.dataset.y > 78 && +c.dataset.y < 92 && +c.dataset.lane === lane && !c.dataset.hit) { c.dataset.hit = 1; hits++; road.classList.remove("hit"); void road.offsetWidth; road.classList.add("hit"); } });
    cones = cones.filter(c => { if (+c.dataset.y > 105) { c.remove(); return false; } return true; });
    if (el >= 20) { cancelAnimationFrame(raf); jobDone(); o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">${hits === 0 ? "🏆" : "🚗"}</div><h2>${hits === 0 ? "Perfect drive!" : "Nice driving!"}</h2><p class="kit-sub">Cones hit: ${hits}</p><button class="kit-btn block" id="gg-x" type="button">Back to the garage</button>`; o.querySelector("#gg-x").onclick = () => { o.remove(); load(); }; if (hits === 0) K.toastAdv("Perfect test drive!"); return; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function dragRace() {
  const o = overlay(`<h2>🚦 Drag race</h2><p class="kit-sub">5 quick questions. Each right answer pushes your car — beat Bo-Bot to the line!</p><div class="gg-strip"><span id="gg-pa">🏎️</span></div><div class="gg-strip"><span id="gg-pb">🤖</span></div><div class="kit-q" id="gg-q"></div><div class="kit-opts" id="gg-o"></div>`);
  let me = 0, bot = 0, n = 0, done = false, right = 0;
  const bt = setInterval(() => { if (done) return; bot = Math.min(100, bot + 3.2); o.querySelector("#gg-pb").style.left = bot + "%"; if (bot >= 100) end(false); }, 250);
  function ask() {
    if (done) return; const q = K.question({ subject: "math", difficulty: "easy" });
    o.querySelector("#gg-q").textContent = q.prompt;
    o.querySelector("#gg-o").innerHTML = q.options.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("");
    o.querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === q.correctLabel; K.record("garage", q.key, ok, q); if (ok) { right++; me = Math.min(100, me + 21); } o.querySelector("#gg-pa").style.left = me + "%"; n++; if (me >= 100) return end(true); if (n >= 5) return end(me > bot); ask(); });
  }
  async function end(win) { if (done) return; done = true; clearInterval(bt); jobDone(); if (win) { const c = contract(); c.wins++; lss("gg_contract", JSON.stringify(c)); } o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">${win ? "🏆" : "🤖"}</div><h2>${win ? "You win the drag race!" : "Bo-Bot wins this time"}</h2><p class="kit-sub">${right}/5 right</p><div class="kit-bonus" id="gg-b"></div><button class="kit-btn block" id="gg-x" type="button">Back to the garage</button>`; o.querySelector("#gg-x").onclick = () => { o.remove(); load(); }; K.finish("garage", win ? 6 : 2, o.querySelector("#gg-b")); }
  ask();
}
function testTrack() {
  const o = overlay(`<h2>🏟️ Test track</h2><p class="kit-sub">3 laps, 3 corners each. Answer fast to take each corner cleanly!</p><div class="gg-track"><span id="gg-car">🏎️</span></div><div class="kit-sub" id="gg-lap" style="font-weight:800"></div><div class="kit-q" id="gg-q"></div><div class="kit-opts" id="gg-o"></div>`);
  let corner = 0, spins = 0; const t0 = performance.now();
  function ask() {
    if (corner >= 9) {
      const secs = Math.round((performance.now() - t0) / 1000 + spins * 3), best = Number(lsg("gg_track_best", "0"));
      if (!best || secs < best) lss("gg_track_best", String(secs)); jobDone();
      o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">🏁</div><h2>${secs}s</h2><p class="kit-sub">Spin-outs: ${spins} (+3s each)${!best || secs < best ? " · 🌟 New track record!" : ` · best ${best}s`}</p><div class="kit-bonus" id="gg-b"></div><button class="kit-btn block" id="gg-x" type="button">Back to the garage</button>`;
      o.querySelector("#gg-x").onclick = () => { o.remove(); load(); }; K.finish("garage", Math.max(2, 9 - spins), o.querySelector("#gg-b")); return;
    }
    o.querySelector("#gg-lap").textContent = `Lap ${Math.floor(corner / 3) + 1}/3 · corner ${corner % 3 + 1}/3`;
    o.querySelector("#gg-car").style.left = (corner / 9 * 90) + "%";
    const q = K.question({ subject: "math", difficulty: "easy" });
    o.querySelector("#gg-q").textContent = q.prompt;
    o.querySelector("#gg-o").innerHTML = q.options.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("");
    o.querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === q.correctLabel; K.record("garage", q.key, ok, q); const car = o.querySelector("#gg-car"); car.classList.remove("spin"); void car.offsetWidth; if (!ok) { spins++; car.classList.add("spin"); } corner++; setTimeout(ask, ok ? 250 : 700); });
  }
  ask();
}
function tuneQuiz(id) {
  const o = overlay(`<h2>🔧 Tune-up quiz</h2><p class="kit-sub">3 questions — each right answer takes 20 minutes off this upgrade.</p><div class="kit-q" id="gg-q"></div><div class="kit-opts" id="gg-o"></div><div class="kit-bonus" id="gg-tm"></div>`);
  let n = 0, right = 0;
  function ask() {
    const q = K.question({ subject: "math" }); o.querySelector("#gg-q").textContent = q.prompt;
    o.querySelector("#gg-o").innerHTML = q.options.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("");
    o.querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => { const ok = b.dataset.o === q.correctLabel; K.record("garage", q.key, ok, q); if (ok) right++; n++; o.querySelector("#gg-tm").textContent = `${right} right · −${right * 20} min`; if (n < 3) return ask();
      const k = "gg_tune_" + id + "_" + today(); if (lsg(k, "") === "1") { o.querySelector(".kit-modal").innerHTML = `<h2>Already tuned today</h2><p class="kit-sub">Come back tomorrow for another tune-up on this vehicle.</p><button class="kit-btn block" id="gg-x" type="button">OK</button>`; o.querySelector("#gg-x").onclick = () => o.remove(); return; }
      lss(k, "1"); const r = await LB.tuneUpVehicle(id, right * 20);
      o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">🔧</div><h2>${r.ok ? (r.done ? "Upgrade finished!" : `−${r.cut} minutes!`) : "Tune-up done"}</h2><p class="kit-sub">${right}/3 right</p><button class="kit-btn block" id="gg-x" type="button">Back to the garage</button>`;
      o.querySelector("#gg-x").onclick = () => { o.remove(); load(); }; });
  }
  ask();
}
