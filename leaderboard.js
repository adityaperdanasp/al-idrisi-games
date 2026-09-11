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
    const bonusMult = isBonusHourNow() ? 2 : 1;
    const coinGain = Math.max(1, Math.round(1 * (comboMultiplier || 1) * bonusMult));
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
    const newCount = data.lastPlayDate === yesterday ? (data.count || 0) + 1 : 1;
    const newBest = Math.max(data.bestStreak || 0, newCount);
    await ref.set({ count: newCount, lastPlayDate: today, bestStreak: newBest });
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
    return snap.exists() ? snap.val() : { count: 0, bestStreak: 0 };
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

    // Bonus gems once all 3 quests for the day have been claimed.
    const freshSnap = await questRef.get();
    const fresh = freshSnap.val();
    const allClaimed = fresh.quests.every(q => q.claimed);
    let bonus = false;
    if (allClaimed && !fresh.bonusClaimed) {
      await questRef.child("bonusClaimed").set(true);
      const w2Snap = await walletRef.get();
      const w2 = w2Snap.exists() ? w2Snap.val() : { coins: 0, gems: 0, correctSinceGem: 0 };
      await walletRef.set({ ...w2, gems: (w2.gems || 0) + 2 });
      bonus = true;
    }

    const newCard = bonus ? await awardRandomCard("common") : null;
    return { ok: true, bonus, newCard };
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

  const SOUND_PACKS = [
    { id: "classic", name: "Classic Chime", cost: null, notes: [{ f: 523, d: 120 }, { f: 659, d: 120 }, { f: 784, d: 200 }] },
    { id: "arcade", name: "Arcade Blip", cost: { coins: 15 }, notes: [{ f: 440, d: 80 }, { f: 660, d: 80 }, { f: 880, d: 80 }, { f: 1320, d: 160 }] },
    { id: "fanfare", name: "Royal Fanfare", cost: { coins: 25 }, notes: [{ f: 392, d: 100 }, { f: 523, d: 100 }, { f: 659, d: 100 }, { f: 784, d: 260 }] },
    { id: "magic", name: "Magic Sparkle", cost: { gems: 2 }, notes: [{ f: 988, d: 70 }, { f: 1175, d: 70 }, { f: 1568, d: 70 }, { f: 1976, d: 180 }] }
  ];

  async function getCosmetics() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const [ownedSnap, equippedSnap] = await Promise.all([
      aigDb.ref(`players/${player.id}/ownedCosmetics`).get(),
      aigDb.ref(`players/${player.id}/equipped`).get()
    ]);
    const owned = ownedSnap.exists() ? ownedSnap.val() : {};
    const equipped = equippedSnap.exists() ? equippedSnap.val() : {};
    return {
      frames: AVATAR_FRAMES.map(f => ({ ...f, owned: !f.cost || !!(owned.frame && owned.frame[f.id]) })),
      sounds: SOUND_PACKS.map(s => ({ ...s, owned: !s.cost || !!(owned.sound && owned.sound[s.id]) })),
      equippedFrame: equipped.frame || "none",
      equippedSound: equipped.sound || "classic"
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

  // =====================================================================
  // CUSTOM QUIZ QUESTIONS — a kid writes a multiple-choice question, a
  // parent approves it (via Parent Portal), then it joins a shared pool
  // other kids can play. Stored at players/{authorId}/customQuestions/{id}
  // -- nested under the already-explicit `players` rule like everything
  // else above, so no new top-level RTDB path/rules change is needed.
  // Cross-player discovery (getApprovedCustomQuestionPool) reads the whole
  // players/ tree once, same technique as getWeeklyLeaderboard.
  // =====================================================================
  function submitCustomQuestion(prompt, options, correctIndex) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return null;
    const ref = aigDb.ref(`players/${player.id}/customQuestions`).push();
    ref.set({
      authorName: player.name,
      prompt,
      options,
      correctIndex,
      status: "pending",
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    return ref.key;
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
    skip: { name: "Skip", cost: { coins: 12 }, emoji: "⏭️" }
  };

  function getPowerupDefs() { return POWERUP_DEFS; }

  async function getPowerups() {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return { fiftyFifty: 0, skip: 0 };
    const snap = await aigDb.ref(`players/${player.id}/powerups`).get();
    const data = snap.exists() ? snap.val() : {};
    return { fiftyFifty: data.fiftyFifty || 0, skip: data.skip || 0 };
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

  window.AIGLeaderboard = {
    recordPlay, startSession, watchGame, getProgress, setProgress, recordTopicAttempt, getTopicStats,
    getWallet, watchWallet, getOwnedVehicles, unlockVehicle,
    getStreak, getDailyQuests, claimDailyQuest, getQuestLabel,
    claimBossWin,
    getBattlePass, claimBattlePassTier,
    getCollection,
    getCosmetics, unlockCosmetic, equipCosmetic,
    getWeeklyLeaderboard, getWeeklyRecap, getBonusHourInfo,
    getTitle,
    submitCustomQuestion, getMyCustomQuestions, getApprovedCustomQuestionPool,
    getPowerupDefs, getPowerups, buyPowerup, usePowerup,
    submitSpeedRoundScore, getSpeedRoundLeaderboard,
    getMasteryMap, getSmartPractice,
    submitDiagnosticResult, getDiagnosticResult,
    db: aigDb
  };
})();
