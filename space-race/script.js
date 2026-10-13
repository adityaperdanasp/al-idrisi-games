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

const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
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

// Audit batch 8: between questions you steer through an asteroid field (◀ ▶) — rocks cost 10 km, stars
// add 5 and a shield blocks one hit; planet checkpoints (Moon, Mars, Jupiter, Saturn) with a science
// question as you pass; an alien boss as the last question (double distance, 8s timer); and a ghost
// marker of your best run.
const PLANETS = [[100, "🌙", "the Moon"], [250, "🔴", "Mars"], [450, "🪐", "Jupiter"], [600, "💫", "Saturn"]];
function initSpaceRace() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const state = { qIndex: 0, distance: 0, qStart: 0, lane: 1, shield: false, passed: 0, sci: false, field: null };

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
    document.getElementById("sr-rocket").style.left = (state.lane * 30 + 20) + "%";
    let g = document.getElementById("sr-ghost"); const best = Number(localStorage.getItem("sr_best") || 0);
    if (best) { if (!g) { g = document.createElement("div"); g.id = "sr-ghost"; g.className = "sr-ghost"; g.textContent = "👻"; document.getElementById("sr-track").appendChild(g); } g.style.bottom = Math.min(92, 4 + (best / MAX_POSSIBLE_DISTANCE) * 88) + "%"; }
    const p = PLANETS[state.passed]; if (p && state.distance >= p[0]) { state.passed++; state.sci = true; document.getElementById("sr-boost-toast").textContent = `${p[1]} You passed ${p[2]}! Science question next…`; }
  }
  function asteroidField(then) {
    const track = document.getElementById("sr-track"), ctl = document.getElementById("sr-ctl");
    ctl.classList.remove("hidden"); document.getElementById("sr-q-card").classList.add("hidden");
    let t = 0, spawned = 0; const objs = [];
    const id = setInterval(() => {
      t += 50;
      if (t % 600 === 0 && spawned < 5) { spawned++; const r = Math.random(), el = document.createElement("div"); el.className = "sr-obj"; const lane = rand(0, 2); el.textContent = r < 0.6 ? "🪨" : r < 0.9 ? "⭐" : "🛡️"; el.style.left = (lane * 30 + 20) + "%"; el.style.top = "-10%"; track.appendChild(el); objs.push({ el, lane, y: -10, kind: el.textContent }); }
      objs.forEach(o => { if (o.done) return; o.y += 4; o.el.style.top = o.y + "%";
        if (o.y > 70 && o.y < 90 && o.lane === state.lane) { o.done = true; o.el.remove();
          if (o.kind === "🪨") { if (state.shield) { state.shield = false; flash("🛡️ Shield blocked a rock!"); } else { state.distance = Math.max(0, state.distance - 10); flash("💥 Asteroid! −10 km"); } }
          else if (o.kind === "⭐") { state.distance += 5; addDust(1); flash("⭐ +5 km · +1 ✨ stardust"); } else { state.shield = true; flash("🛡️ Shield ready!"); }
          renderHud(); }
        if (o.y > 110 && !o.done) { o.done = true; o.el.remove(); } });
      if (t >= 3600) { clearInterval(id); objs.forEach(o => o.el.remove()); ctl.classList.add("hidden"); document.getElementById("sr-q-card").classList.remove("hidden"); then(); }
    }, 50);
  }
  function flash(t) { const el = document.getElementById("sr-boost-toast"); el.textContent = t; }
  document.getElementById("sr-left").onclick = () => { state.lane = Math.max(0, state.lane - 1); renderHud(); };
  document.getElementById("sr-right").onclick = () => { state.lane = Math.min(2, state.lane + 1); renderHud(); };

  function askQuestion() {
    let q = rollQuestion(difficultyForIndex(state.qIndex));
    if (state.sci && window.AIGQuestionPools && AIGQuestionPools.pickScience) { const sq = AIGQuestionPools.pickScience(); if (sq) q = { key: "science", ...sq }; state.sci = false; }
    const boss = state.qIndex === QUESTION_COUNT - 1; state.boss = boss;
    document.getElementById("sr-q-prompt").textContent = (boss ? "👾 ALIEN BOSS — double distance, 8 seconds! " : "") + q.prompt;
    clearInterval(state.bossT); if (boss) { let left = 8; state.bossT = setInterval(() => { left -= 1; if (left <= 0) { clearInterval(state.bossT); const w = [...document.querySelectorAll("#sr-q-grid .sr-q-btn")].find(b => b.textContent !== q.correctLabel); if (w) w.click(); } }, 1000); }
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
      clearInterval(state.bossT);
      const tier = BOOST_TIERS.find(t => elapsed <= t.maxMs);
      state.distance += Math.round(tier.distance * (state.boss ? 2 : 1) * (1 + engine() * 0.1));
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
      } else if (state.qIndex % 3 === 0) {
        asteroidField(askQuestion);
      } else {
        askQuestion();
      }
    }, 900);
  }

  async function finishGame() {
    try { if (state.distance > Number(localStorage.getItem("sr_best") || 0)) localStorage.setItem("sr_best", String(state.distance)); } catch (e) {}
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

  // Audit round 2: rocket workshop -- stars in the asteroid field become ✨ stardust (kept between
  // runs). Spend it on 🔥 Engine levels (+10% distance from answers per level, max 3) and a 🛡️
  // launch shield (start the next run with a shield).
  const lsr = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsrw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function addDust(n) { lsrw("sr_dust", String(Number(lsr("sr_dust", "0")) + n)); }
  const engine = () => Number(lsr("sr_engine", "0"));
  function workshop() {
    const card = document.querySelector("#sr-start-overlay .sr-card, #sr-start-overlay > div"); if (!card) return;
    let w = document.getElementById("sr-shop"); if (!w) { w = document.createElement("div"); w.id = "sr-shop"; w.className = "sr-shop"; document.getElementById("sr-start-btn").before(w); }
    const dust = Number(lsr("sr_dust", "0")), lv = engine(), cost = [5, 10, 20][lv], shield = lsr("sr_launch_shield", "") === "1";
    w.innerHTML = `<b>🛠️ Rocket workshop · ✨ ${dust} stardust</b><button type="button" id="sr-up-eng" ${lv >= 3 || dust < cost ? "disabled" : ""}>🔥 Engine Lv ${lv}/3 ${lv >= 3 ? "MAX" : `→ ${cost} ✨`}</button><button type="button" id="sr-up-sh" ${shield || dust < 8 ? "disabled" : ""}>🛡️ Launch shield ${shield ? "ready ✔" : "→ 8 ✨"}</button>`;
    document.getElementById("sr-up-eng").onclick = () => { if (dust < cost) return; lsrw("sr_dust", String(dust - cost)); lsrw("sr_engine", String(lv + 1)); workshop(); };
    document.getElementById("sr-up-sh").onclick = () => { if (dust < 8) return; lsrw("sr_dust", String(dust - 8)); lsrw("sr_launch_shield", "1"); workshop(); };
  }
  workshop();
  function startGame() {
    state.qIndex = 0;
    state.distance = 0; state.lane = 1; state.shield = lsr("sr_launch_shield", "") === "1"; state.passed = 0; state.sci = false;
    if (state.shield) { lsrw("sr_launch_shield", ""); setTimeout(() => flash("🛡️ Launch shield active!"), 300); }
    document.getElementById("sr-start-overlay").classList.add("hidden");
    document.getElementById("sr-end-overlay").classList.add("hidden");
    document.getElementById("sr-q-card").classList.remove("hidden");
    document.getElementById("sr-leaderboard").classList.add("hidden");
    spawnStars();
    renderHud();
    askQuestion();
  }

  document.getElementById("sr-start-btn").addEventListener("click", startGame);
  document.getElementById("sr-play-again-btn").addEventListener("click", () => { workshop(); startGame(); });
  spawnStars();
}
