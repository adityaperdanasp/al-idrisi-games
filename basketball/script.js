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
    // Featured Challenge (round 4, item 9) -- "Streak Week" scales the
    // flat tier bonus up; state exists by call-time even though this
    // function is declared before the `const state` below (plain function
    // declarations are hoisted, only their BODY runs later).
    if (state && state.featuredChallenge && state.featuredChallenge.streakBonusMult) bonus = Math.round(bonus * state.featuredChallenge.streakBonusMult);
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

  // ---- Round 4 additions ------------------------------------------------
  const MOMENTUM_PER_MAKE = 20;      // item 4 -- 5 makes to fill, fully resets on any miss
  const MOMENTUM_POWER_MULT = 1.5;   // bonus multiplier granted to the NEXT shot once full
  const DEFENDER_BLOCK_CHANCE = 0.15; // item 2 -- only rolled when contested=true
  const DEFENDER_BLOCK_CONSOLATION = 2;
  const STEAL_CHANCE = 0.08;         // item 3 -- rolled once per question cycle (not on shot 1 or the last shot)
  const STEAL_BONUS = 3;
  const ASSIST_BONUS = 3;            // item 6 -- Team Score only, previous shot missed by the OTHER player, this one's a make
  const FATIGUE_MAX_SHRINK = 0.15;   // item 7 -- hoop tolerance shrinks up to 15% by the final shot (reverse of the difficulty ramp, same "gentle curve" idea)
  const PRACTICE_SHOTS = 1;          // item 8 -- untimed, unscored warm-up attempt(s) before question 1
  const MULTIBALL_CHANCE = 0.1;      // item 10 -- a rare SECOND bonus ball mid-round, same short-circuit pattern as the Buzzer Bonus Shot
  const MULTIBALL_BONUS = 4;
  const MULTIBALL_NOT_BEFORE = 2;    // never on shot 1/2 or the final 2 shots -- keeps it a genuine mid-round surprise
  const BIG_STREAK_LOSS_THRESHOLD = 8; // item 27
  const WAGER_WIN_MULT = 2;          // item 5 -- Double or Nothing: made Buzzer Beater doubles its own gained points, missed halves the round total
  // Free Throw mode (round 4, item 1) -- a 4th Mode toggle alongside
  // Normal/Pressure/Team: every shot spawns from the SAME fixed close-range
  // spot (no drag-aim distance variance) with every distance-based hazard
  // (moving hoop, defender, wind, lucky ball, Hot Zone) turned off -- a
  // pure accuracy drill. Streak/Hot Hand/perfect-arc/momentum bonuses still
  // apply (reuses handleMake's normal scoring path with shotValue forced
  // to FREE_THROW_POINTS instead of the usual 2pt/3pt distance tiers).
  const FREE_THROW_DIST = 8;
  const FREE_THROW_POINTS = 1;
  const DAY_GREETING_KEY = "aig_bh_last_greeting_date";
  const TUTORIAL2_KEY = "aig_bh_tutorial2_seen";
  // Weekly Featured Challenge (item 9) -- same date-hash-for-the-week
  // convention as the hub's existing Bonus Hour (deterministic, same for
  // every player that week, no Firebase round-trip needed). Each modifier
  // only ever nudges an EXISTING chance/bonus constant -- no new mechanics,
  // just a themed multiplier on something that already exists.
  const FEATURED_CHALLENGES = [
    { id: "hotzone", name: "🔆 Hot Zone Week", desc: "Hot Zones appear almost every round!", hotZoneChanceMult: 1.4 },
    { id: "streak", name: "🔥 Streak Week", desc: "Streak bonuses are extra generous!", streakBonusMult: 1.5 },
    { id: "lucky", name: "🍀 Lucky Week", desc: "Lucky Balls show up more often!", luckyChanceMult: 2.5 },
    { id: "wind", name: "💨 Windy Week", desc: "Watch for more gusty shots!", windChanceMult: 1.8 },
    { id: "perfect", name: "💯 Precision Week", desc: "The perfect-arc window is more forgiving!", perfectTolMult: 1.4 }
  ];
  function weekNumber(d) {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  }
  function currentFeaturedChallenge() {
    const d = new Date();
    const idx = (d.getFullYear() * 100 + weekNumber(d)) % FEATURED_CHALLENGES.length;
    return FEATURED_CHALLENGES[idx];
  }

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
  const momentumBar = document.getElementById("bh-momentum-bar");
  const momentumFill = document.getElementById("bh-momentum-fill");
  const weatherEl = document.getElementById("bh-weather");

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
    lightningRoundDone: false,
    // Round 4 additions
    momentum: 0,
    momentumPowerReady: false,
    stealUsed: false,
    multiballUsed: false,
    practiceShotsLeft: 0,
    wagerActive: false,
    wagerPending: false,
    lastMissedByTeam: null, // item 6 -- which team (1/2) missed the PREVIOUS shot, for Assist detection
    featuredChallenge: null,
    stealShotActive: false,
    practiceShotActive: false,
    multiballShotActive: false
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
  // Sound mixing/ducking (round 4, item 30) -- there's no background music
  // track in basketball to duck (just one-shot SFX), so this ducks SFX
  // against EACH OTHER: a sound that starts while another is still ringing
  // (e.g. a streak's crowd cheer firing right alongside that same make's
  // swish) plays a bit quieter, instead of every overlap stacking at full
  // volume and clipping/sounding harsh.
  let bhActiveSoundCount = 0;
  function bhSoundStart(durationSec) {
    bhActiveSoundCount++;
    setTimeout(() => { bhActiveSoundCount = Math.max(0, bhActiveSoundCount - 1); }, durationSec * 1000);
  }
  function bhMixGain(baseGain) {
    return bhActiveSoundCount > 0 ? baseGain * 0.65 : baseGain;
  }
  function bhTone(freqs, dur, vol, type) {
    if (!soundOn()) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      bhAudioCtx = bhAudioCtx || new C();
      if (bhAudioCtx.state === "suspended") bhAudioCtx.resume();
      const mixedVol = bhMixGain(vol != null ? vol : 0.15);
      bhSoundStart(dur * freqs.length * 0.55 + 0.1);
      let t = bhAudioCtx.currentTime;
      freqs.forEach(f => {
        const o = bhAudioCtx.createOscillator(), g = bhAudioCtx.createGain();
        o.type = type || "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(mixedVol, t + 0.02);
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
      bhSoundStart(dur + 0.05);
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
      g.gain.value = bhMixGain(vol != null ? vol : 0.2);
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
      wrap.innerHTML = owned.map(c => `<button type="button" class="bh-swatch ${c.id === equipped ? "sel" : ""}" data-id="${c.id}" data-name="${c.name}" title="${c.name}">${c.preview}</button>`).join("");
      wrap.querySelectorAll(".bh-swatch").forEach(b => {
        b.onclick = async () => {
          const id = b.dataset.id;
          await AIGLeaderboard.equipCosmetic(catalogKey, id);
          applyFn(id);
          renderSwatches(containerId, catalogKey, applyFn);
        };
        // Long-press cosmetic preview (round 4, item 16) -- holding a
        // swatch shows its name in a small tooltip above it, without
        // actually equipping anything (that still only happens on a plain
        // tap/click, via onclick above).
        let pressTimer = null;
        const showPreview = () => {
          const tip = document.createElement("div");
          tip.className = "bh-cosmetic-preview";
          tip.textContent = `${b.textContent} ${b.dataset.name}`;
          b.appendChild(tip);
        };
        const clearPreview = () => { clearTimeout(pressTimer); const tip = b.querySelector(".bh-cosmetic-preview"); if (tip) tip.remove(); };
        b.addEventListener("pointerdown", () => { pressTimer = setTimeout(showPreview, 450); });
        ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, clearPreview));
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

  // Achievement progress bars (round 4, item 29) -- the badge row above is
  // a flat locked/unlocked; this adds a numeric progress fraction for the
  // few locked ones CLOSEST to unlocking, so "almost there" is visible
  // instead of every locked badge looking equally far away.
  const ACH_PROGRESS_SHOW = 3;
  function renderAchievementProgress(list) {
    const el = document.getElementById("bh-ach-progress-row");
    if (!el) return;
    const locked = (list || []).filter(a => !a.unlocked && a.target > 0);
    locked.sort((a, b) => (b.current / b.target) - (a.current / a.target));
    const shown = locked.slice(0, ACH_PROGRESS_SHOW);
    if (!shown.length) { el.innerHTML = ""; return; }
    el.innerHTML = shown.map(a => {
      const pct = Math.min(100, Math.round((a.current / a.target) * 100));
      return `<div class="bh-ach-progress-item">${a.emoji} ${a.name} -- ${a.current}/${a.target}<div class="bh-ach-progress-bar"><i style="width:${pct}%"></i></div></div>`;
    }).join("");
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
      AIGLeaderboard.getBasketballAchievements().then(list => {
        renderAchievementBadges("bh-start-achievements", list);
        renderAchievementProgress(list); // round 4, item 29
      }).catch(() => {});
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
  // Subtoast QUEUE (round 4, item 11) -- a real bug this fixes: several
  // bonuses can fire subtoast calls in the SAME synchronous handleMake
  // tick (e.g. a fresh Streak Shield grant immediately followed by the
  // priority-chain's own half-court/hot-zone/contested message) -- before
  // this, the later call just silently overwrote/restarted the earlier
  // one's animation before a kid ever got to read it. Now each queued
  // message gets its own full ~700ms window before the next one shows.
  const SUBTOAST_MS = 750;
  let subtoastQueue = [];
  let subtoastBusy = false;
  function showSubtoast(text) {
    subtoastQueue.push(text);
    if (!subtoastBusy) drainSubtoastQueue();
  }
  function drainSubtoastQueue() {
    if (!subtoastQueue.length) { subtoastBusy = false; return; }
    subtoastBusy = true;
    const text = subtoastQueue.shift();
    subtoastEl.textContent = text;
    subtoastEl.classList.remove("show");
    void subtoastEl.offsetWidth;
    subtoastEl.classList.add("show");
    setTimeout(drainSubtoastQueue, SUBTOAST_MS);
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

    // Progressive hoop glow approaching Perfect Round (round 4, item 20)
    // -- only climbs while EVERY shot so far has been a make, late in
    // the round; any miss along the way means this just stays off.
    const perfectSoFar = state.made === state.qIndex && state.qIndex >= 7;
    const tension = !perfectSoFar ? 0 : state.qIndex >= 9 ? 3 : state.qIndex >= 8 ? 2 : 1;
    if (tension > 0) rim.dataset.perfectTension = String(tension); else delete rim.dataset.perfectTension;
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

  // Momentum meter (round 4, item 4) -- fills a fixed amount per make,
  // FULLY empties on any miss (distinct texture from Hot Hand, which only
  // ever resets via the streak counter breaking). Hitting 100 arms a one-
  // shot 1.5x bonus for the VERY NEXT make, consumed automatically there.
  function updateMomentum(madeShot) {
    if (madeShot) {
      state.momentum = Math.min(100, state.momentum + MOMENTUM_PER_MAKE);
      if (state.momentum >= 100 && !state.momentumPowerReady) {
        state.momentumPowerReady = true;
        showSubtoast("⚡ Momentum charged!");
      }
    } else {
      state.momentum = 0;
      state.momentumPowerReady = false;
    }
    momentumBar.classList.toggle("hidden", state.momentum <= 0 && !state.momentumPowerReady);
    momentumFill.style.width = state.momentum + "%";
    momentumBar.classList.toggle("full", state.momentumPowerReady);
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
  // `big` (round 4, item 15) -- the Perfect Round cannon: more pieces,
  // fired from 2 fixed corner origins instead of one center-ish spread, no
  // new CSS class needed (reuses .bh-confetti-piece as-is).
  function burstConfetti(big) {
    const count = big ? 40 : 16;
    const origins = big ? [12, 88] : [50];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "bh-confetti-piece";
      const origin = origins[i % origins.length];
      piece.style.left = (origin - 10 + Math.random() * 20) + "%";
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = (Math.random() * (big ? 300 : 150)) + "ms";
      piece.style.transform = `translateX(${(Math.random() - 0.5) * (big ? 200 : 120)}px)`;
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
    const isFreeThrow = state.mode === "freethrow"; // item 1
    // Wide spawn (round 3 fix) -- occasionally spawns from much further
    // out so Half-court/Full Court Press (round 2/3) are actually
    // reachable; most shots still spawn in the comfortable 32-68 band.
    // Free Throw mode skips this entirely -- always the SAME fixed spot.
    const spawnX = isFreeThrow ? HOOP_X - FREE_THROW_DIST : (rng() < WIDE_SPAWN_CHANCE ? rand(8, 92) : rand(32, 68));
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
    state.hoopMoving = !isLastShot && !isFreeThrow && rng() < MOVING_HOOP_CHANCE;
    state.hoopX = HOOP_X;
    if (!state.hoopMoving) setHoopX(HOOP_X, false);

    // Contested shot / defender (round 1, item 13) -- decorative only,
    // never on the Buzzer Beater (keeps that climax shot's own feedback
    // uncluttered), and never in Free Throw mode (item 1) -- no defender
    // guards a real free throw.
    state.contested = !isLastShot && !isFreeThrow && rng() < CONTESTED_CHANCE;
    defenderEl.classList.toggle("show", state.contested);

    // Buzzer Beater (round 1, items 16+20) -- the round's final shot: a
    // shrunk, doubled-value shot with its own countdown ring urgency.
    rim.classList.toggle("buzzer", isLastShot);
    net.classList.toggle("buzzer", isLastShot);
    if (isLastShot && !state.bonusShotActive) playBuzzer(); // round 3, item 1 -- never on the bonus epilogue shot itself

    // Wind hazard (round 2, item 11) -- ALWAYS telegraphed before launch
    // (see the .bh-wind indicator), never on the Buzzer Beater or in Free
    // Throw mode (item 1 -- no hazards on a real free throw). Featured
    // Challenge (round 4, item 9) can scale the chance up on "Windy Week".
    const windChance = Math.min(1, WIND_CHANCE * (state.featuredChallenge && state.featuredChallenge.windChanceMult || 1));
    state.windActive = !isLastShot && !isFreeThrow && rng() < windChance;
    state.windDelta = state.windActive ? (rand(0, 1) ? 1 : -1) * WIND_STRENGTH : 0;
    windEl.classList.toggle("hidden", !state.windActive);

    // Lucky Ball (round 2, item 9) -- a rare golden-ball variant, overrides
    // whatever skin is equipped for just this one shot (visual only via
    // the "lucky" data-skin, reverted next shot by applyBallSkin's own
    // re-render -- see resetBallForNextShot being the only place .skin
    // gets set besides the cosmetic picker). Featured Challenge can scale
    // the chance up on "Lucky Week".
    const luckyChance = Math.min(1, LUCKY_BALL_CHANCE * (state.featuredChallenge && state.featuredChallenge.luckyChanceMult || 1));
    state.luckyBall = !isLastShot && !isFreeThrow && rng() < luckyChance;
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
        // Haptic variety (round 4, item 17) -- the Lightning Round gets its
        // own distinct buzz pattern (quick triple-tap) instead of reusing
        // a regular make/miss pattern, so it reads as its own event.
        try {
          if (hapticsOn() && navigator.vibrate) navigator.vibrate(correct ? [15, 15, 15, 15, 15] : [60]);
        } catch (e) {}
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
    maybeOfferSteal(() => maybeOfferLightningRound(askNextQuestionReal));
  }

  // Steal bonus (round 4, item 3) -- once per round at most, skips the
  // question gate entirely for an instant free shot. Never on the very
  // first shot (too much already happening right after the countdown) or
  // the final 2 (keeps the Buzzer Beater build-up clean), and never on
  // the Lightning Round's own checkpoint shot.
  function maybeOfferSteal(onDone) {
    if (state.stealUsed || state.qIndex === 0 || state.qIndex === LIGHTNING_ROUND_AT || state.qIndex >= ROUND_SIZE - 2 || rng() >= STEAL_CHANCE) { onDone(); return; }
    state.stealUsed = true;
    const flash = document.getElementById("bh-steal-flash");
    flash.textContent = "🏃 STEAL! Free shot!";
    flash.classList.remove("show"); void flash.offsetWidth; flash.classList.add("show");
    state.stealShotActive = true;
    resetBallForNextShot();
    offerShot();
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
        // Double-or-Nothing wager (round 4, item 5) -- offered right
        // before the Buzzer Beater shot, skipped on Daily Challenge rounds
        // since that leaderboard compares a fixed score across players and
        // a coin-flip swing would make the comparison less meaningful.
        if (state.qIndex === ROUND_SIZE && !state.daily) {
          offerWager();
        } else {
          resetBallForNextShot();
          offerShot();
        }
      } else {
        // Big streak-loss shake (round 4, item 27) -- same dramatic shake
        // as a missed-shot streak break, checked before the reset below.
        if (state.streak >= BIG_STREAK_LOSS_THRESHOLD && !(state.streakShieldCharges > 0)) {
          court.classList.remove("big-streak-loss"); void court.offsetWidth; court.classList.add("big-streak-loss");
        }
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
        updateMomentum(false); // round 4, item 4
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
    // Free Throw mode (item 1) -- every shot spawns at the SAME fixed
    // close-range spot (see resetBallForNextShot), so none of the
    // distance-tiered bonuses below make sense; every make is worth a flat
    // FREE_THROW_POINTS instead of the usual 2pt/3pt/trick/half/full-court
    // tiers. Streak/Hot Hand/perfect-arc/momentum bonuses still apply --
    // those aren't distance-based, see handleMake.
    const isFreeThrow = state.mode === "freethrow";
    // Half-court tier (round 2, item 5 in gameplay list) -- a step ABOVE
    // the existing trick-shot distance, same priority idea: the harder the
    // throw, the bigger the one-time bonus, checked independently of the
    // 2pt/3pt value itself.
    const shotValue = isFreeThrow ? FREE_THROW_POINTS : (launchDistFromCenter >= THREE_PT_DIST ? 3 : 2);
    const isTrickShot = !isFreeThrow && launchDistFromCenter >= TRICK_SHOT_DIST && launchDistFromCenter < HALF_COURT_DIST;
    const isHalfCourt = !isFreeThrow && launchDistFromCenter >= HALF_COURT_DIST && launchDistFromCenter < FULL_COURT_DIST;
    const isFullCourt = !isFreeThrow && launchDistFromCenter >= FULL_COURT_DIST; // round 3, item 4
    // Hot Zone (round 2, item 7) -- bonus if THIS launch position falls
    // inside the round's rolled band (see startRound), on top of whatever
    // 2pt/3pt/trick-shot tier it also qualifies for.
    const inHotZone = !isFreeThrow && state.hotZoneRange && launchDistFromCenter >= state.hotZoneRange[0] && launchDistFromCenter <= state.hotZoneRange[1];
    const isLastShot = state.qIndex === ROUND_SIZE;
    const isMidClimax = state.qIndex === MID_CLIMAX_AT && !isLastShot;
    const hoopMoveStart = performance.now();
    const hoopMoveTarget = HOOP_X + (rand(0, 1) ? 1 : -1) * MOVING_HOOP_RANGE;
    let frames = 0;
    let bankNudged = false; // item 2 -- a bank-shot nudge only ever applies ONCE per flight
    // Shot fatigue (round 4, item 7) -- the hoop's own collision tolerance
    // shrinks a little across the round (reverse of the difficulty ramp's
    // "gentler early, harder later" idea, but for TIMING precision instead
    // of math difficulty). Never on the Buzzer Beater or any bonus-type
    // shot (steal/multiball/practice/bonus) -- those already have their
    // own distinct stakes and shouldn't ALSO get stacked with this.
    const isBonusTypeShot = state.bonusShotActive || state.stealShotActive || state.multiballShotActive || state.practiceShotActive;
    const fatigueMult = (!isLastShot && !isBonusTypeShot) ? 1 - (state.qIndex / ROUND_SIZE) * FATIGUE_MAX_SHRINK : 1;
    const tolX = HOOP_TOL_X * fatigueMult;
    const tolYMin = HOOP_TOL_Y_MIN + (HOOP_TOL_Y_MAX - HOOP_TOL_Y_MIN) * (1 - fatigueMult) * 0.3;
    const tolYMax = HOOP_TOL_Y_MAX - (HOOP_TOL_Y_MAX - HOOP_TOL_Y_MIN) * (1 - fatigueMult) * 0.3;
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

      const inHoopX = Math.abs(nx - state.hoopX) < tolX;
      const inHoopY = ny > tolYMin && ny < tolYMax;
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
      // Court boundary glow (round 4, item 13) -- a quick edge cue when
      // the ball's path passes very close to the side boundary, purely
      // cosmetic, never affects the out-of-bounds check below.
      if (nx < 8) { court.classList.add("edge-glow-l"); setTimeout(() => court.classList.remove("edge-glow-l"), 200); }
      else if (nx > 92) { court.classList.add("edge-glow-r"); setTimeout(() => court.classList.remove("edge-glow-r"), 200); }
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
      try { if (hapticsOn() && navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 80]); } catch (e) {} // item 17 -- its own fanfare pattern
      setTimeout(finishRound, 1000);
      return;
    }
    // Steal bonus shot (round 4, item 3) -- a flat bonus, then falls
    // straight back into the NORMAL question flow for the SAME qIndex
    // (this fired BEFORE the question, not instead of a real shot slot).
    if (state.stealShotActive) {
      state.stealShotActive = false;
      state.points += STEAL_BONUS;
      finishShot();
      net.classList.remove("swish"); void net.offsetWidth; net.classList.add("swish");
      playSwish();
      showToast(`🏃 Steal make! +${STEAL_BONUS}`, false);
      updateHud();
      try { if (hapticsOn() && navigator.vibrate) navigator.vibrate([20, 10, 20]); } catch (e) {} // item 17 -- quick double-tap, distinct from a regular make
      setTimeout(() => maybeOfferLightningRound(askNextQuestionReal), 900);
      return;
    }
    // Multiball bonus shot (round 4, item 10) -- same shape as the Steal
    // above, just a different trigger site (see resetBallForNextShot).
    if (state.multiballShotActive) {
      state.multiballShotActive = false;
      state.points += MULTIBALL_BONUS;
      finishShot();
      net.classList.remove("swish"); void net.offsetWidth; net.classList.add("swish");
      playSwish();
      showToast(`🏀🏀 Multiball make! +${MULTIBALL_BONUS}`, false);
      updateHud();
      try { if (hapticsOn() && navigator.vibrate) navigator.vibrate([15, 10, 15, 10, 15]); } catch (e) {} // item 17 -- quick triple-tap, distinct from Steal's double
      setTimeout(() => maybeOfferLightningRound(askNextQuestionReal), 900);
      return;
    }
    // Practice shot (round 4, item 8) -- zero scoring impact either way,
    // just works through PRACTICE_SHOTS attempts before the real round.
    if (state.practiceShotActive) {
      state.practiceShotActive = false;
      state.practiceShotsLeft -= 1;
      finishShot();
      net.classList.remove("swish"); void net.offsetWidth; net.classList.add("swish");
      playSwish();
      showToast("Nice warm-up shot!", false);
      setTimeout(offerNextPracticeOrStart, 900);
      return;
    }
    const { shotValue, isTrickShot, isHalfCourt, isFullCourt, inHotZone, isMidClimax, launchX, edgeDist, isLastShot, airFrames } = info;

    // Real defender block (round 4, item 2) -- the decorative defender
    // from round 1 gets a genuine (small, contested-only) chance to swat
    // what would've been a make. Never on the Buzzer Beater (keeps that
    // shot's own feedback simple, same exclusion the defender's SPAWN
    // roll already uses in resetBallForNextShot). A block still earns a
    // small consolation, same shape as a rim-save miss.
    if (state.contested && !isLastShot && rng() < DEFENDER_BLOCK_CHANCE) {
      state.flying = false;
      state.streak = 0;
      state.comboMult = 1;
      state.mascotStreakSeenAt = 0;
      chipCombo.classList.add("hidden");
      state.points += DEFENDER_BLOCK_CONSOLATION;
      state.shotLog.push({ x: launchX, made: false });
      finishShot();
      defenderEl.classList.remove("blocked"); void defenderEl.offsetWidth; defenderEl.classList.add("blocked");
      court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch");
      playRimClank();
      showToast(`🛡️ BLOCKED! (+${DEFENDER_BLOCK_CONSOLATION})`, true);
      try { if (hapticsOn() && navigator.vibrate) navigator.vibrate([30, 20, 30]); } catch (e) {}
      updateHud();
      updateMomentum(false); // round 4, item 4 -- a block still empties momentum, same as any other miss
      defenderEl.classList.remove("show");
      rim.classList.remove("buzzer"); net.classList.remove("buzzer");
      if (state.hoopMoving) setHoopX(HOOP_X, false);
      if (state.mode === "team") state.lastMissedByTeam = state.teamTurn;
      runNextBar(900);
      setTimeout(askNextQuestion, 900);
      return;
    }

    state.flying = false;
    state.made++;
    state.streak++;
    if (state.streak > state.bestStreakThisRound) state.bestStreakThisRound = state.streak;
    updateMomentum(true); // round 4, item 4

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
    // Featured Challenge (round 4, item 9) -- "Precision Week" widens the
    // perfect-arc window so Nothing-but-net calls happen more often.
    const perfectTol = PERFECT_ARC_TOL_X * (state.featuredChallenge && state.featuredChallenge.perfectTolMult || 1);
    const isPerfect = edgeDist < perfectTol;
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
    // Momentum power (round 4, item 4) -- consumes the charge earned by
    // filling the meter, applied to THIS make, then clears until refilled.
    let usedMomentum = false;
    if (state.momentumPowerReady) {
      gained = Math.round(gained * MOMENTUM_POWER_MULT);
      state.momentumPowerReady = false;
      momentumBar.classList.remove("full");
      usedMomentum = true;
    }
    // Assist bonus (round 4, item 6) -- Team Score only: the OTHER
    // player's previous shot was a miss, and this make is the very next
    // shot (which the qIndex-based turn alternation guarantees is the
    // OTHER player, so no extra same-player check is needed here).
    let gotAssist = false;
    if (state.mode === "team" && state.lastMissedByTeam != null && state.lastMissedByTeam !== state.teamTurn) {
      gained += ASSIST_BONUS;
      gotAssist = true;
    }
    state.lastMissedByTeam = null;
    // Double-or-Nothing wager, win side (round 4, item 5) -- doubles THIS
    // shot's own gained points (on top of BUZZER_MULT etc. already baked
    // into `gained` above), consumed once so it can't double-dip if
    // somehow re-entered.
    let wagerWon = false;
    if (isLastShot && state.wagerActive) {
      gained *= WAGER_WIN_MULT;
      wagerWon = true;
      state.wagerActive = false;
    }
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
    if (usedMomentum) showSubtoast(`⚡ Momentum power! ×${MOMENTUM_POWER_MULT}`); // round 4, item 4
    if (gotAssist) showSubtoast(`🤝 Assist! +${ASSIST_BONUS}`); // round 4, item 6
    if (wagerWon) showSubtoast(`🎲 Wager won! ×${WAGER_WIN_MULT}`); // round 4, item 5
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

    // Zoom-out for Full Court Press (round 4, item 14) -- the opposite
    // gesture from the Buzzer Beater's zoom-in, pulling the camera back
    // to read as "that was from WAY downtown" instead of a close-up.
    if (isFullCourt) { court.classList.remove("fullcourt-zoom"); void court.offsetWidth; court.classList.add("fullcourt-zoom"); }

    // Buzzer bonus shot (round 3, item 15) -- after a MADE Buzzer Beater,
    // one extra no-question-gate shot before the round truly ends.
    if (isLastShot && !state.buzzerBonusUsed) {
      state.buzzerBonusUsed = true;
      setTimeout(offerBuzzerBonusShot, 1200);
    } else if (!isLastShot && !state.multiballUsed && state.qIndex > MULTIBALL_NOT_BEFORE && state.qIndex < ROUND_SIZE - MULTIBALL_NOT_BEFORE && rng() < MULTIBALL_CHANCE) {
      // Multiball (round 4, item 10) -- rare, mid-round only, once per round.
      state.multiballUsed = true;
      setTimeout(offerMultiballBonus, 1000);
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

  // Multiball bonus (round 4, item 10) -- a rare SECOND ball offered right
  // after a regular make, mid-round. Simplified from "2 balls on screen
  // at once" (real dual-ball physics risks interfering with the already-
  // carefully-tuned single-ball arc) to the SAME sequential short-circuit
  // pattern as the Buzzer Bonus Shot, just triggered randomly instead of
  // always at the very end.
  function offerMultiballBonus() {
    if (state.ended) return;
    showToast("🏀🏀 Multiball! One more for a bonus!", false);
    state.multiballShotActive = true;
    resetBallForNextShot();
    offerShot();
  }

  // Practice shots (round 4, item 8) -- PRACTICE_SHOTS untimed, unscored
  // warm-up attempts before question 1, so a kid gets a feel for the
  // physics before anything counts. Shares the normal drag/launch path
  // via state.practiceShotActive's short-circuit in handleMake/handleMiss.
  function offerNextPracticeOrStart() {
    if (state.ended) return;
    hint.classList.remove("practice-hint");
    if (state.practiceShotsLeft <= 0) { askNextQuestion(); return; }
    state.practiceShotActive = true;
    resetBallForNextShot();
    state.contested = false; defenderEl.classList.remove("show"); // keep the practice attempt simple
    offerShot();
    hint.textContent = "🌟 Practice shot -- doesn't count! Drag to shoot.";
    hint.classList.add("practice-hint");
  }

  // Double-or-Nothing wager (round 4, item 5) -- offered right before the
  // Buzzer Beater shot (see handleAnswer's isCorrect branch). "Wager it"
  // arms state.wagerActive, which handleMake/handleMiss below consume once
  // that shot resolves -- doubles the shot's own gained points on a make,
  // halves the round's running total on a miss. "Play it safe" just
  // proceeds into the normal Buzzer Beater flow unchanged.
  function offerWager() {
    state.wagerPending = true;
    document.getElementById("bh-wager-sub").textContent = `You have ${state.points} points. Wager it on your Buzzer Beater: make it for ${WAGER_WIN_MULT}x, miss it and lose half?`;
    document.getElementById("bh-wager-overlay").classList.remove("hidden");
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
    // Steal/Multiball/Practice misses (round 4, items 3+10+8) -- all 3
    // cost nothing, just resume whatever flow they interrupted.
    if (state.stealShotActive || state.multiballShotActive) {
      state.stealShotActive = false;
      state.multiballShotActive = false;
      finishShot();
      showToast("Missed it -- no harm done!", true);
      setTimeout(() => maybeOfferLightningRound(askNextQuestionReal), 900);
      return;
    }
    if (state.practiceShotActive) {
      state.practiceShotActive = false;
      state.practiceShotsLeft -= 1;
      finishShot();
      showToast("That's okay, it's just practice!", true);
      setTimeout(offerNextPracticeOrStart, 900);
      return;
    }
    state.flying = false;
    // Double-or-Nothing wager, lose side (round 4, item 5) -- a missed
    // wagered Buzzer Beater halves the ROUND's running total (not just
    // this shot's would-be gain, since a miss earns nothing on its own).
    if (isLastShot && state.wagerActive) {
      state.wagerActive = false;
      state.points = Math.floor(state.points / 2);
      updateHud();
      showSubtoast("🎲 Wager lost -- half your points are gone!");
    }
    // Big streak-loss shake (round 4, item 27) -- a more dramatic camera
    // shake than the standard miss-vignette when a REALLY big streak
    // breaks, checked against the OLD streak value before it resets below.
    if (state.streak >= BIG_STREAK_LOSS_THRESHOLD && !(state.streakShieldCharges > 0)) {
      court.classList.remove("big-streak-loss"); void court.offsetWidth; court.classList.add("big-streak-loss");
    }
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
    updateMomentum(false); // round 4, item 4 -- a miss always fully empties momentum
    if (state.mode === "team") state.lastMissedByTeam = state.teamTurn; // round 4, item 6 -- the OTHER player's next make can earn an Assist
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
    // Perfect Round confetti cannon (round 4, item 15) -- a bigger burst
    // than the normal 3+ streak confetti, fired twice in quick succession
    // from 2 corners for a "cannon" feel instead of one single pop.
    if (isPerfectRound) { burstConfetti(true); setTimeout(() => burstConfetti(true), 300); }
    // Score roll-up counter (round 3) -- counts up from 0 instead of the
    // number just appearing already-set.
    const pointsEl = document.getElementById("bh-end-points");
    // Auto-scaling score font (round 4, item 23) -- a very high point
    // total shrinks slightly rather than overflowing/wrapping awkwardly.
    pointsEl.classList.toggle("long-number", state.points >= 1000);
    animateScoreRollup(pointsEl, state.points, " points", "⭐ ");
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
      const rankSpinner = document.getElementById("bh-rank-spinner");
      rankEl.innerHTML = "";
      let rankPromise = Promise.resolve();
      // Loading spinner (round 4, item 22) -- shown for however long the
      // rank fetch(es) below take, hidden once they settle either way.
      rankSpinner.classList.remove("hidden");
      if (state.daily && AIGLeaderboard.touchBasketballDailyChallenge) {
        rankPromise = AIGLeaderboard.touchBasketballDailyChallenge(made)
          .then(() => AIGLeaderboard.getBasketballDailyChallengeRank())
          .then(r => { if (r && r.rank) rankEl.innerHTML = `<span class="bh-tournament-stage">${tournamentStageLabel(r.rank, r.total)}</span><div>📅 Today's Daily Challenge: #${r.rank} of ${r.total}!</div>`; })
          .catch(() => {});
      } else if (!state.daily && AIGLeaderboard.touchBasketballWeeklyBest) {
        rankPromise = AIGLeaderboard.touchBasketballWeeklyBest(made)
          .then(() => AIGLeaderboard.getBasketballWeeklyRank())
          .then(r => { if (r && r.rank) rankEl.innerHTML = `<span class="bh-tournament-stage">${tournamentStageLabel(r.rank, r.total)}</span><div>🏅 #${r.rank} of ${r.total} this week among your classmates!</div>`; })
          .catch(() => {});
      }
      rankPromise.then(() => rankSpinner.classList.add("hidden"));
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

  // Tournament stage label (round 4, item 26) -- a cosmetic reframing of
  // the EXISTING weekly/daily rank into bracket-style stage names, not a
  // real bracket/pairing system -- just makes "#3 of 24" read with a bit
  // more flavor.
  function tournamentStageLabel(rank, total) {
    if (rank === 1) return "🏆 Champion";
    if (rank <= Math.max(2, Math.ceil(total * 0.1))) return "🥇 Finals";
    if (rank <= Math.max(4, Math.ceil(total * 0.25))) return "⚡ Semifinals";
    if (rank <= Math.max(8, Math.ceil(total * 0.5))) return "🔥 Quarterfinals";
    return "🌱 Qualifiers";
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
    // Round 4 resets
    state.momentum = 0;
    state.momentumPowerReady = false;
    state.stealUsed = false;
    state.multiballUsed = false;
    state.practiceShotsLeft = PRACTICE_SHOTS;
    state.lastMissedByTeam = null;
    state.wagerActive = false;
    state.wagerPending = false;
    document.getElementById("bh-wager-overlay").classList.add("hidden");
    subtoastQueue = []; subtoastBusy = false; // item 11 -- never carry a stale queue into a fresh round
    chipCombo.classList.add("hidden");
    momentumBar.classList.add("hidden", "full"); momentumFill.style.width = "0%";
    reboundBtn.classList.add("hidden");
    updateHud();
    rollLighting();

    // Weekly Featured Challenge (round 4, item 9) -- rolled fresh every
    // round start (it's the SAME modifier all week, just re-displayed).
    state.featuredChallenge = currentFeaturedChallenge();
    const fc = document.getElementById("bh-featured-challenge");
    fc.textContent = `${state.featuredChallenge.name}: ${state.featuredChallenge.desc}`;
    fc.classList.remove("hidden");

    // Weather (round 4, item 12) -- rolled once per round, independent of
    // the Rooftop Sunset court skin's own birds.
    weatherEl.className = "bh-weather";
    weatherEl.innerHTML = "";
    const weatherRoll = rng();
    if (weatherRoll < 0.15) {
      weatherEl.classList.add("rain");
      weatherEl.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="left:${rand(0, 95)}%;animation-duration:${0.7 + rng() * 0.4}s;animation-delay:${rng() * 1}s"></i>`).join("");
    } else if (weatherRoll < 0.25) {
      weatherEl.classList.add("snow");
      weatherEl.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="left:${rand(0, 95)}%;animation-duration:${2 + rng() * 2}s;animation-delay:${rng() * 2}s"></i>`).join("");
    }

    // First-shot-of-the-day greeting (round 4, item 18)
    let lastGreetingDate = null;
    try { lastGreetingDate = localStorage.getItem(DAY_GREETING_KEY); } catch (e) {}
    const today = new Date().toISOString().slice(0, 10);
    if (lastGreetingDate !== today) {
      try { localStorage.setItem(DAY_GREETING_KEY, today); } catch (e) {}
      const greet = document.createElement("div");
      greet.className = "bh-day-greeting";
      greet.textContent = `👋 Welcome back, ${player ? player.name : "shooter"}!`;
      court.appendChild(greet);
      requestAnimationFrame(() => { greet.classList.add("show"); setTimeout(() => greet.remove(), 2400); });
    }

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
    // Featured Challenge (item 9) nudges the Hot Zone chance if that's
    // this week's modifier -- capped at 1 so the roll stays a real roll.
    const hotZoneChance = Math.min(1, HOT_ZONE_CHANCE * (state.featuredChallenge.hotZoneChanceMult || 1));
    // Free Throw mode (item 1) never rolls a Hot Zone -- every shot spawns
    // from the same fixed close-range spot, so a distance-based band would
    // either always or never apply, neither of which is an interesting roll.
    state.hotZoneRange = (state.mode !== "freethrow" && rng() < hotZoneChance) ? (rand(0, 1) ? [4, 11] : [13, 19]) : null;
    if (state.hotZoneRange) {
      const isNear = state.hotZoneRange[0] < 12;
      hotzoneEl.style.left = isNear ? "50%" : (rand(0, 1) ? "22%" : "78%");
      hotzoneEl.style.transform = "translateX(-50%)";
      hotzoneEl.classList.remove("hidden");
      maybeShowTutorial2(); // round 4, item 28
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
    // Practice shots (round 4, item 8) -- offered right after the
    // countdown, before question 1, instead of jumping straight to it.
    playCountdown(offerNextPracticeOrStart);
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
    // Jersey number (round 4, item 25) -- same hash, just a different
    // modulus/offset so it doesn't collide with the hue roll above; a
    // flavor detail only, never read anywhere else in game logic.
    const jerseyNumber = (Math.abs(hash) % 99) + 1;
    badge.innerHTML = `<span class="bh-player-badge-dot" style="background:hsl(${hue},65%,55%)">${player.name.charAt(0).toUpperCase()}</span>${player.name}<span class="bh-player-badge-number">#${jerseyNumber}</span>`;
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

  // Hot Zone explainer (round 4, item 28) -- unlike the tutorial above,
  // this can't show on page load (plenty of rounds never roll a Hot Zone
  // at all, see startRound) -- it fires the first time a round ACTUALLY
  // gets one, called from startRound right after hotzoneEl is revealed.
  function maybeShowTutorial2() {
    let seenT2 = false;
    try { seenT2 = localStorage.getItem(TUTORIAL2_KEY) === "1"; } catch (e) {}
    if (seenT2) return;
    document.getElementById("bh-tutorial2-sub").textContent = "That glowing ring on the court is a Hot Zone! Land a shot inside it for a bonus on top of everything else.";
    document.getElementById("bh-tutorial2-overlay").classList.remove("hidden");
  }
  document.getElementById("bh-tutorial2-close-btn").addEventListener("click", () => {
    try { localStorage.setItem(TUTORIAL2_KEY, "1"); } catch (e) {}
    document.getElementById("bh-tutorial2-overlay").classList.add("hidden");
  });

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

  // Double-or-Nothing wager buttons (round 4, item 5) -- see offerWager.
  document.getElementById("bh-wager-yes-btn").addEventListener("click", () => {
    if (!state.wagerPending) return;
    state.wagerPending = false;
    state.wagerActive = true;
    document.getElementById("bh-wager-overlay").classList.add("hidden");
    resetBallForNextShot();
    offerShot();
  });
  document.getElementById("bh-wager-no-btn").addEventListener("click", () => {
    if (!state.wagerPending) return;
    state.wagerPending = false;
    state.wagerActive = false;
    document.getElementById("bh-wager-overlay").classList.add("hidden");
    resetBallForNextShot();
    offerShot();
  });

  document.getElementById("bh-start-btn").addEventListener("click", () => { state.daily = false; startRound(); });
  document.getElementById("bh-daily-btn").addEventListener("click", () => { state.daily = true; startRound(); });
  document.getElementById("bh-play-again-btn").addEventListener("click", startRound);

  // A direct `?daily=1` launch starts straight into Daily Challenge rather
  // than making the kid tap the button too (same deep-link convention as
  // the hub's other `?x=1` entry points).
  if (isDaily) document.getElementById("bh-daily-btn").click();
}
