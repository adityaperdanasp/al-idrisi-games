/* =================================================================
   City Builder: Kotaku Sendiri — a PERSISTENT town (unlike the other
   PM Round 4 games, progress carries across sessions in Firebase at
   players/{id}/cityBuilder/{bricks, totalEarned, grid}). Answering a
   10-question round earns bricks (spendable currency); totalEarned
   (lifetime, never spent down) gates which building types are
   unlocked. Placing a building spends bricks on a plot.
   ================================================================= */

const PLOT_COUNT = 20;
const ROUND_SIZE = 10;
const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
const BUILDING_TYPES = [
  { id: "house", emoji: "🏠", name: "House", unlockAt: 0, cost: 5 },
  { id: "shop", emoji: "🏪", name: "Shop", unlockAt: 25, cost: 10 },
  { id: "park", emoji: "🌳", name: "Park", unlockAt: 50, cost: 8 },
  { id: "school", emoji: "🏫", name: "School", unlockAt: 90, cost: 15 },
  { id: "tower", emoji: "🗼", name: "Tower", unlockAt: 140, cost: 25 },
  { id: "castle", emoji: "🏰", name: "Castle", unlockAt: 220, cost: 40 }
];

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("cb-signedout-overlay").classList.remove("hidden");
  document.getElementById("cb-earn-btn").disabled = true;
} else {
  initCityBuilder();
}

