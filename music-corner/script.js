/* =================================================================
   Music Corner (PM round 13, item 9) -- turn something you want to
   remember (a times table, the planets, the months) into a little song.
   Tap up to 16 notes on an 8-key pentatonic keyboard (so any tune sounds
   nice), pick a tempo, press Play: each note lights up the next word of
   your "memory pack". Songs are saved under players/{id}/songs (max 8).
   Sounds are synthesized with Web Audio -- no audio files.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const KEYS = [["C", 261.63], ["D", 293.66], ["E", 329.63], ["G", 392.0], ["A", 440.0], ["C²", 523.25], ["D²", 587.33], ["E²", 659.25]];
const table = n => Array.from({ length: 10 }, (_, i) => `${n} × ${i + 1} = ${n * (i + 1)}`);
const PACKS = {
  ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9].map(n => [`t${n}`, { name: `${n} times table`, words: table(n) }])),
  planets: { name: "Planets", words: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"] },
  months: { name: "Months of the year", words: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
  days: { name: "Days of the week", words: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  colors: { name: "Rainbow colours", words: ["Red", "Orange", "Yellow", "Green", "Blue", "Indigo", "Violet"] }
};
const MAX_NOTES = 16, MAX_SONGS = 8;
// Audit batch 5: instruments, ready-made tunes, a demo on arrival, a "fill the missing word" memory
// game and a "tap with the beat" rhythm game on any tune, plus composer badges.
const INSTR = { triangle: "🎹 Soft piano", square: "👾 8-bit", sine: "🪈 Flute", sawtooth: "🎻 Buzzy strings" };
const TUNES = [["⭐ Twinkle", [0, 0, 3, 3, 4, 4, 3, 2, 2, 1, 1, 0]], ["🎢 Up & down", [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0]], ["🐸 Hop hop", [0, 2, 0, 2, 3, 4, 3, 2, 0, 2, 4, 5]], ["🌊 Waves", [2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3]]];
let instrument = "triangle";

if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("🎼"));
else init();

async function init() {
  let ctx = null, seq = [], playing = false, songs = {};
  const db = AIGLeaderboard.db;
  const path = `players/${player.id}/songs`;

  $("mc-pack").innerHTML = Object.entries(PACKS).map(([id, p]) => `<option value="${id}">${p.name}</option>`).join("");
  $("mc-keys").innerHTML = KEYS.map((k, i) => `<button class="mc-key" data-i="${i}" type="button">${k[0]}</button>`).join("");

  function tone(i, durMs) {
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === "suspended") ctx.resume();
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = instrument; o.frequency.value = KEYS[i][1];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.25, durMs / 1000));
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + Math.max(0.3, durMs / 1000) + 0.05);
    } catch (e) { /* silent */ }
  }
  const words = () => PACKS[$("mc-pack").value].words;
  function drawSeq(now) {
    $("mc-seq").innerHTML = seq.length ? seq.map((k, i) => `<span class="mc-note ${i === now ? "now" : ""}">${KEYS[k][0]}</span>`).join("") : '<span class="kit-sub" style="margin:0">Tap keys to write your tune…</span>';
  }
  $("mc-keys").querySelectorAll(".mc-key").forEach(b => b.onclick = () => {
    const i = +b.dataset.i; tone(i, 400);
    if (playing || seq.length >= MAX_NOTES) return;
    seq.push(i); drawSeq(-1);
    $("mc-lyric").textContent = words()[(seq.length - 1) % words().length];
  });
  $("mc-undo").onclick = () => { if (!playing) { seq.pop(); drawSeq(-1); } };
  $("mc-clear").onclick = () => { if (!playing) { seq = []; drawSeq(-1); $("mc-lyric").textContent = "🎵"; } };
  $("mc-pack").onchange = () => { if (seq.length) $("mc-lyric").textContent = words()[0]; };

  async function play(notes, packId, tempo) {
    if (playing || !notes.length) return;
    playing = true; const w = PACKS[packId] ? PACKS[packId].words : words();
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i], tempo * 1.2); $("mc-lyric").textContent = w[i % w.length];
      if (notes === seq) drawSeq(i);
      await new Promise(r => setTimeout(r, tempo));
    }
    $("mc-lyric").textContent = "🎵 Nice!"; if (notes === seq) drawSeq(-1); playing = false;
  }
  $("mc-play").onclick = () => play(seq, $("mc-pack").value, +$("mc-tempo").value);

  async function loadSongs() {
    try { const s = await db.ref(path).get(); songs = s.exists() ? s.val() : {}; } catch (e) { songs = {}; }
    const list = Object.entries(songs).sort((a, b) => b[1].at - a[1].at);
    $("mc-songs").innerHTML = list.length ? list.map(([id, s]) => `<div class="mc-song"><span>🎶 ${K.esc(s.title)}<br><small style="font-weight:700;color:#8a7a6a">${K.esc((PACKS[s.pack] || {}).name || "")} · ${s.notes.length} notes</small></span><span><button class="kit-btn" data-p="${id}" style="padding:6px 12px">▶</button> <button class="kit-btn alt" data-d="${id}" style="padding:6px 12px">✕</button></span></div>`).join("") : '<div class="kit-sub" style="margin:0">Your saved songs will appear here.</div>';
    $("mc-songs").querySelectorAll("[data-p]").forEach(b => b.onclick = () => { const s = songs[b.dataset.p]; play(s.notes, s.pack, s.tempo || 420); });
    $("mc-songs").querySelectorAll("[data-d]").forEach(b => b.onclick = async () => { if (confirm("Delete this song?")) { await db.ref(`${path}/${b.dataset.d}`).remove(); loadSongs(); } });
  }
  $("mc-save").onclick = async () => {
    if (!seq.length) { $("mc-msg").textContent = "Write a tune first — tap some keys!"; return; }
    if (Object.keys(songs).length >= MAX_SONGS) { $("mc-msg").textContent = `You can keep ${MAX_SONGS} songs — delete one first.`; return; }
    const title = $("mc-title").value.trim() || PACKS[$("mc-pack").value].name + " song";
    await db.ref(path).push({ title: title.slice(0, 24), notes: seq.slice(), pack: $("mc-pack").value, tempo: +$("mc-tempo").value, at: Date.now() });
    $("mc-msg").textContent = "💾 Saved!"; $("mc-title").value = ""; loadSongs();
    K.finish("music-corner", 4, null); // small once-a-day bonus for making music
  };
  // ---- audit batch 5 extras ----
  $("mc-extra").innerHTML = `<div class="mc-row" style="flex-wrap:wrap"><span style="font-weight:800">Sound:</span>${Object.entries(INSTR).map(([k, l]) => `<button type="button" class="mc-chip ${k === instrument ? "on" : ""}" data-in="${k}">${l}</button>`).join("")}</div>
    <div class="mc-row" style="flex-wrap:wrap"><span style="font-weight:800">Tunes:</span>${TUNES.map((t, i) => `<button type="button" class="mc-chip" data-tu="${i}">${t[0]}</button>`).join("")}</div>
    <div class="mc-row"><button class="kit-btn" id="mc-memo" type="button">🧠 Memory game</button><button class="kit-btn alt" id="mc-beat" type="button">🥁 Tap the beat</button></div>`;
  $("mc-extra").querySelectorAll("[data-in]").forEach(b => b.onclick = () => { instrument = b.dataset.in; $("mc-extra").querySelectorAll("[data-in]").forEach(x => x.classList.toggle("on", x === b)); tone(4, 300); });
  $("mc-extra").querySelectorAll("[data-tu]").forEach(b => b.onclick = () => { if (playing) return; seq = TUNES[+b.dataset.tu][1].slice(0, MAX_NOTES); drawSeq(-1); play(seq, $("mc-pack").value, +$("mc-tempo").value); });
  function overlay(html) { const o = document.createElement("div"); o.className = "kit-overlay"; o.innerHTML = `<div class="kit-modal">${html}</div>`; document.body.appendChild(o); return o; }
  $("mc-memo").onclick = async () => {
    const tune = seq.length ? seq.slice() : TUNES[0][1], pack = $("mc-pack").value, w = PACKS[pack].words;
    let round = 0, right = 0;
    const o = overlay(`<h2>🧠 Memory game</h2><p class="kit-sub" id="mm-t">Listen to the song first…</p><div class="mc-lyric" id="mm-l">🎵</div><div class="kit-opts" id="mm-o"></div>`);
    const listen = async () => { for (let i = 0; i < Math.min(tune.length, w.length); i++) { tone(tune[i], 500); o.querySelector("#mm-l").textContent = w[i % w.length]; await new Promise(r => setTimeout(r, 480)); } };
    await listen();
    const ask = () => {
      if (round >= 5) { o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">${right >= 4 ? "🌟" : "🎵"}</div><h2>${right}/5 remembered!</h2><div class="kit-bonus" id="mm-b"></div><button class="kit-btn block" id="mm-x" type="button">Done</button>`; o.querySelector("#mm-x").onclick = () => o.remove(); K.finish("music-corner", right * 2, o.querySelector("#mm-b")); return; }
      const k = K.rand(0, Math.min(tune.length, w.length) - 1), opts = K.shuffle([w[k]].concat(K.shuffle(w.filter(x => x !== w[k])).slice(0, 3)));
      o.querySelector("#mm-t").textContent = `Line ${k + 1} of the song is missing! Which one is it? (${round + 1}/5)`; o.querySelector("#mm-l").textContent = `${k ? w[k - 1] + " …" : ""} ❓ ${k < w.length - 1 ? "… " + w[k + 1] : ""}`;
      tone(tune[k % tune.length], 600);
      o.querySelector("#mm-o").innerHTML = opts.map(x => `<button class="kit-opt" type="button" data-o="${K.esc(x)}">${K.esc(x)}</button>`).join("");
      o.querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === w[k]; K.record("music-corner", pack, ok); if (ok) right++; o.querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === w[k]) x.classList.add("right"); }); if (!ok) b.classList.add("wrong"); round++; setTimeout(ask, ok ? 700 : 1500); });
    };
    ask();
  };
  $("mc-beat").onclick = () => {
    const tune = seq.length ? seq.slice() : TUNES[0][1], tempo = +$("mc-tempo").value; let i = 0, hits = 0, lit = -1, litAt = 0, tm;
    const o = overlay(`<h2>🥁 Tap the beat</h2><p class="kit-sub">Tap the big button every time a note lights up!</p><div class="mc-beatrow" id="bt-row">${tune.map(n => `<span>${KEYS[n][0]}</span>`).join("")}</div><button class="mc-drum" id="bt-tap" type="button">TAP</button><div class="kit-bonus" id="bt-s">0 hits</div>`);
    const spans = o.querySelectorAll("#bt-row span");
    o.querySelector("#bt-tap").onclick = () => { if (lit >= 0 && performance.now() - litAt < tempo * 0.6 && !spans[lit].dataset.hit) { spans[lit].dataset.hit = 1; spans[lit].classList.add("hit"); hits++; o.querySelector("#bt-s").textContent = `${hits} hits`; } };
    const step = () => { if (i >= tune.length) { clearTimeout(tm); setTimeout(() => { o.querySelector(".kit-modal").innerHTML = `<div class="kit-big">${hits >= tune.length - 1 ? "🌟" : "🥁"}</div><h2>${hits}/${tune.length} beats!</h2><button class="kit-btn block" id="bt-x" type="button">Done</button>`; o.querySelector("#bt-x").onclick = () => o.remove(); if (hits === tune.length) K.toastAdv("Perfect rhythm!"); }, 500); return; }
      spans.forEach(sp => sp.classList.remove("now")); lit = i; litAt = performance.now(); spans[i].classList.add("now"); tone(tune[i], tempo); i++; tm = setTimeout(step, tempo); };
    setTimeout(step, 600);
  };
  const n = Object.keys(songs).length;
  setTimeout(() => { const c = Object.keys(songs).length; $("mc-badges").innerHTML = [[c >= 1, "🎵 First song"], [c >= 3, "🎶 3 songs"], [c >= 8, "🎼 Full album"]].map(([ok, l]) => `<span class="${ok ? "on" : ""}">${l}</span>`).join(""); }, 1500);
  // demo once per device
  try { if (!localStorage.getItem("mc_demo")) { localStorage.setItem("mc_demo", "1"); seq = TUNES[0][1].slice(); drawSeq(-1); setTimeout(() => $("mc-lyric").textContent = "Press ▶ Play to hear a demo!", 300); } } catch (e) {}
  drawSeq(-1); loadSongs();
}
