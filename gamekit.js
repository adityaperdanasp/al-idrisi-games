/* =================================================================
   AIGKit (PM round 11) -- tiny shared kit for the Game Room mini-games:
   a common look (topbar / cards / buttons / overlays), a mixed
   math+language+science question source, and end-of-round rewards.
   Each game page is one folder under the repo root, so scripts are
   loaded with "../". Required order on a page:
     player.js, firebase.js, leaderboard.js, skin.js, juice.js,
     mathville/generators.js, question-pools.js, gamekit.js, script.js
   ================================================================= */
(function () {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];

  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    if (!m) throw new Error("unsupported answer shape");
    const correctNum = Number(m[1].replace(/,/g, ""));
    const suffix = m[2] || "";
    const options = new Set([correctNum]);
    let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const magnitude = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + magnitude * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump = 1;
    while (options.size < 4) options.add(correctNum + bump++);
    return { prompt: q.prompt, options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix), correctLabel: correctNum.toLocaleString("en-US") + suffix };
  }
  function mathQuestion(difficulty) {
    for (let i = 0; i < 12; i++) {
      const key = GEN_KEYS[rand(0, GEN_KEYS.length - 1)];
      try { return { key, ...buildMc(window.MATHVILLE_GENERATORS[key](difficulty || "medium")) }; } catch (e) { /* try another */ }
    }
    const a = rand(6, 12), b = rand(3, 9);
    return { key: "multiplication", ...buildMc({ prompt: `${a} × ${b} = ?`, answer: String(a * b) }) };
  }
  // opts.subject: "math" | "lang" | "sci" | undefined (mixed)
  // ---- Bo-Bot (PM round 12, item 9) -- the game AI has a level (from Bo's
  // level, so it gets sharper as you do) and one of three personalities.
  const BOT_TYPES = [
    { id: "sunny", name: "Sunny", emoji: "😄", accBonus: 0, speedMult: 1, say: { think: ["Hmm, let me think! 🤔", "Ooh, a fun one!"], win: ["Yay! I did it! 🎉", "That was easy peasy!"], lose: ["You're so good! 👏", "Wow, you beat me!"], slip: ["Oops, I made a mistake!", "Whoops! Try again, me…"] } },
    { id: "sly", name: "Sly", emoji: "😏", accBonus: -0.03, speedMult: 0.85, say: { think: ["Watch this…", "Too easy."], win: ["Ha! Faster than you!", "Too slow!"], lose: ["Hmph. Lucky…", "Okay, okay — good game."], slip: ["That wasn't on purpose!", "Hmm… slipped."] } },
    { id: "newton", name: "Newton", emoji: "🤓", accBonus: 0.03, speedMult: 1.2, say: { think: ["Calculating…", "According to my notes…"], win: ["As expected!", "Elementary, my friend."], lose: ["Fascinating. You win!", "I must study more."], slip: ["An error in my calculations!", "Hmm, a rounding mistake."] } }
  ];
  function makeBot(level, playerId) {
    let h = 0; for (let i = 0; i < (playerId || "x").length; i++) h = (h * 31 + playerId.charCodeAt(i)) >>> 0;
    const t = BOT_TYPES[h % BOT_TYPES.length];
    const lvl = Math.max(1, Math.min(12, level || 1));
    return { ...t, level: lvl, acc: Math.min(0.92, 0.5 + 0.04 * lvl + t.accBonus), speedMs: Math.max(3200, (7000 - lvl * 320) * t.speedMult),
      quip: kind => t.say[kind][rand(0, t.say[kind].length - 1)] };
  }
  let bot = makeBot(2, "x");
  let focus = null; // parent-picked topics (PM round 11, item 17), loaded by ready()
  function focusQuestion(diff) {
    if (!focus || !focus.topics.length || Math.random() > 0.35) return null;
    const key = focus.topics[rand(0, focus.topics.length - 1)];
    try { return { subject: "math", key, focus: true, ...buildMc(window.MATHVILLE_GENERATORS[key](diff)) }; } catch (e) { return null; }
  }
  function question(opts) { const q = question0(opts); lastQ = q; return q; }
  function question0(opts) {
    opts = opts || {};
    const P = window.AIGQuestionPools;
    const diff = opts.difficulty || "medium";
    if (!opts.subject || opts.subject === "math") { const f = focusQuestion(diff); if (f) return f; }
    if (opts.subject === "math" || !P) return { subject: "math", ...mathQuestion(diff) };
    if (opts.subject === "lang") { const q = P.pickLanguage(); if (q) return { subject: "lang", key: "language", ...q }; }
    if (opts.subject === "sci") { const q = P.pickScience(); if (q) return { subject: "sci", key: "science", ...q }; }
    if (opts.subject) return { subject: "math", ...mathQuestion(diff) };
    return P.rollMixed(() => mathQuestion(diff));
  }

  let lastQ = null, shieldArmed = false;
  function toast(text) {
    const t = document.createElement("div");
    t.textContent = text;
    t.style.cssText = "position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:100000;background:#3b0764;color:#fff;font-family:'Baloo 2',sans-serif;font-weight:800;padding:8px 16px;border-radius:100px;font-size:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:88vw;text-align:center";
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  // Spell bar: a 🪄 row of the spells you've unlocked (one charge each per page load).
  function mountSpells(spells) {
    const have = spells.filter(x => x.unlocked);
    if (!have.length || document.getElementById("kit-spells")) return;
    const bar = document.createElement("div");
    bar.id = "kit-spells";
    bar.style.cssText = "position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99989;display:flex;gap:6px;background:rgba(255,255,255,.92);padding:6px 10px;border-radius:100px;box-shadow:0 3px 10px rgba(0,0,0,.2)";
    bar.innerHTML = `<span style="align-self:center;font-size:1rem">🪄</span>` + have.map(x => `<button type="button" data-s="${x.id}" title="${x.name}: ${x.desc}" style="border:0;background:#f3ecff;border-radius:100px;padding:5px 10px;font-weight:800;font-size:.78rem;cursor:pointer;color:#5b21b6">${x.emoji} ${x.name}</button>`).join("");
    document.body.appendChild(bar);
    bar.querySelectorAll("button").forEach(b => b.onclick = () => { if (castSpell(b.dataset.s)) { b.disabled = true; b.style.opacity = ".4"; } });
  }
  function castSpell(id) {
    const q = lastQ;
    if (id === "shield") { shieldArmed = true; toast("🛡️ Shield ready — your next mistake is forgiven."); return true; }
    if (!q || !q.correctLabel) { toast("Cast this when a question is on screen!"); return false; }
    if (id === "fifty") {
      const wrong = [...document.querySelectorAll(".kit-opt:not(:disabled)")].filter(b => (b.dataset.o || b.textContent) !== q.correctLabel);
      if (wrong.length < 2) { toast("Nothing to remove right now."); return false; }
      shuffle(wrong).slice(0, 2).forEach(b => { b.disabled = true; b.style.opacity = ".25"; });
      toast("✂️ Two wrong answers removed!"); return true;
    }
    if (id === "peek") {
      const a = String(q.correctLabel), num = /^-?[\d,.]+/.test(a);
      toast(num ? `🔎 The answer has ${a.replace(/[^\d]/g, "").length} digit(s) and is ${(parseInt(a.replace(/[^\d-]/g, ""), 10) % 2) ? "odd" : "even"}.` : `🔎 The answer starts with “${a[0]}” and has ${a.length} letters.`);
      return true;
    }
    return false;
  }
  // q (optional): the question that was just answered -- wrong multiple-choice ones go to the
  // spaced-repetition store (Quick Review / Word Book). Falls back to the last one generated.
  function record(gameId, key, ok, q) {
    // Shield spell (PM round 13, item 3): the next wrong answer isn't counted against you.
    if (!ok && shieldArmed) { shieldArmed = false; toast("🛡️ Shield! That one doesn't count against you."); return; }
    try {
      const qq = q || (lastQ && lastQ.key === key ? lastQ : null);
      if (!ok && qq && qq.options && qq.correctLabel && window.AIGLeaderboard && AIGLeaderboard.srsAdd) AIGLeaderboard.srsAdd(qq, qq.subject);
    } catch (e) {}
    try { if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt(gameId, key, ok); } catch (e) { /* never block a round */ }
    try { if (focus && focus.topics.includes(key) && window.AIGLeaderboard && AIGLeaderboard.recordFocusAnswer) AIGLeaderboard.recordFocusAnswer(key, ok); } catch (e) {}
    try { if (window.AIGJuice) AIGJuice.answer(ok, (record.streak = ok ? (record.streak || 0) + 1 : 0) - 1); } catch (e) {}
    try { plusRecord(ok); } catch (e) {}
  }

  // Pays a small once-or-twice-a-day bonus (capped in leaderboard.js) and writes the result into `el`.
  async function finish(gameId, coins, el) {
    let r = null;
    try { if (window.AIGLeaderboard && coins > 0) r = await withTimeout(AIGLeaderboard.awardMiniGame(gameId, coins), 6000, null); } catch (e) {}
    if (el) el.textContent = r && r.paid ? `🪙 +${r.paid} bonus coins!` : r && r.capped ? "Daily bonus for this game already collected — come back tomorrow!" : "";
    try { moodRow(gameId, el); } catch (e) {}
    try { plusResults(gameId, el); } catch (e) {}
    return r;
  }

  // "How did that feel?" -- one tap, remembered for the parent report (PM round 12, item 18).
  function moodRow(gameId, el) {
    const modal = el && el.closest ? el.closest(".kit-modal") : null;
    if (!modal || modal.querySelector(".kit-mood") || !window.AIGLeaderboard || !AIGLeaderboard.logMood) return;
    const row = document.createElement("div");
    row.className = "kit-mood";
    row.innerHTML = `<div class="kit-sub" style="margin:4px 0 6px">How did that feel?</div><div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">${AIGLeaderboard.MOODS.map(m => `<button type="button" data-e="${m[0]}" title="${m[1]}" style="font-size:1.6rem;border:0;background:#f3ecff;border-radius:12px;padding:4px 10px;cursor:pointer">${m[0]}</button>`).join("")}</div>`;
    const first = modal.querySelector(".kit-btn");
    modal.insertBefore(row, first);
    row.querySelectorAll("button").forEach(b => b.onclick = () => { AIGLeaderboard.logMood(gameId, b.dataset.e); row.innerHTML = '<div class="kit-sub" style="margin:4px 0 12px">Thanks for telling me! 💜</div>'; });
  }

  const CSS = `
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    .hidden{display:none!important}
    html,body{margin:0;min-height:100%;font-family:"Nunito",sans-serif;color:#3d2e22;background:var(--kit-bg,linear-gradient(180deg,#fdf6ea,#f3e9fc))}
    .kit-page{max-width:520px;margin:0 auto;min-height:100dvh;padding-bottom:34px;position:relative}
    .kit-top{display:flex;align-items:center;gap:10px;padding:14px 14px 8px}
    .kit-back{width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.07);color:inherit;font-size:1.05rem;display:grid;place-items:center;text-decoration:none;flex:none}
    .kit-title{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:1.08rem;flex:1;text-align:center;margin-right:34px;color:var(--kit-accent,#8c2f6b)}
    .kit-hud{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;padding:0 14px 10px;font-weight:800;font-size:.84rem}
    .kit-card{background:#fff;border-radius:18px;padding:16px;margin:0 14px 12px;box-shadow:0 3px 0 rgba(0,0,0,.06)}
    .kit-q{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:1.12rem;text-align:center;margin:4px 0 12px;line-height:1.3}
    .kit-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .kit-opt{border:2px solid rgba(0,0,0,.1);background:#faf6ff;border-radius:13px;padding:12px 6px;font-family:"Baloo 2",sans-serif;font-weight:800;font-size:.98rem;color:inherit;cursor:pointer}
    .kit-opt:disabled{cursor:default}
    .kit-opt.right{background:#c9f2d3;border-color:#34c759}
    .kit-opt.wrong{background:#ffd0d0;border-color:#e4572e}
    .kit-btn{display:inline-block;border:none;border-radius:14px;padding:12px 20px;font-family:"Baloo 2",sans-serif;font-weight:800;font-size:.95rem;cursor:pointer;background:var(--kit-accent,#8c2f6b);color:#fff;text-decoration:none;text-align:center}
    .kit-btn.alt{background:rgba(0,0,0,.08);color:inherit}
    .kit-btn:disabled{opacity:.45;cursor:default}
    .kit-btn.block{display:block;width:100%;margin-bottom:8px}
    .kit-overlay{position:fixed;inset:0;background:rgba(30,15,40,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50}
    .kit-modal{background:#fffaf2;border-radius:22px;padding:22px 20px;width:100%;max-width:370px;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.28)}
    .kit-modal h2{font-family:"Baloo 2",sans-serif;font-weight:800;font-size:1.3rem;margin:4px 0 6px;color:var(--kit-accent,#8c2f6b)}
    .kit-big{font-size:3.2rem;line-height:1.1}
    .kit-sub{font-weight:700;color:#6b5a4a;font-size:.88rem;line-height:1.5;margin:0 0 14px}
    .kit-bonus{font-weight:800;color:var(--kit-accent,#8c2f6b);min-height:1.2em;margin-bottom:12px;font-size:.9rem}
    .kit-bar{height:10px;border-radius:100px;background:rgba(0,0,0,.09);overflow:hidden}
    .kit-bar>i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#f7c548,#e4572e);transition:width .15s linear}
  `;
  function mount(cfg) {
    // cfg: { title, emoji, accent, bg }
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    if (cfg.accent) document.documentElement.style.setProperty("--kit-accent", cfg.accent);
    if (cfg.bg) document.documentElement.style.setProperty("--kit-bg", cfg.bg);
    document.title = `${cfg.title} — BrainBox`;
    // Study radio (PM round 12, item 10): the 🎧 button appears on every Game Room page.
    // Background music (PM round 15): synthesized mood per game folder (see game-music.js).
    if (cfg.music !== false && !window.AIGMusic) {
      const mu = document.createElement("script"); mu.src = "../game-music.js"; document.head.appendChild(mu);
    }
    try { plusMount(cfg); } catch (e) {}
    if (cfg.radio !== false) {
      const sc = document.createElement("script");
      sc.src = "../radio.js"; sc.onload = () => { try { AIGRadio.mountButton(); } catch (e) {} };
      document.head.appendChild(sc);
    }
  }
  function signedIn() {
    const p = window.AIGPlayer && AIGPlayer.getPlayer();
    return p && p.role !== "parent" ? p : null;
  }
  function signedOutHtml(emoji) {
    return `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${emoji || "🎮"}</div><p class="kit-sub">Please sign in from the hub first.</p><a href="../" class="kit-btn block">Back to Hub</a></div></div>`;
  }
  // Offline-friendly: every Firebase call in ready()/finish() gets a timeout, so a
  // missing connection never freezes a game on "loading" (PM round 13, item 13).
  const withTimeout = (p, ms, fallback) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise(r => setTimeout(() => r(fallback), ms))]);
  function offlinePill() {
    const show = () => {
      let el = document.getElementById("kit-offline");
      if (navigator.onLine) { if (el) el.remove(); return; }
      if (el) return;
      el = document.createElement("div"); el.id = "kit-offline";
      el.textContent = "📴 Offline — progress will save when you're back online";
      el.style.cssText = "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:100000;background:#334155;color:#fff;font:800 .72rem 'Nunito',sans-serif;padding:5px 12px;border-radius:100px;box-shadow:0 2px 8px rgba(0,0,0,.3)";
      document.body.appendChild(el);
    };
    window.addEventListener("online", show); window.addEventListener("offline", show); show();
  }
  async function ready() {
    try { offlinePill(); } catch (e) {}
    try { if (window.AIGLeaderboard && AIGLeaderboard.getSpells) { const sp = await withTimeout(AIGLeaderboard.getSpells(), 2500, null); if (sp) mountSpells(sp.spells); } } catch (e) {}
    try { const p = signedIn(); const b = window.AIGLeaderboard && AIGLeaderboard.getBoStatus ? await withTimeout(AIGLeaderboard.getBoStatus(), 2500, null) : null; bot = makeBot(b ? b.level : 2, p ? p.id : "x"); } catch (e) {}
    try { if (window.AIGLeaderboard && AIGLeaderboard.getWeeklyFocus) focus = await withTimeout(AIGLeaderboard.getWeeklyFocus(), 2500, null); } catch (e) {}
    try { if (window.AIGQuestionPools) await Promise.race([AIGQuestionPools.ensurePools(), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  }


  // =================================================================
  // Kit Plus (game audit, batch 1) -- shared upgrades for every Game Room
  // game: Block World look, first-visit "how to play" card + a ? button,
  // read-aloud button on each question, a combo badge with milestone toasts,
  // and a richer results card (stars, accuracy, personal best, day streak).
  // Everything is additive and wrapped in try/catch.
  // =================================================================
  const GAME_ID = (location.pathname.split("/").filter(Boolean).slice(-1)[0] || "game").replace(/\.html$/, "");
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const stats = { right: 0, total: 0, best: 0 };
  const TUT = {
    "dino-rider": ["Pick a dino (more unlock with coins).", "Answer right to leap each gate — wrong costs stamina.", "Ride often: your dino earns XP and evolves!"],
    "sea-mission": ["Steer your boat between the 3 lanes.", "Answer right to fire at the closest sea monster.", "Dodge the big waves or your hull takes damage."],
    "zombie-defense": ["Zombies walk toward your house in 3 lanes.", "A right answer shoots the closest one.", "A wrong answer jams your gun for a moment."],
    "card-race": ["You and Bo-Bot each hold question cards.", "Answer a card right to play it — wrong means draw one.", "Empty your hand first to win!"],
    "times-rhythm": ["A times-table problem sits at the top.", "Notes fall down 4 lanes to the beat.", "Tap the right answer before it passes the gold line."],
    "dungeon": ["Choose a hero: each has a special strength.", "Right answer = you hit, wrong = the monster hits you.", "Gear you win stays forever and makes you stronger."],
    "fractions-kitchen": ["Read the fraction of a cup the order needs.", "Tap the mark on the measuring cup to fill it.", "Watch out: some cups are cut into different parts!"],
    "word-detective": ["Read the case carefully.", "Answer the evidence questions from the story.", "Then accuse the right suspect!"],
    "escape-daily": ["Each room hides one digit of the door code.", "Solve the room's puzzle to get its digit.", "Enter all 4 digits on the last door to escape."],
    "pattern-puzzles": ["Find the rule behind each pattern.", "Pick the piece that fits.", "Stuck? The 💡 hint shows the rule's shape."],
    "bo-class": ["Bo teaches a short lesson on the chalkboard.", "Then try 3 practice questions.", "Finish a lesson for a ✅ stamp and coins."],
    "science-lab": ["Read the experiment setup.", "Predict what will happen.", "Watch the result and learn why!"],
    "my-town": ["Build on your 5×5 town with coins.", "Visit friends' towns and leave a 💖.", "Likes on your town earn you coins."],
    "geo-flight": ["Fly around the world in 10 questions.", "Answer capitals, flags and continents.", "Every right country gets a passport stamp!"],
    "island-adventure": ["Sail to one of the 4 islands.", "Get 3 of 4 right to master an island.", "Master 2 islands to unlock the volcano finale."],
    "friend-duel": ["Pick a friend and play 8 questions.", "They play the same questions within 7 days.", "Most right answers wins!"],
    "story-maker": ["Fill each blank with the right word.", "Watch out for tense, plurals and spelling.", "Your finished story becomes a book you keep."],
    "speak-with-bo": ["Read the sentence out loud.", "Each word turns green when Bo hears it.", "Get 80% or more for a Great!"],
    "voice-quiz": ["Bo reads the question.", "Say your answer out loud (or tap it).", "\"Twelve\", \"B\" or \"the second one\" all work."],
    "music-corner": ["Pick something to remember.", "Tap notes on the keyboard to make a tune.", "Press Play — each note lights up the next word."],
    "zen-mode": ["No timer, no lives, no pressure.", "A wrong answer just crosses that choice out.", "Stop whenever you like."],
    "bo-tutor": ["Bo picks the topic you miss most.", "Try 5 special questions on it.", "Get 5/5 to master it ⭐."],
    "quick-review": ["Questions you missed come back on a schedule.", "Answer right and they move further away.", "Get one right at every step to master it."],
    "word-book": ["Every Language question you missed lives here.", "Practise the cards in the Practice tab.", "Due cards move forward in Quick Review."],
    "ready-check": ["Pick the topic you want to move on from.", "Answer 5 questions.", "4/5 or better earns a ✅ — you're ready!"],
    "weekly-boss": ["The whole class fights one boss this week.", "Every right answer anywhere hurts it.", "Help beat it to win a chest!"],
    "garage": ["See every vehicle you own or rent.", "Upgrade, paint and add stickers.", "Upgrades make Drive and Plane Mode stronger."],
    "workshop": ["Pick something you own.", "Upgrade it to Gold or Holo.", "Higher tiers look shinier in the games."],
    "class-board": ["Everyone is on one of 4 colour teams.", "Your right answers add to your team's score.", "Check back to see which team leads!"]
  };
  function plusCss() {
    if (document.getElementById("kit-plus-css")) return;
    const st = document.createElement("style"); st.id = "kit-plus-css";
    st.textContent = `
      .kp-combo{position:fixed;top:10px;right:10px;z-index:99990;background:#2b2b2b;color:#ffd23f;font:800 .9rem "Pixelify Sans","Baloo 2",sans-serif;padding:6px 10px;border:3px solid #111;box-shadow:inset 2px 2px 0 rgba(255,255,255,.2);transform:scale(.6);opacity:0;transition:transform .15s,opacity .15s;pointer-events:none}
      .kp-combo.on{transform:scale(1);opacity:1}.kp-combo.pop{animation:kpPop .3s}
      @keyframes kpPop{50%{transform:scale(1.25)}}
      .kp-adv{position:fixed;top:12px;left:50%;transform:translate(-50%,-160%);z-index:100001;display:flex;gap:10px;align-items:center;background:#1e1e1e;border:4px solid #6a6a6a;box-shadow:0 0 0 3px #111;padding:8px 12px;transition:transform .4s;max-width:90vw}
      .kp-adv.show{transform:translate(-50%,0)}.kp-adv b{display:block;color:#ffd23f;font:800 .7rem "Silkscreen","Pixelify Sans",monospace}.kp-adv span{color:#fff;font:700 .82rem "Pixelify Sans","Nunito",sans-serif}
      .kp-tts{margin-left:6px;border:0;background:rgba(0,0,0,.07);border-radius:8px;padding:2px 7px;font-size:.9rem;cursor:pointer;vertical-align:middle}
      .kp-help{width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.07);border:0;font-weight:800;font-size:1rem;cursor:pointer;flex:none;color:inherit}
      .kp-res{background:#f6f1e4;border:3px solid #1b1b1b;padding:10px;margin:0 0 12px;text-align:center}
      .kp-stars{font-size:1.8rem;letter-spacing:4px}.kp-stars i{font-style:normal;opacity:.25}.kp-stars i.on{opacity:1}
      .kp-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-weight:800;font-size:.82rem;margin-top:4px}
      .kp-new{color:#c0392b;font-weight:800;animation:kpPop .6s 2}
      .kp-tut ol{text-align:left;margin:0 0 14px;padding-left:22px;font-weight:700;line-height:1.5}
    `;
    document.head.appendChild(st);
  }
  function advToast(title) {
    const t = document.createElement("div"); t.className = "kp-adv";
    t.innerHTML = `<div style="font-size:1.4rem">🏆</div><div><b>ADVANCEMENT MADE!</b><span></span></div>`; t.querySelector("span").textContent = title;
    document.body.appendChild(t); requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 450); }, 2800);
  }
  function plusRecord(ok) {
    stats.total++; if (ok) stats.right++;
    const n = record.streak || 0; stats.best = Math.max(stats.best, n);
    let b = document.getElementById("kp-combo");
    if (!b) { b = document.createElement("div"); b.id = "kp-combo"; b.className = "kp-combo"; document.body.appendChild(b); }
    b.textContent = `🔥 COMBO ×${n}`; b.classList.toggle("on", n >= 2);
    if (n >= 2) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
    if (ok && (n === 5 || n === 10 || n === 20)) advToast(`${n} in a row! Keep going!`);
  }
  function tutorial(force) {
    const steps = TUT[GAME_ID]; if (!steps) return;
    if (!force && ls.get("kit_tut_" + GAME_ID, "") === "1") return;
    const o = document.createElement("div"); o.className = "kit-overlay kp-tut"; o.style.zIndex = "99995";
    o.innerHTML = `<div class="kit-modal"><div class="kit-big">❓</div><h2>How to play</h2><ol>${steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol><button type="button" class="kit-btn block">Got it!</button></div>`;
    o.querySelector("button").onclick = () => { ls.set("kit_tut_" + GAME_ID, "1"); o.remove(); };
    document.body.appendChild(o);
  }
  function addTts(root) {
    if (!("speechSynthesis" in window)) return;
    (root || document).querySelectorAll(".kit-q:not([data-kp])").forEach(q => {
      q.dataset.kp = "1"; if (!q.textContent.trim()) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "kp-tts"; b.textContent = "🔊"; b.title = "Read it to me";
      b.onclick = e => { e.stopPropagation(); try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(q.textContent.replace("🔊", "").trim()); u.lang = "en-US"; u.rate = 0.95; speechSynthesis.speak(u); } catch (er) {} };
      q.appendChild(b);
    });
  }
  function plusMount(cfg) {
    plusCss();
    const onReady = () => {
      try {
        const addHelp = () => { const top = document.querySelector(".kit-top");
          if (top && TUT[GAME_ID] && !top.querySelector(".kp-help")) {
            const h = document.createElement("button"); h.type = "button"; h.className = "kp-help"; h.textContent = "?"; h.title = "How to play"; h.onclick = () => tutorial(true);
            top.appendChild(h); const title = top.querySelector(".kit-title"); if (title) title.style.marginRight = "0";
          } };
        addHelp(); setTimeout(addHelp, 600); window.addEventListener("load", addHelp);
        setTimeout(() => tutorial(false), 400);
        let pend = false;
        new MutationObserver(() => { if (pend) return; pend = true; setTimeout(() => { pend = false; addTts(); }, 60); }).observe(document.body, { childList: true, subtree: true, characterData: true });
        addTts();
      } catch (e) {}
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady); else onReady();
  }
  function plusResults(gameId, el) {
    const modal = el && el.closest ? el.closest(".kit-modal") : null; if (!modal || modal.querySelector(".kp-res") || !stats.total) return;
    const acc = stats.right / stats.total, stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0;
    const key = "kit_best_" + (gameId || GAME_ID), prev = Number(ls.get(key, "0")), score = Math.round(acc * 100) * 100 + stats.right, isNew = score > prev;
    if (isNew) ls.set(key, String(score));
    const today = new Date().toISOString().slice(0, 10), dk = "kit_days_" + (gameId || GAME_ID);
    let d = {}; try { d = JSON.parse(ls.get(dk, "{}")) || {}; } catch (e) {}
    if (d.last !== today) { const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10); d.n = d.last === y ? (d.n || 0) + 1 : 1; d.last = today; ls.set(dk, JSON.stringify(d)); }
    const box = document.createElement("div"); box.className = "kp-res";
    box.innerHTML = `<div class="kp-stars">${[0, 1, 2].map(i => `<i class="${i < stars ? "on" : ""}">⭐</i>`).join("")}</div>
      <div class="kp-row"><span>✅ ${stats.right}/${stats.total} right</span><span>🎯 ${Math.round(acc * 100)}%</span><span>🔥 best combo ${stats.best}</span></div>
      <div class="kp-row"><span>📅 ${d.n || 1} day${(d.n || 1) > 1 ? "s" : ""} in a row</span>${isNew && prev ? `<span class="kp-new">🏅 New personal best!</span>` : ""}</div>`;
    const h2 = modal.querySelector("h2"); if (h2) h2.after(box); else modal.prepend(box);
    if (stars === 3) { try { if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); } catch (e) {} advToast("Perfect round — 3 stars!"); }
    const c = document.getElementById("kp-combo"); if (c) c.classList.remove("on");
  }
  window.AIGKit = { get bot() { return bot; }, toastAdv: t => { try { plusCss(); advToast(t); } catch (e) {} }, tutorial: () => tutorial(true), stats, rand, shuffle, esc, question, mathQuestion, buildMc, record, finish, mount, signedIn, signedOutHtml, ready };
})();
