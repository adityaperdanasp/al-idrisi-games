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
    "rounding": "Rounding"
  };

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
        return `
          <div class="p-weak-card">
            <div class="p-weak-topic">${escapeHtml(prettifyTopic(t.gameId, t.topic))} <span class="p-weak-game">${escapeHtml(game.label)}</span></div>
            <div class="p-weak-bar-track"><div class="p-weak-bar-fill" style="width:${pct}%"></div></div>
            <div class="p-weak-pct">${pct}% correct <span class="p-weak-tries">(${t.total} tries)</span></div>
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

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
