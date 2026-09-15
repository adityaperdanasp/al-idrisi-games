/* =================================================================
   City Builder: Kotaku Sendiri — a PERSISTENT town (unlike the other
   PM Round 4 games, progress carries across sessions in Firebase at
   players/{id}/cityBuilder/{bricks, totalEarned, grid}). Answering a
   10-question round earns bricks (spendable currency); totalEarned
   (lifetime, never spent down) gates which building types are
   unlocked. Placing a building spends bricks on a plot.
   ================================================================= */

const PLOT_COUNT = 20;
const ROUND_SIZE = 10;
const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const BUILDING_TYPES = [
  { id: "house", emoji: "🏠", name: "House", unlockAt: 0, cost: 5 },
  { id: "shop", emoji: "🏪", name: "Shop", unlockAt: 25, cost: 10 },
  { id: "park", emoji: "🌳", name: "Park", unlockAt: 50, cost: 8 },
  { id: "school", emoji: "🏫", name: "School", unlockAt: 90, cost: 15 },
  { id: "tower", emoji: "🗼", name: "Tower", unlockAt: 140, cost: 25 },
  { id: "castle", emoji: "🏰", name: "Castle", unlockAt: 220, cost: 40 }
];

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("cb-signedout-overlay").classList.remove("hidden");
  document.getElementById("cb-earn-btn").disabled = true;
} else {
  initCityBuilder();
}

async function initCityBuilder() {
  let city = { bricks: 0, totalEarned: 0, grid: {} };
  const roundState = { qIndex: 0, correctCount: 0, streak: 0, bricksThisRound: 0, activePlot: null };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 2 ? "easy" : i <= 6 ? "medium" : "hard"; }

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
    document.getElementById("cb-bricks").textContent = city.bricks;
    document.getElementById("cb-total-earned").textContent = city.totalEarned;
  }

  function renderGrid() {
    const grid = document.getElementById("cb-grid");
    grid.innerHTML = "";
    for (let i = 0; i < PLOT_COUNT; i++) {
      const buildingId = city.grid[String(i)];
      const building = BUILDING_TYPES.find(b => b.id === buildingId);
      const plot = document.createElement("button");
      plot.type = "button";
      plot.className = "cb-plot" + (building ? " filled" : "");
      plot.textContent = building ? building.emoji : "+";
      plot.addEventListener("click", () => openBuildPicker(i, building));
      grid.appendChild(plot);
    }
  }

  function openBuildPicker(plotIndex, existingBuilding) {
    if (existingBuilding) return; // occupied plots are just decorative, no rebuild/demolish in v1
    roundState.activePlot = plotIndex;
    const list = document.getElementById("cb-build-list");
    list.innerHTML = "";
    BUILDING_TYPES.forEach(b => {
      const unlocked = city.totalEarned >= b.unlockAt;
      const affordable = city.bricks >= b.cost;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cb-build-opt";
      btn.disabled = !unlocked || !affordable;
      btn.innerHTML = `<span class="cb-build-opt-emoji">${unlocked ? b.emoji : "🔒"}</span>
        <span class="cb-build-opt-txt">
          <div class="cb-build-opt-name">${b.name}</div>
          <div class="cb-build-opt-cost">${unlocked ? `🧱 ${b.cost}` : `Unlocks at 🏙️ ${b.unlockAt} lifetime bricks`}</div>
        </span>`;
      btn.addEventListener("click", () => placeBuilding(b));
      list.appendChild(btn);
    });
    document.getElementById("cb-build-overlay").classList.remove("hidden");
  }

  async function placeBuilding(building) {
    document.getElementById("cb-build-overlay").classList.add("hidden");
    if (!window.AIGLeaderboard) return;
    const result = await AIGLeaderboard.placeCityBuilding(roundState.activePlot, building.id, building.cost);
    if (result && result.ok && result.data) {
      city = result.data;
      renderHud();
      renderGrid();
    }
  }

  document.getElementById("cb-build-cancel-btn").addEventListener("click", () => {
    document.getElementById("cb-build-overlay").classList.add("hidden");
  });

  // ---------------------------------------------------------------
  // EARN-BRICKS ROUND (10 questions)
  // ---------------------------------------------------------------
  function startRound() {
    roundState.qIndex = 0;
    roundState.correctCount = 0;
    roundState.streak = 0;
    roundState.bricksThisRound = 0;
    document.getElementById("cb-brick-toast").textContent = "";
    document.getElementById("cb-round-overlay").classList.remove("hidden");
    askRoundQuestion();
  }

  function askRoundQuestion() {
    document.getElementById("cb-round-progress").textContent = `Question ${roundState.qIndex + 1} / ${ROUND_SIZE}`;
    const q = rollQuestion(difficultyForIndex(roundState.qIndex));
    document.getElementById("cb-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("cb-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "cb-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleRoundAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
  }

  function handleRoundAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#cb-q-grid .cb-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("city-builder", q.key, isCorrect);

    if (isCorrect) {
      roundState.correctCount++;
      roundState.streak++;
      const earned = roundState.streak >= 3 ? 4 : 3;
      roundState.bricksThisRound += earned;
      document.getElementById("cb-brick-toast").textContent = `+${earned} 🧱${roundState.streak >= 3 ? " (streak bonus!)" : ""}`;
    } else {
      roundState.streak = 0;
      document.getElementById("cb-brick-toast").textContent = "No bricks this time.";
    }

    setTimeout(() => {
      roundState.qIndex++;
      if (roundState.qIndex >= ROUND_SIZE) {
        finishRound();
      } else {
        askRoundQuestion();
      }
    }, 900);
  }

  async function finishRound() {
    document.getElementById("cb-round-overlay").classList.add("hidden");
    const previousTotalEarned = city.totalEarned;

    if (window.AIGLeaderboard) {
      const brickResult = await AIGLeaderboard.awardCityBuilderBricks(roundState.bricksThisRound);
      if (brickResult && brickResult.ok && brickResult.data) {
        city = brickResult.data;
        renderHud();
        renderGrid();
      }
    }

    const newlyUnlocked = BUILDING_TYPES.filter(b => b.unlockAt > previousTotalEarned && b.unlockAt <= city.totalEarned);

    document.getElementById("cb-round-end-emoji").textContent = roundState.correctCount >= ROUND_SIZE ? "🌟" : roundState.correctCount >= ROUND_SIZE * 0.5 ? "🧱" : "💪";
    document.getElementById("cb-round-end-title").textContent = `Earned ${roundState.bricksThisRound} Bricks!`;
    let sub = `You got ${roundState.correctCount} / ${ROUND_SIZE} correct.`;
    if (newlyUnlocked.length) sub += ` New building unlocked: ${newlyUnlocked.map(b => b.name).join(", ")}!`;
    document.getElementById("cb-round-end-sub").textContent = sub;

    const bonusEl = document.getElementById("cb-round-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardCityBuilderBonus(roundState.correctCount, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("cb-round-end-overlay").classList.remove("hidden");
  }

  document.getElementById("cb-earn-btn").addEventListener("click", startRound);
  document.getElementById("cb-round-end-btn").addEventListener("click", () => {
    document.getElementById("cb-round-end-overlay").classList.add("hidden");
  });

  if (window.AIGLeaderboard) {
    city = await AIGLeaderboard.getCityBuilder();
  }
  renderHud();
  renderGrid();
}
