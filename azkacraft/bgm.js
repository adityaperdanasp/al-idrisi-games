// AzkaCraft — background music
// Two soft looping tracks: "menu" for Home/Chapters/Stickers/Multiplayer
// setup, "game" for the actual lesson screen. Auto-ducks (fades quieter)
// whenever a cheering voice line plays, then fades back up.
//
// Browsers block audio autoplay until the user interacts with the page,
// so playback only actually starts after the first tap/click.

const BGM_VOLUME = 0.16;      // normal background level — quiet, stays out of the way
const DUCK_VOLUME = 0.045;    // level while a cheer/voice line is speaking
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
let fadeRaf = null;
let unlocked = false;
let pendingKey = null;       // which track to start once audio is unlocked

function targetVolume() {
  return Date.now() < duckedUntil ? DUCK_VOLUME : BGM_VOLUME;
}

function fadeTo(audio, vol) {
  cancelAnimationFrame(fadeRaf);
  const start = audio.volume;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min(1, (now - startTime) / FADE_MS);
    audio.volume = start + (vol - start) * p;
    if (p < 1) fadeRaf = requestAnimationFrame(step);
  }
  fadeRaf = requestAnimationFrame(step);
}

function play(key) {
  if (!unlocked) { pendingKey = key; return; }
  if (current === key) return;

  const next = tracks[key];
  const prev = current ? tracks[current] : null;
  current = key;

  if (prev && prev !== next) {
    fadeTo(prev, 0);
    setTimeout(() => { if (current !== key || true) prev.pause(); }, FADE_MS + 20);
  }
  next.currentTime = next.currentTime || 0;
  next.play().catch(() => {});
  fadeTo(next, targetVolume());
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
  if (pendingKey) play(pendingKey);
}

["pointerdown", "keydown"].forEach(evt =>
  document.addEventListener(evt, unlockOnce, { once: true, passive: true })
);

window.AIGBgm = { play, duck };
