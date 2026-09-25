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
  function question(opts) {
    opts = opts || {};
    const P = window.AIGQuestionPools;
    const diff = opts.difficulty || "medium";
    if (opts.subject === "math" || !P) return { subject: "math", ...mathQuestion(diff) };
    if (opts.subject === "lang") { const q = P.pickLanguage(); if (q) return { subject: "lang", key: "language", ...q }; }
    if (opts.subject === "sci") { const q = P.pickScience(); if (q) return { subject: "sci", key: "science", ...q }; }
    if (opts.subject) return { subject: "math", ...mathQuestion(diff) };
    return P.rollMixed(() => mathQuestion(diff));
  }

  function record(gameId, key, ok) {
    try { if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt(gameId, key, ok); } catch (e) { /* never block a round */ }
    try { if (window.AIGJuice) AIGJuice.answer(ok, (record.streak = ok ? (record.streak || 0) + 1 : 0) - 1); } catch (e) {}
  }

  // Pays a small once-or-twice-a-day bonus (capped in leaderboard.js) and writes the result into `el`.
  async function finish(gameId, coins, el) {
    let r = null;
    try { if (window.AIGLeaderboard && coins > 0) r = await AIGLeaderboard.awardMiniGame(gameId, coins); } catch (e) {}
    if (el) el.textContent = r && r.paid ? `🪙 +${r.paid} bonus coins!` : r && r.capped ? "Daily bonus for this game already collected — come back tomorrow!" : "";
    return r;
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
  }
  function signedIn() {
    const p = window.AIGPlayer && AIGPlayer.getPlayer();
    return p && p.role !== "parent" ? p : null;
  }
  function signedOutHtml(emoji) {
    return `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${emoji || "🎮"}</div><p class="kit-sub">Please sign in from the hub first.</p><a href="../" class="kit-btn block">Back to Hub</a></div></div>`;
  }
  async function ready() {
    try { if (window.AIGQuestionPools) await Promise.race([AIGQuestionPools.ensurePools(), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  }

  window.AIGKit = { rand, shuffle, esc, question, mathQuestion, buildMc, record, finish, mount, signedIn, signedOutHtml, ready };
})();
