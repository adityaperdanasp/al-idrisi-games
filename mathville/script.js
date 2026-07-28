/* =================================================================
   MathVille — script.js
   Blockville Workshop: a chapter-map math game for Grade 4 (9 chapters,
   in curriculum order). Reuses the hub's Firebase project for
   solo/2-player/3-player multiplayer (path mathvilleGames/{code} —
   kept separate from the hub's leaderboard/topicStats data and from
   the other 3 games' own dedicated Firebase projects).

   Sections:
     1. Identity, constants, chapter metadata
     2. Screen navigation + progress persistence
     3. Round builder (mixes static bank + generators per chapter)
     4. Grading helpers
     5. Question rendering — 4 interaction types
     6. Reward screen + AI Tutor hint
     7. Town map (solo)
     8. Multiplayer — pairing, shared rounds, results
   ================================================================= */

/* =================================================================
   1. IDENTITY, CONSTANTS, CHAPTER METADATA
   ================================================================= */
const CHILD_NAME = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "Explorer";
const CHILD_ID = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().id) || "guest";

// Town-stop flavor per chapter — order matches MATHVILLE_BANK (= PDF order).
// mapX/mapY are the exact node positions from the validated Claude Design
// prototype (built for these same 9 chapters) — a winding two-column path,
// left/right alternating, top to bottom.
// Row gap widened to 170px (was 130px) so the road curve clears even a
// 3-line wrapped title (e.g. "Prime Number (Multiples and Factoring)")
// before sweeping toward the next stop — same smooth curve, just more
// room, instead of kinking the path around the text.
const CHAPTER_META = {
  "place-value": { location: "Town Hall", icon: "🏛️", mapX: 80, mapY: 70 },
  "addition-subtraction": { location: "Bakery", icon: "🥐", mapX: 340, mapY: 240 },
  "prime-numbers": { location: "Factor Grove", icon: "🌳", mapX: 80, mapY: 410 },
  "gcf-lcm": { location: "Twin Bridges", icon: "🌉", mapX: 340, mapY: 580 },
  "multiplication": { location: "Windmill", icon: "🎡", mapX: 80, mapY: 750 },
  "division": { location: "Water Tower", icon: "🚰", mapX: 340, mapY: 920 },
  "mixed-operation": { location: "Crossroads Plaza", icon: "🚦", mapX: 80, mapY: 1090 },
  "measurement": { location: "General Store", icon: "🏪", mapX: 340, mapY: 1260 },
  "rounding": { location: "Clock Tower", icon: "🕰️", mapX: 80, mapY: 1430 }
};
const MAP_HEIGHT = 1520;

// Decorative scenery scattered along the road — purely cosmetic, recolored
// to the Blockville wood/gold/cherry/taupe palette.
const MAP_ORNAMENTS = [
  { x: 150, y: 8, shape: "cloud", color: "#E8D9C4", size: 52, kind: "drift" },
  { x: -14, y: 50, shape: "mountain", color: "#A88E6B", size: 64, kind: "still" },
  { x: 8, y: 190, shape: "tree", color: "#8FAE6B", size: 40, kind: "sway" },
  { x: 400, y: 155, shape: "bush", color: "#C1793E", size: 44, kind: "sway" },
  { x: 400, y: 385, shape: "house", color: "#E4572E", size: 34, kind: "bob" },
  { x: 370, y: 320, shape: "bird", color: "#8a6a4a", size: 24, kind: "drift" },
  { x: 8, y: 525, shape: "bush", color: "#F7C548", size: 38, kind: "sway" },
  { x: -10, y: 590, shape: "wave", color: "#8FBFC4", size: 60, kind: "still" },
  { x: 400, y: 715, shape: "cloud", color: "#D8C7AE", size: 46, kind: "drift" },
  { x: 4, y: 780, shape: "deer", color: "#B48A5A", size: 40, kind: "still" },
  { x: 8, y: 855, shape: "tree", color: "#8FAE6B", size: 34, kind: "sway" },
  { x: 400, y: 820, shape: "house", color: "#F7C548", size: 32, kind: "bob" },
  { x: 400, y: 970, shape: "mountain", color: "#8B9E7A", size: 56, kind: "still" },
  { x: 8, y: 1020, shape: "tree", color: "#C1793E", size: 38, kind: "sway" },
  { x: 400, y: 1135, shape: "wave", color: "#A7CEC8", size: 54, kind: "still" },
  { x: 400, y: 1200, shape: "bush", color: "#E4572E", size: 42, kind: "sway" },
  { x: 20, y: 1290, shape: "bird", color: "#8a6a4a", size: 22, kind: "drift" },
  { x: 8, y: 1440, shape: "tree", color: "#8FAE6B", size: 36, kind: "sway" },
  { x: 380, y: 1480, shape: "deer", color: "#B48A5A", size: 38, kind: "still" }
];

function catmullRomPath(pts) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 5, cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5, cp2y = p2.y - (p3.y - p1.y) / 5;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

// Same curve as catmullRomPath, but as one standalone "d" string per
// segment (chapter i -> i+1) so the traveler can sample points along the
// exact segment it's walking via getPointAtLength — following the curve
// instead of cutting a straight diagonal across it.
function catmullRomSegments(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 5, cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5, cp2y = p2.y - (p3.y - p1.y) / 5;
    segs.push(`M${p1.x},${p1.y} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`);
  }
  return segs;
}

// Draws the dashed road as individual per-segment <path> elements
// (id="mv-path-seg-N") so the traveler can later sample points along
// whichever exact segment it's walking.
function drawMapPathSvg(wrap, chapters) {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("width", "440");
  svg.setAttribute("height", String(MAP_HEIGHT));
  svg.style.cssText = "position:absolute;top:0;left:0;max-width:100%;";
  const pts = chapters.map(ch => ({ x: CHAPTER_META[ch.id].mapX, y: CHAPTER_META[ch.id].mapY }));
  const segs = catmullRomSegments(pts);
  svg.innerHTML = segs.map((d, i) =>
    `<path id="mv-path-seg-${i}" d="${d}" fill="none" stroke="#D8C7AE" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 18"/>`
  ).join("");
  wrap.appendChild(svg);
}

function ornamentSvg(o) {
  const shapes = {
    cloud: `<svg viewBox="0 0 40 22" width="${o.size}" height="${o.size}"><path d="M9 20 a7 7 0 0 1 -1 -13.9 A9 9 0 0 1 25 4 a7 7 0 0 1 6 16 z" fill="${o.color}"/></svg>`,
    tree: `<svg viewBox="0 0 24 32" width="${o.size}" height="${o.size}"><rect x="10" y="22" width="4" height="9" fill="${o.color}"/><circle cx="12" cy="12" r="11" fill="${o.color}"/></svg>`,
    bush: `<svg viewBox="0 0 32 18" width="${o.size}" height="${o.size}"><circle cx="9" cy="11" r="8" fill="${o.color}"/><circle cx="20" cy="8" r="9" fill="${o.color}"/><circle cx="27" cy="12" r="6" fill="${o.color}"/></svg>`,
    house: `<svg viewBox="0 0 28 26" width="${o.size}" height="${o.size}"><path d="M14 1 L27 12 H21 V25 H7 V12 H1 Z" fill="${o.color}"/></svg>`,
    mountain: `<svg viewBox="0 0 48 28" width="${o.size}" height="${o.size}">
      <path d="M0 28 L14 6 L22 18 L30 2 L48 28 Z" fill="${o.color}"/>
      <path d="M30 2 L36 12 L33 12 L36 8 L39 12 L36 12" fill="#fff" opacity=".7"/>
    </svg>`,
    wave: `<svg viewBox="0 0 60 16" width="${o.size}" height="${o.size}"><path d="M0 8 Q7.5 1 15 8 T30 8 T45 8 T60 8 V16 H0 Z" fill="${o.color}"/></svg>`,
    deer: `<svg viewBox="0 0 32 30" width="${o.size}" height="${o.size}">
      <path d="M9 4 L7 10 M9 4 L11 9 M23 4 L25 10 M23 4 L21 9" stroke="${o.color}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="16" cy="16" rx="7" ry="6" fill="${o.color}"/>
      <circle cx="16" cy="8" r="5" fill="${o.color}"/>
      <rect x="14" y="21" width="2" height="7" fill="${o.color}"/><rect x="18" y="21" width="2" height="7" fill="${o.color}"/>
    </svg>`,
    bird: `<svg viewBox="0 0 30 18" width="${o.size}" height="${o.size}">
      <path d="M2 10 Q8 2 15 9 Q22 2 28 10" stroke="${o.color}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    </svg>`
  };
  return shapes[o.shape] || "";
}
const ORNAMENT_ANIM = { drift: "mvDrift", sway: "mvSway", bob: "mvBob", still: "none" };
const PLACE_NAMES = ["Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands", "Hundred Thousands", "Millions"];
const ROUND_SIZE = 6;

const $ = id => document.getElementById(id);

// Runtime state for THIS device/session.
const state = {
  mode: null,          // 'solo' | 'multiplayer'
  chapterId: null,
  steps: [],
  stepIndex: 0,
  mistakes: 0,
  lastWrong: null,     // {prompt, answer} of the most recent miss — feeds the AI Tutor hint
  starsEarned: 0,
  mp: {
    code: null, seatKey: null, maxPlayers: 2,
    listeningCode: null, game: null,
    enteredMap: false, roundActive: false, resultsShown: false
  }
};

/* =================================================================
   2. SCREEN NAVIGATION + PROGRESS PERSISTENCE
   ================================================================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  const hideNav = id === "screen-landing" || id === "screen-pair";
  $("btn-map").classList.toggle("hidden", hideNav);
  $("btn-drive").classList.toggle("hidden", hideNav);
  // The map's width can only be measured once the screen is actually
  // visible (display:none reports clientWidth 0) — re-fit right after
  // it becomes active, regardless of which code path got us here.
  if (id === "screen-map") requestAnimationFrame(mvFitMapScale);
  // Leaving the drive screen (city collision, Home, switching to the
  // tap-map) should stop its rAF loop rather than let it spin unseen.
  if (id !== "screen-drive") {
    cancelDriveLoop();
    driveCountdownToken++;             // cancel any in-flight countdown timeout
    $("drive-countdown").classList.add("hidden");
  }
}

$("btn-home").addEventListener("click", () => { window.location.href = "../"; });
$("btn-map").addEventListener("click", goToMap);

function loadProgress() {
  try {
    const raw = localStorage.getItem("mathville.progress");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupt data — fall through to fresh progress */ }
  return { chapters: {}, xpTotal: 0 };
}
let PROGRESS = loadProgress();

function saveProgressToStorage() {
  localStorage.setItem("mathville.progress", JSON.stringify(PROGRESS));
}

function saveChapterProgress(chapterId, stars, xp) {
  const existing = PROGRESS.chapters[chapterId] || { stars: 0, completed: false };
  PROGRESS.chapters[chapterId] = { stars: Math.max(existing.stars, stars), completed: true };
  PROGRESS.xpTotal = (PROGRESS.xpTotal || 0) + xp;
  saveProgressToStorage();
  if (window.AIGLeaderboard) {
    AIGLeaderboard.recordPlay("mathville");
    // Mirrors PROGRESS to players/{id}/badges/mathville — same pattern the
    // other 3 games use — so the teacher/parent dashboard can show chapter
    // completion for MathVille too, not just topicStats/play count.
    AIGLeaderboard.setProgress("mathville", { chapters: PROGRESS.chapters, xpTotal: PROGRESS.xpTotal });
  }
}

function updateXpBadge() {
  $("xp-total").textContent = PROGRESS.xpTotal || 0;
}
updateXpBadge();

/* Mode select (Landing screen) */
$("btn-mode-solo").addEventListener("click", () => {
  state.mode = "solo";
  goToMap();
});
$("btn-mode-multiplayer").addEventListener("click", () => {
  state.mode = "multiplayer";
  resetPairUI();
  showScreen("screen-pair");
});

