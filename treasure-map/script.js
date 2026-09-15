/* =================================================================
   Treasure Map Scavenger Hunt — a NON-LINEAR interactive map: 8 fixed
   landmarks scattered across the map, tappable in ANY ORDER (unlike
   every other PM Round 4 game so far, which is a fixed sequence).
   Each landmark holds a math "riddle" (a fresh MC question rolled at
   whichever difficulty that landmark is assigned); solving it marks
   that landmark found permanently. Wrong answers can be retried later
   -- exploratory pacing, not a timed/lives challenge, so retries carry
   no penalty beyond having to come back to that spot again. Finding
   all 8 unlocks the Grand Treasure claim; a "finish early" option lets
   the player cash in partial progress at any point.
   ================================================================= */

const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
const LANDMARKS = [
  { emoji: "🌴", name: "Palm Cove", x: 15, y: 20, difficulty: "easy" },
  { emoji: "⛰️", name: "Misty Peak", x: 72, y: 14, difficulty: "easy" },
  { emoji: "🏚️", name: "Old Ruins", x: 42, y: 34, difficulty: "easy" },
  { emoji: "🌊", name: "Blue Lagoon", x: 20, y: 60, difficulty: "medium" },
  { emoji: "🗿", name: "Stone Guardian", x: 82, y: 46, difficulty: "medium" },
  { emoji: "🕳️", name: "Dark Cave", x: 55, y: 68, difficulty: "medium" },
  { emoji: "🌵", name: "Dry Desert", x: 30, y: 87, difficulty: "hard" },
  { emoji: "🏰", name: "Old Fort", x: 78, y: 82, difficulty: "hard" }
];

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("tm-signedout-overlay").classList.remove("hidden");
  document.getElementById("tm-start-overlay").classList.add("hidden");
} else {
  initTreasureMap();
}

function initTreasureMap() {
  const state = { found: [], activeLandmark: null };

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

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

  function rollQuestion(difficulty) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    return { key, ...buildMc(raw) };
  }

  function renderHud() {
    document.getElementById("tm-found-count").textContent = state.found.length;
    document.getElementById("tm-claim-btn").disabled = state.found.length < LANDMARKS.length;
    document.getElementById("tm-finish-link").classList.toggle("hidden", state.found.length === 0);
  }

  function renderMap() {
    const map = document.getElementById("tm-map");
    map.innerHTML = "";
    LANDMARKS.forEach((lm, i) => {
      const found = state.found.includes(i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tm-landmark" + (found ? " found" : "");
      btn.style.left = lm.x + "%";
      btn.style.top = lm.y + "%";
      btn.textContent = found ? "💰" : lm.emoji;
      btn.title = lm.name;
      btn.addEventListener("click", () => openRiddle(i));
      map.appendChild(btn);
    });
  }

  function openRiddle(i) {
    if (state.found.includes(i)) return;
    state.activeLandmark = i;
    const lm = LANDMARKS[i];
    document.getElementById("tm-riddle-feedback").textContent = "";
    document.getElementById("tm-riddle-label").textContent = `Riddle at ${lm.name} ${lm.emoji}:`;
    const q = rollQuestion(lm.difficulty);
    state.activeQuestion = q;
    document.getElementById("tm-q-prompt").textContent = q.prompt;
    const grid = document.getElementById("tm-q-grid");
    grid.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "tm-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleRiddleAnswer(btn, opt));
      grid.appendChild(btn);
    });
    document.getElementById("tm-riddle-card").classList.remove("hidden");
    document.getElementById("tm-riddle-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function handleRiddleAnswer(btn, opt) {
    const q = state.activeQuestion;
    const i = state.activeLandmark;
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#tm-q-grid .tm-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("treasure-map", q.key, isCorrect);

    if (isCorrect) {
      state.found.push(i);
      document.getElementById("tm-riddle-feedback").textContent = `Treasure found at ${LANDMARKS[i].name}! 💰`;
      document.getElementById("tm-riddle-feedback").style.color = "#3F8F5F";
    } else {
      document.getElementById("tm-riddle-feedback").textContent = "No luck -- try this spot again later!";
      document.getElementById("tm-riddle-feedback").style.color = "#D64545";
    }
    renderHud();
    renderMap();

    setTimeout(() => {
      document.getElementById("tm-riddle-card").classList.add("hidden");
      document.getElementById("tm-riddle-feedback").textContent = "";
    }, 1300);
  }

  async function finishHunt(claimedAll) {
    document.getElementById("tm-riddle-card").classList.add("hidden");
    const foundCount = state.found.length;
    const emoji = claimedAll ? "🏆" : foundCount >= 5 ? "🎉" : foundCount >= 1 ? "🙂" : "💪";
    document.getElementById("tm-end-emoji").textContent = emoji;
    document.getElementById("tm-end-title").textContent = claimedAll ? "Grand Treasure Claimed!" : "Hunt Finished!";
    document.getElementById("tm-end-sub").textContent = claimedAll
      ? `You found all ${LANDMARKS.length} treasures and claimed the Grand Treasure!`
      : `You found ${foundCount} of ${LANDMARKS.length} treasures before finishing up. Nice work!`;
    const bonusEl = document.getElementById("tm-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardTreasureMapBonus(foundCount, LANDMARKS.length).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("tm-end-overlay").classList.remove("hidden");
  }

  document.getElementById("tm-claim-btn").addEventListener("click", () => finishHunt(true));
  document.getElementById("tm-finish-link").addEventListener("click", () => finishHunt(false));

  function startGame() {
    state.found = [];
    state.activeLandmark = null;
    document.getElementById("tm-start-overlay").classList.add("hidden");
    document.getElementById("tm-end-overlay").classList.add("hidden");
    document.getElementById("tm-riddle-card").classList.add("hidden");
    renderHud();
    renderMap();
  }

  document.getElementById("tm-start-btn").addEventListener("click", startGame);
  document.getElementById("tm-play-again-btn").addEventListener("click", startGame);
  renderMap();
}
