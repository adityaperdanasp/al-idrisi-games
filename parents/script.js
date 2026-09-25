// BrainBox — Parent Portal. Sign in as your child (same name+PIN they use
// to play, checked against testerAccounts/{nameKey} -- NOT the teacher
// dashboard's single shared PIN, which would expose every student's data
// to every parent) to see their progress and set Focus Round topics.
//
// Report data reuses the exact same paths/shapes dashboard.js already
// reads (players/{id}/topicStats, players/{id}/badges,
// leaderboard/{gameId}/{id}) -- no new schema, just a parent-facing,
// single-child slice of what the teacher dashboard already computes.
(function () {
  const GAMES = [
    { id: "mathrace", label: "Math Race", icon: "🏎️", color: "#3d6c94", bg: "#c1d4f6" },
    { id: "language-arts", label: "Language & Arts", icon: "📖", color: "#6f5498", bg: "#f6c1e0" },
    { id: "solarquest", label: "SolarQuest", icon: "🪐", color: "#d9631f", bg: "#c1e1c1" },
    { id: "mathville", label: "MathVille", icon: "🏘️", color: "#a8622f", bg: "#f0dcc4" }
  ];

  // Same business rule as dashboard.js's weakTopics() (design handoff
  // README, State Management section) -- keep both in sync if this ever
  // changes.
  const MIN_ATTEMPTS = 3;
  const WEAK_ACCURACY = 0.7;

  const MATHVILLE_CHAPTER_TITLES = {
    "place-value": "Place Value", "addition-subtraction": "Addition & Subtraction",
    "prime-numbers": "Prime Number", "gcf-lcm": "GCF & LCM", "multiplication": "Multiplication",
    "division": "Division", "mixed-operation": "Mixed Operation", "measurement": "Measurement",
    "rounding": "Rounding", "word-problems": "Word Problems"
  };

  // Same 7 tiers as leaderboard.js's TITLE_TIERS -- duplicated here (this
  // page talks to Firebase directly via aigDb, not through
  // window.AIGLeaderboard) same pattern as MATHVILLE_CHAPTER_TITLES above.
  // Keep both lists in sync if the tiers ever change.
  const TITLE_TIERS = [
    { min: 0, name: "Pemula", emoji: "🌱" },
    { min: 20, name: "Rajin Belajar", emoji: "📘" },
    { min: 50, name: "Jagoan Matematika", emoji: "⚡" },
    { min: 100, name: "Bintang Kelas", emoji: "⭐" },
    { min: 200, name: "Master BrainBox", emoji: "🏅" },
    { min: 400, name: "Grandmaster", emoji: "👑" },
    { min: 800, name: "Legenda BrainBox", emoji: "🌟" }
  ];
  function titleForCount(count) {
    let result = TITLE_TIERS[0];
    for (const t of TITLE_TIERS) if (count >= t.min) result = t;
    return result;
  }

  function sanitizeNameKey(name) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function showError(msg) {
    const el = document.getElementById("p-error");
    el.textContent = msg;
    el.classList.add("visible");
    document.getElementById("p-name").classList.add("invalid");
  }
  function clearError() {
    document.getElementById("p-error").classList.remove("visible");
    document.getElementById("p-name").classList.remove("invalid");
  }
  document.getElementById("p-name").addEventListener("input", clearError);
  document.getElementById("p-pin").addEventListener("input", clearError);

  let childId = null;
  let childName = null;

  async function handleSignIn() {
    const rawName = document.getElementById("p-name").value.trim();
    const pin = document.getElementById("p-pin").value.trim();
    clearError();
    if (!rawName) { showError("Enter your child's name"); return; }
    const key = sanitizeNameKey(rawName);
    if (!key) { showError("Enter your child's name"); return; }
    if (!/^\d{4}$/.test(pin)) { showError("PIN must be 4 digits"); return; }

    const btn = document.getElementById("p-signin-btn");
    btn.disabled = true;
    try {
      const snap = await aigDb.ref(`testerAccounts/${key}`).get();
      const existing = snap.exists() ? snap.val() : null;
      if (!existing || existing.pin !== pin) { showError("Name or PIN is incorrect"); return; }

      childId = key;
      childName = existing.name;
      document.getElementById("screen-signin").classList.remove("active");
      document.getElementById("screen-portal").classList.add("active");
      loadPortal();
    } catch (e) {
      showError("Something went wrong — try again");
    } finally {
      btn.disabled = false;
    }
  }
  document.getElementById("p-signin-btn").addEventListener("click", handleSignIn);
  document.getElementById("p-pin").addEventListener("keydown", e => { if (e.key === "Enter") handleSignIn(); });

  document.getElementById("p-signout-btn").addEventListener("click", () => {
    childId = null; childName = null;
    document.getElementById("p-name").value = "";
    document.getElementById("p-pin").value = "";
    document.getElementById("screen-portal").classList.remove("active");
    document.getElementById("screen-signin").classList.add("active");
  });

  function xpFor(gameId, badges) {
    if (!badges) return 0;
    if (gameId === "language-arts") return badges.xpTotal || 0;
    if (gameId === "solarquest") return badges.xp || 0;
    if (gameId === "mathville") return badges.xpTotal || 0;
    return 0; // Math Race has no XP system, sticker badges only
  }

  function weakTopicsFor(gameId, topicStats) {
    if (!topicStats) return [];
    return Object.entries(topicStats)
      .map(([topic, data]) => {
        const correct = (data && data.correct) || 0;
        const wrong = (data && data.wrong) || 0;
        const total = correct + wrong;
        return { gameId, topic, correct, wrong, total, accuracy: total ? correct / total : 0 };
      })
      .filter(t => t.total >= MIN_ATTEMPTS && t.accuracy < WEAK_ACCURACY);
  }

  // Mirrors dashboard.js's prettifyTopic() exactly -- same topicStats
  // shapes, same formatting rules, kept in sync deliberately since
  // there's no shared module between the two apps.
  function prettifyTopic(gameId, topicKey) {
    if (gameId === "mathrace") {
      let m = topicKey.match(/^times-(\d+)$/);
      if (m) return `Times table ${m[1]}`;
      m = topicKey.match(/^divby-(\d+)$/);
      if (m) return `Division by ${m[1]}`;
      return topicKey;
    }
    if (gameId === "solarquest") {
      return topicKey.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    if (gameId === "mathville") {
      return MATHVILLE_CHAPTER_TITLES[topicKey] || topicKey;
    }
    return topicKey; // language-arts topics ("Spelling", "Grammar", ...) are already human-readable
  }

  async function loadPortal() {
    document.getElementById("p-avatar").textContent = childName.charAt(0).toUpperCase();
    document.getElementById("p-portal-name").textContent = childName;
    document.getElementById("p-portal-sub").textContent = "Loading…";

    const [playerSnap, ...lbSnaps] = await Promise.all([
      aigDb.ref(`players/${childId}`).get(),
      ...GAMES.map(g => aigDb.ref(`leaderboard/${g.id}/${childId}`).get())
    ]);
    const player = playerSnap.exists() ? playerSnap.val() : {};
    const badges = player.badges || {};
    const topicStats = player.topicStats || {};
    const assignedTopics = player.assignedTopics || [];
    const parentMessage = player.parentMessage || null;
    const parentVoiceNote = player.parentVoiceNote || null;

    // ---- Last sent message preview ----
    const lastMsgEl = document.getElementById("p-msg-last");
    lastMsgEl.textContent = parentMessage
      ? `Last sent ${new Date(parentMessage.sentAt).toLocaleDateString()}${parentMessage.read ? " · seen" : " · not seen yet"}: "${parentMessage.text}"`
      : "";

    // ---- Last recorded cheer preview ----
    document.getElementById("p-voice-last").textContent = parentVoiceNote
      ? `Last recorded ${new Date(parentVoiceNote.recordedAt).toLocaleDateString()}${parentVoiceNote.played ? " · played for them" : " · not played yet"}`
      : "";

    // ---- Header ----
    const totalXp = GAMES.reduce((sum, g) => sum + xpFor(g.id, badges[g.id]), 0);
    const daysPlayed = new Set();
    lbSnaps.forEach(snap => {
      if (snap.exists() && snap.val().lastPlayed) daysPlayed.add(new Date(snap.val().lastPlayed).toDateString());
    });
    document.getElementById("p-portal-sub").textContent =
      `${totalXp} XP total` + (daysPlayed.size ? ` · played recently in ${daysPlayed.size} game${daysPlayed.size > 1 ? "s" : ""}` : "");

    // ---- Assign: pre-check whatever's already assigned ----
    document.querySelectorAll("#p-topic-list .p-topic-item").forEach(item => {
      item.querySelector("input").checked = assignedTopics.includes(item.dataset.topic);
    });
    renderPicked();

    // ---- Achievements snapshot (current state, not a push notification --
    // there's no event log of "when" a rank/high-score changed, and wiring
    // a real push alert would need a server-side trigger this app doesn't
    // have; a parent checking here any time still sees where things stand) ----
    renderAchievements(player);

    // ---- Real-world missions (PM round 10, item 19) ----
    renderMissions(player.parentMissions || {});

    // ---- Review kid-written quiz questions ----
    renderQuizReview(player.customQuestions || {});

    // ---- Review custom nickname/tagline ----
    renderNicknameReview(player.nickname || null);

    // ---- Real-world reward ledger ----
    renderRewardCatalog(player.rewardCatalog || {});
    renderRewardRedemptions(player.rewardRedemptions || {});

    // ---- Needs Practice ----
    let weak = [];
    GAMES.forEach(g => weak = weak.concat(weakTopicsFor(g.id, topicStats[g.id])));
    weak.sort((a, b) => a.accuracy - b.accuracy);
    const weakList = document.getElementById("p-weak-list");
    if (!weak.length) {
      weakList.innerHTML = `<p class="p-empty-note">No weak spots yet — keep practicing to build up a history!</p>`;
    } else {
      weakList.innerHTML = weak.slice(0, 6).map(t => {
        const game = GAMES.find(g => g.id === t.gameId);
        const pct = Math.round(t.accuracy * 100);
        // Only MathVille topics can generate a worksheet -- its questions
        // come from generators.js, reachable in-page there. The other
        // games' question banks aren't set up for a standalone print view.
        const printBtn = t.gameId === "mathville"
          ? `<a class="p-weak-print-btn" href="../mathville/index.html?worksheet=1&topic=${encodeURIComponent(t.topic)}&for=${encodeURIComponent(childName)}" target="_blank" rel="noopener">🖨️ Print Worksheet</a>`
          : "";
        return `
          <div class="p-weak-card">
            <div class="p-weak-topic">${escapeHtml(prettifyTopic(t.gameId, t.topic))} <span class="p-weak-game">${escapeHtml(game.label)}</span></div>
            <div class="p-weak-bar-track"><div class="p-weak-bar-fill" style="width:${pct}%"></div></div>
            <div class="p-weak-pct">${pct}% correct <span class="p-weak-tries">(${t.total} tries)</span></div>
            ${printBtn}
          </div>`;
      }).join("");
    }

    // ---- Progress by game ----
    document.getElementById("p-xp-list").innerHTML = GAMES.map(g => {
      const xp = xpFor(g.id, badges[g.id]);
      const lb = badges[g.id];
      const played = lb || xp > 0;
      const pct = Math.min(100, Math.round((xp / 500) * 100)); // 500 XP ~= a full bar, matches dashboard.js's rough scale
      return `
        <div class="p-xp-row">
          <span class="p-xp-icon" style="background:${g.bg}">${g.icon}</span>
          <div class="p-xp-track-wrap">
            <div class="p-xp-label">${escapeHtml(g.label)}${g.id !== "mathrace" ? ` — ${xp} XP` : ""}</div>
            <div class="p-xp-track"><div class="p-xp-fill" style="width:${played ? Math.max(pct, 4) : 0}%;background:${g.color}"></div></div>
          </div>
        </div>`;
    }).join("");
  }

  function renderAchievements(player) {
    const wrap = document.getElementById("p-achievements");
    const totalCorrect = player.totalCorrect || 0;
    const tier = titleForCount(totalCorrect);
    const next = TITLE_TIERS.find(t => t.min > totalCorrect) || null;
    const mv = (player.badges && player.badges.mathville) || {};
    const speedBest = player.speedRoundBest || null;

    const rows = [
      { label: "Rank", value: `${tier.emoji} ${tier.name}`, sub: next ? `${next.min - totalCorrect} more correct to reach ${next.emoji} ${next.name}` : "Top rank reached!" },
      { label: "Plane Mode best score", value: mv.planeHighScore || 0 },
      { label: "Ninja Runner best score", value: mv.ninjaHighScore || 0 },
      { label: "Speed Round best score", value: speedBest ? speedBest.score : 0 }
    ];
    wrap.innerHTML = rows.map(r => `
      <div class="p-achievement-row">
        <span class="p-achievement-label">${escapeHtml(r.label)}</span>
        <span class="p-achievement-value">${escapeHtml(String(r.value))}</span>
        ${r.sub ? `<span class="p-achievement-sub">${escapeHtml(r.sub)}</span>` : ""}
      </div>`).join("");
  }

  function renderMissions(missions) {
    const wrap = document.getElementById("p-mission-list");
    const entries = Object.entries(missions).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    wrap.innerHTML = entries.map(([id, m]) => {
      const right = m.status === "done"
        ? `<div class="p-quiz-actions"><button class="p-quiz-btn p-quiz-approve" data-mission-approve="${id}">✓ Approve</button><button class="p-quiz-btn p-quiz-reject" data-mission-reopen="${id}">↺ Not yet</button></div>`
        : `<span class="p-quiz-status p-quiz-status-${m.status === "approved" ? "approved" : "pending"}">${m.status === "approved" ? "approved" : "waiting for your child"}</span>${m.status === "open" ? ` <button class="p-quiz-btn p-quiz-reject" data-mission-del="${id}">Delete</button>` : ""}`;
      return `<div class="p-quiz-card"><div class="p-quiz-prompt">${escapeHtml(m.text)}</div><div class="p-quiz-options">${m.reward ? "🎁 " + escapeHtml(m.reward) : ""}${m.bonus ? ` · 🪙${m.bonus | 0}` : ""}</div>${right}</div>`;
    }).join("");
    const add = document.getElementById("p-mission-add");
    add.onclick = async () => {
      const text = document.getElementById("p-mission-text").value.trim();
      if (!text) return;
      const bonus = Math.max(0, Math.min(100, parseInt(document.getElementById("p-mission-bonus").value, 10) || 0));
      add.disabled = true;
      await aigDb.ref(`players/${childId}/parentMissions`).push({ text, reward: document.getElementById("p-mission-reward").value.trim(), bonus, status: "open", createdAt: Date.now() });
      ["p-mission-text", "p-mission-reward", "p-mission-bonus"].forEach(i => { document.getElementById(i).value = ""; });
      add.disabled = false;
      loadPortal();
    };
    wrap.querySelectorAll("[data-mission-approve]").forEach(b => b.onclick = async () => { await aigDb.ref(`players/${childId}/parentMissions/${b.dataset.missionApprove}/status`).set("approved"); loadPortal(); });
    wrap.querySelectorAll("[data-mission-reopen]").forEach(b => b.onclick = async () => { await aigDb.ref(`players/${childId}/parentMissions/${b.dataset.missionReopen}/status`).set("open"); loadPortal(); });
    wrap.querySelectorAll("[data-mission-del]").forEach(b => b.onclick = async () => { await aigDb.ref(`players/${childId}/parentMissions/${b.dataset.missionDel}`).remove(); loadPortal(); });
  }

  function renderQuizReview(customQuestions) {
    const wrap = document.getElementById("p-quiz-list");
    const entries = Object.entries(customQuestions);
    if (!entries.length) {
      wrap.innerHTML = `<p class="p-empty-note">Nothing submitted yet.</p>`;
      return;
    }
    // Pending first (needs action), then approved/rejected as a small log.
    entries.sort((a, b) => {
      const rank = s => s === "pending" ? 0 : 1;
      return rank(a[1].status) - rank(b[1].status) || (b[1].createdAt || 0) - (a[1].createdAt || 0);
    });
    wrap.innerHTML = entries.map(([qId, q]) => {
      const optionsHtml = q.options.map((opt, i) =>
        i === q.correctIndex ? `<span class="p-quiz-correct">${escapeHtml(opt)} ✓</span>` : escapeHtml(opt)
      ).join(" · ");
      const actions = q.status === "pending"
        ? `<div class="p-quiz-actions">
             <button class="p-quiz-btn p-quiz-approve" data-quiz-approve="${qId}">✓ Approve</button>
             <button class="p-quiz-btn p-quiz-reject" data-quiz-reject="${qId}">✕ Reject</button>
           </div>`
        : `<span class="p-quiz-status p-quiz-status-${q.status}">${q.status}</span>`;
      return `
        <div class="p-quiz-card">
          <div class="p-quiz-prompt">${escapeHtml(q.prompt)}</div>
          <div class="p-quiz-options">${optionsHtml}</div>
          ${actions}
        </div>`;
    }).join("");

    wrap.querySelectorAll("[data-quiz-approve]").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.closest(".p-quiz-actions").style.opacity = "0.5";
        await aigDb.ref(`players/${childId}/customQuestions/${btn.dataset.quizApprove}/status`).set("approved");
        loadPortal();
      });
    });
    wrap.querySelectorAll("[data-quiz-reject]").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.closest(".p-quiz-actions").style.opacity = "0.5";
        await aigDb.ref(`players/${childId}/customQuestions/${btn.dataset.quizReject}/status`).set("rejected");
        loadPortal();
      });
    });
  }

  // Same approve/reject flow as renderQuizReview above, just for the
  // single nickname/tagline field instead of a list of questions --
  // only shown at all once the kid has actually submitted one.
  function renderNicknameReview(nickname) {
    const section = document.getElementById("p-nickname-section");
    const wrap = document.getElementById("p-nickname-review");
    if (!nickname) { section.hidden = true; return; }
    section.hidden = false;
    if (nickname.status !== "pending") {
      wrap.innerHTML = `
        <div class="p-quiz-card">
          <div class="p-quiz-prompt">"${escapeHtml(nickname.text)}"</div>
          <span class="p-quiz-status p-quiz-status-${nickname.status}">${nickname.status}</span>
        </div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="p-quiz-card">
        <div class="p-quiz-prompt">"${escapeHtml(nickname.text)}"</div>
        <div class="p-quiz-actions">
          <button class="p-quiz-btn p-quiz-approve" id="btn-nickname-approve">✓ Approve</button>
          <button class="p-quiz-btn p-quiz-reject" id="btn-nickname-reject">✕ Reject</button>
        </div>
      </div>`;
    document.getElementById("btn-nickname-approve").addEventListener("click", async () => {
      await aigDb.ref(`players/${childId}/nickname/status`).set("approved");
      loadPortal();
    });
    document.getElementById("btn-nickname-reject").addEventListener("click", async () => {
      await aigDb.ref(`players/${childId}/nickname/status`).set("rejected");
      loadPortal();
    });
  }

  function rewardCostLabel(cost) {
    const parts = [];
    if (cost.coins) parts.push(`🪙${cost.coins}`);
    if (cost.gems) parts.push(`💎${cost.gems}`);
    return parts.join(" ") || "Free";
  }

  function renderRewardCatalog(catalog) {
    const wrap = document.getElementById("p-reward-catalog");
    const entries = Object.entries(catalog);
    if (!entries.length) {
      wrap.innerHTML = `<p class="p-empty-note">No rewards set up yet -- add one above!</p>`;
      return;
    }
    wrap.innerHTML = entries.map(([id, item]) => `
      <div class="p-reward-row">
        <span class="p-reward-name">${escapeHtml(item.label)}</span>
        <span class="p-reward-cost">${rewardCostLabel(item.cost || {})}</span>
        <button class="p-reward-remove" data-reward-remove="${id}" type="button">✕</button>
      </div>`).join("");
    wrap.querySelectorAll("[data-reward-remove]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await aigDb.ref(`players/${childId}/rewardCatalog/${btn.dataset.rewardRemove}`).remove();
        loadPortal();
      });
    });
  }

  function renderRewardRedemptions(redemptions) {
    const wrap = document.getElementById("p-reward-redemptions");
    const entries = Object.entries(redemptions).filter(([, r]) => !r.fulfilled);
    entries.sort((a, b) => (b[1].redeemedAt || 0) - (a[1].redeemedAt || 0));
    if (!entries.length) {
      wrap.innerHTML = `<p class="p-empty-note">Nothing waiting -- all caught up!</p>`;
      return;
    }
    wrap.innerHTML = entries.map(([id, r]) => `
      <div class="p-reward-row">
        <span class="p-reward-name">${escapeHtml(r.label)}</span>
        <span class="p-reward-cost">${rewardCostLabel(r.cost || {})}</span>
        <button class="p-quiz-btn p-quiz-approve" data-reward-fulfill="${id}" type="button">✓ Given</button>
      </div>`).join("");
    wrap.querySelectorAll("[data-reward-fulfill]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await aigDb.ref(`players/${childId}/rewardRedemptions/${btn.dataset.rewardFulfill}/fulfilled`).set(true);
        loadPortal();
      });
    });
  }

  document.getElementById("p-reward-add-btn").addEventListener("click", async () => {
    const label = document.getElementById("p-reward-label").value.trim();
    const coins = Number(document.getElementById("p-reward-coins").value) || 0;
    const gems = Number(document.getElementById("p-reward-gems").value) || 0;
    if (!label || (!coins && !gems)) return;
    const ref = aigDb.ref(`players/${childId}/rewardCatalog`).push();
    await ref.set({ label, cost: { coins, gems } });
    document.getElementById("p-reward-label").value = "";
    document.getElementById("p-reward-coins").value = "";
    document.getElementById("p-reward-gems").value = "";
    loadPortal();
  });

  // ---- Assign picker interactivity (same recipe as MathVille's Focus
  // Round overlay: pick moves into the pinned box, capped at 8) ----
  const list = document.getElementById("p-topic-list");
  const countEl = document.getElementById("p-picked-count");
  const pillsEl = document.getElementById("p-picked-pills");
  const pillClassFor = item => item.classList.contains("p-topic-item-math") ? "p-pill-math"
    : item.classList.contains("p-topic-item-lang") ? "p-pill-lang" : "p-pill-sci";
  function renderPicked() {
    const items = Array.from(list.querySelectorAll(".p-topic-item"));
    const checked = items.filter(i => i.querySelector("input").checked);
    items.forEach(i => i.classList.toggle("p-topic-item-picked", i.querySelector("input").checked));
    countEl.textContent = `${checked.length} / 8 topics picked`;
    pillsEl.innerHTML = checked.map(item => {
      const emoji = item.querySelector(".p-topic-emoji").textContent;
      const name = item.querySelector(".p-topic-name").textContent;
      return `<span class="p-pill ${pillClassFor(item)}">${emoji} ${name}</span>`;
    }).join("");
  }
  list.addEventListener("change", e => {
    const checkedCount = list.querySelectorAll(".p-topic-item input:checked").length;
    if (checkedCount > 8) { e.target.checked = false; return; }
    renderPicked();
  });

  document.getElementById("p-save-btn").addEventListener("click", async () => {
    const checked = Array.from(list.querySelectorAll(".p-topic-item input:checked"))
      .map(inp => inp.closest(".p-topic-item").dataset.topic);
    const btn = document.getElementById("p-save-btn");
    const note = document.getElementById("p-save-note");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      await aigDb.ref(`players/${childId}/assignedTopics`).set(checked);
      note.textContent = "Saved! ✓";
      note.classList.add("visible");
      setTimeout(() => note.classList.remove("visible"), 2500);
    } catch (e) {
      note.textContent = "Couldn't save — try again.";
      note.classList.add("visible");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Focus Topics";
    }
  });

  document.getElementById("p-msg-send-btn").addEventListener("click", async () => {
    const input = document.getElementById("p-msg-input");
    const text = input.value.trim();
    const note = document.getElementById("p-msg-note");
    if (!text) { note.textContent = "Write something first!"; note.classList.add("visible"); return; }
    const btn = document.getElementById("p-msg-send-btn");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      // Overwrites any previous message on purpose -- single active
      // message, not a thread (see the section's own comment in
      // index.html for why this stays one-way/one-message).
      await aigDb.ref(`players/${childId}/parentMessage`).set({
        text, sentAt: Date.now(), read: false
      });
      note.textContent = "Sent! They'll see it next time they open the app. ✓";
      note.classList.add("visible");
      input.value = "";
      document.getElementById("p-msg-last").textContent = `Last sent ${new Date().toLocaleDateString()} · not seen yet: "${text}"`;
      setTimeout(() => note.classList.remove("visible"), 3000);
    } catch (e) {
      note.textContent = "Couldn't send — try again.";
      note.classList.add("visible");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Message";
    }
  });

  // ---- Parent Voice Note: record (max 10s, MediaRecorder) -> preview
  // -> save as a base64 data URL directly on players/{childId}/
  // parentVoiceNote. A short clip stays small enough as text that this
  // avoids needing Firebase Storage -- nests under the already-open
  // `players` path like everything else in this app, no new
  // infrastructure or rules change.
  const VOICE_MAX_MS = 10000;
  let voiceRecorder = null;
  let voiceChunks = [];
  let voiceTimerInterval = null;
  let recordedVoiceDataUrl = null;

  async function startVoiceRecording() {
    const note = document.getElementById("p-voice-note");
    note.textContent = "";
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      note.textContent = "Voice recording isn't supported on this browser.";
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      note.textContent = "Couldn't access the microphone — check permissions and try again.";
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    voiceRecorder = new MediaRecorder(stream, { mimeType });
    voiceChunks = [];
    voiceRecorder.ondataavailable = e => { if (e.data.size > 0) voiceChunks.push(e.data); };
    voiceRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(voiceChunks, { type: mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        recordedVoiceDataUrl = reader.result;
        const preview = document.getElementById("p-voice-preview");
        preview.src = recordedVoiceDataUrl;
        preview.hidden = false;
        document.getElementById("p-voice-save-btn").hidden = false;
      };
      reader.readAsDataURL(blob);
    };
    voiceRecorder.start();

    const btn = document.getElementById("p-voice-record-btn");
    const timerEl = document.getElementById("p-voice-timer");
    btn.textContent = "⏹️ Stop";
    timerEl.hidden = false;
    document.getElementById("p-voice-preview").hidden = true;
    document.getElementById("p-voice-save-btn").hidden = true;
    const startedAt = Date.now();
    voiceTimerInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((VOICE_MAX_MS - elapsed) / 1000));
      timerEl.textContent = `${remaining}s`;
      if (elapsed >= VOICE_MAX_MS) stopVoiceRecording();
    }, 200);
  }

  function stopVoiceRecording() {
    clearInterval(voiceTimerInterval);
    document.getElementById("p-voice-timer").hidden = true;
    document.getElementById("p-voice-record-btn").textContent = "🔴 Record";
    if (voiceRecorder && voiceRecorder.state !== "inactive") voiceRecorder.stop();
  }

  document.getElementById("p-voice-record-btn").addEventListener("click", () => {
    if (voiceRecorder && voiceRecorder.state === "recording") stopVoiceRecording();
    else startVoiceRecording();
  });

  document.getElementById("p-voice-save-btn").addEventListener("click", async () => {
    if (!recordedVoiceDataUrl) return;
    const btn = document.getElementById("p-voice-save-btn");
    const note = document.getElementById("p-voice-note");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      // Overwrites any previous cheer on purpose -- single active item,
      // same reasoning as parentMessage above.
      await aigDb.ref(`players/${childId}/parentVoiceNote`).set({
        dataUrl: recordedVoiceDataUrl, recordedAt: Date.now(), played: false
      });
      note.textContent = "Saved! They'll hear it next time they open the app. ✓";
      note.classList.add("visible");
      document.getElementById("p-voice-last").textContent = `Last recorded ${new Date().toLocaleDateString()} · not played yet`;
      setTimeout(() => note.classList.remove("visible"), 3000);
    } catch (e) {
      note.textContent = "Couldn't save — the recording might be too long. Try again with a shorter cheer.";
      note.classList.add("visible");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Cheer";
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
