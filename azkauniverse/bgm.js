// SolarQuest — background music.
// One looping track. Volume goes through the Web Audio API (GainNode), not
// the <audio> element's own .volume — iOS Safari ignores that property
// entirely (only the hardware volume buttons may change loudness), so a
// GainNode is the only way volume actually changes on iPhone.
//
// iOS Safari can also leave the AudioContext stuck in "suspended" even
// after resume() is called from directly inside a gesture handler — the
// promise it returns can silently never settle. So every gesture retries
// resume() (not just the first one), and each retry also plays a one-frame
// silent buffer through the context (the classic "kick" trick), which
// forces Safari to actually start the underlying audio hardware clock.

(function () {
  const VOLUME = 0.30;
  const FADE_MS = 400;

  const track = new Audio("audio/bgm/bgm.mp3");
  track.loop = true;
  track.preload = "auto";

  let ctx = null;
  let gain = null;
  let unlocked = false;

  function ensureAudioGraph() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(track);
    gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(ctx.destination);
  }

  function fadeIn() {
    if (!gain || !ctx) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(VOLUME, now + FADE_MS / 1000);
  }

  function kickAudioContext() {
    if (!ctx) return;
    ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  }

  function unlockOnce() {
    ensureAudioGraph();
    kickAudioContext();

    if (unlocked) return;
    unlocked = true;
    track.play().then(fadeIn).catch(err => console.warn("[bgm] playback blocked:", err));
  }

  // NOT one-time-only, because ctx.resume() can fail silently on iOS
  // Safari; every subsequent tap gets a chance to retry kicking the
  // AudioContext back into "running" (unlockOnce() itself still only
  // starts playback once, via the `unlocked` flag).
  ["pointerdown", "touchend", "click", "keydown"].forEach(evt =>
    document.addEventListener(evt, unlockOnce, { passive: true })
  );
})();
