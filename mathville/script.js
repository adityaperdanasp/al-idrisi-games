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
  if (id !== "screen-drive") cancelDriveLoop();
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
    if (segEnd && segStart) traveler.classList.toggle("facing-left", segEnd.x < segStart.x);

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
const DRIVE_SPEED = 0.6;      // % of world per animation frame
const DRIVE_CAR_R = 6;        // collision radius, in the same % units
const DRIVE_OBSTACLE_R = 6;
const DRIVE_CITY_R = 8;
const DRIVE_CAR_START = { x: 50, y: 95 };
const DRIVE_CITY_POS = [
  { x: 20, y: 15 }, { x: 70, y: 12 }, { x: 45, y: 28 },
  { x: 15, y: 40 }, { x: 80, y: 42 }, { x: 35, y: 55 },
  { x: 65, y: 58 }, { x: 25, y: 75 }, { x: 75, y: 78 }
];
const DRIVE_QUICK_GEN_KEYS = [
  "place-value", "addition-subtraction-add", "addition-subtraction-sub",
  "multiplication", "division", "measurement", "rounding"
];
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

function goToDrive() {
  driveState = {
    x: DRIVE_CAR_START.x, y: DRIVE_CAR_START.y,
    held: { up: false, down: false, left: false, right: false },
    cities: [], obstacles: [], rafId: null, paused: false
  };
  renderDriveScenery();
  buildDriveWorld();
  showScreen("screen-drive");
  startDriveLoop();
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
    id: ch.id, title: ch.title, icon: CHAPTER_META[ch.id].icon,
    x: DRIVE_CITY_POS[i].x, y: DRIVE_CITY_POS[i].y,
    completed: !!(PROGRESS.chapters[ch.id] || {}).completed
  }));

  driveState.obstacles = [];
  const targetCount = rand(5, 8);
  let guard = 0;
  while (driveState.obstacles.length < targetCount && guard++ < 300) {
    const cand = { x: rand(10, 90), y: rand(20, 90) };
    const tooCloseToCity = driveState.cities.some(c => Math.hypot(c.x - cand.x, c.y - cand.y) < 16);
    const tooCloseToObstacle = driveState.obstacles.some(o => Math.hypot(o.x - cand.x, o.y - cand.y) < 14);
    const tooCloseToStart = Math.hypot(cand.x - DRIVE_CAR_START.x, cand.y - DRIVE_CAR_START.y) < 14;
    if (!tooCloseToCity && !tooCloseToObstacle && !tooCloseToStart) {
      driveState.obstacles.push({ id: "obs" + driveState.obstacles.length, x: cand.x, y: cand.y });
    }
  }
  renderDriveWorld();
}

function renderDriveWorld() {
  const world = $("drive-world");
  world.querySelectorAll(".drive-city, .drive-obstacle").forEach(el => el.remove());

  driveState.cities.forEach(c => {
    const el = document.createElement("div");
    el.className = "drive-city" + (c.completed ? " complete" : "");
    el.style.left = c.x + "%";
    el.style.top = c.y + "%";
    el.innerHTML = `<span>${c.icon}</span><div class="drive-city-label">${escapeHtml(c.title)}</div>`;
    world.appendChild(el);
  });

  driveState.obstacles.forEach(o => {
    const el = document.createElement("div");
    el.className = "drive-obstacle";
    el.id = "drive-" + o.id;
    el.style.left = o.x + "%";
    el.style.top = o.y + "%";
    el.textContent = "🚧";
    world.appendChild(el);
  });

  const car = $("drive-car");
  car.style.left = driveState.x + "%";
  car.style.top = driveState.y + "%";
}

function startDriveLoop() {
  cancelDriveLoop();
  function frame() {
    if (!driveState) return;
    if (!driveState.paused) {
      let dx = 0, dy = 0;
      if (driveState.held.up) dy -= DRIVE_SPEED;
      if (driveState.held.down) dy += DRIVE_SPEED;
      if (driveState.held.left) dx -= DRIVE_SPEED;
      if (driveState.held.right) dx += DRIVE_SPEED;
      if (dx || dy) {
        driveState.x = Math.max(DRIVE_CAR_R, Math.min(100 - DRIVE_CAR_R, driveState.x + dx));
        driveState.y = Math.max(DRIVE_CAR_R, Math.min(100 - DRIVE_CAR_R, driveState.y + dy));
        const car = $("drive-car");
        car.style.left = driveState.x + "%";
        car.style.top = driveState.y + "%";
        if (dx) car.classList.toggle("facing-left", dx < 0);
        checkDriveCollisions();
      }
    }
    driveState.rafId = requestAnimationFrame(frame);
  }
  driveState.rafId = requestAnimationFrame(frame);
}

