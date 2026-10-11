/* =================================================================
   Zombie Math Defense (PM round 11, item 1) -- zombies walk toward your
   house along 3 lanes. A right answer fires a shot that hits the zombie
   closest to the house; a wrong answer jams the gun for 1.5s. Every 5th
   wave is a boss (3 hits). The house has 5 hearts; run out and it's over.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) {
  $("zd-overlay").innerHTML = K.signedOutHtml("🧟");
} else {
  K.ready().then(start);
}

// Audit batch 7: pick a lane to aim (or auto), runner and helmet zombies, planks to build barricades
// (1 per 4 kills), power-ups from kills (💣 bomb a lane, ❄️ freeze everyone), a shotgun streak (5 in a
// row hits 2 zombies for 10s), the night getting darker each wave, and a best-wave record.
function start() {
  const st = { hp: 5, wave: 1, kills: 0, zs: [], toSpawn: 0, spawnIn: 0, bossPending: false, q: null, locked: false, jam: 0, over: false, pause: 0, nextId: 1, aim: -1, planks: 0, bars: [0, 0, 0], bombs: 0, freezes: 0, frozen: 0, streak: 0, shotgun: 0 };
  const bar = document.createElement("div"); bar.className = "zd-bar"; $("zd-field").after(bar);
  function drawBar() {
    bar.innerHTML = `<span>🎯 Aim:</span>${["Auto", "1", "2", "3"].map((l, i) => `<button type="button" data-aim="${i - 1}" class="${st.aim === i - 1 ? "on" : ""}">${l}</button>`).join("")}
      <button type="button" data-bar="1" ${st.planks ? "" : "disabled"}>🪵×${st.planks}</button><button type="button" data-pow="bomb" ${st.bombs ? "" : "disabled"}>💣×${st.bombs}</button><button type="button" data-pow="freeze" ${st.freezes ? "" : "disabled"}>❄️×${st.freezes}</button>${st.shotgun > performance.now() ? "<b>🔫 SHOTGUN!</b>" : ""}`;
    bar.querySelectorAll("[data-aim]").forEach(b => b.onclick = () => { st.aim = +b.dataset.aim; drawBar(); });
    const pb = bar.querySelector("[data-bar]"); if (pb) pb.onclick = () => { if (!st.planks) return; const lane = st.aim >= 0 ? st.aim : st.bars.indexOf(Math.min(...st.bars)); st.planks--; st.bars[lane] = 3; drawBars(); drawBar(); banner(`🪵 Barricade in lane ${lane + 1}!`, 900); };
    bar.querySelectorAll("[data-pow]").forEach(b => b.onclick = () => { const k = b.dataset.pow;
      if (k === "bomb" && st.bombs) { st.bombs--; const lane = st.aim >= 0 ? st.aim : (front() || { lane: 0 }).lane; st.zs.filter(z => z.lane === lane && !z.boss).forEach(z => { z.hp = 1; shoot(z); }); banner(`💣 Lane ${lane + 1} cleared!`, 900); }
      if (k === "freeze" && st.freezes) { st.freezes--; st.frozen = performance.now() + 4000; banner("❄️ Frozen!", 900); }
      drawBar(); });
  }
  function drawBars() { $("zd-field").querySelectorAll(".zd-barr").forEach(e => e.remove()); st.bars.forEach((h, i) => { if (h > 0) { const e = document.createElement("div"); e.className = "zd-barr"; e.style.top = (i * LANE_H + 6) + "px"; e.textContent = "🪵".repeat(Math.ceil(h / 1.5)); $("zd-field").appendChild(e); } }); }
  const LANES = 3, LANE_H = 62;

  function hearts() { $("zd-hp").textContent = "❤️".repeat(Math.max(0, st.hp)) + "🖤".repeat(Math.max(0, 5 - st.hp)); }
  function banner(t, ms) { $("zd-banner").textContent = t; if (ms) setTimeout(() => { if ($("zd-banner").textContent === t) $("zd-banner").textContent = ""; }, ms); }

  function beginWave() {
    st.toSpawn = 3 + st.wave * 2;
    st.bossPending = st.wave % 5 === 0;
    st.spawnIn = 1200;
    $("zd-wave").textContent = st.wave;
    banner(st.bossPending ? `👹 Boss wave ${st.wave}!` : `🌊 Wave ${st.wave}`, 1400);
  }
  function spawn(boss) {
    const lane = K.rand(0, LANES - 1);
    const el = document.createElement("div");
    el.className = "zd-z" + (boss ? " boss" : "");
    const kind = boss ? "boss" : st.wave >= 3 && Math.random() < 0.25 ? "runner" : st.wave >= 2 && Math.random() < 0.25 ? "helmet" : "normal";
    el.textContent = boss ? "👹" : kind === "runner" ? "🏃" : kind === "helmet" ? "⛑️" : ["🧟", "🧟‍♂️", "🧟‍♀️"][K.rand(0, 2)];
    el.style.top = (lane * LANE_H + LANE_H / 2) + "px";
    $("zd-field").appendChild(el);
    const z = { id: st.nextId++, lane, x: 102, hp: boss ? 3 : kind === "helmet" ? 2 : 1, boss, el, kind };
    if (boss) { const b = document.createElement("small"); b.textContent = "3"; el.appendChild(b); z.badge = b; }
    st.zs.push(z);
  }
  function nextQuestion() {
    st.q = K.question({ difficulty: st.wave > 4 ? "hard" : "medium" });
    $("zd-q").textContent = st.q.prompt;
    const box = $("zd-opts"); box.innerHTML = "";
    st.q.options.forEach(o => {
      const b = document.createElement("button");
      b.className = "kit-opt"; b.type = "button"; b.textContent = o;
      b.onclick = () => answer(b, o);
      box.appendChild(b);
    });
    st.locked = false;
  }
  function front() { return st.zs.filter(z => st.aim < 0 || z.lane === st.aim).sort((a, b) => a.x - b.x)[0] || (st.aim >= 0 ? null : null); }
  function shoot(z) {
    const shot = document.createElement("div");
    shot.className = "zd-shot";
    shot.style.left = "9%"; shot.style.top = (z.lane * LANE_H + LANE_H / 2 - 2) + "px"; shot.style.width = "0";
    $("zd-field").appendChild(shot);
    requestAnimationFrame(() => { shot.style.width = Math.max(4, z.x - 9) + "%"; });
    setTimeout(() => { shot.style.opacity = "0"; setTimeout(() => shot.remove(), 300); }, 180);
    z.el.classList.add("hit"); setTimeout(() => z.el.classList.remove("hit"), 120);
    z.hp--;
    if (z.badge) z.badge.textContent = Math.max(0, z.hp);
    if (z.hp <= 0) {
      st.zs = st.zs.filter(q => q !== z);
      z.el.textContent = "💥"; setTimeout(() => z.el.remove(), 220);
      st.kills++; $("zd-kills").textContent = st.kills;
      if (st.kills % 4 === 0) st.planks++;
      if (Math.random() < 0.15) { if (Math.random() < 0.5) st.bombs++; else st.freezes++; banner("🎁 Power-up dropped!", 800); }
      drawBar();
    }
  }
  function answer(btn, opt) {
    if (st.locked || st.over) return;
    st.locked = true;
    const ok = opt === st.q.correctLabel;
    K.record("zombie-defense", st.q.key, ok, st.q);
    btn.classList.add(ok ? "right" : "wrong");
    if (ok) {
      st.streak++; if (st.streak % 5 === 0) { st.shotgun = performance.now() + 10000; banner("🔫 SHOTGUN for 10 seconds!", 1200); drawBar(); }
      const z = front();
      if (z) { shoot(z); if (st.shotgun > performance.now()) { const z2 = st.zs.filter(q => q !== z).sort((a, b) => a.x - b.x)[0]; if (z2) shoot(z2); } } else $("zd-msg").textContent = st.aim >= 0 ? `No zombie in lane ${st.aim + 1} — try Auto!` : "Nothing to shoot yet — nice reflexes!";
      $("zd-msg").textContent = z ? "💥 Direct hit!" : $("zd-msg").textContent;
      setTimeout(nextQuestion, 260);
    } else {
      st.streak = 0;
      $("zd-msg").textContent = `Jammed! The answer was ${st.q.correctLabel}. Reloading…`;
      st.jam = 1500;
      setTimeout(nextQuestion, 1500);
    }
  }

  let last = performance.now();
  const loop = setInterval(() => {
    if (st.over) return;
    const now = performance.now(), dt = Math.min(120, now - last); last = now;
    if (st.pause > 0) { st.pause -= dt; if (st.pause <= 0 && st.pendingBegin) { st.pendingBegin = false; beginWave(); } return; }
    if (st.toSpawn > 0) {
      st.spawnIn -= dt;
      if (st.spawnIn <= 0) {
        const boss = st.bossPending && st.toSpawn === 1;
        spawn(boss); st.toSpawn--;
        st.spawnIn = Math.max(900, 2600 - st.wave * 170) + K.rand(0, 500);
      }
    } else if (!st.zs.length) {
      st.wave++; st.pause = 1800; st.pendingBegin = true; banner(`✅ Wave ${st.wave - 1} cleared!`, 1600);
      $("zd-field").style.filter = `brightness(${Math.max(0.55, 1 - st.wave * 0.06)})`;
      return;
    }
    const speed = Math.min(15, 4.2 + st.wave * 0.7) * (st.frozen > performance.now() ? 0.25 : 1); // % of the field per second
    st.zs.forEach(z => {
      if (st.bars[z.lane] > 0 && z.x <= 22 && z.x > 15) { st.bars[z.lane] -= dt / 1000; if (st.bars[z.lane] <= 0) { st.bars[z.lane] = 0; drawBars(); } return; }
      z.x -= speed * (z.boss ? 0.55 : z.kind === "runner" ? 1.7 : 1) * dt / 1000;
      z.el.style.left = z.x + "%";
      if (z.x <= 10) {
        st.zs = st.zs.filter(q => q !== z); z.el.remove();
        st.hp -= z.boss ? 2 : 1; hearts();
        banner("🏠 Ouch!", 600);
        if (st.hp <= 0) end();
      }
    });
  }, 50);

  async function end() {
    st.over = true; clearInterval(loop);
    try { if (st.wave > Number(localStorage.getItem("zd_best") || 0)) { localStorage.setItem("zd_best", String(st.wave)); K.toastAdv(`New best: wave ${st.wave}!`); } } catch (e) {}
    const coins = Math.min(20, Math.floor(st.kills / 2));
    $("zd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${st.wave >= 5 ? "🏆" : "🧟"}</div><h2>Your house fell!</h2>
      <p class="kit-sub">You reached wave ${st.wave} and stopped ${st.kills} zombie${st.kills === 1 ? "" : "s"}.<br>🏅 Best wave: ${(() => { try { return localStorage.getItem("zd_best") || st.wave; } catch (e) { return st.wave; } })()}</p><div class="kit-bonus" id="zd-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Defend again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("zombie-defense", coins, $("zd-bonus"));
  }

  hearts(); drawBar(); nextQuestion(); beginWave();
  setInterval(() => { if (!st.over && st.shotgun && st.shotgun < performance.now()) { st.shotgun = 0; drawBar(); } }, 1000);
}
