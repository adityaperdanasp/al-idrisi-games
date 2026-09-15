/* =================================================================
   Number Line Long Jump — work out the answer, then pull back and
   release to launch a runner exactly that far along a number line. The
   skill here is judging DISTANCE (how far to pull), not aim -- a
   deliberately different feel from Math Hoops (aim at a fixed target)
   or a reflex/timing game. One jump per question, 10 questions/round.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("nlj-signedout-overlay").classList.remove("hidden");
  document.getElementById("nlj-start-overlay").classList.add("hidden");
} else {
  initNumberLineJump();
}

function initNumberLineJump() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const ROUND_SIZE = 10;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "rounding"];
  // Bounds the number line can use -- picked per-question as the smallest
  // one comfortably above the answer, so the line's scale always suits
  // the number in play (a "37" question gets a 0-50 line, a "683"
  // question gets a 0-1000 line) instead of one fixed scale for everything.
  const BOUND_OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const HIT_TOLERANCE_FRACTION = 0.06; // within 6% of the line's bound counts as a hit

  const hudHits = document.getElementById("nlj-hud-hits");
  const hudCoins = document.getElementById("nlj-hud-coins");
  const hudGems = document.getElementById("nlj-hud-gems");
  const trackWrap = document.getElementById("nlj-track-wrap");
  const runner = document.getElementById("nlj-runner");
  const targetFlag = document.getElementById("nlj-target-flag");
  const landingMark = document.getElementById("nlj-landing-mark");
  const pullZone = document.getElementById("nlj-pull-zone");
  const pullFill = document.getElementById("nlj-pull-fill");
  const pullHint = document.getElementById("nlj-pull-hint");
  const resultBanner = document.getElementById("nlj-result-banner");

  const state = { qIndex: 0, hits: 0, answer: 0, bound: 100, dragging: false, dragStartX: 0, locked: false };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  if (window.AIGLeaderboard) {
    AIGLeaderboard.watchWallet(wallet => {
      hudCoins.textContent = wallet.coins || 0;
      hudGems.textContent = wallet.gems || 0;
    });
  }

  function boundFor(answer) {
    return BOUND_OPTIONS.find(b => b >= Math.abs(answer) * 1.15) || BOUND_OPTIONS[BOUND_OPTIONS.length - 1];
  }

  function clearTicks() {
    trackWrap.querySelectorAll(".nlj-tick, .nlj-tick-label").forEach(el => el.remove());
  }

  function renderTicks(bound) {
    clearTicks();
    for (let i = 0; i <= 4; i++) {
      const pct = i * 25;
      const val = Math.round((bound * pct) / 100);
      const tick = document.createElement("div");
      tick.className = "nlj-tick";
      tick.style.left = pct + "%";
      trackWrap.insertBefore(tick, runner);
      const label = document.createElement("div");
      label.className = "nlj-tick-label";
      label.style.left = pct + "%";
      label.textContent = val.toLocaleString("en-US");
      trackWrap.insertBefore(label, runner);
    }
  }

  function rollMathQuestion() {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key]("medium");
    const answer = Number(String(raw.answer).replace(/,/g, ""));
    return { key, prompt: raw.prompt, answer };
  }

  function rollQuestion() {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion()) : rollMathQuestion();
  }

  function resetTrackVisuals() {
    runner.style.left = "0%";
    runner.classList.remove("jumping");
    targetFlag.classList.remove("show");
    landingMark.classList.remove("show", "hit");
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    pullFill.style.width = "0%";
    pullHint.textContent = "👉 Drag right to power up your jump, then let go!";
  }

  function askQuestion() {
    if (state.qIndex >= ROUND_SIZE) { finishRound(); return; }
    const q = rollQuestion();
    state.answer = q.answer;
    state.bound = boundFor(q.answer);
    document.getElementById("nlj-q-prompt").textContent = q.prompt;
    renderTicks(state.bound);
    resetTrackVisuals();
    state.locked = false;
    enableDrag();
  }

  function enableDrag() { pullZone.addEventListener("pointerdown", onDragStart); }
  function disableDrag() { pullZone.removeEventListener("pointerdown", onDragStart); }

  function onDragStart(e) {
    if (state.locked) return;
    e.preventDefault();
    state.dragging = true;
    state.dragStartX = e.clientX;
    try { pullZone.setPointerCapture(e.pointerId); } catch (err) {}
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
  }

  function onDragMove(e) {
    if (!state.dragging) return;
    const rect = pullZone.getBoundingClientRect();
    const dx = e.clientX - state.dragStartX;
    const pct = Math.max(0, Math.min(100, (dx / rect.width) * 130));
    pullFill.style.width = pct + "%";
    pullHint.textContent = pct < 5 ? "👉 Drag right to power up your jump, then let go!" : "Let go to jump!";
  }

  function onDragEnd(e) {
    if (!state.dragging) return;
    state.dragging = false;
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    const rect = pullZone.getBoundingClientRect();
    const dx = e.clientX - state.dragStartX;
    const pct = Math.max(0, Math.min(100, (dx / rect.width) * 130));
    disableDrag();
    state.locked = true;
    landJump(pct);
  }

  function landJump(landingPct) {
    runner.classList.add("jumping");
    void runner.offsetWidth;
    runner.style.left = landingPct + "%";
    setTimeout(() => {
      runner.classList.remove("jumping");
      const landingValue = Math.round((landingPct / 100) * state.bound);
      const targetPct = Math.max(0, Math.min(100, (state.answer / state.bound) * 100));
      const isHit = Math.abs(landingPct - targetPct) <= HIT_TOLERANCE_FRACTION * 100;

      targetFlag.style.left = targetPct + "%";
      targetFlag.classList.add("show");
      landingMark.style.left = landingPct + "%";
      landingMark.classList.add("show");
      landingMark.classList.toggle("hit", isHit);

      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("number-line-jump", "jump", isHit);

      if (isHit) {
        state.hits++;
        hudHits.textContent = state.hits;
        resultBanner.textContent = `🎯 Landed on ${landingValue} -- the answer was ${state.answer}!`;
        resultBanner.classList.remove("miss");
      } else {
        resultBanner.textContent = `You landed on ${landingValue}, the answer was ${state.answer}.`;
        resultBanner.classList.add("miss");
      }

      state.qIndex++;
      setTimeout(askQuestion, 1400);
    }, 620);
  }

  function finishRound() {
    const hits = state.hits;
    const emoji = hits >= 9 ? "🏆" : hits >= 6 ? "🥳" : hits >= 3 ? "🙂" : "💪";
    const title = hits >= 9 ? "Incredible jumps!" : hits >= 6 ? "Great jumping!" : hits >= 3 ? "Nice try!" : "Keep practicing!";
    document.getElementById("nlj-end-emoji").textContent = emoji;
    document.getElementById("nlj-end-title").textContent = title;
    document.getElementById("nlj-end-sub").textContent = `You landed exactly ${hits}/${ROUND_SIZE} times.`;
    const bonusEl = document.getElementById("nlj-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardNumberLineJumpBonus(hits, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("nlj-end-overlay").classList.remove("hidden");
  }

  function startRound() {
    state.qIndex = 0;
    state.hits = 0;
    hudHits.textContent = 0;
    document.getElementById("nlj-end-overlay").classList.add("hidden");
    document.getElementById("nlj-start-overlay").classList.add("hidden");
    askQuestion();
  }

  document.getElementById("nlj-start-btn").addEventListener("click", startRound);
  document.getElementById("nlj-play-again-btn").addEventListener("click", startRound);
}
