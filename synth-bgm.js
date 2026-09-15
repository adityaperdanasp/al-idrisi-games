/* =================================================================
   AIGSynthBgm — a tiny, chill/silly looping background tune SYNTHESIZED
   live via the Web Audio API, not a recorded file (same reasoning as
   this codebase's existing Sound Pack cosmetics: zero new audio assets
   to source or license). A bouncy 10-step pentatonic pattern on a soft
   triangle wave, quiet enough to sit behind gameplay without competing
   with a read-aloud question.
   ================================================================= */

(function () {
  const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25 };
  // A short, playful pattern -- not a real melody, so there's nothing to
  // recognize or license, just a friendly bounce with a little breathing
  // room (the final `null` step) before it loops.
  const PATTERN = [
    { note: "C4", dur: 0.22 }, { note: "E4", dur: 0.22 }, { note: "G4", dur: 0.22 }, { note: "E4", dur: 0.22 },
    { note: "A4", dur: 0.22 }, { note: "G4", dur: 0.22 }, { note: "E4", dur: 0.22 }, { note: "D4", dur: 0.22 },
    { note: "C4", dur: 0.4 }, { note: null, dur: 0.5 }
  ];
  const VOLUME = 0.05;

  let ctx = null;
  let playing = false;
  let timerId = null;
  let stepIndex = 0;

  function ensureCtx() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
  }

  // iOS Safari can leave the AudioContext stuck in "suspended" even after
  // resume() is called from directly inside a gesture handler -- the
  // promise it returns can silently never settle. Playing a one-frame
  // silent buffer through the context (the classic "kick" trick, same
  // fix already proven in mathville/bgm.js) forces Safari to actually
  // start the underlying audio hardware clock; every gesture retries it,
  // not just the first one.
  function kickAudioContext() {
    if (!ctx) return;
    ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  }

  function playNote(freq, dur) {
    if (!ctx || !freq) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(VOLUME, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function scheduleStep() {
    if (!playing) return;
    const step = PATTERN[stepIndex % PATTERN.length];
    playNote(step.note ? NOTES[step.note] : null, step.dur);
    stepIndex++;
    timerId = setTimeout(scheduleStep, step.dur * 1000);
  }

  // Meant to be called from directly inside a user-gesture handler (a
  // Start/Begin button click) so ctx.resume() actually takes on iOS
  // Safari, same constraint as every other bgm module in this codebase.
  function start() {
    ensureCtx();
    if (!ctx || playing) return;
    kickAudioContext();
    playing = true;
    stepIndex = 0;
    scheduleStep();
  }

  function stop() {
    playing = false;
    if (timerId) clearTimeout(timerId);
    timerId = null;
  }

  // NOT one-time-only, for the same reason as mathville/bgm.js's
  // unlockOnce(): ctx.resume() can fail silently on iOS Safari, so every
  // subsequent tap gets a chance to retry kicking the AudioContext back
  // into "running".
  function unlockOnce() {
    ensureCtx();
    kickAudioContext();
  }
  ["pointerdown", "touchend", "click", "keydown"].forEach(evt =>
    document.addEventListener(evt, unlockOnce, { passive: true })
  );

  // One-shot "got a reward" chime -- a quick ascending arpeggio, louder
  // and snappier than the background loop's notes so it reads as a
  // distinct reward cue over the top of it.
  function playCollectChime() {
    ensureCtx();
    if (!ctx) return;
    kickAudioContext();
    const now = ctx.currentTime;
    [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = now + i * 0.09;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  window.AIGSynthBgm = { start, stop, playCollectChime };
})();
