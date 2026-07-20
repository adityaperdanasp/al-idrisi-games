/* =========================================================
   AzkaSocial — script.js
   Core game logic: chapter progression, question rendering,
   localStorage saves, theme toggle, Brain Rest timer, and the
   answer-correction display + timing logic per question type.
   ========================================================= */

const PROGRESS_KEY = "azkacraft-progress";
const THEME_KEY = "azkacraft-theme";

const STICKER_EMOJI = {
  "sticker-interview": "🎤",
  "sticker-spelling": "🔤",
  "sticker-antonym": "🔄",
  "sticker-affixes": "🧩",
  "sticker-contraction": "✂️",
  "sticker-punctuation": "❗",
  "sticker-reading": "📖",
  "sticker-creative": "✍️"
};

const QUESTIONS_PER_SESSION = 5;

let QUESTION_BANK = null;   // loaded from questions.json
let PROGRESS = null;        // loaded/saved to localStorage

let session = null;         // active play session state
let multiplayer = null;     // { role, code, unsubscribe }

/* ---------------------------- Boot ---------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  wireNavigation();
  wireMultiplayerSetup();
  wireBrainRest();

  QUESTION_BANK = await fetch("questions.json").then(r => r.json());
  PROGRESS = loadProgress();
  renderMultiplayerChapterOptions();

  // If we arrived via a scanned QR join link (?join=CODE), jump to the join panel.
  const params = new URLSearchParams(location.search);
  const joinCode = params.get("join");
  if (joinCode) {
    showScreen("screen-multiplayer-setup");
    document.getElementById("mp-join-panel").classList.remove("hidden");
    document.getElementById("mp-host-panel").classList.add("hidden");
    document.getElementById("mp-join-code").value = joinCode.toUpperCase();
  }
});

/* ---------------------------- Theme ---------------------------- */

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "colorful";
  document.body.setAttribute("data-theme", saved);
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme");
  const next = current === "colorful" ? "pastel" : "colorful";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
}

/* ---------------------------- Navigation ---------------------------- */

function showScreen(id, opts = {}) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active", "page-flip"));
  const el = document.getElementById(id);
  el.classList.add("active");
  if (opts.flip) el.classList.add("page-flip");

  if (id === "screen-map") renderBookshelf();
  if (id === "screen-stickers") renderStickers();
}

function wireNavigation() {
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.back));
  });

  document.getElementById("btn-solo").addEventListener("click", () => {
    multiplayer = null;
    showScreen("screen-map", { flip: true });
  });

  document.getElementById("btn-multiplayer").addEventListener("click", () => {
    showScreen("screen-multiplayer-setup");
  });

  document.getElementById("btn-stickers").addEventListener("click", () => {
    showScreen("screen-stickers");
  });
}

/* ---------------------------- Progress (localStorage) ---------------------------- */

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt data */ }
  return { xpTotal: 0, unlockedChapter: 1, chapters: {} };
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(PROGRESS));
}

/* ---------------------------- Quest Map / Bookshelf ---------------------------- */

function renderBookshelf() {
  document.getElementById("xp-total").textContent = PROGRESS.xpTotal;
  const shelf = document.getElementById("bookshelf");
  shelf.innerHTML = "";

  QUESTION_BANK.chapters.forEach(chapter => {
    const unlocked = chapter.id <= PROGRESS.unlockedChapter;
    const chStats = PROGRESS.chapters[chapter.id] || { stars: 0 };

    const card = document.createElement("div");
    card.className = "chapter-book " + (unlocked ? "unlocked" : "locked");
    card.innerHTML = `
      <div class="book-icon">${unlocked ? "📖" : "📕"}</div>
      <div class="book-title">Ch. ${chapter.id}: ${chapter.title}</div>
      <div class="book-topic">${chapter.topic}</div>
      <div class="book-stars">${"⭐".repeat(chStats.stars)}${"☆".repeat(3 - chStats.stars)}</div>
    `;
    if (unlocked) {
      card.addEventListener("click", () => startChapter(chapter.id));
    }
    shelf.appendChild(card);
  });

  renderMultiplayerChapterOptions();
}

