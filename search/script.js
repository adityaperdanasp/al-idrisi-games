/* =================================================================
   Search (PM round 13, item 12) -- one box that finds any game, tool or
   practice page by name or by what it teaches (English + Indonesian
   keywords). Static index: add a line here when a new page is added.
   [emoji, name, url, description, keywords]
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const INDEX = [
  ["🏘️", "MathVille", "../mathville/", "Town map with 10 math chapters", "math matematika town chapter place value addition subtraction multiplication division prime gcf lcm measurement rounding word problems"],
  ["🏎️", "Math Race", "../multipleazka/", "Race by solving multiplication", "math race perkalian multiplication times tables balapan racing multiplayer"],
  ["📖", "Language & Arts", "../azkacraft/", "Spelling, antonyms, prefixes, grammar, reading", "language english bahasa inggris spelling grammar antonym prefix suffix contraction capital reading writing"],
  ["🪐", "SolarQuest", "../azkauniverse/", "Science adventure through space", "science sains planet space solar system star atom"],
  ["🎯", "Focus Round", "../focus-round/", "20 mixed practice questions", "focus practice latihan mixed campur"],
  ["🥷", "Ninja Runner", "../ninja-runner/", "Run, jump, answer questions", "ninja runner game jump lari"],
  ["🥊", "Boss Rush", "../boss-rush/", "Fight bosses with answers", "boss fight battle"],
  ["🧟", "Zombie Math Defense", "../zombie-defense/", "Shoot zombies with right answers", "zombie defense tower math action"],
  ["🃏", "Quiz Card Race", "../card-race/", "Play cards by answering", "card kartu race uno bot"],
  ["🥣", "Fractions Kitchen", "../fractions-kitchen/", "Measure recipes with fractions", "fractions pecahan kitchen cooking masak cup"],
  ["🕵️", "Word Detective", "../word-detective/", "Read a case, find the culprit", "reading membaca detective mystery comprehension"],
  ["🧩", "Pattern Puzzles", "../pattern-puzzles/", "Logic puzzles and codes", "pattern puzzle logic teka-teki sandi code sequence urutan"],
  ["🎓", "Bo's Classroom", "../bo-class/", "Short animated lessons", "lesson class kelas belajar pelajaran teach explain"],
  ["🐉", "Weekly Boss", "../weekly-boss/", "The class fights a boss together", "boss weekly mingguan raid class kelas"],
  ["🗝️", "Escape Room Daily", "../escape-daily/", "5 rooms, one door code", "escape room puzzle teka-teki"],
  ["🎵", "Times Rhythm", "../times-rhythm/", "Multiplication to the beat", "times tables rhythm music perkalian irama"],
  ["🧪", "Science Lab", "../science-lab/", "Predict experiments", "science sains lab experiment eksperimen"],
  ["🌍", "Geo Flight", "../geo-flight/", "Countries, flags & capitals", "geography geografi countries negara flag bendera capital ibu kota passport"],
  ["🗡️", "Dungeon Crawler", "../dungeon/", "RPG fights with questions", "dungeon rpg hero monster gear"],
  ["🏝️", "Island Adventure", "../island-adventure/", "Sail between four islands", "island adventure story fractions shapes pulau petualangan"],
  ["🏘️", "My Town", "../my-town/", "Build your own town", "town city build kota bangun"],
  ["⚔️", "Friend Duel", "../friend-duel/", "Challenge a friend or Bo-Bot", "duel friend teman challenge tantang bot"],
  ["✏️", "Story Maker", "../story-maker/", "Write stories with grammar", "story writing menulis cerita grammar book buku"],
  ["🎤", "Speak with Bo", "../speak-with-bo/", "Read English aloud", "speaking speak bicara pronunciation pengucapan microphone"],
  ["🍃", "Zen Mode", "../zen-mode/", "Calm practice, no timer", "zen calm relax santai tenang no timer"],
  ["🎓", "Bo's Tutor Session", "../bo-tutor/", "Practice your trickiest topic", "tutor coach weak topic lemah latihan help"],
  ["🔁", "Quick Review", "../quick-review/", "Missed questions come back", "review ulang spaced repetition mistakes salah"],
  ["📕", "Word Book", "../word-book/", "Your tricky words", "words vocabulary kata kamus book"],
  ["✅", "Level-Up Check", "../ready-check/", "Am I ready for the next topic?", "ready check test ujian naik level"],
  ["🏠", "Bo's World", "../bo-home/", "Bo's house, familiar, letters, museum, radio", "bo home house rumah familiar pet pets hewan animal dino letters surat museum radio music musik"],
  ["🗺️", "World Map", "../world-map/", "Every game on one map", "map peta explore navigation"],
  ["🎁", "Extras", "../extras/", "Shop, wheel, garden, quests, calendar", "extras shop wheel garden quest advent calendar coins gems piggy booster tournament club"],
  ["🌟", "My Profile", "../profile/", "Your trophies, room and stats", "profile profil trophy room stats"],
  ["🏆", "Leaderboard", "../leaderboard.html", "See how the class is doing", "leaderboard ranking peringkat"],
  ["🏆", "Class Team Board", "../class-board/", "Big-screen team scores", "class team board kelas tim"],
  ["🎮", "Game Room", "../game-room/", "All the new mini-games", "game room mini games"],
  ["⚙️", "Settings", "../settings/", "Text size, contrast, sound, backup", "settings pengaturan accessibility text size font contrast dyslexia backup"],
  ["🆘", "Help", "../help/", "Questions and problem reports", "help bantuan report problem masalah faq"],
  ["👨‍👩‍👧", "Parent Portal", "../parents/", "For grown-ups", "parent orang tua portal focus mission limit"]
];
const CHIPS = ["fractions", "spelling", "multiplication", "science", "pets", "calm", "help"];
const norm = s => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ");
function search(q) {
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return INDEX.slice(0, 10);
  return INDEX.map(e => {
    const name = norm(e[1]), hay = norm(e[1] + " " + e[3] + " " + e[4]);
    let score = 0;
    for (const w of t) { if (name.includes(w)) score += 5; if (hay.includes(w)) score += 2; if (hay.split(" ").some(x => x.startsWith(w))) score += 1; }
    return [score, e];
  }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 12);
}
function draw() {
  const res = search($("sr-in").value);
  $("sr-out").innerHTML = res.length ? res.map(e => `<a class="sr-res" href="${e[2]}"><span class="sr-e">${e[0]}</span><span><span class="sr-n">${K.esc(e[1])}</span><br><span class="sr-d">${K.esc(e[3])}</span></span></a>`).join("") : '<div class="kit-sub" style="margin:0;text-align:center">Nothing found — try a different word, or ask Bo in Help!</div>';
}
$("sr-chips").innerHTML = CHIPS.map(c => `<button class="sr-chip" type="button">${c}</button>`).join("");
$("sr-chips").querySelectorAll("button").forEach(b => b.onclick = () => { $("sr-in").value = b.textContent; draw(); });
$("sr-in").addEventListener("input", draw);
$("sr-in").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); const first = $("sr-out").querySelector("a"); if (first) location.href = first.getAttribute("href"); } });
draw(); $("sr-in").focus();