async function initCityBuilder() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  let city = { bricks: 0, totalEarned: 0, grid: {} };
  const roundState = { qIndex: 0, correctCount: 0, streak: 0, bricksThisRound: 0, activePlot: null };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 2 ? "easy" : i <= 6 ? "medium" : "hard"; }

  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) {
      return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    }
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    const correctNum = Number(m[1].replace(/,/g, ""));
    const suffix = m[2] || "";
    const options = new Set([correctNum]);
    let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const magnitude = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + magnitude * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump = 1;
    while (options.size < 4) options.add(correctNum + bump++);
    return {
      prompt: q.prompt,
      options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix),
      correctLabel: correctNum.toLocaleString("en-US") + suffix
    };
  }

  function rollMathQuestion(difficulty) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    return { key, ...buildMc(raw) };
  }

  function rollQuestion(difficulty) {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion(difficulty)) : rollMathQuestion(difficulty);
  }

  function renderHud() {
    document.getElementById("cb-bricks").textContent = city.bricks;
    document.getElementById("cb-total-earned").textContent = city.totalEarned;
  }

  function renderGrid() {
    const grid = document.getElementById("cb-grid");
    grid.innerHTML = "";
    const cityGrid = city.grid || {};
    for (let i = 0; i < PLOT_COUNT; i++) {
      const buildingId = cityGrid[String(i)];
      const building = BUILDING_TYPES.find(b => b.id === buildingId);
      const plot = document.createElement("button");
      plot.type = "button";
      plot.className = "cb-plot" + (building ? " filled" : "");
      plot.textContent = building ? building.emoji : "+";
      plot.addEventListener("click", () => openBuildPicker(i, building));
      grid.appendChild(plot);
    }
  }

  function openBuildPicker(plotIndex, existingBuilding) {
    if (existingBuilding) return; // occupied plots are just decorative, no rebuild/demolish in v1
    roundState.activePlot = plotIndex;
    const list = document.getElementById("cb-build-list");
    list.innerHTML = "";
    BUILDING_TYPES.forEach(b => {
      const unlocked = city.totalEarned >= b.unlockAt;
      const affordable = city.bricks >= b.cost;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cb-build-opt";
      btn.disabled = !unlocked || !affordable;
      btn.innerHTML = `<span class="cb-build-opt-emoji">${unlocked ? b.emoji : "🔒"}</span>
        <span class="cb-build-opt-txt">
          <div class="cb-build-opt-name">${b.name}</div>
          <div class="cb-build-opt-cost">${unlocked ? `🧱 ${b.cost}` : `Unlocks at 🏙️ ${b.unlockAt} lifetime bricks`}</div>
        </span>`;
      btn.addEventListener("click", () => placeBuilding(b));
      list.appendChild(btn);
    });
    document.getElementById("cb-build-overlay").classList.remove("hidden");
  }

  async function placeBuilding(building) {
    document.getElementById("cb-build-overlay").classList.add("hidden");
    if (!window.AIGLeaderboard) return;
    const result = await AIGLeaderboard.placeCityBuilding(roundState.activePlot, building.id, building.cost);
    if (result && result.ok && result.data) {
      city = result.data;
      renderHud();
      renderGrid();
    }
  }

  document.getElementById("cb-build-cancel-btn").addEventListener("click", () => {
    document.getElementById("cb-build-overlay").classList.add("hidden");
  });

  // ---------------------------------------------------------------
  // EARN-BRICKS ROUND (10 questions)
  // ---------------------------------------------------------------
  function startRound() {
    roundState.qIndex = 0;
    roundState.correctCount = 0;
    roundState.streak = 0;
    roundState.bricksThisRound = 0;
    document.getElementById("cb-brick-toast").textContent = "";
    document.getElementById("cb-round-overlay").classList.remove("hidden");
    askRoundQuestion();
  }

  function askRoundQuestion() {
    document.getElementById("cb-round-progress").textContent = `Question ${roundState.qIndex + 1} / ${ROUND_SIZE}`;
    const q = rollQuestion(difficultyForIndex(roundState.qIndex));
    document.getElementById("cb-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("cb-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "cb-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleRoundAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
  }

  function handleRoundAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#cb-q-grid .cb-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("city-builder", q.key, isCorrect);

    if (isCorrect) {
      roundState.correctCount++;
      roundState.streak++;
      const earned = roundState.streak >= 3 ? 4 : 3;
      roundState.bricksThisRound += earned;
      document.getElementById("cb-brick-toast").textContent = `+${earned} 🧱${roundState.streak >= 3 ? " (streak bonus!)" : ""}`;
    } else {
      roundState.streak = 0;
      document.getElementById("cb-brick-toast").textContent = "No bricks this time.";
    }

    setTimeout(() => {
      roundState.qIndex++;
      if (roundState.qIndex >= ROUND_SIZE) {
        finishRound();
      } else {
        askRoundQuestion();
      }
    }, 900);
  }

  async function finishRound() {
    document.getElementById("cb-round-overlay").classList.add("hidden");
    const previousTotalEarned = city.totalEarned;

    if (window.AIGLeaderboard) {
      const brickResult = await AIGLeaderboard.awardCityBuilderBricks(roundState.bricksThisRound);
      if (brickResult && brickResult.ok && brickResult.data) {
        city = brickResult.data;
        renderHud();
        renderGrid();
      }
    }

    const newlyUnlocked = BUILDING_TYPES.filter(b => b.unlockAt > previousTotalEarned && b.unlockAt <= city.totalEarned);

    document.getElementById("cb-round-end-emoji").textContent = roundState.correctCount >= ROUND_SIZE ? "🌟" : roundState.correctCount >= ROUND_SIZE * 0.5 ? "🧱" : "💪";
    document.getElementById("cb-round-end-title").textContent = `Earned ${roundState.bricksThisRound} Bricks!`;
    let sub = `You got ${roundState.correctCount} / ${ROUND_SIZE} correct.`;
    if (newlyUnlocked.length) sub += ` New building unlocked: ${newlyUnlocked.map(b => b.name).join(", ")}!`;
    document.getElementById("cb-round-end-sub").textContent = sub;

    const bonusEl = document.getElementById("cb-round-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardCityBuilderBonus(roundState.correctCount, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("cb-round-end-overlay").classList.remove("hidden");
  }

  document.getElementById("cb-earn-btn").addEventListener("click", startRound);
  document.getElementById("cb-round-end-btn").addEventListener("click", () => {
    document.getElementById("cb-round-end-overlay").classList.add("hidden");
  });

  if (window.AIGLeaderboard) {
    city = await AIGLeaderboard.getCityBuilder();
  }
  renderHud();
  renderGrid();
}

