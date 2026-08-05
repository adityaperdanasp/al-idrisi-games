/* =========================================================
   AzkaSocial — script.js
   Core game logic: chapter progression, question rendering,
   localStorage saves, theme toggle, Brain Rest timer, and the
   answer-correction display + timing logic per question type.
   ========================================================= */

const PROGRESS_KEY = "azkacraft-progress";
const THEME_KEY = "azkacraft-theme";

// This standalone domain (azkasocial.fun) has no api/ folder or
// ANTHROPIC_API_KEY of its own -- AI calls go to the hub's endpoint
// cross-origin instead (hub's api/generate-hint.js and api/bo-chat.js
// allow this origin via CORS). On the hub itself, API_BASE stays empty
// so the existing relative /api/... calls keep working unchanged.
const API_BASE = ["playalidrisi.fun", "localhost"].includes(location.hostname) ? "" : "https://playalidrisi.fun";

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
  renderDailyContent();
  if (window.AIGBgm) AIGBgm.play("menu");   // starts once the user's first tap unlocks audio

  QUESTION_BANK = await fetch("questions.json").then(r => r.json());
  PROGRESS = loadProgress();
  renderMultiplayerChapterOptions();
  updateHomeStats();
  syncProgressWithCloud();

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

/* ---------------------------- Word of the Day + Fun Fact ---------------------------- */

function renderDailyContent() {
  if (!window.AIGDailyContent) return;
  const { word, meaning } = AIGDailyContent.getWordOfDay();
  const wordEl = document.getElementById("word-of-day-text");
  if (wordEl) wordEl.innerHTML = `${word} <span class="info-sub">— ${meaning}</span>`;

  const factEl = document.getElementById("fun-fact-text");
  if (factEl) factEl.textContent = AIGDailyContent.getFunFact();
}

/* ---------------------------- Theme (Boy/Girl + 3 palettes each) ---------------------------- */

// Each palette's [primary, secondary, accent] — shown as a 3-segment swatch bar.
const PALETTE_COLORS = {
  boy: [
    ["#2F6FED", "#22B573", "#FFB35C"],   // Sky Explorer
    ["#2F9E44", "#2F6FED", "#FFB35C"],   // Forest Ranger
    ["#5B5FEF", "#22B573", "#FF7A59"]    // Space Cadet
  ],
  girl: [
    ["#FF6F91", "#2BB3A3", "#B9A6FF"],   // Coral Bloom
    ["#D6448C", "#5FC9A8", "#FFB4A2"],   // Berry Sorbet
    ["#9B6BFF", "#FF8FAB", "#6EC6FF"]    // Lilac Dream
  ]
};

let currentTheme = null;

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if ((parsed.gender === "boy" || parsed.gender === "girl") && [0, 1, 2].includes(parsed.palette)) {
        return parsed;
      }
    }
  } catch (e) { /* ignore corrupt data */ }
  return { gender: "boy", palette: 0 };
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, JSON.stringify(currentTheme));
}

function initTheme() {
  currentTheme = loadTheme();
  applyTheme();
  renderThemePanel();

  document.getElementById("theme-gender-boy").addEventListener("click", () => setGender("boy"));
  document.getElementById("theme-gender-girl").addEventListener("click", () => setGender("girl"));
}

function setGender(gender) {
  if (currentTheme.gender === gender) return;
  currentTheme.gender = gender;
  currentTheme.palette = 0;
  applyTheme();
  renderThemePanel();
  saveTheme();
}

function setPalette(i) {
  currentTheme.palette = i;
  applyTheme();
  renderThemePanel();
  saveTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-gender", currentTheme.gender);
  document.documentElement.setAttribute("data-palette", String(currentTheme.palette));
}

function renderThemePanel() {
  document.getElementById("theme-gender-boy").classList.toggle("active", currentTheme.gender === "boy");
  document.getElementById("theme-gender-girl").classList.toggle("active", currentTheme.gender === "girl");

  const wrap = document.getElementById("theme-swatches");
  if (!wrap) return;
  wrap.innerHTML = "";
  PALETTE_COLORS[currentTheme.gender].forEach((colors, i) => {
    const btn = document.createElement("button");
    btn.className = "theme-swatch" + (i === currentTheme.palette ? " active" : "");
    btn.title = "Palette " + (i + 1);
    btn.setAttribute("aria-label", "Palette " + (i + 1));
    btn.innerHTML = '<div class="theme-swatch-bar">' +
      colors.map(c => `<span style="background:${c}"></span>`).join("") +
      '</div>';
    btn.addEventListener("click", () => setPalette(i));
    wrap.appendChild(btn);
  });
}

/* ---------------------------- Navigation ---------------------------- */

function showScreen(id, opts = {}) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active", "page-flip"));
  const el = document.getElementById(id);
  el.classList.add("active");
  if (opts.flip) el.classList.add("page-flip");

  if (id === "screen-map") renderBookshelf();
  if (id === "screen-stickers") renderStickers();

  // Background music: soft "menu" loop everywhere except the actual
  // lesson screen, which gets the more energetic "game" loop.
  if (window.AIGBgm) AIGBgm.play(id === "screen-game" ? "game" : "menu");
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
  if (window.AIGLeaderboard) AIGLeaderboard.setProgress("language-arts", PROGRESS);
}