document.querySelectorAll(".back-btn, [data-back]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

/* =================================================================
   TOWN MAP (solo)
   ================================================================= */
function goToMap() {
  renderTownMap();
  showScreen("screen-map");
}

// Boy/Girl theme — purely a cosmetic accent color for the "next stop" glow,
// nothing is ever locked behind it. Persisted so it sticks across visits.
state.theme = localStorage.getItem("mathville.theme") || "boy";
$("theme-btn-boy").classList.toggle("active", state.theme === "boy");
$("theme-btn-girl").classList.toggle("active", state.theme === "girl");
function mvThemeAccent() { return state.theme === "girl" ? "#C23E82" : "#3B82C4"; }
function setMathvilleTheme(t) {
  state.theme = t;
  localStorage.setItem("mathville.theme", t);
  $("theme-btn-boy").classList.toggle("active", t === "boy");
  $("theme-btn-girl").classList.toggle("active", t === "girl");
  if ($("screen-map").classList.contains("active")) renderTownMap();
}
$("theme-btn-boy").addEventListener("click", () => setMathvilleTheme("boy"));
$("theme-btn-girl").addEventListener("click", () => setMathvilleTheme("girl"));

function renderTownMap() {
  const wrap = $("town-map-inner");
  wrap.innerHTML = "";
  wrap.style.height = MAP_HEIGHT + "px";
  const chapters = MATHVILLE_BANK.chapters;
  const accent = mvThemeAccent();

  // Nothing is ever locked — but the first not-yet-completed stop still
  // gets a gentle pulse as a "start here" suggestion.
  const nextIdx = chapters.findIndex(ch => !(PROGRESS.chapters[ch.id] || {}).completed);

  drawMapPathSvg(wrap, chapters);

  MAP_ORNAMENTS.forEach((o, i) => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${o.x}px;top:${o.y}px;opacity:.85;animation:${ORNAMENT_ANIM[o.kind]} ${3 + (i % 4) * 0.7}s ease-in-out infinite;animation-delay:${(i % 5) * 0.3}s`;
    el.innerHTML = ornamentSvg(o);
    wrap.appendChild(el);
  });

  chapters.forEach((ch, i) => {
    const meta = CHAPTER_META[ch.id];
    const prog = PROGRESS.chapters[ch.id] || { stars: 0, completed: false };
    const isNext = i === nextIdx;
    const stop = document.createElement("div");
    stop.className = "map-stop";
    stop.style.cssText = `left:${meta.mapX}px;top:${meta.mapY}px;`;
    stop.innerHTML = `
      <div class="map-stop-node ${prog.completed ? "complete" : isNext ? "next" : "open"}" style="${isNext ? `--pulse-color:${hexToRgb(accent)}` : ""}">
        <span>${meta.icon}</span>
        ${prog.completed ? '<span class="map-stop-check">✓</span>' : ""}
      </div>
      <div class="map-stop-title">${ch.title}</div>
      ${prog.completed ? `<div class="map-stop-stars">${"★".repeat(prog.stars)}${"☆".repeat(3 - prog.stars)}</div>` : ""}
    `;
    stop.addEventListener("click", () => mvWalkTo(i, () => goToIntro(ch.id, false)));
    wrap.appendChild(stop);
  });

  mvPlaceTraveler(chapters, nextIdx === -1 ? chapters.length - 1 : nextIdx);
  mvFitMapScale();
}

// The map's road/stops are laid out in a fixed 440px-wide coordinate space
// (matches CHAPTER_META's mapX/mapY and the SVG path math) — this scales
// that whole canvas down via CSS transform to fit whatever width is
// actually available, so it never overflows a narrow phone screen.
function mvFitMapScale() {
  const outer = $("town-map");
  const inner = $("town-map-inner");
  if (!outer || !inner) return;
  const availWidth = outer.clientWidth || 440;
  const scale = Math.min(1, availWidth / 440);
  inner.style.transform = `scale(${scale})`;
  outer.style.height = (MAP_HEIGHT * scale) + "px";
}
window.addEventListener("resize", () => {
  if ($("screen-map").classList.contains("active")) mvFitMapScale();
});

/* =================================================================
   MAP TRAVELER — a little walking figure that follows the actual road
   (samples points along the SVG curve via getPointAtLength, same
   technique SolarQuest's rocket ship uses) whenever a stop is tapped,
   hopping segment by segment and arriving before the chapter opens.
   ================================================================= */
let mvTravelerIdx = null;
const MV_HOP_MS = 2800; // per road segment — matches SolarQuest's ~3s ship hop

function mvPlaceTraveler(chapters, defaultIdx) {
  if (mvTravelerIdx === null || mvTravelerIdx >= chapters.length) mvTravelerIdx = defaultIdx;
  const wrap = $("town-map-inner");
  let traveler = document.getElementById("map-traveler");
  if (!traveler) {
    traveler = document.createElement("div");
    traveler.id = "map-traveler";
    traveler.className = "map-traveler";
    traveler.innerHTML = "🚚";
  }
  const meta = CHAPTER_META[chapters[mvTravelerIdx].id];
  traveler.style.left = meta.mapX + "px";
  traveler.style.top = (meta.mapY - 46) + "px";
  // Idle facing: point toward wherever the truck would walk next (falls
  // back to the previous stop's direction at the very last chapter).
  const refCh = chapters[mvTravelerIdx + 1] || chapters[mvTravelerIdx - 1];
  if (refCh) traveler.classList.toggle("facing-left", CHAPTER_META[refCh.id].mapX > meta.mapX);
  wrap.appendChild(traveler);
}

// Point at fraction `t` (0..1) along road segment `index`, walked in its
// natural start-to-end direction (chapter i -> i+1) unless `reversed`.
function mvPointOnSeg(index, t, reversed) {
  const el = document.getElementById("mv-path-seg-" + index);
  if (!el) return null;
  const len = el.getTotalLength();
  const p = el.getPointAtLength(len * Math.max(0, Math.min(1, reversed ? 1 - t : t)));
  return { x: p.x, y: p.y };
}

function mvWalkTo(targetIdx, onComplete) {
  const chapters = MATHVILLE_BANK.chapters;
  if (mvTravelerIdx === null) mvTravelerIdx = targetIdx;
  if (mvTravelerIdx === targetIdx) { onComplete(); return; }
  const traveler = document.getElementById("map-traveler");
  if (!traveler) { mvTravelerIdx = targetIdx; onComplete(); return; }

  const from = mvTravelerIdx;
  const dir = targetIdx > from ? 1 : -1;
  const hops = [];
  for (let n = from; n !== targetIdx; n += dir) hops.push({ segIndex: dir === 1 ? n : n - 1, reversed: dir === -1 });

  traveler.classList.add("walking");

  function runHop(hopIdx) {
    if (hopIdx >= hops.length) {
      mvTravelerIdx = targetIdx;
      traveler.classList.remove("walking");
      onComplete();
      return;
    }
    const { segIndex, reversed } = hops[hopIdx];
    const segStart = mvPointOnSeg(segIndex, 0, reversed);
    const segEnd = mvPointOnSeg(segIndex, 1, reversed);
    // 🚚's default artwork already faces left, so the mirror (scaleX(-1),
    // applied via the "facing-left" class) is what makes it face RIGHT —
    // flip only when actually moving rightward.
    if (segEnd && segStart) traveler.classList.toggle("facing-left", segEnd.x > segStart.x);

    const startTime = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - startTime) / MV_HOP_MS);
      const p = mvPointOnSeg(segIndex, t, reversed);
      if (p) {
        traveler.style.left = p.x + "px";
        traveler.style.top = (p.y - 46) + "px";
      }
      if (t < 1) requestAnimationFrame(frame);
      else runHop(hopIdx + 1);
    }
    requestAnimationFrame(frame);
  }
  runHop(0);
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Small illustrative examples shown under the intro text for chapters where
// seeing one worked example up front helps before the round starts.
const INTRO_DEMOS = {
  "place-value": {
    label: "5.985.465 — one digit, one job",
    cells: [
      { d: "5", place: "Millions", sep: true },
      { d: "9", place: "Hundred Thousands" },
      { d: "8", place: "Ten Thousands" },
      { d: "5", place: "Thousands", sep: true },
      { d: "4", place: "Hundreds" },
      { d: "6", place: "Tens" },
      { d: "5", place: "Ones" }
    ]
  }
};

function goToIntro(chapterId, isMp) {
  const chapterData = MATHVILLE_BANK.chapters.find(c => c.id === chapterId);
  const meta = CHAPTER_META[chapterId];
  $("intro-icon").textContent = meta.icon;
  $("intro-title").textContent = chapterData.title;
  $("intro-location").textContent = meta.location;
  $("intro-text").textContent = chapterData.intro;

  const demo = INTRO_DEMOS[chapterId];
  $("intro-demo").classList.toggle("hidden", !demo);
  if (demo) {
    $("intro-demo-label").textContent = demo.label;
    const row = $("intro-demo-row");
    row.innerHTML = "";
    demo.cells.forEach(cell => {
      const cellEl = document.createElement("div");
      cellEl.className = "intro-demo-cell";
      cellEl.innerHTML = `<div class="intro-demo-digit">${cell.d}</div><div class="intro-demo-place">${cell.place}</div>`;
      row.appendChild(cellEl);
      if (cell.sep) {
        const dot = document.createElement("div");
        dot.className = "intro-demo-sep";
        dot.textContent = ".";
        row.appendChild(dot);
      }
    });
  }

  showScreen("screen-intro");

  $("btn-start-questions").onclick = () => {
    state.chapterId = chapterId;
    state.stepIndex = 0;
    state.mistakes = 0;
    state.lastWrong = null;
    state.steps = isMp ? state.mp.game.roundQuestions : buildRound(chapterId);
    renderStep();
  };
}

/* =================================================================
   DRIVE MODE — free-roam alternative to the tap-map. Single screen,
   no camera/scroll: everything lives in a 0-100 x 0-100 percentage
   coordinate space that maps 1:1 onto CSS left%/top%, so collision
   math never needs to know the world's actual pixel size. A d-pad
   (press-and-hold) drives the truck; bumping a building enters that
   chapter (same flow as the tap-map), bumping a cone pops one quick
   question from the same generators the chapters already use.
   ================================================================= */
const DRIVE_SPEED = 0.3888;   // % of world per animation frame, at full joystick deflection (-20% again)
const DINO_SPEED = DRIVE_SPEED * 1.1 * 0.8; // 10% faster than the car's top speed, then -20% (scales with DRIVE_SPEED, so this drops 20% too)
const DRIVE_DINO_AVOID_RANGE_PX = 55; // real pixels — was a raw % distance, which on this
                                       // tall (non-square) field meant the avoid check
                                       // triggered at very different real distances depending
                                       // on whether the obstacle was mostly-sideways or
                                       // mostly-ahead, so avoidance worked on some obstacles
                                       // and not others.
const DRIVE_SCORE_TARGET = 25;
const DRIVE_MAX_BITES = 3;
const DRIVE_BITE_COOLDOWN_MS = 3000;  // 3s of immunity after a bite
const DRIVE_BITE_KNOCKBACK = 16;     // % distance the dino is pushed back after a bite, so it can't insta-rebite
// Collision radii in real PIXELS (not %) — the world isn't square, so
// mixing raw % units in one hypot() distorted distance depending on
// approach angle. Roughly matched to each icon's actual visual
// half-size, with a little forgiveness so a near-miss doesn't feel
// like a hit.
const DRIVE_CAR_PX_R = 13.5; // matches the -10% car sprite size
const DRIVE_OBSTACLE_PX_R = 11;
const DRIVE_CITY_PX_R = 17;
const DRIVE_DINO_PX_R = 13;
const DRIVE_CAR_START = { x: 50, y: 93 };
const DRIVE_DINO_START = { x: 100 - DRIVE_CAR_START.x, y: 100 - DRIVE_CAR_START.y }; // opposite corner from the car
// Hard difficulty's 2nd dino starts in a different corner from the 1st
// (DRIVE_CAR_START.x is 50 -- dead center -- so mirroring only the y
// axis like DRIVE_DINO_START does would land both dinos on the exact
// same spot; this picks a distinct top corner instead).
const DRIVE_DINO2_START = { x: 12, y: 100 - DRIVE_CAR_START.y };

// --- Nitro boost: hold to go faster, drains a fuel meter that only
// refills while NOT boosting. Simple push-your-luck resource, no ammo
// counter to read mid-race. ---
const DRIVE_NITRO_MULT = 1.6;       // speed multiplier while boosting
const DRIVE_NITRO_DRAIN_PER_MS = 100 / 2500;  // empty in 2.5s of continuous boost
const DRIVE_NITRO_REGEN_PER_MS = 100 / 6000;  // full refill in 6s of not boosting

// --- Water gun: aim with the right-thumb stick, hold to stream. A dino
// caught in the cone accumulates "wet" time; 3 accumulated seconds
// triggers a temporary slow. The tank empties after a short continuous
// stream and needs a cooldown before it can fire again (limits it
// without a literal ammo count). ---
const DRIVE_WATER_RANGE_PX = 85;
const DRIVE_WATER_CONE_RAD = Math.PI / 5; // half-angle, ~36° total cone
const DRIVE_WATER_WET_NEEDED_MS = 3000;
const DRIVE_WATER_SLOW_MS = 2000;
const DRIVE_WATER_SLOW_MULT = 0.7; // -30% speed
const DRIVE_WATER_MAX_STREAM_MS = 1500;
const DRIVE_WATER_COOLDOWN_MS = 1500;
const DRIVE_AIM_DEADZONE = 0.3; // joystick must be pushed this far out before it counts as "aiming"
// Spread across the now much-bigger play field (roughly a 3x3 grid),
// keeping clear of the joystick's bottom-left overlay.
const DRIVE_CITY_POS = [
  { x: 15, y: 12 }, { x: 50, y: 9 }, { x: 85, y: 14 },
  { x: 12, y: 38 }, { x: 50, y: 40 }, { x: 88, y: 36 },
  { x: 18, y: 64 }, { x: 50, y: 66 }, { x: 82, y: 62 }
];
const DRIVE_QUICK_GEN_KEYS = [
  "place-value", "addition-subtraction-add", "addition-subtraction-sub",
  "multiplication", "division", "measurement", "rounding"
];
// Drive Mode city markers use topic icons (not the town-map's whimsical
// building icons) so a kid can tell what's inside at a glance.
const DRIVE_CITY_ICONS = {
  "place-value": "🔢",
  "addition-subtraction": "➕",
  "prime-numbers": "🌳",
  "gcf-lcm": "🧩",
  "multiplication": "✖️",
  "division": "➗",
  "mixed-operation": "🔀",
  "measurement": "📏",
  "rounding": "🎯"
};
// A little variety so obstacles don't all look like the same yellow
// barrier — purely cosmetic, doesn't affect collision size/behavior.
const DRIVE_OBSTACLE_ICONS = ["🚧", "🪨", "🚦", "🪵", "⚠️", "🧱"];
// Purely cosmetic backdrop scenery for the drive world, in % coordinates —
// same palette/shapes as the town-map ornaments, so the two screens feel
// like one continuous countryside instead of the drive screen being bare.
const DRIVE_SCENERY = [
  { x: 4, y: 6, shape: "mountain", color: "#A88E6B", size: 46, kind: "still" },
  { x: 92, y: 8, shape: "cloud", color: "#E8D9C4", size: 36, kind: "drift" },
  { x: 50, y: 4, shape: "cloud", color: "#D8C7AE", size: 30, kind: "drift" },
  { x: 8, y: 22, shape: "tree", color: "#8FAE6B", size: 26, kind: "sway" },
  { x: 95, y: 25, shape: "tree", color: "#8FAE6B", size: 24, kind: "sway" },
  { x: 3, y: 60, shape: "bush", color: "#C1793E", size: 24, kind: "sway" },
  { x: 96, y: 62, shape: "deer", color: "#B48A5A", size: 26, kind: "still" },
  { x: 6, y: 90, shape: "wave", color: "#A7CEC8", size: 34, kind: "still" },
  { x: 90, y: 92, shape: "wave", color: "#8FBFC4", size: 30, kind: "still" },
  { x: 50, y: 96, shape: "bush", color: "#F7C548", size: 22, kind: "sway" }
];

let driveState = null;
let driveJoyVec = { x: 0, y: 0 }; // normalized -1..1, magnitude = joystick deflection
let driveAimVec = { x: 0, y: 0 }; // right-thumb stick, same convention as driveJoyVec
let driveBoosting = false; // held down = true, drives nitro drain/regen each frame
// Score + bite count survive a side-trip into a chapter (city collision
// routes there and back) — only a *fresh* Drive Mode entry resets them.
let driveSession = null;

// resume=true when returning from a chapter (score/bites carry over);
// false/omitted for a brand-new session from the topbar button.
function goToDrive(resume) {
  if (!resume || !driveSession) driveSession = { score: 0, bites: 0 };
  // Hard difficulty gets a 2nd dino from a different starting corner.
  // Each dino tracks its own bite cooldown and water "wet" progress
  // independently, so dousing one doesn't affect the other.
  const dinoStarts = driveDifficulty === "hard"
    ? [DRIVE_DINO_START, DRIVE_DINO2_START]
    : [DRIVE_DINO_START];
  driveState = {
    x: DRIVE_CAR_START.x, y: DRIVE_CAR_START.y,
    dinos: dinoStarts.map((pos, i) => ({
      id: "drive-dino" + (i === 0 ? "" : "-" + (i + 1)),
      x: pos.x, y: pos.y,
      biteCooldownUntil: 0, wetMs: 0, slowUntil: 0
    })),
    nitroFuel: 100,
    water: { streamMsLeft: DRIVE_WATER_MAX_STREAM_MS, coolUntil: 0 },
    cities: [], obstacles: [], rafId: null, paused: false, worldRect: null, ended: false
  };
  // The world must be visible (display:block, not display:none) before
  // getBoundingClientRect() returns real dimensions — measure it before
  // placing obstacles, since their spawn-exclusion zones need real
  // pixels too (see buildDriveWorld).
  showScreen("screen-drive");
  const rect = $("drive-world").getBoundingClientRect();
  if (rect.width === 0) {
    // The ?drive=1 deep-link calls this synchronously on page load,
    // before the browser has painted anything — getBoundingClientRect
    // is unreliable that early. Retry once real layout exists instead
    // of building the world (and every obstacle spawn-exclusion check)
    // against a bogus 0-width rect.
    requestAnimationFrame(() => goToDrive(resume));
    return;
  }
  driveState.worldRect = rect;
  renderDriveScenery();
  buildDriveDinoElements();
  buildDriveWorld();
  $("drive-car").style.transform = "rotate(0deg)"; // top-down sprite is drawn nose-up already
  driveState.dinos.forEach(d => {
    const el = $(d.id);
    el.style.left = d.x + "%";
    el.style.top = d.y + "%";
  });
  $("drive-end-overlay").classList.add("hidden");
  $("drive-water-stream").classList.add("hidden");
  updateDriveHud();
  startDriveLoop();
}

// The 2nd dino (hard difficulty only) doesn't exist in the static HTML —
// create/remove its element to match however many dinos this run has,
// reusing the same markup/classes as the always-present 1st dino.
function buildDriveDinoElements() {
  const world = $("drive-world");
  world.querySelectorAll(".drive-dino-extra").forEach(el => el.remove());
  const template = $("drive-dino");
  driveState.dinos.forEach((d, i) => {
    if (i === 0) return; // #drive-dino already exists in the markup
    const el = template.cloneNode(true);
    el.id = d.id;
    el.classList.add("drive-dino-extra");
    world.appendChild(el);
  });
}

function updateDriveHud() {
  $("drive-score").textContent = `⭐ ${driveSession.score}/${DRIVE_SCORE_TARGET}`;
  $("drive-lives").textContent = "❤️".repeat(DRIVE_MAX_BITES - driveSession.bites) + "🖤".repeat(driveSession.bites);
}

function renderDriveScenery() {
  const world = $("drive-world");
  world.querySelectorAll(".drive-scenery").forEach(el => el.remove());
  DRIVE_SCENERY.forEach(o => {
    const el = document.createElement("div");
    el.className = "drive-scenery";
    el.style.left = o.x + "%";
    el.style.top = o.y + "%";
    el.style.animation = ORNAMENT_ANIM[o.kind] !== "none" ? `${ORNAMENT_ANIM[o.kind]} ${3 + Math.random() * 2}s ease-in-out infinite` : "none";
    el.innerHTML = ornamentSvg(o);
    world.appendChild(el);
  });
}

function buildDriveWorld() {
  const chapters = MATHVILLE_BANK.chapters;
  driveState.cities = chapters.map((ch, i) => ({
    id: ch.id, title: ch.title.replace(/\s*\(.*?\)/g, "").trim(), icon: DRIVE_CITY_ICONS[ch.id] || CHAPTER_META[ch.id].icon,
    x: DRIVE_CITY_POS[i].x, y: DRIVE_CITY_POS[i].y,
    completed: !!(PROGRESS.chapters[ch.id] || {}).completed
  }));

  driveState.obstacles = [];
  const targetCount = rand(6, 9); // a few more now that the field is bigger
  let guard = 0;
  while (driveState.obstacles.length < targetCount && guard++ < 300) {
    const cand = { x: rand(6, 94), y: rand(12, 92) };
    // Real pixels, not raw % — the world is much taller than it's wide,
    // so a %-only check could pass "far enough" while actually landing
    // inside real collision range (this let obstacles spawn right on
    // top of the car's start point).
    const tooCloseToCity = driveState.cities.some(c => drivePxDist(c.x, c.y, cand.x, cand.y) < 40);
    const tooCloseToObstacle = driveState.obstacles.some(o => drivePxDist(o.x, o.y, cand.x, cand.y) < 34);
    const tooCloseToStart = drivePxDist(DRIVE_CAR_START.x, DRIVE_CAR_START.y, cand.x, cand.y) < 36;
    const tooCloseToDino = driveState.dinos.some(d => drivePxDist(d.x, d.y, cand.x, cand.y) < 36);
    const underJoystick = cand.x < 28 && cand.y > 74; // bottom-left corner, covered by the steering joystick
    const underAimStick = cand.x > 72 && cand.y > 74; // bottom-right corner, covered by the aim joystick
    if (!tooCloseToCity && !tooCloseToObstacle && !tooCloseToStart && !tooCloseToDino && !underJoystick && !underAimStick) {
      driveState.obstacles.push({
        id: "obs" + driveState.obstacles.length, x: cand.x, y: cand.y,
        icon: DRIVE_OBSTACLE_ICONS[rand(0, DRIVE_OBSTACLE_ICONS.length - 1)]
      });
    }
  }
  renderDriveWorld();
}

function renderDriveWorld() {
  const world = $("drive-world");
  world.querySelectorAll(".drive-city, .drive-obstacle").forEach(el => el.remove());

  driveState.cities.forEach(c => {
    const el = document.createElement("div");
    el.className = "drive-city";
    el.style.left = c.x + "%";
    el.style.top = c.y + "%";
    const check = c.completed ? `<span class="drive-city-check">✅</span>` : "";
    el.innerHTML = `<span>${c.icon}</span>${check}<div class="drive-city-label">${escapeHtml(c.title)}</div>`;
    world.appendChild(el);
  });

  driveState.obstacles.forEach(o => {
    const el = document.createElement("div");
    el.className = "drive-obstacle";
    el.id = "drive-" + o.id;
    el.style.left = o.x + "%";
    el.style.top = o.y + "%";
    el.textContent = o.icon;
    world.appendChild(el);
  });

  const car = $("drive-car");
  car.style.left = driveState.x + "%";
  car.style.top = driveState.y + "%";
}

// The top-down sprites are drawn nose-up (θ=-90° in screen-coordinate
// atan2 terms) — this converts a travel angle into the CSS rotation
// that makes a sprite's nose point the way it's actually moving.
function driveHeadingCss(angleRad) { return (angleRad * 180 / Math.PI) + 90; }

// Steers the dino's pursuit angle away from the single closest obstacle
// ahead of it, so it curves around obstacles instead of running a
// straight line through them. Not full pathfinding — just enough to
// read as "alive" rather than a robot beeline.
function dinoSteerAngle(dino, desiredAngle, obstacles) {
  const rect = driveState.worldRect;
  let nearest = null, nearestDist = Infinity;
  for (const o of obstacles) {
    // Real pixels, not raw % — see DRIVE_DINO_AVOID_RANGE_PX.
    const d = Math.hypot((o.x - dino.x) / 100 * rect.width, (o.y - dino.y) / 100 * rect.height);
    if (d < DRIVE_DINO_AVOID_RANGE_PX && d < nearestDist) { nearest = o; nearestDist = d; }
  }
  if (!nearest) return desiredAngle;
  const toObstacle = Math.atan2(nearest.y - dino.y, nearest.x - dino.x);
  const diff = Math.atan2(Math.sin(toObstacle - desiredAngle), Math.cos(toObstacle - desiredAngle));
  if (Math.abs(diff) > Math.PI / 2.2) return desiredAngle; // obstacle isn't roughly ahead — ignore it
  const avoidStrength = (DRIVE_DINO_AVOID_RANGE_PX - nearestDist) / DRIVE_DINO_AVOID_RANGE_PX;
  const turn = diff >= 0 ? -1 : 1; // veer away from whichever side the obstacle is on
  return desiredAngle + turn * (Math.PI / 3) * avoidStrength;
}

const DRIVE_FRAME_MS = 1000 / 60; // requestAnimationFrame assumed ~60fps, matching DRIVE_SPEED's own "per frame" units

function startDriveLoop() {
  cancelDriveLoop();
  function frame() {
    if (!driveState || driveState.ended) return;
    if (!driveState.paused) {
      driveNitroTick();
      const speedMult = driveBoosting && driveState.nitroFuel > 0 ? DRIVE_NITRO_MULT : 1;
      const mag = Math.min(1, Math.hypot(driveJoyVec.x, driveJoyVec.y));
      if (mag > 0.05) {
        const angle = Math.atan2(driveJoyVec.y, driveJoyVec.x); // 0=right,90=down (screen coords)
        driveState.x = Math.max(0, Math.min(100, driveState.x + Math.cos(angle) * DRIVE_SPEED * speedMult * mag));
        driveState.y = Math.max(0, Math.min(100, driveState.y + Math.sin(angle) * DRIVE_SPEED * speedMult * mag));
        const car = $("drive-car");
        car.style.left = driveState.x + "%";
        car.style.top = driveState.y + "%";
        car.style.transform = `rotate(${driveHeadingCss(angle)}deg)`;
      }
      driveWaterTick();
      // Each dino pursues the car's current spot independently, steering
      // around any obstacle that's close and roughly in its path instead
      // of cutting straight through it. A dino currently soaked by the
      // water stream moves at a reduced speed.
      const now = performance.now();
      driveState.dinos.forEach(d => {
        const dx = driveState.x - d.x, dy = driveState.y - d.y;
        const dist = Math.hypot(dx, dy);
        const dinoEl = $(d.id);
        if (dist > 0.5) {
          const dAngle = dinoSteerAngle(d, Math.atan2(dy, dx), driveState.obstacles);
          const slowed = d.slowUntil > now;
          const step = Math.min(dist, DINO_SPEED * (slowed ? DRIVE_WATER_SLOW_MULT : 1));
          d.x = Math.max(0, Math.min(100, d.x + Math.cos(dAngle) * step));
          d.y = Math.max(0, Math.min(100, d.y + Math.sin(dAngle) * step));
          dinoEl.style.left = d.x + "%";
          dinoEl.style.top = d.y + "%";
          dinoEl.style.transform = `rotate(${driveHeadingCss(dAngle)}deg)`;
          dinoEl.classList.add("walking");
        } else {
          dinoEl.classList.remove("walking");
        }
        dinoEl.classList.toggle("soaked", d.slowUntil > now);
      });
      checkDriveCollisions();
    }
    driveState.rafId = requestAnimationFrame(frame);
  }
  driveState.rafId = requestAnimationFrame(frame);
}

function driveNitroTick() {
  if (driveBoosting && driveState.nitroFuel > 0) {
    driveState.nitroFuel = Math.max(0, driveState.nitroFuel - DRIVE_NITRO_DRAIN_PER_MS * DRIVE_FRAME_MS);
  } else if (!driveBoosting) {
    driveState.nitroFuel = Math.min(100, driveState.nitroFuel + DRIVE_NITRO_REGEN_PER_MS * DRIVE_FRAME_MS);
  }
  $("drive-nitro-fill").style.height = driveState.nitroFuel + "%";
  $("drive-nitro-btn").classList.toggle("empty", driveState.nitroFuel <= 0);
}

// Streams water in the aim-stick's direction whenever it's deflected past
// the deadzone and the tank isn't empty/cooling. Any dino inside the
// stream's cone-and-range accumulates "wet" progress toward a slow.
// The tank (1.5s) empties well before 3s of wet-time can build up in one
// go, so this is deliberately cumulative ACROSS bursts -- wet progress
// only drains while actively streaming but missing the dino, never
// while the tank is idle/refilling/cooling down. Otherwise the slow
// would be mathematically unreachable (tested: it was, before this).
function driveWaterTick() {
  const water = driveState.water;
  const now = performance.now();
  const aimMag = Math.min(1, Math.hypot(driveAimVec.x, driveAimVec.y));
  const wantsToFire = aimMag > DRIVE_AIM_DEADZONE;
  const canFire = wantsToFire && water.streamMsLeft > 0 && now >= water.coolUntil;

  const stream = $("drive-water-stream");
  if (canFire) {
    const aimAngle = Math.atan2(driveAimVec.y, driveAimVec.x);
    stream.classList.remove("hidden");
    // The stream shape's un-rotated CSS default already points "down"
    // (angle 90° in this file's screen convention: 0=right, 90=down) --
    // driveHeadingCss is calibrated for nose-UP sprites instead, so this
    // needs its own conversion rather than reusing that helper.
    stream.style.transform = `rotate(${(aimAngle * 180 / Math.PI) - 90}deg)`;
    stream.style.left = driveState.x + "%";
    stream.style.top = driveState.y + "%";

    water.streamMsLeft = Math.max(0, water.streamMsLeft - DRIVE_FRAME_MS);
    if (water.streamMsLeft <= 0) water.coolUntil = now + DRIVE_WATER_COOLDOWN_MS;

    driveState.dinos.forEach(d => {
      const dx = d.x - driveState.x, dy = d.y - driveState.y;
      const distPx = drivePxDist(driveState.x, driveState.y, d.x, d.y);
      const angleToDino = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.atan2(Math.sin(angleToDino - aimAngle), Math.cos(angleToDino - aimAngle)));
      const inCone = distPx <= DRIVE_WATER_RANGE_PX && angleDiff <= DRIVE_WATER_CONE_RAD;
      if (inCone) {
        d.wetMs = Math.min(DRIVE_WATER_WET_NEEDED_MS, d.wetMs + DRIVE_FRAME_MS);
        if (d.wetMs >= DRIVE_WATER_WET_NEEDED_MS) {
          d.wetMs = 0;
          d.slowUntil = now + DRIVE_WATER_SLOW_MS;
          showDriveToast("Splash! Dino slowed 💦");
        }
      } else {
        d.wetMs = Math.max(0, d.wetMs - DRIVE_FRAME_MS);
      }
    });
  } else {
    stream.classList.add("hidden");
    // Refills once the cooldown from a previous empty-out has elapsed --
    // regardless of whether the aim stick is still being held (an actual
    // cooldown timer, not something that requires letting go first).
    if (water.streamMsLeft < DRIVE_WATER_MAX_STREAM_MS && now >= water.coolUntil) {
      water.streamMsLeft = DRIVE_WATER_MAX_STREAM_MS;
    }
  }
  $("drive-water-fill").style.height = (water.streamMsLeft / DRIVE_WATER_MAX_STREAM_MS * 100) + "%";
  $("drive-aim-joystick").classList.toggle("cooling", now < water.coolUntil);
}

function cancelDriveLoop() {
  if (driveState && driveState.rafId) {
    cancelAnimationFrame(driveState.rafId);
    driveState.rafId = null;
  }
}

// %-coordinates aren't square (the world is taller than it's wide), so
// distance must be measured in real pixels or a vertical approach and a
// horizontal approach would trigger at different true distances.
function drivePxDist(ax, ay, bx, by) {
  const rect = driveState.worldRect || $("drive-world").getBoundingClientRect();
  return Math.hypot((ax - bx) / 100 * rect.width, (ay - by) / 100 * rect.height);
}

function awardDriveScore(points) {
  driveSession.score = Math.min(DRIVE_SCORE_TARGET, driveSession.score + points);
  updateDriveHud();
  return driveSession.score >= DRIVE_SCORE_TARGET;
}

function checkDriveCollisions() {
  for (const c of driveState.cities) {
    if (drivePxDist(c.x, c.y, driveState.x, driveState.y) < DRIVE_CAR_PX_R + DRIVE_CITY_PX_R) {
      driveState.paused = true;
      if (awardDriveScore(10)) { showDriveEnd(true); return; }
      state.driveReturnPending = true;
      goToIntro(c.id, false);
      return;
    }
  }
  for (const o of driveState.obstacles) {
    if (drivePxDist(o.x, o.y, driveState.x, driveState.y) < DRIVE_CAR_PX_R + DRIVE_OBSTACLE_PX_R) {
      driveState.obstacles = driveState.obstacles.filter(x => x !== o);
      const el = document.getElementById("drive-" + o.id);
      if (el) el.remove();
      if (awardDriveScore(1)) { showDriveEnd(true); return; }
      showDriveQuestion();
      return;
    }
  }
  const now = performance.now();
  for (const d of driveState.dinos) {
    if (now >= d.biteCooldownUntil &&
        drivePxDist(d.x, d.y, driveState.x, driveState.y) < DRIVE_CAR_PX_R + DRIVE_DINO_PX_R) {
      d.biteCooldownUntil = now + DRIVE_BITE_COOLDOWN_MS;
      driveSession.bites++;
      updateDriveHud();
      const car = $("drive-car");
      car.classList.add("bitten");
      setTimeout(() => car.classList.remove("bitten"), DRIVE_BITE_COOLDOWN_MS);
      // Without a knockback, the dino stays adjacent and re-bites the
      // instant the cooldown clears — which read as an instant 3-bite
      // loss on a single close call. Push it back so the player actually
      // gets the cooldown window to escape.
      const kAngle = Math.atan2(d.y - driveState.y, d.x - driveState.x);
      d.x = Math.max(0, Math.min(100, d.x + Math.cos(kAngle) * DRIVE_BITE_KNOCKBACK));
      d.y = Math.max(0, Math.min(100, d.y + Math.sin(kAngle) * DRIVE_BITE_KNOCKBACK));
      const livesLeft = DRIVE_MAX_BITES - driveSession.bites;
      if (livesLeft > 0) showDriveToast(`Bitten! ${livesLeft} ${livesLeft === 1 ? "life" : "lives"} left`);
      if (driveSession.bites >= DRIVE_MAX_BITES) { showDriveEnd(false); return; }
      return; // one bite per frame is enough even with 2 dinos nearby
    }
  }
}

function showDriveToast(msg) {
  const world = $("drive-world");
  const toast = document.createElement("div");
  toast.className = "drive-toast";
  toast.textContent = msg;
  world.appendChild(toast);
  setTimeout(() => toast.remove(), 1300);
}

function showDriveEnd(won) {
  driveState.ended = true;
  driveState.paused = true;
  const name = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "you";
  const overlay = $("drive-end-overlay");
  overlay.classList.toggle("won", won);
  overlay.classList.toggle("lost", !won);
  $("drive-end-emoji").textContent = won ? "🏆" : "🦖";
  $("drive-end-title").textContent = won ? `You did it, ${name}!` : "Caught by the dino 3x!";
  $("drive-end-sub").textContent = won
    ? `${DRIVE_SCORE_TARGET} points reached — great job!`
    : `Give it another go, ${name}!`;
  overlay.classList.remove("hidden");
  if (won && typeof confetti === "function") {
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.4 } });
    setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.3 } }), 300);
  }
}

// A "clean" answer is either a compare symbol, or a single number with an
// optional trailing unit ("100 cm", "12,340", "7"). Division's
// "long-remainder" variant returns two numbers glued together in one
// string ("1,234 remainder 5") which can't honestly become 4 MC options —
// reject it here rather than mangling it in buildQuickMc.
function isCleanQuickAnswer(q) {
  if (q.prompt.startsWith("Compare")) return true;
  return /^-?[\d,]+(\.\d+)?(\s+[a-zA-Z]+)?$/.test(String(q.answer).trim());
}

// All hand-authored word problems across every chapter, pooled once for
// Drive Mode's "soal cerita" variety — these are calibrated for full
// grade-4 depth and can't be dialed down like the generators, so they
// only ever show up on Medium/Hard (see rollDriveQuestion).
let driveWordProblemPool = null;
function getDriveWordProblemPool() {
  if (driveWordProblemPool) return driveWordProblemPool;
  driveWordProblemPool = [];
  MATHVILLE_BANK.chapters.forEach(ch => {
    (ch.staticQuestions || ch.questions || []).forEach(q => {
      if (!q.skipInRound && isCleanQuickAnswer(q)) driveWordProblemPool.push(q);
    });
  });
  return driveWordProblemPool;
}

function rollDriveQuestion(difficulty) {
  // Word problems are fixed-difficulty (hand-written), so Easy — which
  // promises "solvable in your head" — never draws one.
  if (difficulty !== "easy" && Math.random() < 0.35) {
    const pool = getDriveWordProblemPool();
    if (pool.length) return pool[rand(0, pool.length - 1)];
  }
  for (let i = 0; i < 8; i++) {
    const key = DRIVE_QUICK_GEN_KEYS[rand(0, DRIVE_QUICK_GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    if (isCleanQuickAnswer(raw)) return raw;
  }
  return MATHVILLE_GENERATORS.rounding(difficulty); // always clean — guaranteed fallback
}

// Place-value questions ("value of the digit 9 in 92,678?") need
// distractors that are actually OTHER place values of that same digit
// (9,000 / 90,000 / 900,000...) — generic ± jittered numbers like
// "62,022" don't test (or even relate to) place-value understanding.
function buildPlaceValueMc(q) {
  const m = q.prompt.match(/value of the digit (\d) in/);
  const digit = Number(m[1]);
  const correctNum = Number(String(q.answer).replace(/,/g, ""));
  const power = Math.round(Math.log10(correctNum / digit));
  const powers = new Set([power]);
  for (const p of [power - 1, power + 1, power - 2, power + 2, power - 3, power + 3]) {
    if (powers.size >= 4) break;
    if (p >= 0) powers.add(p);
  }
  const options = [...powers].map(p => digit * Math.pow(10, p));
  return {
    prompt: q.prompt,
    options: shuffle(options).map(n => n.toLocaleString("en-US")),
    correctLabel: correctNum.toLocaleString("en-US")
  };
}

// Builds a quick multiple-choice question from any of the chapter
// generators — same content, lighter presentation (no round/steps),
// since a driving pit-stop should be a 5-second beat, not a full round.
function buildQuickMc(q) {
  if (q.prompt.startsWith("Compare")) {
    return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
  }
  if (q.prompt.includes("value of the digit")) return buildPlaceValueMc(q);
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
  let bump = 1; // for very small correctNum (e.g. quotient 1-2), the loop
  while (options.size < 4) options.add(correctNum + bump++); // above can't find 3 distinct deltas — pad deterministically
  return {
    prompt: q.prompt,
    options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix),
    correctLabel: correctNum.toLocaleString("en-US") + suffix
  };
}

// Occasionally serves a 3-pair drag-to-match round instead of a single
// MC question — reuses the same generators, just paired as
// {left: prompt, right: answer} instead of one prompt + 4 options.
// Only on Medium/Hard: matching 3 pairs takes longer than tapping one
// button, which works against Easy's "quick head-math beat" goal.
function shouldRollDriveMatch(difficulty) {
  return difficulty !== "easy" && Math.random() < 0.25;
}

function buildDriveMatchRound(difficulty) {
  const pairs = [];
  let guard = 0;
  while (pairs.length < 3 && guard++ < 30) {
    const key = DRIVE_QUICK_GEN_KEYS[rand(0, DRIVE_QUICK_GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    if (!isCleanQuickAnswer(raw) || raw.prompt.startsWith("Compare")) continue;
    if (pairs.some(p => p.left === raw.prompt)) continue; // no duplicate prompts in one round
    pairs.push({ left: raw.prompt, right: raw.answer });
  }
  return pairs;
}

function showDriveQuestion() {
  driveState.paused = true;
  if (shouldRollDriveMatch(driveDifficulty)) {
    const pairs = buildDriveMatchRound(driveDifficulty);
    if (pairs.length === 3) { renderDriveMatch(pairs); return; }
  }
  const raw = rollDriveQuestion(driveDifficulty);
  const step = buildQuickMc(raw);

  $("drive-question-prompt").textContent = step.prompt;
  const grid = $("drive-question-options");
  grid.innerHTML = "";
  step.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mc-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      const isCorrect = labelsEqual(opt, step.correctLabel);
      grid.querySelectorAll(".mc-btn").forEach(b => {
        b.disabled = true;
        if (labelsEqual(b.textContent, step.correctLabel)) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "drive-mode", isCorrect);
      setTimeout(() => {
        $("drive-question-overlay").classList.add("hidden");
        if (driveState) driveState.paused = false;
      }, 900);
    });
    grid.appendChild(btn);
  });
  $("drive-question-overlay").classList.remove("hidden");
}

// Lightweight drag-to-match round for Drive Mode's obstacle quiz — the
// same drag/line-drawing mechanics as the main game's match questions
// (renderMatchStep), but self-contained: no state.mistakes, no
// goToNextStep, just "resume driving" once all 3 pairs connect.
function renderDriveMatch(pairs) {
  const overlay = $("drive-match-overlay");
  const rightOrder = shuffle(pairs.map((_, i) => i));
  const rowH = 56;
  const svg = $("drive-match-svg");
  const leftWrap = $("drive-match-left");
  const rightWrap = $("drive-match-right");
  const wrapEl = $("drive-match-wrap");
  leftWrap.innerHTML = ""; rightWrap.innerHTML = "";
  wrapEl.style.height = (pairs.length * rowH + 24) + "px";

  const connections = [];
  let dragFromIdx = null;

  pairs.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "match-item";
    row.style.top = (i * rowH) + "px";
    row.innerHTML = `<div class="match-dot" data-idx="${i}"></div><div class="match-label">${escapeHtml(p.left)}</div>`;
    leftWrap.appendChild(row);
  });
  rightOrder.forEach((pairIdx, slot) => {
    const row = document.createElement("div");
    row.className = "match-item";
    row.style.top = (slot * rowH) + "px";
    row.innerHTML = `<div class="match-label">${escapeHtml(pairs[pairIdx].right)}</div><div class="match-dot" data-slot="${slot}"></div>`;
    rightWrap.appendChild(row);
  });

  function dotCenter(dot, wrapRect) {
    const r = dot.getBoundingClientRect();
    return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
  }
  function redraw(dragPoint) {
    const wrapRect = wrapEl.getBoundingClientRect();
    svg.setAttribute("width", wrapRect.width);
    svg.setAttribute("height", wrapRect.height);
    let s = "";
    connections.forEach(c => {
      const ld = leftWrap.querySelector(`.match-dot[data-idx="${c.leftIdx}"]`);
      const rd = rightWrap.querySelector(`.match-dot[data-slot="${c.rightSlot}"]`);
      const p1 = dotCenter(ld, wrapRect), p2 = dotCenter(rd, wrapRect);
      s += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#C1793E" stroke-width="4" stroke-linecap="round"/>`;
    });
    if (dragPoint && dragFromIdx !== null) {
      const ld = leftWrap.querySelector(`.match-dot[data-idx="${dragFromIdx}"]`);
      const p1 = dotCenter(ld, wrapRect);
      s += `<line x1="${p1.x}" y1="${p1.y}" x2="${dragPoint.x}" y2="${dragPoint.y}" stroke="#E4572E" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 6"/>`;
    }
    svg.innerHTML = s;
  }
  redraw();

  function finish() {
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "drive-mode", true);
    setTimeout(() => {
      overlay.classList.add("hidden");
      if (driveState) driveState.paused = false;
    }, 500);
  }

  leftWrap.querySelectorAll(".match-dot").forEach(dot => {
    dot.addEventListener("pointerdown", e => {
      e.preventDefault();
      const idx = Number(dot.dataset.idx);
      if (connections.some(c => c.leftIdx === idx)) return;
      dragFromIdx = idx;

      const move = ev => {
        const rect = wrapEl.getBoundingClientRect();
        redraw({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      };
      const up = ev => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        const rect = wrapEl.getBoundingClientRect();
        const relX = ev.clientX - rect.left, relY = ev.clientY - rect.top;
        let closestSlot = null, closestDist = Infinity;
        rightWrap.querySelectorAll(".match-dot").forEach(rd => {
          const c = dotCenter(rd, rect);
          const dist = Math.hypot(c.x - relX, c.y - relY);
          if (dist < closestDist) { closestDist = dist; closestSlot = Number(rd.dataset.slot); }
        });
        const from = dragFromIdx;
        dragFromIdx = null;
        if (closestSlot !== null && closestDist < 60 && !connections.some(c => c.rightSlot === closestSlot)) {
          const rightPairIdx = rightOrder[closestSlot];
          if (rightPairIdx === from) {
            connections.push({ leftIdx: from, rightSlot: closestSlot });
            leftWrap.querySelector(`.match-dot[data-idx="${from}"]`).classList.add("connected");
            rightWrap.querySelector(`.match-dot[data-slot="${closestSlot}"]`).classList.add("connected");
            redraw();
            if (connections.length === pairs.length) finish();
          } else {
            if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "drive-mode", false);
            const rd = rightWrap.querySelector(`.match-dot[data-slot="${closestSlot}"]`);
            rd.classList.add("wrong-flash");
            setTimeout(() => rd.classList.remove("wrong-flash"), 500);
            redraw();
          }
        } else {
          redraw();
        }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  });

  overlay.classList.remove("hidden");
}

// 3-2-1-GO before a fresh Drive Mode entry — a token guards against a
// stale timeout leaking through if the player backs out mid-countdown.
let driveCountdownToken = 0;
function playDriveCountdown(onDone) {
  const overlay = $("drive-countdown");
  const numEl = $("drive-countdown-number");
  overlay.classList.remove("hidden");
  const myToken = ++driveCountdownToken;
  const steps = ["3", "2", "1", "GO!"];
  let i = 0;
  function showStep() {
    if (myToken !== driveCountdownToken) return;
    const val = steps[i];
    numEl.textContent = val;
    numEl.classList.toggle("go", val === "GO!");
    numEl.style.animation = "none";
    void numEl.offsetWidth;
    numEl.style.animation = "";
    i++;
    if (i < steps.length) {
      setTimeout(showStep, 700);
    } else {
      setTimeout(() => {
        if (myToken !== driveCountdownToken) return;
        overlay.classList.add("hidden");
        onDone();
      }, 550);
    }
  }
  showStep();
}

// Remembered across visits (not per-session) so a returning player
// doesn't have to re-pick every single time — but it's still shown on
// every fresh entry in case they want to change it.
const DRIVE_DIFFICULTY_KEY = "mathville.driveDifficulty";
let driveDifficulty = localStorage.getItem(DRIVE_DIFFICULTY_KEY) || "medium";

function playDriveDifficultyPicker(onPicked) {
  const overlay = $("drive-difficulty-overlay");
  overlay.classList.remove("hidden");
  const buttons = document.querySelectorAll(".drive-difficulty-btn");
  function handler(e) {
    driveDifficulty = e.currentTarget.dataset.level;
    localStorage.setItem(DRIVE_DIFFICULTY_KEY, driveDifficulty);
    overlay.classList.add("hidden");
    buttons.forEach(b => b.removeEventListener("click", handler));
    onPicked();
  }
  buttons.forEach(b => b.addEventListener("click", handler));
}

function launchDriveMode() {
  // The difficulty picker overlay lives INSIDE #screen-drive's markup, so
  // it stays invisible (display:none, inherited from its non-active
  // ancestor) until that section is actually the active screen — without
  // this, un-hiding the overlay alone does nothing visible at all,
  // whether launched from the map's drive button or the hub's ?drive=1
  // deep link. goToDrive() (called after a difficulty is picked) also
  // sets this same screen active, so this is a harmless no-op there.
  showScreen("screen-drive");
  playDriveDifficultyPicker(() => {
    goToDrive(false);
    driveState.paused = true;
    playDriveCountdown(() => { if (driveState) driveState.paused = false; });
  });
}

$("btn-drive").addEventListener("click", launchDriveMode);
$("drive-end-replay").addEventListener("click", () => goToDrive(false));

// Deep link from the hub's landing-page roaming car (?drive=1) — jump
// straight into Drive Mode instead of the Solo/Multiplayer picker.
if (new URLSearchParams(location.search).get("drive") === "1") {
  state.mode = "solo";
  launchDriveMode();
}

// Analog joystick: drag anywhere inside (pointer capture lets the finger
// wander outside the circle without losing the drag), knob position is
// clamped to JOY_MAX px from center and read as a -1..1 vector each frame.
// Shared by both sticks (left = steer, right = aim the water gun) --
// `setVec` is however the caller wants to store the resulting vector.
const JOY_MAX = 28; // matches the smaller 92px joystick track
function setupAnalogStick(joyId, knobId, setVec) {
  const joy = $(joyId);
  const knob = $(knobId);
  if (!joy || !knob) return;
  let activeId = null;

  function updateFromEvent(e) {
    const rect = joy.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOY_MAX);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped, ky = Math.sin(angle) * clamped;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    setVec({ x: kx / JOY_MAX, y: ky / JOY_MAX });
  }
  function release(e) {
    if (activeId === null || e.pointerId !== activeId) return;
    activeId = null;
    setVec({ x: 0, y: 0 });
    knob.style.transform = "translate(-50%, -50%)";
  }
  joy.addEventListener("pointerdown", e => {
    e.preventDefault();
    activeId = e.pointerId;
    joy.setPointerCapture(activeId);
    updateFromEvent(e);
  });
  joy.addEventListener("pointermove", e => {
    if (activeId === null || e.pointerId !== activeId) return;
    updateFromEvent(e);
  });
  joy.addEventListener("pointerup", release);
  joy.addEventListener("pointercancel", release);
}
setupAnalogStick("joystick", "joystick-knob", v => { driveJoyVec = v; });
setupAnalogStick("drive-aim-joystick", "drive-aim-knob", v => { driveAimVec = v; });

// Nitro: hold to boost, release to stop -- fuel drain/regen happens every
// frame in driveNitroTick() regardless of which of these fired last.
(function setupDriveNitroButton() {
  const btn = $("drive-nitro-btn");
  if (!btn) return;
  btn.addEventListener("pointerdown", e => { e.preventDefault(); driveBoosting = true; });
  btn.addEventListener("pointerup", () => { driveBoosting = false; });
  btn.addEventListener("pointercancel", () => { driveBoosting = false; });
  btn.addEventListener("pointerleave", () => { driveBoosting = false; });
})();

/* =================================================================
   3. ROUND BUILDER
   -----------------------------------------------------------------
   Mixes the hand-authored static bank (questions.js) with the
   never-repeating generators (generators.js), and assigns each
   question one of the 4 interaction types based on what its content
   actually supports (a word problem can't become a drag-match, a
   plain arithmetic fact doesn't need distractor options, etc).
   ================================================================= */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function buildPlaceValueStep() {
  let numStr, idx, digit;
  do {
    const digitsCount = rand(4, 7);
    const min = Math.pow(10, digitsCount - 1), max = Math.pow(10, digitsCount) - 1;
    numStr = String(rand(min, max));
    idx = rand(0, numStr.length - 1);
    digit = numStr[idx];
  } while (digit === "0");
  const power = numStr.length - 1 - idx;
  const placeName = PLACE_NAMES[power];
  const fmtNum = Number(numStr).toLocaleString("en-US");
  return { uiType: "tap", prompt: `Which place is the digit ${digit} in, in ${fmtNum}?`, options: PLACE_NAMES, correctLabel: placeName };
}

// Parses the hand-authored "(a. X  b. Y  c. Z)" embedded-MC format used by
// the Rounding chapter's estimation word problems.
function parseEmbeddedMC(prompt, answer) {
  const m = prompt.match(/\(a\.\s*(\S+)\s+b\.\s*(\S+)\s+c\.\s*(\S+)\)/i);
  if (!m) return null;
  const mainPrompt = prompt.slice(0, prompt.indexOf("(")).trim();
  const options = [m[1], m[2], m[3]];
  const letter = (answer.match(/^([abc])\./i) || [])[1];
  const idx = { a: 0, b: 1, c: 2 }[letter && letter.toLowerCase()];
  return { uiType: "mc", prompt: mainPrompt, options, correctLabel: options[idx] };
}

function buildRoundingMcStep(q) {
  const correctNum = Number(q.answer.replace(/,/g, ""));
  const stepWord = ((q.prompt.match(/nearest (ten thousand|thousand|hundred|ten)/i) || [])[1] || "ten").toLowerCase();
  const stepSize = { ten: 10, hundred: 100, thousand: 1000, "ten thousand": 10000 }[stepWord] || 10;
  const options = new Set([correctNum]);
  let guard = 0;
  while (options.size < 4 && guard++ < 30) {
    const cand = correctNum + (Math.random() < 0.5 ? -1 : 1) * rand(1, 3) * stepSize;
    if (cand >= 0) options.add(cand);
  }
  const opts = shuffle([...options]).map(n => n.toLocaleString("en-US"));
  return { uiType: "mc", prompt: q.prompt, options: opts, correctLabel: correctNum.toLocaleString("en-US") };
}

const GCF_LCM_SHORT_RE = /^Find the (Greatest Common Factor \(GCF\)|GCF|Least Common Multiple \(LCM\)|LCM) of/i;

function buildRound(chapterId) {
  const chapterData = MATHVILLE_BANK.chapters.find(c => c.id === chapterId);
  const steps = [];

  if (chapterId === "place-value") {
    for (let i = 0; i < ROUND_SIZE; i++) steps.push(buildPlaceValueStep());

  } else if (chapterId === "addition-subtraction") {
    const statics = pickN(chapterData.staticQuestions, 2);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const key = i % 2 === 0 ? "addition-subtraction-add" : "addition-subtraction-sub";
      const q = MATHVILLE_GENERATORS[key]();
      steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
    }

  } else if (chapterId === "prime-numbers") {
    pickN(chapterData.questions.filter(q => !q.skipInRound), ROUND_SIZE).forEach(q => {
      if (/prime or not prime/i.test(q.prompt)) {
        steps.push({ uiType: "tap", prompt: q.prompt, options: ["Prime", "Not Prime"], correctLabel: /^not prime/i.test(q.answer) ? "Not Prime" : "Prime", image: q.image });
      } else {
        steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer, image: q.image });
      }
    });

  } else if (chapterId === "gcf-lcm") {
    const matchable = chapterData.questions.filter(q => GCF_LCM_SHORT_RE.test(q.prompt));
    const wordProblems = chapterData.questions.filter(q => !GCF_LCM_SHORT_RE.test(q.prompt));
    const pairs = pickN(matchable, 4).map(q => ({ left: q.prompt.replace(/^Find the /i, "").replace(/\.$/, ""), right: q.answer }));
    steps.push({ uiType: "match", pairs });
    pickN(wordProblems, 2).forEach(q => steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer }));

  } else if (chapterId === "multiplication") {
    const statics = pickN(chapterData.staticQuestions, 2);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer, image: s.image }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const q = MATHVILLE_GENERATORS.multiplication();
      steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
    }

  } else if (chapterId === "division") {
    const statics = pickN(chapterData.staticQuestions.filter(q => !q.skipInRound), 2);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer, image: s.image }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const q = MATHVILLE_GENERATORS.division();
      steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
    }

  } else if (chapterId === "mixed-operation") {
    pickN(chapterData.questions, Math.min(ROUND_SIZE, chapterData.questions.length))
      .forEach(q => steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer, image: q.image }));

  } else if (chapterId === "measurement") {
    const statics = pickN(chapterData.staticQuestions, 2);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer, image: s.image }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const q = MATHVILLE_GENERATORS.measurement();
      if (q.prompt.startsWith("Compare")) {
        steps.push({ uiType: "tap", prompt: q.prompt, options: ["<", "=", ">"], correctLabel: q.answer });
      } else {
        steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
      }
    }

  } else if (chapterId === "rounding") {
    const statics = pickN(chapterData.staticQuestions, 2);
    statics.forEach(s => steps.push(parseEmbeddedMC(s.prompt, s.answer) || { uiType: "typein", prompt: s.prompt, answer: s.answer }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      steps.push(buildRoundingMcStep(MATHVILLE_GENERATORS.rounding()));
    }
  }

  return steps;
}

