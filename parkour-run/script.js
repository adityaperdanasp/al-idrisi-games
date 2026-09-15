/* =================================================================
   Ninja Parkour Wall-Run — a more acrobatic sibling to MathVille's
   existing Ninja Runner: 3 distinct timed moves (JUMP / WALL-RUN /
   SLIDE) instead of just jump/dodge, resolved the same real-timing
   way Ninja Runner's obstacles are (the tapped action must still be
   "active" at the moment the obstacle arrives, not just tapped at
   some point during its approach). Every 4th obstacle is a Locked
   Gate instead: a math question that must be answered correctly to
   vault through, pausing the approach until answered.
   ================================================================= */

const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const OBSTACLE_EMOJI = { jump: "🪨", wallrun: "🧱", slide: "🕸️" };
const ACTION_LABEL = { jump: "Jump", wallrun: "Wall-Run", slide: "Slide" };
const TOTAL_OBSTACLES = 15;
const OBSTACLE_MS = 1600;
const ACTION_DURATION_MS = 550;
const FIRST_OBSTACLE_DELAY_MS = 700;
const GAP_MS = 500;
const START_LIVES = 3;

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("pk-signedout-overlay").classList.remove("hidden");
  document.getElementById("pk-start-overlay").classList.add("hidden");
} else {
  initParkourRun();
}

