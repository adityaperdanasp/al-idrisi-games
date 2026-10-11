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

// Audit batch 6: tap the room to search (one object hides a free clue, one hides a secret gem),
// a key inventory, a colour lock on some days, 1-3 stars by mistakes, a best time + day streak,
// replay of the last 3 days (practice, no coins) and a secret bonus room when all 4 gems are found.
const lse = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsew = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const COLORS = [["🟥", "red"], ["🟦", "blue"], ["🟩", "green"], ["🟨", "yellow"]];
let PLAY_DAY = null;
function start() {
  if (PLAY_DAY === null) { return pickDay(); }
  const day = PLAY_DAY;
  const wkIndex = Math.floor(new Date(day).getTime() / (7 * 86400000));
  const theme = THEMES[wkIndex % THEMES.length];
  const rng = mulberry(hashStr(day + "escape"));
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const digits = Array.from({ length: 4 }, () => ri(1, 9));
  $("ed-theme").textContent = `${theme.emoji} ${theme.name}${day !== new Date().toISOString().slice(0, 10) ? " · replay " + day : ""}`;
  const practice = day !== new Date().toISOString().slice(0, 10);

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
  if (ri(0, 1)) { // 3 -- pattern
    const start = ri(2, 9), step = ri(3, 8), seq = [0, 1, 2, 3].map(i => start + step * i), ans = start + step * 4;
    rooms.push({ title: "The Number Pattern", scene: theme.scene[2], prompt: `The wall says: ${seq.join(", ")}, ___ . What number comes next?`, kind: "text", answer: String(ans), hint: `Each number goes up by ${step}` });
  } else { // 3b -- colour lock: continue the repeating colour pattern
    const unit = [0, 1, 2, 3].sort(() => rng() - 0.5).slice(0, ri(2, 3)), shown = Array.from({ length: unit.length * 2 }, (_, i) => unit[i % unit.length]), need = Array.from({ length: 3 }, (_, i) => unit[(shown.length + i) % unit.length]);
    rooms.push({ title: "The Colour Lock", scene: theme.scene[2], prompt: `The lights flash: ${shown.map(c => COLORS[c][0]).join(" ")} … Tap the next 3 colours!`, kind: "color", answer: need.map(c => COLORS[c][1]).join(","), hint: `The pattern repeats every ${unit.length} colours.` });
  }
  { // 4 -- brain teaser (uses the shared question source; same for everyone that day is not guaranteed, so it is fixed at build time)
    const q = K.question({ subject: ri(0, 1) ? "sci" : "lang" });
    rooms.push({ title: "The Riddle Door", scene: theme.scene[3], prompt: q.prompt, kind: "mc", options: q.options, answer: q.correctLabel, key: q.key, hint: "Cross out the silliest answers first." });
  }
  rooms.push({ title: "The Final Door", scene: "🚪", prompt: "Enter the 4 digits you collected, in order, to escape!", kind: "text", answer: digits.join(""), hint: `The first digit is ${digits[0]}` });

  let idx = 0, secs = 0, penalty = 0, got = [], over = false, mistakes = 0, gems = 0;
  const SPOT = rooms.map(() => ({ clue: ri(0, 3), gem: ri(0, 3) }));
  const clock = setInterval(() => { if (over) return; secs++; $("ed-time").textContent = fmt(secs + penalty); }, 1000);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function paintDigits() {
    $("ed-digits").innerHTML = digits.map((d, i) => `<div class="ed-digit ${i < got.length ? "" : "empty"}">${i < got.length ? d : "?"}</div>`).join("");
  }
  function show() {
    const r = rooms[idx];
    $("ed-n").textContent = idx + 1; $("ed-msg").textContent = "";
    paintDigits();
    $("ed-inv").innerHTML = `🎒 ${got.map(() => "🗝️").join("") || "empty"} ${gems ? "· 💎×" + gems : ""}`;
    const objs = idx < 4 ? ["🖼️", "🪴", "📦", "🕯️"] : [];
    let ui = `<div class="ed-scene">${r.scene}</div>${objs.length ? `<div class="ed-search">${objs.map((o, k) => `<button type="button" class="ed-obj" data-k="${k}">${o}</button>`).join("")}<small>Tap things to search the room</small></div>` : ""}<div class="ed-title">${r.title}</div><div class="kit-q">${K.esc(r.prompt)}</div>`;
    if (r.kind === "text") ui += `<input class="ed-input" id="ed-in" inputmode="numeric" autocomplete="off" placeholder="Your answer"><button class="kit-btn block" id="ed-go">Try it</button>`;
    else if (r.kind === "mc") ui += `<div class="kit-opts">${r.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>`;
    else if (r.kind === "color") ui += `<div class="ed-slots" id="ed-cs"></div><div class="ed-tiles">${COLORS.map(c => `<button class="ed-tile" type="button" data-c="${c[1]}">${c[0]}</button>`).join("")}</div><button class="kit-btn alt" id="ed-clear" type="button">Clear</button>`;
    else ui += `<div class="ed-slots" id="ed-slots"></div><div class="ed-tiles" id="ed-tiles"></div><button class="kit-btn alt" id="ed-clear" type="button">Clear</button>`;
    $("ed-room").innerHTML = ui;
    $("ed-room").querySelectorAll(".ed-obj").forEach(b => b.onclick = () => { const k = +b.dataset.k; b.disabled = true;
      if (k === SPOT[idx].gem) { gems++; b.textContent = "💎"; $("ed-msg").textContent = "💎 A secret gem! Find all 4 for the bonus room."; }
      else if (k === SPOT[idx].clue) { b.textContent = "📜"; $("ed-msg").textContent = "📜 A note: " + r.hint; }
      else { b.style.opacity = ".4"; $("ed-msg").textContent = "Nothing here…"; } $("ed-inv").innerHTML = `🎒 ${got.map(() => "🗝️").join("") || "empty"} ${gems ? "· 💎×" + gems : ""}`; });

    if (r.kind === "text") {
      const go = () => attempt($("ed-in").value.trim().replace(/[\s,]/g, ""));
      $("ed-go").onclick = go;
      $("ed-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); go(); } });
    } else if (r.kind === "mc") {
      $("ed-room").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => attempt(b.dataset.o, b));
    } else if (r.kind === "color") {
      let picked = [];
      const paintC = () => { $("ed-cs").innerHTML = [0, 1, 2].map(i => `<div class="ed-slot">${picked[i] ? COLORS.find(c => c[1] === picked[i])[0] : ""}</div>`).join(""); };
      $("ed-room").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { if (picked.length >= 3) return; picked.push(b.dataset.c); paintC(); if (picked.length === 3) { if (!attempt(picked.join(","))) { picked = []; setTimeout(paintC, 500); } } });
      $("ed-clear").onclick = () => { picked = []; paintC(); }; paintC();
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
    if (!ok) { mistakes++; $("ed-msg").textContent = "🔒 Still locked — try again!"; if (btn) { btn.classList.add("wrong"); btn.disabled = true; } penalty += 3; return false; }
    if (btn) btn.classList.add("right");
    if (idx < 4) got.push(digits[idx]);
    $("ed-msg").textContent = idx < 4 ? `🔓 Click! A digit appears: ${digits[idx]}` : "🚪 The door swings open!";
    paintDigits();
    setTimeout(() => { idx++; if (idx >= rooms.length) { if (gems >= 4 && !rooms.bonus) return bonusRoom(); finish(); } else show(); }, 1100);
    return true;
  }
  $("ed-hint").onclick = () => { penalty += 20; $("ed-msg").textContent = "💡 " + rooms[idx].hint; };

  function bonusRoom() {
    rooms.bonus = true; const a = ri(11, 19), b = ri(11, 19);
    $("ed-room").innerHTML = `<div class="ed-scene">💎✨</div><div class="ed-title">The Secret Gem Vault</div><div class="kit-q">All 4 gems found! Bonus riddle: ${a} + ${b} + ${a} = ?</div><input class="ed-input" id="ed-bin" inputmode="numeric" placeholder="Your answer"><button class="kit-btn block" id="ed-bgo" type="button">Open the vault</button>`;
    $("ed-bgo").onclick = () => { const ok = $("ed-bin").value.trim() === String(a * 2 + b); rooms.bonusWon = ok; $("ed-msg").textContent = ok ? "💎 The vault is yours! +5 bonus coins" : `It was ${a * 2 + b} — still, you escaped!`; setTimeout(finish, 1100); };
  }
  async function finish() {
    over = true; clearInterval(clock);
    const total = secs + penalty;
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const coins = practice ? 0 : (total < 240 ? 20 : total < 480 ? 15 : 10) + (rooms.bonusWon ? 5 : 0);
    // Audit round 2: key collection -- escaping any day of a theme week adds that theme's key.
    let keyNew = false;
    if (!practice) { let keys = {}; try { keys = JSON.parse(lse("ed_keys", "{}")) || {}; } catch (e) {} const kk = theme.name + "|" + wkIndex; if (!keys[kk]) { keys[kk] = theme.emoji; keyNew = true; lsew("ed_keys", JSON.stringify(keys)); } }
    if (!practice) { const bk = "ed_best_" + day; if (!lse(bk, "") || total < Number(lse(bk, "99999"))) lsew(bk, String(total));
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10), last = lse("ed_last", ""); if (last !== day) { lsew("ed_streak", String(last === y ? Number(lse("ed_streak", "0")) + 1 : 1)); lsew("ed_last", day); } }
    $("ed-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎉</div><h2>You escaped!</h2>
      <div style="font-size:1.6rem">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <p class="kit-sub">Time: <b>${fmt(total)}</b> (${theme.name} room) · ${mistakes} mistake${mistakes === 1 ? "" : "s"} · 💎 ${gems}/4 gems${practice ? "<br>Practice replay — no coins, but great training!" : `<br>🔥 ${lse("ed_streak", "1")}-day escape streak`}${keyNew ? `<br>🗝️ New key for your collection: ${theme.emoji} ${K.esc(theme.name)}!` : ""}<br><small>🗝️ Key ring: ${(() => { try { return Object.values(JSON.parse(lse("ed_keys", "{}"))).join(" ") || "—"; } catch (e) { return "—"; } })()}</small></p><div class="kit-bonus" id="ed-bonus"></div>
      <a class="kit-btn block" href="../game-room/">Game Room</a></div></div>`;
    if (coins) K.finish("escape-daily", coins, $("ed-bonus"));
  }
  show();
}
function pickDay() {
  const d = o => new Date(Date.now() - o * 86400000).toISOString().slice(0, 10), today = d(0), best = lse("ed_best_" + today, "");
  $("ed-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🧩</div><h2>Daily Puzzle Rooms</h2><p class="kit-sub">5 rooms, one door code — the same for everyone today.${best ? ` Your best today: ${Math.floor(best / 60)}:${String(best % 60).padStart(2, "0")}` : ""}</p>
    <button class="kit-btn block" type="button" data-day="0">🗝️ Play today's rooms</button>${[1, 2, 3].map(o => `<button class="kit-btn alt block" type="button" data-day="${o}">🔁 Replay ${d(o)} (practice)</button>`).join("")}</div></div>`;
  $("ed-overlay").querySelectorAll("[data-day]").forEach(b => b.onclick = () => { PLAY_DAY = d(+b.dataset.day); $("ed-overlay").innerHTML = ""; start(); });
}
