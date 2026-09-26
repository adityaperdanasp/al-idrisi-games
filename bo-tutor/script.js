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
function makeQuestion(t) {
  const G = window.MATHVILLE_GENERATORS || {};
  const subj = subjectOf(t.game);
  if (subj === "math") {
    let key = t.topic;
    // Math Race topics ("times-7", "divby-4") -- build the sum directly.
    const tm = /^times-(\d+)$/.exec(key), dv = /^divby-(\d+)$/.exec(key);
    if (tm || dv) {
      const f = +(tm || dv)[1], m = K.rand(2, 12);
      const raw = tm ? { prompt: `${f} × ${m} = ?`, answer: String(f * m) } : { prompt: `${f * m} ÷ ${f} = ?`, answer: String(m) };
      return { subject: "math", key: t.topic, ...K.buildMc(raw) };
    }
    if (key === "addition-subtraction") key = Math.random() < 0.5 ? "addition-subtraction-add" : "addition-subtraction-sub";
    if (G[key]) { try { return { subject: "math", key: t.topic, ...K.buildMc(G[key]("medium")) }; } catch (e) { /* fall through */ } }
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
  $("bt-body").innerHTML = weak.map((t, i) => `<button class="bt-topic" data-i="${i}"><span>${mastered[t.topic] ? "⭐ " : ""}${K.esc(pretty(t.topic))}<br><small>${K.esc(t.game.replace("-", " "))} · ${Math.round(t.acc * 100)}% right so far</small></span><span>▶</span></button>`).join("");
  $("bt-body").querySelectorAll(".bt-topic").forEach(b => b.onclick = () => session(weak[+b.dataset.i]));

  function session(t) {
    let n = 0, right = 0;
    const ask = () => {
      if (n >= 5) return done();
      const q = t.topic === "mixed" ? K.question({}) : makeQuestion(t);
      n++;
      $("bt-say").textContent = n === 1 ? `Let's practice ${t.topic === "mixed" ? "a little of everything" : pretty(t.topic)}! I'll help if you get stuck.` : "Next one — you can do it!";
      $("bt-body").innerHTML = `<div class="bt-stars">${Array.from({ length: 5 }, (_, i) => i < right ? "⭐" : "☆").join("")}</div><div class="kit-sub" style="text-align:center;margin:0">Question ${n}/5</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts">${q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div>`;
      $("bt-body").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.correctLabel;
        K.record("bo-tutor", q.key, ok);
        $("bt-body").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
        if (ok) { right++; $("bt-say").textContent = "Yes! 🎉 Exactly right."; }
        else { b.classList.add("wrong"); $("bt-say").textContent = `Almost! The answer is ${q.correctLabel}. ${TIPS[subjectOf(t.game)]}`; }
        setTimeout(ask, ok ? 1000 : 2800);
      });
    };
    async function done() {
      const perfect = right === 5;
      if (perfect && t.topic !== "mixed") AIGLeaderboard.markTutorMastered(t.topic);
      $("bt-say").textContent = perfect ? "Perfect score! You've mastered this one! 🌟" : right >= 3 ? "Good progress! A little more practice and it's yours." : "That's a tricky one — come back and we'll try again together!";
      $("bt-body").innerHTML = "";
      $("bt-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${perfect ? "🌟" : "🎓"}</div><h2>${right}/5 correct</h2>
        <p class="kit-sub">${perfect ? "Mastered — you earned a ⭐ on this topic!" : "Every try makes it stronger."}</p><div class="kit-bonus" id="bt-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">Another session</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      K.finish("bo-tutor", perfect ? 15 : right * 2, $("bt-bonus"));
    }
    ask();
  }
}
