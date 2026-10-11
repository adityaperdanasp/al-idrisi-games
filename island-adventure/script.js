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

// Audit batch 6: the boat really sails to each island, a reef question on the way (3-hull boat),
// an island host with lines, storms that put a timer on an island, a treasure dig once an island is
// mastered, an endings gallery on the map, and a gentle story mode (2 of 4 to master).
const NPC = { fractions: ["👨‍🍳", "Chef Pip", "Welcome to Fraction Isle! Help me share my pizzas fairly."], shapes: ["🤖", "Robo-Square", "BEEP! Shape Isle needs a shape expert."], words: ["🦉", "Professor Hoot", "Hoo! The Word Library has puzzling pages."], science: ["🧑‍🔬", "Dr. Spark", "Science Isle is full of experiments!"], volcano: ["🔥", "The Fire Spirit", "Only a true explorer can calm my volcano…"] };
const ENDINGS = [["hero", "🏆 Island Hero"], ["explorer", "🧭 Grand Explorer"], ["adventurer", "⛵ Brave Adventurer"], ["sailor", "🌊 Lost Sailor"]];
let story = false;
const lsi = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsiw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
if (!player) $("ia-overlay").innerHTML = K.signedOutHtml("🏝️");
else K.ready().then(init);

async function init() {
  const LB = AIGLeaderboard;
  let st = await LB.getIslands();
  const done = () => Object.keys(st.mastered).length;

  function map() {
    $("ia-hud").textContent = `💎 Crystals: ${done()}/4 · Endings found: ${Object.keys(st.endings).length}/4${Number(lsi("ia_pirates", "0")) ? ` · 🏴‍☠️ ${lsi("ia_pirates", "0")} pirate ships sunk` : ""}`;
    $("ia-sea").innerHTML = Object.entries(ISLANDS).map(([id, i]) => {
      const isVol = id === "volcano", lock = isVol && done() < 2, m = st.mastered[id];
      return `<button class="ia-isl ${m ? "done" : ""} ${lock ? "lock" : ""}" style="left:${i.x}%;top:${i.y}%" data-i="${id}" ${lock ? "disabled" : ""}><span class="e">${lock ? "🔒" : i.emoji}</span>${i.name}${m ? "<br>💎 mastered" : ""}</button>`;
    }).join("") + '<div class="ia-boat" id="ia-boat" style="left:50%;top:92%">⛵</div>';
    $("ia-sea").querySelectorAll(".ia-isl:not(.lock)").forEach(b => b.onclick = () => go(b.dataset.i));
    $("ia-card").innerHTML = `<div class="kit-sub" style="text-align:center;margin:0">${done() < 2 ? `Master 2 islands (${story ? "2" : "3"} of 4 questions right) to open the Number Volcano.` : "The Volcano is open! Master all 4 islands first for the best ending."}</div>
      <label class="ia-story"><input type="checkbox" id="ia-st" ${story ? "checked" : ""}> 📖 Story mode (easier mastering)</label>
      <div class="ia-gal"><b>🎞️ Endings:</b> ${ENDINGS.map(([id, t]) => `<span class="${st.endings[id] ? "on" : ""}">${st.endings[id] ? t : "❔"}</span>`).join("")}</div>`;
    $("ia-st").onchange = e => { story = e.target.checked; map(); };
  }

  function go(id) {
    const boat = $("ia-boat"); if (boat) { boat.style.left = ISLANDS[id].x + "%"; boat.style.top = (ISLANDS[id].y + 10) + "%"; }
    let hull = 3;
    // reef on the way
    const rq = K.question({ subject: "math", difficulty: "easy" });
    setTimeout(() => {
      $("ia-card").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">🪨 Rocks ahead! Answer to steer safely · ${"🛟".repeat(hull)}</div><div class="kit-q">${K.esc(rq.prompt)}</div><div class="kit-opts">${rq.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="ia-msg" style="text-align:center;min-height:1.2em"></div>`;
      $("ia-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === rq.correctLabel; K.record("island-adventure", rq.key, ok, rq); if (!ok) hull--; $("ia-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === rq.correctLabel) x.classList.add("right"); }); $("ia-msg").textContent = ok ? "⛵ You steered past the rocks!" : `💥 Bump! The boat lost a lifebuoy (answer: ${rq.correctLabel})`; setTimeout(arrive, ok ? 900 : 1700); });
    }, 700);
    // Audit round 2: sometimes a pirate ship blocks the way -- 3 cannon shots (questions); win 2 and
    // you take their treasure chest. Ships sunk are counted on the map.
    function pirates(then) {
      let shot = 0, hits = 0;
      const fire = () => {
        if (shot >= 3) {
          const won = hits >= 2; if (won) { lsiw("ia_pirates", String(Number(lsi("ia_pirates", "0")) + 1)); LB.creditWallet({ coins: 4 }).catch(() => {}); }
          $("ia-card").innerHTML = `<div class="kit-big" style="text-align:center">${won ? "🏴‍☠️💥" : "🏴‍☠️💨"}</div><div class="kit-q">${won ? "Pirate ship sunk! You grabbed their chest (+4 coins)." : "The pirates sailed away… phew!"}</div><button class="kit-btn block" id="ia-pgo" type="button">Sail on ⛵</button>`;
          $("ia-pgo").onclick = then; return;
        }
        const q = K.question({ difficulty: "easy" });
        $("ia-card").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">🏴‍☠️ Pirates! Cannon shot ${shot + 1}/3 · 💥 ${hits} hits</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>`;
        $("ia-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === q.correctLabel; K.record("island-adventure", q.key, ok, q); $("ia-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); }); if (ok) hits++; else b.classList.add("wrong"); shot++; setTimeout(fire, ok ? 700 : 1400); });
      };
      fire();
    }
    function arrive() {
      if (id !== "volcano" && !arrive.met && Math.random() < 0.3) { arrive.met = true; return pirates(arrive); }
      const n = NPC[id]; const storm = id !== "volcano" && Math.random() < 0.25;
      $("ia-card").innerHTML = `<div class="ia-npc"><span>${n[0]}</span><div><b>${n[1]}</b><br>${K.esc(n[2])}${storm ? "<br>⛈️ <b>A storm is coming — answer each question in 8 seconds!</b>" : ""}</div></div><button class="kit-btn block" id="ia-start" type="button">Let's go!</button>`;
      $("ia-start").onclick = () => play(storm);
    }
    const finale = id === "volcano", total = finale ? 5 : 4, need = finale ? 3 : (story ? 2 : 3);
    let i = 0, right = 0, stormy = false, tmr = null;
    function play(sto) { stormy = sto; ask(); }
    const ask = () => {
      clearInterval(tmr);
      if (i >= total) return finish();
      const q = questionFor(id);
      $("ia-card").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">${ISLANDS[id].emoji} ${ISLANDS[id].name} — ${i + 1}/${total} · ${"🛟".repeat(hull)}${stormy ? " · ⛈️" : ""}</div>${stormy ? '<div class="kit-bar" style="margin-bottom:6px"><i id="ia-t"></i></div>' : ""}<div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="ia-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div>`;
      if (stormy) { let t = 8; tmr = setInterval(() => { t -= 0.1; const el = $("ia-t"); if (el) el.style.width = Math.max(0, t / 8 * 100) + "%"; if (t <= 0) { clearInterval(tmr); const w = [...$("ia-card").querySelectorAll(".kit-opt")].find(x => x.dataset.o !== q.correctLabel); if (w) w.click(); } }, 100); }
      $("ia-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        clearInterval(tmr);
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
      const canDig = ok && lsi("ia_dug_" + id, "") !== "1";
      $("ia-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${ok ? "💎" : "🌊"}</div><h2>${ok ? "Island mastered!" : "Not yet…"}</h2><p class="kit-sub">${msg}</p>${canDig ? `<div class="kit-sub" style="font-weight:800">🗺️ ${NPC[id][1]} whispers: a treasure is buried here! Pick a spot:</div><div class="ia-dig">${["🏝️", "🌴", "🪨"].map((x, k) => `<button type="button" data-dig="${k}">${x}</button>`).join("")}</div><div class="kit-bonus" id="ia-db"></div>` : ""}<button class="kit-btn block" id="ia-back">Back to the map</button></div></div>`;
      $("ia-back").onclick = () => { $("ia-overlay").innerHTML = ""; map(); };
      const lucky = K.rand(0, 2);
      $("ia-overlay").querySelectorAll("[data-dig]").forEach(b => b.onclick = async () => { lsiw("ia_dug_" + id, "1"); $("ia-overlay").querySelectorAll("[data-dig]").forEach(x => x.disabled = true); const win = +b.dataset.dig === lucky; b.textContent = win ? "💰" : "🦀"; $("ia-db").textContent = win ? "You found the treasure! +5 🪙" : "Just a crab… but here's 2 🪙 for digging!"; try { await LB.creditWallet({ coins: win ? 5 : 2 }); } catch (e) {} });
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
