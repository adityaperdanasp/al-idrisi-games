/* =================================================================
   Science Lab (PM round 11, item 9) -- predict, then watch. Each session
   is 6 experiments drawn from a bank of 12. You pick a prediction, the
   bench plays the result in emoji, and a one-line "why" explains it.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

// Term 2: every experiment is tied to the school's Science workbook (energy, light, the eye, the Moon, eclipses).
const LAB = [
  {"t": "Rub-a-dub Heat", "setup": "🙌 rub rub rub", "q": "You rub your hands together quickly. What energy do you feel?", "o": ["Heat", "Light", "Sound only"], "a": 0, "frames": ["🙌 rub… rub… rub…", "🔥 your hands feel warm", "♨️ movement became heat!"], "fact": "Rubbing turns movement energy into heat energy. Energy is not lost - it is transformed."},
  {"t": "Solar Calculator", "setup": "🧮☀️ → 🧮✋", "q": "A solar calculator is covered with your hand. What happens?", "o": ["The display fades", "It works even better", "It plays music"], "a": 0, "frames": ["🧮 in the sunlight ☀️", "✋ cover the solar cell", "🧮 the display fades!"], "fact": "A solar cell turns light energy into electrical energy. With no light there is no electricity."},
  {"t": "Torch Energy Chain", "setup": "🔋 → 💡 → 🔦", "q": "What energy changes make a torch shine?", "o": ["Chemical → electrical → light", "Sound → heat", "Light → movement"], "a": 0, "frames": ["🔋 chemical energy in the battery", "⚡ becomes electrical energy", "💡 and then light (and a little heat)!"], "fact": "A battery stores chemical energy. The torch changes it to electrical energy and then to light energy."},
  {"t": "Straight-Line Light", "setup": "🔦 → 🃏 🃏 🃏", "q": "Three cards each have a hole. What must you do to see the torch light through all three holes?", "o": ["Line the holes up in a straight line", "Bend the cards", "Turn the torch off"], "a": 0, "frames": ["🔦 + 3 cards with holes", "↔️ slide the cards around", "🔦━━━ lined up: light shines through!"], "fact": "Light travels in straight lines, so it only passes if the holes are in a straight line."},
  {"t": "See-Through Test", "setup": "📄 🪟 🧱 → 🔦", "q": "Which material lets some light through, but you cannot see clearly through it?", "o": ["Tissue paper", "Clear glass", "A wooden board"], "a": 0, "frames": ["🔦 → 📄 🪟 🧱", "🔦 → 📄 (a glow)", "🪟 clear · 📄 glowing · 🧱 dark"], "fact": "Tissue paper is translucent: some light passes through, but the picture is blurry. Glass is transparent and wood is opaque."},
  {"t": "Shadow Length", "setup": "🌅 ☀️ 🌇 → 🧍", "q": "In the early morning the Sun is low in the sky. How long is your shadow?", "o": ["Long", "Short", "You have no shadow"], "a": 0, "frames": ["🌅 low Sun", "🧍➡️ ━━━━━ long shadow", "☀️ midday: a short shadow!"], "fact": "When the Sun is low, shadows are long. At midday the Sun is high and shadows are shortest."},
  {"t": "Pupil Power", "setup": "👁️ 💡 → 👁️ 🌑", "q": "You walk from a dark room into bright sunlight. What happens to your pupils?", "o": ["They get smaller", "They get bigger", "They disappear"], "a": 0, "frames": ["👁️ in the dark: big pupils", "💡 bright light!", "👁️ small pupils protect the eye"], "fact": "The iris makes the pupil smaller in bright light so less light enters the eye, and bigger in the dark so more light enters."},
  {"t": "Moon in a Room", "setup": "💡 + ⚽ (a ball)", "q": "Hold a ball near a lamp in a dark room and slowly turn around with it. What do you see on the ball?", "o": ["Lit parts that change like moon phases", "The ball melting", "The ball changing colour"], "a": 0, "frames": ["💡 lamp · ⚽ ball · 🧍 you", "🔄 turn slowly…", "🌒🌓🌔🌕 phases of the ball!"], "fact": "We only see the part of the ball that the lamp lights up - exactly why the Moon seems to change shape."},
  {"t": "Eclipse Model", "setup": "💡 + ⚽ small + 🌍 big", "q": "You hold a small ball between a lamp (Sun) and a bigger ball (Earth). What does the small ball's shadow show?", "o": ["A solar eclipse", "A lunar eclipse", "A new year"], "a": 0, "frames": ["💡 Sun · 🌕 Moon · 🌍 Earth", "🌕 moves between 💡 and 🌍", "🌑 shadow on Earth: solar eclipse!"], "fact": "When the Moon is between the Sun and Earth, its shadow falls on Earth - that is a solar eclipse."},
  {"t": "Pinhole Viewer", "setup": "📦 + pinhole + paper", "q": "What is a SAFE way to watch a solar eclipse?", "o": ["A pinhole viewer or eclipse glasses", "Ordinary sunglasses", "A quick look at the Sun"], "a": 0, "frames": ["📦 a box with a tiny hole", "☀️ → 🕳️ → 📄", "👀 watch the image, not the Sun!"], "fact": "Never look at the Sun directly. A pinhole viewer projects an image onto paper so you can watch safely."},
  {"t": "Drum Sound", "setup": "🥁 + 🍚 rice grains", "q": "You tap a drum with rice grains on top. What do the grains do?", "o": ["Jump around", "Stay perfectly still", "Melt"], "a": 0, "frames": ["🥁 + 🍚 on top", "👋 tap!", "🍚🍚 jump - movement makes sound!"], "fact": "Hitting the drum makes it vibrate. Movement energy becomes sound energy, and the grains bounce."},
  {"t": "Rainbow Glass", "setup": "☀️ → 🥛 glass of water", "q": "Sunlight shines through a glass of water onto paper. What can appear?", "o": ["A little rainbow", "A dark shadow only", "Snow"], "a": 0, "frames": ["☀️ ➡️ 🥛", "🌈 the colours split…", "🌈 a rainbow on the paper!"], "fact": "Water bends light, splitting white light into its colours."},
  {"t": "Floating Pencil", "setup": "✏️ in a 🥛 glass of water", "q": "Look at the pencil from the side. How does it look?", "o": ["Bent or broken", "Perfectly straight", "Invisible"], "a": 0, "frames": ["✏️ ➡️ 🥛", "👀 look from the side", "✏️ looks bent!"], "fact": "Light bends when it moves from water to air, so the pencil looks bent."},
  {"t": "Plant Power", "setup": "☀️ → 🌿 → 🍃", "q": "Plants turn light energy from the Sun into…", "o": ["Chemical energy (food)", "Sound energy", "Electrical energy"], "a": 0, "frames": ["☀️ light energy", "🌿 the leaf catches it", "🍃 chemical energy stored as food!"], "fact": "Plants change the Sun's light energy into chemical energy that is stored in their food."}
];
const TOPIC = ["energy", "energy", "energy", "light", "light", "light", "eye", "space", "space", "space", "energy", "light", "light", "energy"];
const WORD = ["friction", "solar cell", "energy chain", "light travels straight", "translucent", "shadows", "pupil", "moon phases", "eclipse", "solar viewer", "vibration", "refraction", "refraction", "photosynthesis"];
const HOME = {"0": "Rub your hands together hard for 10 seconds.", "1": "Use a solar calculator by a sunny window, then cover the panel.", "2": "Look at the battery in a torch - what energy is stored inside?", "3": "Use a torch and three index cards with holes punched in the middle.", "4": "Shine a torch through tissue paper, a clear glass and a book.", "5": "Measure your shadow with chalk in the morning, at midday and in the afternoon.", "6": "Look at a friend's eyes in dim light, then in bright light.", "7": "Use a lamp in a dark room and a ball held at arm's length.", "8": "Use a lamp, a small ball and a big ball in a dark room.", "9": "Ask a grown-up to help you make a solar viewer from card, foil and paper.", "10": "Put a few grains of rice on a drum or a tight tray and tap it.", "11": "Put a glass of water on a sunny window sill, with a sheet of paper below.", "12": "Stand a pencil in a clear glass of water and look from the side.", "13": "Look at a plant on a window sill - which way do its leaves face?"};
LAB.forEach((e, i) => { e.topic = TOPIC[i] || "science"; e.word = WORD[i] || ""; e.home = HOME[i] || ""; e.i = i; });
const TOPIC_E = { water: "💧", art: "🎨", forces: "🧲", heat: "🔥", plants: "🌱", chemistry: "🧪", light: "💡", electricity: "⚡", sound: "🔊", energy: "⚡", eye: "👁️", space: "🌙" };
const lsl = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lslw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let notebook = {}; try { notebook = JSON.parse(lsl("sl_notebook_t2", "{}")) || {}; } catch (e) {}
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
        notebook[e.i] = { ok, at: Date.now() }; lslw("sl_notebook_t2", JSON.stringify(notebook));
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
