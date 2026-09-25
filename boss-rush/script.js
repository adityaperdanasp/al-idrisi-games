/* =================================================================
   Boss Rush Arena — fighting-game style gauntlet of 4 bosses fought
   back-to-back (player HP carries over between bosses, only a small
   partial heal on each win -- true "rush", not a fresh full-HP fight
   every time). Correct answer = you attack (base damage + combo
   bonus); every 3rd correct answer IN A ROW is a flashy Special Move
   with bonus damage. Wrong answer resets the combo and the boss
   attacks back.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("br-signedout-overlay").classList.remove("hidden");
  document.getElementById("br-start-overlay").classList.add("hidden");
} else {
  initBossRush();
}

function initBossRush() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  if (window.AIGLeaderboard) {
    AIGLeaderboard.getBossRushDailyStatus().then(status => {
      document.getElementById("br-daily-banner").classList.toggle("hidden", status.claimed);
    }).catch(() => {});
  }
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const BOSSES = [
    { emoji: "👹", name: "Ogre", hp: 25, atk: 5 },
    { emoji: "🐺", name: "Werewolf", hp: 35, atk: 7 },
    { emoji: "🧟", name: "Zombie King", hp: 45, atk: 9 },
    { emoji: "🐲", name: "Dragon Lord", hp: 60, atk: 12 }
  ];
  const PLAYER_HP_BASE = 40;
  // Boss Rush Starting Heal upgrade (leaderboard.js's UPGRADE_CATALOG,
  // bought from the hub's Customize > Upgrades tab) -- re-checked at the
  // start of every game via startGame(), not just once at page load, so
  // buying it in another tab takes effect the very next run.
  let PLAYER_HP_MAX = PLAYER_HP_BASE;
  const BASE_DAMAGE = 6;
  const COMBO_SPECIAL_EVERY = 3;
  const SPECIAL_BONUS_DAMAGE = 15;
  const HEAL_PER_BOSS_WIN = 8;

  const state = { bossIndex: 0, playerHp: PLAYER_HP_MAX, boss: null, combo: 0, bossesDefeated: 0 };
  // Cosmetic only -- bought/equipped via the hub's Customize > Game FX tab
  // (leaderboard.js's GAMEPLAY_FX_CATALOGS, type "bossrush-special").
  const SPECIAL_FX_EMOJI = { default: "✨", lightning: "⚡", fire: "🔥", ice: "❄️", mythic: "☄️" };
  const BOSSRUSH_FIGHTER_EMOJI = { default: "🥋", boxer: "🥊", hero: "🦸", dragon: "🐉", ronin: "🗡️", cyber: "🤖" };
  let specialFxEmoji = "✨";

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForBoss(i) { return i === 0 ? "easy" : i <= 2 ? "medium" : "hard"; }

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

  function renderArena() {
    document.getElementById("br-boss-counter").textContent = `BOSS ${state.bossIndex + 1} / ${BOSSES.length}`;
    document.getElementById("br-boss-emoji").textContent = state.boss.emoji;
    document.getElementById("br-boss-name").textContent = state.boss.name;
    const bossPct = Math.max(0, Math.round((state.boss.hp / state.boss.maxHp) * 100));
    const bossFill = document.getElementById("br-boss-hp-fill");
    bossFill.style.width = bossPct + "%";
    bossFill.classList.toggle("low", bossPct <= 30);
    document.getElementById("br-boss-hp-text").textContent = `${Math.max(0, state.boss.hp)} / ${state.boss.maxHp} HP`;

    const playerPct = Math.max(0, Math.round((state.playerHp / PLAYER_HP_MAX) * 100));
    const playerFill = document.getElementById("br-player-hp-fill");
    playerFill.style.width = playerPct + "%";
    playerFill.classList.toggle("low", playerPct <= 30);
    document.getElementById("br-player-hp-text").textContent = `${Math.max(0, state.playerHp)} / ${PLAYER_HP_MAX} HP`;

    document.getElementById("br-combo").textContent = state.combo > 0 ? `🔥 Combo x${state.combo}` : "";
  }

  function showQuestion(q, onAnswer) {
    document.getElementById("br-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("br-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "br-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => onAnswer(btn, opt));
      grid.appendChild(btn);
    });
    document.getElementById("br-q-card").classList.remove("hidden");
  }

  function lockQuestion(q, pickedBtn, isCorrect) {
    document.querySelectorAll("#br-q-grid .br-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === pickedBtn) b.classList.add("wrong");
    });
  }

  function startBoss(index) {
    state.bossIndex = index;
    const base = BOSSES[index];
    state.boss = { ...base, maxHp: base.hp };
    state.combo = 0;
    document.getElementById("br-log").textContent = `${base.name} appears!`;
    renderArena();
    setTimeout(startRound, 900);
  }

  function startRound() {
    const q = rollQuestion(difficultyForBoss(state.bossIndex));
    showQuestion(q, (btn, opt) => handleAnswer(btn, opt, q));
  }

  // Flash + arena shake on a landed hit, escalating with the boss index
  // (phase 1..3+) and hitting harder again on special moves.
  function impactFx(isSpecial) {
    const phase = Math.min(3, 1 + Math.floor(state.bossIndex / 2));
    const amp = (3 + phase * 2) * (isSpecial ? 1.6 : 1);
    const flash = document.getElementById("br-flash");
    const arena = document.getElementById("br-arena");
    arena.style.setProperty("--amp", amp.toFixed(1) + "px");
    flash.style.setProperty("--flash", Math.min(0.75, 0.2 + phase * 0.1 + (isSpecial ? 0.2 : 0)).toFixed(2));
    [flash, arena].forEach(el => { el.classList.remove("firing", "impact"); });
    void arena.offsetWidth;
    flash.classList.add("firing");
    arena.classList.add("impact");
    setTimeout(() => arena.classList.remove("impact"), 340);
  }

  function handleAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("boss-rush", q.key, isCorrect);

    if (isCorrect) {
      state.combo++;
      const isSpecial = state.combo % COMBO_SPECIAL_EVERY === 0;
      const damage = BASE_DAMAGE + (state.combo - 1) + (isSpecial ? SPECIAL_BONUS_DAMAGE : 0);
      state.boss.hp -= damage;
      document.getElementById("br-boss-emoji").classList.add(isSpecial ? "special" : "hit");
      impactFx(isSpecial);
      if (isSpecial) {
        const fx = document.getElementById("br-special-fx");
        fx.textContent = specialFxEmoji;
        fx.classList.remove("firing");
        void fx.offsetWidth;
        fx.classList.add("firing");
      }
      document.getElementById("br-log").textContent = isSpecial
        ? `⭐ SPECIAL MOVE! ${damage} damage to ${state.boss.name}!`
        : `You hit ${state.boss.name} for ${damage}!`;
    } else {
      state.combo = 0;
      if (state.loadoutShield) {
        state.loadoutShield = false;
        document.getElementById("br-log").textContent = `🛡️ Shield blocked ${state.boss.name}'s strike!`;
      } else {
        state.playerHp -= state.boss.atk;
        document.getElementById("br-player-emoji").classList.add("hit");
        document.getElementById("br-log").textContent = `${state.boss.name} struck back for ${state.boss.atk}!`;
      }
    }

    setTimeout(() => {
      document.getElementById("br-boss-emoji").classList.remove("hit", "special");
      document.getElementById("br-player-emoji").classList.remove("hit");
      document.getElementById("br-q-card").classList.add("hidden");
      renderArena();

      if (state.boss.hp <= 0) {
        state.bossesDefeated++;
        if (state.bossesDefeated >= BOSSES.length) { finishGame(true); return; }
        state.playerHp = Math.min(PLAYER_HP_MAX, state.playerHp + HEAL_PER_BOSS_WIN);
        document.getElementById("br-log").textContent = `${state.boss.name} defeated! +${HEAL_PER_BOSS_WIN} HP`;
        setTimeout(() => startBoss(state.bossIndex + 1), 1300);
        return;
      }

      if (state.playerHp <= 0) { finishGame(false); return; }

      startRound();
    }, 900);
  }

  function finishGame(won) {
    document.getElementById("br-q-card").classList.add("hidden");
    const defeated = state.bossesDefeated;
    const emoji = won ? "🏆" : defeated >= 2 ? "🙂" : "💪";
    document.getElementById("br-end-emoji").textContent = emoji;
    document.getElementById("br-end-title").textContent = won ? "Arena Cleared!" : "Knocked Out!";
    document.getElementById("br-end-sub").textContent = won
      ? `You defeated all ${BOSSES.length} bosses with ${Math.max(0, state.playerHp)} HP to spare!`
      : `You defeated ${defeated} boss${defeated === 1 ? "" : "es"} before falling. Try again!`;
    const bonusEl = document.getElementById("br-end-bonus");
    const dailyEl = document.getElementById("br-daily-bonus-note");
    bonusEl.textContent = "";
    dailyEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardBossRushBonus(defeated, BOSSES.length, Math.max(0, state.playerHp), PLAYER_HP_MAX).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
      if (won) {
        AIGLeaderboard.claimBossRushDaily().then(result => {
          if (result && result.ok && !result.alreadyClaimed && result.reward) {
            dailyEl.textContent = `🎯 Daily Challenge bonus: 🪙${result.reward.coins} 💎${result.reward.gems}!`;
            document.getElementById("br-daily-banner").classList.add("hidden");
          }
        }).catch(() => {});
      }
    }
    const shareBtn = document.getElementById("br-share-btn");
    shareBtn.classList.toggle("hidden", !window.AIGShareCard);
    shareBtn.onclick = () => {
      const player = window.AIGPlayer && AIGPlayer.getPlayer();
      window.AIGShareCard.openPreview({
        emoji: won ? "🏆" : "💪",
        title: "Boss Rush Arena",
        name: player ? player.name : "",
        lines: [won ? `Cleared all ${BOSSES.length} bosses!` : `Defeated ${defeated}/${BOSSES.length} bosses`],
        accent: "#FF6B4A"
      });
    };
    document.getElementById("br-end-overlay").classList.remove("hidden");
  }

  async function startGame() {
    if (window.AIGLeaderboard) {
      const equipped = await AIGLeaderboard.getEquippedCosmetic("bossrush-special", "default");
      specialFxEmoji = SPECIAL_FX_EMOJI[equipped] || "✨";
      const upgrades = await AIGLeaderboard.getUpgrades().catch(() => ({}));
      // Tier 2 REPLACES tier 1's bonus (+20 max HP total, not +10+20=+30),
      // same convention as every other Tier 2 Upgrade.
      PLAYER_HP_MAX = PLAYER_HP_BASE + (upgrades["bossrush-extra-hp-2"] ? 20 : upgrades["bossrush-extra-hp"] ? 10 : 0);
      // Fighter costume (leaderboard.js's BOSSRUSH_FIGHTERS, bought from
      // the hub's Customize > Costumes tab) -- the player here is just
      // one fixed emoji (no CSS parts to recolor like Ninja Runner), so
      // this is a straight swap.
      const fighterId = await AIGLeaderboard.getEquippedCosmetic("bossrush-fighter", "default").catch(() => "default");
      document.getElementById("br-player-emoji").textContent = BOSSRUSH_FIGHTER_EMOJI[fighterId] || "🥋";
    }
    state.playerHp = PLAYER_HP_MAX;
    state.bossesDefeated = 0;
    state.loadoutShield = false;
    // Round Loadout (PM round 9, item 3) -- see leaderboard.js's
    // consumeArmedLoadout(). life = +8 HP (can exceed the normal cap for
    // this run only), shield = blocks the first boss strike.
    if (window.AIGLeaderboard && AIGLeaderboard.consumeArmedLoadout) {
      const armed = await AIGLeaderboard.consumeArmedLoadout().catch(() => null);
      if (armed === "life") { state.playerHp += 8; PLAYER_HP_MAX = Math.max(PLAYER_HP_MAX, state.playerHp); }
      else if (armed === "shield") state.loadoutShield = true;
      if (armed) document.getElementById("br-log").textContent = armed === "life" ? "❤️ Extra Life loaded! +8 HP" : armed === "shield" ? "🛡️ Shield ready — blocks the first strike!" : "🪙 Coin Boost — 2× coins for 3 min!";
    }
    document.getElementById("br-start-overlay").classList.add("hidden");
    document.getElementById("br-end-overlay").classList.add("hidden");
    document.getElementById("br-log").textContent = "";
    startBoss(0);
  }

  document.getElementById("br-start-btn").addEventListener("click", startGame);
  document.getElementById("br-play-again-btn").addEventListener("click", startGame);
}
