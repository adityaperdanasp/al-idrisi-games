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
    suspects: [["Kai", "🧑‍🔬"], ["Rae", "👧"], ["Coach Ali", "🧑‍🏫"]], culprit: 0, why: "Kai mixed up the white powders while tidying — an honest mistake." },
  { title: "The Muddy Footprints", emoji: "👣",
    text: ["After the rain, muddy footprints led from the back door to the fridge.", "The prints were small, with round toes, and they stopped right next to a puddle of spilled milk.", "Dad's big boots were clean by the door. Lily had been at her piano lesson all morning. The cat door was swinging."],
    q: [["Where did the footprints lead?", ["To the fridge", "To the garage", "To the bedroom"], 0], ["What was spilled?", ["Milk", "Juice", "Water"], 0], ["Where was Lily?", ["At her piano lesson", "In the garden", "In the kitchen"], 0]],
    suspects: [["Dad", "👨"], ["Lily", "👧"], ["Whiskers the cat", "🐱"]], culprit: 2, why: "Small round-toed prints, spilled milk and a swinging cat door point to Whiskers!" },
  { title: "The Vanishing Ball", emoji: "⚽",
    text: ["At break time, the class football disappeared from the playground.", "Coach Amir said he locked the shed at 10 am. Nina was helping the librarian stack books during break.", "A tall branch of the oak tree was shaking, and a black-and-white shape was stuck high in the leaves after a big kick by Theo."],
    q: [["When did the coach lock the shed?", ["At 10 am", "At noon", "After school"], 0], ["Where was Nina?", ["In the library", "On the field", "At home"], 0], ["What was stuck in the tree?", ["A black-and-white shape", "A red kite", "A bird's nest"], 0]],
    suspects: [["Coach Amir", "🧑‍🏫"], ["Nina", "👧"], ["Theo's big kick", "🦶"]], culprit: 2, why: "Theo's big kick sent the black-and-white ball into the oak tree!" },
  { title: "The Silent Alarm", emoji: "⏰",
    text: ["On Monday, Omar's alarm clock did not ring and he was late for school.", "His little sister Zara said she didn't touch it. Mum said she was in the shower when the alarm should have rung.", "The clock's screen was completely dark, and its plug was lying next to the socket where the vacuum cleaner had been plugged in on Sunday night."],
    q: [["What happened on Monday?", ["Omar was late", "Omar was early", "School was closed"], 0], ["What did the clock's screen look like?", ["Completely dark", "Flashing", "Bright red"], 0], ["What had been plugged in on Sunday night?", ["The vacuum cleaner", "A phone", "A lamp"], 0]],
    suspects: [["Zara", "👧"], ["Mum", "👩"], ["The vacuum cleaner swap", "🧹"]], culprit: 2, why: "The clock was unplugged so the vacuum could use the socket — no power, no alarm!" },
  { title: "The Melted Snowman", emoji: "⛄",
    text: ["The children built a snowman by the garden wall on Friday morning.", "By Saturday afternoon only a carrot and two buttons were left in a puddle.", "No one had touched it. The weather report said the temperature rose to 12 degrees on Saturday and the sun shone all day on that side of the wall."],
    q: [["When was the snowman built?", ["Friday morning", "Saturday night", "Sunday"], 0], ["What was left?", ["A carrot and two buttons", "A hat and scarf", "Nothing at all"], 0], ["How warm did it get on Saturday?", ["12 degrees", "0 degrees", "minus 5 degrees"], 0]],
    suspects: [["The neighbour's dog", "🐕"], ["The children", "🧒"], ["The warm sun", "☀️"]], culprit: 2, why: "The temperature rose to 12 degrees and the sun shone on the wall — it melted!" },
  // Audit round 2: three new cases.
  { title: "The Muddy Library Book", emoji: "📚",
    text: ["On Monday the library book was clean. On Tuesday morning it came back with muddy pages and a leaf stuck inside.", "Ava read it on her bed all Monday evening. Josh read it at the park on Tuesday, sitting under a tree after the rain.", "Mr. Kim, the librarian, never takes books outside."],
    q: [["When was the book still clean?", ["Monday", "Tuesday", "Wednesday"], 0], ["Where did Josh read the book?", ["On his bed", "At the park", "In the library"], 1], ["What was stuck inside the book?", ["A feather", "A leaf", "A ticket"], 1]],
    suspects: [["Ava", "👧"], ["Josh", "🧒"], ["Mr. Kim", "👨‍🏫"]], culprit: 1, why: "Rain, mud and a leaf from the tree: Josh read it at the park after the rain!" },
  { title: "The Vanishing Paint", emoji: "🎨",
    text: ["The art room's blue paint pot was full on Friday. By Monday it was almost empty.", "Leo painted a red fire truck on Friday. Maya painted the sea and the sky for her ocean project over the weekend at the art club.", "The janitor only cleans the floors and never opens the paint pots."],
    q: [["Which paint went missing?", ["Red", "Blue", "Yellow"], 1], ["What did Leo paint?", ["A fire truck", "The sea", "A flower"], 0], ["When did Maya paint her project?", ["On Friday", "At the weekend", "On Monday"], 1]],
    suspects: [["Leo", "🧒"], ["Maya", "👧"], ["The janitor", "🧹"]], culprit: 1, why: "The sea and the sky need lots of blue — Maya used it at the weekend art club." },
  { title: "The Noisy Night", emoji: "🌙",
    text: ["At midnight the whole house heard a loud CRASH in the kitchen.", "Everyone was in bed. In the morning, a pan was on the floor and there were small wet footprints next to the fish bowl.", "Goldie the goldfish was swimming happily. The kitten's water bowl was empty and its fur was damp."],
    q: [["What time was the crash?", ["At noon", "At midnight", "At sunrise"], 1], ["What was on the floor?", ["A pan", "A cup", "A book"], 0], ["What was next to the fish bowl?", ["Big boots", "Small wet footprints", "Sand"], 1]],
    suspects: [["Dad", "👨"], ["Goldie the goldfish", "🐟"], ["The kitten", "🐱"]], culprit: 2, why: "Small wet footprints and damp fur — the kitten tried to catch Goldie and knocked over the pan!" }
];

