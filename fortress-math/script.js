/* =================================================================
   Fortress Math — a genuinely different genre from every other new
   mini-game: strategy/placement instead of action/reflex. Build phase:
   answer 4 questions, each correct one earns a tower to place in an
   empty ring slot along the path. Defend phase: 5 waves of monsters walk
   from the right toward the fortress on the left; placed towers
   auto-fire at whichever enemy in range is closest to the fortress.
   No live interaction during combat -- the strategy already happened
   during placement, this is watching that strategy play out.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("fm-signedout-overlay").classList.remove("hidden");
  document.getElementById("fm-start-overlay").classList.add("hidden");
} else {
  initFortressMath();
}

function initFortressMath() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
  const TOWER_SLOTS_X = [22, 42, 62, 82]; // % positions along the path
  const BUILD_QUESTIONS = TOWER_SLOTS_X.length;
  const WAVE_COUNT = 5;
  // Audit round 2: ⏩ 2x speed toggle during waves, and ♾️ Endless -- after clearing wave 5 you can
  // keep going; waves keep growing and a boss comes every 5th wave. Best endless wave is saved.
  let fast = false, endless = false;
  const tickMs = () => fast ? TICK_MS / 2 : TICK_MS;
  const FORTRESS_HP_MAX = 5;
  const TICK_MS = 100;
  const TOWER_FIRE_EVERY_TICKS = 5; // 500ms
  const TOWER_RANGE_PCT = 15;
  const FORTRESS_X = 8; // an enemy at or past this % has "reached" the fortress
  const SPAWN_X = 97;
  // Audit batch 9: 3 tower types (🏹 Archer fast, 💣 Cannon splash, ❄️ Frost slows), enemy variety
  // (🐺 fast, 🐗 armoured, 🐉 boss on the last wave), a question between waves that earns a choice
  // (upgrade a tower / repair the wall / ⚡ lightning charge), a live ⚡ button to zap every monster
  // during a wave, tower firing flashes, and a best-waves record.
  const TOWER_TYPES = {
    archer: { emoji: "🏹", name: "Archer", every: 4, dmg: 1, range: 15 },
    cannon: { emoji: "💣", name: "Cannon", every: 8, dmg: 2, range: 13, splash: 6 },
    frost: { emoji: "❄️", name: "Frost", every: 5, dmg: 1, range: 15, slow: 15 }
  };
  let zaps = 0;
  const lsf = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };

  const hudHp = document.getElementById("fm-hud-hp");
  const hudWave = document.getElementById("fm-hud-wave");
  const hudCoins = document.getElementById("fm-hud-coins");
  const hudGems = document.getElementById("fm-hud-gems");
  const phaseBanner = document.getElementById("fm-phase-banner");
  const battlefield = document.getElementById("fm-battlefield");

  const state = {
    hp: FORTRESS_HP_MAX,
    wave: 0,
    towers: [], // { x, el }
    enemies: [], // { id, x, pos, hp, maxHp, el, speedPerTick }
    remainingInWave: 0,
    tickCount: 0,
    intervalId: null,
    defeated: 0,
    ended: false,
    buildIndex: 0
  };

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

  function rollMathQuestion() {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key]("medium");
    return { key, ...buildMc(raw) };
  }

  function rollQuestion() {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion()) : rollMathQuestion();
  }

  function renderSlots() {
    battlefield.querySelectorAll(".fm-slot").forEach(el => el.remove());
    TOWER_SLOTS_X.forEach(x => {
      const el = document.createElement("div");
      el.className = "fm-slot";
      el.style.left = x + "%";
      el.textContent = "";
      el.dataset.x = x;
      battlefield.appendChild(el);
    });
  }

  function updateHud() {
    hudHp.textContent = state.hp;
    hudWave.textContent = state.wave;
  }

  // ---- Build phase ------------------------------------------------------
  function drawZap() { const z = document.getElementById("fm-zap"); if (z) { z.textContent = `⚡ Zap all (${zaps})`; z.disabled = !zaps || !state.enemies.length; } }
  function askBuildQuestion(customCb) {
    if (!customCb && state.buildIndex >= BUILD_QUESTIONS) { startDefendPhase(); return; }
    const q = rollQuestion(); q.cb = customCb;
    document.getElementById("fm-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("fm-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "fm-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleBuildAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("fm-question-overlay").classList.remove("hidden");
  }

  function handleBuildAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#fm-q-grid .fm-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("fortress-math", q.key, isCorrect);
    if (q.cb) { setTimeout(() => { document.getElementById("fm-question-overlay").classList.add("hidden"); q.cb(isCorrect); }, 700); return; }
    state.buildIndex++;

    setTimeout(() => {
      document.getElementById("fm-question-overlay").classList.add("hidden");
      if (isCorrect) {
        pickTowerType(() => { phaseBanner.textContent = `Tap an empty ring to place your ${TOWER_TYPES[state.nextType].name}!`; awaitTowerPlacement(); });
      } else {
        phaseBanner.textContent = "No tower earned that round.";
        setTimeout(askBuildQuestion, 900);
      }
    }, 700);
  }

  function awaitTowerPlacement() {
    const emptySlots = [...battlefield.querySelectorAll(".fm-slot:not(.filled)")];
    if (!emptySlots.length) { askBuildQuestion(); return; }
    emptySlots.forEach(slot => {
      slot.onclick = () => {
        placeTower(slot);
        // Only clear THIS round's stale handlers -- the other empty slots
        // stay fully normal (no visual "disabled" state) since they're
        // still real, clickable options for whichever future correct
        // answer earns the next tower. A previous version of this also
        // added a permanent .disabled class to every other empty slot
        // here, which made every tower after the first impossible to
        // place: it looked dimmed/unavailable even though a fresh
        // awaitTowerPlacement() call would have attached a working
        // handler to it next round anyway -- just confusingly hidden
        // behind CSS opacity.
        emptySlots.forEach(s => { s.onclick = null; });
        setTimeout(askBuildQuestion, 500);
      };
    });
  }

  function pickTowerType(done) {
    phaseBanner.innerHTML = `Pick a tower: ${Object.entries(TOWER_TYPES).map(([k, t]) => `<button type="button" class="fm-pick" data-t="${k}">${t.emoji} ${t.name}</button>`).join("")}`;
    phaseBanner.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { state.nextType = b.dataset.t; done(); });
  }
  function placeTower(slotEl) {
    const type = state.nextType || "archer";
    slotEl.classList.add("filled");
    slotEl.textContent = TOWER_TYPES[type].emoji;
    state.towers.push({ x: Number(slotEl.dataset.x), el: slotEl, type, lvl: 1 });
  }
  // Between waves: one question; a right answer lets you choose a reward.
  function betweenWaves(next) {
    phaseBanner.textContent = `Wave ${state.wave} cleared! Answer to earn a reward…`;
    setTimeout(() => askBuildQuestion(ok => {
      if (!ok) { phaseBanner.textContent = "No reward this time — here comes the next wave!"; setTimeout(next, 1100); return; }
      const canUp = state.towers.some(t => t.lvl < 2);
      phaseBanner.innerHTML = `Reward: ${canUp ? '<button type="button" class="fm-pick" data-r="up">⬆️ Upgrade a tower</button>' : ""}<button type="button" class="fm-pick" data-r="hp">🧱 Repair +1 ❤️</button><button type="button" class="fm-pick" data-r="zap">⚡ +1 Zap</button>`;
      phaseBanner.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
        const r = b.dataset.r;
        if (r === "hp") { state.hp = Math.min(FORTRESS_HP_MAX, state.hp + 1); updateHud(); }
        if (r === "zap") { zaps++; drawZap(); }
        if (r === "up") {
          phaseBanner.textContent = "Tap a tower to upgrade it (faster + longer range)!";
          const ups = state.towers.filter(t => t.lvl < 2);
          ups.forEach(t => { t.el.classList.add("fm-glow"); t.el.onclick = () => { t.lvl = 2; t.el.classList.add("fm-lv2"); ups.forEach(u => { u.el.onclick = null; u.el.classList.remove("fm-glow"); }); phaseBanner.textContent = `${TOWER_TYPES[t.type].name} upgraded!`; setTimeout(next, 800); }; });
          return;
        }
        phaseBanner.textContent = r === "hp" ? "Wall repaired!" : "⚡ Zap charged!"; setTimeout(next, 800);
      });
    }), 700);
  }

  // ---- Defend phase -------------------------------------------------------
  function startDefendPhase() {
    document.querySelectorAll(".fm-slot:not(.filled)").forEach(s => { s.onclick = null; });
    phaseBanner.textContent = state.towers.length
      ? `${state.towers.length} tower${state.towers.length === 1 ? "" : "s"} ready. Here come the waves!`
      : "No towers placed -- the fortress stands alone!";
    setTimeout(() => startWave(1), 1400);
  }

  function startWave(waveNum) {
    if (state.ended) return;
    state.wave = waveNum;
    updateHud();
    phaseBanner.textContent = endless ? `♾️ Endless wave ${waveNum}` : `🌊 Wave ${waveNum}/${WAVE_COUNT}`;
    const enemyCount = 2 + waveNum;
    const enemyHp = 2 + Math.floor(waveNum / 2);
    const traverseMs = Math.max(3500, 7000 - waveNum * 500);
    const boss = waveNum % WAVE_COUNT === 0;
    state.remainingInWave = enemyCount + (boss ? 1 : 0);
    for (let i = 0; i < enemyCount; i++) {
      const r = Math.random(), kind = waveNum >= 3 && r < 0.25 ? "armor" : waveNum >= 2 && r < 0.5 ? "fast" : "normal";
      setTimeout(() => spawnEnemy(enemyHp + (kind === "armor" ? 2 : kind === "fast" ? -1 : 0), traverseMs * (kind === "fast" ? 0.6 : kind === "armor" ? 1.3 : 1), kind), i * 800);
    }
    if (boss) { setTimeout(() => { phaseBanner.textContent = "🐉 BOSS INCOMING!"; spawnEnemy(14, traverseMs * 1.8, "boss"); }, enemyCount * 800 + 600); }
    if (!state.intervalId) state.intervalId = setInterval(tick, tickMs());
  }

  function spawnEnemy(hp, traverseMs, kind) {
    if (state.ended) return;
    const el = document.createElement("div");
    el.className = "fm-enemy" + (kind === "boss" ? " fm-boss" : "");
    el.textContent = { fast: "🐺", armor: "🐗", boss: "🐉" }[kind] || "👹";
    el.style.left = SPAWN_X + "%";
    battlefield.appendChild(el);
    state.enemies.push({
      id: "e" + Math.random(),
      x: SPAWN_X,
      pos: 0,
      hp, maxHp: hp,
      el, kind,
      progressPerTick: (TICK_MS / traverseMs), slowUntil: 0
    });
    drawZap();
  }

  function removeEnemy(enemy, reachedFortress) {
    enemy.el.remove();
    state.enemies = state.enemies.filter(e => e !== enemy);
    state.remainingInWave--;
    drawZap();
    if (reachedFortress) {
      state.hp = Math.max(0, state.hp - (enemy.kind === "boss" ? 3 : 1));
      updateHud();
      if (state.hp <= 0) { endBattle(false); return; }
    } else {
      state.defeated++;
    }
    if (state.remainingInWave <= 0 && !state.ended) {
      if (state.wave >= WAVE_COUNT && !endless) {
        endBattle(true);
      } else {
        const nextWave = state.wave + 1;
        betweenWaves(() => startWave(nextWave));
      }
    }
  }

  function tick() {
    if (state.ended) return;
    state.tickCount++;
    // Move enemies.
    state.enemies.slice().forEach(enemy => {
      enemy.pos += enemy.progressPerTick * (enemy.slowUntil > state.tickCount ? 0.5 : 1);
      enemy.el.classList.toggle("fm-slow", enemy.slowUntil > state.tickCount);
      enemy.x = SPAWN_X - enemy.pos * (SPAWN_X - FORTRESS_X);
      if (enemy.x <= FORTRESS_X) {
        removeEnemy(enemy, true);
        return;
      }
      enemy.el.style.left = enemy.x + "%";
    });
    // Each tower type fires on its own cadence (level 2 = 1 tick faster, +3% range).
    state.towers.forEach(tower => {
      const T = TOWER_TYPES[tower.type] || TOWER_TYPES.archer, every = T.every - (tower.lvl - 1), range = T.range + (tower.lvl - 1) * 3;
      if (state.tickCount % every !== 0) return;
      const inRange = state.enemies.filter(e => Math.abs(e.x - tower.x) <= range);
      if (!inRange.length) return;
      inRange.sort((a, b) => b.pos - a.pos); // most advanced (closest to fortress) first
      const target = inRange[0];
      tower.el.classList.remove("fm-fire"); void tower.el.offsetWidth; tower.el.classList.add("fm-fire");
      const hits = [[target, T.dmg]];
      if (T.splash) state.enemies.forEach(e => { if (e !== target && Math.abs(e.x - target.x) <= T.splash) hits.push([e, 1]); });
      hits.forEach(([e, d]) => {
        e.hp -= d;
        if (T.slow) e.slowUntil = state.tickCount + T.slow;
        e.el.classList.add("hit");
        setTimeout(() => e.el && e.el.classList.remove("hit"), 150);
        if (e.hp <= 0 && state.enemies.includes(e)) removeEnemy(e, false);
      });
    });
  }

  function endBattle(survived) {
    state.ended = true;
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    state.enemies.forEach(e => e.el.remove());
    state.enemies = [];

    const wavesCleared = endless ? state.wave - 1 : survived ? WAVE_COUNT : state.wave - 1;
    if (endless) { try { const eb = Number(localStorage.getItem("fm_endless_best") || 0); if (wavesCleared > eb) localStorage.setItem("fm_endless_best", String(wavesCleared)); } catch (e) {} }
    const best = Number(lsf("fm_best", "0")), isBest = wavesCleared > best || (survived && state.hp > Number(lsf("fm_best_hp", "0")));
    if (isBest) { try { localStorage.setItem("fm_best", String(Math.max(best, wavesCleared))); if (survived) localStorage.setItem("fm_best_hp", String(state.hp)); } catch (e) {} }
    const emoji = state.hp >= 4 ? "🏆" : state.hp >= 2 ? "🥳" : state.hp >= 1 ? "🙂" : "💪";
    const title = survived ? (state.hp >= 4 ? "Flawless defense!" : "Fortress held!") : "The fortress fell...";
    document.getElementById("fm-end-emoji").textContent = emoji;
    document.getElementById("fm-end-title").textContent = title;
    document.getElementById("fm-end-sub").textContent = `Survived ${wavesCleared}/${WAVE_COUNT} waves, defeated ${state.defeated} monsters, ${state.hp}/${FORTRESS_HP_MAX} HP left.${isBest ? " 🌟 New best!" : ` (Best: ${best} waves)`}`;
    phaseBanner.textContent = "";
    const bonusEl = document.getElementById("fm-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardFortressMathBonus(wavesCleared, WAVE_COUNT, state.hp).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("fm-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.hp = FORTRESS_HP_MAX;
    state.wave = 0;
    state.towers = [];
    state.enemies = [];
    state.remainingInWave = 0;
    state.tickCount = 0;
    state.defeated = 0;
    state.ended = false;
    state.buildIndex = 0; endless = false;
    zaps = 1; drawZap();
    if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
    updateHud();
    renderSlots();
    phaseBanner.textContent = "Answer questions to earn towers!";
    document.getElementById("fm-end-overlay").classList.add("hidden");
    document.getElementById("fm-start-overlay").classList.add("hidden");
    askBuildQuestion();
  }

  document.getElementById("fm-zap").onclick = () => {
    if (!zaps || !state.enemies.length) return; zaps--;
    battlefield.classList.remove("fm-zapping"); void battlefield.offsetWidth; battlefield.classList.add("fm-zapping");
    state.enemies.slice().forEach(e => { e.hp -= 2; if (e.hp <= 0) removeEnemy(e, false); });
    drawZap();
  };
  (function extras() {
    const bar = document.querySelector(".fm-zapbar");
    const sp = document.createElement("button"); sp.type = "button"; sp.id = "fm-speed"; sp.textContent = "⏩ 2× speed"; sp.style.marginLeft = "6px";
    sp.onclick = () => { fast = !fast; sp.textContent = fast ? "▶ 1× speed" : "⏩ 2× speed"; if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = setInterval(tick, tickMs()); } };
    bar.appendChild(sp);
    const end = document.getElementById("fm-play-again-btn");
    const eb = document.createElement("button"); eb.className = "fm-btn"; eb.type = "button"; eb.id = "fm-endless-btn"; eb.style.marginTop = "8px";
    eb.onclick = () => { endless = true; state.ended = false; document.getElementById("fm-end-overlay").classList.add("hidden"); betweenWaves(() => startWave(state.wave + 1)); };
    end.after(eb);
    const obs = new MutationObserver(() => { const shown = !document.getElementById("fm-end-overlay").classList.contains("hidden"); eb.hidden = !(shown && !endless && state.hp > 0 && state.wave >= WAVE_COUNT); let b = 0; try { b = Number(localStorage.getItem("fm_endless_best") || 0); } catch (e) {} eb.textContent = `♾️ Keep going — Endless${b ? ` (best ${b} waves)` : ""}`; });
    obs.observe(document.getElementById("fm-end-overlay"), { attributes: true, attributeFilter: ["class"] });
  })();
  document.getElementById("fm-start-btn").addEventListener("click", startGame);
  document.getElementById("fm-play-again-btn").addEventListener("click", startGame);
}
