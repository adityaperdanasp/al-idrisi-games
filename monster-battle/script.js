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
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const CATCH_ROUNDS = 5;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const WILD_MONSTERS = ["🐲", "🦖", "🐉", "🦕", "🐊", "🦎", "🐸", "🐙", "🦑", "🐍"];
  // Audit batch 9: elemental types (🔥 beats 🌿, 🌿 beats 💧, 💧 beats 🔥: x1.5 / x0.75), named species
  // and a Monsterdex kept between visits, ✨ shiny monsters (5%, +3 attack), a rare ⭐ monster that flees
  // unless you answer within 6 seconds, a charge meter (3 right in a row = SUPER move x2), tap the bench
  // to switch monsters, evolution after a knockout, and 3 rival trainers (Rookie / Ace / Champion).
  const SPECIES = { "🐲": ["Drako", "fire"], "🦖": ["Rexo", "grass"], "🐉": ["Wyrm", "fire"], "🦕": ["Longneck", "grass"], "🐊": ["Snapjaw", "water"], "🦎": ["Zippy", "grass"], "🐸": ["Hopper", "water"], "🐙": ["Inky", "water"], "🦑": ["Squirt", "water"], "🐍": ["Hiss", "fire"], "🦄": ["Starhorn", "fire"] };
  const TYPE_EMOJI = { fire: "🔥", water: "💧", grass: "🌿" }, BEATS = { fire: "grass", grass: "water", water: "fire" };
  const RIVALS = [
    { name: "Rookie Rae", team: [{ emoji: "👹", name: "Grump", hp: 18, atk: 7, type: "fire" }, { emoji: "👺", name: "Trickster", hp: 22, atk: 8, type: "water" }, { emoji: "💀", name: "Bonecrusher", hp: 28, atk: 10, type: "grass" }] },
    { name: "Ace Arlo", team: [{ emoji: "🦂", name: "Stinger", hp: 24, atk: 9, type: "grass" }, { emoji: "🦈", name: "Chomp", hp: 28, atk: 10, type: "water" }, { emoji: "🔥", name: "Blaze", hp: 32, atk: 11, type: "fire" }] },
    { name: "Champion Cleo", team: [{ emoji: "🐺", name: "Howl", hp: 28, atk: 10, type: "water" }, { emoji: "🦅", name: "Talon", hp: 32, atk: 11, type: "grass" }, { emoji: "🐉", name: "Elder Wyrm", hp: 40, atk: 13, type: "fire" }] }
  ];
  let rivalIdx = 0, charge = 0, rareTimer = null;
  const lsm = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsmw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const dex = () => { try { return JSON.parse(lsm("mb_dex", "{}")) || {}; } catch (e) { return {}; } };
  const mult = (a, d) => BEATS[a] === d ? 1.5 : BEATS[d] === a ? 0.75 : 1;
  const CATCH_TIERS = [
    { maxMs: 4000, label: "🌟 Excellent Catch!", hp: 30, atk: 12 },
    { maxMs: 8000, label: "✨ Good Catch!", hp: 22, atk: 8 },
    { maxMs: Infinity, label: "✅ Catch!", hp: 15, atk: 5 }
  ];
  const STARTER = { emoji: "🐣", name: "Sparky", hp: 10, atk: 3, type: "fire" };
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

  function rollMathQuestion(difficulty) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    return { key, ...buildMc(raw) };
  }

  function rollQuestion(difficulty) {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion(difficulty)) : rollMathQuestion(difficulty);
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
    const rare = Math.random() < 0.15, shiny = Math.random() < 0.05;
    emojiEl.textContent = rare ? "🦄" : WILD_MONSTERS[rand(0, WILD_MONSTERS.length - 1)];
    emojiEl.className = "mb-wild-emoji" + (shiny ? " mb-shiny" : "");
    emojiEl.dataset.shiny = shiny ? "1" : ""; emojiEl.dataset.rare = rare ? "1" : "";
    const sp = SPECIES[emojiEl.textContent] || ["Monster", "fire"];
    document.getElementById("mb-catch-banner").textContent = `${rare ? "⭐ RARE! Answer in 6 seconds or it flees! " : "A wild "}${shiny ? "✨ shiny " : ""}${sp[0]} ${TYPE_EMOJI[sp[1]]} appeared!`;
    const q = rollQuestion(difficultyForIndex(state.catchIndex));
    showQuestion(q, (btn, opt) => { clearTimeout(rareTimer); handleCatchAnswer(btn, opt, q, emojiEl); });
    clearTimeout(rareTimer);
    if (rare) rareTimer = setTimeout(() => handleCatchAnswer(null, "__fled__", q, emojiEl), 6000);
  }

  function handleCatchAnswer(btn, opt, q, emojiEl) {
    const elapsed = Date.now() - state.qStart;
    const isCorrect = opt === q.correctLabel;
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("monster-battle", q.key, isCorrect);

    if (isCorrect) {
      const tier = CATCH_TIERS.find(t => elapsed <= t.maxMs);
      const sp = SPECIES[emojiEl.textContent] || ["Monster", "fire"], shiny = emojiEl.dataset.shiny === "1", rare = emojiEl.dataset.rare === "1";
      const mon = { emoji: emojiEl.textContent, name: (shiny ? "✨" : "") + sp[0], type: sp[1], shiny, hp: tier.hp + (rare ? 8 : 0), maxHp: tier.hp + (rare ? 8 : 0), atk: tier.atk + (shiny ? 3 : 0) + (rare ? 3 : 0) };
      state.team.push(mon);
      const d = dex(), isNew = !d[mon.emoji]; d[mon.emoji] = { n: ((d[mon.emoji] || {}).n || 0) + 1, shiny: (d[mon.emoji] || {}).shiny || shiny }; lsmw("mb_dex", JSON.stringify(d));
      emojiEl.classList.add("caught");
      document.getElementById("mb-catch-banner").textContent = `${tier.label} ${mon.name} ${TYPE_EMOJI[mon.type]}${isNew ? " · 📘 NEW in your Monsterdex!" : ""}`;
    } else {
      emojiEl.classList.add("fled");
      document.getElementById("mb-catch-banner").textContent = opt === "__fled__" ? "⭐ Too slow — the rare one ran away!" : "It got away!";
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
  // Audit round 2: a 🤝 partner monster that stays between runs -- after a won battle your strongest
  // monster becomes (or stays) your partner and gains a level (+1 attack, +3 HP); it joins your team
  // at the start of every battle.
  const partner = () => { try { return JSON.parse(lsm("mb_partner", "null")); } catch (e) { return null; } };
  function startBattlePhase() {
    const pt = partner();
    if (pt) state.team.unshift({ emoji: pt.emoji, name: `🤝 ${pt.name} Lv${pt.lv}`, type: pt.type, hp: pt.hp, maxHp: pt.hp, atk: pt.atk, partner: true });
    if (state.team.length === 0) state.team.push({ ...STARTER, maxHp: STARTER.hp });
    state.rivalTeam = RIVALS[rivalIdx].team.map(m => ({ ...m, maxHp: m.hp })); charge = 0;
    state.playerActiveIdx = 0;
    state.rivalActiveIdx = 0;

    document.getElementById("mb-phase-label").textContent = "BATTLE PHASE";
    document.getElementById("mb-catch-stage").classList.add("hidden");
    document.getElementById("mb-catch-banner").textContent = "";
    document.getElementById("mb-battle-stage").classList.remove("hidden");
    document.getElementById("mb-log").textContent = `${RIVALS[rivalIdx].name} wants to battle! Tip: 🔥 beats 🌿, 🌿 beats 💧, 💧 beats 🔥. Tap your bench to switch.`;
    renderBattle();
    setTimeout(startBattleRound, 900);
  }

  function renderBattle() {
    const rival = state.rivalTeam[state.rivalActiveIdx];
    const playerMon = state.team[state.playerActiveIdx];

    document.getElementById("mb-rival-emoji").textContent = rival.emoji;
    document.getElementById("mb-rival-name").textContent = `${rival.name} ${TYPE_EMOJI[rival.type] || ""}`;
    const rivalPct = Math.max(0, Math.round((rival.hp / rival.maxHp) * 100));
    const rivalFill = document.getElementById("mb-rival-hp-fill");
    rivalFill.style.width = rivalPct + "%";
    rivalFill.classList.toggle("low", rivalPct <= 30);
    document.getElementById("mb-rival-hp-text").textContent = `${Math.max(0, rival.hp)} / ${rival.maxHp} HP`;

    document.getElementById("mb-player-emoji").textContent = playerMon.emoji;
    document.getElementById("mb-player-name").textContent = `${playerMon.name} ${TYPE_EMOJI[playerMon.type] || ""} · ⚡${"■".repeat(charge)}${"□".repeat(3 - charge)}`;
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
      span.textContent = m.emoji + (TYPE_EMOJI[m.type] || "");
      if (m.hp > 0 && i !== state.playerActiveIdx) { span.style.cursor = "pointer"; span.onclick = () => { if (state.busy) return; state.playerActiveIdx = i; document.getElementById("mb-log").textContent = `Go, ${m.name}!`; renderBattle(); }; }
      bench.appendChild(span);
    });
  }

  function startBattleRound() {
    const q = rollQuestion(rand(0, 1) === 0 ? "medium" : "hard");
    showQuestion(q, (btn, opt) => handleBattleAnswer(btn, opt, q));
  }

  function handleBattleAnswer(btn, opt, q) {
    state.busy = true;
    const isCorrect = opt === q.correctLabel;
    lockQuestion(q, btn, isCorrect);
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("monster-battle", q.key, isCorrect);

    const playerMon = state.team[state.playerActiveIdx];
    const rival = state.rivalTeam[state.rivalActiveIdx];

    if (isCorrect) {
      charge++; const sup = charge >= 3; if (sup) charge = 0;
      const m = mult(playerMon.type, rival.type), dmg = Math.round(playerMon.atk * m * (sup ? 2 : 1));
      rival.hp -= dmg;
      document.getElementById("mb-log").textContent = `${sup ? "⚡ SUPER MOVE! " : ""}${playerMon.name} hit ${rival.name} for ${dmg}!${m > 1 ? " It's super effective!" : m < 1 ? " Not very effective…" : ""}`;
      document.getElementById("mb-rival-emoji").classList.add("hit");
    } else {
      charge = 0;
      const m = mult(rival.type, playerMon.type), dmg = Math.round(rival.atk * m);
      playerMon.hp -= dmg;
      document.getElementById("mb-log").textContent = `${rival.name} struck back for ${dmg}!${m > 1 ? " Super effective!" : ""}`;
      document.getElementById("mb-player-emoji").classList.add("hit");
    }

    setTimeout(() => {
      document.getElementById("mb-rival-emoji").classList.remove("hit");
      document.getElementById("mb-player-emoji").classList.remove("hit");
      document.getElementById("mb-q-card").classList.add("hidden");
      state.busy = false;

      if (rival.hp <= 0) {
        state.rivalActiveIdx++;
        const evolve = !playerMon.evolved && playerMon.hp > 0; if (evolve) { playerMon.evolved = true; playerMon.atk += 3; playerMon.maxHp += 6; playerMon.hp += 6; playerMon.name += "+"; }
        if (state.rivalActiveIdx >= state.rivalTeam.length) { finishGame(true); return; }
        document.getElementById("mb-log").textContent = `You defeated ${rival.name}!${evolve ? ` 🌟 ${playerMon.name} EVOLVED! (+3 attack)` : ""} A new rival monster appears!`;
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
    clearTimeout(rareTimer);
    if (won && rivalIdx === Number(lsm("mb_rival", "0")) && rivalIdx < 2) lsmw("mb_rival", String(rivalIdx + 1));
    if (won) {
      const pt = partner(), best = state.team.filter(m => !m.partner).sort((a, b) => b.atk - a.atk)[0];
      const base = pt || (best && { emoji: best.emoji, name: best.name.replace(/^✨/, ""), type: best.type, hp: best.maxHp, atk: best.atk, lv: 0 });
      if (base) { base.lv = (base.lv || 0) + 1; base.atk += 1; base.hp += 3; lsmw("mb_partner", JSON.stringify(base)); state.partnerMsg = `🤝 ${base.name} is now Lv ${base.lv}!`; }
    }
    document.getElementById("mb-q-card").classList.add("hidden");
    const caught = state.team.filter(m => !m.partner).length;
    const emoji = won ? "🏆" : caught >= 3 ? "🙂" : "💪";
    document.getElementById("mb-end-emoji").textContent = emoji;
    document.getElementById("mb-end-title").textContent = won ? "You Won the Battle!" : "Battle Lost!";
    document.getElementById("mb-end-sub").textContent = won
      ? `You caught ${caught} monster${caught === 1 ? "" : "s"} and beat ${RIVALS[rivalIdx].name}'s whole team!${rivalIdx < 2 ? ` ${RIVALS[rivalIdx + 1].name} is unlocked!` : " You are the CHAMPION! 👑"}`
      : `You caught ${caught} monster${caught === 1 ? "" : "s"}, but the rival's team was too strong this time. Try again!`;
    if (state.partnerMsg) { document.getElementById("mb-end-sub").textContent += " " + state.partnerMsg; state.partnerMsg = ""; }
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

  function drawStart() {
    const d = dex(), got = Object.keys(SPECIES).filter(k => d[k]), unlocked = Number(lsm("mb_rival", "0"));
    let box = document.getElementById("mb-extra"); if (!box) { box = document.createElement("div"); box.id = "mb-extra"; box.className = "mb-extra"; document.getElementById("mb-start-btn").before(box); }
    box.innerHTML = `<div><b>📘 Monsterdex ${got.length}/11</b><div class="mb-dex">${Object.keys(SPECIES).map(k => `<span class="${d[k] ? "" : "no"}">${d[k] ? k + (d[k].shiny ? "✨" : "") : "❔"}</span>`).join("")}</div></div>
      <div><b>Rival</b> ${RIVALS.map((r, i) => `<button type="button" data-r="${i}" class="${i === rivalIdx ? "on" : ""}" ${i > unlocked ? "disabled" : ""}>${i > unlocked ? "🔒 " : ""}${r.name}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { rivalIdx = +b.dataset.r; drawStart(); });
  }
  rivalIdx = Number(lsm("mb_rival", "0"));
  drawStart();
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
  document.getElementById("mb-play-again-btn").addEventListener("click", () => { document.getElementById("mb-end-overlay").classList.add("hidden"); document.getElementById("mb-start-overlay").classList.remove("hidden"); drawStart(); });
}
