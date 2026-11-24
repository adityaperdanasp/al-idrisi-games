/* =================================================================
   Kebun Kata (Word Garden) -- every spelling word is a seed: 🌰 not tried, 🌱 seen, 🌿 growing (right at least once),
   🌸 mastered (3 right in a row). Data: AIGSpelling.progress() (localStorage azka_spell2, synced across devices).
   Practice tab: 🔥 Revenge round (words you missed), 🐝 Spelling Bee (timer + lives), 👨‍👧 Duel with a parent,
   🌱 10-word practice. Answers feed the same weak-word schedule + topicStats (coins / season / weekly) as azkacraft.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const esc = K.esc;
const SP = () => window.AIGSpelling;

const STAGE_EM = ["🌰", "🌱", "🌿", "🌸"];
const STAGE_NAME = ["Not tried yet", "Just met", "Growing", "Mastered!"];
let filter = "all";

function init() {
  const tabs = document.querySelectorAll(".wg-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "garden" ? garden() : practice(); });
  garden();
}

function dayCounts() {
  try {
    const d = (window.AIGJoy && AIGJoy.daily && AIGJoy.daily()) || {};
    const k = x => { const dt = new Date(Date.now() - x * 86400000); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); };
    return { today: d[k(0)] || 0, yesterday: d[k(1)] || 0 };
  } catch (e) { return { today: 0, yesterday: 0 }; }
}

function garden() {
  const ws = SP().gardenWords();
  const mastered = ws.filter(w => w.stage === 3).length, growing = ws.filter(w => w.stage === 2).length, seen = ws.filter(w => w.stage === 1).length;
  const pct = Math.round((mastered / ws.length) * 100);
  const lvl = SP().level();
  const dc = dayCounts();
  const diff = dc.today - dc.yesterday;
  const dayLine = dc.today || dc.yesterday ? `Today ${dc.today} correct · yesterday ${dc.yesterday}${dc.today > dc.yesterday ? " 🔥 you beat yesterday!" : dc.today === dc.yesterday && dc.today ? " 👏 same as yesterday" : ""}` : "No answers yet today. Let's start!";
  const hero = pct >= 60 ? "🌳" : pct >= 25 ? "🪴" : mastered ? "🌿" : "🌱";
  const list = ws.filter(w => filter === "all" || (filter === "school" ? w.school : filter === "grow" ? w.stage === 1 || w.stage === 2 : filter === "done" ? w.stage === 3 : w.stage === 0));
  $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">${hero}</div>
      <div class="kit-q">${mastered} of ${ws.length} words have grown into 🌸</div>
      <div class="wg-bar"><i style="width:${Math.max(2, pct)}%"></i></div>
      <div class="kit-sub" style="margin:0">🌿 ${growing} growing · 🌱 ${seen} just met · 🌰 ${ws.length - mastered - growing - seen} not tried yet</div>
      <div class="kit-sub" style="margin:6px 0 0">Word ladder: Level ${lvl}/3 ${lvl < 3 ? "(master " + (lvl === 1 ? 10 : 30) + " words to unlock longer words)" : "(all words unlocked!)"}</div>
      <div class="kit-sub" style="margin:6px 0 0">${esc(dayLine)}</div></div>
    <div class="kit-card"><div class="wg-chips">${[["all", "All"], ["grow", "Growing"], ["done", "Mastered 🌸"], ["new", "Not tried yet"], ["school", "From school ⭐"]].map(([k, l]) => `<button type="button" class="wg-chip ${filter === k ? "on" : ""}" data-f="${k}">${l}</button>`).join("")}</div>
      <div class="wg-grid">${list.map(w => `<button type="button" class="wg-tile s${w.stage}" data-w="${esc(w.w)}">${w.school ? '<span class="wg-sch">⭐</span>' : ""}<span class="wg-em">${STAGE_EM[w.stage]}</span>${esc(w.w)}</button>`).join("") || '<div class="kit-sub">No words here yet.</div>'}</div></div>`;
  document.querySelectorAll(".wg-chip").forEach(b => b.onclick = () => { filter = b.dataset.f; garden(); });
  document.querySelectorAll(".wg-tile").forEach(b => b.onclick = () => wordCard(b.dataset.w));
}

function wordCard(word) {
  const e = SP().entryOf(word); if (!e) return;
  const X = SP().extra(), p = (SP().progress() || {})[word] || { ok: 0, st: 0, miss: 0 }, st = SP().stage(word);
  const note = (cls, html) => `<div class="wg-note ${cls}">${html}</div>`;
  $("wg-overlay").innerHTML = `<div class="wg-modal" id="wg-mod"><div class="kit-card" style="text-align:center">
    <div class="kit-big" style="font-size:2.6rem">${STAGE_EM[st]}</div>
    <div class="kit-q" style="font-size:1.6rem">${esc(e.w)}</div>
    <div class="kit-sub">${esc(e.d)}</div>
    <div class="wg-say"><button class="kit-btn" id="wg-hear" type="button">🔊 Listen</button><button class="kit-btn" id="wg-slow" type="button">🐢 Slow</button></div>
    ${X.EX[word] ? note("wg-ex", `✏️ <i>${esc(X.EX[word])}</i>`) : ""}
    ${X.TIP[word] ? note("wg-tip", `💡 <b>Memory trick:</b> ${esc(X.TIP[word])}`) : ""}
    ${X.FACT[word] ? note("wg-fact", `🔎 <b>Did you know?</b> ${esc(X.FACT[word])}`) : ""}
    <div class="kit-sub">${STAGE_NAME[st]} · right ${p.ok}× · wrong ${p.miss}× · ${p.st}/3 right in a row</div>
    <button class="kit-btn block" id="wg-close" type="button">Close</button></div></div>`;
  $("wg-hear").onclick = () => SP().say(word); $("wg-slow").onclick = () => SP().say(word, true);
  $("wg-close").onclick = () => { $("wg-overlay").innerHTML = ""; };
  $("wg-mod").onclick = ev => { if (ev.target.id === "wg-mod") $("wg-overlay").innerHTML = ""; };
}

/* ------------------------------ practice ------------------------------ */
function practice() {
  const weak = Object.keys(SP().weak()).length;
  $("wg-main").innerHTML = `<div class="kit-card"><div class="kit-q">Choose a practice</div>
    <button class="kit-btn block" data-m="revenge" type="button">🔥 Revenge Round — ${weak ? weak + " words you missed before" : "no missed words yet, mixed practice"}</button>
    <button class="kit-btn block" data-m="bee" type="button">🐝 Spelling Bee — listen & type, 3 lives, with a timer</button>
    <button class="kit-btn block" data-m="duel" type="button">👨‍👧 Duel with Mom/Dad — take turns on this tablet</button>
    ${window.AIGSpellFix ? '<button class="kit-btn block" data-m="fix" type="button">✏️ Fix the Spelling — tricky words from school worksheets (choose, type, match)</button>' : ""}
    <button class="kit-btn block" data-m="ten" type="button">🌱 10-word practice</button></div>`;
  document.querySelectorAll("[data-m]").forEach(b => b.onclick = () => start(b.dataset.m));
}