// Merges cloud progress (from Firebase, tied to the child's name) into the
// local copy on boot, so stickers/XP earned on a DIFFERENT device still
// show up here. Per chapter, keeps whichever is further along; XP total
// and unlocked chapter never go backwards. Writes the merged result back
// to both localStorage and the cloud so both sides end up in sync.
function mergeProgress(local, cloud) {
  const merged = {
    xpTotal: Math.max(local.xpTotal || 0, cloud.xpTotal || 0),
    unlockedChapter: Math.max(local.unlockedChapter || 1, cloud.unlockedChapter || 1),
    chapters: {}
  };
  const ids = new Set([...Object.keys(local.chapters || {}), ...Object.keys(cloud.chapters || {})]);
  ids.forEach(id => {
    const l = (local.chapters || {})[id] || { stars: 0, completed: false, xp: 0 };
    const c = (cloud.chapters || {})[id] || { stars: 0, completed: false, xp: 0 };
    merged.chapters[id] = {
      stars: Math.max(l.stars || 0, c.stars || 0),
      completed: !!(l.completed || c.completed),
      xp: Math.max(l.xp || 0, c.xp || 0)
    };
  });
  return merged;
}

async function syncProgressWithCloud() {
  if (!window.AIGLeaderboard) return;
  const cloud = await AIGLeaderboard.getProgress("language-arts").catch(() => null);
  if (cloud) {
    PROGRESS = mergeProgress(PROGRESS, cloud);
    saveProgress();
  } else {
    AIGLeaderboard.setProgress("language-arts", PROGRESS);
  }
  // Refresh whichever progress-dependent screen is already showing.
  if (document.getElementById("screen-map").classList.contains("active")) renderBookshelf();
  if (document.getElementById("screen-stickers").classList.contains("active")) renderStickers();
}

/* ---------------------------- Quest Map / Bookshelf ---------------------------- */

// Same subject → icon/color mapping as the storybook design mockup.
const TOPIC_STYLE = {
  "Spelling":            { icon: "✏️", color: "#FF9F40", colorDark: "#E08428" },
  "Vocabulary":          { icon: "🔤", color: "#FF6F91", colorDark: "#E8547A" },
  "Grammar":             { icon: "📐", color: "#2F6FED", colorDark: "#1E56C4" },
  "Reading Comprehension": { icon: "🌊", color: "#22B573", colorDark: "#158A54" },
  "Creative Writing":    { icon: "🎨", color: "#9B59FF", colorDark: "#7E3EDB" }
};
const CHAPTER_DECO = ["⭐", "✨", "🍃", "🌟", "🎈", "📎", "💫"];

function renderBookshelf() {
  document.getElementById("xp-total").textContent = PROGRESS.xpTotal;
  const shelf = document.getElementById("bookshelf");
  shelf.innerHTML = "";

  QUESTION_BANK.chapters.forEach((chapter, i) => {
    const unlocked = chapter.id <= PROGRESS.unlockedChapter;
    const chStats = PROGRESS.chapters[chapter.id] || { stars: 0 };
    const style = TOPIC_STYLE[chapter.topic] || TOPIC_STYLE.Grammar;
    const justify = i % 2 === 0 ? "flex-start" : "flex-end";
    const iconSide = i % 2 === 0 ? "right" : "left";
    const iconRotate = (i % 3) * 12 - 12;
    const deco = CHAPTER_DECO[i % CHAPTER_DECO.length];
    const borderColor = unlocked ? style.color : "#F1E6D2";
    const starsDisplay = "★".repeat(chStats.stars) + "☆".repeat(3 - chStats.stars);

    const node = document.createElement("div");
    node.className = "timeline-node";
    node.style.justifyContent = justify;
    node.innerHTML = `
      <div class="timeline-deco" style="${iconSide}:2px;transform:translateY(-50%) rotate(${iconRotate}deg)">${deco}</div>
      <button class="timeline-card ${unlocked ? "" : "locked"}" style="border-color:${borderColor}">
        <div class="timeline-icon" style="background:${style.color};box-shadow:0 3px 0 ${style.colorDark}">${unlocked ? style.icon : "🔒"}</div>
        <div class="timeline-text">
          <div class="timeline-title">Ch. ${chapter.id}: ${chapter.title}</div>
          <div class="timeline-meta">
            <span class="timeline-subject" style="color:${style.color};background:${style.color}22">${chapter.topic}</span>
            <span class="timeline-stars">${starsDisplay}</span>
          </div>
        </div>
      </button>
    `;
    if (unlocked) {
      node.querySelector(".timeline-card").addEventListener("click", () => startChapter(chapter.id));
    }
    shelf.appendChild(node);
  });

  startBoBridgeAnim();

  renderMultiplayerChapterOptions();
  updateHomeStats();
}

