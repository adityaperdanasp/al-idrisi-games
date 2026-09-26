/* =================================================================
   Voice Quiz (PM round 13, item 7) -- answer OUT LOUD. Bo can read each
   question (speechSynthesis); you say the answer and the browser's speech
   recognition picks the matching choice ("twelve" matches 12, "the second
   one" or "B" match the 2nd choice). Tapping an answer always works too,
   so it is fine on browsers without a microphone API. Great for mental
   maths and English practice without typing.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ORDINAL = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, last: 3 };
// "three hundred and forty two" -> "342" (numbers up to 9,999; other words are kept as they are)
function wordsToDigits(text) {
  const toks = text.toLowerCase().replace(/[^a-z0-9' ,.\-]/g, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t in ONES || t in TENS || t === "hundred" || t === "thousand") {
      let total = 0, cur = 0, j = i;
      for (; j < toks.length; j++) {
        const w = toks[j];
        if (w in ONES) cur += ONES[w]; else if (w in TENS) cur += TENS[w];
        else if (w === "hundred") cur = Math.max(1, cur) * 100;
        else if (w === "thousand") { total += Math.max(1, cur) * 1000; cur = 0; }
        else if (w === "and" && j + 1 < toks.length && (toks[j + 1] in ONES || toks[j + 1] in TENS)) continue;
        else break;
      }
      out.push(String(total + cur)); i = j - 1;
    } else out.push(t.replace(/,/g, ""));
  }
  return out;
}
const norm = s => wordsToDigits(String(s)).join(" ").replace(/[^a-z0-9 .<>=]/g, "").trim();
// Returns the index of the option the spoken text points at, or -1.
function matchSpeech(heard, options) {
  const h = norm(heard), toks = h.split(" ");
  // "a", "b", "c", "d" / "option b" / "the second one"
  const letter = toks.find(t => /^[abcd]$/.test(t)); const ord = toks.find(t => t in ORDINAL);
  const opts = options.map(norm);
  let best = -1, bestLen = 0;
  opts.forEach((o, i) => { if (!o) return; if ((" " + h + " ").includes(" " + o + " ") && o.length >= bestLen) { best = i; bestLen = o.length; } });
  if (best >= 0) return best;
  // Only fall back to a bare letter/ordinal if no option's text matched (so the word "a" inside a sentence can't hijack).
  if (ord !== undefined && ORDINAL[ord] < options.length) return ORDINAL[ord];
  if (letter && toks.length <= 3) return "abcd".indexOf(letter);
  // Comparison signs spoken as words
  if (options.includes("<") && /less/.test(h)) return options.indexOf("<");
  if (options.includes(">") && /(greater|more|bigger)/.test(h)) return options.indexOf(">");
  if (options.includes("=") && /(equal|same)/.test(h)) return options.indexOf("=");
  return -1;
}
window.__matchSpeech = matchSpeech;

if (!player) $("vq-overlay").innerHTML = K.signedOutHtml("🗣️");
else K.ready().then(start);

function start() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let n = 0, right = 0, q = null, locked = false, rec = null, listening = false;
  const LETTERS = ["A", "B", "C", "D"];

  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} }
  function next() {
    if (n >= 8) return finish();
    q = K.question({ difficulty: "easy" }); n++; locked = false;
    $("vq-n").textContent = n; $("vq-heard").textContent = Rec ? "Tap the mic and say your answer — or tap an answer." : "Your browser can't listen, so tap your answer (you can still press 🔊).";
    $("vq-q").textContent = q.prompt;
    $("vq-opts").innerHTML = q.options.map((o, i) => `<button class="kit-opt vq-opt" data-i="${i}"><span class="vq-l">${LETTERS[i]}</span> ${K.esc(o)}</button>`).join("");
    $("vq-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => choose(+b.dataset.i));
  }
  $("vq-listen").onclick = () => speak(q ? `${q.prompt}. ${q.options.map((o, i) => `${LETTERS[i]}: ${o}`).join(". ")}` : "");
  function choose(i) {
    if (locked) return; locked = true;
    const ok = q.options[i] === q.correctLabel;
    K.record("voice-quiz", q.key, ok, q);
    $("vq-opts").querySelectorAll(".kit-opt").forEach((b, k) => { b.disabled = true; if (q.options[k] === q.correctLabel) b.classList.add("right"); });
    if (!ok) $("vq-opts").querySelectorAll(".kit-opt")[i].classList.add("wrong"); else { right++; $("vq-r").textContent = right; }
    $("vq-heard").textContent = ok ? "🎉 Yes!" : `It was “${q.correctLabel}”.`;
    setTimeout(next, ok ? 1100 : 2200);
  }
  $("vq-mic").onclick = () => {
    if (locked) return;
    if (!Rec) { $("vq-heard").textContent = "Speech recognition isn't available here — tap an answer instead."; return; }
    if (listening) { try { rec.stop(); } catch (e) {} return; }
    rec = new Rec(); rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 3;
    rec.onstart = () => { listening = true; $("vq-mic").classList.add("rec"); $("vq-heard").textContent = "Listening…"; };
    rec.onresult = e => {
      let idx = -1, heard = e.results[0][0].transcript;
      for (let a = 0; a < e.results[0].length && idx < 0; a++) { heard = e.results[0][a].transcript; idx = matchSpeech(heard, q.options); }
      if (idx < 0) { $("vq-heard").textContent = `I heard “${heard}” but couldn't match it — try again or tap.`; return; }
      $("vq-heard").textContent = `I heard “${heard}”`; choose(idx);
    };
    rec.onerror = e => { $("vq-heard").textContent = e.error === "not-allowed" ? "Please allow the microphone." : "I couldn't hear that — try again!"; };
    rec.onend = () => { listening = false; $("vq-mic").classList.remove("rec"); };
    try { rec.start(); } catch (e) { $("vq-heard").textContent = "Couldn't start the microphone."; }
  };
  async function finish() {
    $("vq-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 6 ? "🌟" : "🗣️"}</div><h2>${right}/8 right</h2><p class="kit-sub">Speaking your answers out loud helps your brain remember them!</p><div class="kit-bonus" id="vq-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("voice-quiz", right * 2, $("vq-bonus"));
  }
  next();
}
