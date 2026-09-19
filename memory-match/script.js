/* =================================================================
   Memory Match — flip 2 cards to find equal pairs (e.g. "24 / 8" and
   "3"). 8 pairs (16 cards) per round, generated fresh each play with
   distinct values so there's never an ambiguous match. Reuses
   leaderboard.js's recordTopicAttempt("memory-match", ...) on each pair
   FOUND (not every flip -- a mismatch isn't really a "wrong answer" the
   way a quiz question is, it's just part of the puzzle), same as every
   other game's per-answer coin/gem/streak trickle.

   ~35% of pairs are Language/Science "question -> short answer" pairs
   instead of an arithmetic fact, via AIGQuestionPools.pickShortLanguage/
   pickShortScience (question-pools.js) -- filtered to prompts/answers
   short enough to fit a small fixed-size tile, since most azkacraft/
   azkauniverse MC prompts are a full sentence, too long otherwise.
   Falls back to an arithmetic fact whenever a short pick isn't
   available (pools not ready yet, or none short enough left unused).
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("mm-signedout-overlay").classList.remove("hidden");
  document.getElementById("mm-start-overlay").classList.add("hidden");
} else {
  initMemoryMatch();
}

function initMemoryMatch() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const PAIR_COUNT = 8;
  const MIXED_PAIR_CHANCE = 0.35;
  const MAX_PROMPT_LEN = 48;
  const MAX_ANSWER_LEN = 12;
  const MISMATCH_FLIP_BACK_MS = 800;

  const grid = document.getElementById("mm-grid");
  const hudPairs = document.getElementById("mm-hud-pairs");
  const hudMoves = document.getElementById("mm-hud-moves");
  const hudCoins = document.getElementById("mm-hud-coins");
  const hudGems = document.getElementById("mm-hud-gems");

  const state = { cards: [], flipped: [], pairsFound: 0, moves: 0, locked: false };
  // Cosmetic only -- bought/equipped via the hub's Customize > Game FX tab
  // (leaderboard.js's GAMEPLAY_FX_CATALOGS, type "memorymatch-cardback").
  const CARDBACK_EMOJI = { default: "🧠", cards: "🎴", star: "🌟", crystal: "🔮", mythic: "🌌" };
  let cardBackEmoji = "🧠";

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

  // One random fact per pair, drawn from a mix of operations so the round
  // isn't all multiplication or all addition. Each fact yields one
  // "expression" card (e.g. "7 x 6") and one "value" card (e.g. "42").
  function randomFact() {
    const kind = ["mul", "div", "add", "sub"][rand(0, 3)];
    if (kind === "mul") { const a = rand(2, 9), b = rand(2, 9); return { expr: `${a} x ${b}`, value: a * b }; }
    if (kind === "div") { const b = rand(2, 9), q = rand(2, 9); return { expr: `${b * q} / ${b}`, value: q }; }
    if (kind === "add") { const a = rand(5, 40), b = rand(5, 40); return { expr: `${a} + ${b}`, value: a + b }; }
    const a = rand(20, 60), b = rand(5, a - 1); return { expr: `${a} - ${b}`, value: a - b };
  }

  // Rolls one Language or Science pair (question -> short answer) via the
  // shared cross-game pool, filtered to fit a small tile. Returns null if
  // the pool isn't ready or has no unused entry short enough -- caller
  // falls back to an arithmetic fact.
  function tryMixedFact() {
    if (!window.AIGQuestionPools) return null;
    const isLang = Math.random() < 0.5;
    const pick = isLang
      ? window.AIGQuestionPools.pickShortLanguage(MAX_PROMPT_LEN, MAX_ANSWER_LEN)
      : window.AIGQuestionPools.pickShortScience(MAX_PROMPT_LEN, MAX_ANSWER_LEN);
    return pick ? { expr: pick.prompt, value: pick.correctLabel, long: true } : null;
  }

  // Keeps rolling facts until PAIR_COUNT distinct VALUES are collected --
  // without this, two different expressions could share the same value
  // (e.g. "6 x 7" and "84 / 2" both = 42), making the match ambiguous
  // (which "42" card goes with which expression?). Values are compared
  // as strings since a mixed pair's value is text ("Mars"), not a number.
  function buildDeck() {
    const usedValues = new Set();
    const facts = [];
    let guard = 0;
    while (facts.length < PAIR_COUNT && guard++ < 500) {
      const f = (Math.random() < MIXED_PAIR_CHANCE && tryMixedFact()) || randomFact();
      const valueKey = String(f.value);
      if (usedValues.has(valueKey)) continue;
      usedValues.add(valueKey);
      facts.push(f);
    }
    const cards = [];
    facts.forEach((f, i) => {
      cards.push({ id: "e" + i, pairId: i, text: f.expr, long: f.long || f.expr.length > 12 });
      cards.push({ id: "v" + i, pairId: i, text: String(f.value), long: false });
    });
    return shuffle(cards);
  }

  function renderGrid() {
    grid.innerHTML = "";
    state.cards.forEach(card => {
      const el = document.createElement("div");
      el.className = "mm-card";
      el.dataset.cardId = card.id;
      el.innerHTML = `
        <div class="mm-card-inner">
          <div class="mm-card-face mm-card-back">${cardBackEmoji}</div>
          <div class="mm-card-face mm-card-front${card.long ? " long-text" : ""}">${card.text}</div>
        </div>`;
      el.addEventListener("click", () => onCardClick(card, el));
      grid.appendChild(el);
    });
  }

  function updateHud() {
    hudPairs.textContent = state.pairsFound;
    hudMoves.textContent = state.moves;
  }

  function onCardClick(card, el) {
    if (state.locked) return;
    if (el.classList.contains("flipped") || el.classList.contains("matched")) return;
    if (state.flipped.length >= 2) return;
    el.classList.add("flipped");
    state.flipped.push({ card, el });
    if (state.flipped.length === 2) {
      state.moves++;
      updateHud();
      resolvePair();
    }
  }

  function resolvePair() {
    const [a, b] = state.flipped;
    const isMatch = a.card.pairId === b.card.pairId;
    if (isMatch) {
      state.locked = true;
      setTimeout(() => {
        a.el.classList.add("matched");
        b.el.classList.add("matched");
        state.pairsFound++;
        updateHud();
        state.flipped = [];
        state.locked = false;
        if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("memory-match", "pair-found", true);
        if (state.pairsFound >= PAIR_COUNT) finishRound();
      }, 250);
    } else {
      state.locked = true;
      a.el.classList.add("mismatch");
      b.el.classList.add("mismatch");
      setTimeout(() => {
        a.el.classList.remove("flipped", "mismatch");
        b.el.classList.remove("flipped", "mismatch");
        state.flipped = [];
        state.locked = false;
      }, MISMATCH_FLIP_BACK_MS);
    }
  }

  function finishRound() {
    const moves = state.moves;
    const emoji = moves <= 12 ? "🏆" : moves <= 18 ? "🥳" : moves <= 26 ? "🙂" : "💪";
    const title = moves <= 12 ? "Amazing memory!" : moves <= 18 ? "Great job!" : moves <= 26 ? "Nice work!" : "You found them all!";
    document.getElementById("mm-end-emoji").textContent = emoji;
    document.getElementById("mm-end-title").textContent = title;
    document.getElementById("mm-end-sub").textContent = `You found all 8 pairs in ${moves} moves.`;
    const bonusEl = document.getElementById("mm-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardMemoryMatchBonus(moves).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("mm-end-overlay").classList.remove("hidden");
  }

  async function startRound() {
    if (window.AIGLeaderboard) {
      const equipped = await AIGLeaderboard.getEquippedCosmetic("memorymatch-cardback", "default");
      cardBackEmoji = CARDBACK_EMOJI[equipped] || "🧠";
    }
    state.cards = buildDeck();
    state.flipped = [];
    state.pairsFound = 0;
    state.moves = 0;
    state.locked = false;
    updateHud();
    renderGrid();
    document.getElementById("mm-end-overlay").classList.add("hidden");
    document.getElementById("mm-start-overlay").classList.add("hidden");
  }

  document.getElementById("mm-start-btn").addEventListener("click", startRound);
  document.getElementById("mm-play-again-btn").addEventListener("click", startRound);
}
