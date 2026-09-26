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
      o.type = "triangle"; o.frequency.value = KEYS[i][1];
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
  drawSeq(-1); loadSongs();
}
