/* =====================================================================
   Hub game library. Every game is on the hub, organised as:
     ⭐ Favorites   -- the kid's most-played games (from their own topicStats),
                       plus anything they pinned with 📌, as big tiles on top.
     Clusters        -- 8 collapsible sections of games by kind (first two open).
   Tiles carry small labels: 🔥 played a lot, 👀 never tried, ✨ new card.
   Replaces the old flat .sc-game-list (kept in the DOM, hidden).
   ===================================================================== */
(function () {
  "use strict";

  const CLUSTERS = [
    ["race", "🏎️ Balapan & Aksi", "#4f86f7", [["multipleazka", "Math Race", "🏎️"], ["dinorace", "Dino Race", "🦖"], ["plane", "Plane Mode", "✈️"], ["drive", "Drive Mode", "🚗"], ["ninja-runner", "Ninja Runner", "🥷"], ["parkour-run", "Parkour", "🧗"], ["space-race", "Space Race", "🚀"], ["dino-rider", "Dino Rider", "🦕"], ["sea-mission", "Sea Mission", "⛵"], ["zombie-defense", "Zombie Defense", "🧟"]]],
    ["adv", "🗺️ Petualangan", "#e0953a", [["mathville", "MathVille", "🏙️"], ["azkacraft", "Language & Arts", "📖"], ["azkauniverse", "SolarQuest", "🪐"], ["treasure-dig", "Treasure Dig", "⛏️"], ["vault-quest", "Vault Quest", "💰"], ["island-adventure", "Island Adventure", "🏝️"]]],
    ["battle", "⚔️ Battle & Boss", "#c0392b", [["boss-rush", "Boss Rush", "🥊"], ["monster-battle", "Monster Catch", "🐲"], ["fortress-math", "Fortress Math", "🏰"], ["dungeon", "Dungeon", "🗡️"], ["duel", "Duel Arena", "⚔️"], ["card-race", "Card Race", "🃏"], ["weekly-boss", "Weekly Boss", "🐉"]]],
    ["sport", "⚽ Olahraga & Irama", "#d06a2a", [["math-tennis", "Math Tennis", "🎾"], ["basketball", "Math Hoops", "🏀"], ["number-line-jump", "Number Jump", "🐇"], ["dance-battle", "Dance Battle", "💃"], ["times-rhythm", "Times Rhythm", "🎵"]]],
    ["puzzle", "🧩 Teka-teki & Misteri", "#7b3fe4", [["escape-room", "Escape the Vault", "🔐"], ["treasure-map", "Treasure Map", "🗺️"], ["memory-match", "Memory Match", "🧠"], ["pattern-puzzles", "Pattern Puzzles", "🔷"], ["word-detective", "Word Detective", "🕵️"], ["quiz-show", "Quiz Show", "🎤"]]],
    ["build", "🏗️ Bangun & Kreasi", "#58b368", [["city-builder", "City Builder", "🏙️"], ["cooking-rush", "Cooking Rush", "🍳"], ["fractions-kitchen", "Fractions Kitchen", "🥣"], ["story-maker", "Story Maker", "✏️"], ["music-corner", "Music Corner", "🎼"], ["geo-flight", "Geo Flight", "🌍"], ["kids-quiz", "Kids' Quiz", "📝"]]],
    ["learn", "📚 Belajar", "#59607a", [["quick-review", "Quick Review", "🔁"], ["word-book", "Word Book", "📕"], ["bo-class", "Bo's Classroom", "🎓"], ["bo-tutor", "Bo's Tutor", "🧑‍🏫"], ["ready-check", "Level-Up Check", "✅"], ["focus-round", "Focus Round", "🎯"], ["science-lab", "Science Lab", "🧪"], ["speak-with-bo", "Speak with Bo", "🎙️"], ["voice-quiz", "Voice Quiz", "🗣️"], ["zen-mode", "Zen Mode", "🍃"]]],
    ["home", "🏠 Bo & Barang", "#8b5a2b", [["bo-home", "Bo's World", "🏠"], ["garage", "Garage", "🔧"], ["workshop", "Crafting Table", "⚒️"], ["class-board", "Class Teams", "🏆"], ["world-map", "World Map", "🧭"]]]
  ];
  const NEW = { dinorace: 1, plane: 1, drive: 1 };
  // "Fokus Azka": child-side switch. ON = only the games below stay open and every question is a story problem or a
  // spelling word (see generators.js + question-pools.js + azkacraft/spelling.js). OFF = everything as usual.
  const FOCUS_KEY = "azka_focus";
  const FOCUS_GAMES = new Set(["mathville", "azkacraft", "math-tennis", "treasure-dig", "treasure-map", "quiz-show", "monster-battle", "boss-rush", "space-race", "escape-room", "cooking-rush", "fortress-math"]);
  const FOCUS_DEFAULT_FAV = ["mathville", "azkacraft", "treasure-dig", "math-tennis", "quiz-show", "monster-battle"];
  const focusOn = () => { try { return localStorage.getItem(FOCUS_KEY) === "1"; } catch (e) { return false; } };
  const setFocus = v => { try { localStorage.setItem(FOCUS_KEY, v ? "1" : "0"); } catch (e) {} };
  const TOPIC2DIR = { "plane-mode": "plane", "drive-mode": "drive" };
  const ID2DIR = { mathrace: "multipleazka", mathville: "mathville", "language-arts": "azkacraft", solarquest: "azkauniverse" };

  const ls = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const pins = () => { try { return JSON.parse(ls("hub_pins", "[]")) || []; } catch (e) { return []; } };
  const all = CLUSTERS.flatMap(c => c[3].map(g => ({ dir: g[0], name: g[1], em: g[2], cl: c[0], color: c[2] })));
  const byDir = Object.fromEntries(all.map(g => [g.dir, g]));

  function iconFor(g) {
    const card = document.querySelector(`.sc-game-card[href="${g.dir}/"]`);
    const ic = card && card.querySelector(".sc-game-icon");
    return ic && ic.querySelector("img, svg") ? ic.innerHTML : `<span class="lib-em">${g.em}</span>`;
  }
  function badge(g, counts) {
    const n = counts[g.dir] || 0;
    if (NEW[g.dir]) return `<i class="lib-badge new">✨ baru</i>`;
    if (n >= 20) return `<i class="lib-badge hot">🔥</i>`;
    if (!n) return `<i class="lib-badge never">👀</i>`;
    return "";
  }
  function tile(g, counts, big) {
    const pinned = pins().includes(g.dir);
    const locked = focusOn() && !FOCUS_GAMES.has(g.dir);
    return `<a class="lib-tile ${big ? "big" : ""}${locked ? " lib-locked" : ""}" ${locked ? 'data-locked="1" ' : ""}href="${g.dir}/" data-name="${g.name.toLowerCase()}" style="--c:${g.color}">
      ${badge(g, counts)}<button type="button" class="lib-pin ${pinned ? "on" : ""}" data-pin="${g.dir}" aria-label="Pin ${g.name}">📌</button>
      <span class="lib-ico">${iconFor(g)}</span><span class="lib-name">${g.name}</span></a>`;
  }

  async function counts() {
    const out = {};
    try {
      const p = window.AIGPlayer && AIGPlayer.getPlayer();
      if (!p) return out;
      const snap = await firebase.app("aig").database().ref(`players/${p.id}/topicStats`).once("value");
      Object.entries(snap.val() || {}).forEach(([gid, topics]) => {
        Object.entries(topics || {}).forEach(([topic, v]) => {
          if (!v || typeof v !== "object") return;
          // MathVille hosts Plane Mode and Drive Mode; count them as their own games.
          const dir = gid === "mathville" && TOPIC2DIR[topic] ? TOPIC2DIR[topic] : (ID2DIR[gid] || gid);
          out[dir] = (out[dir] || 0) + (v.correct || 0) + (v.wrong || 0);
        });
      });
    } catch (e) {}
    return out;
  }

  async function build() {
    const list = document.querySelector(".sc-game-list"); if (!list) return;
    const oldSearch = document.querySelector(".sc-search-link"); if (oldSearch) oldSearch.style.display = "none";
    const c = await counts();
    const ranked = Object.entries(c).filter(([d, n]) => n > 0 && byDir[d] && d !== "drive").sort((a, b) => b[1] - a[1]).map(([d]) => d);
    const FOCUS = focusOn();
    let favDirs;
    if (FOCUS) {
      // Fokus Azka: Favorites only shows games that stay open.
      favDirs = [...new Set(pins().filter(d => FOCUS_GAMES.has(d)).concat(ranked.filter(d => FOCUS_GAMES.has(d)), FOCUS_DEFAULT_FAV))].slice(0, 6);
    } else {
      favDirs = [...new Set(pins().concat(ranked))].slice(0, 5);
      // Drive Mode always has a Favorites slot (user's request 2026-10-13), even with few plays.
      if (!favDirs.includes("drive")) favDirs.splice(Math.min(2, favDirs.length), 0, "drive");
      ["multipleazka", "plane", "azkacraft", "mathville", "ninja-runner", "dinorace"].forEach(d => { if (favDirs.length < 6 && !favDirs.includes(d)) favDirs.push(d); });
    }
    const roam = document.getElementById("roam-car"); if (roam) roam.setAttribute("href", FOCUS ? "mathville/" : "plane/");
    const lib = document.createElement("div"); lib.className = `lib lib-b`; lib.id = "hub-library";
    lib.innerHTML = `
      <button id="lib-focus" type="button" class="lib-focus ${FOCUS ? "on" : ""}" aria-pressed="${FOCUS}"><span class="lib-focus-star">⭐</span><span><b>Fokus Azka: ${FOCUS ? "HIDUP" : "MATI"}</b><small>${FOCUS ? "Soal cerita math + mengeja. Game lain terkunci 🔒 — tekan lagi untuk mematikan." : "Tekan untuk latihan soal cerita math + mengeja kata."}</small></span></button>
      <div class="lib-search"><input id="lib-q" type="search" placeholder="🔍 Cari game… (mis. dino, pecahan, boss)" autocomplete="off"></div>
      <section class="lib-fav"><h3 class="lib-h">⭐ Favorit kamu</h3><div class="lib-favgrid">${favDirs.map(d => tile(byDir[d], c, true)).join("")}</div></section>
      ${CLUSTERS.map(([id, label, color, games], i) => {
        const inner = games.map(g => tile(byDir[g[0]], c, false)).join("");
        return `<details class="lib-sec" data-cl="${id}" ${(FOCUS ? games.some(g => FOCUS_GAMES.has(g[0])) : i < 2) ? "open" : ""}><summary class="lib-h" style="--c:${color}">${label} <small>${games.length} game</small><b class="lib-chev">▾</b></summary><div class="lib-grid">${inner}</div></details>`;
      }).join("")}
      <p class="lib-legend">${FOCUS ? "🔒 terkunci selama Fokus Azka HIDUP · " : ""}🔥 sering kamu mainkan · 👀 belum pernah dicoba · ✨ baru · 📌 sematkan ke Favorit</p>`;
    list.style.display = "none"; list.after(lib);
    lib.addEventListener("click", e => {
      if (e.target.closest("#lib-focus")) { e.preventDefault(); setFocus(!focusOn()); lib.remove(); build(); const top = document.getElementById("hub-library"); if (top) top.scrollIntoView({ block: "start" }); return; }
      const lockedTile = e.target.closest("[data-locked]");
      if (lockedTile) { e.preventDefault(); e.stopPropagation(); const hint = lib.querySelector(".lib-focus small"); if (hint) { hint.textContent = "🔒 Game ini aktif lagi kalau Fokus Azka dimatikan."; lib.querySelector(".lib-focus").classList.add("shake"); setTimeout(() => lib.querySelector(".lib-focus") && lib.querySelector(".lib-focus").classList.remove("shake"), 600); } return; }
      const b = e.target.closest("[data-pin]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const p = pins(), d = b.dataset.pin, i = p.indexOf(d); if (i >= 0) p.splice(i, 1); else p.unshift(d);
      try { localStorage.setItem("hub_pins", JSON.stringify(p.slice(0, 6))); } catch (er) {}
      lib.remove(); build();
    });
    lib.querySelector("#lib-q").addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase();
      lib.querySelectorAll(".lib-sec .lib-tile").forEach(t => { t.hidden = !!q && !t.dataset.name.includes(q); });
      lib.querySelectorAll(".lib-sec").forEach(s => { const any = [...s.querySelectorAll(".lib-tile")].some(t => !t.hidden); s.hidden = !any; if (q && any && s.tagName === "DETAILS") s.open = true; });
      lib.querySelector(".lib-fav").hidden = !!q;
    });
  }

  const css = document.createElement("style");
  css.textContent = `
    .lib-focus { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; text-align: left; padding: 12px 14px; border: 4px solid #1b1b1b; background: #6b6b6b; color: #fff; cursor: pointer; font: inherit; box-shadow: inset 4px 4px 0 rgba(255,255,255,.25), inset -4px -4px 0 rgba(0,0,0,.3); }
    .lib-focus.on { background: #e0953a; }
    .lib-focus-star { font-size: 1.8rem; }
    .lib-focus b { display: block; font-family: var(--bw-font-h, monospace); font-size: .8rem; text-shadow: 2px 2px 0 rgba(0,0,0,.5); }
    .lib-focus small { display: block; margin-top: 3px; font-family: var(--bw-font, sans-serif); font-size: .64rem; font-weight: 700; opacity: .95; }
    .lib-focus.shake { animation: libshake .5s; } @keyframes libshake { 20%,60% { transform: translateX(-5px); } 40%,80% { transform: translateX(5px); } }
    .lib-locked { filter: grayscale(1); opacity: .38; position: relative; cursor: not-allowed; }
    .lib-locked::after { content: "🔒"; position: absolute; bottom: 4px; right: 6px; font-size: .9rem; }
    .lib { padding: 10px 12px 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; max-width: 100%; overflow-x: hidden; } .lib > * { min-width: 0; }
    .lib-search input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 4px solid #1b1b1b; background: #fffdf2; font: 700 .9rem var(--bw-font, sans-serif); box-shadow: inset 3px 3px 0 rgba(0,0,0,.12); }
    .lib-h { margin: 0 0 8px; font-family: var(--bw-font-h, monospace); font-size: .72rem; color: #fff; text-shadow: 2px 2px 0 rgba(0,0,0,.6); display: flex; align-items: baseline; gap: 8px; }
    .lib-h small { font-family: var(--bw-font, sans-serif); font-size: .6rem; opacity: .85; text-shadow: none; color: #f3e6c4; }
    .lib-favgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lib-tile { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-decoration: none; background: var(--c); border: 4px solid #1b1b1b; box-shadow: inset 4px 4px 0 rgba(255,255,255,.35), inset -4px -4px 0 rgba(0,0,0,.28), 0 4px 0 rgba(0,0,0,.35); padding: 10px 4px 8px; min-height: 92px; }
    .lib-tile.big { min-height: 118px; }
    .lib-tile:active { transform: translateY(2px); }
    .lib-ico { width: 44px; height: 44px; display: grid; place-items: center; background: rgba(255,255,255,.92); border: 3px solid #1b1b1b; overflow: hidden; }
    .lib-tile.big .lib-ico { width: 56px; height: 56px; }
    .lib-ico img, .lib-ico svg { max-width: 82%; max-height: 82%; }
    .lib-em { font-size: 1.5rem; line-height: 1; } .lib-tile.big .lib-em { font-size: 1.9rem; }
    .lib-name { font-family: var(--bw-font-h, monospace); font-size: .52rem; line-height: 1.2; color: #fff; text-align: center; text-shadow: 2px 2px 0 rgba(0,0,0,.6); }
    .lib-tile.big .lib-name { font-size: .64rem; }
    .lib-badge { position: absolute; top: 3px; left: 3px; font-style: normal; font-size: .62rem; font-weight: 800; background: #fff; border: 2px solid #1b1b1b; padding: 0 3px; line-height: 1.3; }
    .lib-badge.new { background: #f5c542; } .lib-badge.never { background: #e8f1ff; }
    .lib-pin { position: absolute; top: 2px; right: 2px; border: 0; background: none; font-size: .8rem; padding: 2px; opacity: .3; cursor: pointer; }
    .lib-pin.on { opacity: 1; }
    .lib-grid > .lib-tile[hidden] { display: none; }
    .lib-sec { border: 4px solid #1b1b1b; background: rgba(0,0,0,.18); }
    .lib-sec > summary { list-style: none; cursor: pointer; margin: 0; padding: 12px 10px; background: var(--c); box-shadow: inset 4px 4px 0 rgba(255,255,255,.3), inset -4px -4px 0 rgba(0,0,0,.25); }
    .lib-sec > summary::-webkit-details-marker { display: none; }
    .lib-chev { margin-left: auto; font-size: .8rem; transition: transform .15s; } .lib-sec[open] .lib-chev { transform: rotate(180deg); }
    .lib-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px; }
    .lib-legend { margin: 0; text-align: center; font-size: .66rem; font-weight: 700; color: #f3e6c4; }`;
  document.head.appendChild(css);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(build, 300)); else setTimeout(build, 300);
})();
