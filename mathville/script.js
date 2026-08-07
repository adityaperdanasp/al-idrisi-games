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
  "rounding": { location: "Clock Tower", icon: "🕰️", mapX: 80, mapY: 1430 },
  // Synthetic chapterId (never in MATHVILLE_BANK.chapters, same pattern as
  // Plane Mode's "plane-mode") so showReward()'s CHAPTER_META lookup and
  // saveChapterProgress() work unmodified for a Focus Round. Town-map
  // rendering only ever iterates the real chapters array, never this
  // object's own keys, so this extra entry is inert there.
  "focus-round": { location: "Focus Round", icon: "🎯" }
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
  $("btn-ninja").classList.toggle("hidden", hideNav);
  // Screens that already have their own Bo (Drive Mode's car, the reward
  // screen's AI Tutor card) or where it'd just be clutter (landing, pair
  // setup, Plane Mode, Ninja Runner has its own review-with-Bo overlay)
  // hide the persistent widget instead.
  const hideGameBo = ["screen-landing", "screen-pair", "screen-drive", "screen-plane", "screen-reward", "screen-ninja"].includes(id);
  const gameBo = $("game-bo");
  if (gameBo) gameBo.classList.toggle("hidden", hideGameBo);
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
  return { chapters: {}, xpTotal: 0, planeHighScore: 0 };
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
    // setProgress does a full overwrite (.set(), not .update()), so every
    // call site must include planeHighScore too or it gets wiped out.
    AIGLeaderboard.setProgress("mathville", { chapters: PROGRESS.chapters, xpTotal: PROGRESS.xpTotal, planeHighScore: PROGRESS.planeHighScore });
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
  if (window.AIGBgm && AIGBgm.playDefaultTrack) AIGBgm.playDefaultTrack();
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
    // Truck emoji in its own span (not directly on .map-traveler) so the
    // facing-left flip only mirrors the truck, not the Bo face riding
    // along with it. .map-traveler itself stays pointer-events:none (it
    // must not block taps on nearby chapter icons) -- only the Bo face
    // opts back into pointer-events so it's still tappable.
    traveler.innerHTML = `
      <span class="map-traveler-truck">🚚</span>
      <span class="map-traveler-bo-hint" id="map-traveler-bo-hint">Bo here!</span>
      <img class="map-traveler-bo-face" id="map-traveler-bo-face" src="../icon-192.png" alt="Bo">
    `;
    const boFace = traveler.querySelector("#map-traveler-bo-face");
    boFace.addEventListener("click", e => {
      e.stopPropagation();
      const hint = traveler.querySelector("#map-traveler-bo-hint");
      if (hint) hint.style.display = "none";
      if (window.openBoChat) window.openBoChat();
    });
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

