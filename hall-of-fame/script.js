/* =================================================================
   Hall of Fame — a permanent, PUBLIC wall of graduated students, same
   no-sign-in-required footing as leaderboard.html (this reads player
   names too, so it's consistent with that existing precedent rather than
   a new privacy posture). Reads players/{id}/graduatedInfo across the
   whole players/ tree once, same "one read of the whole tree" technique
   as getWeeklyLeaderboard()/getMostImproved() in leaderboard.js -- a
   small class roster makes this cheap, and graduation is a rare,
   deliberate teacher action (see dashboard/dashboard.js's toggleGraduate),
   not something that needs a live subscription.
   ================================================================= */

function titleForCount(count, tiers) {
  let result = tiers[0];
  for (const t of tiers) if (count >= t.min) result = t;
  return result;
}

async function loadHallOfFame() {
  const listEl = document.getElementById("hf-list");
  if (!window.AIGLeaderboard) { listEl.innerHTML = `<p class="hf-empty-note">Couldn't load right now.</p>`; return; }

  const tiers = AIGLeaderboard.getTitleTiers();
  const snap = await AIGLeaderboard.db.ref("players").get();
  const graduates = [];
  if (snap.exists()) {
    snap.forEach(childSnap => {
      const info = childSnap.child("graduatedInfo").val();
      if (info && info.name) graduates.push({ id: childSnap.key, ...info });
    });
  }

  if (!graduates.length) {
    listEl.innerHTML = `<p class="hf-empty-note">No legends yet -- the first name on this wall could be yours!</p>`;
    return;
  }

  graduates.sort((a, b) => (b.totalCorrect || 0) - (a.totalCorrect || 0));

  listEl.innerHTML = graduates.map((g, i) => {
    const rank = i + 1;
    const rankLabel = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
    const tier = titleForCount(g.totalCorrect || 0, tiers);
    const dateStr = g.graduatedAt ? new Date(g.graduatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";
    return `
      <div class="hf-card${rank === 1 ? " top1" : ""}">
        <div class="hf-rank">${rankLabel}</div>
        <div class="hf-info">
          <div class="hf-name">${escapeHtml(g.name)}</div>
          <div class="hf-meta">${(g.totalCorrect || 0).toLocaleString("en-US")} correct answers${dateStr ? " · graduated " + dateStr : ""}</div>
        </div>
        <div class="hf-title-badge">${tier.emoji} ${tier.name}</div>
      </div>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

loadHallOfFame();
