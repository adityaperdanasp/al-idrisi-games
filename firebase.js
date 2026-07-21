// Al Idrisi Games — hub-wide Firebase project (separate from each game's
// own Firebase project). Used for the shared leaderboard/player data and
// Google Analytics. The 3 games keep using their own original projects for
// multiplayer pairing — this file/project never touches those.
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

firebase.initializeApp(firebaseConfig);
firebase.analytics();
const aigDb = firebase.database();
