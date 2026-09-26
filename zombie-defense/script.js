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

function start() {
  const st = { hp: 5, wave: 1, kills: 0, zs: [], toSpawn: 0, spawnIn: 0, bossPending: false, q: null, locked: false, jam: 0, over: false, pause: 0, nextId: 1 };
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
    el.textContent = boss ? "👹" : ["🧟", "🧟‍♂️", "🧟‍♀️"][K.rand(0, 2)];
    el.style.top = (lane * LANE_H + LANE_H / 2) + "px";
    $("zd-field").appendChild(el);
    const z = { id: st.nextId++, lane, x: 102, hp: boss ? 3 : 1, boss, el };
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
  function front() { return st.zs.slice().sort((a, b) => a.x - b.x)[0] || null; }
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
    }
  }
  function answer(btn, opt) {
    if (st.locked || st.over) return;
    st.locked = true;
    const ok = opt === st.q.correctLabel;
    K.record("zombie-defense", st.q.key, ok, st.q);
    btn.classList.add(ok ? "right" : "wrong");
    if (ok) {
      const z = front();
      if (z) shoot(z); else $("zd-msg").textContent = "Nothing to shoot yet — nice reflexes!";
      $("zd-msg").textContent = z ? "💥 Direct hit!" : $("zd-msg").textContent;
      setTimeout(nextQuestion, 260);
    } else {
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
      return;
    }
    const speed = Math.min(15, 4.2 + st.wave * 0.7); // % of the field per second
    st.zs.forEach(z => {
      z.x -= speed * (z.boss ? 0.55 : 1) * dt / 1000;
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
    const coins = Math.min(20, Math.floor(st.kills / 2));
    $("zd-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${st.wave >= 5 ? "🏆" : "🧟"}</div><h2>Your house fell!</h2>
      <p class="kit-sub">You reached wave ${st.wave} and stopped ${st.kills} zombie${st.kills === 1 ? "" : "s"}.</p><div class="kit-bonus" id="zd-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Defend again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("zombie-defense", coins, $("zd-bonus"));
  }

  hearts(); nextQuestion(); beginWave();
}
