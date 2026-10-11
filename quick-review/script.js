/* =================================================================
   Quick Review (PM round 12, item 17) -- spaced repetition. Every wrong
   multiple-choice answer (in the Game Room games, SolarQuest and Language
   & Arts) is saved and comes back after 1, 3, 7 and 14 days. Answer it
   right at every step and it's MASTERED and leaves the pile. A session is
   up to 8 due questions, about 3 minutes.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const STEP_LABEL = ["Day 1", "Day 3", "Day 7", "Day 14"];
// Audit batch 2: "Night Patrol" -- due questions are cute night mobs; answer right and they run off.
// Torches light up per right answer, sunrise at the end, a patrol day-streak with milestone bonuses,
// an all-clear bonus, an optional speed mode and a mastered-trophy shelf.
const MOBS = ["🧟", "🕷️", "👻", "🦇", "💀", "🐺"];
const lsq = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const dayStr = o => new Date(Date.now() - (o || 0) * 86400000).toISOString().slice(0, 10);
let speed = lsq("qr_speed", "0") === "1";
if (!player) $("qr-overlay").innerHTML = K.signedOutHtml("🔁");
else init();

async function init() {
  const LB = AIGLeaderboard;
  const [stats, due] = await Promise.all([LB.srsStats(), LB.srsDue(8)]);
  $("qr-hud").textContent = `🔁 ${stats.due} due · 📚 ${stats.total} saved · ⭐ ${stats.mastered} mastered`;
  const streak = Number(lsq("qr_streak_n", "0")), lastDay = lsq("qr_streak_day", "");
  $("qr-shelf").innerHTML = `<div class="qr-shelf"><b>🏆 Trophy shelf</b> ${"⭐".repeat(Math.min(stats.mastered, 20))}${stats.mastered > 20 ? ` +${stats.mastered - 20}` : ""}${stats.mastered ? "" : "<small>Master questions to fill it!</small>"}<br><small>🔥 Patrol streak: ${lastDay === dayStr() || lastDay === dayStr(1) ? streak : 0} day(s) · next bonus at ${[3, 7, 14].find(x => x > streak) || 14} days</small></div>`;
  if (!due.length) {
    $("qr-card").innerHTML = `<div class="kit-big" style="text-align:center">🌤️</div><div class="kit-q">Nothing to review right now!</div><p class="kit-sub" style="text-align:center">${stats.total ? `You have ${stats.total} question${stats.total === 1 ? "" : "s"} waiting for their turn — they'll show up when they're due.` : "When you get a question wrong in a game, I'll save it here and bring it back at just the right time so it sticks."}</p><a class="kit-btn block" href="../game-room/">Play something</a>`;
    return;
  }
  $("qr-card").innerHTML = `<div class="kit-big" style="text-align:center">🔁</div><div class="kit-q">${due.length} question${due.length === 1 ? "" : "s"} ready for review</div><p class="kit-sub" style="text-align:center">These are ones that were tricky before. Getting them right again makes them stick!</p><button class="kit-btn block" id="qr-go">🌙 Start night patrol (about 3 minutes)</button><label class="qr-sp"><input type="checkbox" id="qr-speed" ${speed ? "checked" : ""}> ⚡ Speed mode (10 seconds per mob)</label>`;
  $("qr-speed").onchange = e => { speed = e.target.checked; lsw("qr_speed", speed ? "1" : "0"); };
  $("qr-go").onclick = () => run(due);

  function run(items) {
    let i = 0, right = 0, mastered = 0, tmr = null;
    document.body.classList.add("qr-night");
    const ask = () => {
      clearInterval(tmr);
      if (i >= items.length) return done();
      const it = items[i], mob = MOBS[i % MOBS.length];
      $("qr-card").innerHTML = `<div class="qr-torches">${Array.from({ length: items.length }, (_, k) => `<i class="${k < right ? "lit" : ""}">${k < right ? "🔥" : "🕯️"}</i>`).join("")}</div><div class="qr-mob" id="qr-mob">${mob}</div>${speed ? '<div class="kit-bar" style="margin:6px 0"><i id="qr-t"></i></div>' : ""}<span class="qr-step">${STEP_LABEL[it.step || 0]} review · mob ${i + 1}/${items.length}</span><div class="kit-q">${K.esc(it.p)}</div><div class="kit-opts">${K.shuffle(it.o).map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="qr-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div>`;
      if (speed) { let left = 10; tmr = setInterval(() => { left -= 0.1; const t = $("qr-t"); if (t) t.style.width = Math.max(0, left * 10) + "%"; if (left <= 0) { clearInterval(tmr); const w = [...$("qr-card").querySelectorAll(".kit-opt")].find(x => x.dataset.o !== it.a); if (w) w.click(); } }, 100); }
      $("qr-card").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        clearInterval(tmr);
        const ok = b.dataset.o === it.a;
        const mb = $("qr-mob"); if (mb) mb.classList.add(ok ? "flee" : "stay");
        $("qr-card").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === it.a) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        try { if (window.AIGJuice) AIGJuice.answer(ok, right); } catch (e) {}
        const r = await LB.srsResult(it.id, ok);
        if (ok) { right++; if (r.mastered) mastered++; }
        $("qr-msg").textContent = ok ? (r.mastered ? "⭐ Mastered! It won't come back." : `✅ Nice! I'll ask again in ${[3, 7, 14][r.step - 1] || 14} days.`) : `Not yet — it was “${it.a}”. I'll bring it back tomorrow.`;
        setTimeout(() => { i++; ask(); }, ok ? 1100 : 2200);
      });
    };
    async function done() {
      $("qr-card").innerHTML = ""; document.body.classList.remove("qr-night"); document.body.classList.add("qr-morning");
      // patrol streak + milestone bonuses + all-clear bonus (each once)
      let extra = 0; const last = lsq("qr_streak_day", ""); let n = Number(lsq("qr_streak_n", "0"));
      if (last !== dayStr()) { n = last === dayStr(1) ? n + 1 : 1; lsw("qr_streak_n", String(n)); lsw("qr_streak_day", dayStr()); if ([3, 7, 14].includes(n) && lsq("qr_ms_" + n, "") !== "1") { lsw("qr_ms_" + n, "1"); extra += n === 3 ? 5 : n === 7 ? 10 : 20; K.toastAdv(`${n}-day patrol streak!`); } }
      try { const left = await LB.srsStats(); if (!left.due && lsq("qr_clear", "") !== dayStr()) { lsw("qr_clear", dayStr()); extra += 5; } } catch (e) {}
      if (extra) { try { await LB.creditWallet({ coins: extra }); } catch (e) {} }
      $("qr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${mastered ? "⭐" : "🔁"}</div><h2>☀️ Morning! Patrol done</h2><p class="kit-sub">${right}/${items.length} mobs chased away${mastered ? ` · ${mastered} mastered` : ""}. Coming back to things is how memories get strong.${extra ? `<br><b>🎁 +${extra} patrol bonus coins!</b>` : ""}</p><div class="kit-bonus" id="qr-bonus"></div>
        <a class="kit-btn block" href="../">Back to hub</a></div></div>`;
      K.finish("quick-review", right * 2 + mastered * 2, $("qr-bonus"));
    }
    ask();
  }
}
