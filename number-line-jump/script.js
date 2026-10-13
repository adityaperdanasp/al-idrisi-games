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
  const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
  // Bounds the number line can use -- picked per-question as the smallest
  // one comfortably above the answer, so the line's scale always suits
  // the number in play (a "37" question gets a 0-50 line, a "683"
  // question gets a 0-1000 line) instead of one fixed scale for everything.
  const BOUND_OPTIONS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const HIT_TOLERANCE_FRACTION = 0.06; // within 6% of the line's bound counts as a hit
  // Audit batch 9: 3 modes (🐣 Easy: live number readout + 10 ticks + 10% tolerance; 🏃 Normal; 🏅 Pro:
  // only the 0 and end labels, 3% tolerance), jump grades (PERFECT ≤2% = 3 pts, GREAT = 2, OK = 1),
  // a streak bonus, 4 jumpers to pick, a best score per mode, and math-only numeric questions (the
  // mixed pool used to hand this game language/science questions with no number to jump to).
  const MODES = { easy: { tol: 0.10, ticks: 10, live: true, label: "🐣 Easy" }, normal: { tol: HIT_TOLERANCE_FRACTION, ticks: 4, live: false, label: "🏃 Normal" }, pro: { tol: 0.03, ticks: 1, live: false, label: "🏅 Pro" } };
  const JUMPERS = ["🐇", "🐸", "🦘", "🐿️"];
  const lsn = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsnw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  // Audit round 2: three kinds of number line -- 🔢 whole numbers, 🍕 fractions (0 to 1, jump to
  // e.g. 5/8) and ❄️ negatives (-20 to 20) -- plus a Bo-Bot rival who jumps after you each turn.
  const LINES = { whole: "🔢 Whole", frac: "🍕 Fractions", neg: "❄️ Negatives" };
  let line = lsn("nlj_line", "whole"); if (!LINES[line]) line = "whole";
  let botPts = 0;
  const span = () => state.bound - (state.min || 0);
  const v2pct = v => (v - (state.min || 0)) / span() * 100, pct2v = p => (state.min || 0) + p / 100 * span();
  const fmtV = v => line === "frac" ? `${Math.round(v * state.den)}/${state.den}` : Math.round(v).toLocaleString("en-US");
  let mode = lsn("nlj_mode", "normal"), jumper = lsn("nlj_jumper", "🐇"), points = 0, streak = 0;
  if (!MODES[mode]) mode = "normal";

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
    const n = line === "frac" ? state.den : line === "neg" ? 8 : MODES[mode].ticks === 1 ? 4 : MODES[mode].ticks;
    for (let i = 0; i <= n; i++) {
      const pct = i * 100 / n;
      const val = pct2v(pct);
      const tick = document.createElement("div");
      tick.className = "nlj-tick";
      tick.style.left = pct + "%";
      trackWrap.insertBefore(tick, runner);
      const label = document.createElement("div");
      label.className = "nlj-tick-label";
      label.style.left = pct + "%";
      label.textContent = line === "frac" ? (mode === "pro" && i > 0 && i < n ? "" : n > 5 && i % 2 && i !== n ? "" : i === 0 ? "0" : i === n ? "1" : fmtV(val)) : MODES[mode].ticks === 1 && i > 0 && i < n ? "" : n === 10 && i % 2 ? "" : fmtV(val);
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
    for (let i = 0; i < 20; i++) { const q = rollMathQuestion(); if (Number.isFinite(q.answer) && q.answer >= 0) return q; }
    const a = rand(5, 95); return { key: "addition-subtraction-add", prompt: `${a - 3} + 3 = ?`, answer: a };
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
    let q;
    if (line === "frac") { state.den = [2, 4, 5, 8, 10][rand(0, 4)]; const k = rand(1, state.den - 1); q = { prompt: `Jump to ${k}/${state.den}`, answer: k / state.den }; state.min = 0; state.bound = 1; }
    else if (line === "neg") { const a = rand(-15, 12), b = rand(-9, 9) || 4, ans = a + b; q = { prompt: `${a} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ?`.replace(/^-/, "−"), answer: ans }; if (ans < -20 || ans > 20) return askQuestion(); state.min = -20; state.bound = 20; }
    else { q = rollQuestion(); state.min = 0; state.bound = boundFor(q.answer); }
    state.answer = q.answer;
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
    pullHint.textContent = pct < 5 ? "👉 Drag right to power up your jump, then let go!" : MODES[mode].live ? `Aiming at ${fmtV(pct2v(pct))} — let go!` : "Let go to jump!";
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
      const landingValue = fmtV(pct2v(landingPct)), answerLabel = fmtV(state.answer);
      const targetPct = Math.max(0, Math.min(100, v2pct(state.answer)));
      const off = Math.abs(landingPct - targetPct), isHit = off <= MODES[mode].tol * 100;
      const grade = off <= 2 ? 3 : off <= MODES[mode].tol * 50 ? 2 : isHit ? 1 : 0;
      if (isHit) { streak++; points += grade + (streak >= 3 ? 1 : 0); } else streak = 0;
      const br = Math.random(), botGrade = br < 0.25 ? 3 : br < 0.55 ? 2 : br < 0.8 ? 1 : 0; botPts += botGrade;

      targetFlag.style.left = targetPct + "%";
      targetFlag.classList.add("show");
      landingMark.style.left = landingPct + "%";
      landingMark.classList.add("show");
      landingMark.classList.toggle("hit", isHit);

      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("number-line-jump", "jump", isHit);

      if (isHit) {
        state.hits++;
        hudHits.textContent = state.hits;
        resultBanner.textContent = `${grade === 3 ? "🌟 PERFECT" : grade === 2 ? "🎯 GREAT" : "👍 OK"} — landed on ${landingValue}, the answer was ${answerLabel}! +${grade}${streak >= 3 ? ` (+1 streak 🔥${streak})` : ""} · 🤖 Bo-Bot +${botGrade}`;
        resultBanner.classList.remove("miss");
      } else {
        resultBanner.textContent = `You landed on ${landingValue}, the answer was ${answerLabel}. · 🤖 Bo-Bot +${botGrade}`;
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
    const vsBot = points > botPts ? "You beat Bo-Bot! 🏆" : points === botPts ? "Tied with Bo-Bot!" : "Bo-Bot won this time.";
    const bk = "nlj_best_" + mode + (line === "whole" ? "" : "_" + line), best = Number(lsn(bk, "0")); if (points > best) lsnw(bk, String(points));
    document.getElementById("nlj-end-sub").textContent = `${MODES[mode].label}: you landed ${hits}/${ROUND_SIZE} jumps for ${points} points (Bo-Bot ${botPts}). ${vsBot}${points > best ? " 🌟 New best!" : ` Best: ${best}.`}`;
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
    state.hits = 0; points = 0; streak = 0; botPts = 0;
    hudHits.textContent = 0;
    runner.textContent = jumper;
    document.getElementById("nlj-end-overlay").classList.add("hidden");
    document.getElementById("nlj-start-overlay").classList.add("hidden");
    askQuestion();
  }

  function drawPicker() {
    let box = document.getElementById("nlj-pick"); if (!box) { box = document.createElement("div"); box.id = "nlj-pick"; box.className = "nlj-pick"; document.getElementById("nlj-start-btn").before(box); }
    box.innerHTML = `<div>${Object.entries(MODES).map(([k, m]) => `<button type="button" data-m="${k}" class="${k === mode ? "on" : ""}">${m.label}<small>${Number(lsn("nlj_best_" + k, "0")) ? ` best ${lsn("nlj_best_" + k, "0")}` : ""}</small></button>`).join("")}</div>
      <div>${Object.entries(LINES).map(([k, l]) => `<button type="button" data-l="${k}" class="${k === line ? "on" : ""}">${l}</button>`).join("")}</div>
      <div>${JUMPERS.map(j => `<button type="button" data-j="${j}" class="${j === jumper ? "on" : ""}">${j}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; lsnw("nlj_mode", mode); drawPicker(); });
    box.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { line = b.dataset.l; lsnw("nlj_line", line); drawPicker(); });
    box.querySelectorAll("[data-j]").forEach(b => b.onclick = () => { jumper = b.dataset.j; lsnw("nlj_jumper", jumper); drawPicker(); });
  }
  drawPicker();
  document.getElementById("nlj-start-btn").addEventListener("click", startRound);
  document.getElementById("nlj-play-again-btn").addEventListener("click", () => { document.getElementById("nlj-end-overlay").classList.add("hidden"); document.getElementById("nlj-start-overlay").classList.remove("hidden"); drawPicker(); });
}
