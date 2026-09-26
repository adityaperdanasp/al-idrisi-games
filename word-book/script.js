/* =================================================================
   Word Book (PM round 12, item 16) -- every Language question
   you got wrong is kept here as a "word card": the question and the right
   answer, how many times it tripped you up, and where it is in its Quick
   Review schedule. The Practice tab quizzes you on them; answering a card
   that is DUE also moves it forward in the review schedule.
   (Only Language & Arts and Game Room language questions are saved -- there
   is no picture library, so cards are text.)
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("wb-overlay").innerHTML = K.signedOutHtml("📕");
else init();

async function init() {
  const LB = AIGLeaderboard;
  const words = (await LB.srsAll()).filter(x => x.s === "lang").sort((a, b) => (b.n || 1) - (a.n || 1) || a.p.localeCompare(b.p));
  const tabs = document.querySelectorAll(".wb-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "book" ? book() : practice(); });
  const now = Date.now();

  function book() {
    if (!words.length) { $("wb-main").innerHTML = '<div class="kit-card"><div class="kit-big" style="text-align:center">📕</div><div class="kit-q">Your word book is empty</div><p class="kit-sub" style="text-align:center">When a Language question trips you up in a game, it lands here so you can practise it later.</p></div>'; return; }
    $("wb-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;text-align:center">${words.length} word card${words.length === 1 ? "" : "s"} · ${words.filter(w => w.due <= now).length} due for review</div>${words.map(w => `<div class="wb-entry"><div style="font-weight:800;font-size:.9rem">${K.esc(w.p)}</div><span class="wb-a">✓ ${K.esc(w.a)}</span>
      <div class="wb-meta">Tripped up ${w.n || 1}× · review step ${(w.step || 0) + 1}/4 · ${w.due <= now ? "due now" : "due " + new Date(w.due).toLocaleDateString()}</div></div>`).join("")}</div>`;
  }
  function practice() {
    if (!words.length) return book();
    const set = K.shuffle(words).sort((a, b) => (b.due <= now) - (a.due <= now)).slice(0, 5);
    let i = 0, right = 0;
    const ask = () => {
      if (i >= set.length) return done();
      const w = set[i];
      $("wb-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 4px;font-weight:800">Card ${i + 1}/${set.length}</div><div class="kit-q">${K.esc(w.p)}</div><div class="kit-opts">${K.shuffle(w.o).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div></div>`;
      $("wb-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        const ok = b.dataset.o === w.a;
        $("wb-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === w.a) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong"); else right++;
        try { if (window.AIGJuice) AIGJuice.answer(ok, right); } catch (e) {}
        if (w.due <= now) await LB.srsResult(w.id, ok);
        setTimeout(() => { i++; ask(); }, ok ? 900 : 1900);
      });
    };
    async function done() {
      $("wb-main").innerHTML = "";
      $("wb-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right >= 4 ? "🌟" : "📕"}</div><h2>${right}/${set.length} words</h2><p class="kit-sub">Words that were due moved forward in their review schedule.</p><div class="kit-bonus" id="wb-bonus"></div><button class="kit-btn block" onclick="location.reload()">Practise again</button></div></div>`;
      K.finish("word-book", right * 2, $("wb-bonus"));
    }
    ask();
  }
  book();
}
