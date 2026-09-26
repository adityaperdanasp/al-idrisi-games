/* =================================================================
   Friend Duel (PM round 11, item 13) -- asynchronous. You pick a friend,
   play 8 questions, and the SAME 8 questions wait for them to play any
   time in the next 7 days. Most right wins (faster total time breaks a
   tie). Stored under leaderboard/duels/{id}: nothing personal beyond names
   and scores. Coin bonuses go through the normal capped mini-game payout.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("fd-overlay").innerHTML = K.signedOutHtml("⚔️");
else K.ready().then(init);

async function init() {
  const db = AIGLeaderboard.db;
  const DAY7 = 7 * 86400000;
  const tabs = document.querySelectorAll(".fd-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "inbox" ? inbox() : newDuel(); });

  async function myDuels() {
    const snap = await db.ref("leaderboard/duels").get();
    const all = snap.exists() ? snap.val() : {};
    return Object.entries(all).map(([id, d]) => ({ id, ...d })).filter(d => d.from && d.to && (d.from.id === player.id || d.to.id === player.id) && Date.now() - d.createdAt < DAY7).sort((a, b) => b.createdAt - a.createdAt);
  }
  const better = (a, b) => a.n !== b.n ? a.n > b.n : a.ms <= b.ms;
  async function inbox() {
    $("fd-main").innerHTML = '<div class="kit-card"><div class="kit-sub">Loading…</div></div>';
    const list = await myDuels();
    if (!list.length) { $("fd-main").innerHTML = '<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0">No duels yet. Challenge a friend from the "New duel" tab!</div></div>'; return; }
    $("fd-main").innerHTML = `<div class="kit-card">${list.map(d => {
      const me = player.id, other = d.from.id === me ? d.to : d.from;
      const mine = d.scores && d.scores[me], theirs = d.scores && d.scores[other.id];
      let tag = "", act = "";
      if (!mine) { tag = '<span class="fd-tag">Your turn</span>'; act = `<button class="kit-btn" data-play="${d.id}" style="padding:6px 14px">Play</button>`; }
      else if (!theirs) tag = '<span class="fd-tag">Waiting for them</span>';
      else {
        const won = mine.n === theirs.n && mine.ms === theirs.ms ? null : better(mine, theirs);
        tag = `<span class="fd-tag ${won === null ? "" : won ? "win" : "lose"}">${won === null ? "Draw" : won ? "You won! 🎉" : "They won"} · ${mine.n}–${theirs.n}</span>`;
        if (!(d.claimed && d.claimed[me])) act = `<button class="kit-btn" data-claim="${d.id}" data-won="${won ? 1 : 0}" style="padding:6px 14px">Collect</button>`;
      }
      return `<div class="fd-row"><span><b>${K.esc(other.name)}</b><br>${tag}</span>${act}</div>`;
    }).join("")}</div>`;
    $("fd-main").querySelectorAll("[data-play]").forEach(b => b.onclick = () => play(list.find(d => d.id === b.dataset.play)));
    $("fd-main").querySelectorAll("[data-claim]").forEach(b => b.onclick = async () => {
      b.disabled = true;
      await db.ref(`leaderboard/duels/${b.dataset.claim}/claimed/${player.id}`).set(true); // marker BEFORE paying
      const r = await AIGLeaderboard.awardMiniGame("friend-duel", b.dataset.won === "1" ? 12 : 4);
      b.textContent = r.paid ? `+🪙${r.paid}` : "Done";
    });
  }

  async function newDuel() {
    const friends = await AIGLeaderboard.listPlayerNames();
    $("fd-main").innerHTML = `<div class="kit-card"><div class="fd-row" style="border:0;padding-top:0"><span><b>${K.bot.emoji} ${K.esc(K.bot.name)}</b> <span class="fd-tag">Bo-Bot · Lv ${K.bot.level}</span><br><small>Instant duel — no waiting!</small></span><button class="kit-btn" id="fd-bot" style="padding:6px 14px">Duel</button></div>
      <input class="fd-search" id="fd-q" placeholder="Search for a friend…"><div id="fd-list"></div></div>`;
    $("fd-bot").onclick = () => challenge({ id: "__bot__", name: K.bot.name, bot: true });
    const draw = () => {
      const q = $("fd-q").value.trim().toLowerCase();
      $("fd-list").innerHTML = friends.filter(f => !q || f.name.toLowerCase().includes(q)).slice(0, 30).map(f => `<div class="fd-row"><b>${K.esc(f.name)}</b><button class="kit-btn" data-f="${K.esc(f.id)}" data-n="${K.esc(f.name)}" style="padding:6px 14px">Challenge</button></div>`).join("") || '<div class="kit-sub" style="margin:0">No one found.</div>';
      $("fd-list").querySelectorAll("[data-f]").forEach(b => b.onclick = () => challenge({ id: b.dataset.f, name: b.dataset.n }));
    };
    $("fd-q").oninput = draw; draw();
  }
  function challenge(friend) {
    const qs = Array.from({ length: 8 }, () => { const q = K.question({}); return { p: q.prompt, o: q.options, a: q.correctLabel, k: q.key, s: q.subject }; });
    play({ id: null, bot: !!friend.bot, from: { id: player.id, name: player.name }, to: friend, qs, createdAt: Date.now(), scores: {} });
  }

  function play(d) {
    let i = 0, n = 0; const t0 = Date.now();
    const ask = () => {
      if (i >= d.qs.length) return finish();
      const q = d.qs[i];
      $("fd-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0">Question ${i + 1}/8 · vs ${K.esc((d.from.id === player.id ? d.to : d.from).name)}</div><div class="kit-q">${K.esc(q.p)}</div><div class="kit-opts">${q.o.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div></div>`;
      $("fd-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.a;
        K.record("friend-duel", q.k || "duel", ok, { prompt: q.p, options: q.o, correctLabel: q.a, key: q.k, subject: q.s || "math" });
        $("fd-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add("right"); });
        if (ok) n++; else b.classList.add("wrong");
        setTimeout(() => { i++; ask(); }, 700);
      });
    };
    async function finish() {
      const me = { n, ms: Date.now() - t0 };
      if (d.bot) {
        let bn = 0; for (let k = 0; k < 8; k++) if (Math.random() < K.bot.acc) bn++;
        const won = n > bn || (n === bn && Math.random() < 0.5);
        $("fd-main").innerHTML = "";
        $("fd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🏆" : K.bot.emoji}</div><h2>${won ? "You beat " + K.esc(K.bot.name) + "!" : K.esc(K.bot.name) + " wins!"}</h2><p class="kit-sub">You ${n}/8 · ${K.esc(K.bot.name)} ${bn}/8<br>${K.bot.emoji} “${K.bot.quip(won ? "lose" : "win")}”</p><div class="kit-bonus" id="fd-bonus"></div><button class="kit-btn block" id="fd-ok">Back</button></div></div>`;
        $("fd-ok").onclick = () => { $("fd-overlay").innerHTML = ""; newDuel(); };
        K.finish("friend-duel", won ? 10 : 3, $("fd-bonus"));
        return;
      }
      let id = d.id;
      if (!id) { const ref = db.ref("leaderboard/duels").push(); id = ref.key; await ref.set({ from: d.from, to: d.to, qs: d.qs, createdAt: d.createdAt, scores: { [player.id]: me } }); }
      else await db.ref(`leaderboard/duels/${id}/scores/${player.id}`).set(me);
      $("fd-main").innerHTML = "";
      $("fd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">⚔️</div><h2>You scored ${n}/8</h2><p class="kit-sub">${d.scores && Object.keys(d.scores).length ? "Check the Duels tab to see who won!" : "Your friend can play it any time in the next 7 days."}</p><button class="kit-btn block" id="fd-ok">To my duels</button></div></div>`;
      $("fd-ok").onclick = () => { $("fd-overlay").innerHTML = ""; tabs[0].click(); };
    }
    ask();
  }
  inbox();
}