function initParkourRun() {
  const state = { obstacleIndex: 0, lives: START_LIVES, cleared: 0, gateCount: 0, lastActionType: null, lastActionAt: 0, resolveTimer: null, running: false };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForGate(i) { return i === 0 ? "easy" : i === 1 ? "medium" : "hard"; }

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

  function rollQuestion(difficulty) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    return { key, ...buildMc(raw) };
  }

  function renderHud() {
    document.getElementById("pk-lives").textContent = state.lives;
    document.getElementById("pk-obstacle-count").textContent = Math.min(state.obstacleIndex + 1, TOTAL_OBSTACLES);
  }

  function isGateIndex(i) { return (i + 1) % 4 === 0; }

  function clearRunnerPose() {
    const runner = document.getElementById("pk-runner");
    runner.classList.remove("jumping", "wallrun", "sliding");
  }

  function doAction(type) {
    if (!state.running) return;
    state.lastActionType = type;
    state.lastActionAt = performance.now();
    const runner = document.getElementById("pk-runner");
    clearRunnerPose();
    runner.classList.add(type === "jump" ? "jumping" : type === "wallrun" ? "wallrun" : "sliding");
    setTimeout(() => {
      if (state.lastActionType === type && performance.now() - state.lastActionAt >= ACTION_DURATION_MS - 10) {
        clearRunnerPose();
      }
    }, ACTION_DURATION_MS);
  }

  document.getElementById("pk-jump-btn").addEventListener("click", () => doAction("jump"));
  document.getElementById("pk-wallrun-btn").addEventListener("click", () => doAction("wallrun"));
  document.getElementById("pk-slide-btn").addEventListener("click", () => doAction("slide"));

  function spawnMovementObstacle(type, delayMs) {
    const el = document.getElementById("pk-obstacle");
    el.textContent = OBSTACLE_EMOJI[type];
    el.classList.remove("hidden");
    el.style.transition = "none";
    el.style.left = "92%";
    void el.offsetWidth;

    setTimeout(() => {
      el.style.transition = `left ${OBSTACLE_MS}ms linear`;
      el.style.left = "16%";
      state.resolveTimer = setTimeout(() => resolveMovementObstacle(type), OBSTACLE_MS);
    }, delayMs || 0);
  }

  function resolveMovementObstacle(type) {
    const now = performance.now();
    const ok = state.lastActionType === type && (now - state.lastActionAt) <= ACTION_DURATION_MS;
    document.getElementById("pk-obstacle").classList.add("hidden");
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("parkour-run", "obstacle-" + type, ok);

    const runner = document.getElementById("pk-runner");
    if (ok) {
      state.cleared++;
      document.getElementById("pk-feedback").textContent = `${ACTION_LABEL[type]}! Nice!`;
    } else {
      state.lives--;
      runner.classList.add("hit");
      setTimeout(() => runner.classList.remove("hit"), 300);
      document.getElementById("pk-feedback").textContent = "Ouch! Mistimed!";
    }
    advanceAfterResolve();
  }

  function askGate() {
    document.getElementById("pk-actions").classList.add("hidden");
    document.getElementById("pk-obstacle").classList.add("hidden");
    document.getElementById("pk-feedback").textContent = "";
    const q = rollQuestion(difficultyForGate(state.gateCount));
    document.getElementById("pk-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("pk-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "pk-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleGateAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("pk-gate-card").classList.remove("hidden");
  }

  function handleGateAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#pk-q-grid .pk-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("parkour-run", q.key, isCorrect);
    state.gateCount++;

    if (isCorrect) {
      state.cleared++;
      document.getElementById("pk-feedback").textContent = "Gate opened!";
    } else {
      state.lives--;
      document.getElementById("pk-feedback").textContent = "Gate stayed locked!";
    }

    setTimeout(() => {
      document.getElementById("pk-gate-card").classList.add("hidden");
      document.getElementById("pk-actions").classList.remove("hidden");
      advanceAfterResolve();
    }, 1000);
  }

  function advanceAfterResolve() {
    renderHud();
    if (state.lives <= 0) { finishGame(false); return; }
    state.obstacleIndex++;
    if (state.obstacleIndex >= TOTAL_OBSTACLES) { finishGame(true); return; }
    renderHud();
    setTimeout(spawnNextObstacle, GAP_MS);
  }

  function spawnNextObstacle() {
    if (!state.running) return;
    if (isGateIndex(state.obstacleIndex)) {
      askGate();
    } else {
      const types = ["jump", "wallrun", "slide"];
      spawnMovementObstacle(types[rand(0, types.length - 1)], 0);
    }
  }

  function finishGame(completedAll) {
    state.running = false;
    clearTimeout(state.resolveTimer);
    const emoji = completedAll ? "🏆" : state.cleared >= 8 ? "🙂" : "💪";
    document.getElementById("pk-end-emoji").textContent = emoji;
    document.getElementById("pk-end-title").textContent = completedAll ? "Run Complete!" : "Out of Lives!";
    document.getElementById("pk-end-sub").textContent = completedAll
      ? `You cleared all ${TOTAL_OBSTACLES} obstacles with ${state.lives} ${state.lives === 1 ? "life" : "lives"} left!`
      : `You cleared ${state.cleared} of ${TOTAL_OBSTACLES} obstacles before running out of lives. Try again!`;
    const bonusEl = document.getElementById("pk-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardParkourRunBonus(state.cleared, TOTAL_OBSTACLES, completedAll, state.lives).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("pk-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.obstacleIndex = 0;
    state.lives = START_LIVES;
    state.cleared = 0;
    state.gateCount = 0;
    state.lastActionType = null;
    state.lastActionAt = 0;
    state.running = true;
    clearRunnerPose();
    document.getElementById("pk-actions").classList.remove("hidden");
    document.getElementById("pk-obstacle").classList.add("hidden");
    document.getElementById("pk-feedback").textContent = "";
    document.getElementById("pk-start-overlay").classList.add("hidden");
    document.getElementById("pk-end-overlay").classList.add("hidden");
    renderHud();
    const types = ["jump", "wallrun", "slide"];
    spawnMovementObstacle(types[rand(0, types.length - 1)], FIRST_OBSTACLE_DELAY_MS);
  }

  document.getElementById("pk-start-btn").addEventListener("click", startGame);
  document.getElementById("pk-play-again-btn").addEventListener("click", startGame);
}
