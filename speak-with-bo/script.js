/* =================================================================
   Speak with Bo (PM round 11, item 19) -- read an English sentence out
   loud; the browser's speech recognition (webkitSpeechRecognition) listens
   and each word is marked green (heard) or red (missed). 80%+ = "Great!".
   Bo can read the sentence to you first (speechSynthesis). If the browser
   has no speech recognition, you can still practise by listening and
   reading -- it just doesn't score or pay coins.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const SENTENCES = [
  "The cat sat on the mat.", "I like to eat red apples.", "My friend has a small dog.", "We play in the park after school.",
  "The sun is bright and warm today.", "She reads a book every night.", "Birds can fly high in the sky.", "Our teacher gives us fun homework.",
  "The rainbow has seven beautiful colors.", "He rides his bicycle to the library.", "Can you help me carry these boxes?", "Fish swim in the deep blue ocean.",
  "Yesterday we visited my grandmother's house.", "The astronauts traveled to the moon in a rocket.", "Please put your shoes near the front door.",
  "I would like a glass of cold water.", "The children are painting a big picture together.", "Elephants are the largest animals on land.",
  "It rained heavily, so we stayed inside and played games.", "Learning new words makes my brain stronger."
];
const norm = s => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
// Marks each target word as heard or not (order-insensitive count match, so a repeated word needs to be said twice).
function scoreSpeech(target, heard) {
  const pool = {}; norm(heard).forEach(w => { pool[w] = (pool[w] || 0) + 1; });
  const words = target.split(/\s+/), marks = words.map(w => { const n = norm(w)[0]; if (n && pool[n] > 0) { pool[n]--; return true; } return false; });
  return { marks, words, pct: Math.round(marks.filter(Boolean).length / words.length * 100) };
}

if (!player) $("sp-overlay").innerHTML = K.signedOutHtml("🎤");
else start();

function start() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const set = K.shuffle(SENTENCES).slice(0, 5);
  let i = 0, great = 0, rec = null, listening = false, scoredAny = false, done = false;

  function show() {
    const s = set[i];
    $("sp-n").textContent = i + 1;
    $("sp-sent").innerHTML = s.split(/\s+/).map(w => `<span class="sp-w">${K.esc(w)}</span>`).join(" ");
    $("sp-heard").textContent = Rec ? "Tap the microphone and read the sentence out loud." : "Your browser can't listen, so this is practice-only: press 🔊, then read it aloud yourself!";
    $("sp-next").hidden = !Rec ? false : true;
    done = false;
  }
  $("sp-listen").onclick = () => {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(set[i]); u.lang = "en-US"; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) { $("sp-heard").textContent = "Bo can't speak on this device."; }
  };
  function judge(heard) {
    const r = scoreSpeech(set[i], heard);
    $("sp-sent").innerHTML = r.words.map((w, k) => `<span class="sp-w ${r.marks[k] ? "ok" : "bad"}">${K.esc(w)}</span>`).join(" ");
    const ok = r.pct >= 80;
    K.record("speak-with-bo", "speaking", ok);
    scoredAny = true; if (ok) great++; $("sp-g").textContent = great;
    $("sp-heard").textContent = `I heard: “${heard}” — ${r.pct}% ${ok ? "🌟 Great!" : "— try again or move on"}`;
    $("sp-next").hidden = false; done = true;
  }
  $("sp-mic").onclick = () => {
    if (!Rec) { $("sp-heard").textContent = "Speech recognition isn't available in this browser (try Chrome or Safari)."; return; }
    if (listening) { try { rec.stop(); } catch (e) {} return; }
    rec = new Rec(); rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => { listening = true; $("sp-mic").classList.add("rec"); $("sp-heard").textContent = "Listening… read the sentence!"; };
    rec.onresult = e => judge(e.results[0][0].transcript);
    rec.onerror = e => { $("sp-heard").textContent = e.error === "not-allowed" ? "Please allow the microphone to play." : "I couldn't hear that — try again!"; };
    rec.onend = () => { listening = false; $("sp-mic").classList.remove("rec"); };
    try { rec.start(); } catch (e) { $("sp-heard").textContent = "Couldn't start the microphone."; }
  };
  $("sp-next").onclick = async () => {
    i++;
    if (i >= set.length) {
      $("sp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${great >= 4 ? "🌟" : "🎤"}</div><h2>Nice speaking!</h2><p class="kit-sub">${scoredAny ? `${great}/5 sentences read really well.` : "Practice complete — great reading!"}</p><div class="kit-bonus" id="sp-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">More sentences</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      if (scoredAny) K.finish("speak-with-bo", great * 3, $("sp-bonus"));
      return;
    }
    show();
  };
  window.__scoreSpeech = scoreSpeech; // exposed for tests
  show();
}
