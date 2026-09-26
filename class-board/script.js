/* =================================================================
   Class Team Board (PM round 11, item 16) -- a big-screen scoreboard:
   everyone who played this week is on one of 4 colour teams (a stable
   hash of their id, so nobody picks and nobody changes), and each team's
   score is the sum of its members' correct answers this week. Meant to be
   projected in class; refreshes itself every 30 seconds. Note: this is a
   separate 4-team view from the Red-vs-Blue Team Battle in Extras.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const MEDAL = ["🥇", "🥈", "🥉", ""];

async function load() {
  try {
    const { week, teams } = await AIGLeaderboard.getClassTeams();
    const ranked = teams.slice().sort((a, b) => b.score - a.score);
    const max = Math.max(1, ranked[0].score);
    $("cb-sub").textContent = `Week of ${week} · answers add up for the whole team!`;
    $("cb-list").innerHTML = ranked.map((t, i) => `<div class="cb-team" style="border-left:10px solid ${t.color}">
      ${i === 0 && t.score > 0 ? '<div class="cb-crown">👑</div>' : ""}
      <div class="cb-head"><span class="cb-em">${t.emoji}</span><span class="cb-name">${MEDAL[i]} ${K.esc(t.name)}</span><span class="cb-score" style="color:${t.color}">${t.score}</span></div>
      <div class="cb-bar"><i style="width:${Math.round(t.score / max * 100)}%;background:${t.color}"></i></div>
      <div class="cb-mem">${t.members.length ? t.members.slice(0, 3).map(m => `${K.esc(m.name)} (${m.score})`).join(" · ") : "No players yet"}${t.members.length > 3 ? ` · +${t.members.length - 3} more` : ""}</div></div>`).join("");
  } catch (e) { $("cb-sub").textContent = "Couldn't load scores — check the connection."; }
}
load();
setInterval(load, 30000);
