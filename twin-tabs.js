/* =================================================================
   Twin-game tabs (audit round 2) -- three pairs of look-alike games are
   now ONE game each, with a tab bar right under the top bar:
     Duel Arena        = Arena (10 questions)  | Quick Duel (8 questions)
     City Builder      = City (bricks)          | My Town (5×5, coins)
     Escape the Vault  = Vault (heist)          | Daily Puzzle Rooms
   Only the main page of each pair is listed in Game Room, World Map
   and Search. Usage: <script src="../twin-tabs.js" data-group="duel"></script>
   ================================================================= */
(function () {
  const GROUPS = {
    duel: [["duel", "⚔️ Arena"], ["friend-duel", "⚡ Quick Duel (8)"]],
    city: [["city-builder", "🏙️ City"], ["my-town", "🏘️ My Town"]],
    escape: [["escape-room", "🔐 Vault Heist"], ["escape-daily", "🧩 Daily Puzzles"]]
  };
  const me = document.currentScript, group = GROUPS[me && me.dataset.group];
  if (!group) return;
  const here = location.pathname.split("/").filter(Boolean).slice(-1)[0] || "";
  function mount() {
    if (document.querySelector(".twin-tabs")) return;
    const bar = document.createElement("nav");
    bar.className = "twin-tabs"; bar.setAttribute("aria-label", "Game modes");
    bar.innerHTML = group.map(([dir, label]) => `<a href="../${dir}/" class="${dir === here ? "on" : ""}" ${dir === here ? 'aria-current="page"' : ""}>${label}</a>`).join("");
    const st = document.createElement("style");
    st.textContent = `.twin-tabs{display:flex;gap:6px;margin:0 14px 10px;position:relative;z-index:30}
      .twin-tabs a{flex:1;text-align:center;padding:9px 6px;border:3px solid #1b1b1b;background:#fff;color:#1b1b1b;font-weight:800;font-size:.82rem;text-decoration:none;box-shadow:0 3px 0 #1b1b1b}
      .twin-tabs a.on{background:#6cc04a;color:#fff}`;
    document.head.appendChild(st);
    const top = document.querySelector(".kit-top, .dl-topbar, .cb-topbar, .er-topbar, [class$='-topbar']");
    if (top) top.after(bar); else document.body.prepend(bar);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  // kit pages build .kit-top after load; try again shortly.
  setTimeout(mount, 400); setTimeout(mount, 1500);
})();
