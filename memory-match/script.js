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
  let PAIR_COUNT = 8;
  // Audit batch 9: board sizes (6/8/10 pairs), modes (classic, 60-second timed, vs Bo-Bot taking turns
  // with a real memory, and "twist" where unmatched cards reshuffle every 6 moves), a one-time 👀 peek,
  // match combos, and best moves remembered per board size.
  let MODE = "classic", timer = null, timeLeft = 0, botScore = 0, myScore = 0, botTurn = false, combo = 0, peekUsed = false;
  const seen = {}; // Bo-Bot's memory: card id -> pairId
  const lsm = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsmw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
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
    const tot = document.getElementById("mm-hud-total"); if (tot) tot.textContent = PAIR_COUNT;
    hudMoves.textContent = state.moves;
  }

  function onCardClick(card, el) {
    if (state.locked || botTurn) return;
    if (el.classList.contains("flipped") || el.classList.contains("matched")) return;
    if (state.flipped.length >= 2) return;
    el.classList.add("flipped");
    seen[card.id] = card.pairId;
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
        if (botTurn) { botScore++; a.el.classList.add("bot"); b.el.classList.add("bot"); } else { myScore++; combo++; if (combo >= 2) flash(`🔥 Combo ×${combo}!`); }
        state.pairsFound++;
        updateHud();
        state.flipped = [];
        state.locked = false;
        if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("memory-match", "pair-found", true);
        if (state.pairsFound >= PAIR_COUNT) return finishRound();
        if (botTurn) setTimeout(botMove, 700);
      }, 250);
    } else {
      combo = 0;
      state.locked = true;
      a.el.classList.add("mismatch");
      b.el.classList.add("mismatch");
      setTimeout(() => {
        a.el.classList.remove("flipped", "mismatch");
        b.el.classList.remove("flipped", "mismatch");
        state.flipped = [];
        state.locked = false;
        if (MODE === "twist" && state.moves % 6 === 0) twist();
        if (MODE === "bot") { botTurn = !botTurn; drawTurn(); if (botTurn) setTimeout(botMove, 800); }
      }, MISMATCH_FLIP_BACK_MS);
    }
  }

  function flash(t) { const el = document.getElementById("mm-flash"); el.textContent = t; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }
  function drawTurn() { const t = document.getElementById("mm-turn"); t.textContent = MODE === "bot" ? `${botTurn ? "🤖 Bo-Bot's turn…" : "🧒 Your turn"} · You ${myScore} – ${botScore} Bo-Bot` : MODE === "timed" ? `⏱️ ${timeLeft}s` : MODE === "twist" ? "🌀 Twist: cards shuffle every 6 moves!" : ""; }
  function cardEls() { return [...grid.querySelectorAll(".mm-card")]; }
  function twist() {
    const free = cardEls().filter(e => !e.classList.contains("matched")), ids = shuffle(free.map(e => e.dataset.cardId));
    const byId = Object.fromEntries(state.cards.map(c => [c.id, c]));
    free.forEach((e, i) => { const c = byId[ids[i]]; e.dataset.cardId = c.id; e.querySelector(".mm-card-front").textContent = c.text; e.onclick = null; const ne = e.cloneNode(true); e.replaceWith(ne); ne.addEventListener("click", () => onCardClick(c, ne)); });
    Object.keys(seen).forEach(k => delete seen[k]); flash("🌀 Twist! The cards moved!");
  }
  function botMove() {
    if (!botTurn || state.pairsFound >= PAIR_COUNT) return;
    const els = cardEls().filter(e => !e.classList.contains("matched")), byEl = e => state.cards.find(c => c.id === e.dataset.cardId);
    const memory = Math.random() < 0.7; let first = null, second = null;
    if (memory) { const groups = {}; els.forEach(e => { const id = e.dataset.cardId; if (seen[id] !== undefined) (groups[seen[id]] = groups[seen[id]] || []).push(e); }); const pair = Object.values(groups).find(g => g.length >= 2); if (pair) { first = pair[0]; second = pair[1]; } }
    if (!first) { first = els[rand(0, els.length - 1)]; const fp = byEl(first).pairId; const known = els.find(e => e !== first && seen[e.dataset.cardId] === fp); second = memory && known ? known : els.filter(e => e !== first)[rand(0, els.length - 2)]; }
    [first, second].forEach((e, i) => setTimeout(() => { const c = byEl(e); e.classList.add("flipped"); seen[c.id] = c.pairId; state.flipped.push({ card: c, el: e }); if (state.flipped.length === 2) { state.moves++; updateHud(); resolvePair(); } }, i * 600));
  }
  function finishRound() {
    clearInterval(timer);
    const moves = state.moves;
    const bk = `mm_best_${PAIR_COUNT}`, best = Number(lsm(bk, "0")); if (MODE !== "bot" && state.pairsFound >= PAIR_COUNT && (!best || moves < best)) lsmw(bk, String(moves));
    const emoji = moves <= 12 ? "🏆" : moves <= 18 ? "🥳" : moves <= 26 ? "🙂" : "💪";
    const title = moves <= 12 ? "Amazing memory!" : moves <= 18 ? "Great job!" : moves <= 26 ? "Nice work!" : "You found them all!";
    document.getElementById("mm-end-emoji").textContent = emoji;
    document.getElementById("mm-end-title").textContent = title;
    document.getElementById("mm-end-sub").textContent = MODE === "bot" ? `You ${myScore} – ${botScore} Bo-Bot: ${myScore > botScore ? "you win! 🏆" : myScore === botScore ? "a tie!" : "Bo-Bot wins this time."}` : MODE === "timed" && state.pairsFound < PAIR_COUNT ? `Time's up! You found ${state.pairsFound} of ${PAIR_COUNT} pairs.` : `You found all ${PAIR_COUNT} pairs in ${moves} moves${MODE === "timed" ? ` with ${timeLeft}s left` : ""}. ${best ? `(Best: ${Math.min(best, moves)})` : ""}`;
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
    clearInterval(timer); botScore = myScore = combo = 0; botTurn = false; peekUsed = false; Object.keys(seen).forEach(k => delete seen[k]);
    state.cards = buildDeck();
    state.flipped = [];
    state.pairsFound = 0;
    state.moves = 0;
    state.locked = false;
    updateHud();
    renderGrid();
    document.getElementById("mm-end-overlay").classList.add("hidden");
    document.getElementById("mm-start-overlay").classList.add("hidden");
    grid.style.gridTemplateColumns = `repeat(${PAIR_COUNT >= 10 ? 5 : 4}, 1fr)`;
    if (MODE === "timed") { timeLeft = 60 + (PAIR_COUNT - 8) * 10; timer = setInterval(() => { timeLeft--; drawTurn(); if (timeLeft <= 0) { clearInterval(timer); state.locked = true; finishRound(); } }, 1000); }
    drawTurn();
    const pk = document.getElementById("mm-peek"); pk.disabled = false;
  }
  document.getElementById("mm-peek").onclick = () => { if (peekUsed || state.locked || botTurn) return; peekUsed = true; document.getElementById("mm-peek").disabled = true; const free = cardEls().filter(e => !e.classList.contains("matched") && !e.classList.contains("flipped")); free.forEach(e => e.classList.add("flipped")); state.locked = true; setTimeout(() => { free.forEach(e => e.classList.remove("flipped")); state.locked = false; }, 1500); };
  function modePicker() {
    const ov = document.getElementById("mm-start-overlay"), box = ov.querySelector("div") || ov;
    let pick = document.getElementById("mm-modes"); if (!pick) { pick = document.createElement("div"); pick.id = "mm-modes"; pick.className = "mm-modes"; document.getElementById("mm-start-btn").before(pick); }
    pick.innerHTML = `<div><b>Board</b> ${[6, 8, 10].map(n => `<button type="button" data-n="${n}" class="${n === PAIR_COUNT ? "on" : ""}">${n} pairs</button>`).join("")}</div>
      <div><b>Mode</b> ${[["classic", "🧠 Classic"], ["timed", "⏱️ Timed"], ["bot", "🤖 vs Bo-Bot"], ["twist", "🌀 Twist"]].map(([k, l]) => `<button type="button" data-m="${k}" class="${k === MODE ? "on" : ""}">${l}</button>`).join("")}</div>`;
    pick.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { PAIR_COUNT = +b.dataset.n; modePicker(); });
    pick.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { MODE = b.dataset.m; modePicker(); });
  }
  modePicker();
  document.getElementById("mm-play-again-btn").addEventListener("click", () => { document.getElementById("mm-end-overlay").classList.add("hidden"); document.getElementById("mm-start-overlay").classList.remove("hidden"); modePicker(); });
  document.getElementById("mm-start-btn").addEventListener("click", startRound);
}