// Fills in the stat strip on the home screen (streak/badges/chapter progress)
// using real PROGRESS data instead of the mockup's placeholder numbers.
function updateHomeStats() {
  const badgesEl = document.getElementById("stat-badges");
  const chapterEl = document.getElementById("stat-chapter");
  if (!badgesEl || !chapterEl || !PROGRESS) return;
  const earned = Object.values(PROGRESS.chapters || {}).filter(c => c.completed).length;
  badgesEl.textContent = `${earned} Badge${earned === 1 ? "" : "s"}`;
  chapterEl.textContent = `Ch. ${PROGRESS.unlockedChapter} Awaits`;
}

function renderMultiplayerChapterOptions() {
  const hostSelect = document.getElementById("mp-host-chapter");
  hostSelect.innerHTML = QUESTION_BANK.chapters
    .filter(c => c.id <= PROGRESS.unlockedChapter)
    .map(c => `<option value="${c.id}">Ch. ${c.id}: ${c.title}</option>`)
    .join("");
}

/* ---------------------------- Sticker Book ---------------------------- */

// Brief toast announcing a newly-earned sticker — mirrors multipleazka's
// badge-unlock toast so earning a sticker feels the same across both games.
function showStickerToast(icon, name) {
  const toast = document.getElementById("sticker-toast");
  if (!toast) return;
  document.getElementById("sticker-toast-icon").textContent = icon;
  document.getElementById("sticker-toast-name").textContent = name;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2600);
}

function renderStickers() {
  const titleEl = document.getElementById("sticker-book-title");
  if (titleEl) titleEl.textContent = "Sticker Book";

  const grid = document.getElementById("sticker-grid");
  grid.innerHTML = "";
  QUESTION_BANK.chapters.forEach(chapter => {
    const earned = !!(PROGRESS.chapters[chapter.id] && PROGRESS.chapters[chapter.id].completed);
    const slot = document.createElement("div");
    slot.className = "sticker-slot " + (earned ? "earned" : "locked");
    // Locked stickers stay a mystery (no title reveal) until earned — matches
    // the other 2 games' fully-obscured locked state.
    slot.title = earned ? chapter.title : "???";
    slot.textContent = earned ? (STICKER_EMOJI[chapter.stickerId] || "✨") : "🔒";
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
  // A reading passage must always come before its own comprehension
  // questions, so pin it to the front regardless of the shuffle above.
  const passageIdx = list.findIndex(q => q.type === "passage");
  if (passageIdx > 0) {
    const [passage] = list.splice(passageIdx, 1);
    list.unshift(passage);
  }
  return list;
}

// Picks a random subset from the chapter's larger question pool so each
// playthrough draws a fresh 5-question set instead of the whole bank.
//
// Some chapters (e.g. Reading Comprehension) tag questions with a
// `passageId` so they only make sense alongside their own passage text.
// For those, pick ONE passageId's group (passage + its own questions)
// instead of sampling the whole pool, so a kid always gets the story
// before being asked about it -- never a random mix of unrelated
// passages' questions in the same 5-question session.
function pickSessionQuestions(pool, count) {
  const grouped = pool.filter(q => q.passageId);
  if (grouped.length > 0) {
    const passageIds = [...new Set(grouped.map(q => q.passageId))];
    const chosenId = passageIds[Math.floor(Math.random() * passageIds.length)];
    const passageEntry = pool.find(q => q.type === "passage" && q.passageId === chosenId);
    const related = shuffle(pool.filter(q => q.passageId === chosenId && q.type !== "passage"));
    const questions = related.slice(0, count);
    if (questions.length < count) {
      const ungrouped = shuffle(pool.filter(q => !q.passageId));
      questions.push(...ungrouped.slice(0, count - questions.length));
    }
    return passageEntry ? [passageEntry, ...questions] : questions;
  }
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
    multiplayer: mpInfo,
    lastWrong: null   // most recent missed question this session — feeds the AI Tutor hint
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
    case "passage": renderPassage(q, area); break;
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
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, true);
    nextQuestion(1500);
  } else {
    buttons.find(b => b.textContent === selected).classList.add("selected-wrong");
    buttons.find(b => b.textContent === q.answer).classList.add("reveal-correct");
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.lastWrong = { question: q.prompt, correctAnswer: q.answer, kidAnswer: selected, topic: session.chapter.topic };
    session.score += 3;
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, false);
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
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, true);
    nextQuestion(1500);
  } else {
    input.classList.add("wrong");
    document.getElementById("fill-correction").innerHTML =
      `<div class="fill-correction">Correct answer: <strong>${q.answer}</strong></div>`;
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.lastWrong = { question: q.prompt, correctAnswer: q.answer, kidAnswer: input.value.trim(), topic: session.chapter.topic };
    session.score += 3;
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, false);
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
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, true);
    nextQuestion(1500);
  } else {
    const firstWrong = q.pairs.find((p, i) => selects[i].value !== p.right);
    const phrase = AzkaVoice.speakEncouragement(`${firstWrong.left} → ${firstWrong.right}`);
    session.lastWrong = {
      question: `Match: ${firstWrong.left}`,
      correctAnswer: firstWrong.right,
      kidAnswer: selects[q.pairs.indexOf(firstWrong)].value || null,
      topic: session.chapter.topic
    };
    session.score += 3;
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, false);
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

