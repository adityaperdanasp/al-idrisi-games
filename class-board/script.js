/* =================================================================
   Class Team Board -- 4 colour teams (stable hash of each id) whose score
   is the sum of members' correct answers this week.
   Audit batch 2 adds: "you're on team X" card, team mission bar, a 10x10
   territory map split by score, team mascots that level up, MVP per team,
   live count-up + "lead changed" fanfare, activity feed from score changes
   between refreshes, week countdown, 4-week history, projector mode and a
   "help my team" shortcut. Still refreshes every 30 seconds.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const MEDAL = ["🥇", "🥈", "🥉", "4️⃣"];
const MASCOT = { rockets: "🐔", dolphins: "🐟", turtles: "🐢", bees: "🐝" };
const me = (window.AIGPlayer && AIGPlayer.getPlayer()) || null;
let last = null, lastLeader = null, feed = [];

function weekEndsIn() {
  const now = new Date(), day = now.getUTCDay(), next = new Date(now);
  next.setUTCDate(now.getUTCDate() + ((8 - day) % 7 || 7)); next.setUTCHours(0, 0, 0, 0);
  const ms = next - now, d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24;
  return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor(ms / 60000) % 60}m`;
}
function countUp(el, to) {
  const from = Number(el.dataset.v || 0); el.dataset.v = to; if (from === to) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 700;
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function chime() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [523, 659, 784].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.12; o.type = "square"; o.frequency.value = f; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.2); }); } catch (e) {} }

function territory(teams) {
  const total = teams.reduce((a, t) => a + t.score, 0);
  const cells = []; let assigned = 0;
  teams.forEach((t, i) => { const n = total ? Math.round(t.score / total * 100) : 25; for (let k = 0; k < n && assigned < 100; k++, assigned++) cells.push(t.color); });
  while (cells.length < 100) cells.push("#cfc6b0");
  // spread colours so the map looks like captured land, not stripes (stable shuffle)
  const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => ((a * 37) % 101) - ((b * 37) % 101));
  const grid = Array(100); order.forEach((pos, i) => { grid[pos] = cells[i]; });
  return `<div class="cb-map">${grid.map(c => `<i style="background:${c}"></i>`).join("")}</div>`;
}

async function load() {
  try {
    const { week, teams } = await AIGLeaderboard.getClassTeams();
    const ranked = teams.slice().sort((a, b) => b.score - a.score);
    const max = Math.max(1, ranked[0].score), total = teams.reduce((a, t) => a + t.score, 0);
    // feed: who scored since the last refresh
    if (last) teams.forEach(t => t.members.forEach(m => { const prev = (last[m.id] || 0); if (m.score > prev) feed.unshift(`${m.name} +${m.score - prev} for ${t.emoji} ${t.name}`); }));
    feed = feed.slice(0, 6); last = {}; teams.forEach(t => t.members.forEach(m => { last[m.id] = m.score; }));
    if (lastLeader && ranked[0].score > 0 && ranked[0].id !== lastLeader) { chime(); K.toastAdv(`${ranked[0].emoji} ${ranked[0].name} take the lead!`); }
    lastLeader = ranked[0].score > 0 ? ranked[0].id : lastLeader;

    const mine = me ? teams.find(t => t.members.some(m => m.id === me.id)) : null;
    const myRow = mine && mine.members.find(m => m.id === me.id);
    $("cb-sub").innerHTML = `Week of ${week} · ends in <b>${weekEndsIn()}</b> · whole class: <b>${total}</b> right answers`;
    $("cb-me").innerHTML = mine ? `<div class="cb-mine" style="border-color:${mine.color}"><b>You're on ${mine.emoji} ${K.esc(mine.name)}!</b><br>You added <b>${myRow.score}</b> this week · #${mine.members.indexOf(myRow) + 1} in your team <a class="kit-btn" href="../game-room/" style="margin-top:8px;display:inline-block">⚔️ Help my team</a></div>`
      : `<div class="cb-mine"><b>Answer one question in any game to join a team!</b><br><small>Your team is picked for you so it's always fair.</small> <a class="kit-btn" href="../game-room/" style="margin-top:8px;display:inline-block">🎮 Play a game</a></div>`;
    $("cb-terr").innerHTML = `<div class="cb-h">🗺️ Territory</div>${territory(teams)}`;
    $("cb-list").innerHTML = ranked.map((t, i) => {
      const goal = Math.max(100, t.members.length * 40), lvl = Math.floor(t.score / 100) + 1, mvp = t.members[0];
      return `<div class="cb-team" style="border-left:10px solid ${t.color}">
      ${i === 0 && t.score > 0 ? '<div class="cb-crown">👑</div>' : ""}
      <div class="cb-head"><span class="cb-em">${t.emoji}</span><span class="cb-name">${MEDAL[i]} ${K.esc(t.name)}</span><span class="cb-score" style="color:${t.color}" data-team="${t.id}">0</span></div>
      <div class="cb-bar"><i style="width:${Math.round(t.score / max * 100)}%;background:${t.color}"></i></div>
      <div class="cb-row"><span>${MASCOT[t.id] || "⭐"} Mascot Lv ${lvl}</span><span>🎯 Mission ${Math.min(t.score, goal)}/${goal}${t.score >= goal ? " ✅" : ""}</span>${mvp ? `<span>🏅 MVP ${K.esc(mvp.name)}</span>` : ""}</div>
      <div class="cb-mem">${t.members.length ? t.members.slice(0, 4).map(m => `${K.esc(m.name)} (${m.score})`).join(" · ") : "No players yet"}${t.members.length > 4 ? ` · +${t.members.length - 4} more` : ""}</div></div>`;
    }).join("");
    ranked.forEach(t => { const el = document.querySelector(`[data-team="${t.id}"]`); if (el) { el.dataset.v = (window.__cbPrev || {})[t.id] || 0; countUp(el, t.score); } });
    window.__cbPrev = Object.fromEntries(teams.map(t => [t.id, t.score]));
    $("cb-feed").innerHTML = feed.length ? `<div class="cb-h">📣 Just now</div>${feed.map(f => `<div class="cb-f">${K.esc(f)}</div>`).join("")}` : "";
  } catch (e) { $("cb-sub").textContent = "Couldn't load scores — check the connection."; }
}
async function loadHistory() {
  try {
    const h = await AIGLeaderboard.getClassTeamsHistory(4);
    $("cb-hist").innerHTML = `<div class="cb-h">📜 Last 4 weeks</div>` + h.weeks.map(w => {
      const best = w.scores.indexOf(Math.max(...w.scores)), any = w.scores.some(x => x > 0);
      return `<div class="cb-f"><b>${w.week}</b> · ${any ? `${h.teams[best].emoji} ${K.esc(h.teams[best].name)} won` : "no games"} <small>(${w.scores.map((x, i) => h.teams[i].emoji + x).join(" ")})</small></div>`;
    }).join("");
  } catch (e) {}
}
$("cb-proj").onclick = () => { document.body.classList.toggle("cb-projector"); try { if (document.body.classList.contains("cb-projector")) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen && document.fullscreenElement && document.exitFullscreen(); } catch (e) {} };
load(); loadHistory();
setInterval(load, 30000);
