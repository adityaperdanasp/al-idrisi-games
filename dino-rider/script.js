/* =================================================================
   Dino Rider (PM round 14, item 13) -- ride a dino through 12 gates. A
   right answer makes it leap the gate; a wrong one makes it stumble (lose
   stamina). Pick a species (unlock more with coins/gems); riding earns it
   XP and it evolves at 30 and 100 XP with a new look. Perks: extra
   stamina, a free "flew over" mistake (Ptero), bonus coins (Spino / Mega).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const GATES = ["🪨", "🌳", "🚧", "🪵", "🌋", "🏔️"];
const look = (sp, stage) => stage === 1 ? sp.emoji : stage === 2 ? sp.emoji + "💨" : "👑" + sp.emoji + "🔥";
const STAGE = ["", "Hatchling", "Adult", "Legend"];
let species = [], chosen = "raptor";
// Audit batch 7: between gates the dino RUNS and you tap JUMP over rocks (real timing), biomes change
// every 4 gates, Rex can ROAR past one gate, a 4-streak finds a dino egg (3 eggs hatch into bonus XP),
// gate 12 is a meteor shower (timed questions), and you can keep riding in Endless after gate 12.
const BIOMES = [["🌴", "linear-gradient(#bfe3ff,#e8f6d4)"], ["🌋", "linear-gradient(#ffb38a,#5a2a1a)"], ["❄️", "linear-gradient(#e8f6ff,#bcd8ef)"], ["🏜️", "linear-gradient(#ffe2a8,#f0c070)"]];
const lsr = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsrw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

if (!player) $("dr-overlay").innerHTML = K.signedOutHtml("🦖");
else K.ready().then(pick);

async function pick() {
  const d = await LB.getDinoRider();
  species = d.species;
  $("dr-play").hidden = true;
  const wal = await LB.getWallet();
  $("dr-pick").innerHTML = `<div class="kit-card"><div class="kit-q">Choose your dino</div><div class="kit-sub" style="text-align:center;margin:0 0 8px">🪙 ${wal.coins || 0}   💎 ${wal.gems || 0} — riding makes it grow and evolve!</div>
    <div class="dr-sp">${species.map(sp => `<button class="dr-s ${chosen === sp.id ? "sel" : ""}" data-id="${sp.id}"><span class="e">${K.esc(look(sp, sp.stage))}</span>${K.esc(sp.name)}<small>${sp.owned ? `${STAGE[sp.stage]} · ${sp.xp} XP${sp.nextXp ? " / " + sp.nextXp : " (max)"}` : "🔒 " + (sp.cost.coins ? "🪙" + sp.cost.coins : "💎" + sp.cost.gems)}<br>${K.esc(sp.note)}</small></button>`).join("")}</div>
    <button class="kit-btn block" id="dr-go" style="margin-top:12px">Ride! 🦖</button><div class="kit-bonus" id="dr-msg0"></div></div>`;
  $("dr-pick").querySelectorAll(".dr-s").forEach(b => b.onclick = async () => {
    const sp = species.find(x => x.id === b.dataset.id);
    if (!sp.owned) { const r = await LB.unlockDinoRider(sp.id); if (!r.ok) { $("dr-msg0").textContent = "Not enough coins/gems yet — keep playing!"; return; } if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); chosen = sp.id; return pick(); }
    chosen = sp.id; pick();
  });
  $("dr-go").onclick = () => { const sp = species.find(x => x.id === chosen); if (sp && sp.owned) ride(sp); };
}

function ride(sp) {
  $("dr-pick").innerHTML = ""; $("dr-play").hidden = false;
  const maxStam = 3 + (sp.stage - 1) + sp.stam;
  let stam = maxStam, n = 0, right = 0, q = null, locked = false, shield = !!sp.shield, streak = 0, roar = sp.id === "raptor" || /rex/i.test(sp.name), endless = false, rockT = null, jumping = false, tmr = null;
  const scene = document.querySelector(".dr-scene");
  const jb = document.createElement("button"); jb.className = "kit-btn dr-jump"; jb.type = "button"; jb.textContent = "⬆️ JUMP"; scene.after(jb);
  jb.onclick = () => { if (jumping) return; jumping = true; dino.classList.add("jump"); setTimeout(() => { jumping = false; dino.classList.remove("jump"); }, 650); };
  const rb = document.createElement("button"); rb.className = "kit-btn alt dr-roar"; rb.type = "button"; rb.textContent = "🦖 ROAR (skip a gate)"; rb.hidden = !roar; jb.after(rb);
  rb.onclick = () => { if (!roar || locked) return; roar = false; rb.hidden = true; locked = true; $("dr-msg").textContent = "🦖 ROAAAR! The gate crumbles!"; dino.classList.add("jump"); setTimeout(() => { dino.classList.remove("jump"); runSegment(); }, 900); };
  function runSegment() {
    // a short run with 2 rocks to jump before the next gate
    $("dr-opts").innerHTML = ""; $("dr-q").textContent = "🏃 Run! Tap JUMP when a rock reaches your dino!";
    let rocks = 0; const spawn = () => { if (rocks >= 2) { setTimeout(nextGate, 900); return; } rocks++;
      const r = document.createElement("span"); r.className = "dr-rock"; r.textContent = "🪨"; scene.appendChild(r);
      let x = 100; const step = () => { x -= 2.2; r.style.left = x + "%"; if (x < 22 && x > 12 && !r.dataset.hit) { r.dataset.hit = 1; if (!jumping) { stam--; hearts(); dino.classList.add("stumble"); $("dr-msg").textContent = "Ouch! Jump earlier next time."; setTimeout(() => dino.classList.remove("stumble"), 600); if (stam <= 0) { r.remove(); return finish(); } } else $("dr-msg").textContent = "🦖 Nice jump!"; }
        if (x < -10) { r.remove(); setTimeout(spawn, 500); return; } rockT = requestAnimationFrame(step); }; rockT = requestAnimationFrame(step); };
    spawn();
  }
  const dino = $("dr-dino");
  dino.textContent = look(sp, sp.stage); dino.style.fontSize = (3 + sp.stage * 0.35) + "rem";
  const hearts = () => { $("dr-hp").textContent = "❤️".repeat(Math.max(0, stam)) + "🖤".repeat(Math.max(0, maxStam - stam)); };
  function nextGate() {
    clearInterval(tmr);
    if ((n >= 12 && !endless) || stam <= 0) { if (n >= 12 && !endless && stam > 0) return offerEndless(); return finish(); }
    n++; locked = false; $("dr-n").textContent = endless ? n + " (endless)" : n;
    const bi = BIOMES[Math.floor((n - 1) / 4) % BIOMES.length]; scene.style.background = bi[1]; if ((n - 1) % 4 === 0) $("dr-msg").textContent = `${bi[0]} A new land!`;
    const meteor = n === 12 && !endless;
    const g = $("dr-gate"); g.textContent = GATES[K.rand(0, GATES.length - 1)]; g.classList.remove("go"); void g.offsetWidth; g.classList.add("go");
    q = K.question({ difficulty: n > 8 ? "hard" : "medium" });
    $("dr-q").textContent = (meteor ? "☄️ METEOR SHOWER! 7 seconds — " : "") + q.prompt; if (!meteor) $("dr-msg").textContent = "";
    if (meteor) { let t = 7; tmr = setInterval(() => { t -= 0.1; if (t <= 0) { clearInterval(tmr); const w = [...$("dr-opts").querySelectorAll(".kit-opt")].find(x => x.dataset.o !== q.correctLabel); if (w) answer(w); } }, 100); }
    $("dr-opts").innerHTML = q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("");
    $("dr-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => answer(b));
  }
  function answer(btn) {
    if (locked) return; locked = true; clearInterval(tmr);
    const ok = btn.dataset.o === q.correctLabel;
    streak = ok ? streak + 1 : 0;
    if (ok && streak > 0 && streak % 4 === 0) { const eggs = Number(lsr("dr_eggs", "0")) + 1; lsrw("dr_eggs", String(eggs)); K.toastAdv(`🥚 You found a dino egg! (${eggs}/3)`); if (eggs >= 3) { lsrw("dr_eggs", "0"); LB.addDinoRiderXp(sp.id, 10).catch(() => {}); setTimeout(() => K.toastAdv("🐣 3 eggs hatched: +10 XP!"), 1500); } }
    K.record("dino-rider", q.key, ok, q);
    $("dr-opts").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
    dino.classList.remove("run");
    if (ok) { right++; $("dr-r").textContent = right; dino.classList.add("jump"); $("dr-msg").textContent = "🦖 Leap!"; }
    else if (shield) { shield = false; dino.classList.add("jump"); $("dr-msg").textContent = "🦅 Your Ptero flew over it! (free pass used)"; btn.classList.add("wrong"); }
    else { stam--; hearts(); btn.classList.add("wrong"); dino.classList.add("stumble"); $("dr-msg").textContent = `Oof! The answer was ${q.correctLabel}.`; }
    setTimeout(() => { dino.classList.remove("jump", "stumble"); dino.classList.add("run"); if (stam <= 0) return finish(); runSegment(); }, ok ? 900 : 1900);
  }
  function offerEndless() {
    $("dr-q").textContent = "🏁 All 12 gates cleared!"; $("dr-opts").innerHTML = `<button class="kit-btn" type="button" id="dr-end" style="grid-column:1/-1">♾️ Keep riding (Endless)</button><button class="kit-btn alt" type="button" id="dr-stop" style="grid-column:1/-1">🏆 Finish the ride</button>`;
    $("dr-end").onclick = () => { endless = true; runSegment(); }; $("dr-stop").onclick = () => finish();
  }
  async function finish() {
    if (finish.done) return; finish.done = true; cancelAnimationFrame(rockT); clearInterval(tmr); jb.remove(); rb.remove();
    if (endless) { const best = Number(lsr("dr_endless", "0")); if (n > best) { lsrw("dr_endless", String(n)); K.toastAdv(`New endless record: gate ${n}!`); } }
    $("dr-ground").classList.add("stop"); dino.classList.remove("run");
    const xp = right + (stam > 0 ? 4 : 0);
    const before = sp.stage;
    await LB.addDinoRiderXp(sp.id, xp);
    const after = (await LB.getDinoRider()).species.find(x => x.id === sp.id);
    const coins = Math.min(25, Math.round((right * 1.5 + (stam > 0 ? 5 : 0)) * (sp.coin || 1)));
    $("dr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${stam > 0 ? "🏆" : "🦖"}</div><h2>${stam > 0 ? "You made it!" : endless ? `Endless run: gate ${n}!` : "Out of stamina!"}</h2>
      <p class="kit-sub">${right}/12 gates cleared · +${xp} XP for ${K.esc(sp.name)}${after.stage > before ? `<br><b>🎉 ${K.esc(sp.name)} evolved into a ${STAGE[after.stage]}!</b>` : ""}</p><div class="kit-bonus" id="dr-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Ride again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    if (after.stage > before && window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 2);
    K.finish("dino-rider", coins, $("dr-bonus"));
  }
  hearts(); nextGate();
}
