/* =================================================================
   Space Race -- scoped as a SOLO distance-accumulation game with a
   simple cross-player leaderboard (not real-time multiplayer racing,
   which Math Race already owns -- see project notes). Each of 12
   questions gives a bigger "boost" (distance) the faster you answer
   correctly; a wrong answer gives no boost. Final distance is saved
   as a personal best (players/{id}/spaceRace/bestDistance) and shown
   against a small cross-player leaderboard read the same way the
   existing Weekly Leaderboard feature reads players/ once.
   ================================================================= */

const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const QUESTION_COUNT = 12;
const BOOST_TIERS = [
  { maxMs: 3000, label: "🚀 MEGA BOOST!", distance: 50 },
  { maxMs: 6000, label: "✨ Boost!", distance: 30 },
  { maxMs: 10000, label: "👍 Small Boost", distance: 15 },
  { maxMs: Infinity, label: "Boost", distance: 5 }
];
const MAX_POSSIBLE_DISTANCE = QUESTION_COUNT * BOOST_TIERS[0].distance;

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("sr-signedout-overlay").classList.remove("hidden");
  document.getElementById("sr-start-overlay").classList.add("hidden");
} else {
  initSpaceRace();
}

function initSpaceRace() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const state = { qIndex: 0, distance: 0, qStart: 0 };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 3 ? "easy" : i <= 8 ? "medium" : "hard"; }

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

  function spawnStars() {
    const track = document.getElementById("sr-track");
    track.querySelectorAll(".sr-star").forEach(s => s.remove());
    for (let i = 0; i < 30; i++) {
      const star = document.createElement("div");
      star.className = "sr-star";
      star.style.left = rand(2, 98) + "%";
      star.style.top = rand(2, 98) + "%";
      track.appendChild(star);
    }
  }

  function renderHud() {
    document.getElementById("sr-q-count").textContent = Math.min(state.qIndex + 1, QUESTION_COUNT);
    document.getElementById("sr-distance").textContent = state.distance;
    const pct = Math.min(92, 4 + (state.distance / MAX_POSSIBLE_DISTANCE) * 88);
    document.getElementById("sr-rocket").style.bottom = pct + "%";
  }

  function askQuestion() {
    const q = rollQuestion(difficultyForIndex(state.qIndex));
    document.getElementById("sr-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("sr-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "sr-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    state.qStart = Date.now();
  }

  function handleAnswer(btn, opt, q) {
    const elapsed = Date.now() - state.qStart;
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#sr-q-grid .sr-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("space-race", q.key, isCorrect);

    const rocket = document.getElementById("sr-rocket");
    if (isCorrect) {
      const tier = BOOST_TIERS.find(t => elapsed <= t.maxMs);
      state.distance += tier.distance;
      document.getElementById("sr-boost-toast").textContent = tier.label;
      rocket.classList.add("boosting");
      setTimeout(() => rocket.classList.remove("boosting"), 400);
    } else {
      document.getElementById("sr-boost-toast").textContent = "💨 Sputter...";
    }
    renderHud();

    setTimeout(() => {
      document.getElementById("sr-boost-toast").textContent = "";
      state.qIndex++;
      if (state.qIndex >= QUESTION_COUNT) {
        finishGame();
      } else {
        askQuestion();
      }
    }, 900);
  }

  async function finishGame() {
    document.getElementById("sr-q-card").classList.add("hidden");
    const emoji = state.distance >= 450 ? "🌟" : state.distance >= 250 ? "🎉" : "💪";
    document.getElementById("sr-end-emoji").textContent = emoji;
    document.getElementById("sr-end-title").textContent = "Touchdown!";
    document.getElementById("sr-end-sub").textContent = `Your rocket flew ${state.distance} km this run!`;

    const bonusEl = document.getElementById("sr-end-bonus");
    bonusEl.textContent = "";
    const lbEl = document.getElementById("sr-leaderboard");

    if (window.AIGLeaderboard) {
      // Sequential, not Promise.all: the leaderboard read must happen
      // AFTER the write commits, or a first-time player's own new best
      // can lose the race and be missing from the leaderboard they just
      // set (found via live preview testing).
      const bestResult = await AIGLeaderboard.submitSpaceRaceDistance(state.distance);
      const leaderboard = await AIGLeaderboard.getSpaceRaceLeaderboard();
      if (bestResult && bestResult.isNewBest) {
        document.getElementById("sr-end-sub").textContent += " 🏅 New personal best!";
      } else if (bestResult) {
        document.getElementById("sr-end-sub").textContent += ` (Best: ${bestResult.bestDistance} km)`;
      }
      if (leaderboard && leaderboard.length) {
        lbEl.innerHTML = leaderboard.slice(0, 5).map(row =>
          `<div class="sr-leaderboard-row${row.id === player.id ? " me" : ""}">
            <span>${row.name}</span><span>${row.bestDistance} km</span>
          </div>`
        ).join("");
        lbEl.classList.remove("hidden");
      }
      AIGLeaderboard.awardSpaceRaceBonus(state.distance).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("sr-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.qIndex = 0;
    state.distance = 0;
    document.getElementById("sr-start-overlay").classList.add("hidden");
    document.getElementById("sr-end-overlay").classList.add("hidden");
    document.getElementById("sr-q-card").classList.remove("hidden");
    document.getElementById("sr-leaderboard").classList.add("hidden");
    spawnStars();
    renderHud();
    askQuestion();
  }

  document.getElementById("sr-start-btn").addEventListener("click", startGame);
  document.getElementById("sr-play-again-btn").addEventListener("click", startGame);
  spawnStars();
}