/* ----- Passage (reading-comprehension intro, self-check like flashcard) ----- */
function renderPassage(q, area) {
  area.innerHTML = `
    <div class="passage-card">
      <div class="passage-title">${q.title}</div>
      <div class="passage-body">${q.body}</div>
      <button id="passage-continue" class="btn btn-primary">I've read it — let's go! →</button>
    </div>
  `;
  document.getElementById("passage-continue").addEventListener("click", () => {
    session.score += 5;
    session.correctCount++;
    nextQuestion(300);
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
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, true);
    nextQuestion(1500);
  } else {
    const correction = document.createElement("div");
    correction.className = "fill-correction";
    correction.innerHTML = `Correct sentence: <strong>${q.answer}</strong>`;
    target.after(correction);
    const phrase = AzkaVoice.speakEncouragement(q.answer);
    session.lastWrong = { question: q.prompt, correctAnswer: q.answer, kidAnswer: built, topic: session.chapter.topic };
    session.score += 3;
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", session.chapter.topic, false);
    nextQuestion(5000);
  }
}

/* ---------------------------- Finishing a chapter ---------------------------- */

function finishChapter() {
  if (window.AIGLeaderboard) AIGLeaderboard.recordPlay("language-arts");
  const pct = session.correctCount / session.order.length;
  const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
  const xpEarned = session.score;

  const existing = PROGRESS.chapters[session.chapter.id] || { stars: 0 };
  const isNewSticker = !existing.completed;
  PROGRESS.chapters[session.chapter.id] = {
    stars: Math.max(stars, existing.stars),
    completed: true,
    xp: xpEarned
  };
  PROGRESS.xpTotal += xpEarned;
  if (isNewSticker) {
    showStickerToast(STICKER_EMOJI[session.chapter.stickerId] || "✨", session.chapter.title);
  }
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

/* ---------------------------------------------------------------------
   AI TUTOR ("Bo") — always shown on Brain Rest: explains the last missed
   question (session.lastWrong, set in each handle*Answer() wrong branch)
   or congratulates on a mistake-free session. Collapsed to one message
   until tapped, which reveals follow-up chips + a free-text input for a
   real back-and-forth (api/generate-hint.js's history/followUp params) --
   same interactive pattern as MathVille's reward-screen AI Tutor card.
   Any API failure just shows a generic friendly line instead of the
   personalized one -- never blocks Brain Rest.
   ------------------------------------------------------------------- */
const BO_HINT_CONGRATS_MESSAGES = [
  "Wow, a perfect round! You crushed every question.",
  "Amazing work! Not a single mistake in there.",
  "You nailed it! Want to chat about anything else?",
  "Perfect score -- awesome job!",
  "That was flawless! I'm impressed.",
  "Perfect score! You really know this stuff."
];
let aiHintHistory = [];
let aiHintMissed = null;

(function () {
  const screenBrainrest = document.getElementById("screen-brainrest");
  const card = document.getElementById("ai-hint-card");
  const loading = document.getElementById("ai-hint-loading");
  const thread = document.getElementById("ai-hint-thread");
  const followups = document.getElementById("ai-hint-followups");
  const form = document.getElementById("ai-hint-form");
  if (!screenBrainrest || !card || !loading || !thread) return;

  let lastRequestedFor = null;

  async function loadHint() {
    const perfect = !!(session && session.order && session.correctCount === session.order.length);
    const missed = session && session.lastWrong;
    if (!missed && !perfect) { card.classList.add("hidden"); return; }

    const requestKey = JSON.stringify(missed) + perfect;
    if (requestKey === lastRequestedFor) return;
    lastRequestedFor = requestKey;

    aiHintMissed = missed;
    aiHintHistory = [];
    thread.innerHTML = "";
    followups.classList.add("hidden");
    form.classList.add("hidden");
    card.classList.remove("hidden");
    card.classList.remove("chat-open");

    if (!missed) {
      appendAiHintMessage(BO_HINT_CONGRATS_MESSAGES[Math.floor(Math.random() * BO_HINT_CONGRATS_MESSAGES.length)], "ai");
      return;
    }

    loading.classList.remove("hidden");
    try {
      const res = await fetch(API_BASE + "/api/generate-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameLabel: "Language Arts",
          question: missed.question,
          correctAnswer: missed.correctAnswer,
          kidAnswer: missed.kidAnswer,
          topic: missed.topic
        })
      });
      const data = await res.json();
      if (!res.ok || !data.hint) throw new Error(data.error || "no hint");
      appendAiHintMessage(data.hint, "ai");
      aiHintHistory.push({ role: "assistant", content: data.hint });
    } catch (e) {
      appendAiHintMessage("Nice try on that one! Tap me if you want to chat about it.", "ai");
    } finally {
      loading.classList.add("hidden");
    }
  }

  new MutationObserver(() => {
    if (screenBrainrest.classList.contains("active")) loadHint();
  }).observe(screenBrainrest, { attributes: true, attributeFilter: ["class"] });
})();

