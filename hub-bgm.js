// Al Idrisi Games hub — background music
// One soft looping track for the "who's playing" + landing screens.
// Volume goes through the Web Audio API (GainNode), not the <audio>
// element's own .volume — iOS Safari ignores that property entirely (only
// the hardware volume buttons may change loudness), so a GainNode is the
// only way volume actually changes on iPhone.
//
// Stops naturally when the player taps into a game, since that's a full
// page navigation away from the hub.

(function () {
  const VOLUME = 0.30;
  const FADE_MS = 400;

  const track = new Audio("audio/bgm/hub.mp3");
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

  function unlockOnce() {
    if (unlocked) return;
    unlocked = true;
    ensureAudioGraph();
    if (ctx && ctx.state === "suspended") ctx.resume();
    track.play().then(fadeIn).catch(err => console.warn("[hub-bgm] playback blocked:", err));
  }

  ["pointerdown", "touchend", "click", "keydown"].forEach(evt =>
    document.addEventListener(evt, unlockOnce, { once: true, passive: true })
  );
})();
