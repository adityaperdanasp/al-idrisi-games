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
const STAGE_NAME = ["Belum dicoba", "Baru ketemu", "Sedang tumbuh", "Dikuasai!"];
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
  const dayLine = dc.today || dc.yesterday ? `Hari ini ${dc.today} jawaban benar · kemarin ${dc.yesterday}${dc.today > dc.yesterday ? " 🔥 kamu lebih banyak!" : dc.today === dc.yesterday && dc.today ? " 👏 sama kemarin" : ""}` : "Belum ada jawaban hari ini. Yuk mulai!";
  const hero = pct >= 60 ? "🌳" : pct >= 25 ? "🪴" : mastered ? "🌿" : "🌱";
  const list = ws.filter(w => filter === "all" || (filter === "school" ? w.school : filter === "grow" ? w.stage === 1 || w.stage === 2 : filter === "done" ? w.stage === 3 : w.stage === 0));
  $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">${hero}</div>
      <div class="kit-q">${mastered} dari ${ws.length} kata sudah tumbuh jadi 🌸</div>
      <div class="wg-bar"><i style="width:${Math.max(2, pct)}%"></i></div>
      <div class="kit-sub" style="margin:0">🌿 ${growing} sedang tumbuh · 🌱 ${seen} baru ketemu · 🌰 ${ws.length - mastered - growing - seen} belum dicoba</div>
      <div class="kit-sub" style="margin:6px 0 0">Tangga kata: Level ${lvl}/3 ${lvl < 3 ? "(kuasai " + (lvl === 1 ? 10 : 30) + " kata untuk membuka kata yang lebih panjang)" : "(semua kata terbuka!)"}</div>
      <div class="kit-sub" style="margin:6px 0 0">${esc(dayLine)}</div></div>
    <div class="kit-card"><div class="wg-chips">${[["all", "Semua"], ["grow", "Sedang tumbuh"], ["done", "Dikuasai 🌸"], ["new", "Belum dicoba"], ["school", "Dari sekolah ⭐"]].map(([k, l]) => `<button type="button" class="wg-chip ${filter === k ? "on" : ""}" data-f="${k}">${l}</button>`).join("")}</div>
      <div class="wg-grid">${list.map(w => `<button type="button" class="wg-tile s${w.stage}" data-w="${esc(w.w)}">${w.school ? '<span class="wg-sch">⭐</span>' : ""}<span class="wg-em">${STAGE_EM[w.stage]}</span>${esc(w.w)}</button>`).join("") || '<div class="kit-sub">Belum ada kata di sini.</div>'}</div></div>`;
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
    <div class="wg-say"><button class="kit-btn" id="wg-hear" type="button">🔊 Dengar</button><button class="kit-btn" id="wg-slow" type="button">🐢 Pelan</button></div>
    ${X.EX[word] ? note("wg-ex", `✏️ <i>${esc(X.EX[word])}</i>`) : ""}
    ${X.TIP[word] ? note("wg-tip", `💡 <b>Trik ingat:</b> ${esc(X.TIP[word])}`) : ""}
    ${X.FACT[word] ? note("wg-fact", `🔎 <b>Tahukah kamu?</b> ${esc(X.FACT[word])}`) : ""}
    <div class="kit-sub">${STAGE_NAME[st]} · benar ${p.ok}× · salah ${p.miss}× · ${p.st}/3 benar berturut-turut</div>
    <button class="kit-btn block" id="wg-close" type="button">Tutup</button></div></div>`;
  $("wg-hear").onclick = () => SP().say(word); $("wg-slow").onclick = () => SP().say(word, true);
  $("wg-close").onclick = () => { $("wg-overlay").innerHTML = ""; };
  $("wg-mod").onclick = ev => { if (ev.target.id === "wg-mod") $("wg-overlay").innerHTML = ""; };
}

/* ------------------------------ practice ------------------------------ */
function practice() {
  const weak = Object.keys(SP().weak()).length;
  $("wg-main").innerHTML = `<div class="kit-card"><div class="kit-q">Pilih latihan</div>
    <button class="kit-btn block" data-m="revenge" type="button">🔥 Ronde Balas Dendam — ${weak ? weak + " kata yang pernah salah" : "belum ada kata salah, latihan campur"}</button>
    <button class="kit-btn block" data-m="bee" type="button">🐝 Spelling Bee — dengar & ketik, 3 nyawa, ada timer</button>
    <button class="kit-btn block" data-m="duel" type="button">👨‍👧 Duel dengan Papa/Mama — gantian di tablet ini</button>
    <button class="kit-btn block" data-m="ten" type="button">🌱 Latihan 10 kata</button></div>`;
  document.querySelectorAll("[data-m]").forEach(b => b.onclick = () => start(b.dataset.m));
}

