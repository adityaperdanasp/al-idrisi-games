/* =================================================================
   Cooking Restaurant Rush — 3 customer slots are open AT ONCE (the
   "multi-order juggling" hook). Each slot has its own countdown
   ("patience") independent of the others; solving that slot's math
   "recipe" serves the customer and refills the slot with a new one.
   Running out of patience (or answering wrong) sends the customer
   away unhappy and refills the slot too. A single 60-second round
   timer ends the whole rush.
   ================================================================= */

const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
const CUSTOMER_EMOJIS = ["😀", "😊", "🤠", "👦", "👧", "🧑", "👵", "👴", "🐻", "🐰"];
const SLOT_COUNT = 3;
const ROUND_DURATION_SEC = 60;
const MIN_PATIENCE_SEC = 10;
const MAX_PATIENCE_SEC = 15;
const TICK_MS = 100;
// Audit batch 9: tips that actually add up (faster = bigger tip), a dish order per customer, 👑 VIP
// customers (double tips, less patience), restaurant DAYS with a tip goal (each day a bit busier),
// a kitchen upgrade shop paid with your tips (comfy chairs = more patience, bell = more time, fancy
// menu = +25% tips), a 1-3 star rating and the best day's tips. All kept in this browser.
const DISHES = ["🍔", "🍕", "🍜", "🍰", "🌮", "🍣", "🥗", "🍩"];
const UPGRADES = { chairs: { name: "🪑 Comfy chairs", desc: "+2s customer patience", cost: 60 }, bell: { name: "🔔 Kitchen bell", desc: "+10s every day", cost: 80 }, menu: { name: "⭐ Fancy menu", desc: "+25% tips", cost: 120 } };
const lsc = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lscw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function crSave() { let o = {}; try { o = JSON.parse(lsc("cr_save", "{}")) || {}; } catch (e) {} return Object.assign({ day: 1, bank: 0, up: {}, best: 0 }, o); }

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("cr-signedout-overlay").classList.remove("hidden");
  document.getElementById("cr-start-overlay").classList.add("hidden");
} else {
  initCookingRush();
}

