/* =================================================================
   Dance Battle — tap-to-beat rhythm mechanic. Each beat expands a ring
   inward toward the target circle over a fixed duration (the current
   tempo's interval); tapping TAP! near the moment it lands scores
   Perfect/Good/Miss based on |now - beatDueAt|. After each 6-beat
   segment, a math question appears -- answer correctly to unlock the
   next (faster) tempo tier; wrong keeps the current tempo for the next
   segment. Fixed 5 segments total, so the round always ends in a
   bounded number of steps regardless of answers.
   ================================================================= */

const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const TIERS = [
  { name: "Slow", interval: 1000 },
  { name: "Medium", interval: 800 },
  { name: "Fast", interval: 600 },
  { name: "Lightning", interval: 450 }
];
const TOTAL_SEGMENTS = 5;
const BEATS_PER_SEGMENT = 6;
const PERFECT_WINDOW_MS = 150;
const GOOD_WINDOW_MS = 350;

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("db-signedout-overlay").classList.remove("hidden");
  document.getElementById("db-start-overlay").classList.add("hidden");
} else {
  initDanceBattle();
}

function initDanceBattle() {
  const state = { segmentIndex: 0, tierIndex: 0, beatIndex: 0, score: 0, combo: 0, beatDueAt: 0, beatResolved: false, missTimer: null };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForSegment(i) { return i <= 1 ? "easy" : i <= 3 ? "medium" : "hard"; }

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
    document.getElementById("db-score").textContent = state.score;
    document.getElementById("db-combo").textContent = state.combo;
    document.getElementById("db-segment-label").textContent = `Segment ${state.segmentIndex + 1} / ${TOTAL_SEGMENTS} · 🎵 ${TIERS[state.tierIndex].name}`;
  }

  // ---------------------------------------------------------------
  // BEAT LOOP
  // ---------------------------------------------------------------
  function startBeat() {
    const interval = TIERS[state.tierIndex].interval;
    const pulse = document.getElementById("db-beat-pulse");
    pulse.classList.remove("animating");
    void pulse.offsetWidth;
    pulse.style.animationDuration = interval + "ms";
    pulse.classList.add("animating");

    document.getElementById("db-feedback").textContent = "";
    document.getElementById("db-tap-btn").disabled = false;
    state.beatDueAt = performance.now() + interval;
    state.beatResolved = false;

    state.missTimer = setTimeout(() => resolveBeat(null), interval + GOOD_WINDOW_MS + 60);
  }

  function resolveBeat(tapNow) {
    if (state.beatResolved) return;
    state.beatResolved = true;
    clearTimeout(state.missTimer);
    document.getElementById("db-tap-btn").disabled = true;
    document.getElementById("db-beat-pulse").classList.remove("animating");

    let category, points;
    if (tapNow === null) {
      category = "Miss"; points = 0;
    } else {
      const delta = Math.abs(tapNow - state.beatDueAt);
      if (delta <= PERFECT_WINDOW_MS) { category = "Perfect!"; points = 100; }
      else if (delta <= GOOD_WINDOW_MS) { category = "Good"; points = 50; }
      else { category = "Miss"; points = 0; }
    }

    if (points > 0) {
      state.combo++;
      if (state.combo >= 3) points = Math.round(points * 1.5);
    } else {
      state.combo = 0;
    }
    state.score += points;
    document.getElementById("db-feedback").textContent = category;
    renderHud();

    setTimeout(() => {
      state.beatIndex++;
      if (state.beatIndex >= BEATS_PER_SEGMENT) {
        askTempoQuestion();
      } else {
        startBeat();
      }
    }, 400);
  }

  document.getElementById("db-tap-btn").addEventListener("click", () => resolveBeat(performance.now()));

  // ---------------------------------------------------------------
  // BETWEEN-SEGMENT QUESTION
  // ---------------------------------------------------------------
  function askTempoQuestion() {
    document.getElementById("db-tap-btn").classList.add("hidden");
    document.getElementById("db-q-label").classList.remove("hidden");
    const q = rollQuestion(difficultyForSegment(state.segmentIndex));
    document.getElementById("db-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("db-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "db-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleTempoAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("db-q-card").classList.remove("hidden");
  }

  function handleTempoAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#db-q-grid .db-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("dance-battle", q.key, isCorrect);

    if (isCorrect && state.tierIndex < TIERS.length - 1) state.tierIndex++;

    setTimeout(() => {
      document.getElementById("db-q-card").classList.add("hidden");
      document.getElementById("db-q-label").classList.add("hidden");
      document.getElementById("db-tap-btn").classList.remove("hidden");
      state.segmentIndex++;
      if (state.segmentIndex >= TOTAL_SEGMENTS) {
        finishGame();
      } else {
        state.beatIndex = 0;
        renderHud();
        startBeat();
      }
    }, 1100);
  }

  function finishGame() {
    const emoji = state.score >= 2500 ? "🌟" : state.score >= 1500 ? "🎉" : "💪";
    document.getElementById("db-end-emoji").textContent = emoji;
    document.getElementById("db-end-title").textContent = "Dance Complete!";
    document.getElementById("db-end-sub").textContent = `Final score ${state.score}, reached ${TIERS[state.tierIndex].name} tempo!`;
    const bonusEl = document.getElementById("db-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardDanceBattleBonus(state.score, state.tierIndex, TIERS.length).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("db-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.segmentIndex = 0;
    state.tierIndex = 0;
    state.beatIndex = 0;
    state.score = 0;
    state.combo = 0;
    document.getElementById("db-start-overlay").classList.add("hidden");
    document.getElementById("db-end-overlay").classList.add("hidden");
    document.getElementById("db-tap-btn").classList.remove("hidden");
    renderHud();
    startBeat();
  }

  document.getElementById("db-start-btn").addEventListener("click", startGame);
  document.getElementById("db-play-again-btn").addEventListener("click", startGame);
}