/* =================================================================
   4. GRADING HELPERS
   ================================================================= */
function extractNumbers(s) { return (String(s).match(/-?\d+(\.\d+)?/g) || []).map(Number); }
function normalizeText(s) { return String(s).toLowerCase().replace(/[×X]/g, "x").replace(/[^\w.,\s-]/g, "").replace(/\s+/g, " ").trim(); }
function labelsEqual(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }

// Numeric/list answers compare by number(s) extracted (order-independent for
// lists); free-text answers fall back to normalized string equality. This
// keeps grading forgiving of formatting (commas, "×" vs "x", stray words)
// without needing per-question custom validators.
function gradeTypein(userInput, correctAnswer) {
  if (!userInput) return false;
  const correctCore = String(correctAnswer).split(" (")[0].trim();
  const userNums = extractNumbers(userInput);
  const correctNums = extractNumbers(correctCore);
  if (correctNums.length > 1) {
    if (userNums.length !== correctNums.length) return false;
    const a = [...userNums].sort((x, y) => x - y), b = [...correctNums].sort((x, y) => x - y);
    return a.every((v, i) => v === b[i]);
  }
  if (correctNums.length === 1) return userNums.length === 1 && userNums[0] === correctNums[0];
  return normalizeText(userInput) === normalizeText(correctCore);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* =================================================================
   5. QUESTION RENDERING — 4 INTERACTION TYPES
   ================================================================= */
function renderStep() {
  showScreen("screen-question");
  ["ui-typein", "ui-mc", "ui-tap", "ui-match"].forEach(id => $(id).classList.add("hidden"));
  const step = state.steps[state.stepIndex];
  $("q-label").textContent = step.uiType === "match" ? "" : `Question ${state.stepIndex + 1} of ${state.steps.length}`;

  if (step.uiType === "typein") renderTypeinStep(step);
  else if (step.uiType === "mc") renderMcStep(step);
  else if (step.uiType === "tap") renderTapStep(step);
  else if (step.uiType === "match") renderMatchStep(step);
}

function goToNextStep() {
  state.stepIndex++;
  if (state.stepIndex < state.steps.length) renderStep();
  else finishRound();
}

// Shared "record + advance" used by typein/mc/tap. `answerForHint` is the
// display-friendly correct answer shown by the AI Tutor if this was a miss.
function submitAnswer(isCorrect, prompt, answerForHint) {
  if (window.AIGLeaderboard && state.chapterId) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, isCorrect);
  if (!isCorrect) {
    state.mistakes++;
    state.lastWrong = { prompt, answer: answerForHint };
  }
  setTimeout(goToNextStep, isCorrect ? 700 : 1600);
}

