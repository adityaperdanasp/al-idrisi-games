/* =================================================================
   Treasure Dig — answer questions to dig deeper down a 10-level mine
   shaft. Difficulty ramps with depth (easy -> medium -> hard, reusing
   mathville/generators.js exactly like Math Hoops does), and so does the
   treasure: deeper layers roll better loot more often. 3 wrong answers
   ("pickaxe energy") ends the dig early with whatever depth was reached.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("td-signedout-overlay").classList.remove("hidden");
  document.getElementById("td-start-overlay").classList.add("hidden");
} else {
  initTreasureDig();
}

function initTreasureDig() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const DEPTH_TOTAL = 10;
  const ENERGY_MAX = 3;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];

  const hudDepth = document.getElementById("td-hud-depth");
  const hudEnergy = document.getElementById("td-hud-energy");
  const hudCoins = document.getElementById("td-hud-coins");
  const hudGems = document.getElementById("td-hud-gems");
  const shaftEl = document.getElementById("td-shaft");

  const state = { depth: 0, energy: ENERGY_MAX, ended: false };

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

  function difficultyForDepth(depth) {
    return depth <= 3 ? "easy" : depth <= 7 ? "medium" : "hard";
  }

  // Same MC-building approach as basketball/script.js's buildMc.
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

  function rollMathQuestion(depth) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficultyForDepth(depth));
    return { key, ...buildMc(raw) };
  }

  function rollQuestion(depth) {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion(depth)) : rollMathQuestion(depth);
  }

  // Treasure chance AND loot value both scale with depth -- shallow
  // layers are mostly plain dirt, deep layers almost always hide
  // something, and what they hide is worth more too.
  function rollLoot(depth) {
    const treasureChance = 0.2 + depth * 0.06;
    if (Math.random() > treasureChance) return null;
    const gemChance = 0.08 + depth * 0.03;
    if (Math.random() < gemChance) return { coins: 0, gems: 1, emoji: "💎", label: "A shiny gem!" };
    const coins = Math.min(10, 2 + Math.floor(depth * 0.8));
    return { coins, gems: 0, emoji: "🪙", label: `${coins} coins!` };
  }

  function renderShaft() {
    shaftEl.innerHTML = "";
    for (let i = 1; i <= DEPTH_TOTAL; i++) {
      const layer = document.createElement("div");
      layer.className = "td-layer" + (i <= state.depth ? " dug" : "") + (i === state.depth + 1 && !state.ended ? " current" : "");
      layer.textContent = i <= state.depth ? "" : "";
      if (i <= state.depth) layer.textContent = "⬜";
      else if (i === state.depth + 1 && !state.ended) layer.textContent = "⛏️";
      else layer.textContent = "🟫";
      shaftEl.appendChild(layer);
    }
  }

  function updateHud() {
    hudDepth.textContent = state.depth;
    hudEnergy.textContent = "❤️".repeat(state.energy) + "🖤".repeat(ENERGY_MAX - state.energy);
  }

  function askQuestion() {
    if (state.ended) return;
    const nextDepth = state.depth + 1;
    const q = rollQuestion(nextDepth);
    document.getElementById("td-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("td-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "td-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(btn, opt, q, nextDepth));
      grid.appendChild(btn);
    });
    document.getElementById("td-question-overlay").classList.remove("hidden");
  }

  function handleAnswer(btn, opt, q, nextDepth) {
    const isCorrect = opt === q.correctLabel;
    const grid = document.getElementById("td-q-grid");
    grid.querySelectorAll(".td-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("treasure-dig", q.key, isCorrect);

    setTimeout(() => {
      document.getElementById("td-question-overlay").classList.add("hidden");
      if (isCorrect) {
        state.depth = nextDepth;
        renderShaft();
        updateHud();
        const loot = rollLoot(nextDepth);
        if (loot) {
          if (window.AIGLeaderboard) AIGLeaderboard.awardTreasureDigLoot(loot.coins, loot.gems);
          document.getElementById("td-loot-emoji").textContent = loot.emoji;
          document.getElementById("td-loot-title").textContent = "Found treasure!";
          document.getElementById("td-loot-sub").textContent = loot.label;
          document.getElementById("td-loot-overlay").classList.remove("hidden");
          setTimeout(() => {
            document.getElementById("td-loot-overlay").classList.add("hidden");
            if (state.depth >= DEPTH_TOTAL) finishDig(); else askQuestion();
          }, 1200);
        } else if (state.depth >= DEPTH_TOTAL) {
          finishDig();
        } else {
          askQuestion();
        }
      } else {
        state.energy--;
        updateHud();
        if (state.energy <= 0) {
          finishDig();
        } else {
          askQuestion(); // retry at the same depth
        }
      }
    }, 700);
  }

  function finishDig() {
    state.ended = true;
    renderShaft();
    const depth = state.depth;
    const emoji = depth >= 10 ? "🏆" : depth >= 7 ? "🥳" : depth >= 4 ? "🙂" : "💪";
    const title = depth >= 10 ? "You struck the bottom!" : depth >= 7 ? "Deep dig!" : depth >= 4 ? "Nice digging!" : "Keep practicing!";
    document.getElementById("td-end-emoji").textContent = emoji;
    document.getElementById("td-end-title").textContent = title;
    document.getElementById("td-end-sub").textContent = `You dug down to level ${depth}/${DEPTH_TOTAL}.`;
    const bonusEl = document.getElementById("td-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardTreasureDigRoundBonus(depth, DEPTH_TOTAL).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("td-end-overlay").classList.remove("hidden");
  }

  function startDig() {
    state.depth = 0;
    state.energy = ENERGY_MAX;
    state.ended = false;
    renderShaft();
    updateHud();
    document.getElementById("td-end-overlay").classList.add("hidden");
    document.getElementById("td-start-overlay").classList.add("hidden");
    askQuestion();
  }

  document.getElementById("td-start-btn").addEventListener("click", startDig);
  document.getElementById("td-play-again-btn").addEventListener("click", startDig);
}
