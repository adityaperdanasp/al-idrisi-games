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

  function generateQuestionSet() {
    const out = [];
    for (let i = 0; i < ROUND_SIZE; i++) {
      const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
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
    let index = 0, score = 0;
    const overlay = document.getElementById("dl-question-overlay");
    overlay.classList.remove("hidden");

    function askNext() {
      if (index >= questions.length) {
        overlay.classList.add("hidden");
        onFinish(score);
        return;
      }
      const q = questions[index];
      document.getElementById("dl-q-count").textContent = `Question ${index + 1}/${questions.length}`;
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
    playQuestionSet(questions, async score => {
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
    });
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
        playQuestionSet(duel.questions, async toScore => {
          const result = await AIGLeaderboard.resolveDuelChallenge(duel, toScore);
          if (!result.ok) return;
          const emoji = result.outcome === "to" ? "🏆" : result.outcome === "tie" ? "🤝" : "💪";
          const title = result.outcome === "to" ? "You won!" : result.outcome === "tie" ? "It's a tie!" : "So close!";
          showResultModal(emoji, title, `You scored ${toScore}/${duel.questions.length} vs ${duel.fromName}'s ${duel.fromScore}/${duel.questions.length}.`);
        });
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
