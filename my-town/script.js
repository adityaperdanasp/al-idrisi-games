/* =================================================================
   My Town (PM round 11, item 6) -- a 5x5 town you furnish with coins/gems.
   Beauty = points of what you build. Friends can visit from the Visit tab
   and leave a 💖 (once a day per town); you collect 2 coins per like.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("mt-overlay").innerHTML = K.signedOutHtml("🏘️");
else init();

// Audit batch 6: residents that walk around (more beauty = more people), a town level, day/night,
// a daily town event solved with 3 questions, weekly mayor missions, tourists for pretty towns, and
// the visit list sorted by beauty with crowns for the top 3.
const lsm = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsmw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const tday = () => new Date().toISOString().slice(0, 10);
const tweek = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const EVENTS = [["🔥", "A small fire at the bakery!", "Answer 3 questions to put it out."], ["🐶", "A puppy is lost in town!", "Answer 3 questions to follow its trail."], ["🎉", "Festival day!", "Answer 3 questions to set up the stalls."], ["🌧️", "A big rainstorm!", "Answer 3 questions to fix the leaky roofs."]];
const PEOPLE = ["🚶", "🧍", "🏃", "🚴", "👩‍🦽", "🧑‍🍳", "👮", "🧒"];
async function init() {
  const LB = AIGLeaderboard;
  let view = "mine", town = null, sel = null, visiting = null;

  async function wallet() { const w = await LB.getWallet(); $("mt-wallet").textContent = `🪙 ${w.coins || 0}  💎 ${w.gems || 0}`; }
  const cost = c => c.coins ? `🪙${c.coins}` : `💎${c.gems}`;
  const emojiOf = (t, id, idx) => {
    const b = t.buildings.find(x => x.id === id) || t.landmarkAll.find(x => x.id === id);
    if (!b) return "";
    return t.levels && t.levels[idx] === 2 && t.level2Emoji[id] ? t.level2Emoji[id] : b.emoji; // level 2 = fancier look
  };

  async function load(ownerId) { town = await LB.getTown(ownerId); town.landmarkAll = LB.TOWN_LANDMARKS; paint(); }
  function paint() {
    $("mt-beauty").textContent = town.beauty;
    const mine = view === "mine";
    $("mt-likes").textContent = mine ? `💖 ${town.likes} today` : "";
    $("mt-title").textContent = mine ? "Tap a tile to build. Tap a building to remove it (half your coins back)." : `Visiting ${visiting ? visiting.name : ""}'s town`;
    $("mt-grid").innerHTML = Array.from({ length: town.size }, (_, i) => {
      const b = town.tiles[i];
      return `<button class="mt-tile ${b ? "has" : ""}" data-i="${i}" style="${town.levels && town.levels[i] === 2 ? "box-shadow:inset 0 0 0 3px #facc15" : ""}">${b ? emojiOf(town, b, i) : ""}</button>`;
    }).join("");
    $("mt-grid").querySelectorAll(".mt-tile").forEach(t => t.onclick = () => tile(+t.dataset.i));
    // residents + day/night
    const night = new Date().getHours() >= 19 || new Date().getHours() < 6, pop = Math.min(10, Math.floor(town.beauty / 5));
    $("mt-grid").classList.toggle("mt-night", night);
    $("mt-life").innerHTML = Array.from({ length: pop }, (_, k) => `<span style="animation-delay:${-k * 1.3}s;top:${10 + (k * 37) % 80}%">${PEOPLE[k % PEOPLE.length]}</span>`).join("") + (night ? '<b class="mt-moon">🌙</b>' : "");
    const lvl = town.beauty >= 120 ? "🏙️ City" : town.beauty >= 60 ? "🏘️ Town" : town.beauty >= 20 ? "🏡 Village" : "⛺ Camp";
    $("mt-level").textContent = view === "mine" ? `${lvl} · 👥 ${pop * 3} residents` : "";
    panel();
  }
  function tile(i) {
    if (view !== "mine") return;
    sel = i; panel();
  }
  async function panel() {
    const p = $("mt-panel");
    if (view === "visit" && !visiting) {
      const towns = await LB.listTowns();
      $("mt-grid").style.display = "none"; $("mt-title").textContent = "Pick a town to visit";
      p.innerHTML = towns.length ? towns.filter(t => t.id !== player.id).sort((a, b) => b.beauty - a.beauty).map((t, k) => `<div class="mt-row"><span>${["👑", "🥈", "🥉"][k] || ""} <b>${K.esc(t.name)}</b> · ✨ ${t.beauty}</span><button class="kit-btn" data-v="${K.esc(t.id)}" data-n="${K.esc(t.name)}" style="padding:6px 14px">Visit</button></div>`).join("") || '<div class="kit-sub">No other towns yet — be the first to invite friends!</div>' : '<div class="kit-sub" style="text-align:center">No towns to visit yet.</div>';
      p.querySelectorAll("[data-v]").forEach(b => b.onclick = async () => { visiting = { id: b.dataset.v, name: b.dataset.n }; $("mt-grid").style.display = ""; await load(visiting.id); });
      return;
    }
    $("mt-grid").style.display = "";
    if (view === "visit") {
      p.innerHTML = `<div class="kit-sub" style="text-align:center">✨ Beauty ${town.beauty}</div><div class="mt-sheet"><button class="kit-btn" id="mt-like">💖 Leave a like</button><button class="kit-btn alt" id="mt-back">← Other towns</button></div><div class="kit-bonus" id="mt-msg" style="margin-top:10px"></div>`;
      $("mt-like").onclick = async () => { const r = await LB.likeTown(visiting.id); $("mt-msg").textContent = r.ok ? "💖 Sent! They'll be so happy." : "You already liked this town today."; };
      $("mt-back").onclick = () => { visiting = null; panel(); };
      return;
    }
    // my town
    const counts = {}; Object.values(town.tiles).forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const kinds = Object.keys(counts).length, ups = town.levels ? Object.values(town.levels).filter(x => x === 2).length : 0;
    const MISSIONS = [["Build 3 different kinds of buildings", kinds >= 3, 6], ["Reach ✨ 40 beauty", town.beauty >= 40, 8], ["Upgrade any building to Level 2", ups >= 1, 8]];
    const wk = tweek(), ev = EVENTS[new Date().getDate() % EVENTS.length], evDone = lsm("mt_ev", "") === tday(), tour = town.beauty >= 40 && lsm("mt_tour", "") !== tday();
    let extra = `<div class="mt-box"><b>${ev[0]} Today: ${ev[1]}</b><br><small>${evDone ? "✅ Solved today — the town thanks you!" : ev[2]}</small>${evDone ? "" : '<button class="kit-btn block" id="mt-ev" type="button" style="margin-top:6px">Help the town!</button>'}</div>`;
    extra += `<div class="mt-box"><b>🎩 Mayor missions (this week)</b>${MISSIONS.map(([t, ok, c], k) => { const paid = lsm(`mt_mis_${wk}_${k}`, "") === "1"; return `<div class="mt-row" style="border:0;padding:3px 0"><span>${ok ? "✅" : "⬜"} ${t}</span>${paid ? "<small>paid ✔</small>" : ok ? `<button class="kit-btn" data-mis="${k}" data-c="${c}" style="padding:4px 10px">🪙${c}</button>` : ""}</div>`; }).join("")}</div>`;
    if (tour) extra += `<div class="mt-box">📸 Tourists love your town! <button class="kit-btn" id="mt-tour" type="button" style="padding:4px 10px">Collect 🪙3</button></div>`;
    const claimable = Math.min(5, town.likes) - town.claimed;
    let html = `<div class="mt-row" style="border:0"><span>💖 ${town.likes} like${town.likes === 1 ? "" : "s"} today</span><button class="kit-btn" id="mt-claim" ${claimable > 0 ? "" : "disabled"} style="padding:6px 14px">${claimable > 0 ? `Collect 🪙${claimable * 2}` : "Nothing to collect"}</button></div>`;
    if (sel !== null) {
      const cur = town.tiles[sel];
      if (cur) {
        const b = town.buildings.find(x => x.id === cur) || town.landmarkAll.find(x => x.id === cur);
        const lv2 = town.levels && town.levels[sel] === 2, canUp = !b.landmark && !lv2;
        const upCost = b.cost && b.cost.coins ? `🪙${Math.ceil(b.cost.coins * 1.5)}` : "💎2";
        html += `<div class="kit-sub" style="margin:6px 0">${emojiOf(town, cur, sel)} ${b.name}${lv2 ? " (Level 2 ⭐)" : ""}${b.landmark ? " — a landmark!" : ""} on tile ${sel + 1}</div>
          ${canUp ? `<button class="kit-btn block" id="mt-up" style="margin-bottom:6px">⬆️ Upgrade to Level 2 — ${upCost} (double beauty!)</button>` : ""}
          <button class="kit-btn alt block" id="mt-remove">Remove${!b.landmark && b.cost.coins ? ` (+🪙${Math.floor(b.cost.coins / 2) * (lv2 ? 2 : 1)})` : ""}</button>`;
      } else {
        const placed = Object.values(town.tiles), lms = (town.landmarks || []).filter(l => !placed.includes(l.id));
        html += `<div class="kit-sub" style="margin:6px 0">Build on tile ${sel + 1}:</div>${lms.length ? `<div class="kit-sub" style="margin:6px 0 2px;font-weight:800">🌟 Your landmarks (free to place)</div><div class="mt-sheet">${lms.map(l => `<button class="mt-b" data-b="${l.id}"><span class="e">${l.emoji}</span>${l.name}<br><small>✨${l.pts}</small></button>`).join("")}</div>` : ""}<div class="mt-sheet">${town.buildings.map(b => `<button class="mt-b" data-b="${b.id}"><span class="e">${b.emoji}</span>${b.name}<br><small>${cost(b.cost)} · ✨${b.pts}</small></button>`).join("")}</div><div class="kit-sub" style="margin:8px 0 0;font-size:.72rem">Landmarks (temple, tower, pirate ship, statue) are rare — win them in the Daily Auction or the Mystery Egg.</div>`;
      }
    } else html += `<div class="kit-sub" style="margin:8px 0 0;text-align:center">Pick a tile above.</div>`;
    html += `<div class="kit-bonus" id="mt-msg" style="margin-top:10px"></div>` + extra;
    p.innerHTML = html;
    p.querySelectorAll("[data-mis]").forEach(b => b.onclick = async () => { lsmw(`mt_mis_${wk}_${b.dataset.mis}`, "1"); try { await LB.creditWallet({ coins: +b.dataset.c }); } catch (e) {} K.toastAdv("Mayor mission complete!"); await wallet(); panel(); });
    const tb = $("mt-tour"); if (tb) tb.onclick = async () => { lsmw("mt_tour", tday()); try { await LB.creditWallet({ coins: 3 }); } catch (e) {} await wallet(); panel(); };
    const eb = $("mt-ev"); if (eb) eb.onclick = () => townEvent(ev);
    $("mt-claim").onclick = async () => { const r = await LB.claimTownLikes(); await wallet(); await load(); if (r.ok) $("mt-msg").textContent = `🪙 +${r.coins}!`; };
    p.querySelectorAll("[data-b]").forEach(b => b.onclick = async () => {
      const r = await LB.placeBuilding(sel, b.dataset.b);
      if (!r.ok) { $("mt-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins/gems yet — answer some questions!" : "Couldn't build there."; return; }
      await wallet(); sel = null; await load();
    });
    const up = $("mt-up");
    if (up) up.onclick = async () => { const r = await LB.upgradeBuilding(sel); if (!r.ok) { $("mt-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins/gems yet!" : "Couldn't upgrade that."; return; } await wallet(); await load(); if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); };
    const rm = $("mt-remove");
    if (rm) rm.onclick = async () => { await LB.removeBuilding(sel); await wallet(); sel = null; await load(); };
  }

  function townEvent(ev) {
    const o = document.createElement("div"); o.className = "kit-overlay"; document.body.appendChild(o); let n = 0, right = 0;
    const ask = () => {
      if (n >= 3) { const ok = right >= 2; if (ok) lsmw("mt_ev", tday()); o.innerHTML = `<div class="kit-modal"><div class="kit-big">${ok ? ev[0] + "✅" : ev[0]}</div><h2>${ok ? "Town saved!" : "Almost — try again!"}</h2><div class="kit-bonus" id="mt-eb"></div><button class="kit-btn block" type="button" id="mt-ex">Back to town</button></div>`; o.querySelector("#mt-ex").onclick = () => { o.remove(); panel(); }; if (ok) K.finish("my-town", 4, o.querySelector("#mt-eb")); return; }
      const q = K.question({}); n++;
      o.innerHTML = `<div class="kit-modal"><div class="kit-big">${ev[0]}</div><div class="kit-sub">${n}/3 · ${K.esc(ev[1])}</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("")}</div></div>`;
      o.querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === q.correctLabel; K.record("my-town", q.key, ok, q); if (ok) right++; o.querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); }); if (!ok) b.classList.add("wrong"); setTimeout(ask, ok ? 700 : 1500); });
    };
    ask();
  }
  document.querySelectorAll(".mt-tab").forEach(t => t.onclick = async () => {
    document.querySelectorAll(".mt-tab").forEach(x => x.classList.toggle("on", x === t));
    view = t.dataset.t; visiting = null; sel = null;
    if (view === "mine") await load(); else { town = await LB.getTown(); $("mt-beauty").textContent = "–"; panel(); }
  });
  await wallet(); await load();
}