function renderMultiplayerChapterOptions() {
  const hostSelect = document.getElementById("mp-host-chapter");
  hostSelect.innerHTML = QUESTION_BANK.chapters
    .filter(c => c.id <= PROGRESS.unlockedChapter)
    .map(c => `<option value="${c.id}">Ch. ${c.id}: ${c.title}</option>`)
    .join("");
}

/* ---------------------------- Sticker Book ---------------------------- */

function renderStickers() {
  const grid = document.getElementById("sticker-grid");
  grid.innerHTML = "";
  QUESTION_BANK.chapters.forEach(chapter => {
    const earned = !!(PROGRESS.chapters[chapter.id] && PROGRESS.chapters[chapter.id].completed);
    const slot = document.createElement("div");
    slot.className = "sticker-slot " + (earned ? "earned" : "");
    slot.title = chapter.title;
    slot.textContent = earned ? (STICKER_EMOJI[chapter.stickerId] || "✨") : "?";
    grid.appendChild(slot);
  });
}

/* ---------------------------- Question ordering (no repeat type twice in a row) ---------------------------- */

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function buildQuestionOrder(questions) {
  const list = shuffle(questions);
  for (let i = 1; i < list.length; i++) {
    if (list[i].type === list[i - 1].type) {
      const swapWith = list.findIndex((q, idx) => idx > i && q.type !== list[i - 1].type);
      if (swapWith !== -1) {
        [list[i], list[swapWith]] = [list[swapWith], list[i]];
      }
    }
  }
  return list;
}

// Picks a random subset from the chapter's larger question pool so each
// playthrough draws a fresh 5-question set instead of the whole bank.
function pickSessionQuestions(pool, count) {
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/* ---------------------------- Starting a chapter ---------------------------- */

function startChapter(chapterId, mpInfo = null) {
  const chapter = QUESTION_BANK.chapters.find(c => c.id === chapterId);
  const sessionQuestions = pickSessionQuestions(chapter.questions, QUESTIONS_PER_SESSION);
  startChapterWithQuestions(chapterId, sessionQuestions, mpInfo);
}

// Used directly by Multiplayer so both players race the exact same 5
// questions (picked once by the host and shared via Firebase), instead of
// each device independently sampling its own random subset.
function startChapterWithQuestions(chapterId, questions, mpInfo = null) {
  const chapter = QUESTION_BANK.chapters.find(c => c.id === chapterId);
  session = {
    chapter,
    order: buildQuestionOrder(questions),
    index: 0,
    score: 0,
    correctCount: 0,
    multiplayer: mpInfo
  };
  showScreen("screen-game", { flip: true });
  renderProgressBar();
  renderCurrentQuestion();
}

function renderProgressBar() {
  const pct = Math.round((session.index / session.order.length) * 100);
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("game-score").textContent = session.score;
}

/* ---------------------------- Story snippet ---------------------------- */

// Shown as text only before the chapter's first question — never spoken
// aloud, and not repeated before questions 2-5.
function showStorySnippet() {
  const el = document.getElementById("story-snippet");
  if (session.index === 0) {
    el.textContent = session.chapter.snippet;
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

/* ---------------------------- Rendering questions ---------------------------- */

function renderCurrentQuestion() {
  renderProgressBar();

  if (session.index >= session.order.length) {
    finishChapter();
    return;
  }

  showStorySnippet();

  const q = session.order[session.index];
  const area = document.getElementById("question-area");
  area.innerHTML = "";

  switch (q.type) {
    case "mc": renderMC(q, area); break;
    case "fill": renderFill(q, area); break;
    case "match": renderMatch(q, area, false); break;
    case "craft-match": renderMatch(q, area, true); break;
    case "flashcard": renderFlashcard(q, area); break;
    case "sentence-builder": renderSentenceBuilder(q, area); break;
    default: area.textContent = "Unsupported question type.";
  }
}

function nextQuestion(delayMs) {
  setTimeout(() => {
    session.index++;
    syncMultiplayerProgress();
    renderCurrentQuestion();
  }, delayMs);
}

/* ----- Multiple Choice ----- */
function renderMC(q, area) {
  area.innerHTML = `
    <div class="question-prompt">${q.prompt}</div>
    <div class="options-grid" id="mc-options"></div>
  `;
  const grid = document.getElementById("mc-options");
  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleMCAnswer(opt, q, grid));
    grid.appendChild(btn);
  });
}