/* ---- typein ---- */
let typedValue = "";
function renderTypeinStep(step) {
  $("ui-typein").classList.remove("hidden");
  $("typein-image").innerHTML = step.image || "";
  $("typein-prompt").textContent = step.prompt;
  $("typein-reveal").textContent = "";
  $("typein-display").classList.remove("correct-flash", "wrong-flash");
  typedValue = "";
  updateTypeinDisplay();

  const pad = $("typein-keypad");
  pad.innerHTML = "";
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "space", "0", "back"];
  keys.forEach(k => {
    const btn = document.createElement("button");
    if (k === "back") { btn.className = "key back"; btn.textContent = "⌫"; }
    else if (k === "space") { btn.className = "key"; btn.textContent = "␣"; }
    else { btn.className = "key"; btn.textContent = k; }
    btn.disabled = false;
    btn.addEventListener("click", () => typeKey(k));
    pad.appendChild(btn);
  });

  const submit = $("typein-submit");
  submit.disabled = false;
  submit.onclick = () => {
    if (typedValue === "") return;
    const isCorrect = gradeTypein(typedValue, step.answer);
    $("typein-display").classList.add(isCorrect ? "correct-flash" : "wrong-flash");
    if (!isCorrect) $("typein-reveal").textContent = `Answer: ${step.answer}`;
    pad.querySelectorAll(".key").forEach(b => (b.disabled = true));
    submit.disabled = true;
    submitAnswer(isCorrect, step.prompt, step.answer);
  };
}
function typeKey(k) {
  if (k === "back") { typedValue = typedValue.slice(0, -1); updateTypeinDisplay(); return; }
  if (k === "space") { if (typedValue && !typedValue.endsWith(" ")) typedValue += " "; updateTypeinDisplay(); return; }
  if (typedValue.length < 14) { typedValue += k; updateTypeinDisplay(); }
}
function updateTypeinDisplay() {
  const d = $("typein-display");
  d.innerHTML = typedValue === "" ? '<span class="kd-placeholder">?</span>' : escapeHtml(typedValue);
}

