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
    normal: { durationMult: 1, windowWiden: 0, weight: 40, label: null },
    fast: { durationMult: 0.72, windowWiden: 0, weight: 12, label: "⚡ Fast Serve!" },
    lob: { durationMult: 1.35, windowWiden: 6, weight: 12, label: "🏐 Lob" },
    slice: { durationMult: 1, windowWiden: -6, weight: 8, label: "🔪 Slice" },
    // Round 3, item 7 -- sillier serves, each with its own ball emoji
    banana: { durationMult: 1.05, windowWiden: 0, weight: 10, label: "🍌 Banana Serve", emoji: "🍌" },
    rocket: { durationMult: 0.58, windowWiden: -3, weight: 8, label: "🚀 Rocket Serve!", emoji: "🚀", bonus: 20 },
    balloon: { durationMult: 1.6, windowWiden: 8, weight: 10, label: "🎈 Balloon Serve", emoji: "🎈" }
  };

  // ============== ROUND 2 constants (animation/UI-UX/gameplay) ==========
  const RAIN_CHANCE = 0.1, RAIN_WINDOW_SHRINK = 4;      // item 31 -- independent of wind, narrows the sweet window a touch
  const CLUTCH_WINDOW = 3;                              // item 30 -- final N real serves of the match
  // Deuce (item 27) -- there's no real "opponent score" in this solo format,
  // so this is an explicit reframing: entering the penultimate serve, if the
  // match has been a genuine coin-flip so far (points won close to half of
  // serves played), call it a Deuce and raise the stakes on the final 2
  // serves with a flat multiplier -- cosmetic tension, not real tennis rules.
  const DEUCE_AT = ROUND_SIZE - 2;
  const DEUCE_BAND = 0.15;                              // within +/-15% of a 50/50 split counts as "close"
  const DEUCE_MULT = 1.4;
  const VOLLEY_CHANCE_2 = 0.1;                          // item 33 -- a SECOND continuation, only after the first volley is already won
  const RALLY_LENGTH_BONUS = 8;                         // item 33 -- per extra volley survived before the point is won
  // Robot opponent "personality" (item 29) -- a cosmetic choice that also
  // biases which lane the robot favors; `classic` stays a uniform roll.
  const ROBOT_LANE_WEIGHTS = {
    classic: { left: 1, center: 1, right: 1 },
    lefty: { left: 2, center: 1, right: 1 },
    rightie: { left: 1, center: 1, right: 2 }
  };
  const ROBOT_FACES = { classic: "🤖", lefty: "🦾", rightie: "🦿" };
  const HISTORY_KEY = "aig_mt_history", HISTORY_MAX = 5;      // item 14
  const REDUCED_MOTION_KEY = "aig_mt_reduced_motion";         // item 16
  const NEW_BADGE_KEY = "aig_mt_round2_seen";                 // item 25

  // ============== ROUND 3 constants (fun-first) ==============
  const TWIST_CHANCE = 0.28;                       // items 1/3/4/5 -- one twist per serve at most
  const WEATHER_RAIN = 0.08, WEATHER_SNOW = 0.06, WEATHER_FOG = 0.06; // item 16
  const SNOW_DURATION_MULT = 1.1;
  const DROP_SLOW_UNTIL = 0.55, DROP_SLOW_PCT = 0.45; // item 5 -- first 55% of the time covers only 45% of the distance
  const TRICK_BONUS = 25, TRICK_NARROW = 0.2;      // item 8
  const SMASH_BONUS = 12, SMASH_WINDOW_MS = 900;   // item 6
  const POWERUP_CHANCE = 0.2;                      // item 9
  const FIRE_ACES_NEEDED = 3, FIRE_TURNS = 3;      // item 10
  const TARGET_BONUS = 30;                         // item 11
  const SURPRISE_CHANCE = 0.07;                    // item 15
  const BOSS_EVERY = 4, BOSS_HP = 5, BOSS_BONUS = 60, BOSS_DURATION_MULT = 0.92; // item 2
  const GOLDEN_CHANCE = 0.06, GOLDEN_BONUS = 25, GOLDEN_COINS = 5;               // item 27
  const MATCH_COUNT_KEY = "aig_mt_matches", BEST_SCORE_KEY = "aig_mt_best_score";
  const STICKERS_KEY = "aig_mt_stickers", START_SHIELD_KEY = "aig_mt_start_shield";
  const STICKERS = ["🏆","🎾","🥇","🔥","⚡","🌈","🦄","🐉","🚀","👑","💎","🍀"];
  const TAUNTS = ["Too slow! 😏", "Is that all? 🤖", "Math is hard, huh? 😜", "Zzz... 😴", "Easy point! 😎"];
  const AWE = ["No way!! 😱", "How?! 🤯", "Lucky shot... 😤"];
  const SPIN_PRIZES = [
    { label: "🪙 5", coins: 5 }, { label: "🪙 15", coins: 15 }, { label: "💎 1", gems: 1 },
    { label: "🪙 5", coins: 5 }, { label: "🛡️ Shield next match", shield: true }, { label: "🪙 30", coins: 30 }
  ];
  const SPIN_WEIGHTS = [25, 20, 10, 25, 12, 8];

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
  const courtNet = document.getElementById("mt-court-net");
  const rainEl = document.getElementById("mt-rain");
  const deuceBanner = document.getElementById("mt-deuce-banner");
  const crowdTop = document.getElementById("mt-crowd-top");
  const crowdBottom = document.getElementById("mt-crowd-bottom");
  const racketTopFace = document.getElementById("mt-racket-top-face");
  const clutchBadge = document.getElementById("mt-clutch-badge");
  const newBadge = document.getElementById("mt-new-badge");
  const historyRow = document.getElementById("mt-history-row");

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
    letUsedThisPoint: false, volleyUsed: false, volleyUsed2: false, volleyCount: 0,
    multiballUsed: false, bonusRallyActive: false,
    dotLog: [], reviewLog: [],
    ended: false, daily: false,
    rainActive: false, deuceActive: false,
    teamCenterToggle: 1,
    robotSkin: "classic",
    clutchMakes: 0, bestMatchPoints: 0,
    twist: null, kickFrom: null, decoyLane: null, weather: null,
    powerup: null, shield: false, puSlow: false, puMagnet: false,
    aceChain: 0, fireTurns: 0, goldenActive: false, targetBonus: false,
    boss: false, bossHp: 0, bossDefeated: false, smashOpen: false,
    lastBoAt: 0, boTipShown: false, spinUsed: false,
    trailSkin: "default", ballSkinEmoji: "🎾", trailHue: 0,
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
  function applyBallSkin(id) { state.ballSkinEmoji = MT_BALL_PREVIEWS[id] || "🎾"; ball.textContent = state.ballSkinEmoji; }
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
  // Robot Opponent (round 2, item 29) -- picks the robot's face AND its
  // lane bias (see ROBOT_LANE_WEIGHTS / rollLane).
  function applyRobotSkin(id) {
    state.robotSkin = ROBOT_LANE_WEIGHTS[id] ? id : "classic";
    setRobotFace();
  }
  renderSwatches("mt-robot-swatches", "mathtennis-robot", applyRobotSkin, {});
  // Themed court + ball trail (round 3, items 25/26)
  function applyCourtSkin(id) { court.dataset.theme = id; }
  function applyTrailSkin(id) { state.trailSkin = id; }
  renderSwatches("mt-court-swatches", "mathtennis-court", applyCourtSkin, {});
  renderSwatches("mt-trail-swatches", "mathtennis-trail", applyTrailSkin, {});
  // Fan sign with the player's name in the crowd (item 24)
  (function fanSign() {
    const sign = document.createElement("span");
    sign.className = "mt-fan-sign";
    sign.textContent = String(player.name || "FAN").split(" ")[0].slice(0, 7).toUpperCase();
    crowdTop.appendChild(sign);
  })();

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
        state.bestMatchPoints = d.bestMatchPoints || 0; // used by the ghost pace check
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

  // Caption queue (round 2, item 23) -- secondary captions (power shot,
  // achievement unlock, ghost pace, rally bonus) fired right alongside a
  // main caption used to overwrite/restart each other's animation before
  // being readable, same class of bug Math Hoops' subtoast queue fixed.
  // Secondary messages now line up one at a time behind the main caption.
  const CAPTION_MS = 800;
  let capQueue = [], capBusy = false;
  function queueCaption(text, isMiss) {
    capQueue.push({ text, isMiss });
    if (capBusy) return;
    capBusy = true;
    // Start one beat late so the first secondary message never clobbers
    // the main caption that triggered it.
    setTimeout(drainCaptionQueue, 450);
  }
  function drainCaptionQueue() {
    const next = capQueue.shift();
    if (!next) { capBusy = false; return; }
    showCaption(next.text, next.isMiss);
    setTimeout(drainCaptionQueue, CAPTION_MS);
  }

  // Reduced motion (round 2, item 16) -- a user toggle layered on top of
  // the OS-level prefers-reduced-motion media query; both skip the
  // non-essential juice (confetti, trail, whoosh, ghost racket, crowd).
  function reducedMotion() {
    try {
      if (localStorage.getItem(REDUCED_MOTION_KEY) === "1") return true;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  // Crowd reaction (round 2, item 4) -- a quick hop on both crowd rows.
  function crowdCheer() {
    if (reducedMotion()) return;
    [crowdTop, crowdBottom].forEach(c => { c.classList.remove("react"); void c.offsetWidth; c.classList.add("react"); });
  }

  // ---- Confetti (item 20) ------------------------------------------------
  const CONFETTI_COLORS = ["#8FAE1F", "#ffce6b", "#3a6ea5", "#D64545", "#C2D94E"];
  function burstConfetti(big) {
    if (reducedMotion()) return;
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
    if (reducedMotion()) return;
    const dot = document.createElement("div");
    dot.className = "mt-ball-trail";
    if (state.trailSkin === "rainbow") { dot.textContent = "●"; dot.style.color = `hsl(${(state.trailHue = (state.trailHue + 40) % 360)},85%,55%)`; }
    else if (state.trailSkin === "stars") dot.textContent = "⭐";
    else dot.textContent = ball.textContent;
    dot.style.left = leftPct + "%";
    dot.style.top = topPct + "%";
    court.appendChild(dot);
    setTimeout(() => dot.remove(), 420);
  }

  // ---- Swing visuals (item 18) --------------------------------------------
  function swingRacket(el) {
    el.classList.remove("swinging", "whiff");
    void el.offsetWidth;
    el.classList.add("swinging");
    // Motion-blur ghost (round 2, item 2) -- a fading copy of the racket
    // head left behind on every swing, both the robot's and the player's.
    if (!reducedMotion()) {
      const ghost = document.createElement("div");
      ghost.className = "mt-racket-ghost";
      el.appendChild(ghost);
      setTimeout(() => ghost.remove(), 320);
    }
  }
  function spawnSwingArc() {
    swingArc.classList.remove("show");
    void swingArc.offsetWidth;
    swingArc.classList.add("show");
  }
  // Racket whiff (round 2, item 10) -- shake that plays right AFTER the
  // normal swing animation ends (see the .28s delay in CSS), miss only.
  function whiffRacket() {
    racketBottom.classList.remove("whiff");
    void racketBottom.offsetWidth;
    racketBottom.classList.add("whiff");
  }
  // Net ripple + expanding ring (round 2, items 3+13) -- a Let's visible
  // payoff, instead of only a text banner.
  function netRipple() {
    if (reducedMotion()) return;
    courtNet.classList.remove("ripple"); void courtNet.offsetWidth; courtNet.classList.add("ripple");
    const ring = document.createElement("div");
    ring.className = "mt-net-ripple-ring";
    ring.style.left = (LANE_PCT[state.ballLane] || 50) + "%";
    court.appendChild(ring);
    setTimeout(() => ring.remove(), 650);
  }
  // Ball state classes (round 2, items 1/5/11) -- exactly one of
  // idle-bob / flying is ever active; toss/impact are one-shot squashes.
  function ballSetMode(mode) {
    ball.classList.remove("idle-bob", "flying", "toss", "impact");
    if (reducedMotion()) return;
    if (mode === "idle") ball.classList.add("idle-bob");
    else if (mode === "flying") ball.classList.add("flying");
    else if (mode === "toss" || mode === "impact") { void ball.offsetWidth; ball.classList.add(mode); }
  }
  // Scoreboard flip (round 2, item 8)
  function flipChip(el) {
    const chip = el.closest ? el.closest(".mt-hud-chip") : null;
    if (!chip || reducedMotion()) return;
    chip.classList.remove("flip"); void chip.offsetWidth; chip.classList.add("flip");
  }

  // ---- Lane control (item 1) ----------------------------------------------
  function setRacketLane(lane) {
    const changed = state.racketLane !== lane;
    state.racketLane = lane;
    racketBottom.style.left = LANE_PCT[lane] + "%";
    LANES.forEach(l => laneBtns[l].classList.toggle("sel", l === lane));
    // Whoosh particles (round 2, item 7) -- only on a real lane change
    if (changed && !reducedMotion()) {
      for (let i = 0; i < 4; i++) {
        const p = document.createElement("div");
        p.className = "mt-lane-whoosh";
        p.style.left = (LANE_PCT[lane] + (Math.random() * 8 - 4)) + "%";
        p.style.bottom = (30 + Math.random() * 20) + "px";
        court.appendChild(p);
        setTimeout(() => p.remove(), 320);
      }
    }
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
    // Doubles (items 13/28) -- whose lane it is gets announced once the
    // serve's lane is rolled (see startRally), not here at question time.
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
        state.reviewLog[dotIndex] = { kind: "noserve", gained: 0 };
        showCaption("❌ Missed the serve -- no return this time.", true);
        setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, 900);
      }
    }, 700);
  }

  // ---- Serve type + lane roll ---------------------------------------------
  function pickServeType() {
    const totalWeight = Object.values(SERVE_TYPES).reduce((s, t) => s + t.weight, 0);
    let r = rng() * totalWeight;
    for (const key of Object.keys(SERVE_TYPES)) {
      r -= SERVE_TYPES[key].weight;
      if (r <= 0) return key;
    }
    return "normal";
  }
  // Weighted by the equipped Robot Opponent (round 2, item 29) -- a
  // "Lefty Bot" genuinely serves left more often, not just a skin.
  function rollLane() {
    const weights = ROBOT_LANE_WEIGHTS[state.robotSkin] || ROBOT_LANE_WEIGHTS.classic;
    const total = LANES.reduce((s, l) => s + weights[l], 0);
    let r = rng() * total;
    for (const l of LANES) { r -= weights[l]; if (r <= 0) return l; }
    return "center";
  }
  // Doubles per-lane responsibility (round 2, item 28) -- left lane is
  // always Player 1's, right is always Player 2's, and the shared center
  // lane alternates between them so neither side gets it every time.
  function teamPlayerForLane(lane) {
    if (lane === "left") return 1;
    if (lane === "right") return 2;
    state.teamCenterToggle = state.teamCenterToggle === 1 ? 2 : 1;
    return state.teamCenterToggle;
  }

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
    // Rain hazard (round 2, item 31) -- a slick court narrows the window
    // slightly, on top of everything above; never on the championship
    // point or a bonus rally (same exclusions as wind).
    if (state.rainActive && !isLastShot && !state.bonusRallyActive) { min += RAIN_WINDOW_SHRINK / 2; max -= RAIN_WINDOW_SHRINK / 2; }
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
    // can't stall the match. Round 2 adds a net wobble + ripple ring.
    if (!state.letUsedThisPoint && !state.bonusRallyActive && rng() < LET_CHANCE) {
      state.letUsedThisPoint = true;
      showCaption("🎾 Let! Net cord -- re-serve.", false);
      netRipple();
      playLet();
      vib(15);
      setTimeout(() => startRally(dotIndex), 900);
      return;
    }

    state.resolved = false;
    // A fresh point starts here (volley continuations never come back
    // through startRally), so reset the per-point volley tracking.
    state.volleyUsed = false; state.volleyUsed2 = false; state.volleyCount = 0;
    state.serveType = state.bonusRallyActive ? "normal" : pickServeType();
    state.ballLane = rollLane();
    const isLastShot = state.qIndex === ROUND_SIZE;
    state.windActive = !state.bonusRallyActive && !isLastShot && rng() < WIND_CHANCE;
    if (state.windActive) {
      const others = LANES.filter(l => l !== state.ballLane);
      state.windPreLane = others[rand(0, others.length - 1)];
    }
    windEl.classList.toggle("hidden", !state.windActive);

    // Weather (items 31 + round 3 item 16) -- one of rain / snow / fog per serve.
    const wr = rng();
    const weatherOk = !state.bonusRallyActive && !isLastShot;
    state.weather = !weatherOk ? null : wr < WEATHER_RAIN ? "rain" : wr < WEATHER_RAIN + WEATHER_SNOW ? "snow" : wr < WEATHER_RAIN + WEATHER_SNOW + WEATHER_FOG ? "fog" : null;
    state.rainActive = state.weather === "rain";
    rainEl.classList.toggle("hidden", !state.rainActive);
    if (state.rainActive && !rainEl.children.length) {
      rainEl.innerHTML = Array.from({ length: 14 }, () => `<i style="left:${rand(0, 98)}%;animation-duration:${0.6 + Math.random() * 0.4}s;animation-delay:${Math.random()}s"></i>`).join("");
    }
    snowEl.classList.toggle("hidden", state.weather !== "snow");
    if (state.weather === "snow" && !snowEl.children.length) {
      snowEl.innerHTML = Array.from({ length: 16 }, () => `<i style="left:${rand(0, 98)}%;animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * 2}s">❄️</i>`).join("");
    }
    fogEl.classList.toggle("hidden", state.weather !== "fog");

    // Twist (round 3 items 1/3/4/5) -- at most one per serve, never with wind
    state.twist = null; state.kickFrom = null; state.decoyLane = null;
    if (weatherOk && !state.windActive && rng() < TWIST_CHANCE) {
      state.twist = ["kick", "mystery", "drop", "decoy"][rand(0, 3)];
      const others = LANES.filter(l => l !== state.ballLane);
      if (state.twist === "kick") state.kickFrom = others[rand(0, others.length - 1)];
      if (state.twist === "decoy") state.decoyLane = others[rand(0, others.length - 1)];
    }
    decoyEl.classList.toggle("hidden", state.twist !== "decoy");
    mysteryQ.classList.toggle("hidden", state.twist !== "mystery");
    ball.classList.toggle("real-mark", state.twist === "decoy");

    // Golden ball (item 27)
    state.goldenActive = weatherOk && rng() < GOLDEN_CHANCE;
    ball.classList.toggle("golden", state.goldenActive);
    ball.classList.toggle("fire", state.fireTurns > 0);

    // Power-up pickup on the court (item 9)
    state.powerup = null;
    powerupEl.classList.add("hidden");
    if (weatherOk && rng() < POWERUP_CHANCE) {
      const type = ["slow", "shield", "magnet"][rand(0, 2)];
      state.powerup = { type, lane: LANES[rand(0, 2)] };
      powerupEl.textContent = type === "slow" ? "⚡" : type === "shield" ? "🛡️" : "🧲";
      powerupEl.style.left = LANE_PCT[state.powerup.lane] + "%";
      powerupEl.classList.remove("hidden");
    }

    // Target practice bonus (item 11)
    targetEl.classList.add("hidden"); targetEl.classList.remove("pop");
    if (state.bonusRallyActive && state.targetBonus) {
      targetEl.style.left = LANE_PCT[state.ballLane] + "%";
      targetEl.classList.remove("hidden");
    }

    // Day/night cycle (item 17)
    daynightEl.dataset.time = state.qIndex <= 2 ? "dawn" : state.qIndex <= 5 ? "day" : state.qIndex <= 8 ? "dusk" : "night";

    // Surprise events (item 15)
    if (weatherOk && !state.bonusRallyActive && rng() < SURPRISE_CHANCE) surpriseEvent();

    // Deuce (item 27) -- checked once, entering the penultimate serve.
    if (state.qIndex === DEUCE_AT + 1 && !state.deuceActive && !state.bonusRallyActive) {
      const ratio = state.pointsWon / DEUCE_AT;
      if (Math.abs(ratio - 0.5) <= DEUCE_BAND) {
        state.deuceActive = true;
        deuceBanner.classList.remove("show"); void deuceBanner.offsetWidth; deuceBanner.classList.add("show");
      }
    }

    // Doubles per-lane responsibility (item 28)
    if (state.mode === "team" && !state.bonusRallyActive) {
      state.teamTurn = teamPlayerForLane(state.ballLane);
      queueCaption(`Player ${state.teamTurn}, it's your lane!`, false);
    }

    const TWIST_LABELS = { kick: "🌀 Kick Serve!", mystery: "❓ Mystery Serve", drop: "🪂 Drop Shot", decoy: "👯 Decoy Ball!" };
    const typeLabel = [SERVE_TYPES[state.serveType].label, TWIST_LABELS[state.twist], state.weather === "snow" ? "❄️ Snow" : state.weather === "fog" ? "🌫️ Fog" : null].filter(Boolean).join(" · ");
    serveBadge.classList.toggle("hidden", !typeLabel || state.bonusRallyActive);
    if (typeLabel) serveBadge.textContent = typeLabel;
    ball.textContent = SERVE_TYPES[state.serveType].emoji || state.ballSkinEmoji;
    if (state.twist === "mystery") { robotSay("Guess where it goes! 😈"); }
    if (state.boss && state.qIndex === 1) boSay("Boss fight! Tiap return ngurangin HP-nya 👹");

    if (isLastShot) {
      champBanner.classList.remove("show"); void champBanner.offsetWidth; champBanner.classList.add("show");
      // Camera zoom-in (item 6)
      if (!reducedMotion()) { court.classList.remove("champ-zoom"); void court.offsetWidth; court.classList.add("champ-zoom"); }
      playChampionship();
    }

    // Racket fatigue visual (item 32) -- a payoff for Shot Fatigue
    racketBottom.classList.toggle("tired-1", state.qIndex >= 5 && state.qIndex < 8);
    racketBottom.classList.toggle("tired-2", state.qIndex >= 8);

    const [minW, maxW] = effectiveSweetWindow(isLastShot);
    sweetZone.style.top = minW + "%";
    sweetZone.style.height = (maxW - minW) + "%";
    sweetZone.classList.remove("approaching", "grow-in");
    if (!reducedMotion()) { void sweetZone.offsetWidth; sweetZone.classList.add("grow-in"); }

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
    if (state.boss && !state.bossDefeated) baseDuration *= BOSS_DURATION_MULT;
    if (state.weather === "snow") baseDuration *= SNOW_DURATION_MULT;
    if (state.puSlow) { baseDuration *= 1.3; state.puSlow = false; refreshPuChip(); }
    state.rallyDuration = Math.max(400, Math.round(baseDuration));
    trickBtn.classList.remove("hidden");

    state.rallyRunning = true;
    state.rallyStart = performance.now();
    state._lastTrailTick = -1;
    swingRacket(racketTop); // the robot serves
    // Squash/stretch toss (item 1), then settle into the spinning flight (item 11)
    ballSetMode("toss");
    setTimeout(() => { if (state.rallyRunning) ballSetMode("flying"); }, 300);
    state.rafId = requestAnimationFrame(rallyTick);
  }

  // Position progress vs. elapsed time (round 3, item 5) -- a Drop Shot
  // crawls toward the net then plummets. Both the ball's drawn position AND
  // the swing-window check use this, so the sweet-zone box always matches
  // where the ball visually is.
  function progressAt(t) {
    if (state.twist !== "drop") return t;
    if (t < DROP_SLOW_UNTIL) return DROP_SLOW_PCT * (t / DROP_SLOW_UNTIL);
    return DROP_SLOW_PCT + (1 - DROP_SLOW_PCT) * ((t - DROP_SLOW_UNTIL) / (1 - DROP_SLOW_UNTIL));
  }

  function baseLeftPctAt(pct) {
    const finalPct = LANE_PCT[state.ballLane];
    if (state.windActive) {
      const prePct = LANE_PCT[state.windPreLane];
      if (pct < 0.5) return 50 + (prePct - 50) * (pct / 0.5);
      return prePct + (finalPct - prePct) * ((pct - 0.5) / 0.5);
    }
    // Kick serve (round 3, item 4) -- heads to one lane, then jinks to the real one
    if (state.twist === "kick" && state.kickFrom) {
      const pre = LANE_PCT[state.kickFrom];
      if (pct < 0.62) return 50 + (pre - 50) * (pct / 0.62);
      if (pct < 0.74) return pre + (finalPct - pre) * ((pct - 0.62) / 0.12);
      return finalPct;
    }
    let x = 50 + (finalPct - 50) * pct;
    // Banana serve (round 3, item 7) -- weaves side to side, settling by the end
    if (state.serveType === "banana") x += Math.sin(pct * Math.PI * 3) * 14 * (1 - pct);
    return x;
  }

  function ballLeftPctAt(pct) {
    const base = baseLeftPctAt(pct);
    // Mystery serve (round 3, item 3) -- the lane stays hidden until ~40%
    if (state.twist === "mystery") {
      if (pct < 0.4) return 50;
      if (pct < 0.55) return 50 + (base - 50) * ((pct - 0.4) / 0.15);
    }
    return base;
  }

  function rallyTick(now) {
    if (!state.rallyRunning) return;
    // `now` defaults to performance.now() -- real requestAnimationFrame
    // always passes a timestamp, this is just a safety net (same guard as
    // Math Hoops' animateScoreRollup, needed under a setTimeout-based rAF
    // polyfill which calls back with no arguments).
    const elapsed = (now || performance.now()) - state.rallyStart;
    const tFrac = Math.min(1, elapsed / state.rallyDuration);
    const pct = progressAt(tFrac);
    const topPct = 10 + 80 * pct;
    const leftPct = ballLeftPctAt(pct);
    ball.style.top = topPct + "%";
    ball.style.left = leftPct + "%";
    state.ballCurLeftPct = leftPct;
    if (state.twist === "decoy") { decoyEl.style.top = topPct + "%"; decoyEl.style.left = (50 + (LANE_PCT[state.decoyLane] - 50) * pct) + "%"; }
    if (state.twist === "mystery") { mysteryQ.style.top = topPct + "%"; mysteryQ.style.left = leftPct + "%"; mysteryQ.classList.toggle("hidden", pct >= 0.4); }
    if (state.weather === "fog") ball.style.opacity = pct < 0.35 ? "0.25" : "1";

    const trailStep = Math.floor(elapsed / 90);
    if (trailStep !== state._lastTrailTick) { state._lastTrailTick = trailStep; spawnBallTrail(leftPct, topPct); }

    const [minW] = effectiveSweetWindow(state.qIndex === ROUND_SIZE);
    sweetZone.classList.toggle("approaching", pct * 100 > minW - 15 && pct < 1);

    if (tFrac >= 1) { resolveRally(false, {}); return; }
    state.rafId = requestAnimationFrame(rallyTick);
  }

  function onSwing(isTrick) {
    if (!state.rallyRunning || state.resolved) return;
    const elapsed = performance.now() - state.rallyStart;
    const pct = progressAt(Math.min(1, elapsed / state.rallyDuration)) * 100;
    let [minW, maxW] = effectiveSweetWindow(state.qIndex === ROUND_SIZE);
    // Trick shot (round 3, item 8) -- a flashier swing with a narrower window
    if (isTrick === true) { const w = maxW - minW; minW += w * TRICK_NARROW; maxW -= w * TRICK_NARROW; }
    const timingOk = pct >= minW && pct <= maxW;
    const tol = LANE_HIT_TOLERANCE + (state.puMagnet ? 12 : 0);
    const laneOk = Math.abs(state.ballCurLeftPct - LANE_PCT[state.racketLane]) <= tol;
    if (state.puMagnet) { state.puMagnet = false; refreshPuChip(); }
    const isAce = timingOk && laneOk && pct >= ACE_MIN_PCT && pct <= ACE_MAX_PCT;
    const isHit = timingOk && laneOk;
    swingRacket(racketBottom);
    spawnSwingArc();
    // Timing readout (round 3, item 17) -- how many ms off the window's centre
    const centre = (minW + maxW) / 2;
    const msOff = Math.round(((pct - centre) / 100) * state.rallyDuration);
    resolveRally(isHit, { isAce, isTrick: isTrick === true && isHit, msOff, early: pct < minW, late: pct > maxW, wrongLane: timingOk && !laneOk });
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

  // ============== ROUND 3 helpers ==============
  const decoyEl = document.getElementById("mt-ball-decoy");
  const mysteryQ = document.getElementById("mt-mystery-q");
  const snowEl = document.getElementById("mt-snow");
  const fogEl = document.getElementById("mt-fog");
  const targetEl = document.getElementById("mt-target");
  const powerupEl = document.getElementById("mt-powerup");
  const vignetteEl = document.getElementById("mt-vignette");
  const rushTicker = document.getElementById("mt-rush-ticker");
  const robotBubble = document.getElementById("mt-robot-bubble");
  const boBubbleEl = document.getElementById("mt-bo-bubble");
  const daynightEl = document.getElementById("mt-daynight");
  const trickBtn = document.getElementById("mt-trick-btn");
  const smashBtn = document.getElementById("mt-smash-btn");
  const bossHpBar = document.getElementById("mt-boss-hp");
  const bossHpFill = document.getElementById("mt-boss-hp-fill");
  const ghostBar = document.getElementById("mt-ghost-bar");

  function bubble(el, text, ms) {
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), ms || 1400);
  }
  function robotSay(text) { bubble(robotBubble, text, 1300); }
  // Coach Bo (round 3, item 22) -- chatty but rate-limited so he never spams
  function boSay(text) {
    const now = performance.now();
    if (now - state.lastBoAt < 4500) return;
    state.lastBoAt = now;
    bubble(boBubbleEl, "🧠 " + text, 2600);
  }
  // Robot face escalates with the player's streak (item 21)
  function setRobotFace() {
    const base = ROBOT_FACES[state.robotSkin] || "🤖";
    racketTopFace.textContent = state.boss && !state.bossDefeated ? "👹" : state.streak >= 7 ? "🤯" : state.streak >= 4 ? "😠" : base;
  }
  // Pickup chip showing what's armed (item 9)
  const puChip = document.createElement("span");
  puChip.className = "mt-hud-chip hidden";
  document.querySelector(".mt-hud").appendChild(puChip);
  function refreshPuChip() {
    const bits = [state.shield ? "🛡️" : "", state.puSlow ? "⚡" : "", state.puMagnet ? "🧲" : ""].filter(Boolean).join(" ");
    puChip.textContent = bits;
    puChip.classList.toggle("hidden", !bits);
  }
  function maybeCollectPowerup() {
    const pu = state.powerup;
    powerupEl.classList.add("hidden");
    state.powerup = null;
    if (!pu || state.racketLane !== pu.lane) return;
    if (pu.type === "slow") { state.puSlow = true; queueCaption("⚡ Slow-mo armed for the next serve!", false); }
    else if (pu.type === "shield") { state.shield = true; queueCaption("🛡️ Shield: your next miss is forgiven!", false); }
    else { state.puMagnet = true; queueCaption("🧲 Magnet: wider lane on your next swing!", false); }
    refreshPuChip();
    playAce();
  }
  function fireworks() {
    if (reducedMotion()) return;
    for (let b = 0; b < 3; b++) {
      const cx = 20 + Math.random() * 60, cy = 15 + Math.random() * 40;
      for (let i = 0; i < 8; i++) {
        const f = document.createElement("div");
        f.className = "mt-firework";
        f.textContent = ["✨", "🎆", "⭐"][i % 3];
        f.style.left = cx + "%"; f.style.top = cy + "%";
        const ang = (i / 8) * Math.PI * 2;
        f.style.setProperty("--fx", Math.cos(ang) * 38 + "px"); f.style.setProperty("--fy", Math.sin(ang) * 38 + "px");
        f.style.animationDelay = b * 120 + "ms";
        court.appendChild(f);
        setTimeout(() => f.remove(), 1100 + b * 120);
      }
    }
  }
  function spawnMascot() {
    if (reducedMotion()) return;
    const m = document.createElement("div");
    m.className = "mt-mascot";
    m.textContent = ["🦖", "🐼", "🦊", "🐸"][rand(0, 3)];
    court.appendChild(m);
    setTimeout(() => m.remove(), 2300);
  }
  // Surprise events (item 15)
  function surpriseEvent() {
    const ev = ["wave", "ballrain", "quake"][rand(0, 2)];
    if (ev === "wave") {
      [crowdTop, crowdBottom].forEach(c => { c.classList.remove("wave"); void c.offsetWidth; c.classList.add("wave"); });
      state.score += 5; hudScore.textContent = state.score; flipChip(hudScore);
      queueCaption("🌊 Crowd wave! +5", false);
    } else if (ev === "ballrain") {
      queueCaption("🎾 Ball rain! Tap them! (+3 each)", false);
      for (let i = 0; i < 5; i++) {
        const b = document.createElement("div");
        b.className = "mt-ballrain";
        b.textContent = "🎾";
        b.style.left = (8 + Math.random() * 84) + "%";
        b.style.animationDelay = (i * 250) + "ms";
        const grab = () => { state.score += 3; hudScore.textContent = state.score; flipChip(hudScore); b.remove(); };
        b.addEventListener("pointerdown", grab);
        court.appendChild(b);
        setTimeout(() => b.remove(), 3200);
      }
    } else {
      if (!reducedMotion()) { court.classList.remove("quake"); void court.offsetWidth; court.classList.add("quake"); }
      queueCaption("🌋 Whoa, the court is rumbling!", false);
    }
  }
  function playStreakStinger() { mtTone([523.25, 659.25, 783.99, 1046.5], 0.14, 0.12); }
  function playVictoryFanfare() { mtTone([523.25, 523.25, 659.25, 783.99, 1046.5], 0.2, 0.14); }

  // Boss (item 2)
  function updateBossBar() {
    bossHpBar.classList.toggle("hidden", !state.boss);
    bossHpFill.style.width = Math.max(0, state.bossHp / BOSS_HP * 100) + "%";
  }
  // Ghost rival bar (item 30) -- your running score vs. your record paced evenly across the match
  function updateGhostBar() {
    let best = 0;
    try { best = Number(localStorage.getItem(BEST_SCORE_KEY) || 0); } catch (e) {}
    ghostBar.classList.toggle("hidden", !best);
    if (!best) return;
    document.getElementById("mt-ghost-you").style.width = Math.min(100, state.score / best * 100) + "%";
    document.getElementById("mt-ghost-rec").style.width = Math.min(100, Math.min(state.qIndex, ROUND_SIZE) / ROUND_SIZE * 100) + "%";
  }

  // Sticker album (item 29)
  function loadStickers() { try { return JSON.parse(localStorage.getItem(STICKERS_KEY) || "{}"); } catch (e) { return {}; } }
  function dropSticker(points) {
    const chance = points === ROUND_SIZE ? 1 : points >= 6 ? 0.6 : 0.4;
    const line = document.getElementById("mt-sticker-line");
    line.textContent = "";
    if (Math.random() > chance) return;
    const idx = rand(0, STICKERS.length - 1);
    const all = loadStickers();
    const had = all[idx] || 0;
    all[idx] = had + 1;
    try { localStorage.setItem(STICKERS_KEY, JSON.stringify(all)); } catch (e) {}
    line.textContent = had ? `🎁 Duplicate sticker ${STICKERS[idx]} (x${had + 1})` : `🎁 NEW sticker ${STICKERS[idx]}!`;
  }
  function renderAlbum() {
    const all = loadStickers();
    const owned = Object.keys(all).length;
    document.getElementById("mt-album-count").textContent = `(${owned}/${STICKERS.length})`;
    document.getElementById("mt-album-grid").innerHTML = STICKERS.map((e, i) => `<div class="mt-album-cell ${all[i] ? "" : "locked"}">${e}${all[i] > 1 ? `<b>x${all[i]}</b>` : ""}</div>`).join("");
  }
  document.getElementById("mt-album-btn").addEventListener("click", () => { renderAlbum(); document.getElementById("mt-album-overlay").classList.remove("hidden"); });
  document.getElementById("mt-album-close-btn").addEventListener("click", () => document.getElementById("mt-album-overlay").classList.add("hidden"));

  // Lucky spin (item 28)
  let spinAngle = 0;
  document.getElementById("mt-spin-btn").addEventListener("click", () => {
    document.getElementById("mt-spin-result").textContent = state.spinUsed ? "Already spun this match!" : "Good luck!";
    document.getElementById("mt-spin-go-btn").disabled = state.spinUsed;
    document.getElementById("mt-spin-overlay").classList.remove("hidden");
  });
  document.getElementById("mt-spin-close-btn").addEventListener("click", () => document.getElementById("mt-spin-overlay").classList.add("hidden"));
  document.getElementById("mt-spin-go-btn").addEventListener("click", () => {
    if (state.spinUsed) return;
    state.spinUsed = true;
    document.getElementById("mt-spin-go-btn").disabled = true;
    const total = SPIN_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < SPIN_WEIGHTS.length - 1; idx++) { r -= SPIN_WEIGHTS[idx]; if (r <= 0) break; }
    spinAngle += 360 * 5 + (360 - (idx * 60 + 30)) - (spinAngle % 360);
    document.getElementById("mt-wheel").style.transform = `rotate(${spinAngle}deg)`;
    const prize = SPIN_PRIZES[idx];
    setTimeout(() => {
      document.getElementById("mt-spin-result").textContent = `You won ${prize.label}!`;
      if (prize.shield) { try { localStorage.setItem(START_SHIELD_KEY, "1"); } catch (e) {} }
      else if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: prize.coins || 0, gems: prize.gems || 0 }).catch(() => {});
      playAce();
    }, 1900);
  });

  // Ghost pace (round 2, item 15) -- at fixed checkpoints, compare this
  // match's points won against the player's own best match, scaled to how
  // far along the match is (same idea as Math Hoops' rival pace check, but
  // against a personal best instead of the weekly leader).
  const PACE_CHECKS = [5, 8];
  function checkPace() {
    if (!PACE_CHECKS.includes(state.qIndex) || !state.bestMatchPoints) return;
    const expected = (state.bestMatchPoints / ROUND_SIZE) * state.qIndex;
    if (state.pointsWon > expected) queueCaption("👻 Ahead of your best pace!", false);
    else if (state.pointsWon < expected) queueCaption("👻 Behind your best pace...", true);
  }

  function nextStep(delay) {
    updateGhostBar();
    setTimeout(() => { if (state.qIndex >= ROUND_SIZE) finishMatch(); else askQuestion(); }, delay);
  }

  function resolveRally(isHit, info) {
    if (state.resolved) return;
    state.resolved = true;
    state.rallyRunning = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    swingBtn.classList.add("hidden");
    LANES.forEach(l => laneBtns[l].classList.add("hidden"));
    windEl.classList.add("hidden");
    rainEl.classList.add("hidden");
    serveBadge.classList.add("hidden");
    sweetZone.classList.remove("approaching");
    ballSetMode(isHit ? "impact" : "none");
    decoyEl.classList.add("hidden"); mysteryQ.classList.add("hidden");
    snowEl.classList.add("hidden"); fogEl.classList.add("hidden");
    ball.classList.remove("fire", "golden", "real-mark");
    ball.textContent = state.ballSkinEmoji; ball.style.opacity = ball.style.opacity || "1";
    trickBtn.classList.add("hidden");
    if (!state.bonusRallyActive) maybeCollectPowerup();
    if (info.msOff !== undefined && !state.bonusRallyActive) {
      const ms = Math.abs(info.msOff);
      if (isHit && ms >= 8) queueCaption(info.msOff > 0 ? `⏱️ ${ms}ms late` : `⏱️ ${ms}ms early`, false);
    }

    // Bonus rally short-circuit (item 15, Double Serve) -- a flat bonus,
    // no question gate, never affects pointsWon/qIndex/streak.
    if (state.bonusRallyActive) {
      state.bonusRallyActive = false;
      const bonusAmt = state.targetBonus ? TARGET_BONUS : MULTIBALL_BONUS;
      if (state.targetBonus) { targetEl.classList.add("pop"); }
      if (isHit) {
        state.score += bonusAmt;
        hudScore.textContent = state.score;
        flipChip(hudScore);
        showCaption(state.targetBonus ? `🍎 Bullseye! +${bonusAmt}` : `🎾🎾 Double Serve bonus! +${bonusAmt}`, false);
        playThwock();
        vib(35);
      } else {
        showCaption("Missed the bonus -- no harm done!", true);
        whiffRacket();
        playNet();
      }
      state.targetBonus = false;
      setTimeout(() => targetEl.classList.add("hidden"), 450);
      animateBallAway(isHit);
      nextStep(900);
      return;
    }

    const isLastShot = state.qIndex === ROUND_SIZE;

    if (isHit) {
      // Rally volley (item 5, extended in round 2 item 33) -- up to TWO
      // extra exchanges (a second one only after the first was already
      // survived), never on the championship point.
      const wantVolley1 = !state.volleyUsed && !isLastShot && rng() < VOLLEY_CHANCE;
      const wantVolley2 = state.volleyUsed && !state.volleyUsed2 && !isLastShot && rng() < VOLLEY_CHANCE_2;
      if (wantVolley1 || wantVolley2) {
        if (wantVolley1) state.volleyUsed = true; else state.volleyUsed2 = true;
        state.volleyCount++;
        showCaption(state.volleyCount > 1 ? "↩️↩️ Another return -- long rally!" : "↩️ Robot returns it!", false);
        playThwock();
        vib(20);
        if (!reducedMotion()) { court.classList.remove("volley-pan"); void court.offsetWidth; court.classList.add("volley-pan"); }
        // Rally Rush (round 3, item 14) -- the court glows and a ticker counts the exchanges
        court.classList.add("rush");
        rushTicker.textContent = `🔁 RALLY RUSH x${state.volleyCount + 1}`;
        rushTicker.classList.remove("show"); void rushTicker.offsetWidth; rushTicker.classList.add("show");
        animateBallAway(true);
        setTimeout(() => startVolleyFlight(), 650);
        return;
      }

      court.classList.remove("rush"); rushTicker.classList.remove("show");
      state.pointsWon++;
      hudPoints.textContent = state.pointsWon;
      flipChip(hudPoints);
      state.streak++;
      if (state.streak > state.bestStreakThisMatch) state.bestStreakThisMatch = state.streak;
      updatePowerMeter(true);

      const hotRacketMult = Math.min(HOT_RACKET_CAP, 1 + state.streak * HOT_RACKET_STEP);
      state.comboMult = hotRacketMult;
      let gained = Math.round(BASE_POINT_VALUE * hotRacketMult);
      gained += streakBonusFor(state.streak);
      if (info.isAce) { gained += ACE_BONUS; state.aces++; }
      const rallyBonus = RALLY_LENGTH_BONUS * state.volleyCount; // item 33
      gained += rallyBonus;
      const serveBonus = SERVE_TYPES[state.serveType].bonus || 0; // rocket serve (round 3, item 7)
      gained += serveBonus;
      if (info.isTrick) gained += TRICK_BONUS;
      if (state.goldenActive) { gained += GOLDEN_BONUS; if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: GOLDEN_COINS }).catch(() => {}); }
      let usedPower = false;
      if (state.powerReady) { gained = Math.round(gained * POWER_MULT); state.powerReady = false; powerBar.classList.remove("full"); usedPower = true; }
      const fireNow = state.fireTurns > 0;
      if (fireNow) { gained *= 2; state.fireTurns--; }
      if (state.deuceActive) gained = Math.round(gained * DEUCE_MULT); // item 27
      if (isLastShot) gained = Math.round(gained * CHAMPIONSHIP_MULT);
      if (state.mode === "ace") gained = Math.round(gained * ACE_MODE_PTS_MULT);
      if (state.mode === "team") state.teamScores[state.teamTurn] += gained;
      state.score += gained;
      hudScore.textContent = state.score;
      flipChip(hudScore);
      if (state.qIndex > ROUND_SIZE - CLUTCH_WINDOW) state.clutchMakes++; // item 30

      hudStreak.classList.toggle("hidden", state.streak < 2);
      hudStreak.textContent = `🔥 ×${hotRacketMult.toFixed(1)}`;
      hudStreak.classList.remove("pop"); void hudStreak.offsetWidth; hudStreak.classList.add("pop");

      markDot(state._dotIndex, info.isAce ? "ace" : "won");
      state.reviewLog[state._dotIndex] = { kind: info.isAce ? "ace" : "won", gained, lane: state.ballLane, volleys: state.volleyCount };

      // On Fire (item 10): 3 aces in a row -> next 3 points score double
      state.aceChain = info.isAce ? state.aceChain + 1 : 0;
      if (state.aceChain >= FIRE_ACES_NEEDED) { state.fireTurns = FIRE_TURNS; state.aceChain = 0; queueCaption("🔥🔥 ON FIRE! Next 3 points x2!", false); }
      // Boss HP (item 2)
      if (state.boss && !state.bossDefeated) {
        state.bossHp = Math.max(0, state.bossHp - 1);
        updateBossBar();
        if (state.bossHp === 0) {
          state.bossDefeated = true;
          state.score += BOSS_BONUS; hudScore.textContent = state.score;
          if (window.AIGLeaderboard && AIGLeaderboard.creditWallet) AIGLeaderboard.creditWallet({ coins: 10 }).catch(() => {});
          queueCaption(`👹 BOSS DEFEATED! +${BOSS_BONUS} & 🪙10`, false);
          fireworks(); playVictoryFanfare();
        }
      }
      setRobotFace();
      // Fireworks + mascot + stinger at streak 4 / 8 (items 12, 23, 19)
      if (state.streak > 0 && state.streak % 4 === 0) { fireworks(); spawnMascot(); playStreakStinger(); }
      if (info.isAce) robotSay(AWE[rand(0, AWE.length - 1)]);
      if (info.isAce) boSay("Wih ACE! Timing-nya mantap 🎯");
      else if (state.streak === 3) boSay("3 beruntun! Terus jaga ritmenya 🔥");

      const mainMsg = isLastShot ? `🏆 CHAMPIONSHIP POINT! +${gained}` : info.isAce ? `💥 ACE! +${gained}` : state.streak >= 3 ? `🔥 Great return! (${state.streak} in a row!)` : "🎾 Great return!";
      showCaption(mainMsg, false);
      if (usedPower) queueCaption(`⚡ Power shot! ×${POWER_MULT}`, false);
      if (rallyBonus) queueCaption(`🔁 Long rally bonus! +${rallyBonus}`, false);

      if (info.isTrick) queueCaption(`🎪 TRICK SHOT! +${TRICK_BONUS}`, false);
      if (serveBonus) queueCaption(`🚀 Rocket bonus! +${serveBonus}`, false);
      if (state.goldenActive) queueCaption(`🟡 GOLDEN BALL! +${GOLDEN_BONUS} & 🪙${GOLDEN_COINS}`, false);
      if (info.isAce) {
        // Ace cam (round 3, item 13) -- a brief freeze-frame vignette
        if (!reducedMotion()) {
          vignetteEl.classList.remove("show"); void vignetteEl.offsetWidth; vignetteEl.classList.add("show");
          court.classList.remove("ace-cam"); void court.offsetWidth; court.classList.add("ace-cam");
        }
      }
      if (info.isAce) { playAce(); vib([40, 30, 60]); } else { playThwock(); vib(isLastShot ? [50, 30, 50, 30, 80] : 35); }
      if (isLastShot || info.isAce) { court.classList.remove("punch"); void court.offsetWidth; court.classList.add("punch"); }
      if (state.streak >= 3) { burstConfetti(false); playCrowdReact(); }
      if (state.streak >= 3 || info.isAce || isLastShot) crowdCheer();

      animateBallAway(true);
      checkPace();

      // Smash window (round 3, item 6) -- a quick bonus tap after returning a Lob
      const smashChance = state.serveType === "lob" && !isLastShot;
      if (smashChance) {
        state.smashOpen = true;
        smashBtn.classList.remove("hidden");
        setTimeout(() => { state.smashOpen = false; smashBtn.classList.add("hidden"); }, SMASH_WINDOW_MS);
      }
      if (!isLastShot && !state.multiballUsed && state.qIndex > MULTIBALL_NOT_BEFORE && state.qIndex < ROUND_SIZE - MULTIBALL_NOT_BEFORE && rng() < MULTIBALL_CHANCE) {
        state.multiballUsed = true;
        setTimeout(offerBonusRally, smashChance ? SMASH_WINDOW_MS + 100 : (info.isAce ? 1300 : 900));
      } else {
        nextStep(smashChance ? SMASH_WINDOW_MS + 200 : (info.isAce ? 1500 : 1000));
      }
    } else {
      court.classList.remove("rush"); rushTicker.classList.remove("show");
      state.aceChain = 0;
      if (state.fireTurns > 0) state.fireTurns--;
      // Shield power-up (item 9): the streak and power meter survive one miss
      const shielded = state.shield;
      if (shielded) { state.shield = false; refreshPuChip(); queueCaption("🛡️ Shield saved your streak!", false); }
      else {
        state.streak = 0;
        state.comboMult = 1;
        hudStreak.classList.add("hidden");
        updatePowerMeter(false);
      }
      setRobotFace();
      if (rng() < 0.6) robotSay(TAUNTS[rand(0, TAUNTS.length - 1)]);
      if (info.wrongLane && !state.boTipShown) { state.boTipShown = true; boSay("Tip: geser racket ke lane bola SEBELUM swing ya!"); }
      markDot(state._dotIndex, "lost");
      const missMsg = info.early ? "⏱️ Swung too early!" : info.late ? "⏱️ Swung too late!" : info.wrongLane ? "↔️ Wrong side -- ball went past!" : "You missed the timing on that return.";
      state.reviewLog[state._dotIndex] = { kind: "lost", gained: 0, lane: state.ballLane, reason: info.early ? "early" : info.late ? "late" : info.wrongLane ? "wrong side" : "missed", volleys: state.volleyCount };
      showCaption(missMsg, true);
      whiffRacket(); // item 10
      playNet();
      vib([20, 20, 20]);
      animateBallAway(false);
      checkPace();
      nextStep(1000);
    }
  }

  // Rally volley continuation (item 5) -- the robot "returns" the ball for
  // another exchange; reuses the SAME tick/resolve pipeline, a little
  // faster each time so the point escalates. A miss here is a genuine lost
  // point (no further consolation).
  function startVolleyFlight() {
    if (state.ended) return;
    state.resolved = false;
    state.ballLane = rollLane();
    state.windActive = false;
    state.twist = null; state.kickFrom = null; // twists only apply to the opening serve
    trickBtn.classList.remove("hidden");
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
    sweetZone.classList.remove("grow-in");
    if (!reducedMotion()) { void sweetZone.offsetWidth; sweetZone.classList.add("grow-in"); }
    swingRacket(racketTop);
    ballSetMode("flying");
    if (state.rainActive) rainEl.classList.remove("hidden");
    if (state.mode === "team") {
      state.teamTurn = teamPlayerForLane(state.ballLane);
      queueCaption(`Player ${state.teamTurn}, your lane!`, false);
    }
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
    state.targetBonus = rng() < 0.5;
    showCaption(state.targetBonus ? "🍎 Target practice! Hit the apple lane!" : "🎾🎾 Double Serve! One more for a bonus!", false);
    state.bonusRallyActive = true;
    state.letUsedThisPoint = true; // no let on a bonus rally -- keep it snappy
    startRally(state._dotIndex);
  }

  // Match history (round 2, item 14) -- last few results, localStorage only
  function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; } }
  function saveHistory(entry) {
    const h = loadHistory();
    h.push(entry);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-HISTORY_MAX))); } catch (e) {}
  }
  function renderHistory() {
    const h = loadHistory();
    historyRow.innerHTML = h.map(m => {
      const cls = m.points >= 7 ? "good" : m.points >= 4 ? "mid" : "low";
      return `<div class="mt-history-item ${cls}" title="${m.points}/${ROUND_SIZE} - ${m.score} pts">${m.points}</div>`;
    }).join("");
  }
  renderHistory();

  // Review list (item 21) + recap card (item 19)
  function renderReview() {
    const icons = { ace: "💥", won: "✅", lost: "❌", noserve: "⚪" };
    const labels = { ace: "Ace", won: "Won", lost: "Lost", noserve: "Missed serve (wrong answer)" };
    const list = document.getElementById("mt-review-list");
    list.innerHTML = Array.from({ length: ROUND_SIZE }, (_, i) => {
      const r = state.reviewLog[i] || { kind: "noserve", gained: 0 };
      const extra = r.kind === "lost" ? ` -- ${r.reason}` : r.gained ? ` +${r.gained}` : "";
      const lane = r.lane ? ` · ${r.lane}` : "";
      const vol = r.volleys ? ` · ${r.volleys} volley${r.volleys > 1 ? "s" : ""}` : "";
      return `<div class="mt-review-item"><span class="mt-review-icon">${icons[r.kind]}</span><span>#${i + 1} ${labels[r.kind]}${extra}${lane}${vol}</span></div>`;
    }).join("");
  }
  function renderRecap() {
    const modeName = state.daily ? "Daily Challenge" : state.mode === "ace" ? "Ace Mode" : state.mode === "team" ? "Doubles" : "Normal";
    document.getElementById("mt-recap-card").innerHTML =
      `<div class="mt-recap-title">🎾 ${player.name}'s Match</div>` +
      `<div>🏆 Points won: ${state.pointsWon}/${ROUND_SIZE}</div>` +
      `<div>⭐ Score: ${state.score}</div>` +
      `<div>💥 Aces: ${state.aces}</div>` +
      `<div>🔥 Best streak: ${state.bestStreakThisMatch}</div>` +
      `<div>🎮 Mode: ${modeName}</div>` +
      `<div>📅 ${new Date().toLocaleDateString()}</div>`;
  }
  document.getElementById("mt-review-btn").addEventListener("click", () => { renderReview(); document.getElementById("mt-review-overlay").classList.remove("hidden"); });
  document.getElementById("mt-review-close-btn").addEventListener("click", () => document.getElementById("mt-review-overlay").classList.add("hidden"));
  document.getElementById("mt-recap-btn").addEventListener("click", () => { renderRecap(); document.getElementById("mt-recap-overlay").classList.remove("hidden"); });
  document.getElementById("mt-recap-close-btn").addEventListener("click", () => document.getElementById("mt-recap-overlay").classList.add("hidden"));

  function finishMatch() {
    state.ended = true;
    state.rallyRunning = false;
    ballSetMode("none");
    rainEl.classList.add("hidden");
    const points = state.pointsWon;
    const isPerfectMatch = points === ROUND_SIZE;
    const emoji = isPerfectMatch ? "👑" : points >= 9 ? "🏆" : points >= 6 ? "🥳" : points >= 3 ? "🙂" : "💪";
    const title = isPerfectMatch ? "PERFECT MATCH!" : points >= 9 ? "Championship form!" : points >= 6 ? "Great match!" : points >= 3 ? "Nice rallies!" : "Keep practicing!";
    const emojiEl = document.getElementById("mt-end-emoji");
    emojiEl.textContent = emoji;
    // Victory wiggle (round 2, item 9) -- good results only
    emojiEl.classList.remove("victory");
    if (points >= 6 && !reducedMotion()) { void emojiEl.offsetWidth; emojiEl.classList.add("victory"); }
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

    // Clutch tracker (round 2, item 30) -- performance in the final stretch
    if (state.clutchMakes >= 2) {
      clutchBadge.textContent = state.clutchMakes === CLUTCH_WINDOW ? `🧊 Ice cold! ${state.clutchMakes}/${CLUTCH_WINDOW} clutch points` : `🧊 Clutch! ${state.clutchMakes}/${CLUTCH_WINDOW} in the final stretch`;
      clutchBadge.classList.remove("hidden");
    } else {
      clutchBadge.classList.add("hidden");
    }

    if (isPerfectMatch) { burstConfetti(true); setTimeout(() => burstConfetti(true), 300); }
    if (points >= 6) crowdCheer();

    saveHistory({ points, score: state.score, date: Date.now() });
    // Boss tally, personal-best score, stickers, trophy, fanfare (round 3)
    try {
      localStorage.setItem(MATCH_COUNT_KEY, String(Number(localStorage.getItem(MATCH_COUNT_KEY) || 0) + 1));
      if (state.score > Number(localStorage.getItem(BEST_SCORE_KEY) || 0)) localStorage.setItem(BEST_SCORE_KEY, String(state.score));
    } catch (e) {}
    [powerupEl, targetEl, smashBtn, trickBtn].forEach(el => el.classList.add("hidden"));
    court.classList.remove("rush");
    state.boss = false; setRobotFace();
    dropSticker(points);
    const trophy = document.getElementById("mt-trophy");
    trophy.classList.remove("show");
    if (points >= 9 && !reducedMotion()) { void trophy.offsetWidth; trophy.classList.add("show"); }
    if (points >= 6) playVictoryFanfare();
    renderHistory();

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
      // Daily Challenge (round 2, item 26) ranks separately from the weekly best
      if (state.daily && AIGLeaderboard.touchMathTennisDailyChallenge) {
        AIGLeaderboard.touchMathTennisDailyChallenge(points)
          .then(() => AIGLeaderboard.getMathTennisDailyChallengeRank())
          .then(r => { if (r && r.rank) rankEl.textContent = `📅 Today's Daily Challenge: #${r.rank} of ${r.total}!`; })
          .catch(() => {});
      } else if (!state.daily && AIGLeaderboard.touchMathTennisWeeklyBest) {
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
    state.teamCenterToggle = 1;
    state.multiballUsed = false;
    state.bonusRallyActive = false;
    state.volleyUsed = false; state.volleyUsed2 = false; state.volleyCount = 0;
    state.letUsedThisPoint = false;
    state.rainActive = false; state.deuceActive = false;
    state.clutchMakes = 0;
    state.aceChain = 0; state.fireTurns = 0; state.puSlow = false; state.puMagnet = false;
    state.powerup = null; state.targetBonus = false; state.smashOpen = false; state.spinUsed = false;
    state.boTipShown = false; state.lastBoAt = 0; state.twist = null; state.weather = null;
    // Boss match (round 3, item 2) -- every 4th normal match
    let played = 0;
    try { played = Number(localStorage.getItem(MATCH_COUNT_KEY) || 0); } catch (e) {}
    state.boss = !state.daily && state.mode === "normal" && (played + 1) % BOSS_EVERY === 0;
    state.bossHp = state.boss ? BOSS_HP : 0; state.bossDefeated = false;
    // A Lucky Spin shield prize from last match, spent now
    let startShield = false;
    try { startShield = localStorage.getItem(START_SHIELD_KEY) === "1"; if (startShield) localStorage.removeItem(START_SHIELD_KEY); } catch (e) {}
    state.shield = startShield;
    refreshPuChip();
    updateBossBar(); setRobotFace(); updateGhostBar();
    if (startShield) setTimeout(() => queueCaption("🛡️ Spin prize: you start with a Shield!", false), 400);
    [powerupEl, targetEl, smashBtn, trickBtn, decoyEl, mysteryQ, snowEl, fogEl].forEach(el => el.classList.add("hidden"));
    court.classList.remove("rush");
    document.getElementById("mt-trophy").classList.remove("show");
    state.ended = false;
    state.dotLog = []; state.reviewLog = [];
    capQueue = []; capBusy = false;
    hudPoints.textContent = 0;
    hudScore.textContent = 0;
    hudStreak.classList.add("hidden");
    powerBar.classList.add("hidden", "full");
    powerFill.style.width = "0%";
    teamResultChip.classList.add("hidden");
    resultBanner.textContent = "";
    resultBanner.classList.remove("miss");
    racketBottom.classList.remove("tired-1", "tired-2", "whiff");
    rainEl.classList.add("hidden");
    setRacketLane("center");
    renderProgressDots();
    ballSetMode("idle");
    ball.classList.remove("hidden");
    ball.style.opacity = "1"; ball.style.top = "10%"; ball.style.left = "50%";
    // Dismiss the round-2 NEW badge once a match has been started (item 25)
    try { localStorage.setItem(NEW_BADGE_KEY, "1"); } catch (e) {}
    newBadge.classList.add("hidden");
    document.getElementById("mt-end-overlay").classList.add("hidden");
    document.getElementById("mt-start-overlay").classList.add("hidden");
    askQuestion();
  }

  // ---- Settings (item 24) -------------------------------------------------
  function paintSettingsToggles() {
    document.getElementById("mt-settings-sound").classList.toggle("on", soundOn());
    document.getElementById("mt-settings-haptics").classList.toggle("on", hapticsOn());
    document.getElementById("mt-settings-motion").classList.toggle("on", reducedMotion());
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

  document.getElementById("mt-settings-motion").addEventListener("click", () => {
    try { localStorage.setItem(REDUCED_MOTION_KEY, localStorage.getItem(REDUCED_MOTION_KEY) === "1" ? "0" : "1"); } catch (e) {}
    paintSettingsToggles();
  });
  // Test buttons (round 2, item 18) -- feel/hear it before toggling
  document.getElementById("mt-settings-sound-test").addEventListener("click", () => playThwock());
  document.getElementById("mt-settings-haptics-test").addEventListener("click", () => vib([30, 20, 30]));

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

  // Daily Challenge (round 2, item 26) -- same mulberry32 + date seed as
  // Math Hoops. Only the RALLY randomness (lanes, serve types, hazards) is
  // seeded; questions aren't, same as Math Hoops' daily.
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
  let dailyRng = null;
  function rng() { return dailyRng ? dailyRng() : Math.random(); }
  const isDailyLink = new URLSearchParams(location.search).get("daily") === "1";

  swingBtn.addEventListener("click", () => onSwing(false));
  trickBtn.addEventListener("click", () => onSwing(true));
  smashBtn.addEventListener("click", () => {
    if (!state.smashOpen) return;
    state.smashOpen = false; smashBtn.classList.add("hidden");
    state.score += SMASH_BONUS; hudScore.textContent = state.score; flipChip(hudScore);
    showCaption(`💥 SMASH! +${SMASH_BONUS}`, false);
    playAce(); vib([30, 20, 50]);
  });
  document.getElementById("mt-start-btn").addEventListener("click", () => { state.daily = false; dailyRng = null; startMatch(); });
  document.getElementById("mt-daily-btn").addEventListener("click", () => { state.daily = true; dailyRng = mulberry32(dailySeed()); startMatch(); });
  // Play Again keeps whichever mode the last match used (a daily rerun
  // reseeds so it replays the SAME serve pattern, like Math Hoops').
  document.getElementById("mt-play-again-btn").addEventListener("click", () => {
    dailyRng = state.daily ? mulberry32(dailySeed()) : null;
    startMatch();
  });
  if (isDailyLink) document.getElementById("mt-daily-btn").click();

  // NEW badge (round 2, item 25) -- shown until a match is started once
  try { if (localStorage.getItem(NEW_BADGE_KEY) !== "1") newBadge.classList.remove("hidden"); } catch (e) {}}