function start(mode) {
  if (mode === "revenge") { const r = SP().buildRevenge(6); play({ title: "🔥 Ronde Balas Dendam", qs: r.questions, record: true, intro: r.weakCount ? `Kita kalahkan ${r.weakCount} kata yang pernah salah!` : "Belum ada kata yang salah, jadi ini latihan campur." }); }
  else if (mode === "bee") play({ title: "🐝 Spelling Bee", qs: SP().buildBee(10), record: true, lives: 3, secs: 25, autoSay: true, intro: "Dengarkan kata, lalu ketik ejaannya sebelum waktu habis." });
  else if (mode === "ten") play({ title: "🌱 Latihan 10 kata", qs: SP().buildSession(10), record: true });
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
      <div class="kit-sub">Skor: ${score} dari ${qs.length}${lives && !lives ? " · nyawa habis" : ""}</div>
      ${missed.length ? `<div class="kit-sub">Kata yang perlu dilatih lagi: <b>${missed.map(esc).join(", ")}</b></div>` : '<div class="kit-sub">Semua benar. Keren sekali! 🌸</div>'}
      <button class="kit-btn block" id="wg-again" type="button">Main lagi</button><button class="kit-btn block" id="wg-back" type="button">Kembali ke kebun</button></div>`;
    $("wg-again").onclick = () => practice(); $("wg-back").onclick = () => { document.querySelectorAll(".wg-tab")[0].click(); };
  };
  const show = () => {
    clearInterval(timer);
    if (i >= qs.length || (cfg.lives && lives <= 0)) return finish();
    const q = qs[i];
    const typed = q.type === "fill";
    $("wg-main").innerHTML = `<div class="kit-card">
      <div class="wg-hud"><span>${esc(cfg.title)} · ${i + 1}/${qs.length}</span><span>${cfg.lives ? "❤️".repeat(Math.max(0, lives)) + " " : ""}⭐ ${score}</span></div>
      ${cfg.secs ? '<div class="wg-time"><i id="wg-time"></i></div>' : ""}
      ${i === 0 && cfg.intro ? `<div class="kit-sub">${esc(cfg.intro)}</div>` : ""}
      <div class="wg-q">${q.prompt}</div>
      ${typed ? `<input class="wg-in" id="wg-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Ketik kata di sini"><button class="kit-btn block" id="wg-check" type="button">Cek jawaban</button>`
              : `<div class="wg-opts">${q.options.map(o => `<button class="wg-opt" type="button" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}
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
      $("wg-after").innerHTML = `<div class="wg-fb">${ok ? "✅ Benar!" : "❌ " + (given === null ? "Waktu habis. " : "") + "Jawabannya: <b>" + esc(q.answer) + "</b>"}</div>${tip.replace(/sp-note sp-/g, "wg-note wg-")}<button class="kit-btn block" id="wg-next" type="button">${i + 1 >= qs.length || (cfg.lives && lives <= 0) ? "Selesai" : "Lanjut"}</button>`;
      document.querySelectorAll(".wg-opt").forEach(b => { b.disabled = true; if (b.dataset.o === q.answer) b.classList.add("ok"); else if (b.dataset.o === given) b.classList.add("bad"); });
      const inp = $("wg-in"); if (inp) { inp.disabled = true; const c = $("wg-check"); if (c) c.disabled = true; }
      $("wg-next").onclick = () => { i++; show(); };
    };
    if (typed) {
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
  $("wg-main").innerHTML = `<div class="kit-card"><div class="kit-q">👨‍👧 Duel Kata</div><div class="kit-sub">Azka main dulu 5 kata, lalu tablet diserahkan. Soal yang sama! Skor Papa/Mama tidak dicatat di akun Azka.</div>
    <input class="wg-in" id="wg-pname" value="Papa" maxlength="12" style="font-size:1rem"><button class="kit-btn block" id="wg-go" type="button">Mulai!</button></div>`;
  $("wg-go").onclick = () => {
    const other = ($("wg-pname").value.trim() || "Papa").slice(0, 12);
    const s = SP(); const used = []; const qs = [];
    while (qs.length < 5) { const e = s.chooseWord ? s.chooseWord(used) : null; const ent = e || s.WORDS[Math.floor(Math.random() * s.WORDS.length)]; used.push(ent.w); qs.push(Math.random() < 0.5 ? s.typedMissing(ent) : s.typedScramble(ent)); }
    const turn = (who, isMe, next) => {
      $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">${isMe ? "🧒" : "🧑"}</div><div class="wg-who">Giliran ${esc(who)}!</div><div class="kit-sub">Serahkan tablet ke ${esc(who)}, lalu tekan mulai.</div><button class="kit-btn block" id="wg-t" type="button">Mulai giliran</button></div>`;
      $("wg-t").onclick = () => play({ title: who, qs: qs.map(q => Object.assign({}, q)), record: isMe }, next);
    };
    turn(player.name || "Azka", true, r1 => turn(other, false, r2 => {
      const w = r1.score === r2.score ? "Seri! 🤝" : r1.score > r2.score ? (player.name || "Azka") + " menang! 🏆" : other + " menang! 🏆";
      try { AIGJoy && AIGJoy.confetti && AIGJoy.confetti(30); } catch (e) {}
      $("wg-main").innerHTML = `<div class="kit-card wg-hero"><div class="wg-big">🎉</div><div class="kit-q">${esc(w)}</div><div class="kit-sub">${esc(player.name || "Azka")}: ${r1.score}/5 · ${esc(other)}: ${r2.score}/5</div><button class="kit-btn block" id="wg-b" type="button">Kembali</button></div>`;
      $("wg-b").onclick = () => practice();
    }));
  };
}

if (!player) $("wg-main").innerHTML = K.signedOutHtml("🌱"); else init();
