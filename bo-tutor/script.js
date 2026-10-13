/* =================================================================
   Bo's Tutor Session (PM round 11, item 12) -- Bo looks at your topic
   stats, finds where you make the most mistakes, and gives you a special
   5-question practice on it. 5/5 earns a "mastered" ⭐ (stored under
   players/{id}/tutorMastered) and a bonus. Questions come from the topic's
   own generator when one exists, otherwise from the matching subject pool.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("bt-overlay").innerHTML = K.signedOutHtml("🎓");
else K.ready().then(init);

const TIPS = {
  math: "Try breaking the numbers into easy pieces, or check your answer with the opposite operation.",
  lang: "Read every choice slowly, then say the sentence out loud in your head to see which sounds right.",
  sci: "Think about a real example you've seen — science is all around us!"
};
function subjectOf(game) { return game === "language-arts" ? "lang" : game === "solarquest" ? "sci" : "math"; }
// Audit batch 3: a worked example before practice, questions that climb easy -> hard, a 3-step hint
// ladder, a "why?" check after some right answers, comeback cheers, pick-any-topic list, accuracy bars,
// a re-check reminder 2 days after a session, and a certificate when a topic is mastered.
const DIFFS = ["easy", "easy", "medium", "medium", "hard"];
// Audit round 2: a "spot Bo's mistake" round after question 2 (Bo shows his answer -- right or
// wrong -- and you judge it), a 🧠 no-hint hero bonus for 5/5 without hints, and Bo's note cards:
// every mastered topic adds a card to a collection shown on the topic list.
const lst = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lstw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function explainQ(q) {
  let m = /^(\d+) × (\d+) = \?$/.exec(q.prompt);
  if (m) return `${m[1]} × ${m[2]} means ${m[1]} groups of ${m[2]}. Count up in ${m[2]}s ${m[1]} times: ${Array.from({ length: Math.min(+m[1], 5) }, (_, i) => (i + 1) * m[2]).join(", ")}${+m[1] > 5 ? ", …" : ""} → ${q.correctLabel}.`;
  m = /^(\d+) ÷ (\d+) = \?$/.exec(q.prompt);
  if (m) return `${m[1]} ÷ ${m[2]} asks “how many ${m[2]}s make ${m[1]}?”. Since ${m[2]} × ${q.correctLabel} = ${m[1]}, the answer is ${q.correctLabel}.`;
  return `The answer is ${q.correctLabel}. Break the problem into small steps and check it backwards.`;
}
function makeQuestion(t, diff) {
  const G = window.MATHVILLE_GENERATORS || {};
  const subj = subjectOf(t.game);
  if (subj === "math") {
    let key = t.topic;
    // Math Race topics ("times-7", "divby-4") -- build the sum directly.
    const tm = /^times-(\d+)$/.exec(key), dv = /^divby-(\d+)$/.exec(key);
    if (tm || dv) {
      const f = +(tm || dv)[1], m = K.rand(2, 12);
      const mm = diff === "easy" ? K.rand(2, 6) : diff === "hard" ? K.rand(7, 12) : m;
      const raw = tm ? { prompt: `${f} × ${mm} = ?`, answer: String(f * mm) } : { prompt: `${f * mm} ÷ ${f} = ?`, answer: String(mm) };
      return { subject: "math", key: t.topic, ...K.buildMc(raw) };
    }
    // MathVille chapter ids (Term 2) -> the text-only quick generators that practise them.
    const CH2KEY = { "basic-ops": ["t2-add", "t2-sub", "t2-div", "t2-twostep", "t2-muldiv"], angles: ["t2-angle"], perimeter: ["t2-perimeter"], area: ["t2-area"], "square-numbers": ["t2-square"], "factors-primes": ["t2-factors"], "multiples-lcm-gcf": ["t2-multiple", "t2-lcm", "t2-gcf"] };
    if (CH2KEY[key]) key = CH2KEY[key][K.rand(0, CH2KEY[key].length - 1)];
    if (G[key]) { try { return { subject: "math", key: t.topic, ...K.buildMc(G[key](diff || "medium")) }; } catch (e) { /* fall through */ } }
    return K.question({ subject: "math" });
  }
  return K.question({ subject: subj });
}

