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

if (!player) $("sl-overlay").innerHTML = K.signedOutHtml("🧪");
else run();

function run() {
  const set = K.shuffle(LAB).slice(0, 6);
  let i = 0, right = 0;
  const show = () => {
    if (i >= set.length) return done();
    const e = set[i];
    $("sl-n").textContent = i + 1;
    // shuffle options but remember the right one
    const opts = e.o.map((t, k) => ({ t, ok: k === e.a })); const sh = K.shuffle(opts);
    $("sl-card").innerHTML = `<div class="kit-sub" style="margin:0;font-weight:800;text-align:center">${e.t}</div><div class="sl-bench"><div class="sl-scene" id="sl-scene">${e.setup}</div></div>
      <div class="kit-q">${K.esc(e.q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${sh.map((x, k) => `<button class="kit-opt" data-k="${k}">${K.esc(x.t)}</button>`).join("")}</div><div id="sl-out"></div>`;
    $("sl-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
      const pick = sh[+b.dataset.k], ok = pick.ok;
      K.record("science-lab", "science", ok);
      $("sl-card").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (sh[k].ok) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong"); else { right++; $("sl-r").textContent = right; }
      const sc = $("sl-scene");
      for (const f of e.frames) { sc.textContent = f; sc.classList.remove("anim"); void sc.offsetWidth; sc.classList.add("anim"); await new Promise(r => setTimeout(r, 900)); }
      $("sl-out").innerHTML = `<div class="sl-fact">${ok ? "🎉 Your prediction was right! " : "🤔 Not what you guessed — "}${K.esc(e.fact)}</div><div style="text-align:center;margin-top:10px"><button class="kit-btn" id="sl-next">${i + 1 >= set.length ? "Finish" : "Next experiment"}</button></div>`;
      $("sl-next").onclick = () => { i++; show(); };
    });
  };
  async function done() {
    $("sl-card").innerHTML = "";
    $("sl-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 5 ? "🏅" : "🔬"}</div><h2>Lab report</h2>
      <p class="kit-sub">You predicted ${right} of ${set.length} experiments correctly.</p><div class="kit-bonus" id="sl-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">New experiments</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("science-lab", 3 + right * 2, $("sl-bonus"));
  }
  show();
}
