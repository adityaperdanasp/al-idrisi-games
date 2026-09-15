/* =================================================================
   Monster Catch & Battle — catch phase (5 wild monsters, catch quality
   scales with how FAST you answer correctly) followed by a turn-based
   battle phase against a fixed rival trainer's 3-monster team, using
   the monsters you caught. Wrong answer during catch = monster flees
   (no catch, no penalty). Wrong answer during battle = rival attacks
   you instead of you attacking them.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("mb-signedout-overlay").classList.remove("hidden");
  document.getElementById("mb-start-overlay").classList.add("hidden");
} else {
  initMonsterBattle();
}

function initMonsterBattle() {
  const CATCH_ROUNDS = 5;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const WILD_MONSTERS = ["🐲", "🦖", "🐉", "🦕", "🐊", "🦎", "🐸", "🐙", "🦑", "🐍"];
  const CATCH_TIERS = [
    { maxMs: 4000, label: "🌟 Excellent Catch!", hp: 30, atk: 12 },
    { maxMs: 8000, label: "✨ Good Catch!", hp: 22, atk: 8 },
    { maxMs: Infinity, label: "✅ Catch!", hp: 15, atk: 5 }
  ];
  const STARTER = { emoji: "🐣", name: "Sparky", hp: 10, atk: 3 };
  const RIVAL_TEAM = [
    { emoji: "👹", name: "Grump", hp: 20, atk: 8 },
    { emoji: "👺", name: "Trickster", hp: 26, atk: 9 },
    { emoji: "💀", name: "Bonecrusher", hp: 32, atk: 11 }
  ];

  const state = { catchIndex: 0, team: [], rivalTeam: [], playerActiveIdx: 0, rivalActiveIdx: 0, qStart: 0 };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 1 ? "easy" : i <= 3 ? "medium" : "hard"; }

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

  function showQuestion(q, onAnswer) {
    document.getElementById("mb-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("mb-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "mb-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => onAnswer(btn, opt));
      grid.appendChild(btn);
    });
    document.getElementById("mb-q-card").classList.remove("hidden");
    state.qStart = Date.now();
  }

  function lockQuestion(q, pickedBtn, isCorrect) {
    document.querySelectorAll("#mb-q-grid .mb-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === pickedBtn) b.classList.add("wrong");
    });
  }

  // ---------------------------------------------------------------
  // CATCH PHASE
  // ---------------------------------------------------------------
  function startCatchRound() {
    document.getElementById("mb-catch-counter").textContent = `Monster ${state.catchIndex + 1} / ${CATCH_ROUNDS}`;
    document.getElementById("mb-catch-banner").textContent = "";
    const emojiEl = document.getElementById("mb-wild-emoji");
    emojiEl.textContent = WILD_MONSTERS[rand(0, WILD_MONSTERS.length - 1)];
    emojiEl.className = "mb-wild-emoji";
    const q = rollQuestion(difficultyForIndex(state.catchIndex));
    showQuestion(q, (btn, opt) => handleCatchAnswer(btn, opt, q, emojiEl));
  }

  function handleCatchAnswer(btn, opt, q, emojiEl) {
    const elapsed = Date.now() - state.qStart;
    const isCorrect = opt === q.correctLabel;
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("monster-battle", q.key, isCorrect);

    if (isCorrect) {
      const tier = CATCH_TIERS.find(t => elapsed <= t.maxMs);
      const mon = { emoji: emojiEl.textContent, name: `Monster ${state.team.length + 1}`, hp: tier.hp, maxHp: tier.hp, atk: tier.atk };
      state.team.push(mon);
      emojiEl.classList.add("caught");
      document.getElementById("mb-catch-banner").textContent = tier.label;
    } else {
      emojiEl.classList.add("fled");
      document.getElementById("mb-catch-banner").textContent = "It got away!";
    }

    setTimeout(() => {
      document.getElementById("mb-q-card").classList.add("hidden");
      state.catchIndex++;
      if (state.catchIndex >= CATCH_ROUNDS) {
        startBattlePhase();
      } else {
        startCatchRound();
      }
    }, 1300);
  }

  // ---------------------------------------------------------------
  // BATTLE PHASE
  // ---------------------------------------------------------------
  function startBattlePhase() {
    if (state.team.length === 0) state.team.push({ ...STARTER, maxHp: STARTER.hp });
    state.rivalTeam = RIVAL_TEAM.map(m => ({ ...m, maxHp: m.hp }));
    state.playerActiveIdx = 0;
    state.rivalActiveIdx = 0;

    document.getElementById("mb-phase-label").textContent = "BATTLE PHASE";
    document.getElementById("mb-catch-stage").classList.add("hidden");
    document.getElementById("mb-catch-banner").textContent = "";
    document.getElementById("mb-battle-stage").classList.remove("hidden");
    document.getElementById("mb-log").textContent = "A rival trainer appears!";
    renderBattle();
    setTimeout(startBattleRound, 900);
  }

  function renderBattle() {
    const rival = state.rivalTeam[state.rivalActiveIdx];
    const playerMon = state.team[state.playerActiveIdx];

    document.getElementById("mb-rival-emoji").textContent = rival.emoji;
    document.getElementById("mb-rival-name").textContent = rival.name;
    const rivalPct = Math.max(0, Math.round((rival.hp / rival.maxHp) * 100));
    const rivalFill = document.getElementById("mb-rival-hp-fill");
    rivalFill.style.width = rivalPct + "%";
    rivalFill.classList.toggle("low", rivalPct <= 30);
    document.getElementById("mb-rival-hp-text").textContent = `${Math.max(0, rival.hp)} / ${rival.maxHp} HP`;

    document.getElementById("mb-player-emoji").textContent = playerMon.emoji;
    document.getElementById("mb-player-name").textContent = playerMon.name;
    const playerPct = Math.max(0, Math.round((playerMon.hp / playerMon.maxHp) * 100));
    const playerFill = document.getElementById("mb-player-hp-fill");
    playerFill.style.width = playerPct + "%";
    playerFill.classList.toggle("low", playerPct <= 30);
    document.getElementById("mb-player-hp-text").textContent = `${Math.max(0, playerMon.hp)} / ${playerMon.maxHp} HP`;

    const bench = document.getElementById("mb-bench");
    bench.innerHTML = "";
    state.team.forEach((m, i) => {
      const span = document.createElement("span");
      span.className = "mb-bench-mon" + (m.hp > 0 ? " alive" : "") + (i === state.playerActiveIdx ? " active" : "");
      span.textContent = m.emoji;
      bench.appendChild(span);
    });
  }

  function startBattleRound() {
    const q = rollQuestion(rand(0, 1) === 0 ? "medium" : "hard");
    showQuestion(q, (btn, opt) => handleBattleAnswer(btn, opt, q));
  }

  function handleBattleAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("monster-battle", q.key, isCorrect);

    const playerMon = state.team[state.playerActiveIdx];
    const rival = state.rivalTeam[state.rivalActiveIdx];

    if (isCorrect) {
      rival.hp -= playerMon.atk;
      document.getElementById("mb-log").textContent = `${playerMon.name} hit ${rival.name} for ${playerMon.atk}!`;
      document.getElementById("mb-rival-emoji").classList.add("hit");
    } else {
      playerMon.hp -= rival.atk;
      document.getElementById("mb-log").textContent = `${rival.name} struck back for ${rival.atk}!`;
      document.getElementById("mb-player-emoji").classList.add("hit");
    }

    setTimeout(() => {
      document.getElementById("mb-rival-emoji").classList.remove("hit");
      document.getElementById("mb-player-emoji").classList.remove("hit");
      document.getElementById("mb-q-card").classList.add("hidden");

      if (rival.hp <= 0) {
        state.rivalActiveIdx++;
        if (state.rivalActiveIdx >= state.rivalTeam.length) { finishGame(true); return; }
        document.getElementById("mb-log").textContent = `You defeated ${rival.name}! A new rival monster appears!`;
        renderBattle();
        setTimeout(startBattleRound, 1100);
        return;
      }

      if (playerMon.hp <= 0) {
        const nextAlive = state.team.findIndex(m => m.hp > 0);
        if (nextAlive === -1) { finishGame(false); return; }
        state.playerActiveIdx = nextAlive;
        document.getElementById("mb-log").textContent = `${playerMon.name} fainted! Go, ${state.team[nextAlive].name}!`;
        renderBattle();
        setTimeout(startBattleRound, 1100);
        return;
      }

      renderBattle();
      startBattleRound();
    }, 900);
  }

  function finishGame(won) {
    document.getElementById("mb-q-card").classList.add("hidden");
    const caught = state.team.length;
    const emoji = won ? "🏆" : caught >= 3 ? "🙂" : "💪";
    document.getElementById("mb-end-emoji").textContent = emoji;
    document.getElementById("mb-end-title").textContent = won ? "You Won the Battle!" : "Battle Lost!";
    document.getElementById("mb-end-sub").textContent = won
      ? `You caught ${caught} monster${caught === 1 ? "" : "s"} and defeated the rival's whole team!`
      : `You caught ${caught} monster${caught === 1 ? "" : "s"}, but the rival's team was too strong this time. Try again!`;
    const bonusEl = document.getElementById("mb-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardMonsterBattleBonus(caught, CATCH_ROUNDS, won).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("mb-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.catchIndex = 0;
    state.team = [];
    state.rivalTeam = [];
    state.playerActiveIdx = 0;
    state.rivalActiveIdx = 0;
    document.getElementById("mb-phase-label").textContent = "CATCH PHASE";
    document.getElementById("mb-battle-stage").classList.add("hidden");
    document.getElementById("mb-catch-stage").classList.remove("hidden");
    document.getElementById("mb-log").textContent = "";
    document.getElementById("mb-start-overlay").classList.add("hidden");
    document.getElementById("mb-end-overlay").classList.add("hidden");
    startCatchRound();
  }

  document.getElementById("mb-start-btn").addEventListener("click", startGame);
  document.getElementById("mb-play-again-btn").addEventListener("click", startGame);
}
