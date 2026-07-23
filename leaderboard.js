// Al Idrisi Games — shared leaderboard write/read helper.
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
    return ref.child("timesPlayed").transaction(cur => (cur || 0) + 1)
      .then(result => result.committed ? result.snapshot.val() : null);
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
  function recordTopicAttempt(gameId, topicKey, isCorrect) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player || player.role === "parent") return;
    const ref = aigDb.ref(`players/${player.id}/topicStats/${gameId}/${topicKey}`);
    ref.child(isCorrect ? "correct" : "wrong").transaction(cur => (cur || 0) + 1);
    if (!isCorrect) ref.update({ lastWrongAt: firebase.database.ServerValue.TIMESTAMP });
  }

  window.AIGLeaderboard = { recordPlay, watchGame, getProgress, setProgress, recordTopicAttempt, db: aigDb };
})();
