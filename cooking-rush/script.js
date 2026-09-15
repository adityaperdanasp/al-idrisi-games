/* =================================================================
   Cooking Restaurant Rush — 3 customer slots are open AT ONCE (the
   "multi-order juggling" hook). Each slot has its own countdown
   ("patience") independent of the others; solving that slot's math
   "recipe" serves the customer and refills the slot with a new one.
   Running out of patience (or answering wrong) sends the customer
   away unhappy and refills the slot too. A single 60-second round
   timer ends the whole rush.
   ================================================================= */

const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const CUSTOMER_EMOJIS = ["😀", "😊", "🤠", "👦", "👧", "🧑", "👵", "👴", "🐻", "🐰"];
const SLOT_COUNT = 3;
const ROUND_DURATION_SEC = 60;
const MIN_PATIENCE_SEC = 9;
const MAX_PATIENCE_SEC = 14;
const TICK_MS = 100;

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("cr-signedout-overlay").classList.remove("hidden");
  document.getElementById("cr-start-overlay").classList.add("hidden");
} else {
  initCookingRush();
}

function initCookingRush() {
  const state = { timeLeftMs: 0, served: 0, missed: 0, combo: 0, slots: [], tickHandle: null, running: false };

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

  function rollQuestion() {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key]("medium");
    return { key, ...buildMc(raw) };
  }

  function renderHud() {
    document.getElementById("cr-time-left").textContent = Math.max(0, Math.ceil(state.timeLeftMs / 1000));
    document.getElementById("cr-served").textContent = state.served;
    document.getElementById("cr-missed").textContent = state.missed;
    document.getElementById("cr-combo").textContent = state.combo;
  }

  function newCustomer() {
    const patienceMax = rand(MIN_PATIENCE_SEC, MAX_PATIENCE_SEC) * 1000;
    return { emoji: CUSTOMER_EMOJIS[rand(0, CUSTOMER_EMOJIS.length - 1)], q: rollQuestion(), patienceLeft: patienceMax, patienceMax, resolved: false };
  }

  function renderSlot(i) {
    const slot = state.slots[i];
    const el = document.getElementById(`cr-slot-${i}`);
    if (!slot) { el.className = "cr-slot empty"; el.innerHTML = ""; return; }
    el.className = "cr-slot";
    const pct = Math.max(0, Math.round((slot.patienceLeft / slot.patienceMax) * 100));
    el.innerHTML = `
      <div class="cr-slot-top">
        <div class="cr-slot-emoji">${slot.emoji}</div>
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
      const points = 10 + Math.min(20, state.combo * 2);
      statusEl.textContent = `Served! +${points}`;
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
    const emoji = state.served >= 12 ? "🌟" : state.served >= 6 ? "🎉" : "💪";
    document.getElementById("cr-end-emoji").textContent = emoji;
    document.getElementById("cr-end-title").textContent = "Rush Complete!";
    document.getElementById("cr-end-sub").textContent = `You served ${state.served} customer${state.served === 1 ? "" : "s"} (${Math.round(accuracy * 100)}% happy) and missed ${state.missed}.`;
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

  function startGame() {
    state.timeLeftMs = ROUND_DURATION_SEC * 1000;
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
  document.getElementById("cr-play-again-btn").addEventListener("click", startGame);
}
