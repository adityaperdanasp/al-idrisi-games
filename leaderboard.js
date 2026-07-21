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

  window.AIGLeaderboard = { recordPlay, watchGame, db: aigDb };
})();
