/* =================================================================
   Quick Review (PM round 12, item 17) -- spaced repetition. Every wrong
   multiple-choice answer (in the Game Room games, SolarQuest and Language
   & Arts) is saved and comes back after 1, 3, 7 and 14 days. Answer it
   right at every step and it's MASTERED and leaves the pile. A session is
   up to 8 due questions, about 3 minutes.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const STEP_LABEL = ["Day 1", "Day 3", "Day 7", "Day 14"];
if (!player) $("qr-overlay").innerHTML = K.signedOutHtml("🔁");
else init();

async function init() {
  const LB = AIGLeaderboard;
  const [stats, due] = await Promise.all([LB.srsStats(), LB.srsDue(8)]);
  $("qr-hud").textContent = `🔁 ${stats.due} due · 📚 ${stats.total} saved · ⭐ ${stats.mastered} mastered`;
  if (!due.length) {
    $("qr-card").innerHTML = `<div class="kit-big" style="text-align:center">🌤️</div><div class="kit-q">Nothing to review right now!</div><p class="kit-sub" style="text-align:center">${stats.total ? `You have ${stats.total} question${stats.total === 1 ? "" : "s"} waiting for their turn — they'll show up when they're due.` : "When you get a question wrong in a game, I'll save it here and bring it back at just the right time so it sticks."}</p><a class="kit-btn block" href="../game-room/">Play something</a>`;
    return;
  }
  $("qr-card").innerHTML = `<div class="kit-big" style="text-align:center">🔁</div><div class="kit-q">${due.length} question${due.length === 1 ? "" : "s"} ready for review</div><p class="kit-sub" style="text-align:center">These are ones that were tricky before. Getting them right again makes them stick!</p><button class="kit-btn block" id="qr-go">Start (about 3 minutes)</button>`;
  $("qr-go").onclick = () => run(due);

  function run(items) {
    let i = 0, right = 0, mastered = 0;
    const ask = () => {
      if (i >= items.length) return done();
      const it = items[i];
      $("qr-card").innerHTML = `<span class="qr-step">${STEP_LABEL[it.step || 0]} review · question ${i + 1}/${items.length}</span><div class="kit-q">${K.esc(it.p)}</div><div class="kit-opts">${K.shuffle(it.o).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="qr-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div>`;
      $("qr-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        const ok = b.dataset.o === it.a;
        $("qr-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === it.a) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        try { if (window.AIGJuice) AIGJuice.answer(ok, right); } catch (e) {}
        const r = await LB.srsResult(it.id, ok);
        if (ok) { right++; if (r.mastered) mastered++; }
        $("qr-msg").textContent = ok ? (r.mastered ? "⭐ Mastered! It won't come back." : `✅ Nice! I'll ask again in ${[3, 7, 14][r.step - 1] || 14} days.`) : `Not yet — it was “${it.a}”. I'll bring it back tomorrow.`;
        setTimeout(() => { i++; ask(); }, ok ? 1100 : 2200);
      });
    };
    async function done() {
      $("qr-card").innerHTML = "";
      $("qr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${mastered ? "⭐" : "🔁"}</div><h2>Review done!</h2><p class="kit-sub">${right}/${items.length} right${mastered ? ` · ${mastered} mastered` : ""}. Coming back to things is how memories get strong.</p><div class="kit-bonus" id="qr-bonus"></div>
        <a class="kit-btn block" href="../">Back to hub</a></div></div>`;
      K.finish("quick-review", right * 2 + mastered * 2, $("qr-bonus"));
    }
    ask();
  }
}
