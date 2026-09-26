// BrainBox — shared leaderboard write/read helper.
// Connects to the hub's OWN Firebase project via a secondary named app
// ("aig"), so it never collides with each game's own default Firebase app
// (each game keeps using its own project for multiplayer, unaffected).
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDEcYrtGNgjtXGE0vDk-Lc9zMCtct1-5g4",
    authDomain: "al-idrisi-games.firebaseapp.com",
    databaseURL: "https://al-idrisi-games-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "al-idrisi-games",
    storageBucket: "al-idrisi-games.firebasestorage.app",
    messagingSenderId: "542717578257",
    appId: "1:542717578257:web:6d2f1c3c5339467dceb5b0",
    measurementId: "G-T7HVHTG211"
  };

  let aigApp;
  try {
    aigApp = firebase.app("aig");
  } catch (e) {
    aigApp = firebase.initializeApp(firebaseConfig, "aig");
  }
  const aigDb = aigApp.database();

  // =====================================================================
  // LIGHTWEIGHT CLIENT ERROR LOGGING -- catches uncaught errors and
  // unhandled promise rejections across every game (this file is shared),
  // logging a small record to Firebase instead of a bug only ever
  // surfacing as a parent's screenshot (see the Kids' Quiz "Start Quiz"
  // stuck-button bug found this session -- this would have shown up here
  // immediately instead of needing a device photo to diagnose). Nested
  // under players/{id}/errorLogs, no new top-level RTDB path/rules
  // needed. Best-effort only: if logging itself throws, it's swallowed --
  // it must never compound the original error or throw a second one.
  // =====================================================================
  function logClientError(message, extra) {
    try {
      const player = window.AIGPlayer && AIGPlayer.getPlayer();
      if (!player) return; // no signed-in player yet (e.g. error on the sign-in screen itself) -- nowhere to attribute it
      aigDb.ref(`players/${player.id}/errorLogs`).push({
        message: String(message || "").slice(0, 500),
        extra: extra ? String(extra).slice(0, 500) : "",
        page: location.pathname,
        at: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (e) { /* logging must never itself throw */ }
  }
  window.addEventListener("error", e => logClientError(e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener("unhandledrejection", e => {
    const reason = e.reason;
    logClientError("Unhandled rejection: " + (reason && reason.message ? reason.message : reason));
  });

  // =====================================================================
  // OFFLINE WRITE QUEUE — the existing sw.js offline mode only ever
  // covered STATIC assets (network-first, cache fallback); a question
  // answered with no signal at all previously just silently lost that
  // attempt (Firebase's own SDK queues writes in memory while offline,
  // but that queue doesn't survive the tab/app actually closing before
  // reconnecting -- common on a phone with spotty signal). This adds a
  // localStorage-backed queue for the highest-value writes
  // (recordTopicAttempt, logMistake) specifically, checked BEFORE
  // attempting the Firebase call (navigator.onLine is the standard,
  // if imperfect, client-side signal -- it reflects the network
  // adapter being up, not that Firebase's servers are specifically
  // reachable, but it's the best signal available without extra network
  // probing) so a flaky connection can't half-succeed into a
  // partially-applied write.
  // =====================================================================
  const OFFLINE_QUEUE_KEY = "aig_offline_queue";
  const OFFLINE_QUEUE_MAX = 100;

  function queueOfflineWrite(type, args) {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push({ type, args, at: Date.now() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-OFFLINE_QUEUE_MAX)));
    } catch (e) { /* localStorage unavailable/full -- the attempt is lost, same as before this feature existed */ }
  }

  async function flushOfflineQueue() {
    let queue;
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      queue = raw ? JSON.parse(raw) : [];
    } catch (e) { return; }
    if (!queue.length) return;
    localStorage.removeItem(OFFLINE_QUEUE_KEY); // clear first -- anything that fails below re-queues itself individually, rather than risking replaying the whole batch again on a partial failure
    for (const item of queue) {
      try {
        if (item.type === "recordTopicAttempt") recordTopicAttempt(...item.args);
        else if (item.type === "logMistake") await logMistake(...item.args);
      } catch (e) {
        queueOfflineWrite(item.type, item.args); // still offline (or a new failure) -- try again next time
      }
    }
  }
  window.addEventListener("online", flushOfflineQueue);
  if (typeof navigator !== "undefined" && navigator.onLine) {
    // Also try once on load -- covers "was offline when the app was last
    // closed, now reopened already back online" (the "online" event only
    // fires on a LIVE transition, not on page load into an already-online state).
    flushOfflineQueue();
  }

  // Record one "play" for the currently-picked player in the given game.
  // gameId: "mathrace" | "language-arts" | "solarquest"
  // Silently does nothing if no one has picked a name yet. Returns a
  // promise resolving to the new timesPlayed total (or null), so callers
  // that care about play-count milestones (e.g. badge unlocks) don't need
  // a separate read.
  //
  // A "parent" identity (see player.js deriveParentPlayer) never touches
  // the child's own leaderboard entry — instead this logs one "parent
  // accompanied a session" tick for that child, capped at once per
  // calendar day so replaying several races in a row doesn't inflate it.
  function recordPlay(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player) return Promise.resolve(null);

    if (player.role === "parent") {
      if (player.childId) {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        aigDb.ref(`players/${player.childId}/parentSessions/${today}`).set({
          parentName: player.name,
          lastGamePlayed: gameId,
          at: firebase.database.ServerValue.TIMESTAMP
        });
      }
      return Promise.resolve(null); // no timesPlayed/badge milestones for a parent identity
    }

    const ref = aigDb.ref(`leaderboard/${gameId}/${player.id}`);
    ref.update({ name: player.name, lastPlayed: firebase.database.ServerValue.TIMESTAMP });

    // Per-day play count, so the dashboard's activity calendar can show real
    // intensity (not just the single lastPlayed timestamp). Only accumulates
    // from the day this shipped forward — older days have no entry here.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    aigDb.ref(`players/${player.id}/sessionsByDay/${today}/${gameId}`).transaction(cur => (cur || 0) + 1);

    return ref.child("timesPlayed").transaction(cur => (cur || 0) + 1)
      .then(result => result.committed ? result.snapshot.val() : null);
  }

  // ---- Session duration, so reports can show how LONG someone played,
  // not just that they played (recordPlay's sessionsByDay only counts
  // occurrences). Stored at /sessions/{playerId}/{sessionId}/{gameId,
  // startTime, endTime} -- both Firebase server timestamps, so clocks
  // never drift between devices. endTime starts equal to startTime (a
  // 0-duration default) and gets pushed forward as the session
  // continues, so a session that never got a single update (tab killed
  // instantly) reads as "0 duration", not missing/null data.
  //
  // Call once per page load, right after the player's identity is known
  // -- NOT inside recordPlay, since that fires at scattered points
  // during a round (or multiple times), not just once at the start.
  // A "parent" identity never gets a session (matches every other
  // per-player stat here).
  //
  // Kept alive for as long as the tab does:
  //   - a heartbeat nudges endTime forward every 20s, so a session just
  //     sitting idle (network still up) doesn't look like it ended the
  //     instant it started
  //   - visibilitychange (tab backgrounded) checkpoints endTime too,
  //     since a heartbeat alone could be up to 20s stale right when the
  //     kid actually walks away
  //   - onDisconnect() is the real safety net for the CLOSE time: if the
  //     tab is killed outright (closed, phone locked, network drops),
  //     Firebase's own server applies this update the moment it notices
  //     the socket is gone -- far more reliable than beforeunload, which
  //     mobile browsers routinely skip entirely.
  function startSession(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;

    const ref = aigDb.ref(`sessions/${player.id}`).push();
    const now = () => firebase.database.ServerValue.TIMESTAMP;
    ref.set({ gameId, startTime: now(), endTime: now() });
    ref.onDisconnect().update({ endTime: now() });

    const heartbeat = setInterval(() => ref.update({ endTime: now() }), 20000);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) ref.update({ endTime: now() });
    });
    window.addEventListener("pagehide", () => {
      ref.update({ endTime: now() });
      clearInterval(heartbeat);
    }, { once: true });

    return ref.key;
  }

  // Read the full leaderboard for one game, callback gets a plain object
  // { playerId: { name, timesPlayed, lastPlayed }, ... } (or {} if empty).
  // Returns an unsubscribe function — call it before watching a different
  // game so a stale listener can't overwrite the screen later.
  function watchGame(gameId, callback) {
    const ref = aigDb.ref(`leaderboard/${gameId}`);
    const handler = snap => callback(snap.val() || {});
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }

  // ---- Cloud-synced progress (badges/XP), so a child's progress follows
  // them across devices instead of staying stuck in one browser's
  // localStorage. Stored at /players/{playerId}/badges/{gameId}.
  // A "parent" identity never has progress of its own — always null/no-op —
  // so a parent playing a round never creates or touches any badge data.
  async function getProgress(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/badges/${gameId}`).get();
    return snap.exists() ? snap.val() : null;
  }

  function setProgress(gameId, data) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    aigDb.ref(`players/${player.id}/badges/${gameId}`).set(data);
  }

  // ---- Per-topic accuracy tracking, so the teacher/parent dashboard can
  // surface specific weak spots (e.g. "struggles with the 7-times table")
  // instead of just completion %. Stored at
  // /players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}.
  // Call once per answered question with isCorrect so accuracy (not just a
  // raw wrong count) can be computed — a topic missed 5/5 times is a very
  // different signal than one missed 5/50 times.
  // topicKey must be Firebase-key-safe (no . # $ / [ ]).
  // A "parent" identity's answers never count toward the CHILD's weak-spot
  // tracking — otherwise a parent helping out would make the dashboard
  // think the child understands a topic they actually still struggle with.
  // `comboMultiplier` is optional (defaults to 1) -- a game that tracks its
  // own in-round combo streak (see MathVille's state.combo) can pass a
  // higher value to scale the coin reward for that one answer. Every
  // existing call site across every other game omits it entirely and
  // behaves exactly as before.
  function recordTopicAttempt(gameId, topicKey, isCorrect, comboMultiplier) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueOfflineWrite("recordTopicAttempt", [gameId, topicKey, isCorrect, comboMultiplier]);
      return;
    }
    const ref = aigDb.ref(`players/${player.id}/topicStats/${gameId}/${topicKey}`);
    ref.child(isCorrect ? "correct" : "wrong").transaction(cur => (cur || 0) + 1);
    if (!isCorrect) ref.update({ lastWrongAt: firebase.database.ServerValue.TIMESTAMP });
    // Consecutive-correct streak — lets a consumer treat a topic as
    // "currently mastered" (see multipleazka's weightedRand) without ever
    // touching the historical correct/wrong totals used for reporting.
    // Any wrong answer resets it, so mastery has to be shown recently, not
    // just once a long time ago.
    ref.child("streak").transaction(cur => isCorrect ? (cur || 0) + 1 : 0);
    if (isCorrect) { awardCurrency(comboMultiplier || 1); touchSeasonProgress(); touchWeeklyStats(); touchTotalCorrect(); }
    touchDailyStats(gameId, isCorrect);
  }

  // =====================================================================
  // WALLET (gems & coins) — cross-game currency, spent on vehicle skins in
  // MathVille Drive Mode + Math Race's vehicle picker. Deliberately hooked
  // into recordTopicAttempt (above) rather than each game's own answer
  // handler — every game already calls that on every question, so earning
  // currency needed zero changes to any individual game's question code.
  // Stored at players/{id}/wallet — nested under the ALREADY explicit
  // `players` RTDB rule, so no security-rules change was needed either.
  // =====================================================================
  const GEM_EVERY_N_CORRECT = 15; // coins are frequent/small, gems rare/deliberate

  // ---- Bonus Hour -- a "random event": one hour out of each day is a
  // secret 2x-coins window, picked deterministically from a hash of
  // today's date (so it's the SAME hour for every player -- a shared
  // server event, not a per-player roll) but unpredictable day to day
  // since the hash changes every date. No extra Firebase read needed --
  // computed purely from the local clock, same as the daily/season keys
  // above.
  function isBonusHourNow() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const bonusHour = seedFrom(dateStr) % 24;
    return now.getUTCHours() === bonusHour;
  }

  function getBonusHourInfo() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    return { active: isBonusHourNow(), hour: seedFrom(dateStr) % 24 };
  }

  // Weekend Double XP -- a SECOND, separate 2x-coins window from Bonus
  // Hour above (both can independently be active; awardCurrency below
  // just needs EITHER to be true, not both). Same UTC-day-boundary
  // reasoning Bonus Hour already accepts (a few hours of local-timezone
  // imprecision near midnight, consistent with the existing convention
  // rather than a new one).
  function isWeekendNow() {
    const day = new Date().getUTCDay(); // 0=Sun, 6=Sat
    return day === 0 || day === 6;
  }
  function getWeekendBonusInfo() {
    return { active: isWeekendNow() };
  }

  // Convenience combined check -- awardCurrency() above already ORs these
  // two together for the actual coin math; this is the same OR exposed
  // for UI badges so each game doesn't need to import/call both and OR
  // them itself. Used by the small in-game "🪙×2" HUD badge (see each
  // game's script.js) -- separate from the hub's own Bonus Hour/Weekend
  // banners, which stay as they are.
  function isCoinMultiplierActive() {
    return isBonusHourNow() || isWeekendNow();
  }

  // +1 coin per correct answer (x2 during Bonus Hour, further scaled by an
  // optional combo multiplier from the caller -- see recordTopicAttempt),
  // no matter which game. Every ~15th correct answer (tracked via a
  // running streak that only this counts, separate from
  // recordTopicAttempt's per-topic mastery streak) also converts into +1
  // gem — a small, guaranteed trickle rather than a random drop, so a kid
  // grinding it out can actually predict/count toward the next gem. Bonus
  // Hour and combo multipliers only scale coins, never the gem trickle --
  // gems stay a deliberate, non-inflatable rare currency.
  function awardCurrency(comboMultiplier) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    ensureBoosterLoaded();
    // Personal Booster / Coin Boost loadout (PM round 9): a SINGLE 2x on top
    // of Bonus Hour, using the larger of the two so they never stack with
    // each other (only with Bonus Hour/combo/streak, as those already do).
    const perkMult = Date.now() < Math.max(cachedBoosterUntil, cachedCoinBoostUntil) ? 2 : 1;
    const bonusMult = ((isBonusHourNow() || isWeekendNow()) ? 2 : 1) * perkMult;
    const streakMult = streakMultiplierFor(cachedStreakCount);
    // Math.ceil (not round) so any active multiplier ALWAYS visibly adds
    // at least +1 coin over the no-bonus baseline -- with a 1-coin base
    // reward, round(1 * 1.2) rounds right back down to 1, which would
    // make the Streak Multiplier invisible on the single most common
    // case (one correct answer, no combo, not Bonus Hour). Rounding in
    // the player's favor here only ever gives MORE coins than round()
    // would, never fewer.
    const coinGain = Math.max(1, Math.ceil(1 * (comboMultiplier || 1) * bonusMult * streakMult));
    aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + coinGain;
      wallet.correctSinceGem = (wallet.correctSinceGem || 0) + 1;
      if (wallet.correctSinceGem >= GEM_EVERY_N_CORRECT) {
        wallet.gems = (wallet.gems || 0) + 1;
        wallet.correctSinceGem = 0;
      }
      return wallet;
    });
  }

  // One-time read (e.g. rendering a shop screen on open).
  async function getWallet() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { coins: 0, gems: 0 };
    const snap = await aigDb.ref(`players/${player.id}/wallet`).get();
    return snap.exists() ? snap.val() : { coins: 0, gems: 0 };
  }

  // Live subscription (e.g. a HUD badge that updates the instant a coin is
  // earned elsewhere in the same session). Returns an unsubscribe function,
  // same convention as watchGame() above.
  function watchWallet(callback) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") { callback({ coins: 0, gems: 0 }); return () => {}; }
    const ref = aigDb.ref(`players/${player.id}/wallet`);
    const handler = snap => callback(snap.val() || { coins: 0, gems: 0 });
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }

  // Which vehicle skins this player has already unlocked, keyed per game
  // (mathville's and mathrace's vehicle ids are totally separate id spaces,
  // so gameId keeps them from colliding). { skinId: true, ... } shape.
  async function getOwnedVehicles(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return {};
    const snap = await aigDb.ref(`players/${player.id}/ownedVehicles/${gameId}`).get();
    return snap.exists() ? snap.val() : {};
  }

  // Attempts to buy one vehicle skin. cost is { coins } or { gems } (never
  // both — every skin in the shop is priced in exactly one currency).
  //
  // NOT built on .transaction() for the funds check, despite that being
  // the textbook way to guard a balance -- confirmed live (both here and
  // via a standalone repro) that on this secondary named app instance, a
  // transaction whose update function ABORTS (returns undefined) on its
  // very first invocation never retries with the real server value, even
  // immediately after an explicit .get() on the same ref returned the
  // correct data. The update function's first call reliably received
  // `cur === null` regardless, read as an empty wallet, and wrongly
  // rejected a 15-coin purchase against a real 25-coin balance every
  // time. (A non-aborting transaction, like awardCurrency's plain
  // increment below, converges fine from that same null guess -- the bug
  // is specific to a transaction that can abort.)
  //
  // So: a plain get()-then-check-then-write instead. This accepts a
  // narrow theoretical race (two purchases from the same kid landing at
  // the exact same instant could both pass the check before either write
  // lands) that a transaction would have closed -- an acceptable trade
  // for a cosmetic in-game currency with no real money involved. The
  // floor at 0 below means the worst case is a slightly-early "sold out"
  // feeling, never a negative balance.
  async function unlockVehicle(gameId, vehicleId, cost) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "no-player" };

    const ownedRef = aigDb.ref(`players/${player.id}/ownedVehicles/${gameId}/${vehicleId}`);
    const alreadySnap = await ownedRef.get();
    if (alreadySnap.exists() && alreadySnap.val()) return { ok: true, alreadyOwned: true };

    const coinsCost = cost.coins || 0;
    const gemsCost = cost.gems || 0;
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    if ((wallet.coins || 0) < coinsCost || (wallet.gems || 0) < gemsCost) {
      return { ok: false, reason: "insufficient-funds" };
    }

    const newWallet = {
      ...wallet,
      coins: Math.max(0, (wallet.coins || 0) - coinsCost),
      gems: Math.max(0, (wallet.gems || 0) - gemsCost)
    };
    await walletRef.set(newWallet);
    await ownedRef.set(true);
    return { ok: true, wallet: newWallet };
  }

  // Reads back one topic's {correct, wrong, streak} so the AI Tutor hint
  // can be personalized to a real pattern of mistakes, not just the one
  // question that was just missed. Returns null for a parent identity or
  // if there's no data yet (a brand-new topic) — callers should treat
  // both as "no extra context available" rather than an error.
  async function getTopicStats(gameId, topicKey) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/topicStats/${gameId}/${topicKey}`).get();
    return snap.exists() ? snap.val() : null;
  }

  // =====================================================================
  // DAILY QUESTS + STREAK — cross-game daily engagement layer. Hooked into
  // recordTopicAttempt above (already called by every game on every
  // answered question, correct or wrong) so per-day stats accumulate with
  // zero changes needed in any individual game's own code — same
  // integration trick as the wallet. Stored at:
  //   players/{id}/dailyStats/{date}   -- {correct, wrong, games:{gameId:true}}
  //   players/{id}/dailyQuests/{date}  -- {quests:[{type,target,claimed}], bonusClaimed}
  //   players/{id}/streak              -- {count, lastPlayDate, bestStreak}
  // All nested under the already-explicit `players` rule, same as wallet.
  // =====================================================================
  function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, matches recordPlay's convention
  }

  // In-memory guard so a whole round of questions (many calls to
  // recordTopicAttempt in quick succession) only triggers ONE streak
  // read+maybe-write per day per page load, not one per question. Set
  // BEFORE the async read resolves (optimistic) so a burst of calls in the
  // same tick can't all slip through before the first one finishes.
  let streakCheckedDate = null;

  function touchDailyStats(gameId, isCorrect) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    const today = todayKey();
    aigDb.ref(`players/${player.id}/dailyStats/${today}`).transaction(cur => {
      const d = cur || { correct: 0, wrong: 0, games: {} };
      if (isCorrect) d.correct = (d.correct || 0) + 1; else d.wrong = (d.wrong || 0) + 1;
      d.games = d.games || {};
      d.games[gameId] = true;
      return d;
    });
    if (streakCheckedDate !== today) {
      streakCheckedDate = today;
      touchStreak(today);
    }
  }

  // Bumps the login/play streak at most once per calendar day. Consecutive
  // days (lastPlayDate === yesterday) increments; a gap of 2+ days resets
  // to 1; same day is a no-op (guarded above, but also safe to call twice).
  async function touchStreak(today) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    const ref = aigDb.ref(`players/${player.id}/streak`);
    const snap = await ref.get();
    const data = snap.exists() ? snap.val() : { count: 0, lastPlayDate: null, bestStreak: 0 };
    if (data.lastPlayDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newCount;
    let freezeUsedOn = data.freezeUsedOn || null;
    if (data.lastPlayDate === yesterday) {
      newCount = (data.count || 0) + 1;
    } else {
      // Streak Freeze (PM round 9): each purchased freeze covers ONE missed
      // day; up to 2 consecutive missed days can be bridged if enough
      // freezes are held, otherwise the streak resets to 1 as before.
      const missed = data.lastPlayDate
        ? Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(data.lastPlayDate + "T00:00:00Z")) / 86400000) - 1
        : 0;
      newCount = 1;
      if (missed >= 1 && missed <= STREAK_FREEZE_MAX && (data.count || 0) > 0) {
        const freezes = await getStreakFreezes();
        if (freezes >= missed) {
          await aigDb.ref(`players/${player.id}/streakFreezes`).set(freezes - missed);
          newCount = (data.count || 0) + 1;
          freezeUsedOn = today;
        }
      }
    }
    const newBest = Math.max(data.bestStreak || 0, newCount);
    const streakRecord = { count: newCount, lastPlayDate: today, bestStreak: newBest };
    if (freezeUsedOn) streakRecord.freezeUsedOn = freezeUsedOn;
    await ref.set(streakRecord);
    cachedStreakCount = newCount;
  }

  // ---- Streak Multiplier -- makes the login streak (already tracked
  // above) ALSO boost coin earning, not just a number on the hub. Cached
  // synchronously here (populated by touchStreak/getStreak, both of
  // which already run at least once per session) so awardCurrency()
  // below can read it on every single correct answer without an extra
  // Firebase round-trip per question. Worst case, a fresh page load
  // that hasn't resolved either read yet uses the 0-default (no bonus)
  // for its first answer or two -- eventual consistency, not a bug.
  let cachedStreakCount = 0;
  function streakMultiplierFor(count) {
    if (count >= 14) return 2;
    if (count >= 7) return 1.5;
    if (count >= 3) return 1.2;
    return 1;
  }
  // Refreshes the cache too (every hub load and every hub Today-panel
  // re-render calls this to show the badge), so the hub is also the
  // most reliable place the cache gets warmed for whichever game the
  // kid opens next.
  async function getStreakMultiplierInfo() {
    const streak = await getStreak();
    const count = streak.count || 0;
    cachedStreakCount = count;
    return { count, multiplier: streakMultiplierFor(count) };
  }

  // Monday (UTC) of the current week, as YYYY-MM-DD -- the key both the
  // weekly leaderboard and the Weekly Recap read from. Resets naturally
  // every Monday since it's derived from the clock, not stored anywhere.
  function weekKey() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday);
    return monday.toISOString().slice(0, 10);
  }

  // players/{id}/weekly/{weekKey} = {correct, name} -- a cross-game count
  // of correct answers this week, same trigger as coins/season points.
  // Stores `name` alongside so the weekly leaderboard (which has to read
  // the whole players/ tree once, see getWeeklyLeaderboard below) doesn't
  // need a second lookup per player just to show a name.
  function touchWeeklyStats() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    aigDb.ref(`players/${player.id}/weekly/${weekKey()}`).transaction(cur => {
      const d = cur || { correct: 0, name: player.name };
      d.correct = (d.correct || 0) + 1;
      d.name = player.name;
      return d;
    });
  }

  // A weekly, self-resetting ranking -- unlike the per-game all-time
  // leaderboard (leaderboard.html's default view, ranked by lifetime
  // timesPlayed), this ranks CROSS-game correct answers for the CURRENT
  // week only, so a kid who's behind on lifetime totals gets a fresh shot
  // every Monday. Reads the whole players/ tree once (already publicly
  // readable, same as every other players/* read above) rather than a
  // live subscription -- acceptable for a small class roster, and this
  // view is opened rarely (a tab flip), not on every hub load.
  async function getWeeklyLeaderboard() {
    const wk = weekKey();
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return { weekKey: wk, ranking: [] };
    const all = snap.val();
    const ranking = Object.entries(all)
      .map(([id, data]) => {
        const w = data.weekly && data.weekly[wk];
        return { id, name: (w && w.name) || id, correct: (w && w.correct) || 0 };
      })
      .filter(r => r.correct > 0)
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 20);
    return { weekKey: wk, ranking };
  }

  async function getStreak() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { count: 0, bestStreak: 0 };
    const snap = await aigDb.ref(`players/${player.id}/streak`).get();
    const result = snap.exists() ? snap.val() : { count: 0, bestStreak: 0 };
    cachedStreakCount = result.count || 0; // keeps awardCurrency's synchronous read fresh -- see streakMultiplierFor
    return result;
  }

  // 3 fixed quest TYPES (accuracy volume / breadth across games / raw
  // volume), targets randomized per day so it doesn't feel identical every
  // time. Picked deterministically from a hash of playerId+date so two
  // tabs opened the same day converge on the same numbers instead of each
  // trying to set its own random target.
  const QUEST_TARGET_POOL = {
    correct: [8, 10, 12, 15],
    games: [1, 2],
    attempts: [15, 20, 25]
  };

  function seedFrom(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function pickQuestTargets(seed) {
    const pick = (arr, salt) => arr[(seed + salt) % arr.length];
    return {
      correct: pick(QUEST_TARGET_POOL.correct, 1),
      games: pick(QUEST_TARGET_POOL.games, 2),
      attempts: pick(QUEST_TARGET_POOL.attempts, 3)
    };
  }

  function getQuestLabel(type, target) {
    if (type === "correct") return `Jawab benar ${target}x hari ini`;
    if (type === "games") return `Coba ${target} game berbeda hari ini`;
    if (type === "attempts") return `Selesaikan ${target} soal hari ini`;
    return "";
  }

  // Reads (and lazily creates, first time today) this player's 3 daily
  // quests, plus computes live progress from dailyStats. Safe to call
  // repeatedly — quest targets are only generated once per day per player
  // and stored, so re-opening the hub later the same day shows the same
  // quests with updated progress, never fresh/reset ones.
  async function getDailyQuests() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const today = todayKey();
    const questRef = aigDb.ref(`players/${player.id}/dailyQuests/${today}`);
    const questSnap = await questRef.get();
    let questData;
    if (!questSnap.exists()) {
      const targets = pickQuestTargets(seedFrom(player.id + today));
      questData = {
        quests: [
          { type: "correct", target: targets.correct, claimed: false },
          { type: "games", target: targets.games, claimed: false },
          { type: "attempts", target: targets.attempts, claimed: false }
        ],
        bonusClaimed: false
      };
      await questRef.set(questData);
    } else {
      questData = questSnap.val();
    }

    const statsSnap = await aigDb.ref(`players/${player.id}/dailyStats/${today}`).get();
    const stats = statsSnap.exists() ? statsSnap.val() : { correct: 0, wrong: 0, games: {} };
    const gamesPlayed = Object.keys(stats.games || {}).length;
    const attempts = (stats.correct || 0) + (stats.wrong || 0);

    const progressFor = q => {
      if (q.type === "correct") return stats.correct || 0;
      if (q.type === "games") return gamesPlayed;
      if (q.type === "attempts") return attempts;
      return 0;
    };

    const quests = questData.quests.map((q, i) => ({
      ...q,
      index: i,
      progress: Math.min(progressFor(q), q.target),
      done: progressFor(q) >= q.target
    }));

    return { quests, bonusClaimed: questData.bonusClaimed };
  }

  // Claims one quest's reward (+1 gem). NOT built on .transaction() for the
  // same reason unlockVehicle above isn't — a plain get-check-set instead,
  // same accepted narrow race (two claims of the same quest in the exact
  // same instant), fine for a cosmetic currency.
  async function claimDailyQuest(index) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const today = todayKey();
    const state = await getDailyQuests();
    if (!state) return { ok: false };
    const quest = state.quests[index];
    if (!quest || !quest.done || quest.claimed) return { ok: false };

    const questRef = aigDb.ref(`players/${player.id}/dailyQuests/${today}`);
    await questRef.child(`quests/${index}/claimed`).set(true);

    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    await walletRef.set({ ...wallet, gems: (wallet.gems || 0) + 1 });

    return { ok: true };
  }

  // Separate explicit tap, NOT auto-granted the instant the 3rd quest is
  // claimed (per user request -- claiming should always be a deliberate
  // press, never something that happens silently as a side effect of
  // another action). Same get-check-set pattern as claimDailyQuest above.
  async function claimDailyBonus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const today = todayKey();
    const questRef = aigDb.ref(`players/${player.id}/dailyQuests/${today}`);
    const snap = await questRef.get();
    if (!snap.exists()) return { ok: false };
    const state = snap.val();
    const allClaimed = state.quests.every(q => q.claimed);
    if (!allClaimed || state.bonusClaimed) return { ok: false };

    await questRef.child("bonusClaimed").set(true);
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    await walletRef.set({ ...wallet, gems: (wallet.gems || 0) + 2 });

    const newCard = await awardRandomCard("common");
    return { ok: true, newCard };
  }

  // =====================================================================
  // BOSS CHALLENGE — one-time reward per {gameId, chapterId} boss fight
  // cleared. Stored at players/{id}/bossWins/{gameId}:{chapterId} (a
  // colon-joined key, since RTDB keys can't contain "/"). Same
  // get-check-set pattern as unlockVehicle above (no transaction) --
  // replaying an already-won boss for fun is explicitly supported by the
  // caller checking `alreadyWon` and just skipping the reward, not by
  // this function rejecting the call.
  // =====================================================================
  async function claimBossWin(gameId, chapterId, reward) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const key = `${gameId}:${chapterId}`;
    const winRef = aigDb.ref(`players/${player.id}/bossWins/${key}`);
    const winSnap = await winRef.get();
    if (winSnap.exists() && winSnap.val()) return { ok: true, alreadyWon: true };
    await winRef.set(true);

    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    await walletRef.set({
      ...wallet,
      coins: (wallet.coins || 0) + (reward.coins || 0),
      gems: (wallet.gems || 0) + (reward.gems || 0)
    });
    const newCard = await awardRandomCard("legendary");
    return { ok: true, alreadyWon: false, newCard };
  }

  // =====================================================================
  // BOSS OF THE WEEK -- one of MathVille's per-chapter Boss Challenges
  // is deterministically "featured" each week (hash of weekKey() over
  // the chapter id list, passed in by the caller since the chapter list
  // itself lives in mathville's own questions.js, not here), with an
  // extra bonus ON TOP OF the normal claimBossWin reward for beating
  // THAT specific chapter's boss this week. Distinct from the separate
  // "Weekly Boss Rush" above (a single cross-chapter 10-question
  // gauntlet) -- this rotates which of the existing 10 individual
  // per-chapter bosses is worth extra, steering replay traffic around
  // rather than adding a new fight mode.
  // =====================================================================
  const WEEKLY_FEATURED_BOSS_REWARD = { coins: 20, gems: 2 };

  function weeklyFeaturedChapterId(chapterIds) {
    const wk = weekKey();
    let h = 0;
    for (let i = 0; i < wk.length; i++) h = (h * 31 + wk.charCodeAt(i)) | 0;
    return chapterIds[Math.abs(h) % chapterIds.length];
  }

  async function getWeeklyFeaturedBossStatus(chapterIds) {
    const featuredChapterId = weeklyFeaturedChapterId(chapterIds);
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { featuredChapterId, claimed: true, reward: WEEKLY_FEATURED_BOSS_REWARD };
    const snap = await aigDb.ref(`players/${player.id}/weeklyFeaturedBossWins/${weekKey()}`).get();
    return { featuredChapterId, claimed: snap.exists() && snap.val() === true, reward: WEEKLY_FEATURED_BOSS_REWARD };
  }

  async function claimWeeklyFeaturedBoss() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/weeklyFeaturedBossWins/${weekKey()}`);
    const snap = await ref.get();
    if (snap.exists() && snap.val()) return { ok: true, alreadyClaimed: true };
    await ref.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + WEEKLY_FEATURED_BOSS_REWARD.coins;
      wallet.gems = (wallet.gems || 0) + WEEKLY_FEATURED_BOSS_REWARD.gems;
      return wallet;
    });
    return { ok: true, alreadyClaimed: false, reward: WEEKLY_FEATURED_BOSS_REWARD };
  }

  // =====================================================================
  // WEEKLY THEME DAY -- a fixed day-of-week -> subject mapping (no
  // Firebase state needed for the mapping itself, purely derived from
  // the clock), with a small one-time daily bonus for playing that
  // day's themed subject at least once. Reuses dailyStats (already
  // populated by touchDailyStats on every answer) to check eligibility.
  // =====================================================================
  const THEME_DAY_SUBJECTS = ["science", "math", "language", "science", "math", "language", "math"]; // Sun..Sat
  const THEME_DAY_INFO = {
    math: { emoji: "🔢", label: "Math Day", games: ["mathville", "multipleazka"] },
    language: { emoji: "📖", label: "Language Day", games: ["language-arts"] },
    science: { emoji: "🪐", label: "Science Day", games: ["solarquest"] }
  };
  const THEME_DAY_REWARD = { coins: 10 };

  function getThemeDayInfo() {
    const subject = THEME_DAY_SUBJECTS[new Date().getUTCDay()];
    return { subject, ...THEME_DAY_INFO[subject] };
  }

  async function getThemeDayBonusStatus() {
    const info = getThemeDayInfo();
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ...info, eligible: false, claimed: true, reward: THEME_DAY_REWARD };
    const [claimSnap, dailySnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/themeDayBonus/${todayKey()}`).get(),
      aigDb.ref(`players/${player.id}/dailyStats/${todayKey()}`).get()
    ]);
    const claimed = claimSnap.exists() && claimSnap.val() === true;
    const dailyGames = dailySnap.exists() ? (dailySnap.val().games || {}) : {};
    const eligible = info.games.some(g => dailyGames[g]);
    return { ...info, eligible, claimed, reward: THEME_DAY_REWARD };
  }

  async function claimThemeDayBonus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const status = await getThemeDayBonusStatus();
    if (!status.eligible || status.claimed) return { ok: false, reason: "not-eligible" };
    const ref = aigDb.ref(`players/${player.id}/themeDayBonus/${todayKey()}`);
    const snap = await ref.get();
    if (snap.exists() && snap.val()) return { ok: true, alreadyClaimed: true };
    await ref.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + THEME_DAY_REWARD.coins;
      return wallet;
    });
    return { ok: true, alreadyClaimed: false, reward: THEME_DAY_REWARD };
  }

  // =====================================================================
  // AZKA'S WEEKLY PR BONUS -- once-per-day claim after finishing a round
  // via mathville's launchAzkaPrRound() (its own hub card, gated to
  // Azka's account only there -- see index.html). Same get-check-set
  // claim pattern as Theme Day above. Bigger than Boss Challenge's
  // {coins:15,gems:1} on purpose -- meant to feel like the flagship
  // reward for this week's focused practice, not routine coin drip.
  // Time-boxed to the same 7-day window as mathville/weekly-focus.js
  // (the date is duplicated here rather than shared -- this file has no
  // load-order dependency on that one, same reasoning as WEEKLY_FOCUS_END
  // already being duplicated between mathville/script.js and
  // multipleazka/script.js instead of centralized).
  // =====================================================================
  const AZKA_PR_END = new Date("2026-09-29T23:59:59+07:00").getTime();
  const AZKA_PR_REWARD = { coins: 20, gems: 2 };

  async function getAzkaPrBonusStatus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent" || Date.now() >= AZKA_PR_END) {
      return { eligible: false, claimed: true, reward: AZKA_PR_REWARD };
    }
    const snap = await aigDb.ref(`players/${player.id}/azkaPrBonus/${todayKey()}`).get();
    const claimed = snap.exists() && snap.val() === true;
    return { eligible: true, claimed, reward: AZKA_PR_REWARD };
  }

  async function claimAzkaPrBonus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent" || Date.now() >= AZKA_PR_END) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/azkaPrBonus/${todayKey()}`);
    const snap = await ref.get();
    if (snap.exists() && snap.val()) return { ok: true, alreadyClaimed: true };
    await ref.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + AZKA_PR_REWARD.coins;
      wallet.gems = (wallet.gems || 0) + AZKA_PR_REWARD.gems;
      return wallet;
    });
    return { ok: true, alreadyClaimed: false, reward: AZKA_PR_REWARD };
  }

  // =====================================================================
  // PERKS (PM round 9, batch 1) -- new places to SPEND coins/gems, all
  // nested under the already-open players/{id}/... rules (no new RTDB
  // paths). Every spend uses the get-check-set pattern (NOT
  // .transaction(), which can abort spuriously on this secondary Firebase
  // app instance -- see unlockVehicle's own comment); every credit is a
  // plain add-only transaction, which never aborts.
  // =====================================================================
  function perksPlayer() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    return (!player || player.role === "parent") ? null : player;
  }

  async function spendWallet(cost) {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    const ref = aigDb.ref(`players/${player.id}/wallet`);
    const snap = await ref.get();
    const wallet = snap.exists() ? snap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    const c = cost.coins || 0, g = cost.gems || 0;
    if ((wallet.coins || 0) < c || (wallet.gems || 0) < g) return { ok: false, reason: "insufficient-funds" };
    await ref.set({ ...wallet, coins: (wallet.coins || 0) - c, gems: (wallet.gems || 0) - g });
    return { ok: true };
  }

  async function creditWallet(reward) {
    const player = perksPlayer();
    if (!player) return;
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const w = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      w.coins = (w.coins || 0) + (reward.coins || 0);
      w.gems = (w.gems || 0) + (reward.gems || 0);
      return w;
    });
  }

  // ---- 1. Streak Freeze -- a purchased "shield" for the login streak.
  // touchStreak() (above) consumes one per missed day (up to 2 missed days
  // in a row) instead of resetting the streak to 1.
  const STREAK_FREEZE_COST = { coins: 30 };
  const STREAK_FREEZE_MAX = 2;
  async function getStreakFreezes() {
    const player = perksPlayer();
    if (!player) return 0;
    const snap = await aigDb.ref(`players/${player.id}/streakFreezes`).get();
    return snap.exists() ? (snap.val() || 0) : 0;
  }
  async function buyStreakFreeze() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const have = await getStreakFreezes();
    if (have >= STREAK_FREEZE_MAX) return { ok: false, reason: "max" };
    const spent = await spendWallet(STREAK_FREEZE_COST);
    if (!spent.ok) return spent;
    await aigDb.ref(`players/${player.id}/streakFreezes`).set(have + 1);
    return { ok: true, count: have + 1 };
  }

  // ---- 2. Piggy Bank -- deposit coins, earn 10%/week simple interest on
  // the principal (max 4 weeks counted, 500 coin cap) -- a saving/percent
  // lesson that also gives a reason to come back weekly.
  const PIGGY_RATE = 0.10, PIGGY_MAX_WEEKS = 4, PIGGY_CAP = 500, WEEK_MS = 7 * 86400000;
  function piggyView(p) {
    const amount = (p && p.amount) || 0;
    const weeks = amount ? Math.min(PIGGY_MAX_WEEKS, Math.floor((Date.now() - (p.since || Date.now())) / WEEK_MS)) : 0;
    return { amount, since: (p && p.since) || 0, weeks, interest: Math.floor(amount * PIGGY_RATE * weeks) };
  }
  async function getPiggy() {
    const player = perksPlayer();
    if (!player) return piggyView(null);
    const snap = await aigDb.ref(`players/${player.id}/piggy`).get();
    return piggyView(snap.exists() ? snap.val() : null);
  }
  async function depositPiggy(n) {
    const player = perksPlayer();
    n = Math.floor(n);
    if (!player || !(n >= 1)) return { ok: false, reason: "bad-amount" };
    const p = await getPiggy();
    const principal = p.amount + p.interest; // settle earned interest into principal so it keeps compounding
    if (principal + n > PIGGY_CAP) return { ok: false, reason: "cap" };
    const spent = await spendWallet({ coins: n });
    if (!spent.ok) return spent;
    await aigDb.ref(`players/${player.id}/piggy`).set({ amount: principal + n, since: Date.now() });
    return { ok: true, amount: principal + n };
  }
  async function withdrawPiggy() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const p = await getPiggy();
    if (!p.amount) return { ok: false, reason: "empty" };
    await aigDb.ref(`players/${player.id}/piggy`).remove(); // cleared BEFORE crediting so a double-tap can't pay twice
    const total = p.amount + p.interest;
    await creditWallet({ coins: total });
    return { ok: true, total, interest: p.interest };
  }

  // ---- 3. Pre-round Loadout -- consumable items bought here, "armed" for
  // the NEXT round of Ninja Runner / Plane Mode / Boss Rush, which call
  // consumeArmedLoadout() once at round start.
  const LOADOUT_ITEMS = [
    { id: "life", name: "Extra Life", emoji: "❤️", cost: { coins: 15 }, desc: "+1 life (Ninja/Plane) or +8 HP (Boss Rush)" },
    { id: "shield", name: "Shield", emoji: "🛡️", cost: { coins: 20 }, desc: "Blocks the first hit you take" },
    { id: "boost", name: "Coin Boost", emoji: "🪙", cost: { coins: 25 }, desc: "2x coins for 3 minutes" }
  ];
  let cachedCoinBoostUntil = 0;
  async function getInventory() {
    const player = perksPlayer();
    if (!player) return {};
    const snap = await aigDb.ref(`players/${player.id}/inventory`).get();
    return snap.exists() ? snap.val() : {};
  }
  async function getArmedLoadout() {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/armedLoadout`).get();
    return snap.exists() ? snap.val() : null;
  }
  async function buyLoadout(id) {
    const player = perksPlayer();
    const item = LOADOUT_ITEMS.find(i => i.id === id);
    if (!player || !item) return { ok: false };
    const inv = await getInventory();
    if ((inv[id] || 0) >= 9) return { ok: false, reason: "max" };
    const spent = await spendWallet(item.cost);
    if (!spent.ok) return spent;
    await aigDb.ref(`players/${player.id}/inventory/${id}`).set((inv[id] || 0) + 1);
    return { ok: true };
  }
  async function armLoadout(id) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    if (id === null) { await aigDb.ref(`players/${player.id}/armedLoadout`).remove(); return { ok: true }; }
    const inv = await getInventory();
    if (!(inv[id] > 0)) return { ok: false, reason: "none-owned" };
    await aigDb.ref(`players/${player.id}/armedLoadout`).set(id);
    return { ok: true };
  }
  // Called by a game at round start. Returns the consumed item id (or null).
  async function consumeArmedLoadout() {
    const player = perksPlayer();
    if (!player) return null;
    const armed = await getArmedLoadout();
    if (!armed) return null;
    await aigDb.ref(`players/${player.id}/armedLoadout`).remove(); // cleared first -- one consume per arm
    const inv = await getInventory();
    if (!(inv[armed] > 0)) return null;
    await aigDb.ref(`players/${player.id}/inventory/${armed}`).set(inv[armed] - 1);
    if (armed === "boost") cachedCoinBoostUntil = Date.now() + 180000;
    return armed;
  }

  // ---- 4. Pet Adventure -- send the pet out for 1 hour, come back for loot.
  const PET_ADVENTURE_COST = { coins: 15 };
  const PET_ADVENTURE_MS = 3600000;
  const PET_ADVENTURE_MAX_PER_DAY = 3;
  async function getPetAdventure() {
    const player = perksPlayer();
    if (!player) return { state: "none", startsLeftToday: 0 };
    const [advSnap, cntSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/petAdventure`).get(),
      aigDb.ref(`players/${player.id}/petAdventureCount/${todayKey()}`).get()
    ]);
    const used = cntSnap.exists() ? (cntSnap.val() || 0) : 0;
    const startsLeftToday = Math.max(0, PET_ADVENTURE_MAX_PER_DAY - used);
    if (!advSnap.exists()) return { state: "none", startsLeftToday };
    const endsAt = advSnap.val().startedAt + PET_ADVENTURE_MS;
    return { state: Date.now() >= endsAt ? "ready" : "away", endsAt, startsLeftToday };
  }
  async function startPetAdventure() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const cur = await getPetAdventure();
    if (cur.state !== "none") return { ok: false, reason: "busy" };
    if (cur.startsLeftToday <= 0) return { ok: false, reason: "daily-limit" };
    const spent = await spendWallet(PET_ADVENTURE_COST);
    if (!spent.ok) return spent;
    await aigDb.ref(`players/${player.id}/petAdventure`).set({ startedAt: Date.now() });
    await aigDb.ref(`players/${player.id}/petAdventureCount/${todayKey()}`).set((PET_ADVENTURE_MAX_PER_DAY - cur.startsLeftToday) + 1);
    return { ok: true };
  }
  async function claimPetAdventure() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const cur = await getPetAdventure();
    if (cur.state !== "ready") return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${player.id}/petAdventure`).remove(); // cleared first -- no double claim
    const r = Math.random();
    if (r < 0.55) { const coins = 20 + Math.floor(Math.random() * 16); await creditWallet({ coins }); return { ok: true, loot: { type: "coins", amount: coins } }; }
    if (r < 0.85) { const coins = 35 + Math.floor(Math.random() * 21); await creditWallet({ coins }); return { ok: true, loot: { type: "coins", amount: coins } }; }
    if (r < 0.95) { const card = await awardRandomCard("common"); return { ok: true, loot: { type: "card", id: card, card: CARD_POOL.find(c => c.id === card) } }; }
    await creditWallet({ gems: 1 });
    return { ok: true, loot: { type: "gems", amount: 1 } };
  }

  // ---- 5. Lucky Wheel -- 1 free spin/day, up to 5 extra at 🪙10.
  const WHEEL_EXTRA_COST = { coins: 10 };
  const WHEEL_EXTRA_MAX = 5;
  const WHEEL_PRIZES = [
    { label: "🪙 5", weight: 30, coins: 5 },
    { label: "🪙 10", weight: 25, coins: 10 },
    { label: "🪙 25", weight: 15, coins: 25 },
    { label: "🪙 50", weight: 5, coins: 50 },
    { label: "💎 1", weight: 10, gems: 1 },
    { label: "💎 2", weight: 3, gems: 2 },
    { label: "🎴 Card", weight: 10, card: true },
    { label: "💨 Nothing", weight: 2 }
  ];
  async function getWheelStatus() {
    const player = perksPlayer();
    if (!player) return { freeAvailable: false, extraUsed: 0, extraLeft: 0 };
    const snap = await aigDb.ref(`players/${player.id}/wheel/${todayKey()}`).get();
    const d = snap.exists() ? snap.val() : { freeUsed: false, extra: 0 };
    return { freeAvailable: !d.freeUsed, extraUsed: d.extra || 0, extraLeft: Math.max(0, WHEEL_EXTRA_MAX - (d.extra || 0)) };
  }
  async function spinWheel() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const st = await getWheelStatus();
    const ref = aigDb.ref(`players/${player.id}/wheel/${todayKey()}`);
    if (st.freeAvailable) {
      await ref.update({ freeUsed: true });
    } else {
      if (st.extraLeft <= 0) return { ok: false, reason: "daily-limit" };
      const spent = await spendWallet(WHEEL_EXTRA_COST);
      if (!spent.ok) return spent;
      await ref.update({ extra: st.extraUsed + 1 });
    }
    const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * total, idx = 0;
    for (let i = 0; i < WHEEL_PRIZES.length; i++) { roll -= WHEEL_PRIZES[i].weight; if (roll <= 0) { idx = i; break; } }
    const prize = WHEEL_PRIZES[idx];
    let card = null;
    if (prize.coins || prize.gems) await creditWallet({ coins: prize.coins || 0, gems: prize.gems || 0 });
    if (prize.card) { const id = await awardRandomCard("common"); card = CARD_POOL.find(c => c.id === id) || null; }
    return { ok: true, prizeIndex: idx, prize, card, free: st.freeAvailable };
  }

  // ---- 8. Personal Booster -- 2x coins for 30 min, 1x/day (💎2).
  const BOOSTER_COST = { gems: 2 };
  const BOOSTER_MS = 30 * 60000;
  let cachedBoosterUntil = 0;
  let boosterFetched = false;
  async function getBooster() {
    const player = perksPlayer();
    if (!player) return { until: 0, active: false, boughtToday: false };
    const snap = await aigDb.ref(`players/${player.id}/booster`).get();
    const d = snap.exists() ? snap.val() : {};
    cachedBoosterUntil = d.until || 0;
    return { until: d.until || 0, active: (d.until || 0) > Date.now(), boughtToday: d.boughtDate === todayKey() };
  }
  async function buyBooster() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const cur = await getBooster();
    if (cur.boughtToday) return { ok: false, reason: "daily-limit" };
    const spent = await spendWallet(BOOSTER_COST);
    if (!spent.ok) return spent;
    const until = Date.now() + BOOSTER_MS;
    await aigDb.ref(`players/${player.id}/booster`).set({ until, boughtDate: todayKey() });
    cachedBoosterUntil = until;
    return { ok: true, until };
  }
  // Loaded lazily once per page (first awardCurrency call) so games that
  // never open Extras still honor an active booster.
  function ensureBoosterLoaded() {
    if (boosterFetched) return;
    boosterFetched = true;
    getBooster().catch(() => {});
  }

  // =====================================================================
  // PERKS batch 2 (PM round 9) -- Room, Secret Modes, Question Bounty,
  // Class Fund, Class Boss, Team Battle. Class-wide features read the whole
  // players/ tree (the same technique getWeeklyLeaderboard already uses)
  // and Class Fund donations live at leaderboard/classfund/{playerId} --
  // the already-open `leaderboard` rule -- so NO RTDB rules change.
  // =====================================================================
  let allPlayersCache = { at: 0, val: null };
  async function readAllPlayers() {
    if (allPlayersCache.val && Date.now() - allPlayersCache.at < 30000) return allPlayersCache.val;
    const snap = await aigDb.ref("players").get();
    allPlayersCache = { at: Date.now(), val: snap.exists() ? snap.val() : {} };
    return allPlayersCache.val;
  }
  function nameOf(id, data) {
    const w = data && data.weekly && Object.values(data.weekly).find(x => x && x.name);
    return (w && w.name) || (data && data.customQuestions && Object.values(data.customQuestions).find(q => q.authorName) || {}).authorName || id;
  }

  // ---- 6. Room -- 6 slots on the profile page, furnished with items bought
  // via the generic unlockCosmetic type "room-item".
  const ROOM_SLOTS = 6;
  const ROOM_ITEMS = [
    { id: "plant", name: "Plant", emoji: "🪴", cost: { coins: 15 } },
    { id: "lamp", name: "Lamp", emoji: "🛋️", cost: { coins: 20 } },
    { id: "poster", name: "Poster", emoji: "🖼️", cost: { coins: 20 } },
    { id: "books", name: "Bookshelf", emoji: "📚", cost: { coins: 25 } },
    { id: "globe", name: "Globe", emoji: "🌍", cost: { coins: 30 } },
    { id: "telescope", name: "Telescope", emoji: "🔭", cost: { coins: 35 } },
    { id: "guitar", name: "Guitar", emoji: "🎸", cost: { coins: 35 } },
    { id: "aquarium", name: "Aquarium", emoji: "🐠", cost: { coins: 45 } },
    { id: "trophy", name: "Trophy", emoji: "🏆", cost: { coins: 50 } },
    { id: "rocket", name: "Model Rocket", emoji: "🚀", cost: { gems: 2 } },
    { id: "dino", name: "Dino Statue", emoji: "🦖", cost: { gems: 3 } },
    { id: "crystal", name: "Crystal Ball", emoji: "🔮", cost: { gems: 3 } }
  ];
  async function getRoom() {
    const player = perksPlayer();
    if (!player) return null;
    const [ownedSnap, roomSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics/room-item`).get(),
      aigDb.ref(`players/${player.id}/room`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    const room = roomSnap.exists() ? roomSnap.val() : {};
    return {
      items: ROOM_ITEMS.map(i => ({ ...i, owned: !!owned[i.id] })),
      slots: Array.from({ length: ROOM_SLOTS }, (_, n) => room["s" + n] || null)
    };
  }
  async function placeRoomItem(slot, itemId) {
    const player = perksPlayer();
    if (!player || !(slot >= 0 && slot < ROOM_SLOTS)) return { ok: false };
    if (itemId === null) { await aigDb.ref(`players/${player.id}/room/s${slot}`).remove(); return { ok: true }; }
    const own = await aigDb.ref(`players/${player.id}/ownedCosmetics/room-item/${itemId}`).get();
    if (!own.exists() || !own.val()) return { ok: false, reason: "not-owned" };
    await aigDb.ref(`players/${player.id}/room/s${slot}`).set(itemId);
    return { ok: true };
  }

  // ---- 7. Secret Modes -- gem-gated gameplay variants (type "secret-mode").
  const SECRET_MODES = [
    { id: "nightmare", name: "Boss Rush: Nightmare", emoji: "🌋", cost: { gems: 3 }, desc: "2 extra, tougher bosses at the end of Boss Rush." },
    { id: "turbo", name: "Math Race: Turbo", emoji: "🔥", cost: { gems: 4 }, desc: "A 4th Math Race difficulty: bigger numbers, 5-second timer." }
  ];
  async function getSecretModes() {
    const player = perksPlayer();
    if (!player) return SECRET_MODES.map(m => ({ ...m, owned: false }));
    const snap = await aigDb.ref(`players/${player.id}/ownedCosmetics/secret-mode`).get();
    const owned = snap.exists() ? snap.val() : {};
    return SECRET_MODES.map(m => ({ ...m, owned: !!owned[m.id] }));
  }
  async function hasSecretMode(id) {
    const player = perksPlayer();
    if (!player) return false;
    const snap = await aigDb.ref(`players/${player.id}/ownedCosmetics/secret-mode/${id}`).get();
    return snap.exists() && !!snap.val();
  }

  // ---- 9. Question Bounty -- an author puts coins on one of their OWN
  // approved Kids' Quiz questions; the first classmate to answer it
  // correctly takes the pot.
  const BOUNTY_MIN = 5, BOUNTY_MAX = 50;
  async function setQuestionBounty(qId, amount) {
    const player = perksPlayer();
    amount = Math.floor(amount);
    if (!player || !(amount >= BOUNTY_MIN && amount <= BOUNTY_MAX)) return { ok: false, reason: "bad-amount" };
    const ref = aigDb.ref(`players/${player.id}/customQuestions/${qId}`);
    const snap = await ref.get();
    if (!snap.exists() || snap.val().status !== "approved") return { ok: false, reason: "not-approved" };
    if (snap.val().bounty) return { ok: false, reason: "already-set" };
    const spent = await spendWallet({ coins: amount });
    if (!spent.ok) return spent;
    await ref.child("bounty").set({ amount, claimedBy: null });
    return { ok: true };
  }
  async function claimQuestionBounty(authorId, qId) {
    const player = perksPlayer();
    if (!player || authorId === player.id) return { ok: false };
    const ref = aigDb.ref(`players/${authorId}/customQuestions/${qId}/bounty`);
    const snap = await ref.get();
    if (!snap.exists() || snap.val().claimedBy || !snap.val().amount) return { ok: false, reason: "no-bounty" };
    const amount = snap.val().amount;
    // Only ever writes when claimedBy is still empty; on a lost race the
    // transaction commits nothing and we report no-bounty.
    const res = await ref.child("claimedBy").transaction(cur => (cur ? undefined : player.id));
    if (!res.committed) return { ok: false, reason: "no-bounty" };
    await creditWallet({ coins: amount });
    return { ok: true, amount };
  }

  // ---- 10. Class Fund -- everyone donates coins; class-wide tiers unlock
  // a one-time claimable bonus for EVERY player + hub confetti.
  const CLASS_FUND_TIERS = [
    { at: 150, coins: 10, label: "🎉 Party time" },
    { at: 400, coins: 20, label: "🌈 Rainbow class" },
    { at: 900, coins: 40, label: "🏆 Class champions" }
  ];
  async function getClassFund() {
    const player = perksPlayer();
    const [snap, claimSnap] = await Promise.all([
      aigDb.ref("leaderboard/classfund").get(),
      player ? aigDb.ref(`players/${player.id}/classFundClaims`).get() : Promise.resolve(null)
    ]);
    const all = snap.exists() ? snap.val() : {};
    const donors = Object.entries(all).map(([id, d]) => ({ id, name: d.name || id, donated: d.donated || 0 })).sort((a, b) => b.donated - a.donated);
    const total = donors.reduce((s, d) => s + d.donated, 0);
    const claims = claimSnap && claimSnap.exists() ? claimSnap.val() : {};
    return {
      total, donors: donors.slice(0, 5),
      mine: player ? ((all[player.id] && all[player.id].donated) || 0) : 0,
      tiers: CLASS_FUND_TIERS.map((t, i) => ({ ...t, index: i, reached: total >= t.at, claimed: !!claims["t" + i] }))
    };
  }
  async function donateClassFund(n) {
    const player = perksPlayer();
    n = Math.floor(n);
    if (!player || !(n >= 1 && n <= 100)) return { ok: false, reason: "bad-amount" };
    const spent = await spendWallet({ coins: n });
    if (!spent.ok) return spent;
    await aigDb.ref(`leaderboard/classfund/${player.id}`).transaction(cur => {
      const d = cur || { name: player.name, donated: 0 };
      d.name = player.name;
      d.donated = (d.donated || 0) + n;
      return d;
    });
    return { ok: true };
  }
  async function claimClassFundTier(i) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const fund = await getClassFund();
    const tier = fund.tiers[i];
    if (!tier || !tier.reached || tier.claimed) return { ok: false, reason: "not-available" };
    await aigDb.ref(`players/${player.id}/classFundClaims/t${i}`).set(true);
    await creditWallet({ coins: tier.coins });
    return { ok: true, coins: tier.coins };
  }

  // ---- 11. Class Boss -- ONE boss per day for the whole class; every
  // correct answer anyone gives (dailyStats.correct, already tracked) chips
  // its HP. Beat it and everyone who chipped in 5+ can claim a reward.
  const CLASS_BOSS_HP = 150, CLASS_BOSS_MIN_HITS = 5;
  const CLASS_BOSSES = [
    { emoji: "👹", name: "Ogre" }, { emoji: "🐉", name: "Dragon" }, { emoji: "🦖", name: "T-Rex" },
    { emoji: "🧟", name: "Zombie King" }, { emoji: "🦑", name: "Kraken" }, { emoji: "👾", name: "Alien" }, { emoji: "🐺", name: "Werewolf" }
  ];
  async function getClassBoss() {
    const player = perksPlayer();
    const today = todayKey();
    const all = await readAllPlayers();
    const contribs = Object.entries(all)
      .map(([id, d]) => ({ id, name: nameOf(id, d), hits: (d.dailyStats && d.dailyStats[today] && d.dailyStats[today].correct) || 0 }))
      .filter(c => c.hits > 0).sort((a, b) => b.hits - a.hits);
    const damage = contribs.reduce((s, c) => s + c.hits, 0);
    const mine = player ? ((contribs.find(c => c.id === player.id) || {}).hits || 0) : 0;
    const claimSnap = player ? await aigDb.ref(`players/${player.id}/classBossClaim/${today}`).get() : null;
    const boss = CLASS_BOSSES[new Date().getUTCDay() % CLASS_BOSSES.length];
    const defeated = damage >= CLASS_BOSS_HP;
    return { boss, hp: CLASS_BOSS_HP, damage, mine, defeated, top: contribs.slice(0, 5), minHits: CLASS_BOSS_MIN_HITS,
      claimed: !!(claimSnap && claimSnap.exists()), eligible: defeated && mine >= CLASS_BOSS_MIN_HITS };
  }
  async function claimClassBoss() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    allPlayersCache = { at: 0, val: null };
    const st = await getClassBoss();
    if (!st.eligible || st.claimed) return { ok: false, reason: "not-available" };
    await aigDb.ref(`players/${player.id}/classBossClaim/${todayKey()}`).set(true);
    await creditWallet({ coins: 15 });
    const card = await awardRandomCard("common");
    return { ok: true, coins: 15, card: CARD_POOL.find(c => c.id === card) || null };
  }

  // ---- 16. Team Battle -- everyone is auto-assigned Red/Blue (stable hash
  // of their id); teams' weekly correct answers are summed. Last week's
  // winning team's contributors (10+ correct) can claim a reward.
  const TEAM_MIN_HITS = 10;
  function teamOf(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 2 === 0 ? "red" : "blue";
  }
  function prevWeekKey() {
    const d = new Date(weekKey() + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  async function getTeamBattle() {
    const player = perksPlayer();
    const wk = weekKey(), pk = prevWeekKey();
    const all = await readAllPlayers();
    const sums = { cur: { red: 0, blue: 0 }, prev: { red: 0, blue: 0 }, members: { red: 0, blue: 0 } };
    let myPrev = 0, myCur = 0;
    Object.entries(all).forEach(([id, d]) => {
      const team = teamOf(id);
      const c = (d.weekly && d.weekly[wk] && d.weekly[wk].correct) || 0;
      const p = (d.weekly && d.weekly[pk] && d.weekly[pk].correct) || 0;
      sums.cur[team] += c; sums.prev[team] += p;
      if (c > 0 || p > 0) sums.members[team]++;
      if (player && id === player.id) { myCur = c; myPrev = p; }
    });
    const myTeam = player ? teamOf(player.id) : null;
    const prevWinner = sums.prev.red === sums.prev.blue ? null : (sums.prev.red > sums.prev.blue ? "red" : "blue");
    const claimSnap = player ? await aigDb.ref(`players/${player.id}/teamClaims/${pk}`).get() : null;
    return { weekKey: wk, cur: sums.cur, prev: sums.prev, members: sums.members, myTeam, myCur, myPrev, prevWinner,
      claimed: !!(claimSnap && claimSnap.exists()), eligible: !!prevWinner && prevWinner === myTeam && myPrev >= TEAM_MIN_HITS, minHits: TEAM_MIN_HITS };
  }
  async function claimTeamReward() {
    const player = perksPlayer();
    if (!player) return { ok: false };
    allPlayersCache = { at: 0, val: null };
    const st = await getTeamBattle();
    if (!st.eligible || st.claimed) return { ok: false, reason: "not-available" };
    await aigDb.ref(`players/${player.id}/teamClaims/${prevWeekKey()}`).set(true);
    await creditWallet({ coins: 20, gems: 1 });
    return { ok: true };
  }

  // ---- 12. Math Race Ghost -- personal best finish time per difficulty,
  // used as a "ghost" opponent that runs at the kid's own record pace.
  async function getMathRaceGhost(difficulty) {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/mathraceGhost/${difficulty}`).get();
    return snap.exists() ? snap.val() : null;
  }
  // Only ever lowers the stored time. Returns {newRecord, best}.
  async function saveMathRaceGhost(difficulty, seconds) {
    const player = perksPlayer();
    if (!player || !(seconds > 0)) return { newRecord: false };
    const cur = await getMathRaceGhost(difficulty);
    if (cur && cur <= seconds) return { newRecord: false, best: cur };
    await aigDb.ref(`players/${player.id}/mathraceGhost/${difficulty}`).set(seconds);
    return { newRecord: true, best: seconds };
  }

  // ---- 13. Bo's Story -- episodes unlock by lifetime correct answers
  // (players/{id}/totalCorrect); reading each one for the first time pays
  // a small coin reward. The episode TEXT lives in extras/script.js.
  const STORY_READ_REWARD = 5;
  async function getStoryRead() {
    const player = perksPlayer();
    if (!player) return {};
    const snap = await aigDb.ref(`players/${player.id}/storyRead`).get();
    return snap.exists() ? snap.val() : {};
  }
  async function markStoryRead(i) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/storyRead/e${i}`);
    const snap = await ref.get();
    if (snap.exists()) return { ok: true, first: false };
    await ref.set(true); // marked BEFORE crediting so a double-tap can't pay twice
    await creditWallet({ coins: STORY_READ_REWARD });
    return { ok: true, first: true, coins: STORY_READ_REWARD };
  }

  // ---- 20. Calendar -- which days of a month the kid played (dailyStats
  // has one child per active day) plus per-week completion for medals.
  async function getCalendarMonth(year, month) { // month is 0-based
    const player = perksPlayer();
    if (!player) return { days: {} };
    const snap = await aigDb.ref(`players/${player.id}/dailyStats`).get();
    const all = snap.exists() ? snap.val() : {};
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const days = {};
    Object.entries(all).forEach(([date, d]) => { if (date.startsWith(prefix)) days[Number(date.slice(8))] = d.correct || 0; });
    return { days };
  }

  // ---- 17. Zone Level -- adaptive difficulty. A rolling window of the last
  // answers moves the kid between Zone 1..5: 5+ right in the last 6 -> up,
  // 3+ wrong in the last 4 -> down. Games read getZoneLevel() to pick a
  // difficulty tier and call recordZoneResult() per answer.
  const ZONE_MIN = 1, ZONE_MAX = 5;
  let zoneCache = null; // { level, recent: [0|1,...] }
  async function loadZone() {
    if (zoneCache) return zoneCache;
    const player = perksPlayer();
    let d = null;
    if (player) { const snap = await aigDb.ref(`players/${player.id}/zone`).get(); d = snap.exists() ? snap.val() : null; }
    zoneCache = { level: (d && d.level) || 2, recent: (d && d.recent ? String(d.recent).split("").map(Number) : []) };
    return zoneCache;
  }
  async function getZoneLevel() { return (await loadZone()).level; }
  // Returns { level, change } where change is +1 / -1 / 0.
  async function recordZoneResult(isCorrect) {
    const player = perksPlayer();
    if (!player) return { level: 2, change: 0 };
    const z = await loadZone();
    z.recent.push(isCorrect ? 1 : 0);
    if (z.recent.length > 8) z.recent.shift();
    let change = 0;
    const last6 = z.recent.slice(-6), last4 = z.recent.slice(-4);
    if (last6.length === 6 && last6.reduce((a, b) => a + b, 0) >= 5 && z.level < ZONE_MAX) { z.level++; change = 1; z.recent = []; }
    else if (last4.length === 4 && last4.filter(x => !x).length >= 3 && z.level > ZONE_MIN) { z.level--; change = -1; z.recent = []; }
    aigDb.ref(`players/${player.id}/zone`).set({ level: z.level, recent: z.recent.join("") }).catch(() => {});
    return { level: z.level, change };
  }

  // ---- 18. Arcade break reward -- coins for the 30s reflex mini-game
  // MathVille offers midway through a 20-question Focus/PR round. Capped so
  // it can't become a farm: max 10 coins per break, 30 per day.
  const ARCADE_DAILY_CAP = 30;
  async function claimArcadeReward(score) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const want = Math.max(0, Math.min(10, Math.floor(score / 2)));
    const ref = aigDb.ref(`players/${player.id}/arcade/${todayKey()}`);
    const snap = await ref.get();
    const used = snap.exists() ? (snap.val() || 0) : 0;
    const coins = Math.max(0, Math.min(want, ARCADE_DAILY_CAP - used));
    if (coins > 0) { await ref.set(used + coins); await creditWallet({ coins }); }
    return { ok: true, coins, capped: coins < want };
  }

  // =====================================================================
  // PM ROUND 10, BATCH 2 -- Dino Companion, Seasons, Rotating Shop, Egg
  // Gacha, Flash Challenge. Everything lives under players/{id}/... (no new
  // top-level paths, no rules changes). Spending = spendWallet (get-check-
  // set), credits = creditWallet, exactly as the earlier perks.
  // =====================================================================
  function cosmeticPool() {
    const pool = [];
    const add = (type, list, fixedPreview) => list.forEach(x => {
      if (x.cost) pool.push({ type, id: x.id, name: x.name, preview: fixedPreview || x.preview || "🎁", cost: x.cost });
    });
    add("frame", AVATAR_FRAMES, "🖼️");
    add("face", AVATAR_FACES);
    add("sound", SOUND_PACKS, "🎵");
    add("hub-theme", HUB_THEMES);
    Object.entries(GAMEPLAY_FX_CATALOGS).forEach(([t, c]) => add(t, c));
    Object.entries(COSTUME_CATALOGS).forEach(([t, c]) => { if (t !== "dino-skin") add(t, c.filter(x => !x.season)); });
    add("pet-accessory", PET_ACCESSORIES);
    return pool;
  }
  function rarityOf(cost) {
    if (cost.gems) return cost.gems >= 3 ? "legendary" : "epic";
    return (cost.coins || 0) >= 30 ? "rare" : "common";
  }
  async function readOwnedCosmetics(player) {
    const snap = await aigDb.ref(`players/${player.id}/ownedCosmetics`).get();
    return snap.exists() ? snap.val() : {};
  }
  const isOwned = (owned, item) => !!(owned[item.type] && owned[item.type][item.id]);

  // ---- 4. Dino Companion -- hatch it, then evolve it by playing. Each
  // stage needs enough LIFETIME correct answers (so it's earned by
  // learning) plus a coin/gem fee (so it's a sink). Mega Rex also unlocks
  // the Mega Rex chasing-dino skin for free.
  const DINO_STAGES = [
    { emoji: "🥚", name: "Mystery Egg", need: 0, cost: null },
    { emoji: "🦎", name: "Hatchling", need: 20, cost: { coins: 20 } },
    { emoji: "🦕", name: "Longneck", need: 80, cost: { coins: 60 } },
    { emoji: "🦖", name: "Rex", need: 200, cost: { gems: 4 } },
    { emoji: "🐲", name: "Mega Rex", need: 400, cost: { gems: 8 } }
  ];
  async function getDino() {
    const player = perksPlayer();
    if (!player) return null;
    const [d, t] = await Promise.all([aigDb.ref(`players/${player.id}/dino/stage`).get(), aigDb.ref(`players/${player.id}/totalCorrect`).get()]);
    const stage = d.exists() ? Math.max(0, Math.min(DINO_STAGES.length - 1, d.val() | 0)) : 0;
    const total = t.exists() ? (t.val() || 0) : 0;
    return { stage, def: DINO_STAGES[stage], next: DINO_STAGES[stage + 1] || null, total, stages: DINO_STAGES };
  }
  async function evolveDino() {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    const d = await getDino();
    if (!d.next) return { ok: false, reason: "max" };
    if (d.total < d.next.need) return { ok: false, reason: "not-ready", need: d.next.need, total: d.total };
    const paid = await spendWallet(d.next.cost);
    if (!paid.ok) return paid;
    await aigDb.ref(`players/${player.id}/dino/stage`).set(d.stage + 1);
    if (d.stage + 1 === DINO_STAGES.length - 1) await aigDb.ref(`players/${player.id}/ownedCosmetics/dino-skin/mega`).set(true);
    return { ok: true, stage: d.stage + 1, def: DINO_STAGES[d.stage + 1] };
  }

  // ---- 9. Seasons -- date-driven events (Indonesian calendar + the usual).
  // `aig_season_override` in localStorage forces one for testing.
  const SEASONS = [
    { id: "batik", name: "Batik Week", emoji: "👘", from: "09-28", to: "10-04", msg: "Selamat Hari Batik! 👘", orn: ["👘", "🎨", "✨"] },
    { id: "halloween", name: "Spooky Week", emoji: "🎃", from: "10-24", to: "10-31", msg: "Spooky season is here! 🎃", orn: ["🎃", "👻", "🕸️", "🦇"] },
    { id: "teachers", name: "Teachers' Day", emoji: "🍎", from: "11-22", to: "11-28", msg: "Thank your teacher today! 🍎", orn: ["🍎", "📚", "✏️"] },
    { id: "christmas", name: "Winter Holidays", emoji: "🎄", from: "12-18", to: "12-26", msg: "Happy holidays! 🎄", orn: ["🎄", "⛄", "🎁", "❄️"] },
    { id: "newyear", name: "New Year", emoji: "🎆", from: "12-27", to: "01-03", msg: "Happy New Year! 🎆", orn: ["🎆", "🎇", "🥳", "✨"] },
    { id: "ramadan", name: "Ramadan", emoji: "🌙", from: "02-08", to: "03-09", msg: "Ramadan Kareem! 🌙", orn: ["🌙", "⭐", "🕌", "🏮"] },
    { id: "eid", name: "Eid Mubarak", emoji: "🕌", from: "03-10", to: "03-14", msg: "Selamat Idul Fitri! 🕌", orn: ["🕌", "🌙", "🍬", "✨"] },
    { id: "kids", name: "Kids' Day", emoji: "🧒", from: "07-20", to: "07-26", msg: "Happy Hari Anak Nasional! 🧒", orn: ["🧒", "🎈", "🎉"] },
    { id: "independence", name: "Merdeka Week", emoji: "🇮🇩", from: "08-10", to: "08-20", msg: "Dirgahayu Republik Indonesia! 🇮🇩", orn: ["🇮🇩", "🎏", "🏆"] }
  ];
  function getSeason(dateStr) {
    let ov = null;
    try { ov = localStorage.getItem("aig_season_override"); } catch (e) {}
    if (ov) return SEASONS.find(x => x.id === ov) || null;
    const d = dateStr || new Date().toISOString().slice(0, 10);
    const md = d.slice(5);
    return SEASONS.find(x => x.from <= x.to ? (md >= x.from && md <= x.to) : (md >= x.from || md <= x.to)) || null;
  }
  async function getSeasonStatus() {
    const season = getSeason();
    if (!season) return null;
    const player = perksPlayer();
    let claimed = false;
    if (player) claimed = (await aigDb.ref(`players/${player.id}/seasonClaims/${season.id}-${new Date().getUTCFullYear()}`).get()).exists();
    return { season, claimed, reward: { coins: 20, gems: 1 } };
  }
  async function claimSeasonGift() {
    const player = perksPlayer();
    const st = await getSeasonStatus();
    if (!player || !st) return { ok: false };
    if (st.claimed) return { ok: false, reason: "daily-limit" };
    await aigDb.ref(`players/${player.id}/seasonClaims/${st.season.id}-${new Date().getUTCFullYear()}`).set(true);
    await creditWallet(st.reward);
    return { ok: true, reward: st.reward };
  }

  // ---- 11. Rotating Shop -- 4 cosmetics, 35% off, refreshes every 12h
  // (00:00 and 12:00 UTC). Same items for everybody, seeded from the slot.
  function shopSlot() {
    const d = new Date();
    const half = d.getUTCHours() >= 12 ? "b" : "a";
    const end = new Date(d);
    if (half === "a") end.setUTCHours(12, 0, 0, 0); else { end.setUTCDate(d.getUTCDate() + 1); end.setUTCHours(0, 0, 0, 0); }
    return { key: todayKey() + half, endsAt: end.getTime() };
  }
  const discount = cost => {
    const o = {};
    if (cost.coins) o.coins = Math.max(1, Math.round(cost.coins * 0.65));
    if (cost.gems) o.gems = Math.max(1, Math.round(cost.gems * 0.65));
    return o;
  };
  async function getRotatingShop() {
    const player = perksPlayer();
    const pool = cosmeticPool();
    const slot = shopSlot();
    const picks = [], used = new Set();
    for (let n = 0; picks.length < 4 && n < 200; n++) {
      const i = seedFrom(slot.key + "shop" + n) % pool.length;
      if (!used.has(i)) { used.add(i); picks.push(pool[i]); }
    }
    const owned = player ? await readOwnedCosmetics(player) : {};
    return { endsAt: slot.endsAt, items: picks.map(p => ({ ...p, originalCost: p.cost, cost: discount(p.cost), owned: isOwned(owned, p) })) };
  }

  // ---- 12. Mystery Egg gacha -- 30 coins a pull (or 5 for 135). Rarity by
  // price tier; a 10-pull pity guarantees an epic+ if you haven't seen one.
  // Only ever hands out cosmetics you DON'T own yet; if you own everything
  // a pull just refunds 15 coins.
  const GACHA_COST = 30, GACHA_X5_COST = 135, GACHA_PITY_AT = 9;
  async function getGachaStatus() {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/gacha`).get();
    const g = snap.exists() ? snap.val() : {};
    const pool = cosmeticPool();
    const owned = await readOwnedCosmetics(player);
    return { rolls: g.rolls || 0, pity: g.pity || 0, pityAt: GACHA_PITY_AT, left: pool.filter(x => !isOwned(owned, x)).length, total: pool.length };
  }
  async function rollGacha(times) {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    const n = times === 5 ? 5 : 1;
    const paid = await spendWallet({ coins: n === 5 ? GACHA_X5_COST : GACHA_COST });
    if (!paid.ok) return paid;
    try {
      const gRef = aigDb.ref(`players/${player.id}/gacha`);
      const gSnap = await gRef.get();
      const g = gSnap.exists() ? gSnap.val() : {};
      let pity = g.pity || 0, rolls = g.rolls || 0;
      const owned = await readOwnedCosmetics(player);
      const pool = cosmeticPool();
      const results = [];
      let refund = 0;
      for (let i = 0; i < n; i++) {
        const r = Math.random() * 100;
        let tier = pity >= GACHA_PITY_AT ? (r < 75 ? "epic" : "legendary") : (r < 55 ? "common" : r < 85 ? "rare" : r < 96 ? "epic" : "legendary");
        const free = pool.filter(x => !isOwned(owned, x));
        let cand = free.filter(x => rarityOf(x.cost) === tier);
        if (!cand.length) cand = free;
        rolls++;
        if (!cand.length) { refund += 15; results.push({ refund: 15 }); continue; }
        const pick = cand[Math.floor(Math.random() * cand.length)];
        const rar = rarityOf(pick.cost);
        (owned[pick.type] = owned[pick.type] || {})[pick.id] = true;
        await aigDb.ref(`players/${player.id}/ownedCosmetics/${pick.type}/${pick.id}`).set(true);
        pity = (rar === "epic" || rar === "legendary") ? 0 : pity + 1;
        results.push({ type: pick.type, id: pick.id, name: pick.name, preview: pick.preview, rarity: rar });
      }
      await gRef.set({ rolls, pity });
      if (refund) await creditWallet({ coins: refund });
      return { ok: true, results, pity };
    } catch (e) {
      await creditWallet({ coins: n === 5 ? GACHA_X5_COST : GACHA_COST }); // never eat coins on an error
      return { ok: false, reason: "error" };
    }
  }

  // ---- 13. Flash Challenge -- 60s of mixed questions, up to 3 tries a day,
  // best score goes on the class board. Coins only for the first 2 tries.
  const FLASH_MAX_PLAYS = 3, FLASH_REWARD_PLAYS = 2;
  function flashMultiplier() { return [1, 1.5, 1, 2, 1, 1.5, 2][new Date().getUTCDay()]; }
  async function getFlashStatus() {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/flash/${todayKey()}`).get();
    const f = snap.exists() ? snap.val() : {};
    return { best: f.best || 0, plays: f.plays || 0, left: Math.max(0, FLASH_MAX_PLAYS - (f.plays || 0)), mult: flashMultiplier() };
  }
  async function submitFlash(score) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/flash/${todayKey()}`);
    const snap = await ref.get();
    const f = snap.exists() ? snap.val() : {};
    const plays = f.plays || 0;
    if (plays >= FLASH_MAX_PLAYS) return { ok: false, reason: "daily-limit" };
    const coins = plays < FLASH_REWARD_PLAYS ? Math.min(20, Math.round(Math.max(0, score) * flashMultiplier())) : 0;
    const best = Math.max(f.best || 0, score);
    await ref.set({ best, plays: plays + 1 });
    if (coins) await creditWallet({ coins });
    return { ok: true, coins, best, newBest: score > (f.best || 0), plays: plays + 1, left: FLASH_MAX_PLAYS - plays - 1 };
  }
  async function getFlashBoard() {
    const players = await readAllPlayers();
    const day = todayKey();
    return Object.entries(players)
      .map(([id, d]) => ({ id, name: nameOf(id, d), best: d && d.flash && d.flash[day] ? (d.flash[day].best || 0) : 0 }))
      .filter(x => x.best > 0).sort((a, b) => b.best - a.best).slice(0, 10);
  }

  // =====================================================================
  // PM ROUND 10, BATCH 3 -- Clubs, Weekend Tournament, Card Battle rewards,
  // Idle Garden, Parent Missions, Certificates, Bo's Adventure (season 2).
  // Shared data (clubs, tournament entrants) lives under leaderboard/...
  // (already writable, same as classfund); everything personal is under
  // players/{id}/...
  // =====================================================================
  function weekDates(mondayKey) { return weekDatesFor(mondayKey); }
  const cleanText = (t, n) => String(t || "").replace(/[<>&"]/g, "").trim().slice(0, n);

  // ---- 15. Clubs -- small teams (max 5) that add up their weekly correct
  // answers. Hitting the weekly goal lets every member claim a reward.
  const CLUB_MAX = 5, CLUB_GOAL_PER_MEMBER = 60, CLUB_GOAL_REWARD = 25;
  async function memberWeeklyScore(id, players, wk) {
    const d = players[id];
    return (d && d.weekly && d.weekly[wk] && d.weekly[wk].correct) || 0;
  }
  async function getMyClub() {
    const player = perksPlayer();
    if (!player) return null;
    const idSnap = await aigDb.ref(`players/${player.id}/club`).get();
    if (!idSnap.exists()) return null;
    const cid = idSnap.val();
    const snap = await aigDb.ref(`leaderboard/clubs/${cid}`).get();
    if (!snap.exists() || !(snap.val().members || {})[player.id]) { await aigDb.ref(`players/${player.id}/club`).remove(); return null; }
    const club = snap.val();
    const players = await readAllPlayers();
    const wk = weekKey();
    const members = await Promise.all(Object.entries(club.members).map(async ([id, m]) => ({ id, name: m.name, score: await memberWeeklyScore(id, players, wk) })));
    const score = members.reduce((a, m) => a + m.score, 0);
    const goal = CLUB_GOAL_PER_MEMBER * members.length;
    const claimed = (await aigDb.ref(`players/${player.id}/clubClaims/${wk}`).get()).exists();
    return { id: cid, name: club.name, emoji: club.emoji, owner: club.owner, members: members.sort((a, b) => b.score - a.score), score, goal, claimed, reward: CLUB_GOAL_REWARD };
  }
  async function listClubs() {
    const [snap, players] = await Promise.all([aigDb.ref("leaderboard/clubs").get(), readAllPlayers()]);
    const wk = weekKey();
    const clubs = snap.exists() ? snap.val() : {};
    return Object.entries(clubs).map(([id, c]) => {
      const ids = Object.keys(c.members || {});
      const score = ids.reduce((a, m) => a + ((players[m] && players[m].weekly && players[m].weekly[wk] && players[m].weekly[wk].correct) || 0), 0);
      return { id, name: c.name, emoji: c.emoji, size: ids.length, full: ids.length >= CLUB_MAX, score };
    }).sort((a, b) => b.score - a.score);
  }
  async function createClub(name, emoji) {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    const nm = cleanText(name, 20);
    if (nm.length < 3) return { ok: false, reason: "bad-name" };
    if (await getMyClub()) return { ok: false, reason: "in-club" };
    const cid = sanitizeNameKeyForLookup(nm).slice(0, 24);
    if (!cid) return { ok: false, reason: "bad-name" };
    const ref = aigDb.ref(`leaderboard/clubs/${cid}`);
    if ((await ref.get()).exists()) return { ok: false, reason: "taken" };
    await ref.set({ name: nm, emoji: cleanText(emoji, 4) || "🏰", owner: player.id, createdAt: Date.now(), members: { [player.id]: { name: player.name } } });
    await aigDb.ref(`players/${player.id}/club`).set(cid);
    return { ok: true, id: cid };
  }
  async function joinClub(cid) {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    if (await getMyClub()) return { ok: false, reason: "in-club" };
    const ref = aigDb.ref(`leaderboard/clubs/${cid}`);
    const snap = await ref.get();
    if (!snap.exists()) return { ok: false, reason: "gone" };
    if (Object.keys(snap.val().members || {}).length >= CLUB_MAX) return { ok: false, reason: "full" };
    await ref.child(`members/${player.id}`).set({ name: player.name });
    await aigDb.ref(`players/${player.id}/club`).set(cid);
    return { ok: true };
  }
  async function leaveClub() {
    const player = perksPlayer();
    const mine = player && await getMyClub();
    if (!mine) return { ok: false };
    const ref = aigDb.ref(`leaderboard/clubs/${mine.id}`);
    await ref.child(`members/${player.id}`).remove();
    const left = mine.members.filter(m => m.id !== player.id);
    if (!left.length) await ref.remove();
    else if (mine.owner === player.id) await ref.child("owner").set(left[0].id);
    await aigDb.ref(`players/${player.id}/club`).remove();
    return { ok: true };
  }
  async function claimClubGoal() {
    const player = perksPlayer();
    const mine = player && await getMyClub();
    if (!mine) return { ok: false, reason: "no-club" };
    if (mine.claimed) return { ok: false, reason: "daily-limit" };
    if (mine.score < mine.goal) return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${player.id}/clubClaims/${weekKey()}`).set(true);
    await creditWallet({ coins: CLUB_GOAL_REWARD });
    return { ok: true, coins: CLUB_GOAL_REWARD };
  }

  // ---- 16. Weekend Tournament -- enter Mon-Fri (first 8 in), bracket of
  // 8 is played on Flash Challenge scores: quarter-finals = Saturday's
  // best, semi-finals = Sunday's best, final = Sat+Sun. Fully computed
  // from stored entrants + flash scores, so no server logic. Winner
  // claims a title + reward (this week if it's done, or last week's).
  const TOURNEY_SIZE = 8, TOURNEY_REWARD = { coins: 100, gems: 3 };
  async function tourneyBuild(wk, players) {
    const snap = await aigDb.ref(`leaderboard/tournament/${wk}/entrants`).get();
    const raw = snap.exists() ? snap.val() : {};
    const entrants = Object.entries(raw).sort((a, b) => (a[1].at || 0) - (b[1].at || 0)).slice(0, TOURNEY_SIZE)
      .map(([id, v]) => ({ id, name: v.name || id }));
    const dates = weekDates(wk);
    const sat = dates[5], sun = dates[6];
    const flash = id => { const f = (players[id] && players[id].flash) || {}; return { sat: (f[sat] && f[sat].best) || 0, sun: (f[sun] && f[sun].best) || 0 }; };
    // Seed order: 1v8, 4v5, 2v7, 3v6 -> classic bracket (entrants already sorted by entry time).
    const seeded = entrants.slice();
    const order = [0, 7, 3, 4, 1, 6, 2, 5].filter(i => i < seeded.length);
    const pairs = [];
    for (let i = 0; i < order.length; i += 2) pairs.push([seeded[order[i]], seeded[order[i + 1]] || null]);
    const decide = (a, b, key) => {
      if (!a) return b; if (!b) return a;
      const sa = key(a.id), sb = key(b.id);
      return sa > sb ? a : sb > sa ? b : a; // tie -> earlier entrant
    };
    const rounds = [];
    const qf = pairs.map(([a, b]) => ({ a, b, win: decide(a, b, id => flash(id).sat), sa: a ? flash(a.id).sat : 0, sb: b ? flash(b.id).sat : 0 }));
    rounds.push(qf);
    const semiPairs = [];
    for (let i = 0; i < qf.length; i += 2) semiPairs.push([qf[i].win, qf[i + 1] ? qf[i + 1].win : null]);
    const sf = semiPairs.map(([a, b]) => ({ a, b, win: decide(a, b, id => flash(id).sun), sa: a ? flash(a.id).sun : 0, sb: b ? flash(b.id).sun : 0 }));
    rounds.push(sf);
    let final = null;
    if (sf.length >= 2) { const a = sf[0].win, b = sf[1].win; final = { a, b, win: decide(a, b, id => flash(id).sat + flash(id).sun), sa: a ? flash(a.id).sat + flash(a.id).sun : 0, sb: b ? flash(b.id).sat + flash(b.id).sun : 0 }; rounds.push([final]); }
    else if (sf.length === 1) final = sf[0];
    return { wk, entrants, rounds, champion: final && final.win ? final.win : null };
  }
  async function getTournament() {
    const player = perksPlayer();
    if (!player) return null;
    const now = new Date();
    const dow = now.getUTCDay(); // 0 Sun .. 6 Sat
    const phase = (dow >= 1 && dow <= 5) ? "entry" : "live";
    const wk = weekKey();
    const players = await readAllPlayers();
    const cur = await tourneyBuild(wk, players);
    const last = await tourneyBuild(prevWeekKey(), players);
    const claimedSnap = await aigDb.ref(`players/${player.id}/tournamentTitles`).get();
    const titles = claimedSnap.exists() ? claimedSnap.val() : {};
    const lastDone = last.entrants.length >= 2 && last.champion && last.champion.id === player.id && !titles[last.wk];
    return { phase, current: cur, last, mine: cur.entrants.some(e => e.id === player.id), size: TOURNEY_SIZE, titles: Object.keys(titles).length, canClaim: lastDone ? last.wk : null, reward: TOURNEY_REWARD };
  }
  async function enterTournament() {
    const player = perksPlayer();
    if (!player) return { ok: false, reason: "no-player" };
    const dow = new Date().getUTCDay();
    if (dow === 0 || dow === 6) return { ok: false, reason: "closed" };
    const ref = aigDb.ref(`leaderboard/tournament/${weekKey()}/entrants`);
    const snap = await ref.get();
    const cur = snap.exists() ? snap.val() : {};
    if (cur[player.id]) return { ok: false, reason: "joined" };
    if (Object.keys(cur).length >= TOURNEY_SIZE) return { ok: false, reason: "full" };
    await ref.child(player.id).set({ name: player.name, at: Date.now() });
    return { ok: true };
  }
  async function claimTournamentTitle() {
    const player = perksPlayer();
    const t = player && await getTournament();
    if (!t || !t.canClaim) return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${player.id}/tournamentTitles/${t.canClaim}`).set(true);
    await creditWallet(TOURNEY_REWARD);
    return { ok: true, reward: TOURNEY_REWARD };
  }

  // ---- 17. Card Battle -- fought in the extras page; this is just the
  // daily reward cap so it can't be farmed (12 coins a win, 3 wins a day).
  const BATTLE_WIN_COINS = 12, BATTLE_DAILY_WINS = 3;
  async function getBattleStatus() {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/battle/${todayKey()}`).get();
    const wins = snap.exists() ? (snap.val() || 0) : 0;
    return { wins, left: Math.max(0, BATTLE_DAILY_WINS - wins), reward: BATTLE_WIN_COINS };
  }
  async function claimBattleWin() {
    const player = perksPlayer();
    const st = await getBattleStatus();
    if (!player || !st) return { ok: false };
    if (!st.left) return { ok: true, coins: 0, capped: true };
    await aigDb.ref(`players/${player.id}/battle/${todayKey()}`).set(st.wins + 1);
    await creditWallet({ coins: BATTLE_WIN_COINS });
    return { ok: true, coins: BATTLE_WIN_COINS };
  }

  // ---- 18. Idle Garden -- plant, wait, harvest coins. Every correct answer
  // you give while a plant grows shaves a minute off its timer.
  const GARDEN_PLANTS = [
    { id: "carrot", emoji: "🥕", name: "Carrot", seed: 5, growMin: 30, yield: 9 },
    { id: "sunflower", emoji: "🌻", name: "Sunflower", seed: 15, growMin: 120, yield: 30 },
    { id: "pumpkin", emoji: "🎃", name: "Pumpkin", seed: 30, growMin: 300, yield: 70 },
    { id: "dragonfruit", emoji: "🐉", name: "Dragonfruit", seed: 60, growMin: 720, yield: 150 }
  ];
  const GARDEN_MAX_PLOTS = 6, GARDEN_PLOT_COST = [0, 0, 0, { gems: 2 }, { gems: 3 }, { gems: 4 }];
  async function readGarden(player) {
    const [g, t] = await Promise.all([aigDb.ref(`players/${player.id}/garden`).get(), aigDb.ref(`players/${player.id}/totalCorrect`).get()]);
    const d = g.exists() ? g.val() : {};
    return { plots: d.plots || 3, slots: d.slots || {}, total: t.exists() ? (t.val() || 0) : 0 };
  }
  async function getGarden() {
    const player = perksPlayer();
    if (!player) return null;
    const g = await readGarden(player);
    const now = Date.now();
    const slots = [];
    for (let i = 0; i < g.plots; i++) {
      const s = g.slots[i];
      if (!s) { slots.push({ i, empty: true }); continue; }
      const def = GARDEN_PLANTS.find(p => p.id === s.plant);
      const boost = Math.max(0, g.total - (s.totalAt || 0)) * 60000;
      const readyAt = (s.at || 0) + def.growMin * 60000 - boost;
      slots.push({ i, plant: def, readyAt, ready: now >= readyAt, msLeft: Math.max(0, readyAt - now) });
    }
    return { slots, plots: g.plots, maxPlots: GARDEN_MAX_PLOTS, nextPlotCost: g.plots < GARDEN_MAX_PLOTS ? GARDEN_PLOT_COST[g.plots] : null, plants: GARDEN_PLANTS };
  }
  async function plantSeed(i, plantId) {
    const player = perksPlayer();
    const def = GARDEN_PLANTS.find(p => p.id === plantId);
    if (!player || !def) return { ok: false };
    const g = await readGarden(player);
    if (i < 0 || i >= g.plots) return { ok: false, reason: "bad-amount" };
    if (g.slots[i]) return { ok: false, reason: "busy" };
    const paid = await spendWallet({ coins: def.seed });
    if (!paid.ok) return paid;
    await aigDb.ref(`players/${player.id}/garden/slots/${i}`).set({ plant: plantId, at: Date.now(), totalAt: g.total });
    if (!(await aigDb.ref(`players/${player.id}/garden/plots`).get()).exists()) await aigDb.ref(`players/${player.id}/garden/plots`).set(3);
    return { ok: true };
  }
  async function harvestPlot(i) {
    const player = perksPlayer();
    const garden = player && await getGarden();
    const slot = garden && garden.slots[i];
    if (!slot || slot.empty) return { ok: false, reason: "empty" };
    if (!slot.ready) return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${player.id}/garden/slots/${i}`).remove(); // clear FIRST so a double-tap can't pay twice
    await creditWallet({ coins: slot.plant.yield });
    return { ok: true, coins: slot.plant.yield, plant: slot.plant };
  }
  async function buyGardenPlot() {
    const player = perksPlayer();
    const garden = player && await getGarden();
    if (!garden || garden.nextPlotCost === null) return { ok: false, reason: "max" };
    const paid = await spendWallet(garden.nextPlotCost);
    if (!paid.ok) return paid;
    await aigDb.ref(`players/${player.id}/garden/plots`).set(garden.plots + 1);
    return { ok: true };
  }

  // ---- 19. Parent Missions -- a parent writes a real-world mission in the
  // Parent Portal (players/{child}/parentMissions/{id}); the child marks it
  // done; the parent approves; an optional coin bonus pays out once.
  async function getMissions() {
    const player = perksPlayer();
    if (!player) return [];
    const snap = await aigDb.ref(`players/${player.id}/parentMissions`).get();
    return Object.entries(snap.exists() ? snap.val() : {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  async function completeMission(id) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/parentMissions/${id}`);
    const snap = await ref.get();
    if (!snap.exists() || snap.val().status !== "open") return { ok: false, reason: "busy" };
    await ref.child("status").set("done");
    await ref.child("doneAt").set(Date.now());
    return { ok: true };
  }
  async function claimMissionBonus(id) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/parentMissions/${id}`);
    const snap = await ref.get();
    const m = snap.exists() ? snap.val() : null;
    if (!m || m.status !== "approved" || m.credited) return { ok: false, reason: "not-ready" };
    await ref.child("credited").set(true); // marker BEFORE paying
    const coins = Math.max(0, Math.min(100, m.bonus | 0));
    if (coins) await creditWallet({ coins });
    return { ok: true, coins };
  }

  // ---- 20. Certificates & Memory Book -- milestones computed from data
  // that already exists; the first date each one is seen is stored so the
  // book shows WHEN it happened.
  const CERT_DEFS = [
    { id: "correct-100", emoji: "🌱", title: "100 Right Answers", desc: "answered 100 questions correctly", test: c => c.total >= 100 },
    { id: "correct-500", emoji: "🌿", title: "500 Right Answers", desc: "answered 500 questions correctly", test: c => c.total >= 500 },
    { id: "correct-1000", emoji: "🌳", title: "1,000 Right Answers", desc: "answered 1,000 questions correctly", test: c => c.total >= 1000 },
    { id: "correct-2500", emoji: "🏔️", title: "2,500 Right Answers", desc: "answered 2,500 questions correctly", test: c => c.total >= 2500 },
    { id: "streak-7", emoji: "🔥", title: "7-Day Streak", desc: "played 7 days in a row", test: c => c.best >= 7 },
    { id: "streak-30", emoji: "☄️", title: "30-Day Streak", desc: "played 30 days in a row", test: c => c.best >= 30 },
    { id: "level-10", emoji: "⭐", title: "Level 10", desc: "reached Level 10", test: c => c.level >= 10 },
    { id: "cards-12", emoji: "🃏", title: "Card Collector", desc: "collected 12 cards", test: c => c.cards >= 12 },
    { id: "dino-mega", emoji: "🐲", title: "Dino Master", desc: "evolved a Dino Companion into Mega Rex", test: c => c.dino >= 4 },
    { id: "champion", emoji: "🏆", title: "Tournament Champion", desc: "won the Weekend Tournament", test: c => c.titles >= 1 }
  ];
  async function getCertificates() {
    const player = perksPlayer();
    if (!player) return null;
    const [t, st, lv, col, dn, ti, saved] = await Promise.all([
      aigDb.ref(`players/${player.id}/totalCorrect`).get(), getStreak(), getPlayerLevel(), getCollection(),
      aigDb.ref(`players/${player.id}/dino/stage`).get(), aigDb.ref(`players/${player.id}/tournamentTitles`).get(),
      aigDb.ref(`players/${player.id}/certs`).get()
    ]);
    const ctx = { total: t.exists() ? (t.val() || 0) : 0, best: Math.max(st.bestStreak || 0, st.count || 0), level: lv ? lv.level : 1,
      cards: Object.values(col.owned || {}).filter(Boolean).length, dino: dn.exists() ? dn.val() : 0, titles: ti.exists() ? Object.keys(ti.val()).length : 0 };
    const dates = saved.exists() ? saved.val() : {};
    const today = todayKey();
    const out = [];
    for (const d of CERT_DEFS) {
      const earned = !!d.test(ctx);
      if (earned && !dates[d.id]) { dates[d.id] = today; aigDb.ref(`players/${player.id}/certs/${d.id}`).set(today).catch(() => {}); }
      out.push({ id: d.id, emoji: d.emoji, title: d.title, desc: d.desc, earned, date: earned ? dates[d.id] : null });
    }
    return { certs: out, name: player.name, ctx };
  }

  // ---- 14. Bo's Adventure (season 2) -- the story graph lives in
  // extras/script.js; this stores the current node + which endings you've
  // seen, and pays a one-time reward per ending.
  const ADVENTURE_ENDING_COINS = 30;
  async function getAdventure() {
    const player = perksPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/adventure`).get();
    const a = snap.exists() ? snap.val() : {};
    return { node: a.node || "start", endings: a.endings || {} };
  }
  async function saveAdventureNode(node) {
    const player = perksPlayer();
    if (!player) return;
    await aigDb.ref(`players/${player.id}/adventure/node`).set(node);
  }
  async function claimAdventureEnding(endingId) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/adventure/endings/${endingId}`);
    if ((await ref.get()).exists()) return { ok: true, first: false };
    await ref.set(true); // marker BEFORE paying
    await creditWallet({ coins: ADVENTURE_ENDING_COINS });
    return { ok: true, first: true, coins: ADVENTURE_ENDING_COINS };
  }

  // =====================================================================
  // PM ROUND 11 -- Game Room bonus. Each Game Room mini-game pays a small
  // completion bonus at most twice a day per game (plus a 60-coin daily
  // ceiling across all of them), on top of the usual +1 coin per right
  // answer from recordTopicAttempt.
  // =====================================================================
  const MINIGAME_PAYOUTS_PER_DAY = 2, MINIGAME_DAILY_CEILING = 60;
  async function awardMiniGame(gameId, coins) {
    const player = perksPlayer();
    if (!player) return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/miniPaid/${todayKey()}`);
    const snap = await ref.get();
    const d = snap.exists() ? snap.val() : {};
    const gameCount = d[gameId] || 0;
    const total = d._total || 0;
    const want = Math.max(0, Math.min(25, Math.floor(coins)));
    const paid = Math.min(want, MINIGAME_DAILY_CEILING - total);
    if (gameCount >= MINIGAME_PAYOUTS_PER_DAY || paid <= 0) return { ok: true, paid: 0, capped: true };
    await ref.set({ ...d, [gameId]: gameCount + 1, _total: total + paid }); // marker BEFORE paying
    await creditWallet({ coins: paid });
    return { ok: true, paid };
  }

  // ---- My Town (PM round 11, item 6) -- a 5x5 grid of tiles, each holding
  // one bought building. Stored under players/{id}/town/tiles/{0..24}.
  // Anyone can visit and leave one 💖 per town per day; the OWNER collects
  // 2 coins per like (once, capped at 10 a day). Beauty = sum of building points.
  const TOWN_SIZE = 25;
  const TOWN_BUILDINGS = [
    { id: "road", emoji: "🛣️", name: "Road", cost: { coins: 2 }, pts: 0 },
    { id: "flower", emoji: "🌷", name: "Flowers", cost: { coins: 3 }, pts: 1 },
    { id: "tree", emoji: "🌳", name: "Tree", cost: { coins: 5 }, pts: 1 },
    { id: "house", emoji: "🏠", name: "House", cost: { coins: 10 }, pts: 2 },
    { id: "playground", emoji: "🛝", name: "Playground", cost: { coins: 25 }, pts: 5 },
    { id: "fountain", emoji: "⛲", name: "Fountain", cost: { coins: 30 }, pts: 6 },
    { id: "school", emoji: "🏫", name: "School", cost: { coins: 40 }, pts: 8 },
    { id: "hospital", emoji: "🏥", name: "Hospital", cost: { coins: 50 }, pts: 9 },
    { id: "ferris", emoji: "🎡", name: "Ferris Wheel", cost: { coins: 80 }, pts: 15 },
    { id: "castle", emoji: "🏰", name: "Castle", cost: { gems: 2 }, pts: 25 }
  ];
  const beautyOf = tiles => Object.values(tiles || {}).reduce((a, id) => a + ((TOWN_BUILDINGS.find(b => b.id === id) || {}).pts || 0), 0);
  async function getTown(ownerId) {
    const me = perksPlayer();
    const id = ownerId || (me && me.id);
    if (!id) return null;
    const [t, l] = await Promise.all([aigDb.ref(`players/${id}/town/tiles`).get(), aigDb.ref(`players/${id}/townLikes/${todayKey()}`).get()]);
    const tiles = t.exists() ? t.val() : {};
    const likes = l.exists() ? Object.keys(l.val()).length : 0;
    let claimed = 0;
    if (me && me.id === id) { const c = await aigDb.ref(`players/${id}/townClaim/${todayKey()}`).get(); claimed = c.exists() ? (c.val() || 0) : 0; }
    return { id, tiles, beauty: beautyOf(tiles), likes, claimed, size: TOWN_SIZE, buildings: TOWN_BUILDINGS };
  }
  async function placeBuilding(idx, type) {
    const me = perksPlayer();
    const def = TOWN_BUILDINGS.find(b => b.id === type);
    if (!me || !def || !(idx >= 0 && idx < TOWN_SIZE)) return { ok: false };
    const ref = aigDb.ref(`players/${me.id}/town/tiles/${idx}`);
    if ((await ref.get()).exists()) return { ok: false, reason: "busy" };
    const paid = await spendWallet(def.cost);
    if (!paid.ok) return paid;
    await ref.set(type);
    return { ok: true };
  }
  async function removeBuilding(idx) {
    const me = perksPlayer();
    if (!me) return { ok: false };
    const ref = aigDb.ref(`players/${me.id}/town/tiles/${idx}`);
    const snap = await ref.get();
    const def = snap.exists() && TOWN_BUILDINGS.find(b => b.id === snap.val());
    if (!def) return { ok: false };
    await ref.remove(); // clear FIRST so a double-tap can't refund twice
    const back = {};
    if (def.cost.coins) back.coins = Math.floor(def.cost.coins / 2);
    if (back.coins) await creditWallet(back);
    return { ok: true, back };
  }
  async function listTowns() {
    const players = await readAllPlayers();
    return Object.entries(players).filter(([, d]) => d && d.town && d.town.tiles).map(([id, d]) => ({ id, name: nameOf(id, d), beauty: beautyOf(d.town.tiles) }))
      .filter(t => t.beauty > 0).sort((a, b) => b.beauty - a.beauty).slice(0, 30);
  }
  async function likeTown(ownerId) {
    const me = perksPlayer();
    if (!me || !ownerId || ownerId === me.id) return { ok: false };
    const ref = aigDb.ref(`players/${ownerId}/townLikes/${todayKey()}/${me.id}`);
    if ((await ref.get()).exists()) return { ok: false, reason: "daily-limit" };
    await ref.set(true);
    return { ok: true };
  }
  async function claimTownLikes() {
    const me = perksPlayer();
    const t = me && await getTown();
    if (!t) return { ok: false };
    const owed = Math.min(5, t.likes) - t.claimed; // 5 likes = 10 coins a day
    if (owed <= 0) return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${me.id}/townClaim/${todayKey()}`).set(t.claimed + owed);
    await creditWallet({ coins: owed * 2 });
    return { ok: true, coins: owed * 2 };
  }

  // ---- Geo Flight stamps + Dungeon gear (PM round 11) -- tiny persisted
  // sets under players/{id}/geoStamps and players/{id}/dungeon.
  async function getGeoStamps() {
    const me = perksPlayer();
    if (!me) return {};
    const s = await aigDb.ref(`players/${me.id}/geoStamps`).get();
    return s.exists() ? s.val() : {};
  }
  async function addGeoStamp(code) {
    const me = perksPlayer();
    if (!me) return { ok: false };
    const ref = aigDb.ref(`players/${me.id}/geoStamps/${code}`);
    if ((await ref.get()).exists()) return { ok: true, first: false };
    await ref.set(true);
    return { ok: true, first: true };
  }
  async function getDungeon() {
    const me = perksPlayer();
    if (!me) return { gear: {}, best: 0 };
    const s = await aigDb.ref(`players/${me.id}/dungeon`).get();
    const d = s.exists() ? s.val() : {};
    return { gear: d.gear || {}, best: d.best || 0 };
  }
  async function saveDungeon(gearId, floor) {
    const me = perksPlayer();
    if (!me) return;
    const cur = await getDungeon();
    const ref = aigDb.ref(`players/${me.id}/dungeon`);
    if (gearId) await ref.child(`gear/${gearId}`).set(true);
    if (floor > cur.best) await ref.child("best").set(floor);
  }

  // =====================================================================
  // PM ROUND 11, BATCH 3 -- weekly report, Bo tutor, mega quests, advent
  // calendar, parent focus, class teams, friend list.
  // =====================================================================
  async function listPlayerNames() {
    const me = perksPlayer();
    const players = await readAllPlayers();
    return Object.entries(players).filter(([id, d]) => (!me || id !== me.id) && d && (d.weekly || d.wallet || d.topicStats))
      .map(([id, d]) => ({ id, name: nameOf(id, d) })).sort((a, b) => a.name.localeCompare(b.name));
  }
  async function readTopicStats(player) {
    const s = await aigDb.ref(`players/${player.id}/topicStats`).get();
    return s.exists() ? s.val() : {};
  }
  const GAME_LABEL = { mathville: "MathVille", "language-arts": "Language & Arts", solarquest: "SolarQuest", mathrace: "Math Race" };
  const prettyTopic = t => String(t).replace(/^times-(\d+)$/, "Multiply by $1").replace(/^divby-(\d+)$/, "Divide by $1").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  // ---- 11. Weekly report -- everything computed from data that already exists.
  async function getWeeklyReport() {
    const me = perksPlayer();
    if (!me) return null;
    const wk = weekKey(), pk = prevWeekKey();
    const [w, ts, st] = await Promise.all([aigDb.ref(`players/${me.id}/weekly`).get(), readTopicStats(me), getStreak()]);
    const weekly = w.exists() ? w.val() : {};
    const cur = (weekly[wk] && weekly[wk].correct) || 0, prev = (weekly[pk] && weekly[pk].correct) || 0;
    const rows = [];
    Object.entries(ts).forEach(([game, topics]) => Object.entries(topics || {}).forEach(([topic, v]) => {
      const c = (v && v.correct) || 0, x = (v && v.wrong) || 0, n = c + x;
      if (n >= 5 && !["drive-mode", "plane-mode", "ninja-runner", "speed-round", "focus-round", "azka-pr", "weekly-boss-rush", "perk-test"].includes(topic)) rows.push({ game, topic, acc: c / n, n });
    }));
    rows.sort((a, b) => b.acc - a.acc);
    return { cur, prev, change: prev ? Math.round((cur - prev) / prev * 100) : null, best: rows[0] || null, weak: rows.length > 1 ? rows[rows.length - 1] : null,
      streak: st.count || 0, goal: Math.max(20, Math.ceil(Math.max(cur, prev) * 1.1)), gameLabel: g => GAME_LABEL[g] || g, pretty: prettyTopic };
  }

  // ---- 12. Bo tutor -- weakest topics (>= 3 attempts, lowest accuracy first).
  async function getWeakTopics(limit) {
    const me = perksPlayer();
    if (!me) return [];
    const ts = await readTopicStats(me);
    const rows = [];
    Object.entries(ts).forEach(([game, topics]) => Object.entries(topics || {}).forEach(([topic, v]) => {
      const c = (v && v.correct) || 0, x = (v && v.wrong) || 0, n = c + x;
      if (n >= 3 && x > 0 && !["drive-mode", "plane-mode", "ninja-runner", "speed-round", "focus-round", "azka-pr", "weekly-boss-rush", "perk-test"].includes(topic)) rows.push({ game, topic, acc: c / n, n });
    }));
    return rows.sort((a, b) => a.acc - b.acc).slice(0, limit || 3);
  }
  async function getTutorMastered() {
    const me = perksPlayer();
    if (!me) return {};
    const s = await aigDb.ref(`players/${me.id}/tutorMastered`).get();
    return s.exists() ? s.val() : {};
  }
  async function markTutorMastered(topic) {
    const me = perksPlayer();
    if (!me) return;
    await aigDb.ref(`players/${me.id}/tutorMastered/${String(topic).replace(/[.#$/\[\]]/g, "-")}`).set(todayKey());
  }

  // ---- 15. Mega quests -- 4-week goals measured against a stored baseline.
  const MEGA_QUESTS = [
    { id: "mult", emoji: "✖️", name: "Multiplication Master", desc: "Answer 120 multiplication questions correctly", target: 120, measure: ts => ((ts.mathville || {}).multiplication || {}).correct || 0 },
    { id: "words", emoji: "📖", name: "Word Wizard", desc: "Get 150 Language & Arts answers right", target: 150, measure: ts => Object.values(ts["language-arts"] || {}).reduce((a, v) => a + ((v && v.correct) || 0), 0) },
    { id: "space", emoji: "🪐", name: "Space Explorer", desc: "Get 150 SolarQuest answers right", target: 150, measure: ts => Object.values(ts.solarquest || {}).reduce((a, v) => a + ((v && v.correct) || 0), 0) },
    { id: "town", emoji: "🏙️", name: "All-Rounder", desc: "Get 300 answers right in ANY game", target: 300, measure: (ts, total) => total }
  ];
  const MEGA_DAYS = 28;
  async function getMegaQuest() {
    const me = perksPlayer();
    if (!me) return null;
    const [q, ts, tc] = await Promise.all([aigDb.ref(`players/${me.id}/megaQuest`).get(), readTopicStats(me), aigDb.ref(`players/${me.id}/totalCorrect`).get()]);
    const total = tc.exists() ? (tc.val() || 0) : 0;
    const cur = q.exists() ? q.val() : null;
    if (!cur) return { active: null, quests: MEGA_QUESTS.map(({ measure, ...r }) => r) };
    const def = MEGA_QUESTS.find(x => x.id === cur.id);
    const progress = Math.max(0, def.measure(ts, total) - (cur.base || 0));
    const daysLeft = Math.max(0, Math.ceil((cur.startedAt + MEGA_DAYS * 86400000 - Date.now()) / 86400000));
    return { active: { id: cur.id, emoji: def.emoji, name: def.name, desc: def.desc, target: def.target, progress: Math.min(def.target, progress), daysLeft, expired: daysLeft <= 0 && progress < def.target,
      claims: cur.claims || {} }, quests: MEGA_QUESTS.map(({ measure, ...r }) => r) };
  }
  async function startMegaQuest(id) {
    const me = perksPlayer();
    const def = MEGA_QUESTS.find(x => x.id === id);
    if (!me || !def) return { ok: false };
    const [ts, tc] = await Promise.all([readTopicStats(me), aigDb.ref(`players/${me.id}/totalCorrect`).get()]);
    await aigDb.ref(`players/${me.id}/megaQuest`).set({ id, startedAt: Date.now(), base: def.measure(ts, tc.exists() ? (tc.val() || 0) : 0) });
    return { ok: true };
  }
  async function claimMegaQuest(stage) {
    const me = perksPlayer();
    const st = me && await getMegaQuest();
    if (!st || !st.active) return { ok: false };
    const a = st.active;
    const need = stage === "half" ? a.target / 2 : a.target;
    if (a.progress < need) return { ok: false, reason: "not-ready" };
    if (a.claims[stage]) return { ok: false, reason: "daily-limit" };
    await aigDb.ref(`players/${me.id}/megaQuest/claims/${stage}`).set(true); // marker BEFORE paying
    const reward = stage === "half" ? { coins: 30 } : { coins: 150, gems: 5 };
    await creditWallet(reward);
    return { ok: true, reward };
  }
  async function endMegaQuest() {
    const me = perksPlayer();
    if (me) await aigDb.ref(`players/${me.id}/megaQuest`).remove();
  }

  // ---- 18. Advent calendar -- 30 gift days from your first visit.
  const ADVENT_DAYS = 30;
  const adventReward = d => d === 30 ? { coins: 100, gems: 5 } : d % 5 === 0 ? { coins: 10, gems: 1 } : { coins: 5 + (d % 7) * 2 };
  const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
  async function getAdvent() {
    const me = perksPlayer();
    if (!me) return null;
    const ref = aigDb.ref(`players/${me.id}/advent`);
    const snap = await ref.get();
    let a = snap.exists() ? snap.val() : null;
    if (!a) { a = { start: todayKey(), opened: {} }; await ref.set(a); }
    const opened = a.opened || {};
    const today = Math.min(ADVENT_DAYS, daysBetween(a.start, todayKey()) + 1); // 1-based day due today
    let ontime = 0;
    for (let d = Math.min(today, ADVENT_DAYS); d >= 1; d--) {
      const due = new Date(a.start + "T00:00:00Z"); due.setUTCDate(due.getUTCDate() + d - 1);
      if (opened[d] === due.toISOString().slice(0, 10)) ontime++; else if (d !== today) break;
    }
    return { start: a.start, today, opened, ontime, done: Object.keys(opened).length >= ADVENT_DAYS, over: daysBetween(a.start, todayKey()) >= ADVENT_DAYS + 7, days: ADVENT_DAYS,
      rewards: Array.from({ length: ADVENT_DAYS }, (_, i) => adventReward(i + 1)), bonusClaimed: a.bonus || {} };
  }
  async function openAdventDay(d) {
    const me = perksPlayer();
    const a = me && await getAdvent();
    if (!a || d < 1 || d > a.today) return { ok: false, reason: "not-ready" };
    if (a.opened[d]) return { ok: false, reason: "daily-limit" };
    await aigDb.ref(`players/${me.id}/advent/opened/${d}`).set(todayKey()); // marker BEFORE paying
    const reward = adventReward(d);
    await creditWallet(reward);
    return { ok: true, reward };
  }
  async function claimAdventStreak() {
    const me = perksPlayer();
    const a = me && await getAdvent();
    if (!a) return { ok: false };
    const step = Math.floor(a.ontime / 7);
    if (step < 1 || (a.bonusClaimed[step])) return { ok: false, reason: "not-ready" };
    await aigDb.ref(`players/${me.id}/advent/bonus/${step}`).set(true);
    await creditWallet({ coins: 20, gems: 1 });
    return { ok: true, reward: { coins: 20, gems: 1 } };
  }
  async function restartAdvent() {
    const me = perksPlayer();
    if (me) await aigDb.ref(`players/${me.id}/advent`).remove();
  }

  // ---- 17. Parent focus -- topics a parent picked in the Parent Portal.
  const FOCUS_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  async function getWeeklyFocus() {
    const me = perksPlayer();
    if (!me) return null;
    const s = await aigDb.ref(`players/${me.id}/weeklyFocus`).get();
    if (!s.exists()) return null;
    const f = s.val();
    if (!f.topics || !f.topics.length || Date.now() - (f.setAt || 0) > 8 * 86400000) return null;
    return { topics: f.topics.filter(t => FOCUS_KEYS.includes(t)), stats: f.stats || {}, setAt: f.setAt };
  }
  function recordFocusAnswer(key, ok) {
    const me = perksPlayer();
    if (!me || !FOCUS_KEYS.includes(key)) return;
    aigDb.ref(`players/${me.id}/weeklyFocus/stats/${key}/${ok ? "c" : "w"}`).transaction(n => (n || 0) + 1).catch(() => {});
  }

  // ---- 16. Class board -- 4 colour teams from a stable hash of the player id.
  const CLASS_TEAMS = [{ id: "rockets", name: "Red Rockets", emoji: "🚀", color: "#e4572e" }, { id: "dolphins", name: "Blue Dolphins", emoji: "🐬", color: "#2e86de" },
    { id: "turtles", name: "Green Turtles", emoji: "🐢", color: "#2ea44f" }, { id: "bees", name: "Yellow Bees", emoji: "🐝", color: "#f2b705" }];
  async function getClassTeams() {
    const all = await readAllPlayers();
    const wk = weekKey();
    const teams = CLASS_TEAMS.map(t => ({ ...t, score: 0, members: [] }));
    Object.entries(all).forEach(([id, d]) => {
      const c = (d && d.weekly && d.weekly[wk] && d.weekly[wk].correct) || 0;
      if (c <= 0) return;
      const t = teams[seedFrom(id + "class4") % 4];
      t.score += c; t.members.push({ id, name: nameOf(id, d), score: c });
    });
    teams.forEach(t => t.members.sort((a, b) => b.score - a.score));
    return { week: wk, teams };
  }

  // =====================================================================
  // PM ROUND 12, BATCH 1 -- Bo's World: Bo's Home, Bo's level + daily gift,
  // Familiar companion. Everything under players/{id}/...
  // =====================================================================
  const FAMILIARS = [
    { id: "fox", emoji: "🦊", name: "Ember Fox", quip: "Clever and quick!" },
    { id: "dragon", emoji: "🐉", name: "Baby Dragon", quip: "Tiny fire, big heart." },
    { id: "cloudcat", emoji: "🐱", name: "Cloud Cat", quip: "Soft as a sleepy cloud." },
    { id: "owl", emoji: "🦉", name: "Wise Owl", quip: "Always reading something." },
    { id: "panda", emoji: "🐼", name: "Bamboo Panda", quip: "Slow, steady, smart." }
  ];
  const FAMILIAR_TREATS = { cost: { coins: 8 }, xp: 5 };

  // ---- 2. Bo's level -- grows with lifetime correct answers; each level
  // unlocks a small perk (shown on the Bo page).
  const BO_PERKS = [
    { lvl: 1, text: "Bo says hello and gives a tip each day" },
    { lvl: 2, text: "Daily gift from Bo: 🪙 grows with Bo's level" },
    { lvl: 3, text: "Bo's Home gets a 2nd row of furniture slots" },
    { lvl: 4, text: "Bo's daily gift includes a bonus 💎 every 4th visit" },
    { lvl: 5, text: "Bo's Home gets a 3rd row of furniture slots" },
    { lvl: 6, text: "Bo knows a secret: gift coins are doubled on your streak-7 days" },
    { lvl: 8, text: "Bo wears a golden aura in his house" },
    { lvl: 10, text: "Legendary Bo! Max daily gift" }
  ];
  const boLevelFor = total => Math.min(12, Math.floor(Math.sqrt(Math.max(0, total) / 12)) + 1);
  const boXpFor = lvl => (lvl - 1) * (lvl - 1) * 12;
  async function getBoStatus() {
    const me = perksPlayer();
    if (!me) return null;
    const [t, g, st] = await Promise.all([aigDb.ref(`players/${me.id}/totalCorrect`).get(), aigDb.ref(`players/${me.id}/boGift`).get(), getStreak()]);
    const total = t.exists() ? (t.val() || 0) : 0;
    const level = boLevelFor(total);
    const gift = g.exists() ? g.val() : {};
    const visits = gift.visits || 0;
    const coins = Math.min(30, 3 * level) * (level >= 6 && (st.count || 0) >= 7 ? 2 : 1);
    const gems = level >= 4 && (visits + 1) % 4 === 0 ? 1 : 0;
    return { total, level, xpInto: total - boXpFor(level), xpNext: level >= 12 ? 0 : boXpFor(level + 1) - boXpFor(level), perks: BO_PERKS,
      giftReady: level >= 2 && gift.last !== todayKey(), giftReward: { coins, gems }, visits, maxed: level >= 12 };
  }
  async function claimBoGift() {
    const me = perksPlayer();
    const st = me && await getBoStatus();
    if (!st || !st.giftReady) return { ok: false, reason: "daily-limit" };
    await aigDb.ref(`players/${me.id}/boGift`).set({ last: todayKey(), visits: st.visits + 1 }); // marker BEFORE paying
    await creditWallet(st.giftReward);
    return { ok: true, reward: st.giftReward };
  }

  // ---- 1. Bo's Home -- 4 columns of furniture slots; rows unlock with Bo's level.
  const BO_FURNITURE = [
    { id: "bed", emoji: "🛏️", name: "Cozy Bed", cost: 15, mood: 2 },
    { id: "books", emoji: "📚", name: "Bookshelf", cost: 20, mood: 3 },
    { id: "desk", emoji: "🪑", name: "Study Desk", cost: 15, mood: 2 },
    { id: "plant", emoji: "🪴", name: "Plant", cost: 8, mood: 1 },
    { id: "lamp", emoji: "🛋️", name: "Sofa", cost: 25, mood: 3 },
    { id: "rug", emoji: "🧶", name: "Cosy Rug", cost: 10, mood: 1 },
    { id: "globe", emoji: "🌍", name: "Globe", cost: 30, mood: 4 },
    { id: "tank", emoji: "🐠", name: "Fish Tank", cost: 35, mood: 4 },
    { id: "piano", emoji: "🎹", name: "Little Piano", cost: 45, mood: 5 },
    { id: "telescope", emoji: "🔭", name: "Telescope", cost: 40, mood: 5 },
    { id: "trophy", emoji: "🏆", name: "Trophy Shelf", cost: 50, mood: 6 },
    { id: "tv", emoji: "🖼️", name: "Painting", cost: 12, mood: 2 }
  ];
  const homeRows = level => level >= 5 ? 3 : level >= 3 ? 2 : 1;
  async function getBoHome() {
    const me = perksPlayer();
    if (!me) return null;
    const [h, bo] = await Promise.all([aigDb.ref(`players/${me.id}/boHome`).get(), getBoStatus()]);
    const d = h.exists() ? h.val() : {};
    const slots = d.slots || {};
    const rows = homeRows(bo.level);
    const mood = Object.values(slots).reduce((a, id) => a + ((BO_FURNITURE.find(f => f.id === id) || {}).mood || 0), 0);
    return { furniture: BO_FURNITURE, owned: d.owned || {}, slots, rows, total: rows * 4, mood, level: bo.level,
      moodText: mood >= 20 ? "Bo is over the moon! 🥰" : mood >= 10 ? "Bo feels right at home 😊" : mood >= 4 ? "Bo likes it here 🙂" : "Bo's house is a bit empty… 🥺" };
  }
  async function buyFurniture(id) {
    const me = perksPlayer();
    const def = BO_FURNITURE.find(f => f.id === id);
    if (!me || !def) return { ok: false };
    const ref = aigDb.ref(`players/${me.id}/boHome/owned/${id}`);
    if ((await ref.get()).exists()) return { ok: true, already: true };
    const paid = await spendWallet({ coins: def.cost });
    if (!paid.ok) return paid;
    await ref.set(true);
    return { ok: true };
  }
  async function placeFurniture(idx, id) {
    const me = perksPlayer();
    const home = me && await getBoHome();
    if (!home || idx < 0 || idx >= home.total) return { ok: false };
    if (id && !home.owned[id]) return { ok: false, reason: "not-ready" };
    const ref = aigDb.ref(`players/${me.id}/boHome/slots/${idx}`);
    if (id) await ref.set(id); else await ref.remove();
    return { ok: true };
  }

  // ---- 3. Familiar -- adopt one (free), level it by answering questions and feeding treats.
  async function getFamiliar() {
    const me = perksPlayer();
    if (!me) return null;
    const [f, t] = await Promise.all([aigDb.ref(`players/${me.id}/familiar`).get(), aigDb.ref(`players/${me.id}/totalCorrect`).get()]);
    const total = t.exists() ? (t.val() || 0) : 0;
    const d = f.exists() ? f.val() : null;
    if (!d || !d.species) return { adopted: null, species: FAMILIARS, treat: FAMILIAR_TREATS };
    const def = FAMILIARS.find(x => x.id === d.species) || FAMILIARS[0];
    const xp = Math.max(0, total - (d.adoptedAt || 0)) + (d.fed || 0) * FAMILIAR_TREATS.xp;
    const level = Math.min(10, Math.floor(xp / 25) + 1);
    return { adopted: { ...def, name: d.name || def.name, xp, level, xpInto: xp - (level - 1) * 25, fed: d.fed || 0, lastFed: d.lastFed || null, hungry: d.lastFed !== todayKey() }, species: FAMILIARS, treat: FAMILIAR_TREATS };
  }
  async function adoptFamiliar(speciesId, name) {
    const me = perksPlayer();
    const def = FAMILIARS.find(x => x.id === speciesId);
    if (!me || !def) return { ok: false };
    const cur = await getFamiliar();
    if (cur.adopted) return { ok: false, reason: "busy" };
    const t = await aigDb.ref(`players/${me.id}/totalCorrect`).get();
    await aigDb.ref(`players/${me.id}/familiar`).set({ species: speciesId, name: cleanText(name, 14) || def.name, adoptedAt: t.exists() ? (t.val() || 0) : 0, fed: 0 });
    return { ok: true };
  }
  async function feedFamiliar() {
    const me = perksPlayer();
    const f = me && await getFamiliar();
    if (!f || !f.adopted) return { ok: false };
    if (!f.adopted.hungry) return { ok: false, reason: "daily-limit" };
    const paid = await spendWallet(FAMILIAR_TREATS.cost);
    if (!paid.ok) return paid;
    await aigDb.ref(`players/${me.id}/familiar`).update({ fed: f.adopted.fed + 1, lastFed: todayKey() });
    return { ok: true };
  }

  // =====================================================================
  // PM ROUND 10 -- SKIN PREFS (one read for skin.js: theme, trail, answer
  // effect, combo sticker, Bo hat). Falls back to defaults for signed-out
  // players so skin.js can call it unconditionally.
  // =====================================================================
  async function getSkinPrefs() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    const d = { theme: "default", trail: "none", answerFx: "default", sticker: "none", boHat: "none", boHatEmoji: "", familiar: "" };
    if (!player || player.role === "parent") return d;
    const [snap, famSnap] = await Promise.all([aigDb.ref(`players/${player.id}/equipped`).get(), aigDb.ref(`players/${player.id}/familiar/species`).get()]);
    const e = snap.exists() ? snap.val() : {};
    const fam = famSnap.exists() ? FAMILIARS.find(f => f.id === famSnap.val()) : null;
    const hat = BO_HATS.find(h => h.id === (e["bo-costume"] || "none"));
    const sticker = COMBO_STICKERS.find(x => x.id === (e["combo-sticker"] || "none"));
    return {
      theme: e["hub-theme"] || "default", trail: e["touch-trail"] || "none", answerFx: e["answer-fx"] || "default",
      sticker: sticker && sticker.id !== "none" ? sticker.preview : "", boHat: hat ? hat.id : "none", boHatEmoji: hat ? hat.hat : "",
      familiar: fam ? fam.emoji : ""
    };
  }

  // =====================================================================
  // PERSONAL BEST TRACKER -- fastest completion time + best combo streak
  // per MathVille chapter, distinct from stars/tier (a skill/speed
  // metric, not a score metric). Written once per solo round from
  // showReward() with the round's elapsed time + state.bestComboThisRound.
  // =====================================================================
  async function getPersonalBest(chapterId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/personalBest/${chapterId}`).get();
    return snap.exists() ? snap.val() : null;
  }

  async function submitPersonalBest(chapterId, timeSec, bestCombo) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/personalBest/${chapterId}`);
    const snap = await ref.get();
    const existing = snap.exists() ? snap.val() : null;
    const finalTimeSec = existing ? Math.min(existing.timeSec, timeSec) : timeSec;
    const finalBestCombo = existing ? Math.max(existing.bestCombo || 0, bestCombo) : bestCombo;
    const newTimeRecord = !existing || timeSec < existing.timeSec;
    const newComboRecord = !existing || bestCombo > (existing.bestCombo || 0);
    await ref.set({ timeSec: finalTimeSec, bestCombo: finalBestCombo });
    return { ok: true, newTimeRecord, newComboRecord, timeSec: finalTimeSec, bestCombo: finalBestCombo };
  }

  // =====================================================================
  // WEEKLY BOSS RUSH — one-time-per-calendar-week reward, same
  // {gameId}:{chapterId}-style get-check-set pattern as claimBossWin
  // above, keyed by weekKey() instead so it resets naturally every
  // Monday. The 10-question gauntlet itself lives in MathVille's
  // script.js (it needs buildRound(), which is MathVille-only) -- this
  // side only supplies a per-player-per-week deterministic seed (so
  // retrying mid-week always draws the SAME 10 questions, not an
  // infinite reroll) and the claim/status check.
  // =====================================================================
  function weeklyBossRushSeed() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    const raw = `${(player && player.id) || "anon"}:${weekKey()}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return h;
  }

  async function getWeeklyBossRushStatus() {
    const wk = weekKey();
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { alreadyWon: false, seed: weeklyBossRushSeed(), weekKey: wk };
    const snap = await aigDb.ref(`players/${player.id}/weeklyBossRushWins/${wk}`).get();
    return { alreadyWon: snap.exists() && snap.val() === true, seed: weeklyBossRushSeed(), weekKey: wk };
  }

  async function claimWeeklyBossRush(reward) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const winRef = aigDb.ref(`players/${player.id}/weeklyBossRushWins/${weekKey()}`);
    const winSnap = await winRef.get();
    if (winSnap.exists() && winSnap.val()) return { ok: true, alreadyWon: true };
    await winRef.set(true);

    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    await walletRef.set({
      ...wallet,
      coins: (wallet.coins || 0) + (reward.coins || 0),
      gems: (wallet.gems || 0) + (reward.gems || 0)
    });
    const newCard = await awardRandomCard("legendary");
    return { ok: true, alreadyWon: false, newCard };
  }

  // =====================================================================
  // NINJA RUNNER GHOST — the score trajectory (cumulative score after
  // each of the 20 questions) of the player's own BEST run, replayed as
  // a live pace comparison during a new run ("+12 ahead of your best
  // run" / "-8 behind", see ninjaAdvance() in MathVille's script.js).
  // Overwritten only when a run beats the stored best score, so it
  // always reflects the current personal best -- same trigger as
  // PROGRESS.ninjaHighScore. Stored at players/{id}/ninjaGhost, nested
  // under the already-open `players` path, no rules change needed.
  // =====================================================================
  async function getNinjaGhost() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/ninjaGhost`).get();
    return snap.exists() ? snap.val() : null; // {score, checkpoints: [cumulative score after each question]}
  }

  async function saveNinjaGhost(score, checkpoints) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    await aigDb.ref(`players/${player.id}/ninjaGhost`).set({ score, checkpoints });
  }

  // =====================================================================
  // SEASON PASS (Battle Pass) — a monthly cumulative track, separate from
  // the daily quests above. Earns 1 "season point" (SP) per correct
  // answer, same trigger as coins (parallel counter, doesn't touch/consume
  // the wallet's own coins). 15 tiers with increasing cumulative
  // thresholds, each claimable once for a coin/gem reward. Resets every
  // calendar month (season key "YYYY-MM") -- there's deliberately no
  // migration/carry-over of unclaimed SP into the next season, same as a
  // real battle pass.
  // =====================================================================
  function seasonKey() {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  function touchSeasonProgress() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    aigDb.ref(`players/${player.id}/season/${seasonKey()}/sp`).transaction(cur => (cur || 0) + 1);
  }

  const BATTLEPASS_TIER_COUNT = 15;

  // Cumulative SP required to COMPLETE tier n (1-indexed) -- gaps widen by
  // +5 each tier (15, 35, 60, 90, 125...750 total for all 15), so early
  // tiers come fast and later ones take real sustained play across the
  // month.
  function battlePassThreshold(tier) {
    return 15 * tier + (5 * tier * (tier - 1)) / 2;
  }

  // Every 5th tier is a milestone (bigger, gem reward); the rest are
  // steady small coin drips that grow slightly tier over tier.
  function battlePassReward(tier) {
    if (tier % 5 === 0) return { gems: { 5: 2, 10: 3, 15: 5 }[tier] || 2 };
    return { coins: 6 + tier };
  }

  async function getBattlePass() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const season = seasonKey();
    const snap = await aigDb.ref(`players/${player.id}/season/${season}`).get();
    const data = snap.exists() ? snap.val() : { sp: 0, claimedTiers: {} };
    const sp = data.sp || 0;
    const claimedTiers = data.claimedTiers || {};

    const tiers = [];
    for (let t = 1; t <= BATTLEPASS_TIER_COUNT; t++) {
      const threshold = battlePassThreshold(t);
      tiers.push({
        tier: t,
        threshold,
        reward: battlePassReward(t),
        reached: sp >= threshold,
        claimed: !!claimedTiers[t]
      });
    }
    const nextTier = tiers.find(t => !t.reached) || null;
    return { season, sp, tiers, nextTier };
  }

  // Same get-check-set pattern as claimDailyQuest/unlockVehicle above --
  // no transaction, narrow accepted race, no real money involved.
  async function claimBattlePassTier(tier) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const season = seasonKey();
    const state = await getBattlePass();
    if (!state) return { ok: false };
    const t = state.tiers.find(x => x.tier === tier);
    if (!t || !t.reached || t.claimed) return { ok: false };

    await aigDb.ref(`players/${player.id}/season/${season}/claimedTiers/${tier}`).set(true);

    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    await walletRef.set({
      ...wallet,
      coins: (wallet.coins || 0) + (t.reward.coins || 0),
      gems: (wallet.gems || 0) + (t.reward.gems || 0)
    });
    const newCard = (tier % 5 === 0) ? await awardRandomCard("rare") : null;
    return { ok: true, newCard };
  }

  // =====================================================================
  // COLLECTIBLE CARDS — a lightweight "collection" layer, awarded (never
  // bought) as a bonus on top of milestones the reward systems above
  // already pay out: a full Daily Quest clear, a Battle Pass milestone
  // tier (every 5th), and a first-time Boss Challenge win. Deliberately
  // NOT a new hook into any individual game -- every award happens from
  // inside a claim* function above that's already being called. Stored at
  // players/{id}/collection/{cardId}: true (plain ownership, no counts).
  // =====================================================================
  const CARD_POOL = [
    { id: "c1", emoji: "🐶", name: "Puppy", rarity: "common" },
    { id: "c2", emoji: "🐱", name: "Kitten", rarity: "common" },
    { id: "c3", emoji: "🐰", name: "Bunny", rarity: "common" },
    { id: "c4", emoji: "🐻", name: "Bear", rarity: "common" },
    { id: "c5", emoji: "🐼", name: "Panda", rarity: "common" },
    { id: "c6", emoji: "🦊", name: "Fox", rarity: "common" },
    { id: "c7", emoji: "🐸", name: "Frog", rarity: "common" },
    { id: "c8", emoji: "🐵", name: "Monkey", rarity: "common" },
    { id: "c9", emoji: "🐷", name: "Piglet", rarity: "common" },
    { id: "c10", emoji: "🐨", name: "Koala", rarity: "common" },
    { id: "c11", emoji: "🦁", name: "Lion", rarity: "common" },
    { id: "c12", emoji: "🐮", name: "Cow", rarity: "common" },
    { id: "r1", emoji: "🦄", name: "Unicorn", rarity: "rare" },
    { id: "r2", emoji: "🐉", name: "Dragon", rarity: "rare" },
    { id: "r3", emoji: "🦋", name: "Butterfly", rarity: "rare" },
    { id: "r4", emoji: "🦉", name: "Owl", rarity: "rare" },
    { id: "r5", emoji: "🐢", name: "Turtle", rarity: "rare" },
    { id: "r6", emoji: "🦅", name: "Eagle", rarity: "rare" },
    { id: "r7", emoji: "🦈", name: "Shark", rarity: "rare" },
    { id: "r8", emoji: "🐙", name: "Octopus", rarity: "rare" },
    { id: "l1", emoji: "🌟", name: "Shooting Star", rarity: "legendary" },
    { id: "l2", emoji: "🔥", name: "Phoenix Flame", rarity: "legendary" },
    { id: "l3", emoji: "🌈", name: "Rainbow", rarity: "legendary" },
    { id: "l4", emoji: "👑", name: "Golden Crown", rarity: "legendary" }
  ];

  // `bias` skews which rarity tier gets rolled -- a Daily Quest bonus is
  // mostly-common with a small legendary chance, a Boss win is the
  // opposite (mostly rare/legendary), a Battle Pass milestone sits between.
  const CARD_RARITY_WEIGHTS = {
    common: { common: 70, rare: 25, legendary: 5 },
    rare: { common: 20, rare: 60, legendary: 20 },
    legendary: { common: 10, rare: 40, legendary: 50 }
  };

  function pickCardId(owned, bias) {
    const weights = CARD_RARITY_WEIGHTS[bias] || CARD_RARITY_WEIGHTS.common;
    const notOwned = CARD_POOL.filter(c => !owned[c.id]);
    const source = notOwned.length ? notOwned : CARD_POOL; // fully collected -- re-roll anyway, the write below is a harmless no-op

    const roll = Math.random() * 100;
    let rarity = "common";
    if (roll < weights.legendary) rarity = "legendary";
    else if (roll < weights.legendary + weights.rare) rarity = "rare";

    let candidates = source.filter(c => c.rarity === rarity);
    if (!candidates.length) candidates = source; // that tier is fully owned already -- fall back to whatever's left
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  async function awardRandomCard(bias) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const collRef = aigDb.ref(`players/${player.id}/collection`);
    const snap = await collRef.get();
    const owned = snap.exists() ? snap.val() : {};
    const cardId = pickCardId(owned, bias);
    await collRef.child(cardId).set(true);
    return cardId;
  }

  async function getCollection() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { owned: {}, pool: CARD_POOL };
    const snap = await aigDb.ref(`players/${player.id}/collection`).get();
    return { owned: snap.exists() ? snap.val() : {}, pool: CARD_POOL };
  }

  // Same sanitization the hub's Sign Up/Sign In uses (index.html's
  // sanitizeNameKey) -- duplicated here rather than shared, same
  // reasoning as every other cross-file duplication in this codebase
  // (no shared module between the hub's inline script and this file).
  function sanitizeNameKeyForLookup(name) {
    return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // =====================================================================
  // STICKER GIFTING -- give ONE owned card to a named classmate,
  // one-directional (no negotiation, unlike Card Trading below). The
  // Collection system doesn't track duplicates (awardRandomCard biases
  // toward cards you DON'T already own, so kids essentially never end
  // up holding two of the same card) -- so a "gift" here is a genuine
  // ownership TRANSFER: the giver loses the card, the recipient gains
  // it. Blocked if the recipient already owns it (no point).
  // =====================================================================
  async function giftCard(cardId, toName) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "not-eligible" };
    const toKey = sanitizeNameKeyForLookup(toName);
    if (!toKey || toKey === player.id) return { ok: false, reason: "invalid-recipient" };
    const [accountSnap, ownedSnap, recipientOwnedSnap] = await Promise.all([
      aigDb.ref(`testerAccounts/${toKey}`).get(),
      aigDb.ref(`players/${player.id}/collection/${cardId}`).get(),
      aigDb.ref(`players/${toKey}/collection/${cardId}`).get()
    ]);
    if (!accountSnap.exists()) return { ok: false, reason: "recipient-not-found" };
    if (!ownedSnap.exists() || !ownedSnap.val()) return { ok: false, reason: "not-owned" };
    if (recipientOwnedSnap.exists() && recipientOwnedSnap.val()) return { ok: false, reason: "recipient-already-owns" };
    await aigDb.ref(`players/${player.id}/collection/${cardId}`).remove();
    await aigDb.ref(`players/${toKey}/collection/${cardId}`).set(true);
    return { ok: true, toName: accountSnap.val().name };
  }

  // =====================================================================
  // CARD TRADING -- a shared trade board, distinct from Gifting above:
  // post an owned card wanting a SPECIFIC card back, any classmate can
  // browse and accept (mutual swap, not one-directional). Nested under
  // leaderboard/cardTrades (leaderboard/ is already fully open per the
  // RTDB rules, verified directly before building this -- avoids
  // needing a rules change for a new top-level path, same trick as
  // nesting Plane Mode 2P signaling under mathvilleGames/). Re-checks
  // ownership right before executing the swap (narrow race window
  // accepted, same trade-off as unlockVehicle/claimDailyQuest above --
  // this is cosmetic collection cards, not real currency).
  // =====================================================================
  function tradeBoardRef() {
    return aigDb.ref("leaderboard/cardTrades");
  }

  async function postTradeOffer(offerCardId, wantCardId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "not-eligible" };
    if (offerCardId === wantCardId) return { ok: false, reason: "same-card" };
    const [ownedSnap, wantOwnedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/collection/${offerCardId}`).get(),
      aigDb.ref(`players/${player.id}/collection/${wantCardId}`).get()
    ]);
    if (!ownedSnap.exists() || !ownedSnap.val()) return { ok: false, reason: "not-owned" };
    if (wantOwnedSnap.exists() && wantOwnedSnap.val()) return { ok: false, reason: "already-owns-wanted" };
    const ref = tradeBoardRef().push();
    await ref.set({
      fromId: player.id,
      fromName: player.name,
      offerCardId, wantCardId,
      status: "open",
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true, id: ref.key };
  }

  async function getOpenTradeOffers() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    const snap = await tradeBoardRef().get();
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .map(([id, o]) => ({ id, ...o }))
      .filter(o => o.status === "open" && (!player || o.fromId !== player.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function getMyTradeOffers() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const snap = await tradeBoardRef().get();
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .map(([id, o]) => ({ id, ...o }))
      .filter(o => o.fromId === player.id)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function cancelTradeOffer(offerId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = tradeBoardRef().child(offerId);
    const snap = await ref.get();
    if (!snap.exists() || snap.val().fromId !== player.id || snap.val().status !== "open") return { ok: false };
    await ref.update({ status: "cancelled" });
    return { ok: true };
  }

  async function acceptTradeOffer(offerId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "not-eligible" };
    const ref = tradeBoardRef().child(offerId);
    const snap = await ref.get();
    if (!snap.exists()) return { ok: false, reason: "not-found" };
    const offer = snap.val();
    if (offer.status !== "open") return { ok: false, reason: "not-open" };
    if (offer.fromId === player.id) return { ok: false, reason: "cant-accept-own" };
    const [myWantCardSnap, myOfferCardSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/collection/${offer.wantCardId}`).get(),
      aigDb.ref(`players/${player.id}/collection/${offer.offerCardId}`).get()
    ]);
    if (!myWantCardSnap.exists() || !myWantCardSnap.val()) return { ok: false, reason: "you-dont-own-wanted-card" };
    if (myOfferCardSnap.exists() && myOfferCardSnap.val()) return { ok: false, reason: "you-already-own-offered-card" };
    // Race-safety re-check immediately before executing: the offer must
    // still be open, and the poster must still actually hold the card
    // they offered (they could have gifted/traded it away since).
    const [stillOpenSnap, fromStillOwnsSnap] = await Promise.all([
      ref.get(),
      aigDb.ref(`players/${offer.fromId}/collection/${offer.offerCardId}`).get()
    ]);
    if (!stillOpenSnap.exists() || stillOpenSnap.val().status !== "open") return { ok: false, reason: "already-taken" };
    if (!fromStillOwnsSnap.exists() || !fromStillOwnsSnap.val()) return { ok: false, reason: "offer-no-longer-valid" };
    await Promise.all([
      aigDb.ref(`players/${offer.fromId}/collection/${offer.offerCardId}`).remove(),
      aigDb.ref(`players/${offer.fromId}/collection/${offer.wantCardId}`).set(true),
      aigDb.ref(`players/${player.id}/collection/${offer.wantCardId}`).remove(),
      aigDb.ref(`players/${player.id}/collection/${offer.offerCardId}`).set(true),
      ref.update({ status: "completed", toId: player.id, toName: player.name })
    ]);
    return { ok: true };
  }

  // Boss Rush Arena (per-chapter MathVille bosses AND the standalone
  // boss-rush/ game both write here via claimBossWin) has no getter to
  // just COUNT how many have been beaten -- claimBossWin only ever
  // checks one chapter/game key at a time. Needed for the Achievement
  // Wall's "Boss Slayer" tiers below.
  async function getBossWinsCount() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return 0;
    const snap = await aigDb.ref(`players/${player.id}/bossWins`).get();
    return snap.exists() ? Object.keys(snap.val()).length : 0;
  }

  // =====================================================================
  // ACHIEVEMENT WALL -- a kid-facing badge collection, distinct from
  // Parent Portal's "Achievements" snapshot (that one is a progress
  // readout FOR PARENTS; this is a game-y checklist FOR THE KID) and
  // from the Collection overlay's rank ladder (that's the 7 Title/Rank
  // tiers only; this pulls together several different systems -- title,
  // streak, collection, boss wins, season pass -- into one wall). Pure
  // aggregation of reads that already exist elsewhere; zero new writes.
  // =====================================================================
  async function getAchievements() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const [title, streak, collection, battlePass, wallet, bossWins] = await Promise.all([
      getTitle(), getStreak(), getCollection(), getBattlePass(), getWallet(), getBossWinsCount()
    ]);
    const totalCorrect = title ? title.count : 0;
    const ownedCount = Object.keys(collection.owned || {}).length;
    const list = TITLE_TIERS.map(t => ({
      id: `title-${t.min}`,
      emoji: t.emoji,
      name: t.name,
      desc: `${t.min} lifetime correct answers`,
      owned: totalCorrect >= t.min
    }));
    list.push(
      { id: "streak-7", emoji: "🔥", name: "Week Warrior", desc: "7-day play streak", owned: (streak.bestStreak || 0) >= 7 },
      { id: "streak-30", emoji: "🔥🔥", name: "Unstoppable", desc: "30-day play streak", owned: (streak.bestStreak || 0) >= 30 },
      { id: "collect-half", emoji: "🎴", name: "Collector", desc: `Own 12 of ${collection.pool.length} cards`, owned: ownedCount >= 12 },
      { id: "collect-all", emoji: "🎴✨", name: "Master Collector", desc: `Own all ${collection.pool.length} cards`, owned: ownedCount >= collection.pool.length },
      { id: "boss-1", emoji: "⚔️", name: "Boss Slayer", desc: "Beat a boss challenge", owned: bossWins >= 1 },
      { id: "boss-5", emoji: "⚔️👑", name: "Boss Champion", desc: "Beat 5 boss challenges", owned: bossWins >= 5 },
      { id: "season-full", emoji: "🎫", name: "Season Trailblazer", desc: `Reach tier ${BATTLEPASS_TIER_COUNT} of the Season Pass`, owned: battlePass.tiers.filter(t => t.reached).length >= BATTLEPASS_TIER_COUNT },
      { id: "saver", emoji: "💰", name: "Saver", desc: "Save up 100 coins", owned: (wallet.coins || 0) >= 100 }
    );
    return list;
  }

  // =====================================================================
  // TROPHY CASE — pick ONE already-owned achievement (from the list
  // above) to feature prominently on the Profile "brag page"
  // (profile/index.html), the most literal "show it off to a parent"
  // surface in the app. Picking WHICH achievement to feature is free
  // (it's already earned -- charging to display it would feel punitive);
  // the PEDESTAL frame around it is the actual currency sink, same
  // generic unlockCosmetic/equipCosmetic pair as everything else, type
  // "trophy-pedestal".
  // =====================================================================
  async function getFeaturedAchievement() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [achievements, featuredSnap] = await Promise.all([
      getAchievements(),
      aigDb.ref(`players/${player.id}/featuredAchievement`).get()
    ]);
    const owned = achievements.filter(a => a.owned);
    const featuredId = featuredSnap.exists() ? featuredSnap.val() : null;
    const featured = owned.find(a => a.id === featuredId) || null;
    return { owned, featured };
  }

  // Free -- just a preference, but still validated server-side against
  // the player's OWN achievement list so a direct call can't feature
  // something not actually earned.
  async function setFeaturedAchievement(id) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const achievements = await getAchievements();
    const match = achievements.find(a => a.id === id && a.owned);
    if (!match) return { ok: false, reason: "not-owned" };
    await aigDb.ref(`players/${player.id}/featuredAchievement`).set(id);
    return { ok: true };
  }

  const TROPHY_PEDESTALS = [
    { id: "default", name: "Plain", cost: null, preview: "⬜" },
    { id: "bronze", name: "Bronze Pedestal", cost: { coins: 20 }, preview: "🟫" },
    { id: "silver", name: "Silver Pedestal", cost: { coins: 30 }, preview: "⬛" },
    { id: "gold", name: "Gold Pedestal", cost: { coins: 45 }, preview: "🟨" },
    { id: "rainbow", name: "Rainbow Pedestal", cost: { gems: 3 }, preview: "🌈" }
  ];
  async function getTrophyPedestals() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics/trophy-pedestal`).get(),
      aigDb.ref(`players/${player.id}/equipped/trophy-pedestal`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    return {
      pedestals: TROPHY_PEDESTALS.map(p => ({ ...p, owned: !p.cost || !!owned[p.id] })),
      equipped: equippedSnap.exists() ? equippedSnap.val() : "default"
    };
  }

  // =====================================================================
  // VIRTUAL PET — a small companion (players/{id}/pet: {feedCount}) that
  // grows through stages the more it's fed. Deliberately NO hunger/decay
  // over time (that would need a scheduled job ticking down a value while
  // the app is closed, a much bigger lift for a purely-cosmetic feature) --
  // feedCount only ever goes up, so the pet is a pure reflection of total
  // care given, never something that can "starve" from time away.
  // =====================================================================
  const PET_FEED_COST = { coins: 3 };
  const PET_STAGES = [
    { min: 0, emoji: "🥚", name: "Mystery Egg" },
    { min: 3, emoji: "🐣", name: "Hatchling" },
    { min: 8, emoji: "🐥", name: "Chick" },
    { min: 15, emoji: "🐦", name: "Fledgling" },
    { min: 25, emoji: "🦉", name: "Wise Owl" },
    { min: 40, emoji: "🦅", name: "Soaring Eagle" }
  ];
  function petStageIndexFor(feedCount) {
    let idx = 0;
    for (let i = 0; i < PET_STAGES.length; i++) {
      if (feedCount >= PET_STAGES[i].min) idx = i;
    }
    return idx;
  }
  async function getPetStatus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/pet`).get();
    const feedCount = snap.exists() ? (snap.val().feedCount || 0) : 0;
    const stageIdx = petStageIndexFor(feedCount);
    const stage = PET_STAGES[stageIdx];
    const next = PET_STAGES[stageIdx + 1] || null;
    return { feedCount, stage, next, cost: PET_FEED_COST };
  }
  // Get-check-set (not .transaction()) -- same reasoning as unlockVehicle()
  // above: this named app instance's transactions can abort on a cold-cache
  // null read and never retry, so currency spends here do the check in JS.
  async function feedPet() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "no-player" };
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    if ((wallet.coins || 0) < PET_FEED_COST.coins) return { ok: false, reason: "insufficient-funds" };
    const newWallet = { ...wallet, coins: wallet.coins - PET_FEED_COST.coins };
    await walletRef.set(newWallet);
    const petRef = aigDb.ref(`players/${player.id}/pet`);
    const petSnap = await petRef.get();
    const feedCount = (petSnap.exists() ? (petSnap.val().feedCount || 0) : 0) + 1;
    await petRef.set({ feedCount });
    const stageIdx = petStageIndexFor(feedCount);
    return { ok: true, feedCount, wallet: newWallet, stage: PET_STAGES[stageIdx], leveledUp: PET_STAGES[stageIdx].min === feedCount };
  }

  // ---- Pet Accessory Shop -- purely cosmetic emoji worn NEXT TO the pet's
  // stage emoji (e.g. "🦉🎀"), bought with the same wallet as vehicle
  // skins/frames. Reuses the exact same generic unlockCosmetic(type,id,
  // cost)/equipCosmetic(type,id) pair everything else under "Customize"
  // already shares -- type "pet-accessory", zero new backend needed.
  const PET_ACCESSORIES = [
    { id: "none", name: "None", cost: null, preview: "" },
    { id: "bow", name: "Bow", cost: { coins: 15 }, preview: "🎀" },
    { id: "tophat", name: "Top Hat", cost: { coins: 20 }, preview: "🎩" },
    { id: "sunglasses", name: "Sunglasses", cost: { coins: 15 }, preview: "🕶️" },
    { id: "scarf", name: "Scarf", cost: { coins: 20 }, preview: "🧣" },
    { id: "crown", name: "Crown", cost: { gems: 2 }, preview: "👑" },
    { id: "sparkle", name: "Sparkle Charm", cost: { gems: 2 }, preview: "✨" }
  ];
  async function getPetAccessories() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics/pet-accessory`).get(),
      aigDb.ref(`players/${player.id}/equipped/pet-accessory`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    return {
      accessories: PET_ACCESSORIES.map(a => ({ ...a, owned: !a.cost || !!owned[a.id] })),
      equipped: equippedSnap.exists() ? equippedSnap.val() : "none"
    };
  }

  // ---- Hub Theme -- account-level (not tied to any one game), changes
  // the hub landing page's own background. Same generic unlockCosmetic/
  // equipCosmetic pair as everything else, type "hub-theme". A parent
  // browsing their own hub view never sees this (getHubTheme below
  // returns null for that role, same guard as Pet Accessories), so it's
  // purely the CHILD's own personalization, not shown to classmates --
  // "dipamerin" here means to a parent looking over their shoulder, not
  // multiplayer visibility (that's the separate Flair item).
  const HUB_THEMES = [
    { id: "default", name: "Classic", cost: null, preview: "🌤️" },
    { id: "space", name: "Space", cost: { coins: 30 }, preview: "🌌" },
    { id: "beach", name: "Beach", cost: { coins: 30 }, preview: "🏖️" },
    { id: "sunset", name: "Sunset", cost: { gems: 2 }, preview: "🌅" },
    // PM round 10, item 1 -- 6 more "world" themes. skin.js also reads the
    // equipped theme on every game page and floats matching ambient
    // particles over it, so a theme is felt everywhere, not just the hub.
    { id: "ocean", name: "Deep Ocean", cost: { coins: 30 }, preview: "🌊" },
    { id: "forest", name: "Magic Forest", cost: { coins: 30 }, preview: "🌳" },
    { id: "neon", name: "Neon City", cost: { gems: 2 }, preview: "🌃" },
    { id: "candy", name: "Candyland", cost: { coins: 35 }, preview: "🍭" },
    { id: "arctic", name: "Arctic", cost: { coins: 35 }, preview: "🧊" },
    { id: "volcano", name: "Volcano", cost: { gems: 3 }, preview: "🌋" }
  ];
  async function getHubThemes() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics/hub-theme`).get(),
      aigDb.ref(`players/${player.id}/equipped/hub-theme`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    return {
      themes: HUB_THEMES.map(t => ({ ...t, owned: !t.cost || !!owned[t.id] })),
      equipped: equippedSnap.exists() ? equippedSnap.val() : "default"
    };
  }

  // ---- Name Flair -- a small emoji badge shown next to the player's
  // name on the CROSS-PLAYER leaderboard (leaderboard.html), the one
  // place classmates actually see each other's names side by side.
  // This is the round's highest "dipamerin" value item specifically
  // because of that -- Hub Theme above is only ever seen by the owner.
  // Same generic unlockCosmetic/equipCosmetic pair, type "name-flair".
  const NAME_FLAIRS = [
    { id: "none", name: "No Flair", cost: null, preview: "" },
    { id: "star", name: "Star", cost: { coins: 20 }, preview: "🌟" },
    { id: "crown", name: "Crown", cost: { coins: 25 }, preview: "👑" },
    { id: "fire", name: "Fire", cost: { coins: 25 }, preview: "🔥" },
    { id: "diamond", name: "Diamond", cost: { gems: 3 }, preview: "💎" }
  ];
  async function getNameFlairs() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics/name-flair`).get(),
      aigDb.ref(`players/${player.id}/equipped/name-flair`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    return {
      flairs: NAME_FLAIRS.map(f => ({ ...f, owned: !f.cost || !!owned[f.id] })),
      equipped: equippedSnap.exists() ? equippedSnap.val() : "none"
    };
  }

  // Bulk lookup for the leaderboard page -- ONE read of the whole
  // players/ tree (same accepted trade-off the weekly leaderboard
  // already makes: cheap enough for a ~26-kid class, read-only, only
  // triggered when leaderboard.html is actually open) rather than
  // denormalizing equipped flair into every game's own leaderboard/
  // node on every recordPlay() write. Returns {playerId: emoji}, only
  // for players who actually have a non-"none" flair equipped.
  async function getAllEquippedFlairs() {
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return {};
    const out = {};
    snap.forEach(childSnap => {
      const equipped = childSnap.child("equipped/name-flair").val();
      if (equipped && equipped !== "none") {
        const flair = NAME_FLAIRS.find(f => f.id === equipped);
        if (flair) out[childSnap.key] = flair.preview;
      }
    });
    return out;
  }

  // =====================================================================
  // TEACH BO — the flip side of the AI hint: after getting a question
  // right, the kid explains it back in their own words (the "protege
  // effect" -- explaining something reinforces understanding of it). No AI
  // call needed, Bo just gives a warm canned acknowledgment client-side; a
  // flat +1 gem rewards the act of engaging, not the content of the
  // explanation (there's nothing here to grade). Uses the same additive
  // .transaction() as awardCurrency() above, not the get-check-set
  // pattern used for spends -- this only ever ADDS a gem, so it can't hit
  // the abort-on-null-cache bug documented on unlockVehicle()/feedPet().
  // =====================================================================
  async function awardTeachBoBonus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.gems = (wallet.gems || 0) + 1;
      return wallet;
    });
    return { ok: true };
  }

  // =====================================================================
  // REFERRAL BONUS — called once, right after a new testerAccounts record
  // is created at Sign Up (see index.html's handleAuthSubmit). Best-effort:
  // a missing/typo'd/nonexistent referrer name just means no bonus, never
  // blocks account creation (which already happened by the time this
  // runs). Both sides get the same flat reward -- no cap/limit on how many
  // times an existing player can be listed as a referrer, since each
  // referral can only ever fire once per NEW account (accounts are
  // one-time-created), so there's no way to grind this by resubmitting.
  // =====================================================================
  const REFERRAL_BONUS_COINS = 5;
  async function awardReferralBonus(newPlayerId, referrerId) {
    const referrerSnap = await aigDb.ref(`testerAccounts/${referrerId}`).get();
    if (!referrerSnap.exists()) return { ok: false, reason: "referrer-not-found" };
    async function addCoins(playerId) {
      const walletRef = aigDb.ref(`players/${playerId}/wallet`);
      const snap = await walletRef.get();
      const wallet = snap.exists() ? snap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
      await walletRef.set({ ...wallet, coins: (wallet.coins || 0) + REFERRAL_BONUS_COINS });
    }
    await addCoins(newPlayerId);
    await addCoins(referrerId);
    return { ok: true, bonus: REFERRAL_BONUS_COINS };
  }

  // =====================================================================
  // MILESTONE SURPRISE — a one-time celebratory moment at 7/30/100/365
  // days since account creation. Reuses testerAccounts/{id}/createdAt
  // (already written at Sign Up, see index.html) rather than tracking a
  // separate "days active" counter -- this is calendar days since signup,
  // not days actually played, which is a deliberate simplification (no
  // extra Firebase writes needed at all, this function is 100% reads).
  // Callers dedupe "already shown this milestone" via localStorage, same
  // as the push-token-popup pattern elsewhere in this codebase.
  // =====================================================================
  const MILESTONE_DAYS = [7, 30, 100, 365];
  async function getMilestoneSurprise() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`testerAccounts/${player.id}/createdAt`).get();
    if (!snap.exists()) return null;
    const days = Math.floor((Date.now() - snap.val()) / 86400000);
    const hit = MILESTONE_DAYS.find(d => d === days);
    return hit ? { days: hit } : null;
  }

  // =====================================================================
  // "ASK A FRIEND" SOCIAL PROOF — reads the whole players/ tree ONCE (same
  // pattern as getMostImproved()/getClassGoalProgress() above) and reports
  // what share of OTHER kids got a given topic right, so a missed question
  // can be framed as "you're not the only one still learning this" instead
  // of just a correction. Deliberately excludes the current player and
  // requires a minimum sample size -- a 1/1 or 2/2 "classmate" stat would
  // be misleading noise, not real social proof.
  // =====================================================================
  const CLASSMATE_MIN_SAMPLE = 5;
  async function getClassmateAccuracy(gameId, topicKey) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return null;
    let correct = 0, total = 0;
    snap.forEach(childSnap => {
      if (player && childSnap.key === player.id) return;
      const stats = childSnap.child(`topicStats/${gameId}/${topicKey}`).val();
      if (stats) {
        correct += stats.correct || 0;
        total += (stats.correct || 0) + (stats.wrong || 0);
      }
    });
    if (total < CLASSMATE_MIN_SAMPLE) return null;
    return { pct: Math.round((correct / total) * 100), sampleSize: total };
  }

  // =====================================================================
  // COSMETICS — Avatar Frames + Sound Packs, bought with the same
  // coins/gems wallet as vehicle skins. Two independent "slots" (frame /
  // sound), each with its own owned-set and one equipped choice. Sound
  // packs are just note sequences (frequency+duration pairs) -- actual
  // playback uses the Web Audio API in the UI layer, since that needs a
  // real AudioContext the module here has no reason to own.
  // =====================================================================
  const AVATAR_FRAMES = [
    { id: "none", name: "Default", cost: null },
    { id: "bronze", name: "Bronze Ring", cost: { coins: 10 } },
    { id: "silver", name: "Silver Ring", cost: { coins: 20 } },
    { id: "gold", name: "Gold Ring", cost: { coins: 35 } },
    { id: "rainbow", name: "Rainbow Ring", cost: { gems: 2 } },
    { id: "fire", name: "Fire Ring", cost: { gems: 3 } }
  ];

  // Avatar Builder, second layer on top of the existing free color
  // picker: a face sticker shown on the avatar chip instead of the
  // player's initial letter. Same generic unlockCosmetic/equipCosmetic
  // pair as frames/sounds above, type "face" -- "default" (the initial
  // letter) stays free, matching how "none"/"classic" work for frames/sounds.
  const AVATAR_FACES = [
    { id: "default", name: "Initial", cost: null, preview: null },
    { id: "smile", name: "Smiley", cost: { coins: 10 }, preview: "😀" },
    { id: "cool", name: "Cool", cost: { coins: 15 }, preview: "😎" },
    { id: "star", name: "Star-Struck", cost: { coins: 15 }, preview: "🤩" },
    { id: "party", name: "Party", cost: { coins: 20 }, preview: "🥳" },
    { id: "unicorn", name: "Unicorn", cost: { gems: 2 }, preview: "🦄" },
    { id: "cat", name: "Cat", cost: { gems: 2 }, preview: "🐱" }
  ];

  const SOUND_PACKS = [
    { id: "classic", name: "Classic Chime", cost: null, notes: [{ f: 523, d: 120 }, { f: 659, d: 120 }, { f: 784, d: 200 }] },
    { id: "arcade", name: "Arcade Blip", cost: { coins: 15 }, notes: [{ f: 440, d: 80 }, { f: 660, d: 80 }, { f: 880, d: 80 }, { f: 1320, d: 160 }] },
    { id: "fanfare", name: "Royal Fanfare", cost: { coins: 25 }, notes: [{ f: 392, d: 100 }, { f: 523, d: 100 }, { f: 659, d: 100 }, { f: 784, d: 260 }] },
    { id: "magic", name: "Magic Sparkle", cost: { gems: 2 }, notes: [{ f: 988, d: 70 }, { f: 1175, d: 70 }, { f: 1568, d: 70 }, { f: 1976, d: 180 }] }
  ];

  // =====================================================================
  // GAMEPLAY FX — cosmetic reskins for 6 existing games' signature visual
  // moments (bullet trail, nitro flame, race finish, boss special-move
  // flash, ninja slash, memory-match card back). Bought/equipped through
  // the SAME generic unlockCosmetic(type,id,cost)/equipCosmetic(type,id)
  // pair frames/sounds already use above -- each catalog below is just a
  // new `type` string sharing that one mechanism, no new backend needed.
  // Purely visual: none of these change scoring, difficulty, or timing
  // in the game they reskin.
  // =====================================================================
  const PLANE_BULLET_EFFECTS = [
    { id: "default", name: "Default Blaster", cost: null, preview: "🔹" },
    { id: "rainbow", name: "Rainbow Trail", cost: { coins: 20 }, preview: "🌈" },
    { id: "fire", name: "Fire Trail", cost: { coins: 25 }, preview: "🔥" },
    { id: "star", name: "Star Trail", cost: { gems: 2 }, preview: "⭐" },
    // Mythic -- a rarer tier above every existing gems item, one per FX
    // catalog (this round's item 7: a longer-term aspirational goal for
    // gems specifically, since every catalog previously topped out at
    // the same 2-gem tier).
    { id: "mythic", name: "Plasma Trail", cost: { gems: 4 }, preview: "💠" },
    // 2 more (PM round 8, item 16) -- purely cosmetic bullet trails,
    // slotted between the coins tier and Mythic.
    { id: "laser", name: "Laser Beam", cost: { coins: 30 }, preview: "🔴" },
    { id: "orb", name: "Homing Orb", cost: { gems: 2 }, preview: "🟣" }
  ];
  const DRIVE_NITRO_EFFECTS = [
    { id: "default", name: "Default Flame", cost: null, preview: "🔸" },
    { id: "blue", name: "Blue Flame", cost: { coins: 20 }, preview: "🔵" },
    { id: "rainbow", name: "Rainbow Flame", cost: { coins: 25 }, preview: "🌈" },
    { id: "rocket", name: "Rocket Flame", cost: { gems: 2 }, preview: "🚀" },
    { id: "mythic", name: "Inferno Flame", cost: { gems: 4 }, preview: "🌋" },
    // 2 more (PM round 8, item 15) -- "Rainbow Flame" already existed
    // above, so the brainstorm's 2nd pick became Golden instead of a
    // second rainbow variant.
    { id: "ice", name: "Ice Flame", cost: { coins: 30 }, preview: "❄️" },
    { id: "gold", name: "Golden Flame", cost: { gems: 2 }, preview: "✨" }
  ];
  // Ground Trail -- unlike the nitro flame above (only visible while
  // actively boosting), this drops a mark behind the car during ANY
  // normal movement. "none" is the free default, matching the pre-
  // existing behavior (Drive Mode never had a trail at all before this).
  const DRIVE_TRAIL_EFFECTS = [
    { id: "none", name: "No Trail", cost: null, preview: "🚫" },
    { id: "sparkle", name: "Sparkle Trail", cost: { coins: 20 }, preview: "✨" },
    { id: "petals", name: "Petal Trail", cost: { coins: 25 }, preview: "🌸" },
    { id: "stars", name: "Star Trail", cost: { coins: 25 }, preview: "⭐" },
    { id: "rainbow", name: "Rainbow Trail", cost: { gems: 2 }, preview: "🌈" },
    // 2 more (PM round 8, item 14).
    { id: "comet", name: "Comet Trail", cost: { coins: 30 }, preview: "☄️" },
    { id: "lightning", name: "Lightning Trail", cost: { gems: 2 }, preview: "⚡" }
  ];
  // "default" is the confetti burst Math Race already always played on a
  // win (unchanged, still free) -- the paid tiers are distinct variations
  // of the same canvas-confetti call (different colors/shapes/spread),
  // not a downgrade of what free players already had.
  const MATHRACE_FINISH_EFFECTS = [
    { id: "default", name: "Confetti Burst", cost: null, preview: "🎊" },
    { id: "fireworks", name: "Fireworks", cost: { coins: 20 }, preview: "🎆" },
    { id: "streamers", name: "Streamers", cost: { coins: 25 }, preview: "🎉" },
    { id: "rainbow", name: "Rainbow Mega Burst", cost: { gems: 2 }, preview: "🌈" },
    { id: "mythic", name: "Legendary Fireworks", cost: { gems: 4 }, preview: "🎇" }
  ];
  // Victory Emote -- a personal animation on the win-screen's own emoji
  // (separate from the confetti particles above, which are the SCREEN's
  // celebration; this is the CHARACTER's). "default" keeps the plain
  // bounce that already always played, never a downgrade.
  const MATHRACE_EMOTE_EFFECTS = [
    { id: "default", name: "Classic Bounce", cost: null, preview: "🏁" },
    { id: "spin", name: "Victory Spin", cost: { coins: 15 }, preview: "🌀" },
    { id: "wiggle", name: "Happy Wiggle", cost: { coins: 20 }, preview: "🕺" },
    { id: "rainbow", name: "Rainbow Glow", cost: { gems: 2 }, preview: "🌈" },
    // 2 more (PM round 8, item 20).
    { id: "confetti", name: "Confetti Rain", cost: { coins: 25 }, preview: "🎊" },
    { id: "trophy", name: "Trophy Lift", cost: { gems: 2 }, preview: "🏆" }
  ];
  const BOSSRUSH_SPECIAL_EFFECTS = [
    { id: "default", name: "Default Flash", cost: null, preview: "✨" },
    { id: "lightning", name: "Lightning Strike", cost: { coins: 20 }, preview: "⚡" },
    { id: "fire", name: "Fire Burst", cost: { coins: 25 }, preview: "🔥" },
    { id: "ice", name: "Ice Shatter", cost: { gems: 2 }, preview: "❄️" },
    { id: "mythic", name: "Meteor Strike", cost: { gems: 4 }, preview: "☄️" }
  ];
  const NINJA_SLASH_EFFECTS = [
    { id: "default", name: "Default Slash", cost: null, preview: "⚔️" },
    { id: "fire", name: "Fire Slash", cost: { coins: 20 }, preview: "🔥" },
    { id: "lightning", name: "Lightning Slash", cost: { coins: 25 }, preview: "⚡" },
    { id: "rainbow", name: "Rainbow Slash", cost: { gems: 2 }, preview: "🌈" },
    { id: "mythic", name: "Dragon Slash", cost: { gems: 4 }, preview: "🐉" }
  ];
  const MEMORYMATCH_CARDBACKS = [
    { id: "default", name: "Brain", cost: null, preview: "🧠" },
    { id: "cards", name: "Cards", cost: { coins: 15 }, preview: "🎴" },
    { id: "star", name: "Star", cost: { coins: 20 }, preview: "🌟" },
    { id: "crystal", name: "Crystal", cost: { gems: 2 }, preview: "🔮" },
    { id: "mythic", name: "Nebula", cost: { gems: 4 }, preview: "🌌" }
  ];
  // PM round 10 -- 3 new cosmetics that live in skin.js/juice.js (global,
  // every game): the effect a correct answer sets off, the trail a finger
  // leaves, and a "combo sticker" that pops up on a 5-streak.
  const ANSWER_FX = [
    { id: "default", name: "Sparkle", cost: null, preview: "✨" },
    { id: "hearts", name: "Heart Burst", cost: { coins: 20 }, preview: "💖" },
    { id: "stars", name: "Star Shower", cost: { coins: 25 }, preview: "🌠" },
    { id: "fireworks", name: "Fireworks", cost: { coins: 30 }, preview: "🎆" },
    { id: "animals", name: "Animal Party", cost: { coins: 30 }, preview: "🐾" },
    { id: "rainbow", name: "Rainbow Pop", cost: { gems: 2 }, preview: "🌈" }
  ];
  const TOUCH_TRAILS = [
    { id: "none", name: "No Trail", cost: null, preview: "🚫" },
    { id: "stars", name: "Star Dust", cost: { coins: 20 }, preview: "⭐" },
    { id: "hearts", name: "Hearts", cost: { coins: 20 }, preview: "❤️" },
    { id: "fire", name: "Flames", cost: { coins: 25 }, preview: "🔥" },
    { id: "bubbles", name: "Bubbles", cost: { coins: 25 }, preview: "🫧" },
    { id: "snow", name: "Snowfall", cost: { gems: 2 }, preview: "❄️" },
    { id: "rainbow", name: "Rainbow", cost: { gems: 3 }, preview: "🌈" }
  ];
  const COMBO_STICKERS = [
    { id: "none", name: "No Sticker", cost: null, preview: "🚫" },
    { id: "wow", name: "Bo Wow", cost: { coins: 10 }, preview: "🤩" },
    { id: "cool", name: "Bo Cool", cost: { coins: 10 }, preview: "😎" },
    { id: "love", name: "Bo Love", cost: { coins: 15 }, preview: "🥰" },
    { id: "fire", name: "On Fire", cost: { coins: 15 }, preview: "🔥" },
    { id: "brain", name: "Big Brain", cost: { coins: 20 }, preview: "🧠" },
    { id: "rocket", name: "Rocket", cost: { coins: 20 }, preview: "🚀" },
    { id: "crown", name: "Champion", cost: { gems: 2 }, preview: "👑" }
  ];
  const CARD_BACKGROUNDS = [
    { id: "default", name: "Cream", cost: null, preview: "🟨" },
    { id: "sunrise", name: "Sunrise", cost: { coins: 20 }, preview: "🌅" },
    { id: "mint", name: "Fresh Mint", cost: { coins: 20 }, preview: "🍃" },
    { id: "aurora", name: "Aurora", cost: { coins: 30 }, preview: "🌌" },
    { id: "galaxy", name: "Galaxy", cost: { gems: 2 }, preview: "🪐" },
    { id: "gold", name: "Pure Gold", cost: { gems: 4 }, preview: "🥇" }
  ];
  const GAMEPLAY_FX_CATALOGS = {
    "card-bg": CARD_BACKGROUNDS,
    "answer-fx": ANSWER_FX,
    "touch-trail": TOUCH_TRAILS,
    "combo-sticker": COMBO_STICKERS,
    "plane-bullet": PLANE_BULLET_EFFECTS,
    "drive-nitro": DRIVE_NITRO_EFFECTS,
    "drive-trail": DRIVE_TRAIL_EFFECTS,
    "mathrace-finish": MATHRACE_FINISH_EFFECTS,
    "mathrace-emote": MATHRACE_EMOTE_EFFECTS,
    "bossrush-special": BOSSRUSH_SPECIAL_EFFECTS,
    "ninja-slash": NINJA_SLASH_EFFECTS,
    "memorymatch-cardback": MEMORYMATCH_CARDBACKS
  };

  // ---- Costumes -- Ninja Runner and Boss Rush Arena are the 2 newer
  // game modes that never got a character customization option at all
  // (unlike Drive/Plane Mode's vehicle skins) -- this is the first one
  // for either. Same generic unlockCosmetic/equipCosmetic pair as
  // frames/sounds/FX above, just 2 more `type` strings. Ninja Runner's
  // costume recolors its existing CSS-built character (torso/band/legs
  // via a `data-costume` attribute -- see mathville/style.css); Boss
  // Rush's is a full emoji swap since the fighter there is just one
  // fixed emoji, no CSS parts to recolor.
  const NINJA_COSTUMES = [
    { id: "default", name: "Classic", cost: null, preview: "⚪" },
    { id: "crimson", name: "Crimson", cost: { coins: 15 }, preview: "🔴" },
    { id: "shadow", name: "Shadow", cost: { coins: 20 }, preview: "⚫" },
    { id: "jade", name: "Jade", cost: { gems: 2 }, preview: "🟢" },
    // 2 more (PM round 8, item 18).
    { id: "ocean", name: "Ocean", cost: { coins: 25 }, preview: "🔵" },
    { id: "golden", name: "Golden", cost: { gems: 2 }, preview: "🟡" },
    // PM round 10, item 5 -- character costumes (recolor + a hat, see
    // mathville/style.css).
    { id: "samurai", name: "Samurai", cost: { coins: 30 }, preview: "⛩️" },
    { id: "robot", name: "Robo-Ninja", cost: { coins: 30 }, preview: "🤖" },
    { id: "astronaut", name: "Astronaut", cost: { gems: 3 }, preview: "🧑‍🚀" },
    { id: "chef", name: "Chef", cost: { coins: 25 }, preview: "👨‍🍳" }
  ];
  const BOSSRUSH_FIGHTERS = [
    { id: "default", name: "Classic", cost: null, preview: "🥋" },
    { id: "boxer", name: "Boxer", cost: { coins: 15 }, preview: "🥊" },
    { id: "hero", name: "Hero", cost: { coins: 20 }, preview: "🦸" },
    { id: "dragon", name: "Dragon Warrior", cost: { gems: 2 }, preview: "🐉" },
    // 2 more (PM round 8, item 17).
    { id: "ronin", name: "Ronin", cost: { coins: 25 }, preview: "🗡️" },
    { id: "cyber", name: "Cyber Fighter", cost: { gems: 2 }, preview: "🤖" }
  ];
  // Dino Skin (PM round 8, item 13) -- a genuinely NEW cosmetic category,
  // the chasing dino in Drive Mode (previously always the same fixed
  // green). Same generic unlockCosmetic/equipCosmetic pair, type
  // "dino-skin". Recolor is pure CSS keyed off a `data-skin` attribute on
  // #drive-dino (see mathville/script.js's goToDrive() and
  // mathville/style.css), same trick as Ninja Runner's costume above.
  const DINO_SKINS = [
    { id: "default", name: "Classic Green", cost: null, preview: "🟢" },
    { id: "fire", name: "Fire Dino", cost: { coins: 25 }, preview: "🔴" },
    { id: "ice", name: "Ice Dino", cost: { coins: 30 }, preview: "🔵" },
    { id: "shadow", name: "Shadow Dino", cost: { gems: 3 }, preview: "⚫" },
    // Earned, not bought: granted free when the Dino Companion reaches Mega
    // Rex (the 99-gem "price" only exists so it reads as unbuyable).
    { id: "mega", name: "Mega Rex", cost: { gems: 99 }, preview: "🐲" }
  ];
  // Bo's wardrobe (PM round 10, item 5): skin.js perches the equipped hat
  // on every Bo avatar it can find.
  const BO_HATS = [
    { id: "none", name: "No Hat", cost: null, preview: "🚫", hat: "" },
    { id: "cap", name: "Sporty Cap", cost: { coins: 15 }, preview: "🧢", hat: "🧢" },
    { id: "grad", name: "Graduate", cost: { coins: 25 }, preview: "🎓", hat: "🎓" },
    { id: "tophat", name: "Top Hat", cost: { coins: 25 }, preview: "🎩", hat: "🎩" },
    { id: "straw", name: "Sun Hat", cost: { coins: 20 }, preview: "👒", hat: "👒" },
    { id: "crown", name: "Royal Crown", cost: { gems: 3 }, preview: "👑", hat: "👑" },
    // PM round 12, item 7 -- seasonal hats: buyable ONLY while their season
    // is on (see SEASONS), kept forever once owned, so old ones become rare.
    { id: "s-merdeka", name: "Merdeka Cap", cost: { coins: 30 }, preview: "🇮🇩", hat: "🇮🇩", season: "independence" },
    { id: "s-batik", name: "Batik Headband", cost: { coins: 25 }, preview: "👘", hat: "👘", season: "batik" },
    { id: "s-pumpkin", name: "Pumpkin Hat", cost: { coins: 30 }, preview: "🎃", hat: "🎃", season: "halloween" },
    { id: "s-teacher", name: "Teacher's Pet Apple", cost: { coins: 25 }, preview: "🍎", hat: "🍎", season: "teachers" },
    { id: "s-santa", name: "Santa Hat", cost: { coins: 30 }, preview: "🎅", hat: "🎅", season: "christmas" },
    { id: "s-party", name: "Party Hat", cost: { coins: 30 }, preview: "🥳", hat: "🥳", season: "newyear" },
    { id: "s-ramadan", name: "Crescent Crown", cost: { coins: 30 }, preview: "🌙", hat: "🌙", season: "ramadan" },
    { id: "s-eid", name: "Eid Lantern", cost: { coins: 30 }, preview: "🏮", hat: "🏮", season: "eid" },
    { id: "s-kids", name: "Balloon Bunch", cost: { coins: 25 }, preview: "🎈", hat: "🎈", season: "kids" }
  ];
  const COSTUME_CATALOGS = {
    "bo-costume": BO_HATS,
    "ninja-costume": NINJA_COSTUMES,
    "bossrush-fighter": BOSSRUSH_FIGHTERS,
    "dino-skin": DINO_SKINS
  };

  // Lightweight single-type read, for a GAME to find out its own equipped
  // effect without pulling the whole getCosmetics() bundle (frames +
  // sounds + all 6 FX catalogs) just to read one value.
  async function getEquippedCosmetic(type, defaultId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return defaultId;
    const snap = await aigDb.ref(`players/${player.id}/equipped/${type}`).get();
    return snap.exists() ? snap.val() : defaultId;
  }

  async function getCosmetics() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics`).get(),
      aigDb.ref(`players/${player.id}/equipped`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    const equipped = equippedSnap.exists() ? equippedSnap.val() : {};
    const fx = {};
    Object.entries(GAMEPLAY_FX_CATALOGS).forEach(([type, catalog]) => {
      fx[type] = catalog.map(e => ({ ...e, owned: !e.cost || !!(owned[type] && owned[type][e.id]) }));
    });
    const costumes = {};
    Object.entries(COSTUME_CATALOGS).forEach(([type, catalog]) => {
      costumes[type] = catalog.map(e => ({ ...e, owned: !e.cost || !!(owned[type] && owned[type][e.id]) }))
        // seasonal items: only shown while in season, or once you own them
        .filter(e => !e.season || e.owned || (getSeason() && getSeason().id === e.season));
    });
    return {
      frames: AVATAR_FRAMES.map(f => ({ ...f, owned: !f.cost || !!(owned.frame && owned.frame[f.id]) })),
      sounds: SOUND_PACKS.map(s => ({ ...s, owned: !s.cost || !!(owned.sound && owned.sound[s.id]) })),
      faces: AVATAR_FACES.map(fc => ({ ...fc, owned: !fc.cost || !!(owned.face && owned.face[fc.id]) })),
      equippedFrame: equipped.frame || "none",
      equippedSound: equipped.sound || "classic",
      equippedFace: equipped.face || "default",
      fx,
      equippedFx: {
        "plane-bullet": equipped["plane-bullet"] || "default",
        "drive-nitro": equipped["drive-nitro"] || "default",
        "drive-trail": equipped["drive-trail"] || "none",
        "mathrace-finish": equipped["mathrace-finish"] || "default",
        "mathrace-emote": equipped["mathrace-emote"] || "default",
        "bossrush-special": equipped["bossrush-special"] || "default",
        "ninja-slash": equipped["ninja-slash"] || "default",
        "memorymatch-cardback": equipped["memorymatch-cardback"] || "default",
        "answer-fx": equipped["answer-fx"] || "default",
        "card-bg": equipped["card-bg"] || "default",
        "touch-trail": equipped["touch-trail"] || "none",
        "combo-sticker": equipped["combo-sticker"] || "none"
      },
      costumes,
      equippedCostumes: {
        "ninja-costume": equipped["ninja-costume"] || "default",
        "bossrush-fighter": equipped["bossrush-fighter"] || "default",
        "dino-skin": equipped["dino-skin"] || "default",
        "bo-costume": equipped["bo-costume"] || "none"
      }
    };
  }

  // Same get-check-set pattern as unlockVehicle/claimDailyQuest above.
  async function unlockCosmetic(type, id, cost) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ownRef = aigDb.ref(`players/${player.id}/ownedCosmetics/${type}/${id}`);
    const snap = await ownRef.get();
    if (snap.exists() && snap.val()) return { ok: true, alreadyOwned: true };

    const coinsCost = cost.coins || 0;
    const gemsCost = cost.gems || 0;
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    if ((wallet.coins || 0) < coinsCost || (wallet.gems || 0) < gemsCost) {
      return { ok: false, reason: "insufficient-funds" };
    }
    await walletRef.set({
      ...wallet,
      coins: Math.max(0, (wallet.coins || 0) - coinsCost),
      gems: Math.max(0, (wallet.gems || 0) - gemsCost)
    });
    await ownRef.set(true);
    return { ok: true, alreadyOwned: false };
  }

  async function equipCosmetic(type, id) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/equipped/${type}`).set(id);
    return { ok: true };
  }

  // =====================================================================
  // DAILY DEAL — one paid cosmetic item, picked deterministically from
  // EVERY catalog (frames/faces/sounds/6 Game FX types/pet accessories)
  // and discounted 30%, same SAME for every player each calendar day
  // (seeded from the date, same trick as Bonus Hour) so it's a genuine
  // "come back today" hook rather than a per-player roll. No new
  // storage at all -- computed fresh from the existing catalogs +
  // today's date every time it's asked for. Complements Bonus Hour/
  // Weekend (which discount EARNING) with a discount on SPENDING.
  // Only draws from catalogs whose unlockCosmetic() call already takes
  // an explicit `cost` argument from the caller (every one below does),
  // so applying a discount here needs no changes to the purchase
  // functions themselves -- the discounted cost IS the cost passed in.
  function getDailyDeal() {
    const pool = [];
    AVATAR_FRAMES.forEach(f => { if (f.cost) pool.push({ type: "frame", id: f.id, name: f.name, preview: "🖼️", cost: f.cost }); });
    AVATAR_FACES.forEach(f => { if (f.cost) pool.push({ type: "face", id: f.id, name: f.name, preview: f.preview, cost: f.cost }); });
    SOUND_PACKS.forEach(s => { if (s.cost) pool.push({ type: "sound", id: s.id, name: s.name, preview: "🎵", cost: s.cost }); });
    Object.entries(GAMEPLAY_FX_CATALOGS).forEach(([type, catalog]) => {
      catalog.forEach(item => { if (item.cost) pool.push({ type, id: item.id, name: item.name, preview: item.preview, cost: item.cost }); });
    });
    PET_ACCESSORIES.forEach(a => { if (a.cost) pool.push({ type: "pet-accessory", id: a.id, name: a.name, preview: a.preview, cost: a.cost }); });
    if (!pool.length) return null;
    const dateStr = new Date().toISOString().slice(0, 10);
    const picked = pool[seedFrom(dateStr + "dailydeal") % pool.length];
    const discountedCost = {};
    if (picked.cost.coins) discountedCost.coins = Math.max(1, Math.floor(picked.cost.coins * 0.7));
    if (picked.cost.gems) discountedCost.gems = Math.max(1, Math.floor(picked.cost.gems * 0.7));
    return { type: picked.type, id: picked.id, name: picked.name, preview: picked.preview, originalCost: picked.cost, cost: discountedCost };
  }

  // Whether the CURRENT player already owns today's deal item -- shown
  // as "already yours!" instead of a buy button rather than re-selling
  // something they have.
  async function getDailyDealStatus() {
    const deal = getDailyDeal();
    if (!deal) return null;
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { deal, owned: false };
    const snap = await aigDb.ref(`players/${player.id}/ownedCosmetics/${deal.type}/${deal.id}`).get();
    return { deal, owned: snap.exists() && !!snap.val() };
  }

  // Avatar color -- a FREE preference override (unlike frames/sounds
  // above, which are paid cosmetics with owned/unlock gating). Kids just
  // pick which of the 7 existing palette colors they want instead of
  // being stuck with whatever the name-hash landed on (see scColorFor in
  // the hub). Stored separately from `equipped` since there's no
  // ownership concept here at all.
  async function getAvatarColor() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/avatarColor`).get();
    return snap.exists() ? snap.val() : null;
  }

  async function setAvatarColor(color) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/avatarColor`).set(color);
    return { ok: true };
  }

  // =====================================================================
  // REAL-WORLD REWARD LEDGER — a parent defines a small catalog of real
  // rewards (e.g. "30 min extra screen time" for 20 coins) from Parent
  // Portal (writes players/{id}/rewardCatalog directly via aigDb, same as
  // every other parent-side write -- Parent Portal doesn't go through
  // this file's player-role gating at all, see its own script.js). A kid
  // redeems one here, spending from the SAME coins/gems wallet vehicle
  // skins/power-ups already use; the redemption is logged (not
  // auto-fulfilled -- a parent still has to actually deliver the real
  // reward and marks it given from Parent Portal).
  // =====================================================================
  async function getRewardCatalog() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return {};
    const snap = await aigDb.ref(`players/${player.id}/rewardCatalog`).get();
    return snap.exists() ? snap.val() : {};
  }

  // Get-check-set pattern, same as unlockCosmetic/unlockVehicle above --
  // deliberately not a transaction, for the same reason documented on
  // those (a real-money-adjacent purchase would need one, a cosmetic-ish
  // real-world reward doesn't).
  async function redeemReward(itemId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const catalogSnap = await aigDb.ref(`players/${player.id}/rewardCatalog/${itemId}`).get();
    if (!catalogSnap.exists()) return { ok: false, reason: "not-found" };
    const item = catalogSnap.val();
    const cost = item.cost || {};
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    if ((wallet.coins || 0) < (cost.coins || 0) || (wallet.gems || 0) < (cost.gems || 0)) {
      return { ok: false, reason: "insufficient-funds" };
    }
    await walletRef.set({
      ...wallet,
      coins: Math.max(0, (wallet.coins || 0) - (cost.coins || 0)),
      gems: Math.max(0, (wallet.gems || 0) - (cost.gems || 0))
    });
    await aigDb.ref(`players/${player.id}/rewardRedemptions`).push({
      label: item.label,
      cost,
      redeemedAt: firebase.database.ServerValue.TIMESTAMP,
      fulfilled: false
    });
    return { ok: true };
  }

  // =====================================================================
  // MATHVILLE THEME (dark mode + world skins) — a free cosmetic
  // preference, same free/no-unlock spirit as avatar color above. Actual
  // color values live entirely in mathville/style.css's [data-theme]
  // blocks; this just persists which one is picked so it follows the
  // kid across devices.
  // =====================================================================
  async function getMathvilleTheme() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return "light";
    const snap = await aigDb.ref(`players/${player.id}/mathvilleTheme`).get();
    return snap.exists() ? snap.val() : "light";
  }

  async function setMathvilleTheme(theme) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/mathvilleTheme`).set(theme);
    return { ok: true };
  }

  // Town Map corner decoration -- a single emoji a kid picks for a fixed
  // spot on their own Town Map, purely self-expression (free, no wallet
  // cost, unlike vehicle skins/cosmetics above). Same get/set shape as
  // getMathvilleTheme/setMathvilleTheme just above, deliberately its own
  // path rather than folded into mathvilleTheme since it's independent
  // (light/dark/world theme vs. a personal decoration are unrelated axes).
  async function getTownDecoration() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/townDecoration`).get();
    return snap.exists() ? snap.val() : null;
  }

  async function setTownDecoration(decoId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/townDecoration`).set(decoId);
    return { ok: true };
  }

  // =====================================================================
  // MISTAKE JOURNAL — every wrong answer, across whatever games call
  // logMistake(), kept as a small rolling log (capped at
  // MISTAKE_JOURNAL_MAX, oldest dropped first) rather than growing
  // forever. Scope note: currently only MathVille calls this (see
  // submitAnswer() there) -- azkacraft/azkauniverse aren't wired up yet,
  // a separate follow-up since their question-rendering code is entirely
  // its own copy, not shared with MathVille's.
  // =====================================================================
  const MISTAKE_JOURNAL_MAX = 60;

  async function logMistake(gameId, topic, prompt, correctAnswer) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueOfflineWrite("logMistake", [gameId, topic, prompt, correctAnswer]);
      return;
    }
    const ref = aigDb.ref(`players/${player.id}/mistakeJournal`);
    const snap = await ref.get();
    const entries = snap.exists() ? Object.entries(snap.val()) : [];
    await ref.push().set({
      gameId, topic,
      prompt: String(prompt).slice(0, 300),
      correctAnswer: String(correctAnswer).slice(0, 200),
      at: firebase.database.ServerValue.TIMESTAMP,
      reviewed: false
    });
    // Prune oldest entries down to the cap -- checked against the count
    // BEFORE this push (off-by-one on the newest entry doesn't matter,
    // this is a rolling log not an exact-size invariant).
    if (entries.length >= MISTAKE_JOURNAL_MAX) {
      entries.sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
      const toRemove = entries.slice(0, entries.length - MISTAKE_JOURNAL_MAX + 1);
      await Promise.all(toRemove.map(([id]) => ref.child(id).remove()));
    }
  }

  async function getMistakeJournal() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const snap = await aigDb.ref(`players/${player.id}/mistakeJournal`).get();
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  async function markMistakeReviewed(id) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/mistakeJournal/${id}/reviewed`).set(true);
    return { ok: true };
  }

  // =====================================================================
  // BEAT YESTERDAY — a simple daily comparison, reading data that
  // already exists (players/{id}/dailyStats/{date}, populated by
  // touchDailyStats() on every single answer already) rather than
  // tracking anything new.
  // =====================================================================
  async function getDailyComparison() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const today = todayKey();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [todaySnap, yesterdaySnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/dailyStats/${today}`).get(),
      aigDb.ref(`players/${player.id}/dailyStats/${yesterday}`).get()
    ]);
    const todayCorrect = todaySnap.exists() ? (todaySnap.val().correct || 0) : 0;
    const yesterdayCorrect = yesterdaySnap.exists() ? (yesterdaySnap.val().correct || 0) : 0;
    return { today: todayCorrect, yesterday: yesterdayCorrect, beat: todayCorrect > yesterdayCorrect };
  }

  // =====================================================================
  // COMEBACK BONUS — a bigger one-time bonus for a kid who returns after
  // being away 3+ days, read from the streak record's existing
  // lastPlayDate (no new tracking needed). Distinct from the login
  // Streak, which rewards CONSECUTIVE days -- this specifically
  // re-engages a LAPSED player rather than an already-active one. Gated
  // to once per day via get-check-set, same pattern as claimBossWin.
  // =====================================================================
  const COMEBACK_BONUS_REWARD = { coins: 25, gems: 2 };
  const COMEBACK_MIN_DAYS_AWAY = 3;

  async function getComebackBonusStatus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { available: false };
    const [streakSnap, claimSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/streak`).get(),
      aigDb.ref(`players/${player.id}/comebackBonus/${todayKey()}`).get()
    ]);
    if (claimSnap.exists() && claimSnap.val()) return { available: false };
    if (!streakSnap.exists() || !streakSnap.val().lastPlayDate) return { available: false };
    const lastPlay = new Date(streakSnap.val().lastPlayDate + "T00:00:00Z");
    const daysSince = Math.floor((Date.now() - lastPlay.getTime()) / 86400000);
    return { available: daysSince >= COMEBACK_MIN_DAYS_AWAY, daysSince, reward: COMEBACK_BONUS_REWARD };
  }

  async function claimComebackBonus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const claimRef = aigDb.ref(`players/${player.id}/comebackBonus/${todayKey()}`);
    const claimSnap = await claimRef.get();
    if (claimSnap.exists() && claimSnap.val()) return { ok: true, alreadyClaimed: true };
    await claimRef.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + COMEBACK_BONUS_REWARD.coins;
      wallet.gems = (wallet.gems || 0) + COMEBACK_BONUS_REWARD.gems;
      return wallet;
    });
    return { ok: true, alreadyClaimed: false, reward: COMEBACK_BONUS_REWARD };
  }

  // =====================================================================
  // PRACTICE STREAK PER SUBJECT — separate from the login Streak above:
  // "how many days in a row have you gotten at least one question right
  // in THIS subject specifically", encouraging a weak subject to get
  // practiced regularly rather than always playing the favorite game.
  // Pure read/aggregation over players/{id}/dailyStats (already written
  // by touchDailyStats on every answer) -- zero new writes.
  // =====================================================================
  const SUBJECT_GAMES = {
    math: ["mathville", "multipleazka"],
    language: ["language-arts"],
    science: ["solarquest"]
  };

  function dayHasSubjectActivity(dailyStats, dateKey, games) {
    const day = dailyStats[dateKey];
    if (!day || !day.games) return false;
    return games.some(g => day.games[g]);
  }

  async function getSubjectStreaks() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { math: 0, language: 0, science: 0 };
    const snap = await aigDb.ref(`players/${player.id}/dailyStats`).get();
    const dailyStats = snap.exists() ? snap.val() : {};
    const result = {};
    Object.entries(SUBJECT_GAMES).forEach(([subject, games]) => {
      let streak = 0;
      const cursor = new Date();
      // If today has no activity yet for this subject, start checking
      // from yesterday instead -- otherwise an in-progress streak would
      // show as broken every day before the kid has played yet today.
      if (!dayHasSubjectActivity(dailyStats, todayKey(), games)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (!dayHasSubjectActivity(dailyStats, key, games)) break;
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      result[subject] = streak;
    });
    return result;
  }

  // =====================================================================
  // MISTAKE REVIEW REMINDER — the existing Mistake Journal (logMistake/
  // getMistakeJournal/markMistakeReviewed above) is a passive log with
  // no nudge to actually go back and look at it. This just counts
  // unreviewed entries so the hub can show "N mistakes to review" and
  // link into the same journal overlay that already exists.
  // =====================================================================
  async function getUnreviewedMistakeCount() {
    const entries = await getMistakeJournal();
    return entries.filter(m => !m.reviewed).length;
  }

  // =====================================================================
  // MYSTERY BOX — one paid spin per calendar day (10 coins), always
  // gives SOMETHING back (never a true "loss" -- this is for kids, not
  // a real gambling mechanic). Same get-check-set wallet pattern as
  // unlockCosmetic/redeemReward above.
  // =====================================================================
  const MYSTERY_BOX_COST = { coins: 10 };

  async function getMysteryBoxStatus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { opened: true, cost: MYSTERY_BOX_COST };
    const snap = await aigDb.ref(`players/${player.id}/mysteryBox/${todayKey()}`).get();
    return { opened: snap.exists() && snap.val() === true, cost: MYSTERY_BOX_COST };
  }

  async function openMysteryBox() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const dayRef = aigDb.ref(`players/${player.id}/mysteryBox/${todayKey()}`);
    const daySnap = await dayRef.get();
    if (daySnap.exists() && daySnap.val()) return { ok: false, reason: "already-opened" };

    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    if ((wallet.coins || 0) < MYSTERY_BOX_COST.coins) return { ok: false, reason: "insufficient-funds" };
    await walletRef.set({ ...wallet, coins: wallet.coins - MYSTERY_BOX_COST.coins });
    await dayRef.set(true);

    // Reward table -- mostly small coin/gem prizes, a rare card at the
    // tail end. Rolled AFTER the cost is already deducted so a lucky
    // roll can net more than the 10-coin spend, unlucky still gets
    // something (5-14 coins covers the cost either way on the most
    // common outcome).
    const roll = Math.random();
    let reward;
    if (roll < 0.5) reward = { type: "coins", amount: 5 + Math.floor(Math.random() * 10) };
    else if (roll < 0.8) reward = { type: "gems", amount: 1 };
    else if (roll < 0.95) reward = { type: "gems", amount: 3 };
    else reward = { type: "card" };

    if (reward.type === "card") {
      reward.cardId = await awardRandomCard("rare");
    } else {
      const freshSnap = await walletRef.get();
      const fresh = freshSnap.exists() ? freshSnap.val() : { coins: 0, gems: 0 };
      await walletRef.set({ ...fresh, [reward.type]: (fresh[reward.type] || 0) + reward.amount });
    }
    return { ok: true, reward };
  }

  // =====================================================================
  // EXPLORATION POINTS — SolarQuest's quest-path map ("static games more
  // playful" this round) already had a decorative starfield but nothing
  // to actually DO on the map besides tap a level node. These are a
  // handful of tappable space objects (comet/moon/satellite/asteroid)
  // scattered between level nodes -- tapping one the FIRST time reveals
  // a fun fact + a small one-time coin reward; already-discovered ones
  // stay tappable (kids can re-read the fact) but pay nothing again.
  // Stored as players/{id}/exploration/{id}: true, nested under the
  // already-open `players` path, no rules change needed.
  // =====================================================================
  const EXPLORATION_REWARD = { coins: 2 };
  const EXPLORATION_POINTS = {
    satellite: { emoji: "🛰️", fact: "The International Space Station orbits Earth every 90 minutes -- that's 16 sunrises a day!" },
    comet: { emoji: "☄️", fact: "A comet's tail always points AWAY from the Sun, no matter which direction the comet is moving." },
    moon: { emoji: "🌙", fact: "The Moon drifts about 3.8 cm farther from Earth every year -- roughly as fast as fingernails grow." },
    asteroid: { emoji: "🪨", fact: "Over 1 million asteroids are known in our solar system, mostly clustered in the belt between Mars and Jupiter." }
  };
  function getExplorationPoints() { return EXPLORATION_POINTS; }

  async function getDiscoveredExploration() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return {};
    const snap = await aigDb.ref(`players/${player.id}/exploration`).get();
    return snap.exists() ? snap.val() : {};
  }

  // Same get-check-set pattern as unlockVehicle/openMysteryBox above.
  async function discoverExplorationPoint(id) {
    const point = EXPLORATION_POINTS[id];
    if (!point) return { ok: false };
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/exploration/${id}`);
    const snap = await ref.get();
    const alreadyFound = snap.exists() && !!snap.val();
    if (!alreadyFound) {
      await ref.set(true);
      const walletRef = aigDb.ref(`players/${player.id}/wallet`);
      const walletSnap = await walletRef.get();
      const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
      await walletRef.set({ ...wallet, coins: (wallet.coins || 0) + EXPLORATION_REWARD.coins });
    }
    return { ok: true, fact: point.fact, alreadyFound, reward: alreadyFound ? null : EXPLORATION_REWARD };
  }

  // =====================================================================
  // LEVEL-UP — a numeric level (separate from the 7-tier Title/Rank
  // above), derived from the SAME per-game XP totals Parent Portal
  // already sums for its "Progress by Game" section (players/{id}/
  // badges/{gameId}.xpTotal or .xp depending on the game) -- one read of
  // the whole `badges` node, no new Firebase writes needed anywhere.
  // =====================================================================
  const XP_PER_LEVEL = 50;

  function xpForGame(gameId, badges) {
    if (!badges) return 0;
    if (gameId === "language-arts") return badges.xpTotal || 0;
    if (gameId === "solarquest") return badges.xp || 0;
    if (gameId === "mathville") return badges.xpTotal || 0;
    return 0; // Math Race has no XP system, sticker badges only
  }

  async function getPlayerLevel() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/badges`).get();
    const badges = snap.exists() ? snap.val() : {};
    const totalXp = ["mathville", "language-arts", "solarquest"].reduce((sum, g) => sum + xpForGame(g, badges[g]), 0);
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    return { totalXp, level, xpIntoLevel: totalXp % XP_PER_LEVEL, xpForNextLevel: XP_PER_LEVEL };
  }

  // The 7 calendar dates (Monday..Sunday, YYYY-MM-DD) for the week whose
  // Monday is `mondayKey` -- shared helper for Perfect Week + Most
  // Improved below, both of which need to sum players/{id}/dailyStats
  // across a specific week.
  function weekDatesFor(mondayKey) {
    const monday = new Date(mondayKey + "T00:00:00Z");
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }
  function sumDailyStats(dailyStats, dates) {
    let correct = 0, wrong = 0, daysPlayed = 0;
    dates.forEach(d => {
      const day = dailyStats && dailyStats[d];
      if (!day) return;
      const c = day.correct || 0, w = day.wrong || 0;
      correct += c; wrong += w;
      if (c + w > 0) daysPlayed++;
    });
    return { correct, wrong, total: correct + wrong, daysPlayed };
  }

  // =====================================================================
  // PERFECT WEEK — how many of the CURRENT week's 7 days (so far) had
  // any play activity, reading players/{id}/dailyStats (same data Beat
  // Yesterday above already reads, just summed across more dates).
  // "Perfect" becomes true only once all 7 days have activity, which can
  // only happen once the week has actually run its full course.
  // =====================================================================
  async function getWeekPlayProgress() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const wk = weekKey();
    const dates = weekDatesFor(wk);
    const snap = await aigDb.ref(`players/${player.id}/dailyStats`).get();
    const dailyStats = snap.exists() ? snap.val() : {};
    const { daysPlayed } = sumDailyStats(dailyStats, dates);
    return { daysPlayed, totalDays: 7, perfect: daysPlayed === 7, weekKey: wk };
  }

  // =====================================================================
  // MOST IMPROVED — top 5 players by accuracy delta (this week's
  // accuracy minus last week's), NOT just raw correct-answer count like
  // the existing Weekly Leaderboard -- rewards a kid getting BETTER, not
  // just a kid who happens to play more. Reads the whole players/ tree
  // once (same technique getWeeklyLeaderboard/Kids' Quiz pool already
  // use), since dailyStats needed for the accuracy calc is nested under
  // every player anyway. Requires at least 5 attempts in EACH week to
  // qualify, so a single lucky/unlucky day can't swing the ranking.
  // =====================================================================
  const MOST_IMPROVED_MIN_ATTEMPTS = 5;

  async function getMostImproved() {
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return [];
    const all = snap.val();
    const thisWeekKey = weekKey();
    const lastMonday = new Date(thisWeekKey + "T00:00:00Z");
    lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
    const lastWeekKey = lastMonday.toISOString().slice(0, 10);
    const thisWeekDates = weekDatesFor(thisWeekKey);
    const lastWeekDates = weekDatesFor(lastWeekKey);

    const results = [];
    Object.entries(all).forEach(([id, data]) => {
      if (!data.dailyStats) return;
      const thisWeek = sumDailyStats(data.dailyStats, thisWeekDates);
      const lastWeek = sumDailyStats(data.dailyStats, lastWeekDates);
      if (thisWeek.total < MOST_IMPROVED_MIN_ATTEMPTS || lastWeek.total < MOST_IMPROVED_MIN_ATTEMPTS) return;
      const thisAcc = thisWeek.correct / thisWeek.total;
      const lastAcc = lastWeek.correct / lastWeek.total;
      // Same name source Weekly Leaderboard already relies on for
      // cross-player display names (touchWeeklyStats writes it there).
      const name = (data.weekly && data.weekly[thisWeekKey] && data.weekly[thisWeekKey].name) || "Player";
      results.push({ id, name, improvement: thisAcc - lastAcc, thisAccuracy: thisAcc, lastAccuracy: lastAcc });
    });
    results.sort((a, b) => b.improvement - a.improvement);
    return results.slice(0, 5);
  }

  // =====================================================================
  // PERSONAL GOAL — a kid-set weekly target ("answer 50 questions this
  // week"), distinct from the system-generated Daily Quests above.
  // Progress reuses the SAME players/{id}/weekly/{weekKey}.correct
  // counter the Weekly Leaderboard already maintains -- no new tracking
  // needed, just a stored target to compare it against. A goal only
  // applies to the week it was set for; a new week means no goal until
  // the kid sets a fresh one.
  // =====================================================================
  async function getPersonalGoal() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const wk = weekKey();
    const [goalSnap, weeklySnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/personalGoal`).get(),
      aigDb.ref(`players/${player.id}/weekly/${wk}`).get()
    ]);
    const goal = goalSnap.exists() ? goalSnap.val() : null;
    const progress = weeklySnap.exists() ? (weeklySnap.val().correct || 0) : 0;
    if (!goal || goal.weekKey !== wk) return { target: null, progress, weekKey: wk, achieved: false };
    return { target: goal.target, progress, weekKey: wk, achieved: progress >= goal.target };
  }

  async function setPersonalGoal(target) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const t = Math.max(1, Math.min(500, Math.round(target))); // sane bounds -- not zero/negative, not an impossible number
    await aigDb.ref(`players/${player.id}/personalGoal`).set({ target: t, weekKey: weekKey(), createdAt: firebase.database.ServerValue.TIMESTAMP });
    return { ok: true, target: t };
  }

  // =====================================================================
  // CUSTOM NICKNAME/TAGLINE — a short line a kid writes for themselves
  // (shown under their name once approved), same parent-moderation flow
  // as Kids' Quiz custom questions (players/{id}/customQuestions):
  // status starts "pending", a parent approves/rejects from Parent
  // Portal, only "approved" ever displays.
  // =====================================================================
  async function submitNickname(text) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const trimmed = String(text).trim().slice(0, 40);
    if (!trimmed) return { ok: false };
    await aigDb.ref(`players/${player.id}/nickname`).set({
      text: trimmed,
      status: "pending",
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true };
  }

  async function getNickname() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/nickname`).get();
    return snap.exists() ? snap.val() : null;
  }

  // =====================================================================
  // CLASS-WIDE SHARED GOAL — one collective progress bar for every kid
  // together (not a competition -- everyone contributes to the SAME
  // total), reusing the SAME players/{id}/weekly/{weekKey}.correct
  // counter Weekly Leaderboard/Most Improved already read, just summed
  // across every player instead of ranked individually. Fixed weekly
  // target (not stored anywhere -- a constant is simpler than a new
  // writable node, and this is a shared morale target, not something
  // that needs per-class tuning yet).
  // =====================================================================
  const CLASS_GOAL_TARGET = 500;

  async function getClassGoalProgress() {
    const wk = weekKey();
    const snap = await aigDb.ref("players").get();
    let progress = 0;
    if (snap.exists()) {
      Object.values(snap.val()).forEach(data => {
        if (data.weekly && data.weekly[wk]) progress += data.weekly[wk].correct || 0;
      });
    }
    return { progress, target: CLASS_GOAL_TARGET, weekKey: wk, achieved: progress >= CLASS_GOAL_TARGET };
  }

  // Weekly Recap -- a shareable "your week in review" summary (players are
  // explicitly meant to screenshot this to show a parent). Deliberately
  // mixes a true weekly delta (correct answers this week, from the same
  // counter getWeeklyLeaderboard uses) with a couple of all-time snapshots
  // (streak, wallet, collection size) rather than adding yet more
  // week-scoped counters for every single stat -- simpler, and still reads
  // as a meaningful "here's where you're at" card.
  async function getWeeklyRecap() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const wk = weekKey();
    const [weeklySnap, streak, wallet, collection] = await Promise.all([
      aigDb.ref(`players/${player.id}/weekly/${wk}`).get(),
      getStreak(),
      getWallet(),
      getCollection()
    ]);
    const weeklyCorrect = (weeklySnap.exists() && weeklySnap.val().correct) || 0;
    return {
      weekKey: wk,
      weeklyCorrect,
      streak: streak.count || 0,
      coins: wallet.coins || 0,
      gems: wallet.gems || 0,
      cardsOwned: Object.keys(collection.owned).length,
      cardsTotal: collection.pool.length
    };
  }

  // =====================================================================
  // END-OF-MONTH REPORT -- a bigger-cadence sibling to Weekly Recap
  // above, for a monthly "celebration" moment rather than a weekly
  // check-in. Reuses the Season Pass's existing SP counter (1 SP = 1
  // correct answer, ALREADY reset every calendar month at the same
  // seasonKey() boundary this needs) instead of re-aggregating
  // dailyStats by hand -- zero new writes or new monthly counters.
  // =====================================================================
  async function getMonthlyReport() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [battlePass, streak, wallet, collection, title, achievements] = await Promise.all([
      getBattlePass(), getStreak(), getWallet(), getCollection(), getTitle(), getAchievements()
    ]);
    const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return {
      monthLabel,
      monthlyCorrect: battlePass.sp,
      streak: streak.count || 0,
      bestStreak: streak.bestStreak || 0,
      coins: wallet.coins || 0,
      gems: wallet.gems || 0,
      cardsOwned: Object.keys(collection.owned).length,
      cardsTotal: collection.pool.length,
      title,
      achievementsUnlocked: achievements.filter(a => a.owned).length,
      achievementsTotal: achievements.length
    };
  }

  // =====================================================================
  // TITLES / RANK — a lifetime "how far along are you" badge, derived
  // purely from a running total of correct answers (cross-game, never
  // resets, unlike daily/weekly/season counters above). Nothing to claim
  // or buy -- it just IS whatever tier the count currently qualifies for.
  // =====================================================================
  const TITLE_TIERS = [
    { min: 0, name: "Pemula", emoji: "🌱" },
    { min: 20, name: "Rajin Belajar", emoji: "📘" },
    { min: 50, name: "Jagoan Matematika", emoji: "⚡" },
    { min: 100, name: "Bintang Kelas", emoji: "⭐" },
    { min: 200, name: "Master BrainBox", emoji: "🏅" },
    { min: 400, name: "Grandmaster", emoji: "👑" },
    { min: 800, name: "Legenda BrainBox", emoji: "🌟" }
  ];

  function titleForCount(count) {
    let result = TITLE_TIERS[0];
    for (const t of TITLE_TIERS) if (count >= t.min) result = t;
    return result;
  }

  function touchTotalCorrect() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    aigDb.ref(`players/${player.id}/totalCorrect`).transaction(cur => (cur || 0) + 1);
  }

  async function getTitle() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/totalCorrect`).get();
    const count = snap.exists() ? snap.val() : 0;
    const tier = titleForCount(count);
    const next = TITLE_TIERS.find(t => t.min > count) || null;
    return { count, name: tier.name, emoji: tier.emoji, next };
  }

  // Exposes the full 7-tier ladder (a plain constant, not player-specific)
  // for a "rank showcase" view -- getTitle() above only ever returns the
  // CURRENT tier + next, not the whole list to render alongside it.
  function getTitleTiers() { return TITLE_TIERS; }

  // =====================================================================
  // CUSTOM QUIZ QUESTIONS — a kid writes a multiple-choice question, a
  // parent approves it (via Parent Portal), then it joins a shared pool
  // other kids can play. Stored at players/{authorId}/customQuestions/{id}
  // -- nested under the already-explicit `players` rule like everything
  // else above, so no new top-level RTDB path/rules change is needed.
  // Cross-player discovery (getApprovedCustomQuestionPool) reads the whole
  // players/ tree once, same technique as getWeeklyLeaderboard.
  // =====================================================================
  // Caps how many of a kid's OWN questions can sit unreviewed at once --
  // the known gap this repo had documented (no submit limit at all)
  // meant a kid could flood a parent's approval queue with dozens of
  // pending questions in one sitting. Once a parent approves/rejects
  // some of the existing ones, the count drops back below the cap and
  // they can submit more -- this isn't a lifetime limit, just a queue
  // depth limit.
  const MAX_PENDING_CUSTOM_QUESTIONS = 10;

  async function submitCustomQuestion(prompt, options, correctIndex) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const snap = await aigDb.ref(`players/${player.id}/customQuestions`).get();
    const existing = snap.exists() ? Object.values(snap.val()) : [];
    const pendingCount = existing.filter(q => q.status === "pending").length;
    if (pendingCount >= MAX_PENDING_CUSTOM_QUESTIONS) {
      return { ok: false, reason: "too-many-pending" };
    }
    const ref = aigDb.ref(`players/${player.id}/customQuestions`).push();
    await ref.set({
      authorName: player.name,
      prompt,
      options,
      correctIndex,
      status: "pending",
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true, id: ref.key };
  }

  async function getMyCustomQuestions() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const snap = await aigDb.ref(`players/${player.id}/customQuestions`).get();
    if (!snap.exists()) return [];
    const data = snap.val();
    return Object.entries(data).map(([id, q]) => ({ id, ...q }));
  }

  // Pulls every OTHER player's approved questions into one pool -- a kid
  // plays questions their friends wrote, not their own. Excludes the
  // current player's own authored questions from the returned pool.
  async function getApprovedCustomQuestionPool() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return [];
    const all = snap.val();
    const pool = [];
    Object.entries(all).forEach(([playerId, data]) => {
      if (player && playerId === player.id) return;
      if (!data.customQuestions) return;
      Object.entries(data.customQuestions).forEach(([qId, q]) => {
        if (q.status === "approved") pool.push({ id: qId, authorId: playerId, ...q });
      });
    });
    return pool;
  }

  // =====================================================================
  // POWER-UPS — consumable single-use items bought with the same
  // coins/gems wallet, spent inside a normal MathVille round (never Boss
  // Challenge/Family Challenge, kept pure per those features' own design).
  // Stored as a plain count at players/{id}/powerups/{type} -- nested
  // under `players`, no rules change.
  // =====================================================================
  const POWERUP_DEFS = {
    fiftyFifty: { name: "50:50", cost: { coins: 8 }, emoji: "➗" },
    skip: { name: "Skip", cost: { coins: 12 }, emoji: "⏭️" },
    extraTime: { name: "Extra Time (+8s)", cost: { coins: 6 }, emoji: "⏳" },
    // Combo Insurance -- unlike the 3 above, never clicked manually: it's
    // auto-consumed by submitAnswer() the moment a wrong answer would
    // otherwise reset an active MathVille combo streak (state.combo >= 2)
    // back to 0. Framed as "insurance" because it protects a run already
    // in progress rather than granting an action, so it stays in this
    // same consumable-stock system instead of the permanent Upgrades tab.
    comboShield: { name: "Combo Insurance", cost: { coins: 10 }, emoji: "🛡️" }
  };

  function getPowerupDefs() { return POWERUP_DEFS; }

  async function getPowerups() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { fiftyFifty: 0, skip: 0, extraTime: 0, comboShield: 0 };
    const snap = await aigDb.ref(`players/${player.id}/powerups`).get();
    const data = snap.exists() ? snap.val() : {};
    return { fiftyFifty: data.fiftyFifty || 0, skip: data.skip || 0, extraTime: data.extraTime || 0, comboShield: data.comboShield || 0 };
  }

  // Same get-check-set pattern as unlockVehicle/unlockCosmetic above.
  async function buyPowerup(type) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const def = POWERUP_DEFS[type];
    if (!def) return { ok: false };
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    const coinsCost = def.cost.coins || 0;
    const gemsCost = def.cost.gems || 0;
    if ((wallet.coins || 0) < coinsCost || (wallet.gems || 0) < gemsCost) {
      return { ok: false, reason: "insufficient-funds" };
    }
    await walletRef.set({
      ...wallet,
      coins: Math.max(0, (wallet.coins || 0) - coinsCost),
      gems: Math.max(0, (wallet.gems || 0) - gemsCost)
    });
    await aigDb.ref(`players/${player.id}/powerups/${type}`).transaction(cur => (cur || 0) + 1);
    return { ok: true };
  }

  // Plain get-then-set (not a transaction) -- same narrow accepted race as
  // the wallet functions above, fine for a consumable with no real money.
  async function usePowerup(type) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/powerups/${type}`);
    const snap = await ref.get();
    const count = snap.exists() ? snap.val() : 0;
    if (count <= 0) return { ok: false };
    await ref.set(count - 1);
    return { ok: true, remaining: count - 1 };
  }

  // =====================================================================
  // UPGRADES — permanent, one-time purchases with real gameplay effects
  // inside a specific game mode (not cosmetic, and not consumed on use
  // like POWER-UPS above). Bought with the same coins/gems wallet.
  // Stored as booleans at players/{id}/upgrades/{id} -- nested under
  // `players`, no rules change. Each game mode reads ownership once via
  // getUpgrades() at launch (see mathville/script.js's ownedUpgrades
  // cache) rather than re-fetching mid-round.
  // =====================================================================
  // `game` groups the flat list below into per-game "branches" for the
  // hub's Upgrades tab (see UPGRADE_GAME_LABELS + renderUpgradeShop in
  // index.html) -- a lightweight "Skill Tree" presentation over what is
  // still one flat catalog/purchase system underneath, not a second
  // backend. Order within a game roughly reflects a natural pick order
  // (utility before power) but nothing here enforces prerequisites --
  // every item is independently purchasable, same as before this batch.
  const UPGRADE_CATALOG = {
    "drive-watergun-range": { name: "Water Gun Range+", emoji: "💦", cost: { coins: 60 }, desc: "Hose reaches ~30% farther in Drive Mode.", game: "drive" },
    "drive-nitro-tank": { name: "Nitro Tank+", emoji: "🔋", cost: { coins: 60 }, desc: "Nitro drains slower & refills faster in Drive Mode.", game: "drive" },
    "plane-shield-start": { name: "Shield Booster", emoji: "🛡️", cost: { coins: 80 }, desc: "Start Plane Mode with 1 extra life.", game: "plane" },
    "plane-rapidfire-core": { name: "Rapid-Fire Core", emoji: "🔫", cost: { gems: 3 }, desc: "Permanently fire faster in Plane Mode.", game: "plane" },
    "ninja-extra-life": { name: "Extra Life Charm", emoji: "❤️", cost: { coins: 80 }, desc: "Start Ninja Runner with 1 extra life.", game: "ninja" },
    "bossrush-extra-hp": { name: "Starting Heal", emoji: "💚", cost: { gems: 3 }, desc: "Start Boss Rush Arena with +10 max HP.", game: "bossrush" },
    "cheer-emoji-pack": { name: "Reaction Pack", emoji: "🎉", cost: { coins: 40 }, desc: "Unlock 4 more emoji reactions in MathVille multiplayer.", game: "multiplayer" },
    // ---- Tier 2 -- a real prerequisite chain (checked in unlockUpgrade
    // below), the first actual "tree" dependency among these Upgrades
    // rather than a flat list of independently-buyable items. Each
    // REPLACES its tier 1 effect with a stronger one (checked in the
    // game code as "tier2 owned? use tier2 : tier1 owned? use tier1 :
    // base"), not stacked additively on top of it.
    "drive-watergun-range-2": { name: "Water Gun Range++", emoji: "💦", cost: { coins: 70 }, desc: "Hose reaches ~60% farther in Drive Mode. Requires Water Gun Range+.", game: "drive", requires: "drive-watergun-range" },
    "drive-nitro-tank-2": { name: "Nitro Tank++", emoji: "🔋", cost: { coins: 70 }, desc: "Nitro drains even slower & refills even faster. Requires Nitro Tank+.", game: "drive", requires: "drive-nitro-tank" },
    "plane-shield-start-2": { name: "Shield Booster++", emoji: "🛡️", cost: { gems: 3 }, desc: "Start Plane Mode with 2 extra lives instead of 1. Requires Shield Booster.", game: "plane", requires: "plane-shield-start" },
    "plane-rapidfire-core-2": { name: "Rapid-Fire Core++", emoji: "🔫", cost: { gems: 3 }, desc: "Fire even faster in Plane Mode. Requires Rapid-Fire Core.", game: "plane", requires: "plane-rapidfire-core" },
    "ninja-extra-life-2": { name: "Extra Life Charm++", emoji: "❤️", cost: { coins: 90 }, desc: "Start Ninja Runner with 2 extra lives instead of 1. Requires Extra Life Charm.", game: "ninja", requires: "ninja-extra-life" },
    "bossrush-extra-hp-2": { name: "Starting Heal++", emoji: "💚", cost: { gems: 3 }, desc: "Start Boss Rush Arena with +20 max HP instead of +10. Requires Starting Heal.", game: "bossrush", requires: "bossrush-extra-hp" }
  };
  const UPGRADE_GAME_LABELS = {
    drive: "🚗 Drive Mode",
    plane: "✈️ Plane Mode",
    ninja: "🥷 Ninja Runner",
    bossrush: "🥊 Boss Rush Arena",
    multiplayer: "🤝 Multiplayer"
  };
  function getUpgradeGameLabels() { return UPGRADE_GAME_LABELS; }

  function getUpgradeDefs() { return UPGRADE_CATALOG; }

  async function getUpgrades() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return {};
    const snap = await aigDb.ref(`players/${player.id}/upgrades`).get();
    return snap.exists() ? snap.val() : {};
  }

  // Same get-check-set pattern as unlockVehicle/buyPowerup above -- see
  // the wallet-transaction gotcha documented near unlockVehicle for why
  // this isn't a .transaction() on the wallet.
  async function unlockUpgrade(id) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const def = UPGRADE_CATALOG[id];
    if (!def) return { ok: false };
    const ownedRef = aigDb.ref(`players/${player.id}/upgrades/${id}`);
    const ownedSnap = await ownedRef.get();
    if (ownedSnap.exists() && ownedSnap.val()) return { ok: true, alreadyOwned: true };
    // Tier 2 prerequisite -- checked against the SAME upgrades node
    // (not a separate read), so a tier 2 can never be bought without
    // its tier 1 already owned even if the UI's own disabled-button
    // guard were somehow bypassed.
    if (def.requires) {
      const prereqSnap = await aigDb.ref(`players/${player.id}/upgrades/${def.requires}`).get();
      if (!prereqSnap.exists() || !prereqSnap.val()) return { ok: false, reason: "missing-prerequisite" };
    }
    const walletRef = aigDb.ref(`players/${player.id}/wallet`);
    const walletSnap = await walletRef.get();
    const wallet = walletSnap.exists() ? walletSnap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
    const coinsCost = def.cost.coins || 0;
    const gemsCost = def.cost.gems || 0;
    if ((wallet.coins || 0) < coinsCost || (wallet.gems || 0) < gemsCost) {
      return { ok: false, reason: "insufficient-funds" };
    }
    await walletRef.set({
      ...wallet,
      coins: Math.max(0, (wallet.coins || 0) - coinsCost),
      gems: Math.max(0, (wallet.gems || 0) - gemsCost)
    });
    await ownedRef.set(true);
    return { ok: true };
  }

  // =====================================================================
  // SPEED ROUND — a personal best score, plus its own cross-player
  // leaderboard (separate from the per-game all-time and weekly ones in
  // leaderboard.html). Stored at players/{id}/speedRoundBest = {score,
  // name} -- name stored alongside the score (same trick as
  // players/{id}/weekly/{weekKey}) so the leaderboard read below doesn't
  // need a second lookup per player just to show a name.
  // =====================================================================
  async function submitSpeedRoundScore(score) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/speedRoundBest`);
    const snap = await ref.get();
    const best = snap.exists() ? snap.val().score : 0;
    if (score > best) {
      await ref.set({ score, name: player.name });
      return { ok: true, newBest: true, best: score };
    }
    return { ok: true, newBest: false, best };
  }

  // Same one-time whole-tree read as getWeeklyLeaderboard above --
  // acceptable for a small class roster, opened rarely (a leaderboard tab
  // flip), not on every hub load.
  async function getSpeedRoundLeaderboard() {
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return [];
    const all = snap.val();
    return Object.entries(all)
      .filter(([, data]) => data.speedRoundBest && data.speedRoundBest.score > 0)
      .map(([id, data]) => ({ id, name: data.speedRoundBest.name || id, best: data.speedRoundBest.score }))
      .sort((a, b) => b.best - a.best)
      .slice(0, 20);
  }

  // =====================================================================
  // MASTERY + SMART PRACTICE — purely informational, built entirely from
  // topicStats already tracked by recordTopicAttempt above. NEVER gates
  // access to anything (MathVille chapters stay unlocked, always -- see
  // CLAUDE.md). A topic is "mastered" once it's been answered reliably;
  // Smart Practice picks the single most useful topic to revisit next by
  // combining "weak" (low accuracy) and "stale" (got it wrong and never
  // came back to fix it) into one signal.
  // =====================================================================
  const MASTERY_STREAK = 5;         // 5 correct in a row at any point -> mastered
  const MASTERY_MIN_ATTEMPTS = 5;
  const MASTERY_ACCURACY = 0.85;
  const WEAK_MIN_ATTEMPTS = 3;
  const WEAK_ACCURACY = 0.7;        // same threshold as dashboard.js/parents/script.js's own weakTopicsFor

  function isTopicMastered(data) {
    if (!data) return false;
    if ((data.streak || 0) >= MASTERY_STREAK) return true;
    const total = (data.correct || 0) + (data.wrong || 0);
    return total >= MASTERY_MIN_ATTEMPTS && (data.correct || 0) / total >= MASTERY_ACCURACY;
  }

  // {topicKey: true/false} for every topic this player has attempted in
  // ONE game -- e.g. MathVille's Town Map uses this to show a mastery
  // star on top of its existing "played at least once" checkmark.
  async function getMasteryMap(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return {};
    const snap = await aigDb.ref(`players/${player.id}/topicStats/${gameId}`).get();
    if (!snap.exists()) return {};
    const result = {};
    Object.entries(snap.val()).forEach(([topic, data]) => { result[topic] = isTopicMastered(data); });
    return result;
  }

  // Only mathville/solarquest topics are eligible for a "Practice Now"
  // deep link -- their topicStats key IS the Focus Round topic id
  // directly (e.g. "place-value", "star-lifecycle"). language-arts is
  // deliberately excluded: azkacraft/questions.json's 3 grammar chapters
  // (Prefixes & Suffixes / Contractions / Capitalization) all share the
  // SAME topicStats key ("Grammar", from questions.json's `topic` field)
  // for tracking-simplicity reasons unrelated to this feature -- so a
  // "Grammar" weak-spot can't be resolved back to one specific Focus
  // Round chapter (3, 4, or 5) to deep-link into. Math Race's times-N/
  // divby-N topics never had a Focus Round entry to begin with.
  const SMART_PRACTICE_PREFIX = { mathville: "math", solarquest: "sci" };

  async function getSmartPractice() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/topicStats`).get();
    if (!snap.exists()) return null;
    const allStats = snap.val();
    const candidates = [];
    Object.entries(allStats).forEach(([gameId, topics]) => {
      const prefix = SMART_PRACTICE_PREFIX[gameId];
      if (!prefix) return;
      Object.entries(topics).forEach(([topic, data]) => {
        const correct = data.correct || 0, wrong = data.wrong || 0, total = correct + wrong;
        if (total < WEAK_MIN_ATTEMPTS) return;
        const accuracy = correct / total;
        const isWeak = accuracy < WEAK_ACCURACY;
        const isStale = (data.streak || 0) === 0 && !!data.lastWrongAt; // got it wrong at some point and hasn't fixed it since
        if (!isWeak && !isStale) return;
        candidates.push({ gameId, topic, topicKey: `${prefix}:${topic}`, accuracy, total, lastWrongAt: data.lastWrongAt || 0 });
      });
    });
    if (!candidates.length) return null;
    // Lowest accuracy first; ties broken by whichever mistake is OLDER
    // (been wrong the longest without being revisited).
    candidates.sort((a, b) => a.accuracy - b.accuracy || a.lastWrongAt - b.lastWrongAt);
    return candidates[0];
  }

  // =====================================================================
  // DIAGNOSTIC QUIZ — a one-time (repeatable) 10-question mixed-difficulty
  // check-in, purely advisory (never gates anything). Stored at
  // players/{id}/diagnostic so the hub knows whether to still offer it.
  // =====================================================================
  async function submitDiagnosticResult(result) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/diagnostic`).set({
      ...result,
      completedAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true };
  }

  async function getDiagnosticResult() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const snap = await aigDb.ref(`players/${player.id}/diagnostic`).get();
    return snap.exists() ? snap.val() : null;
  }

  // =====================================================================
  // MATH HOOPS (basketball/) — a one-time-per-round bonus on top of the
  // per-question currency recordTopicAttempt("basketball", ...) already
  // pays out. Tiered on shots MADE (the mini-game's own skill layer), not
  // on questions answered right (which is what already earns the regular
  // per-answer coin/gem trickle) -- so a kid who knows the math but airballs
  // every shot still gets normal per-answer credit, but the extra flourish
  // here is for actually being good at the basketball part too. Same
  // additive .transaction() as awardCurrency()/awardTeachBoBonus() above,
  // never a spend, so no abort-on-null-cache risk.
  // =====================================================================
  function basketballBonusFor(made, total) {
    const pct = made / total;
    if (pct >= 1) return { coins: 15, gems: 1 };
    if (pct >= 0.8) return { coins: 10, gems: 0 };
    if (pct >= 0.5) return { coins: 5, gems: 0 };
    return null;
  }
  async function awardBasketballRoundBonus(made, total) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = basketballBonusFor(made, total);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // MEMORY MATCH (memory-match/) — same one-time-per-round bonus pattern
  // as Math Hoops above, tiered on MOVES used (fewer is better) instead of
  // shots made. 8 pairs need a minimum of 8 moves for a flawless game, so
  // the tiers are calibrated around that floor rather than a percentage.
  // =====================================================================
  function memoryMatchBonusFor(moves) {
    if (moves <= 12) return { coins: 15, gems: 1 };
    if (moves <= 18) return { coins: 10, gems: 0 };
    if (moves <= 26) return { coins: 5, gems: 0 };
    return null;
  }
  async function awardMemoryMatchBonus(moves) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = memoryMatchBonusFor(moves);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // TREASURE DIG (treasure-dig/) — two separate reward paths, unlike
  // Math Hoops/Memory Match's single round-end bonus. Loot is awarded
  // PER LEVEL dug (immediate, variable -- sometimes nothing, sometimes a
  // gem) via awardTreasureDigLoot(), a plain additive grant same as
  // awardTeachBoBonus() above. The round-end bonus below is a SEPARATE,
  // smaller top-up tiered on max depth reached, same pattern as the other
  // games' round-end bonuses -- the two don't overlap in purpose (loot
  // rewards the moment-to-moment digging, the round bonus rewards overall
  // depth reached).
  // =====================================================================
  async function awardTreasureDigLoot(coins, gems) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (coins || 0);
      wallet.gems = (wallet.gems || 0) + (gems || 0);
      return wallet;
    });
    return { ok: true };
  }
  function treasureDigBonusFor(depth, total) {
    if (depth >= total) return { coins: 10, gems: 1 };
    if (depth >= total * 0.7) return { coins: 5, gems: 0 };
    if (depth >= total * 0.4) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardTreasureDigRoundBonus(depth, total) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = treasureDigBonusFor(depth, total);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // NUMBER LINE LONG JUMP (number-line-jump/) — same one-time-per-round
  // bonus pattern as the other new mini-games, tiered on exact landings
  // ("hits") out of 10 questions.
  // =====================================================================
  function numberLineJumpBonusFor(hits, total) {
    const pct = hits / total;
    if (pct >= 0.9) return { coins: 15, gems: 1 };
    if (pct >= 0.6) return { coins: 10, gems: 0 };
    if (pct >= 0.3) return { coins: 5, gems: 0 };
    return null;
  }
  async function awardNumberLineJumpBonus(hits, total) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = numberLineJumpBonusFor(hits, total);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // MATH TENNIS (math-tennis/) — same one-time-per-round bonus pattern as
  // the other new mini-games, tiered on rally points won out of 10.
  // =====================================================================
  function mathTennisBonusFor(points, total) {
    const pct = points / total;
    if (pct >= 0.9) return { coins: 15, gems: 1 };
    if (pct >= 0.6) return { coins: 10, gems: 0 };
    if (pct >= 0.3) return { coins: 5, gems: 0 };
    return null;
  }
  async function awardMathTennisBonus(points, total) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = mathTennisBonusFor(points, total);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // FORTRESS MATH (fortress-math/) — same one-time-per-round bonus
  // pattern as the other new mini-games, tiered on waves cleared PLUS a
  // top tier that also requires ending with most of the fortress's HP
  // intact (a flawless defense), not just technically surviving.
  // =====================================================================
  function fortressMathBonusFor(wavesCleared, totalWaves, hpRemaining) {
    if (wavesCleared >= totalWaves && hpRemaining >= 4) return { coins: 15, gems: 1 };
    if (wavesCleared >= totalWaves) return { coins: 10, gems: 0 };
    if (wavesCleared >= Math.ceil(totalWaves * 0.6)) return { coins: 5, gems: 0 };
    return null;
  }
  async function awardFortressMathBonus(wavesCleared, totalWaves, hpRemaining) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = fortressMathBonusFor(wavesCleared, totalWaves, hpRemaining);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // SEASONAL EVENTS — a handful of date-ranged banners (real Indonesian
  // school-calendar moments), each with a flat ONE-TIME claim per event id
  // per player, tracked at players/{id}/seasonalClaims/{eventId}. No
  // cosmetic reskinning (that would need actual new art per event) --
  // scoped down to "a banner + a bonus you can claim once while it's
  // running", same spirit as Bonus Hour/Weekend Bonus above but tied to a
  // calendar date range instead of a recurring daily/weekly window.
  // Month/day only (no year) so the same config works every year without
  // needing an annual edit; date ranges are deliberately kept within a
  // single calendar year (no Dec->Jan wraparound) to keep the comparison
  // simple.
  // =====================================================================
  const SEASONAL_EVENTS = [
    { id: "tahun-ajaran-baru", name: "Tahun Ajaran Baru", emoji: "🎒", startMonth: 7, startDay: 1, endMonth: 7, endDay: 20, coins: 20, gems: 1 },
    { id: "kemerdekaan", name: "Kemerdekaan RI", emoji: "🇮🇩", startMonth: 8, startDay: 14, endMonth: 8, endDay: 20, coins: 17, gems: 1 },
    { id: "semangat-september", name: "Semangat September", emoji: "📚", startMonth: 9, startDay: 1, endMonth: 9, endDay: 30, coins: 15, gems: 0 },
    { id: "hari-pahlawan", name: "Hari Pahlawan", emoji: "🎖️", startMonth: 11, startDay: 8, endMonth: 11, endDay: 12, coins: 15, gems: 1 },
    { id: "akhir-tahun", name: "Akhir Tahun", emoji: "🎉", startMonth: 12, startDay: 24, endMonth: 12, endDay: 31, coins: 25, gems: 2 }
  ];

  function findActiveSeasonalEventConfig(now) {
    const month = now.getMonth() + 1, day = now.getDate();
    return SEASONAL_EVENTS.find(e => {
      const afterStart = month > e.startMonth || (month === e.startMonth && day >= e.startDay);
      const beforeEnd = month < e.endMonth || (month === e.endMonth && day <= e.endDay);
      return afterStart && beforeEnd;
    }) || null;
  }

  async function getActiveSeasonalEvent() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const event = findActiveSeasonalEventConfig(new Date());
    if (!event) return null;
    const snap = await aigDb.ref(`players/${player.id}/seasonalClaims/${event.id}`).get();
    return { ...event, claimed: snap.exists() && snap.val() === true };
  }

  async function claimSeasonalEvent(eventId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const event = SEASONAL_EVENTS.find(e => e.id === eventId);
    if (!event) return { ok: false, reason: "unknown-event" };
    const claimRef = aigDb.ref(`players/${player.id}/seasonalClaims/${eventId}`);
    const already = await claimRef.get();
    if (already.exists() && already.val() === true) return { ok: false, reason: "already-claimed" };
    await claimRef.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (event.coins || 0);
      wallet.gems = (wallet.gems || 0) + (event.gems || 0);
      return wallet;
    });
    return { ok: true, event };
  }

  // =====================================================================
  // ASYNC DUEL (duel/) — challenge a friend to the SAME 10-question set,
  // async (they don't need to be online at the same time, unlike Math
  // Race's real-time multiplayer). The sender plays first, then the
  // question set + sender's score is written to the RECIPIENT's own
  // inbox; the recipient plays the identical set later, and whichever
  // client resolves it (always the recipient's, since only they know
  // their own score) writes the outcome back to BOTH sides' wallets and
  // to the sender's results list. This app has no per-player write
  // restriction in its RTDB rules (no Firebase Auth, just a lightweight
  // PIN system -- see CLAUDE.md), so a client writing to another
  // player's wallet/inbox is the same trust model every other
  // cross-player feature here already uses (Class Goal, Weekly
  // Leaderboard, Kids' Quiz approval, etc).
  // =====================================================================
  const DUEL_WIN_BONUS = { coins: 5 };
  const DUEL_TIE_BONUS = { coins: 2 };

  function sanitizeNameKey(name) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function sendDuelChallenge(friendName, questions, fromScore) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false, reason: "no-player" };
    const toId = sanitizeNameKey(friendName);
    if (!toId || toId === player.id) return { ok: false, reason: "invalid-name" };
    const toAccountSnap = await aigDb.ref(`testerAccounts/${toId}`).get();
    if (!toAccountSnap.exists()) return { ok: false, reason: "friend-not-found" };
    const duelRef = aigDb.ref(`players/${toId}/duelInbox`).push();
    await duelRef.set({
      fromId: player.id,
      fromName: player.name,
      questions,
      fromScore,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true, toName: toAccountSnap.val().name || friendName };
  }

  async function getDuelInbox() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const snap = await aigDb.ref(`players/${player.id}/duelInbox`).get();
    if (!snap.exists()) return [];
    const out = [];
    snap.forEach(child => out.push({ id: child.key, ...child.val() }));
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function getDuelSentResults() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return [];
    const snap = await aigDb.ref(`players/${player.id}/duelSentResults`).get();
    if (!snap.exists()) return [];
    const out = [];
    snap.forEach(child => out.push({ id: child.key, ...child.val() }));
    return out.sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));
  }

  async function dismissDuelResult(duelId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    await aigDb.ref(`players/${player.id}/duelSentResults/${duelId}`).remove();
    return { ok: true };
  }

  // Called by the RECIPIENT's client right after they finish playing the
  // shared question set. `duel` is the exact inbox entry object (already
  // has fromId/fromName/fromScore) so this doesn't need a second read.
  async function resolveDuelChallenge(duel, toScore) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const fromScore = duel.fromScore;
    const outcome = toScore > fromScore ? "to" : toScore < fromScore ? "from" : "tie";

    async function addBonus(playerId, bonus) {
      if (!bonus) return;
      await aigDb.ref(`players/${playerId}/wallet`).transaction(cur => {
        const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
        wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
        wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
        return wallet;
      });
    }
    if (outcome === "tie") {
      await Promise.all([addBonus(duel.fromId, DUEL_TIE_BONUS), addBonus(player.id, DUEL_TIE_BONUS)]);
    } else {
      const winnerId = outcome === "to" ? player.id : duel.fromId;
      await addBonus(winnerId, DUEL_WIN_BONUS);
    }

    await aigDb.ref(`players/${duel.fromId}/duelSentResults/${duel.id}`).set({
      toName: player.name,
      fromScore,
      toScore,
      outcome, // "to" = recipient won, "from" = sender won, "tie"
      resolvedAt: firebase.database.ServerValue.TIMESTAMP
    });
    await aigDb.ref(`players/${player.id}/duelInbox/${duel.id}`).remove();
    return { ok: true, outcome, fromScore, toScore };
  }

  // =====================================================================
  // ESCAPE THE VAULT (escape-room/) — same one-time-per-round bonus
  // pattern as the other new mini-games, tiered on doors escaped, with
  // an extra top tier for escaping ALL doors with time to spare (a
  // combo-lock game rewards a clean escape, not just survival).
  // =====================================================================
  function escapeRoomBonusFor(roomsCleared, totalRooms, secondsLeftIfEscaped) {
    if (roomsCleared >= totalRooms && secondsLeftIfEscaped >= 60) return { coins: 20, gems: 2 };
    if (roomsCleared >= totalRooms) return { coins: 15, gems: 1 };
    if (roomsCleared >= Math.ceil(totalRooms * 0.6)) return { coins: 8, gems: 0 };
    if (roomsCleared >= 2) return { coins: 3, gems: 0 };
    return null;
  }
  async function awardEscapeRoomBonus(roomsCleared, totalRooms, secondsLeftIfEscaped) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = escapeRoomBonusFor(roomsCleared, totalRooms, secondsLeftIfEscaped);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // QUIZ SHOW LIVE (quiz-show/) — same one-time-per-round bonus pattern,
  // scaled from the in-game "prize" reached (a dramatic $10-$500 ladder,
  // not real currency) down to a modest coins/gems grant. Reaching the
  // top prize ($500) is the only way to earn gems here.
  // =====================================================================
  function quizShowBonusFor(finalPrize, topPrize) {
    if (finalPrize >= topPrize) return { coins: 20, gems: 2 };
    if (finalPrize >= 150) return { coins: 12, gems: 0 };
    if (finalPrize >= 75) return { coins: 6, gems: 0 };
    if (finalPrize >= 20) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardQuizShowBonus(finalPrize, topPrize) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = quizShowBonusFor(finalPrize, topPrize);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // MONSTER CATCH & BATTLE (monster-battle/) — catch-quality + battle
  // outcome bonus. Winning the full battle is the main gem source;
  // catching monsters without winning still gives a small consolation.
  // =====================================================================
  function monsterBattleBonusFor(monstersCaught, totalCatchRounds, battleWon) {
    if (battleWon && monstersCaught >= totalCatchRounds) return { coins: 20, gems: 2 };
    if (battleWon) return { coins: 12, gems: 1 };
    if (monstersCaught >= 3) return { coins: 6, gems: 0 };
    if (monstersCaught >= 1) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardMonsterBattleBonus(monstersCaught, totalCatchRounds, battleWon) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = monsterBattleBonusFor(monstersCaught, totalCatchRounds, battleWon);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // CITY BUILDER (city-builder/) — the one PM Round 4 game with PERSISTENT
  // progress: players/{id}/cityBuilder/{bricks, totalEarned, grid}. `bricks`
  // is spendable, `totalEarned` is lifetime (never decreases, gates which
  // building types the UI shows as unlocked). `grid` maps plot index
  // (string) -> buildingId, present only for occupied plots (sparse RTDB
  // object, not a JS array with holes -- avoids the array/null gotcha).
  // =====================================================================
  function cbEmptyCity() { return { bricks: 0, totalEarned: 0, grid: {} }; }

  async function getCityBuilder() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return cbEmptyCity();
    const snap = await aigDb.ref(`players/${player.id}/cityBuilder`).get();
    if (!snap.exists()) return cbEmptyCity();
    const val = snap.val();
    return { bricks: val.bricks || 0, totalEarned: val.totalEarned || 0, grid: val.grid || {} };
  }

  // Pure additive grant (bricks earned from a round) -- safe as a
  // .transaction() since it never aborts, same reasoning as awardCurrency.
  async function awardCityBuilderBricks(bricksEarned) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/cityBuilder`);
    await ref.transaction(cur => {
      const data = cur || cbEmptyCity();
      data.bricks = (data.bricks || 0) + bricksEarned;
      data.totalEarned = (data.totalEarned || 0) + bricksEarned;
      return data;
    });
    const snap = await ref.get();
    const val = snap.exists() ? snap.val() : cbEmptyCity();
    // Firebase RTDB never persists an empty object -- grid:{} (no plots
    // placed yet) simply doesn't come back as a key at all, so this must
    // default it explicitly rather than trust val.grid to exist.
    return { ok: true, data: { bricks: val.bricks || 0, totalEarned: val.totalEarned || 0, grid: val.grid || {} } };
  }

  // Spends bricks to occupy a plot -- get()-check-set (NOT .transaction()),
  // same pattern/reasoning as unlockVehicle above (aborting transactions on
  // this app instance don't retry with the real server value).
  async function placeCityBuilding(plotIndex, buildingId, cost) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/cityBuilder`);
    const snap = await ref.get();
    const data = snap.exists() ? snap.val() : cbEmptyCity();
    const grid = data.grid || {};
    if (grid[String(plotIndex)]) return { ok: false, reason: "occupied" };
    if ((data.bricks || 0) < cost) return { ok: false, reason: "insufficient-bricks" };
    grid[String(plotIndex)] = buildingId;
    const newData = { bricks: (data.bricks || 0) - cost, totalEarned: data.totalEarned || 0, grid };
    await ref.set(newData);
    return { ok: true, data: newData };
  }

  function cityBuilderBonusFor(correctCount, totalRounds) {
    if (correctCount >= totalRounds) return { coins: 15, gems: 1 };
    if (correctCount >= totalRounds * 0.7) return { coins: 8, gems: 0 };
    if (correctCount >= totalRounds * 0.4) return { coins: 4, gems: 0 };
    if (correctCount >= 1) return { coins: 1, gems: 0 };
    return null;
  }
  async function awardCityBuilderBonus(correctCount, totalRounds) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = cityBuilderBonusFor(correctCount, totalRounds);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // BOSS RUSH ARENA (boss-rush/) — one-time-per-round bonus scaled by how
  // many of the 4 bosses were defeated and how much HP was left at the
  // end (clearing the gauntlet with HP to spare is the top tier).
  // =====================================================================
  function bossRushBonusFor(bossesDefeated, totalBosses, hpRemaining, hpMax) {
    if (bossesDefeated >= totalBosses && hpRemaining >= hpMax * 0.5) return { coins: 20, gems: 2 };
    if (bossesDefeated >= totalBosses) return { coins: 14, gems: 1 };
    if (bossesDefeated >= 2) return { coins: 6, gems: 0 };
    if (bossesDefeated >= 1) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardBossRushBonus(bossesDefeated, totalBosses, hpRemaining, hpMax) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = bossRushBonusFor(bossesDefeated, totalBosses, hpRemaining, hpMax);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // BOSS RUSH ARENA — DAILY CHALLENGE: a bonus ON TOP of the per-run
  // awardBossRushBonus above, once per calendar day, for clearing the
  // full 4-boss gauntlet. Distinct from MathVille's separate "Weekly
  // Boss Rush" (a cross-chapter gauntlet gated weekly) -- this one is
  // scoped to the standalone boss-rush/ game and resets daily. Same
  // get-check-set gate pattern as claimBossWin/claimWeeklyBossRush; the
  // wallet credit itself uses .transaction() like awardBossRushBonus
  // above since it's a pure increment (never aborts, so immune to the
  // null-cache abort bug documented on unlockVehicle()).
  // =====================================================================
  const BOSS_RUSH_DAILY_REWARD = { coins: 15, gems: 1 };

  async function getBossRushDailyStatus() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { claimed: true, reward: BOSS_RUSH_DAILY_REWARD };
    const snap = await aigDb.ref(`players/${player.id}/bossRushDailyWins/${todayKey()}`).get();
    return { claimed: snap.exists() && snap.val() === true, reward: BOSS_RUSH_DAILY_REWARD };
  }

  async function claimBossRushDaily() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const winRef = aigDb.ref(`players/${player.id}/bossRushDailyWins/${todayKey()}`);
    const winSnap = await winRef.get();
    if (winSnap.exists() && winSnap.val()) return { ok: true, alreadyClaimed: true };
    await winRef.set(true);
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + BOSS_RUSH_DAILY_REWARD.coins;
      wallet.gems = (wallet.gems || 0) + BOSS_RUSH_DAILY_REWARD.gems;
      return wallet;
    });
    return { ok: true, alreadyClaimed: false, reward: BOSS_RUSH_DAILY_REWARD };
  }

  // =====================================================================
  // DANCE BATTLE (dance-battle/) — one-time-per-round bonus scaled by
  // final rhythm score and which tempo tier was reached by round's end.
  // =====================================================================
  function danceBattleBonusFor(score, tierIndex, totalTiers) {
    if (tierIndex >= totalTiers - 1 && score >= 2000) return { coins: 18, gems: 2 };
    if (score >= 1500) return { coins: 10, gems: 1 };
    if (score >= 800) return { coins: 5, gems: 0 };
    if (score >= 200) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardDanceBattleBonus(score, tierIndex, totalTiers) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = danceBattleBonusFor(score, tierIndex, totalTiers);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // COOKING RESTAURANT RUSH (cooking-rush/) — one-time-per-round bonus
  // scaled by how many customers were served in the 60-second rush.
  // =====================================================================
  function cookingRushBonusFor(served, missed) {
    if (served >= 14) return { coins: 18, gems: 2 };
    if (served >= 9) return { coins: 10, gems: 1 };
    if (served >= 5) return { coins: 5, gems: 0 };
    if (served >= 1) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardCookingRushBonus(served, missed) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = cookingRushBonusFor(served, missed);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // NINJA PARKOUR WALL-RUN (parkour-run/) — one-time-per-round bonus
  // scaled by obstacles cleared, whether the full run was completed, and
  // lives remaining at the end.
  // =====================================================================
  function parkourRunBonusFor(cleared, totalObstacles, completedAll, livesLeft) {
    if (completedAll && livesLeft >= 2) return { coins: 18, gems: 2 };
    if (completedAll) return { coins: 12, gems: 1 };
    if (cleared >= 8) return { coins: 6, gems: 0 };
    if (cleared >= 3) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardParkourRunBonus(cleared, totalObstacles, completedAll, livesLeft) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = parkourRunBonusFor(cleared, totalObstacles, completedAll, livesLeft);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // SPACE RACE (space-race/) — solo distance-accumulation game (NOT
  // real-time multiplayer racing, which Math Race already owns). Stores
  // a personal-best distance at players/{id}/spaceRace/{bestDistance,
  // name} -- `name` is duplicated onto the record itself (same pattern
  // as the Weekly Leaderboard's `w.name`) so the cross-player read below
  // doesn't need a second lookup per row.
  // =====================================================================
  async function submitSpaceRaceDistance(distance) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const ref = aigDb.ref(`players/${player.id}/spaceRace`);
    const snap = await ref.get();
    const current = snap.exists() ? snap.val() : { bestDistance: 0 };
    const isNewBest = distance > (current.bestDistance || 0);
    const bestDistance = isNewBest ? distance : (current.bestDistance || 0);
    if (isNewBest) await ref.set({ bestDistance, name: player.name });
    return { ok: true, isNewBest, bestDistance };
  }

  async function getSpaceRaceLeaderboard() {
    const snap = await aigDb.ref("players").get();
    if (!snap.exists()) return [];
    const all = snap.val();
    return Object.entries(all)
      .map(([id, data]) => ({ id, name: (data.spaceRace && data.spaceRace.name) || id, bestDistance: (data.spaceRace && data.spaceRace.bestDistance) || 0 }))
      .filter(r => r.bestDistance > 0)
      .sort((a, b) => b.bestDistance - a.bestDistance)
      .slice(0, 20);
  }

  function spaceRaceBonusFor(distance) {
    if (distance >= 450) return { coins: 18, gems: 2 };
    if (distance >= 300) return { coins: 10, gems: 1 };
    if (distance >= 150) return { coins: 5, gems: 0 };
    if (distance >= 1) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardSpaceRaceBonus(distance) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = spaceRaceBonusFor(distance);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  // =====================================================================
  // TREASURE MAP SCAVENGER HUNT (treasure-map/) — one-time-per-round
  // bonus scaled by how many of the 8 landmarks were found (finding all
  // 8 and claiming the Grand Treasure is the top tier).
  // =====================================================================
  function treasureMapBonusFor(foundCount, totalLandmarks) {
    if (foundCount >= totalLandmarks) return { coins: 20, gems: 2 };
    if (foundCount >= 6) return { coins: 12, gems: 1 };
    if (foundCount >= 3) return { coins: 6, gems: 0 };
    if (foundCount >= 1) return { coins: 2, gems: 0 };
    return null;
  }
  async function awardTreasureMapBonus(foundCount, totalLandmarks) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { ok: false };
    const bonus = treasureMapBonusFor(foundCount, totalLandmarks);
    if (!bonus) return { ok: true, bonus: null };
    await aigDb.ref(`players/${player.id}/wallet`).transaction(cur => {
      const wallet = cur || { coins: 0, gems: 0, correctSinceGem: 0 };
      wallet.coins = (wallet.coins || 0) + (bonus.coins || 0);
      wallet.gems = (wallet.gems || 0) + (bonus.gems || 0);
      return wallet;
    });
    return { ok: true, bonus };
  }

  window.AIGLeaderboard = {
    recordPlay, startSession, watchGame, getProgress, setProgress, recordTopicAttempt, getTopicStats,
    getWallet, watchWallet, getOwnedVehicles, unlockVehicle,
    getStreak, getStreakMultiplierInfo, getDailyQuests, claimDailyQuest, claimDailyBonus, getQuestLabel,
    claimBossWin,
    getWeeklyBossRushStatus, claimWeeklyBossRush,
    getNinjaGhost, saveNinjaGhost,
    getBattlePass, claimBattlePassTier,
    getCollection,
    getCosmetics, unlockCosmetic, equipCosmetic, getEquippedCosmetic, getDailyDeal, getDailyDealStatus,
    getAvatarColor, setAvatarColor,
    getRewardCatalog, redeemReward,
    getMathvilleTheme, setMathvilleTheme,
    logMistake, getMistakeJournal, markMistakeReviewed,
    getUnreviewedMistakeCount,
    getDailyComparison,
    getComebackBonusStatus, claimComebackBonus,
    getSubjectStreaks,
    getMysteryBoxStatus, openMysteryBox,
    getExplorationPoints, getDiscoveredExploration, discoverExplorationPoint,
    getPlayerLevel,
    getWeekPlayProgress, getMostImproved,
    getPersonalGoal, setPersonalGoal,
    submitNickname, getNickname,
    getClassGoalProgress,
    getWeeklyLeaderboard, getWeeklyRecap, getMonthlyReport, getBonusHourInfo, getWeekendBonusInfo, isCoinMultiplierActive,
    getTitle, getTitleTiers,
    submitCustomQuestion, getMyCustomQuestions, getApprovedCustomQuestionPool,
    getPowerupDefs, getPowerups, buyPowerup, usePowerup,
    getUpgradeDefs, getUpgradeGameLabels, getUpgrades, unlockUpgrade,
    submitSpeedRoundScore, getSpeedRoundLeaderboard,
    getMasteryMap, getSmartPractice,
    submitDiagnosticResult, getDiagnosticResult,
    getPetStatus, feedPet, getPetAccessories, getHubThemes, getNameFlairs, getAllEquippedFlairs,
    getClassmateAccuracy,
    getMilestoneSurprise,
    getTownDecoration, setTownDecoration,
    awardReferralBonus,
    awardTeachBoBonus,
    awardBasketballRoundBonus,
    awardMemoryMatchBonus,
    awardTreasureDigLoot, awardTreasureDigRoundBonus,
    awardNumberLineJumpBonus,
    awardMathTennisBonus,
    awardFortressMathBonus,
    getActiveSeasonalEvent, claimSeasonalEvent,
    sendDuelChallenge, getDuelInbox, getDuelSentResults, dismissDuelResult, resolveDuelChallenge,
    awardEscapeRoomBonus,
    awardQuizShowBonus,
    awardMonsterBattleBonus,
    getCityBuilder, awardCityBuilderBricks, placeCityBuilding, awardCityBuilderBonus,
    awardBossRushBonus,
    getBossRushDailyStatus, claimBossRushDaily,
    getBossWinsCount, getAchievements, getFeaturedAchievement, setFeaturedAchievement, getTrophyPedestals,
    giftCard,
    postTradeOffer, getOpenTradeOffers, getMyTradeOffers, cancelTradeOffer, acceptTradeOffer,
    getWeeklyFeaturedBossStatus, claimWeeklyFeaturedBoss,
    getThemeDayInfo, getThemeDayBonusStatus, claimThemeDayBonus,
    getAzkaPrBonusStatus, claimAzkaPrBonus,
    getStreakFreezes, buyStreakFreeze, getPiggy, depositPiggy, withdrawPiggy,
    LOADOUT_ITEMS, getInventory, getArmedLoadout, buyLoadout, armLoadout, consumeArmedLoadout,
    getPetAdventure, startPetAdventure, claimPetAdventure,
    WHEEL_PRIZES, getWheelStatus, spinWheel, getBooster, buyBooster,
    ROOM_ITEMS, getRoom, placeRoomItem, SECRET_MODES, getSecretModes, hasSecretMode,
    setQuestionBounty, claimQuestionBounty, BOUNTY_MIN, BOUNTY_MAX,
    getClassFund, donateClassFund, claimClassFundTier, getClassBoss, claimClassBoss, getTeamBattle, claimTeamReward,
    getZoneLevel, recordZoneResult, claimArcadeReward,
    getMathRaceGhost, saveMathRaceGhost, getStoryRead, markStoryRead, getCalendarMonth, STORY_READ_REWARD,
    STREAK_FREEZE_COST, STREAK_FREEZE_MAX, PIGGY_CAP, PET_ADVENTURE_COST, WHEEL_EXTRA_COST, BOOSTER_COST,
    getSkinPrefs, awardMiniGame,
    getTown, placeBuilding, removeBuilding, listTowns, likeTown, claimTownLikes,
    getGeoStamps, addGeoStamp, getDungeon, saveDungeon,
    getBoStatus, claimBoGift, getBoHome, buyFurniture, placeFurniture, getFamiliar, adoptFamiliar, feedFamiliar, FAMILIARS, BO_PERKS,
    listPlayerNames, getWeeklyReport, getWeakTopics, getTutorMastered, markTutorMastered,
    getMegaQuest, startMegaQuest, claimMegaQuest, endMegaQuest, MEGA_DAYS,
    getAdvent, openAdventDay, claimAdventStreak, restartAdvent, adventReward,
    getWeeklyFocus, recordFocusAnswer, FOCUS_KEYS, getClassTeams,
    getDino, evolveDino, DINO_STAGES, getSeason, getSeasonStatus, claimSeasonGift,
    getRotatingShop, getGachaStatus, rollGacha, GACHA_COST, GACHA_X5_COST,
    getFlashStatus, submitFlash, getFlashBoard, FLASH_MAX_PLAYS,
    getMyClub, listClubs, createClub, joinClub, leaveClub, claimClubGoal, CLUB_MAX,
    getTournament, enterTournament, claimTournamentTitle,
    getBattleStatus, claimBattleWin, BATTLE_DAILY_WINS,
    getGarden, plantSeed, harvestPlot, buyGardenPlot,
    getMissions, completeMission, claimMissionBonus,
    getCertificates, getAdventure, saveAdventureNode, claimAdventureEnding, ADVENTURE_ENDING_COINS,
    getPersonalBest, submitPersonalBest,
    awardDanceBattleBonus,
    awardCookingRushBonus,
    awardParkourRunBonus,
    submitSpaceRaceDistance, getSpaceRaceLeaderboard, awardSpaceRaceBonus,
    awardTreasureMapBonus,
    db: aigDb
  };
})();
