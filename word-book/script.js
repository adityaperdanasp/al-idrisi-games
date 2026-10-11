/* =================================================================
   Word Book -- every Language question you got wrong is kept here as a
   "word card" (question, right answer, times missed, Quick Review step).
   Answering a card that is DUE also moves it forward in the schedule.
   Audit batch 2: card medals (bronze/silver/gold by review step), search
   and sort, a 🔊 button per card, and four practice modes: Quick 5,
   Speed 60s, Boss (the 5 you miss most) and Spell it (type the answer).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("wb-overlay").innerHTML = K.signedOutHtml("📕");
else init();

const medal = w => (w.step || 0) >= 3 ? "🥇" : (w.step || 0) >= 2 ? "🥈" : "🥉";
const say = t => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} };

async function init() {
  const LB = AIGLeaderboard;
  const words = (await LB.srsAll()).filter(x => x.s === "lang");
  const tabs = document.querySelectorAll(".wb-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "book" ? book() : modes(); });
  const now = Date.now();
  let sort = "missed", q = "";

  function sorted() {
    const list = words.filter(w => !q || (w.p + " " + w.a).toLowerCase().includes(q.toLowerCase()));
    if (sort === "missed") list.sort((a, b) => (b.n || 1) - (a.n || 1) || a.p.localeCompare(b.p));
    else if (sort === "due") list.sort((a, b) => a.due - b.due);
    else list.sort((a, b) => (b.id > a.id ? 1 : -1));
    return list;
  }
  function book() {
    if (!words.length) { $("wb-main").innerHTML = '<div class="kit-card"><div class="kit-big" style="text-align:center">📕</div><div class="kit-q">Your word book is empty</div><p class="kit-sub" style="text-align:center">When a Language question trips you up in a game, it lands here so you can practise it later.</p></div>'; return; }
    const gold = words.filter(w => (w.step || 0) >= 3).length;
    $("wb-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;text-align:center">${words.length} word card${words.length === 1 ? "" : "s"} · ${words.filter(w => w.due <= now).length} due · 🥇 ${gold} gold</div>
      <div class="wb-tools"><input id="wb-q" placeholder="Search words…" value="${K.esc(q)}"><select id="wb-sort"><option value="missed">Most missed</option><option value="due">Due first</option><option value="new">Newest</option></select></div>
      <div id="wb-list">${sorted().map(w => `<div class="wb-entry"><div style="font-weight:800;font-size:.9rem">${medal(w)} ${K.esc(w.p)} <button class="wb-say" data-say="${K.esc(w.p)}" type="button">🔊</button></div><span class="wb-a">✓ ${K.esc(w.a)}</span>
      <div class="wb-meta">Tripped up ${w.n || 1}× · review step ${(w.step || 0) + 1}/4 · ${w.due <= now ? "due now" : "due " + new Date(w.due).toLocaleDateString()}</div></div>`).join("") || '<div class="kit-sub">No cards match that search.</div>'}</div></div>`;
    $("wb-sort").value = sort;
    $("wb-sort").onchange = e => { sort = e.target.value; book(); };
    $("wb-q").oninput = e => { q = e.target.value; const pos = e.target.selectionStart; book(); const i = $("wb-q"); i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) {} };
    document.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say));
  }
  function modes() {
    if (!words.length) return book();
    $("wb-main").innerHTML = `<div class="kit-card"><div class="kit-q">Pick a practice mode</div>
      <button class="kit-btn block" data-m="quick" type="button">⚡ Quick 5 — five cards, due ones first</button>
      <button class="kit-btn block" data-m="speed" type="button">⏱️ Speed 60 — as many as you can in a minute</button>
      <button class="kit-btn block" data-m="boss" type="button">👹 Boss — the 5 words you miss most</button>
      <button class="kit-btn block" data-m="spell" type="button">✍️ Spell it — type the right answer</button></div>`;
    $("wb-main").querySelectorAll("[data-m]").forEach(b => b.onclick = () => practice(b.dataset.m));
  }
  function practice(mode) {
    let set;
    if (mode === "boss") set = words.slice().sort((a, b) => (b.n || 1) - (a.n || 1)).slice(0, 5);
    else if (mode === "speed") set = K.shuffle(words).concat(K.shuffle(words)).slice(0, 40);
    else set = K.shuffle(words).sort((a, b) => (b.due <= now) - (a.due <= now)).slice(0, 5);
    let i = 0, right = 0, total = 0, endAt = mode === "speed" ? Date.now() + 60000 : 0, tick = null;
    if (mode === "speed") tick = setInterval(() => { const t = $("wb-t"); const left = Math.max(0, endAt - Date.now()); if (t) t.style.width = (left / 600) + "%"; if (!left) { clearInterval(tick); done(); } }, 200);
    const ask = () => {
      if (i >= set.length || (endAt && Date.now() >= endAt)) return done();
      const w = set[i];
      const head = `<div class="kit-sub" style="margin:0 0 4px;font-weight:800">${mode === "speed" ? `⏱️ ${right} right` : `Card ${i + 1}/${set.length}`}${mode === "boss" ? " · 👹 boss card" : ""}</div>${mode === "speed" ? '<div class="kit-bar" style="margin-bottom:8px"><i id="wb-t"></i></div>' : ""}`;
      if (mode === "spell") {
        $("wb-main").innerHTML = `<div class="kit-card wb-flip">${head}<div class="kit-q">${K.esc(w.p)}</div><input id="wb-in" class="wb-in" autocomplete="off" autocapitalize="off" placeholder="Type the answer"><button class="kit-btn block" id="wb-ok" type="button" style="margin-top:8px">Check</button><div class="kit-sub" id="wb-msg" style="text-align:center;min-height:1.2em"></div></div>`;
        const check = async () => { const v = $("wb-in").value.trim().toLowerCase(), ok = v === String(w.a).trim().toLowerCase(); total++; if (ok) right++; $("wb-msg").textContent = ok ? "✅ Spot on!" : `It's “${w.a}”`; try { if (window.AIGJuice) AIGJuice.answer(ok, right); } catch (e) {} if (w.due <= now) await LB.srsResult(w.id, ok); setTimeout(() => { i++; ask(); }, ok ? 900 : 1900); };
        $("wb-ok").onclick = check; $("wb-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); check(); } }); $("wb-in").focus();
        return;
      }
      $("wb-main").innerHTML = `<div class="kit-card wb-flip">${head}<div class="kit-q">${K.esc(w.p)}</div><div class="kit-opts">${K.shuffle(w.o).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div></div>`;
      $("wb-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        const ok = b.dataset.o === w.a; total++;
        $("wb-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === w.a) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong"); else right++;
        try { if (window.AIGJuice) AIGJuice.answer(ok, right); } catch (e) {}
        if (w.due <= now) await LB.srsResult(w.id, ok);
        setTimeout(() => { i++; ask(); }, ok ? (mode === "speed" ? 350 : 900) : (mode === "speed" ? 900 : 1900));
      });
    };
    let finished = false;
    async function done() {
      if (finished) return; finished = true; clearInterval(tick);
      $("wb-main").innerHTML = "";
      const great = mode === "speed" ? right >= 10 : right >= Math.ceil(total * 0.8);
      if (great) K.toastAdv(mode === "boss" ? "Word boss defeated!" : mode === "speed" ? `${right} words in a minute!` : "Word master!");
      $("wb-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${great ? "🌟" : "📕"}</div><h2>${right}/${total} words</h2><p class="kit-sub">Words that were due moved forward in their review schedule.</p><div class="kit-bonus" id="wb-bonus"></div><button class="kit-btn block" onclick="location.reload()">Practise again</button></div></div>`;
      K.finish("word-book", right * 2, $("wb-bonus"));
    }
    ask();
  }
  book();
}