/* ---- mc (2-4 option grid) ---- */
function renderMcStep(step) {
  $("ui-mc").classList.remove("hidden");
  $("mc-image").innerHTML = step.image || "";
  $("mc-prompt").textContent = step.prompt;
  const grid = $("mc-grid");
  grid.innerHTML = "";
  step.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mc-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      const isCorrect = labelsEqual(opt, step.correctLabel);
      grid.querySelectorAll(".mc-btn").forEach(b => {
        b.disabled = true;
        if (labelsEqual(b.textContent, step.correctLabel)) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      submitAnswer(isCorrect, step.prompt, step.correctLabel);
    });
    grid.appendChild(btn);
  });
}

/* ---- tap (pill markers, 2-7 options) ---- */
function renderTapStep(step) {
  $("ui-tap").classList.remove("hidden");
  $("tap-image").innerHTML = step.image || "";
  $("tap-prompt").textContent = step.prompt;
  const wrap = $("tap-markers");
  wrap.innerHTML = "";
  step.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "tap-marker";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      const isCorrect = labelsEqual(opt, step.correctLabel);
      wrap.querySelectorAll(".tap-marker").forEach(b => {
        b.disabled = true;
        if (labelsEqual(b.textContent, step.correctLabel)) b.classList.add("correct");
        else if (b === btn) b.classList.add("wrong");
      });
      submitAnswer(isCorrect, step.prompt, step.correctLabel);
    });
    wrap.appendChild(btn);
  });
}

