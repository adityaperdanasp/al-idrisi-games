/* =================================================================
   Story Maker (PM round 11, item 14) -- build a 5-sentence story by
   choosing the grammatically right word for each blank (verb tense,
   articles, plurals, spelling of similar-sounding words). The finished
   story is bound into a "book" you keep in My Books
   (players/{id}/books/{storyId}) and can read again any time.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

// In each sentence, [right|wrong|wrong] -- the FIRST option is the correct one (shuffled when shown).
const STORIES = [
  { id: "robot", emoji: "🤖", title: "The Lost Robot", s: ["Once upon a time, a little robot [named|name|naming] Zip lived in a big city.", "Every morning, Zip [walks|walk|walking] to the park to watch the birds.", "One day, Zip [found|find|finds] a shiny golden key under a bench.", "The key [opened|open|opening] a tiny door in the old oak tree.", "Inside, there [were|was|is] twenty friendly squirrels waiting to say hello!"] },
  { id: "kitten", emoji: "🐱", title: "The Brave Kitten", s: ["A kitten [called|calling|calls] Mimi wanted to see the moon up close.", "She [climbed|climb|climbing] the tallest tree in the garden.", "But the branch was [thinner|thin|thinnest] than she expected.", "Mimi [saw|seen|see] an owl who offered to help her.", "Together, they [watched|watch|watching] the moon rise over the hills."] },
  { id: "picnic", emoji: "🌧️", title: "The Rainy Picnic", s: ["Sam and his sister [planned|plan|planning] a picnic for Saturday.", "They packed [an|a|the] apple, two sandwiches and some juice.", "Suddenly, it [began|begun|begin] to rain very hard.", "They ran [quickly|quick|quicker] under a big umbrella tree.", "The rain stopped, and [their|there|they're] picnic was the best ever!"] },
  { id: "space", emoji: "🚀", title: "Space Explorers", s: ["Luna and Max [are|is|am] astronauts on a rocket ship.", "They [flew|flied|fly] past the red planet Mars.", "Max [has|have|having] a camera to take pictures of the stars.", "Luna [said|says|saying] that the stars looked like tiny candles.", "Then they [returned|return|returning] home with amazing stories."] },
  { id: "baking", emoji: "🎂", title: "The Baking Contest", s: ["Every year, our town [holds|hold|holding] a big baking contest.", "Grandma made three [cakes|cake|cakeses] for the judges.", "She [was|were|be] very nervous before the results.", "The judges [tasted|taste|tasting] every slice carefully.", "Grandma won first prize, and [we|us|our] cheered loudly!"] },
  { id: "brush", emoji: "🎨", title: "The Magic Paintbrush", s: ["Ella [found|find|founded] an old paintbrush in the attic.", "When she painted a bird, it [flew|flown|flied] right off the page!", "She painted [some|a|an] flowers, and they smelled wonderful.", "Ella [shared|share|sharing] her magic with the whole class.", "Now everyone paints [together|togethers|to gether] on Fridays."] },
  // Audit round 2: three new genres.
  { id: "detective", emoji: "🕵️", title: "The Missing Cookie", s: ["Detective Kai [looked|look|looking] at the empty cookie jar.", "There [were|was|is] tiny crumbs on the kitchen floor.", "The crumbs led to [the|a|an] dog's bed.", "But the dog [was|were|be] fast asleep and full of fur, not crumbs.", "Kai [noticed|notice|noticing] a trail of sugar going up the stairs."] },
  { id: "dino", emoji: "🦕", title: "The Dinosaur Egg", s: ["Rex found a [huge|hugest|huger] egg in his garden.", "He [carried|carry|carryed] it carefully into the house.", "That night, the egg began to [crack|cracks|cracking].", "A baby dinosaur [peeked|peek|peeking] out and said hello.", "It [was|were|are] hungry and wanted pancakes!"] },
  { id: "pirate", emoji: "🏴‍☠️", title: "Pirate Treasure", s: ["Captain Nia [sailed|sail|sailing] her ship across the stormy sea.", "Her crew [were|was|is] looking for a golden treasure chest.", "They found [an|a|the] old map inside a bottle.", "The map [showed|show|shown] an island shaped like a star.", "Nia [shouted|shout|shouting], “Land ahoy!” and everyone cheered."] }
];

// Audit batch 4: you choose the hero's name, a plot choice before the last sentence (two endings per
// story, each with its own grammar blank), grammar tips that name the rule, a picture strip, Bo reads
// your finished book aloud, a cover colour, a free-write sentence with friendly checks, and writer
// badges for the bookshelf.
const ENDINGS = {
  robot: [["🌳 Stay with the squirrels", "Zip [decided|decide|deciding] to stay and build them a tiny playground."], ["🏙️ Go back to the city", "Zip [carried|carry|carrying] the golden key home and kept it forever."]],
  kitten: [["🦉 Fly with the owl", "Mimi and the owl [flew|flied|fly] above the clouds all night long."], ["🏠 Go home to sleep", "Mimi went home and [dreamed|dream|dreaming] about the moon."]],
  picnic: [["🌈 Look for a rainbow", "They [found|find|founded] a bright rainbow over the hill."], ["🐸 Meet a frog", "A happy frog [jumped|jump|jumping] onto their picnic blanket!"]],
  space: [["👽 Meet an alien", "A friendly alien [waved|wave|waving] at them from a purple moon."], ["🌙 Land on the Moon", "They [landed|land|landing] softly on the Moon and planted a flag."]],
  detective: [["🍪 Follow the sugar", "Kai found his little brother [eating|ate|eats] cookies under the blanket!"], ["🐱 Check the cat", "The cat [had|has|having] sugar on her whiskers — case closed!"]],
  dino: [["🥞 Make pancakes", "Rex [made|maked|make] a mountain of pancakes for his new friend."], ["🦖 Find its mum", "Rex and the baby [went|goed|go] to the museum to find its family."]],
  pirate: [["💰 Dig for gold", "They [dug|digged|dig] a deep hole and found the shining treasure."], ["🐒 Meet a monkey", "A cheeky monkey [stole|stealed|steal] the map and ran into the jungle!"]],
  baking: [["🍰 Share the cake", "Grandma [shared|share|sharing] her prize cake with the whole town."], ["📖 Write a cookbook", "Grandma [wrote|writed|write] a cookbook full of secret recipes."]]
};
const HERO = { robot: "Zip", kitten: "Mimi", picnic: "Sam", space: "Luna", baking: "Grandma", detective: "Kai", dino: "Rex", pirate: "Nia" };
const PICS = { robot: ["🤖", "🌳", "🔑", "🚪", "🐿️", "🛝"], kitten: ["🐱", "🌳", "🌿", "🦉", "🌕", "☁️"], picnic: ["🧺", "🍎", "🌧️", "☂️", "☀️", "🌈"], space: ["🚀", "🔴", "📷", "⭐", "🏠", "🌙"], baking: ["🏆", "🎂", "😬", "🍴", "🎉", "📖"], detective: ["🕵️", "🍪", "🐾", "🐶", "✨", "🔎"], dino: ["🥚", "🏠", "🌙", "🦕", "🥞", "🦖"], pirate: ["🏴‍☠️", "🌊", "🍾", "🗺️", "🏝️", "💰"] };
const COVERS = ["#e86f6f", "#4f86f7", "#58b368", "#e0953a", "#9a6cd6"];
function tip(opts) {
  const o = opts.map(x => x.toLowerCase());
  if (o.some(x => ["a", "an", "the"].includes(x))) return "Tip: use “an” before a vowel sound (an apple) and “a” before other sounds (a dog).";
  if (o.some(x => ["their", "there", "they're"].includes(x))) return "Tip: “their” means it belongs to them; “there” is a place; “they're” = they are.";
  if (o.some(x => /est$/.test(x)) || o.some(x => /er$/.test(x) && x.length > 4)) return "Tip: -er compares two things (thinner), -est is the most of all (thinnest).";
  if (o.some(x => /ing$/.test(x))) return "Tip: in a story about the past, use the past tense (walked, found) — not the -ing form alone.";
  if (o.some(x => ["is", "are", "am", "was", "were"].includes(x))) return "Tip: one person → is/was; many people → are/were; I → am.";
  return "Tip: read the sentence out loud — the right word usually sounds best.";
}
if (!player) $("sm-overlay").innerHTML = K.signedOutHtml("📖");
else init();

async function init() {
  const db = AIGLeaderboard.db;
  const tabs = document.querySelectorAll(".sm-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "new" ? menu() : books(); });

  function menu() {
    $("sm-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0 0 10px">Pick a story to write. Choose the right word each time — and choose how it ends!</div>${STORIES.map((st, i) => `<button class="sm-pick" data-i="${i}">${st.emoji} ${st.title}</button>`).join("")}</div>`;
    $("sm-main").querySelectorAll(".sm-pick").forEach(b => b.onclick = () => setup(STORIES[+b.dataset.i]));
  }
  function setup(st) {
    const def = HERO[st.id];
    $("sm-main").innerHTML = `<div class="kit-card"><div class="kit-q">${st.emoji} ${K.esc(st.title)}</div><p class="kit-sub" style="text-align:center">Name your hero (or keep “${K.esc(def)}”):</p><input id="sm-hero" class="sm-in" maxlength="12" placeholder="${K.esc(def)}"><div class="kit-sub" style="margin:8px 0 4px;font-weight:800">Cover colour</div><div class="sm-covers">${COVERS.map((c, i) => `<button type="button" data-c="${c}" style="background:${c}" class="${i ? "" : "on"}"></button>`).join("")}</div><button class="kit-btn block" id="sm-start" type="button" style="margin-top:10px">Start writing ✏️</button></div>`;
    let cover = COVERS[0];
    $("sm-main").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { cover = b.dataset.c; $("sm-main").querySelectorAll("[data-c]").forEach(x => x.classList.toggle("on", x === b)); });
    $("sm-start").onclick = () => { const v = $("sm-hero").value.trim().replace(/[^A-Za-z \-]/g, "").slice(0, 12); write(st, v || def, cover); };
  }
  async function books() {
    const snap = await db.ref(`players/${player.id}/books`).get();
    const all = snap.exists() ? Object.values(snap.val()) : [];
    const n = all.length, badges = [[n >= 1, "✍️ First book"], [n >= 3, "📚 3 books"], [n >= 5, "🏛️ Library (5)"], [all.some(b => b.score === 5), "⭐ Perfect story"]];
    $("sm-main").innerHTML = `<div class="kit-card"><b>🏅 Writer badges</b><div class="sm-badges">${badges.map(([ok, l]) => `<span class="${ok ? "on" : ""}">${l}</span>`).join("")}</div></div>` + (all.length ? all.sort((a, b) => b.at - a.at).map(b => `<div class="kit-card"><div class="sm-cover" style="${b.cover ? `background:${b.cover};color:#fff` : ""}"><div class="e">${b.emoji}</div><div class="t">${K.esc(b.title)}</div><div class="kit-sub" style="margin:4px 0 0">${b.score}/5 perfect · ${new Date(b.at).toLocaleDateString()}</div></div><div class="sm-story">${K.esc(b.text)}</div><button class="kit-btn alt" data-read="${K.esc(b.text)}" type="button" style="margin-top:6px;padding:6px 12px;font-size:.78rem">🔊 Bo, read it to me</button></div>`).join("")
      : '<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0">No books yet — write your first story!</div></div>');
    $("sm-main").querySelectorAll("[data-read]").forEach(b => b.onclick = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(b.dataset.read); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) {} });
  }

  function write(st, hero, cover) {
    let i = 0, score = 0, ending = null; const done = [];
    const lines = st.s.slice(0, 4).map(x => x.split(HERO[st.id]).join(hero));
    const parse = s => { const m = s.match(/\[(.+?)\]/); const opts = m[1].split("|"); return { before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), opts, ans: opts[0] }; };
    const ask = () => {
      if (i === 4 && !ending) {
        $("sm-main").innerHTML = `<div class="kit-card"><div class="sm-story">${done.map(K.esc).join(" ")}</div></div><div class="kit-card"><div class="kit-q">🔀 How should the story end?</div>${ENDINGS[st.id].map((e, k) => `<button class="sm-pick" data-e="${k}" type="button">${e[0]}</button>`).join("")}</div>`;
        $("sm-main").querySelectorAll("[data-e]").forEach(b => b.onclick = () => { ending = ENDINGS[st.id][+b.dataset.e][1].split(HERO[st.id]).join(hero); ask(); });
        return;
      }
      if (i === 5 && !done.free) return freeWrite();
      if (i >= 5) return finish();
      const p = parse(i < 4 ? lines[i] : ending);
      $("sm-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;font-weight:800">${st.emoji} ${st.title} — sentence ${i + 1}/5</div><div class="sm-pics">${PICS[st.id].slice(0, i + 1).join(" ")}</div><div class="sm-story">${done.map(K.esc).join(" ")} ${K.esc(p.before)}<span class="sm-blank">&nbsp;&nbsp;?&nbsp;&nbsp;</span>${K.esc(p.after)}</div></div>
        <div class="kit-card"><div class="kit-opts" style="grid-template-columns:1fr">${K.shuffle(p.opts).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="sm-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("sm-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === p.ans;
        K.record("story-maker", "grammar", ok);
        $("sm-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === p.ans) x.classList.add("right"); });
        if (ok) score++; else b.classList.add("wrong");
        $("sm-msg").textContent = ok ? "✏️ Perfect!" : `The right word is “${p.ans}”. ${tip(p.opts)}`;
        setTimeout(() => { done.push(p.before + p.ans + p.after); i++; ask(); }, ok ? 800 : 3200);
      });
    };
    function freeWrite() {
      $("sm-main").innerHTML = `<div class="kit-card"><div class="sm-story">${done.map(K.esc).join(" ")}</div></div><div class="kit-card"><div class="kit-q">✍️ Add your own last sentence!</div><input id="sm-free" class="sm-in" maxlength="120" placeholder="e.g. The end was happy for everyone."><div class="kit-sub" id="sm-fm" style="text-align:center;min-height:1.2em"></div><button class="kit-btn block" id="sm-fok" type="button">Add it</button><button class="kit-btn alt block" id="sm-fskip" type="button">Skip</button></div>`;
      $("sm-fskip").onclick = () => { done.free = true; finish(); };
      $("sm-fok").onclick = () => { const v = $("sm-free").value.trim(); const probs = [];
        if (v.split(/\s+/).length < 3) probs.push("make it at least 3 words");
        if (v && v[0] !== v[0].toUpperCase()) probs.push("start with a capital letter");
        if (v && !/[.!?]$/.test(v)) probs.push("end with . ! or ?");
        if (probs.length) { $("sm-fm").textContent = "Almost! Please " + probs.join(", ") + "."; return; }
        done.push(v); done.free = true; K.toastAdv("You wrote your own sentence!"); finish(); };
    }
    async function finish() {
      const text = done.join(" ");
      try { await db.ref(`players/${player.id}/books/${st.id}`).set({ emoji: st.emoji, title: st.title, text, score, cover, at: Date.now() }); } catch (e) {}
      $("sm-main").innerHTML = `<div class="kit-card"><div class="sm-cover" style="background:${cover};color:#fff"><div class="e">${st.emoji}</div><div class="t">${K.esc(st.title)}</div><div class="kit-sub" style="margin:4px 0 0">by ${K.esc(player.name)}</div></div><div class="sm-story">${K.esc(text)}</div></div>`;
      $("sm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">📚</div><h2>Your book is done!</h2><p class="kit-sub">${score}/5 sentences perfect. It's saved in My Books.</p><div class="kit-bonus" id="sm-bonus"></div><button class="kit-btn block" id="sm-read">Read my story</button></div></div>`;
      $("sm-read").onclick = () => { $("sm-overlay").innerHTML = ""; };
      K.finish("story-maker", 3 + score * 2, $("sm-bonus"));
    }
    ask();
  }
  menu();
}