// Small illustrative examples shown under the intro text for every
// chapter, so a kid sees one worked example before the round starts
// instead of jumping straight into practice questions.
//
// Two shapes:
//   "grid"  -- place-value's original digit/place-label boxes.
//   "steps" -- a short vertical sequence of lines walking through one
//              worked example. `mono: true` right-aligns them in a
//              monospace column (for actual column arithmetic).
const INTRO_DEMOS = {
  "place-value": {
    type: "grid",
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
  },
  "addition-subtraction": {
    type: "steps",
    mono: true,
    label: "12,456 + 8,738 — carry when a column tops 9",
    lines: ["  12456", "+  8738", "———————", "  21194"]
  },
  "prime-numbers": {
    type: "steps",
    label: "Breaking 24 down into its prime factors",
    lines: ["24 = 2 × 12", "12 = 2 × 6", "6 = 2 × 3", "24 = 2 × 2 × 2 × 3"]
  },
  "gcf-lcm": {
    type: "steps",
    label: "GCF and LCM of 12 and 18",
    lines: [
      "Factors of 12: 1, 2, 3, 4, 6, 12",
      "Factors of 18: 1, 2, 3, 6, 9, 18",
      "GCF = 6 (biggest factor they share)",
      "LCM = 36 (smallest multiple they share)"
    ]
  },
  "multiplication": {
    type: "steps",
    mono: true,
    label: "6 × 47 using the distributive property",
    lines: ["6 × 47", "= 6×40 + 6×7", "= 240 + 42", "= 282"]
  },
  "division": {
    type: "steps",
    label: "Is 348 divisible by 4? Check the last 2 digits",
    lines: ["Last 2 digits of 348 → 48", "48 ÷ 4 = 12, no remainder", "So yes — 348 divides evenly by 4!"]
  },
  "mixed-operation": {
    type: "steps",
    label: "\"The clinic has 84 masks, split evenly into 4 boxes\"",
    lines: [
      "Splitting into equal groups means DIVIDE",
      "84 ÷ 4 = 21",
      "21 masks in each box"
    ]
  },
  "measurement": {
    type: "steps",
    mono: true,
    label: "Converting 3 kilometers to meters",
    lines: ["1 km = 1000 m", "3 km = 3 × 1000", "3 km = 3000 m"]
  },
  "rounding": {
    type: "steps",
    label: "Round 4,672 to the nearest hundred",
    lines: [
      "Look at the tens digit of 4,672 → it's 7",
      "7 is 5 or more, so round UP",
      "4,672 → 4,700"
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
    row.classList.toggle("intro-demo-row-steps", demo.type === "steps");
    row.classList.toggle("intro-demo-row-mono", !!demo.mono);
    if (demo.type === "steps") {
      demo.lines.forEach((line, i) => {
        const lineEl = document.createElement("div");
        lineEl.className = "intro-demo-step" + (i === demo.lines.length - 1 ? " intro-demo-step-final" : "");
        lineEl.textContent = line;
        row.appendChild(lineEl);
      });
    } else {
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
const DRIVE_SPEED = 0.3888 * 1.10;   // % of world per animation frame, at full joystick deflection (+10% per feedback -- car AND dino, since DINO_SPEED below is derived from this)
const DINO_SPEED = DRIVE_SPEED * 1.1 * 0.8; // 10% faster than the car's top speed, then -20% (scales with DRIVE_SPEED, so the +10% above applies to both)
const DRIVE_HARD_DINO_SLOW_MULT = 0.95; // Hard-only: -5% more, per feedback after playtesting nitro/water-gun/2-dinos together
const DRIVE_DINO_AVOID_RANGE_PX = 80; // real pixels — was a raw % distance, which on this
                                       // tall (non-square) field meant the avoid check
                                       // triggered at very different real distances depending
                                       // on whether the obstacle was mostly-sideways or
                                       // mostly-ahead, so avoidance worked on some obstacles
                                       // and not others. Bumped from 55 -> 80 (dinos were
                                       // still visibly clipping obstacles -- reacting only
                                       // that close left too little room to actually turn
                                       // away in time at DINO_SPEED).
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
const DRIVE_WATER_RANGE_PX = 128; // +50% from the original 85 -- a fire-truck-hose jet, not a splash cone
const DRIVE_WATER_CONE_RAD = Math.PI / 10; // half-angle, ~18° total cone -- -50% width from the original 36°
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
  // Each dino tracks its own water "wet" progress independently (dousing
  // one doesn't affect the other), but bite immunity is car-wide (see
  // carImmuneUntil below) -- being bitten protects against every dino,
  // not just whichever one bit.
  const dinoStarts = driveDifficulty === "hard"
    ? [DRIVE_DINO_START, DRIVE_DINO2_START]
    : [DRIVE_DINO_START];
  driveState = {
    x: DRIVE_CAR_START.x, y: DRIVE_CAR_START.y,
    dinos: dinoStarts.map((pos, i) => ({
      id: "drive-dino" + (i === 0 ? "" : "-" + (i + 1)),
      x: pos.x, y: pos.y,
      wetMs: 0, slowUntil: 0
    })),
    carImmuneUntil: 0,
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
  // Max turn sharpened from 60° (PI/3) to ~78° (PI/2.3) -- with the wider
  // detection range above, a shallow turn still wasn't enough to clear an
  // obstacle the dino was closing on nearly head-on.
  return desiredAngle + turn * (Math.PI / 2.3) * avoidStrength;
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
          const baseSpeed = DINO_SPEED * (driveDifficulty === "hard" ? DRIVE_HARD_DINO_SLOW_MULT : 1);
          const step = Math.min(dist, baseSpeed * (slowed ? DRIVE_WATER_SLOW_MULT : 1));
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
  // Immunity is car-wide, not per-dino -- with 2 dinos on Hard, a bite from
  // one used to leave the OTHER dino's independent cooldown untouched,
  // letting it bite again on the very next frame instead of the player
  // actually getting a 3s breather from every dino.
  if (now < driveState.carImmuneUntil) return;
  for (const d of driveState.dinos) {
    if (drivePxDist(d.x, d.y, driveState.x, driveState.y) < DRIVE_CAR_PX_R + DRIVE_DINO_PX_R) {
      driveState.carImmuneUntil = now + DRIVE_BITE_COOLDOWN_MS;
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

// 5 skins each for car and plane -- purely cosmetic (identical speed/
// collision/controls within a category), just a different silhouette,
// color scheme, and signature glow color. The glow is applied via the
// shared .vehicle-glow class + --vehicle-glow CSS custom property, so
// adding a 6th skin later needs nothing beyond a new entry here.
const VEHICLE_SKINS = {
  car: [
    { id: "blaze", name: "Blaze", glow: "#E4572E", svg: '<svg viewBox="0 0 26 40" width="23" height="36"><rect x="3" y="1" width="20" height="38" rx="8" fill="#E4572E" stroke="#C6431F" stroke-width="1.5" /><rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" /><rect x="0" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" /><rect x="22" y="9" width="4" height="8" rx="1.5" fill="#3B2A1A" /><rect x="0" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" /><rect x="22" y="23" width="4" height="8" rx="1.5" fill="#3B2A1A" /></svg>' },
    { id: "comet", name: "Comet", glow: "#4A90D9", svg: '<svg viewBox="0 0 26 40" width="23" height="36"><rect x="3" y="1" width="20" height="38" rx="8" fill="#2E6BA3" stroke="#1E4E7A" stroke-width="1.5" /><rect x="11" y="1" width="4" height="38" fill="#EAF6FF" opacity="0.85" /><rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" /><rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /></svg>' },
    { id: "turbo", name: "Turbo", glow: "#3FA84A", svg: '<svg viewBox="0 0 26 44" width="23" height="38"><rect x="3" y="5" width="20" height="38" rx="8" fill="#3FA84A" stroke="#2A7A32" stroke-width="1.5" /><rect x="2" y="0" width="22" height="5" rx="2" fill="#2A7A32" /><rect x="6" y="11" width="14" height="10" rx="2.5" fill="#BFE3F0" /><rect x="0" y="13" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="13" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="0" y="27" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="27" width="4" height="8" rx="1.5" fill="#1A1A1A" /></svg>' },
    { id: "sunburst", name: "Sunburst", glow: "#F7C548", svg: '<svg viewBox="0 0 26 40" width="23" height="36"><rect x="3" y="1" width="20" height="38" rx="8" fill="#F7C548" stroke="#C99A2E" stroke-width="1.5" /><rect x="3" y="17" width="20" height="6" fill="#1A1A1A" /><rect x="6" y="7" width="14" height="10" rx="2.5" fill="#BFE3F0" /><rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /></svg>' },
    { id: "nova", name: "Nova", glow: "#9B59D0", svg: '<svg viewBox="0 0 26 40" width="23" height="36"><rect x="3" y="1" width="20" height="38" rx="8" fill="#7A4FC7" stroke="#5B3894" stroke-width="1.5" /><rect x="6" y="7" width="14" height="10" rx="2.5" fill="#2A2044" opacity="0.5" /><path d="M14 6 L9 18 L13 18 L10 30 L18 15 L14 15 Z" fill="#F7E14A" /><rect x="0" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="9" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="0" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /><rect x="22" y="23" width="4" height="8" rx="1.5" fill="#1A1A1A" /></svg>' }
  ],
  plane: [
    { id: "falcon", name: "Falcon", glow: "#4A90D9", svg: '<svg viewBox="0 0 30 34" width="27" height="30"><path d="M15 1 L20 20 L15 17 L10 20 Z" fill="#4A90D9" stroke="#2E6BA3" stroke-width="1.5" stroke-linejoin="round" /><path d="M15 17 L15 33" stroke="#2E6BA3" stroke-width="2" stroke-linecap="round" /><path d="M4 22 L15 17 L15 24 Z" fill="#6EA8E0" stroke="#2E6BA3" stroke-width="1.2" /><path d="M26 22 L15 17 L15 24 Z" fill="#6EA8E0" stroke="#2E6BA3" stroke-width="1.2" /><circle cx="15" cy="12" r="3" fill="#BFE3F0" /></svg>' },
    { id: "inferno", name: "Inferno", glow: "#E4572E", svg: '<svg viewBox="0 0 30 34" width="27" height="30"><path d="M15 1 C11.5 7 11.5 20 11.5 25 L18.5 25 C18.5 20 18.5 7 15 1 Z" fill="#E4572E" stroke="#B8391A" stroke-width="1.5" stroke-linejoin="round" /><path d="M11.5 19 L4 27 L11.5 24 Z" fill="#FF9466" stroke="#B8391A" stroke-width="1.2" /><path d="M18.5 19 L26 27 L18.5 24 Z" fill="#FF9466" stroke="#B8391A" stroke-width="1.2" /><circle cx="15" cy="10" r="2.5" fill="#FFE1C1" /><path d="M12 25 Q15 32 18 25 Z" fill="#FFD93D" opacity="0.9" /></svg>' },
    { id: "viper", name: "Viper", glow: "#3FA84A", svg: '<svg viewBox="0 0 30 34" width="27" height="30"><path d="M15 6 L29 25 L15 20 L1 25 Z" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="1.5" stroke-linejoin="round" /><path d="M15 6 L17.5 1 L15 -1 L12.5 1 Z" fill="#2A2A2A" stroke="#1A1A1A" stroke-width="1.2" stroke-linejoin="round" /><circle cx="15" cy="14" r="2.5" fill="#3FA84A" /></svg>' },
    { id: "solstice", name: "Solstice", glow: "#F7C548", svg: '<svg viewBox="0 0 30 34" width="27" height="30"><circle cx="15" cy="3" r="2.2" fill="#C99A2E" stroke="#8A6A1E" stroke-width="1" /><rect x="13" y="5" width="4" height="25" rx="2" fill="#F7C548" stroke="#C99A2E" stroke-width="1.3" /><rect x="3" y="12" width="24" height="3.4" rx="1.5" fill="#FFE08A" stroke="#C99A2E" stroke-width="1.2" /><rect x="6" y="21" width="18" height="3.4" rx="1.5" fill="#FFE08A" stroke="#C99A2E" stroke-width="1.2" /><circle cx="15" cy="9" r="2.3" fill="#FFF6D9" /></svg>' },
    { id: "ghost", name: "Ghost", glow: "#9DB3D6", svg: '<svg viewBox="0 0 30 34" width="27" height="30"><path d="M15 0 L17 27 L15 24 L13 27 Z" fill="#E9EEF6" stroke="#9DB3D6" stroke-width="1.4" stroke-linejoin="round" /><path d="M8 25 L15 22 L15 26.5 Z" fill="#F5F8FC" stroke="#9DB3D6" stroke-width="1.1" /><path d="M22 25 L15 22 L15 26.5 Z" fill="#F5F8FC" stroke="#9DB3D6" stroke-width="1.1" /><circle cx="15" cy="9" r="2" fill="#C1D4F6" /></svg>' }
  ]
};

function getVehicleSkinId(category) {
  return localStorage.getItem("mathville.vehicleSkin." + category) || VEHICLE_SKINS[category][0].id;
}
function setVehicleSkinId(category, id) {
  localStorage.setItem("mathville.vehicleSkin." + category, id);
}
function getVehicleSkin(category) {
  const id = getVehicleSkinId(category);
  return VEHICLE_SKINS[category].find(s => s.id === id) || VEHICLE_SKINS[category][0];
}

// Injects the chosen skin's SVG into the car/plane sprite element and
// applies its signature glow color via a CSS custom property (read by the
// shared .vehicle-glow animation). #drive-car-sprite is a dedicated wrapper
// specifically so this can replace ONLY the vehicle art without touching
// the Bo-face/hint overlay siblings; #plane-ship has no such siblings so
// it's swapped directly.
function applyVehicleSkin(category) {
  const skin = getVehicleSkin(category);
  if (category === "car") {
    const sprite = $("drive-car-sprite");
    sprite.innerHTML = skin.svg;
    sprite.style.setProperty("--vehicle-glow", skin.glow);
    sprite.classList.add("vehicle-glow");
  } else {
    const ship = $("plane-ship");
    ship.innerHTML = skin.svg;
    ship.style.setProperty("--vehicle-glow", skin.glow);
    ship.classList.add("vehicle-glow");
  }
}

function renderVehicleSkinGrid(category, onPicked) {
  $("vehicle-skin-title").textContent = category === "car" ? "Pick your car" : "Pick your plane";
  const grid = $("vehicle-skin-grid");
  grid.innerHTML = "";
  const currentId = getVehicleSkinId(category);
  VEHICLE_SKINS[category].forEach(skin => {
    const card = document.createElement("button");
    card.className = "vehicle-skin-card" + (skin.id === currentId ? " active" : "");
    card.style.setProperty("--vehicle-glow", skin.glow);
    card.innerHTML = `<span class="vehicle-skin-thumb vehicle-glow">${skin.svg}</span><span class="vehicle-skin-name">${skin.name}</span>`;
    card.addEventListener("click", () => {
      setVehicleSkinId(category, skin.id);
      onPicked();
    });
    grid.appendChild(card);
  });
}

// Vehicle picker overlay lives OUTSIDE every .screen (direct child of
// #app), so unlike the difficulty/plane-end overlays it's safe to show
// before we've even decided which screen to switch to. Two steps: first
// category (car vs plane), then one of its 5 skins.
function playVehiclePicker(onPicked) {
  const overlay = $("drive-vehicle-overlay");
  const stepCategory = $("vehicle-step-category");
  const stepSkin = $("vehicle-step-skin");
  overlay.classList.remove("hidden");
  stepCategory.classList.remove("hidden");
  stepSkin.classList.add("hidden");

  const categoryButtons = document.querySelectorAll("#vehicle-step-category .drive-difficulty-btn");
  function categoryHandler(e) {
    const vehicle = e.currentTarget.dataset.vehicle;
    stepCategory.classList.add("hidden");
    stepSkin.classList.remove("hidden");
    renderVehicleSkinGrid(vehicle, () => {
      categoryButtons.forEach(b => b.removeEventListener("click", categoryHandler));
      $("vehicle-skin-back").removeEventListener("click", backHandler);
      overlay.classList.add("hidden");
      onPicked(vehicle);
    });
  }
  function backHandler() {
    stepSkin.classList.add("hidden");
    stepCategory.classList.remove("hidden");
  }
  categoryButtons.forEach(b => b.addEventListener("click", categoryHandler));
  $("vehicle-skin-back").addEventListener("click", backHandler);
}

function launchDriveMode() {
  playVehiclePicker(vehicle => {
    if (vehicle === "plane") { launchPlaneMode(); return; }

    // The difficulty picker overlay lives INSIDE #screen-drive's markup, so
    // it stays invisible (display:none, inherited from its non-active
    // ancestor) until that section is actually the active screen — without
    // this, un-hiding the overlay alone does nothing visible at all,
    // whether launched from the map's drive button or the hub's ?drive=1
    // deep link. goToDrive() (called after a difficulty is picked) also
    // sets this same screen active, so this is a harmless no-op there.
    if (window.AIGBgm && AIGBgm.playDefaultTrack) AIGBgm.playDefaultTrack();
    applyVehicleSkin("car");
    showScreen("screen-drive");
    playDriveDifficultyPicker(() => {
      goToDrive(false);
      driveState.paused = true;
      playDriveCountdown(() => { if (driveState) driveState.paused = false; });
    });
  });
}

$("btn-drive").addEventListener("click", launchDriveMode);
$("drive-end-replay").addEventListener("click", () => goToDrive(false));

/* =================================================================
   PLANE MODE — Phase 1 (core engine) + Phase 2 (bullet hell layer)
   -----------------------------------------------------------------
   A vertical-scroll shmup, entirely separate from Drive Mode's
   driveState/goToDrive/startDriveLoop. Nothing here is imported by or
   imports from the car code, by design -- Drive Mode must keep working
   identically no matter what changes here.

   Phase 1: joystick-controlled ship, auto-fire, basic enemies that
   drift down, bullet-vs-enemy collision (score).
   Phase 2: enemies fire back (staggered per-enemy timer), a 3-life
   system (mirrors Drive Mode's DRIVE_MAX_BITES/❤️ pattern) instead of
   Phase 1's instant-crash-on-touch, brief invulnerability + flash after
   a hit (mirrors driveState.carImmuneUntil/.bitten).
   Phase 3: explosions + screen shake ("juice").
   Phase 4: the math-question hook (moved up from its original slot).
   Phase 5: power-ups (⚡ rapid fire, 🛡️ shield -- drop from destroyed
   regular enemies), wave difficulty (spawn rate/enemy speed ramp up
   over time), and a boss fight once score reaches PLANE_BOSS_SCORE_
   THRESHOLD (regular spawns stop, one tanky enemy takes over, defeating
   it wins the round).
   Phase 6: winning the boss fight awards real XP via saveChapterProgress
   (same players/{id}/badges/mathville path every chapter uses), plus
   confetti -- mirrors Drive Mode's win treatment. Drive Mode itself
   still doesn't award XP on its own win; not retrofitting that here,
   out of scope for the plane-mode work.
   ================================================================= */
const PLANE_SHIP_SPEED = 0.918 * 0.8;  // % of world width/height per frame at full stick deflection (originally 1.6, then -25%, -15%, -10%, then another -20% -- per repeated feedback that it still felt too sensitive each round)
const PLANE_BULLET_SPEED = 2.2;        // % of world height per frame
const PLANE_FIRE_INTERVAL_MS = 280;
const PLANE_ENEMY_SPAWN_INTERVAL_MS = 900;
const PLANE_ENEMY_SPEED = 0.35;        // % of world height per frame
const PLANE_HIT_RADIUS_PX = 22;        // bullet-enemy, ship-enemy, ship-enemy-bullet collision radius
const PLANE_MAX_LIVES = 3;
const PLANE_ENEMY_BULLET_SPEED = 1.1 * 0.8; // % of world height per frame -- slower than the player's, dodgeable; -20% per feedback (also slows boss bullets, which reuse this same constant via spawnPlaneEnemyBullet)
const PLANE_ENEMY_FIRE_MIN_MS = 1400;
const PLANE_ENEMY_FIRE_MAX_MS = 2600;
const PLANE_HIT_INVULN_MS = 1500;      // matches DRIVE_BITE_COOLDOWN_MS's feel
const PLANE_QUESTION_INTERVAL_MS = 10000; // a math question every ~10s of active flight (was 15s, per feedback)
// Answering correctly used to only bomb regular enemies -- if a boss is
// up when the question fires, the correct answer now also chips its HP,
// so questions stay useful/exciting during a boss fight instead of only
// mattering against regular waves.
const PLANE_BOSS_QUESTION_DAMAGE = 3;

// Running out of lives used to end the round outright. Per feedback, kids
// wanted a longer run: up to PLANE_MAX_RESPAWNS times per session, dying
// instead opens a respawn gauntlet (see startPlaneRespawnChallenge) --
// answer PLANE_RESPAWN_CORRECT_NEEDED questions correctly (wrong answers
// don't count against the total, they just mean one more question, per
// explicit request) to come back with full lives. Only once every respawn
// is used does running out of lives become a real Game Over.
const PLANE_MAX_RESPAWNS = 3;
const PLANE_RESPAWN_CORRECT_NEEDED = 3;

// Phase 5 -- wave difficulty ramp. Every PLANE_DIFFICULTY_RAMP_MS of active
// flight, spawn interval shrinks and enemy speed grows, each capped so it
// never becomes unfair.
const PLANE_DIFFICULTY_RAMP_MS = 10000;
const PLANE_MIN_SPAWN_INTERVAL_MS = 450;
const PLANE_SPAWN_INTERVAL_STEP_MS = 60;
const PLANE_MAX_ENEMY_SPEED = 0.55;
const PLANE_ENEMY_SPEED_STEP = 0.03;

// Enemy density -- a multiplier applied to the spawn interval (higher
// density = shorter interval = more enemies on screen). Originally started
// 10% above baseline; per feedback the whole thing felt too hard (aimed
// fire + this many enemies), so it's pulled back 10% (1.10*0.9 = 0.99,
// i.e. now roughly baseline), then another 5% per later feedback (*0.95)
// before compounding 20% per boss defeat as before -- each new wave after
// a boss is still noticeably busier than the last, just starting from a
// fairer point.
const PLANE_ENEMY_DENSITY_START = 1.10 * 0.9 * 0.95;
const PLANE_ENEMY_DENSITY_BOSS_MULT = 1.20;

// Phase 5 -- power-ups. Regular (non-boss) kills have a flat chance to drop
// one; touching it with the ship applies a timed buff (heal is instant
// instead). PLANE_POWERUP_TYPES is what spawnPlanePowerup() actually rolls
// from -- started as a coin flip between just rapid/shield, now 5-way.
const PLANE_POWERUP_DROP_CHANCE = 0.22;
const PLANE_POWERUP_FALL_SPEED = 0.3;   // % world height per frame, same feel as enemies
const PLANE_RAPID_FIRE_INTERVAL_MS = 140; // vs PLANE_FIRE_INTERVAL_MS's 280 when not buffed
const PLANE_RAPID_DURATION_MS = 8000;
const PLANE_SHIELD_DURATION_MS = 6000;
const PLANE_WINGMEN_DURATION_MS = 10000; // 2 small escort ships that auto-fire alongside the player
const PLANE_SPREAD_DURATION_MS = 10000;  // ship fires 2 angled shots instead of 1 straight one
const PLANE_SPREAD_ANGLE_DEG = 18;       // how far each spread shot leans from straight up
const PLANE_POWERUP_TYPES = ["rapid", "shield", "heal", "wingmen", "spread"];
const PLANE_POWERUP_EMOJI = { rapid: "⚡", shield: "🛡️", heal: "❤️", wingmen: "👯", spread: "🔱" };

// Variety pass (per feedback: "too static", every enemy the same sprite
// flying dead straight). Each spawn picks one of these; moveStyle changes
// how the frame loop updates its x each tick (see the enemy-movement block
// in startPlaneLoop), and bulletClass gives its shots a distinct look
// (CSS in style.css). This ALSO fixes a real bug: with every enemy moving
// straight down and bullets going straight down from wherever the enemy
// was, a ship that never moved sat in a "dead lane" nothing could ever
// reach -- sine/drift/zigzag movement plus (see spawnPlaneEnemyBullet)
// bullets now aimed at the ship's position closes that gap.
const PLANE_ENEMY_TYPES = [
  { emoji: "👾", moveStyle: "straight", bulletClass: "" },
  { emoji: "👽", moveStyle: "sine", bulletClass: "round" },
  { emoji: "🛸", moveStyle: "drift", bulletClass: "big" },
  { emoji: "🦇", moveStyle: "zigzag", bulletClass: "diamond" }
];

// Enemies otherwise only ever descend, so both their movement AND their
// fire (despite spawnPlaneEnemyBullet's aim already being omnidirectional)
// only ever threatened the ship from above -- per feedback, once an enemy
// has flown a good distance past the ship it never had a chance to double
// back and attack from behind. PLANE_ENEMY_REVERSE_MARGIN is how far past
// the ship's y (in % of world height) before a "should I turn around?"
// roll happens (once per enemy); PLANE_ENEMY_REVERSE_CHANCE is the odds.
const PLANE_ENEMY_REVERSE_MARGIN = 15;
const PLANE_ENEMY_REVERSE_CHANCE = 0.4;

// Boss. Regular spawns stop once score reaches the current threshold; the
// boss hovers rather than descending, and needs several hits before it's
// defeated. Defeating it does NOT end the round (see handleBossDefeat) --
// the game is endless, built around chasing a high score, with
// progressively busier waves and another boss further out each time
// (threshold climbs by PLANE_BOSS_THRESHOLD_STEP per kill). Cycles through
// PLANE_BOSS_TYPES (by bossesDefeated index) so it's not the same dragon
// every time; each type's hpMult/speedMult/fire-rate multipliers give it a
// distinct feel rather than just a palette swap.
const PLANE_BOSS_SCORE_THRESHOLD = 15;
const PLANE_BOSS_THRESHOLD_STEP = 15;
const PLANE_BOSS_MAX_HP = 16;            // 2x the original 8, per feedback
const PLANE_BOSS_SPEED = 0.25;          // % world width per frame
const PLANE_BOSS_FIRE_MIN_MS = 700;
const PLANE_BOSS_FIRE_MAX_MS = 1300;
const PLANE_BOSS_TYPES = [
  { emoji: "🐉", hpMult: 1.0, speedMult: 1.0, fireMult: 1.0, moveStyle: "bounce", bulletClass: "boss" },
  { emoji: "🦂", hpMult: 0.85, speedMult: 1.4, fireMult: 0.7, moveStyle: "bounce", bulletClass: "boss" },
  { emoji: "👹", hpMult: 1.3, speedMult: 0.6, fireMult: 1.3, moveStyle: "bounce", bulletClass: "boss" },
  { emoji: "🦑", hpMult: 1.0, speedMult: 1.0, fireMult: 0.9, moveStyle: "figure8", bulletClass: "boss" }
];

// Question interval also tightens per boss defeat (floor so it never
// becomes unplayable) -- this is how the round gets "harder" over time
// without ever making the math itself require pencil and paper (see
// rollPlaneQuestion: the mathville portion is always pulled at "easy",
// which every generator guarantees is mental-math-only).
const PLANE_QUESTION_INTERVAL_MIN_MS = 8000;
const PLANE_QUESTION_INTERVAL_STEP_MS = 1500;

// XP awarded to the mathville profile (players/{id}/badges/mathville,
// same path every chapter uses) each time a boss is defeated.
const PLANE_WIN_XP = 20;

let planeJoyVec = { x: 0, y: 0 };
let planeState = null;

function launchPlaneMode() {
  if (window.AIGBgm && AIGBgm.playPlaneTrack) AIGBgm.playPlaneTrack();
  applyVehicleSkin("plane");
  showScreen("screen-plane");
  planeState = {
    x: 50, y: 82,              // ship position, % of plane-world
    bullets: [],                // { id, x, y, el } -- player's own shots
    enemyBullets: [],           // { id, x, y, el } -- shots fired back at the ship
    enemies: [],                // { id, x, y, el, nextFireAt }
    powerups: [],                // { id, x, y, type, el } -- falling pickups
    boss: null,                  // { x, y, el, hp, dir, nextFireAt } once spawned
    bossSpawned: false,
    bossesDefeated: 0,
    enemyDensityMult: PLANE_ENEMY_DENSITY_START,
    bossScoreThreshold: PLANE_BOSS_SCORE_THRESHOLD,
    questionIntervalMs: PLANE_QUESTION_INTERVAL_MS,
    score: 0,
    lives: PLANE_MAX_LIVES,
    respawnsUsed: 0,
    respawnCorrectCount: 0,
    invulnUntil: 0,
    rapidUntil: 0,
    shieldUntil: 0,
    wingmenUntil: 0,
    spreadUntil: 0,
    wingmen: [],                  // { el, offsetX, lastFireAt } -- see ensurePlaneWingmen
    nextEnemyId: 0,
    nextBulletId: 0,
    nextEnemyBulletId: 0,
    nextPowerupId: 0,
    lastFireAt: 0,
    lastQuestionAt: performance.now(),
    startTime: performance.now(),
    rafId: null,
    paused: false,
    ended: false,
    worldRect: null
  };
  $("plane-world").querySelectorAll(".plane-bullet, .plane-enemy, .plane-enemy-bullet, .plane-powerup, .plane-boss, .plane-wingman").forEach(el => el.remove());
  $("plane-ship").classList.remove("hit");
  $("plane-ship").style.left = planeState.x + "%";
  $("plane-ship").style.top = planeState.y + "%";
  $("plane-end-overlay").classList.remove("lost");
  $("plane-end-overlay").classList.add("hidden");
  $("plane-question-overlay").classList.add("hidden");
  $("plane-respawn-overlay").classList.add("hidden");
  $("plane-boss-hp").classList.add("hidden");
  $("plane-buff-rapid").classList.add("hidden");
  $("plane-buff-shield").classList.add("hidden");
  $("plane-buff-wingmen").classList.add("hidden");
  $("plane-buff-spread").classList.add("hidden");
  updatePlaneScore();
  updatePlaneLives();
  updatePlaneBestHud();
  ensurePlaneQuestionPools();

  const rect = $("plane-world").getBoundingClientRect();
  if (rect.width === 0) {
    // Same early-paint gotcha as goToDrive() -- retry once real layout exists.
    requestAnimationFrame(() => launchPlaneMode());
    return;
  }
  planeState.worldRect = rect;
  startPlaneLoop();
}

// High score persists across sessions via PROGRESS (same localStorage/
// Firebase blob every mathville chapter uses -- see loadProgress()), so a
// player can chase their own best across replays, not just within a round.
function updatePlaneScore() {
  $("plane-score").textContent = "⭐ " + planeState.score;
  if (planeState.score > (PROGRESS.planeHighScore || 0)) {
    PROGRESS.planeHighScore = planeState.score;
    saveProgressToStorage();
    updatePlaneBestHud();
  }
}

function updatePlaneBestHud() {
  $("plane-best").textContent = "🏅 " + (PROGRESS.planeHighScore || 0);
}

function updatePlaneLives() {
  $("plane-lives").textContent = "❤️".repeat(planeState.lives) + "🖤".repeat(PLANE_MAX_LIVES - planeState.lives);
}

function planePxDist(ax, ay, bx, by) {
  const rect = planeState.worldRect;
  const dx = (ax - bx) / 100 * rect.width;
  const dy = (ay - by) / 100 * rect.height;
  return Math.hypot(dx, dy);
}

// angleDeg is measured from straight up (0 = up, positive = leaning
// right) so the spread power-up can fire two shots at +/-
// PLANE_SPREAD_ANGLE_DEG instead of one straight one; every other
// caller (ship's normal fire, wingmen) just uses the 0 default.
function spawnPlaneBulletAt(x, y, angleDeg = 0) {
  const id = "b" + (planeState.nextBulletId++);
  const el = document.createElement("div");
  el.className = "plane-bullet";
  $("plane-world").appendChild(el);
  const rad = (angleDeg * Math.PI) / 180;
  const vx = Math.sin(rad) * PLANE_BULLET_SPEED;
  const vy = -Math.cos(rad) * PLANE_BULLET_SPEED;
  planeState.bullets.push({ id, x, y, vx, vy, el });
}

// The ship's own fire -- spread power-up ADDS 2 angled shots alongside the
// normal straight one (3 total), rather than replacing it. Per feedback,
// 2 angled-only shots with nothing going straight up made it hard to aim
// at enemies directly ahead. Still counts as one "shot" for
// PLANE_FIRE_INTERVAL_MS/PLANE_RAPID_FIRE_INTERVAL_MS timing purposes,
// just more pellets per shot.
function spawnPlaneBullet() {
  const now = performance.now();
  spawnPlaneBulletAt(planeState.x, planeState.y - 4, 0);
  if (now < planeState.spreadUntil) {
    spawnPlaneBulletAt(planeState.x, planeState.y - 4, -PLANE_SPREAD_ANGLE_DEG);
    spawnPlaneBulletAt(planeState.x, planeState.y - 4, PLANE_SPREAD_ANGLE_DEG);
  }
}

function spawnPlaneEnemy() {
  const id = "e" + (planeState.nextEnemyId++);
  const type = PLANE_ENEMY_TYPES[rand(0, PLANE_ENEMY_TYPES.length - 1)];
  const el = document.createElement("div");
  el.className = "plane-enemy";
  el.textContent = type.emoji;
  $("plane-world").appendChild(el);
  planeState.enemies.push({
    id, x: rand(8, 92), y: -6, el, type,
    phase: Math.random() * Math.PI * 2, // sine movement offset, so they don't all wiggle in lockstep
    reversed: false, reverseRolled: false, // see PLANE_ENEMY_REVERSE_CHANCE
    nextFireAt: performance.now() + rand(PLANE_ENEMY_FIRE_MIN_MS, PLANE_ENEMY_FIRE_MAX_MS)
  });
}

// Aimed at the ship's CURRENT position at the moment of firing (not just
// straight down) -- see the PLANE_ENEMY_TYPES comment above for why. Used
// for both regular enemies and the boss (whatever object with .x/.y it's
// given), so boss shots are aimed too.
// spreadDeg adds random aim error so it's not a laser-precise homing shot
// every time (per feedback: regular enemies felt like they never missed
// once bullets started aiming at the ship at all -- see PLANE_ENEMY_TYPES'
// comment for why they're aimed in the first place). Regular enemies are
// worse shots than the boss, which still isn't perfect either.
function spawnPlaneEnemyBullet(enemy, spreadDeg) {
  if (spreadDeg === undefined) spreadDeg = 24;
  const id = "eb" + (planeState.nextEnemyBulletId++);
  const el = document.createElement("div");
  const bulletClass = enemy.type && enemy.type.bulletClass ? " " + enemy.type.bulletClass : "";
  el.className = "plane-enemy-bullet" + bulletClass;
  $("plane-world").appendChild(el);
  const fromX = enemy.x, fromY = enemy.y + 3;
  const dx = planeState.x - fromX, dy = planeState.y - fromY;
  let angle = Math.atan2(dy, dx) + (Math.random() * 2 - 1) * (spreadDeg * Math.PI / 180);
  const vx = Math.cos(angle) * PLANE_ENEMY_BULLET_SPEED;
  const vy = Math.sin(angle) * PLANE_ENEMY_BULLET_SPEED;
  planeState.enemyBullets.push({ id, x: fromX, y: fromY, vx, vy, el });
}

// Phase 3 "juice" -- a burst emoji that scales up + fades out at (x, y)
// (% of plane-world), self-removing once its animation finishes. Called
// wherever an enemy is destroyed (bullet kill, bomb, kamikaze) or the
// ship itself crashes.
function spawnPlaneExplosion(x, y, big) {
  const el = document.createElement("div");
  el.className = "plane-explosion" + (big ? " big" : "");
  el.textContent = "💥";
  el.style.left = x + "%";
  el.style.top = y + "%";
  $("plane-world").appendChild(el);
  setTimeout(() => el.remove(), 500);
}

// Restarting a CSS animation needs a reflow in between removing and
// re-adding the class, otherwise re-triggering it while already mid-shake
// (e.g. two hits in quick succession) silently does nothing.
function shakePlaneWorld() {
  const world = $("plane-world");
  world.classList.remove("shake");
  void world.offsetWidth;
  world.classList.add("shake");
}

// Shared by both "got hit" paths (enemy bullet, enemy body-slam) -- costs
// one life, starts a brief invulnerability window, and flashes the ship
// the same way Drive Mode's .drive-car.bitten does for the car.
function planeTakeHit() {
  const now = performance.now();
  if (now < planeState.invulnUntil) return;
  // A shield absorbs the hit entirely -- no life lost, no invuln window
  // needed since the shield itself is the protection. Still shakes the
  // world so the hit registers as feedback rather than feeling like nothing
  // happened.
  if (now < planeState.shieldUntil) {
    shakePlaneWorld();
    return;
  }
  planeState.invulnUntil = now + PLANE_HIT_INVULN_MS;
  planeState.lives -= 1;
  updatePlaneLives();
  const ship = $("plane-ship");
  ship.classList.add("hit");
  setTimeout(() => ship.classList.remove("hit"), PLANE_HIT_INVULN_MS);
  shakePlaneWorld();
  if (planeState.lives <= 0) {
    spawnPlaneExplosion(planeState.x, planeState.y, true);
    if (planeState.respawnsUsed < PLANE_MAX_RESPAWNS) {
      startPlaneRespawnChallenge();
    } else {
      endPlaneMode();
    }
  }
}

// Lives hit 0 but a respawn is still available -- pause the round and open
// a gauntlet: keep asking questions (reusing rollPlaneQuestion(), same bank
// as the normal in-flight question) until PLANE_RESPAWN_CORRECT_NEEDED are
// answered correctly. A wrong answer doesn't cost anything but progress --
// it just rolls the next question rather than ending the attempt.
function startPlaneRespawnChallenge() {
  planeState.paused = true;
  planeState.respawnCorrectCount = 0;
  updatePlaneRespawnProgress();
  $("plane-respawn-overlay").classList.remove("hidden");
  rollPlaneRespawnQuestion();
}

function updatePlaneRespawnProgress() {
  $("plane-respawn-progress").textContent = `${planeState.respawnCorrectCount} / ${PLANE_RESPAWN_CORRECT_NEEDED} benar`;
}

function rollPlaneRespawnQuestion() {
  const step = rollPlaneQuestion();
  $("plane-respawn-prompt").textContent = step.prompt;
  const grid = $("plane-respawn-options");
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
      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "plane-mode", isCorrect);
      if (isCorrect) {
        planeState.respawnCorrectCount += 1;
        updatePlaneRespawnProgress();
      }
      setTimeout(() => {
        if (planeState.respawnCorrectCount >= PLANE_RESPAWN_CORRECT_NEEDED) {
          finishPlaneRespawn();
        } else {
          rollPlaneRespawnQuestion();
        }
      }, 900);
    });
    grid.appendChild(btn);
  });
}

// 3 correct answers reached -- come back with full lives, one respawn
// spent, brief invulnerability so the ship isn't hit the instant it
// reappears, then resume the round right where it left off.
function finishPlaneRespawn() {
  planeState.respawnsUsed += 1;
  planeState.lives = PLANE_MAX_LIVES;
  updatePlaneLives();
  planeState.invulnUntil = performance.now() + PLANE_HIT_INVULN_MS;
  $("plane-respawn-overlay").classList.add("hidden");
  planeState.lastQuestionAt = performance.now();
  if (planeState && !planeState.ended) planeState.paused = false;
}

// Phase 5 -- power-ups. Falls straight down like a regular enemy; touching
// it with the ship applies the buff and removes the pickup.
function spawnPlanePowerup(x, y) {
  const type = PLANE_POWERUP_TYPES[rand(0, PLANE_POWERUP_TYPES.length - 1)];
  const id = "p" + (planeState.nextPowerupId++);
  const el = document.createElement("div");
  el.className = "plane-powerup";
  el.textContent = PLANE_POWERUP_EMOJI[type];
  $("plane-world").appendChild(el);
  planeState.powerups.push({ id, x, y, type, el });
}

function applyPlanePowerup(type) {
  const now = performance.now();
  if (type === "rapid") {
    planeState.rapidUntil = now + PLANE_RAPID_DURATION_MS;
  } else if (type === "shield") {
    planeState.shieldUntil = now + PLANE_SHIELD_DURATION_MS;
  } else if (type === "heal") {
    planeState.lives = Math.min(PLANE_MAX_LIVES, planeState.lives + 1);
    updatePlaneLives();
  } else if (type === "wingmen") {
    planeState.wingmenUntil = now + PLANE_WINGMEN_DURATION_MS;
    ensurePlaneWingmen();
  } else if (type === "spread") {
    planeState.spreadUntil = now + PLANE_SPREAD_DURATION_MS;
  }
}

// Two small escort ships that mirror the player's own fire rate while
// active, offset to either side. Created once when the buff starts
// (ensurePlaneWingmen) and removed once it expires (removePlaneWingmen) --
// picking up a second "wingmen" pickup while already active just extends
// wingmenUntil without spawning duplicates, since ensurePlaneWingmen no-ops
// if planeState.wingmen already has entries.
function ensurePlaneWingmen() {
  if (planeState.wingmen.length) return;
  [-11, 11].forEach(offsetX => {
    const el = document.createElement("div");
    el.className = "plane-wingman";
    el.textContent = "🛩️";
    $("plane-world").appendChild(el);
    planeState.wingmen.push({ el, offsetX, lastFireAt: performance.now() });
  });
}
function removePlaneWingmen() {
  planeState.wingmen.forEach(w => w.el.remove());
  planeState.wingmen = [];
}

// Toggled every frame from the current buff timestamps -- cheap enough to
// just recompute rather than tracking a separate "is this pill visible"
// flag that could drift out of sync.
function updatePlaneBuffHud() {
  const now = performance.now();
  $("plane-buff-rapid").classList.toggle("hidden", now >= planeState.rapidUntil);
  $("plane-buff-shield").classList.toggle("hidden", now >= planeState.shieldUntil);
  $("plane-buff-wingmen").classList.toggle("hidden", now >= planeState.wingmenUntil);
  $("plane-buff-spread").classList.toggle("hidden", now >= planeState.spreadUntil);
}

// Phase 5 -- boss. Hovers near the top and drifts side to side (bouncing at
// the edges) instead of descending like regular enemies, and fires more
// often. Reuses spawnPlaneEnemyBullet since that function only reads
// .x/.y off whatever "enemy" object it's given.
function spawnPlaneBoss() {
  planeState.bossSpawned = true;
  const type = PLANE_BOSS_TYPES[planeState.bossesDefeated % PLANE_BOSS_TYPES.length];
  const el = document.createElement("div");
  el.className = "plane-boss";
  el.textContent = type.emoji;
  $("plane-world").appendChild(el);
  const hp = Math.round(PLANE_BOSS_MAX_HP * type.hpMult);
  planeState.boss = {
    x: 50, y: 18, el, hp, maxHp: hp, dir: 1, type, t: 0,
    nextFireAt: performance.now() + rand(PLANE_BOSS_FIRE_MIN_MS, PLANE_BOSS_FIRE_MAX_MS) * type.fireMult
  };
  updatePlaneBossHp();
  $("plane-boss-hp").classList.remove("hidden");
}

function updatePlaneBossHp() {
  if (!planeState.boss) return;
  $("plane-boss-hp-fill").style.width = (planeState.boss.hp / planeState.boss.maxHp * 100) + "%";
}

// The round is endless -- running out of lives is the only way it ends.
// Defeating a boss no longer stops the game (see handleBossDefeat); it's
// a milestone along the way to a higher score, not a finish line.
function endPlaneMode() {
  planeState.ended = true;
  planeState.paused = true;
  if (planeState.rafId) cancelAnimationFrame(planeState.rafId);
  $("plane-end-emoji").textContent = "💥";
  $("plane-end-title").textContent = "Game Over";
  $("plane-end-sub").textContent = `Score: ${planeState.score} · Best: ${PROGRESS.planeHighScore || 0}`;
  $("plane-end-overlay").classList.add("lost");
  $("plane-end-overlay").classList.remove("hidden");
}

// Toast used for the "Boss defeated!" milestone -- reuses Drive Mode's
// .drive-toast positioning/animation but with its own (positive-feeling)
// color, appended to #plane-world instead of #drive-world.
function showPlaneToast(msg) {
  const world = $("plane-world");
  const toast = document.createElement("div");
  toast.className = "drive-toast plane-toast-good";
  toast.textContent = msg;
  world.appendChild(toast);
  setTimeout(() => toast.remove(), 1600);
}

// Boss defeated -- awards XP (same players/{id}/badges/mathville path as
// every chapter), then ramps difficulty for the NEXT wave: enemy density
// compounds another 20%, the question interval tightens a bit (floored),
// and the next boss appears further out. Regular spawning resumes
// immediately; the game keeps going until the player runs out of lives.
function handleBossDefeat() {
  spawnPlaneExplosion(planeState.boss.x, planeState.boss.y, true);
  planeState.boss.el.remove();
  planeState.boss = null;
  planeState.bossSpawned = false;
  planeState.bossesDefeated += 1;
  planeState.enemyDensityMult *= PLANE_ENEMY_DENSITY_BOSS_MULT;
  planeState.bossScoreThreshold += PLANE_BOSS_THRESHOLD_STEP;
  planeState.questionIntervalMs = Math.max(
    PLANE_QUESTION_INTERVAL_MIN_MS,
    PLANE_QUESTION_INTERVAL_MS - planeState.bossesDefeated * PLANE_QUESTION_INTERVAL_STEP_MS
  );
  $("plane-boss-hp").classList.add("hidden");
  saveChapterProgress("plane-mode", 3, PLANE_WIN_XP);
  showPlaneToast("Boss defeated! Onward 🚀");
  if (typeof confetti === "function") {
    confetti({ particleCount: 80, spread: 90, origin: { y: 0.3 } });
  }
}

// Correct answer clears the screen (all current enemies + enemy bullets)
// like a bomb, plus a score bonus -- the actual reason to want to get it
// right, not just a interruption. Reuses Drive Mode's own quick-MC
// generator (rollDriveQuestion/buildQuickMc) so question quality/variety
// matches the rest of the app instead of a separate bank.
// Mixed-subject question pools -- fetched once (lazily, fire-and-forget)
// from the other two games' own question banks, which live at sibling
// paths under the same hub origin. Only their plain "mc" (multiple-choice)
// questions are usable here; anything else (fill/match/flashcard/passage/
// line, or an mc with an image the compact plane overlay has no room for)
// is skipped. If the fetch hasn't finished (or failed) by the time a
// question is needed, rollPlaneQuestion() falls back to mathville mental
// math, so a slow network never blocks the game.
let planeSolarPool = null;
let planeLanguagePool = null;
async function ensurePlaneQuestionPools() {
  if (planeSolarPool && planeLanguagePool) return;
  try {
    const [solar, lang] = await Promise.all([
      fetch("../azkauniverse/questions.json").then(r => r.json()),
      fetch("../azkacraft/questions.json").then(r => r.json())
    ]);
    const solarPool = [];
    (solar.levels || []).forEach(lvl => (lvl.questions || []).forEach(q => {
      if (q.type === "mc" && !q.image) {
        solarPool.push({ prompt: q.question, options: q.options, correctLabel: q.options[q.answer] });
      }
    }));
    const langPool = [];
    (lang.chapters || []).forEach(ch => {
      // Reading Comprehension (6) mixes "passage" questions in with its
      // "mc" ones, and Creative Writing (7)'s mc prompts equally assume a
      // passage was just read ("According to the text...") even though
      // none of its questions are literally type "passage" -- so a check
      // for that type alone lets Creative Writing leak through. Exclude
      // both chapters by id explicitly instead, same fix already applied
      // to Focus Round's picker (see FOCUS_LANG_EXCLUDED_CHAPTER_IDS).
      if (ch.id === 6 || ch.id === 7) return;
      (ch.questions || []).forEach(q => {
        if (q.type === "mc") {
          langPool.push({ prompt: q.prompt, options: q.options, correctLabel: q.answer });
        }
      });
    });
    planeSolarPool = solarPool;
    planeLanguagePool = langPool;
  } catch (e) {
    // Offline or the other game's file changed shape -- fall back to
    // mathville-only questions rather than breaking the round.
    planeSolarPool = planeSolarPool || [];
    planeLanguagePool = planeLanguagePool || [];
  }
}

function pickFromPlanePool(pool) {
  if (!pool || !pool.length) return null;
  const q = pool[rand(0, pool.length - 1)];
  return { prompt: q.prompt, options: shuffle([...q.options]), correctLabel: q.correctLabel };
}

// 50% mathville (always "easy" difficulty -- every generator guarantees
// that tier is mental-math-only, no pencil-and-paper column arithmetic,
// since a fast-paced shmup is the wrong place to ask for one) / 25%
// SolarQuest science trivia / 25% Language & Arts. Falls back to
// mathville mental math if a pool isn't ready yet.
function rollPlaneQuestion() {
  const r = Math.random();
  if (r < 0.5) return buildQuickMc(rollDriveQuestion("easy"));
  const pool = r < 0.75 ? planeSolarPool : planeLanguagePool;
  return pickFromPlanePool(pool) || buildQuickMc(rollDriveQuestion("easy"));
}

/* =================================================================
   FOCUS ROUND -- pick up to 8 topics across mathville + azkacraft +
   azkauniverse (mirrors brain-box's "Box" picker), play one 20-question
   round mixing just those topics. Reuses the existing #screen-question
   rendering (renderStep/goToNextStep/finishRound/showReward) unchanged --
   a Focus Round is just state.steps built from multiple sources instead
   of buildRound(one chapterId), same trick as Plane Mode's synthetic
   "plane-mode" chapterId for progress/XP.
   ================================================================= */
const FOCUS_ROUND_SIZE = 20;
// Reading Comprehension (6) and Creative Writing (7) both ask "According
// to the text/passage..." -- unanswerable without the passage, which this
// picker has no room to show. Plane Mode's cross-game pool excludes the
// same two chapter ids for the same reason (see ensurePlaneQuestionPools).
const FOCUS_LANG_EXCLUDED_CHAPTER_IDS = [6, 7];

// Converts one azkacraft/azkauniverse question into mathville's generic
// step shape ({uiType, prompt, ...}), or returns null to skip it
// (flashcard has no question/answer to test with; anything with an
// unrecognized type is skipped rather than guessed at). "mc" was the
// only type Focus Round used to draw from -- match(/"line", which is
// azkauniverse's own name for the same drag-pairing UI) is also safe to
// reuse as-is since mathville's renderStep() already knows how to
// render "match" generically, regardless of which game the data came
// from. "fill" is NOT mapped to mathville's "typein" uiType, on
// purpose -- that screen's keypad is numeric-only (digits, comma,
// times, space), built for math answers, with no letter keys at all.
// A text answer like "often" or "main sequence" would be untypeable.
// Fill questions come back tagged _fill instead and get converted to
// multiple-choice afterward, once all of a chapter/level's fill answers
// are known (see focusConvertFillToMc below) so real wrong-answer
// options can be drawn from sibling questions.
function focusNormalizeQuestion(q, source) {
  if (q.type === "mc") {
    if (source === "sci" && q.image) return null; // no room to show the diagram here
    return source === "sci"
      ? { uiType: "mc", prompt: q.question, options: [...q.options], correctLabel: q.options[q.answer] }
      : { uiType: "mc", prompt: q.prompt, options: [...q.options], correctLabel: q.answer };
  }
  if (q.type === "fill") {
    const prompt = source === "sci" ? q.question : q.prompt;
    const answer = String(q.answer).trim();
    if (!prompt || !answer) return null;
    return { _fill: true, prompt, answer };
  }
  if (q.type === "match" || q.type === "line") {
    // azkacraft's pairs are already {left,right}; azkauniverse's "match"/
    // "line" types use {term,match} instead -- same shape, different keys.
    const pairs = (q.pairs || []).map(p => "left" in p ? p : { left: p.term, right: p.match });
    if (pairs.length < 2) return null;
    return { uiType: "match", pairs };
  }
  return null; // flashcard, passage, etc -- not a testable question
}

// Turns every {_fill, prompt, answer} item in `items` into a real mc
// step, drawing wrong-answer options from OTHER fill answers in the
// same list (same chapter/level, so distractors are at least
// topically related instead of random). Needs at least 3 siblings to
// build a 4-option question -- fill items in a list too short for that
// are dropped rather than shipped with too few/no wrong options.
function focusConvertFillToMc(items) {
  const fillAnswers = items.filter(it => it._fill).map(it => it.answer);
  return items.map(it => {
    if (!it._fill) return it;
    const distractorPool = [...new Set(fillAnswers.filter(a => a !== it.answer))];
    if (distractorPool.length < 3) return null;
    const options = shuffle([it.answer, ...shuffle(distractorPool).slice(0, 3)]);
    return { uiType: "mc", prompt: it.prompt, options, correctLabel: it.answer };
  }).filter(Boolean);
}

let focusLangPool = null;  // { [chapterId]: [{uiType,...}] }
let focusSciPool = null;   // { [levelId]: [...] }
async function ensureFocusPools() {
  if (focusLangPool && focusSciPool) return;
  try {
    const [lang, sci] = await Promise.all([
      fetch("../azkacraft/questions.json").then(r => r.json()),
      fetch("../azkauniverse/questions.json").then(r => r.json())
    ]);
    focusLangPool = {};
    (lang.chapters || []).forEach(ch => {
      if (FOCUS_LANG_EXCLUDED_CHAPTER_IDS.includes(ch.id)) return;
      const items = (ch.questions || []).map(q => focusNormalizeQuestion(q, "lang")).filter(Boolean);
      focusLangPool[ch.id] = focusConvertFillToMc(items);
    });
    focusSciPool = {};
    (sci.levels || []).forEach(lvl => {
      const items = (lvl.questions || []).map(q => focusNormalizeQuestion(q, "sci")).filter(Boolean);
      focusSciPool[lvl.id] = focusConvertFillToMc(items);
    });
  } catch (e) {
    // Offline or the other games' file shape changed -- whatever topics
    // did resolve still work; unresolved ones just contribute nothing.
    focusLangPool = focusLangPool || {};
    focusSciPool = focusSciPool || {};
  }
}

// azkacraft's topicStats are keyed by a broad subject label (see its
// questions.json's per-chapter "topic" field), not by chapter id --
// chapters 3/4/5 (Prefixes & Suffixes / Contractions / Capitalization)
// all share "Grammar". So weighting for language topics is coarser than
// math/science (which key 1:1 by chapter id / level id) -- an accurate
// reflection of what data actually exists, not a bug.
const FOCUS_LANG_TOPIC_LABELS = { 1: "Spelling", 2: "Vocabulary", 3: "Grammar", 4: "Grammar", 5: "Grammar" };

// Mastery-based weighting, same spirit as Math Race's weightedRand()
// (weight = 1 + wrong*k, backing off once mastered) but at topic
// granularity since that's what topicStats tracks outside Math Race's
// own per-value stats. A topic with no attempts yet gets a neutral
// weight (2) rather than being over- or under-represented purely
// because it's new.
function focusTopicWeight(t, topicStats) {
  let stats;
  if (t.source === "math") stats = topicStats.mathville && topicStats.mathville[t.id];
  else if (t.source === "lang") stats = topicStats["language-arts"] && topicStats["language-arts"][FOCUS_LANG_TOPIC_LABELS[t.id]];
  else stats = topicStats.solarquest && topicStats.solarquest[t.id];
  const correct = (stats && stats.correct) || 0;
  const wrong = (stats && stats.wrong) || 0;
  const total = correct + wrong;
  if (total === 0) return 2;
  const accuracy = correct / total;
  return Math.max(1, 1 + (1 - accuracy) * 3); // 100% accuracy -> floor of 1, 0% -> 4
}

// `selected` is [{source: "math"|"lang"|"sci", id}]. Math topics reuse
// buildRound(chapterId) (called twice per chapter for more variety --
// most generators return a fresh random question each call) so every
// uiType mathville itself supports, including "match", can show up in a
// Focus Round exactly like it would in that chapter's normal round.
async function buildFocusRoundSteps(selected) {
  await ensureFocusPools();

  let topicStats = {};
  try {
    const snap = await aigDb.ref(`players/${CHILD_ID}/topicStats`).get();
    topicStats = snap.exists() ? snap.val() : {};
  } catch (e) { /* offline -- every topic just falls back to neutral weight below */ }

  const pools = {};
  selected.forEach(t => {
    const key = `${t.source}:${t.id}`;
    let items;
    if (t.source === "math") items = [...buildRound(t.id), ...buildRound(t.id)];
    else if (t.source === "lang") items = [...(focusLangPool[t.id] || [])];
    else items = [...(focusSciPool[t.id] || [])];
    if (items.length) pools[key] = shuffle(items);
  });
  const weighted = selected
    .map(t => ({ key: `${t.source}:${t.id}`, weight: focusTopicWeight(t, topicStats) }))
    .filter(t => pools[t.key]); // drop topics that resolved zero questions (e.g. offline) rather than let them stall the draw below
  if (!weighted.length) return [];

  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  function pickTopicKey() {
    let r = Math.random() * totalWeight;
    for (const t of weighted) {
      r -= t.weight;
      if (r <= 0) return t.key;
    }
    return weighted[weighted.length - 1].key;
  }

  // Cursor per topic cycles through that topic's own shuffled pool
  // (wrapping around) rather than resampling randomly each time, so a
  // thin pool repeats evenly instead of clustering the same question.
  const cursors = {};
  const steps = [];
  for (let i = 0; i < FOCUS_ROUND_SIZE; i++) {
    const key = pickTopicKey();
    const pool = pools[key];
    const idx = (cursors[key] || 0) % pool.length;
    cursors[key] = idx + 1;
    steps.push(pool[idx]);
  }
  return steps;
}

// No topbar icon triggers this from inside MathVille itself anymore --
// Focus Round has its own hub card + URL (focus-round/index.html) that
// deep-links in via ?focus=1, so window.openFocusRoundPicker() below is
// the only entry point now.
(function setupFocusRoundPicker() {
  const overlay = $("focus-round-overlay");
  const list = overlay && overlay.querySelector(".focus-round-list");
  const countEl = overlay && overlay.querySelector(".focus-round-picked-count");
  const pillsEl = overlay && overlay.querySelector(".focus-round-picked-pills");
  const startBtn = overlay && overlay.querySelector(".focus-round-start");
  const cancelBtn = overlay && overlay.querySelector(".focus-round-cancel");
  if (!overlay) return;

  const pillClassFor = item => item.classList.contains("focus-round-item-math") ? "focus-round-pill-math"
    : item.classList.contains("focus-round-item-lang") ? "focus-round-pill-lang" : "focus-round-pill-sci";

  // Picking a topic MOVES it out of the grid into the pinned box (not
  // just highlights it in place) -- clicking a pill's "x" moves it back.
  function render() {
    const items = Array.from(list.querySelectorAll(".focus-round-item"));
    const checked = items.filter(item => item.querySelector("input").checked);
    items.forEach(item => item.classList.toggle("focus-round-item-hidden", item.querySelector("input").checked));
    countEl.textContent = `${checked.length} / 8 topics picked`;
    pillsEl.innerHTML = checked.map(item => {
      const emoji = item.querySelector(".focus-round-emoji").textContent;
      const name = item.querySelector(".focus-round-name").textContent;
      return `<span class="focus-round-pill ${pillClassFor(item)}">${emoji} ${name}<button type="button" class="focus-round-pill-x" data-name="${name}">✕</button></span>`;
    }).join("");
    startBtn.disabled = checked.length === 0;
    startBtn.textContent = checked.length === 0 ? "Pick at least 1 topic" : "Start Focus Round · 20 questions";
  }
  list.addEventListener("change", e => {
    const checkedCount = list.querySelectorAll(".focus-round-item input:checked").length;
    if (checkedCount > 8) { e.target.checked = false; return; }
    render();
    list.scrollTo({ top: 0, behavior: "smooth" });
  });
  pillsEl.addEventListener("click", e => {
    const btn = e.target.closest(".focus-round-pill-x");
    if (!btn) return;
    const item = Array.from(list.querySelectorAll(".focus-round-item"))
      .find(it => it.querySelector(".focus-round-name").textContent === btn.dataset.name);
    if (item) { item.querySelector("input").checked = false; render(); }
  });

  // Pre-check whatever a parent assigned from /parents (players/{id}/
  // assignedTopics) the first time the picker opens each page load --
  // only if nothing's checked yet, so re-opening after manually picking
  // something doesn't stomp on that choice.
  let assignedApplied = false;
  async function applyAssignedTopics() {
    if (assignedApplied) return;
    assignedApplied = true;
    try {
      const snap = await aigDb.ref(`players/${CHILD_ID}/assignedTopics`).get();
      const assigned = snap.exists() ? snap.val() : [];
      if (!assigned.length) return;
      const alreadyChecked = list.querySelectorAll(".focus-round-item input:checked").length;
      if (alreadyChecked > 0) return;
      list.querySelectorAll(".focus-round-item").forEach(item => {
        if (assigned.includes(item.dataset.topic)) item.querySelector("input").checked = true;
      });
      render();
    } catch (e) { /* offline or no assignment yet -- picker just starts empty */ }
  }

  window.openFocusRoundPicker = () => { overlay.classList.remove("hidden"); applyAssignedTopics(); };
  cancelBtn.addEventListener("click", () => overlay.classList.add("hidden"));
  startBtn.addEventListener("click", async () => {
    const checked = Array.from(list.querySelectorAll(".focus-round-item input:checked"));
    if (!checked.length) return;
    const selected = checked.map(inp => {
      const [source, id] = inp.closest(".focus-round-item").dataset.topic.split(":");
      return { source, id: source === "lang" ? Number(id) : id };
    });
    const originalLabel = startBtn.textContent;
    startBtn.disabled = true;
    startBtn.textContent = "Building your round…";
    const steps = await buildFocusRoundSteps(selected);
    startBtn.disabled = false;
    startBtn.textContent = originalLabel;
    if (!steps.length) return; // offline + nothing cached yet -- stay on the picker rather than entering an empty round
    overlay.classList.add("hidden");
    state.mode = "solo";
    state.chapterId = "focus-round";
    state.stepIndex = 0;
    state.mistakes = 0;
    state.lastWrong = null;
    state.steps = steps;
    renderStep();
  });

  render();
})();

function showPlaneQuestion() {
  planeState.paused = true;
  const step = rollPlaneQuestion();

  $("plane-question-prompt").textContent = step.prompt;
  const grid = $("plane-question-options");
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
      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "plane-mode", isCorrect);
      if (isCorrect) {
        // Bomb reward: wipe every enemy and enemy bullet on screen right now.
        planeState.enemies.forEach(e => { spawnPlaneExplosion(e.x, e.y); e.el.remove(); });
        planeState.enemyBullets.forEach(b => b.el.remove());
        planeState.enemies = [];
        planeState.enemyBullets = [];
        planeState.score += 3;
        updatePlaneScore();
        shakePlaneWorld();
        // Regular enemies get wiped outright above -- the boss isn't in
        // that array, so without this a correct answer during a boss
        // fight would do nothing to it at all. Chips its HP instead of a
        // full wipe (it's meant to survive several hits).
        if (planeState.boss) {
          spawnPlaneExplosion(planeState.boss.x, planeState.boss.y);
          planeState.boss.hp -= PLANE_BOSS_QUESTION_DAMAGE;
          updatePlaneBossHp();
          if (planeState.boss.hp <= 0) handleBossDefeat();
        }
      }
      setTimeout(() => {
        $("plane-question-overlay").classList.add("hidden");
        planeState.lastQuestionAt = performance.now();
        if (planeState && !planeState.ended) planeState.paused = false;
      }, 900);
    });
    grid.appendChild(btn);
  });
  $("plane-question-overlay").classList.remove("hidden");
}

