/* =================================================================
   Bo's Classroom (PM round 13, item 10) -- short animated lessons that
   introduce a topic BEFORE you practise it: 3 slides on Bo's chalkboard
   (emoji that pop in one by one), then 3 practice questions. Finish a
   lesson for a ✅ stamp and a one-time 10 coins. Lessons live in LESSONS
   below (id, emoji, title, slides, quiz).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const rep = (e, n) => Array.from({ length: n }, () => e);

const LESSONS = [
  { id: "multiplication", emoji: "✖️", title: "Multiplication = groups", slides: [
    { vis: [...rep("🍎", 4)], text: "Here is 1 group of 4 apples." },
    { vis: [...rep("🍎", 4), "|", ...rep("🍎", 4), "|", ...rep("🍎", 4)], text: "Now there are 3 groups of 4 apples." },
    { vis: ["3", "×", "4", "=", "12"], text: "Adding 4 + 4 + 4 is the same as 3 × 4 = 12. Multiplication is a fast way to add equal groups!" }],
    quiz: [["What is 2 × 5?", ["7", "10", "12"], 1], ["4 groups of 3 stars is…", ["12", "7", "9"], 0], ["Which is the same as 6 + 6 + 6?", ["3 × 6", "6 × 6", "3 + 6"], 0]] },
  { id: "fractions", emoji: "🍕", title: "What is a fraction?", slides: [
    { vis: ["🍕"], text: "One whole pizza." },
    { vis: ["🍕", "|", "1", "/", "4"], text: "Cut it into 4 EQUAL slices. Each slice is 1/4 (one quarter)." },
    { vis: ["🍕", "🍕", "🍕", "⬜", "|", "3", "/", "4"], text: "Eat 3 slices and you have eaten 3/4. The bottom number is how many equal parts; the top is how many you have." }],
    quiz: [["A pizza is cut into 8 equal slices. You eat 2. What fraction did you eat?", ["2/8", "8/2", "2/6"], 0], ["Which is bigger: 1/2 or 1/4?", ["1/4", "1/2", "They're the same"], 1], ["In 3/5, what does the 5 tell you?", ["How many parts in the whole", "How many you have", "Nothing"], 0]] },
  { id: "place-value", emoji: "🔢", title: "Place value", slides: [
    { vis: ["3", "4", "2"], text: "In 342, every digit has a job depending on its place." },
    { vis: ["3", "|", "4", "|", "2", "|", "💯", "🔟", "1️⃣"], text: "3 is in the hundreds place (300), 4 in the tens place (40) and 2 in the ones place (2)." },
    { vis: ["300", "+", "40", "+", "2", "=", "342"], text: "342 = 300 + 40 + 2. Moving a digit left makes it 10 times bigger!" }],
    quiz: [["In 582, what is the value of the 8?", ["8", "80", "800"], 1], ["What is 700 + 30 + 4?", ["734", "743", "7,304"], 0], ["Which digit is in the hundreds place of 913?", ["9", "1", "3"], 0]] },
  { id: "rounding", emoji: "🎯", title: "Rounding numbers", slides: [
    { vis: ["0", "…", "5", "…", "10"], text: "Picture a number line. Rounding to the nearest 10 means: which multiple of 10 is closer?" },
    { vis: ["🧍", "3", "→", "0", "|", "🧍", "8", "→", "10"], text: "3 is closer to 0, so it rounds down. 8 is closer to 10, so it rounds up." },
    { vis: ["5", "→", "⬆️", "10"], text: "The magic rule: 5 or more rounds UP, 4 or less rounds DOWN. So 47 rounds to 50, and 42 rounds to 40." }],
    quiz: [["Round 63 to the nearest 10.", ["60", "70", "63"], 0], ["Round 75 to the nearest 10.", ["70", "80", "75"], 1], ["Round 349 to the nearest 100.", ["300", "400", "350"], 0]] },
  { id: "perimeter", emoji: "📐", title: "Perimeter", slides: [
    { vis: ["🟦"], text: "Perimeter is the distance AROUND the edge of a shape." },
    { vis: ["4", "|", "2", "|", "4", "|", "2"], text: "A rectangle 4 long and 2 wide has sides 4, 2, 4 and 2." },
    { vis: ["4", "+", "2", "+", "4", "+", "2", "=", "12"], text: "Add all the sides: the perimeter is 12. Like walking all the way around the garden fence!" }],
    quiz: [["A square has sides of 5. What is its perimeter?", ["10", "20", "25"], 1], ["A rectangle is 6 long and 3 wide. Perimeter?", ["18", "9", "12"], 0], ["Perimeter means…", ["The distance around a shape", "The space inside a shape", "The tallest side"], 0]] },
  { id: "adjectives", emoji: "🎨", title: "Adjectives", slides: [
    { vis: ["🐶"], text: "A dog." },
    { vis: ["🐶", "|", "big", "fluffy", "brown"], text: "Words that describe a noun are adjectives: a BIG, FLUFFY, BROWN dog." },
    { vis: ["The", "🌞", "sunny", "day"], text: "Adjectives answer questions like: What kind? How many? Which one? “A sunny day.”" }],
    quiz: [["Which word is an adjective? “The tall tree”", ["tall", "tree", "The"], 0], ["Which is an adjective?", ["quickly", "happy", "run"], 1], ["“She has three red balloons.” Which is NOT an adjective?", ["red", "three", "has"], 2]] },
  { id: "photosynthesis", emoji: "🌱", title: "How plants make food", slides: [
    { vis: ["☀️", "→", "🌿"], text: "Plants catch sunlight with their green leaves." },
    { vis: ["💧", "+", "🌬️", "+", "☀️", "→", "🍬"], text: "They mix water from the roots and air (carbon dioxide) using sunlight to make sugar — their food!" },
    { vis: ["🌿", "→", "🫧", "O₂"], text: "This is called photosynthesis, and the plant also gives out oxygen, which we breathe. Thank you, plants!" }],
    quiz: [["What do plants need to make food?", ["Sunlight, water and air", "Only soil", "Only sugar"], 0], ["What gas do plants give out?", ["Oxygen", "Smoke", "Helium"], 0], ["Where does a plant catch sunlight?", ["Leaves", "Roots", "Seeds"], 0]] },
  { id: "water-cycle", emoji: "🌧️", title: "The water cycle", slides: [
    { vis: ["☀️", "🌊", "→", "♨️"], text: "The sun heats the sea and water turns into invisible vapour. This is evaporation." },
    { vis: ["♨️", "→", "☁️"], text: "High up it is cold, so the vapour turns back into tiny drops that make clouds. This is condensation." },
    { vis: ["☁️", "→", "🌧️", "→", "⛰️", "→", "🌊"], text: "When clouds get heavy, rain falls (precipitation) and rivers carry it back to the sea. Then it starts again!" }],
    quiz: [["Evaporation is when water…", ["Turns into vapour", "Turns into ice", "Falls as rain"], 0], ["Clouds are made when vapour…", ["Cools and condenses", "Freezes into rocks", "Gets hotter"], 0], ["Rain falling from clouds is called…", ["Precipitation", "Evaporation", "Erosion"], 0]] },
  // Audit batch 4: four more lessons
  { id: "division", emoji: "➗", title: "Division = sharing", slides: [
    { vis: [...rep("🍪", 12)], text: "We have 12 cookies to share." },
    { vis: [...rep("🍪", 4), "|", ...rep("🍪", 4), "|", ...rep("🍪", 4)], text: "Share them between 3 friends: each friend gets 4." },
    { vis: ["12", "÷", "3", "=", "4"], text: "12 ÷ 3 = 4. Division shares into equal groups — it's multiplication backwards (3 × 4 = 12)." }],
    quiz: [["What is 10 ÷ 2?", ["5", "8", "12"], 0], ["15 sweets shared by 3 kids — each gets…", ["5", "3", "12"], 0], ["Which fact helps with 20 ÷ 4?", ["4 × 5 = 20", "4 + 5 = 9", "20 − 4 = 16"], 0]] },
  { id: "nouns-verbs", emoji: "📝", title: "Nouns and verbs", slides: [
    { vis: ["🐶", "🏠", "🍎"], text: "A noun is a person, place or thing: dog, house, apple." },
    { vis: ["🏃", "🍽️", "😴"], text: "A verb is an action word: run, eat, sleep." },
    { vis: ["The", "dog", "runs", "."], text: "In “The dog runs.”, dog is the noun and runs is the verb!" }],
    quiz: [["Which word is a noun?", ["Table", "Jump", "Quickly"], 0], ["Which word is a verb?", ["Swim", "Chair", "Blue"], 0], ["In “Cats sleep.”, the verb is…", ["sleep", "Cats", "."], 0]] },
  { id: "solar-system", emoji: "🪐", title: "Our solar system", slides: [
    { vis: ["☀️"], text: "The Sun is a star at the centre of our solar system." },
    { vis: ["☀️", "·", "🪨", "🌍", "🔴", "🪐"], text: "Eight planets travel around (orbit) the Sun. Earth is the third one." },
    { vis: ["🌍", "↻", "🌙"], text: "The Moon orbits the Earth. One orbit takes about a month." }],
    quiz: [["What is at the centre of the solar system?", ["The Sun", "The Earth", "The Moon"], 0], ["How many planets orbit the Sun?", ["8", "3", "12"], 0], ["What orbits the Earth?", ["The Moon", "Mars", "The Sun"], 0]] },
  { id: "time", emoji: "⏰", title: "Telling time", slides: [
    { vis: ["🕐", "🕑", "🕒"], text: "The short hand shows the hour." },
    { vis: ["🕧"], text: "The long hand shows minutes. When it points down at 6, it's half past." },
    { vis: ["60", "minutes", "=", "1", "hour"], text: "There are 60 minutes in an hour and 24 hours in a day." }],
    quiz: [["How many minutes are in an hour?", ["60", "100", "24"], 0], ["Which hand shows the hour?", ["The short hand", "The long hand", "Both"], 0], ["How many hours are in a day?", ["24", "12", "60"], 0]] }
];
// Audit batch 4: checkpoint question mid-lesson, tap-to-count on busy slides, Bo reads each slide,
// a "show me again" branch after a wrong answer, skip-to-quiz, lesson of the day + streak,
// a link to a game that uses the topic, a summary card, and a graduation certificate.
const GAME_FOR = { multiplication: ["../multipleazka/", "Math Race"], division: ["../multipleazka/", "Math Race"], fractions: ["../fractions-kitchen/", "Fractions Kitchen"], "place-value": ["../mathville/", "MathVille"], rounding: ["../mathville/", "MathVille"], perimeter: ["../mathville/", "MathVille"], adjectives: ["../story-maker/", "Story Maker"], "nouns-verbs": ["../story-maker/", "Story Maker"], photosynthesis: ["../science-lab/", "Science Lab"], "water-cycle": ["../science-lab/", "Science Lab"], "solar-system": ["../azkauniverse/", "SolarQuest"], time: ["../mathville/", "MathVille"] };
const lsc = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lscw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const cday = o => new Date(Date.now() - (o || 0) * 86400000).toISOString().slice(0, 10);
const say = t => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {} };

if (!player) $("bc-overlay").innerHTML = K.signedOutHtml("🎓");
else init();

async function init() {
  const done = await Promise.race([AIGLeaderboard.getLessons().catch(() => ({})), new Promise(r => setTimeout(() => r({}), 2500))]); // offline: start without stamps
  const menu = () => {
    const tod = LESSONS[Math.floor(Date.now() / 86400000) % LESSONS.length], streak = lsc("bc_day", "") === cday() || lsc("bc_day", "") === cday(1) ? Number(lsc("bc_streak", "0")) : 0;
    const all = LESSONS.every(l => done[l.id]);
    $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-q">Pick a lesson</div><p class="kit-sub" style="text-align:center">${Object.keys(done).length}/${LESSONS.length} lessons finished · 🔥 ${streak}-day lesson streak</p>
      <button class="bc-tod" data-i="${LESSONS.indexOf(tod)}" type="button">⭐ Lesson of the day: ${tod.emoji} ${K.esc(tod.title)} <small>(+streak)</small></button>
      ${all ? `<div class="bc-cert">🎓 <b>Graduate of Bo's Classroom!</b><br>${K.esc((player && player.name) || "You")} finished all ${LESSONS.length} lessons.</div>` : ""}
      ${Object.keys(done).length ? `<button class="kit-btn block" id="bc-recap" type="button">⚡ 1-minute recap quiz${Number(lsc("bc_recap_best", "0")) ? ` (best ${lsc("bc_recap_best", "0")})` : ""}</button>` : ""}
      <div class="bc-lessons">${LESSONS.map((l, i) => `<button class="bc-l ${done[l.id] ? "done" : ""}" data-i="${i}"><span class="e">${l.emoji}</span>${l.title}<br><small>${done[l.id] ? `${"⭐".repeat(done[l.id].score || 0)}${"☆".repeat(3 - (done[l.id].score || 0))}` : "3 slides"}</small></button>`).join("")}</div></div>`;
    const rb = $("bc-recap"); if (rb) rb.onclick = recap;
    $("bc-main").querySelectorAll(".bc-tod").forEach(b => b.onclick = () => teach(LESSONS[+b.dataset.i]));
    $("bc-main").querySelectorAll(".bc-l").forEach(b => b.onclick = () => teach(LESSONS[+b.dataset.i]));
  };
  function visHtml(list) { return list.map((v, i) => v === "|" ? `<span class="sep" style="animation-delay:${i * .22}s">|</span>` : `<span style="animation-delay:${i * .22}s">${K.esc(v)}</span>`).join(" "); }
  function teach(l) {
    let i = 0, checked = false;
    const draw = () => {
      const s = l.slides[i];
      if (i === 2 && !checked) { checked = true; return checkpoint(l, () => draw()); }
      $("bc-main").innerHTML = `<div class="kit-card"><div class="bc-board"><div class="bc-vis">${visHtml(s.vis)}</div><div class="txt">${K.esc(s.text)}</div></div><div class="bc-dots">${l.slides.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
        <div style="display:flex;gap:8px">${i ? '<button class="kit-btn alt" id="bc-prev" style="flex:1">← Back</button>' : ""}<button class="kit-btn" id="bc-next" style="flex:2">${i === l.slides.length - 1 ? "Try the questions ✏️" : "Next →"}</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="kit-btn alt" id="bc-replay" style="padding:6px 12px;font-size:.75rem">🔁 Replay</button><button class="kit-btn alt" id="bc-say" style="padding:6px 12px;font-size:.75rem">🔊 Bo, read it</button><button class="kit-btn alt" id="bc-skip" style="padding:6px 12px;font-size:.75rem">I know this — quiz me</button></div>
        ${s.vis.filter(v => v !== "|").length >= 5 && s.vis.every(v => !/^\d+$/.test(v)) ? `<div class="bc-count"><span id="bc-cnt">Tap the pictures to count them: 0</span></div>` : ""}</div>`;
      $("bc-say").onclick = () => say(s.text); $("bc-skip").onclick = () => quiz(l);
      let cnt = 0; $("bc-main").querySelectorAll(".bc-vis span:not(.sep)").forEach(sp => sp.onclick = () => { if (sp.dataset.c || !$("bc-cnt")) return; sp.dataset.c = 1; sp.style.opacity = ".4"; cnt++; $("bc-cnt").textContent = `Tap the pictures to count them: ${cnt}`; if (cnt === s.vis.filter(v => v !== "|").length) $("bc-cnt").textContent = `✅ ${cnt}! Great counting!`; });
      $("bc-next").onclick = () => { if (i >= l.slides.length - 1) quiz(l); else { i++; draw(); } };
      const p = $("bc-prev"); if (p) p.onclick = () => { i--; draw(); };
      $("bc-replay").onclick = draw;
    };
    draw();
  }
  // Audit round 2: a 60-second recap mixing questions from every lesson you've finished.
  function recap() {
    const pool = LESSONS.filter(l => done[l.id]).flatMap(l => l.quiz.map(q => [l, q]));
    let right = 0, n = 0; const end = Date.now() + 60000;
    const tick = setInterval(() => { const b = $("bc-rt"); if (b) b.style.width = Math.max(0, (end - Date.now()) / 600) + "%"; if (Date.now() >= end) { clearInterval(tick); fin(); } }, 200);
    const fin = () => { clearInterval(tick); const best = Number(lsc("bc_recap_best", "0")); if (right > best) lscw("bc_recap_best", String(right)); $("bc-main").innerHTML = `<div class="kit-card" style="text-align:center"><div class="kit-big">⚡</div><div class="kit-q">${right} right in 1 minute!</div><p class="kit-sub">${right > best ? "🌟 New best!" : `Best: ${best}`}</p><button class="kit-btn block" id="bc-rback">Back to lessons</button></div>`; $("bc-rback").onclick = menu; };
    const ask = () => {
      if (Date.now() >= end) return;
      const [l, [q, opts, a]] = pool[Math.floor(Math.random() * pool.length)];
      const sh = K.shuffle(opts.map((t, k) => ({ t, ok: k === a })));
      $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-bar" style="margin-bottom:8px"><i id="bc-rt" style="width:100%"></i></div><div class="kit-sub" style="margin:0 0 4px;font-weight:800">⚡ ${right} right · ${l.emoji} ${K.esc(l.title)}</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${sh.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o.t)}</button>`).join("")}</div></div>`;
      $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = sh[+b.dataset.k].ok; K.record("bo-class", l.id, ok); $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (sh[k].ok) x.classList.add("right"); }); if (ok) right++; else b.classList.add("wrong"); n++; setTimeout(ask, ok ? 350 : 1100); });
    };
    ask();
  }
  function checkpoint(l, next) {
    const [q, opts, a] = l.quiz[0];
    $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 4px;font-weight:800">⏸️ Quick check before the last slide!</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${opts.map((t, k) => `<button class="kit-opt" data-k="${k}" type="button">${K.esc(t)}</button>`).join("")}</div><div class="kit-sub" id="bc-cm" style="text-align:center"></div></div>`;
    $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = +b.dataset.k === a; $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (k === a) x.classList.add("right"); }); if (!ok) b.classList.add("wrong"); $("bc-cm").textContent = ok ? "You're getting it! 🎉" : "That's okay — the next slide explains it."; setTimeout(next, ok ? 900 : 1800); });
  }
  function quiz(l) {
    let i = 0, right = 0;
    const ask = () => {
      if (i >= l.quiz.length) return finish(l, right);
      const [q, opts, a] = l.quiz[i], shuffled = K.shuffle(opts.map((t, k) => ({ t, ok: k === a })));
      $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 4px;font-weight:800">${l.emoji} ${K.esc(l.title)} — question ${i + 1}/3</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${shuffled.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o.t)}</button>`).join("")}</div><div class="kit-sub" id="bc-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = shuffled[+b.dataset.k].ok;
        K.record("bo-class", l.id, ok);
        $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (shuffled[k].ok) x.classList.add("right"); });
        if (ok) right++; else b.classList.add("wrong");
        $("bc-msg").textContent = ok ? "🎓 Yes! Exactly." : `Not quite. Remember: ${l.slides[l.slides.length - 1].text}`;
        setTimeout(() => { i++; ask(); }, ok ? 900 : 3200);
      });
    };
    ask();
  }
  async function finish(l, right) {
    const r = await Promise.race([AIGLeaderboard.finishLesson(l.id, right), new Promise(x => setTimeout(() => x({ ok: false, first: false, coins: 0 }), 4000))]);
    done[l.id] = { score: right };
    if (lsc("bc_day", "") !== cday()) { lscw("bc_streak", String(lsc("bc_day", "") === cday(1) ? Number(lsc("bc_streak", "0")) + 1 : 1)); lscw("bc_day", cday()); }
    if (LESSONS.every(x => done[x.id])) K.toastAdv("You graduated from Bo's Classroom!");
    const g = GAME_FOR[l.id];
    $("bc-main").innerHTML = "";
    $("bc-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right === 3 ? "🌟" : "🎓"}</div><h2>Lesson complete!</h2><p class="kit-sub">${right}/3 questions right. ${r.first ? `First time finishing: +🪙${r.coins}` : ""}</p><div class="bc-sum">📝 <b>You learned:</b> ${K.esc(l.slides[l.slides.length - 1].text)}</div>${g ? `<a class="kit-btn block" href="${g[0]}">🎮 Practise it in ${g[1]}</a>` : ""}<div class="kit-bonus" id="bc-bonus"></div>
      <button class="kit-btn block" id="bc-back">More lessons</button></div></div>`;
    $("bc-back").onclick = () => { $("bc-overlay").innerHTML = ""; menu(); };
    if (r.first && window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
  }
  menu();
}
