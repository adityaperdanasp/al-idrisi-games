// AzkaCraft — background music
// Two soft looping tracks: "menu" for Home/Chapters/Stickers/Multiplayer
// setup, "game" for the actual lesson screen. Auto-ducks (fades quieter)
// whenever a cheering voice line plays, then fades back up.
//
// Volume is controlled through the Web Audio API (GainNode), NOT the
// <audio> element's own .volume property — iOS Safari deliberately makes
// HTMLMediaElement.volume a no-op (only the physical volume buttons are
// allowed to change loudness), so setting audio.volume in JS silently does
// nothing on iPhone even though it works fine on desktop/Android. Routing
// through a GainNode actually attenuates the signal, so it works
// everywhere.
//
// Browsers also block audio autoplay until the user interacts with the
// page, so playback only actually starts after the first tap/click.

const BGM_VOLUME = 0.20;      // normal background level (relative to the
                               // cheering voice clips, which play at full volume)
const DUCK_VOLUME = 0.02;     // level while a cheer/voice line is speaking
const FADE_MS = 350;

const tracks = {
  menu: new Audio("audio/bgm/menu.mp3"),
  game: new Audio("audio/bgm/game.mp3")
};
Object.values(tracks).forEach(t => {
  t.loop = true;
  t.preload = "auto";
});

let ctx = null;
const gainNodes = {};

// Wires each <audio> element through the Web Audio graph exactly once
// (createMediaElementSource throws if called twice on the same element).
// Must happen inside/soon after a user gesture, same as starting playback.
function ensureAudioGraph() {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return; // no Web Audio support — tracks will just play at full volume
  ctx = new AudioCtx();
  Object.keys(tracks).forEach(key => {
    const source = ctx.createMediaElementSource(tracks[key]);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(ctx.destination);
    gainNodes[key] = gain;
  });
}

let current = null;          // 'menu' | 'game' | null
let duckedUntil = 0;         // timestamp; volume target while Date.now() < this
let unlocked = false;
let pendingKey = null;       // which track to start once audio is unlocked

function targetVolume() {
  return Date.now() < duckedUntil ? DUCK_VOLUME : BGM_VOLUME;
}

// Ramps a track's gain smoothly — each key has its own GainNode, so fading
// one track out can never interfere with another fading in.
function fadeTo(key, vol) {
  const gain = gainNodes[key];
  if (!gain || !ctx) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(vol, now + FADE_MS / 1000);
}

function play(key) {
  if (!unlocked) { pendingKey = key; return; }
  if (current === key) return;

  const next = tracks[key];
  const prevKey = current;
  current = key;

  if (prevKey && prevKey !== key) {
    fadeTo(prevKey, 0);
    setTimeout(() => tracks[prevKey].pause(), FADE_MS + 20);
  }
  next.play()
    .then(() => fadeTo(key, targetVolume()))
    .catch(err => console.warn("[bgm] playback blocked:", err));
}

// Lowers the current track's volume for `ms`, then restores it — call this
// right before playing a cheer/voice clip.
function duck(ms) {
  duckedUntil = Math.max(duckedUntil, Date.now() + (ms || 2500));
  if (current) fadeTo(current, DUCK_VOLUME);
  setTimeout(() => {
    if (Date.now() >= duckedUntil && current) fadeTo(current, targetVolume());
  }, (ms || 2500) + 20);
}

function unlockOnce() {
  if (unlocked) return;
  unlocked = true;

  ensureAudioGraph();
  if (ctx && ctx.state === "suspended") ctx.resume();

  // iOS Safari's autoplay allowance is per <audio> element, not per page —
  // starting a SECOND track later (e.g. switching to "game" when entering
  // a lesson) can get silently blocked if that element was never itself
  // played during a real user gesture. Prime every track right now, in
  // this same gesture, then immediately pause — silent (gain is still 0
  // at this point), but it "unlocks" each element for later.
  //
  // The real playback (play(pendingKey), below) only starts once every
  // priming pause() has actually happened — otherwise a priming pause()
  // landing AFTER the real fade-in started would silently cut it off.
  const priming = Object.values(tracks).map(t => {
    const p = t.play();
    return p && p.then ? p.then(() => t.pause()).catch(() => {}) : Promise.resolve();
  });

  Promise.all(priming).then(() => {
    if (pendingKey) play(pendingKey);
  });
}

// Several event types, all one-shot — iOS Safari is picky about which
// gesture it treats as "real" for unlocking audio, so listen broadly
// rather than betting on just one.
["pointerdown", "touchend", "click", "keydown"].forEach(evt =>
  document.addEventListener(evt, unlockOnce, { once: true, passive: true })
);

window.AIGBgm = { play, duck };

// Temporary debug hook — lets us inspect Web Audio state from Safari's
// remote Web Inspector on a real iPhone. Safe to remove once the iOS
// audio issue is diagnosed.
window.AIGBgmDebug = () => ({
  ctxState: ctx ? ctx.state : "no ctx yet",
  unlocked,
  current,
  pendingKey,
  gains: Object.fromEntries(Object.entries(gainNodes).map(([k, g]) => [k, g.gain.value])),
  trackPaused: Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.paused])),
  trackReadyState: Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.readyState])),
  trackError: Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, t.error ? t.error.message : null]))
});