async function init() {
  const [weak, mastered] = await Promise.all([AIGLeaderboard.getWeakTopics(3), AIGLeaderboard.getTutorMastered()]);
  const pretty = t => t.replace(/^times-(\d+)$/, "Multiply by $1").replace(/^divby-(\d+)$/, "Divide by $1").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  if (!weak.length) {
    $("bt-say").textContent = "I don't see any tricky topics yet — that's great! Play a few rounds and I'll find something to sharpen. Want a warm-up meanwhile?";
    $("bt-body").innerHTML = `<button class="kit-btn block" id="bt-warm">Mixed warm-up</button>`;
    $("bt-warm").onclick = () => session({ game: "mathville", topic: "mixed", acc: 1 });
    return;
  }
  $("bt-say").textContent = "I looked at your practice. These are the topics we can make stronger together — pick one!";
  const due = t => { const d = lst("bt_recheck_" + t, ""); return d && d <= new Date().toISOString().slice(0, 10); };
  const extra = ["times-6", "times-7", "times-8", "times-9", "times-12", "divby-6", "divby-7", "divby-8", "basic-ops", "angles", "perimeter", "area", "square-numbers", "factors-primes", "multiples-lcm-gcf"].filter(x => !weak.some(w => w.topic === x));
  let cards = []; try { cards = JSON.parse(lst("bt_cards", "[]")) || []; } catch (e) {}
  $("bt-body").innerHTML = (cards.length ? `<div class="bt-cards">📇 Bo's notes: ${cards.map(c => `<span title="${K.esc(pretty(c))}">🗒️</span>`).join("")} <small>${cards.length} topic${cards.length === 1 ? "" : "s"} mastered</small></div>` : "") + weak.map((t, i) => `<button class="bt-topic" data-i="${i}"><span style="flex:1">${mastered[t.topic] ? "⭐ " : ""}${K.esc(pretty(t.topic))}${due(t.topic) ? " <b style='color:#c0392b'>· re-check due!</b>" : ""}<br><small>${K.esc(t.game.replace("-", " "))} · ${Math.round(t.acc * 100)}% right so far</small><span class="bt-acc"><i style="width:${Math.round(t.acc * 100)}%"></i></span></span><span>▶</span></button>`).join("")
    + `<details class="bt-more"><summary>📚 Pick any topic</summary>${extra.map(x => `<button class="bt-topic" data-x="${x}"><span>${mastered[x] ? "⭐ " : ""}${K.esc(pretty(x))}</span><span>▶</span></button>`).join("")}</details>`;
  $("bt-body").querySelectorAll(".bt-topic[data-i]").forEach(b => b.onclick = () => session(weak[+b.dataset.i]));
  $("bt-body").querySelectorAll(".bt-topic[data-x]").forEach(b => b.onclick = () => session({ game: "mathville", topic: b.dataset.x, acc: 0 }));

  function session(t) {
    let n = 0, right = 0, lastWrong = false, hintsUsed = 0, spotted = false;
    lstw("bt_recheck_" + t.topic, new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    // worked example first (maths topics)
    if (t.topic !== "mixed" && subjectOf(t.game) === "math" && !session.shown) {
      session.shown = true; const ex = makeQuestion(t, "easy");
      $("bt-say").textContent = "First, let me show you one. Watch how I think about it!";
      $("bt-body").innerHTML = `<div class="bt-board"><div class="kit-q">${K.esc(ex.prompt)}</div><p>${K.esc(explainQ(ex))}</p></div><button class="kit-btn block" id="bt-go" type="button">I get it — let's practise!</button>`;
      $("bt-go").onclick = () => { session(t); session.shown = false; }; return;
    }
    function spot() {
      spotted = true;
      const q = makeQuestion(t, "medium"), wrongOpt = q.options.find(o => o !== q.correctLabel), boRight = Math.random() < 0.5, said = boRight ? q.correctLabel : wrongOpt;
      $("bt-say").textContent = "My turn! I solved one. Am I right? 🤔";
      $("bt-body").innerHTML = `<div class="bt-board"><div class="kit-q">${K.esc(q.prompt)}</div><p>Bo says: <b>${K.esc(said)}</b></p></div><button class="kit-btn block" data-j="1" type="button">✅ Bo is right</button><button class="kit-btn alt block" data-j="0" type="button">❌ Bo made a mistake</button>`;
      $("bt-body").querySelectorAll("[data-j]").forEach(b => b.onclick = () => {
        const ok = (b.dataset.j === "1") === boRight;
        $("bt-say").textContent = ok ? (boRight ? "Yes, I got that one! Good checking. 🕵️" : `You caught me! The real answer is ${q.correctLabel}. 🕵️`) : (boRight ? "Actually I was right this time — always double-check!" : `I did make a mistake — it's ${q.correctLabel}.`);
        if (ok) lstw("bt_spots", String(Number(lst("bt_spots", "0")) + 1));
        setTimeout(ask, 2200);
      });
    }
    const ask = () => {
      if (n >= 5) return done();
      if (n === 2 && !spotted && t.topic !== "mixed" && subjectOf(t.game) === "math") return spot();
      const q = t.topic === "mixed" ? K.question({}) : makeQuestion(t, DIFFS[n]);
      n++; let hint = 0;
      $("bt-say").textContent = n === 1 ? `Let's practice ${t.topic === "mixed" ? "a little of everything" : pretty(t.topic)}! I'll help if you get stuck.` : "Next one — you can do it!";
      $("bt-body").innerHTML = `<div class="bt-stars">${Array.from({ length: 5 }, (_, i) => i < right ? "⭐" : "☆").join("")}</div><div class="kit-sub" style="text-align:center;margin:0">Question ${n}/5</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><button class="kit-btn alt block" id="bt-hint" type="button" style="margin-top:8px">💡 Hint (1/3)</button>`;
      $("bt-hint").onclick = () => { hint++; hintsUsed++; const a = String(q.correctLabel);
        if (hint === 1) $("bt-say").textContent = TIPS[subjectOf(t.game)];
        else if (hint === 2) { const w = [...$("bt-body").querySelectorAll(".kit-opt:not(:disabled)")].find(x => x.dataset.o !== a); if (w) { w.disabled = true; w.style.opacity = ".3"; } $("bt-say").textContent = "I crossed out one wrong answer for you."; }
        else { $("bt-say").textContent = /^\d/.test(a) ? `The answer has ${a.replace(/[^\d]/g, "").length} digit(s) and ends in ${a.replace(/[^\d]/g, "").slice(-1)}.` : `It starts with “${a[0]}”.`; }
        if (hint >= 3) $("bt-hint").remove(); else $("bt-hint").textContent = `💡 Hint (${hint + 1}/3)`; };
      $("bt-body").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correctLabel;
        K.record("bo-tutor", q.key, ok, q);
        $("bt-body").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
        const hb = $("bt-hint"); if (hb) hb.remove();
        if (ok) { right++; $("bt-say").textContent = lastWrong ? "Great comeback! 💪 That's how we learn." : "Yes! 🎉 Exactly right."; lastWrong = false;
          if (n === 3 && /[×÷]/.test(q.prompt)) { setTimeout(() => why(q), 900); return; } }
        else { lastWrong = true; b.classList.add("wrong"); $("bt-say").textContent = `Almost! ${explainQ(q)}`; }
        setTimeout(ask, ok ? 1000 : 3200);
      });
    };
    function why(q) {
      const good = explainQ(q), bad = `Because you add ${q.prompt.split(" ")[0]} and ${q.prompt.split(" ")[2]} together.`;
      $("bt-say").textContent = "Can you teach me? Which reason is right?";
      const opts = K.shuffle([good, bad]);
      $("bt-body").innerHTML = `<div class="kit-q">${K.esc(q.prompt.replace("?", q.correctLabel))} — why?</div>${opts.map((o, i) => `<button class="bt-topic" data-w="${o === good ? 1 : 0}" type="button"><span>${K.esc(o)}</span></button>`).join("")}`;
      $("bt-body").querySelectorAll("[data-w]").forEach(b => b.onclick = () => { const ok = b.dataset.w === "1"; $("bt-say").textContent = ok ? "Yes! You explained it like a teacher. 🧑‍🏫" : "Close — the first way is about groups, not adding the two numbers."; setTimeout(ask, 1600); });
    }
    async function done() {
      const perfect = right === 5;
      if (perfect && t.topic !== "mixed") AIGLeaderboard.markTutorMastered(t.topic);
      const noHint = perfect && hintsUsed === 0;
      if (noHint) { try { await AIGLeaderboard.creditWallet({ coins: 5 }); } catch (e) {} }
      if (perfect && t.topic !== "mixed") { let c = []; try { c = JSON.parse(lst("bt_cards", "[]")) || []; } catch (e) {} if (!c.includes(t.topic)) { c.push(t.topic); lstw("bt_cards", JSON.stringify(c)); } }
      $("bt-say").textContent = perfect ? "Perfect score! You've mastered this one! 🌟" : right >= 3 ? "Good progress! A little more practice and it's yours." : "That's a tricky one — come back and we'll try again together!";
      $("bt-body").innerHTML = "";
      $("bt-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${perfect ? "🌟" : "🎓"}</div><h2>${right}/5 correct</h2>
        <p class="kit-sub">${perfect ? "Mastered — you earned a ⭐ on this topic and a 🗒️ note card!" : "Every try makes it stronger."}${noHint ? "<br><b>🧠 No-hint hero: +5 coins!</b>" : ""}<br><small>🔁 I'll remind you to re-check this in 2 days.</small></p>${perfect && t.topic !== "mixed" ? `<div class="bt-cert">🏅 Certificate<br><b>${K.esc((player && player.name) || "You")}</b><br>has mastered<br><b>${K.esc(pretty(t.topic))}</b><br><small>${new Date().toLocaleDateString()}</small></div>` : ""}<div class="kit-bonus" id="bt-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">Another session</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      K.finish("bo-tutor", perfect ? 15 : right * 2, $("bt-bonus"));
    }
    ask();
  }
}
