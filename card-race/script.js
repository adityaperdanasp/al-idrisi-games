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

function start() {
  const SUBJ = ["math", "lang", "sci"], LABEL = { math: "Math", lang: "Words", sci: "Science" }, ICON = { math: "➗", lang: "📖", sci: "🔬" };
  const HAND = 6, MAX = 9;
  let mine = [], ai = HAND, busy = false, over = false, nextId = 1, aiTimer = null, wins = 0;
  const newCard = () => { const subject = SUBJ[K.rand(0, 2)]; return { id: nextId++, subject }; };
  for (let i = 0; i < HAND; i++) mine.push(newCard());

  function render() {
    $("cr-hand").innerHTML = mine.map(c => `<div class="cr-c ${c.subject}" data-id="${c.id}">${ICON[c.subject]}<small>${LABEL[c.subject]}</small></div>`).join("");
    $("cr-ai").innerHTML = Array.from({ length: ai }, () => '<div class="cr-c back" style="width:40px;height:56px;font-size:1rem">🂠</div>').join("");
    $("cr-ai-label").textContent = `🤖 Bo-Bot's hand — ${ai} card${ai === 1 ? "" : "s"}`;
    $("cr-hand").querySelectorAll(".cr-c").forEach(el => el.onclick = () => play(+el.dataset.id));
  }
  function aiTurn() {
    if (over) return;
    if (Math.random() < 0.7) ai--; else ai = Math.min(MAX, ai + 1);
    render();
    if (ai <= 0) return finish(false);
    aiTimer = setTimeout(aiTurn, K.rand(4200, 7200));
  }
  function play(id) {
    if (busy || over) return;
    const card = mine.find(c => c.id === id);
    if (!card) return;
    busy = true;
    const q = K.question({ subject: card.subject });
    const ov = $("cr-overlay");
    ov.innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${ICON[card.subject]}</div><div class="kit-q">${K.esc(q.prompt)}</div><div class="kit-opts" id="cr-opts"></div></div></div>`;
    q.options.forEach(o => {
      const b = document.createElement("button");
      b.className = "kit-opt"; b.type = "button"; b.textContent = o;
      b.onclick = () => {
        const ok = o === q.correctLabel;
        K.record("card-race", q.key, ok);
        ov.querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.textContent === q.correctLabel) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        setTimeout(() => {
          ov.innerHTML = "";
          if (ok) { mine = mine.filter(c => c !== card); $("cr-msg").textContent = "✅ Card played!"; }
          else { if (mine.length < MAX) mine.push(newCard()); $("cr-msg").textContent = `❌ Not quite (${q.correctLabel}) — you draw a card.`; }
          busy = false; render();
          if (!mine.length) finish(true);
        }, 900);
      };
      $("cr-opts").appendChild(b);
    });
  }
  async function finish(won) {
    over = true; clearTimeout(aiTimer);
    $("cr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🏆" : "🤖"}</div><h2>${won ? "You win!" : "Bo-Bot wins!"}</h2>
      <p class="kit-sub">${won ? "Your hand is empty — well played!" : `You still had ${mine.length} card${mine.length === 1 ? "" : "s"}. Rematch?`}</p><div class="kit-bonus" id="cr-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Play again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("card-race", won ? 15 : 3, $("cr-bonus"));
  }
  render();
  aiTimer = setTimeout(aiTurn, 5000);
}