function appendAiHintMessage(text, from) {
  const thread = document.getElementById("ai-hint-thread");
  const div = document.createElement("div");
  div.className = "ai-hint-msg ai-hint-msg-" + from;
  if (from === "ai") {
    const avatar = document.createElement("img");
    avatar.className = "ai-hint-avatar";
    avatar.src = "../icon-192.png";
    avatar.alt = "Bo";
    div.appendChild(avatar);
  }
  const textEl = document.createElement("span");
  textEl.className = "ai-hint-msg-text";
  textEl.textContent = text;
  div.appendChild(textEl);
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

async function sendAiHintFollowUp(text) {
  if (!text || !text.trim() || !aiHintMissed) return;
  const loading = document.getElementById("ai-hint-loading");
  const followups = document.getElementById("ai-hint-followups");
  const input = document.getElementById("ai-hint-input");
  appendAiHintMessage(text, "kid");
  const historyBeforeThisTurn = aiHintHistory.slice();
  aiHintHistory.push({ role: "user", content: text });
  input.value = "";
  loading.classList.remove("hidden");
  followups.classList.add("hidden");
  try {
    const res = await fetch(API_BASE + "/api/generate-hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameLabel: "Language Arts",
        question: aiHintMissed.question,
        correctAnswer: aiHintMissed.correctAnswer,
        kidAnswer: aiHintMissed.kidAnswer,
        topic: aiHintMissed.topic,
        history: historyBeforeThisTurn,
        followUp: text
      })
    });
    const data = await res.json();
    if (!res.ok || !data.hint) throw new Error(data.error || "no hint");
    appendAiHintMessage(data.hint, "ai");
    aiHintHistory.push({ role: "assistant", content: data.hint });
  } catch (e) {
    appendAiHintMessage("Hmm, I'm having trouble thinking right now. Try again in a bit!", "ai");
  } finally {
    loading.classList.add("hidden");
    followups.classList.remove("hidden");
  }
}

// Collapsed message -> full chat expansion, wired once (not per loadHint()
// call) so the listener never stacks duplicates across sessions.
(function setupAiHintCardOpen() {
  const card = document.getElementById("ai-hint-card");
  if (!card) return;
  function openChat() {
    if (card.classList.contains("chat-open")) return;
    card.classList.add("chat-open");
    // Quick-reply chips only make sense when Bo was explaining a miss --
    // on a perfect round there's nothing for them to refer to.
    if (aiHintMissed) document.getElementById("ai-hint-followups").classList.remove("hidden");
    document.getElementById("ai-hint-form").classList.remove("hidden");
    setTimeout(() => document.getElementById("ai-hint-input").focus(), 50);
  }
  card.addEventListener("click", openChat);
  // Only react when the card itself is focused, not a descendant input/
  // button -- otherwise Space would get eaten while typing in the chat.
  card.addEventListener("keydown", e => {
    if (e.target !== card) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(); }
  });
})();

(function setupAiHintForm() {
  const form = document.getElementById("ai-hint-form");
  if (!form) return;
  const input = document.getElementById("ai-hint-input");
  document.querySelectorAll("#ai-hint-followups .ai-hint-chip").forEach(chip => {
    chip.addEventListener("click", e => {
      e.stopPropagation();
      sendAiHintFollowUp(chip.dataset.ask);
    });
  });
  // Same real-device gotcha as the game-bo chat input: don't rely on the
  // form's submit event alone to catch Enter -- catch keydown directly.
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    sendAiHintFollowUp(message);
  });
})();

