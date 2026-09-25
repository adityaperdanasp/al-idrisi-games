/* =================================================================
   Times Rhythm (PM round 11, item 7) -- a multiplication problem sits at
   the top; four "notes" (one right answer + three distractors) fall down
   four lanes in time with a steady beat. Tap the right note before it
   passes the gold line. 3 lives, 15 problems; the beat gets a little
   faster as the combo grows. Pick a table range first.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("tr-overlay").innerHTML = K.signedOutHtml("🎵");
else menu();

function menu() {
  $("tr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎵</div><h2>Pick your tables</h2>
    <p class="kit-sub">Notes fall to the beat. Tap the right answer in time!</p>
    <button class="kit-btn block" data-r="2,5">Tables 2 – 5</button><button class="kit-btn block" data-r="6,9">Tables 6 – 9</button><button class="kit-btn block" data-r="2,12">Mixed 2 – 12</button></div></div>`;
  $("tr-overlay").querySelectorAll("[data-r]").forEach(b => b.onclick = () => { const [lo, hi] = b.dataset.r.split(",").map(Number); $("tr-overlay").innerHTML = ""; start(lo, hi); });
}

function start(lo, hi) {
  const TOTAL = 15;
  let n = 0, hits = 0, combo = 0, best = 0, lives = 3, cur = null, over = false, beatTimer = null, ctx = null;
  const stage = $("tr-stage");
  const beat = () => {
    const p = $("tr-pulse"); p.classList.remove("beat"); void p.offsetWidth; p.classList.add("beat");
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 220; o.type = "sine";
      g.gain.setValueAtTime(.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .12);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .13);
    } catch (e) { /* no audio, no problem */ }
  };
  function hud() { $("tr-hit").textContent = hits; $("tr-n").textContent = n; $("tr-combo").textContent = combo; $("tr-lives").textContent = lives; }

  function next() {
    if (over) return;
    if (n >= TOTAL || lives <= 0) return finish();
    n++; hud();
    const a = K.rand(lo, hi), b = K.rand(2, 12), ans = a * b;
    $("tr-prob").textContent = `${a} × ${b}`;
    const opts = new Set([ans]);
    while (opts.size < 4) { const d = [-b, b, -a, a, -10, 10, -1, 1, 2, -2][K.rand(0, 9)]; if (ans + d > 0) opts.add(ans + d); }
    const lanes = K.shuffle([0, 1, 2, 3]);
    const dur = Math.max(2400, 3800 - combo * 120);
    const notes = [...opts].map((v, i) => {
      const el = document.createElement("button");
      el.className = "tr-note"; el.textContent = v; el.type = "button";
      el.style.left = (lanes[i] * 25 + 2) + "%";
      el.style.transition = `top ${dur}ms linear ${i * 260}ms`;
      stage.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.top = "calc(100% - 44px)"; })); // reaches the line at the end
      return { el, v, ok: v === ans };
    });
    cur = { ans, notes, done: false };
    notes.forEach(nt => nt.el.onclick = () => tap(nt));
    cur.timer = setTimeout(() => miss(), dur + 3 * 260 + 250);
  }
  function clear() { if (cur) { clearTimeout(cur.timer); const old = cur.notes; setTimeout(() => old.forEach(x => x.el.remove()), 350); } }
  function tap(nt) {
    if (!cur || cur.done || over) return;
    cur.done = true;
    if (nt.ok) { nt.el.classList.add("hit"); hits++; combo++; best = Math.max(best, combo); K.record("times-rhythm", "multiplication", true); $("tr-msg").textContent = combo >= 3 ? `🔥 ${combo} in a row!` : "✅ On the beat!"; }
    else { nt.el.classList.add("bad"); cur.notes.find(x => x.ok).el.classList.add("hit"); lives--; combo = 0; K.record("times-rhythm", "multiplication", false); $("tr-msg").textContent = `❌ It was ${cur.ans}`; }
    hud(); clear(); setTimeout(next, 700);
  }
  function miss() {
    if (!cur || cur.done || over) return;
    cur.done = true; lives--; combo = 0; K.record("times-rhythm", "multiplication", false);
    cur.notes.find(x => x.ok).el.classList.add("hit"); $("tr-msg").textContent = `⏱️ Too slow — it was ${cur.ans}`;
    hud(); clear(); setTimeout(next, 700);
  }
  async function finish() {
    over = true; clearInterval(beatTimer);
    const pct = n ? Math.round(hits / n * 100) : 0;
    $("tr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${hits >= 12 ? "🌟" : hits >= 7 ? "🎉" : "🎵"}</div><h2>${lives > 0 ? "Song complete!" : "Out of lives!"}</h2>
      <p class="kit-sub">${hits}/${TOTAL} on the beat (${pct}%) · best combo ${best}</p><div class="kit-bonus" id="tr-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Play again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("times-rhythm", Math.round(hits * 1.4), $("tr-bonus"));
  }
  beatTimer = setInterval(beat, 1000);
  hud(); next();
}
