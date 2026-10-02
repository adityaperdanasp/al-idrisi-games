/* =================================================================
   Math Tennis — round 1 polish (30 items, gameplay + UI/UX), same
   brainstorm->gas->ship cycle as Math Hoops. Core skill is still TIMING
   (distinct from Math Hoops' aim and Number Line Long Jump's distance
   judgment) -- this round adds a SECOND dimension on top of it: the ball
   now also drops toward one of 3 lanes (left/center/right), so a kid has
   to both position the racket AND time the swing.

   Ball position is driven by a requestAnimationFrame tick loop (reading
   elapsed/duration to interpolate top+left) rather than a single CSS
   transition like round 0 used -- needed so wind can curve the ball
   mid-flight and so trail dots/dynamic sweet-zone sizing can read the
   ball's current position each frame. Tested with the SAME debug-hook
   techniques as Math Hoops: rAF polyfilled to setTimeout, state/functions
   exposed on window.__mtTest during development, removed before commit.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("mt-signedout-overlay").classList.remove("hidden");
  document.getElementById("mt-start-overlay").classList.add("hidden");
} else {
  initMathTennis();
}

function initMathTennis() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const ROUND_SIZE = 10;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const BASE_DURATION_MS = 1500;
  const MIN_DURATION_MS = 750;
  const DURATION_STEP_MS = 60; // ball gets this much faster per point won
  const SWEET_MIN_PCT = 66, SWEET_MAX_PCT = 90; // where in the ball's travel counts as a good return
  const ACE_MIN_PCT = 74, ACE_MAX_PCT = 82;     // item 6 -- a tighter "perfect" sub-window inside the sweet zone
  const ACE_BONUS = 15;
  const BASE_POINT_VALUE = 10;                  // every normal hit's base score, so multipliers below stay clean integers
  // Hot Racket (item 2) -- a continuously-climbing multiplier on the BASE
  // point value, separate from the flat milestone bonus below (same
  // two-system split as Math Hoops' Hot Hand + streak-tier bonus).
  const HOT_RACKET_CAP = 1.5, HOT_RACKET_STEP = 0.05;
  // Milestone streak bonus (item 12), fires ONCE per crossing (not every
  // hit above the threshold), same "Hot Racket" flavor name as item 2 but
  // a genuinely separate mechanic.
  const STREAK_TIERS = [{ at: 3, bonus: 5 }, { at: 5, bonus: 10 }, { at: 8, bonus: 15 }];
  const POWER_PER_HIT = 25, POWER_MULT = 2;     // item 9
  const CHAMPIONSHIP_MULT = 2;                  // item 10 -- the final serve of the match
  const ACE_MODE_DURATION_MULT = 0.82, ACE_MODE_WINDOW_SHRINK = 6, ACE_MODE_PTS_MULT = 1.3; // item 11
  const FATIGUE_MAX_SHRINK = 0.3;               // item 8 -- fraction of the sweet-zone WIDTH shaved off by the final normal serve
  const LANES = ["left", "center", "right"];    // item 1
  const LANE_PCT = { left: 25, center: 50, right: 75 };
  const LANE_HIT_TOLERANCE = 14;                // % tolerance between racket lane and the ball's actual X at swing time
  const LET_CHANCE = 0.08;                      // item 7
  const VOLLEY_CHANCE = 0.2;                    // item 5 -- a single extra exchange, never stacked twice
  const WIND_CHANCE = 0.14;                     // item 14
  const MULTIBALL_CHANCE = 0.12, MULTIBALL_BONUS = 20, MULTIBALL_NOT_BEFORE = 2; // item 15
  // Serve variety (item 3) -- durationMult scales the base ramp-derived
  // duration, windowWiden is added/subtracted from BOTH edges of the sweet
  // zone (positive = easier/wider, negative = harder/narrower).
  const SERVE_TYPES = {
    normal: { durationMult: 1, windowWiden: 0, weight: 55, label: null },
    fast: { durationMult: 0.72, windowWiden: 0, weight: 18, label: "⚡ Fast Serve!" },
    lob: { durationMult: 1.35, windowWiden: 6, weight: 17, label: "🏐 Lob" },
    slice: { durationMult: 1, windowWiden: -6, weight: 10, label: "🔪 Slice" }
  };

  const hudPoints = document.getElementById("mt-hud-points");
  const hudScore = document.getElementById("mt-hud-score");
  const hudStreak = document.getElementById("mt-hud-streak");
  const hudCoins = document.getElementById("mt-hud-coins");
  const hudGems = document.getElementById("mt-hud-gems");
  const powerBar = document.getElementById("mt-power-bar");
  const powerFill = document.getElementById("mt-power-fill");
  const progressDots = document.getElementById("mt-progress-dots");
  const teamResultChip = document.getElementById("mt-team-result");
  const ball = document.getElementById("mt-ball");
  const sweetZone = document.getElementById("mt-sweet-zone");
  const swingBtn = document.getElementById("mt-swing-btn");
  const resultBanner = document.getElementById("mt-result-banner");
  const racketTop = document.getElementById("mt-racket-top");
  const racketBottom = document.getElementById("mt-racket-bottom");
  const swingArc = document.getElementById("mt-swing-arc");
  const windEl = document.getElementById("mt-wind");
  const serveBadge = document.getElementById("mt-serve-badge");
  const champBanner = document.getElementById("mt-championship-banner");
  const hitCaption = document.getElementById("mt-hit-caption");
  const court = document.getElementById("mt-court");
  const laneBtns = { left: document.getElementById("mt-lane-left"), center: document.getElementById("mt-lane-center"), right: document.getElementById("mt-lane-right") };

  const SOUND_KEY = "aig_mt_sound";
  const HAPTICS_KEY = "aig_mt_haptics";
  function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }
  function hapticsOn() { try { return localStorage.getItem(HAPTICS_KEY) !== "0"; } catch (e) { return true; } }
  function vib(pattern) { try { if (hapticsOn() && navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

  const state = {
    qIndex: 0, pointsWon: 0, score: 0, aces: 0,
    streak: 0, bestStreakThisMatch: 0,
    comboMult: 1,
    powerMeter: 0, powerReady: false,
    mode: "normal", teamTurn: 1, teamScores: { 1: 0, 2: 0 },
    racketLane: "center",
    ballLane: "center",
    windActive: false, windPreLane: null,
    serveType: "normal",
    rallyRunning: false, rallyStart: 0, rallyDuration: BASE_DURATION_MS, rafId: null, resolved: false,
    ballCurLeftPct: 50,
    letUsedThisPoint: false, volleyUsed: false,
    multiballUsed: false, bonusRallyActive: false,
    dotLog: [],
    ended: false,
    _lastTrailTick: -1
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

  // ---- Synthesized sound effects (item 26) -- same self-contained Web
  // Audio approach as Math Hoops (mtTone/mtNoiseBurst), including the same
  // overlap-ducking so a crowd cheer firing right alongside a thwock
  // doesn't stack at full volume on both. ---------------------------------
  let mtAudioCtx = null;
  let mtActiveSoundCount = 0;
  function mtSoundStart(durationSec) {
    mtActiveSoundCount++;
    setTimeout(() => { mtActiveSoundCount = Math.max(0, mtActiveSoundCount - 1); }, durationSec * 1000);
  }
  function mtMixGain(baseGain) { return mtActiveSoundCount > 0 ? baseGain * 0.65 : baseGain; }
  function mtTone(freqs, dur, vol, type) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      mtAudioCtx = mtAudioCtx || new C();
      if (mtAudioCtx.state === "suspended") mtAudioCtx.resume();
      const mixedVol = mtMixGain(vol != null ? vol : 0.15);
      mtSoundStart(dur * freqs.length * 0.55 + 0.1);
      let t = mtAudioCtx.currentTime;
      freqs.forEach(f => {
        const o = mtAudioCtx.createOscillator(), g = mtAudioCtx.createGain();
        o.type = type || "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(mixedVol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(mtAudioCtx.destination);
        o.start(t);
        o.stop(t + dur + 0.05);
        t += dur * 0.55;
      });
    } catch (e) { /* silent -- never blocks the game */ }
  }
  function mtNoiseBurst(dur, vol, freq) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      mtAudioCtx = mtAudioCtx || new C();
      if (mtAudioCtx.state === "suspended") mtAudioCtx.resume();
      mtSoundStart(dur + 0.05);
      const bufferSize = mtAudioCtx.sampleRate * dur;
      const buffer = mtAudioCtx.createBuffer(1, bufferSize, mtAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = mtAudioCtx.createBufferSource();
      src.buffer = buffer;
      const filt = mtAudioCtx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = freq || 800;
      const g = mtAudioCtx.createGain();
      g.gain.value = mtMixGain(vol != null ? vol : 0.2);
      src.connect(filt).connect(g).connect(mtAudioCtx.destination);
      src.start();
    } catch (e) {}
  }
  function playThwock() { mtNoiseBurst(0.07, 0.22, 1600); }
  function playNet() { mtNoiseBurst(0.16, 0.14, 280); }
  function playAce() { mtTone([987.77, 1318.51], 0.22, 0.14); }
  function playLet() { mtTone([440, 440], 0.12, 0.1, "triangle"); }
  function playCrowdReact() { mtNoiseBurst(0.5, 0.05, 1800); mtTone([523.25, 659.25, 783.99], 0.35, 0.07); }
  function playChampionship() { mtTone([659.25, 783.99, 1046.5], 0.4, 0.16); }

  // ---- Cosmetics (item 30) -- racket + ball skins, same generic
  // unlockCosmetic/equipCosmetic pattern as every other game's swatches,
  // plus a long-press preview tooltip (item 16, ported from Math Hoops). --
  function applyRacketSkin(id) {
    const emoji = (MT_RACKET_PREVIEWS[id] || "🎾");
    racketTop.querySelector(".mt-racket-head") && (racketTop.querySelector(".mt-racket-head").dataset.skin = id);
    racketBottom.querySelector(".mt-racket-head") && (racketBottom.querySelector(".mt-racket-head").dataset.skin = id);
  }
  let MT_RACKET_PREVIEWS = {};
  let MT_BALL_PREVIEWS = { default: "🎾" };
  function applyBallSkin(id) { ball.textContent = MT_BALL_PREVIEWS[id] || "🎾"; }
  function renderSwatches(containerId, catalogKey, applyFn, previewMap) {
    const wrap = document.getElementById(containerId);
    if (!window.AIGLeaderboard || !AIGLeaderboard.getCosmetics) { wrap.innerHTML = ""; return; }
    AIGLeaderboard.getCosmetics().then(cos => {
      const catalog = cos.costumes[catalogKey];
      const equipped = cos.equippedCostumes[catalogKey];
      const owned = catalog.filter(c => c.owned);
      owned.forEach(c => { previewMap[c.id] = c.preview; });
      wrap.innerHTML = owned.map(c => `<button type="button" class="mt-swatch ${c.id === equipped ? "sel" : ""}" data-id="${c.id}" data-name="${c.name}" title="${c.name}">${c.preview}</button>`).join("");
      wrap.querySelectorAll(".mt-swatch").forEach(b => {
        b.onclick = async () => {
          const id = b.dataset.id;
          await AIGLeaderboard.equipCosmetic(catalogKey, id);
          applyFn(id);
          renderSwatches(containerId, catalogKey, applyFn, previewMap);
        };
        let pressTimer = null;
        const showPreview = () => {
          const tip = document.createElement("div");
          tip.className = "mt-cosmetic-preview";
          tip.textContent = `${b.textContent} ${b.dataset.name}`;
          b.appendChild(tip);
        };
        const clearPreview = () => { clearTimeout(pressTimer); const tip = b.querySelector(".mt-cosmetic-preview"); if (tip) tip.remove(); };
        b.addEventListener("pointerdown", () => { pressTimer = setTimeout(showPreview, 450); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, clearPreview));
      });
      const current = owned.find(c => c.id === equipped);
      if (current) applyFn(current.id);
    }).catch(() => {});
  }
  renderSwatches("mt-racket-swatches", "mathtennis-racket", applyRacketSkin, MT_RACKET_PREVIEWS);
  renderSwatches("mt-ball-swatches", "mathtennis-ball", applyBallSkin, MT_BALL_PREVIEWS);

  // ---- Lifetime stats + achievements (item 23) -------------------------
  function renderAchievementBadges(containerId, list) {
    const el = document.getElementById(containerId);
    if (!list || !list.length) { el.innerHTML = ""; return; }
    el.innerHTML = list.map(a => `<span class="mt-ach-badge ${a.unlocked ? "unlocked" : ""}" title="${a.name}${a.unlocked ? "" : " (locked)"}">${a.emoji}</span>`).join("");
  }
  const ACH_PROGRESS_SHOW = 3;
  function renderAchievementProgress(list) {
    const el = document.getElementById("mt-ach-progress-row");
    if (!el) return;
    const locked = (list || []).filter(a => !a.unlocked && a.target > 0);
    locked.sort((a, b) => (b.current / b.target) - (a.current / a.target));
    const shown = locked.slice(0, ACH_PROGRESS_SHOW);
    if (!shown.length) { el.innerHTML = ""; return; }
    el.innerHTML = shown.map(a => {
      const pct = Math.min(100, Math.round((a.current / a.target) * 100));
      return `<div class="mt-ach-progress-item">${a.emoji} ${a.name} -- ${a.current}/${a.target}<div class="mt-ach-progress-bar"><i style="width:${pct}%"></i></div></div>`;
    }).join("");
  }
  const ACH_SEEN_KEY = "aig_mt_achievements_seen";
  function announceNewAchievements(list) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(ACH_SEEN_KEY) || "[]"); } catch (e) {}
    const newlyUnlocked = list.filter(a => a.unlocked && !seen.includes(a.id));
    if (newlyUnlocked.length) {
      const a = newlyUnlocked[0];
      showCaption(`${a.emoji} Achievement unlocked: ${a.name}!`, false);
    }
    try { localStorage.setItem(ACH_SEEN_KEY, JSON.stringify(list.filter(a => a.unlocked).map(a => a.id))); } catch (e) {}
  }
  if (window.AIGLeaderboard) {
    if (AIGLeaderboard.getMathTennisLifetimeSummary) {
      AIGLeaderboard.getMathTennisLifetimeSummary().then(d => {
        const row = document.getElementById("mt-lifetime-row");
        if (d.matchesPlayed > 0) {
          row.textContent = `🏅 Best match: ${d.bestMatchPoints}/${ROUND_SIZE} · Lifetime points won: ${d.totalPointsWon}`;
          row.classList.remove("hidden");
        }
      }).catch(() => {});
    }
    if (AIGLeaderboard.getMathTennisAchievements) {
      AIGLeaderboard.getMathTennisAchievements().then(list => {
        renderAchievementBadges("mt-start-achievements", list);
        renderAchievementProgress(list);
      }).catch(() => {});
    }
  }

  // ---- Progress dots (item 21) ------------------------------------------
  function renderProgressDots() {
    progressDots.innerHTML = "";
    for (let i = 0; i < ROUND_SIZE; i++) {
      const d = document.createElement("div");
      d.className = "mt-progress-dot";
      progressDots.appendChild(d);
    }
  }
  function markDot(index, kind) {
    state.dotLog[index] = kind;
    const el = progressDots.children[index];
    if (el) el.className = "mt-progress-dot " + kind;
  }

  // ---- Power meter (item 9) ---------------------------------------------
  function updatePowerMeter(hit) {
    if (hit) {
      state.powerMeter = Math.min(100, state.powerMeter + POWER_PER_HIT);
      if (state.powerMeter >= 100) { state.powerMeter = 100; state.powerReady = true; }
    } else {
      state.powerMeter = 0;
      state.powerReady = false;
    }
    powerBar.classList.toggle("hidden", state.powerMeter <= 0 && !state.powerReady);
    powerBar.classList.toggle("full", state.powerReady);
    powerFill.style.width = state.powerMeter + "%";
  }

  // ---- Captions / toasts (item 16) ---------------------------------------
  function showCaption(text, isMiss) {
    hitCaption.textContent = text;
    hitCaption.classList.remove("show", "miss");
    void hitCaption.offsetWidth;
    if (isMiss) hitCaption.classList.add("miss");
    hitCaption.classList.add("show");
    resultBanner.textContent = text;
    resultBanner.classList.toggle("miss", !!isMiss);
  }

  // ---- Confetti (item 20) ------------------------------------------------
  const CONFETTI_COLORS = ["#8FAE1F", "#ffce6b", "#3a6ea5", "#D64545", "#C2D94E"];
  function burstConfetti(big) {
    const count = big ? 36 : 14;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "mt-confetti-piece";
      piece.style.left = (10 + Math.random() * 80) + "%";
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = (Math.random() * (big ? 300 : 150)) + "ms";
      court.appendChild(piece);
      setTimeout(() => piece.remove(), 1400);
    }
  }

  // ---- Ball trail (item 17) -----------------------------------------------
  function spawnBallTrail(leftPct, topPct) {
    const dot = document.createElement("div");
    dot.className = "mt-ball-trail";
    dot.textContent = ball.textContent;
    dot.style.left = leftPct + "%";
    dot.style.top = topPct + "%";
    court.appendChild(dot);
    setTimeout(() => dot.remove(), 420);
  }

  // ---- Swing visuals (item 18) --------------------------------------------
  function swingRacket(el) {
    el.classList.remove("swinging");
    void el.offsetWidth;
    el.classList.add("swinging");
  }
  function spawnSwingArc() {
    swingArc.classList.remove("show");
    void swingArc.offsetWidth;
    swingArc.classList.add("show");
  }

  // ---- Lane control (item 1) ----------------------------------------------
  function setRacketLane(lane) {
    state.racketLane = lane;
    racketBottom.style.left = LANE_PCT[lane] + "%";
    LANES.forEach(l => laneBtns[l].classList.toggle("sel", l === lane));
  }
  LANES.forEach(l => laneBtns[l].addEventListener("click", () => setRacketLane(l)));

  // Same MC-building approach as basketball/treasure-dig's buildMc.
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

  function askQuestion() {
    if (state.qIndex >= ROUND_SIZE) { finishMatch(); return; }
    // Team Score / Doubles turn banner (item 13)
    if (state.mode === "team") showCaption(`Player ${state.teamTurn}'s turn!`, false);
    const q = rollQuestion();
    document.getElementById("mt-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("mt-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "mt-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("mt-question-overlay").classList.remove("hidden");
  }

  function handleAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    const grid = document.getElementById("mt-q-grid");
    grid.querySelectorAll(".mt-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("math-tennis", q.key, isCorrect);
    const dotIndex = state.qIndex;
    state.qIndex++;

    setTimeout(() => {
      document.getElementById("mt-question-overlay").classList.add("hidden");
      if (isCorrect) {
        startRally(dotIndex);
      } else {
        markDot(dotIndex, "noserve");
        showCaption("❌ Missed the serve -- no return this time.", true);
        if (state.mode === "team") state.teamTurn = state.teamTurn === 1 ? 2 : 1;
        setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 900);
      }
    }, 700);
  }

  // ---- Serve type + lane roll ---------------------------------------------
  function pickServeType() {
    const totalWeight = Object.values(SERVE_TYPES).reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * totalWeight;
    for (const key of Object.keys(SERVE_TYPES)) {
      r -= SERVE_TYPES[key].weight;
      if (r <= 0) return key;
    }
    return "normal";
  }
  function rollLane() { return LANES[rand(0, LANES.length - 1)]; }

  // Dynamically-sized sweet zone (item 8 fatigue + item 3 serve variety +
  // item 11 Ace Mode), computed fresh each rally rather than a single
  // fixed CSS band -- see sweetZone.style.top/height set in startRally.
  function effectiveSweetWindow(isLastShot) {
    let min = SWEET_MIN_PCT, max = SWEET_MAX_PCT;
    const widen = SERVE_TYPES[state.serveType].windowWiden || 0;
    min -= widen; max += widen;
    if (state.mode === "ace" && !isLastShot) { min += ACE_MODE_WINDOW_SHRINK / 2; max -= ACE_MODE_WINDOW_SHRINK / 2; }
    if (!isLastShot && !state.bonusRallyActive) {
      const width = max - min;
      const shrink = (state.qIndex / ROUND_SIZE) * FATIGUE_MAX_SHRINK * width;
      min += shrink / 2; max -= shrink / 2;
    }
    return [min, max];
  }

  function streakBonusFor(streak) {
    const t = STREAK_TIERS.slice().reverse().find(tier => streak === tier.at);
    return t ? t.bonus : 0;
  }

  function startRally(dotIndex) {
    state._dotIndex = dotIndex;
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    hitCaption.classList.remove("show");

    // Let / net cord (item 7) -- rolled before the ball ever moves, caps at
    // ONE re-serve per point via letUsedThisPoint so a freak double-roll
    // can't stall the match.
    if (!state.letUsedThisPoint && !state.bonusRallyActive && rng() < LET_CHANCE) {
      state.letUsedThisPoint = true;
      showCaption("🎾 Let! Net cord -- re-serve.", false);
      playLet();
      vib(15);
      setTimeout(() => startRally(dotIndex), 900);
      return;
    }

    state.resolved = false;
    state.serveType = state.bonusRallyActive ? "normal" : pickServeType();
    state.ballLane = rollLane();
    const isLastShot = state.qIndex === ROUND_SIZE;
    state.windActive = !state.bonusRallyActive && !isLastShot && rng() < WIND_CHANCE;
    if (state.windActive) {
      const others = LANES.filter(l => l !== state.ballLane);
      state.windPreLane = others[rand(0, others.length - 1)];
    }
    windEl.classList.toggle("hidden", !state.windActive);

    const typeLabel = SERVE_TYPES[state.serveType].label;
    serveBadge.classList.toggle("hidden", !typeLabel || state.bonusRallyActive);
    if (typeLabel) serveBadge.textContent = typeLabel;

    if (isLastShot) {
      champBanner.classList.remove("show"); void champBanner.offsetWidth; champBanner.classList.add("show");
      playChampionship();
    }

    const [minW, maxW] = effectiveSweetWindow(isLastShot);
    sweetZone.style.top = minW + "%";
    sweetZone.style.height = (maxW - minW) + "%";
    sweetZone.classList.remove("approaching");

    ball.style.transition = "none";
    ball.style.opacity = "1";
    ball.style.top = "10%";
    ball.style.left = "50%";
    ball.classList.remove("hidden");
    void ball.offsetWidth;
    swingBtn.classList.remove("hidden");
    swingBtn.disabled = false;
    LANES.forEach(l => laneBtns[l].classList.remove("hidden"));

    let baseDuration = Math.max(MIN_DURATION_MS, BASE_DURATION_MS - state.pointsWon * DURATION_STEP_MS);
    baseDuration *= SERVE_TYPES[state.serveType].durationMult;
    if (state.mode === "ace" && !isLastShot) baseDuration *= ACE_MODE_DURATION_MULT;
    state.rallyDuration = Math.max(400, Math.round(baseDuration));

    state.rallyRunning = true;
    state.rallyStart = performance.now();
    state._lastTrailTick = -1;
    swingRacket(racketTop); // the robot serves
    state.rafId = requestAnimationFrame(rallyTick);
  }

  function ballLeftPctAt(pct) {
    const finalPct = LANE_PCT[state.ballLane];
    if (state.windActive) {
      const prePct = LANE_PCT[state.windPreLane];
      if (pct < 0.5) return 50 + (prePct - 50) * (pct / 0.5);
      return prePct + (finalPct - prePct) * ((pct - 0.5) / 0.5);
    }
    return 50 + (finalPct - 50) * pct;
  }

  function rallyTick(now) {
    if (!state.rallyRunning) return;
    // `now` defaults to performance.now() -- real requestAnimationFrame
    // always passes a timestamp, this is just a safety net (same guard as
    // Math Hoops' animateScoreRollup, needed under a setTimeout-based rAF
    // polyfill which calls back with no arguments).
    const elapsed = (now || performance.now()) - state.rallyStart;
    const pct = Math.min(1, elapsed / state.rallyDuration);
    const topPct = 10 + 80 * pct;
    const leftPct = ballLeftPctAt(pct);
    ball.style.top = topPct + "%";
    ball.style.left = leftPct + "%";
    state.ballCurLeftPct = leftPct;

    const trailStep = Math.floor(elapsed / 90);
    if (trailStep !== state._lastTrailTick) { state._lastTrailTick = trailStep; spawnBallTrail(leftPct, topPct); }

    const [minW] = effectiveSweetWindow(state.qIndex === ROUND_SIZE);
    sweetZone.classList.toggle("approaching", pct * 100 > minW - 15 && pct < 1);

    if (pct >= 1) { resolveRally(false, {}); return; }
    state.rafId = requestAnimationFrame(rallyTick);
  }

  function onSwing() {
    if (!state.rallyRunning || state.resolved) return;
    const elapsed = performance.now() - state.rallyStart;
    const pct = (elapsed / state.rallyDuration) * 100;
    const [minW, maxW] = effectiveSweetWindow(state.qIndex === ROUND_SIZE);
    const timingOk = pct >= minW && pct <= maxW;
    const laneOk = Math.abs(state.ballCurLeftPct - LANE_PCT[state.racketLane]) <= LANE_HIT_TOLERANCE;
    const isAce = timingOk && laneOk && pct >= ACE_MIN_PCT && pct <= ACE_MAX_PCT;
    const isHit = timingOk && laneOk;
    swingRacket(racketBottom);
    spawnSwingArc();
    resolveRally(isHit, { isAce, early: pct < minW, late: pct > maxW, wrongLane: timingOk && !laneOk });
  }

  function animateBallAway(isHit) {
    if (isHit) {
      ball.style.transition = "top .35s ease-in, left .35s ease-in, opacity .35s ease-in .15s";
      ball.style.top = "-8%"; ball.style.left = "50%"; ball.style.opacity = "0";
    } else {
      ball.style.transition = "opacity .3s ease .1s";
      ball.style.opacity = "0";
    }
  }

  function resolveRally(isHit, info) {
    if (state.resolved) return;
    state.resolved = true;
    state.rallyRunning = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    swingBtn.classList.add("hidden");
    LANES.forEach(l => laneBtns[l].classList.add("hidden"));
    windEl.classList.add("hidden");
    serveBadge.classList.add("hidden");
    sweetZone.classList.remove("approaching");

    // Bonus rally short-circuit (item 15, Double Serve) -- a flat bonus,
    // no question gate, never affects pointsWon/qIndex/streak.
    if (state.bonusRallyActive) {
      state.bonusRallyActive = false;
      if (isHit) {
        state.score += MULTIBALL_BONUS;
        hudScore.textContent = state.score;
        showCaption(`🎾🎾 Double Serve bonus! +${MULTIBALL_BONUS}`, false);
        playThwock();
        vib(35);
      } else {
        showCaption("Missed the bonus -- no harm done!", true);
        playNet();
      }
      animateBallAway(isHit);
      setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 900);
      return;
    }

    const isLastShot = state.qIndex === ROUND_SIZE;

    if (isHit) {
      // Rally volley (item 5) -- ONE extra exchange, never on the
      // championship point (keeps that climax simple).
      if (!state.volleyUsed && !isLastShot && rng() < VOLLEY_CHANCE) {
        state.volleyUsed = true;
        showCaption("↩️ Robot returns it!", false);
        playThwock();
        vib(20);
        animateBallAway(true);
        setTimeout(() => startVolleyFlight(), 650);
        return;
      }

      state.pointsWon++;
      hudPoints.textContent = state.pointsWon;
      state.streak++;
      if (state.streak > state.bestStreakThisMatch) state.bestStreakThisMatch = state.streak;
      updatePowerMeter(true);

      const hotRacketMult = Math.min(HOT_RACKET_CAP, 1 + state.streak * HOT_RACKET_STEP);
      state.comboMult = hotRacketMult;
      let gained = Math.round(BASE_POINT_VALUE * hotRacketMult);
      gained += streakBonusFor(state.streak);
      if (info.isAce) { gained += ACE_BONUS; state.aces++; }
      let usedPower = false;
      if (state.powerReady) { gained = Math.round(gained * POWER_MULT); state.powerReady = false; powerBar.classList.remove("full"); usedPower = true; }
      if (isLastShot) gained = Math.round(gained * CHAMPIONSHIP_MULT);
      if (state.mode === "ace") gained = Math.round(gained * ACE_MODE_PTS_MULT);
      if (state.mode === "team") state.teamScores[state.teamTurn] += gained;
      state.score += gained;
      hudScore.textContent = state.score;

      hudStreak.classList.toggle("hidden", state.streak < 2);
      hudStreak.textContent = `🔥 ×${hotRacketMult.toFixed(1)}`;
      hudStreak.classList.remove("pop"); void hudStreak.offsetWidth; hudStreak.classList.add("pop");

      markDot(state._dotIndex, info.isAce ? "ace" : "won");

      const mainMsg = isLastShot ? `🏆 CHAMPIONSHIP POINT! +${gained}` : info.isAce ? `💥 ACE! +${gained}` : state.streak >= 3 ? `🔥 Great return! (${state.streak} in a row!)` : "🎾 Great return!";
      showCaption(mainMsg, false);
      if (usedPower) setTimeout(() => showCaption(`⚡ Power shot! ×${POWER_MULT}`, false), 300);

      if (info.isAce) { playAce(); vib([40, 30, 60]); } else { playThwock(); vib(isLastShot ? [50, 30, 50, 30, 80] : 35); }
      if (isLastShot) { court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch"); }
      else if (info.isAce) { court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch"); }
      if (state.streak >= 3) { burstConfetti(false); playCrowdReact(); }

      animateBallAway(true);

      if (!isLastShot && !state.multiballUsed && state.qIndex > MULTIBALL_NOT_BEFORE && state.qIndex < ROUND_SIZE - MULTIBALL_NOT_BEFORE && rng() < MULTIBALL_CHANCE) {
        state.multiballUsed = true;
        setTimeout(offerBonusRally, 900);
      } else {
        if (state.mode === "team") state.teamTurn = state.teamTurn === 1 ? 2 : 1;
        setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 1000);
      }
    } else {
      state.streak = 0;
      state.comboMult = 1;
      hudStreak.classList.add("hidden");
      updatePowerMeter(false);
      markDot(state._dotIndex, "lost");
      const missMsg = info.early ? "⏱️ Swung too early!" : info.late ? "⏱️ Swung too late!" : info.wrongLane ? "↔️ Wrong side -- ball went past!" : "You missed the timing on that return.";
      showCaption(missMsg, true);
      playNet();
      vib([20, 20, 20]);
      animateBallAway(false);
      if (state.mode === "team") state.teamTurn = state.teamTurn === 1 ? 2 : 1;
      setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 1000);
    }
  }

  // Rally volley continuation (item 5) -- the robot "returns" the ball for
  // one more exchange; reuses the SAME tick/resolve pipeline, just a
  // little faster to feel like the point is escalating. A miss here is a
  // genuine lost point (no further consolation), a hit proceeds to the
  // normal scoring branch above (volleyUsed is already true so it can't
  // re-trigger another volley).
  function startVolleyFlight() {
    if (state.ended) return;
    state.resolved = false;
    state.ballLane = rollLane();
    state.windActive = false;
    state.rallyDuration = Math.max(400, Math.round(state.rallyDuration * 0.82));
    ball.style.transition = "none";
    ball.style.opacity = "1";
    ball.style.top = "10%";
    ball.style.left = "50%";
    ball.classList.remove("hidden");
    void ball.offsetWidth;
    swingBtn.classList.remove("hidden");
    swingBtn.disabled = false;
    LANES.forEach(l => laneBtns[l].classList.remove("hidden"));
    const [minW, maxW] = effectiveSweetWindow(false);
    sweetZone.style.top = minW + "%";
    sweetZone.style.height = (maxW - minW) + "%";
    swingRacket(racketTop);
    state.rallyRunning = true;
    state.rallyStart = performance.now();
    state._lastTrailTick = -1;
    state.rafId = requestAnimationFrame(rallyTick);
  }

  // Double Serve bonus rally (item 15) -- same shape as Math Hoops'
  // Multiball: a free extra attempt offered after a normal win, no
  // question needed, flat bonus to SCORE only (never pointsWon/qIndex).
  function offerBonusRally() {
    if (state.ended) return;
    showCaption("🎾🎾 Double Serve! One more for a bonus!", false);
    state.bonusRallyActive = true;
    state.letUsedThisPoint = true; // no let on a bonus rally -- keep it snappy
    startRally(state._dotIndex);
  }

  function finishMatch() {
    state.ended = true;
    const points = state.pointsWon;
    const isPerfectMatch = points === ROUND_SIZE;
    const emoji = isPerfectMatch ? "👑" : points >= 9 ? "🏆" : points >= 6 ? "🥳" : points >= 3 ? "🙂" : "💪";
    const title = isPerfectMatch ? "PERFECT MATCH!" : points >= 9 ? "Championship form!" : points >= 6 ? "Great match!" : points >= 3 ? "Nice rallies!" : "Keep practicing!";
    document.getElementById("mt-end-emoji").textContent = emoji;
    document.getElementById("mt-end-title").textContent = title;
    document.getElementById("mt-end-sub").textContent = `You won ${points}/${ROUND_SIZE} points${state.aces ? ` with ${state.aces} ace${state.aces === 1 ? "" : "s"}` : ""}.`;
    // Score roll-up (item 29)
    const scoreEl = document.getElementById("mt-end-score");
    const start = performance.now();
    const target = state.score;
    function tick(now) {
      const t = Math.min(1, ((now || performance.now()) - start) / 650);
      const eased = 1 - Math.pow(1 - t, 3);
      scoreEl.textContent = `⭐ ${Math.round(target * eased)} points`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const teamResultEl = document.getElementById("mt-end-team-result");
    if (state.mode === "team") {
      const p1 = state.teamScores[1], p2 = state.teamScores[2];
      teamResultEl.textContent = p1 === p2 ? `🤝 Tie game! ${p1}-${p2}` : `🏆 Player ${p1 > p2 ? 1 : 2} wins ${Math.max(p1, p2)}-${Math.min(p1, p2)}!`;
      teamResultEl.classList.remove("hidden");
    } else {
      teamResultEl.classList.add("hidden");
    }

    if (isPerfectMatch) { burstConfetti(true); setTimeout(() => burstConfetti(true), 300); }

    const bonusEl = document.getElementById("mt-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardMathTennisBonus(points, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
      if (AIGLeaderboard.touchMathTennisStats) {
        AIGLeaderboard.touchMathTennisStats({ points, total: ROUND_SIZE, bestStreakThisMatch: state.bestStreakThisMatch, aces: state.aces }).catch(() => {});
      }
      if (AIGLeaderboard.getMathTennisAchievements) {
        AIGLeaderboard.getMathTennisAchievements().then(list => {
          renderAchievementBadges("mt-end-achievements", list);
          announceNewAchievements(list);
        }).catch(() => {});
      }
      const rankEl = document.getElementById("mt-end-rank");
      rankEl.textContent = "";
      if (AIGLeaderboard.touchMathTennisWeeklyBest) {
        AIGLeaderboard.touchMathTennisWeeklyBest(points)
          .then(() => AIGLeaderboard.getMathTennisWeeklyRank())
          .then(r => { if (r && r.rank) rankEl.textContent = `🏅 #${r.rank} of ${r.total} this week among your classmates!`; })
          .catch(() => {});
      }
    }
    document.getElementById("mt-end-overlay").classList.remove("hidden");
  }

  function startMatch() {
    state.qIndex = 0;
    state.pointsWon = 0;
    state.score = 0;
    state.aces = 0;
    state.streak = 0;
    state.bestStreakThisMatch = 0;
    state.comboMult = 1;
    state.powerMeter = 0;
    state.powerReady = false;
    state.teamTurn = 1;
    state.teamScores = { 1: 0, 2: 0 };
    state.multiballUsed = false;
    state.bonusRallyActive = false;
    state.volleyUsed = false;
    state.letUsedThisPoint = false;
    state.ended = false;
    state.dotLog = [];
    hudPoints.textContent = 0;
    hudScore.textContent = 0;
    hudStreak.classList.add("hidden");
    powerBar.classList.add("hidden", "full");
    powerFill.style.width = "0%";
    teamResultChip.classList.add("hidden");
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    setRacketLane("center");
    renderProgressDots();
    document.getElementById("mt-end-overlay").classList.add("hidden");
    document.getElementById("mt-start-overlay").classList.add("hidden");
    askQuestion();
  }

  // ---- Settings (item 24) -------------------------------------------------
  function paintSettingsToggles() {
    document.getElementById("mt-settings-sound").classList.toggle("on", soundOn());
    document.getElementById("mt-settings-haptics").classList.toggle("on", hapticsOn());
  }
  document.getElementById("mt-settings-btn").addEventListener("click", () => {
    paintSettingsToggles();
    document.getElementById("mt-settings-overlay").classList.remove("hidden");
  });
  document.getElementById("mt-settings-close-btn").addEventListener("click", () => document.getElementById("mt-settings-overlay").classList.add("hidden"));
  document.getElementById("mt-settings-sound").addEventListener("click", () => {
    try { localStorage.setItem(SOUND_KEY, soundOn() ? "0" : "1"); } catch (e) {}
    paintSettingsToggles();
  });
  document.getElementById("mt-settings-haptics").addEventListener("click", () => {
    try { localStorage.setItem(HAPTICS_KEY, hapticsOn() ? "0" : "1"); } catch (e) {}
    paintSettingsToggles();
  });

  // ---- Tutorial (item 25) -------------------------------------------------
  const TUTORIAL_KEY = "aig_mt_tutorial_seen";
  function showTutorial() { document.getElementById("mt-tutorial-overlay").classList.remove("hidden"); }
  function maybeShowTutorial() {
    let seen = false;
    try { seen = localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (e) {}
    if (!seen) showTutorial();
  }
  document.getElementById("mt-tutorial-link").addEventListener("click", showTutorial);
  document.getElementById("mt-tutorial-close-btn").addEventListener("click", () => {
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch (e) {}
    document.getElementById("mt-tutorial-overlay").classList.add("hidden");
  });
  // Shown automatically before a kid's very first-ever match (same timing
  // as Math Hoops' tutorial -- at page load, independent of tapping Start,
  // so it never fights the question overlay for screen space once a match
  // is already underway).
  maybeShowTutorial();

  // ---- Mode toggles (items 11+13) -----------------------------------------
  document.querySelectorAll(".mt-mode-opt").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".mt-mode-opt").forEach(b => b.classList.remove("sel"));
    btn.classList.add("sel");
    state.mode = btn.dataset.mode;
  }));

  // `rng()` -- no seeded daily mode in this round (no Daily Challenge was
  // pitched for Math Tennis), so this is just Math.random directly, kept
  // as its own function for a consistent call-site style with Math Hoops.
  function rng() { return Math.random(); }

  swingBtn.addEventListener("click", onSwing);
  document.getElementById("mt-start-btn").addEventListener("click", startMatch);
  document.getElementById("mt-play-again-btn").addEventListener("click", startMatch);
}
