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
else setTimeout(menu, 0); // deferred: SONGS below must exist first

// Audit batch 7: real little melodies per song, tempo choice, a ÷ mode, PERFECT/GOOD timing with a
// score and combo multiplier, FEVER at 10 in a row, S/A/B/C ranks saved per song, and dancers that
// dance harder as your combo grows.
const SONGS = { disco: ["🪩 Disco (2–5)", 2, 5, [0, 2, 4, 2, 5, 4, 2, 0]], rock: ["🎸 Rock (6–9)", 6, 9, [0, 0, 3, 4, 3, 0, 5, 4]], mega: ["🌈 Mega mix (2–12)", 2, 12, [4, 2, 0, 2, 4, 4, 4, 5]] };
const SCALE = [261.6, 293.7, 329.6, 392, 440, 523.3];
let MODE = "mult", TEMPO = 1;
const lst = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lstw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function menu() {
  $("tr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎵</div><h2>Pick a song</h2>
    <p class="kit-sub">Notes fall to the beat. Tap the right answer in time — tap late (near the line) for PERFECT!</p>
    ${(() => {
      // Audit round 2: concert tour -- each song unlocks after a B rank (or better) on the song before it;
      // every song at A or better earns the 🌟 Rhythm Star title.
      const keys = Object.keys(SONGS), rk = k => lst("tr_best_" + k, "–"), good = r => ["S", "A", "B"].includes(r);
      const star = keys.every(k => ["S", "A"].includes(rk(k)));
      return (star ? `<div class="kit-sub" style="font-weight:800">🌟 Rhythm Star — every song at A or better!</div>` : `<div class="kit-sub">🎤 Concert tour: get a B on a song to unlock the next one.</div>`) +
        keys.map((k, i) => { const s = SONGS[k], open = i === 0 || good(rk(keys[i - 1])) || rk(k) !== "–"; return `<button class="kit-btn block ${open ? "" : "alt"}" data-s="${k}" ${open ? "" : "disabled"}>${open ? "" : "🔒 "}${s[0]} <small>best ${rk(k)}</small></button>`; }).join("");
    })()}
    <div class="tr-pick"><span>Speed:</span>${[["1.3", "🐢"], ["1", "🙂"], ["0.8", "⚡"]].map(([v, l]) => `<button type="button" data-t="${v}" class="${+v === TEMPO ? "on" : ""}">${l}</button>`).join("")}<span>Mode:</span><button type="button" data-m="mult" class="on">×</button><button type="button" data-m="div">÷</button></div></div></div>`;
  $("tr-overlay").querySelectorAll("[data-t]").forEach(b => b.onclick = () => { TEMPO = +b.dataset.t; $("tr-overlay").querySelectorAll("[data-t]").forEach(x => x.classList.toggle("on", x === b)); });
  $("tr-overlay").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { MODE = b.dataset.m; $("tr-overlay").querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b)); });
  $("tr-overlay").querySelectorAll("[data-s]").forEach(b => b.onclick = () => { const sg = SONGS[b.dataset.s]; $("tr-overlay").innerHTML = ""; start(sg[1], sg[2], b.dataset.s); });
}

function start(lo, hi, songId) {
  const TOTAL = 15, melody = (SONGS[songId] || SONGS.mega)[3];
  let n = 0, hits = 0, combo = 0, best = 0, lives = 3, cur = null, over = false, beatTimer = null, ctx = null, score = 0, perfects = 0, beatN = 0;
  const stage = $("tr-stage");
  const beat = () => {
    const p = $("tr-pulse"); p.classList.remove("beat"); void p.offsetWidth; p.classList.add("beat");
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = ctx || new C(); if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = SCALE[melody[beatN++ % melody.length]] * (combo >= 10 ? 2 : 1); o.type = combo >= 10 ? "square" : "triangle";
      g.gain.setValueAtTime(.06, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .12);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .13);
    } catch (e) { /* no audio, no problem */ }
  };
  function hud() { $("tr-hit").textContent = hits; $("tr-n").textContent = n; $("tr-combo").textContent = combo; $("tr-lives").textContent = lives; $("tr-score").textContent = score; stage.classList.toggle("fever", combo >= 10); $("tr-dance").className = "tr-dance d" + Math.min(3, Math.floor(combo / 3)); }

  function next() {
    if (over) return;
    if (n >= TOTAL || lives <= 0) return finish();
    n++; hud();
    const a = K.rand(lo, hi), b = K.rand(2, 12), ans = MODE === "div" ? b : a * b;
    $("tr-prob").textContent = MODE === "div" ? `${a * b} ÷ ${a}` : `${a} × ${b}`;
    const opts = new Set([ans]);
    while (opts.size < 4) { const d = [-b, b, -a, a, -10, 10, -1, 1, 2, -2][K.rand(0, 9)]; if (ans + d > 0) opts.add(ans + d); }
    const lanes = K.shuffle([0, 1, 2, 3]);
    const dur = Math.max(2000, (3800 - combo * 120) * TEMPO);
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
    if (nt.ok) { const r = nt.el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), depth = (r.top - sr.top) / Math.max(1, sr.height), perfect = depth > 0.62;
      nt.el.classList.add("hit"); hits++; combo++; best = Math.max(best, combo); if (perfect) perfects++;
      const mult = 1 + Math.floor(combo / 5) + (combo >= 10 ? 1 : 0); score += (perfect ? 100 : 50) * mult;
      K.record("times-rhythm", MODE === "div" ? "division" : "multiplication", true); $("tr-msg").textContent = `${perfect ? "✨ PERFECT!" : "✅ Good!"} ×${mult}${combo >= 10 ? " 🔥 FEVER!" : combo >= 3 ? ` · ${combo} in a row` : ""}`; }
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
    const pct = n ? Math.round(hits / n * 100) : 0, rank = pct >= 95 && perfects >= 10 ? "S" : pct >= 85 ? "A" : pct >= 65 ? "B" : "C";
    const order = { S: 4, A: 3, B: 2, C: 1, "–": 0 }; if (order[rank] > order[lst("tr_best_" + songId, "–")]) lstw("tr_best_" + songId, rank);
    if (rank === "S") K.toastAdv("S rank — rhythm master!");
    $("tr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${hits >= 12 ? "🌟" : hits >= 7 ? "🎉" : "🎵"}</div><h2>${lives > 0 ? "Song complete!" : "Out of lives!"}</h2>
      <div class="tr-rank">${rank}</div><p class="kit-sub">${hits}/${TOTAL} on the beat (${pct}%) · ✨ ${perfects} perfect · best combo ${best}<br>Score: <b>${score}</b></p><div class="kit-bonus" id="tr-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Play again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("times-rhythm", Math.round(hits * 1.4), $("tr-bonus"));
  }
  beatTimer = setInterval(beat, 1000);
  hud(); next();
}
