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
  const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
  const BASE_BOSSES = [
    { emoji: "👹", name: "Ogre", hp: 25, atk: 5 },
    { emoji: "🐺", name: "Werewolf", hp: 35, atk: 7 },
    { emoji: "🧟", name: "Zombie King", hp: 45, atk: 9 },
    { emoji: "🐲", name: "Dragon Lord", hp: 60, atk: 12 }
  ];
  // Secret Mode "Nightmare" (leaderboard.js's SECRET_MODES, 💎3): 2 extra,
  // tougher bosses appended for that run only. BOSSES is what every counter/
  // win check reads, so swapping it in startGame() is the only change needed.
  const NIGHTMARE_BOSSES = [
    { emoji: "👻", name: "Phantom", hp: 75, atk: 14 },
    { emoji: "😈", name: "Demon King", hp: 95, atk: 17 }
  ];
  let BOSSES = BASE_BOSSES;
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
  // Audit batch 9: a question timer (timeout = the boss hits), boss RAGE under 30% HP (hits 50% harder),
  // one gimmick per boss (Werewolf can dodge, Zombie King regenerates, Dragon Lord breathes fire every
  // 4th turn that you must "block" with a fast answer, Phantom hides the answer buttons for a moment,
  // Demon King's hits drain your combo), one 🧪 potion per run, a power-up pick between bosses, and a
  // personal best (most bosses / fastest clear).
  const GIMMICK = { Werewolf: "Can DODGE your hits!", "Zombie King": "Regenerates when you miss.", "Dragon Lord": "Breathes FIRE every 4th turn — answer fast to block!", Phantom: "Turns invisible — the answers flicker.", "Demon King": "Rage from the start!" };
  let qTimer = null, turn = 0, bonusDmg = 0, potion = true, runStart = 0;
  const lsb = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsbw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function rage() { return state.boss && (state.boss.name === "Demon King" || state.boss.hp <= state.boss.maxHp * 0.3); }
  function startTimer(secs, onOut) {
    clearInterval(qTimer); const bar = document.getElementById("br-qt"); if (!bar) return;
    const t0 = Date.now(); bar.style.width = "100%";
    qTimer = setInterval(() => { const left = Math.max(0, 1 - (Date.now() - t0) / (secs * 1000)); bar.style.width = (left * 100) + "%"; bar.classList.toggle("low", left < 0.3); if (!left) { clearInterval(qTimer); onOut(); } }, 100);
  }

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

    document.getElementById("br-combo").textContent = (state.combo > 0 ? `🔥 Combo x${state.combo}` : "") + (rage() ? "  😡 RAGE!" : "");
    document.getElementById("br-boss-emoji").classList.toggle("br-rage", !!rage());
    const pb = document.getElementById("br-potion"); if (pb) { pb.disabled = !potion; pb.textContent = potion ? "🧪 Potion +15 HP" : "🧪 used"; }
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
    turn = 0;
    document.getElementById("br-log").textContent = `${base.name} appears!${GIMMICK[base.name] ? " " + GIMMICK[base.name] : ""}`;
    renderArena();
    setTimeout(startRound, 900);
  }

  // Audit round 2: pick your attack each turn -- ⚡ Quick (easier question, normal damage) or
  // 💪 Power (harder question, double damage). Fire-breath turns skip the choice.
  function startRound() {
    if (state.boss.name === "Dragon Lord" && (turn + 1) % 4 === 0) { state.power = false; return startRoundReal(); }
    const card = document.getElementById("br-q-card"); card.classList.remove("hidden");
    document.getElementById("br-qt").style.width = "100%";
    document.getElementById("br-q-prompt").textContent = "Choose your attack!";
    document.getElementById("br-q-grid").innerHTML = `<button class="br-q-btn" type="button" id="br-atk-q">⚡ Quick hit<br><small>easier · ×1</small></button><button class="br-q-btn" type="button" id="br-atk-p">💪 Power hit<br><small>harder · ×2</small></button>`;
    document.getElementById("br-atk-q").onclick = () => { state.power = false; startRoundReal(); };
    document.getElementById("br-atk-p").onclick = () => { state.power = true; startRoundReal(); };
  }
  function startRoundReal() {
    turn++;
    const base = difficultyForBoss(state.bossIndex), harder = { easy: "medium", medium: "hard", hard: "hard" }, easier = { easy: "easy", medium: "easy", hard: "medium" };
    const q = rollQuestion(state.power ? harder[base] : easier[base]);
    const fire = state.boss.name === "Dragon Lord" && turn % 4 === 0;
    q.fire = fire;
    showQuestion(q, (btn, opt) => { clearInterval(qTimer); handleAnswer(btn, opt, q); });
    if (fire) document.getElementById("br-log").textContent = "🔥 FIRE BREATH incoming — answer fast to block it!";
    if (state.boss.name === "Phantom") { const g = document.getElementById("br-q-grid"); g.classList.add("br-ghost"); setTimeout(() => g.classList.remove("br-ghost"), 1500); }
    const secs = fire ? 7 : difficultyForBoss(state.bossIndex) === "hard" ? 15 : 18;
    startTimer(secs, () => handleAnswer(null, "__timeout__", q));
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
    if (window.AIGJuice) AIGJuice.answer(isCorrect, state.combo);
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("boss-rush", q.key, isCorrect);

    if (isCorrect) {
      state.combo++;
      const isSpecial = state.combo % COMBO_SPECIAL_EVERY === 0;
      const damage = (BASE_DAMAGE + bonusDmg + (state.combo - 1) + (isSpecial ? SPECIAL_BONUS_DAMAGE : 0)) * (state.power ? 2 : 1);
      const dodged = state.boss.name === "Werewolf" && !isSpecial && Math.random() < 0.2;
      if (dodged) {
        document.getElementById("br-log").textContent = `💨 ${state.boss.name} dodged! Keep the combo going.`;
      } else state.boss.hp -= damage;
      document.getElementById("br-boss-emoji").classList.add(isSpecial ? "special" : "hit");
      impactFx(isSpecial);
      if (isSpecial) {
        const fx = document.getElementById("br-special-fx");
        fx.textContent = specialFxEmoji;
        fx.classList.remove("firing");
        void fx.offsetWidth;
        fx.classList.add("firing");
      }
      if (!dodged) document.getElementById("br-log").textContent = (q.fire ? "🛡️ Fire blocked! " : "") + (isSpecial
        ? `⭐ SPECIAL MOVE! ${damage} damage to ${state.boss.name}!`
        : `You hit ${state.boss.name} for ${damage}!`);
    } else {
      state.combo = 0;
      if (state.loadoutShield) {
        state.loadoutShield = false;
        document.getElementById("br-log").textContent = `🛡️ Shield blocked ${state.boss.name}'s strike!`;
      } else {
        const hit = Math.round(state.boss.atk * (rage() ? 1.5 : 1) * (q.fire ? 2 : 1));
        state.playerHp -= hit;
        document.getElementById("br-player-emoji").classList.add("hit");
        document.getElementById("br-log").textContent = `${opt === "__timeout__" ? "⏰ Too slow! " : ""}${q.fire ? "🔥 FIRE BREATH! " : ""}${state.boss.name} struck back for ${hit}!`;
        if (state.boss.name === "Zombie King") { state.boss.hp = Math.min(state.boss.maxHp, state.boss.hp + 4); document.getElementById("br-log").textContent += " 🧟 It regenerates +4."; }
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
        renderArena();
        setTimeout(() => pickPower(() => startBoss(state.bossIndex + 1)), 900);
        return;
      }

      if (state.playerHp <= 0) { finishGame(false); return; }

      startRound();
    }, 900);
  }

  function pickPower(next) {
    const o = document.createElement("div"); o.className = "br-overlay";
    o.innerHTML = `<div class="br-modal"><div class="br-modal-emoji">🎁</div><div class="br-modal-title">Pick a power-up</div><div class="br-modal-sub">Next up: ${BOSSES[state.bossIndex + 1].emoji} ${BOSSES[state.bossIndex + 1].name}</div>
      <button class="br-btn br-btn-primary" data-p="hp">❤️ +12 HP</button><button class="br-btn br-btn-primary" data-p="dmg" style="margin-top:6px">⚔️ +3 damage per hit</button><button class="br-btn br-btn-primary" data-p="shield" style="margin-top:6px">🛡️ Shield (blocks 1 hit)</button></div>`;
    document.body.appendChild(o);
    o.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
      const p = b.dataset.p;
      if (p === "hp") state.playerHp = Math.min(PLAYER_HP_MAX, state.playerHp + 12); else if (p === "dmg") bonusDmg += 3; else state.loadoutShield = true;
      o.remove(); renderArena(); next();
    });
  }
  function finishGame(won) {
    clearInterval(qTimer);
    document.getElementById("br-q-card").classList.add("hidden");
    const defeated = state.bossesDefeated;
    const secs = Math.round((Date.now() - runStart) / 1000), mk = state.nightmare ? "br_best_nm" : "br_best";
    let best = {}; try { best = JSON.parse(lsb(mk, "{}")) || {}; } catch (e) {}
    const newBest = defeated > (best.bosses || 0) || (won && (!best.time || secs < best.time));
    if (newBest) lsbw(mk, JSON.stringify({ bosses: Math.max(defeated, best.bosses || 0), time: won ? Math.min(secs, best.time || 1e9) : best.time }));
    const emoji = won ? "🏆" : defeated >= 2 ? "🙂" : "💪";
    document.getElementById("br-end-emoji").textContent = emoji;
    document.getElementById("br-end-title").textContent = won ? "Arena Cleared!" : "Knocked Out!";
    document.getElementById("br-end-sub").textContent = won
      ? `You defeated all ${BOSSES.length} bosses with ${Math.max(0, state.playerHp)} HP to spare!`
      : `You defeated ${defeated} boss${defeated === 1 ? "" : "es"} before falling. Try again!`;
    document.getElementById("br-end-sub").textContent += won ? ` Time: ${secs}s.` : "";
    if (newBest) document.getElementById("br-end-sub").textContent += " 🌟 New personal best!";
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

  async function startGame(nightmare) {
    state.nightmare = !!nightmare;
    BOSSES = nightmare ? BASE_BOSSES.concat(NIGHTMARE_BOSSES) : BASE_BOSSES;
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
      // Workshop tier (PM round 14): a gold / holo aura around the fighter.
      try { const t = AIGLeaderboard.getTier ? await AIGLeaderboard.getTier("bossrush-fighter", fighterId) : 1; const el = document.getElementById("br-player-emoji"); el.classList.toggle("aig-gold", t === 2); el.classList.toggle("aig-holo", t === 3); } catch (e) {}
    }
    state.playerHp = PLAYER_HP_MAX;
    state.bossesDefeated = 0;
    state.loadoutShield = false;
    bonusDmg = 0; potion = true; runStart = Date.now();
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

  (function bestNote() {
    let b = {}; try { b = JSON.parse(lsb("br_best", "{}")) || {}; } catch (e) {}
    if (b.bosses) document.getElementById("br-start-btn").insertAdjacentHTML("beforebegin", `<div class="br-modal-sub">🏅 Your best: ${b.bosses}/4 bosses${b.time ? ` · fastest clear ${b.time}s` : ""}</div>`);
  })();
  document.getElementById("br-potion").onclick = () => {
    if (!potion || state.playerHp <= 0) return; potion = false;
    state.playerHp = Math.min(PLAYER_HP_MAX, state.playerHp + 15); document.getElementById("br-log").textContent = "🧪 Glug glug! +15 HP"; renderArena();
  };
  document.getElementById("br-start-btn").addEventListener("click", () => startGame(false));
  document.getElementById("br-play-again-btn").addEventListener("click", () => startGame(state.nightmare));
  const nmBtn = document.getElementById("br-nightmare-btn");
  nmBtn.addEventListener("click", () => startGame(true));
  if (window.AIGLeaderboard && AIGLeaderboard.hasSecretMode) {
    AIGLeaderboard.hasSecretMode("nightmare").then(owned => { nmBtn.hidden = !owned; }).catch(() => {});
  }
}
