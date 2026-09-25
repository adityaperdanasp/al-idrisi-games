/* =================================================================
   Escape Room Daily (PM round 11, item 5) -- the SAME 5 rooms for every
   player each day (seeded from the date), with a theme that changes each
   week. Each room hides one digit of the final 4-digit door code (room 5
   is the door itself). Rooms: number lock, word unscramble, number
   pattern, brain-teaser question, final code. A run pays once a day.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("ed-overlay").innerHTML = K.signedOutHtml("🗝️");
else K.ready().then(start);

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

const THEMES = [
  { name: "Pyramid", emoji: "🔺", scene: ["🏜️", "🏺", "🐪", "👁️"], words: ["PHARAOH", "MUMMY", "SPHINX", "SCARAB", "TOMB", "DESERT"] },
  { name: "Submarine", emoji: "🌊", scene: ["⚓", "🐙", "🫧", "🧭"], words: ["OCEAN", "TURTLE", "CORAL", "DOLPHIN", "ANCHOR", "SHARK"] },
  { name: "Castle", emoji: "🏰", scene: ["🗡️", "🛡️", "🐉", "👑"], words: ["KNIGHT", "DRAGON", "TOWER", "CROWN", "ROYAL", "BANNER"] },
  { name: "Space Station", emoji: "🚀", scene: ["🛰️", "🌍", "☄️", "👩‍🚀"], words: ["ROCKET", "PLANET", "GALAXY", "COMET", "ORBIT", "METEOR"] }
];

function start() {
  const day = new Date().toISOString().slice(0, 10);
  const wkIndex = Math.floor(new Date(day).getTime() / (7 * 86400000));
  const theme = THEMES[wkIndex % THEMES.length];
  const rng = mulberry(hashStr(day + "escape"));
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const digits = Array.from({ length: 4 }, () => ri(1, 9));
  $("ed-theme").textContent = `${theme.emoji} ${theme.name}`;

  // ---- room builders: each returns { title, render(el, solved) } ----
  const rooms = [];
  { // 1 -- number lock
    const a = ri(6, 12), b = ri(4, 9), c = ri(3, 30), ans = a * b + c;
    rooms.push({ title: "The Number Lock", scene: theme.scene[0], prompt: `The lock reads: (${a} × ${b}) + ${c}. Type the number to open it.`, kind: "text", answer: String(ans), hint: `${a} × ${b} = ${a * b}` });
  }
  { // 2 -- unscramble
    const w = theme.words[ri(0, theme.words.length - 1)];
    const letters = w.split(""); for (let i = letters.length - 1; i > 0; i--) { const j = ri(0, i); [letters[i], letters[j]] = [letters[j], letters[i]]; }
    rooms.push({ title: "The Scrambled Sign", scene: theme.scene[1], prompt: "The sign's letters fell off the wall! Put them back in order.", kind: "tiles", letters, answer: w, hint: `It starts with ${w[0]}` });
  }
  { // 3 -- pattern
    const start = ri(2, 9), step = ri(3, 8), seq = [0, 1, 2, 3].map(i => start + step * i), ans = start + step * 4;
    rooms.push({ title: "The Number Pattern", scene: theme.scene[2], prompt: `The wall says: ${seq.join(", ")}, ___ . What number comes next?`, kind: "text", answer: String(ans), hint: `Each number goes up by ${step}` });
  }
  { // 4 -- brain teaser (uses the shared question source; same for everyone that day is not guaranteed, so it is fixed at build time)
    const q = K.question({ subject: ri(0, 1) ? "sci" : "lang" });
    rooms.push({ title: "The Riddle Door", scene: theme.scene[3], prompt: q.prompt, kind: "mc", options: q.options, answer: q.correctLabel, key: q.key, hint: "Cross out the silliest answers first." });
  }
  rooms.push({ title: "The Final Door", scene: "🚪", prompt: "Enter the 4 digits you collected, in order, to escape!", kind: "text", answer: digits.join(""), hint: `The first digit is ${digits[0]}` });

  let idx = 0, secs = 0, penalty = 0, got = [], over = false;
  const clock = setInterval(() => { if (over) return; secs++; $("ed-time").textContent = fmt(secs + penalty); }, 1000);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function paintDigits() {
    $("ed-digits").innerHTML = digits.map((d, i) => `<div class="ed-digit ${i < got.length ? "" : "empty"}">${i < got.length ? d : "?"}</div>`).join("");
  }
  function show() {
    const r = rooms[idx];
    $("ed-n").textContent = idx + 1; $("ed-msg").textContent = "";
    paintDigits();
    let ui = `<div class="ed-scene">${r.scene}</div><div class="ed-title">${r.title}</div><div class="kit-q">${K.esc(r.prompt)}</div>`;
    if (r.kind === "text") ui += `<input class="ed-input" id="ed-in" inputmode="numeric" autocomplete="off" placeholder="Your answer"><button class="kit-btn block" id="ed-go">Try it</button>`;
    else if (r.kind === "mc") ui += `<div class="kit-opts">${r.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>`;
    else ui += `<div class="ed-slots" id="ed-slots"></div><div class="ed-tiles" id="ed-tiles"></div><button class="kit-btn alt" id="ed-clear" type="button">Clear</button>`;
    $("ed-room").innerHTML = ui;

    if (r.kind === "text") {
      const go = () => attempt($("ed-in").value.trim().replace(/[\s,]/g, ""));
      $("ed-go").onclick = go;
      $("ed-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); go(); } });
    } else if (r.kind === "mc") {
      $("ed-room").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => attempt(b.dataset.o, b));
    } else {
      let picked = [];
      const paint = () => {
        $("ed-slots").innerHTML = r.answer.split("").map((_, i) => `<div class="ed-slot">${picked[i] ? picked[i].ch : ""}</div>`).join("");
        $("ed-tiles").innerHTML = r.letters.map((ch, i) => `<button class="ed-tile ${picked.some(p => p.i === i) ? "used" : ""}" data-i="${i}">${ch}</button>`).join("");
        $("ed-tiles").querySelectorAll(".ed-tile").forEach(t => t.onclick = () => {
          const i = +t.dataset.i; if (picked.some(p => p.i === i)) return;
          picked.push({ i, ch: r.letters[i] }); paint();
          if (picked.length === r.answer.length) { const w = picked.map(p => p.ch).join(""); if (!attempt(w)) { picked = []; setTimeout(paint, 500); } }
        });
      };
      $("ed-clear").onclick = () => { picked = []; paint(); };
      paint();
    }
  }
  function attempt(val, btn) {
    const r = rooms[idx];
    const ok = String(val).toLowerCase() === String(r.answer).toLowerCase();
    if (r.key) K.record("escape-daily", r.key, ok);
    if (!ok) { $("ed-msg").textContent = "🔒 Still locked — try again!"; if (btn) { btn.classList.add("wrong"); btn.disabled = true; } penalty += 3; return false; }
    if (btn) btn.classList.add("right");
    if (idx < 4) got.push(digits[idx]);
    $("ed-msg").textContent = idx < 4 ? `🔓 Click! A digit appears: ${digits[idx]}` : "🚪 The door swings open!";
    paintDigits();
    setTimeout(() => { idx++; if (idx >= rooms.length) finish(); else show(); }, 1100);
    return true;
  }
  $("ed-hint").onclick = () => { penalty += 20; $("ed-msg").textContent = "💡 " + rooms[idx].hint; };

  async function finish() {
    over = true; clearInterval(clock);
    const total = secs + penalty;
    const coins = total < 240 ? 20 : total < 480 ? 15 : 10;
    $("ed-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎉</div><h2>You escaped!</h2>
      <p class="kit-sub">Time: <b>${fmt(total)}</b> (${theme.name} room)</p><div class="kit-bonus" id="ed-bonus"></div>
      <a class="kit-btn block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("escape-daily", coins, $("ed-bonus"));
  }
  show();
}
