/* =================================================================
   AIGJuice (PM round 9, item 15) -- tiny shared "feel" layer: a short
   haptic buzz plus a synthesized blip on every answer, with the blip's
   pitch climbing as the combo grows so a streak literally sounds like it's
   heating up. Purely additive: every call is wrapped so a missing Web
   Audio / vibrate API (desktop, iOS Safari has no vibrate) is a silent
   no-op, never an error. Honors prefers-reduced-motion by skipping the
   haptics, and a localStorage flag (aig_juice_off=1) lets it be muted.
   ================================================================= */
(function () {
  let ctx = null;
  function off() { try { return localStorage.getItem("aig_juice_off") === "1"; } catch (e) { return false; } }
  function reduced() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function audio() {
    if (ctx) return ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { ctx = null; }
    return ctx;
  }
  function blip(freq, dur, type, gainPeak) {
    const c = audio();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const t = c.currentTime;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  function buzz(pattern) {
    if (reduced() || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* unsupported -- fine */ }
  }
  // combo = current streak BEFORE this answer counts (0 for a first answer).
  function answer(isCorrect, combo) {
    // Purchased visuals (skin.js: answer burst, combo sticker) are NOT
    // silenced by the audio/haptic mute flag below.
    try { if (window.AIGSkin) AIGSkin.onAnswer(isCorrect, combo); } catch (e) { /* decorative */ }
    if (off()) return;
    try {
      if (isCorrect) {
        const step = Math.min(10, combo || 0);
        const base = 523.25 * Math.pow(2, step / 12 * 1.5); // climbs ~1.5x faster than a chromatic scale
        blip(base, 0.14, "triangle", 0.09);
        if (step >= 3) blip(base * 1.5, 0.16, "sine", 0.05); // a fifth on top once a streak forms
        buzz(step >= 5 ? [18, 30, 18] : 14);
      } else {
        blip(196, 0.22, "sawtooth", 0.05);
        buzz([40, 40, 40]);
      }
    } catch (e) { /* never let feel-good code break a game */ }
  }
  window.AIGJuice = { answer, setMuted(m) { try { localStorage.setItem("aig_juice_off", m ? "1" : "0"); } catch (e) {} } };
})();