// MOCKUP ONLY — tap Bo on the gameplay screen to open the placeholder
// chat panel, mirrors the hub landing page. Not wired to AI yet. The
// prompt line rotates randomly each time so Bo doesn't feel canned.
const BO_CHAT_PROMPTS = [
  "What's on your mind?", "What confuses you?", "Got a tricky question?",
  "Need a hint?", "What's puzzling you?", "Stuck on something?",
  "Ask me anything!", "What do you have in mind?", "Need a helping hand?",
  "What's tricky right now?", "Wanna talk it through?", "What's bugging you?",
  "Something not clicking?", "What can I explain?", "Need a nudge?",
  "What's the mystery today?", "Tell me what's up!", "What's got you stuck?",
  "Need backup?", "What should we figure out?", "What's swirling in your brain?",
  "Ready to solve something?", "What's the puzzle?", "Need a brain boost?",
  "What's tricky today?", "Whatcha thinking?", "Need a clue?",
  "What's the challenge?", "Want a hint from me?", "What's on your quest?",
  "Ready for a question?", "What's bugging your brain?", "Need some help?",
  "What's confusing right now?", "Let's untangle it!", "What's the tough part?",
  "Curious about something?", "What do you need help with?", "Wanna crack this together?",
  "What's the big question?", "Need me to explain?", "What's got you scratching your head?",
  "Something feel tricky?", "What's the holdup?", "Ready to ask?",
  "What's the sticking point?", "Need a spark of an idea?", "What's next on your mind?",
  "Whatcha stuck on?", "Let's figure it out!", "What's the brain teaser?",
  "Got a question for me?", "What's not making sense?", "Need some clarity?",
  "What's the tricky bit?", "Ready to dig in?", "What's your question?",
  "Need a boost of brainpower?", "What's puzzling your brain?", "Let's crack the code!",
  "What's tripping you up?", "Need a friendly nudge?", "What's the head-scratcher?",
  "Ready to explore?", "What's got you wondering?", "Need help connecting the dots?",
  "What's the missing piece?", "Let's solve this together!", "What's the tricky question?",
  "Need a fresh explanation?", "What's bugging your mind?", "Ready for some help?",
  "What's the puzzle piece?", "Need me to break it down?", "What's the confusing part?",
  "Let's chat about it!", "What's the question of the day?", "Need a different angle?",
  "What's the tricky spot?", "Ready to figure it out?", "What's on your brain?",
  "Need a lightbulb moment?", "What's the stumper?", "Let's tackle it together!",
  "What's got you curious?", "Need help untangling this?", "What's the roadblock?",
  "Ready to ask away?", "What's the mystery to solve?", "Need a spark?",
  "What's the sticky part?", "Let's break it down!", "What's the question on your mind?",
  "Need a boost?", "What's confusing about this?", "Ready to chat?",
  "What's the tricky idea?", "Need help with something?", "What's the puzzle today?",
  "Let's figure this out together!"
];
// Real chat with Bo (api/bo-chat.js) -- tap Bo to open. Each open starts
// a fresh thread with one of Bo's rotating prompts as the opener.
(function setupGameBoChat() {
  const bo = document.getElementById("game-bo");
  const chat = document.getElementById("game-bo-chat");
  const closeBtn = document.getElementById("game-bo-chat-close");
  const thread = document.getElementById("game-bo-chat-thread");
  const loading = document.getElementById("game-bo-chat-loading");
  const form = document.getElementById("game-bo-chat-form");
  const input = document.getElementById("game-bo-chat-input");
  if (!bo || !chat) return;

  let history = [];

  function appendMsg(text, from) {
    const div = document.createElement("div");
    div.className = "sc-bo-msg sc-bo-msg-" + from;
    if (from === "bo") {
      const avatar = document.createElement("img");
      avatar.className = "sc-bo-msg-avatar";
      avatar.src = "../icon-192.png";
      avatar.alt = "Bo";
      div.appendChild(avatar);
    }
    const textEl = document.createElement("span");
    textEl.className = "sc-bo-msg-text";
    textEl.textContent = text;
    div.appendChild(textEl);
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  async function sendMessage(message) {
    appendMsg(message, "kid");
    history.push({ role: "user", content: message });
    loading.classList.remove("hidden");
    try {
      const player = window.AIGPlayer && AIGPlayer.getPlayer();
      const res = await fetch(API_BASE + "/api/bo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: player ? player.name : undefined,
          message,
          history: history.slice(0, -1)
        })
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        appendMsg(data.reply, "bo");
        history.push({ role: "assistant", content: data.reply });
      } else {
        appendMsg("Hmm, my brain hiccuped! Try asking again?", "bo");
      }
    } catch (e) {
      appendMsg("Oops, I couldn't hear that. Try again?", "bo");
    } finally {
      loading.classList.add("hidden");
    }
  }

  const hint = document.getElementById("game-bo-hint");
  bo.addEventListener("click", () => {
    chat.hidden = false;
    if (hint) hint.style.display = "none";
    thread.innerHTML = "";
    history = [];
    appendMsg("Bo here! " + BO_CHAT_PROMPTS[Math.floor(Math.random() * BO_CHAT_PROMPTS.length)], "bo");
    setTimeout(() => input.focus(), 50);
  });
  if (closeBtn) closeBtn.addEventListener("click", e => { e.stopPropagation(); chat.hidden = true; });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    sendMessage(message);
  });
  // Same real-device gotcha as the AI Tutor input: don't rely on the
  // form's submit event alone to catch Enter -- catch keydown directly.
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      form.requestSubmit();
    }
  });
})();

/* =================================================================
   Bo Bridge — ambient decoration on the Storybook Trail (#screen-map)
   -----------------------------------------------------------------
   Pure eye-candy, NOT a game: Bo walks across a row of glass tiles,
   entering from one edge of the screen and exiting the other, looping
   forever. Tiles fade in just ahead of Bo and fade out just behind him
   (a moving "reveal window" tied to his walk progress), so the bridge
   feels like it's materializing under his feet and dissolving after.
   No clicking, no questions, no win/lose -- this replaced an earlier,
   fully-interactive "Glass Bridge Challenge" mini-game per explicit
   request ("jangan jadi card... ditaro di dalam page... sebagai
   animasi"). Same rAF-driven-position idea as the hub landing page's
   roaming car+dino decoration, just linear (no chase AI) and simpler.
   ================================================================= */