/* ---- match (batch drag-line matching) ---- */
function renderMatchStep(step) {
  $("ui-match").classList.remove("hidden");
  const pairs = step.pairs;
  const rightOrder = shuffle(pairs.map((_, i) => i));
  const rowH = 64;
  const svg = $("match-svg");
  const leftWrap = $("match-left");
  const rightWrap = $("match-col-right");
  const wrapEl = $("match-wrap");
  leftWrap.innerHTML = ""; rightWrap.innerHTML = "";
  wrapEl.style.height = (pairs.length * rowH + 24) + "px";

  const connections = [];
  let dragFromIdx = null;
  let matchMistakes = 0;

  pairs.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "match-item";
    row.style.top = (i * rowH) + "px";
    row.innerHTML = `<div class="match-dot" data-idx="${i}"></div><div class="match-label">${escapeHtml(p.left)}</div>`;
    leftWrap.appendChild(row);
  });
  rightOrder.forEach((pairIdx, slot) => {
    const row = document.createElement("div");
    row.className = "match-item";
    row.style.top = (slot * rowH) + "px";
    row.innerHTML = `<div class="match-label">${escapeHtml(pairs[pairIdx].right)}</div><div class="match-dot" data-slot="${slot}"></div>`;
    rightWrap.appendChild(row);
  });

  function dotCenter(dot, wrapRect) {
    const r = dot.getBoundingClientRect();
    return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
  }
  function redraw(dragPoint) {
    const wrapRect = wrapEl.getBoundingClientRect();
    svg.setAttribute("width", wrapRect.width);
    svg.setAttribute("height", wrapRect.height);
    let s = "";
    connections.forEach(c => {
      const ld = leftWrap.querySelector(`.match-dot[data-idx="${c.leftIdx}"]`);
      const rd = rightWrap.querySelector(`.match-dot[data-slot="${c.rightSlot}"]`);
      const p1 = dotCenter(ld, wrapRect), p2 = dotCenter(rd, wrapRect);
      s += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#C1793E" stroke-width="4" stroke-linecap="round"/>`;
    });
    if (dragPoint && dragFromIdx !== null) {
      const ld = leftWrap.querySelector(`.match-dot[data-idx="${dragFromIdx}"]`);
      const p1 = dotCenter(ld, wrapRect);
      s += `<line x1="${p1.x}" y1="${p1.y}" x2="${dragPoint.x}" y2="${dragPoint.y}" stroke="#E4572E" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 6"/>`;
    }
    svg.innerHTML = s;
  }
  redraw();

  leftWrap.querySelectorAll(".match-dot").forEach(dot => {
    dot.addEventListener("pointerdown", e => {
      e.preventDefault();
      const idx = Number(dot.dataset.idx);
      if (connections.some(c => c.leftIdx === idx)) return;
      dragFromIdx = idx;

      const move = ev => {
        const rect = wrapEl.getBoundingClientRect();
        redraw({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      };
      const up = ev => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        const rect = wrapEl.getBoundingClientRect();
        const relX = ev.clientX - rect.left, relY = ev.clientY - rect.top;
        let closestSlot = null, closestDist = Infinity;
        rightWrap.querySelectorAll(".match-dot").forEach(rd => {
          const c = dotCenter(rd, rect);
          const dist = Math.hypot(c.x - relX, c.y - relY);
          if (dist < closestDist) { closestDist = dist; closestSlot = Number(rd.dataset.slot); }
        });
        const from = dragFromIdx;
        dragFromIdx = null;
        if (closestSlot !== null && closestDist < 60 && !connections.some(c => c.rightSlot === closestSlot)) {
          const rightPairIdx = rightOrder[closestSlot];
          if (rightPairIdx === from) {
            connections.push({ leftIdx: from, rightSlot: closestSlot });
            leftWrap.querySelector(`.match-dot[data-idx="${from}"]`).classList.add("connected");
            rightWrap.querySelector(`.match-dot[data-slot="${closestSlot}"]`).classList.add("connected");
            redraw();
            if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, true);
            if (connections.length === pairs.length) {
              state.mistakes += matchMistakes;
              setTimeout(goToNextStep, 500);
            }
          } else {
            matchMistakes++;
            state.lastWrong = { prompt: `Match: ${pairs[from].left}`, answer: pairs[from].right };
            if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, false);
            const rd = rightWrap.querySelector(`.match-dot[data-slot="${closestSlot}"]`);
            rd.classList.add("wrong-flash");
            setTimeout(() => rd.classList.remove("wrong-flash"), 500);
            redraw();
          }
        } else {
          redraw();
        }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  });
}

/* =================================================================
   REWARD + AI TUTOR
   ================================================================= */
function finishRound() {
  const stars = state.mistakes === 0 ? 3 : state.mistakes <= 2 ? 2 : 1;
  state.starsEarned = stars;

  if (state.mode === "multiplayer") {
    const code = state.mp.code;
    aigDb.ref(`${MV_ROOT}/${code}/players/${state.mp.seatKey}`).update({
      correctCount: state.steps.length - state.mistakes,
      finished: true,
      finishedAt: firebase.database.ServerValue.TIMESTAMP,
      stars
    });
    showWaitingForOthers();
    return;
  }

  showReward(stars);
}

function showReward(stars) {
  const meta = CHAPTER_META[state.chapterId];
  $("reward-title").textContent = `Nice work in ${meta.location}!`;
  $("reward-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  const xp = stars * 10;
  $("reward-xp").textContent = `+${xp} XP`;
  $("mp-results").classList.add("hidden");
  $("btn-reward-continue").classList.remove("hidden");
  saveChapterProgress(state.chapterId, stars, xp);
  updateXpBadge();
  showScreen("screen-reward");
  loadAiHint();
  // If this chapter was entered by driving into its building, Continue
  // should drop the player back into the driving world (with that city
  // now shown complete) instead of the tap-map.
  $("btn-reward-continue").onclick = () => {
    if (state.driveReturnPending) { state.driveReturnPending = false; goToDrive(true); }
    else goToMap();
  };
}

function showWaitingForOthers() {
  showScreen("screen-reward");
  $("reward-title").textContent = "Waiting for the other builders to finish…";
  $("reward-stars").textContent = "";
  $("reward-xp").textContent = "";
  $("ai-hint-card").classList.add("hidden");
  $("mp-results").classList.add("hidden");
  $("btn-reward-continue").classList.add("hidden");
}

async function loadAiHint() {
  const card = $("ai-hint-card"), loading = $("ai-hint-loading"), result = $("ai-hint-result");
  const missed = state.lastWrong;
  if (!missed) { card.classList.add("hidden"); return; }

  card.classList.remove("hidden");
  loading.classList.remove("hidden");
  result.classList.add("hidden");

  try {
    const res = await fetch("/api/generate-hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: CHILD_NAME,
        gameLabel: "MathVille",
        question: missed.prompt,
        correctAnswer: missed.answer,
        kidAnswer: null,
        topic: state.chapterId
      })
    });
    const data = await res.json();
    if (!res.ok || !data.hint) throw new Error(data.error || "no hint");

    result.textContent = data.hint;
    loading.classList.add("hidden");
    result.style.animation = "none";
    result.classList.remove("hidden");
    void result.offsetWidth;
    result.style.animation = "";
  } catch (e) {
    card.classList.add("hidden"); // fails silently — never blocks the reward screen
  }
}

