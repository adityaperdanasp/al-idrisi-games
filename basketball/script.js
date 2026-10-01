/* =================================================================
   Math Hoops — answer a question to earn a shot, then drag the ball
   up toward the hoop and let go to fire a projectile arc at it.

   Reuses MathVille's generators.js (window.MATHVILLE_GENERATORS) for
   question content instead of a new question bank -- those are pure
   functions with no DOM dependency, so loading that one file here is
   enough, no need to pull in all of mathville/script.js. Reuses
   leaderboard.js's recordTopicAttempt("basketball", ...) for currency/
   streak/mastery tracking exactly like every other game already does --
   "basketball" is just a new gameId string, nothing to register first.

   Round 1 polish pass (50 items) added: a real points system (2pt/3pt +
   streak/trick-shot/contested/perfect-arc bonuses), lifetime stats +
   achievements + weekly/Daily Challenge leaderboards (all mirroring
   Ninja Runner's equivalent leaderboard.js functions), ball/court
   cosmetics, and a long list of visual/UX feedback (crowd, scoreboard,
   confetti, trail, shadow, moving hoop, defender, countdown, etc.) --
   search each comment tag like "item 7" to find its matching entry in
   the brainstorm list.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("bh-signedout-overlay").classList.remove("hidden");
  document.getElementById("bh-start-overlay").classList.add("hidden");
} else {
  initBasketball();
}

function initBasketball() {
  const ROUND_SIZE = 10;
  // place-value excluded -- its distractors need to be OTHER place values
  // of the same digit (see mathville/script.js's buildPlaceValueMc), not
  // generic jittered numbers, and that's more machinery than this mini-
  // game's own question flow needs.
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const DIFFICULTY = "medium";

  // Daily Challenge (round 1, item 26) -- `?daily=1` deep-link, same
  // convention as the hub's other `?ninja=1`-style query flags. Seeds a
  // SMALL, scoped set of random calls (ball spawn X, defender/moving-hoop
  // rolls) with a deterministic per-day PRNG, same scoping choice Ninja
  // Runner's own Daily Challenge made -- the actual question CONTENT still
  // comes from MATHVILLE_GENERATORS, which calls the shared Math.random()
  // internally and can't be intercepted without changing that shared file,
  // so "same for everyone today" here means the same shot layout/twists,
  // not byte-identical question text.
  const isDaily = new URLSearchParams(location.search).get("daily") === "1";
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  const dailyRng = isDaily ? mulberry32(dailySeed()) : null;
  function rng() { return dailyRng ? dailyRng() : Math.random(); }

  // ---- Shot physics --------------------------------------------------
  // Deliberately NOT "power scales with how far you drag" -- that coupled
  // vertical power and horizontal aim together (a raw angle-based vx/vy
  // split), and because height is quadratically sensitive to vertical
  // velocity, even a small angle change caused the ball to undershoot AND
  // drift wildly off-course over the resulting longer, floppier flight.
  // Verified numerically (see chat) before landing on this: vertical
  // power is FIXED (any properly-upward drag gets the exact same arc,
  // which reliably reaches the hoop's height on both the way up and the
  // way down -- two scoring windows per shot), and only the HORIZONTAL
  // drag component steers left/right independently. This makes the skill
  // "aim your drag toward the hoop" (which matters since the ball spawns
  // at a random x each shot) rather than "guess the exact right power."
  // Round 1, item 12 ("shot power variation") deliberately does NOT touch
  // VERTICAL_POWER for this exact reason -- see the drag power METER
  // (visual-only, see onDragMove) instead of a real power dial.
  const GRAVITY = 0.17;            // %-of-court-height per frame^2
  const VERTICAL_POWER = 5.3;      // fixed upward launch speed for any valid shot
  const HORIZONTAL_SENSITIVITY = 0.018; // how much sideways drag becomes sideways velocity
  const MAX_HORIZONTAL_VELOCITY = 2.2;  // clamp so an extreme sideways drag can't send it flying wildly off-screen
  const MIN_UPWARD_DRAG_PCT = 8;   // drags weaker/less-upward than this don't count as a real shot attempt
  const SHOT_TIME_LIMIT_MS = 6000;
  const BALL_SPAWN_Y = 84;
  const HOOP_X = 50, HOOP_TOL_X = 8, HOOP_TOL_Y_MIN = 6, HOOP_TOL_Y_MAX = 18;

  // ---- Scoring (round 1 -- was just a made/total counter before) -----
  const THREE_PT_DIST = 12;         // spawn distance from center counting as a 3-pointer (item 11)
  const TRICK_SHOT_DIST = 15;       // even further out = a bonus "deep range" call-out (item 17)
  const TRICK_SHOT_BONUS = 3;
  const PERFECT_ARC_TOL_X = HOOP_TOL_X * 0.35; // dead-center sub-tolerance for "nothing but net" (item 19)
  const PERFECT_ARC_BONUS = 5;
  const STREAK_BONUS_TIERS = [[3, 2], [5, 5], [8, 10]]; // item 15, same flat-tier shape as Ninja Runner's streak bonus
  function streakBonusFor(streak) {
    let bonus = 0;
    for (const [need, pts] of STREAK_BONUS_TIERS) if (streak >= need) bonus = pts;
    return bonus;
  }
  const CONTESTED_CHANCE = 0.22;    // item 13 -- decorative defender, bonus only if a shot still lands while it's up
  const CONTESTED_BONUS = 3;
  const MOVING_HOOP_CHANCE = 0.18;  // item 14
  const MOVING_HOOP_RANGE = 9;      // max %-of-court the hoop drifts from center
  const BUZZER_MULT = 2;            // item 16/20 -- the round's final shot doubles everything it earns

  const court = document.getElementById("bh-court");
  const ball = document.getElementById("bh-ball");
  const ballShadow = document.getElementById("bh-ball-shadow");
  const net = document.getElementById("bh-net");
  const rim = document.getElementById("bh-rim");
  const backboard = document.getElementById("bh-backboard");
  const defenderEl = document.getElementById("bh-defender");
  const hint = document.getElementById("bh-hint");
  const aimLine = document.getElementById("bh-aim-line");
  const timerRing = document.getElementById("bh-timer-ring");
  const toastEl = document.getElementById("bh-toast");
  const subtoastEl = document.getElementById("bh-subtoast");
  const pbBanner = document.getElementById("bh-pb-banner");
  const nextBar = document.getElementById("bh-next-bar");
  const countdownEl = document.getElementById("bh-countdown");

  const hudMade = document.getElementById("bh-hud-made");
  const hudTotal = document.getElementById("bh-hud-total");
  const hudStreak = document.getElementById("bh-hud-streak");
  const hudCoins = document.getElementById("bh-hud-coins");
  const hudGems = document.getElementById("bh-hud-gems");
  const chipMade = document.getElementById("bh-chip-made");
  const chipStreak = document.getElementById("bh-chip-streak");
  const chipWallet = document.getElementById("bh-chip-wallet");
  const sbMade = document.getElementById("bh-sb-made");
  const sbTotal = document.getElementById("bh-sb-total");
  const sbPoints = document.getElementById("bh-sb-points");

  hudTotal.textContent = ROUND_SIZE;
  sbTotal.textContent = ROUND_SIZE;

  // Crowd silhouette (round 1, item 1) -- a fixed row of decorative divs,
  // built once, never touched again by JS after this.
  (function buildCrowd() {
    const crowd = document.getElementById("bh-crowd");
    crowd.innerHTML = Array.from({ length: 24 }, () => "<i></i>").join("");
  })();

  const state = {
    qIndex: 0,
    made: 0,
    streak: 0,
    bestStreakThisRound: 0,
    points: 0,
    ballX: 50,
    ballY: BALL_SPAWN_Y,
    vx: 0,
    vy: 0,
    flying: false,
    scored: false,
    dragging: false,
    dragStartClient: null,
    dragStartBallPct: null,
    shotTimeoutId: null,
    rafId: null,
    ended: false,
    daily: isDaily,
    contested: false,
    hoopMoving: false,
    hoopX: HOOP_X,
    minDistToHoop: Infinity,
    shotStartAt: 0
  };

  function rand(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // HUD chip pop (round 1, item 31) -- force-reflow restart, same pattern
  // used throughout the hub for re-triggerable CSS animations.
  function popChip(el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }

  if (window.AIGLeaderboard) {
    AIGLeaderboard.watchWallet(wallet => {
      hudCoins.textContent = wallet.coins || 0;
      hudGems.textContent = wallet.gems || 0;
      popChip(chipWallet);
    });
  }

  // ---- Cosmetics (round 1, items 21-22) -------------------------------
  function applyBallSkin(id) { ball.dataset.skin = id; }
  function applyCourtSkin(id) { court.dataset.courtSkin = id; }
  function renderSwatches(containerId, catalogKey, applyFn) {
    const wrap = document.getElementById(containerId);
    if (!window.AIGLeaderboard || !AIGLeaderboard.getCosmetics) { wrap.innerHTML = ""; return; }
    AIGLeaderboard.getCosmetics().then(cos => {
      const catalog = cos.costumes[catalogKey];
      const equipped = cos.equippedCostumes[catalogKey];
      const owned = catalog.filter(c => c.owned);
      wrap.innerHTML = owned.map(c => `<button type="button" class="bh-swatch ${c.id === equipped ? "sel" : ""}" data-id="${c.id}" title="${c.name}">${c.preview}</button>`).join("");
      wrap.querySelectorAll(".bh-swatch").forEach(b => b.onclick = async () => {
        const id = b.dataset.id;
        await AIGLeaderboard.equipCosmetic(catalogKey, id);
        applyFn(id);
        renderSwatches(containerId, catalogKey, applyFn);
      });
      const current = owned.find(c => c.id === equipped);
      if (current) applyFn(current.id);
    }).catch(() => {});
  }
  renderSwatches("bh-ball-swatches", "basketball-ball", applyBallSkin);
  renderSwatches("bh-court-swatches", "basketball-court", applyCourtSkin);

  // ---- Lifetime stats + achievements (round 1, item 23-24) ------------
  let lifetimeBestRoundMade = 0;
  function renderAchievementBadges(containerId, list) {
    const el = document.getElementById(containerId);
    if (!list || !list.length) { el.innerHTML = ""; return; }
    el.innerHTML = list.map(a => `<span class="bh-ach-badge ${a.unlocked ? "unlocked" : ""}" title="${a.name}${a.unlocked ? "" : " (locked)"}">${a.emoji}</span>`).join("");
  }
  if (window.AIGLeaderboard) {
    if (AIGLeaderboard.getBasketballLifetimeSummary) {
      AIGLeaderboard.getBasketballLifetimeSummary().then(d => {
        lifetimeBestRoundMade = d.bestRoundMade || 0;
        const row = document.getElementById("bh-lifetime-row");
        if (d.roundsPlayed > 0) {
          row.textContent = `🏅 Best round: ${d.bestRoundMade}/${ROUND_SIZE} · Lifetime makes: ${d.totalMakes}`;
          row.classList.remove("hidden");
        }
      }).catch(() => {});
    }
    if (AIGLeaderboard.getBasketballAchievements) {
      AIGLeaderboard.getBasketballAchievements().then(list => renderAchievementBadges("bh-start-achievements", list)).catch(() => {});
    }
  }

  // ---- Toasts ----------------------------------------------------------
  function showToast(text, isMiss) {
    toastEl.textContent = text;
    toastEl.classList.remove("show", "miss");
    void toastEl.offsetWidth;
    if (isMiss) toastEl.classList.add("miss");
    toastEl.classList.add("show");
  }
  function showSubtoast(text) {
    subtoastEl.textContent = text;
    subtoastEl.classList.remove("show");
    void subtoastEl.offsetWidth;
    subtoastEl.classList.add("show");
  }

  function updateHud() {
    hudMade.textContent = state.made;
    sbMade.textContent = state.made;
    sbPoints.textContent = `${state.points} PTS`;
    popChip(chipMade);
    hudStreak.textContent = state.streak;
    // Streak flame growing with streak (round 1, item 36)
    const tier = state.streak >= 8 ? 3 : state.streak >= 5 ? 2 : state.streak >= 3 ? 1 : 0;
    if (tier > 0) chipStreak.dataset.tier = String(tier); else delete chipStreak.dataset.tier;
    popChip(chipStreak);
  }

  function placeBall(xPct, yPct) {
    state.ballX = xPct;
    state.ballY = yPct;
    ball.style.left = xPct + "%";
    ball.style.top = yPct + "%";
    ball.style.transform = `translate(-50%, -50%) rotate(${(performance.now() / 6) % 360}deg)`;
    // Ball shadow (round 1, item 9) -- bigger/darker near the floor,
    // smaller/fainter at the peak of the arc, purely a CSS var driven by
    // how close ballY is to the floor vs its highest point this flight.
    ballShadow.style.left = xPct + "%";
    const heightFrac = Math.max(0, Math.min(1, (BALL_SPAWN_Y - yPct) / 70));
    ballShadow.style.setProperty("--bh-shadow-scale", String(1 - heightFrac * 0.5));
  }

  // Ball trail (round 1, item 8) -- spawned every few frames during
  // flight only (see launchShot's step()), never during drag/idle.
  function spawnTrailDot(xPct, yPct) {
    const dot = document.createElement("div");
    dot.className = "bh-trail-dot";
    dot.style.left = xPct + "%";
    dot.style.top = yPct + "%";
    court.appendChild(dot);
    setTimeout(() => dot.remove(), 420);
  }

  // Confetti (round 1, item 5) -- lightweight DOM particles, no new
  // library/asset. Only for a genuine 3+ streak make, not every swish.
  const CONFETTI_COLORS = ["#E4772E", "#3F8F5F", "#ffce6b", "#3a6ea5", "#D64545"];
  function burstConfetti() {
    for (let i = 0; i < 16; i++) {
      const piece = document.createElement("div");
      piece.className = "bh-confetti-piece";
      piece.style.left = (40 + Math.random() * 20) + "%";
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = (Math.random() * 150) + "ms";
      piece.style.transform = `translateX(${(Math.random() - 0.5) * 120}px)`;
      court.appendChild(piece);
      setTimeout(() => piece.remove(), 1300);
    }
  }

  function resetBallForNextShot() {
    state.flying = false;
    state.scored = false;
    state.vx = 0;
    state.vy = 0;
    state.minDistToHoop = Infinity;
    placeBall(rand(32, 68), BALL_SPAWN_Y);
    ball.classList.remove("hidden");
    ballShadow.classList.remove("hidden");

    // Moving hoop (round 1, item 14) -- never on the Buzzer Beater shot
    // (that one already shrinks the hoop, see offerShot/launchShot), rolled
    // fresh each regular shot. Drifts smoothly over the shot's time limit;
    // the collision check in launchShot reads state.hoopX, never the
    // HOOP_X constant directly, so this never needs its own special-cased
    // physics branch.
    // `qIndex` has ALREADY been incremented by handleAnswer before this
    // runs (same tick's correct-answer branch), so by the time shot #10
    // (the round's last) is being set up, qIndex is already 10 (ROUND_SIZE)
    // -- matching launchShot's own isLastShot check below exactly, not
    // ROUND_SIZE - 1 (that would fire one shot too early).
    const isLastShot = state.qIndex === ROUND_SIZE;
    state.hoopMoving = !isLastShot && rng() < MOVING_HOOP_CHANCE;
    state.hoopX = HOOP_X;
    if (!state.hoopMoving) setHoopX(HOOP_X, false);

    // Contested shot / defender (round 1, item 13) -- decorative only,
    // never on the Buzzer Beater (keeps that climax shot's own feedback
    // uncluttered).
    state.contested = !isLastShot && rng() < CONTESTED_CHANCE;
    defenderEl.classList.toggle("show", state.contested);

    // Buzzer Beater (round 1, items 16+20) -- the round's final shot: a
    // shrunk, doubled-value shot with its own countdown ring urgency.
    rim.classList.toggle("buzzer", isLastShot);
    net.classList.toggle("buzzer", isLastShot);
  }

  function setHoopX(x, animated) {
    state.hoopX = x;
    backboard.style.left = x + "%";
    rim.style.left = x + "%";
    net.style.left = x + "%";
  }

  function finishShot() {
    ball.classList.add("hidden");
    ballShadow.classList.add("hidden");
    timerRing.classList.add("hidden");
  }

  // Next-question mini progress bar (round 1, item 49) -- fills over the
  // exact pause duration passed in, so the post-shot beat never reads as
  // a frozen screen.
  function runNextBar(ms) {
    nextBar.style.animationDuration = ms + "ms";
    nextBar.classList.remove("run");
    void nextBar.offsetWidth;
    nextBar.classList.add("run");
  }

  // Same MC-building approach as mathville/script.js's buildQuickMc --
  // jittered numeric distractors around the correct answer, except the
  // one generator (measurement's "compare" kind) whose answer is a
  // </=/> symbol rather than a number, handled the same special-cased
  // way buildQuickMc does.
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

  function rollQuestion() {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](DIFFICULTY);
    return { key, ...buildMc(raw) };
  }

  function askNextQuestion() {
    if (state.ended) return;
    if (state.qIndex >= ROUND_SIZE) { finishRound(); return; }
    const q = rollQuestion();
    state.currentQ = q;
    document.getElementById("bh-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("bh-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "bh-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("bh-question-overlay").classList.remove("hidden");
  }

  function handleAnswer(btn, opt, q) {
    const isCorrect = opt === q.correctLabel;
    const grid = document.getElementById("bh-q-grid");
    grid.querySelectorAll(".bh-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("basketball", q.key, isCorrect);
    state.qIndex++;
    updateHud();

    setTimeout(() => {
      document.getElementById("bh-question-overlay").classList.add("hidden");
      if (isCorrect) {
        resetBallForNextShot();
        offerShot();
      } else {
        state.streak = 0;
        updateHud();
        showToast("❌ No shot this time", true);
        runNextBar(900);
        setTimeout(askNextQuestion, 900);
      }
    }, 700);
  }

  function offerShot() {
    hint.classList.remove("hidden");
    enableDrag();
    state.shotStartAt = performance.now();
    timerRing.classList.remove("hidden");
    timerRing.style.setProperty("--bh-timer-pct", "100%");
    tickTimerRing();
    state.shotTimeoutId = setTimeout(() => {
      // Ran out of time -- count as a miss, same as an airball, rather
      // than stalling the round forever waiting for a shot that never
      // comes.
      if (!state.flying && !ball.classList.contains("hidden")) {
        disableDrag();
        hint.classList.add("hidden");
        launchShot(0, -3); // a weak forced shot, guaranteed to fall short
      }
    }, SHOT_TIME_LIMIT_MS);
  }

  // Countdown ring (round 1, item 41) -- a conic-gradient ring around the
  // ball that depletes over the shot timer, stopped once the ball is
  // hidden (flying, or a new question started).
  function tickTimerRing() {
    if (ball.classList.contains("hidden") || state.flying) return;
    const pct = Math.max(0, 1 - (performance.now() - state.shotStartAt) / SHOT_TIME_LIMIT_MS);
    timerRing.style.setProperty("--bh-timer-pct", (pct * 100) + "%");
    requestAnimationFrame(tickTimerRing);
  }

  // ---- Drag-to-shoot ----------------------------------------------------
  function enableDrag() {
    ball.addEventListener("pointerdown", onDragStart);
  }
  function disableDrag() {
    ball.removeEventListener("pointerdown", onDragStart);
  }

  function courtRect() { return court.getBoundingClientRect(); }

  function onDragStart(e) {
    if (state.flying) return;
    e.preventDefault();
    state.dragging = true;
    ball.classList.add("dragging");
    // Best-effort -- keeps the drag tracking the pointer even if it slides
    // off the (small) ball element mid-gesture. Wrapped since some
    // synthetic/edge-case pointer sessions can reject capture entirely;
    // the drag still works via the document-level move/up listeners below
    // either way, capture is just extra robustness, not a requirement.
    try { ball.setPointerCapture(e.pointerId); } catch (err) {}
    state.dragStartClient = { x: e.clientX, y: e.clientY };
    state.dragStartBallPct = { x: state.ballX, y: state.ballY };
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
  }

  function onDragMove(e) {
    if (!state.dragging) return;
    const rect = courtRect();
    const dxPx = e.clientX - state.dragStartClient.x;
    const dyPx = e.clientY - state.dragStartClient.y;
    const dxPct = (dxPx / rect.width) * 100;
    const dyPct = (dyPx / rect.height) * 100;
    const x = state.dragStartBallPct.x + dxPct;
    const y = state.dragStartBallPct.y + dyPct;
    placeBall(x, y);
    // Aim line from the ball back to where the drag started, so the kid
    // can see the pull direction/distance before releasing -- same visual
    // language as a slingshot aim indicator.
    const len = Math.hypot(dxPx, dyPx);
    const angle = Math.atan2(dyPx, dxPx) * (180 / Math.PI);
    aimLine.style.left = x + "%";
    aimLine.style.top = y + "%";
    aimLine.style.width = Math.min(len, rect.width * 0.4) + "px";
    aimLine.style.transform = `rotate(${angle + 180}deg)`;
    aimLine.classList.remove("hidden");
    // Aim-line color feedback (round 1, item 40) -- green while the pull
    // is reasonably upward AND not wildly off to one side, red otherwise.
    // Cosmetic only -- the actual launch math below is unaffected.
    const reasonablyAimed = -dyPct >= MIN_UPWARD_DRAG_PCT && Math.abs(dxPct) < 40;
    aimLine.classList.toggle("aim-good", reasonablyAimed);
    aimLine.classList.toggle("aim-bad", !reasonablyAimed);
  }

  function onDragEnd(e) {
    if (!state.dragging) return;
    state.dragging = false;
    ball.classList.remove("dragging");
    aimLine.classList.add("hidden");
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    const rect = courtRect();
    const dxPx = e.clientX - state.dragStartClient.x;
    const dyPx = e.clientY - state.dragStartClient.y;
    const dxPct = (dxPx / rect.width) * 100;
    const dyPct = (dyPx / rect.height) * 100;
    clearTimeout(state.shotTimeoutId);
    disableDrag();
    hint.classList.add("hidden");
    // Slingshot-style snap-back: onDragMove visually moves the ball to
    // follow the finger while aiming, but the shot itself must always
    // launch from the SAME fixed spot regardless of how far it was pulled
    // -- otherwise a long pull-back (which also drags the ball further
    // toward the hoop) starts the physics simulation that much closer to
    // the target, silently overshooting despite using the exact same fixed
    // VERTICAL_POWER. Without this, drag distance secretly leaked back
    // into "power" through the launch position instead of being ignored.
    placeBall(state.dragStartBallPct.x, state.dragStartBallPct.y);
    // A drag that isn't meaningfully upward (too short, or dragged sideways/
    // down instead) doesn't count as a real shot attempt -- launch a weak,
    // guaranteed-miss airball rather than silently doing nothing (the
    // question was already answered, so this shot attempt is spent either
    // way; better to show *something* than leave the kid wondering why
    // nothing happened).
    if (-dyPct < MIN_UPWARD_DRAG_PCT) { launchShot(0, -2); return; }
    const vx = Math.max(-MAX_HORIZONTAL_VELOCITY, Math.min(MAX_HORIZONTAL_VELOCITY, dxPct * HORIZONTAL_SENSITIVITY));
    launchShot(vx, -VERTICAL_POWER);
  }

  function launchShot(vx, vy) {
    state.vx = vx;
    state.vy = vy;
    state.flying = true;
    state.scored = false;
    // Shot value is fixed at the moment of launch, from where the ball
    // rested before this shot (its spawn spot) -- distance-from-center
    // classifies 2pt vs 3pt (item 11) / deep-range trick-shot bonus
    // (item 17), same "measured at launch, not at landing" rule a real
    // 3-point line uses.
    const launchX = state.dragStartBallPct ? state.dragStartBallPct.x : state.ballX;
    const launchDistFromCenter = Math.abs(launchX - HOOP_X);
    const shotValue = launchDistFromCenter >= THREE_PT_DIST ? 3 : 2;
    const isTrickShot = launchDistFromCenter >= TRICK_SHOT_DIST;
    const isLastShot = state.qIndex === ROUND_SIZE;
    const hoopMoveStart = performance.now();
    const hoopMoveTarget = HOOP_X + (rand(0, 1) ? 1 : -1) * MOVING_HOOP_RANGE;
    let frames = 0;
    function step() {
      if (state.ended) return;
      frames++;
      state.vy += GRAVITY;
      const nx = state.ballX + state.vx;
      const ny = state.ballY + state.vy;
      placeBall(nx, ny);
      if (frames % 3 === 0) spawnTrailDot(nx, ny); // item 8 -- every 3rd frame keeps the trail readable, not a solid smear

      // Moving hoop (item 14) -- drifts smoothly across the flight window;
      // reads elapsed time against the full shot timer so a late release
      // still sees a consistent drift rather than jumping suddenly.
      if (state.hoopMoving) {
        const t = Math.min(1, (performance.now() - hoopMoveStart) / SHOT_TIME_LIMIT_MS);
        setHoopX(HOOP_X + (hoopMoveTarget - HOOP_X) * Math.sin(t * Math.PI), true);
      }

      const distToHoop = Math.hypot((nx - state.hoopX) / HOOP_TOL_X, (ny - 12) / 10);
      if (distToHoop < state.minDistToHoop) state.minDistToHoop = distToHoop;

      const inHoopX = Math.abs(nx - state.hoopX) < HOOP_TOL_X;
      const inHoopY = ny > HOOP_TOL_Y_MIN && ny < HOOP_TOL_Y_MAX;
      if (!state.scored && inHoopX && inHoopY) {
        state.scored = true;
        handleMake(shotValue, isTrickShot, Math.abs(nx - state.hoopX), isLastShot);
        return;
      }
      // Backboard flash (item 10) -- purely cosmetic, triggers once if the
      // ball's path passes close behind where the backboard sits, never
      // alters vx/vy/trajectory.
      if (ny < 10 && Math.abs(nx - state.hoopX) < 16 && !backboard.classList.contains("flash")) {
        backboard.classList.add("flash");
        setTimeout(() => backboard.classList.remove("flash"), 300);
      }
      if (ny > 106 || ny < -15 || nx < -15 || nx > 115 || frames > 240) {
        if (!state.scored) handleMiss(isLastShot);
        return;
      }
      state.rafId = requestAnimationFrame(step);
    }
    state.rafId = requestAnimationFrame(step);
  }

  function handleMake(shotValue, isTrickShot, edgeDist, isLastShot) {
    state.flying = false;
    state.made++;
    state.streak++;
    if (state.streak > state.bestStreakThisRound) state.bestStreakThisRound = state.streak;

    const streakBonus = streakBonusFor(state.streak);
    const isPerfect = edgeDist < PERFECT_ARC_TOL_X;
    let gained = shotValue + streakBonus;
    if (isTrickShot) gained += TRICK_SHOT_BONUS;
    if (isPerfect) gained += PERFECT_ARC_BONUS;
    if (state.contested) gained += CONTESTED_BONUS;
    if (isLastShot) gained *= BUZZER_MULT;
    state.points += gained;

    updateHud();
    finishShot();
    net.classList.remove("swish", "perfect");
    void net.offsetWidth;
    net.classList.add(isPerfect ? "perfect" : "swish");
    // Rim wobble (item 7) -- only on a non-perfect make (grazed the
    // tolerance edge), a clean dead-center swish doesn't get it.
    if (!isPerfect) { rim.classList.remove("wobble"); void rim.offsetWidth; rim.classList.add("wobble"); }
    // Screen shake / camera punch (item 6)
    court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch");
    try { if (navigator.vibrate) navigator.vibrate(isLastShot ? [40, 30, 60] : 40); } catch (e) {} // item 43

    const mainMsg = isLastShot ? `🚨 BUZZER BEATER! +${gained}` : isPerfect ? "💯 Nothing but net!" : state.streak >= 3 ? `🔥 SWISH! (${state.streak} in a row!)` : "🏀 SWISH!";
    showToast(mainMsg, false);
    if (isTrickShot) showSubtoast(`🎯 Deep range! +${TRICK_SHOT_BONUS}`);
    else if (state.contested) showSubtoast(`🛡️ Contested shot! +${CONTESTED_BONUS}`);
    else if (shotValue === 3) showSubtoast("3-pointer!");

    // Confetti (item 5) -- only a genuine streak of 3+, not every make.
    if (state.streak >= 3) burstConfetti();

    defenderEl.classList.remove("show");
    rim.classList.remove("buzzer"); net.classList.remove("buzzer");
    if (state.hoopMoving) setHoopX(HOOP_X, false);
    setTimeout(askNextQuestion, 1000);
  }

  function handleMiss(isLastShot) {
    state.flying = false;
    state.streak = 0;
    updateHud();
    finishShot();
    // Airball vs rim-out (item 18) -- distinguished by the CLOSEST the
    // ball ever got to the hoop during its whole flight (minDistToHoop,
    // a unitless ratio where < 1 roughly means "within the hoop's own
    // tolerance box at some point"), not just where it ended up.
    const wasClose = state.minDistToHoop < 1.6;
    showToast(wasClose ? "So close! Rim out." : "Airball!", true);
    court.classList.remove("miss-vignette"); void court.offsetWidth; court.classList.add("miss-vignette"); // item 47
    try { if (navigator.vibrate) navigator.vibrate([20, 20, 20]); } catch (e) {} // item 43, distinct pattern from a make
    defenderEl.classList.remove("show");
    rim.classList.remove("buzzer"); net.classList.remove("buzzer");
    if (state.hoopMoving) setHoopX(HOOP_X, false);
    runNextBar(900);
    setTimeout(askNextQuestion, 900);
  }

  function finishRound() {
    state.ended = true;
    finishShot();
    hint.classList.add("hidden");
    const made = state.made;
    const emoji = made >= 9 ? "🏆" : made >= 6 ? "🥳" : made >= 3 ? "🙂" : "💪";
    const title = made >= 9 ? "All-Star shootaround!" : made >= 6 ? "Great shootaround!" : made >= 3 ? "Nice try!" : "Keep practicing!";
    document.getElementById("bh-end-emoji").textContent = emoji;
    document.getElementById("bh-end-title").textContent = title;
    document.getElementById("bh-end-sub").textContent = `You made ${made}/${ROUND_SIZE} shots.`;
    document.getElementById("bh-end-points").textContent = `⭐ ${state.points} points`;
    const bonusEl = document.getElementById("bh-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardBasketballRoundBonus(made, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});

      // New personal best (round 1, item 42) -- compared against the
      // lifetime bestRoundMade fetched at start-screen load time.
      if (made > lifetimeBestRoundMade) {
        pbBanner.textContent = "🌟 New personal best!";
        pbBanner.classList.remove("show"); void pbBanner.offsetWidth; pbBanner.classList.add("show");
      }

      if (AIGLeaderboard.touchBasketballStats) {
        AIGLeaderboard.touchBasketballStats({ made, total: ROUND_SIZE, bestStreakThisRound: state.bestStreakThisRound }).catch(() => {});
      }
      if (AIGLeaderboard.getBasketballAchievements) {
        AIGLeaderboard.getBasketballAchievements().then(list => renderAchievementBadges("bh-end-achievements", list)).catch(() => {});
      }

      const rankEl = document.getElementById("bh-end-rank");
      rankEl.textContent = "";
      if (state.daily && AIGLeaderboard.touchBasketballDailyChallenge) {
        AIGLeaderboard.touchBasketballDailyChallenge(made)
          .then(() => AIGLeaderboard.getBasketballDailyChallengeRank())
          .then(r => { if (r && r.rank) rankEl.textContent = `📅 Today's Daily Challenge: #${r.rank} of ${r.total}!`; })
          .catch(() => {});
      } else if (!state.daily && AIGLeaderboard.touchBasketballWeeklyBest) {
        AIGLeaderboard.touchBasketballWeeklyBest(made)
          .then(() => AIGLeaderboard.getBasketballWeeklyRank())
          .then(r => { if (r && r.rank) rankEl.textContent = `🏅 #${r.rank} of ${r.total} this week among your classmates!`; })
          .catch(() => {});
      }
    }
    document.getElementById("bh-end-overlay").classList.remove("hidden");
  }

  // Pre-round countdown (round 1, item 45) -- "3...2...1...Shoot!" before
  // the very first question of a round, purely cosmetic beat.
  function playCountdown(onDone) {
    const steps = ["3", "2", "1", "Shoot!"];
    countdownEl.classList.remove("hidden");
    let i = 0;
    function next() {
      if (i >= steps.length) { countdownEl.classList.add("hidden"); onDone(); return; }
      countdownEl.innerHTML = `<span>${steps[i]}</span>`;
      i++;
      setTimeout(next, i === steps.length ? 500 : 550);
    }
    next();
  }

  // Arena lighting (round 1, item 3) -- rolled once per round, purely a
  // CSS filter swap, never touches layout/physics.
  function rollLighting() {
    const options = ["day", "dusk", "night"];
    court.dataset.lighting = options[rand(0, options.length - 1)];
  }

  function startRound() {
    state.qIndex = 0;
    state.made = 0;
    state.streak = 0;
    state.bestStreakThisRound = 0;
    state.points = 0;
    state.ended = false;
    updateHud();
    rollLighting();
    document.getElementById("bh-end-overlay").classList.add("hidden");
    document.getElementById("bh-start-overlay").classList.add("hidden");
    playCountdown(askNextQuestion);
  }

  document.getElementById("bh-start-btn").addEventListener("click", () => { state.daily = false; startRound(); });
  document.getElementById("bh-daily-btn").addEventListener("click", () => { state.daily = true; startRound(); });
  document.getElementById("bh-play-again-btn").addEventListener("click", startRound);

  // A direct `?daily=1` launch starts straight into Daily Challenge rather
  // than making the kid tap the button too (same deep-link convention as
  // the hub's other `?x=1` entry points).
  if (isDaily) document.getElementById("bh-daily-btn").click();
}
