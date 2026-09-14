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
  const GRAVITY = 0.17;            // %-of-court-height per frame^2
  const VERTICAL_POWER = 5.3;      // fixed upward launch speed for any valid shot
  const HORIZONTAL_SENSITIVITY = 0.018; // how much sideways drag becomes sideways velocity
  const MAX_HORIZONTAL_VELOCITY = 2.2;  // clamp so an extreme sideways drag can't send it flying wildly off-screen
  const MIN_UPWARD_DRAG_PCT = 8;   // drags weaker/less-upward than this don't count as a real shot attempt
  const SHOT_TIME_LIMIT_MS = 6000;
  const BALL_SPAWN_Y = 84;
  const HOOP_X = 50, HOOP_TOL_X = 8, HOOP_TOL_Y_MIN = 6, HOOP_TOL_Y_MAX = 18;

  const court = document.getElementById("bh-court");
  const ball = document.getElementById("bh-ball");
  const net = document.getElementById("bh-net");
  const hint = document.getElementById("bh-hint");
  const aimLine = document.getElementById("bh-aim-line");
  const toastEl = document.getElementById("bh-toast");

  const hudMade = document.getElementById("bh-hud-made");
  const hudTotal = document.getElementById("bh-hud-total");
  const hudStreak = document.getElementById("bh-hud-streak");
  const hudCoins = document.getElementById("bh-hud-coins");
  const hudGems = document.getElementById("bh-hud-gems");

  hudTotal.textContent = ROUND_SIZE;

  const state = {
    qIndex: 0,
    made: 0,
    streak: 0,
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
    ended: false
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

  function placeBall(xPct, yPct) {
    state.ballX = xPct;
    state.ballY = yPct;
    ball.style.left = xPct + "%";
    ball.style.top = yPct + "%";
    ball.style.transform = `translate(-50%, -50%) rotate(${(performance.now() / 6) % 360}deg)`;
  }

  function resetBallForNextShot() {
    state.flying = false;
    state.scored = false;
    state.vx = 0;
    state.vy = 0;
    placeBall(rand(32, 68), BALL_SPAWN_Y);
    ball.classList.remove("hidden");
  }

  function showToast(text, isMiss) {
    toastEl.textContent = text;
    toastEl.classList.remove("show", "miss");
    void toastEl.offsetWidth;
    if (isMiss) toastEl.classList.add("miss");
    toastEl.classList.add("show");
  }

  function updateHud() {
    hudMade.textContent = state.made;
    hudStreak.textContent = state.streak;
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
        setTimeout(askNextQuestion, 900);
      }
    }, 700);
  }

  function offerShot() {
    hint.classList.remove("hidden");
    enableDrag();
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
    ball.setPointerCapture(e.pointerId);
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
    let frames = 0;
    function step() {
      if (state.ended) return;
      frames++;
      state.vy += GRAVITY;
      const nx = state.ballX + state.vx;
      const ny = state.ballY + state.vy;
      placeBall(nx, ny);

      const inHoopX = Math.abs(nx - HOOP_X) < HOOP_TOL_X;
      const inHoopY = ny > HOOP_TOL_Y_MIN && ny < HOOP_TOL_Y_MAX;
      if (!state.scored && inHoopX && inHoopY) {
        state.scored = true;
        handleMake();
        return;
      }
      if (ny > 106 || ny < -15 || nx < -15 || nx > 115 || frames > 240) {
        if (!state.scored) handleMiss();
        return;
      }
      state.rafId = requestAnimationFrame(step);
    }
    state.rafId = requestAnimationFrame(step);
  }

  function handleMake() {
    state.flying = false;
    state.made++;
    state.streak++;
    updateHud();
    ball.classList.add("hidden");
    net.classList.remove("swish");
    void net.offsetWidth;
    net.classList.add("swish");
    showToast(state.streak >= 3 ? `🔥 SWISH! (${state.streak} in a row!)` : "🏀 SWISH!", false);
    setTimeout(askNextQuestion, 1000);
  }

  function handleMiss() {
    state.flying = false;
    state.streak = 0;
    updateHud();
    ball.classList.add("hidden");
    showToast("Miss!", true);
    setTimeout(askNextQuestion, 900);
  }

  function finishRound() {
    state.ended = true;
    ball.classList.add("hidden");
    hint.classList.add("hidden");
    const made = state.made;
    const emoji = made >= 9 ? "🏆" : made >= 6 ? "🥳" : made >= 3 ? "🙂" : "💪";
    const title = made >= 9 ? "All-Star shootaround!" : made >= 6 ? "Great shootaround!" : made >= 3 ? "Nice try!" : "Keep practicing!";
    document.getElementById("bh-end-emoji").textContent = emoji;
    document.getElementById("bh-end-title").textContent = title;
    document.getElementById("bh-end-sub").textContent = `You made ${made}/${ROUND_SIZE} shots.`;
    const bonusEl = document.getElementById("bh-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardBasketballRoundBonus(made, ROUND_SIZE).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("bh-end-overlay").classList.remove("hidden");
  }

  function startRound() {
    state.qIndex = 0;
    state.made = 0;
    state.streak = 0;
    state.ended = false;
    updateHud();
    document.getElementById("bh-end-overlay").classList.add("hidden");
    document.getElementById("bh-start-overlay").classList.add("hidden");
    askNextQuestion();
  }

  document.getElementById("bh-start-btn").addEventListener("click", startRound);
  document.getElementById("bh-play-again-btn").addEventListener("click", startRound);
}
