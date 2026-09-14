/* =================================================================
   Fortress Math — a genuinely different genre from every other new
   mini-game: strategy/placement instead of action/reflex. Build phase:
   answer 4 questions, each correct one earns a tower to place in an
   empty ring slot along the path. Defend phase: 5 waves of monsters walk
   from the right toward the fortress on the left; placed towers
   auto-fire at whichever enemy in range is closest to the fortress.
   No live interaction during combat -- the strategy already happened
   during placement, this is watching that strategy play out.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("fm-signedout-overlay").classList.remove("hidden");
  document.getElementById("fm-start-overlay").classList.add("hidden");
} else {
  initFortressMath();
}

function initFortressMath() {
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const TOWER_SLOTS_X = [22, 42, 62, 82]; // % positions along the path
  const BUILD_QUESTIONS = TOWER_SLOTS_X.length;
  const WAVE_COUNT = 5;
  const FORTRESS_HP_MAX = 5;
  const TICK_MS = 100;
  const TOWER_FIRE_EVERY_TICKS = 5; // 500ms
  const TOWER_RANGE_PCT = 15;
  const FORTRESS_X = 8; // an enemy at or past this % has "reached" the fortress
  const SPAWN_X = 97;

  const hudHp = document.getElementById("fm-hud-hp");
  const hudWave = document.getElementById("fm-hud-wave");
  const hudCoins = document.getElementById("fm-hud-coins");
  const hudGems = document.getElementById("fm-hud-gems");
  const phaseBanner = document.getElementById("fm-phase-banner");
  const battlefield = document.getElementById("fm-battlefield");

  const state = {
    hp: FORTRESS_HP_MAX,
    wave: 0,
    towers: [], // { x, el }
    enemies: [], // { id, x, pos, hp, maxHp, el, speedPerTick }
    remainingInWave: 0,
    tickCount: 0,
    intervalId: null,
    defeated: 0,
    ended: false,
    buildIndex: 0
  };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  if (window.AIGLeaderboard) {
    AIGLeaderboard.watchWallet(wallet => {
      hudCoins.textContent = wallet.coins || 0;
      hudGems.textContent = wallet.gems || 0;
    });
  }

  // Same MC-building approach as the other new mini-games' buildMc.
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

  function renderSlots() {
    battlefield.querySelectorAll(".fm-slot").forEach(el => el.remove());
    TOWER_SLOTS_X.forEach(x => {
      const el = document.createElement("div");
      el.className = "fm-slot";
      el.style.left = x + "%";
      el.textContent = "";
      el.dataset.x = x;
      battlefield.appendChild(el);
    });
  }

  function updateHud() {
    hudHp.textContent = state.hp;
    hudWave.textContent = state.wave;
  }

  // ---- Build phase ------------------------------------------------------
  function askBuildQuestion() {
    if (state.buildIndex >= BUILD_QUESTIONS) { startDefendPhase(); return; }
    const q = rollQuestion();
    document.getElementById("fm-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("fm-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "fm-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleBuildAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("fm-question-overlay").classList.remove("hidden");
  }

  function handleBuildAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#fm-q-grid .fm-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("fortress-math", q.key, isCorrect);
    state.buildIndex++;

    setTimeout(() => {
      document.getElementById("fm-question-overlay").classList.add("hidden");
      if (isCorrect) {
        phaseBanner.textContent = "Tap an empty ring to place your tower!";
        awaitTowerPlacement();
      } else {
        phaseBanner.textContent = "No tower earned that round.";
        setTimeout(askBuildQuestion, 900);
      }
    }, 700);
  }

  function awaitTowerPlacement() {
    const emptySlots = [...battlefield.querySelectorAll(".fm-slot:not(.filled)")];
    if (!emptySlots.length) { askBuildQuestion(); return; }
    emptySlots.forEach(slot => {
      slot.onclick = () => {
        placeTower(slot);
        emptySlots.forEach(s => { s.onclick = null; s.classList.add("disabled"); });
        setTimeout(askBuildQuestion, 500);
      };
    });
  }

  function placeTower(slotEl) {
    slotEl.classList.add("filled");
    slotEl.classList.remove("disabled");
    slotEl.textContent = "🗼";
    state.towers.push({ x: Number(slotEl.dataset.x), el: slotEl });
  }

  // ---- Defend phase -------------------------------------------------------
  function startDefendPhase() {
    document.querySelectorAll(".fm-slot:not(.filled)").forEach(s => { s.onclick = null; });
    phaseBanner.textContent = state.towers.length
      ? `${state.towers.length} tower${state.towers.length === 1 ? "" : "s"} ready. Here come the waves!`
      : "No towers placed -- the fortress stands alone!";
    setTimeout(() => startWave(1), 1400);
  }

  function startWave(waveNum) {
    if (state.ended) return;
    state.wave = waveNum;
    updateHud();
    phaseBanner.textContent = `🌊 Wave ${waveNum}/${WAVE_COUNT}`;
    const enemyCount = 2 + waveNum;
    const enemyHp = 2 + Math.floor(waveNum / 2);
    const traverseMs = Math.max(3500, 7000 - waveNum * 500);
    state.remainingInWave = enemyCount;
    for (let i = 0; i < enemyCount; i++) {
      setTimeout(() => spawnEnemy(enemyHp, traverseMs), i * 800);
    }
    if (!state.intervalId) state.intervalId = setInterval(tick, TICK_MS);
  }

  function spawnEnemy(hp, traverseMs) {
    if (state.ended) return;
    const el = document.createElement("div");
    el.className = "fm-enemy";
    el.textContent = "👹";
    el.style.left = SPAWN_X + "%";
    battlefield.appendChild(el);
    state.enemies.push({
      id: "e" + Math.random(),
      x: SPAWN_X,
      pos: 0,
      hp, maxHp: hp,
      el,
      progressPerTick: (TICK_MS / traverseMs)
    });
  }

  function removeEnemy(enemy, reachedFortress) {
    enemy.el.remove();
    state.enemies = state.enemies.filter(e => e !== enemy);
    state.remainingInWave--;
    if (reachedFortress) {
      state.hp = Math.max(0, state.hp - 1);
      updateHud();
      if (state.hp <= 0) { endBattle(false); return; }
    } else {
      state.defeated++;
    }
    if (state.remainingInWave <= 0 && !state.ended) {
      if (state.wave >= WAVE_COUNT) {
        endBattle(true);
      } else {
        phaseBanner.textContent = `Wave ${state.wave} cleared!`;
        setTimeout(() => startWave(state.wave + 1), 1400);
      }
    }
  }

  function tick() {
    if (state.ended) return;
    state.tickCount++;
    // Move enemies.
    state.enemies.slice().forEach(enemy => {
      enemy.pos += enemy.progressPerTick;
      enemy.x = SPAWN_X - enemy.pos * (SPAWN_X - FORTRESS_X);
      if (enemy.x <= FORTRESS_X) {
        removeEnemy(enemy, true);
        return;
      }
      enemy.el.style.left = enemy.x + "%";
    });
    // Towers fire on a slower cadence than the movement tick.
    if (state.tickCount % TOWER_FIRE_EVERY_TICKS === 0) {
      state.towers.forEach(tower => {
        const inRange = state.enemies.filter(e => Math.abs(e.x - tower.x) <= TOWER_RANGE_PCT);
        if (!inRange.length) return;
        inRange.sort((a, b) => b.pos - a.pos); // most advanced (closest to fortress) first
        const target = inRange[0];
        target.hp--;
        target.el.classList.add("hit");
        setTimeout(() => target.el && target.el.classList.remove("hit"), 150);
        if (target.hp <= 0) removeEnemy(target, false);
      });
    }
  }

  function endBattle(survived) {
    state.ended = true;
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    state.enemies.forEach(e => e.el.remove());
    state.enemies = [];

    const wavesCleared = survived ? WAVE_COUNT : state.wave - 1;
    const emoji = state.hp >= 4 ? "🏆" : state.hp >= 2 ? "🥳" : state.hp >= 1 ? "🙂" : "💪";
    const title = survived ? (state.hp >= 4 ? "Flawless defense!" : "Fortress held!") : "The fortress fell...";
    document.getElementById("fm-end-emoji").textContent = emoji;
    document.getElementById("fm-end-title").textContent = title;
    document.getElementById("fm-end-sub").textContent = `Survived ${wavesCleared}/${WAVE_COUNT} waves, defeated ${state.defeated} monsters, ${state.hp}/${FORTRESS_HP_MAX} HP left.`;
    phaseBanner.textContent = "";
    const bonusEl = document.getElementById("fm-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardFortressMathBonus(wavesCleared, WAVE_COUNT, state.hp).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("fm-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.hp = FORTRESS_HP_MAX;
    state.wave = 0;
    state.towers = [];
    state.enemies = [];
    state.remainingInWave = 0;
    state.tickCount = 0;
    state.defeated = 0;
    state.ended = false;
    state.buildIndex = 0;
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    updateHud();
    renderSlots();
    phaseBanner.textContent = "Answer questions to earn towers!";
    document.getElementById("fm-end-overlay").classList.add("hidden");
    document.getElementById("fm-start-overlay").classList.add("hidden");
    askBuildQuestion();
  }

  document.getElementById("fm-start-btn").addEventListener("click", startGame);
  document.getElementById("fm-play-again-btn").addEventListener("click", startGame);
}
