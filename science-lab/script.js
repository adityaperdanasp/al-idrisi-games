/* =================================================================
   Science Lab (PM round 11, item 9) -- predict, then watch. Each session
   is 6 experiments drawn from a bank of 12. You pick a prediction, the
   bench plays the result in emoji, and a one-line "why" explains it.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const LAB = [
  { t: "Sink or Float", setup: "🪙  🍾  🍃  → 🌊", q: "Which one will SINK to the bottom of the water?", o: ["The cork", "The coin", "The leaf"], a: 1, frames: ["🌊  🍃  🍾", "🌊  🍃  🍾  ⬇️🪙", "🍃 🍾 on top · 🪙 on the bottom"], fact: "The coin is denser than water, so it sinks. The cork and leaf are lighter for their size, so they float." },
  { t: "Mixing Colours", setup: "🔴 + 🟡 = ?", q: "What colour do red and yellow paint make?", o: ["Green", "Orange", "Purple"], a: 1, frames: ["🔴 + 🟡", "🎨 swirl swirl…", "🟠 Orange!"], fact: "Red and yellow are primary colours. Mixing them gives orange, a secondary colour." },
  { t: "The Magnet", setup: "🧲 → 🥄  🔩  🥤", q: "Which one will the magnet pull towards it?", o: ["Wooden spoon", "Iron nail", "Plastic cup"], a: 1, frames: ["🧲  🥄  🔩  🥤", "🧲 ⟵ 🔩", "🧲🔩 stuck together!"], fact: "Magnets attract iron and steel. Wood and plastic are not magnetic." },
  { t: "Melting Race", setup: "🧊☀️  vs  🧊🌳", q: "Two ice cubes: one in the sun, one in the shade. Which melts faster?", o: ["The one in the sun", "The one in the shade", "Both at the same speed"], a: 0, frames: ["🧊☀️   🧊🌳", "💧🧊   🧊", "💧💧 sun cube is almost gone!"], fact: "Sunlight adds heat, and heat makes ice melt faster." },
  { t: "Plant in the Dark", setup: "🌱 → 🗄️ (closet, 1 week)", q: "A green plant is kept in a dark closet for a week. What happens?", o: ["It grows bright green", "It turns pale and droopy", "It grows flowers"], a: 1, frames: ["🌱 goes into the dark", "🌱…🥀 (a week later)", "🍂 pale and weak"], fact: "Plants need light to make food (photosynthesis) and to stay green." },
  { t: "Fizzy Volcano", setup: "🥄 baking soda + 🍶 vinegar", q: "What happens when you mix baking soda and vinegar?", o: ["It freezes", "It fizzes with bubbles", "Nothing happens"], a: 1, frames: ["🥄 + 🍶", "🫧🫧🫧", "🌋 fizzing over!"], fact: "They react and make carbon dioxide gas — that's the bubbles!" },
  { t: "Shadow Play", setup: "🔦 → ✋ → 🌑", q: "You move the torch CLOSER to your hand. What happens to the shadow?", o: ["It gets bigger", "It gets smaller", "It disappears"], a: 0, frames: ["🔦 ..... ✋ 🌑", "🔦 .. ✋ 🌑🌑", "🔦 ✋ 🌑🌑🌑 bigger!"], fact: "The closer the light is to the object, the bigger the shadow it throws." },
  { t: "Balloon Static", setup: "🎈 rubbed on 💇 → 🧱", q: "You rub a balloon on your hair, then hold it near a wall. What happens?", o: ["It sticks to the wall", "It pops", "It floats up"], a: 0, frames: ["🎈 rub rub rub 💇", "⚡ static charge builds", "🎈🧱 sticks!"], fact: "Rubbing moves tiny charges onto the balloon, so it clings to the wall (static electricity)." },
  { t: "Sugar Dissolve", setup: "🍬 in ☕ hot  vs  🍬 in 🧊 cold", q: "Which glass dissolves the sugar faster?", o: ["Hot water", "Cold water", "Same speed"], a: 0, frames: ["🍬 → ☕   🍬 → 🧊💧", "☕ sugar melts away…", "☕ gone!  🧊💧 still grainy"], fact: "Hot water's tiny particles move faster, so they pull the sugar apart quicker." },
  { t: "Rubber Band Guitar", setup: "🎸 short band vs long band", q: "Which rubber band makes the HIGHER sound when plucked?", o: ["The short, tight one", "The long, loose one", "They sound the same"], a: 0, frames: ["🎵 pluck the long band: low", "🎶 pluck the short band…", "🎶 higher pitch!"], fact: "Shorter, tighter strings vibrate faster, and faster vibrations sound higher." },
  { t: "Puddle Mystery", setup: "🌧️ puddle → ☀️ hot day", q: "On a hot sunny day, what happens to a puddle?", o: ["It turns to ice", "It dries up (evaporates)", "It grows bigger"], a: 1, frames: ["💧 puddle in the morning", "☀️ ♨️ ♨️ ♨️", "…the puddle is gone!"], fact: "Heat turns the water into invisible water vapour. That's evaporation." },
  { t: "Cold Mirror", setup: "♨️ steam → 🪞❄️", q: "Warm steam touches a cold mirror. What forms on the mirror?", o: ["Tiny water droplets", "Sand", "Ice cubes"], a: 0, frames: ["♨️ → 🪞", "🌫️ the mirror fogs up", "💧💧 droplets!"], fact: "Cold surfaces cool the vapour back into liquid water. That's condensation." }
];

// Audit batch 4: 12 more experiments (24 total), topics + words for each, a hypothesis -> test ->
// conclusion flow where YOU run each step, a "what is this called?" word check, a scientist's notebook,
// topic badges, try-at-home tips, two slider experiments (shadow size, string pitch you can hear) and a
// weekly star experiment that pays double.
LAB.push(
  { t: "Ramp Race", setup: "🚗 on a low ramp  vs  🚗 on a high ramp", q: "Which toy car rolls farther?", o: ["The one from the high ramp", "The one from the low ramp", "They roll the same"], a: 0, frames: ["🚗⤵️ low · 🚗⤵️⤵️ high", "💨 both roll…", "🏁 the high-ramp car goes farther!"], fact: "A higher ramp gives the car more energy to turn into speed." },
  { t: "Paper Parachute", setup: "📄 flat sheet vs 📄 crumpled ball", q: "Drop both at the same time. Which lands first?", o: ["The crumpled ball", "The flat sheet", "Both together"], a: 0, frames: ["📄   🗞️ held up high", "⬇️🗞️   📄 floats…", "🗞️ lands first!"], fact: "The flat sheet has more air pushing against it (air resistance), so it falls slower." },
  { t: "Seed Sprint", setup: "🌱 watered daily vs 🌱 never watered", q: "After a week, which seed sprouts?", o: ["The watered one", "The dry one", "Neither"], a: 0, frames: ["🌰💧   🌰", "🌱💧   🌰", "🌿 sprouted · 🌰 still sleeping"], fact: "Seeds need water to wake up and start growing (germination)." },
  { t: "Rainbow Glass", setup: "☀️ → 🥛 glass of water", q: "Sunlight shines through a glass of water onto paper. What can appear?", o: ["A little rainbow", "A dark shadow only", "Snow"], a: 0, frames: ["☀️ ➡️ 🥛", "🌈 colours split…", "🌈 a rainbow on the paper!"], fact: "Water bends light, splitting white light into its colours (refraction)." },
  { t: "Salty Egg", setup: "🥚 in plain 💧 vs 🥚 in salty 💧🧂", q: "In which glass does the egg float?", o: ["Salty water", "Plain water", "Both"], a: 0, frames: ["🥚💧   🥚💧🧂", "⬇️🥚   🥚⬆️", "plain: sinks · salty: floats!"], fact: "Salt makes water denser, so it can hold the egg up." },
  { t: "Echo Hall", setup: "🗣️ in a big empty hall vs a soft bedroom", q: "Where will you hear an echo?", o: ["The big empty hall", "The soft bedroom", "Both the same"], a: 0, frames: ["🗣️ Hello!", "🔊 …hello… hello…", "🏛️ the hall echoes!"], fact: "Sound bounces off hard, far walls and comes back as an echo. Soft things soak it up." },
  { t: "Ice Balloon", setup: "🎈 put in the ❄️ freezer", q: "What happens to a balloon in the freezer?", o: ["It shrinks a little", "It gets bigger", "It pops"], a: 0, frames: ["🎈 → ❄️", "🎈… shrinking", "🎈 smaller!"], fact: "Cold air takes up less space, so the balloon shrinks." },
  { t: "Bean Phototropism", setup: "🌱 near a 🪟 window", q: "Which way does the plant lean after a few days?", o: ["Toward the window", "Away from the window", "Straight up only"], a: 0, frames: ["🌱 🪟", "🌱↗ 🪟", "🌿➡️🪟 leaning to the light!"], fact: "Plants grow toward light to make more food (phototropism)." },
  { t: "Floating Pencil", setup: "✏️ in a 🥛 glass of water", q: "Look at the pencil from the side. How does it look?", o: ["Bent or broken", "Perfectly straight", "Invisible"], a: 0, frames: ["✏️ ➡️ 🥛", "👀 look from the side", "✏️ looks bent!"], fact: "Light bends when it moves from water to air, so the pencil looks bent." },
  { t: "Fizzy Raisins", setup: "🍇 raisins in 🥤 fizzy water", q: "What do the raisins do?", o: ["Dance up and down", "Melt", "Turn into grapes"], a: 0, frames: ["🍇 sink…", "🫧 bubbles stick to them", "🍇⬆️⬇️ dancing!"], fact: "Gas bubbles lift the raisins up, then pop at the top so they sink again." },
  { t: "Lemon Battery", setup: "🍋 + copper + zinc → 💡", q: "Can a lemon make a tiny bit of electricity?", o: ["Yes, a little", "No, never", "Only if it's frozen"], a: 0, frames: ["🍋 + 🪙 + 🔩", "⚡ tiny current…", "💡 a small LED glows!"], fact: "The acid in the lemon helps two different metals make a tiny electric current." },
  { t: "Paper Bridge", setup: "📄 flat bridge vs 📄 folded (zig-zag) bridge", q: "Which bridge holds more coins?", o: ["The folded one", "The flat one", "Same"], a: 0, frames: ["📄 flat · 📄〰 folded", "🪙🪙 on each…", "flat sags · folded holds 🪙🪙🪙🪙!"], fact: "Folding makes the paper stiffer, so it can carry more weight." }
);
const TOPIC = ["water", "art", "forces", "heat", "plants", "chemistry", "light", "electricity", "heat", "sound", "water", "water", "forces", "forces", "plants", "light", "water", "sound", "heat", "plants", "light", "chemistry", "electricity", "forces"];
const WORD = ["density", "mixing", "magnetism", "melting", "photosynthesis", "reaction", "shadows", "static", "dissolving", "pitch", "evaporation", "condensation", "energy", "air resistance", "germination", "refraction", "density", "echo", "contraction", "phototropism", "refraction", "gas bubbles", "electric current", "strength"];
const HOME = { 0: "Try it in a bowl with things from the kitchen!", 3: "Put two ice cubes outside — one in the sun, one in the shade.", 6: "Use a torch in a dark room with your hand.", 9: "Stretch rubber bands over an open box.", 13: "Drop a flat and a crumpled sheet together.", 16: "Ask a grown-up to help with an egg and salt." };
LAB.forEach((e, i) => { e.topic = TOPIC[i] || "science"; e.word = WORD[i] || ""; e.home = HOME[i] || ""; e.i = i; });
const TOPIC_E = { water: "💧", art: "🎨", forces: "🧲", heat: "🔥", plants: "🌱", chemistry: "🧪", light: "💡", electricity: "⚡", sound: "🔊" };
const lsl = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lslw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let notebook = {}; try { notebook = JSON.parse(lsl("sl_notebook", "{}")) || {}; } catch (e) {}
const weekStar = (() => { const d = new Date(), w = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 604800000); return w % LAB.length; })();
function tone(f) { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.62); } catch (e) {} }

if (!player) $("sl-overlay").innerHTML = K.signedOutHtml("🧪");
else menu();

function menu() {
  const done = Object.keys(notebook).length, topics = {};
  LAB.forEach(e => { topics[e.topic] = topics[e.topic] || { all: 0, got: 0 }; topics[e.topic].all++; if (notebook[e.i]) topics[e.topic].got++; });
  $("sl-card").innerHTML = `<div class="kit-q">🧪 Welcome to the lab!</div><p class="kit-sub" style="text-align:center">Every experiment has 3 steps: make a <b>hypothesis</b> (guess), run the <b>test</b> yourself, then write the <b>conclusion</b>.</p>
    <button class="kit-btn block" id="sl-go" type="button">🔬 Start 6 experiments</button><button class="kit-btn alt block" id="sl-var" type="button">🎚️ Slider lab (change it and see)</button><button class="kit-btn alt block" id="sl-hyp" type="button">🧪 Hypothesis missions</button><button class="kit-btn alt block" id="sl-nb" type="button">📓 My notebook (${done}/${LAB.length})</button>
    <div class="sl-badges">${Object.entries(topics).map(([t, v]) => `<span class="${v.got >= v.all ? "on" : ""}">${TOPIC_E[t] || "⭐"} ${t} ${v.got}/${v.all}</span>`).join("")}</div>
    <div class="kit-sub" style="text-align:center;margin:8px 0 0">⭐ This week's star experiment: <b>${K.esc(LAB[weekStar].t)}</b> (double coins!)</div>`;
  $("sl-go").onclick = run; $("sl-nb").onclick = book; $("sl-var").onclick = sliderLab; $("sl-hyp").onclick = hypMenu;
}
function book() {
  $("sl-card").innerHTML = `<div class="kit-q">📓 Scientist's notebook</div>${LAB.map(e => { const n = notebook[e.i]; return `<div class="sl-note ${n ? "" : "off"}"><b>${TOPIC_E[e.topic] || ""} ${K.esc(e.t)}</b>${n ? `<br><small>${n.ok ? "✅ predicted right" : "🤔 surprise result"} · ${K.esc(e.word)}</small><br><small>${K.esc(e.fact)}</small>` : "<br><small>Not tried yet</small>"}</div>`; }).join("")}<button class="kit-btn block" id="sl-bk" type="button">Back</button>`;
  $("sl-bk").onclick = menu;
}
// Audit round 2: hypothesis missions -- predict, run 3 trials yourself with a slider, read the
// results chart, then decide if your hypothesis was right. Like a real experiment.
const MISSIONS = [
  { id: "ramp", em: "🛝", title: "Ramp and ball", ask: "If the ramp is steeper, the ball rolls…", opts: ["farther", "the same", "shorter"], right: 0, unit: "cm", label: "Ramp height", fn: v => Math.round(20 + v * 14 + Math.random() * 6), why: "A steeper ramp gives the ball more speed, so it rolls farther." },
  { id: "plant", em: "🌱", title: "Plant and sunlight", ask: "With more hours of sunlight each day, a bean plant grows…", opts: ["taller", "the same", "shorter"], right: 0, unit: "mm", label: "Sunlight (hours)", fn: v => Math.round(8 + v * 9 - (v > 8 ? (v - 8) * 6 : 0) + Math.random() * 4), why: "Plants use sunlight to make food (photosynthesis), so more light helps them grow — up to a point." },
  { id: "ice", em: "🧊", title: "Ice cube melting", ask: "In warmer water, an ice cube melts…", opts: ["faster", "the same", "slower"], right: 0, unit: "s", label: "Water warmth", fn: v => Math.round(240 - v * 20 + Math.random() * 8), why: "Warmer water has more heat energy to give to the ice, so it melts faster (less time)." }
];
function hypMenu() {
  $("sl-card").innerHTML = `<div class="kit-q">🧪 Hypothesis missions</div>${MISSIONS.map((m, i) => `<button class="kit-btn alt block" data-h="${i}" type="button">${m.em} ${m.title}${lsl("sl_hyp_" + m.id, "") ? " ✅" : ""}</button>`).join("")}<button class="kit-btn block" id="sl-bk" type="button">Back</button>`;
  $("sl-card").querySelectorAll("[data-h]").forEach(b => b.onclick = () => mission(MISSIONS[+b.dataset.h]));
  $("sl-bk").onclick = menu;
}
function mission(m) {
  $("sl-card").innerHTML = `<div class="kit-q">${m.em} ${m.title}</div><p class="kit-sub" style="text-align:center"><b>Hypothesis:</b> ${m.ask}</p>${m.opts.map((o, i) => `<button class="kit-opt" data-p="${i}" type="button" style="width:100%;margin-top:6px">${o}</button>`).join("")}`;
  $("sl-card").querySelectorAll("[data-p]").forEach(b => b.onclick = () => trials(m, +b.dataset.p));
}
function trials(m, pred) {
  const results = [];
  const draw = () => {
    const max = Math.max(1, ...results.map(r => r[1]));
    $("sl-card").innerHTML = `<div class="kit-q">${m.em} Run 3 trials</div><p class="kit-sub" style="text-align:center">Set the ${m.label.toLowerCase()} and press Run. Try a LOW, a MIDDLE and a HIGH setting.</p>
      <div class="sl-var"><b>${m.label}: <span id="sl-hv">5</span></b><input type="range" id="sl-hs" min="1" max="10" value="${[2, 5, 9][results.length] || 5}"></div>
      <button class="kit-btn block" id="sl-run" type="button" ${results.length >= 3 ? "disabled" : ""}>▶ Run trial ${Math.min(3, results.length + 1)}/3</button>
      <div class="sl-chart">${results.map(([v, r]) => `<div><i style="height:${Math.round(r / max * 100)}%"></i><b>${r}${m.unit}</b><small>${m.label.split(" ")[0]} ${v}</small></div>`).join("")}</div>
      ${results.length >= 3 ? `<button class="kit-btn block" id="sl-concl" type="button">📊 What did we find?</button>` : ""}`;
    $("sl-hv").textContent = $("sl-hs").value; $("sl-hs").oninput = () => { $("sl-hv").textContent = $("sl-hs").value; };
    $("sl-run").onclick = () => { const v = +$("sl-hs").value; results.push([v, m.fn(v)]); results.sort((a, b) => a[0] - b[0]); tone(300 + results.length * 120); draw(); };
    const c = $("sl-concl"); if (c) c.onclick = () => {
      const ok = pred === m.right, first = !lsl("sl_hyp_" + m.id, ""); if (first) lslw("sl_hyp_" + m.id, "1");
      K.record("science-lab", "hypothesis", ok);
      $("sl-card").innerHTML = `<div class="kit-big" style="text-align:center">${ok ? "🎉" : "🤔"}</div><div class="kit-q">${ok ? "Your hypothesis was right!" : "Surprise! The data says something else."}</div><p class="kit-sub" style="text-align:center">Result: ${m.opts[m.right]}. ${m.why}</p><div class="kit-bonus" id="sl-hb"></div><button class="kit-btn block" id="sl-bk2" type="button">More missions</button>`;
      if (first) K.finish("science-lab", ok ? 6 : 3, $("sl-hb"));
      $("sl-bk2").onclick = hypMenu;
    };
  };
  draw();
}
function sliderLab() {
  $("sl-card").innerHTML = `<div class="kit-q">🎚️ Slider lab</div>
    <div class="sl-var"><b>🔦 Shadow size</b><small>Move the torch: closer = ?</small><input type="range" id="sl-sh" min="1" max="10" value="5"><div class="sl-shadow"><span id="sl-hand">✋</span><span id="sl-shd" class="sl-shd"></span></div></div>
    <div class="sl-var"><b>🎸 String pitch</b><small>Make the string shorter and pluck it</small><input type="range" id="sl-pt" min="1" max="10" value="5"><button class="kit-btn" id="sl-pl" type="button">🎵 Pluck!</button><div id="sl-ptx" class="kit-sub"></div></div>
    <div class="kit-sub" style="text-align:center">💡 Conclusion: closer light → bigger shadow · shorter string → higher sound</div><button class="kit-btn block" id="sl-bk" type="button">Back</button>`;
  const sh = () => { const v = +$("sl-sh").value; $("sl-shd").style.transform = `scale(${0.6 + (11 - v) * 0.22})`; $("sl-hand").style.marginLeft = (v * 6) + "px"; };
  $("sl-sh").oninput = sh; sh();
  $("sl-pl").onclick = () => { const v = +$("sl-pt").value, f = 180 + (11 - v) * 70; tone(f); $("sl-ptx").textContent = `String length ${v}/10 → ${Math.round(f)} Hz ${v <= 3 ? "(high!)" : v >= 8 ? "(low)" : ""}`; };
  $("sl-bk").onclick = menu;
}
function run() {
  const pool = K.shuffle(LAB.filter(e => e.i !== weekStar)).slice(0, 5); pool.splice(K.rand(0, 5), 0, LAB[weekStar]);
  const set = pool;
  let i = 0, right = 0, words = 0;
  const show = () => {
    if (i >= set.length) return done();
    const e = set[i];
    $("sl-n").textContent = i + 1;
    const opts = e.o.map((t, k) => ({ t, ok: k === e.a })); const sh = K.shuffle(opts);
    $("sl-card").innerHTML = `<div class="sl-steps"><span class="on">1 Hypothesis</span><span>2 Test</span><span>3 Conclusion</span></div><div class="kit-sub" style="margin:0;font-weight:800;text-align:center">${e.i === weekStar ? "⭐ " : ""}${e.t} <small>${TOPIC_E[e.topic] || ""} ${e.topic}</small></div><div class="sl-bench"><div class="sl-scene" id="sl-scene">${e.setup}</div></div>
      <div class="kit-q">${K.esc(e.q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${sh.map((x, k) => `<button class="kit-opt" data-k="${k}">${K.esc(x.t)}</button>`).join("")}</div><div id="sl-out"></div>`;
    $("sl-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
      const pick = sh[+b.dataset.k], ok = pick.ok;
      K.record("science-lab", "science", ok);
      $("sl-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; });
      b.style.outline = "3px solid #3b7fc4";
      const steps = $("sl-card").querySelectorAll(".sl-steps span"); steps[1].classList.add("on");
      let f = 0; const sc = $("sl-scene");
      $("sl-out").innerHTML = `<button class="kit-btn block" id="sl-step" type="button">▶ Run step 1 of ${e.frames.length}</button>`;
      $("sl-step").onclick = () => {
        sc.textContent = e.frames[f]; sc.classList.remove("anim"); void sc.offsetWidth; sc.classList.add("anim"); f++;
        if (f < e.frames.length) { $("sl-step").textContent = `▶ Run step ${f + 1} of ${e.frames.length}`; return; }
        steps[2].classList.add("on");
        $("sl-card").querySelectorAll(".kit-opt").forEach((x, k) => { if (sh[k].ok) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong"); else { right++; $("sl-r").textContent = right; }
        notebook[e.i] = { ok, at: Date.now() }; lslw("sl_notebook", JSON.stringify(notebook));
        const others = K.shuffle(WORD.filter(w => w && w !== e.word)).slice(0, 2), wopts = K.shuffle([e.word].concat(others));
        $("sl-out").innerHTML = `<div class="sl-fact">${ok ? "🎉 Your hypothesis was right! " : "🤔 Not what you guessed — "}${K.esc(e.fact)}${e.home ? `<br><small>🏠 Try at home: ${K.esc(e.home)}</small>` : ""}</div>
          ${e.word ? `<div class="kit-sub" style="margin:10px 0 4px;font-weight:800;text-align:center">📝 Conclusion: what is this science word?</div><div class="kit-opts">${wopts.map(w => `<button class="kit-opt" data-w="${K.esc(w)}" type="button">${K.esc(w)}</button>`).join("")}</div>` : ""}
          <div style="text-align:center;margin-top:10px"><button class="kit-btn" id="sl-next">${i + 1 >= set.length ? "Finish" : "Next experiment"}</button></div>`;
        $("sl-out").querySelectorAll("[data-w]").forEach(x => x.onclick = () => { const good = x.dataset.w === e.word; if (good) words++; $("sl-out").querySelectorAll("[data-w]").forEach(y => { y.disabled = true; if (y.dataset.w === e.word) y.classList.add("right"); }); if (!good) x.classList.add("wrong"); });
        $("sl-next").onclick = () => { i++; show(); };
      };
    });
  };
  async function done() {
    $("sl-card").innerHTML = "";
    const star = set.some(e => e.i === weekStar);
    $("sl-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 5 ? "🏅" : "🔬"}</div><h2>Lab report</h2>
      <p class="kit-sub">You predicted ${right} of ${set.length} experiments correctly and named ${words} science word${words === 1 ? "" : "s"}.${star ? " ⭐ Star experiment done — double coins!" : ""}</p><div class="kit-bonus" id="sl-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">More experiments</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("science-lab", (3 + right * 2 + words) * (star ? 2 : 1), $("sl-bonus"));
  }
  show();
}
