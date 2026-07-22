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

  // iOS Safari sometimes leaves the AudioContext stuck in "suspended" even
  // after resume() is called from directly inside a gesture handler — the
  // promise it returns can silently never settle. Playing one frame of
  // silence through it (the classic "kick" trick) forces Safari to
  // actually start the underlying audio hardware clock.
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
    track.play().then(fadeIn).catch(err => console.warn("[hub-bgm] playback blocked:", err));
  }

  // NOT one-time-only, because ctx.resume() can fail silently on iOS
  // Safari; every subsequent tap gets a chance to retry kicking the
  // AudioContext back into "running" (unlockOnce() itself still only
  // starts playback once, via the `unlocked` flag).
  ["pointerdown", "touchend", "click", "keydown"].forEach(evt =>
    document.addEventListener(evt, unlockOnce, { passive: true })
  );

  // Clicking straight into a game card navigates away before the jingle
  // ever gets audible (unlockOnce()'s track.play() is async, and the
  // click's own navigation doesn't wait for it). Hold the navigation back
  // by a beat so the hub music actually gets heard before leaving.
  document.addEventListener("click", function (e) {
    const card = e.target.closest(".sc-game-card");
    if (!card || !card.href) return;
    e.preventDefault();
    setTimeout(() => { window.location.href = card.href; }, 250);
  });
})();
