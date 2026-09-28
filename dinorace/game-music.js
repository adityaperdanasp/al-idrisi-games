/* =================================================================
   AIGMusic (PM round 15) -- background music for every mini-game that had
   none. Fully synthesized with Web Audio (no audio files, nothing to
   license): a small step sequencer with bass, arpeggio, soft pad, a sparse
   melody and light drums, in ~10 moods. Each game folder is mapped to a mood
   in FOLDER_MOOD below, so a page only needs `<script src="../game-music.js">`
   (gamekit.js adds it to Game Room pages by itself).
   - Starts on the first tap/keypress (browsers block audio before that).
   - A small 🎵 button (next to the 🎧 radio) toggles it; the choice and the
     volume are remembered in localStorage (aig_music).
   - Yields to the study radio: if a radio track plays, the music stays quiet.
   - Pauses when the tab is hidden. Never touches games that ship their own
     BGM (mathville, azkacraft, azkauniverse, multipleazka, quiz-show,
     treasure-dig, the hub, music-corner).
   ================================================================= */
(function () {
  const KEY = "aig_music";
  // folder -> mood. Folders that are not listed (lessons, dashboards, voice games
  // where the microphone would hear the music, rhythm games with their own beat) stay silent.
  const FOLDER_MOOD = {
    basketball: "sport", "boss-rush": "action", "card-race": "sport", "city-builder": "chill", "my-town": "chill",
    "cooking-rush": "funny", "dance-battle": "dance", dinorace: "action", "dino-rider": "adventure", duel: "action",
    dungeon: "spooky", "escape-daily": "spooky", "escape-room": "spooky", "fortress-math": "action",
    "fractions-kitchen": "funny", "friend-duel": "sport", "geo-flight": "space", "island-adventure": "sea",
    "math-tennis": "sport", "memory-match": "chill", "monster-battle": "action", "number-line-jump": "funny",
    "parkour-run": "action", "pattern-puzzles": "chill", "quick-review": "zen", "science-lab": "space",
    "sea-mission": "sea", "space-race": "space", "story-maker": "zen", "treasure-map": "adventure",
    "weekly-boss": "action", "word-detective": "chill", "word-book": "zen", "zen-mode": "zen", "zombie-defense": "spooky"
  };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const MAJ = [0, 4, 7], MIN = [0, 3, 7], SUS = [0, 5, 7];
  // prog: [rootMidi, chordShape] per bar (8 eighth-note steps per bar)
  const MOODS = {
    chill:     { bpm: 92,  lead: "triangle", pad: 0.05, arp: [0, 1, 2, 1, 0, 1, 2, 3], melody: 0.35, scale: [0, 2, 4, 7, 9], drums: 0, prog: [[48, MAJ], [45, MIN], [41, MAJ], [43, MAJ]] },
    adventure: { bpm: 112, lead: "triangle", pad: 0.05, arp: [0, 2, 1, 2, 0, 2, 3, 2], melody: 0.5,  scale: [0, 2, 3, 5, 7, 8, 10], drums: 1, prog: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ]] },
    action:    { bpm: 140, lead: "sawtooth", pad: 0.03, arp: [0, 1, 2, 1, 0, 2, 1, 3], melody: 0.55, scale: [0, 3, 5, 7, 10], drums: 3, prog: [[40, MIN], [36, MAJ], [43, MAJ], [38, MAJ]] },
    space:     { bpm: 80,  lead: "sine",     pad: 0.09, arp: [0, 2, 3, 2, 1, 3, 2, 1], melody: 0.4,  scale: [0, 2, 3, 5, 7, 9, 10], drums: 0, prog: [[50, MIN], [46, MAJ], [43, MAJ], [45, MIN]] },
    sea:       { bpm: 100, lead: "sine",     pad: 0.07, arp: [0, 1, 2, 3, 2, 1, 2, 1], melody: 0.4,  scale: [0, 2, 4, 6, 7, 9, 11], drums: 1, prog: [[41, MAJ], [43, MAJ], [45, MIN], [38, MIN]] },
    spooky:    { bpm: 96,  lead: "triangle", pad: 0.07, arp: [0, 0, 2, 0, 1, 0, 2, 0], melody: 0.3,  scale: [0, 2, 3, 5, 7, 8, 11], drums: 1, prog: [[36, MIN], [41, MIN], [36, MIN], [43, MAJ]] },
    sport:     { bpm: 128, lead: "square",   pad: 0.03, arp: [0, 1, 2, 1, 2, 3, 2, 1], melody: 0.55, scale: [0, 2, 4, 7, 9], drums: 3, prog: [[43, MAJ], [48, MAJ], [45, MIN], [50, MAJ]] },
    funny:     { bpm: 122, lead: "square",   pad: 0.02, arp: [0, 3, 1, 3, 2, 3, 1, 3], melody: 0.6,  scale: [0, 2, 4, 5, 7, 9], drums: 2, prog: [[48, MAJ], [53, MAJ], [55, MAJ], [48, MAJ]] },
    dance:     { bpm: 118, lead: "sawtooth", pad: 0.04, arp: [0, 2, 1, 2, 0, 2, 3, 2], melody: 0.45, scale: [0, 3, 5, 7, 10], drums: 3, prog: [[45, MIN], [43, MAJ], [41, MAJ], [43, MAJ]] },
    zen:       { bpm: 68,  lead: "sine",     pad: 0.10, arp: [0, 1, 2, 1, 0, 1, 2, 1], melody: 0.25, scale: [0, 2, 4, 7, 9], drums: 0, prog: [[48, MAJ], [45, MIN], [41, MAJ], [48, SUS]] }
  };

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  let on = saved.on !== false, volume = typeof saved.vol === "number" ? saved.vol : 0.5;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ on, vol: volume })); } catch (e) {} };

  // Inline SVG icons (an emoji can render blank on some devices/fonts).
  const ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#5a3a5a" aria-hidden="true"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3H9z"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#5a3a5a" aria-hidden="true"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h6V3H9z"/><path d="M3 3l18 18" stroke="#e4572e" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  let ctx = null, master = null, timer = null, mood = null, step = 0, bar = 0, nextT = 0, started = false, btn = null;
  let noiseBuf = null;

  function folder() {
    const seg = location.pathname.split("/").filter(Boolean);
    for (let i = seg.length - 1; i >= 0; i--) { const s = seg[i].replace(/\.html$/, ""); if (FOLDER_MOOD[s]) return s; }
    return null;
  }
  const radioOn = () => !!(window.AIGRadio && AIGRadio.current);
  const shouldPlay = () => on && !radioOn() && !document.hidden;

  function ensureCtx() {
    if (ctx) return true;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0;
    // A gentle low-pass keeps saw/square voices soft behind spoken questions.
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.Q.value = 0.4;
    master.connect(lp); lp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const level = () => 0.16 * volume;
  function setMaster(v) { if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.15); }

  function tone(type, freq, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(freqs, t, dur, vol) {
    freqs.forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function noise(t, dur, vol, hp) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
  }
  // Deterministic little random, so the melody of a given bar is the same every loop (it feels composed).
  function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function playStep(m, s, b, t, spb) {
    const [root, shape] = m.prog[b % m.prog.length];
    const chord = [root, root + shape[1], root + shape[2]];
    const tones = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24];
    const eighth = spb / 2;
    if (s === 0) pad(chord.map(n => mtof(n + 12)), t, eighth * 8, m.pad);
    // bass
    if (s === 0 || s === 4) tone("triangle", mtof(root - 12), t, eighth * 1.8, 0.5);
    if (m.drums >= 2 && s === 6) tone("triangle", mtof(chord[2] - 12), t, eighth * 0.9, 0.35);
    // arpeggio
    tone(m.lead, mtof(tones[m.arp[s]]), t, eighth * 0.9, m.lead === "sine" ? 0.22 : 0.12);
    // melody (sparse, from the mood's scale, on the beat-ish steps)
    if (s % 2 === 0) {
      const r = rnd(b * 131 + s * 17 + m.bpm)();
      if (r < m.melody) {
        const rr = rnd(b * 977 + s * 31 + m.bpm);
        rr();
        const deg = m.scale[Math.floor(rr() * m.scale.length)];
        tone(m.lead === "sawtooth" ? "triangle" : m.lead, mtof(root + 24 + deg), t, eighth * 1.6, 0.16);
      }
    }
    // drums: 1 = soft hat on off-beats, 2 = hat + kick, 3 = kick, snare-ish and hats
    if (m.drums >= 1 && s % 2 === 1) noise(t, 0.04, 0.08, 7000);
    if (m.drums >= 2 && (s === 0 || s === 4)) kick(t, 0.5);
    if (m.drums >= 3 && (s === 2 || s === 6)) noise(t, 0.09, 0.14, 1800);
    if (m.drums === 3 && s % 2 === 0) noise(t, 0.03, 0.05, 8000);
  }

  function tick() {
    if (!ctx || !mood) return;
    const m = MOODS[mood], spb = 60 / m.bpm;
    while (nextT < ctx.currentTime + 0.35) {
      playStep(m, step, bar, nextT, spb);
      nextT += spb / 2; step++;
      if (step >= 8) { step = 0; bar++; }
    }
  }
  function begin() {
    if (!mood || !ensureCtx()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (!started) { started = true; nextT = ctx.currentTime + 0.1; step = 0; bar = 0; timer = setInterval(tick, 120); }
    else if (!timer) { nextT = ctx.currentTime + 0.1; timer = setInterval(tick, 120); }
    setMaster(shouldPlay() ? level() : 0);
  }
  function refresh() {
    if (ctx) setMaster(shouldPlay() ? level() : 0);
    if (btn) { btn.innerHTML = on && !radioOn() ? ICON_ON : ICON_OFF; btn.classList.toggle("off", !on || radioOn()); btn.title = on ? "Music on — tap to mute" : "Music off — tap to turn on"; }
  }
  function setOn(v) { on = v; persist(); if (on) begin(); refresh(); }

  function mountButton() {
    if (btn || !document.body) return;
    const st = document.createElement("style");
    st.textContent = `#aig-music-btn{position:fixed;right:54px;top:10px;z-index:99990;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.8);box-shadow:0 2px 6px rgba(0,0,0,.18);font-size:1rem;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}
      #aig-music-btn.off{opacity:.65}`;
    document.head.appendChild(st);
    btn = document.createElement("button"); btn.id = "aig-music-btn"; btn.type = "button"; btn.setAttribute("aria-label", "Toggle music");
    btn.onclick = e => { e.stopPropagation(); setOn(!on); };
    document.body.appendChild(btn); refresh();
  }

  function init() {
    const f = folder();
    mood = window.AIG_MUSIC_MOOD || (f && FOLDER_MOOD[f]); // a page can force a mood (standalone dinorace has no folder in its URL)
    if (!mood || !MOODS[mood]) return;
    mountButton();
    const arm = () => { if (on) begin(); refresh(); };
    // Audio may only start from a gesture; keep retrying on each one (iOS can silently stay suspended).
    ["pointerdown", "touchend", "click", "keydown"].forEach(ev => document.addEventListener(ev, arm, { passive: true }));
    document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) { setMaster(0); } else { if (ctx.state === "suspended") ctx.resume(); refresh(); } });
    if (window.AIGRadio && AIGRadio.onChange) AIGRadio.onChange(refresh);
    else setInterval(refresh, 2000); // the radio may load a moment after this script
  }

  window.AIGMusic = { setOn, get on() { return on; }, MOODS: Object.keys(MOODS), FOLDER_MOOD };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
