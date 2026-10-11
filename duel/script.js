/* =================================================================
   Async Duel — challenge a friend to the SAME 10-question set without
   needing to be online at the same time (unlike Math Race's real-time
   multiplayer). Sender plays first, then the exact question set + their
   score goes into the friend's inbox; the friend plays it later, and
   whoever's client resolves it (always the recipient's) reports the
   outcome back and awards both sides' wallets.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("dl-signedout-overlay").classList.remove("hidden");
} else {
  initDuel();
}

function initDuel() {
  const ROUND_SIZE = 10;
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Same MC-building approach as the other new mini-games' buildMc.
  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) {
      return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    }
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    const correctNum = Number(m[1].replace(/,/g, ""));
    const suffix = m[2] || "";
    const options = new Set([correctNum]);
    let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const magnitude = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + magnitude * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump = 1;
    while (options.size < 4) options.add(correctNum + bump++);
    return {
      prompt: q.prompt,
      options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix),
      correctLabel: correctNum.toLocaleString("en-US") + suffix
    };
  }

  // Audit batch 4 (Duel Arena): friend picker, duel themes, a ghost of your friend's answer times,
  // one 50/50 per duel, a VS intro, speed tie-break, rematch button, a local league (Wood -> Diamond)
  // from your results, a champion belt for 3 wins in a row, and a record per friend.
  const THEMES = { mixed: GEN_KEYS, times: ["multiplication", "division"], addsub: ["addition-subtraction-add", "addition-subtraction-sub"], measure: ["measurement", "rounding"] };
  let theme = "mixed";
  const lsd = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsdw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const LEAGUES = [["🪵 Wood", 0], ["🪨 Stone", 3], ["⚙️ Iron", 6], ["🥇 Gold", 10], ["💎 Diamond", 15]];
  function league() { const w = Number(lsd("dl_wins", "0")); let l = LEAGUES[0]; LEAGUES.forEach(x => { if (w >= x[1]) l = x; }); return { name: l[0], wins: w, next: (LEAGUES.find(x => x[1] > w) || [null, null]) }; }
  function recordOutcome(friend, outcome) {
    const rec = JSON.parse(lsd("dl_rec", "{}") || "{}"); const r = rec[friend] = rec[friend] || { w: 0, l: 0, t: 0 };
    if (outcome === "win") { r.w++; lsdw("dl_wins", String(Number(lsd("dl_wins", "0")) + 1)); lsdw("dl_streak", String(Number(lsd("dl_streak", "0")) + 1)); }
    else if (outcome === "lose") { r.l++; lsdw("dl_streak", "0"); } else r.t++;
    lsdw("dl_rec", JSON.stringify(rec)); if (Number(lsd("dl_streak", "0")) === 3) setTimeout(() => alertBelt(), 600);
  }
  function alertBelt() { const t = document.createElement("div"); t.className = "dl-belt-toast"; t.textContent = "🥊 CHAMPION BELT! 3 duel wins in a row!"; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
  function vsIntro(friend, then) {
    const o = document.createElement("div"); o.className = "dl-vs"; o.innerHTML = `<div><b>${escapeHtml(player.name)}</b><span>⚔️</span><b>${escapeHtml(friend)}</b></div>`;
    document.body.appendChild(o); setTimeout(() => { o.remove(); then(); }, 1300);
  }
  function generateQuestionSet() {
    const out = [];
    for (let i = 0; i < ROUND_SIZE; i++) {
      const keys = THEMES[theme] || GEN_KEYS, key = keys[rand(0, keys.length - 1)];
      const raw = MATHVILLE_GENERATORS[key]("medium");
      out.push(buildMc(raw));
    }
    return out;
  }

  // Drives the shared "answer N questions" UI for BOTH the sender's own
  // playthrough (fresh questions) and the recipient's playthrough (the
  // exact stored question set from the duel) -- same overlay, same
  // scoring, so a duel is always played identically on both sides.
  function playQuestionSet(questions, onFinish) {
    let index = 0, score = 0, fifty = true, t0 = 0; const times = [];
    const overlay = document.getElementById("dl-question-overlay");
    overlay.classList.remove("hidden");

    function askNext() {
      if (index >= questions.length) {
        overlay.classList.add("hidden");
        onFinish(score, times);
        return;
      }
      const q = questions[index]; t0 = performance.now();
      document.getElementById("dl-q-count").innerHTML = `Question ${index + 1}/${questions.length}${q.t ? ` · 👻 your friend took ${(q.t / 1000).toFixed(1)}s` : ""}${fifty ? ' <button type="button" class="dl-fifty" id="dl-fifty">✂️ 50/50</button>' : ""}`;
      const fb = document.getElementById("dl-fifty"); if (fb) fb.onclick = () => { fifty = false; fb.remove(); shuffle([...document.querySelectorAll(".dl-q-btn")].filter(b => b.textContent !== q.correctLabel)).slice(0, 2).forEach(b => { b.disabled = true; b.style.opacity = ".3"; }); };
      document.getElementById("dl-q-prompt").textContent = q.prompt;
      const grid = document.getElementById("dl-q-grid");
      grid.innerHTML = "";
      q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "dl-q-btn";
        btn.type = "button";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
          const isCorrect = opt === q.correctLabel;
          if (isCorrect) score++;
          times.push(Math.round(performance.now() - t0));
          grid.querySelectorAll(".dl-q-btn").forEach(b => {
            b.disabled = true;
            if (b.textContent === q.correctLabel) b.classList.add("correct");
            else if (b === btn) b.classList.add("wrong");
          });
          if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("duel", "mixed", isCorrect);
          index++;
          setTimeout(askNext, 650);
        });
        grid.appendChild(btn);
      });
    }
    askNext();
  }

  function showResultModal(emoji, title, sub) {
    document.getElementById("dl-result-emoji").textContent = emoji;
    document.getElementById("dl-result-title").textContent = title;
    document.getElementById("dl-result-sub").textContent = sub;
    document.getElementById("dl-result-overlay").classList.remove("hidden");
  }
  document.getElementById("dl-result-close-btn").addEventListener("click", () => {
    document.getElementById("dl-result-overlay").classList.add("hidden");
    renderInboxAndResults();
  });

  // ---- Tab 1: send a new challenge --------------------------------------
  document.getElementById("dl-challenge-btn").addEventListener("click", async () => {
    const noteEl = document.getElementById("dl-challenge-note");
    noteEl.classList.remove("error");
    const friendName = document.getElementById("dl-friend-name").value.trim();
    if (!friendName) { noteEl.textContent = "Enter a friend's name first."; noteEl.classList.add("error"); return; }
    const questions = generateQuestionSet();
    vsIntro(friendName, () => playQuestionSet(questions, async (score, times) => {
      questions.forEach((q, i) => { q.t = times[i] || 0; });
      const result = await AIGLeaderboard.sendDuelChallenge(friendName, questions, score);
      if (!result.ok) {
        const msg = result.reason === "friend-not-found" ? `Couldn't find a player named "${friendName}".`
          : result.reason === "invalid-name" ? "Enter a valid friend's name (not your own)."
          : "Something went wrong sending the challenge.";
        showResultModal("😕", "Challenge not sent", `You scored ${score}/${questions.length}, but: ${msg}`);
        return;
      }
      showResultModal("⚔️", "Challenge sent!", `You scored ${score}/${questions.length}. ${result.toName} now has to beat it!`);
      document.getElementById("dl-friend-name").value = "";
    }));
  });

  // ---- Tab 2: pending challenges + past results --------------------------
  async function renderInboxAndResults() {
    const [inbox, results] = await Promise.all([AIGLeaderboard.getDuelInbox(), AIGLeaderboard.getDuelSentResults()]);

    const inboxList = document.getElementById("dl-inbox-list");
    inboxList.innerHTML = inbox.length ? "" : `<p class="dl-empty">No pending challenges right now.</p>`;
    inbox.forEach(duel => {
      const item = document.createElement("div");
      item.className = "dl-item";
      item.innerHTML = `
        <div class="dl-item-info">
          <div class="dl-item-name">${escapeHtml(duel.fromName)}</div>
          <div class="dl-item-sub">Scored ${duel.fromScore}/${duel.questions.length} -- beat it!</div>
        </div>
        <button class="dl-item-btn" type="button">Play</button>`;
      item.querySelector(".dl-item-btn").addEventListener("click", () => {
        vsIntro(duel.fromName, () => playQuestionSet(duel.questions, async (toScore, times) => {
          const result = await AIGLeaderboard.resolveDuelChallenge(duel, toScore);
          if (!result.ok) return;
          recordOutcome(duel.fromName, result.outcome === "to" ? "win" : result.outcome === "tie" ? "tie" : "lose");
          const mine = times.reduce((a, b) => a + b, 0), theirs = duel.questions.reduce((a, q) => a + (q.t || 0), 0);
          const tb = result.outcome === "tie" && theirs ? (mine < theirs ? " Tie-break: you were faster! ⚡" : " Tie-break: they were a bit faster.") : "";
          const emoji = result.outcome === "to" ? "🏆" : result.outcome === "tie" ? "🤝" : "💪";
          const title = result.outcome === "to" ? "You won!" : result.outcome === "tie" ? "It's a tie!" : "So close!";
          showResultModal(emoji, title, `You scored ${toScore}/${duel.questions.length} vs ${duel.fromName}'s ${duel.fromScore}/${duel.questions.length}.${tb}`);
          const rm = document.createElement("button"); rm.className = "dl-btn"; rm.type = "button"; rm.textContent = `🔁 Rematch ${duel.fromName}`; rm.style.marginTop = "8px";
          rm.onclick = () => { document.getElementById("dl-result-overlay").classList.add("hidden"); switchTab("challenge"); document.getElementById("dl-friend-name").value = duel.fromName; document.getElementById("dl-challenge-btn").click(); };
          document.getElementById("dl-result-close-btn").after(rm); setTimeout(() => rm.remove(), 60000);
        }));
      });
      inboxList.appendChild(item);
    });

    const resultsList = document.getElementById("dl-results-list");
    resultsList.innerHTML = results.length ? "" : `<p class="dl-empty">No results yet -- challenge a friend to get started!</p>`;
    results.forEach(r => {
      const item = document.createElement("div");
      item.className = "dl-item";
      const outcomeClass = r.outcome === "from" ? "win" : r.outcome === "to" ? "lose" : "tie";
      const outcomeLabel = r.outcome === "from" ? "You won!" : r.outcome === "to" ? "They won" : "Tie";
      if (!lsd("dl_seen_" + r.id, "")) { lsdw("dl_seen_" + r.id, "1"); recordOutcome(r.toName, r.outcome === "from" ? "win" : r.outcome === "to" ? "lose" : "tie"); }
      item.innerHTML = `
        <div class="dl-item-info">
          <div class="dl-item-name">vs ${escapeHtml(r.toName)}</div>
          <div class="dl-item-sub">${r.fromScore}/10 vs ${r.toScore}/10</div>
        </div>
        <div class="dl-item-outcome ${outcomeClass}">${outcomeLabel}</div>
        <button class="dl-dismiss" type="button" title="Dismiss">✕</button>`;
      item.querySelector(".dl-dismiss").addEventListener("click", async () => {
        await AIGLeaderboard.dismissDuelResult(r.id);
        renderInboxAndResults();
      });
      resultsList.appendChild(item);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- Arena header: league, belt, records, friend picker, themes ----
  async function arena() {
    const lg = league(), streak = Number(lsd("dl_streak", "0")), rec = JSON.parse(lsd("dl_rec", "{}") || "{}");
    document.getElementById("dl-arena").innerHTML = `<div class="dl-lg"><b>${lg.name} league</b> · ${lg.wins} wins${lg.next[0] ? ` · ${lg.next[1] - lg.wins} more for ${lg.next[0]}` : " · top league!"}${streak >= 3 ? " · 🥊 Champion belt!" : streak ? ` · 🔥 ${streak} win streak` : ""}</div>
      ${Object.keys(rec).length ? `<div class="dl-recs">${Object.entries(rec).slice(0, 6).map(([n, r]) => `<span>${escapeHtml(n)}: ${r.w}W ${r.l}L${r.t ? ` ${r.t}T` : ""}</span>`).join("")}</div>` : ""}
      <div class="dl-themes">${[["mixed", "🎲 Mixed"], ["times", "✖️ Times & ÷"], ["addsub", "➕ Add/Sub"], ["measure", "📏 Measure"]].map(([k, l]) => `<button type="button" data-th="${k}" class="${theme === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
    document.querySelectorAll("[data-th]").forEach(b => b.onclick = () => { theme = b.dataset.th; arena(); });
    try { const names = await AIGLeaderboard.listPlayerNames(); document.getElementById("dl-friends").innerHTML = names.filter(n => n.id !== player.id).map(n => `<option value="${escapeHtml(n.name)}"></option>`).join(""); } catch (e) {}
  }
  arena();
  // ---- Tabs ----
  document.getElementById("dl-tab-challenge").addEventListener("click", () => switchTab("challenge"));
  document.getElementById("dl-tab-mine").addEventListener("click", () => switchTab("mine"));
  function switchTab(tab) {
    document.getElementById("dl-tab-challenge").classList.toggle("active", tab === "challenge");
    document.getElementById("dl-tab-mine").classList.toggle("active", tab === "mine");
    document.getElementById("dl-panel-challenge").hidden = tab !== "challenge";
    document.getElementById("dl-panel-mine").hidden = tab !== "mine";
    if (tab === "mine") renderInboxAndResults();
  }
}
