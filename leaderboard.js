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
  // Silently does nothing if no one has picked a name yet.
  function recordPlay(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player) return;
    const ref = aigDb.ref(`leaderboard/${gameId}/${player.id}`);
    ref.child("timesPlayed").transaction(cur => (cur || 0) + 1);
    ref.update({ name: player.name, lastPlayed: firebase.database.ServerValue.TIMESTAMP });
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
  async function getProgress(gameId) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player) return null;
    const snap = await aigDb.ref(`players/${player.id}/badges/${gameId}`).get();
    return snap.exists() ? snap.val() : null;
  }

  function setProgress(gameId, data) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player) return;
    aigDb.ref(`players/${player.id}/badges/${gameId}`).set(data);
  }

  // ---- Wrong-answer tracking, so the teacher/parent dashboard can surface
  // specific weak spots (e.g. "struggles with the 7-times table") instead of
  // just completion %. Stored at /players/{playerId}/mistakes/{gameId}/{topicKey}.
  // topicKey must be Firebase-key-safe (no . # $ / [ ]).
  function recordMistake(gameId, topicKey) {
    const player = window.AIGPlayer && AIGPlayer.getPlayer();
    if (!player) return;
    const ref = aigDb.ref(`players/${player.id}/mistakes/${gameId}/${topicKey}`);
    ref.child("count").transaction(cur => (cur || 0) + 1);
    ref.update({ lastWrongAt: firebase.database.ServerValue.TIMESTAMP });
  }

  window.AIGLeaderboard = { recordPlay, watchGame, getProgress, setProgress, recordMistake, db: aigDb };
})();