/* =================================================================
   MULTIPLAYER — solo/2/3 players via the hub's own Firebase project
   -----------------------------------------------------------------
   Path mathvilleGames/{code} — separate from the hub's own
   leaderboard/topicStats data AND from the other 3 games' own
   dedicated Firebase projects (each keeps using its original one).
   The room host (joinOrder 0) generates the round's question set once
   and writes it to Firebase; every seat reads that same shared list
   instead of generating its own — guarantees everyone sees identical
   questions without needing seeded-RNG synchronization.
   ================================================================= */
const MV_ROOT = "mathvilleGames";

function mvMakeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[rand(0, chars.length - 1)];
  return code;
}
function mvPlayerSeed(joinOrder) {
  return { name: CHILD_NAME, joinOrder, correctCount: 0, finished: false };
}
function mvUniqueSeatKey(existingPlayers) {
  const base = CHILD_ID;
  if (!existingPlayers || !existingPlayers[base]) return base;
  let n = 2;
  while (existingPlayers[base + "-" + n]) n++;
  return base + "-" + n;
}
function mvIsHost(game) {
  const p = game.players && game.players[state.mp.seatKey];
  return !!p && p.joinOrder === 0;
}
function mvRegisterDisconnect(code, seatKey) {
  aigDb.ref(`${MV_ROOT}/${code}/players/${seatKey}`).onDisconnect().update({
    disconnected: true, disconnectedAt: firebase.database.ServerValue.TIMESTAMP
  });
}