function start(mode) {
  if (mode === "revenge") { const r = SP().buildRevenge(6); play({ title: "🔥 Revenge Round", qs: r.questions, record: true, intro: r.weakCount ? `Let's beat the ${r.weakCount} words you missed before!` : "No missed words yet, so this is mixed practice." }); }
  else if (mode === "bee") play({ title: "🐝 Spelling Bee", qs: SP().buildBee(10), record: true, lives: 3, secs: 25, autoSay: true, intro: "Listen to the word, then type its spelling before time runs out." });
  else if (mode === "ten") play({ title: "🌱 10-word practice", qs: SP().buildSession(10), record: true });
  else if (mode === "fix") {
    const F = window.AIGSpellFix, ws = F.words().sort(() => Math.random() - 0.5), qs = [];
    for (let k = 0; k < 8; k++) qs.push(F.forWord(ws[k], false));
    qs.splice(2 + Math.floor(Math.random() * 6), 0, F.matchRandom());
    play({ title: "✏️ Fix the Spelling", qs, record: true, intro: "Find the spelling mistake and fix it. There are choose, type and match questions." });
  }
  else if (mode === "duel") duel();
}

// Core engine: plays a list of spelling questions (mc or typed) one by one.
function play(cfg, done) {
  const qs = cfg.qs; let i = 0, score = 0, lives = cfg.lives || 0, timer = null; const missed = [];
  const finish = () => {
    clearInterval(timer);
    if (done) return done({ score, total: qs.length, missed });
    const good = score >= Math.ceil(qs.length * 0.7);
    if (good) try { AIGJoy && AIGJoy.confetti && AIGJoy.confetti(40); } catch (e) {}
    $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">${good ? "🏆" : "💪"}</div><div class="kit-q">${esc(cfg.title)}</div>
      <div class="kit-sub">Score: ${score} out of ${qs.length}${lives && !lives ? " · out of lives" : ""}</div>
      ${missed.length ? `<div class="kit-sub">Words to practice again: <b>${missed.map(esc).join(", ")}</b></div>` : '<div class="kit-sub">All correct. Awesome! 🌸</div>'}
      <button class="kit-btn block" id="wg-again" type="button">Play again</button><button class="kit-btn block" id="wg-back" type="button">Back to the garden</button></div>`;
    $("wg-again").onclick = () => practice(); $("wg-back").onclick = () => { document.querySelectorAll(".wg-tab")[0].click(); };
  };
  const show = () => {
    clearInterval(timer);
    if (i >= qs.length || (cfg.lives && lives <= 0)) return finish();
    const q = qs[i];
    const typed = q.type === "fill", isMatch = q.type === "match";
    const mixed = isMatch ? q.pairs.map(x => x.right).sort(() => Math.random() - 0.5) : [];
    $("wg-main").innerHTML = `<div class="kit-card">
      <div class="wg-hud"><span>${esc(cfg.title)} · ${i + 1}/${qs.length}</span><span>${cfg.lives ? "❤️".repeat(Math.max(0, lives)) + " " : ""}⭐ ${score}</span></div>
      ${cfg.secs ? '<div class="wg-time"><i id="wg-time"></i></div>' : ""}
      ${i === 0 && cfg.intro ? `<div class="kit-sub">${esc(cfg.intro)}</div>` : ""}
      <div class="wg-q">${q.prompt}</div>
      ${isMatch ? `<div class="wg-match">${q.pairs.map((x, k) => `<div class="wg-mrow"><span class="wg-mleft">${esc(x.left)}</span><select class="wg-msel" data-k="${k}"><option value="">Choose the correct spelling</option>${mixed.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select></div>`).join("")}</div><button class="kit-btn block" id="wg-mcheck" type="button">Check answer</button>` : typed ? `<input class="wg-in" id="wg-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Type the word here"><button class="kit-btn block" id="wg-check" type="button">Check answer</button>`
              : isMatch ? "" : `<div class="wg-opts">${q.options.map(o => `<button class="wg-opt" type="button" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}
      <div id="wg-after"></div></div>`;
    let answered = false;
    const settle = (ok, given) => {
      if (answered) return; answered = true; clearInterval(timer);
      if (ok) score++; else { missed.push(q.spellWord || q.answer); if (cfg.lives) lives--; }
      if (cfg.record !== false && q.spellWord) {
        try { SP().record(q.spellWord, ok); } catch (e) {}
        try { AIGLeaderboard.recordTopicAttempt("language-arts", "Spelling Words", ok); } catch (e) {}
      }
      const tip = q.spellWord ? SP().afterAnswerHtml(q.spellWord, ok) : "";
      const ans = isMatch ? q.pairs.map(x => esc(x.left) + " → <b>" + esc(x.right) + "</b>").join("<br>") : "<b>" + esc(q.answer) + "</b>";
      $("wg-after").innerHTML = `<div class="wg-fb">${ok ? "✅ Correct!" : "❌ " + (given === null ? "Time is up. " : "") + "Answer: " + ans}</div>${tip.replace(/sp-note sp-/g, "wg-note wg-")}<button class="kit-btn block" id="wg-next" type="button">${i + 1 >= qs.length || (cfg.lives && lives <= 0) ? "Finish" : "Next"}</button>`;
      document.querySelectorAll(".wg-opt").forEach(b => { b.disabled = true; if (b.dataset.o === q.answer) b.classList.add("ok"); else if (b.dataset.o === given) b.classList.add("bad"); });
      document.querySelectorAll(".wg-msel").forEach(el => { el.disabled = true; const x = q.pairs[+el.dataset.k]; el.style.background = el.value === x.right ? "#c9f2c7" : "#ffd0d0"; });
      const mc = $("wg-mcheck"); if (mc) mc.disabled = true;
      const inp = $("wg-in"); if (inp) { inp.disabled = true; const c = $("wg-check"); if (c) c.disabled = true; }
      $("wg-next").onclick = () => { i++; show(); };
    };
    if (isMatch) {
      $("wg-mcheck").onclick = () => { const sels = [...document.querySelectorAll(".wg-msel")]; if (sels.some(el => !el.value)) return; settle(sels.every(el => el.value === q.pairs[+el.dataset.k].right), "match"); };
    } else if (typed) {
      const go = () => { const v = $("wg-in").value.trim(); if (!v) return; settle(v.toLowerCase() === String(q.answer).toLowerCase(), v); };
      $("wg-check").onclick = go; $("wg-in").onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); go(); } }; $("wg-in").focus();
    } else document.querySelectorAll(".wg-opt").forEach(b => b.onclick = () => settle(b.dataset.o === q.answer, b.dataset.o));
    if (cfg.autoSay && q.spellWord) setTimeout(() => SP().say(q.spellWord), 250);
    if (cfg.secs) {
      const t0 = Date.now(), total = cfg.secs * 1000;
      timer = setInterval(() => { const f = 1 - (Date.now() - t0) / total; const el = $("wg-time"); if (el) el.style.width = Math.max(0, f * 100) + "%"; if (f <= 0) settle(false, null); }, 100);
    }
  };
  show();
}

/* ------------------------------ duel with a parent ------------------------------ */
function duel() {
  $("wg-main").innerHTML = `<div class="kit-card"><div class="kit-q">👨‍👧 Word Duel</div><div class="kit-sub">Azka plays 5 words first, then hands over the tablet. Same questions! Mom/Dad's score is not saved to Azka's account.</div>
    <input class="wg-in" id="wg-pname" value="Dad" maxlength="12" style="font-size:1rem"><button class="kit-btn block" id="wg-go" type="button">Start!</button></div>`;
  $("wg-go").onclick = () => {
    const other = ($("wg-pname").value.trim() || "Dad").slice(0, 12);
    const s = SP(); const used = []; const qs = [];
    while (qs.length < 5) { const e = s.chooseWord ? s.chooseWord(used) : null; const ent = e || s.WORDS[Math.floor(Math.random() * s.WORDS.length)]; used.push(ent.w); qs.push(Math.random() < 0.5 ? s.typedMissing(ent) : s.typedScramble(ent)); }
    const turn = (who, isMe, next) => {
      $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">${isMe ? "🧒" : "🧑"}</div><div class="wg-who">${esc(who)}'s turn!</div><div class="kit-sub">Hand the tablet to ${esc(who)}, then press start.</div><button class="kit-btn block" id="wg-t" type="button">Start turn</button></div>`;
      $("wg-t").onclick = () => play({ title: who, qs: qs.map(q => Object.assign({}, q)), record: isMe }, next);
    };
    turn(player.name || "Azka", true, r1 => turn(other, false, r2 => {
      const w = r1.score === r2.score ? "It's a tie! 🤝" : r1.score > r2.score ? (player.name || "Azka") + " wins! 🏆" : other + " wins! 🏆";
      try { AIGJoy && AIGJoy.confetti && AIGJoy.confetti(30); } catch (e) {}
      $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">🎉</div><div class="kit-q">${esc(w)}</div><div class="kit-sub">${esc(player.name || "Azka")}: ${r1.score}/5 · ${esc(other)}: ${r2.score}/5</div><button class="kit-btn block" id="wg-b" type="button">Back</button></div>`;
      $("wg-b").onclick = () => practice();
    }));
  };
}

if (!player) $("wg-main").innerHTML = K.signedOutHtml("🌱"); else init();
