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
  let stam = maxStam, n = 0, right = 0, q = null, locked = false, shield = !!sp.shield;
  const dino = $("dr-dino");
  dino.textContent = look(sp, sp.stage); dino.style.fontSize = (3 + sp.stage * 0.35) + "rem";
  const hearts = () => { $("dr-hp").textContent = "❤️".repeat(Math.max(0, stam)) + "🖤".repeat(Math.max(0, maxStam - stam)); };
  function nextGate() {
    if (n >= 12 || stam <= 0) return finish();
    n++; locked = false; $("dr-n").textContent = n;
    const g = $("dr-gate"); g.textContent = GATES[K.rand(0, GATES.length - 1)]; g.classList.remove("go"); void g.offsetWidth; g.classList.add("go");
    q = K.question({ difficulty: n > 8 ? "hard" : "medium" });
    $("dr-q").textContent = q.prompt; $("dr-msg").textContent = "";
    $("dr-opts").innerHTML = q.options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("");
    $("dr-opts").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => answer(b));
  }
  function answer(btn) {
    if (locked) return; locked = true;
    const ok = btn.dataset.o === q.correctLabel;
    K.record("dino-rider", q.key, ok, q);
    $("dr-opts").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === q.correctLabel) x.classList.add("right"); });
    dino.classList.remove("run");
    if (ok) { right++; $("dr-r").textContent = right; dino.classList.add("jump"); $("dr-msg").textContent = "🦖 Leap!"; }
    else if (shield) { shield = false; dino.classList.add("jump"); $("dr-msg").textContent = "🦅 Your Ptero flew over it! (free pass used)"; btn.classList.add("wrong"); }
    else { stam--; hearts(); btn.classList.add("wrong"); dino.classList.add("stumble"); $("dr-msg").textContent = `Oof! The answer was ${q.correctLabel}.`; }
    setTimeout(() => { dino.classList.remove("jump", "stumble"); dino.classList.add("run"); nextGate(); }, ok ? 900 : 1900);
  }
  async function finish() {
    $("dr-ground").classList.add("stop"); dino.classList.remove("run");
    const xp = right + (stam > 0 ? 4 : 0);
    const before = sp.stage;
    await LB.addDinoRiderXp(sp.id, xp);
    const after = (await LB.getDinoRider()).species.find(x => x.id === sp.id);
    const coins = Math.min(25, Math.round((right * 1.5 + (stam > 0 ? 5 : 0)) * (sp.coin || 1)));
    $("dr-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${stam > 0 ? "🏆" : "🦖"}</div><h2>${stam > 0 ? "You made it!" : "Out of stamina!"}</h2>
      <p class="kit-sub">${right}/12 gates cleared · +${xp} XP for ${K.esc(sp.name)}${after.stage > before ? `<br><b>🎉 ${K.esc(sp.name)} evolved into a ${STAGE[after.stage]}!</b>` : ""}</p><div class="kit-bonus" id="dr-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Ride again</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    if (after.stage > before && window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 2);
    K.finish("dino-rider", coins, $("dr-bonus"));
  }
  hearts(); nextGate();
}