if (!player) {
  $("wd-overlay").innerHTML = K.signedOutHtml("🕵️");
} else {
  init();
}

// Audit batch 5: 4 new cases (12 total), a clue board that fills as you find evidence, a
// "tap the sentence that proves it" bonus, detective ranks, an optional 90-second case clock,
// read-aloud for the story, a text-size switch and a CASE CLOSED stamp.
const RANKS = [[0, "🔍 Rookie"], [3, "🕵️ Detective"], [6, "🎩 Sergeant"], [9, "🏅 Inspector"], [12, "👑 Chief Inspector"]];
let clock = false, big = false;
async function init() {
  let solved = {};
  try { const s = await AIGLeaderboard.db.ref(`players/${player.id}/detective`).get(); solved = s.exists() ? s.val() : {}; } catch (e) {}
  menu();

  function menu() {
    const n = Object.keys(solved).length; let rank = RANKS[0][1]; RANKS.forEach(r => { if (n >= r[0]) rank = r[1]; });
    $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0 0 6px">Rank: <b>${rank}</b> · ${n}/${CASES.length} solved</div>
      <div class="wd-opts"><label><input type="checkbox" id="wd-clock" ${clock ? "checked" : ""}> ⏱️ 90-second case clock</label><label><input type="checkbox" id="wd-big" ${big ? "checked" : ""}> 🔠 Big text</label></div>
      <div class="wd-cases">${CASES.map((c, i) => `<button class="wd-case ${solved[i] ? "done" : ""}" data-i="${i}"><span class="e">${c.emoji}</span>${c.title}<br><small>${solved[i] ? "✓ Solved" : "Open case"}</small></button>`).join("")}</div></div>`;
    $("wd-main").querySelectorAll(".wd-case").forEach(b => b.onclick = () => play(+b.dataset.i));
    $("wd-clock").onchange = e => { clock = e.target.checked; }; $("wd-big").onchange = e => { big = e.target.checked; document.body.classList.toggle("wd-bigtext", big); };
  }

  function play(i) {
    const c = CASES[i];
    let evidence = 0, qi = 0, proofs = 0; const clues = []; const end = Date.now() + 90000; let clk = null;
    if (clock) clk = setInterval(() => { const t = document.getElementById("wd-t"); const left = Math.max(0, end - Date.now()); if (t) t.textContent = `⏱️ ${Math.ceil(left / 1000)}s`; if (!left) { clearInterval(clk); verdict(-1); } }, 500);
    const story = `<div class="wd-story" id="wd-story">${c.text.map((p, k) => `<p data-p="${k}">${K.esc(p)}</p>`).join("")}</div><button class="kit-btn alt" type="button" id="wd-read" style="padding:5px 10px;font-size:.75rem">🔊 Read the case to me</button>`;
    const board = () => clues.length ? `<div class="wd-board">${clues.map(x => `<span>📌 ${K.esc(x)}</span>`).join("")}</div>` : "";
    function askNext() {
      if (qi >= c.q.length) return accuse();
      const [text, opts, ans] = c.q[qi];
      $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-q" style="text-align:left;font-size:1rem">${c.emoji} ${c.title} <small id="wd-t"></small></div>${story}${board()}</div>
        <div class="kit-card"><div class="kit-sub" style="margin:0 0 4px">Evidence ${qi + 1}/${c.q.length}</div><div class="kit-q">${K.esc(text)}</div><div class="kit-opts" style="grid-template-columns:1fr">${opts.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="wd-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("wd-read").onclick = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(c.text.join(" ")); u.lang = "en-US"; u.rate = 0.92; speechSynthesis.speak(u); } catch (e) {} };
      $("wd-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = +b.dataset.k === ans;
        K.record("word-detective", "reading", ok);
        $("wd-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (+x.dataset.k === ans) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong"); else { evidence++; clues.push(opts[ans]); }
        const key = opts[ans].split(" ").filter(w => w.length > 3)[0] || opts[ans], pk = c.text.findIndex(p => p.toLowerCase().includes(key.toLowerCase()));
        if (ok && pk >= 0) {
          $("wd-msg").textContent = "🔎 Good catch! Bonus: tap the sentence in the story that proves it.";
          document.querySelectorAll("#wd-story p").forEach(pp => { pp.classList.add("tap"); pp.onclick = () => { const good = +pp.dataset.p === pk; pp.classList.add(good ? "proof" : "nope"); if (good) proofs++; document.querySelectorAll("#wd-story p").forEach(x => x.onclick = null); setTimeout(() => { qi++; askNext(); }, 900); }; });
          return;
        }
        $("wd-msg").textContent = ok ? "🔎 Good catch!" : "Look again — it's in the story!";
        setTimeout(() => { qi++; askNext(); }, 1000);
      });
    }
    function accuse() {
      $("wd-main").innerHTML = `<div class="kit-card"><div class="kit-q">Who did it? <small id="wd-t"></small></div><div class="kit-sub" style="text-align:center">You found ${evidence}/${c.q.length} pieces of evidence${proofs ? ` and ${proofs} proof${proofs > 1 ? "s" : ""}` : ""}.</div>${board()}
        <div class="wd-sus">${c.suspects.map((s, k) => `<button data-k="${k}"><span class="e">${s[1]}</span>${K.esc(s[0])}</button>`).join("")}</div></div>`;
      $("wd-main").querySelectorAll(".wd-sus button").forEach(b => b.onclick = () => verdict(+b.dataset.k));
    }
    async function verdict(k) {
      clearInterval(clk);
      const won = k === c.culprit;
      K.record("word-detective", "deduction", won);
      if (won && !solved[i]) { solved[i] = true; try { await AIGLeaderboard.db.ref(`players/${player.id}/detective/${i}`).set(true); } catch (e) {} }
      $("wd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🎉" : k === -1 ? "⏰" : "🤔"}</div>${won ? '<div class="wd-stamp">CASE CLOSED</div>' : ""}<h2>${won ? "Case solved!" : k === -1 ? "Time's up!" : "Not quite…"}</h2>
        <p class="kit-sub">${won ? K.esc(c.why) : `Read the clues again. Hint: ${K.esc(c.why.split(" ").slice(0, 4).join(" "))}…`}</p><div class="kit-bonus" id="wd-bonus"></div>
        <button class="kit-btn block" id="wd-next">${won ? "More cases" : "Try again"}</button></div></div>`;
      $("wd-next").onclick = () => { $("wd-overlay").innerHTML = ""; if (won) menu(); else play(i); };
      if (won) K.finish("word-detective", 6 + evidence * 3 + proofs, $("wd-bonus"));
    }
    askNext();
  }
}
