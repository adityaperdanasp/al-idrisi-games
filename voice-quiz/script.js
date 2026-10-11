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
else K.ready().then(intro);
// Audit batch 4: a radio show -- three themed rounds (maths, words, science) and a triple-points
// jackpot finale, a buzzer race against Bo-Bot (answer before it buzzes for full points), +1 for
// answering out loud, applause on a 3-streak, a duo mode for two players on one phone, and an
// average-speed stat at the end.
let duo = false, ears = false;
// Audit round 2: 🎧 Ears-only mode (the question text stays hidden -- Bo reads it out and you answer
// from the choices; text appears after you answer) and a best-score record.
function applause() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), len = a.sampleRate * 0.8, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (Math.random() < 0.3 ? 1 : 0.2); const src = a.createBufferSource(), g = a.createGain(); src.buffer = b; g.gain.value = 0.12; src.connect(g); g.connect(a.destination); src.start(); } catch (e) {} }
function intro() {
  $("vq-q").textContent = "📻 Welcome to Bo's Radio Quiz!";
  $("vq-opts").innerHTML = `<div class="kit-sub" style="grid-column:1/-1;text-align:center">3 rounds + a jackpot question. Beat Bo-Bot to the buzzer! Answering out loud earns a bonus point.</div><button class="kit-btn" id="vq-solo" type="button" style="grid-column:1/-1">🎤 Solo show</button><button class="kit-btn alt" id="vq-duo" type="button" style="grid-column:1/-1">👫 Duo show (take turns on one phone)</button>`;
  $("vq-opts").insertAdjacentHTML("beforeend", `<label class="vq-ears" style="grid-column:1/-1"><input type="checkbox" id="vq-ears"> 🎧 Ears-only mode — Bo reads, you listen (no question text)</label>`);
  $("vq-ears").onchange = e => { ears = e.target.checked; };
  $("vq-solo").onclick = () => { duo = false; start(); }; $("vq-duo").onclick = () => { duo = true; start(); };
}

function start() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let n = 0, right = 0, q = null, locked = false, rec = null, listening = false, points = [0, 0], streak = 0, botT = null, t0 = 0, times = [], byVoice = false;
  const SUBJ = ["math", "math", "math", "lang", "lang", "lang", "sci", null], ROUND = ["Round 1: Maths", "Round 1: Maths", "Round 1: Maths", "Round 2: Words", "Round 2: Words", "Round 2: Words", "Round 3: Science", "💰 JACKPOT!"];
  const LETTERS = ["A", "B", "C", "D"];

  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} }
  function next() {
    if (n >= 8) return finish();
    q = K.question({ difficulty: n === 7 ? "medium" : "easy", subject: SUBJ[n] || undefined }); n++; locked = false; byVoice = false; t0 = performance.now();
    $("vq-round").textContent = `${ROUND[n - 1]}${duo ? ` · ${n % 2 ? "Player 1" : "Player 2"}'s turn` : ""} · Score ${duo ? `${points[0]} – ${points[1]}` : points[0]}`;
    clearTimeout(botT); const bot = K.bot; botT = setTimeout(() => { if (locked) return; $("vq-heard").textContent = `📻 ${bot.emoji} ${bot.name} buzzed! Answer now for 1 point.`; q.botBuzzed = true; }, Math.max(2500, bot.speedMs * 0.8));
    $("vq-n").textContent = n; $("vq-heard").textContent = Rec ? "Tap the mic and say your answer — or tap an answer." : "Your browser can't listen, so tap your answer (you can still press 🔊).";
    $("vq-q").textContent = ears ? "🎧 Listen…" : q.prompt;
    if (ears) setTimeout(() => speak(`${q.prompt}. ${q.options.map((o, i) => `${LETTERS[i]}: ${o}`).join(". ")}`), 250);
    $("vq-opts").innerHTML = q.options.map((o, i) => `<button class="kit-opt vq-opt" data-i="${i}"><span class="vq-l">${LETTERS[i]}</span> ${K.esc(o)}</button>`).join("");
    $("vq-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => choose(+b.dataset.i));
  }
  $("vq-listen").onclick = () => speak(q ? `${q.prompt}. ${q.options.map((o, i) => `${LETTERS[i]}: ${o}`).join(". ")}` : "");
  function choose(i) {
    if (locked) return; locked = true;
    clearTimeout(botT); times.push(performance.now() - t0);
    const ok = q.options[i] === q.correctLabel;
    const pl = duo && n % 2 === 0 ? 1 : 0, mult = n === 8 ? 3 : 1;
    if (ok) { points[pl] += ((q.botBuzzed ? 1 : 2) + (byVoice ? 1 : 0)) * mult; streak++; if (streak % 3 === 0) { applause(); K.toastAdv(`${streak} in a row — the crowd goes wild!`); } } else streak = 0;
    K.record("voice-quiz", q.key, ok, q);
    $("vq-opts").querySelectorAll(".kit-opt").forEach((b, k) => { b.disabled = true; if (q.options[k] === q.correctLabel) b.classList.add("right"); });
    if (!ok) $("vq-opts").querySelectorAll(".kit-opt")[i].classList.add("wrong"); else { right++; $("vq-r").textContent = right; }
    if (ears) $("vq-q").textContent = q.prompt;
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
      $("vq-heard").textContent = `I heard “${heard}” 🎙️ +1 voice bonus`; byVoice = true; choose(idx);
    };
    rec.onerror = e => { $("vq-heard").textContent = e.error === "not-allowed" ? "Please allow the microphone." : "I couldn't hear that — try again!"; };
    rec.onend = () => { listening = false; $("vq-mic").classList.remove("rec"); };
    try { rec.start(); } catch (e) { $("vq-heard").textContent = "Couldn't start the microphone."; }
  };
  async function finish() {
    let best = 0; try { const bk = ears ? "vq_best_ears" : "vq_best"; best = Number(localStorage.getItem(bk) || 0); if (points[0] > best) localStorage.setItem(bk, String(points[0])); } catch (e) {}
    setTimeout(() => { const m = document.querySelector("#vq-overlay .kit-sub"); if (m && !duo) m.insertAdjacentHTML("beforeend", `<br>${points[0] > best ? "🌟 New best score!" : `Best: ${best}`}${ears ? " (ears-only)" : ""}`); }, 0);
    $("vq-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 6 ? "🌟" : "🗣️"}</div><h2>${duo ? (points[0] === points[1] ? "It's a tie!" : points[0] > points[1] ? "Player 1 wins!" : "Player 2 wins!") : `${right}/8 right`}</h2><p class="kit-sub">${duo ? `Player 1: ${points[0]} · Player 2: ${points[1]} points` : `${points[0]} show points`} · ⏱️ average answer ${(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length) / 1000).toFixed(1)}s<br>Speaking your answers out loud helps your brain remember them!</p><div class="kit-bonus" id="vq-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("voice-quiz", right * 2, $("vq-bonus"));
  }
  next();
}
