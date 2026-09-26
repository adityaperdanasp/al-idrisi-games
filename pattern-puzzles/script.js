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

if (!player) $("pp-overlay").innerHTML = K.signedOutHtml("🧩");
else start();

function start() {
  let n = 0, right = 0, cur = null, locked = false;
  const next = () => {
    if (n >= 10) return finish();
    cur = make(n); n++; locked = false;
    $("pp-n").textContent = n; $("pp-lv").textContent = `Level ${cur.level}`;
    $("pp-type").textContent = cur.type; $("pp-view").innerHTML = cur.view; $("pp-q").textContent = cur.q; $("pp-msg").textContent = "";
    $("pp-opts").innerHTML = cur.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("");
    $("pp-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => pick(b));
  };
  function pick(btn) {
    if (locked) return; locked = true;
    const ok = btn.dataset.o === cur.answer;
    K.record("pattern-puzzles", "logic", ok);
    $("pp-opts").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === cur.answer) x.classList.add("right"); });
    if (ok) { right++; $("pp-r").textContent = right; } else btn.classList.add("wrong");
    $("pp-msg").textContent = ok ? "🧩 Great thinking!" : `The answer was ${cur.answer}. ${cur.hint}`;
    setTimeout(next, ok ? 1000 : 2600);
  }
  $("pp-hint").onclick = () => { if (cur) $("pp-msg").textContent = "💡 " + cur.hint; };
  async function finish() {
    $("pp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 8 ? "🧠" : "🧩"}</div><h2>${right}/10 solved</h2><p class="kit-sub">${right >= 8 ? "Puzzle master!" : "Patterns get easier the more you spot them. Try again!"}</p><div class="kit-bonus" id="pp-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">New puzzles</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("pattern-puzzles", right * 2, $("pp-bonus"));
  }
  next();
}