function startPlaneLoop() {
  let lastSpawnAt = performance.now();

  function frame(now) {
    if (!planeState || planeState.ended) return;
    if (!planeState.paused) {
      // Wave difficulty -- ramps with elapsed flight time, each side capped.
      const level = Math.floor((now - planeState.startTime) / PLANE_DIFFICULTY_RAMP_MS);
      const effSpawnInterval = Math.max(PLANE_MIN_SPAWN_INTERVAL_MS, (PLANE_ENEMY_SPAWN_INTERVAL_MS - level * PLANE_SPAWN_INTERVAL_STEP_MS) / planeState.enemyDensityMult);
      const effEnemySpeed = Math.min(PLANE_MAX_ENEMY_SPEED, PLANE_ENEMY_SPEED + level * PLANE_ENEMY_SPEED_STEP);

      // Ship movement, clamped inside the world (with a small margin).
      planeState.x = Math.max(6, Math.min(94, planeState.x + planeJoyVec.x * PLANE_SHIP_SPEED));
      planeState.y = Math.max(8, Math.min(94, planeState.y + planeJoyVec.y * PLANE_SHIP_SPEED));
      $("plane-ship").style.left = planeState.x + "%";
      $("plane-ship").style.top = planeState.y + "%";

      // Auto-fire -- rapid-fire power-up halves the interval while active.
      const fireInterval = now < planeState.rapidUntil ? PLANE_RAPID_FIRE_INTERVAL_MS : PLANE_FIRE_INTERVAL_MS;
      if (now - planeState.lastFireAt > fireInterval) {
        planeState.lastFireAt = now;
        spawnPlaneBullet();
      }
      updatePlaneBuffHud();

      // Wingmen power-up -- 2 escort ships that track the main ship's
      // position (offset left/right) and fire on the same base interval
      // as the player (not affected by rapid-fire, to keep this simple).
      if (now < planeState.wingmenUntil) {
        planeState.wingmen.forEach(w => {
          const wx = Math.max(4, Math.min(96, planeState.x + w.offsetX));
          const wy = planeState.y + 6;
          w.el.style.left = wx + "%";
          w.el.style.top = wy + "%";
          if (now - w.lastFireAt > PLANE_FIRE_INTERVAL_MS) {
            w.lastFireAt = now;
            spawnPlaneBulletAt(wx, wy - 4, 0);
          }
        });
      } else if (planeState.wingmen.length) {
        removePlaneWingmen();
      }

      // Enemy spawn -- stops once the boss threshold is reached, so the
      // boss fight isn't cluttered with regular waves in the background.
      if (!planeState.bossSpawned && now - lastSpawnAt > effSpawnInterval) {
        lastSpawnAt = now;
        spawnPlaneEnemy();
      }
      if (!planeState.bossSpawned && !planeState.boss && planeState.score >= planeState.bossScoreThreshold) {
        spawnPlaneBoss();
      }

      // Periodic math question -- the actual reason this is a learning
      // game and not just a shooter. Pauses the loop; showPlaneQuestion()
      // itself resets lastQuestionAt and un-pauses once answered. Must
      // still fall through to the rAF reschedule at the bottom of frame()
      // -- returning early here would stop the loop for good, since
      // nothing else re-arms it once paused.
      if (now - planeState.lastQuestionAt > planeState.questionIntervalMs) {
        showPlaneQuestion();
      }

      // Enemies fire back, each on its own staggered timer.
      for (const enemy of planeState.enemies) {
        if (now > enemy.nextFireAt) {
          spawnPlaneEnemyBullet(enemy);
          enemy.nextFireAt = now + rand(PLANE_ENEMY_FIRE_MIN_MS, PLANE_ENEMY_FIRE_MAX_MS);
        }
      }

      // Boss: either bounces side to side or (the 🦑 type) sweeps a
      // figure-8, and fires on its own, faster timer. Reuses
      // spawnPlaneEnemyBullet -- it only reads .x/.y off whatever object
      // it's given.
      if (planeState.boss) {
        const boss = planeState.boss;
        boss.t += 1;
        if (boss.type.moveStyle === "figure8") {
          boss.x = 50 + Math.sin(boss.t / 40) * 32;
          boss.y = 18 + Math.sin(boss.t / 20) * 6;
        } else {
          boss.x += PLANE_BOSS_SPEED * boss.type.speedMult * boss.dir;
          if (boss.x > 85 || boss.x < 15) boss.dir *= -1;
        }
        boss.el.style.left = boss.x + "%";
        boss.el.style.top = boss.y + "%";
        if (now > boss.nextFireAt) {
          spawnPlaneEnemyBullet(boss, 12); // still a boss, so a better shot than regular enemies
          boss.nextFireAt = now + rand(PLANE_BOSS_FIRE_MIN_MS, PLANE_BOSS_FIRE_MAX_MS) * boss.type.fireMult;
        }
      }

      // Move player bullets along their own vx/vy (straight up by default,
      // angled for spread-shot pellets -- see spawnPlaneBulletAt), drop
      // off-screen ones on any edge now that they aren't all purely vertical.
      planeState.bullets = planeState.bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.y < -5 || b.x < -6 || b.x > 106) { b.el.remove(); return false; }
        b.el.style.left = b.x + "%";
        b.el.style.top = b.y + "%";
        return true;
      });

      // Move enemy bullets along their aimed direction, drop off-screen ones
      // (any edge now, not just the bottom, since they're no longer purely
      // vertical).
      planeState.enemyBullets = planeState.enemyBullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.y > 106 || b.y < -6 || b.x < -6 || b.x > 106) { b.el.remove(); return false; }
        b.el.style.left = b.x + "%";
        b.el.style.top = b.y + "%";
        return true;
      });

      // Move enemies down (their shared descent speed) or, once one has
      // flown well past the ship, sometimes back UP instead (a genuine
      // attack from behind, not just a formality -- see
      // PLANE_ENEMY_REVERSE_CHANCE's comment) -- plus a per-type
      // horizontal wobble/drift/dart so they don't all fly in a single
      // dead-straight lane.
      planeState.enemies = planeState.enemies.filter(e => {
        if (!e.reverseRolled && e.y > planeState.y + PLANE_ENEMY_REVERSE_MARGIN) {
          e.reverseRolled = true;
          if (Math.random() < PLANE_ENEMY_REVERSE_CHANCE) e.reversed = true;
        }
        e.y += effEnemySpeed * (e.reversed ? -1 : 1);
        if (e.type.moveStyle === "sine") {
          e.x += Math.sin(now / 300 + e.phase) * 0.35;
        } else if (e.type.moveStyle === "drift") {
          e.x += Math.sign(planeState.x - e.x) * 0.12;
        } else if (e.type.moveStyle === "zigzag") {
          e.x += (Math.random() - 0.5) * 1.4;
        }
        e.x = Math.max(4, Math.min(96, e.x));
        if (e.y > 106 || e.y < -8) { e.el.remove(); return false; }
        e.el.style.left = e.x + "%";
        e.el.style.top = e.y + "%";
        return true;
      });

      // Move power-ups down, drop off-screen ones.
      planeState.powerups = planeState.powerups.filter(p => {
        p.y += PLANE_POWERUP_FALL_SPEED;
        if (p.y > 106) { p.el.remove(); return false; }
        p.el.style.left = p.x + "%";
        p.el.style.top = p.y + "%";
        return true;
      });

      // Player bullet vs enemy -- regular kills have a flat chance to drop
      // a power-up.
      for (const enemy of planeState.enemies.slice()) {
        for (const bullet of planeState.bullets.slice()) {
          if (planePxDist(enemy.x, enemy.y, bullet.x, bullet.y) < PLANE_HIT_RADIUS_PX) {
            spawnPlaneExplosion(enemy.x, enemy.y);
            if (Math.random() < PLANE_POWERUP_DROP_CHANCE) spawnPlanePowerup(enemy.x, enemy.y);
            enemy.el.remove();
            bullet.el.remove();
            planeState.enemies = planeState.enemies.filter(e => e !== enemy);
            planeState.bullets = planeState.bullets.filter(b => b !== bullet);
            planeState.score += 1;
            updatePlaneScore();
            break;
          }
        }
      }

      // Player bullet vs boss -- chips its HP down instead of a 1-hit kill;
      // reaching 0 defeats it (doesn't end the round -- see handleBossDefeat).
      if (planeState.boss) {
        for (const bullet of planeState.bullets.slice()) {
          if (planePxDist(planeState.boss.x, planeState.boss.y, bullet.x, bullet.y) < PLANE_HIT_RADIUS_PX * 1.4) {
            bullet.el.remove();
            planeState.bullets = planeState.bullets.filter(b => b !== bullet);
            spawnPlaneExplosion(bullet.x, bullet.y);
            planeState.boss.hp -= 1;
            updatePlaneBossHp();
            if (planeState.boss.hp <= 0) {
              handleBossDefeat();
              break;
            }
            break;
          }
        }
      }

      // Ship vs power-up -- collect and apply the buff.
      for (const p of planeState.powerups.slice()) {
        if (planePxDist(p.x, p.y, planeState.x, planeState.y) < PLANE_HIT_RADIUS_PX) {
          p.el.remove();
          planeState.powerups = planeState.powerups.filter(pu => pu !== p);
          applyPlanePowerup(p.type);
          updatePlaneBuffHud();
        }
      }

      // Enemy bullet vs ship.
      for (const bullet of planeState.enemyBullets.slice()) {
        if (planePxDist(bullet.x, bullet.y, planeState.x, planeState.y) < PLANE_HIT_RADIUS_PX) {
          bullet.el.remove();
          planeState.enemyBullets = planeState.enemyBullets.filter(b => b !== bullet);
          planeTakeHit();
          if (planeState.ended) return;
        }
      }

      // Ship vs enemy body -- kamikaze: enemy is destroyed too, ship takes a hit.
      for (const enemy of planeState.enemies.slice()) {
        if (planePxDist(enemy.x, enemy.y, planeState.x, planeState.y) < PLANE_HIT_RADIUS_PX) {
          spawnPlaneExplosion(enemy.x, enemy.y);
          enemy.el.remove();
          planeState.enemies = planeState.enemies.filter(e => e !== enemy);
          planeTakeHit();
          if (planeState.ended) return;
        }
      }

      // Ship vs boss body -- just hurts the ship, boss only takes damage
      // from being shot (contact alone shouldn't end an 8-hit fight early).
      if (planeState.boss && planePxDist(planeState.boss.x, planeState.boss.y, planeState.x, planeState.y) < PLANE_HIT_RADIUS_PX * 1.4) {
        planeTakeHit();
        if (planeState.ended) return;
      }
    }
    planeState.rafId = requestAnimationFrame(frame);
  }
  planeState.rafId = requestAnimationFrame(frame);
}

