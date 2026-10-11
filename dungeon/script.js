/* =================================================================
   Dungeon Crawler (PM round 11, item 10) -- pick a hero, fight up to 5
   floors of monsters. Each turn is one question: right = you hit, wrong =
   the monster hits you. Beat a floor to heal a bit and maybe win gear;
   gear is kept forever (players/{id}/dungeon) and makes every later run
   stronger. Wizard hits harder with science/language answers, Knight takes
   less damage, Archer can crit.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

const CLASSES = {
  knight: { name: "Knight", emoji: "🛡️", hp: 30, atk: 3, desc: "Takes 30% less damage" },
  wizard: { name: "Wizard", emoji: "🧙", hp: 22, atk: 3, desc: "+2 damage on Science & Words" },
  archer: { name: "Archer", emoji: "🏹", hp: 26, atk: 3, desc: "25% chance of a critical hit" }
};
const GEAR = [
  { id: "wood-sword", emoji: "🗡️", name: "Wooden Sword", atk: 1 },
  { id: "buckler", emoji: "🛡️", name: "Buckler", hp: 3 },
  { id: "herb", emoji: "🌿", name: "Healing Herb", heal: 2 },
  { id: "charm", emoji: "🍀", name: "Lucky Charm", crit: 0.12 },
  { id: "iron-sword", emoji: "⚔️", name: "Iron Sword", atk: 2 },
  { id: "spellbook", emoji: "📘", name: "Spell Book", atk: 1, hp: 2 },
  { id: "iron-shield", emoji: "🔰", name: "Iron Shield", hp: 6 },
  { id: "dragon-scale", emoji: "🐲", name: "Dragon Scale", hp: 8, atk: 1 }
];
const MONSTERS = [["👺", "Goblin"], ["🦇", "Giant Bat"], ["🕷️", "Cave Spider"], ["🧌", "Troll"], ["🐲", "Dungeon Dragon"]];
const FLOORS = 5;
// Audit batch 6: a hero skill per floor, a power strike (harder question, double damage), monster
// weaknesses by subject, potions from critical hits, the dragon's fire breath every 3rd turn, a choice of
// door between floors (treasure / fountain / trap) and Endless Depths after the dragon.
const SKILL = { knight: ["🛡️ Shield Bash", "Blocks the next hit"], wizard: ["🔥 Fireball", "Next right answer deals triple damage"], archer: ["🏹 Arrow Rain", "Deal 5 damage right now"] };
const WEAK = { Goblin: "math", "Giant Bat": "sci", "Cave Spider": "lang", Troll: "lang", "Dungeon Dragon": "sci" };
const SUBJ = { math: "maths", lang: "words", sci: "science" };

if (!player) $("dg-overlay").innerHTML = K.signedOutHtml("🗡️");
else init();

async function init() {
  const save = await AIGLeaderboard.getDungeon();
  const owned = save.gear;
  const sum = f => GEAR.filter(g => owned[g.id]).reduce((a, g) => a + (g[f] || 0), 0);
  const gearHtml = `<div class="dg-gear">${GEAR.map(g => `<span class="${owned[g.id] ? "" : "lock"}" title="${K.esc(g.name)}">${owned[g.id] ? g.emoji : "❔"} ${owned[g.id] ? K.esc(g.name) : ""}</span>`).join("")}</div>`;

  $("dg-main").innerHTML = `<div class="kit-card"><div class="kit-q">Choose your hero</div>
    <div class="dg-cls">${Object.entries(CLASSES).map(([id, c]) => `<button class="dg-c" data-c="${id}"><span class="e">${c.emoji}</span>${c.name}<small>❤️ ${c.hp + sum("hp")} · ⚔️ ${c.atk + sum("atk")}<br>${c.desc}</small></button>`).join("")}</div></div>
    <div class="kit-card"><div class="kit-sub" style="text-align:center;margin:0 0 8px">Your gear (${Object.keys(owned).length}/${GEAR.length}) · best floor ${save.best}/${FLOORS}</div>${gearHtml}</div>`;
  $("dg-main").querySelectorAll("[data-c]").forEach(b => b.onclick = () => fight(b.dataset.c));

  function fight(cid) {
    const cls = CLASSES[cid];
    const maxHp = cls.hp + sum("hp"), atk = cls.atk + sum("atk"), crit = (cid === "archer" ? 0.25 : 0) + sum("crit"), herb = sum("heal");
    let hp = maxHp, floor = 1, mHp = 0, mMax = 0, q = null, locked = false, newLoot = [], potions = 0, skillUsed = false, block = false, fire = false, power = false, turn = 0, nextBuff = 0;
    const mon = () => floor <= FLOORS ? MONSTERS[floor - 1] : [["👹", "Depth Demon"], ["🦂", "Giant Scorpion"], ["🐍", "Shadow Serpent"]][floor % 3];

    function spawn() {
      mMax = mHp = 8 + floor * 4 + (floor === FLOORS ? 8 : 0) + nextBuff; nextBuff = 0; skillUsed = false; turn = 0;
      draw(); ask();
    }
    function draw() {
      const m = mon();
      $("dg-main").innerHTML = `<div class="dg-arena"><div class="dg-fig"><div class="dg-em" id="dg-me">${cls.emoji}</div><div class="dg-name">You · ${hp}/${maxHp}</div><div class="dg-hp me"><i style="width:${Math.max(0, hp / maxHp * 100)}%"></i></div></div>
        <div style="font-size:1.4rem">⚔️</div>
        <div class="dg-fig"><div class="dg-em" id="dg-mo">${m[0]}</div><div class="dg-name">${m[1]} · Floor ${floor}/${FLOORS}</div><div class="dg-hp"><i style="width:${Math.max(0, mHp / mMax * 100)}%"></i></div></div></div>
        <div class="dg-bar"><button type="button" class="kit-btn" id="dg-skill" ${skillUsed ? "disabled" : ""}>${SKILL[cid][0]}</button><button type="button" class="kit-btn alt" id="dg-power">${power ? "💥 Power: ON" : "⚔️ Normal hit"}</button><button type="button" class="kit-btn alt" id="dg-pot" ${potions ? "" : "disabled"}>🧪 ×${potions}</button></div>
        <div class="kit-sub" style="text-align:center;margin:0 0 6px">Weak to: <b>${SUBJ[WEAK[m[1]]] || "everything"}</b>${m[1] === "Dungeon Dragon" ? " · 🔥 breathes fire every 3rd turn!" : ""}</div>
        <div class="kit-card"><div class="kit-q" id="dg-q"></div><div class="kit-opts" id="dg-opts"></div><div class="kit-sub" id="dg-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("dg-skill").onclick = () => { if (skillUsed || locked) return; skillUsed = true; $("dg-skill").disabled = true;
        if (cid === "knight") { block = true; $("dg-msg").textContent = "🛡️ Ready to block the next hit!"; }
        else if (cid === "wizard") { fire = true; $("dg-msg").textContent = "🔥 Fireball charged!"; }
        else { mHp -= 5; shake("dg-mo"); $("dg-msg").textContent = "🏹 Arrow Rain deals 5!"; if (mHp <= 0) { locked = true; setTimeout(cleared, 700); } } };
      $("dg-power").onclick = () => { if (locked) return; power = !power; $("dg-power").textContent = power ? "💥 Power: ON" : "⚔️ Normal hit"; ask(); };
      $("dg-pot").onclick = () => { if (!potions || locked) return; potions--; hp = Math.min(maxHp, hp + 8); draw(); ask(); $("dg-msg").textContent = "🧪 +8 HP!"; };
    }
    function ask() {
      const w = WEAK[mon()[1]]; q = K.question({ difficulty: power || floor >= 4 ? "hard" : "medium", subject: Math.random() < 0.4 ? w : undefined });
      $("dg-q").textContent = q.prompt;
      const box = $("dg-opts"); box.innerHTML = "";
      q.options.forEach(o => { const b = document.createElement("button"); b.className = "kit-opt"; b.type = "button"; b.textContent = o; b.onclick = () => answer(b, o); box.appendChild(b); });
      locked = false;
    }
    function shake(id) { const e = $(id); e.classList.remove("hit"); void e.offsetWidth; e.classList.add("hit"); }
    function answer(btn, o) {
      if (locked) return; locked = true;
      const ok = o === q.correctLabel;
      K.record("dungeon", q.key, ok, q);
      btn.classList.add(ok ? "right" : "wrong");
      if (ok) {
        let dmg = atk + (cid === "wizard" && q.subject !== "math" ? 2 : 0) + (q.subject === WEAK[mon()[1]] ? 2 : 0);
        if (power) dmg *= 2; if (fire) { dmg *= 3; fire = false; }
        const isCrit = Math.random() < crit; if (isCrit) { dmg *= 2; if (Math.random() < 0.5) { potions++; } }
        mHp -= dmg; shake("dg-mo");
        $("dg-msg").textContent = `${isCrit ? "💥 Critical! " : "⚔️ "}You deal ${dmg}!`;
      } else {
        let dmg = 3 + floor + (floor === FLOORS ? 2 : 0) + (power ? 2 : 0);
        if (cid === "knight") dmg = Math.max(1, Math.round(dmg * 0.7));
        if (block) { block = false; dmg = 0; }
        hp -= dmg; shake("dg-me");
        $("dg-msg").textContent = dmg ? `The ${mon()[1]} hits you for ${dmg}! (Answer: ${q.correctLabel})` : `🛡️ Blocked! (Answer: ${q.correctLabel})`;
      }
      turn++;
      if (mon()[1] === "Dungeon Dragon" && turn % 3 === 0 && mHp > 0) { const f = ok ? 1 : 3; hp -= f; $("dg-msg").textContent += ` 🔥 Fire breath! -${f}`; }
      setTimeout(() => {
        if (hp <= 0) return end(false);
        if (mHp <= 0) return cleared();
        draw(); ask();
      }, 900);
    }
    async function cleared() {
      if (floor === FLOORS && !endless) {
        $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🐲💀</div><h2>Dragon defeated!</h2><p class="kit-sub">Stairs lead even deeper… Endless Depths has tougher monsters and more coins.</p><button class="kit-btn block" id="dg-deep" type="button">⬇️ Go deeper</button><button class="kit-btn alt block" id="dg-win" type="button">🏆 Claim victory</button></div></div>`;
        $("dg-deep").onclick = () => { endless = true; $("dg-overlay").innerHTML = ""; cleared(); }; $("dg-win").onclick = () => { $("dg-overlay").innerHTML = ""; end(true); }; return;
      }
      hp = Math.min(maxHp, hp + 6 + herb);
      let lootMsg = "";
      if (Math.random() < 0.7) {
        const pool = GEAR.filter(g => !owned[g.id]);
        if (pool.length) { const g = pool[K.rand(0, pool.length - 1)]; owned[g.id] = true; newLoot.push(g); AIGLeaderboard.saveDungeon(g.id, floor); lootMsg = `${g.emoji} You found: <b>${K.esc(g.name)}</b>!`; }
      }
      $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎉</div><h2>Floor ${floor} cleared!</h2><p class="kit-sub">You heal a little (${hp}/${maxHp} ❤️).<br>${lootMsg}</p><div class="kit-sub" style="font-weight:800">Pick a door before you descend:</div>
        <div class="dg-doors"><button type="button" data-door="t">💰<small>Treasure: answer 1 question for a potion</small></button><button type="button" data-door="f">⛲<small>Fountain: full heal, next monster stronger</small></button><button type="button" data-door="x">🚪<small>Plain stairs: go straight on</small></button></div></div></div>`;
      $("dg-overlay").querySelectorAll("[data-door]").forEach(b => b.onclick = () => {
        const d = b.dataset.door;
        if (d === "f") { hp = maxHp; nextBuff = 6; }
        if (d === "t") { const tq = K.question({ difficulty: "medium" }); $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">💰</div><div class="kit-q">${K.esc(tq.prompt)}</div><div class="kit-opts">${tq.options.map(o => `<button class="kit-opt" type="button" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div></div></div>`;
          $("dg-overlay").querySelectorAll(".kit-opt").forEach(x => x.onclick = () => { const ok = x.dataset.o === tq.correctLabel; K.record("dungeon", tq.key, ok, tq); if (ok) potions++; x.classList.add(ok ? "right" : "wrong"); setTimeout(() => { $("dg-overlay").innerHTML = ""; floor++; spawn(); }, 800); }); return; }
        $("dg-overlay").innerHTML = ""; floor++; spawn();
      });
    }
    let endless = false;
    async function end(won) {
      const reached = won ? Math.max(FLOORS, floor) : floor - 1;
      AIGLeaderboard.saveDungeon(null, reached);
      const coins = Math.min(30, reached * 3 + (won ? 10 : 0));
      $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🏆" : "💀"}</div><h2>${won ? "Dungeon conquered!" : "Defeated…"}</h2>
        <p class="kit-sub">${won ? "You beat the Dungeon Dragon!" : `You made it to floor ${floor}${floor > FLOORS ? " in the Endless Depths" : ""}.`} ${newLoot.length ? `<br>New gear: ${newLoot.map(g => g.emoji).join(" ")}` : ""}</p><div class="kit-bonus" id="dg-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">Another run</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      K.finish("dungeon", coins, $("dg-bonus"));
    }
    spawn();
  }
}
