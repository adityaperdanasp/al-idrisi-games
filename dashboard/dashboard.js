// Al Idrisi Games — Teacher Dashboard.
// Reads the hub's shared Firebase project (via AIGLeaderboard.db, same
// project as leaderboard.js) — no separate backend, no new Firebase project.
// Phase 1: read-only progress/mistake view + a draft-and-approve queue for
// parent insights. Sending those insights to parents is manual (copy the
// approved text) until a Phase 2 wires up an actual email service.
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
  // flagged on 1-2 unlucky misses.
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

  // Chart.js instances, kept so re-render (refresh / detail reopen) destroys
  // the previous chart before drawing a new one on the same canvas.
  const charts = {};
  function renderChart(canvasId, config) {
    if (charts[canvasId]) charts[canvasId].destroy();
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, config);
  }

  const CHART_COLORS = { mathrace: "#7c98d6", "language-arts": "#a993d9", solarquest: "#e2a06e" };
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

      renderStudentTable();
      renderClassOverview();
      renderInsights();
    });
  }

  // ---- Class-wide KPIs + charts ----
  function xpTotalFor(s) {
    const la = (s["language-arts"].badges && s["language-arts"].badges.xpTotal) || 0;
    const sq = (s.solarquest.badges && s.solarquest.badges.xp) || 0;
    return la + sq;
  }

  function renderClassOverview() {
    const students = (window.AIG_PLAYERS || []).filter(p => p.role === "student");
    const rows = students.map(p => ({ player: p, summary: studentSummary(p.id) }));

    const activeCount = rows.filter(r => GAMES.some(g => r.summary[g.id].timesPlayed > 0)).length;
    const totalSessions = rows.reduce((sum, r) => sum + GAMES.reduce((s, g) => s + r.summary[g.id].timesPlayed, 0), 0);
    const weakCounts = rows.map(r => ({
      name: r.player.name,
      count: GAMES.reduce((s, g) => s + weakTopics(r.summary[g.id].topicStats, 999).length, 0)
    }));
    const totalWeakSpots = weakCounts.reduce((s, w) => s + w.count, 0);
    const parentDaysList = rows.map(r => parentSessionsThisWeek(r.player.id));
    const avgParentDays = parentDaysList.length
      ? (parentDaysList.reduce((s, n) => s + n, 0) / parentDaysList.length)
      : 0;

    document.getElementById("db-kpi-row").innerHTML = `
      <div class="db-kpi-card db-kpi-blue">
        <div class="db-kpi-icon"><i class="ti ti-users"></i></div>
        <div><div class="db-kpi-label">Murid aktif</div><div class="db-kpi-value">${activeCount}/${students.length}</div></div>
      </div>
      <div class="db-kpi-card db-kpi-purple">
        <div class="db-kpi-icon"><i class="ti ti-device-gamepad-2"></i></div>
        <div><div class="db-kpi-label">Total sesi main</div><div class="db-kpi-value">${totalSessions}</div></div>
      </div>
      <div class="db-kpi-card db-kpi-coral">
        <div class="db-kpi-icon"><i class="ti ti-alert-triangle"></i></div>
        <div><div class="db-kpi-label">Area lemah tercatat</div><div class="db-kpi-value">${totalWeakSpots}</div></div>
      </div>
      <div class="db-kpi-card db-kpi-teal">
        <div class="db-kpi-icon"><i class="ti ti-heart"></i></div>
        <div><div class="db-kpi-label">Rata² hari ditemani ortu</div><div class="db-kpi-value">${avgParentDays.toFixed(1)}</div></div>
      </div>
    `;

    // XP per murid — top 12, sorted desc
    const xpRows = rows.map(r => ({ name: r.player.name, xp: xpTotalFor(r.summary) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 12);
    renderChart("chart-xp", {
      type: "bar",
      data: {
        labels: xpRows.map(r => r.name),
        datasets: [{ label: "XP", data: xpRows.map(r => r.xp), backgroundColor: "#7c98d6", borderRadius: 6 }]
      },
      options: {
        indexAxis: "y",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    // Area lemah per murid — only students with at least 1 weak spot, top 12
    const weakRows = weakCounts.filter(w => w.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);
    renderChart("chart-weak", {
      type: "bar",
      data: {
        labels: weakRows.map(w => w.name),
        datasets: [{ label: "Area lemah", data: weakRows.map(w => w.count), backgroundColor: "#e2a06e", borderRadius: 6 }]
      },
      options: {
        indexAxis: "y",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  document.getElementById("db-refresh").addEventListener("click", loadAndRender);

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

  function gameCellHtml(gameId, s) {
    const lines = [`${s.timesPlayed} kali main`];
    if (s.badges) {
      if (gameId === "language-arts") {
        const done = Object.values(s.badges.chapters || {}).filter(c => c.completed).length;
        lines.push(`${done} chapter selesai, ${s.badges.xpTotal || 0} XP`);
      } else if (gameId === "solarquest") {
        const done = Object.values(s.badges.levels || {}).filter(l => l.completed).length;
        lines.push(`${done} level selesai, ${s.badges.xp || 0} XP`);
      }
    }
    const weak = weakTopics(s.topicStats, 2);
    if (weak.length) {
      lines.push(weak.map(t => `<span class="db-topic-chip">${escapeHtml(prettifyTopic(gameId, t.topic))} (${Math.round(t.accuracy * 100)}% benar, ${t.total}x)</span>`).join(""));
    }
    return `<div class="db-game-cell">${lines.map((l, i) => i === 0 ? `<div>${l}</div>` : (i === 1 ? `<div class="db-muted">${l}</div>` : `<div>${l}</div>`)).join("")}</div>`;
  }

  function renderStudentTable() {
    const students = (window.AIG_PLAYERS || []).filter(p => p.role === "student");
    const tbody = document.getElementById("student-tbody");
    tbody.innerHTML = students.map(p => {
      const s = studentSummary(p.id);
      const parentDays = parentSessionsThisWeek(p.id);
      return `<tr data-student="${p.id}">
        <td class="db-student-name">${escapeHtml(p.name)}</td>
        <td>${gameCellHtml("mathrace", s.mathrace)}</td>
        <td>${gameCellHtml("language-arts", s["language-arts"])}</td>
        <td>${gameCellHtml("solarquest", s.solarquest)}</td>
        <td>${GAMES.map(g => weakTopics(s[g.id].topicStats, 1).map(t =>
          `<span class="db-topic-chip">${escapeHtml(g.label)}: ${escapeHtml(prettifyTopic(g.id, t.topic))}</span>`
        ).join("")).join("")}</td>
        <td>${parentDays > 0 ? `${parentDays}x minggu ini` : `<span class="db-muted">—</span>`}</td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll("tr").forEach(row => {
      row.addEventListener("click", () => openDetail(row.dataset.student));
    });
  }

  // ---- Student detail overlay ----
  const overlay = document.getElementById("student-detail-overlay");
  const detailContent = document.getElementById("detail-content");
  document.getElementById("detail-close").addEventListener("click", () => overlay.classList.add("hidden"));
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.add("hidden"); });

  function gameTotals(topicStats) {
    if (!topicStats) return { correct: 0, wrong: 0 };
    return Object.values(topicStats).reduce((acc, t) => ({
      correct: acc.correct + ((t && t.correct) || 0),
      wrong: acc.wrong + ((t && t.wrong) || 0)
    }), { correct: 0, wrong: 0 });
  }

  function openDetail(studentId) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    if (!player) return;
    const s = studentSummary(studentId);

    const sections = GAMES.map(g => {
      const data = s[g.id];
      const allWeak = weakTopics(data.topicStats, 999);
      const topicsHtml = allWeak.length
        ? allWeak.map(t => `<span class="db-topic-chip">${escapeHtml(prettifyTopic(g.id, t.topic))} — ${Math.round(t.accuracy * 100)}% benar (${t.correct}/${t.total})</span>`).join("")
        : `<span class="db-empty-note">Belum ada area lemah yang cukup datanya (min. ${MIN_ATTEMPTS} percobaan per topik).</span>`;
      const lastPlayed = data.lastPlayed ? new Date(data.lastPlayed).toLocaleString("id-ID") : "belum pernah";
      const totals = gameTotals(data.topicStats);
      const hasAttempts = totals.correct + totals.wrong > 0;
      return `<div class="db-detail-section">
        <h3 class="db-game-heading db-game-dot-${g.id}"><i class="ti ${GAME_ICONS[g.id]}"></i> ${escapeHtml(g.label)}</h3>
        <div>${data.timesPlayed} kali main — terakhir: ${lastPlayed}</div>
        ${hasAttempts ? `<div class="db-detail-chart-wrap"><canvas id="detail-chart-${g.id}"></canvas></div>` : ""}
        <div style="margin-top:8px;">${topicsHtml}</div>
      </div>`;
    }).join("");

    const parentDays = parentSessionsThisWeek(studentId);
    const parentSessionsHtml = `<div class="db-detail-section">
      <h3><i class="ti ti-heart" style="color:#dd93b7;"></i> Keterlibatan Orang Tua</h3>
      <div>${parentDays > 0
        ? `Orang tua ${escapeHtml(player.name)} menemani main <b>${parentDays}x</b> minggu ini.`
        : `Belum ada sesi ditemani orang tua minggu ini.`}</div>
    </div>`;

    const initials = player.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    detailContent.innerHTML = `
      <h2 class="db-detail-name"><span class="db-avatar">${initials}</span> ${escapeHtml(player.name)}</h2>
      ${sections}
      ${parentSessionsHtml}
      <div class="db-detail-section">
        <button class="db-btn-small" id="generate-draft-btn">Generate draft insight untuk ortu</button>
      </div>
    `;
    document.getElementById("generate-draft-btn").addEventListener("click", () => generateDraft(studentId));
    overlay.classList.remove("hidden");

    GAMES.forEach(g => {
      const totals = gameTotals(s[g.id].topicStats);
      if (totals.correct + totals.wrong === 0) return;
      renderChart(`detail-chart-${g.id}`, {
        type: "doughnut",
        data: {
          labels: ["Benar", "Salah"],
          datasets: [{ data: [totals.correct, totals.wrong], backgroundColor: [CHART_COLORS[g.id], "#f3d9d6"] }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } }
        }
      });
    });
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
  // first name, just aggregate stats it already reads from the table/detail view.
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

  // ---- Approval queue ----
  function renderInsights() {
    const pendingEl = document.getElementById("pending-list");
    const approvedEl = document.getElementById("approved-list");
    const entries = Object.entries(cache.insights);
    const pending = entries.filter(([, v]) => v.status === "pending");
    const approved = entries.filter(([, v]) => v.status === "approved");

    pendingEl.innerHTML = pending.length ? pending.map(([studentId, v]) => insightCardHtml(studentId, v, "pending")).join("")
      : `<div class="db-empty-note">Tidak ada draft yang menunggu persetujuan.</div>`;
    approvedEl.innerHTML = approved.length ? approved.map(([studentId, v]) => insightCardHtml(studentId, v, "approved")).join("")
      : `<div class="db-empty-note">Belum ada yang disetujui.</div>`;

    pendingEl.querySelectorAll("[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => approveInsight(btn.dataset.approve, btn.closest(".db-insight-card").querySelector("textarea").value));
    });
    approvedEl.querySelectorAll("[data-send]").forEach(btn => {
      btn.addEventListener("click", () => sendInsightEmail(btn.dataset.send));
    });
  }

  function insightCardHtml(studentId, insight, kind) {
    const player = (window.AIG_PLAYERS || []).find(p => p.id === studentId);
    const name = player ? player.name : studentId;
    const generated = insight.generatedAt ? new Date(insight.generatedAt).toLocaleString("id-ID") : "-";

    let actions;
    if (kind === "pending") {
      actions = `<div class="db-insight-actions"><button class="db-btn-small" data-approve="${studentId}">Approve</button></div>`;
    } else if (insight.sentAt) {
      actions = `<div class="db-insight-meta">Disetujui: ${insight.approvedAt ? new Date(insight.approvedAt).toLocaleString("id-ID") : "-"}</div>
        <div class="db-insight-meta">Terkirim ke ${escapeHtml(insight.sentTo || "-")}: ${new Date(insight.sentAt).toLocaleString("id-ID")}</div>`;
    } else if (player && parseEmails(player.parentEmail).length) {
      actions = `<div class="db-insight-meta">Disetujui: ${insight.approvedAt ? new Date(insight.approvedAt).toLocaleString("id-ID") : "-"}</div>
        <div class="db-insight-actions"><button class="db-btn-small" data-send="${studentId}">Kirim Email ke Ortu (${escapeHtml(player.parentEmail)})</button></div>`;
    } else {
      actions = `<div class="db-insight-meta">Disetujui: ${insight.approvedAt ? new Date(insight.approvedAt).toLocaleString("id-ID") : "-"}</div>
        <div class="db-empty-note">Email ortu belum diisi di players.js — belum bisa dikirim otomatis.</div>`;
    }

    return `<div class="db-insight-card">
      <h4>${escapeHtml(name)}</h4>
      <textarea ${kind === "approved" ? "readonly" : ""}>${escapeHtml(insight.draft || "")}</textarea>
      <div class="db-insight-meta">Dibuat: ${generated}</div>
      ${actions}
    </div>`;
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
        if (btn) { btn.disabled = false; btn.textContent = `Kirim Email ke Ortu (${player.parentEmail})`; }
      });
  }
})();