const BO_BRIDGE_TILES = 9;
const BO_BRIDGE_DURATION_MS = 8000; // one full left-to-right crossing
const BO_BRIDGE_REVEAL_WINDOW = 0.16; // fraction of the crossing a tile stays "shown" around Bo
let boBridgeRafId = null;
let boBridgeStartAt = null;
let boBridgeTilesBuilt = false;

function ensureBoBridgeTiles() {
  if (boBridgeTilesBuilt) return;
  const wrap = document.getElementById("bo-bridge-tiles");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i = 0; i < BO_BRIDGE_TILES; i++) {
    const tile = document.createElement("div");
    tile.className = "bo-bridge-tile";
    wrap.appendChild(tile);
  }
  boBridgeTilesBuilt = true;
}

function startBoBridgeAnim() {
  ensureBoBridgeTiles();
  const banner = document.getElementById("bo-bridge-banner");
  const walker = document.getElementById("bo-bridge-walker");
  if (!banner || !walker) return;
  if (boBridgeRafId) return; // already running, don't stack loops

  const tiles = [...document.getElementById("bo-bridge-tiles").children];

  function frame(now) {
    // Stop cleanly once the trail screen isn't visible anymore (no point
    // animating an off-screen element, and this lets a later re-entry
    // restart the loop instead of finding one already "running").
    if (!document.getElementById("screen-map").classList.contains("active")) {
      boBridgeRafId = null;
      boBridgeStartAt = null;
      return;
    }

    if (boBridgeStartAt === null) boBridgeStartAt = now;
    const progress = ((now - boBridgeStartAt) % BO_BRIDGE_DURATION_MS) / BO_BRIDGE_DURATION_MS; // 0..1, loops

    const bannerWidth = banner.clientWidth;
    const walkerX = -40 + progress * (bannerWidth + 80); // enters off-left, exits off-right
    walker.style.transform = `translateX(${walkerX}px)`;

    tiles.forEach((tile, i) => {
      const tileFrac = (i + 0.5) / BO_BRIDGE_TILES; // this tile's position along the crossing, 0..1
      let diff = progress - tileFrac;
      // handle the loop seam so the reveal window still works right as
      // progress wraps from ~1 back to 0
      if (diff > 0.5) diff -= 1;
      if (diff < -0.5) diff += 1;
      const shown = diff > -BO_BRIDGE_REVEAL_WINDOW && diff < BO_BRIDGE_REVEAL_WINDOW;
      tile.classList.toggle("shown", shown);
    });

    boBridgeRafId = requestAnimationFrame(frame);
  }
  boBridgeRafId = requestAnimationFrame(frame);
}

document.getElementById("bo-bridge-banner").addEventListener("click", launchGlassBridge);

/* =================================================================
   GLASS BRIDGE CHALLENGE (top-down vertical walk)
   -----------------------------------------------------------------
   Reintroduced per explicit request -- tapping the Bo Bridge banner
   (the ambient decoration above) launches this as a real game again.
   Player holds #glass-move-btn to walk up a vertical column of 10
   tiles (requestAnimationFrame loop, same "hold to move" shape as a
   reflex mini-game). Reaching a tile boundary pauses movement and pops
   a 2-option MC question pulled from THIS game's own question bank
   (chapters 1-5 only -- 6/7 are "Reading Comprehension"/"Creative
   Writing", whose MC questions all reference a passage that isn't
   shown here, so they're excluded, same rule already used by
   MathVille's Focus Round/Plane Mode cross-game question pools).
   Wrong answer cracks the tile and re-rolls a fresh question on the
   SAME tile -- 3 tries total before it shatters, the player sprite
   falls, and the phone vibrates. Entirely separate screen/state --
   no shared code with the rest of the game, and no code shared with
   startBoBridgeAnim() above either (that one keeps running as pure
   decoration whether or not this game has ever been played).
   ================================================================= */
const GLASS_TOTAL_STEPS = 10;
const GLASS_MAX_ATTEMPTS = 3;
const GLASS_MOVE_SPEED = 1.3; // % of track per frame while held
let glassState = null;
let glassQuestionPool = null;

function ensureGlassQuestionPool() {
  if (glassQuestionPool || !QUESTION_BANK) return;
  glassQuestionPool = [];
  QUESTION_BANK.chapters.forEach(ch => {
    if (ch.id === 6 || ch.id === 7) return; // passage-based, can't stand alone
    ch.questions.forEach(q => {
      if (q.type === "mc" && Array.isArray(q.options) && q.options.length >= 2) {
        glassQuestionPool.push({ prompt: q.prompt, options: q.options, answer: q.answer });
      }
    });
  });
}

function launchGlassBridge() {
  ensureGlassQuestionPool();
  showScreen("screen-glass");
  glassState = { stepIndex: 0, attempt: 1, progress: 0, moving: false, paused: false, ended: false, rafId: null };
  document.getElementById("glass-end-overlay").classList.add("hidden");
  document.getElementById("glass-question-overlay").classList.add("hidden");
  document.getElementById("glass-player").classList.remove("falling", "walking");
  document.getElementById("glass-player").style.bottom = "0%";
  updateGlassHud();
  renderGlassPath();
  startGlassLoop();
}