function handleMCAnswer(selected, q, grid) {
  const buttons = [...grid.querySelectorAll(".option-btn")];
  buttons.forEach(b => (b.disabled = true));
  const isCorrect = selected === q.answer;

  if (isCorrect) {
    buttons.find(b => b.textContent === selected).classList.add("selected-correct");
    const phrase = AzkaVoice.speakPraise();
    session.score += 10;
    session.correctCount++;
    nextQuestion(1500);
  } else {
    buttons.find(b => b.textContent === selected).classList.add("selected-wrong");
    buttons.find(b => b.textContent === q.answer).classList.add("reveal-correct");
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.score += 3;
    nextQuestion(5000);
  }
}

/* ----- Fill in the blank ----- */
function renderFill(q, area) {
  area.innerHTML = `
    <div class="question-prompt">${q.prompt}</div>
    <form class="fill-form" id="fill-form">
      <input class="fill-input" id="fill-input" type="text" autocomplete="off" placeholder="Type your answer...">
      <button type="submit" class="btn btn-primary">Check Answer</button>
      <div id="fill-correction"></div>
    </form>
  `;
  document.getElementById("fill-form").addEventListener("submit", e => {
    e.preventDefault();
    handleFillAnswer(q);
  });
}

function handleFillAnswer(q) {
  const input = document.getElementById("fill-input");
  const submitBtn = document.querySelector("#fill-form button[type=submit]");
  input.disabled = true;
  submitBtn.disabled = true;

  const given = input.value.trim().toLowerCase();
  const correct = q.answer.trim().toLowerCase();
  const isCorrect = given === correct;

  if (isCorrect) {
    input.classList.add("correct");
    const phrase = AzkaVoice.speakPraise();
    session.score += 10;
    session.correctCount++;
    nextQuestion(1500);
  } else {
    input.classList.add("wrong");
    document.getElementById("fill-correction").innerHTML =
      `<div class="fill-correction">Correct answer: <strong>${q.answer}</strong></div>`;
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.score += 3;
    nextQuestion(5000);
  }
}

/* ----- Matching (also used for Craft/Color Match) ----- */
function renderMatch(q, area, isCraft) {
  const rightOptions = q.pairs.map(p => p.right);
  area.innerHTML = `
    <div class="question-prompt">${isCraft ? '<span class="craft-icon">🖌️</span>' : ""}${q.prompt}</div>
    <div class="match-grid" id="match-grid"></div>
    <button id="match-submit" class="btn btn-primary" style="margin-top:14px;">Check Matches</button>
  `;
  const grid = document.getElementById("match-grid");
  q.pairs.forEach((pair, i) => {
    const row = document.createElement("div");
    row.className = "match-row";
    row.dataset.index = i;
    const options = ['<option value="">Choose...</option>']
      .concat(rightOptions.map(r => `<option value="${r}">${r}</option>`))
      .join("");
    row.innerHTML = `
      <div class="match-left">${pair.left}</div>
      <div>→</div>
      <select>${options}</select>
    `;
    grid.appendChild(row);
  });

  document.getElementById("match-submit").addEventListener("click", () => handleMatchAnswer(q, grid));
}

function handleMatchAnswer(q, grid) {
  const rows = [...grid.querySelectorAll(".match-row")];
  const selects = rows.map(r => r.querySelector("select"));
  selects.forEach(s => (s.disabled = true));
  document.getElementById("match-submit").disabled = true;

  let allCorrect = true;
  rows.forEach((row, i) => {
    const pair = q.pairs[i];
    const chosen = selects[i].value;
    const correct = chosen === pair.right;
    if (correct) {
      row.classList.add("row-correct");
    } else {
      allCorrect = false;
      row.classList.add("row-wrong");
      const correction = document.createElement("div");
      correction.className = "row-correction";
      correction.textContent = `Correct: ${pair.left} → ${pair.right}`;
      row.appendChild(correction);
    }
  });

  if (allCorrect) {
    const phrase = AzkaVoice.speakPraise();
    session.score += 10;
    session.correctCount++;
    nextQuestion(1500);
  } else {
    const firstWrong = q.pairs.find((p, i) => selects[i].value !== p.right);
    const phrase = AzkaVoice.speakEncouragement(`${firstWrong.left} → ${firstWrong.right}`);
    session.score += 3;
    nextQuestion(7000);
  }
}

