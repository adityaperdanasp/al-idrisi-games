// AzkaCraft — background music
// Two soft looping tracks: "menu" for Home/Chapters/Stickers/Multiplayer
// setup, "game" for the actual lesson screen. Auto-ducks (fades quieter)
// whenever a cheering voice line plays, then fades back up.
//
// Browsers block audio autoplay until the user interacts with the page,
// so playback only actually starts after the first tap/click.

const BGM_VOLUME = 0.20;      // normal background level
const DUCK_VOLUME = 0.02;     // level while a cheer/voice line is speaking
const FADE_MS = 350;

const tracks = {
  menu: new Audio("audio/bgm/menu.mp3"),
  game: new Audio("audio/bgm/game.mp3")
};
Object.values(tracks).forEach(t => {
  t.loop = true;
  t.volume = 0;
  t.preload = "auto";
});

let current = null;          // 'menu' | 'game' | null
let duckedUntil = 0;         // timestamp; volume target while Date.now() < this
let unlocked = false;
let pendingKey = null;       // which track to start once audio is unlocked

function targetVolume() {
  return Date.now() < duckedUntil ? DUCK_VOLUME : BGM_VOLUME;
}

// Each <audio> element gets its OWN fade animation (tracked on the element
// itself) — sharing one animation-frame id across both tracks meant fading
// track B in would cancel track A's fade-out mid-flight, leaving A stuck
// at a non-zero volume while B ramped up too, i.e. both audible at once.
function fadeTo(audio, vol) {
  if (audio._fadeRaf) cancelAnimationFrame(audio._fadeRaf);
  const start = audio.volume;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min(1, (now - startTime) / FADE_MS);
    audio.volume = start + (vol - start) * p;
    audio._fadeRaf = p < 1 ? requestAnimationFrame(step) : null;
  }
  audio._fadeRaf = requestAnimationFrame(step);
}

function play(key) {
  if (!unlocked) { pendingKey = key; return; }
  if (current === key) return;

  const next = tracks[key];
  const prev = current ? tracks[current] : null;
  current = key;

  if (prev && prev !== next) {
    fadeTo(prev, 0);
    setTimeout(() => prev.pause(), FADE_MS + 20);
  }
  next.play()
    .then(() => fadeTo(next, targetVolume()))
    .catch(err => console.warn("[bgm] playback blocked:", err));
}

// Lowers the current track's volume for `ms`, then restores it — call this
// right before playing a cheer/voice clip.
function duck(ms) {
  duckedUntil = Math.max(duckedUntil, Date.now() + (ms || 2500));
  if (current) fadeTo(tracks[current], DUCK_VOLUME);
  setTimeout(() => {
    if (Date.now() >= duckedUntil && current) fadeTo(tracks[current], targetVolume());
  }, (ms || 2500) + 20);
}

function unlockOnce() {
  if (unlocked) return;
  unlocked = true;

  // iOS Safari's autoplay allowance is per <audio> element, not per page —
  // starting a SECOND track later (e.g. switching to "game" when entering
  // a lesson) can get silently blocked if that element was never itself
  // played during a real user gesture. Prime every track right now, in
  // this same gesture, then immediately pause — silent (volume is still 0
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