function updateGlassHud() {
  document.getElementById("glass-step").textContent = `Step ${glassState.stepIndex}/${GLASS_TOTAL_STEPS}`;
  document.getElementById("glass-attempts").textContent = `Try ${glassState.attempt}/${GLASS_MAX_ATTEMPTS}`;
}

function renderGlassPath() {
  const path = document.getElementById("glass-path");
  path.innerHTML = "";
  for (let i = 0; i < GLASS_TOTAL_STEPS; i++) {
    const tile = document.createElement("div");
    tile.className = "glass-tile";
    tile.id = `glass-tile-${i}`;
    path.appendChild(tile);
  }
}

function startGlassLoop() {
  function frame() {
    if (!glassState || glassState.ended) return;
    if (glassState.moving && !glassState.paused) {
      const nextBoundary = (glassState.stepIndex + 1) * (100 / GLASS_TOTAL_STEPS);
      glassState.progress = Math.min(nextBoundary, glassState.progress + GLASS_MOVE_SPEED);
      document.getElementById("glass-player").style.bottom = glassState.progress + "%";
      if (glassState.progress >= nextBoundary - 0.01) {
        glassState.paused = true;
        glassState.moving = false;
        document.getElementById("glass-player").classList.remove("walking");
        showGlassQuestion();
      }
    }
    glassState.rafId = requestAnimationFrame(frame);
  }
  glassState.rafId = requestAnimationFrame(frame);
}

function showGlassQuestion() {
  updateGlassHud();
  document.getElementById(`glass-tile-${glassState.stepIndex}`).classList.add("current");
  const light = document.getElementById("glass-light");
  light.textContent = "🔴";
  light.classList.remove("green");

  const q = glassQuestionPool[Math.floor(Math.random() * glassQuestionPool.length)];
  const wrongOptions = q.options.filter(o => o !== q.answer);
  const wrongPick = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  const pair = shuffle([q.answer, wrongPick]);

  document.getElementById("glass-prompt").textContent = q.prompt;

  const panelIds = ["glass-panel-a", "glass-panel-b"];
  panelIds.forEach((id, i) => {
    const btn = document.getElementById(id);
    btn.textContent = pair[i];
    btn.disabled = false;
    btn.className = "glass-panel";
    btn.onclick = () => handleGlassPanel(pair[i] === q.answer, id);
  });

  document.getElementById("glass-question-overlay").classList.remove("hidden");
}

function handleGlassPanel(isCorrect, clickedId) {
  if (glassState.ended) return;
  document.getElementById("glass-panel-a").disabled = true;
  document.getElementById("glass-panel-b").disabled = true;
  if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("language-arts", "glass-bridge", isCorrect);

  const tile = document.getElementById(`glass-tile-${glassState.stepIndex}`);

  if (isCorrect) {
    document.getElementById(clickedId).classList.add("safe");
    const light = document.getElementById("glass-light");
    light.textContent = "🟢";
    light.classList.add("green");
    tile.classList.remove("current", "crack-1", "crack-2");
    tile.classList.add("done");
    glassState.stepIndex += 1;
    glassState.attempt = 1;
    updateGlassHud();
    setTimeout(() => {
      document.getElementById("glass-question-overlay").classList.add("hidden");
      if (glassState.stepIndex >= GLASS_TOTAL_STEPS) endGlassBridge(true);
      else glassState.paused = false; // player must hold the button again to keep walking
    }, 600);
  } else {
    document.getElementById(clickedId).classList.add("broken");
    if (glassState.attempt >= GLASS_MAX_ATTEMPTS) {
      tile.classList.add("crack-3");
      if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 250]);
      setTimeout(() => {
        document.getElementById("glass-question-overlay").classList.add("hidden");
        document.getElementById("glass-player").classList.add("falling");
        setTimeout(() => endGlassBridge(false), 500);
      }, 500);
    } else {
      tile.classList.add(glassState.attempt === 1 ? "crack-1" : "crack-2");
      glassState.attempt += 1;
      updateGlassHud();
      setTimeout(() => showGlassQuestion(), 600); // same tile, fresh question, one try burned
    }
  }
}

function endGlassBridge(won) {
  glassState.ended = true;
  document.getElementById("glass-end-emoji").textContent = won ? "🏆" : "💦";
  document.getElementById("glass-end-title").textContent = won ? "You crossed the bridge!" : "You fell!";
  document.getElementById("glass-end-sub").textContent = `Made it to step ${glassState.stepIndex}/${GLASS_TOTAL_STEPS}`;
  document.getElementById("glass-end-overlay").classList.remove("hidden");
}

(function setupGlassMoveButton() {
  const btn = document.getElementById("glass-move-btn");
  const start = e => {
    e.preventDefault();
    if (!glassState || glassState.paused) return;
    glassState.moving = true;
    document.getElementById("glass-player").classList.add("walking");
  };
  const stop = () => {
    if (glassState) glassState.moving = false;
    document.getElementById("glass-player").classList.remove("walking");
  };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
})();

document.getElementById("glass-end-replay").addEventListener("click", () => launchGlassBridge());
