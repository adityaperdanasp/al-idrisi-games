/* =================================================================
   Island Adventure -- Bo's Adventure, season 3 (PM round 12, item 4).
   Sail between four islands (Fractions, Shapes, Words, Science). Answer
   4 questions on an island; 3 right MASTERS it (a crystal + coins, once).
   Two mastered islands open the Volcano finale: 5 mixed questions. The
   ending you get depends on how many islands you mastered and how the
   finale went. State: players/{id}/islands.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const ISLANDS = {
  fractions: { name: "Fraction Isle", emoji: "🍕", x: 22, y: 26 },
  shapes: { name: "Shape Isle", emoji: "🔷", x: 76, y: 24 },
  words: { name: "Word Isle", emoji: "📚", x: 22, y: 72 },
  science: { name: "Science Isle", emoji: "🔬", x: 76, y: 72 },
  volcano: { name: "Number Volcano", emoji: "🌋", x: 50, y: 48 }
};
const SHAPES = [
  ["How many sides does a hexagon have?", ["5", "6", "8"], 1], ["How many corners does a triangle have?", ["3", "4", "5"], 0], ["A square has how many equal sides?", ["2", "3", "4"], 2],
  ["Which shape has NO corners?", ["Circle", "Square", "Triangle"], 0], ["How many sides does an octagon have?", ["6", "7", "8"], 2], ["A rectangle has how many right angles?", ["2", "4", "6"], 1],
  ["Which of these is a 3D shape?", ["Circle", "Cube", "Triangle"], 1], ["A pentagon has how many sides?", ["4", "5", "6"], 1], ["What shape is a football pitch usually?", ["Circle", "Rectangle", "Triangle"], 1],
  ["A triangle with 3 equal sides is called…", ["Equilateral", "Scalene", "Right"], 0], ["How many faces does a cube have?", ["4", "6", "8"], 1], ["Which shape has 4 equal sides and 4 right angles?", ["Rectangle", "Square", "Triangle"], 1]
];
function fractionQ() {
  const r = K.rand(0, 3);
  if (r === 0) { const d = [4, 5, 6, 8, 10][K.rand(0, 4)], a = K.rand(1, d - 2), b = K.rand(a + 1, d - 1); return mc(`Which fraction is bigger?`, [`${a}/${d}`, `${b}/${d}`], `${b}/${d}`); }
  if (r === 1) { const d = [4, 5, 6, 8, 10][K.rand(0, 4)], a = K.rand(1, d - 2), b = K.rand(1, d - a - 1 || 1); return mc(`${a}/${d} + ${b}/${d} = ?`, null, `${a + b}/${d}`, [`${a + b}/${d * 2}`, `${a * b}/${d}`, `${Math.abs(a - b) || 1}/${d}`]); }
  if (r === 2) { const d = [2, 3, 4, 5][K.rand(0, 3)], n = d * K.rand(2, 8); return mc(`What is 1/${d} of ${n}?`, null, String(n / d), [String(n / d + d), String(n - d), String(n / d + 1)]); }
  const k = K.rand(2, 4), b = [2, 3][K.rand(0, 1)]; return mc(`1/${b} = ?/${b * k}`, null, String(k), [String(k + 1), String(k * 2), String(b)]);
}
function mc(prompt, opts, correct, distract) {
  const options = opts || K.shuffle([correct, ...distract]);
  return { prompt, options: [...new Set(options)].length < 2 ? [correct, "0"] : K.shuffle([...new Set(options)]), correctLabel: correct, key: "island" };
}
function questionFor(id) {
  if (id === "fractions") return fractionQ();
  if (id === "shapes") { const q = SHAPES[K.rand(0, SHAPES.length - 1)]; return { prompt: q[0], options: K.shuffle(q[1]), correctLabel: q[1][q[2]], key: "shapes" }; }
  if (id === "words") return K.question({ subject: "lang" });
  if (id === "science") return K.question({ subject: "sci" });
  return K.question({});
}

if (!player) $("ia-overlay").innerHTML = K.signedOutHtml("🏝️");
else K.ready().then(init);

async function init() {
  const LB = AIGLeaderboard;
  let st = await LB.getIslands();
  const done = () => Object.keys(st.mastered).length;

  function map() {
    $("ia-hud").textContent = `💎 Crystals: ${done()}/4 · Endings found: ${Object.keys(st.endings).length}/4`;
    $("ia-sea").innerHTML = Object.entries(ISLANDS).map(([id, i]) => {
      const isVol = id === "volcano", lock = isVol && done() < 2, m = st.mastered[id];
      return `<button class="ia-isl ${m ? "done" : ""} ${lock ? "lock" : ""}" style="left:${i.x}%;top:${i.y}%" data-i="${id}" ${lock ? "disabled" : ""}><span class="e">${lock ? "🔒" : i.emoji}</span>${i.name}${m ? "<br>💎 mastered" : ""}</button>`;
    }).join("") + '<div class="ia-boat" style="left:50%;top:92%">⛵</div>';
    $("ia-sea").querySelectorAll(".ia-isl:not(.lock)").forEach(b => b.onclick = () => go(b.dataset.i));
    $("ia-card").innerHTML = `<div class="kit-sub" style="text-align:center;margin:0">${done() < 2 ? "Master 2 islands (3 of 4 questions right) to open the Number Volcano." : "The Volcano is open! Master all 4 islands first for the best ending."}</div>`;
  }

  function go(id) {
    const finale = id === "volcano", total = finale ? 5 : 4, need = finale ? 3 : 3;
    let i = 0, right = 0;
    const ask = () => {
      if (i >= total) return finish();
      const q = questionFor(id);
      $("ia-card").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">${ISLANDS[id].emoji} ${ISLANDS[id].name} — ${i + 1}/${total}</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="ia-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div>`;
      $("ia-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correctLabel;
        K.record("island-adventure", q.key, ok, q);
        $("ia-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
        if (ok) right++; else b.classList.add("wrong");
        $("ia-msg").textContent = ok ? "⛵ Smooth sailing!" : `The answer was ${q.correctLabel}`;
        setTimeout(() => { i++; ask(); }, 950);
      });
    };
    async function finish() {
      if (finale) return ending(right);
      const ok = right >= need;
      let msg = ok ? `You mastered ${ISLANDS[id].name}! 💎` : `${right}/4 — sail back and try again!`;
      if (ok) { const r = await LB.masterIsland(id); st.mastered[id] = true; if (r.first) msg += ` +🪙${r.coins}`; if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); }
      $("ia-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${ok ? "💎" : "🌊"}</div><h2>${ok ? "Island mastered!" : "Not yet…"}</h2><p class="kit-sub">${msg}</p><button class="kit-btn block" id="ia-back">Back to the map</button></div></div>`;
      $("ia-back").onclick = () => { $("ia-overlay").innerHTML = ""; map(); };
    }
    ask();
  }

  async function ending(finaleRight) {
    const m = done();
    let e;
    if (m === 4 && finaleRight >= 4) e = { id: "hero", emoji: "🏆", title: "Island Hero", text: "All four crystals blaze together and the volcano sings! Every island cheers your name.", coins: 60 };
    else if (m >= 3 && finaleRight >= 3) e = { id: "explorer", emoji: "🧭", title: "Grand Explorer", text: "You calm the volcano with three crystals and draw a map of every island you saw.", coins: 40 };
    else if (finaleRight >= 3) e = { id: "adventurer", emoji: "⛵", title: "Brave Adventurer", text: "With just enough crystals and a lot of courage, you make it home safe with great stories.", coins: 25 };
    else e = { id: "sailor", emoji: "🌊", title: "Lost Sailor", text: "The volcano rumbles and your boat drifts away — but Bo picks you up and says: try again, I believe in you!", coins: 10 };
    const r = await LB.claimIslandEnding(e.id, e.coins);
    if (r.first) st.endings[e.id] = true;
    $("ia-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${e.emoji}</div><h2>${e.title}</h2><p class="kit-sub">${e.text}<br>Finale: ${finaleRight}/5 · Crystals: ${m}/4</p><div class="kit-bonus">${r.first ? `🎉 New ending! +🪙${r.coins}` : "You've found this ending before."}</div><button class="kit-btn block" id="ia-back">Back to the map</button></div></div>`;
    if (window.AIGSkin && r.first) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    $("ia-back").onclick = () => { $("ia-overlay").innerHTML = ""; map(); };
  }
  map();
}
