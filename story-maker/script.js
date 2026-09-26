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
  { id: "brush", emoji: "🎨", title: "The Magic Paintbrush", s: ["Ella [found|find|founded] an old paintbrush in the attic.", "When she painted a bird, it [flew|flown|flied] right off the page!", "She painted [some|a|an] flowers, and they smelled wonderful.", "Ella [shared|share|sharing] her magic with the whole class.", "Now everyone paints [together|togethers|to gether] on Fridays."] }
];

if (!player) $("sm-overlay").innerHTML = K.signedOutHtml("📖");
else init();

async function init() {
  const db = AIGLeaderboard.db;
  const tabs = document.querySelectorAll(".sm-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "new" ? menu() : books(); });

  function menu() {
    $("sm-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0 0 10px">Pick a story to write. Choose the right word each time!</div>${STORIES.map((st, i) => `<button class="sm-pick" data-i="${i}">${st.emoji} ${st.title}</button>`).join("")}</div>`;
    $("sm-main").querySelectorAll(".sm-pick").forEach(b => b.onclick = () => write(STORIES[+b.dataset.i]));
  }
  async function books() {
    const snap = await db.ref(`players/${player.id}/books`).get();
    const all = snap.exists() ? Object.values(snap.val()) : [];
    $("sm-main").innerHTML = all.length ? all.sort((a, b) => b.at - a.at).map(b => `<div class="kit-card"><div class="sm-cover"><div class="e">${b.emoji}</div><div class="t">${K.esc(b.title)}</div><div class="kit-sub" style="margin:4px 0 0">${b.score}/5 perfect · ${new Date(b.at).toLocaleDateString()}</div></div><div class="sm-story">${K.esc(b.text)}</div></div>`).join("")
      : '<div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0">No books yet — write your first story!</div></div>';
  }

  function write(st) {
    let i = 0, score = 0; const done = [];
    const parse = s => { const m = s.match(/\[(.+?)\]/); const opts = m[1].split("|"); return { before: s.slice(0, m.index), after: s.slice(m.index + m[0].length), opts, ans: opts[0] }; };
    const ask = () => {
      if (i >= st.s.length) return finish();
      const p = parse(st.s[i]);
      $("sm-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;font-weight:800">${st.emoji} ${st.title} — sentence ${i + 1}/5</div><div class="sm-story">${done.map(K.esc).join(" ")} ${K.esc(p.before)}<span class="sm-blank">&nbsp;&nbsp;?&nbsp;&nbsp;</span>${K.esc(p.after)}</div></div>
        <div class="kit-card"><div class="kit-opts" style="grid-template-columns:1fr">${K.shuffle(p.opts).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="sm-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("sm-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === p.ans;
        K.record("story-maker", "grammar", ok);
        $("sm-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === p.ans) x.classList.add("right"); });
        if (ok) score++; else b.classList.add("wrong");
        $("sm-msg").textContent = ok ? "✏️ Perfect!" : `The right word is “${p.ans}”.`;
        setTimeout(() => { done.push(p.before + p.ans + p.after); i++; ask(); }, ok ? 800 : 1700);
      });
    };
    async function finish() {
      const text = done.join(" ");
      try { await db.ref(`players/${player.id}/books/${st.id}`).set({ emoji: st.emoji, title: st.title, text, score, at: Date.now() }); } catch (e) {}
      $("sm-main").innerHTML = `<div class="kit-card"><div class="sm-cover"><div class="e">${st.emoji}</div><div class="t">${K.esc(st.title)}</div><div class="kit-sub" style="margin:4px 0 0">by ${K.esc(player.name)}</div></div><div class="sm-story">${K.esc(text)}</div></div>`;
      $("sm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">📚</div><h2>Your book is done!</h2><p class="kit-sub">${score}/5 sentences perfect. It's saved in My Books.</p><div class="kit-bonus" id="sm-bonus"></div><button class="kit-btn block" id="sm-read">Read my story</button></div></div>`;
      $("sm-read").onclick = () => { $("sm-overlay").innerHTML = ""; };
      K.finish("story-maker", 3 + score * 2, $("sm-bonus"));
    }
    ask();
  }
  menu();
}