// =================================================================
// Audit batch 8 -- City Hall: buildings now PRODUCE bricks over time
// (collect once an hour, capped), a daily city event solved with
// area/perimeter questions, weekly city missions, a population and city
// level, residents walking around and night lights.
// =================================================================
(function cityHall() {
  if (!player || player.role === "parent" || !window.AIGLeaderboard) return;
  const RATE = { house: 1, shop: 2, park: 1, school: 3, tower: 4, castle: 6 };
  const ls = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const day = () => new Date().toISOString().slice(0, 10);
  const week = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
  const panel = document.createElement("div"); panel.className = "cb-hall"; panel.id = "cb-hall";
  const anchor = document.getElementById("cb-earn-btn"); (anchor.parentElement || document.body).after(panel);
  async function draw() {
    let city; try { city = await AIGLeaderboard.getCityBuilder(); } catch (e) { return; }
    const tiles = Object.values(city.grid || {}), counts = {}; tiles.forEach(t => { const id = t && (t.id || t); counts[id] = (counts[id] || 0) + 1; });
    const perHour = Object.entries(counts).reduce((a, [id, n]) => a + (RATE[id] || 0) * n, 0);
    const last = Number(ls("cb_collect", String(Date.now()))); if (!ls("cb_collect", "")) lsw("cb_collect", String(Date.now()));
    const hours = Math.min(6, (Date.now() - last) / 3600000), ready = Math.min(20, Math.floor(perHour * hours));
    const pop = (counts.house || 0) * 4 + (counts.school || 0) * 10 + (counts.castle || 0) * 6, lvl = pop >= 60 ? "🏙️ Metropolis" : pop >= 30 ? "🏘️ Town" : pop >= 8 ? "🏡 Village" : "⛺ Camp";
    const ev = day() !== ls("cb_event", "");
    const MIS = [["Build 2 parks 🌳", (counts.park || 0) >= 2, 8], ["Own a school 🏫", (counts.school || 0) >= 1, 10], ["Earn 100 lifetime bricks 🧱", (city.totalEarned || 0) >= 100, 10]];
    panel.innerHTML = `<div class="cb-hall-h">🏛️ City Hall · ${lvl} · 👥 ${pop}</div>
      <div class="cb-hall-row">🏭 Your buildings make <b>${perHour}</b> bricks/hour <button type="button" id="cb-collect" ${ready ? "" : "disabled"}>${ready ? `Collect ${ready} 🧱` : "Nothing yet"}</button></div>
      <div class="cb-hall-row">${ev ? `🚧 City event: the mayor needs measurements! <button type="button" id="cb-event">Help (3 questions)</button>` : "✅ Today's city event is done!"}</div>
      ${(() => { const rq = request(counts); return rq.done ? `<div class="cb-hall-row">🙋 Resident request done today ✓</div>` : `<div class="cb-hall-row">🙋 Residents ask: “Please build a ${rq.em} ${rq.id}!” (${rq.have}/${rq.need}) ${rq.have >= rq.need ? `<button type="button" id="cb-req">+5 🧱</button>` : ""}</div>`; })()}
      ${tiles.length >= 3 && ls("cb_fire", "") !== day() ? `<div class="cb-hall-row cb-fire">🔥 Fire alarm! A building is on fire! <button type="button" id="cb-firebtn">Put it out (3 quick questions)</button></div>` : ""}
      <div class="cb-hall-row"><b>📋 Missions this week</b></div>${MIS.map(([t, ok, b], k) => { const paid = ls(`cb_mis_${week()}_${k}`, "") === "1"; return `<div class="cb-hall-row">${ok ? "✅" : "⬜"} ${t} ${paid ? "<small>paid</small>" : ok ? `<button type="button" data-mis="${k}" data-b="${b}">+${b} 🧱</button>` : ""}</div>`; }).join("")}`;
    const night = new Date().getHours() >= 19 || new Date().getHours() < 6; document.getElementById("cb-grid").classList.toggle("cb-night", night);
    const cb = document.getElementById("cb-collect"); if (cb) cb.onclick = async () => { cb.disabled = true; lsw("cb_collect", String(Date.now())); try { await AIGLeaderboard.awardCityBuilderBricks(ready); } catch (e) {} location.reload(); };
    const eb = document.getElementById("cb-event"); if (eb) eb.onclick = () => event();
    const rb = document.getElementById("cb-req"); if (rb) rb.onclick = async () => { lsw("cb_req_done", day()); try { await AIGLeaderboard.awardCityBuilderBricks(5); } catch (e) {} location.reload(); };
    const fb = document.getElementById("cb-firebtn"); if (fb) fb.onclick = fire;
    panel.querySelectorAll("[data-mis]").forEach(b => b.onclick = async () => { lsw(`cb_mis_${week()}_${b.dataset.mis}`, "1"); try { await AIGLeaderboard.awardCityBuilderBricks(+b.dataset.b); } catch (e) {} location.reload(); });
  }
  // Audit round 2: a daily resident request (build one more of a building type), a fire emergency
  // put out with 3 quick timed questions, and budget questions mixed into the city event.
  function request(counts) {
    const POOL = [["park", "🌳"], ["shop", "🏪"], ["house", "🏠"], ["school", "🏫"]];
    let rq; try { rq = JSON.parse(ls("cb_req", "null")); } catch (e) {}
    if (!rq || rq.day !== day()) { const [id, em] = POOL[Math.floor(Math.random() * POOL.length)]; rq = { day: day(), id, em, need: (counts[id] || 0) + 1 }; lsw("cb_req", JSON.stringify(rq)); }
    return { ...rq, have: counts[rq.id] || 0, done: ls("cb_req_done", "") === day() };
  }
  function fire() {
    const o = document.createElement("div"); o.className = "cb-overlay"; document.body.appendChild(o); let n = 0, right = 0, t = null;
    const ask = () => {
      clearInterval(t);
      if (n >= 3) { const ok = right >= 2; lsw("cb_fire", day()); o.innerHTML = `<div class="cb-modal"><div class="cb-modal-emoji">${ok ? "🚒" : "💨"}</div><div class="cb-modal-title">${ok ? "Fire is out! Heroes!" : "The firefighters took over"}</div><div class="cb-modal-sub">${right}/3 right${ok ? " · +5 🧱" : ""}</div><button class="cb-btn cb-btn-primary" id="cb-fx">Back to town</button></div>`; o.querySelector("#cb-fx").onclick = async () => { if (ok) { try { await AIGLeaderboard.awardCityBuilderBricks(5); } catch (e) {} } location.reload(); }; return; }
      const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8), ans = a * b, opts = [...new Set([ans, ans + a, ans - b, ans + 1])].sort(() => Math.random() - 0.5); n++;
      let left = 8;
      o.innerHTML = `<div class="cb-modal"><div class="cb-modal-emoji">🔥</div><div class="cb-modal-sub">Hose ${n}/3 · ⏱️ <b id="cb-ft">8</b>s</div><div class="cb-q-prompt">${a} × ${b} = ?</div><div class="cb-q-grid">${opts.map(x => `<button class="cb-q-btn" type="button" data-o="${x}">${x}</button>`).join("")}</div></div>`;
      t = setInterval(() => { left--; const el = o.querySelector("#cb-ft"); if (el) el.textContent = left; if (left <= 0) ask(); }, 1000);
      o.querySelectorAll("[data-o]").forEach(b2 => b2.onclick = () => { clearInterval(t); const ok = +b2.dataset.o === ans; if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("city-builder", "multiplication", ok); if (ok) right++; b2.classList.add(ok ? "correct" : "wrong"); setTimeout(ask, 600); });
    };
    ask();
  }
  function event() {
    const o = document.createElement("div"); o.className = "cb-overlay"; document.body.appendChild(o); let n = 0, right = 0;
    const ask = () => {
      if (n >= 3) { const ok = right >= 2; if (ok) lsw("cb_event", day()); o.innerHTML = `<div class="cb-modal"><div class="cb-modal-emoji">${ok ? "🏗️" : "📏"}</div><div class="cb-modal-title">${ok ? "The mayor is happy!" : "Let's measure again tomorrow"}</div><div class="cb-modal-sub">${right}/3 right${ok ? " · +6 🧱" : ""}</div><button class="cb-btn cb-btn-primary" id="cb-ex">Back to town</button></div>`;
        o.querySelector("#cb-ex").onclick = async () => { if (ok) { try { await AIGLeaderboard.awardCityBuilderBricks(6); } catch (e) {} } location.reload(); }; return; }
      const w = 2 + Math.floor(Math.random() * 8), h = 2 + Math.floor(Math.random() * 8), kind = Math.floor(Math.random() * 3), area = kind === 0;
      const budget = 30 + Math.floor(Math.random() * 40), c1 = 5 + Math.floor(Math.random() * 10), c2 = 5 + Math.floor(Math.random() * 10);
      const ans = kind === 2 ? budget - c1 - c2 : area ? w * h : 2 * (w + h);
      const opts = [...new Set([ans, kind === 2 ? budget - c1 : area ? 2 * (w + h) : w * h, ans + 2, Math.max(1, ans - 3)])].sort(() => Math.random() - 0.5); n++;
      o.innerHTML = `<div class="cb-modal"><div class="cb-modal-emoji">${kind === 2 ? "💰" : "📐"}</div><div class="cb-modal-sub">${n}/3</div><div class="cb-q-prompt">${kind === 2 ? `The city budget is ${budget} 🧱. A bench costs ${c1} and a lamp costs ${c2}. How many bricks are left?` : `The new ${["park", "plaza", "garden", "car park"][n % 4]} is ${w} m by ${h} m. What is its ${area ? "AREA (m²)" : "PERIMETER (m)"}?`}</div><div class="cb-q-grid">${opts.map(x => `<button class="cb-q-btn" type="button" data-o="${x}">${x}</button>`).join("")}</div></div>`;
      o.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { const ok = +b.dataset.o === ans; if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("city-builder", "measurement", ok); if (ok) right++; b.classList.add(ok ? "correct" : "wrong"); setTimeout(ask, ok ? 700 : 1500); });
    };
    ask();
  }
  setTimeout(draw, 1200);
})();
