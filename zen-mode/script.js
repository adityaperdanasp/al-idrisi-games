/* =================================================================
   Zen Mode -- for tired or frustrated days: no timer, no lives, no score
   pressure. A wrong answer just crosses out that choice and you try again.
   Audit batch 3: a zen garden that grows one plant per first-try answer and
   is kept between visits, rare plants every 10, koi in the pond on a
   5-streak, a breathing break after two misses, a calm ambience (rain /
   stream / campfire, synthesized), a subject picker and a gentle "planted
   today" count.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("zm-overlay").innerHTML = K.signedOutHtml("🍃");
else K.ready().then(start);

const lsz = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lszw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const PLANTS = ["🌱", "🌿", "🌷", "🌼", "🌻", "🍀", "🌸", "🌾"], RARE = ["🌳", "🎋", "🪷", "🌺", "🍄"];
const today = () => new Date().toISOString().slice(0, 10);

// ---- ambience: filtered noise, no audio files ----
let amb = null;
function ambience(kind) {
  try { if (amb) { amb.stop(); amb = null; } if (kind === "off") return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = kind === "rain" ? w * 0.5 : last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind === "rain" ? "highpass" : "lowpass"; f.frequency.value = kind === "rain" ? 1200 : kind === "fire" ? 500 : 900;
    const g = ctx.createGain(); g.gain.value = kind === "fire" ? 0.18 : 0.08; src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    let crack = null; if (kind === "fire") crack = setInterval(() => { const o = ctx.createOscillator(), gg = ctx.createGain(), t = ctx.currentTime; o.type = "square"; o.frequency.value = 80 + Math.random() * 200; gg.gain.setValueAtTime(0.03, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(gg); gg.connect(ctx.destination); o.start(t); o.stop(t + 0.06); }, 400 + Math.random() * 600);
    amb = { stop: () => { try { src.stop(); clearInterval(crack); ctx.close(); } catch (e) {} } };
  } catch (e) {}
}

function start() {
  const CHEER = ["Nice and steady 🌿", "That's it! 🌸", "Lovely 🍃", "You've got this ☁️", "Great job, easy does it 🌼"];
  const GENTLE = ["No worries — try another one 🌱", "Take a breath and look again 🌬️", "It's okay, mistakes help us grow 🌻"];
  let right = 0, q = null, misses = 0, streak = 0, subject = lsz("zm_subject", "mix");
  let garden = []; try { garden = JSON.parse(lsz("zm_garden", "[]")) || []; } catch (e) {}
  let planted = lsz("zm_day", "") === today() ? Number(lsz("zm_today", "0")) : 0;

  function drawGarden() {
    const show = garden.slice(-48);
    $("zm-garden").innerHTML = `<div class="zm-pond">${streak >= 5 ? "🐟" : ""}${streak >= 10 ? " 🐠" : ""}💧</div>${show.map(p => `<i>${p}</i>`).join("")}${garden.length ? "" : '<small>Your garden is waiting — every first-try answer plants something.</small>'}`;
    $("zm-sub").textContent = `🌼 ${planted} planted today · garden ${garden.length}`;
  }
  function plant() {
    const n = garden.length + 1, rare = n % 10 === 0;
    garden.push(rare ? RARE[K.rand(0, RARE.length - 1)] : PLANTS[K.rand(0, PLANTS.length - 1)]);
    lszw("zm_garden", JSON.stringify(garden.slice(-200))); planted++; lszw("zm_day", today()); lszw("zm_today", String(planted));
    if (rare) K.toastAdv("A rare plant grew in your garden!");
    drawGarden();
  }
  function breathe(after) {
    const o = document.createElement("div"); o.className = "kit-overlay";
    o.innerHTML = `<div class="kit-modal"><h2>Let's breathe</h2><div class="zm-breath"></div><p class="kit-sub" id="zm-bt">Breathe in…</p></div>`;
    document.body.appendChild(o); let n = 0;
    const t = setInterval(() => { n++; const el = o.querySelector("#zm-bt"); if (el) el.textContent = n % 2 ? "…and breathe out" : "Breathe in…"; if (n >= 4) { clearInterval(t); o.remove(); after(); } }, 2500);
  }
  function next() {
    misses = 0;
    const pickSub = subject === "mix" ? ["math", "lang", "sci"][K.rand(0, 2)] : subject;
    q = K.question({ subject: pickSub, difficulty: "easy" });
    $("zm-q").textContent = q.prompt;
    const box = $("zm-opts"); box.innerHTML = "";
    q.options.forEach(o => { const b = document.createElement("button"); b.className = "kit-opt"; b.type = "button"; b.textContent = o; b.onclick = () => pick(b, o); box.appendChild(b); });
  }
  function pick(btn, o) {
    const ok = o === q.correctLabel;
    if (ok) {
      if (misses === 0) { right++; streak++; $("zm-r").textContent = right; K.record("zen-mode", q.key, true, q); plant(); } else streak = 0;
      btn.classList.add("right"); $("zm-msg").textContent = CHEER[K.rand(0, CHEER.length - 1)];
      $("zm-opts").querySelectorAll(".kit-opt").forEach(b => b.disabled = true);
      setTimeout(() => { $("zm-msg").textContent = ""; next(); }, 900);
    } else {
      if (misses === 0) K.record("zen-mode", q.key, false, q);
      misses++; streak = 0; btn.disabled = true; btn.style.opacity = ".35";
      $("zm-msg").textContent = GENTLE[K.rand(0, GENTLE.length - 1)];
      if (misses === 2) breathe(() => {});
    }
  }
  $("zm-tools").innerHTML = `<div class="zm-row"><span>Practise:</span>${[["mix", "🎲 Mix"], ["math", "➗ Maths"], ["lang", "📖 Words"], ["sci", "🔭 Science"]].map(([k, l]) => `<button type="button" class="zm-chip ${subject === k ? "on" : ""}" data-s="${k}">${l}</button>`).join("")}</div>
    <div class="zm-row"><span>Sound:</span>${[["off", "🔇 Off"], ["rain", "🌧️ Rain"], ["stream", "🏞️ Stream"], ["fire", "🔥 Campfire"]].map(([k, l]) => `<button type="button" class="zm-chip" data-a="${k}">${l}</button>`).join("")}</div>`;
  $("zm-tools").querySelectorAll("[data-s]").forEach(b => b.onclick = () => { subject = b.dataset.s; lszw("zm_subject", subject); $("zm-tools").querySelectorAll("[data-s]").forEach(x => x.classList.toggle("on", x === b)); next(); });
  $("zm-tools").querySelectorAll("[data-a]").forEach(b => b.onclick = () => { ambience(b.dataset.a); $("zm-tools").querySelectorAll("[data-a]").forEach(x => x.classList.toggle("on", x === b && b.dataset.a !== "off")); });
  $("zm-done").onclick = async () => {
    ambience("off");
    const coins = Math.min(10, Math.floor(right / 3));
    $("zm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🌿</div><h2>Peaceful practice</h2>
      <p class="kit-sub">You got ${right} right first time and planted ${planted} today. Thanks for taking care of your brain!</p><div class="kit-bonus" id="zm-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Keep going</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("zen-mode", coins, $("zm-bonus"));
  };
  drawGarden(); next();
}
