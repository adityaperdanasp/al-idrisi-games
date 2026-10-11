/* =================================================================
   Pattern Puzzles (PM round 13, item 8) -- logic instead of memory: number
   sequences, emoji patterns, a 3x3 grid with a missing cell, odd-one-out and
   letter codes. 10 puzzles that get harder (level 1 -> 3). Every puzzle is
   generated, so there is always a fresh set. A 💡 hint costs nothing but
   shows the rule's shape.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const R = K.rand, S = K.shuffle;
const FRUITS = ["🍎", "🍌", "🍇", "🍓", "🍊", "🍉"], ANIMALS = ["🐶", "🐱", "🐭", "🐸", "🦁", "🐧"], VEHICLES = ["🚗", "🚲", "✈️", "🚂", "🚀", "⛵"], SPORTS = ["⚽", "🏀", "🎾", "🏈", "🏐", "🎱"];
const CATS = [FRUITS, ANIMALS, VEHICLES, SPORTS];

function options(correct, distract) {
  const set = new Set([String(correct)]);
  for (const d of distract) { if (set.size >= 4) break; set.add(String(d)); }
  let bump = 1; while (set.size < 4 && typeof correct === "number") set.add(String(correct + bump++));
  return S([...set]);
}
function seqNum(level) {
  let seq, ans, hint;
  if (level === 1) { const a = R(2, 9), d = R(2, 6); seq = [0, 1, 2, 3].map(i => a + d * i); ans = a + d * 4; hint = "Look at the gap between each pair of numbers."; }
  else if (level === 2) { const a = R(1, 8), x = R(2, 4), y = R(1, 3); seq = [a]; for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + (i % 2 ? x : y)); ans = seq.pop() ; hint = "The step changes every time: it goes +something, then +something else."; }
  else { const a = R(1, 4), m = R(2, 3); seq = [0, 1, 2, 3].map(i => a * Math.pow(m, i)); ans = a * Math.pow(m, 4); hint = "Each number is the one before it multiplied by the same number."; }
  return { type: "Number sequence", view: `<div class="pp-seq">${seq.map(n => `<div class="pp-cell">${n}</div>`).join("")}<div class="pp-cell q">?</div></div>`, q: "What number comes next?", options: options(ans, [ans + 1, ans - 1, ans + R(2, 5), ans - R(2, 5), ans * 2]), answer: String(ans), hint };
}
function emojiPat(level) {
  const pool = S(CATS[R(0, 3)]).slice(0, 3), [A, B, C] = pool;
  const pats = level === 1 ? [[A, B, A, B, A], [A, A, B, A, A]] : level === 2 ? [[A, B, B, A, B], [A, B, C, A, B]] : [[A, B, C, C, B], [A, A, B, B, C, C, A]];
  const p = pats[R(0, pats.length - 1)];
  // The next item continues the repeating unit.
  const unit = level === 1 ? (p[1] === B ? [A, B] : [A, A, B]) : level === 2 ? (p[2] === B ? [A, B, B] : [A, B, C]) : (p.length === 5 ? [A, B, C, C, B] : [A, A, B, B, C, C]);
  const shown = []; for (let i = 0; i < 6; i++) shown.push(unit[i % unit.length]);
  const ans = unit[6 % unit.length];
  return { type: "Emoji pattern", view: `<div class="pp-seq">${shown.map(e => `<div class="pp-cell">${e}</div>`).join("")}<div class="pp-cell q">?</div></div>`, q: "Which one comes next?", options: options(ans, pool.concat(S(CATS[0]))), answer: ans, hint: "Find the little group that repeats over and over." };
}
function gridPuzzle(level) {
  const base = R(1, 6), a = level === 1 ? R(1, 3) : R(2, 5), b = level === 3 ? R(2, 5) : R(1, 3);
  const cell = (i, j) => base + i * a + j * b;
  const cells = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push(i === 2 && j === 2 ? null : cell(i, j));
  const ans = cell(2, 2);
  return { type: "Grid rule", view: `<div class="pp-grid">${cells.map(c => `<div class="pp-cell ${c === null ? "q" : ""}">${c === null ? "?" : c}</div>`).join("")}</div>`, q: "What number goes in the yellow box?", options: options(ans, [ans + 1, ans - 1, ans + a, ans - b, ans + b]), answer: String(ans), hint: `Look along a row and down a column — each step adds the same amount.` };
}
function oddOne() {
  const [main, other] = S(CATS).slice(0, 2);
  const three = S(main).slice(0, 3), odd = other[R(0, other.length - 1)];
  const all = S([...three, odd]);
  return { type: "Odd one out", view: `<div class="pp-seq">${all.map(e => `<div class="pp-cell">${e}</div>`).join("")}</div>`, q: "Which one does NOT belong?", options: S([...all]), answer: odd, hint: "Three of them are the same kind of thing." };
}
function codePuzzle(level) {
  const shift = level === 1 ? 1 : level === 2 ? 2 : 3, L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const enc = c => L[(L.indexOf(c) + shift) % 26];
  if (level === 1) { const c = L[R(2, 20)]; const p = L[R(2, 20)]; return { type: "Letter code", view: `<div class="pp-seq"><div class="pp-cell">${c}</div><div class="pp-cell">→</div><div class="pp-cell">${enc(c)}</div></div>`, q: `Using the same code, what does ${p} turn into?`, options: options(enc(p), [L[(L.indexOf(p) + 2) % 26], L[(L.indexOf(p) - 1 + 26) % 26], p, L[(L.indexOf(p) + 3) % 26]]), answer: enc(p), hint: "Every letter moves the same number of steps forward in the alphabet." }; }
  const words = ["CAT", "DOG", "SUN", "BOX", "PEN", "HAT"], w = words[R(0, words.length - 1)];
  const coded = w.split("").map(enc).join("");
  return { type: "Secret code", view: `<div class="pp-seq">${coded.split("").map(c => `<div class="pp-cell">${c}</div>`).join("")}</div>`, q: `This word was coded by moving every letter ${shift} step${shift > 1 ? "s" : ""} forward. What was the word?`, options: options(w, S(words.filter(x => x !== w)).slice(0, 3)), answer: w, hint: `Move each letter ${shift} step${shift > 1 ? "s" : ""} BACK in the alphabet.` };
}
function make(n) {
  const level = n < 3 ? 1 : n < 7 ? 2 : 3;
  const gens = [() => seqNum(level), () => emojiPat(level), () => gridPuzzle(level), oddOne, () => codePuzzle(level)];
  const g = gens[n % gens.length];
  return { level, ...g() };
}

// Audit batch 5: modes (classic 10, daily set that is the same for everyone today, endless with 3
// lives, 60-second speed), a new "missing sign" puzzle and a safe-dial puzzle you open by turning the
// dials, a boss puzzle to finish classic, tiles that drop into the ? box, and stars that count hints.
function missingSign(level) {
  const a = R(2, 9), b = R(2, level === 1 ? 5 : 9), ops = [["+", a + b], ["−", a - b], ["×", a * b]];
  const [op, val] = ops[R(0, level === 1 ? 1 : 2)];
  return { type: "Missing sign", view: `<div class="pp-seq"><div class="pp-cell">${a}</div><div class="pp-cell q">?</div><div class="pp-cell">${b}</div><div class="pp-cell">=</div><div class="pp-cell">${val}</div></div>`, q: "Which sign makes it true?", options: S(["+", "−", "×", "÷"]), answer: op, hint: "Try each sign in your head: which one gives exactly that answer?" };
}
function safePuzzle() {
  const a = R(2, 9), d = R(2, 6), seq = [0, 1, 2].map(i => a + d * i), ans = a + d * 3;
  return { type: "🔐 Safe dial", dial: true, view: `<div class="pp-seq">${seq.map(n => `<div class="pp-cell">${n}</div>`).join("")}<div class="pp-cell q">?</div></div>`, q: "Turn the dials to the next number, then open the safe!", options: [], answer: String(ans), hint: "Find the jump between the numbers." };
}
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function make2(n, mode) {
  if (mode === "classic" && n === 9) { const b = { level: 3, ...codePuzzle(3) }; b.type = "👑 Boss puzzle · " + b.type; return b; }
  if (n % 6 === 4) return { level: 1, ...safePuzzle() };
  if (n % 6 === 5) return { level: n < 7 ? 1 : 2, ...missingSign(n < 7 ? 1 : 2) };
  if (mode === "endless") { const level = Math.min(3, 1 + Math.floor(n / 5)); const gens = [() => seqNum(level), () => emojiPat(level), () => gridPuzzle(level), oddOne, () => codePuzzle(level)]; return { level, ...gens[n % gens.length]() }; }
  return make(n);
}
const lsp = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lspw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

if (!player) $("pp-overlay").innerHTML = K.signedOutHtml("🧩");
else menu();

function menu() {
  const today = new Date().toISOString().slice(0, 10), best = lsp("pp_daily_" + today, "");
  $("pp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🧩</div><h2>Pattern Puzzles</h2>
    <button class="kit-btn block" data-m="classic" type="button">🧩 Classic — 10 puzzles + a boss</button>
    <button class="kit-btn block" data-m="daily" type="button">📅 Daily set — same puzzles for everyone today${best ? ` (your best: ${best}/10)` : ""}</button>
    <button class="kit-btn alt block" data-m="endless" type="button">♾️ Endless — 3 lives, it keeps getting harder (best ${lsp("pp_endless", "0")})</button>
    <button class="kit-btn alt block" data-m="speed" type="button">⏱️ Speed — as many as you can in 60s</button>
    <button class="kit-btn alt block" data-m="lights" type="button">💡 Light Up — turn every lamp on (level ${Math.min(6, Number(lsp("pp_lights", "0")) + 1)}/6)</button></div></div>`;
  $("pp-overlay").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { $("pp-overlay").innerHTML = ""; b.dataset.m === "lights" ? lights() : start(b.dataset.m); });
}
// Audit round 2: 💡 Light Up -- a hands-on logic puzzle. Tapping a lamp flips it AND its up/down/
// left/right neighbours. Turn every lamp on. 6 levels (3x3 then 4x4), each built by scrambling a
// solved board so it is always solvable; fewer taps = more stars.
function lights() {
  const lvl = Math.min(6, Number(lsp("pp_lights", "0")) + 1), N = lvl <= 3 ? 3 : 4, scr = lvl + 1;
  let on = Array(N * N).fill(true), taps = 0;
  const flip = (g, k) => { const r = Math.floor(k / N), c = k % N; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) g[rr * N + cc] = !g[rr * N + cc]; }); };
  const picks = new Set(); while (picks.size < scr) picks.add(Math.floor(Math.random() * N * N)); picks.forEach(k => flip(on, k));
  if (on.every(Boolean)) flip(on, 0);
  const draw = () => {
    const won = on.every(Boolean);
    $("pp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-q">💡 Light Up — level ${lvl}/6</div><p class="kit-sub" style="text-align:center">Tapping a lamp flips it and its neighbours. Turn them ALL on! · taps: ${taps} (par ${scr})</p>
      <div class="pp-lights" style="grid-template-columns:repeat(${N},1fr)">${on.map((v, k) => `<button type="button" class="pp-lamp ${v ? "on" : ""}" data-k="${k}">${v ? "💡" : "⚫"}</button>`).join("")}</div>
      ${won ? `<div class="kit-q" style="margin-top:10px">${taps <= scr ? "⭐⭐⭐" : taps <= scr + 3 ? "⭐⭐" : "⭐"} All lit!</div><div class="kit-bonus" id="pp-lb"></div><button class="kit-btn block" id="pp-lnext" type="button">${lvl < 6 ? "Next level" : "Play again"}</button>` : `<button class="kit-btn alt block" id="pp-lreset" type="button">🔄 New board</button>`}<button class="kit-btn alt block" id="pp-lback" type="button">Back</button></div></div>`;
    $("pp-overlay").querySelectorAll(".pp-lamp").forEach(b => b.onclick = () => { if (on.every(Boolean)) return; flip(on, +b.dataset.k); taps++; draw(); });
    const nb = $("pp-lnext"); if (nb) { if (Number(lsp("pp_lights", "0")) < lvl) { try { localStorage.setItem("pp_lights", String(Math.min(6, lvl))); } catch (e) {} K.record("pattern-puzzles", "lights", true); K.finish("pattern-puzzles", taps <= scr ? 5 : 3, $("pp-lb")); } nb.onclick = () => { if (lvl >= 6) { try { localStorage.setItem("pp_lights", "0"); } catch (e) {} } lights(); }; }
    const rb = $("pp-lreset"); if (rb) rb.onclick = lights;
    $("pp-lback").onclick = () => { $("pp-overlay").innerHTML = ""; menu(); };
  };
  draw();
}
function start(mode) {
  let n = 0, right = 0, cur = null, locked = false, hints = 0, lives = 3, endAt = mode === "speed" ? Date.now() + 60000 : 0, tick = null;
  let pre = null;
  if (mode === "daily") { const seed = new Date().toISOString().slice(0, 10).split("-").join("") | 0, orig = Math.random; Math.random = mulberry(seed); try { pre = Array.from({ length: 10 }, (_, i) => make2(i, "daily")); } finally { Math.random = orig; } }
  if (endAt) tick = setInterval(() => { const left = Math.max(0, endAt - Date.now()); $("pp-lv").textContent = `⏱️ ${Math.ceil(left / 1000)}s`; if (!left) { clearInterval(tick); finish(); } }, 250);
  const total = mode === "classic" || mode === "daily" ? 10 : Infinity;
  const next = () => {
    if (n >= total || (mode === "endless" && lives <= 0) || (endAt && Date.now() >= endAt)) return finish();
    cur = pre ? pre[n] : make2(n, mode); n++; locked = false;
    $("pp-n").textContent = n; if (!endAt) $("pp-lv").textContent = mode === "endless" ? `Level ${cur.level} · ${"❤️".repeat(lives)}` : `Level ${cur.level}`;
    $("pp-type").textContent = cur.type; $("pp-view").innerHTML = cur.view; $("pp-q").textContent = cur.q; $("pp-msg").textContent = "";
    if (cur.dial) {
      let t = 0, o = 0;
      $("pp-opts").innerHTML = `<div class="pp-dials" style="grid-column:1/-1"><div><button type="button" data-d="t+">▲</button><b id="pp-dt">0</b><button type="button" data-d="t-">▼</button></div><div><button type="button" data-d="o+">▲</button><b id="pp-do">0</b><button type="button" data-d="o-">▼</button></div><button class="kit-btn" id="pp-open" type="button">🔓 Open</button></div>`;
      $("pp-opts").querySelectorAll("[data-d]").forEach(b => b.onclick = () => { const k = b.dataset.d; if (k[0] === "t") t = (t + (k[1] === "+" ? 1 : 9)) % 10; else o = (o + (k[1] === "+" ? 1 : 9)) % 10; $("pp-dt").textContent = t; $("pp-do").textContent = o; });
      $("pp-open").onclick = () => pickVal(String(t * 10 + o), $("pp-open"));
      return;
    }
    $("pp-opts").innerHTML = cur.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("");
    $("pp-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => pickVal(b.dataset.o, b));
  };
  function pickVal(val, btn) {
    if (locked) return; locked = true;
    const ok = val === cur.answer;
    K.record("pattern-puzzles", "logic", ok);
    const q = $("pp-view").querySelector(".pp-cell.q"); if (q) { q.textContent = val; q.classList.add(ok ? "ok" : "bad", "drop"); }
    $("pp-opts").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === cur.answer) x.classList.add("right"); });
    if (ok) { right++; $("pp-r").textContent = right; } else { if (btn && btn.classList) btn.classList.add("wrong"); lives--; }
    $("pp-msg").textContent = ok ? (cur.dial ? "🔓 The safe clicks open!" : "🧩 Great thinking!") : `The answer was ${cur.answer}. ${cur.hint}`;
    setTimeout(next, ok ? (endAt ? 450 : 1000) : (endAt ? 1200 : 2600));
  }
  $("pp-hint").onclick = () => { if (cur) { hints++; $("pp-msg").textContent = "💡 " + cur.hint + (hints > 1 ? " (hints lower your stars)" : ""); } };
  let fin = false;
  async function finish() {
    if (fin) return; fin = true; clearInterval(tick);
    const stars = mode === "classic" || mode === "daily" ? (right >= 9 && hints <= 1 ? 3 : right >= 7 && hints <= 3 ? 2 : right >= 5 ? 1 : 0) : 0;
    if (mode === "daily") { const k = "pp_daily_" + new Date().toISOString().slice(0, 10); if (right > Number(lsp(k, "0"))) lspw(k, String(right)); }
    if (mode === "endless" && right > Number(lsp("pp_endless", "0"))) { lspw("pp_endless", String(right)); K.toastAdv(`New endless record: ${right}!`); }
    const head = mode === "speed" ? `${right} in 60 seconds!` : mode === "endless" ? `${right} solved before running out of lives` : `${right}/10 solved`;
    $("pp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🚪✨</div><h2>${head}</h2>${stars ? `<div style="font-size:1.6rem">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>` : ""}<p class="kit-sub">${right >= 8 ? "Puzzle master!" : "Patterns get easier the more you spot them. Try again!"}${hints ? ` · 💡 ${hints} hint${hints > 1 ? "s" : ""}` : ""}</p><div class="kit-bonus" id="pp-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Play again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("pattern-puzzles", Math.min(20, right * 2), $("pp-bonus"));
  }
  next();
}
