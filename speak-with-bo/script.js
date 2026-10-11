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

// Audit batch 4: modes (sentences by length, a story that moves forward, tongue twisters), karaoke
// highlighting while Bo reads, 1-3 stars per sentence, tap a red word to hear it, a saved "words to
// practise" list, and a no-microphone "listen & tap" mode.
const STORY = [["🪁", "Mia had a bright red kite."], ["💨", "The wind lifted it up into the sky."], ["🌳", "Oh no, the kite got stuck in a tree!"], ["🧗", "Her brother climbed up very carefully."], ["🎉", "They flew the kite together until sunset."]];
const TWISTERS = ["She sells sea shells by the sea shore.", "Red lorry, yellow lorry.", "Six slippery snails slid slowly.", "Fred fed Ted bread.", "Big black bugs bleed blue blood."];
// Audit round 2: topic packs (🐾 Animals, 🚀 Space) and 👂 Listen & pick -- Bo reads one sentence
// and you tap which of three it was (works with no microphone at all).
const PACKS = {
  animals: ["The tiger has orange fur and black stripes.", "A baby kangaroo lives in its mother's pouch.", "Owls can turn their heads very far.", "Penguins cannot fly but they swim fast.", "The giraffe eats leaves from tall trees."],
  space: ["The moon goes around the Earth.", "Mars is called the red planet.", "The sun is a very big star.", "Astronauts float inside the space station.", "Saturn has beautiful rings of ice."]
};
const lss = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lssw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const speak = (t, rate, onWord, onEnd) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = rate || 0.85; if (onWord) u.onboundary = e => { if (e.name === "word" || e.charIndex !== undefined) onWord(e.charIndex); }; if (onEnd) u.onend = onEnd; speechSynthesis.speak(u); } catch (e) {} };
if (!player) $("sp-overlay").innerHTML = K.signedOutHtml("🎤");
else pickMode();
function pickMode() {
  const saved = JSON.parse(lss("sp_words", "[]") || "[]");
  $("sp-sent").innerHTML = `<div class="kit-q" style="margin:0 0 8px">Choose a reading mode</div>
    <div class="sp-modes"><button class="kit-btn" data-m="short" type="button">🐣 Short sentences</button><button class="kit-btn" data-m="long" type="button">🦉 Longer sentences</button><button class="kit-btn" data-m="story" type="button">🪁 Story: The Red Kite</button><button class="kit-btn" data-m="twist" type="button">👅 Tongue twisters</button><button class="kit-btn" data-m="animals" type="button">🐾 Animals</button><button class="kit-btn" data-m="space" type="button">🚀 Space</button><button class="kit-btn" data-m="listen" type="button">👂 Listen &amp; pick (no mic)</button>${saved.length ? `<button class="kit-btn alt" data-m="words" type="button">📝 My tricky words (${saved.length})</button>` : ""}</div>`;
  $("sp-heard").textContent = ""; $("sp-next").hidden = true;
  document.querySelectorAll("[data-m]").forEach(b => b.onclick = () => start(b.dataset.m));
}

