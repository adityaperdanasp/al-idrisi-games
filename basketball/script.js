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

  // ---- Round 2 scoring/gameplay additions -----------------------------
  const HALF_COURT_DIST = 20;       // item 5 -- a tier ABOVE the existing trick-shot distance
  const HALF_COURT_BONUS = 6;
  const AIR_TIME_FRAMES_BONUS = 45; // item 4 -- flight lasting at least this many frames earns a bonus (rewards real arc, not a line-drive)
  const AIR_TIME_BONUS = 2;
  const MID_CLIMAX_AT = 5;          // item 5 (gameplay list) -- a second, smaller climax shot at the round's midpoint
  const MID_CLIMAX_MULT = 1.5;
  const CLUTCH_WINDOW = 3;          // item 12 -- makes tracked specifically in the final 3 shots
  const HOT_HAND_STEP = 0.1;        // item 6 -- +10% per streak point, applied to the BASE shot value only (not the flat streak-tier bonus, which stays as-is)
  const HOT_HAND_CAP = 2.0;
  const HOT_ZONE_CHANCE = 0.7;      // item 7 -- rolled once per round; not every round has one
  const HOT_ZONE_BONUS = 4;
  const WIND_CHANCE = 0.2;          // item 11 -- always telegraphed (see .bh-wind) before the shot, never a blind surprise
  const WIND_STRENGTH = 0.012;
  const LUCKY_BALL_CHANCE = 0.08;   // item 9
  const LUCKY_BALL_BONUS = 5;
  const REBOUND_WINDOW_MS = 1300;   // item 1 -- only offered on a "rim out" miss, never an airball
  const REBOUND_BONUS = 2;
  const RIM_SAVE_BONUS = 1;         // item 20 -- a rim-out miss still earns a small consolation point
  const MASCOT_EVERY_STREAK = 5;    // item 17 (reuses the SAME streak milestone math as streakBonusFor's top tier)
  const MASCOT_BONUS_COINS = 3;
  const ALLEY_OOP_BONUS = 4;        // item 18 -- 2 perfect-arc makes in a row
  const BANK_SHOT_Y_BAND = [8, 11]; // item 2 -- a shallow descending clip near the backboard nudges vx toward center, cosmetic-only bank "flash" from round 1 made functional
  const BANK_SHOT_NUDGE = 0.4;
  const SHOT_CLOCK_PRESSURE_MS = 3500; // item 10
  const PRESSURE_MULT = 1.3;
  const MASCOT_EMOJIS = ["🦅", "🦁", "🐯", "🐻"];
  const TUTORIAL_KEY = "aig_bh_tutorial_seen";

  // ---- Round 3 additions -----------------------------------------------
  const STREAK_SHIELD_AT = 5;        // item 2 -- same threshold Ninja Runner's own Streak Shield uses
  const FULL_COURT_DIST = 32;        // item 4 -- an even rarer tier above Half-court
  const FULL_COURT_BONUS = 10;
  const WIDE_SPAWN_CHANCE = 0.15;    // item 4 fix -- see resetBallForNextShot: without this, HALF_COURT_DIST/FULL_COURT_DIST (round 2+3) were UNREACHABLE, the normal rand(32,68) spawn never gets more than 18% from center
  const PERFECT_ROUND_BONUS = 25;    // item 7 -- all 10 shots made
  const LIGHTNING_ROUND_CHANCE = 0.25; // item 18 -- rolled once, right after shot 3, never twice in one round
  const LIGHTNING_ROUND_AT = 3;
  const LIGHTNING_ROUND_MS = 3000;
  const LIGHTNING_ROUND_BONUS = 4;
  const BUZZER_BONUS_POINTS = 5; // item 15 -- always offered after a successful Buzzer Beater (no question gate, no chance roll)
  const RIVAL_CHECK_AT = [3, 6, 9];  // item 12 -- pace comparison toasts at these qIndex checkpoints
  const SOUND_KEY = "aig_bh_sound";
  const HAPTICS_KEY = "aig_bh_haptics";
  function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }
  function hapticsOn() { try { return localStorage.getItem(HAPTICS_KEY) !== "0"; } catch (e) { return true; } }

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
  const crowdEl = document.getElementById("bh-crowd");
  const crowdBack = document.getElementById("bh-crowd-back");
  const hotzoneEl = document.getElementById("bh-hotzone");
  const windEl = document.getElementById("bh-wind");
  const reboundBtn = document.getElementById("bh-rebound-btn");
  const mascotEl = document.getElementById("bh-mascot");
  const aimGuide = document.getElementById("bh-aim-guide");
  const achToastEl = document.getElementById("bh-ach-toast");
  const hudEl = document.getElementById("bh-hud");

  const hudMade = document.getElementById("bh-hud-made");
  const hudTotal = document.getElementById("bh-hud-total");
  const hudStreak = document.getElementById("bh-hud-streak");
  const hudCoins = document.getElementById("bh-hud-coins");
  const hudGems = document.getElementById("bh-hud-gems");
  const chipMade = document.getElementById("bh-chip-made");
  const chipStreak = document.getElementById("bh-chip-streak");
  const chipWallet = document.getElementById("bh-chip-wallet");
  const chipCombo = document.getElementById("bh-chip-combo");
  const chipGhost = document.getElementById("bh-chip-ghost");
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
    // Parallax crowd depth (round 2, item 26) -- a second, further-back row.
    crowdBack.innerHTML = Array.from({ length: 18 }, () => "<i></i>").join("");
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
    shotStartAt: 0,
    // Round 2 additions
    mode: "normal",            // "normal" | "pressure" | "team"
    teamTurn: 1,
    teamScores: { 1: 0, 2: 0 },
    comboMult: 1,
    lastWasPerfect: false,
    hotZoneActive: false,
    hotZoneRange: null,        // [min, max] distance-from-center band, rolled once per round
    windActive: false,
    windDelta: 0,
    luckyBall: false,
    shotLog: [],               // [{x, made}] per shot, for the Shot Chart
    clutchMakes: 0,
    mascotStreakSeenAt: 0,
    reboundPending: false,
    bestShotThisRound: null,   // {label, points} for the replay-reel recap
    idleBobTimer: null,
    ghostBaseline: 0,
    // Round 3 additions
    streakShieldCharges: 0,
    streakShieldGranted: false,
    buzzerBonusUsed: false,
    bonusShotActive: false,
    lastGenKey: null,
    lightningRoundDone: false
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

  // ---- Synthesized sound effects (round 3, items 1+26) -----------------
  // Same Web Audio approach as Ninja Runner's ninjaTone() -- no audio
  // files/licensing, a self-contained AudioContext separate from
  // game-music.js's background-music one (that module keeps its own
  // context private). Gated behind soundOn() throughout.
  let bhAudioCtx = null;
  function bhTone(freqs, dur, vol, type) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      bhAudioCtx = bhAudioCtx || new C();
      if (bhAudioCtx.state === "suspended") bhAudioCtx.resume();
      let t = bhAudioCtx.currentTime;
      freqs.forEach(f => {
        const o = bhAudioCtx.createOscillator(), g = bhAudioCtx.createGain();
        o.type = type || "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol != null ? vol : 0.15, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(bhAudioCtx.destination);
        o.start(t);
        o.stop(t + dur + 0.05);
        t += dur * 0.55;
      });
    } catch (e) { /* silent -- never blocks the game */ }
  }
  // A short burst of filtered noise for the bounce/rim-clank sounds --
  // tones alone read too "musical" for a physical thud.
  function bhNoiseBurst(dur, vol, freq) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      bhAudioCtx = bhAudioCtx || new C();
      if (bhAudioCtx.state === "suspended") bhAudioCtx.resume();
      const bufferSize = bhAudioCtx.sampleRate * dur;
      const buffer = bhAudioCtx.createBuffer(1, bufferSize, bhAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = bhAudioCtx.createBufferSource();
      src.buffer = buffer;
      const filt = bhAudioCtx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = freq || 800;
      const g = bhAudioCtx.createGain();
      g.gain.value = vol != null ? vol : 0.2;
      src.connect(filt).connect(g).connect(bhAudioCtx.destination);
      src.start();
    } catch (e) {}
  }
  function playSwish() { bhTone([880, 1174.66], 0.18, 0.12); }
  function playRimClank() { bhNoiseBurst(0.08, 0.18, 1200); }
  function playAirball() { bhNoiseBurst(0.12, 0.1, 400); }
  function playBuzzer() { bhTone([220, 220], 0.5, 0.18, "sawtooth"); }
  function playCrowdCheer() { bhNoiseBurst(0.6, 0.06, 2000); bhTone([523.25, 659.25, 783.99], 0.4, 0.08); }
  function playCountdownBeep() { bhTone([660], 0.1, 0.1); }

  if (window.AIGLeaderboard) {
    AIGLeaderboard.watchWallet(wallet => {
      hudCoins.textContent = wallet.coins || 0;
      hudGems.textContent = wallet.gems || 0;
      popChip(chipWallet);
    });
  }

  // ---- Cosmetics (round 1, items 21-22) -------------------------------
  function applyBallSkin(id) { ball.dataset.skin = id; ball.dataset.equippedSkin = id; }
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

  // Achievement-unlock toast (round 3) -- compares the freshly-fetched
  // unlock list against a locally-remembered "already seen unlocked" set,
  // so a badge that was ALREADY unlocked before this round doesn't
  // re-announce itself every single time the end screen renders.
  const ACH_SEEN_KEY = "aig_bh_achievements_seen";
  function announceNewAchievements(list) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(ACH_SEEN_KEY) || "[]"); } catch (e) {}
    const newlyUnlocked = list.filter(a => a.unlocked && !seen.includes(a.id));
    if (newlyUnlocked.length) {
      const a = newlyUnlocked[0];
      achToastEl.textContent = `${a.emoji} Achievement unlocked: ${a.name}!`;
      achToastEl.classList.remove("show"); void achToastEl.offsetWidth; achToastEl.classList.add("show");
    }
    try { localStorage.setItem(ACH_SEEN_KEY, JSON.stringify(list.filter(a => a.unlocked).map(a => a.id))); } catch (e) {}
  }

  // Score roll-up (round 3) -- same fixed-duration ease-out count-up
  // pattern as Ninja Runner's own finish-screen score roll-up.
  const ROLLUP_MS = 700;
  function animateScoreRollup(el, target, suffix, prefix) {
    const start = performance.now();
    function tick(now) {
      // `now` defaults to performance.now() -- real requestAnimationFrame
      // always passes a timestamp, this is just a safety net.
      const t = Math.min(1, ((now || performance.now()) - start) / ROLLUP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${prefix || ""}${Math.round(target * eased)}${suffix || ""}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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

  // Ghost Challenge (round 2, item 14) -- a simplified live comparison
  // against the current top made-count (today's Daily Challenge leader,
  // or this week's leader in a normal round), not a true per-shot pace
  // ghost like Ninja Runner's (that needs per-checkpoint data this mini-
  // game doesn't store) -- just "ahead/behind the best so far" updated
  // after every make.
  function updateGhostHud() {
    if (!state.ghostBaseline) { chipGhost.classList.add("hidden"); return; }
    const delta = state.made - state.ghostBaseline;
    chipGhost.classList.remove("hidden", "ahead", "behind");
    if (delta > 0) { chipGhost.classList.add("ahead"); chipGhost.textContent = `👻 +${delta}`; }
    else if (delta < 0) { chipGhost.classList.add("behind"); chipGhost.textContent = `👻 ${delta}`; }
    else chipGhost.textContent = "👻 tied";
  }

  function placeBall(xPct, yPct, spinDivisor) {
    state.ballX = xPct;
    state.ballY = yPct;
    ball.style.left = xPct + "%";
    ball.style.top = yPct + "%";
    // Ball spin rate (round 2, item 24) -- a SMALLER divisor spins faster;
    // callers pass one proportional to horizontal speed, everyone else
    // (idle/drag) keeps the original flat divisor of 6.
    ball.style.transform = `translate(-50%, -50%) rotate(${(performance.now() / (spinDivisor || 6)) % 360}deg)`;
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

  // Chalk puff on release (round 3) -- a small dust puff at the launch
  // spot the instant a shot is released.
  function spawnChalkPuff(xPct, yPct) {
    const puff = document.createElement("div");
    puff.className = "bh-chalk-puff";
    puff.style.left = xPct + "%";
    puff.style.top = yPct + "%";
    court.appendChild(puff);
    setTimeout(() => puff.remove(), 420);
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
    // Wide spawn (round 3 fix) -- occasionally spawns from much further
    // out so Half-court/Full Court Press (round 2/3) are actually
    // reachable; most shots still spawn in the comfortable 32-68 band.
    const spawnX = rng() < WIDE_SPAWN_CHANCE ? rand(8, 92) : rand(32, 68);
    placeBall(spawnX, BALL_SPAWN_Y);
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
    if (isLastShot && !state.bonusShotActive) playBuzzer(); // round 3, item 1 -- never on the bonus epilogue shot itself

    // Wind hazard (round 2, item 11) -- ALWAYS telegraphed before launch
    // (see the .bh-wind indicator), never on the Buzzer Beater.
    state.windActive = !isLastShot && rng() < WIND_CHANCE;
    state.windDelta = state.windActive ? (rand(0, 1) ? 1 : -1) * WIND_STRENGTH : 0;
    windEl.classList.toggle("hidden", !state.windActive);

    // Lucky Ball (round 2, item 9) -- a rare golden-ball variant, overrides
    // whatever skin is equipped for just this one shot (visual only via
    // the "lucky" data-skin, reverted next shot by applyBallSkin's own
    // re-render -- see resetBallForNextShot being the only place .skin
    // gets set besides the cosmetic picker).
    state.luckyBall = !isLastShot && rng() < LUCKY_BALL_CHANCE;
    if (state.luckyBall) ball.dataset.skin = "lucky";
    else { const owned = ball.dataset.equippedSkin || "default"; ball.dataset.skin = owned; }

    // Idle animation (round 2, item 32) -- bobs if a kid hesitates at the
    // drag step without starting a pull. Cleared immediately on drag start
    // (onDragStart) or a fresh shot (here).
    if (state.idleBobTimer) clearTimeout(state.idleBobTimer);
    ball.classList.remove("idle-bob");
    state.idleBobTimer = setTimeout(() => { if (!state.flying && !state.dragging) ball.classList.add("idle-bob"); }, 2500);

    state.reboundPending = false;
    reboundBtn.classList.add("hidden");
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

  // Difficulty ramp (round 2, item 8) -- the back half of a round leans
  // harder, same "gentle curve across the round" idea as Ninja Runner's
  // wave ramp. `state.qIndex` here is the question about to be asked
  // (0-indexed, not yet incremented for it), so shot #1 is qIndex 0.
  function rampedDifficulty() {
    if (state.qIndex < 4) return "easy";
    if (state.qIndex < 7) return "medium";
    return "hard";
  }
  // No-repeat question variety (round 3, item 8 of gameplay list) -- avoids
  // rolling the SAME generator key twice in a row; re-rolls once if it
  // collides (a single retry is enough with 6 keys, never worth a loop).
  function rollQuestion() {
    let key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    if (key === state.lastGenKey) key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    state.lastGenKey = key;
    const raw = MATHVILLE_GENERATORS[key](rampedDifficulty());
    return { key, ...buildMc(raw) };
  }

  // Lightning Round (round 3, item 18) -- a rare true/false bonus question
  // slotted in right after shot LIGHTNING_ROUND_AT, on its own short timer,
  // worth a flat bonus if answered correctly -- ONE per round at most.
  // Restricted to the 4 GEN_KEYS whose prompts reliably end in "= ?"
  // (addition/subtraction/multiplication/division) -- "measurement"
  // ("Convert: X g = ? kg") and "rounding" ("Round X to the nearest Y.")
  // don't end that way, which read awkwardly once True/or/False's own
  // "= shownAnswer?" is appended after stripping the original ending.
  const LIGHTNING_GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division"];
  function maybeOfferLightningRound(onDone) {
    if (state.lightningRoundDone || state.qIndex !== LIGHTNING_ROUND_AT || rng() >= LIGHTNING_ROUND_CHANCE) { onDone(); return; }
    state.lightningRoundDone = true;
    const genKey = LIGHTNING_GEN_KEYS[rand(0, LIGHTNING_GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[genKey](rampedDifficulty());
    const mc = buildMc(raw);
    const isTrue = rng() < 0.5;
    const shownAnswer = isTrue ? mc.correctLabel : mc.options.find(o => o !== mc.correctLabel) || mc.correctLabel;
    // Strips a trailing "= ?" (not just the "?") so the shown-answer
    // equals sign isn't duplicated -- most generator prompts end exactly
    // that way (e.g. "54 + 40 = ?"), but a plain `.replace("?", "")` only
    // removed the question mark, leaving the original "=" AND the new one.
    document.getElementById("bh-q-prompt").textContent = `⚡ LIGHTNING ROUND! True or False: ${mc.prompt.replace(/=?\s*\?\s*$/, "").trim()} = ${shownAnswer}?`;
    const grid = document.getElementById("bh-q-grid");
    grid.innerHTML = "";
    let answered = false;
    const timeoutId = setTimeout(() => { if (!answered) { answered = true; document.getElementById("bh-question-overlay").classList.add("hidden"); onDone(); } }, LIGHTNING_ROUND_MS);
    ["True", "False"].forEach(label => {
      const btn = document.createElement("button");
      btn.className = "bh-q-btn";
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        clearTimeout(timeoutId);
        const correct = (label === "True") === isTrue;
        if (correct) { state.points += LIGHTNING_ROUND_BONUS; updateHud(); showToast(`⚡ +${LIGHTNING_ROUND_BONUS}!`, false); }
        else showToast("⚡ Missed it!", true);
        setTimeout(() => { document.getElementById("bh-question-overlay").classList.add("hidden"); onDone(); }, 500);
      });
      grid.appendChild(btn);
    });
    document.getElementById("bh-question-overlay").classList.remove("hidden");
  }

  function askNextQuestion() {
    if (state.ended) return;
    if (state.qIndex >= ROUND_SIZE) { finishRound(); return; }
    maybeOfferLightningRound(askNextQuestionReal);
  }
  function askNextQuestionReal() {
    if (state.ended) return;
    // Team Score turn (round 2, item 13) -- alternates by question index,
    // not a separate counter, so it always stays in sync with qIndex.
    if (state.mode === "team") state.teamTurn = state.qIndex % 2 === 0 ? 1 : 2;
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
        // Streak Shield (round 3, item 2) -- a wrong ANSWER breaks the
        // streak just like a missed shot does, so it must be covered by
        // the shield too, not just handleMiss's own consumption.
        if (state.streakShieldCharges > 0) {
          state.streakShieldCharges -= 1;
          state.streakShieldGranted = false;
          showSubtoast("🛡️ Streak Shield used!");
        } else {
          state.streak = 0;
          state.streakShieldGranted = false;
        }
        state.comboMult = 1;
        state.mascotStreakSeenAt = 0;
        chipCombo.classList.add("hidden");
        updateHud();
        showToast("❌ No shot this time", true);
        runNextBar(900);
        setTimeout(askNextQuestion, 900);
      }
    }, 700);
  }

  function offerShot() {
    hint.classList.remove("hidden");
    // Team Score turn banner (round 2, item 13) -- replaces the normal
    // drag hint text for a beat so the "whose turn" context isn't missed;
    // the normal hint still shows first via the Next bar pause, this just
    // layers a toast on top right as the shot opens up.
    if (state.mode === "team") showToast(`Player ${state.teamTurn}'s turn!`, false);
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
    }, currentShotTimeLimit());
  }

  // Countdown ring (round 1, item 41) -- a conic-gradient ring around the
  // ball that depletes over the shot timer, stopped once the ball is
  // hidden (flying, or a new question started).
  function tickTimerRing() {
    if (ball.classList.contains("hidden") || state.flying) return;
    const pct = Math.max(0, 1 - (performance.now() - state.shotStartAt) / currentShotTimeLimit());
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
    ball.classList.remove("idle-bob"); // round 2, item 32 -- no longer idle once a real drag starts
    if (state.idleBobTimer) clearTimeout(state.idleBobTimer);
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

    // Aim dotted-guide line to the hoop (round 3) -- a SEPARATE, always-
    // faint line from the ball's SNAP-BACK launch position to the hoop,
    // independent of pull direction -- helps a kid who struggles to judge
    // "which way is the hoop" on top of the color-feedback pull-line above.
    const launchXPct = state.dragStartBallPct.x, launchYPct = state.dragStartBallPct.y;
    const dxGuide = (state.hoopX - launchXPct) / 100 * rect.width;
    const dyGuide = (12 - launchYPct) / 100 * rect.height;
    const guideLen = Math.hypot(dxGuide, dyGuide);
    const guideAngle = Math.atan2(dyGuide, dxGuide) * (180 / Math.PI);
    aimGuide.style.left = launchXPct + "%";
    aimGuide.style.top = launchYPct + "%";
    aimGuide.style.width = guideLen + "px";
    aimGuide.style.transform = `rotate(${guideAngle}deg)`;
    aimGuide.classList.remove("hidden");
  }

  function onDragEnd(e) {
    if (!state.dragging) return;
    state.dragging = false;
    ball.classList.remove("dragging");
    aimLine.classList.add("hidden");
    aimGuide.classList.add("hidden"); // round 3
    spawnChalkPuff(state.dragStartBallPct.x, state.dragStartBallPct.y); // round 3
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
    // Half-court tier (round 2, item 5 in gameplay list) -- a step ABOVE
    // the existing trick-shot distance, same priority idea: the harder the
    // throw, the bigger the one-time bonus, checked independently of the
    // 2pt/3pt value itself.
    const shotValue = launchDistFromCenter >= THREE_PT_DIST ? 3 : 2;
    const isTrickShot = launchDistFromCenter >= TRICK_SHOT_DIST && launchDistFromCenter < HALF_COURT_DIST;
    const isHalfCourt = launchDistFromCenter >= HALF_COURT_DIST && launchDistFromCenter < FULL_COURT_DIST;
    const isFullCourt = launchDistFromCenter >= FULL_COURT_DIST; // round 3, item 4
    // Hot Zone (round 2, item 7) -- bonus if THIS launch position falls
    // inside the round's rolled band (see startRound), on top of whatever
    // 2pt/3pt/trick-shot tier it also qualifies for.
    const inHotZone = state.hotZoneRange && launchDistFromCenter >= state.hotZoneRange[0] && launchDistFromCenter <= state.hotZoneRange[1];
    const isLastShot = state.qIndex === ROUND_SIZE;
    const isMidClimax = state.qIndex === MID_CLIMAX_AT && !isLastShot;
    const hoopMoveStart = performance.now();
    const hoopMoveTarget = HOOP_X + (rand(0, 1) ? 1 : -1) * MOVING_HOOP_RANGE;
    let frames = 0;
    let bankNudged = false; // item 2 -- a bank-shot nudge only ever applies ONCE per flight
    function step() {
      if (state.ended) return;
      frames++;
      state.vy += GRAVITY;
      // Wind hazard (round 2, item 11) -- a small constant horizontal
      // nudge per frame, ALREADY telegraphed before launch (see
      // resetBallForNextShot), so this is never a surprise mid-flight.
      if (state.windActive) state.vx += state.windDelta;
      const nx = state.ballX + state.vx;
      let ny = state.ballY + state.vy;
      // Ball spin rate (round 2, item 24) -- proportional to horizontal
      // speed instead of a flat constant, reading as a believable roll.
      placeBall(nx, ny, Math.max(1.5, 6 - Math.abs(state.vx) * 2));
      if (frames % 3 === 0) spawnTrailDot(nx, ny); // item 8 -- every 3rd frame keeps the trail readable, not a solid smear

      // Bank shot (round 2, item 2) -- a shallow, ascending clip near the
      // backboard's own band nudges vx toward center ONCE, a position-
      // triggered collision response (not a drag-distance-derived power
      // change, which is the specific coupling the original physics
      // comments warn against) -- see BANK_SHOT_Y_BAND/BANK_SHOT_NUDGE.
      if (!bankNudged && state.vy < 0 && ny > BANK_SHOT_Y_BAND[0] && ny < BANK_SHOT_Y_BAND[1] && Math.abs(nx - state.hoopX) < 14 && Math.abs(nx - state.hoopX) > 4) {
        bankNudged = true;
        state.vx += (state.hoopX - nx > 0 ? 1 : -1) * BANK_SHOT_NUDGE;
        backboard.classList.add("flash");
        setTimeout(() => backboard.classList.remove("flash"), 300);
      }

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
        handleMake({ shotValue, isTrickShot, isHalfCourt, isFullCourt, inHotZone, isMidClimax, launchX, edgeDist: Math.abs(nx - state.hoopX), isLastShot, airFrames: frames });
        return;
      }
      // Backboard flash (item 10, round 1) -- purely cosmetic (separate
      // from the FUNCTIONAL bank nudge above, which has its own flash
      // trigger), for a path passing close behind the backboard without
      // qualifying for the bank-shot band.
      if (ny < 10 && Math.abs(nx - state.hoopX) < 16 && !backboard.classList.contains("flash")) {
        backboard.classList.add("flash");
        setTimeout(() => backboard.classList.remove("flash"), 300);
      }
      if (ny > 106 || ny < -15 || nx < -15 || nx > 115 || frames > 240) {
        if (!state.scored) handleMiss(isLastShot, launchX, frames);
        return;
      }
      state.rafId = requestAnimationFrame(step);
    }
    state.rafId = requestAnimationFrame(step);
  }

  function handleMake(info) {
    // Buzzer bonus shot (round 3, item 15) -- a short-circuit BEFORE any
    // of the normal scoring/streak/combo logic below, since qIndex is
    // still ROUND_SIZE here (isLastShot would read true again and
    // re-trigger the FULL buzzer-multiplier stack a second time if this
    // fell through to the normal path). Flat bonus only, straight to
    // finishRound -- this shot is a standalone epilogue beat, not a real
    // extra question/round-state entry.
    if (state.bonusShotActive) {
      state.bonusShotActive = false;
      state.points += BUZZER_BONUS_POINTS;
      finishShot();
      net.classList.remove("swish"); void net.offsetWidth; net.classList.add("swish");
      playSwish();
      showToast(`🎁 Bonus make! +${BUZZER_BONUS_POINTS}`, false);
      updateHud();
      setTimeout(finishRound, 1000);
      return;
    }
    const { shotValue, isTrickShot, isHalfCourt, isFullCourt, inHotZone, isMidClimax, launchX, edgeDist, isLastShot, airFrames } = info;
    state.flying = false;
    state.made++;
    state.streak++;
    if (state.streak > state.bestStreakThisRound) state.bestStreakThisRound = state.streak;

    // Streak Shield (round 3, item 2) -- earned once per climb to
    // STREAK_SHIELD_AT, forgives the NEXT miss's streak reset (the shot
    // itself still misses/no points from it, only the streak counter is
    // protected) -- see handleMiss.
    if (state.streak >= STREAK_SHIELD_AT && !state.streakShieldGranted) {
      state.streakShieldGranted = true;
      state.streakShieldCharges = (state.streakShieldCharges || 0) + 1;
      showSubtoast("🛡️ Streak Shield earned!");
    }

    const streakBonus = streakBonusFor(state.streak);
    const isPerfect = edgeDist < PERFECT_ARC_TOL_X;
    // Hot Hand multiplier (round 2, item 6) -- applied to the BASE shot
    // value only (2pt/3pt), climbs with streak and caps out; the flat
    // streak-tier bonus above is a SEPARATE reward, not replaced by this.
    const hotHandMult = Math.min(HOT_HAND_CAP, 1 + state.streak * HOT_HAND_STEP);
    state.comboMult = hotHandMult;

    let gained = Math.round(shotValue * hotHandMult) + streakBonus;
    if (isFullCourt) gained += FULL_COURT_BONUS;
    else if (isHalfCourt) gained += HALF_COURT_BONUS;
    else if (isTrickShot) gained += TRICK_SHOT_BONUS;
    if (isPerfect) gained += PERFECT_ARC_BONUS;
    if (state.contested) gained += CONTESTED_BONUS;
    if (inHotZone) gained += HOT_ZONE_BONUS;
    if (airFrames >= AIR_TIME_FRAMES_BONUS) gained += AIR_TIME_BONUS;
    if (state.luckyBall) gained += LUCKY_BALL_BONUS;
    if (isMidClimax) gained = Math.round(gained * MID_CLIMAX_MULT);
    if (isLastShot) gained *= BUZZER_MULT;
    if (state.mode === "pressure") gained = Math.round(gained * PRESSURE_MULT);
    state.points += gained;
    if (state.mode === "team") state.teamScores[state.teamTurn] += gained;

    // Clutch tracker (item 12) -- makes specifically in the final
    // CLUTCH_WINDOW shots of the round.
    if (state.qIndex > ROUND_SIZE - CLUTCH_WINDOW) state.clutchMakes++;

    // Shot Chart log (item 42) + best-shot recap for the replay reel (item 39)
    state.shotLog.push({ x: launchX, made: true });
    if (!state.bestShotThisRound || gained > state.bestShotThisRound.points) {
      state.bestShotThisRound = { points: gained, label: isLastShot ? "🚨 Buzzer Beater" : isMidClimax ? "⭐ Big shot" : isPerfect ? "💯 Nothing but net" : isFullCourt ? "🌠 Full Court Press" : isHalfCourt ? "🚀 Half-court shot" : shotValue === 3 ? "3-pointer" : "Shot" };
    }

    playSwish(); // round 3, item 1
    if (state.streak >= 3) playCrowdCheer();

    updateHud();
    // Progressive combo HUD (round 2, items 19+35) -- a live multiplier
    // readout, with glow intensity climbing alongside it rather than a
    // single pop per tier.
    chipCombo.textContent = `✨ ×${hotHandMult.toFixed(1)}`;
    chipCombo.classList.toggle("hidden", state.streak < 2);
    chipCombo.style.setProperty("--bh-combo-glow", String(Math.min(14, state.streak * 2)));
    popChip(chipCombo);

    // Ball dip into net (round 2, item 25) -- the ball visibly dips/fades
    // INTO the net before finishShot's normal hide, instead of an instant
    // disappear.
    ballShadow.classList.add("hidden");
    timerRing.classList.add("hidden");
    ball.classList.remove("idle-bob");
    ball.classList.add("net-dip");
    setTimeout(() => { ball.classList.add("hidden"); ball.classList.remove("net-dip"); }, 300);

    net.classList.remove("swish", "perfect");
    void net.offsetWidth;
    net.classList.add(isPerfect ? "perfect" : "swish");
    // Rim wobble (item 7) -- only on a non-perfect make (grazed the
    // tolerance edge), a clean dead-center swish doesn't get it.
    if (!isPerfect) { rim.classList.remove("wobble"); void rim.offsetWidth; rim.classList.add("wobble"); }
    // Screen shake / camera punch (item 6)
    court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch");
    // Camera zoom for the Buzzer Beater (round 2, item 31)
    if (isLastShot) { court.classList.remove("buzzer-zoom"); void court.offsetWidth; court.classList.add("buzzer-zoom"); }
    try { if (hapticsOn() && navigator.vibrate) navigator.vibrate(isLastShot ? [40, 30, 60] : 40); } catch (e) {} // item 43

    const mainMsg = isLastShot ? `🚨 BUZZER BEATER! +${gained}` : isMidClimax ? `⭐ Big shot! +${gained}` : isPerfect ? "💯 Nothing but net!" : state.streak >= 3 ? `🔥 SWISH! (${state.streak} in a row!)` : "🏀 SWISH!";
    showToast(mainMsg, false);
    if (isFullCourt) showSubtoast(`🌠 FULL COURT! +${FULL_COURT_BONUS}`);
    else if (isHalfCourt) showSubtoast(`🚀 Half-court! +${HALF_COURT_BONUS}`);
    else if (isTrickShot) showSubtoast(`🎯 Deep range! +${TRICK_SHOT_BONUS}`);
    else if (inHotZone) showSubtoast(`🔆 Hot Zone! +${HOT_ZONE_BONUS}`);
    else if (state.contested) showSubtoast(`🛡️ Contested shot! +${CONTESTED_BONUS}`);
    else if (state.luckyBall) showSubtoast(`🍀 Lucky Ball! +${LUCKY_BALL_BONUS}`);
    else if (shotValue === 3) showSubtoast("3-pointer!");

    // Confetti (item 5) -- only a genuine streak of 3+, not every make.
    if (state.streak >= 3) burstConfetti();

    // Alley-oop (round 2, item 18) -- 2 perfect-arc makes in a row,
    // simplified to a flourish+bonus rather than a real video replay.
    if (isPerfect && state.lastWasPerfect) { state.points += ALLEY_OOP_BONUS; showSubtoast(`🤝 Alley-oop! +${ALLEY_OOP_BONUS}`); }
    state.lastWasPerfect = isPerfect;

    // Mascot cameo (round 2, item 17) -- every MASCOT_EVERY_STREAK makes
    // in a row; mascotStreakSeenAt guards against refiring every make
    // once the streak sits AT/above a milestone already announced, reset
    // on any miss (see handleMiss) so climbing back to the same milestone
    // later in the round fires again.
    if (state.streak % MASCOT_EVERY_STREAK === 0 && state.streak !== state.mascotStreakSeenAt) {
      state.mascotStreakSeenAt = state.streak;
      mascotEl.textContent = MASCOT_EMOJIS[rand(0, MASCOT_EMOJIS.length - 1)];
      mascotEl.classList.remove("show"); void mascotEl.offsetWidth; mascotEl.classList.add("show");
      if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: MASCOT_BONUS_COINS }).catch(() => {});
    }

    updateGhostHud(); // round 2, item 14

    // Rival pace check (round 3, item 12) -- a simplified "rival ghost":
    // compares current made-count against the ghost baseline at fixed
    // checkpoints instead of a real animated AI shooter (judged too much
    // extra state/visual machinery for this pass), reusing the SAME
    // baseline Ghost Challenge already fetches.
    if (RIVAL_CHECK_AT.includes(state.qIndex) && state.ghostBaseline) {
      const pace = Math.round((state.ghostBaseline / ROUND_SIZE) * state.qIndex);
      if (state.made > pace) showToast(`🏃 You're ahead of the rival pace!`, false);
      else if (state.made < pace) showToast(`😤 Rival's pulling ahead...`, true);
    }

    // "Showtime" flourish (round 3, item 20) -- a rare combo (perfect-arc
    // Buzzer Beater), purely cosmetic on top of the existing punch/zoom.
    if (isLastShot && isPerfect) {
      court.classList.remove("showtime"); void court.offsetWidth; court.classList.add("showtime");
      showSubtoast("✨ SHOWTIME! ✨");
    }

    defenderEl.classList.remove("show");
    hotzoneEl.classList.toggle("hidden", !state.hotZoneRange); // stays visible all round once rolled, see startRound
    rim.classList.remove("buzzer"); net.classList.remove("buzzer");
    if (state.hoopMoving) setHoopX(HOOP_X, false);

    // Buzzer bonus shot (round 3, item 15) -- after a MADE Buzzer Beater,
    // one extra no-question-gate shot before the round truly ends.
    if (isLastShot && !state.buzzerBonusUsed) {
      state.buzzerBonusUsed = true;
      setTimeout(offerBuzzerBonusShot, 1200);
    } else {
      setTimeout(askNextQuestion, 1000);
    }
  }

  // Buzzer bonus shot (round 3, item 15) -- reuses the normal shot flow
  // (drag/launch/handleMake/handleMiss) but with qIndex already at
  // ROUND_SIZE, so handleMake's own isLastShot check would read true
  // again -- guarded via state.buzzerBonusUsed instead so this can only
  // ever fire once, and scored as a flat bonus added directly rather than
  // re-running the whole last-shot multiplier stack a second time.
  function offerBuzzerBonusShot() {
    if (state.ended) return;
    showToast("🎁 Bonus shot! Any make is worth extra.", false);
    // Set BEFORE resetBallForNextShot -- that function reads
    // state.bonusShotActive to skip re-playing the buzzer sound/re-
    // applying buzzer styling cues for this already-past-the-buzzer shot.
    state.bonusShotActive = true;
    resetBallForNextShot();
    offerShot();
  }

  function handleMiss(isLastShot, launchX) {
    // Buzzer bonus shot (round 3, item 15) -- short-circuit, mirrors
    // handleMake's own guard. A missed bonus shot costs nothing (it was
    // already free upside), just ends the round.
    if (state.bonusShotActive) {
      state.bonusShotActive = false;
      finishShot();
      showToast("Bonus shot missed -- no harm done!", true);
      setTimeout(finishRound, 900);
      return;
    }
    state.flying = false;
    // Streak Shield (round 3, item 2) -- consumes 1 charge to forgive
    // THIS miss's streak reset (no points from the miss change because of
    // it, only the streak counter is protected). Re-arms once the streak
    // climbs back to STREAK_SHIELD_AT.
    if (state.streakShieldCharges > 0) {
      state.streakShieldCharges -= 1;
      state.streakShieldGranted = false;
      showSubtoast("🛡️ Streak Shield used!");
    } else {
      state.streak = 0;
      state.streakShieldGranted = false;
    }
    state.comboMult = 1;
    state.mascotStreakSeenAt = 0; // round 2 -- re-arms the mascot cameo milestone for the next climb
    chipCombo.classList.add("hidden");
    updateHud();
    finishShot();
    // Airball vs rim-out (item 18, round 1) -- distinguished by the
    // CLOSEST the ball ever got to the hoop during its whole flight
    // (minDistToHoop, a unitless ratio where < 1 roughly means "within
    // the hoop's own tolerance box at some point"), not just where it
    // ended up.
    const wasClose = state.minDistToHoop < 1.6;
    state.shotLog.push({ x: launchX, made: false }); // round 2, item 42
    // Rim-save consolation (round 2, item 20) -- a rim-out still earns a
    // small partial point, an airball earns nothing.
    if (wasClose) { state.points += RIM_SAVE_BONUS; updateHud(); }
    showToast(wasClose ? `So close! Rim out. (+${RIM_SAVE_BONUS})` : "Airball!", true);
    if (wasClose) { playRimClank(); rim.classList.remove("near-miss-glow"); void rim.offsetWidth; rim.classList.add("near-miss-glow"); } // round 3, item 1 + near-miss glow
    else playAirball();
    court.classList.remove("miss-vignette"); void court.offsetWidth; court.classList.add("miss-vignette"); // item 47
    // Crowd reaction (round 2, item 34) -- extends the vignette above with
    // a visible collective dip on BOTH crowd layers.
    crowdEl.classList.remove("react"); void crowdEl.offsetWidth; crowdEl.classList.add("react");
    crowdBack.classList.remove("react"); void crowdBack.offsetWidth; crowdBack.classList.add("react");
    try { if (hapticsOn() && navigator.vibrate) navigator.vibrate([20, 20, 20]); } catch (e) {} // item 43, distinct pattern from a make
    defenderEl.classList.remove("show");
    rim.classList.remove("buzzer"); net.classList.remove("buzzer");
    if (state.hoopMoving) setHoopX(HOOP_X, false);

    function proceedAfterMiss() {
      runNextBar(900);
      setTimeout(askNextQuestion, 900);
    }

    // Rebound (round 2, item 1) -- only offered on a genuine rim-out
    // (never an airball), and never on the Buzzer Beater (keeps that
    // shot's own feedback simple). A tap within the window grants a flat
    // bonus -- it does NOT increment `made`/consume another question
    // slot, it's a pure points recovery, not a full extra shot.
    if (wasClose && !isLastShot) {
      state.reboundPending = true;
      reboundBtn.style.left = state.ballX + "%";
      reboundBtn.style.top = "55%";
      reboundBtn.classList.remove("hidden");
      const reboundTimeout = setTimeout(() => {
        if (state.reboundPending) { state.reboundPending = false; reboundBtn.classList.add("hidden"); proceedAfterMiss(); }
      }, REBOUND_WINDOW_MS);
      reboundBtn.onclick = () => {
        if (!state.reboundPending) return;
        state.reboundPending = false;
        clearTimeout(reboundTimeout);
        reboundBtn.classList.add("hidden");
        state.points += REBOUND_BONUS;
        updateHud();
        showToast(`🏀 Putback! +${REBOUND_BONUS}`, false);
        proceedAfterMiss();
      };
    } else {
      proceedAfterMiss();
    }
  }

  function finishRound() {
    state.ended = true;
    finishShot();
    hint.classList.add("hidden");
    hotzoneEl.classList.add("hidden");
    windEl.classList.add("hidden");
    court.classList.remove("buzzer-zoom");
    const made = state.made;
    // Perfect Round bonus (round 3, item 7) -- all 10 shots made.
    const isPerfectRound = made === ROUND_SIZE;
    if (isPerfectRound) state.points += PERFECT_ROUND_BONUS;
    const emoji = isPerfectRound ? "👑" : made >= 9 ? "🏆" : made >= 6 ? "🥳" : made >= 3 ? "🙂" : "💪";
    const title = isPerfectRound ? "PERFECT ROUND!" : made >= 9 ? "All-Star shootaround!" : made >= 6 ? "Great shootaround!" : made >= 3 ? "Nice try!" : "Keep practicing!";
    document.getElementById("bh-end-emoji").textContent = emoji;
    document.getElementById("bh-end-title").textContent = title;
    document.getElementById("bh-end-sub").textContent = isPerfectRound ? `You made all ${ROUND_SIZE}/${ROUND_SIZE} shots! +${PERFECT_ROUND_BONUS} bonus.` : `You made ${made}/${ROUND_SIZE} shots.`;
    // Score roll-up counter (round 3) -- counts up from 0 instead of the
    // number just appearing already-set.
    animateScoreRollup(document.getElementById("bh-end-points"), state.points, " points", "⭐ ");
    const bonusEl = document.getElementById("bh-end-bonus");
    bonusEl.textContent = "";

    // Replay reel recap (round 2, item 39) -- simplified to a one-line
    // best-moment recap instead of real video playback.
    const replayEl = document.getElementById("bh-replay-reel");
    if (state.bestShotThisRound) {
      replayEl.textContent = `🎬 Best moment: ${state.bestShotThisRound.label} (+${state.bestShotThisRound.points})`;
      replayEl.classList.remove("hidden");
    } else replayEl.classList.add("hidden");

    // Team Score result (round 2, item 13)
    const teamEl = document.getElementById("bh-team-result");
    if (state.mode === "team") {
      const p1 = state.teamScores[1], p2 = state.teamScores[2];
      teamEl.innerHTML = `<span class="${p1 >= p2 ? "bh-team-win" : ""}">P1: ${p1}</span><span class="${p2 > p1 ? "bh-team-win" : ""}">P2: ${p2}</span>`;
      teamEl.classList.remove("hidden");
    } else teamEl.classList.add("hidden");

    // Clutch badge (round 2, item 12)
    const clutchEl = document.getElementById("bh-clutch-badge");
    if (state.clutchMakes >= CLUTCH_WINDOW) { clutchEl.textContent = "🧊 Clutch Performer -- perfect in the final stretch!"; clutchEl.classList.remove("hidden"); }
    else if (state.clutchMakes > 0) { clutchEl.textContent = `🧊 Clutch makes: ${state.clutchMakes}/${CLUTCH_WINDOW}`; clutchEl.classList.remove("hidden"); }
    else clutchEl.classList.add("hidden");

    // Shot Chart (round 2, item 42) -- one dot per shot, positioned by its
    // launch X (0-100%), colored by outcome.
    const chartEl = document.getElementById("bh-shotchart");
    chartEl.querySelectorAll(".bh-shot-dot").forEach(d => d.remove());
    if (state.shotLog.length) {
      state.shotLog.forEach((s, i) => {
        const dot = document.createElement("div");
        dot.className = "bh-shot-dot " + (s.made ? "made" : "missed");
        dot.style.left = s.x + "%";
        dot.style.top = (20 + (i % 3) * 22) + "%"; // stagger vertically so same-X shots don't fully overlap
        chartEl.appendChild(dot);
      });
      chartEl.classList.remove("hidden");
    } else chartEl.classList.add("hidden");
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
        AIGLeaderboard.getBasketballAchievements().then(list => {
          renderAchievementBadges("bh-end-achievements", list);
          announceNewAchievements(list); // round 3
        }).catch(() => {});
      }
      // Swish-streak all-time leaderboard (round 3, item 17) -- a
      // separate ranking from made/weekly, shown alongside it.
      const streakRankEl = document.getElementById("bh-streak-rank");
      streakRankEl.classList.add("hidden");
      if (AIGLeaderboard.getBasketballStreakLeaderboard) {
        AIGLeaderboard.getBasketballStreakLeaderboard().then(r => {
          if (r && r.rank) { streakRankEl.textContent = `🔥 Swish-streak rank: #${r.rank} of ${r.total} all-time!`; streakRankEl.classList.remove("hidden"); }
        }).catch(() => {});
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
      if (i < steps.length - 1) playCountdownBeep(); else bhTone([880], 0.18, 0.14); // round 3, item 1 -- a higher "go!" chime on the last step
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
    state.comboMult = 1;
    state.lastWasPerfect = false;
    state.shotLog = [];
    state.clutchMakes = 0;
    state.mascotStreakSeenAt = 0;
    state.reboundPending = false;
    state.bestShotThisRound = null;
    state.teamScores = { 1: 0, 2: 0 };
    state.teamTurn = 1;
    // Round 3 resets
    state.streakShieldCharges = 0;
    state.streakShieldGranted = false;
    state.buzzerBonusUsed = false;
    state.bonusShotActive = false;
    state.lastGenKey = null;
    state.lightningRoundDone = false;
    chipCombo.classList.add("hidden");
    reboundBtn.classList.add("hidden");
    updateHud();
    rollLighting();

    // HUD pop-in stagger (round 3) -- force-reflow restart, same pattern
    // used throughout for re-triggerable CSS animations.
    hudEl.classList.remove("popin"); void hudEl.offsetWidth; hudEl.classList.add("popin");

    // Seasonal hoop skin (round 3, item 14) -- cosmetic-only reskin while
    // a matching hub-wide season is active, same convention as Ninja
    // Runner's seasonal boss reskins.
    if (window.AIGLeaderboard && AIGLeaderboard.getSeason) {
      const season = AIGLeaderboard.getSeason();
      if (season && season.id) court.dataset.season = season.id; else delete court.dataset.season;
    }

    // Loadout trinket (round 3, item 24) -- consumes whatever the hub's
    // pre-round Loadout economy has armed (same consumeArmedLoadout()
    // Ninja Runner/Plane Mode already use); basketball just didn't tap
    // into it before. "life"/"shield" both map to a one-time forgiveness
    // of the FIRST miss this round (basketball has no separate "lives"
    // concept to add to), "boost" is the existing global coin-boost timer
    // with nothing basketball-specific to do beyond consuming it.
    if (window.AIGLeaderboard && AIGLeaderboard.consumeArmedLoadout) {
      AIGLeaderboard.consumeArmedLoadout().then(id => {
        if (id === "life" || id === "shield") {
          state.streakShieldCharges = (state.streakShieldCharges || 0) + 1;
          state.streakShieldGranted = true; // armed immediately, not gated behind reaching STREAK_SHIELD_AT first
          showToast("🛡️ Loadout charm ready -- your first miss is forgiven!", false);
        } else if (id === "boost") {
          showToast("🪙 Coin Boost active!", false);
        }
      }).catch(() => {});
    }

    // Hot Zone (round 2, item 7) -- rolled ONCE per round (not per shot),
    // not every round gets one. Positioned as a random band of distance-
    // from-center, visualized as a ring roughly in that area of the court.
    state.hotZoneRange = rng() < HOT_ZONE_CHANCE ? (rand(0, 1) ? [4, 11] : [13, 19]) : null;
    if (state.hotZoneRange) {
      const isNear = state.hotZoneRange[0] < 12;
      hotzoneEl.style.left = isNear ? "50%" : (rand(0, 1) ? "22%" : "78%");
      hotzoneEl.style.transform = "translateX(-50%)";
      hotzoneEl.classList.remove("hidden");
    } else {
      hotzoneEl.classList.add("hidden");
    }

    // Ghost Challenge baseline (round 2, item 14) -- today's Daily
    // Challenge leader for a Daily round, this week's leader otherwise.
    state.ghostBaseline = 0;
    chipGhost.classList.add("hidden");
    if (window.AIGLeaderboard) {
      const getRank = state.daily ? AIGLeaderboard.getBasketballDailyChallengeRank : AIGLeaderboard.getBasketballWeeklyRank;
      if (getRank) {
        getRank().then(r => {
          if (r && r.top && r.top.length) { state.ghostBaseline = r.top[0].made || 0; updateGhostHud(); }
        }).catch(() => {});
      }
    }

    document.getElementById("bh-end-overlay").classList.add("hidden");
    document.getElementById("bh-start-overlay").classList.add("hidden");
    playCountdown(askNextQuestion);
  }

  // Mode toggles (round 2, items 10+13) -- Normal / Shot Clock Pressure /
  // Team Score. Affects SHOT_TIME_LIMIT_MS's effective value (read via
  // currentShotTimeLimit() instead of the constant directly) and the
  // scoring multiplier applied in handleMake.
  function currentShotTimeLimit() { return state.mode === "pressure" ? SHOT_CLOCK_PRESSURE_MS : SHOT_TIME_LIMIT_MS; }
  document.querySelectorAll(".bh-mode-opt").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".bh-mode-opt").forEach(b => b.classList.remove("sel"));
    btn.classList.add("sel");
    state.mode = btn.dataset.mode;
  }));

  // Team Score turn indicator (round 2, item 13) -- a same-device 2-
  // player alternation; the hint area doubles as the "whose turn" banner
  // right before each shot is offered (set in offerShot).

  // Player badge (round 2, items 23+38) -- courtside name + a jersey-
  // color dot hashed from the name (same "no pre-registration needed"
  // convention as the hub's own avatar-color hash).
  (function renderPlayerBadge() {
    if (!player) return;
    const badge = document.getElementById("bh-player-badge");
    let hash = 0;
    for (let i = 0; i < player.name.length; i++) hash = (hash * 31 + player.name.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    badge.innerHTML = `<span class="bh-player-badge-dot" style="background:hsl(${hue},65%,55%)">${player.name.charAt(0).toUpperCase()}</span>${player.name}`;
    badge.classList.remove("hidden");
  })();

  // Hoops Pass (round 2, item 15) -- surfaces the hub's EXISTING cross-
  // game Season Pass progress (basketball's correct answers already feed
  // it via recordTopicAttempt -> touchSeasonProgress), not a new parallel
  // system.
  if (window.AIGLeaderboard && AIGLeaderboard.getBattlePass) {
    AIGLeaderboard.getBattlePass().then(bp => {
      if (!bp) return;
      const el = document.getElementById("bh-hoops-pass");
      const next = bp.nextTier;
      const curTierIdx = bp.tiers.findIndex(t => !t.reached);
      const prevThreshold = curTierIdx > 0 ? bp.tiers[curTierIdx - 1].threshold : 0;
      const pct = next ? Math.min(100, Math.round((bp.sp - prevThreshold) / (next.threshold - prevThreshold) * 100)) : 100;
      el.innerHTML = `🎟️ Hoops Pass: Tier ${curTierIdx < 0 ? bp.tiers.length : curTierIdx + 1}${next ? ` (${next.threshold - bp.sp} SP to next)` : " (maxed!)"}<div class="bh-hp-bar"><i style="width:${pct}%"></i></div>`;
      el.classList.remove("hidden");
    }).catch(() => {});
  }

  // 3-point arc tutorial (round 2, item 41) -- shown automatically before
  // a kid's very first-ever round, reachable again anytime via the start
  // screen link.
  function showTutorial() { document.getElementById("bh-tutorial-overlay").classList.remove("hidden"); }
  document.getElementById("bh-tutorial-link").addEventListener("click", showTutorial);
  document.getElementById("bh-tutorial-close-btn").addEventListener("click", () => {
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch (e) {}
    document.getElementById("bh-tutorial-overlay").classList.add("hidden");
  });
  let seenTutorial = false;
  try { seenTutorial = localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (e) {}
  if (!seenTutorial) showTutorial();

  // Settings panel (round 3) -- sound/haptics toggles.
  function paintSettingsToggles() {
    document.getElementById("bh-settings-sound").classList.toggle("on", soundOn());
    document.getElementById("bh-settings-haptics").classList.toggle("on", hapticsOn());
  }
  document.getElementById("bh-settings-btn").addEventListener("click", () => {
    paintSettingsToggles();
    document.getElementById("bh-settings-overlay").classList.remove("hidden");
  });
  document.getElementById("bh-settings-close-btn").addEventListener("click", () => document.getElementById("bh-settings-overlay").classList.add("hidden"));
  document.getElementById("bh-settings-sound").addEventListener("click", () => {
    try { localStorage.setItem(SOUND_KEY, soundOn() ? "0" : "1"); } catch (e) {}
    paintSettingsToggles();
  });
  document.getElementById("bh-settings-haptics").addEventListener("click", () => {
    try { localStorage.setItem(HAPTICS_KEY, hapticsOn() ? "0" : "1"); } catch (e) {}
    paintSettingsToggles();
  });

  document.getElementById("bh-start-btn").addEventListener("click", () => { state.daily = false; startRound(); });
  document.getElementById("bh-daily-btn").addEventListener("click", () => { state.daily = true; startRound(); });
  document.getElementById("bh-play-again-btn").addEventListener("click", startRound);

  // A direct `?daily=1` launch starts straight into Daily Challenge rather
  // than making the kid tap the button too (same deep-link convention as
  // the hub's other `?x=1` entry points).
  if (isDaily) document.getElementById("bh-daily-btn").click();
}
