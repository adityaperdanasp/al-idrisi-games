/* =================================================================
   Math Tennis — answer right to serve, then tap SWING! at the exact
   moment the ball crosses into your zone. The skill here is TIMING --
   distinct from Math Hoops (aim) and Number Line Long Jump (distance
   judgment). Ball speed ramps up with each point won, same "gets harder
   as you succeed" shape as Plane Mode's wave difficulty.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("mt-signedout-overlay").classList.remove("hidden");
  document.getElementById("mt-start-overlay").classList.add("hidden");
} else {
  initMathTennis();
}

function initMathTennis() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const ROUND_SIZE = 10;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const BASE_DURATION_MS = 1500;
  const MIN_DURATION_MS = 750;
  const DURATION_STEP_MS = 60; // ball gets this much faster per point won
  const SWEET_MIN_PCT = 66, SWEET_MAX_PCT = 90; // where in the ball's travel counts as a good return

  const hudPoints = document.getElementById("mt-hud-points");
  const hudCoins = document.getElementById("mt-hud-coins");
  const hudGems = document.getElementById("mt-hud-gems");
  const ball = document.getElementById("mt-ball");
  const sweetZone = document.getElementById("mt-sweet-zone");
  const swingBtn = document.getElementById("mt-swing-btn");
  const resultBanner = document.getElementById("mt-result-banner");

  const state = { qIndex: 0, points: 0, rallyRunning: false, rallyStart: 0, rallyDuration: BASE_DURATION_MS, rafId: null, resolved: false };

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

  sweetZone.style.left = SWEET_MIN_PCT + "%";
  sweetZone.style.width = (SWEET_MAX_PCT - SWEET_MIN_PCT) + "%";

  // Same MC-building approach as basketball/treasure-dig's buildMc.
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

  function rollMathQuestion() {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key]("medium");
    return { key, ...buildMc(raw) };
  }

  function rollQuestion() {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion()) : rollMathQuestion();
  }

  function askQuestion() {
    if (state.qIndex >= ROUND_SIZE) { finishMatch(); return; }
    const q = rollQuestion();
    document.getElementById("mt-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("mt-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "mt-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("mt-question-overlay").classList.remove("hidden");
  }

  function handleAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    const grid = document.getElementById("mt-q-grid");
    grid.querySelectorAll(".mt-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("math-tennis", q.key, isCorrect);
    state.qIndex++;

    setTimeout(() => {
      document.getElementById("mt-question-overlay").classList.add("hidden");
      if (isCorrect) {
        startRally();
      } else {
        resultBanner.textContent = "❌ Missed the serve -- no return this time.";
        resultBanner.classList.add("miss");
        setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 900);
      }
    }, 700);
  }

  function startRally() {
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    ball.style.left = "2%";
    ball.style.transition = "none";
    void ball.offsetWidth;
    swingBtn.classList.remove("hidden");
    swingBtn.disabled = false;
    state.resolved = false;
    state.rallyRunning = true;
    state.rallyStart = performance.now();
    state.rallyDuration = Math.max(MIN_DURATION_MS, BASE_DURATION_MS - state.points * DURATION_STEP_MS);
    requestAnimationFrame(() => {
      ball.style.transition = `left ${state.rallyDuration}ms linear`;
      ball.style.left = "98%";
    });
    state.rafId = requestAnimationFrame(rallyTick);
  }

  function rallyTick(now) {
    if (!state.rallyRunning) return;
    const elapsed = now - state.rallyStart;
    if (elapsed >= state.rallyDuration) {
      // Ball reached the far side without a swing -- missed entirely.
      resolveRally(false);
      return;
    }
    state.rafId = requestAnimationFrame(rallyTick);
  }

  function onSwing() {
    if (!state.rallyRunning || state.resolved) return;
    const elapsed = performance.now() - state.rallyStart;
    const pct = (elapsed / state.rallyDuration) * 100;
    const isHit = pct >= SWEET_MIN_PCT && pct <= SWEET_MAX_PCT;
    resolveRally(isHit);
  }

  function resolveRally(isHit) {
    if (state.resolved) return;
    state.resolved = true;
    state.rallyRunning = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    swingBtn.classList.add("hidden");

    if (isHit) {
      state.points++;
      hudPoints.textContent = state.points;
      resultBanner.textContent = "🎾 Great return!";
      resultBanner.classList.remove("miss");
    } else {
      resultBanner.textContent = "You missed the timing on that return.";
      resultBanner.classList.add("miss");
    }
    setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 1000);
  }

  function finishMatch() {
    const points = state.points;
    const emoji = points >= 9 ? "🏆" : points >= 6 ? "🥳" : points >= 3 ? "🙂" : "💪";
    const title = points >= 9 ? "Championship form!" : points >= 6 ? "Great match!" : points >= 3 ? "Nice rallies!" : "Keep practicing!";
    document.getElementById("mt-end-emoji").textContent = emoji;
    document.getElementById("mt-end-title").textContent = title;
    document.getElementById("mt-end-sub").textContent = `You won ${points}/${ROUND_SIZE} points.`;
    const bonusEl = document.getElementById("mt-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardMathTennisBonus(points, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("mt-end-overlay").classList.remove("hidden");
  }

  function startMatch() {
    state.qIndex = 0;
    state.points = 0;
    hudPoints.textContent = 0;
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    document.getElementById("mt-end-overlay").classList.add("hidden");
    document.getElementById("mt-start-overlay").classList.add("hidden");
    askQuestion();
  }

  swingBtn.addEventListener("click", onSwing);
  document.getElementById("mt-start-btn").addEventListener("click", startMatch);
  document.getElementById("mt-play-again-btn").addEventListener("click", startMatch);
}