function initCookingRush() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const state = { timeLeftMs: 0, served: 0, missed: 0, combo: 0, slots: [], tickHandle: null, running: false, tips: 0 };
  let save = crSave();
  const goalFor = d => 60 + (d - 1) * 30;

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

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

  function rollMathQuestion(diff) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](diff || "medium");
    return { key, ...buildMc(raw) };
  }

  function rollQuestion() {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion()) : rollMathQuestion();
  }

  function renderHud() {
    document.getElementById("cr-time-left").textContent = Math.max(0, Math.ceil(state.timeLeftMs / 1000));
    document.getElementById("cr-served").textContent = state.served;
    document.getElementById("cr-missed").textContent = state.missed;
    document.getElementById("cr-combo").textContent = state.combo;
    document.getElementById("cr-tips").textContent = `🪙 ${state.tips} / ${goalFor(save.day)} · Day ${save.day}`;
  }

  function newCustomer() {
    // Audit round 2: on every 3rd day a 🧐 food critic may visit -- a hard maths question, little
    // patience, but triple tips (and a star review) if you get it right.
    if (save.day % 3 === 0 && Math.random() < 0.12 && !state.slots.some(x => x && x.critic)) {
      const pm = Math.max(7, rand(MIN_PATIENCE_SEC, MAX_PATIENCE_SEC) - 4) * 1000;
      return { emoji: "🧐", critic: true, vip: false, dish: "🍽️", q: { key: "critic", ...rollMathQuestion("hard") }, patienceLeft: pm, patienceMax: pm, resolved: false };
    }
    const vip = Math.random() < 0.15;
    const base = rand(MIN_PATIENCE_SEC, MAX_PATIENCE_SEC) - Math.min(4, save.day - 1) + (save.up.chairs ? 2 : 0) - (vip ? 3 : 0);
    const patienceMax = Math.max(6, base) * 1000;
    return { emoji: vip ? "🤴" : CUSTOMER_EMOJIS[rand(0, CUSTOMER_EMOJIS.length - 1)], vip, dish: DISHES[rand(0, DISHES.length - 1)], q: rollQuestion(), patienceLeft: patienceMax, patienceMax, resolved: false };
  }

  function renderSlot(i) {
    const slot = state.slots[i];
    const el = document.getElementById(`cr-slot-${i}`);
    if (!slot) { el.className = "cr-slot empty"; el.innerHTML = ""; return; }
    el.className = "cr-slot" + (slot.vip ? " vip" : "") + (slot.critic ? " critic" : "");
    const pct = Math.max(0, Math.round((slot.patienceLeft / slot.patienceMax) * 100));
    el.innerHTML = `
      <div class="cr-slot-top">
        <div class="cr-slot-emoji">${slot.emoji}<span class="cr-order">${slot.dish}</span></div>${slot.vip ? '<span class="cr-vip">👑 VIP ×2</span>' : ""}${slot.critic ? '<span class="cr-vip">🧐 Food critic ×3</span>' : ""}
        <div class="cr-slot-patience-wrap">
          <div class="cr-slot-patience-bar"><div class="cr-slot-patience-fill${pct <= 30 ? " low" : ""}" style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="cr-slot-prompt">${slot.q.prompt}</div>
      <div class="cr-slot-grid"></div>
      <div class="cr-slot-status"></div>
    `;
    const grid = el.querySelector(".cr-slot-grid");
    slot.q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "cr-slot-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleSlotAnswer(i, btn, opt));
      grid.appendChild(btn);
    });
  }

  function updateSlotPatienceBarOnly(i) {
    const slot = state.slots[i];
    const el = document.getElementById(`cr-slot-${i}`);
    if (!slot || !el) return;
    const fill = el.querySelector(".cr-slot-patience-fill");
    if (!fill) return;
    const pct = Math.max(0, Math.round((slot.patienceLeft / slot.patienceMax) * 100));
    fill.style.width = pct + "%";
    fill.classList.toggle("low", pct <= 30);
  }

  function handleSlotAnswer(i, btn, opt) {
    const slot = state.slots[i];
    if (!slot || slot.resolved) return;
    const isCorrect = opt === slot.q.correctLabel;
    slot.resolved = true;
    const el = document.getElementById(`cr-slot-${i}`);
    el.querySelectorAll(".cr-slot-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === slot.q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("cooking-rush", slot.q.key, isCorrect);

    const statusEl = el.querySelector(".cr-slot-status");
    if (isCorrect) {
      state.served++;
      state.combo++;
      const speed = Math.round(10 * slot.patienceLeft / slot.patienceMax);
      const points = Math.round((5 + speed + Math.min(10, state.combo)) * (slot.critic ? 3 : slot.vip ? 2 : 1) * (save.up.menu ? 1.25 : 1));
      if (slot.critic) { state.reviews = (state.reviews || 0) + 1; }
      state.tips += points;
      statusEl.textContent = `${slot.dish} Served! +🪙${points}${speed >= 7 ? " ⚡ fast tip!" : ""}`;
      statusEl.style.color = "#3F8F5F";
    } else {
      state.missed++;
      state.combo = 0;
      statusEl.textContent = "Wrong order!";
      statusEl.style.color = "#D64545";
    }
    renderHud();

    setTimeout(() => {
      if (!state.running) return;
      state.slots[i] = newCustomer();
      renderSlot(i);
    }, 700);
  }

  function handleSlotTimeout(i) {
    const slot = state.slots[i];
    if (!slot || slot.resolved) return;
    slot.resolved = true;
    state.missed++;
    state.combo = 0;
    const el = document.getElementById(`cr-slot-${i}`);
    el.querySelectorAll(".cr-slot-btn").forEach(b => { b.disabled = true; });
    const statusEl = el.querySelector(".cr-slot-status");
    if (statusEl) { statusEl.textContent = "Customer left!"; statusEl.style.color = "#D64545"; }
    renderHud();

    setTimeout(() => {
      if (!state.running) return;
      state.slots[i] = newCustomer();
      renderSlot(i);
    }, 700);
  }

  function tick() {
    state.timeLeftMs -= TICK_MS;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = state.slots[i];
      if (!slot || slot.resolved) continue;
      slot.patienceLeft -= TICK_MS;
      if (slot.patienceLeft <= 0) {
        handleSlotTimeout(i);
      } else {
        updateSlotPatienceBarOnly(i);
      }
    }
    renderHud();
    if (state.timeLeftMs <= 0) {
      finishGame();
    }
  }

  function finishGame() {
    state.running = false;
    clearInterval(state.tickHandle);
    document.getElementById("cr-slots").querySelectorAll(".cr-slot").forEach(el => {
      el.querySelectorAll(".cr-slot-btn").forEach(b => { b.disabled = true; });
    });

    const total = state.served + state.missed;
    const accuracy = total > 0 ? state.served / total : 0;
    const goal = goalFor(save.day), passed = state.tips >= goal, stars = state.tips >= goal * 1.5 ? 3 : passed ? 2 : state.tips >= goal / 2 ? 1 : 0;
    const dayPlayed = save.day, newBest = state.tips > save.best;
    save.bank += state.tips; if (newBest) save.best = state.tips; if (passed) save.day++;
    lscw("cr_save", JSON.stringify(save));
    document.getElementById("cr-end-emoji").textContent = "⭐".repeat(stars) || "💪";
    document.getElementById("cr-end-title").textContent = passed ? `Day ${dayPlayed} complete!` : `Day ${dayPlayed}: so close!`;
    document.getElementById("cr-end-sub").textContent = `Tips: 🪙${state.tips} (goal ${goal}). Served ${state.served} (${Math.round(accuracy * 100)}% happy), missed ${state.missed}.${state.reviews ? ` 🧐 ${state.reviews} critic review${state.reviews > 1 ? "s" : ""}: ⭐⭐⭐⭐⭐!` : ""}${passed ? ` Day ${save.day} unlocked!` : " Try the day again!"}${newBest ? " 🌟 Best day ever!" : ""}`;
    drawShop(document.getElementById("cr-end-bonus").parentNode);
    const bonusEl = document.getElementById("cr-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardCookingRushBonus(state.served, state.missed).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("cr-end-overlay").classList.remove("hidden");
  }

  function drawShop(parent) {
    let box = parent.querySelector(".cr-shop"); if (!box) { box = document.createElement("div"); box.className = "cr-shop"; parent.querySelector(".cr-btn-primary").before(box); }
    box.innerHTML = `<b>🏪 Kitchen upgrades · tip jar 🪙${save.bank}</b>${Object.entries(UPGRADES).map(([k, u]) => `<button type="button" data-u="${k}" ${save.up[k] || save.bank < u.cost ? "disabled" : ""}>${u.name} — ${save.up[k] ? "owned ✔" : "🪙" + u.cost}<small>${u.desc}</small></button>`).join("")}`;
    box.querySelectorAll("[data-u]").forEach(b => b.onclick = () => { const u = UPGRADES[b.dataset.u]; if (save.bank < u.cost) return; save.bank -= u.cost; save.up[b.dataset.u] = true; lscw("cr_save", JSON.stringify(save)); drawShop(parent); });
  }
  function drawStart() {
    const ov = document.getElementById("cr-start-overlay");
    let d = ov.querySelector(".cr-dayinfo"); if (!d) { d = document.createElement("div"); d.className = "cr-dayinfo"; document.getElementById("cr-start-btn").before(d); }
    d.textContent = `📅 Day ${save.day} · tip goal 🪙${goalFor(save.day)}${save.best ? ` · best day 🪙${save.best}` : ""}`;
    drawShop(ov);
  }
  drawStart();
  function startGame() {
    save = crSave(); state.tips = 0; state.reviews = 0;
    state.timeLeftMs = (ROUND_DURATION_SEC + (save.up.bell ? 10 : 0)) * 1000;
    state.served = 0;
    state.missed = 0;
    state.combo = 0;
    state.running = true;
    state.slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      state.slots.push(newCustomer());
      renderSlot(i);
    }
    renderHud();
    document.getElementById("cr-start-overlay").classList.add("hidden");
    document.getElementById("cr-end-overlay").classList.add("hidden");
    clearInterval(state.tickHandle);
    state.tickHandle = setInterval(tick, TICK_MS);
  }

  document.getElementById("cr-start-btn").addEventListener("click", startGame);
  document.getElementById("cr-play-again-btn").addEventListener("click", () => { document.getElementById("cr-end-overlay").classList.add("hidden"); document.getElementById("cr-start-overlay").classList.remove("hidden"); drawStart(); });
}
