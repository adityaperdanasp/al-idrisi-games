/* =================================================================
   Quiz Card Race (PM round 11, item 2) -- an Uno-style race. Both you and
   Bo-Bot hold 6 question cards. Play a card by answering its question
   right and it leaves your hand; answer wrong and you must DRAW a card
   (hand max 9). Bo-Bot plays a card every few seconds and sometimes
   fumbles. First empty hand wins.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("cr-overlay").innerHTML = K.signedOutHtml("🃏");
else K.ready().then(start);

// Audit batch 6: action cards (⏭ skip Bo-Bot, ➕2 make it draw, ⭐ hard card that clears 2 of yours),
// a 3-in-a-row combo, a "BRAIN!" shout at one card (UNO-style), a best-of-3 match, a bot speed
// setting and three card backs to choose from.
let match = { me: 0, bot: 0, round: 1 }, speed = 1, back = "🂠";
try { match = JSON.parse(sessionStorage.getItem("cr_match") || "null") || match; const o = JSON.parse(sessionStorage.getItem("cr_opts") || "null"); if (o) { speed = o.speed; back = o.back; } } catch (e) {}
function start() {
  if (match.round === 1 && !start.shown) { start.shown = true; return setup(); }
  const SUBJ = ["math", "lang", "sci"], LABEL = { math: "Math", lang: "Words", sci: "Science" }, ICON = { math: "➗", lang: "📖", sci: "🔬" };
  const ACT = { skip: ["⏭", "Skip"], plus2: ["➕2", "+2"], star: ["⭐", "Hard"] };
  const HAND = 6, MAX = 9;
  let mine = [], ai = HAND, busy = false, over = false, nextId = 1, aiTimer = null, frozen = 0, last = [], shout = null;
  const newCard = () => { const r = Math.random(); if (r < 0.1) return { id: nextId++, act: "skip", subject: SUBJ[K.rand(0, 2)] }; if (r < 0.18) return { id: nextId++, act: "plus2", subject: SUBJ[K.rand(0, 2)] }; if (r < 0.24) return { id: nextId++, act: "star", subject: SUBJ[K.rand(0, 2)] }; return { id: nextId++, subject: SUBJ[K.rand(0, 2)] }; };
  for (let i = 0; i < HAND; i++) mine.push(newCard());

  function render() {
    $("cr-hand").innerHTML = mine.map(c => `<div class="cr-c ${c.subject} ${c.act ? "act" : ""}" data-id="${c.id}">${c.act ? ACT[c.act][0] : ICON[c.subject]}<small>${c.act ? ACT[c.act][1] + " · " + LABEL[c.subject] : LABEL[c.subject]}</small></div>`).join("");
    $("cr-ai").innerHTML = Array.from({ length: ai }, () => `<div class="cr-c back" style="width:40px;height:56px;font-size:1rem">${back}</div>`).join("");
    $("cr-ai-label").textContent = `${K.bot.emoji} ${K.bot.name}'s hand (Lv ${K.bot.level}) — ${ai} card${ai === 1 ? "" : "s"}${frozen > Date.now() ? " · ⏭ skipped!" : ""} · Match ${match.me}–${match.bot} (round ${match.round}/3)`;
    $("cr-hand").querySelectorAll(".cr-c").forEach(el => el.onclick = () => play(+el.dataset.id));
  }
  function aiTurn() {
    if (over) return;
    if (frozen > Date.now()) { aiTimer = setTimeout(aiTurn, frozen - Date.now() + 200); return; }
    if (Math.random() < K.bot.acc) { ai--; $("cr-msg").textContent = `${K.bot.emoji} ${K.bot.quip(ai <= 1 ? "think" : Math.random() < 0.4 ? "win" : "think")}`; } else { ai = Math.min(MAX, ai + 1); $("cr-msg").textContent = `${K.bot.emoji} ${K.bot.quip("slip")}`; }
    render();
    if (ai <= 0) return finish(false);
    aiTimer = setTimeout(aiTurn, K.rand(Math.round(K.bot.speedMs * 0.7 * speed), Math.round(K.bot.speedMs * 1.15 * speed)));
  }
  function brainShout() {
    const b = document.createElement("button"); b.className = "cr-shout"; b.type = "button"; b.textContent = "🧠 Shout BRAIN!"; document.body.appendChild(b);
    shout = setTimeout(() => { b.remove(); if (over) return; if (mine.length < MAX) mine.push(newCard()); $("cr-msg").textContent = "😅 You forgot to shout BRAIN! — draw a card."; render(); }, 3000);
    b.onclick = () => { clearTimeout(shout); b.remove(); $("cr-msg").textContent = "🧠 BRAIN! One card left!"; };
  }
  function play(id) {
    if (busy || over) return;
    const card = mine.find(c => c.id === id);
    if (!card) return;
    busy = true;
    const q = K.question({ subject: card.subject, difficulty: card.act === "star" ? "hard" : undefined });
    const ov = $("cr-overlay");
    ov.innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${card.act ? ACT[card.act][0] : ICON[card.subject]}</div>${card.act === "star" ? '<div class="kit-sub">⭐ Hard card: get it right to drop 2 cards!</div>' : ""}<div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts" id="cr-opts"></div></div></div>`;
    q.options.forEach(o => {
      const b = document.createElement("button");
      b.className = "kit-opt"; b.type = "button"; b.textContent = o;
      b.onclick = () => {
        const ok = o === q.correctLabel;
        K.record("card-race", q.key, ok, q);
        ov.querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.textContent === q.correctLabel) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        setTimeout(() => {
          ov.innerHTML = "";
          if (ok) {
            mine = mine.filter(c => c !== card); let msg = "✅ Card played!";
            if (card.act === "skip") { frozen = Date.now() + 6000; msg = "⏭ Bo-Bot is skipped for 6 seconds!"; }
            if (card.act === "plus2") { ai = Math.min(MAX, ai + 2); msg = "➕2 Bo-Bot draws two cards!"; }
            if (card.act === "star") { const extra = mine.find(c => !c.act); if (extra) mine = mine.filter(c => c !== extra); msg = "⭐ Hard card cleared 2 cards!"; }
            last.push(card.subject); if (last.length > 3) last.shift();
            if (last.length === 3 && last.every(x => x === last[0])) { const ex = mine.find(c => c.subject === last[0]); if (ex) { mine = mine.filter(c => c !== ex); msg += " 🔥 Combo! An extra card is gone."; } last = []; }
            $("cr-msg").textContent = msg;
          }
          else { last = []; if (mine.length < MAX) mine.push(newCard()); $("cr-msg").textContent = `❌ Not quite (${q.correctLabel}) — you draw a card.`; }
          busy = false; render();
          if (!mine.length) return finish(true);
          if (mine.length === 1) brainShout();
        }, 900);
      };
      $("cr-opts").appendChild(b);
    });
  }
  async function finish(won) {
    over = true; clearTimeout(aiTimer); clearTimeout(shout); document.querySelectorAll(".cr-shout").forEach(b => b.remove());
    if (won) match.me++; else match.bot++;
    const done = match.me >= 2 || match.bot >= 2 || match.round >= 3;
    const champ = done && match.me > match.bot;
    $("cr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🏆" : "🤖"}</div><h2>${won ? "You win the round!" : K.bot.name + " wins the round!"}</h2>
      <p class="kit-sub">Match score ${match.me}–${match.bot}. ${done ? (champ ? "🏆 You won the match!" : `${K.bot.name} won the match — rematch?`) : `Round ${match.round + 1} next!`}</p><div class="kit-bonus" id="cr-bonus"></div>
      <button class="kit-btn block" id="cr-next" type="button">${done ? "New match" : "Next round ▶"}</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    $("cr-next").onclick = () => { if (done) match = { me: 0, bot: 0, round: 1 }; else match.round++; try { sessionStorage.setItem("cr_match", JSON.stringify(match)); } catch (e) {} location.reload(); };
    if (champ) K.toastAdv("Card Race champion!");
    K.finish("card-race", won ? (champ ? 18 : 10) : 3, $("cr-bonus"));
  }
  render();
  aiTimer = setTimeout(aiTurn, Math.round(K.bot.speedMs * 0.8 * speed));
}
function setup() {
  $("cr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🃏</div><h2>Quiz Card Race</h2><p class="kit-sub">Best of 3 rounds. Watch for action cards: ⏭ skip, ➕2, ⭐ hard!</p>
    <div class="kit-sub" style="font-weight:800">Bo-Bot speed</div><div class="cr-pick">${[["1.4", "🐢 Relaxed"], ["1", "🙂 Normal"], ["0.75", "⚡ Fast"]].map(([v, l]) => `<button type="button" data-sp="${v}" class="${+v === speed ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="kit-sub" style="font-weight:800">Card back</div><div class="cr-pick">${["🂠", "🟥", "💠"].map(b => `<button type="button" data-bk="${b}" class="${b === back ? "on" : ""}">${b}</button>`).join("")}</div>
    <button class="kit-btn block" id="cr-go" type="button" style="margin-top:10px">Deal the cards!</button></div></div>`;
  $("cr-overlay").querySelectorAll("[data-sp]").forEach(b => b.onclick = () => { speed = +b.dataset.sp; $("cr-overlay").querySelectorAll("[data-sp]").forEach(x => x.classList.toggle("on", x === b)); });
  $("cr-overlay").querySelectorAll("[data-bk]").forEach(b => b.onclick = () => { back = b.dataset.bk; $("cr-overlay").querySelectorAll("[data-bk]").forEach(x => x.classList.toggle("on", x === b)); });
  $("cr-go").onclick = () => { try { sessionStorage.setItem("cr_opts", JSON.stringify({ speed, back })); } catch (e) {} $("cr-overlay").innerHTML = ""; start(); };
}
