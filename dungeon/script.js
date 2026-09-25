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
    let hp = maxHp, floor = 1, mHp = 0, mMax = 0, q = null, locked = false, newLoot = [];
    const mon = () => MONSTERS[floor - 1];

    function spawn() {
      mMax = mHp = 8 + floor * 4 + (floor === FLOORS ? 8 : 0);
      draw(); ask();
    }
    function draw() {
      const m = mon();
      $("dg-main").innerHTML = `<div class="dg-arena"><div class="dg-fig"><div class="dg-em" id="dg-me">${cls.emoji}</div><div class="dg-name">You · ${hp}/${maxHp}</div><div class="dg-hp me"><i style="width:${Math.max(0, hp / maxHp * 100)}%"></i></div></div>
        <div style="font-size:1.4rem">⚔️</div>
        <div class="dg-fig"><div class="dg-em" id="dg-mo">${m[0]}</div><div class="dg-name">${m[1]} · Floor ${floor}/${FLOORS}</div><div class="dg-hp"><i style="width:${Math.max(0, mHp / mMax * 100)}%"></i></div></div></div>
        <div class="kit-card"><div class="kit-q" id="dg-q"></div><div class="kit-opts" id="dg-opts"></div><div class="kit-sub" id="dg-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
    }
    function ask() {
      q = K.question({ difficulty: floor >= 4 ? "hard" : "medium" });
      $("dg-q").textContent = q.prompt;
      const box = $("dg-opts"); box.innerHTML = "";
      q.options.forEach(o => { const b = document.createElement("button"); b.className = "kit-opt"; b.type = "button"; b.textContent = o; b.onclick = () => answer(b, o); box.appendChild(b); });
      locked = false;
    }
    function shake(id) { const e = $(id); e.classList.remove("hit"); void e.offsetWidth; e.classList.add("hit"); }
    function answer(btn, o) {
      if (locked) return; locked = true;
      const ok = o === q.correctLabel;
      K.record("dungeon", q.key, ok);
      btn.classList.add(ok ? "right" : "wrong");
      if (ok) {
        let dmg = atk + (cid === "wizard" && q.subject !== "math" ? 2 : 0);
        const isCrit = Math.random() < crit; if (isCrit) dmg *= 2;
        mHp -= dmg; shake("dg-mo");
        $("dg-msg").textContent = `${isCrit ? "💥 Critical! " : "⚔️ "}You deal ${dmg}!`;
      } else {
        let dmg = 3 + floor + (floor === FLOORS ? 2 : 0);
        if (cid === "knight") dmg = Math.max(1, Math.round(dmg * 0.7));
        hp -= dmg; shake("dg-me");
        $("dg-msg").textContent = `The ${mon()[1]} hits you for ${dmg}! (Answer: ${q.correctLabel})`;
      }
      setTimeout(() => {
        if (hp <= 0) return end(false);
        if (mHp <= 0) return cleared();
        draw(); ask();
      }, 900);
    }
    async function cleared() {
      if (floor >= FLOORS) return end(true);
      hp = Math.min(maxHp, hp + 6 + herb);
      let lootMsg = "";
      if (Math.random() < 0.7) {
        const pool = GEAR.filter(g => !owned[g.id]);
        if (pool.length) { const g = pool[K.rand(0, pool.length - 1)]; owned[g.id] = true; newLoot.push(g); AIGLeaderboard.saveDungeon(g.id, floor); lootMsg = `${g.emoji} You found: <b>${K.esc(g.name)}</b>!`; }
      }
      $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🎉</div><h2>Floor ${floor} cleared!</h2><p class="kit-sub">You heal a little (${hp}/${maxHp} ❤️).<br>${lootMsg}</p><button class="kit-btn block" id="dg-go">Descend ⬇️</button></div></div>`;
      $("dg-go").onclick = () => { $("dg-overlay").innerHTML = ""; floor++; spawn(); };
    }
    async function end(won) {
      const reached = won ? FLOORS : floor - 1;
      AIGLeaderboard.saveDungeon(null, reached);
      const coins = reached * 3 + (won ? 10 : 0);
      $("dg-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${won ? "🏆" : "💀"}</div><h2>${won ? "Dungeon conquered!" : "Defeated…"}</h2>
        <p class="kit-sub">${won ? "You beat the Dungeon Dragon!" : `You made it to floor ${floor}.`} ${newLoot.length ? `<br>New gear: ${newLoot.map(g => g.emoji).join(" ")}` : ""}</p><div class="kit-bonus" id="dg-bonus"></div>
        <button class="kit-btn block" onclick="location.reload()">Another run</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
      K.finish("dungeon", coins, $("dg-bonus"));
    }
    spawn();
  }
}
