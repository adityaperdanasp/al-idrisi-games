/* =================================================================
   Word Detective (PM round 11, item 4) -- 8 short mysteries that train
   reading comprehension. Read the case, answer 3 evidence questions from
   the text, then accuse a suspect. Solved cases get a ✓ (stored under
   players/{id}/detective) and each case pays a small bonus the first two
   times a day.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const CASES = [
  { title: "The Missing Cookies", emoji: "🍪",
    text: ["Mia baked a plate of cookies for the school fair and left it on the kitchen table at 3 pm.", "When she came back at 4 pm the plate was empty. There were only crumbs, and small four-toed prints in the spilled flour on the floor.", "Ben had been at soccer practice until 5 pm. Grandma was fast asleep in her chair with her glasses off."],
    q: [["What time did Mia leave the cookies?", ["2 pm", "3 pm", "5 pm"], 1], ["Where was Ben at 4 pm?", ["At soccer practice", "In the kitchen", "Asleep"], 0], ["What was found in the flour?", ["Shoe prints", "Paw prints", "Wet towels"], 1]],
    suspects: [["Ben", "🧒"], ["Grandma", "👵"], ["Pip the puppy", "🐶"]], culprit: 2, why: "Small four-toed prints in the flour point to Pip the puppy!" },
  { title: "The Broken Vase", emoji: "🏺",
    text: ["On Saturday afternoon the blue vase in the living room lay in pieces on the floor.", "Sofia had been reading in her room all afternoon with a 'Do Not Disturb' sign on her door. Uncle Raj was at work until dinner.", "But the living-room window was wide open, the curtains were flapping, and there were wet leaves on the floor. A strong storm wind had started at 2 pm."],
    q: [["Where was Sofia?", ["In the garden", "In her room", "At work"], 1], ["What was on the floor besides the pieces?", ["Wet leaves", "Muddy shoes", "Sand"], 0], ["When did the wind start?", ["At 2 pm", "At dinner", "At noon"], 0]],
    suspects: [["Sofia", "👧"], ["Uncle Raj", "👨"], ["The wind", "🌬️"]], culprit: 2, why: "The open window, flapping curtains and wet leaves show the storm wind knocked it over." },
  { title: "The Muddy Footprints", emoji: "👣",
    text: ["Dad mopped the kitchen floor at noon. At 1 pm there were big muddy prints from the back door to the fridge.", "The prints had a zig-zag pattern, like hiking boots. Little Sara only wears sandals. Grandpa uses a cane and never goes into the muddy yard.", "Uncle Tom had just come back from a long hike and was very hungry."],
    q: [["What time did Dad mop?", ["Noon", "1 pm", "Morning"], 0], ["What did the prints look like?", ["Tiny toes", "A zig-zag pattern", "Round dots"], 1], ["What shoes does Sara wear?", ["Sandals", "Hiking boots", "Slippers"], 0]],
    suspects: [["Sara", "👧"], ["Uncle Tom", "🧔"], ["Grandpa", "👴"]], culprit: 1, why: "Zig-zag hiking-boot prints + a hungry hiker = Uncle Tom." },
  { title: "The Wrong Backpack", emoji: "🎒",
    text: ["On Monday, Leo could not find his homework. He knew he had finished it on Sunday night.", "The backpack in his room had a red star sticker, but Leo's own bag has a green frog sticker. Both Leo's and his sister Lily's bags are blue, and Lily left in a rush that morning.", "Ms. Cruz, his teacher, was already at school, and his classmate Max sits on the other side of the room."],
    q: [["What sticker was on the bag in Leo's room?", ["A red star", "A green frog", "A yellow sun"], 0], ["What colour are both bags?", ["Red", "Blue", "Green"], 1], ["Who left in a rush?", ["Max", "Ms. Cruz", "Lily"], 2]],
    suspects: [["Lily", "👧"], ["Ms. Cruz", "👩‍🏫"], ["Max", "🧒"]], culprit: 0, why: "Lily grabbed Leo's blue bag by mistake and left her red-star one behind." },
  { title: "The Vanished Coin", emoji: "🪙",
    text: ["The museum's gold coin was gone from its glass case at 10:15. The guard, Mr. Kim, was on his tea break from 10:00 to 10:30.", "The cleaner, Rosa, was on camera mopping upstairs at 10:15. A boy named Omar was seen near the case, but the case was already open when he got there.", "The curator, Ms. Vega, admitted she had taken the coin out at 10:10 to polish it, and that she had not emptied her pockets since."],
    q: [["When did the coin disappear?", ["10:15", "10:30", "9:00"], 0], ["Where was Rosa at 10:15?", ["Downstairs", "Upstairs", "At the door"], 1], ["What was Mr. Kim doing?", ["Guarding the case", "Sleeping", "Having a tea break"], 2]],
    suspects: [["Rosa", "🧹"], ["Omar", "🧒"], ["Ms. Vega", "👩‍🔬"]], culprit: 2, why: "Ms. Vega polished the coin and forgot it in her pocket — an honest mix-up!" },
  { title: "The Pencil Case Note", emoji: "✏️",
    text: ["Ana's pencil case disappeared from her desk during recess. Later it turned up in the lost-and-found with a note: 'Borrowed in a hurry, sorry!' written in purple glitter ink.", "Bella spent all of recess in the library. Chris was on the playground with muddy shoes.", "Only one student in the class owns a purple glitter pen: Dana."],
    q: [["Where did the pencil case turn up?", ["In the lost-and-found", "In the library", "On the playground"], 0], ["What colour was the note's ink?", ["Blue", "Black", "Purple glitter"], 2], ["Where was Bella at recess?", ["The library", "The playground", "The canteen"], 0]],
    suspects: [["Bella", "👧"], ["Chris", "🧒"], ["Dana", "🧑"]], culprit: 2, why: "Purple glitter ink — and Dana is the only one with that pen." },
  { title: "The Tomato Thief", emoji: "🍅",
    text: ["Every morning a few ripe tomatoes vanish from Farmer Joe's garden. Near the empty vines there are tiny bite marks and a trail of seeds leading to a small hole under the fence.", "Farmer Joe goes to the market every morning at 6. His neighbour Mrs. Lee is allergic to tomatoes and never touches them.", "A bushy tail was seen whisking through the fence at dawn."],
    q: [["What was left near the vines?", ["Bite marks", "Boot prints", "Paint"], 0], ["Why can't Mrs. Lee be the thief?", ["She's away", "She's allergic to tomatoes", "She's very tall"], 1], ["What was seen at dawn?", ["A bushy tail", "A red hat", "A ladder"], 0]],
    suspects: [["Farmer Joe", "👨‍🌾"], ["Mrs. Lee", "👵"], ["A squirrel", "🐿️"]], culprit: 2, why: "Tiny bites, a seed trail, a hole in the fence and a bushy tail: a squirrel!" },
  { title: "The Sleepy Volcano", emoji: "🌋",
    text: ["At the science fair, Nia's paper volcano would not erupt. Someone had put flour in the jar instead of baking soda.", "Before class, only Kai had cleaned the project table. He said 'all the white powders looked the same' and lined the jars up neatly.", "Nia's sister Rae was in the gym all morning, and Coach Ali was setting up the trophies."],
    q: [["What went into the jar by mistake?", ["Sugar", "Flour", "Salt"], 1], ["Who cleaned the table?", ["Kai", "Rae", "Coach Ali"], 0], ["What did the volcano do?", ["It exploded", "It did not erupt", "It melted"], 1]],
    suspects: [["Kai", "🧑‍🔬"], ["Rae", "👧"], ["Coach Ali", "🧑‍🏫"]], culprit: 0, why: "Kai mixed up the white powders while tidying — an honest mistake." }
];

if (!player) {
  $("wd-overlay").innerHTML = K.signedOutHtml("🕵️");
} else {
  init();
}

async function init() {
  let solved = {};
  try { const s = await AIGLeaderboard.db.ref(`players/${player.id}/detective`).get(); solved = s.exists() ? s.val() : {}; } catch (e) {}
  menu();

  function menu() {
    $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0 0 10px">Read the case, gather evidence, then name the culprit. ${Object.keys(solved).length}/${CASES.length} solved.</div>
      <div class="wd-cases">${CASES.map((c, i) => `<button class="wd-case ${solved[i] ? "done" : ""}" data-i="${i}"><span class="e">${c.emoji}</span>${c.title}<br><small>${solved[i] ? "✓ Solved" : "Open case"}</small></button>`).join("")}</div></div>`;
    $("wd-main").querySelectorAll(".wd-case").forEach(b => b.onclick = () => play(+b.dataset.i));
  }

  function play(i) {
    const c = CASES[i];
    let evidence = 0, qi = 0;
    const story = `<div class="wd-story">${c.text.map(p => `<p>${K.esc(p)}</p>`).join("")}</div>`;
    function askNext() {
      if (qi >= c.q.length) return accuse();
      const [text, opts, ans] = c.q[qi];
      $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-q" style="text-align:left;font-size:1rem">${c.emoji} ${c.title}</div>${story}</div>
        <div class="kit-card"><div class="kit-sub" style="margin:0 0 4px">Evidence ${qi + 1}/${c.q.length}</div><div class="kit-q">${K.esc(text)}</div><div class="kit-opts" style="grid-template-columns:1fr">${opts.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="wd-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("wd-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = +b.dataset.k === ans;
        K.record("word-detective", "reading", ok);
        $("wd-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (+x.dataset.k === ans) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong"); else evidence++;
        $("wd-msg").textContent = ok ? "🔎 Good catch!" : "Look again — it's in the story!";
        setTimeout(() => { qi++; askNext(); }, 1000);
      });
    }
    function accuse() {
      $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-q">Who did it?</div><div class="kit-sub" style="text-align:center">You found ${evidence}/${c.q.length} pieces of evidence.</div>
        <div class="wd-sus">${c.suspects.map((s, k) => `<button data-k="${k}"><span class="e">${s[1]}</span>${K.esc(s[0])}</button>`).join("")}</div></div>`;
      $("wd-main").querySelectorAll(".wd-sus button").forEach(b => b.onclick = () => verdict(+b.dataset.k));
    }
    async function verdict(k) {
      const won = k === c.culprit;
      K.record("word-detective", "deduction", won);
      if (won && !solved[i]) { solved[i] = true; try { await AIGLeaderboard.db.ref(`players/${player.id}/detective/${i}`).set(true); } catch (e) {} }
      $("wd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🎉" : "🤔"}</div><h2>${won ? "Case solved!" : "Not quite…"}</h2>
        <p class="kit-sub">${won ? K.esc(c.why) : `Read the clues again. Hint: ${K.esc(c.why.split(" ").slice(0, 4).join(" "))}…`}</p><div class="kit-bonus" id="wd-bonus"></div>
        <button class="kit-btn block" id="wd-next">${won ? "More cases" : "Try again"}</button></div></div>`;
      $("wd-next").onclick = () => { $("wd-overlay").innerHTML = ""; if (won) menu(); else play(i); };
      if (won) K.finish("word-detective", 6 + evidence * 3, $("wd-bonus"));
    }
    askNext();
  }
}
