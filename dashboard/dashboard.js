// Al Idrisi Games — Teacher/Parent Dashboard.
// Implements design_handoff_teacher_dashboard/README.md against this app's
// real Firebase data (via AIGLeaderboard.db, same project as leaderboard.js)
// — no separate backend, no build step, no framework (matches the rest of
// this codebase). The .dc.html in that handoff folder is a visual/behavioral
// reference only; buildData()/buildApprovals() dummy generators are replaced
// here with the functions below reading real /players, /leaderboard,
// /insights data.
//
// Known gaps vs. the handoff spec (flagged with the team before building,
// see conversation): no per-week session history exists yet, so the
// line-chart "accuracy over time" screen is intentionally omitted rather
// than faked. The activity-calendar's per-day session counts only start
// accumulating from the day this shipped (players/{id}/sessionsByDay/{date},
// written by leaderboard.js) — days before that show as "no data", not
// fabricated. Math Race has no XP/level system in-game (sticker badges
// only), so its "XP & Level" row shows sticker progress instead of a
// fabricated level number.
(function () {
  const GAMES = [
    { id: "mathrace", label: "Math Race" },
    { id: "language-arts", label: "Language Arts" },
    { id: "solarquest", label: "SolarQuest" }
  ];

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function initialsOf(name) {
    return String(name).split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  }

  // Turns a stored topicKey into something a non-technical reader can parse.
  function prettifyTopic(gameId, topicKey) {
    if (gameId === "mathrace") {
      let m = topicKey.match(/^times-(\d+)$/);
      if (m) return `Perkalian ${m[1]}`;
      m = topicKey.match(/^divby-(\d+)$/);
      if (m) return `Pembagian oleh ${m[1]}`;
      return topicKey;
    }
    if (gameId === "solarquest") {
      return topicKey.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return topicKey; // language-arts topics are already human-readable
  }

  // A topic only counts as a reportable "weak spot" once there's enough
  // data to trust it (MIN_ATTEMPTS) and the accuracy is actually low
  // (WEAK_ACCURACY) — otherwise a kid who's just started a topic would get
  // flagged on 1-2 unlucky misses. Business rule per design handoff README
  // (State Management section): accuracy < 70% from >= 3 attempts.
  const MIN_ATTEMPTS = 3;
  const WEAK_ACCURACY = 0.7;

  function weakTopics(topicStatsForGame, n) {
    if (!topicStatsForGame) return [];
    return Object.entries(topicStatsForGame)
      .map(([topic, data]) => {
        const correct = (data && data.correct) || 0;
        const wrong = (data && data.wrong) || 0;
        const total = correct + wrong;
        return { topic, correct, wrong, total, accuracy: total ? correct / total : 0 };
      })
      .filter(t => t.total >= MIN_ATTEMPTS && t.accuracy < WEAK_ACCURACY)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, n);
  }

  // ---- PIN gate ----
  const GATE_KEY = "aig_dashboard_unlocked";
  const gateEl = document.getElementById("db-gate");
  const appEl = document.getElementById("db-app");
  const pinInput = document.getElementById("pin-input");
  const pinSubmit = document.getElementById("pin-submit");
  const pinError = document.getElementById("pin-error");

  function unlock() {
    localStorage.setItem(GATE_KEY, "1");
    gateEl.classList.add("hidden");
    appEl.classList.remove("hidden");
    loadAndRender();
  }

  function tryPin() {
    if (pinInput.value === window.AIG_DASHBOARD_PIN) {
      unlock();
    } else {
      pinError.classList.remove("hidden");
      pinInput.value = "";
      pinInput.focus();
    }
  }

  pinSubmit.addEventListener("click", tryPin);
  pinInput.addEventListener("keydown", e => { if (e.key === "Enter") tryPin(); });

  if (localStorage.getItem(GATE_KEY) === "1") {
    unlock();
  }

  // ---- Data loading ----
  let cache = { players: {}, leaderboard: {}, insights: {} };
  let lastRows = []; // { player, summary } for every student — recomputed each load, read by chart toggles

  // Chart.js instances, kept so re-render (refresh / toggle / panel reopen)
  // destroys the previous chart before drawing a new one on the same canvas.
  const charts = {};
  function renderChart(canvasId, config) {
    if (charts[canvasId]) charts[canvasId].destroy();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, config);
  }

  const CHART_COLORS = { mathrace: "#3d6c94", "language-arts": "#6f5498", solarquest: "#d9631f" };
  const GAME_ICONS = { mathrace: "ti-calculator", "language-arts": "ti-book-2", solarquest: "ti-rocket" };

  function loadAndRender() {
    const db = AIGLeaderboard.db;
    Promise.allSettled([
      db.ref("players").once("value"),
      db.ref("leaderboard").once("value"),
      db.ref("insights").once("value")
    ]).then(([playersR, leaderboardR, insightsR]) => {
      cache.players = playersR.status === "fulfilled" ? (playersR.value.val() || {}) : {};
      cache.leaderboard = leaderboardR.status === "fulfilled" ? (leaderboardR.value.val() || {}) : {};
      cache.insights = insightsR.status === "fulfilled" ? (insightsR.value.val() || {}) : {};

      const failures = [playersR, leaderboardR, insightsR]
        .map((r, i) => r.status === "rejected" ? [" /players", " /leaderboard", " /insights"][i] + ": " + r.reason.message : null)
        .filter(Boolean);

      document.getElementById("db-updated").textContent = failures.length
        ? "Sebagian data gagal dimuat (cek rule Firebase) —" + failures.join(" | ")
        : "Terakhir dimuat: " + new Date().toLocaleString("id-ID");

      const students = (window.AIG_PLAYERS || []).filter(p => p.role === "student");
      lastRows = students.map(p => ({ player: p, summary: studentSummary(p.id) }));

      renderKpis(lastRows);
      renderComparisonChart(lastRows);
      renderFavoritesChart(lastRows);
      renderHeatmap(lastRows);
      renderRoster(lastRows);
      renderApprovals();
    });
  }

  document.getElementById("db-refresh").addEventListener("click", loadAndRender);

  function xpTotalFor(s) {
    const la = (s["language-arts"].badges && s["language-arts"].badges.xpTotal) || 0;
    const sq = (s.solarquest.badges && s.solarquest.badges.xp) || 0;
    return la + sq;
  }

  // Counts how many DISTINCT calendar days a "parent" identity (see
  // player.js deriveParentPlayer / leaderboard.js recordPlay) played
  // alongside this child, within the current Mon–Sun week. Written at
  // players/{studentId}/parentSessions/{YYYY-MM-DD} — capped at one entry
  // per day per child, so this is a genuine day-count, not a play-count.
  function parentSessionsThisWeek(studentId) {
    const sessions = (cache.players[studentId] && cache.players[studentId].parentSessions) || {};
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7; // getDay(): Sun=0..Sat=6 → Mon=0..Sun=6
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    return Object.keys(sessions).filter(dateStr => new Date(dateStr + "T00:00:00") >= startOfWeek).length;
  }

  function studentSummary(studentId) {
    const badges = (cache.players[studentId] && cache.players[studentId].badges) || {};
    const topicStats = (cache.players[studentId] && cache.players[studentId].topicStats) || {};
    const summary = {};
    GAMES.forEach(g => {
      const lb = (cache.leaderboard[g.id] && cache.leaderboard[g.id][studentId]) || null;
      summary[g.id] = {
        timesPlayed: lb ? (lb.timesPlayed || 0) : 0,
        lastPlayed: lb ? lb.lastPlayed : null,
        badges: badges[g.id] || null,
        topicStats: topicStats[g.id] || null
      };
    });
    return summary;
  }

  // ---- KPI row ----
  function renderKpis(rows) {
    const activeCount = rows.filter(r => GAMES.some(g => r.summary[g.id].timesPlayed > 0)).length;
    const totalSessions = rows.reduce((sum, r) => sum + GAMES.reduce((s, g) => s + r.summary[g.id].timesPlayed, 0), 0);
    const avgSessions = activeCount ? totalSessions / activeCount : 0;

    // Tally weak-topic instances across the whole class to find the single
    // most common one (per game+topic key, since the same topic key can
    // exist in different games with different meaning).
    const tally = {};
    rows.forEach(r => GAMES.forEach(g => {
      weakTopics(r.summary[g.id].topicStats, 999).forEach(t => {
        const key = g.id + "::" + t.topic;
        tally[key] = (tally[key] || 0) + 1;
      });
    }));
    const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const totalWeak = tallyEntries.reduce((s, [, c]) => s + c, 0);
    let topWeakLabel = "Belum ada";
    if (tallyEntries.length) {
      const [key, count] = tallyEntries[0];
      const [gameId, topic] = key.split("::");
      topWeakLabel = `${prettifyTopic(gameId, topic)} (${count} murid)`;
    }

    const avgParentDays = rows.length
      ? rows.reduce((s, r) => s + parentSessionsThisWeek(r.player.id), 0) / rows.length
      : 0;

    document.getElementById("db-kpi-row").innerHTML = `
      <div class="db-kpi-card">
        <div class="db-kpi-label">Murid Aktif</div>
        <div class="db-kpi-value">${activeCount}/${rows.length}</div>
        <div class="db-kpi-sub">pernah main minimal 1 game</div>
      </div>
      <div class="db-kpi-card">
        <div class="db-kpi-label">Rata-rata Sesi</div>
        <div class="db-kpi-value">${avgSessions.toFixed(1)}</div>
        <div class="db-kpi-sub">per murid aktif (total, belum ada data per minggu)</div>
      </div>
      <div class="db-kpi-card">
        <div class="db-kpi-label">Area Lemah Teratas</div>
        <div class="db-kpi-value">${totalWeak}</div>
        <div class="db-kpi-sub">Terbanyak: ${escapeHtml(topWeakLabel)}</div>
      </div>
      <div class="db-kpi-card">
        <div class="db-kpi-label">Keterlibatan Ortu</div>
        <div class="db-kpi-value">${avgParentDays.toFixed(1)}</div>
        <div class="db-kpi-sub">hari/minggu rata-rata kelas</div>
      </div>
    `;
  }

  // ---- Comparison bar chart (sortable) ----
  let comparisonMetric = "played";
  function renderComparisonChart(rows) {
    const data = rows.map(r => ({
      name: r.player.name,
      played: GAMES.reduce((s, g) => s + r.summary[g.id].timesPlayed, 0),
      xp: xpTotalFor(r.summary)
    })).sort((a, b) => b[comparisonMetric] - a[comparisonMetric]).slice(0, 15);

    renderChart("chart-comparison", {
      type: "bar",
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: comparisonMetric === "played" ? "Kali Main" : "Total XP",
          data: data.map(d => d[comparisonMetric]),
          backgroundColor: "#e8703a",
          borderRadius: 6,
          maxBarThickness: 26
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  document.getElementById("comparison-toggle").addEventListener("click", e => {
    const btn = e.target.closest("button[data-metric]");
    if (!btn) return;
    comparisonMetric = btn.dataset.metric;
    document.querySelectorAll("#comparison-toggle button").forEach(b => b.classList.toggle("active", b === btn));
    renderComparisonChart(lastRows);
  });

  // ---- Favorites doughnut ----
  function renderFavoritesChart(rows) {
    const totals = { mathrace: 0, "language-arts": 0, solarquest: 0 };
    rows.forEach(r => GAMES.forEach(g => { totals[g.id] += r.summary[g.id].timesPlayed; }));
    const sum = GAMES.reduce((s, g) => s + totals[g.id], 0) || 1;

    renderChart("chart-favorites", {
      type: "doughnut",
      data: {
        labels: GAMES.map(g => g.label),
        datasets: [{ data: GAMES.map(g => totals[g.id]), backgroundColor: GAMES.map(g => CHART_COLORS[g.id]), borderWidth: 0 }]
      },
      options: {
        cutout: "68%",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    document.getElementById("favorites-legend").innerHTML = GAMES.map(g => {
      const pct = Math.round((totals[g.id] / sum) * 100);
      return `<div class="db-donut-legend-row">
        <span class="db-donut-dot" style="background:${CHART_COLORS[g.id]}"></span>
        <span class="db-donut-legend-name">${escapeHtml(g.label)}</span>
        <span class="db-donut-legend-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  // ---- Heatmap: topic × student, filtered by game ----
  let heatmapGame = "mathrace";
  function renderHeatmap(rows) {
    const g = GAMES.find(x => x.id === heatmapGame);
    const topicSet = new Set();
    rows.forEach(r => {
      const ts = r.summary[g.id].topicStats;
      if (ts) Object.keys(ts).forEach(k => topicSet.add(k));
    });
    const topics = Array.from(topicSet).sort();
    const container = document.getElementById("heatmap-grid");

    if (!topics.length) {
      container.innerHTML = `<div class="db-empty-note">Belum ada data topik untuk ${escapeHtml(g.label)}.</div>`;
      return;
    }

    let html = `<div class="db-heatmap-row"><div class="db-heatmap-rowhead"></div>${
      topics.map(t => `<div class="db-heatmap-colhead">${escapeHtml(prettifyTopic(g.id, t))}</div>`).join("")
    }</div>`;

    rows.forEach(r => {
      html += `<div class="db-heatmap-row"><div class="db-heatmap-rowhead">${escapeHtml(r.player.name)}</div>`;
      topics.forEach(t => {
        const stat = (r.summary[g.id].topicStats || {})[t];
        const correct = (stat && stat.correct) || 0;
        const wrong = (stat && stat.wrong) || 0;
        const total = correct + wrong;
        let cls, label;
        if (total < MIN_ATTEMPTS) {
          cls = "db-heat-none"; label = "—";
        } else {
          const acc = correct / total;
          if (acc < 0.5) { cls = "db-heat-red"; }
          else if (acc < 0.7) { cls = "db-heat-amber"; }
          else if (acc < 0.85) { cls = "db-heat-green-light"; }
          else { cls = "db-heat-green-dark"; }
          label = Math.round(acc * 100) + "%";
        }
        html += `<div class="db-heatmap-cell ${cls}" title="${escapeHtml(r.player.name)} — ${escapeHtml(prettifyTopic(g.id, t))}: ${total} percobaan">${label}</div>`;
      });
      html += `</div>`;
    });

    container.innerHTML = html;
  }

  document.getElementById("heatmap-toggle").addEventListener("click", e => {
    const btn = e.target.closest("button[data-game]");
    if (!btn) return;
    heatmapGame = btn.dataset.game;
    document.querySelectorAll("#heatmap-toggle button").forEach(b => b.classList.toggle("active", b === btn));
    renderHeatmap(lastRows);
  });

  // ---- Student roster grid ----
  function weekdaySquaresHtml(studentId) {
    const sessions = (cache.players[studentId] && cache.players[studentId].parentSessions) || {};
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    let html = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const filled = !!sessions[dateStr];
      html += `<div class="db-week-sq ${filled ? "filled" : ""}" title="${dateStr}${filled ? " — ditemani ortu" : ""}">${filled ? '<i class="ti ti-check"></i>' : ""}</div>`;
    }
    return html;
  }

  function rosterCardHtml(row) {
    const { player, summary: s } = row;
    const totalSessions = GAMES.reduce((sum, g) => sum + s[g.id].timesPlayed, 0);
    const totalXp = xpTotalFor(s);
    const weakCount = GAMES.reduce((sum, g) => sum + weakTopics(s[g.id].topicStats, 999).length, 0);
    return `<div class="db-roster-card">
      <div class="db-roster-top">
        <span class="db-avatar">${escapeHtml(initialsOf(player.name))}</span>
        <div class="db-roster-info">
          <div class="db-roster-name">${escapeHtml(player.name)}</div>
          <div class="db-roster-stats">${totalSessions} sesi · ${totalXp} XP</div>
        </div>
      </div>
      ${weakCount > 0 ? `<div class="db-roster-badge"><i class="ti ti-alert-triangle"></i> ${weakCount} area lemah</div>` : ""}
      <div class="db-week-row">${weekdaySquaresHtml(player.id)}</div>
      <button class="db-roster-btn" data-student="${player.id}">Lihat Detail <i class="ti ti-arrow-right"></i></button>
    </div>`;
  }

  function renderRoster(rows) {
    const container = document.getElementById("roster-grid");
    container.innerHTML = rows.length
      ? rows.map(rosterCardHtml).join("")
      : `<div class="db-empty-note">Belum ada murid terdaftar.</div>`;
    container.querySelectorAll("[data-student]").forEach(btn => {
      btn.addEventListener("click", () => openDetail(btn.dataset.student));
    });
  }

  // ---- Student detail slide-over panel ----
  const overlay = document.getElementById("student-detail-overlay");
  const detailContent = document.getElementById("detail-content");
  document.getElementById("detail-close").addEventListener("click", () => overlay.classList.add("hidden"));
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.add("hidden"); });

  function weakCardsHtml(s) {
    const all = [];
    GAMES.forEach(g => weakTopics(s[g.id].topicStats, 999).forEach(t => all.push({ ...t, gameId: g.id, gameLabel: g.label })));
    if (!all.length) return `<div class="db-success-box">Tidak ada area lemah terdeteksi saat ini. 🎉</div>`;
    all.sort((a, b) => a.accuracy - b.accuracy);
    return all.map(t => {
      const pct = Math.round(t.accuracy * 100);
      const urgency = pct < 50 ? { cls: "tinggi", label: "Tinggi" } : { cls: "sedang", label: "Sedang" };
      return `<div class="db-weak-card">
        <div class="db-weak-info">
          <div class="db-weak-topic">${escapeHtml(prettifyTopic(t.gameId, t.topic))}</div>
          <div class="db-weak-meta">${escapeHtml(t.gameLabel)} · ${t.total}x percobaan</div>
        </div>
        <div class="db-weak-pct">${pct}%</div>
        <span class="db-urgency db-urgency-${urgency.cls}">${urgency.label}</span>
      </div>`;
    }).join("");
  }

  // Level/tier is a dashboard-only derived display (300 XP per level, 4
  // tiers) — SolarQuest and Language Arts don't store a "level" field
  // in-game, only cumulative XP / per-chapter completion, so this is
  // computed here rather than read from game data.
  const LEVEL_XP = 300;
  const TIERS = ["Pemula", "Penjelajah", "Ahli", "Master"];
  function levelInfo(xp) {
    const level = Math.floor(xp / LEVEL_XP) + 1;
    const tier = TIERS[Math.min(3, Math.floor((level - 1) / 3))];
    const pct = Math.min(100, Math.round(((xp % LEVEL_XP) / LEVEL_XP) * 100));
    return { level, tier, pct };
  }

  // Mirrors azkacraft/questions.json chapter order — update here if that
  // file's chapter list ever changes (no shared source between the two
  // right now since the dashboard doesn't load the game's question bank).
  const CHAPTER_NAMES = [
    "Correct the Spelling Mistake", "Antonyms Are Opposites", "Prefixes and Suffixes",
    "Contractions", "Capitalization and Punctuation", "Reading Comprehension",
    "Creative Writing: The Ocean & The Bicycle"
  ];
  const MATHRACE_STICKER_TOTAL = 6; // multipleazka/badges.js BADGES.length

  function xpRowHtml(g, data) {
    if (g.id === "mathrace") {
      // Math Race has no XP/level system — it tracks earned stickers + wins.
      const earned = data.badges ? Object.keys(data.badges.badges || {}).length : 0;
      const wins = data.badges ? (data.badges.wins || 0) : 0;
      const pct = Math.round((earned / MATHRACE_STICKER_TOTAL) * 100);
      return `<div class="db-xp-row">
        <div class="db-xp-row-head"><span class="db-xp-row-label">Math Race</span><span class="db-xp-row-tier">${earned}/${MATHRACE_STICKER_TOTAL} stiker</span></div>
        <div class="db-xp-bar-track"><div class="db-xp-bar-fill" style="width:${pct}%;background:${CHART_COLORS.mathrace}"></div></div>
        <div class="db-kpi-sub" style="margin-top:4px;">${wins} kemenangan</div>
      </div>`;
    }
    if (g.id === "language-arts") {
      const chapters = data.badges ? (data.badges.chapters || {}) : {};
      const done = Object.values(chapters).filter(c => c.completed).length;
      const total = CHAPTER_NAMES.length;
      const currentIdx = Math.min(done, total - 1);
      const pct = Math.round((done / total) * 100);
      return `<div class="db-xp-row">
        <div class="db-xp-row-head"><span class="db-xp-row-label">Language Arts</span><span class="db-xp-row-tier">Bab ${currentIdx + 1}: ${escapeHtml(CHAPTER_NAMES[currentIdx])}</span></div>
        <div class="db-xp-bar-track"><div class="db-xp-bar-fill" style="width:${pct}%;background:${CHART_COLORS["language-arts"]}"></div></div>
        <div class="db-kpi-sub" style="margin-top:4px;">${done}/${total} bab selesai · ${(data.badges && data.badges.xpTotal) || 0} XP</div>
      </div>`;
    }
    // solarquest
    const xp = data.badges ? (data.badges.xp || 0) : 0;
    const { level, tier, pct } = levelInfo(xp);
    return `<div class="db-xp-row">
      <div class="db-xp-row-head"><span class="db-xp-row-label">SolarQuest</span><span class="db-xp-row-tier">Level ${level} · ${tier}</span></div>
      <div class="db-xp-bar-track"><div class="db-xp-bar-fill" style="width:${pct}%;background:${CHART_COLORS.solarquest}"></div></div>
      <div class="db-kpi-sub" style="margin-top:4px;">${xp} XP</div>
    </div>`;
  }

  function renderRadar(s, gameId) {
    const ts = s[gameId].topicStats;
    const topics = ts ? Object.keys(ts) : [];
    if (!topics.length) {
      if (charts["panel-radar"]) { charts["panel-radar"].destroy(); delete charts["panel-radar"]; }
      const wrap = document.getElementById("panel-radar-wrap");
      if (wrap) wrap.innerHTML = `<div class="db-empty-note">Belum ada data topik untuk game ini.</div>`;
      return;
    }
    const wrap = document.getElementById("panel-radar-wrap");
    if (wrap && !document.getElementById("panel-radar")) wrap.innerHTML = `<canvas id="panel-radar"></canvas>`;
    const data = topics.map(t => {
      const d = ts[t];
      const c = (d && d.correct) || 0, w = (d && d.wrong) || 0, total = c + w;
      return total ? Math.round((c / total) * 100) : 0;
    });
    renderChart("panel-radar", {
      type: "radar",
      data: {
        labels: topics.map(t => prettifyTopic(gameId, t)),
        datasets: [{
          label: "Akurasi %",
          data,
          backgroundColor: CHART_COLORS[gameId] + "40",
          borderColor: CHART_COLORS[gameId],
          pointBackgroundColor: CHART_COLORS[gameId]
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, backdropColor: "transparent" } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  // 35-day activity grid. Cell intensity = sessions that day (real data,
  // only accumulating from the day leaderboard.js started writing
  // sessionsByDay — earlier days show as "no data", not fabricated). The
  // mint ring = parent accompanied that day (parentSessions — this data
  // already existed and is accurate for the full range).
  function calendarHtml(studentId) {
    const sessionsByDay = (cache.players[studentId] && cache.players[studentId].sessionsByDay) || {};
    const parentSessions = (cache.players[studentId] && cache.players[studentId].parentSessions) || {};
    const today = new Date();
    let cells = "";
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayCounts = sessionsByDay[dateStr];
      const dayTotal = dayCounts ? Object.values(dayCounts).reduce((s, n) => s + n, 0) : 0;
      let levelCls = "";
      if (dayTotal === 1) levelCls = "level-1";
      else if (dayTotal >= 2) levelCls = "level-3";
      const present = !!parentSessions[dateStr];
      const titleBits = [dateStr];
      if (dayTotal) titleBits.push(`${dayTotal} sesi`);
      if (present) titleBits.push("ditemani ortu");
      cells += `<div class="db-cal-cell ${levelCls} ${present ? "parent-present" : ""}" title="${escapeHtml(titleBits.join(" — "))}"></div>`;
    }
    return cells;
  }

  function openDetail(studentId) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    if (!player) return;
    const s = studentSummary(studentId);
    const parentDays = parentSessionsThisWeek(studentId);

    detailContent.innerHTML = `
      <div class="db-detail-header">
        <span class="db-avatar db-avatar-lg">${escapeHtml(initialsOf(player.name))}</span>
        <div>
          <h2 class="db-detail-name">${escapeHtml(player.name)}</h2>
          <div class="db-detail-sub">${parentDays > 0 ? `${parentDays} dari 7 hari ditemani orang tua minggu ini` : "Belum ada sesi ditemani orang tua minggu ini"}</div>
        </div>
      </div>

      <div class="db-detail-section">
        <h3><i class="ti ti-alert-triangle" style="color:var(--heat-amber)"></i> Area Lemah</h3>
        ${weakCardsHtml(s)}
      </div>

      <div class="db-detail-section">
        <h3><i class="ti ti-bolt" style="color:var(--action-primary)"></i> XP &amp; Level per Game</h3>
        ${GAMES.map(g => xpRowHtml(g, s[g.id])).join("")}
      </div>

      <div class="db-detail-section">
        <h3><i class="ti ti-chart-radar" style="color:var(--action-primary)"></i> Progress &amp; Penguasaan Topik</h3>
        <div class="db-pill-toggle" id="panel-game-toggle">
          ${GAMES.map((g, i) => `<button data-game="${g.id}" class="${i === 0 ? "active" : ""}">${escapeHtml(g.label)}</button>`).join("")}
        </div>
        <div class="db-empty-note" style="margin:10px 0;">Grafik riwayat mingguan belum tersedia — baru mulai dicatat hari ini, akan terisi seiring waktu. Radar di bawah pakai akurasi terkini.</div>
        <div class="db-detail-chart-wrap" style="height:260px;" id="panel-radar-wrap"><canvas id="panel-radar"></canvas></div>
      </div>

      <div class="db-detail-section">
        <h3><i class="ti ti-calendar" style="color:var(--mint-700)"></i> Kalender Aktivitas</h3>
        <div class="db-calendar-grid">${calendarHtml(studentId)}</div>
        <div class="db-calendar-legend">
          <span><i style="background:var(--cream-200)"></i> Belum ada data</span>
          <span><i style="background:var(--peach-100)"></i> 1 sesi</span>
          <span><i style="background:var(--action-primary)"></i> 2+ sesi</span>
          <span><i style="background:var(--mint-700);border-radius:50%;"></i> Ring = ditemani ortu</span>
        </div>
      </div>

      <div class="db-detail-section">
        <button class="db-btn-small" id="generate-draft-btn">Generate draft insight untuk ortu</button>
      </div>
    `;

    document.getElementById("generate-draft-btn").addEventListener("click", () => generateDraft(studentId));
    document.getElementById("panel-game-toggle").addEventListener("click", e => {
      const btn = e.target.closest("button[data-game]");
      if (!btn) return;
      document.querySelectorAll("#panel-game-toggle button").forEach(b => b.classList.toggle("active", b === btn));
      renderRadar(s, btn.dataset.game);
    });

    overlay.classList.remove("hidden");
    renderRadar(s, GAMES[0].id);
  }

  // Template fallback — used if the AI endpoint is unreachable or misconfigured,
  // so "Generate draft" never fully breaks even without ANTHROPIC_API_KEY set.
  function buildTemplateDraft(studentId, player, s) {
    const gameLines = [];
    GAMES.forEach(g => {
      const data = s[g.id];
      if (data.timesPlayed === 0) return;
      let line = `main ${g.label} ${data.timesPlayed}x`;
      if (data.badges) {
        if (g.id === "language-arts") {
          const done = Object.values(data.badges.chapters || {}).filter(c => c.completed).length;
          line += `, ${done} chapter selesai`;
        } else if (g.id === "solarquest") {
          const done = Object.values(data.badges.levels || {}).filter(l => l.completed).length;
          line += `, ${done} level selesai`;
        }
      }
      gameLines.push(line);
    });
    const weakSpots = [];
    GAMES.forEach(g => {
      weakTopics(s[g.id].topicStats, 1).forEach(t => {
        weakSpots.push(`${prettifyTopic(g.id, t.topic)} (${g.label}, ${Math.round(t.accuracy * 100)}% benar)`);
      });
    });
    let draft = `Ringkasan progress ${player.name}: ` +
      (gameLines.length ? gameLines.join("; ") + "." : "belum ada aktivitas yang tercatat.");
    if (weakSpots.length) {
      draft += ` Area yang masih perlu latihan di rumah: ${weakSpots.join(", ")}.`;
    } else {
      draft += " Belum ada area lemah spesifik yang tercatat.";
    }
    const parentDays = parentSessionsThisWeek(studentId);
    draft += parentDays > 0
      ? ` Orang tua ikut menemani main ${parentDays}x minggu ini — terima kasih atas keterlibatannya!`
      : " Belum ada sesi ditemani orang tua minggu ini.";
    return draft;
  }

  // Compact facts payload sent to the AI endpoint — no PII beyond the child's
  // first name, just aggregate stats it already reads from the panel/roster.
  function buildInsightFacts(studentId, s) {
    const facts = { games: [], parentDaysThisWeek: parentSessionsThisWeek(studentId) };
    GAMES.forEach(g => {
      const data = s[g.id];
      if (data.timesPlayed === 0) return;
      const entry = { label: g.label, timesPlayed: data.timesPlayed };
      if (data.badges) {
        if (g.id === "language-arts") entry.chaptersDone = Object.values(data.badges.chapters || {}).filter(c => c.completed).length;
        else if (g.id === "solarquest") entry.levelsDone = Object.values(data.badges.levels || {}).filter(l => l.completed).length;
      }
      entry.weakTopics = weakTopics(data.topicStats, 3).map(t => ({
        topic: prettifyTopic(g.id, t.topic), accuracyPct: Math.round(t.accuracy * 100)
      }));
      facts.games.push(entry);
    });
    return facts;
  }

  function generateDraft(studentId) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    const s = studentSummary(studentId);
    const btn = document.getElementById("generate-draft-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Membuat draft…"; }

    fetch("/api/generate-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: player.name, facts: buildInsightFacts(studentId, s) })
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.draft) throw new Error((data && data.error) || "AI gagal merespons");
        return data.draft;
      })
      .catch(() => buildTemplateDraft(studentId, player, s)) // silent fallback — dashboard still works without AI configured
      .then(draft => AIGLeaderboard.db.ref(`insights/${studentId}`).set({
        draft,
        generatedAt: firebase.database.ServerValue.TIMESTAMP,
        status: "pending"
      }))
      .then(() => {
        overlay.classList.add("hidden");
        loadAndRender();
        document.querySelector('.db-tab[data-tab="approvals"]').click();
      })
      .catch(err => {
        alert("Gagal menyimpan draft: " + err.message + "\n\nKemungkinan rule Firebase untuk path 'insights' belum diizinkan.");
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = "Generate draft insight untuk ortu"; }
      });
  }

  // ---- Tabs ----
  document.querySelectorAll(".db-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".db-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".db-tab-panel").forEach(p => p.classList.add("hidden"));
      document.getElementById("tab-" + tab.dataset.tab).classList.remove("hidden");
    });
  });

  // ---- Approval pipeline (pending → approved → sent), one card per
  // student — matches our Firebase schema (insights/{studentId} covers all
  // games for that kid), unlike the handoff mock's per-(student,game) rows.
  const STATUS_INDEX = { pending: 0, approved: 1, sent: 2 };
  const STATUS_LABELS = ["Pending", "Disetujui", "Terkirim"];
  const expandedApprovals = new Set();

  function stepperHtml(status) {
    const idx = STATUS_INDEX[status];
    let html = "";
    for (let i = 0; i < 3; i++) {
      const isDone = status === "sent" || i < idx;
      const cls = isDone ? "done" : (i === idx ? "current" : "");
      const content = isDone ? '<i class="ti ti-check"></i>' : (i + 1);
      html += `<div class="db-step"><div class="db-step-circle ${cls}">${content}</div><div class="db-step-label">${STATUS_LABELS[i]}</div></div>`;
      if (i < 2) html += `<div class="db-step-connector ${(status === "sent" || i < idx) ? "done" : ""}"></div>`;
    }
    return html;
  }

  function approvalCardHtml(studentId, insight) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    const name = player ? player.name : studentId;
    const status = insight.sentAt ? "sent" : insight.status;
    const generated = insight.generatedAt ? new Date(insight.generatedAt).toLocaleDateString("id-ID") : "-";
    const expanded = expandedApprovals.has(studentId);

    let actionBtn = "";
    if (status === "pending") {
      actionBtn = `<button class="db-btn-small" data-approve="${studentId}">Setujui Draft</button>`;
    } else if (status === "approved") {
      const emails = player ? parseEmails(player.parentEmail) : [];
      actionBtn = emails.length
        ? `<button class="db-btn-small" data-send="${studentId}">Kirim ke Orang Tua</button>`
        : `<span class="db-empty-note">Email ortu belum diisi</span>`;
    }

    let metaLine = `Dibuat ${generated}`;
    if (insight.approvedAt) metaLine += ` · Disetujui ${new Date(insight.approvedAt).toLocaleDateString("id-ID")}`;
    if (insight.sentAt) metaLine += ` · Terkirim ke ${escapeHtml(insight.sentTo || "-")}`;

    return `<div class="db-insight-card">
      <div class="db-insight-top">
        <div class="db-insight-who">
          <span class="db-avatar">${escapeHtml(initialsOf(name))}</span>
          <div><div class="db-insight-name">${escapeHtml(name)}</div><div class="db-insight-meta">${metaLine}</div></div>
        </div>
        <div class="db-stepper">${stepperHtml(status)}</div>
        <div class="db-insight-actions">
          <button class="db-btn-ghost" data-toggle="${studentId}">Lihat draft ${expanded ? "▲" : "▼"}</button>
          ${actionBtn}
        </div>
      </div>
      ${expanded ? `<div class="db-insight-draft"><textarea ${status !== "pending" ? "readonly" : ""}>${escapeHtml(insight.draft || "")}</textarea></div>` : ""}
    </div>`;
  }

  function renderApprovals() {
    const container = document.getElementById("approvals-list");
    const entries = Object.entries(cache.insights);
    entries.sort((a, b) => {
      const statusA = a[1].sentAt ? "sent" : a[1].status;
      const statusB = b[1].sentAt ? "sent" : b[1].status;
      if (STATUS_INDEX[statusA] !== STATUS_INDEX[statusB]) return STATUS_INDEX[statusA] - STATUS_INDEX[statusB];
      return (b[1].generatedAt || 0) - (a[1].generatedAt || 0);
    });

    container.innerHTML = entries.length
      ? entries.map(([studentId, v]) => approvalCardHtml(studentId, v)).join("")
      : `<div class="db-empty-note">Belum ada draft insight. Generate dari panel detail murid.</div>`;

    container.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.toggle;
        if (expandedApprovals.has(id)) expandedApprovals.delete(id); else expandedApprovals.add(id);
        renderApprovals();
      });
    });
    container.querySelectorAll("[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.approve;
        const card = btn.closest(".db-insight-card");
        const textarea = card.querySelector("textarea");
        approveInsight(id, textarea ? textarea.value : (cache.insights[id] && cache.insights[id].draft) || "");
      });
    });
    container.querySelectorAll("[data-send]").forEach(btn => {
      btn.addEventListener("click", () => sendInsightEmail(btn.dataset.send));
    });
  }

  function approveInsight(studentId, editedText) {
    AIGLeaderboard.db.ref(`insights/${studentId}`).update({
      draft: editedText,
      status: "approved",
      approvedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(loadAndRender).catch(err => {
      alert("Gagal menyimpan approval: " + err.message);
    });
  }

  // Supports comma-separated multiple parent emails, e.g. "dad@x.com, mom@x.com".
  function parseEmails(str) {
    return (str || "").split(",").map(e => e.trim()).filter(e => e.includes("@"));
  }

  function sendInsightEmail(studentId) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    const insight = cache.insights[studentId];
    const emails = player ? parseEmails(player.parentEmail) : [];
    if (!emails.length || !insight) return;

    const btn = document.querySelector(`[data-send="${studentId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = "Mengirim..."; }

    fetch("/api/send-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: emails, studentName: player.name, draft: insight.draft })
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Gagal mengirim email");
        return AIGLeaderboard.db.ref(`insights/${studentId}`).update({
          sentAt: firebase.database.ServerValue.TIMESTAMP,
          sentTo: emails.join(", ")
        });
      })
      .then(loadAndRender)
      .catch(err => {
        alert("Gagal mengirim email: " + err.message);
        if (btn) { btn.disabled = false; btn.textContent = "Kirim ke Orang Tua"; }
      });
  }
})();
