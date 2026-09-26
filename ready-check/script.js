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
function questionFor(id) {
  const G = window.MATHVILLE_GENERATORS || {};
  if (["multiplication", "division", "measurement", "rounding"].includes(id) && G[id]) { try { return { subject: "math", key: id, ...K.buildMc(G[id]("medium")) }; } catch (e) {} }
  if (id === "fractions") return fractionQ();
  if (id === "words") return K.question({ subject: "lang" });
  if (id === "science") return K.question({ subject: "sci" });
  return K.question({ subject: "math" });
}

async function init() {
  const { path, passed } = await AIGLeaderboard.getReadiness();
  const byId = Object.fromEntries(path.map(p => [p.id, p]));
  const menu = () => {
    $("rc-main").innerHTML = `<div class="kit-q">Am I ready to move on?</div><p class="kit-sub" style="text-align:center">Pick a topic for a 5-question check. Get 4 right to earn a ✅.</p>${path.map(p => {
      const ok = passed[p.id] && passed[p.id].passed, pre = p.after ? byId[p.after] : null, preOk = !pre || (passed[pre.id] && passed[pre.id].passed);
      return `<button class="rc-topic ${ok ? "pass" : ""}" data-id="${p.id}"><span>${ok ? "✅ " : ""}${p.name}<small>${pre ? (preOk ? `after ${pre.name} ✓` : `works best after ${pre.name}`) : "start anywhere"}</small></span><span>▶</span></button>`;
    }).join("")}`;
    $("rc-main").querySelectorAll(".rc-topic").forEach(b => b.onclick = () => check(byId[b.dataset.id]));
  };
  function check(t) {
    const pre = t.after ? byId[t.after] : null;
    if (pre && !(passed[pre.id] && passed[pre.id].passed) && !confirm(`${t.name} works best after ${pre.name}. Try it anyway?`)) return;
    let i = 0, right = 0;
    const ask = () => {
      if (i >= 5) return done();
      const q = questionFor(t.id);
      $("rc-main").innerHTML = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">${K.esc(t.name)} check — ${i + 1}/5</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>`;
      $("rc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correctLabel;
        K.record("ready-check", q.key, ok, q);
        $("rc-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
        if (ok) right++; else b.classList.add("wrong");
        setTimeout(() => { i++; ask(); }, 900);
      });
    };
    async function done() {
      const r = await AIGLeaderboard.saveReadiness(t.id, right);
      if (r.passed) passed[t.id] = { passed: true, score: right };
      $("rc-main").innerHTML = "";
      $("rc-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${r.passed ? "✅" : "💪"}</div><h2>${r.passed ? "You're ready!" : "Almost there"}</h2>
        <p class="kit-sub">${right}/5 on ${K.esc(t.name)}. ${r.passed ? "Go on to the next topic with confidence!" : "A little more practice first — Bo's Tutor Session can help."}</p><div class="kit-bonus" id="rc-bonus"></div>
        ${r.passed ? "" : '<a class="kit-btn block" href="../bo-tutor/">Practise with Bo</a>'}<button class="kit-btn alt block" id="rc-back">Back to topics</button></div></div>`;
      $("rc-back").onclick = () => { $("rc-overlay").innerHTML = ""; menu(); };
      if (r.passed) K.finish("ready-check", 8, $("rc-bonus"));
    }
    ask();
  }
  menu();
}