/* ----- Flashcard (self-check, no wrong state) ----- */
function renderFlashcard(q, area) {
  area.innerHTML = `
    <div class="flashcard">
      <div class="flashcard-word">${q.word}</div>
      <div class="flashcard-def">${q.definition}</div>
      <div class="flashcard-example">"${q.example}"</div>
      <button id="flash-got-it" class="btn btn-primary">Got it! 👍</button>
    </div>
  `;
  document.getElementById("flash-got-it").addEventListener("click", () => {
    const phrase = AzkaVoice.speakPraise();
    session.score += 5;
    session.correctCount++;
    nextQuestion(1500);
  });
}

/* ----- Sentence Builder ----- */
function renderSentenceBuilder(q, area) {
  area.innerHTML = `
    <div class="question-prompt">${q.prompt}</div>
    <div class="sb-target" id="sb-target"></div>
    <div class="sb-bank" id="sb-bank"></div>
    <button id="sb-submit" class="btn btn-primary">Check Sentence</button>
  `;
  const bank = document.getElementById("sb-bank");
  const target = document.getElementById("sb-target");
  const shuffled = [...q.words].sort(() => Math.random() - 0.5);

  shuffled.forEach(word => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sb-word";
    chip.textContent = word;
    chip.addEventListener("click", () => {
      target.appendChild(chip);
      chip.dataset.placed = "true";
    });
    bank.appendChild(chip);
  });

  target.addEventListener("click", e => {
    if (e.target.classList.contains("sb-word")) {
      bank.appendChild(e.target);
    }
  });

  document.getElementById("sb-submit").addEventListener("click", () => handleSentenceAnswer(q, target));
}

function handleSentenceAnswer(q, target) {
  document.getElementById("sb-submit").disabled = true;
  const built = [...target.querySelectorAll(".sb-word")].map(w => w.textContent).join(" ");
  const isCorrect = built.trim() === q.answer.trim();

  if (isCorrect) {
    const phrase = AzkaVoice.speakPraise();
    session.score += 10;
    session.correctCount++;
    nextQuestion(1500);
  } else {
    const correction = document.createElement("div");
    correction.className = "fill-correction";
    correction.innerHTML = `Correct sentence: <strong>${q.answer}</strong>`;
    target.after(correction);
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.score += 3;
    nextQuestion(5000);
  }
}

/* ---------------------------- Finishing a chapter ---------------------------- */

function finishChapter() {
  const pct = session.correctCount / session.order.length;
  const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
  const xpEarned = session.score;

  const existing = PROGRESS.chapters[session.chapter.id] || { stars: 0 };
  PROGRESS.chapters[session.chapter.id] = {
    stars: Math.max(stars, existing.stars),
    completed: true,
    xp: xpEarned
  };
  PROGRESS.xpTotal += xpEarned;
  if (session.chapter.id === PROGRESS.unlockedChapter && PROGRESS.unlockedChapter < QUESTION_BANK.chapters.length) {
    PROGRESS.unlockedChapter++;
  }
  saveProgress();

  if (session.multiplayer) {
    AzkaFirebase.finishGame(session.multiplayer.code, session.multiplayer.role);
  }

  showBrainRest();
}

/* ---------------------------- Brain Rest ---------------------------- */

let brainRestInterval = null;

function showBrainRest() {
  showScreen("screen-brainrest");
  let seconds = 10;
  document.getElementById("brainrest-timer").textContent = seconds;
  clearInterval(brainRestInterval);
  brainRestInterval = setInterval(() => {
    seconds--;
    document.getElementById("brainrest-timer").textContent = seconds;
    if (seconds <= 0) endBrainRest();
  }, 1000);
}

