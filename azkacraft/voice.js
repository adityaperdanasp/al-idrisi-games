// AzkaSocial — voice encouragement
// Plays pre-recorded ElevenLabs MP3 clips from /audio (see
// scripts/generate-voice-lines.sh) — the app never calls the ElevenLabs
// API at runtime, so playing a line never costs credits. Falls back to
// the browser's SpeechSynthesis API only if a clip fails to load or play
// (e.g. missing file, autoplay blocked).

// Clips 1..NAME_FIRST_COUNT are phrased "name, then line" (e.g. "Arsya!
// That's exactly right!"); clips after that are phrased "line, then name"
// (e.g. "That's exactly right, Arsya!") — mixed for variety.
const PRAISE_CLIP_COUNT = 40;
const ENCOURAGE_CLIP_COUNT = 25;
const NAME_FIRST_COUNT = { praise: 25, encourage: 15 };

// Picked on the hub's "Siapa yang main?" screen and shared via localStorage
// (same origin); falls back to "Azka" if no one picked a name.
const CHILD_NAME = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "Azka";
const CHILD_ID = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().id) || "azka";

// Used only for the browser-voice fallback text — the real audio is the
// pre-recorded MP3 clips above (generic, not name-specific).
const PRAISE_PHRASES = [
  `Amazing job, ${CHILD_NAME}! You got it!`,
  `Wow ${CHILD_NAME}, that's exactly right!`,
  `${CHILD_NAME}, you're a superstar today!`,
  `Yes! ${CHILD_NAME} nailed it!`,
  `Fantastic work, ${CHILD_NAME}!`
];

const ENCOURAGE_PHRASES = [
  `Nice try, ${CHILD_NAME}! Mistakes help us learn, let's keep going!`,
  `That's okay, ${CHILD_NAME}! You'll get the next one!`,
  `Good effort, ${CHILD_NAME}! Learning takes practice!`,
  `No worries, ${CHILD_NAME}! Every try makes you smarter!`,
  `Keep your chin up, ${CHILD_NAME}! You're learning fast!`
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomClipNumber(count) {
  return String(Math.floor(Math.random() * count) + 1).padStart(2, "0");
}

function speakWithBrowser(text) {
  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = 1.15;
  utter.rate = 1.0;
  utter.lang = "en-US";

  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v =>
    /female|samantha|victoria|karen|moira|tessa|zira/i.test(v.name)
  );
  if (femaleVoice) utter.voice = femaleVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// Chains the name clip (audio/names/{id}.mp3) with the praise/encourage
// line, in whichever order this clip number is phrased for. If a clip is
// missing/fails, skips straight to whatever's left so playback still
// works, just without the name.
function playClip(kind, num, url, fallbackText) {
  const line = new Audio(url);
  const nameClip = new Audio(`audio/names/${CHILD_ID}.mp3`);
  const nameFirst = Number(num) <= NAME_FIRST_COUNT[kind];

  const playLine = () => {
    line.play().catch(err => {
      console.warn("Pre-recorded clip failed, falling back to browser voice:", err);
      speakWithBrowser(fallbackText);
    });
  };

  if (nameFirst) {
    nameClip.addEventListener("ended", playLine);
    nameClip.addEventListener("error", playLine);
    nameClip.play().catch(playLine);
  } else {
    line.addEventListener("ended", () => nameClip.play().catch(() => {}));
    line.addEventListener("error", () => speakWithBrowser(fallbackText));
    line.play().catch(() => speakWithBrowser(fallbackText));
  }
}

function speakPraise() {
  const n = randomClipNumber(PRAISE_CLIP_COUNT);
  playClip("praise", n, `audio/praise/praise-${n}.mp3`, pickRandom(PRAISE_PHRASES));
}

function speakEncouragement() {
  const n = randomClipNumber(ENCOURAGE_CLIP_COUNT);
  playClip("encourage", n, `audio/encourage/encourage-${n}.mp3`, pickRandom(ENCOURAGE_PHRASES));
}

window.AzkaVoice = { speakPraise, speakEncouragement };
