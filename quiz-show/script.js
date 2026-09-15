/* =================================================================
   Quiz Show Live — a PRESENTATION layer over standard Q&A rather than a
   brand new core mechanic: spinning category wheel, a prize ladder with
   2 safe checkpoints (Who Wants to Be a Millionaire style -- missing a
   question drops you back to your last checkpoint, not to zero), a
   "Final Answer?" confirmation step before reveal, and 2 one-time
   lifelines (50/50, Skip). The drama/pacing is the new thing here, not
   the underlying question format.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("qs-signedout-overlay").classList.remove("hidden");
  document.getElementById("qs-start-overlay").classList.add("hidden");
} else {
  initQuizShow();
}

function initQuizShow() {
  const PRIZE_LADDER = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
  const CHECKPOINT_INDICES = [4]; // 0-indexed -- rung 5 (index 4) is the only mid-game safe haven
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  // The wheel has 2 extra slices (Language, Science) beyond the 6 math
  // GEN_KEYS, so it spins the SAME way it always did but can now land on
  // a mixed-subject question too -- SLICE_KEYS (not GEN_KEYS) is what
  // renderWheel/spinWheelTo iterate over.
  const SLICE_KEYS = [...GEN_KEYS, "lang", "sci"];
  const CATEGORY_LABELS = { "addition-subtraction-add": "Addition", "addition-subtraction-sub": "Subtract", multiplication: "Multiply", division: "Division", measurement: "Measure", rounding: "Rounding", lang: "Language", sci: "Science" };
  const WHEEL_COLORS = ["#8c2f6b", "#2f4c8c", "#3f7a4e", "#a85a1f", "#6b3f9b", "#b8342f", "#1f6b5e", "#2f8ca8"];
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();

  const state = { qIndex: 0, prizeIndex: -1, lastCheckpointIndex: -1, hint5050Used: false, skipUsed: false, pickedBtn: null, currentQ: null };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 2 ? "easy" : i <= 5 ? "medium" : "hard"; }

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

  // Each slice's OUTER div rotates to point at its position on the wheel
  // (needed to place the label along the right radial line), but the
  // label TEXT itself is a child span counter-rotated by the same
  // angle in the opposite direction -- so it always renders upright and
  // horizontal no matter where it sits on the wheel, instead of
  // appearing sideways/upside-down on the lower half like a plain
  // radially-rotated label would (found from a real-device screenshot
  // showing exactly that -- "Division"/"Round"/"Add" unreadable).
  function renderWheel() {
    const wheel = document.getElementById("qs-wheel");
    wheel.innerHTML = "";
    const n = SLICE_KEYS.length;
    const sliceDeg = 360 / n;
    wheel.style.background = `conic-gradient(${SLICE_KEYS.map((k, i) => `${WHEEL_COLORS[i]} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`).join(",")})`;
    SLICE_KEYS.forEach((k, i) => {
      const angle = i * sliceDeg + sliceDeg / 2;
      const slice = document.createElement("div");
      slice.className = "qs-wheel-slice";
      slice.style.transform = `rotate(${angle}deg)`;
      const text = document.createElement("span");
      text.className = "qs-wheel-slice-text";
      text.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
      text.textContent = CATEGORY_LABELS[k];
      slice.appendChild(text);
      wheel.appendChild(slice);
    });
  }

  function spinWheelTo(targetKeyIndex, onDone) {
    const wheel = document.getElementById("qs-wheel");
    const n = SLICE_KEYS.length;
    const sliceDeg = 360 / n;
    // Land the CENTER of the target slice under the top pointer (0deg) --
    // spin several full turns first purely for visual drama.
    const targetRotation = 360 * 4 + (360 - (targetKeyIndex * sliceDeg + sliceDeg / 2));
    wheel.style.transition = "none";
    wheel.style.transform = "rotate(0deg)";
    void wheel.offsetWidth;
    wheel.style.transition = "transform 3s cubic-bezier(.17,.67,.16,.99)";
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    setTimeout(onDone, 3100);
  }

  function renderLadder() {
    const ladder = document.getElementById("qs-ladder");
    ladder.innerHTML = "";
    PRIZE_LADDER.forEach((prize, i) => {
      const rung = document.createElement("div");
      rung.className = "qs-ladder-rung"
        + (i <= state.prizeIndex ? " done" : i === state.qIndex ? " current" : "")
        + (CHECKPOINT_INDICES.includes(i) ? " checkpoint" : "");
      rung.textContent = `$${prize}`;
      ladder.appendChild(rung);
    });
    document.getElementById("qs-prize-value").textContent = `$${state.prizeIndex >= 0 ? PRIZE_LADDER[state.prizeIndex] : 0}`;
  }

  function rollMathAtSlice(sliceIndex) {
    const key = GEN_KEYS[sliceIndex];
    const raw = MATHVILLE_GENERATORS[key](difficultyForIndex(state.qIndex));
    return { sliceIndex, key, ...buildMc(raw) };
  }

  // Picks which of the 8 wheel slices to land on, THEN builds that
  // slice's question -- the wheel always lands on the category the next
  // question actually belongs to, math or not. Falls back to a random
  // math slice if the Language/Science pool isn't ready or came back
  // empty, so a slow/offline fetch never blocks the wheel.
  function rollQuestion() {
    const sliceIndex = rand(0, SLICE_KEYS.length - 1);
    const sliceKey = SLICE_KEYS[sliceIndex];
    if (sliceKey === "lang" || sliceKey === "sci") {
      const pick = window.AIGQuestionPools && (sliceKey === "lang" ? window.AIGQuestionPools.pickLanguage() : window.AIGQuestionPools.pickScience());
      if (pick) return { sliceIndex, key: sliceKey === "lang" ? "language" : "science", ...pick };
      return rollMathAtSlice(rand(0, GEN_KEYS.length - 1));
    }
    return rollMathAtSlice(sliceIndex);
  }

  function startRound() {
    document.getElementById("qs-q-card").classList.add("hidden");
    const q = rollQuestion();
    state.currentQ = q;
    spinWheelTo(q.sliceIndex, () => showQuestion(q));
  }

  function showQuestion(q) {
    document.getElementById("qs-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("qs-q-grid");
    grid.innerHTML = "";
    state.pickedBtn = null;
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "qs-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => pickAnswer(btn, opt));
      grid.appendChild(btn);
    });
    document.getElementById("qs-q-card").classList.remove("hidden");
  }

  function pickAnswer(btn, opt) {
    if (btn.classList.contains("removed")) return;
    document.querySelectorAll("#qs-q-grid .qs-q-btn").forEach(b => b.classList.remove("picked"));
    btn.classList.add("picked");
    state.pickedBtn = { btn, opt };
    document.getElementById("qs-final-sub").textContent = `You picked "${opt}" for $${PRIZE_LADDER[state.qIndex]}.`;
    document.getElementById("qs-final-overlay").classList.remove("hidden");
  }

  document.getElementById("qs-final-no-btn").addEventListener("click", () => {
    document.getElementById("qs-final-overlay").classList.add("hidden");
  });
  document.getElementById("qs-final-yes-btn").addEventListener("click", () => {
    document.getElementById("qs-final-overlay").classList.add("hidden");
    lockInAnswer();
  });

  function lockInAnswer() {
    const q = state.currentQ;
    const { btn, opt } = state.pickedBtn;
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#qs-q-grid .qs-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("quiz-show", q.key, isCorrect);

    setTimeout(() => {
      if (isCorrect) {
        state.prizeIndex = state.qIndex;
        if (CHECKPOINT_INDICES.includes(state.qIndex)) state.lastCheckpointIndex = state.qIndex;
        state.qIndex++;
        renderLadder();
        if (state.qIndex >= PRIZE_LADDER.length) { finishShow(true); return; }
        startRound();
      } else {
        finishShow(false);
      }
    }, 1200);
  }

  document.getElementById("qs-lifeline-5050").addEventListener("click", () => {
    if (state.hint5050Used || !state.currentQ) return;
    state.hint5050Used = true;
    document.getElementById("qs-lifeline-5050").disabled = true;
    const q = state.currentQ;
    const wrongBtns = [...document.querySelectorAll("#qs-q-grid .qs-q-btn")].filter(b => b.textContent !== q.correctLabel);
    shuffle(wrongBtns).slice(0, 2).forEach(b => b.classList.add("removed"));
  });

  document.getElementById("qs-lifeline-skip").addEventListener("click", () => {
    if (state.skipUsed) return;
    state.skipUsed = true;
    document.getElementById("qs-lifeline-skip").disabled = true;
    startRound(); // fresh question at the SAME rung -- no penalty
  });

  function finishShow(reachedTop) {
    if (window.AIGSynthBgm) AIGSynthBgm.stop();
    const finalPrizeIndex = reachedTop ? PRIZE_LADDER.length - 1 : state.lastCheckpointIndex;
    const finalPrize = finalPrizeIndex >= 0 ? PRIZE_LADDER[finalPrizeIndex] : 0;
    document.getElementById("qs-q-card").classList.add("hidden");
    const emoji = reachedTop ? "🏆" : finalPrize >= 75 ? "🥳" : finalPrize > 0 ? "🙂" : "💪";
    const title = reachedTop ? "You won the top prize!" : "Game Over!";
    document.getElementById("qs-end-emoji").textContent = emoji;
    document.getElementById("qs-end-title").textContent = title;
    document.getElementById("qs-end-sub").textContent = reachedTop
      ? `You answered all 10 questions and won $${finalPrize}!`
      : `You walk away with $${finalPrize}${finalPrize > 0 ? " (your last checkpoint)" : ""}.`;
    const bonusEl = document.getElementById("qs-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardQuizShowBonus(finalPrize, PRIZE_LADDER[PRIZE_LADDER.length - 1]).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("qs-end-overlay").classList.remove("hidden");
  }

  function startShow() {
    if (window.AIGSynthBgm) AIGSynthBgm.start();
    state.qIndex = 0;
    state.prizeIndex = -1;
    state.lastCheckpointIndex = -1;
    state.hint5050Used = false;
    state.skipUsed = false;
    document.getElementById("qs-lifeline-5050").disabled = false;
    document.getElementById("qs-lifeline-skip").disabled = false;
    renderWheel();
    renderLadder();
    document.getElementById("qs-end-overlay").classList.add("hidden");
    document.getElementById("qs-start-overlay").classList.add("hidden");
    startRound();
  }

  document.getElementById("qs-start-btn").addEventListener("click", startShow);
  document.getElementById("qs-play-again-btn").addEventListener("click", startShow);
}
