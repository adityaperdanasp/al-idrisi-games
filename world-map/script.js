/* =================================================================
   World Map (PM round 12, item 8) -- every game and mode as a place on
   one map, grouped into regions. Each node has a progress ring coloured by
   your accuracy there (from topicStats), and unvisited places pulse, so the
   map itself tells you where to go next. Bo suggests one stop at the top.
   Node `g` = the gameId used with recordTopicAttempt (null = not a quiz).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const REGIONS = [
  { name: "Math Bay", emoji: "🔢", bg: "linear-gradient(160deg,#fde7c8,#f9c98a)", nodes: [
    ["mathville", "🏘️", "MathVille", "../mathville/", "mathville"], ["multipleazka", "🏎️", "Math Race", "../multipleazka/", "mathrace"],
    ["fractions-kitchen", "🥣", "Fractions Kitchen", "../fractions-kitchen/", "fractions-kitchen"], ["times-rhythm", "🎵", "Times Rhythm", "../times-rhythm/", "times-rhythm"],
    ["zombie-defense", "🧟", "Zombie Defense", "../zombie-defense/", "zombie-defense"], ["cooking-rush", "🍳", "Cooking Rush", "../cooking-rush/", "cooking-rush"]] },
  { name: "Word Woods", emoji: "🌲", bg: "linear-gradient(160deg,#d8f3dc,#95d5a6)", nodes: [
    ["azkacraft", "📖", "Language & Arts", "../azkacraft/", "language-arts"], ["word-detective", "🕵️", "Word Detective", "../word-detective/", "word-detective"],
    ["story-maker", "✏️", "Story Maker", "../story-maker/", "story-maker"], ["speak-with-bo", "🎤", "Speak with Bo", "../speak-with-bo/", "speak-with-bo"], ["voice-quiz", "🗣️", "Voice Quiz", "../voice-quiz/", "voice-quiz"], ["music-corner", "🎼", "Music Corner", "../music-corner/", null]] },
  { name: "Science Peaks", emoji: "⛰️", bg: "linear-gradient(160deg,#dbeafe,#93c5fd)", nodes: [
    ["azkauniverse", "🪐", "SolarQuest", "../azkauniverse/", "solarquest"], ["science-lab", "🧪", "Science Lab", "../science-lab/", "science-lab"], ["geo-flight", "🌍", "Geo Flight", "../geo-flight/", "geo-flight"]] },
  { name: "Adventure Isle", emoji: "🏝️", bg: "linear-gradient(160deg,#fce7f3,#f9a8d4)", nodes: [
    ["island-adventure", "🏝️", "Island Adventure", "../island-adventure/", "island-adventure"], ["dungeon", "🗡️", "Dungeon Crawler", "../dungeon/", "dungeon"], ["escape-daily", "🗝️", "Escape Room", "../escape-daily/", "escape-daily"], ["pattern-puzzles", "🧩", "Pattern Puzzles", "../pattern-puzzles/", "pattern-puzzles"], ["dino-rider", "🦖", "Dino Rider", "../dino-rider/", "dino-rider"], ["sea-mission", "⛵", "Sea Mission", "../sea-mission/", "sea-mission"],
    ["ninja-runner", "🥷", "Ninja Runner", "../ninja-runner/", null], ["boss-rush", "🥊", "Boss Rush", "../boss-rush/", null], ["card-race", "🃏", "Quiz Card Race", "../card-race/", "card-race"]] },
  { name: "Home Harbor", emoji: "⚓", bg: "linear-gradient(160deg,#ede9fe,#c4b5fd)", nodes: [
    ["bo-home", "🏠", "Bo's World", "../bo-home/", null], ["garage", "🔧", "Garage", "../garage/", null], ["workshop", "✨", "Workshop", "../workshop/", null], ["bo-class", "🎓", "Bo's Classroom", "../bo-class/", "bo-class"], ["weekly-boss", "🐉", "Weekly Boss", "../weekly-boss/", null], ["my-town", "🏘️", "My Town", "../my-town/", null], ["bo-tutor", "🎓", "Bo's Tutor", "../bo-tutor/", "bo-tutor"],
    ["friend-duel", "⚔️", "Friend Duel", "../friend-duel/", "friend-duel"], ["zen-mode", "🍃", "Zen Mode", "../zen-mode/", "zen-mode"], ["extras", "🎁", "Extras", "../extras/", null],
    ["ready-check", "✅", "Level-Up Check", "../ready-check/", null], ["quick-review", "🔁", "Quick Review", "../quick-review/", "quick-review"], ["word-book", "📕", "Word Book", "../word-book/", "word-book"],
    ["game-room", "🎮", "Game Room", "../game-room/", null]] }
];

if (!player) document.getElementById("app").insertAdjacentHTML("beforeend", K.signedOutHtml("🗺️"));
else init();

async function init() {
  const prog = await AIGLeaderboard.getGameProgress();
  const fam = await AIGLeaderboard.getFamiliar().catch(() => null);
  const status = g => {
    if (!g) return { cls: "", p: 0 };
    const s = prog[g]; const n = s ? s.correct + s.wrong : 0;
    if (!n) return { cls: "new", p: 100, isNew: true };
    const acc = s.correct / n;
    return { cls: n >= 20 && acc >= 0.8 ? "gold" : acc >= 0.6 ? "silver" : "bronze", p: Math.min(100, Math.round(acc * 100)), acc, n };
  };
  let best = null;
  REGIONS.forEach(r => r.nodes.forEach(n => { const st = status(n[4]); n.st = st; if (n[4] && (st.isNew && !best)) best = n; }));
  if (!best) { let low = 2; REGIONS.forEach(r => r.nodes.forEach(n => { if (n.st.acc !== undefined && n.st.acc < low) { low = n.st.acc; best = n; } })); }
  $("wm-sug").innerHTML = `<img src="../icon-192.png" alt="Bo"><div>${fam && fam.adopted ? fam.adopted.emoji + " " : ""}${best ? `<b>Bo suggests:</b> ${best[1]} ${K.esc(best[2])} — ${best.st.isNew ? "you haven't been there yet!" : `let's raise that ${Math.round(best.st.acc * 100)}%!`} <a href="${best[3]}" style="color:#15803d;font-weight:800">Go →</a>` : "Explore anywhere — every place is open!"}</div>`;
  $("wm-map").innerHTML = REGIONS.map((r, i) => `${i ? '<div class="wm-path"></div>' : ""}<div class="wm-region" style="background:${r.bg}"><h2>${r.emoji} ${r.name}</h2><div class="wm-nodes">${r.nodes.map(n => `<a class="wm-node ${n.st.cls}" href="${n[3]}" style="--p:${n.st.p}">${n.st.isNew ? '<span class="wm-tag">NEW</span>' : ""}<div class="wm-ring"><div class="wm-in">${n[1]}</div></div><div class="wm-name">${K.esc(n[2])}</div></a>`).join("")}</div></div>`).join("");
}
