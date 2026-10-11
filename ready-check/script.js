/* =================================================================
   Level-Up Check (PM round 12, item 15) -- before moving on to a new
   topic, take a 5-question "am I ready?" check. 4/5 or better earns a
   ✅ (stored under players/{id}/ready). Topics are on a path: Division
   comes after Multiplication, Fractions after Division, and so on; if you
   skip ahead Bo just suggests checking the earlier one first.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("rc-overlay").innerHTML = K.signedOutHtml("✅");
else K.ready().then(init);

function fractionQ() {
  const r = K.rand(0, 2);
  const mc = (prompt, correct, others) => ({ prompt, options: K.shuffle([...new Set([correct, ...others])]), correctLabel: correct, key: "fractions", subject: "math" });
  if (r === 0) { const d = [4, 5, 6, 8, 10][K.rand(0, 4)], a = K.rand(1, d - 2), b = K.rand(1, d - a - 1 || 1); return mc(`${a}/${d} + ${b}/${d} = ?`, `${a + b}/${d}`, [`${a + b}/${d * 2}`, `${a * b}/${d}`, `${a + b + 1}/${d}`]); }
  if (r === 1) { const d = [2, 3, 4, 5][K.rand(0, 3)], n = d * K.rand(2, 8); return mc(`What is 1/${d} of ${n}?`, String(n / d), [String(n / d + d), String(n - d), String(n / d + 1)]); }
  const k = K.rand(2, 4), b = [2, 3][K.rand(0, 1)]; return mc(`1/${b} = ?/${b * k}`, String(k), [String(k + 1), String(k * 2), String(b + k)]);
}
// Audit batch 2: each topic is a gate with a guardian (HP 5). Questions climb easy -> hard,
// stars 1-3 are remembered per topic, a failed check offers a 3-question warm-up and an instant
// retry, Bo gives one clue per check, and checks passed over a week ago get a "re-check" badge.
const GUARD = { multiplication: "🗿", division: "🐉", fractions: "🧙", measurement: "🤖", rounding: "🦂", words: "🦉", science: "👽" };
const lsr = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsrw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function questionFor(id, diff) {
  const G = window.MATHVILLE_GENERATORS || {};
  if (["multiplication", "division", "measurement", "rounding"].includes(id) && G[id]) { try { return { subject: "math", key: id, ...K.buildMc(G[id](diff || "medium")) }; } catch (e) {} }
  if (id === "fractions") return fractionQ();
  if (id === "words") return K.question({ subject: "lang" });
  if (id === "science") return K.question({ subject: "sci" });
  return K.question({ subject: "math" });
}

async function init() {
  const { path, passed } = await AIGLeaderboard.getReadiness();
  const byId = Object.fromEntries(path.map(p => [p.id, p]));
  const menu = () => {
    $("rc-main").innerHTML = `<div class="kit-q">🚪 The Gates of Level-Up</div><p class="kit-sub" style="text-align:center">Each gate has a guardian with 5 HP. Beat it with 4 right answers to open the gate. 5/5 gives 3 stars!</p>${path.map(p => {
      const ok = passed[p.id] && passed[p.id].passed, pre = p.after ? byId[p.after] : null, preOk = !pre || (passed[pre.id] && passed[pre.id].passed);
      const st = Number(lsr("rc_stars_" + p.id, "0")), at = ok && passed[p.id].at, stale = at && Date.now() - at > 7 * 86400000;
      return `<button class="rc-topic ${ok ? "pass" : ""}" data-id="${p.id}"><span class="rc-gate">${ok ? "🚪" : "🔒"}<b>${GUARD[p.id] || "🗿"}</b></span><span style="flex:1;text-align:left">${p.name}<small>${pre ? (preOk ? `after ${pre.name} ✓` : `works best after ${pre.name}`) : "start anywhere"}${stale ? " · 🔁 time for a re-check!" : ""}</small></span><span class="rc-st">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</span></button>`;
    }).join("")}`;
    $("rc-main").querySelectorAll(".rc-topic").forEach(b => b.onclick = () => check(byId[b.dataset.id]));
  };
  function check(t) {
    const pre = t.after ? byId[t.after] : null;
    if (pre && !(passed[pre.id] && passed[pre.id].passed) && !check.warned) {
      $("rc-main").innerHTML = `<div class="kit-big" style="text-align:center">🤔</div><div class="kit-q">${K.esc(t.name)} works best after ${K.esc(pre.name)}.</div><button class="kit-btn block" id="rc-any" type="button">Try it anyway</button><button class="kit-btn alt block" id="rc-pre" type="button">Check ${K.esc(pre.name)} first</button>`;
      $("rc-any").onclick = () => { check.warned = true; check(t); check.warned = false; }; $("rc-pre").onclick = () => check(pre); return;
    }
    let i = 0, right = 0, clue = true;
    const DIFF = ["easy", "easy", "medium", "medium", "hard"];
    const ask = () => {
      if (i >= 5) return done();
      const q = questionFor(t.id, DIFF[i]);
      $("rc-main").innerHTML = `<div class="rc-boss"><span class="rc-g" id="rc-g">${GUARD[t.id] || "🗿"}</span><div class="kit-bar"><i style="width:${(5 - right) * 20}%;background:#e04b4b"></i></div><small>Guardian HP ${5 - right}/5</small></div><div class="kit-sub" style="margin:0 0 4px;font-weight:800">${K.esc(t.name)} gate — question ${i + 1}/5 · ${DIFF[i]}</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>${clue ? '<button class="kit-btn alt block" id="rc-clue" type="button" style="margin-top:8px">💡 Bo, give me a clue (once)</button>' : ""}<div class="kit-sub" id="rc-cm" style="text-align:center;min-height:1em"></div>`;
      const cb = $("rc-clue"); if (cb) cb.onclick = () => { clue = false; cb.remove(); const a = String(q.correctLabel); $("rc-cm").textContent = /^\d/.test(a) ? `💡 The answer has ${a.replace(/[^\d]/g, "").length} digit(s).` : `💡 It starts with “${a[0]}”.`; };
      $("rc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correctLabel;
        const g = $("rc-g"); if (g) { g.classList.remove("hit", "atk"); void g.offsetWidth; g.classList.add(ok ? "hit" : "atk"); }
        K.record("ready-check", q.key, ok, q);
        $("rc-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
        if (ok) right++; else b.classList.add("wrong");
        setTimeout(() => { i++; ask(); }, 900);
      });
    };
    async function done() {
      const r = await AIGLeaderboard.saveReadiness(t.id, right);
      if (r.passed) passed[t.id] = { passed: true, score: right, at: Date.now() };
      const stars = right >= 5 ? 3 : right >= 4 ? 2 : right >= 3 ? 1 : 0; if (stars > Number(lsr("rc_stars_" + t.id, "0"))) lsrw("rc_stars_" + t.id, String(stars));
      if (r.passed) K.toastAdv(`${t.name} gate opened!`);
      $("rc-main").innerHTML = "";
      $("rc-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${r.passed ? "✅" : "💪"}</div><h2>${r.passed ? "You're ready!" : "Almost there"}</h2>
        <p class="kit-sub">${right}/5 on ${K.esc(t.name)}. ${r.passed ? "Go on to the next topic with confidence!" : "A little more practice first — Bo's Tutor Session can help."}</p><div class="kit-bonus" id="rc-bonus"></div>
        <div style="font-size:1.6rem">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        ${r.passed ? "" : '<button class="kit-btn block" id="rc-warm" type="button">🔥 Warm up (3 questions) and try again</button><a class="kit-btn alt block" href="../bo-tutor/">Practise with Bo</a>'}<button class="kit-btn alt block" id="rc-back">Back to the gates</button></div></div>`;
      $("rc-back").onclick = () => { $("rc-overlay").innerHTML = ""; menu(); };
      const wb = $("rc-warm"); if (wb) wb.onclick = () => { $("rc-overlay").innerHTML = ""; warmup(t); };
      if (r.passed) K.finish("ready-check", 8, $("rc-bonus"));
    }
    ask();
  }
  function warmup(t) {
    let n = 0;
    const ask = () => {
      if (n >= 3) { $("rc-main").innerHTML = `<div class="kit-big" style="text-align:center">🔥</div><div class="kit-q">Warmed up! Ready to face the guardian again?</div><button class="kit-btn block" id="rc-again" type="button">Try the gate again</button>`; $("rc-again").onclick = () => { check.warned = true; check(t); check.warned = false; }; return; }
      const q = questionFor(t.id, "easy");
      $("rc-main").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">Warm-up ${n + 1}/3</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="rc-wm" style="text-align:center"></div>`;
      $("rc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === q.correctLabel; K.record("ready-check", q.key, ok, q); $("rc-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); }); if (!ok) b.classList.add("wrong"); $("rc-wm").textContent = ok ? "Nice!" : `It was ${q.correctLabel}`; setTimeout(() => { n++; ask(); }, ok ? 800 : 1700); });
    };
    ask();
  }
  menu();
}