function endBrainRest() {
  clearInterval(brainRestInterval);
  showScreen("screen-map", { flip: true });
}

function wireBrainRest() {
  document.getElementById("btn-skip-rest").addEventListener("click", endBrainRest);
}

/* ---------------------------- Multiplayer setup ---------------------------- */

function wireMultiplayerSetup() {
  const hostPanel = document.getElementById("mp-host-panel");
  const joinPanel = document.getElementById("mp-join-panel");

  document.getElementById("btn-mp-host").addEventListener("click", () => {
    hostPanel.classList.remove("hidden");
    joinPanel.classList.add("hidden");
  });
  document.getElementById("btn-mp-join").addEventListener("click", () => {
    joinPanel.classList.remove("hidden");
    hostPanel.classList.add("hidden");
  });

  document.getElementById("mp-create-game").addEventListener("click", async () => {
    const chapterId = parseInt(document.getElementById("mp-host-chapter").value, 10);
    const chapter = QUESTION_BANK.chapters.find(c => c.id === chapterId);
    // Pick the 5 questions once on the host and share their indices via
    // Firebase, so both players race the exact same question set.
    const sessionQuestions = pickSessionQuestions(chapter.questions, QUESTIONS_PER_SESSION);
    const questionIndices = sessionQuestions.map(q => chapter.questions.indexOf(q));
    const code = await AzkaFirebase.createGame(chapterId, questionIndices);
    if (!code) {
      alert("Multiplayer needs Firebase configured — see firebase.js for setup steps.");
      return;
    }
    document.getElementById("mp-host-result").classList.remove("hidden");
    document.getElementById("mp-pairing-code").textContent = code;
    AzkaQR.renderPairingQR(document.getElementById("mp-qr-box"), code);

    const unsubscribe = AzkaFirebase.listenToGame(code, gameState => {
      if (gameState && gameState.status === "playing" && gameState.players.guest) {
        unsubscribe();
        multiplayer = { role: "host", code, unsubscribe: null };
        startChapterWithQuestions(chapterId, questionIndices.map(i => chapter.questions[i]), multiplayer);
      }
    });
  });

  document.getElementById("mp-join-submit").addEventListener("click", async () => {
    const code = document.getElementById("mp-join-code").value.trim().toUpperCase();
    const errorEl = document.getElementById("mp-join-error");
    errorEl.classList.add("hidden");
    if (code.length !== 6) {
      errorEl.textContent = "Please enter the full 6-character code.";
      errorEl.classList.remove("hidden");
      return;
    }
    const ok = await AzkaFirebase.joinGame(code, "Azka's Friend");
    if (!ok) {
      errorEl.textContent = "That code wasn't found. Double-check with your friend!";
      errorEl.classList.remove("hidden");
      return;
    }
    const snap = await new Promise(resolve => {
      const unsub = AzkaFirebase.listenToGame(code, state => {
        unsub();
        resolve(state);
      });
    });
    multiplayer = { role: "guest", code, unsubscribe: null };
    const chapter = QUESTION_BANK.chapters.find(c => c.id === snap.chapterId);
    const sharedQuestions = snap.questionIndices.map(i => chapter.questions[i]);
    startChapterWithQuestions(snap.chapterId, sharedQuestions, multiplayer);
  });

  document.getElementById("mp-scan-qr").addEventListener("click", () => {
    const box = document.getElementById("mp-scan-box");
    box.classList.remove("hidden");
    AzkaQR.startQRScan(
      document.getElementById("mp-scan-video"),
      document.getElementById("mp-scan-canvas"),
      code => {
        document.getElementById("mp-join-code").value = code;
        box.classList.add("hidden");
      },
      () => {
        alert("Couldn't access the camera. You can type the code instead.");
        box.classList.add("hidden");
      }
    );
  });

  document.getElementById("mp-scan-cancel").addEventListener("click", () => {
    AzkaQR.stopQRScan();
    document.getElementById("mp-scan-box").classList.add("hidden");
  });
}

function syncMultiplayerProgress() {
  if (!session.multiplayer) return;
  AzkaFirebase.updateProgress(session.multiplayer.code, session.multiplayer.role, session.index, session.score);
}