function resetPairUI() {
  $("pair-choose").classList.remove("hidden");
  $("pair-waiting").classList.add("hidden");
  $("pair-error").textContent = "";
  $("join-code-input").value = "";
  state.mp.code = null;
  state.mp.maxPlayers = 2;
  state.mp.enteredMap = false;
  state.mp.roundActive = false;
  state.mp.resultsShown = false;
  document.querySelectorAll("#players-seg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.players === "2"));
}

document.querySelectorAll("#players-seg .seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.mp.maxPlayers = Number(btn.dataset.players);
    document.querySelectorAll("#players-seg .seg-btn").forEach(b => b.classList.toggle("active", b === btn));
  });
});

$("btn-create").addEventListener("click", async () => {
  const code = mvMakeCode();
  state.mp.code = code;
  state.mp.seatKey = CHILD_ID;
  await aigDb.ref(`${MV_ROOT}/${code}`).set({
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    status: "waiting",
    maxPlayers: state.mp.maxPlayers,
    players: { [state.mp.seatKey]: mvPlayerSeed(0) },
    currentChapterId: null,
    roundQuestions: null,
    completedChapters: {}
  });
  mvRegisterDisconnect(code, state.mp.seatKey);
  showWaitingScreen(code);
  mvAttachListener(code);
});

$("btn-join").addEventListener("click", async () => {
  const code = $("join-code-input").value.trim().toUpperCase();
  $("pair-error").textContent = "";
  if (code.length !== 6) { $("pair-error").textContent = "Code must be 6 characters."; return; }

  const snap = await aigDb.ref(`${MV_ROOT}/${code}`).get();
  if (!snap.exists()) { $("pair-error").textContent = "No game found with that code."; return; }

  const game = snap.val();
  const players = game.players || {};
  const maxPlayers = game.maxPlayers || 2;
  if (Object.keys(players).length >= maxPlayers) { $("pair-error").textContent = "This game is already full."; return; }

  state.mp.code = code;
  state.mp.seatKey = mvUniqueSeatKey(players);
  await aigDb.ref(`${MV_ROOT}/${code}/players/${state.mp.seatKey}`).set(mvPlayerSeed(Object.keys(players).length));
  mvRegisterDisconnect(code, state.mp.seatKey);
  showWaitingScreen(code);
  mvAttachListener(code);
});

function showWaitingScreen(code) {
  showScreen("screen-pair");
  $("code-display").textContent = code;
  $("pair-choose").classList.add("hidden");
  $("pair-waiting").classList.remove("hidden");
  renderJoinQR(code);
}

function renderJoinQR(code) {
  const box = $("qr-code");
  box.innerHTML = "";
  if (typeof QRCode === "undefined") return;
  const joinUrl = `${location.origin}${location.pathname}?join=${code}`;
  new QRCode(box, { text: joinUrl, width: 130, height: 130, colorDark: "#3B2A1A", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

$("btn-copy-code").addEventListener("click", () => {
  navigator.clipboard?.writeText($("code-display").textContent);
  $("btn-copy-code").textContent = "Copied ✓";
  setTimeout(() => ($("btn-copy-code").textContent = "Copy code"), 1500);
});

function mvAttachListener(code) {
  if (state.mp.listeningCode === code) return;
  mvDetachListener();
  state.mp.listeningCode = code;

  aigDb.ref(`${MV_ROOT}/${code}`).on("value", snap => {
    const game = snap.val();
    if (!game) return;
    state.mp.game = game;
    const players = game.players || {};
    const maxPlayers = game.maxPlayers || 2;
    const allSeated = Object.keys(players).length >= maxPlayers;

    if (allSeated && !state.mp.enteredMap && !state.mp.roundActive) {
      state.mp.enteredMap = true;
      if (game.status === "waiting") aigDb.ref(`${MV_ROOT}/${code}/status`).set("playing");
      renderMpTownMap(game);
      showScreen("screen-map");
    } else if (allSeated && state.mp.enteredMap && !game.currentChapterId && !state.mp.roundActive) {
      renderMpTownMap(game);
      showScreen("screen-map");
    }

    if (game.currentChapterId && !state.mp.roundActive) {
      state.mp.roundActive = true;
      state.mp.resultsShown = false;
      goToIntro(game.currentChapterId, true);
    }

    if (state.mp.roundActive) {
      const allFinished = Object.values(players).every(p => p.finished || p.disconnected);
      if (allFinished) {
        // Always re-render on every snapshot while finished — if an earlier
        // snapshot raced and the screen didn't catch up, later ones self-heal
        // it instead of leaving the player stuck on "waiting for others".
        mvRenderReward(game);
        if (!state.mp.resultsShown) {
          state.mp.resultsShown = true;
          mvFinishRoundSideEffects(game);
        }
      }
    }
  });
}
function mvDetachListener() {
  if (state.mp.listeningCode) { aigDb.ref(`${MV_ROOT}/${state.mp.listeningCode}`).off(); state.mp.listeningCode = null; }
}

function renderMpTownMap(game) {
  const wrap = $("town-map-inner");
  wrap.innerHTML = "";
  wrap.style.height = MAP_HEIGHT + "px";
  const chapters = MATHVILLE_BANK.chapters;
  const completed = game.completedChapters || {};
  const isHost = mvIsHost(game);
  const accent = mvThemeAccent();
  const nextIdx = chapters.findIndex(ch => !completed[ch.id]);

  drawMapPathSvg(wrap, chapters);

  MAP_ORNAMENTS.forEach((o, i) => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${o.x}px;top:${o.y}px;opacity:.85;animation:${ORNAMENT_ANIM[o.kind]} ${3 + (i % 4) * 0.7}s ease-in-out infinite;animation-delay:${(i % 5) * 0.3}s`;
    el.innerHTML = ornamentSvg(o);
    wrap.appendChild(el);
  });

  chapters.forEach((ch, i) => {
    const meta = CHAPTER_META[ch.id];
    const done = !!completed[ch.id];
    const isNext = i === nextIdx;
    const waitTag = !isHost && isNext ? " — waiting for host" : "";
    const stop = document.createElement("div");
    stop.className = "map-stop";
    stop.style.cssText = `left:${meta.mapX}px;top:${meta.mapY}px;`;
    stop.innerHTML = `
      <div class="map-stop-node ${done ? "complete" : isNext ? "next" : "open"}" style="${isNext ? `--pulse-color:${hexToRgb(accent)}` : ""}">
        <span>${meta.icon}</span>
        ${done ? '<span class="map-stop-check">✓</span>' : ""}
      </div>
      <div class="map-stop-title">${ch.title}${waitTag}</div>
    `;
    if (isHost) stop.addEventListener("click", () => mvWalkTo(i, () => mvHostStartChapter(ch.id)));
    wrap.appendChild(stop);
  });

  mvPlaceTraveler(chapters, nextIdx === -1 ? chapters.length - 1 : nextIdx);
  mvFitMapScale();
}

function mvHostStartChapter(chapterId) {
  const code = state.mp.code;
  const steps = buildRound(chapterId);
  const updates = {
    [`${MV_ROOT}/${code}/currentChapterId`]: chapterId,
    [`${MV_ROOT}/${code}/roundQuestions`]: steps
  };
  Object.keys(state.mp.game.players).forEach(seatKey => {
    updates[`${MV_ROOT}/${code}/players/${seatKey}/correctCount`] = 0;
    updates[`${MV_ROOT}/${code}/players/${seatKey}/finished`] = false;
  });
  aigDb.ref().update(updates);
}

// Re-renders the shared reward/results screen — safe to call repeatedly
// (every snapshot while the round is finished), so a device that raced or
// missed an earlier update always catches up to the correct final state.
function mvRenderReward(game) {
  const players = game.players;
  const ranked = Object.entries(players).sort((a, b) => (b[1].correctCount || 0) - (a[1].correctCount || 0));
  const me = players[state.mp.seatKey] || {};
  const stars = me.stars || 1;

  showScreen("screen-reward");
  $("reward-title").textContent = `Nice work in ${CHAPTER_META[game.currentChapterId].location}!`;
  $("reward-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("reward-xp").textContent = `+${stars * 10} XP`;
  $("btn-reward-continue").classList.remove("hidden");

  const wrap = $("mp-results");
  wrap.classList.remove("hidden");
  wrap.innerHTML = "";
  ranked.forEach(([seatKey, p]) => {
    const row = document.createElement("div");
    row.className = "mp-result-row" + (seatKey === state.mp.seatKey ? " me" : "");
    row.innerHTML = `<span>${escapeHtml(p.name || "Player")}</span><span>${p.correctCount || 0} correct</span>`;
    wrap.appendChild(row);
  });

  $("btn-reward-continue").onclick = () => {
    state.mp.roundActive = false;
    state.mp.resultsShown = false;
    // Don't wait for a fresh Firebase snapshot to switch screens — if the
    // other player already cleared currentChapterId, this write is a no-op
    // and Firebase won't fire a new 'value' event, so the listener-driven
    // transition would never run. Transition immediately using what we
    // already know; the listener keeps things in sync from here.
    const updatedGame = { ...state.mp.game, currentChapterId: null };
    state.mp.game = updatedGame;
    renderMpTownMap(updatedGame);
    showScreen("screen-map");
    aigDb.ref(`${MV_ROOT}/${state.mp.code}/currentChapterId`).set(null);
  };
}

// One-time-per-round side effects (leaderboard record, AI hint fetch, marking
// the chapter complete for the group) — guarded by resultsShown so they don't
// re-fire on every later snapshot the way mvRenderReward intentionally does.
function mvFinishRoundSideEffects(game) {
  if (window.AIGLeaderboard) AIGLeaderboard.recordPlay("mathville");
  loadAiHint();
  if (mvIsHost(game)) aigDb.ref(`${MV_ROOT}/${state.mp.code}/completedChapters/${game.currentChapterId}`).set(true);
}

// Arrived via a scanned QR join link — prefill the code.
const pendingJoinCode = new URLSearchParams(location.search).get("join")?.toUpperCase() || null;
if (pendingJoinCode) {
  state.mode = "multiplayer";
  resetPairUI();
  $("join-code-input").value = pendingJoinCode;
  showScreen("screen-pair");
}