$("plane-end-replay").addEventListener("click", () => launchPlaneMode());

// Deep link from the hub's landing-page roaming car (?drive=1) — jump
// straight into Drive Mode instead of the Solo/Multiplayer picker.
if (new URLSearchParams(location.search).get("drive") === "1") {
  state.mode = "solo";
  launchDriveMode();
}

// Deep link from focus-round/index.html's redirect (?focus=1) -- open
// the picker directly. It's a position:fixed overlay outside every
// .screen (same as the vehicle picker), so it's safe to show regardless
// of whatever screen is behind it, same as the ?drive=1 case above.
if (new URLSearchParams(location.search).get("focus") === "1") {
  window.openFocusRoundPicker();
}

// Analog joystick: drag anywhere inside (pointer capture lets the finger
// wander outside the circle without losing the drag), knob position is
// clamped to JOY_MAX px from center and read as a -1..1 vector each frame.
// Shared by both sticks (left = steer, right = aim the water gun) --
// `setVec` is however the caller wants to store the resulting vector.
const JOY_MAX = 28; // matches the smaller 92px joystick track
function setupAnalogStick(joyId, knobId, setVec, maxRadius = JOY_MAX) {
  const joy = $(joyId);
  const knob = $(knobId);
  if (!joy || !knob) return;
  let activeId = null;

  function updateFromEvent(e) {
    const rect = joy.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped, ky = Math.sin(angle) * clamped;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    setVec({ x: kx / maxRadius, y: ky / maxRadius });
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
// Plane Mode's stick is drawn 32% bigger (+20% then another +10%, see
// #plane-joystick in style.css) -- its drag radius needs to grow to
// match, or the knob would hit its visual edge well before reaching
// "full deflection".
setupAnalogStick("plane-joystick", "plane-joystick-knob", v => { planeJoyVec = v; }, JOY_MAX * 1.32);

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

// MOCKUP ONLY — tap Bo in the car to open the placeholder chat, mirrors
// the hub landing page's Bo avatar. Not wired to the real AI yet. The
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
// Real chat with Bo (api/bo-chat.js) -- tap the car to open. Each open
// starts a fresh thread with one of Bo's rotating prompts as the opener.
(function setupDriveBoChat() {
  const car = $("drive-car");
  const chat = $("drive-bo-chat");
  const hint = $("drive-bo-hint");
  const closeBtn = $("drive-bo-chat-close");
  const thread = $("drive-bo-chat-thread");
  const loading = $("drive-bo-chat-loading");
  const form = $("drive-bo-chat-form");
  const input = $("drive-bo-chat-input");
  if (!car || !chat) return;

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
      const res = await fetch("/api/bo-chat", {
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

  // Shared opener -- also used by the persistent #game-bo widget on the
  // question screen (setupGameBoChat below), so both entry points open
  // the exact same panel/thread instead of maintaining two copies.
  window.openBoChat = () => {
    chat.hidden = false;
    if (hint) hint.style.display = "none";
    thread.innerHTML = "";
    history = [];
    appendMsg("Bo here! " + BO_CHAT_PROMPTS[Math.floor(Math.random() * BO_CHAT_PROMPTS.length)], "bo");
    setTimeout(() => input.focus(), 50);
  };

  car.addEventListener("click", () => window.openBoChat());
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

// Persistent Bo widget on the question screen (#screen-question) -- unlike
// the Drive Mode car, this screen otherwise has no Bo at all, unlike
// azkacraft where Bo is visible on every question screen. Opens the same
// shared #drive-bo-chat panel via window.openBoChat() (set up above).
(function setupGameBoChat() {
  const bo = $("game-bo");
  if (!bo || !window.openBoChat) return;
  bo.addEventListener("click", () => window.openBoChat());
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
    // Reject "0" (no place-value question asks about a zero digit) AND
    // reject any digit that repeats elsewhere in the number -- e.g.
    // asking "which place is the 7 in 9,793,708" is ambiguous since 7
    // shows up twice, so a kid pointing at either spot is defensibly right.
  } while (digit === "0" || numStr.indexOf(digit) !== numStr.lastIndexOf(digit));
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
// The leaderboard call is wrapped in try/catch on purpose -- it hits
// Firebase synchronously (aigDb.ref(...).transaction(...)), and on a flaky
// real-device connection that call (or Firebase init itself) can throw
// before the SDK's own async error handling kicks in. Without the guard,
// that throw would abort this whole function and the setTimeout below
// would never get scheduled -- the round silently freezes on the current
// question forever, with no error visible to the player. Advancing to the
// next question must never depend on analytics succeeding.
function submitAnswer(isCorrect, prompt, answerForHint) {
  try {
    if (window.AIGLeaderboard && state.chapterId) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, isCorrect);
  } catch (e) { /* never let analytics block the round */ }
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
  // "," and "×" so multi-number answers (e.g. "list all the factors of
  // 30") and multiplication facts aren't stuck typing everything as one
  // run of digits separated only by a space -- kids reach for a comma or
  // times sign there naturally. Grading (extractNumbers) already ignores
  // whatever separator is used, so this is purely a legibility fix.
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "space", "0", "back", ",", "×"];
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
            // Same guard as submitAnswer() -- a synchronous Firebase throw
            // here must never stop connections.length from being checked
            // below, or the round freezes on the last match forever.
            try { if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, true); } catch (e) {}
            if (connections.length === pairs.length) {
              state.mistakes += matchMistakes;
              setTimeout(goToNextStep, 500);
            }
          } else {
            matchMistakes++;
            state.lastWrong = { prompt: `Match: ${pairs[from].left}`, answer: pairs[from].right };
            try { if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", state.chapterId, false); } catch (e) {}
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

// Keeps growing across follow-ups within one reward screen so each new
// AI reply has the full back-and-forth for context. Reset on every
// loadAiHint() call (i.e. every fresh reward screen).
let aiHintHistory = [];
let aiHintMissed = null;

// Rotating congrats openers for a mistake-free round -- mirrors the
// BO_CHAT_PROMPTS rotation pattern used by Bo's other chat entry points,
// no AI call needed since there's nothing to explain.
const BO_CONGRATS_MESSAGES = [
  "Wow, a perfect round! You crushed every question.",
  "Amazing work! Not a single mistake in there.",
  "You nailed it! Want to chat about anything else?",
  "Three stars, zero misses -- awesome job!",
  "That was flawless! I'm impressed.",
  "Perfect score! You really know this stuff."
];

// Bo is now always shown on the reward screen (explains a miss if there
// was one, congratulates on a perfect round otherwise), collapsed to a
// single message until tapped -- setupAiHintCardOpen() below expands it
// into the full chat (follow-up chips + free text input) on click.
async function loadAiHint() {
  const card = $("ai-hint-card"), loading = $("ai-hint-loading"), thread = $("ai-hint-thread");
  const followups = $("ai-hint-followups"), form = $("ai-hint-form");
  aiHintMissed = state.lastWrong;
  aiHintHistory = [];
  thread.innerHTML = "";
  followups.classList.add("hidden");
  form.classList.add("hidden");
  card.classList.remove("hidden");
  card.classList.remove("chat-open");

  if (!aiHintMissed) {
    appendAiHintMessage(BO_CONGRATS_MESSAGES[Math.floor(Math.random() * BO_CONGRATS_MESSAGES.length)], "ai");
    return;
  }

  loading.classList.remove("hidden");

  // Best-effort personalization -- if this fails or there's no history
  // yet for this topic, the hint just skips that context entirely.
  let topicStats = null;
  try {
    if (window.AIGLeaderboard) topicStats = await AIGLeaderboard.getTopicStats("mathville", state.chapterId);
  } catch (e) { /* no topicStats context, hint still works without it */ }

  try {
    const data = await callAiHint({
      studentName: CHILD_NAME,
      gameLabel: "MathVille",
      question: aiHintMissed.prompt,
      correctAnswer: aiHintMissed.answer,
      kidAnswer: null,
      topic: state.chapterId,
      topicStats
    });
    appendAiHintMessage(data.hint, "ai");
    aiHintHistory.push({ role: "assistant", content: data.hint });
  } catch (e) {
    // Still never blocks the reward screen -- Bo just gives a generic
    // friendly line instead of the personalized miss explanation.
    appendAiHintMessage("Nice try on that one! Tap me if you want to chat about it.", "ai");
  } finally {
    loading.classList.add("hidden");
  }
}

// Wired once (not per showReward() call) so the collapsed-message ->
// full-chat expansion listener never stacks duplicates across rounds.
(function setupAiHintCardOpen() {
  const card = $("ai-hint-card");
  if (!card) return;
  function openChat() {
    if (card.classList.contains("chat-open")) return;
    card.classList.add("chat-open");
    // The quick-reply chips ("Another example" etc) only make sense when
    // Bo was explaining a missed question -- on a perfect round there's
    // nothing for them to refer to, so just the free-text input shows.
    if (aiHintMissed) $("ai-hint-followups").classList.remove("hidden");
    $("ai-hint-form").classList.remove("hidden");
    setTimeout(() => $("ai-hint-input").focus(), 50);
  }
  card.addEventListener("click", openChat);
  // Only react when the card itself is focused, not a descendant input/
  // button -- otherwise Space would get eaten while typing in the chat.
  card.addEventListener("keydown", e => {
    if (e.target !== card) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(); }
  });
})();

function appendAiHintMessage(text, from) {
  const thread = $("ai-hint-thread");
  const div = document.createElement("div");
  div.className = "ai-hint-msg ai-hint-msg-" + from;
  if (from === "ai") {
    // Bo's little avatar next to each of his own messages -- the kid's
    // own messages don't need one, same convention as any chat UI.
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

async function callAiHint(body) {
  const res = await fetch("/api/generate-hint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || !data.hint) throw new Error(data.error || "no hint");
  return data;
}

async function sendAiHintFollowUp(text) {
  if (!text || !text.trim() || !aiHintMissed) return;
  const loading = $("ai-hint-loading"), followups = $("ai-hint-followups"), input = $("ai-hint-input");
  appendAiHintMessage(text, "kid");
  const historyBeforeThisTurn = aiHintHistory.slice();
  aiHintHistory.push({ role: "user", content: text });
  input.value = "";
  loading.classList.remove("hidden");
  followups.classList.add("hidden");
  try {
    const data = await callAiHint({
      studentName: CHILD_NAME,
      gameLabel: "MathVille",
      question: aiHintMissed.prompt,
      correctAnswer: aiHintMissed.answer,
      kidAnswer: null,
      topic: state.chapterId,
      history: historyBeforeThisTurn,
      followUp: text
    });
    appendAiHintMessage(data.hint, "ai");
    aiHintHistory.push({ role: "assistant", content: data.hint });
  } catch (e) {
    appendAiHintMessage("Hmm, I'm having trouble thinking right now. Try again in a bit!", "ai");
  } finally {
    loading.classList.add("hidden");
    followups.classList.remove("hidden");
  }
}

document.querySelectorAll(".ai-hint-chip").forEach(btn => {
  btn.addEventListener("click", () => sendAiHintFollowUp(btn.dataset.ask));
});
// Handles Enter directly on the input rather than relying on the
// browser's implicit "Enter submits the form" behavior -- on a real
// device, that implicit submit reached this form's default GET-to-self
// action instead of being caught here, reloading the whole page (which
// lands a returning signed-in player back on the map, not the reward
// screen). preventDefault()/stopPropagation() here run BEFORE that can
// happen. The submit listener stays too as a fallback (e.g. if a future
// change adds a real submit-type trigger some other way).
$("ai-hint-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    sendAiHintFollowUp($("ai-hint-input").value);
  }
});
$("ai-hint-form").addEventListener("submit", e => {
  e.preventDefault();
  sendAiHintFollowUp($("ai-hint-input").value);
});

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

/* =================================================================
   NINJA RUNNER (cross-subject runner mode, Sansu Ninja-inspired)
   -----------------------------------------------------------------
   Character auto-runs; each round shows 3 subject cards (Math/
   Language & Arts/Science), each independently randomized to Easy/
   Medium/Hard (so a round might be Hard+Hard+Medium, never fixed
   slots) -- kids pick by SUBJECT they want, not by difficulty. Picking
   a card pauses the run (character switches to a sword-guard idle,
   legs freeze, blade wiggles) and shows one MC question; a correct
   answer slices the question card itself in half diagonally, a wrong
   answer just flashes red and moves on (single attempt per question,
   keeps the round a fixed 20 questions long). Finishes with a score
   screen, then an optional Bo-led review of only the questions
   answered wrong, paginated one at a time.

   Question sourcing -- deliberately reuses existing infrastructure,
   no new banks:
   - Math: rollDriveQuestion(difficulty) + buildQuickMc(), same
     generator Drive Mode/Plane Mode use -- genuinely difficulty-aware.
   - Language & Arts / Science: ensurePlaneQuestionPools()'s existing
     cross-game pools (built for Plane Mode). ⚠️ Known simplification:
     those pools have no difficulty tags, so for these two subjects
     Easy/Medium/Hard only changes the POINT VALUE (10/25/50), not the
     actual question difficulty -- same pool regardless of tier picked.

   Entirely separate state from Drive Mode/Plane Mode -- no shared
   code beyond the question-pool helpers above and showScreen().
   ================================================================= */
const NINJA_TOTAL_Q = 20;
const NINJA_PTS = { easy: 10, medium: 25, hard: 50 };
const NINJA_DIFFS = ["easy", "medium", "hard"];
const NINJA_SUBJECTS = { math: "MATH", lang: "LANG & ARTS", sci: "SCIENCE" };
let ninjaState = null;

function launchNinjaRunner() {
  ensurePlaneQuestionPools();
  showScreen("screen-ninja");
  if (window.AIGBgm && AIGBgm.playPlaneTrack) AIGBgm.playPlaneTrack(); // reuse Plane Mode's energetic track (per explicit request instead of new/copyrighted music)
  if (ninjaState && ninjaState.laneTimer) clearTimeout(ninjaState.laneTimer); // a stale timer from a previous run must not fire into this fresh state
  ninjaState = { qnum: 1, score: 0, wrongLog: [], ended: false, laneTimer: null };
  $("ninja-finish-overlay").classList.add("hidden");
  $("ninja-review-overlay").classList.add("hidden");
  $("ninja-qnum").textContent = `Soal 1/${NINJA_TOTAL_Q}`;
  $("ninja-score").textContent = "⭐ 0";
  ninjaStartRunLane();
}

function ninjaSetGuard(on) {
  const runner = $("ninja-runner");
  runner.classList.toggle("guard", on);
  runner.classList.toggle("running", !on);
}

// One-shot jump hop -- player-triggered, and now actually DOES something:
// if a rock obstacle is currently on screen and hasn't been resolved yet,
// jumping dodges it (see ninjaResolveObstacle). Temporarily drops .running
// so the leg-swing animation doesn't fight the hop's translateY, restores
// it once the hop finishes.
function ninjaDoJump() {
  const runner = $("ninja-runner");
  if (runner.classList.contains("guard") || runner.classList.contains("jumping")) return;
  runner.classList.remove("running");
  runner.classList.add("jumping");
  setTimeout(() => {
    runner.classList.remove("jumping");
    runner.classList.add("running");
  }, 450);
  if (ninjaState && document.getElementById("ninja-obstacle-el")) {
    ninjaState.obstacleDodged = true;
  }
}

// Chrome-dino-style running beat between questions, now a real 2-stage
// encounter instead of a decorative fixed-length wait:
//   1. a rock obstacle approaches -- tap JUMP while it's on screen to dodge
//      it (ninjaDoJump sets obstacleDodged); resolved in ninjaResolveObstacle.
//   2. an enemy then approaches -- IT ACTUALLY REACHING the runner (not a
//      blind timer) is what triggers the subject-card picker, in
//      ninjaResolveEnemy.
// No fail state / doesn't block progress either way (this is a low-stakes
// runner, not a lives-based game) -- but jumping (or not) now visibly
// changes what happens, and the enemy encounter is the real trigger.
// Once the card picker/question is up there's no timer at all -- answering
// is untimed ("jawab berapa lama ya bebas").
const NINJA_OBSTACLE_MS = 1800;
const NINJA_ENEMY_MS = 1800;
function ninjaStartRunLane() {
  $("ninja-gates").classList.add("hidden");
  $("ninja-qcard").classList.add("hidden");
  $("ninja-bubbles").classList.add("hidden");
  ninjaSetGuard(false);
  ninjaState.obstacleDodged = false;
  $("ninja-hint").textContent = "Batu di depan! Tap JUMP buat lompatin 🪨";

  const lane = $("ninja-run-lane");
  lane.innerHTML = `<div class="ninja-obstacle" id="ninja-obstacle-el">🪨</div>`;
  lane.classList.remove("hidden");
  $("ninja-jump-btn").classList.remove("hidden");

  ninjaState.laneTimer = setTimeout(ninjaResolveObstacle, NINJA_OBSTACLE_MS);
}

function ninjaResolveObstacle() {
  const obstacle = document.getElementById("ninja-obstacle-el");
  if (obstacle) {
    obstacle.classList.add(ninjaState.obstacleDodged ? "dodged" : "bumped");
    setTimeout(() => obstacle.remove(), 350);
  }
  $("ninja-hint").textContent = "Musuh mendekat! Bersiap jawab soal 👹";
  const enemy = document.createElement("div");
  enemy.className = "ninja-enemy";
  enemy.textContent = "👹";
  $("ninja-run-lane").appendChild(enemy);
  ninjaState.laneTimer = setTimeout(ninjaResolveEnemy, NINJA_ENEMY_MS);
}

// The enemy's approach animation has finished -- it has "reached" the
// runner. THIS is now what triggers the subject-card picker.
function ninjaResolveEnemy() {
  $("ninja-run-lane").classList.add("hidden");
  $("ninja-jump-btn").classList.add("hidden");
  renderNinjaGates();
}

function ninjaBuildQuestion(subjectKey, difficulty) {
  if (subjectKey === "math") return buildQuickMc(rollDriveQuestion(difficulty));
  const pool = subjectKey === "lang" ? planeLanguagePool : planeSolarPool;
  return pickFromPlanePool(pool) || buildQuickMc(rollDriveQuestion(difficulty)); // pool not ready/empty -- fall back to math rather than block the round
}

// Small painted face (white eyes + dark pupils + smile curve) matching the
// Twig Sprout/Star Ninja/Golden Sensei reward-card reference exactly --
// replaces the earlier 🙂 emoji placeholder, which was never swapped out for
// the real design per explicit feedback ("design card tidak sesuai
// pembicaraan kita").
const NINJA_CARD_FACE_SVG = `
  <svg viewBox="0 0 40 40" width="34" height="34">
    <circle cx="14" cy="17" r="3.4" fill="#fff" />
    <circle cx="26" cy="17" r="3.4" fill="#fff" />
    <circle cx="14" cy="17.5" r="1.5" fill="#2b1f14" />
    <circle cx="26" cy="17.5" r="1.5" fill="#2b1f14" />
    <path d="M12 24 Q20 30 28 24" stroke="#2b1f14" stroke-width="2.2" fill="none" stroke-linecap="round" />
  </svg>
`;

// Rarity-style names shown on the badge instead of raw EASY/MEDIUM/HARD --
// per explicit request, reusing the Twig Sprout/Star Ninja/Golden Sensei
// reward-card names the whole card design is modeled on. Underlying diff
// key (easy/medium/hard) is unchanged -- still drives points + badge color.
const NINJA_DIFF_LABELS = { easy: "Twig Sprout", medium: "Star Ninja", hard: "Golden Sensei" };

function renderNinjaGates() {
  ninjaSetGuard(false);
  const gates = $("ninja-gates");
  gates.innerHTML = "";
  gates.classList.remove("hidden");
  $("ninja-qcard").classList.add("hidden");
  $("ninja-bubbles").classList.add("hidden");
  $("ninja-hint").textContent = "Pilih subject (kesulitan tiap kartu acak):";

  Object.keys(NINJA_SUBJECTS).forEach(key => {
    const diff = NINJA_DIFFS[rand(0, 2)];
    const card = document.createElement("button");
    card.type = "button";
    card.className = `ninja-card ${key}${diff === "hard" ? " diff-hard" : ""}`;
    card.innerHTML = `
      <div class="ninja-inner-frame"><div class="ninja-face-wrap">${NINJA_CARD_FACE_SVG}</div></div>
      <div class="ninja-card-title">${NINJA_SUBJECTS[key]}</div>
      <div class="ninja-diff-badge ${diff}">${NINJA_DIFF_LABELS[diff]}</div>
    `;
    card.addEventListener("click", () => ninjaPickCard(key, diff));
    gates.appendChild(card);
  });
}

function ninjaPickCard(subjectKey, difficulty) {
  $("ninja-gates").classList.add("hidden");
  ninjaSetGuard(true);
  const q = ninjaBuildQuestion(subjectKey, difficulty);
  const qcard = $("ninja-qcard");
  qcard.classList.remove("hidden");
  qcard.innerHTML = `<span>${q.prompt}</span>`;

  const bubbles = $("ninja-bubbles");
  bubbles.innerHTML = "";
  bubbles.classList.remove("hidden");
  $("ninja-hint").textContent = `Jawab soal ${NINJA_SUBJECTS[subjectKey]} (${difficulty.toUpperCase()}):`;

  shuffle(q.options).forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "ninja-rbubble";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      const isCorrect = labelsEqual(opt, q.correctLabel);
      if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("mathville", "ninja-runner", isCorrect);
      if (isCorrect) {
        ninjaState.score += NINJA_PTS[difficulty];
        $("ninja-score").textContent = `⭐ ${ninjaState.score}`;
        ninjaSliceQuestion(q.prompt);
      } else {
        ninjaState.wrongLog.push({ prompt: q.prompt, subject: NINJA_SUBJECTS[subjectKey], your: opt, correct: q.correctLabel });
        btn.classList.add("wrong-flash");
        setTimeout(() => ninjaAdvance(), 550);
      }
    });
    bubbles.appendChild(btn);
  });
}

function ninjaSliceQuestion(promptText) {
  $("ninja-bubbles").classList.add("hidden");
  $("ninja-hint").textContent = "";
  $("ninja-qcard").innerHTML = `
    <div class="ninja-qhalf ninja-qhalf-a">${promptText}</div>
    <div class="ninja-qhalf ninja-qhalf-b">${promptText}</div>
  `;
  setTimeout(() => ninjaAdvance(), 550);
}

function ninjaAdvance() {
  ninjaState.qnum++;
  if (ninjaState.qnum > NINJA_TOTAL_Q) { ninjaShowFinish(); return; }
  $("ninja-qnum").textContent = `Soal ${ninjaState.qnum}/${NINJA_TOTAL_Q}`;
  ninjaStartRunLane();
}

const NINJA_WIN_XP = 20;

function ninjaShowFinish() {
  ninjaState.ended = true;
  ninjaSetGuard(false);
  $("ninja-runner").classList.remove("running");
  $("ninja-gates").classList.add("hidden");
  $("ninja-qcard").classList.add("hidden");
  $("ninja-bubbles").classList.add("hidden");
  $("ninja-hint").textContent = "";
  $("ninja-final-score").textContent = `${ninjaState.score} poin`;
  $("ninja-finish-overlay").classList.remove("hidden");
  saveChapterProgress("ninja-runner", 3, NINJA_WIN_XP);
}

let ninjaReviewIdx = 0;
function ninjaShowReview() {
  $("ninja-finish-overlay").classList.add("hidden");
  $("ninja-review-overlay").classList.remove("hidden");
  const prevBtn = $("ninja-review-prev"), nextBtn = $("ninja-review-next");
  if (ninjaState.wrongLog.length === 0) {
    $("ninja-review-title").textContent = "Bo here! Sempurna, gak ada yang salah!";
    $("ninja-review-qbox").innerHTML = `<div class="ninja-review-q">🎉 Semua soal kejawab benar!</div>`;
    $("ninja-review-count").textContent = "";
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
    return;
  }
  prevBtn.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
  ninjaReviewIdx = 0;
  ninjaRenderReviewCard();
}

function ninjaRenderReviewCard() {
  const item = ninjaState.wrongLog[ninjaReviewIdx];
  $("ninja-review-title").textContent = `Bo here! Yuk kita bahas (${item.subject}):`;
  $("ninja-review-qbox").innerHTML = `
    <div class="ninja-review-q">${item.prompt}</div>
    <div class="ninja-review-your">Jawaban kamu: ${item.your}</div>
    <div class="ninja-review-correct">Jawaban benar: ${item.correct}</div>
  `;
  $("ninja-review-count").textContent = `${ninjaReviewIdx + 1} / ${ninjaState.wrongLog.length}`;
  $("ninja-review-prev").disabled = ninjaReviewIdx === 0;
  $("ninja-review-next").disabled = ninjaReviewIdx === ninjaState.wrongLog.length - 1;
}

$("ninja-review-prev").addEventListener("click", () => { if (ninjaReviewIdx > 0) { ninjaReviewIdx--; ninjaRenderReviewCard(); } });
$("ninja-review-next").addEventListener("click", () => { if (ninjaReviewIdx < ninjaState.wrongLog.length - 1) { ninjaReviewIdx++; ninjaRenderReviewCard(); } });
$("ninja-review-btn").addEventListener("click", ninjaShowReview);
$("ninja-review-done").addEventListener("click", () => {
  $("ninja-review-overlay").classList.add("hidden");
  if (window.AIGBgm && AIGBgm.playDefaultTrack) AIGBgm.playDefaultTrack();
  showScreen("screen-map");
});

$("ninja-jump-btn").addEventListener("click", ninjaDoJump);
$("btn-ninja").addEventListener("click", launchNinjaRunner);

// Deep link from the hub's landing-page Ninja Runner card (?ninja=1) --
// jump straight into Ninja Runner mode. Placed here (not alongside the
// ?drive=1/?focus=1 checks earlier in the file) because `ninjaState` is
// declared with `let` further down than that -- calling launchNinjaRunner()
// before its temporal dead zone ends throws a ReferenceError.
if (new URLSearchParams(location.search).get("ninja") === "1") {
  launchNinjaRunner();
}