function cancelDriveLoop() {
  if (driveState && driveState.rafId) {
    cancelAnimationFrame(driveState.rafId);
    driveState.rafId = null;
  }
}

function checkDriveCollisions() {
  for (const c of driveState.cities) {
    if (Math.hypot(c.x - driveState.x, c.y - driveState.y) < DRIVE_CAR_R + DRIVE_CITY_R) {
      driveState.paused = true;
      state.driveReturnPending = true;
      goToIntro(c.id, false);
      return;
    }
  }
  for (const o of driveState.obstacles) {
    if (Math.hypot(o.x - driveState.x, o.y - driveState.y) < DRIVE_CAR_R + DRIVE_OBSTACLE_R) {
      driveState.obstacles = driveState.obstacles.filter(x => x !== o);
      const el = document.getElementById("drive-" + o.id);
      if (el) el.remove();
      showDriveQuestion();
      return;
    }
  }
}

// Builds a quick multiple-choice question from any of the chapter
// generators — same content, lighter presentation (no round/steps),
// since a driving pit-stop should be a 5-second beat, not a full round.
function buildQuickMc(q) {
  if (q.prompt.startsWith("Compare")) {
    return { prompt: q.prompt, options: ["<", "=", ">"], correctLabel: q.answer };
  }
  const correctNum = Number(String(q.answer).replace(/[^\d.-]/g, ""));
  if (!isNaN(correctNum) && /\d/.test(String(q.answer))) {
    const options = new Set([correctNum]);
    let guard = 0;
    while (options.size < 4 && guard++ < 30) {
      const delta = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3))) * (Math.random() < 0.5 ? -1 : 1);
      const cand = correctNum + delta;
      if (cand >= 0) options.add(cand);
    }
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US")), correctLabel: correctNum.toLocaleString("en-US") };
  }
  return { prompt: q.prompt, options: [String(q.answer)], correctLabel: String(q.answer) };
}

function showDriveQuestion() {
  driveState.paused = true;
  const key = DRIVE_QUICK_GEN_KEYS[rand(0, DRIVE_QUICK_GEN_KEYS.length - 1)];
  const raw = MATHVILLE_GENERATORS[key]();
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

$("btn-drive").addEventListener("click", goToDrive);
document.querySelectorAll(".dpad-btn").forEach(btn => {
  const dir = btn.dataset.dir;
  const setDir = val => {
    if (driveState) driveState.held[dir] = val;
    btn.classList.toggle("active", val);
  };
  btn.addEventListener("pointerdown", e => { e.preventDefault(); setDir(true); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(evt => btn.addEventListener(evt, () => setDir(false)));
});

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
        steps.push({ uiType: "tap", prompt: q.prompt, options: ["Prime", "Not Prime"], correctLabel: /^not prime/i.test(q.answer) ? "Not Prime" : "Prime" });
      } else {
        steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
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
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const q = MATHVILLE_GENERATORS.multiplication();
      steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
    }

  } else if (chapterId === "division") {
    const statics = pickN(chapterData.staticQuestions.filter(q => !q.skipInRound), 1);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer }));
    for (let i = 0; i < ROUND_SIZE - statics.length; i++) {
      const q = MATHVILLE_GENERATORS.division();
      steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer });
    }

  } else if (chapterId === "mixed-operation") {
    pickN(chapterData.questions, Math.min(ROUND_SIZE, chapterData.questions.length))
      .forEach(q => steps.push({ uiType: "typein", prompt: q.prompt, answer: q.answer }));

  } else if (chapterId === "measurement") {
    const statics = pickN(chapterData.staticQuestions, 2);
    statics.forEach(s => steps.push({ uiType: "typein", prompt: s.prompt, answer: s.answer }));
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
    if (state.driveReturnPending) { state.driveReturnPending = false; goToDrive(); }
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
