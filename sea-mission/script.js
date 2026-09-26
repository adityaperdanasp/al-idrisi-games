/* =================================================================
   Sea Mission (PM round 14, item 12) -- sail a boat up a 3-lane sea.
   Sea monsters swim down the lanes: answer a question right and your
   cannon sinks the closest one (boat level 3+ sinks two, level 5 three).
   Big waves also roll down a lane -- steer out of their way or lose hull.
   Boats come from the shared vehicle catalogue (vehicles.js, "boat"
   category): the Garage shows/upgrades them, and their level here = cannon
   power. Waves speed up; every 5 waves is a bigger swarm.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const MONSTERS = ["🦈", "🐙", "🦑", "🐊", "🐋"];

if (!player) $("sm-overlay").innerHTML = K.signedOutHtml("⛵");
else K.ready().then(pick);

async function pick() {
  // Free starter boat is always available; others are the ones you own or rent in the Garage.
  const owned0 = await LB.getOwnedVehicles("mathville");
  for (const sk of VEHICLE_SKINS.boat) if (!sk.cost && !owned0[sk.id]) await LB.unlockVehicle("mathville", sk.id, {});
  const g = await LB.getGarage();
  const now = Date.now();
  const boats = VEHICLE_SKINS.boat.filter(b => !b.cost || g.owned[b.id] || g.rentals[b.id] > now);
  const saved = localStorage.getItem("aig_sea_boat");
  let chosen = boats.find(b => b.id === saved) || boats[0];
  $("sm-msg").textContent = "";
  $("sm-q").innerHTML = "";
  $("sm-opts").innerHTML = "";
  $("sm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">⛵</div><h2>Choose your boat</h2><p class="kit-sub">Level up boats in the 🔧 Garage — a higher level makes your cannon sink more monsters per right answer.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">${boats.map(b => `<button data-b="${b.id}" class="kit-opt" style="padding:6px 2px;${b.id === chosen.id ? "border-color:#0369a1;background:#dbeafe" : ""}"><span style="display:block;height:44px;display:grid;place-items:center">${b.svg}</span><small>${K.esc(b.name)}<br>Lv ${(g.levels[b.id] || 1)}</small></button>`).join("")}</div>
    <button class="kit-btn block" id="sm-go">Set sail!</button><a class="kit-btn alt block" href="../garage/">🔧 Garage</a></div></div>`;
  $("sm-overlay").querySelectorAll("[data-b]").forEach(b => b.onclick = () => { chosen = boats.find(x => x.id === b.dataset.b); localStorage.setItem("aig_sea_boat", chosen.id); $("sm-overlay").querySelectorAll("[data-b]").forEach(x => { x.style.borderColor = ""; x.style.background = ""; }); b.style.borderColor = "#0369a1"; b.style.background = "#dbeafe"; });
  $("sm-go").onclick = () => { $("sm-overlay").innerHTML = ""; play(chosen, g.levels[chosen.id] || 1, (g.paints && g.paints[chosen.id]) || {}); };
}

function play(boat, level, paint) {
  const maxHull = 5;
  const st = { hull: maxHull, lane: 1, wave: 1, kills: 0, objs: [], nextSpawn: 900, toSpawn: 0, pause: 0, pendingBegin: false, over: false, q: null, locked: false, id: 1 };
  const power = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const sea = $("sm-sea"), boatEl = $("sm-boat");
  boatEl.innerHTML = boat.svg;
  if (paint.hue) boatEl.firstElementChild.style.filter = `hue-rotate(${paint.hue}deg)`;
  const setLane = l => { st.lane = Math.max(0, Math.min(2, l)); boatEl.style.left = (st.lane * 33.33) + "%"; };
  const hull = () => { $("sm-hull").textContent = "🛟".repeat(Math.max(0, st.hull)) + "▫️".repeat(Math.max(0, maxHull - st.hull)); };
  setLane(1); hull();
  $("sm-left").onclick = () => setLane(st.lane - 1);
  $("sm-right").onclick = () => setLane(st.lane + 1);
  document.addEventListener("keydown", e => { if (e.key === "ArrowLeft") setLane(st.lane - 1); if (e.key === "ArrowRight") setLane(st.lane + 1); });

  function beginWave() { st.toSpawn = 4 + st.wave * 2; st.nextSpawn = 900; $("sm-wave").textContent = st.wave; $("sm-msg").textContent = `🌊 Wave ${st.wave}${st.wave % 5 === 0 ? " — a big swarm!" : ""}`; }
  function spawn() {
    const lane = K.rand(0, 2), isWave = Math.random() < 0.28;
    const el = document.createElement("div");
    el.className = "sm-obj"; el.style.left = (lane * 33.33) + "%"; el.style.top = "-6%";
    el.textContent = isWave ? "🌊" : MONSTERS[K.rand(0, MONSTERS.length - 1)];
    if (isWave) el.style.fontSize = "2.6rem";
    sea.appendChild(el);
    st.objs.push({ id: st.id++, lane, y: -6, wave: isWave, el });
  }
  function nextQuestion() {
    st.q = K.question({ difficulty: st.wave > 4 ? "hard" : "medium" }); st.locked = false;
    $("sm-q").textContent = st.q.prompt;
    $("sm-opts").innerHTML = st.q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("");
    $("sm-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => answer(b));
  }
  function boom(lane, y) { const b = document.createElement("div"); b.className = "sm-boom"; b.textContent = "💥"; b.style.left = (lane * 33.33 + 12) + "%"; b.style.top = y + "%"; sea.appendChild(b); setTimeout(() => b.remove(), 500); }
  function answer(btn) {
    if (st.locked || st.over) return; st.locked = true;
    const ok = btn.dataset.o === st.q.correctLabel;
    K.record("sea-mission", st.q.key, ok, st.q);
    $("sm-opts").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === st.q.correctLabel) x.classList.add("right"); });
    if (ok) {
      const targets = st.objs.filter(o => !o.wave).sort((a, b) => b.y - a.y).slice(0, power); // closest monsters first
      targets.forEach(t => { boom(t.lane, t.y); t.el.remove(); st.objs = st.objs.filter(o => o !== t); st.kills++; });
      $("sm-kills").textContent = st.kills; $("sm-msg").textContent = targets.length ? `💥 Cannon fired${power > 1 ? ` (Lv ${level}: ${power} shots)` : ""}!` : "No monsters in range yet — nice aim!";
    } else { btn.classList.add("wrong"); $("sm-msg").textContent = `The cannon jammed! Answer: ${st.q.correctLabel}`; }
    setTimeout(nextQuestion, ok ? 500 : 1600);
  }
  let last = performance.now();
  const loop = setInterval(() => {
    if (st.over) return;
    const now = performance.now(), dt = Math.min(120, now - last); last = now;
    if (st.pause > 0) { st.pause -= dt; if (st.pause <= 0 && st.pendingBegin) { st.pendingBegin = false; beginWave(); } return; }
    if (st.toSpawn > 0) { st.nextSpawn -= dt; if (st.nextSpawn <= 0) { spawn(); st.toSpawn--; st.nextSpawn = Math.max(700, 2300 - st.wave * 140) + K.rand(0, 500); } }
    else if (!st.objs.length) { st.wave++; st.pause = 1600; st.pendingBegin = true; $("sm-msg").textContent = `✅ Wave ${st.wave - 1} cleared!`; return; }
    const speed = Math.min(30, 12 + st.wave * 2.2); // % of the sea per second
    st.objs.forEach(o => {
      o.y += speed * (o.wave ? 1.25 : 1) * dt / 1000;
      o.el.style.top = o.y + "%";
      if (o.y >= 84) {
        st.objs = st.objs.filter(x => x !== o); o.el.remove();
        if (o.wave) { if (o.lane === st.lane) { st.hull--; $("sm-msg").textContent = "🌊 A wave hit your boat!"; boom(o.lane, 84); hull(); } else $("sm-msg").textContent = "🌊 You steered clear of a wave!"; }
        else { st.hull--; $("sm-msg").textContent = "🦈 A monster bumped your hull!"; boom(o.lane, 84); hull(); }
        if (st.hull <= 0) end();
      }
    });
  }, 50);

  async function end() {
    st.over = true; clearInterval(loop);
    const coins = Math.min(22, Math.floor(st.kills * 1.2) + st.wave);
    $("sm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${st.wave >= 5 ? "🏆" : "⛵"}</div><h2>Your boat sank!</h2><p class="kit-sub">You reached wave ${st.wave} and sank ${st.kills} monster${st.kills === 1 ? "" : "s"} with ${K.esc(boat.name)} (Lv ${level}).</p><div class="kit-bonus" id="sm-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Sail again</button><a class="kit-btn alt block" href="../garage/">🔧 Upgrade my boat</a></div></div>`;
    K.finish("sea-mission", coins, $("sm-bonus"));
  }
  nextQuestion(); beginWave();
}
