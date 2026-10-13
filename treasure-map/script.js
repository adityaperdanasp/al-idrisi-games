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

const GEN_KEYS = MATHVILLE_GENERATORS.QUICK_KEYS;
const WEEKLY = [["🌴", "⛰️", "🏚️", "🌊", "🗿", "🕳️", "🌵", "🏰"], ["🌲", "🍄", "🦉", "🏞️", "🪵", "🐻", "🌋", "⛺"], ["🏜️", "🐪", "🌵", "🏺", "🦂", "🐍", "☀️", "🕌"]];
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

// Audit batch 8: an explorer walks to each landmark, a clue points to the next spot (follow it for a
// bonus), you dig up each treasure with quick taps, one spot is quicksand (needs 2 right answers), a
// rival pirate moves around and makes his spot's riddle harder, a golden chest hides somewhere, the
// landmark set changes each week, and your best time is remembered.
function initTreasureMap() {
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();
  const state = { found: [], activeLandmark: null, clueTo: -1, clueHits: 0, quick: -1, quickNeed: 0, pirate: -1, golden: -1, t0: 0, pirateT: null, gold: 0 };
  const wk = Math.floor(Date.now() / (7 * 86400000)) % WEEKLY.length; LANDMARKS.forEach((lm, i) => { lm.emoji = WEEKLY[wk][i]; });

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

  function rollMathQuestion(difficulty) {
    const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
    const raw = MATHVILLE_GENERATORS[key](difficulty);
    return { key, ...buildMc(raw) };
  }

  function rollQuestion(difficulty) {
    return window.AIGQuestionPools ? window.AIGQuestionPools.rollMixed(() => rollMathQuestion(difficulty)) : rollMathQuestion(difficulty);
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
      btn.textContent = found ? (i === state.golden ? "👑" : "💰") : lm.emoji + (i === state.pirate ? "🏴‍☠️" : "") + (i === state.clueTo ? "❗" : "");
      btn.title = lm.name;
      btn.addEventListener("click", () => openRiddle(i));
      map.appendChild(btn);
    });
  }

  function walkTo(i, then) {
    let ex = document.getElementById("tm-explorer"); const map = document.getElementById("tm-map");
    if (!ex) { ex = document.createElement("div"); ex.id = "tm-explorer"; ex.className = "tm-explorer"; ex.textContent = "🧭"; ex.style.left = "50%"; ex.style.top = "50%"; }
    map.appendChild(ex); requestAnimationFrame(() => { ex.style.left = LANDMARKS[i].x + "%"; ex.style.top = LANDMARKS[i].y + "%"; }); setTimeout(then, 650);
  }
  function openRiddle(i) {
    if (state.found.includes(i)) return;
    if (!state.walking) { state.walking = true; return walkTo(i, () => { state.walking = false; openRiddle(i); }); }
    state.activeLandmark = i;
    const lm = LANDMARKS[i];
    document.getElementById("tm-riddle-feedback").textContent = "";
    const quick = i === state.quick, pir = i === state.pirate;
    document.getElementById("tm-riddle-label").textContent = `Riddle at ${lm.name} ${lm.emoji}:${quick ? ` 🏖️ QUICKSAND — ${2 - state.quickNeed} right answers to get out!` : ""}${pir ? " 🏴‍☠️ The pirate made it harder!" : ""}`;
    const q = rollQuestion(pir ? "hard" : lm.difficulty);
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

    if (isCorrect && i === state.quick && state.quickNeed < 1) {
      state.quickNeed++; document.getElementById("tm-riddle-feedback").textContent = "🏖️ One foot free! One more answer…"; document.getElementById("tm-riddle-feedback").style.color = "#3F8F5F";
      setTimeout(() => openRiddle(i), 900); return;
    }
    if (isCorrect) {
      document.getElementById("tm-riddle-card").classList.add("hidden");
      return dig(i);
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

  function dig(i) {
    const fb = document.getElementById("tm-riddle-feedback"); let taps = 0;
    fb.innerHTML = `<button type="button" class="tm-dig" id="tm-dig">⛏️ Dig! (tap 5 times)</button>`; fb.style.color = "#3F8F5F";
    document.getElementById("tm-dig").onclick = () => { taps++; document.getElementById("tm-dig").textContent = `⛏️ ${"🟫".repeat(taps)}`; if (taps >= 5) found(i); };
  }
  function found(i) {
    state.found.push(i);
    const fb = document.getElementById("tm-riddle-feedback");
    let msg = `Treasure found at ${LANDMARKS[i].name}! 💰`;
    if (i === state.golden) { state.gold++; msg = `👑 The GOLDEN CHEST at ${LANDMARKS[i].name}!`; }
    if (i === state.clueTo) { state.clueHits++; msg += " 🧭 You followed the clue — bonus!"; }
    const left = LANDMARKS.map((_, k) => k).filter(k => !state.found.includes(k));
    if (left.length) { const t = left[rand(0, left.length - 1)], dir = (LANDMARKS[t].y < LANDMARKS[i].y ? "north" : "south") + "-" + (LANDMARKS[t].x < LANDMARKS[i].x ? "west" : "east"); state.clueTo = t; msg += ` Next clue: look ${dir} of here… ❗`; }
    fb.textContent = msg; renderHud(); renderMap();
    setTimeout(() => { if (fb.textContent === msg) fb.textContent = ""; }, 3000);
  }
  async function finishHunt(claimedAll) {
    clearInterval(state.pirateT);
    const secs = Math.round((Date.now() - state.t0) / 1000);
    if (claimedAll) { try { const b = Number(localStorage.getItem("tm_best") || 0); if (!b || secs < b) { localStorage.setItem("tm_best", String(secs)); } } catch (e) {} }
    document.getElementById("tm-riddle-card").classList.add("hidden");
    const foundCount = state.found.length;
    const emoji = claimedAll ? "🏆" : foundCount >= 5 ? "🎉" : foundCount >= 1 ? "🙂" : "💪";
    document.getElementById("tm-end-emoji").textContent = emoji;
    document.getElementById("tm-end-title").textContent = claimedAll ? "Grand Treasure Claimed!" : "Hunt Finished!";
    document.getElementById("tm-end-sub").textContent = claimedAll
      ? `You found all ${LANDMARKS.length} treasures and claimed the Grand Treasure!`
      : `You found ${foundCount} of ${LANDMARKS.length} treasures before finishing up. Nice work!`;
    document.getElementById("tm-end-sub").textContent += ` ⏱️ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}${state.gold ? " · 👑 golden chest!" : ""}${state.clueHits ? ` · 🧭 ${state.clueHits} clue${state.clueHits > 1 ? "s" : ""} followed` : ""}`;
    if (state.gold || state.clueHits >= 3) { try { AIGLeaderboard.creditWallet({ coins: state.gold * 4 + (state.clueHits >= 3 ? 3 : 0) }); } catch (e) {} }
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
    state.activeLandmark = null; state.clueTo = -1; state.clueHits = 0; state.quickNeed = 0; state.gold = 0; state.t0 = Date.now();
    state.quick = rand(3, 7); state.golden = rand(0, 7); state.pirate = rand(0, 7);
    clearInterval(state.pirateT); state.pirateT = setInterval(() => { const left = LANDMARKS.map((_, k) => k).filter(k => !state.found.includes(k) && k !== state.activeLandmark); if (left.length) { state.pirate = left[rand(0, left.length - 1)]; renderMap(); } }, 30000);
    document.getElementById("tm-start-overlay").classList.add("hidden");
    document.getElementById("tm-end-overlay").classList.add("hidden");
    document.getElementById("tm-riddle-card").classList.add("hidden");
    renderHud();
    renderMap();
  }

  document.getElementById("tm-start-btn").addEventListener("click", startGame);
  // Audit round 2: 🧭 Compass hunt -- a 7x7 grid, you start at ⭐. Follow the directions (North,
  // East, South, West with step counts) in your head and tap the square where the treasure is.
  // 5 maps, directions get longer; best score kept.
  (function compassHunt() {
    const btn = document.createElement("button"); btn.className = "tm-btn"; btn.type = "button"; btn.style.marginTop = "8px";
    let best = 0; try { best = Number(localStorage.getItem("tm_compass_best") || 0); } catch (e) {}
    btn.textContent = `🧭 Compass hunt${best ? ` (best ${best}/5)` : ""}`;
    document.getElementById("tm-start-btn").after(btn);
    btn.onclick = () => {
      const o = document.createElement("div"); o.className = "tm-overlay"; document.body.appendChild(o);
      let round = 0, right = 0; const N = 7, DIRS = [["North", 0, -1, "⬆️"], ["South", 0, 1, "⬇️"], ["East", 1, 0, "➡️"], ["West", -1, 0, "⬅️"]];
      const play = () => {
        if (round >= 5) { if (right > best) { best = right; try { localStorage.setItem("tm_compass_best", String(right)); } catch (e) {} } o.innerHTML = `<div class="tm-card"><div style="font-size:2.4rem">🧭</div><h2>${right}/5 treasures found!</h2><button class="tm-btn tm-btn-primary" id="tm-cx">Back</button></div>`; o.querySelector("#tm-cx").onclick = () => { o.remove(); btn.textContent = `🧭 Compass hunt (best ${best}/5)`; }; return; }
        let x = 3, y = 3; const sx = x, sy = y, steps = [];
        for (let k = 0; k < 2 + Math.min(2, round); k++) { let d, n, guard = 0; do { d = DIRS[Math.floor(Math.random() * 4)]; n = 1 + Math.floor(Math.random() * 3); guard++; } while ((x + d[1] * n < 0 || x + d[1] * n >= N || y + d[2] * n < 0 || y + d[2] * n >= N) && guard < 40); x += d[1] * n; y += d[2] * n; steps.push(`${d[3]} ${n} ${d[0]}`); }
        o.innerHTML = `<div class="tm-card"><div style="font-weight:800">🧭 Map ${round + 1}/5 · ✅ ${right}</div><p>Start at ⭐ and walk: <b>${steps.join(", then ")}</b>. Tap where the treasure is!</p><div class="tm-cgrid">${Array.from({ length: N * N }, (_, k) => `<button type="button" data-k="${k}">${k === sy * N + sx ? "⭐" : ""}</button>`).join("")}</div><p class="tm-cmsg" id="tm-cmsg"></p></div>`;
        o.querySelectorAll(".tm-cgrid button").forEach(b => b.onclick = () => {
          const k = +b.dataset.k, ok = k === y * N + x; if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("treasure-map", "directions", ok);
          o.querySelectorAll(".tm-cgrid button").forEach(z => z.disabled = true); o.querySelector(`[data-k="${y * N + x}"]`).textContent = "💰"; if (!ok) b.textContent = "❌"; else right++;
          o.querySelector("#tm-cmsg").textContent = ok ? "You found it! 🎉" : "The treasure was at 💰."; round++; setTimeout(play, ok ? 900 : 1800);
        });
      };
      play();
    };
  })();
  document.getElementById("tm-play-again-btn").addEventListener("click", startGame);
  renderMap();
}
