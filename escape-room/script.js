/* =================================================================
   Escape the Vault — 6 locked doors, each needs 2 CONSECUTIVE correct
   answers to break its combo lock (one wrong answer resets that door's
   combo back to 0 -- unlike every other new mini-game, a mistake here
   costs progress on the CURRENT door, not lives/energy). A single global
   5-minute countdown creates urgency across the whole run, not per-
   question. One hint (skips the current door) is available per game.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("er-signedout-overlay").classList.remove("hidden");
  document.getElementById("er-start-overlay").classList.add("hidden");
} else {
  initEscapeRoom();
}

function initEscapeRoom() {
  const ROOM_COUNT = 6;
  const COMBO_NEEDED = 2;
  const GAME_DURATION_SEC = 300;
  const HINTS_MAX = 1;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  const VAULT_FLAVORS = [
    "A heavy iron door blocks your path.",
    "Strange symbols glow around the lock.",
    "You hear gears grinding behind the wall.",
    "A dusty combination lock awaits.",
    "This door hums with old magic.",
    "The final door -- freedom is close!"
  ];

  const hudTimer = document.getElementById("er-hud-timer");
  const hudRoom = document.getElementById("er-hud-room");
  const roomTrack = document.getElementById("er-room-track");
  const vaultFlavor = document.getElementById("er-vault-flavor");
  const vaultEmoji = document.getElementById("er-vault-emoji");
  const comboDotsEl = document.getElementById("er-combo-dots");
  const hintBtn = document.getElementById("er-hint-btn");

  const state = { room: 0, combo: 0, hintsLeft: HINTS_MAX, secondsLeft: GAME_DURATION_SEC, timerId: null, ended: false };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function difficultyForRoom(room) { return room <= 1 ? "easy" : room <= 3 ? "medium" : "hard"; }

  // Same MC-building approach as the other new mini-games' buildMc.
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

  function rollQuestion(room) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficultyForRoom(room));
    return { key, ...buildMc(raw) };
  }

  function renderRoomTrack() {
    roomTrack.innerHTML = "";
    for (let i = 1; i <= ROOM_COUNT; i++) {
      const dot = document.createElement("div");
      dot.className = "er-room-dot" + (i <= state.room ? " done" : i === state.room + 1 && !state.ended ? " current" : "");
      dot.textContent = i <= state.room ? "✓" : "🚪";
      roomTrack.appendChild(dot);
    }
  }

  function renderComboDots() {
    comboDotsEl.innerHTML = "";
    for (let i = 0; i < COMBO_NEEDED; i++) {
      const dot = document.createElement("div");
      dot.className = "er-combo-dot" + (i < state.combo ? " lit" : "");
      comboDotsEl.appendChild(dot);
    }
  }

  function updateHud() {
    hudRoom.textContent = state.room;
    const mins = Math.floor(state.secondsLeft / 60), secs = state.secondsLeft % 60;
    hudTimer.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    hudTimer.classList.toggle("urgent", state.secondsLeft <= 30);
    renderRoomTrack();
    renderComboDots();
  }

  function startTimer() {
    state.timerId = setInterval(() => {
      state.secondsLeft--;
      updateHud();
      if (state.secondsLeft <= 0) {
        clearInterval(state.timerId);
        finishGame(false);
      }
    }, 1000);
  }

  function askDoorQuestion() {
    if (state.ended) return;
    const q = rollQuestion(state.room + 1);
    document.getElementById("er-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("er-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "er-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleDoorAnswer(btn, opt, q));
      grid.appendChild(btn);
    });
    document.getElementById("er-question-overlay").classList.remove("hidden");
  }

  function handleDoorAnswer(btn, opt, q) {
    if (state.ended) return;
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#er-q-grid .er-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("escape-room", q.key, isCorrect);

    setTimeout(() => {
      document.getElementById("er-question-overlay").classList.add("hidden");
      if (state.ended) return;
      if (isCorrect) {
        state.combo++;
        updateHud();
        if (state.combo >= COMBO_NEEDED) {
          advanceRoom();
        } else {
          askDoorQuestion();
        }
      } else {
        state.combo = 0;
        updateHud();
        askDoorQuestion();
      }
    }, 650);
  }

  function advanceRoom() {
    state.room++;
    state.combo = 0;
    updateHud();
    if (state.room >= ROOM_COUNT) {
      finishGame(true);
      return;
    }
    vaultEmoji.textContent = "🚪";
    vaultFlavor.textContent = VAULT_FLAVORS[state.room];
    setTimeout(askDoorQuestion, 800);
  }

  hintBtn.addEventListener("click", () => {
    if (state.hintsLeft <= 0 || state.ended) return;
    state.hintsLeft--;
    hintBtn.textContent = `💡 Use Hint (${state.hintsLeft} left) -- skip this door`;
    hintBtn.disabled = state.hintsLeft <= 0;
    document.getElementById("er-question-overlay").classList.add("hidden");
    advanceRoom();
  });

  function finishGame(fullyEscaped) {
    state.ended = true;
    if (state.timerId) clearInterval(state.timerId);
    document.getElementById("er-question-overlay").classList.add("hidden");
    const roomsCleared = state.room;
    const emoji = fullyEscaped ? "🏆" : roomsCleared >= 4 ? "🥳" : roomsCleared >= 2 ? "🙂" : "💪";
    const title = fullyEscaped ? "You escaped the vault!" : "Time's up!";
    document.getElementById("er-end-emoji").textContent = emoji;
    document.getElementById("er-end-title").textContent = title;
    document.getElementById("er-end-sub").textContent = fullyEscaped
      ? `You broke out with ${Math.floor(state.secondsLeft / 60)}:${String(state.secondsLeft % 60).padStart(2, "0")} left on the clock!`
      : `You made it through ${roomsCleared}/${ROOM_COUNT} doors before time ran out.`;
    const bonusEl = document.getElementById("er-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardEscapeRoomBonus(roomsCleared, ROOM_COUNT, fullyEscaped ? state.secondsLeft : 0).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("er-end-overlay").classList.remove("hidden");
  }

  function startGame() {
    state.room = 0;
    state.combo = 0;
    state.hintsLeft = HINTS_MAX;
    state.secondsLeft = GAME_DURATION_SEC;
    state.ended = false;
    if (state.timerId) clearInterval(state.timerId);
    hintBtn.textContent = `💡 Use Hint (${HINTS_MAX} left) -- skip this door`;
    hintBtn.disabled = false;
    vaultEmoji.textContent = "🔒";
    vaultFlavor.textContent = VAULT_FLAVORS[0];
    updateHud();
    document.getElementById("er-end-overlay").classList.add("hidden");
    document.getElementById("er-start-overlay").classList.add("hidden");
    startTimer();
    askDoorQuestion();
  }

  document.getElementById("er-start-btn").addEventListener("click", startGame);
  document.getElementById("er-play-again-btn").addEventListener("click", startGame);
}
