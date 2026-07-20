// AzkaSocial — voice encouragement
// Plays pre-recorded ElevenLabs MP3 clips from /audio (see
// scripts/generate-voice-lines.sh) — the app never calls the ElevenLabs
// API at runtime, so playing a line never costs credits. Falls back to
// the browser's SpeechSynthesis API only if a clip fails to load or play
// (e.g. missing file, autoplay blocked).

const PRAISE_CLIP_COUNT = 20;
const ENCOURAGE_CLIP_COUNT = 20;

// Used only for the browser-voice fallback text — the real audio is the
// pre-recorded MP3 clips above.
const PRAISE_PHRASES = [
  "Amazing job, Azka! You got it!",
  "Wow Azka, that's exactly right!",
  "Azka, you're a superstar today!",
  "Yes! Azka nailed it!",
  "Fantastic work, Azka!"
];

const ENCOURAGE_PHRASES = [
  "Nice try, Azka! Mistakes help us learn, let's keep going!",
  "That's okay, Azka! You'll get the next one!",
  "Good effort, Azka! Learning takes practice!",
  "No worries, Azka! Every try makes you smarter!",
  "Keep your chin up, Azka! You're learning fast!"
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

function playClip(url, fallbackText) {
  const audio = new Audio(url);
  audio.play().catch(err => {
    console.warn("Pre-recorded clip failed, falling back to browser voice:", err);
    speakWithBrowser(fallbackText);
  });
}

function speakPraise() {
  const n = randomClipNumber(PRAISE_CLIP_COUNT);
  playClip(`audio/praise/praise-${n}.mp3`, pickRandom(PRAISE_PHRASES));
}

function speakEncouragement() {
  const n = randomClipNumber(ENCOURAGE_CLIP_COUNT);
  playClip(`audio/encourage/encourage-${n}.mp3`, pickRandom(ENCOURAGE_PHRASES));
}

window.AzkaVoice = { speakPraise, speakEncouragement };