function listenPick() {
  const pool = K.shuffle(SENTENCES.concat(PACKS.animals, PACKS.space));
  let i = 0, right = 0;
  const ask = () => {
    if (i >= 5) { $("sp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">👂</div><h2>${right}/5 heard right!</h2><p class="kit-sub">Good listening helps good reading.</p><div class="kit-bonus" id="sp-bonus"></div><button class="kit-btn block" onclick="location.reload()">More</button></div></div>`; K.finish("speak-with-bo", right * 2, $("sp-bonus")); return; }
    const target = pool[i * 3], opts = K.shuffle([pool[i * 3], pool[i * 3 + 1], pool[i * 3 + 2]]);
    $("sp-n").textContent = i + 1;
    $("sp-sent").innerHTML = `<div class="kit-q" style="margin:0 0 6px">👂 Listen, then tap the sentence Bo said</div><button class="kit-btn block" id="sp-hear" type="button">🔊 Play it (again)</button>${opts.map(o => `<button class="kit-opt sp-pick" type="button" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}`;
    $("sp-heard").textContent = ""; $("sp-next").hidden = true;
    const play = () => speak(target, 0.85); $("sp-hear").onclick = play; setTimeout(play, 300);
    document.querySelectorAll(".sp-pick").forEach(b => b.onclick = () => { const ok = b.dataset.o === target; K.record("speak-with-bo", "listening", ok); document.querySelectorAll(".sp-pick").forEach(x => { x.disabled = true; if (x.dataset.o === target) x.classList.add("right"); }); if (ok) right++; else b.classList.add("wrong"); i++; setTimeout(ask, ok ? 900 : 1800); });
  };
  ask();
}
function start(mode) {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const saved = JSON.parse(lss("sp_words", "[]") || "[]");
  if (mode === "listen") return listenPick();
  const set = PACKS[mode] ? K.shuffle(PACKS[mode]).slice(0, 5) : mode === "story" ? STORY.map(x => x[1]) : mode === "twist" ? K.shuffle(TWISTERS).slice(0, 5) : mode === "words" ? saved.slice(0, 5).map(w => `${w[0].toUpperCase()}${w.slice(1)}.`)
    : K.shuffle(SENTENCES.filter(x => mode === "long" ? x.split(" ").length > 6 : x.split(" ").length <= 6)).slice(0, 5);
  while (set.length < 5) set.push(K.shuffle(SENTENCES)[0]);
  let stars = 0;
  let i = 0, great = 0, rec = null, listening = false, scoredAny = false, done = false;

  function show() {
    const s = set[i];
    $("sp-n").textContent = i + 1;
    $("sp-sent").innerHTML = (mode === "story" ? `<div class="sp-pic">${STORY.slice(0, i + 1).map(x => x[0]).join(" ")}</div>` : "") + s.split(/\s+/).map(w => `<span class="sp-w">${K.esc(w)}</span>`).join(" ") + (Rec ? "" : `<div class="kit-sub" style="margin-top:8px">No microphone here: press 🔊 and tap each word as Bo says it!</div>`);
    if (!Rec) { let next = 0; document.querySelectorAll("#sp-sent .sp-w").forEach((el, k) => el.onclick = () => { if (k === next) { el.classList.add("ok"); next++; if (next === s.split(/\s+/).length) { great++; $("sp-g").textContent = great; $("sp-heard").textContent = "🌟 You followed every word!"; } } else el.classList.add("bad"); }); }
    $("sp-heard").textContent = Rec ? "Tap the microphone and read the sentence out loud." : "Your browser can't listen, so this is practice-only: press 🔊, then read it aloud yourself!";
    $("sp-next").hidden = !Rec ? false : true;
    done = false;
  }
  $("sp-listen").onclick = () => {
    const s = set[i], starts = []; let pos = 0; s.split(/\s+/).forEach(w => { const k = s.indexOf(w, pos); starts.push(k); pos = k + w.length; });
    const els = () => document.querySelectorAll("#sp-sent .sp-w");
    if (!("speechSynthesis" in window)) { $("sp-heard").textContent = "Bo can't speak on this device."; return; }
    speak(s, 0.85, ci => { let idx = 0; starts.forEach((st, k) => { if (ci >= st) idx = k; }); els().forEach((el, k) => el.classList.toggle("now", k === idx)); }, () => els().forEach(el => el.classList.remove("now")));
  };
  function judge(heard) {
    const r = scoreSpeech(set[i], heard);
    $("sp-sent").innerHTML = r.words.map((w, k) => `<span class="sp-w ${r.marks[k] ? "ok" : "bad"}">${K.esc(w)}</span>`).join(" ");
    const ok = r.pct >= 80, st = r.pct >= 95 ? 3 : r.pct >= 80 ? 2 : r.pct >= 60 ? 1 : 0; stars += st;
    const missed = r.words.filter((w, k) => !r.marks[k]).map(w => w.toLowerCase().replace(/[^a-z']/g, "")).filter(Boolean);
    if (missed.length) { const cur = JSON.parse(lss("sp_words", "[]") || "[]"); lssw("sp_words", JSON.stringify([...new Set(missed.concat(cur))].slice(0, 20))); }
    setTimeout(() => document.querySelectorAll("#sp-sent .sp-w.bad").forEach(el => el.onclick = () => speak(el.textContent, 0.7)), 0);
    K.record("speak-with-bo", "speaking", ok);
    scoredAny = true; if (ok) great++; $("sp-g").textContent = great;
    $("sp-heard").textContent = `I heard: “${heard}” — ${r.pct}% ${"⭐".repeat(st)}${"☆".repeat(3 - st)} ${ok ? "Great!" : "— tap a red word to hear it, then try again"}`;
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
      $("sp-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${great >= 4 ? "🌟" : "🎤"}</div><h2>${mode === "story" ? "The End! 🪁" : "Nice speaking!"}</h2><p class="kit-sub">${scoredAny ? `${great}/5 sentences read really well · ${stars}/15 stars.` : "Practice complete — great reading!"}</p><div class="kit-bonus" id="sp-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">More sentences</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      if (scoredAny) K.finish("speak-with-bo", great * 3, $("sp-bonus"));
      return;
    }
    show();
  };
  window.__scoreSpeech = scoreSpeech; // exposed for tests
  show();
}
