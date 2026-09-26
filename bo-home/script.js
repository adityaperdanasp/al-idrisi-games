/* =================================================================
   Bo's World (PM round 12) -- one page, several tabs. TABS is an array of
   { id, label, render(el) }; later batches push more entries.
     🏠 Home     (item 1)  furnish Bo's house with coins
     ⬆️ Bo Level (item 2)  Bo grows as you answer; daily gift
     🐾 Familiar (item 3)  adopt a companion that follows you into games
     🎧 Radio    (item 10) calm synthesized background sounds
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const LB = window.AIGLeaderboard;
const TABS = [];
let current = "home";

function bubble(text) { const s = document.getElementById("bh-say"); if (s) s.textContent = text; }
function boHeader(text, aura) {
  return `<div class="bh-bo ${aura ? "aura" : ""}"><img src="../icon-192.png" alt="Bo"><div class="bh-say" id="bh-say">${K.esc(text)}</div></div>`;
}

/* ---- 1. Bo's Home ---- */
TABS.push({ id: "home", label: "🏠 Home", async render(el) {
  const home = await LB.getBoHome();
  let sel = null;
  const draw = async () => {
    const h = await LB.getBoHome();
    const byId = Object.fromEntries(h.furniture.map(f => [f.id, f]));
    const slots = Array.from({ length: 12 }, (_, i) => {
      const locked = i >= h.total, id = h.slots[i];
      return `<button class="bh-slot ${id ? "has" : ""} ${locked ? "lock" : ""}" data-i="${i}" ${locked ? "disabled" : ""}>${locked ? "🔒" : id ? byId[id].emoji : "＋"}</button>`;
    }).join("");
    let panel;
    if (sel === null) panel = `<div class="kit-sub" style="text-align:center;margin:10px 0 0">Tap a spot to decorate. More spots unlock as Bo levels up (now level ${h.level}: ${h.rows} row${h.rows === 1 ? "" : "s"}).</div>`;
    else {
      const cur = h.slots[sel];
      panel = `<div class="kit-sub" style="margin:10px 0 4px;font-weight:800">Spot ${sel + 1}${cur ? ` — ${byId[cur].emoji} ${byId[cur].name}` : ""}</div>${cur ? '<button class="kit-btn alt" id="bh-clear">Take it away</button>' : ""}
        <div class="bh-shop">${h.furniture.map(f => `<button class="bh-item" data-f="${f.id}"><span class="e">${f.emoji}</span>${f.name}<br><small>${h.owned[f.id] ? "Owned — place" : "🪙" + f.cost}</small></button>`).join("")}</div>`;
    }
    el.innerHTML = `${boHeader(h.moodText, h.level >= 8)}<div class="bh-room">${slots}</div>${panel}<div class="kit-bonus" id="bh-msg" style="margin-top:8px"></div>`;
    el.querySelectorAll(".bh-slot:not(.lock)").forEach(b => b.onclick = () => { sel = +b.dataset.i; draw(); });
    const clr = el.querySelector("#bh-clear"); if (clr) clr.onclick = async () => { await LB.placeFurniture(sel, null); sel = null; draw(); };
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = async () => {
      const id = b.dataset.f;
      if (!h.owned[id]) { const r = await LB.buyFurniture(id); if (!r.ok) { $("bh-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins yet — answer some questions!" : "Couldn't buy that."; return; } }
      await LB.placeFurniture(sel, id); sel = null; await draw();
    });
  };
  await draw();
}});

/* ---- 2. Bo Level ---- */
TABS.push({ id: "level", label: "⬆️ Bo Level", async render(el) {
  const b = await LB.getBoStatus();
  const pct = b.maxed ? 100 : Math.round(b.xpInto / b.xpNext * 100);
  el.innerHTML = `<div class="kit-card">${boHeader(`I'm level ${b.level}! Every answer you get right helps me grow.`, b.level >= 8)}
    <div style="font-family:'Baloo 2',sans-serif;font-weight:800;text-align:center;font-size:1.4rem">Bo · Level ${b.level}</div>
    <div class="kit-bar" style="margin:6px 0"><i style="width:${pct}%;background:linear-gradient(90deg,#c08be8,#7c3aed)"></i></div>
    <div class="kit-sub" style="text-align:center;margin:0 0 12px">${b.maxed ? "Max level reached! 🌟" : `${b.xpInto}/${b.xpNext} right answers to level ${b.level + 1}`}</div>
    <button class="kit-btn block" id="bl-gift" ${b.giftReady ? "" : "disabled"}>${b.level < 2 ? "🎁 Bo's gift unlocks at level 2" : b.giftReady ? `🎁 Open Bo's daily gift (🪙${b.giftReward.coins}${b.giftReward.gems ? " 💎" + b.giftReward.gems : ""})` : "🎁 Come back tomorrow for another gift"}</button>
    <div class="kit-bonus" id="bl-msg"></div></div>
    <div class="kit-card"><div class="kit-sub" style="margin:0 0 6px;font-weight:800">What Bo unlocks</div>${b.perks.map(p => `<div class="bh-perk ${b.level >= p.lvl ? "" : "off"}"><span>${b.level >= p.lvl ? "✅" : "🔒"}</span><span><b>Lv ${p.lvl}</b> — ${K.esc(p.text)}</span></div>`).join("")}</div>`;
  el.querySelector("#bl-gift").onclick = async () => {
    const r = await LB.claimBoGift();
    if (!r.ok) return;
    $("bl-msg").textContent = `🎉 +🪙${r.reward.coins}${r.reward.gems ? " +💎" + r.reward.gems : ""}!`;
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    setTimeout(() => this.render(el), 1200);
  };
}});

/* ---- 3. Familiar ---- */
TABS.push({ id: "familiar", label: "🐾 Familiar", async render(el) {
  const f = await LB.getFamiliar();
  if (!f.adopted) {
    el.innerHTML = `<div class="kit-card"><div class="kit-q">Choose your companion</div><p class="kit-sub" style="text-align:center">Your familiar follows you into every game and cheers when you get answers right. You can only adopt one, so choose well!</p>
      <div class="bh-shop" style="grid-template-columns:repeat(2,1fr)">${f.species.map(s => `<button class="bh-item" data-s="${s.id}"><span class="e" style="font-size:2.4rem">${s.emoji}</span>${s.name}<br><small>${s.quip}</small></button>`).join("")}</div>
      <input id="fm-name" class="ed-input" maxlength="14" placeholder="Give it a name (optional)" style="width:100%;margin-top:10px;padding:10px;border:2px solid #e6dcf5;border-radius:12px;font:inherit"><div class="kit-bonus" id="fm-msg" style="margin-top:8px"></div></div>`;
    el.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => { const r = await LB.adoptFamiliar(b.dataset.s, $("fm-name").value); if (r.ok) { if (window.AIGSkin) { await AIGSkin.refresh(); AIGSkin.burst(innerWidth / 2, innerHeight / 3); } this.render(el); } });
    return;
  }
  const a = f.adopted;
  el.innerHTML = `<div class="kit-card"><div class="bh-fam-big">${a.emoji}</div><div style="font-family:'Baloo 2',sans-serif;font-weight:800;text-align:center;font-size:1.3rem">${K.esc(a.name)} · Level ${a.level}</div>
    <div class="kit-bar" style="margin:8px 0"><i style="width:${a.level >= 10 ? 100 : Math.round(a.xpInto / 25 * 100)}%;background:linear-gradient(90deg,#c08be8,#7c3aed)"></i></div>
    <div class="kit-sub" style="text-align:center">${a.level >= 10 ? "Fully grown! 🌟" : `${a.xpInto}/25 to level ${a.level + 1}`} — it grows from your right answers and treats.</div>
    <button class="kit-btn block" id="fm-feed" ${a.hungry ? "" : "disabled"}>${a.hungry ? `🍖 Give a treat (🪙${f.treat.cost.coins}, +${f.treat.xp} growth)` : "😋 Full for today"}</button><div class="kit-bonus" id="fm-msg"></div></div>
    <div class="kit-sub" style="text-align:center">Look for ${a.emoji} in the bottom-left corner of every page!</div>`;
  el.querySelector("#fm-feed").onclick = async () => {
    const r = await LB.feedFamiliar();
    if (!r.ok) return $("fm-msg").textContent = r.reason === "insufficient-funds" ? "Not enough coins yet!" : "Already fed today!";
    if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
    this.render(el);
  };
}});

/* ---- 10. Radio ---- */
TABS.push({ id: "radio", label: "🎧 Radio", async render(el) {
  const R = window.AIGRadio;
  if (!R) { el.innerHTML = '<div class="kit-card"><div class="kit-sub">Radio is loading…</div></div>'; setTimeout(() => this.render(el), 600); return; }
  const paint = () => {
    el.innerHTML = `<div class="kit-card"><div class="kit-q">Study radio</div><p class="kit-sub" style="text-align:center">Calm background sounds while you learn. It stays on while you move around this page; the 🎧 button in the corner of every Game Room page controls it too.</p>
      ${R.TRACKS.map(t => `<button class="bh-rad ${R.current === t.id ? "on" : ""}" data-id="${t.id}">${t.emoji} ${t.name}${R.current === t.id ? " — playing" : ""}</button>`).join("")}
      <button class="bh-rad" data-id="">⏹️ Turn off</button>
      <div class="kit-sub" style="margin:10px 0 4px;font-weight:800">Volume</div><input id="rd-vol" type="range" min="0" max="100" value="${Math.round(R.volume * 100)}" style="width:100%"></div>`;
    el.querySelectorAll(".bh-rad").forEach(b => b.onclick = () => { b.dataset.id ? R.play(b.dataset.id) : R.stop(); paint(); });
    el.querySelector("#rd-vol").oninput = e => R.setVolume(e.target.value / 100);
  };
  paint();
}});

/* ---- 5. Letters from Bo ---- */
TABS.push({ id: "letters", label: "✉️ Letters", async render(el) {
  const d = await LB.getLetters();
  el.innerHTML = `<div class="kit-card">${boHeader(d.unread ? `You have ${d.unread} new letter${d.unread === 1 ? "" : "s"}! I write a new one every few days.` : "No new letters right now. I'll write again soon!")}</div>
    ${d.letters.map(l => `<div class="kit-card" data-k="${l.k}"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:'Baloo 2',sans-serif">${l.read ? "📭" : "📬"} ${K.esc(l.title)}</b><small style="color:#8a7a6a">${new Date(l.at).toLocaleDateString()}</small></div><div class="lt-body" style="display:none"></div></div>`).join("")}`;
  el.querySelectorAll("[data-k]").forEach(card => {
    const l = d.letters.find(x => x.k === card.dataset.k), body = card.querySelector(".lt-body");
    const open = async () => {
      body.style.display = "block";
      body.innerHTML = `<p class="kit-sub" style="margin:10px 0;color:#3d2e22;font-size:.9rem">${K.esc(l.body)}</p><p class="kit-sub" style="margin:0 0 6px;font-weight:800;color:#3d2e22">🧩 Bo's riddle: ${K.esc(l.riddle.q)}</p>
        ${l.solved ? '<div class="kit-bonus">✅ You solved it!</div>' : `<div class="kit-opts" style="grid-template-columns:1fr">${l.riddle.o.map((o, i) => `<button class="kit-opt" data-i="${i}">${K.esc(o)}</button>`).join("")}</div><div class="kit-bonus" style="margin-top:6px"></div>`}`;
      if (!l.read) { l.read = true; LB.markLetterRead(l.k); card.querySelector("b").textContent = "📭 " + l.title; }
      body.querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        const r = await LB.solveLetter(l.k, +b.dataset.i);
        if (r.correct) { l.solved = true; b.classList.add("right"); body.querySelector(".kit-bonus").textContent = `🎉 Right! +🪙${r.coins}`; if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); body.querySelectorAll(".kit-opt").forEach(x => x.disabled = true); }
        else { b.classList.add("wrong"); b.disabled = true; body.querySelector(".kit-bonus").textContent = "Not quite — try another!"; }
      });
    };
    card.querySelector("div").onclick = () => { body.style.display === "block" ? body.style.display = "none" : open(); };
  });
}});

/* ---- 6. Museum ---- */
TABS.push({ id: "museum", label: "🏛️ Museum", async render(el) {
  const m = await LB.getMuseum();
  const flag = code => String.fromCodePoint(...code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0)));
  const stage = ["🥚", "🦎", "🦕", "🦖", "🐲"][m.dinoStage] || "🥚";
  const tile = (e, label) => `<div class="mu-t" title="${K.esc(label || "")}">${e}</div>`;
  const rooms = [
    [`${m.counts.cards} Collector Cards`, m.cards.map(c => tile(c.emoji, c.name)).join("") || '<span class="kit-sub">No cards yet</span>'],
    [`${m.counts.stamps} Passport Stamps`, m.stamps.map(c => tile(flag(c), c)).join("") || '<span class="kit-sub">No stamps yet — try Geo Flight!</span>']
  ];
  const rooms2 = [
    [`${m.counts.books} Storybooks`, m.books.map(b => tile(b.emoji, b.title)).join("") || '<span class="kit-sub">None yet — Story Maker!</span>'],
    [`${m.counts.cases} Solved Cases`, m.counts.cases ? Array.from({ length: m.counts.cases }, () => tile("🔎")).join("") : '<span class="kit-sub">Word Detective awaits</span>'],
    [`${m.counts.certs} Certificates`, m.certs.map(c => tile(c.emoji, c.title)).join("") || '<span class="kit-sub">Keep learning!</span>'],
    [`${m.counts.titles} Tournament Titles`, m.counts.titles ? Array.from({ length: m.counts.titles }, () => tile("🏆")).join("") : '<span class="kit-sub">Win the Weekend Tournament</span>']
  ];
  const rooms3 = [
    [`Dino Companion`, tile(stage, "Dino")], [`Familiar`, m.familiar ? tile(m.familiar.emoji, m.familiar.name) : '<span class="kit-sub">Adopt one in the Familiar tab</span>'],
    [`${m.counts.gear} Dungeon Gear`, m.counts.gear ? Array.from({ length: m.counts.gear }, () => tile("⚔️")).join("") : '<span class="kit-sub">Explore the Dungeon</span>'],
    [`Town Beauty ✨ ${m.town}`, tile("🏘️")], [`${m.counts.mastered} Mastered Topics`, m.counts.mastered ? Array.from({ length: m.counts.mastered }, () => tile("⭐")).join("") : '<span class="kit-sub">Finish Bo\'s Tutor Sessions</span>'],
    [`${m.counts.cosmetics} Cosmetics`, tile("🎨")]
  ];
  const floors = [rooms, rooms2, rooms3];
  el.innerHTML = `<style>.mu-t{width:44px;height:44px;border-radius:10px;background:#fff;border:2px solid #ede4f7;display:grid;place-items:center;font-size:1.5rem}.mu-row{display:flex;flex-wrap:wrap;gap:6px}.mu-h{font-weight:800;font-size:.85rem;margin:10px 0 4px}</style>
    <div class="kit-card">${boHeader(`Welcome to the museum! You've collected ${m.total} exhibit${m.total === 1 ? "" : "s"}. New floors open at 15 and 40.`)}</div>
    ${m.floors.map((f, i) => { const open = m.total >= f.need; return `<div class="kit-card"><div class="kit-q" style="text-align:left;margin:0">${open ? "🏛️" : "🔒"} ${f.name}${open ? "" : ` — opens at ${f.need} exhibits (${m.total}/${f.need})`}</div>
      ${open ? floors[i].map(([h, c]) => `<div class="mu-h">${h}</div><div class="mu-row">${c}</div>`).join("") : ""}</div>`; }).join("")}`;
}});

/* ---- 4. Buddy ---- */
TABS.push({ id: "buddy", label: "🤝 Buddy", async render(el) {
  const b = await LB.getBuddy();
  if (!b.buddy) {
    const friends = await LB.listPlayerNames();
    el.innerHTML = `<div class="kit-card">${boHeader("Pick one best friend to team up with! Your scores add up and you build a buddy streak together.")}
      ${b.requests.length ? `<div class="kit-sub" style="font-weight:800;margin:0 0 6px">💌 Requests for you</div>${b.requests.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><b>${K.esc(r.name)}</b><span><button class="kit-btn" data-acc="${K.esc(r.id)}" style="padding:6px 12px">Accept</button> <button class="kit-btn alt" data-dec="${K.esc(r.id)}" style="padding:6px 12px">No</button></span></div>`).join("")}<hr style="border:0;border-top:1px solid #eee;margin:10px 0">` : ""}
      <input id="bd-q" placeholder="Search for a friend…" style="width:100%;padding:10px;border:2px solid #e6dcf5;border-radius:12px;font:inherit;margin-bottom:8px"><div id="bd-list"></div><div class="kit-bonus" id="bd-msg"></div></div>`;
    const draw = () => {
      const q = $("bd-q").value.trim().toLowerCase();
      $("bd-list").innerHTML = friends.filter(f => !q || f.name.toLowerCase().includes(q)).slice(0, 25).map(f => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid #f4eefb"><b>${K.esc(f.name)}</b><button class="kit-btn" data-req="${K.esc(f.id)}" style="padding:6px 12px">Ask</button></div>`).join("");
      $("bd-list").querySelectorAll("[data-req]").forEach(x => x.onclick = async () => { const r = await LB.requestBuddy(x.dataset.req); $("bd-msg").textContent = r.ok ? "💌 Request sent! They'll see it in their Buddy tab." : "Couldn't send that."; });
    };
    $("bd-q").oninput = draw; draw();
    el.querySelectorAll("[data-acc]").forEach(x => x.onclick = async () => { const r = await LB.acceptBuddy(x.dataset.acc); if (r.ok) { if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); this.render(el); } else $("bd-msg").textContent = "Couldn't accept — someone already has a buddy."; });
    el.querySelectorAll("[data-dec]").forEach(x => x.onclick = async () => { await LB.declineBuddy(x.dataset.dec); this.render(el); });
    return;
  }
  const pct = Math.min(100, Math.round(b.combined / b.goal * 100));
  el.innerHTML = `<div class="kit-card">${boHeader(`You and ${b.buddy.name} are buddies! ${b.streak ? `🔥 ${b.streak}-day buddy streak — you both played ${b.streak} day${b.streak === 1 ? "" : "s"} in a row.` : "Play on the same days to build a buddy streak."}`)}
    <div style="display:flex;justify-content:space-around;text-align:center;margin:8px 0"><div><div style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:1.6rem">${b.mineWeek}</div><div class="kit-sub" style="margin:0">you (this week)</div></div><div style="font-size:1.6rem">🤝</div><div><div style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:1.6rem">${b.theirWeek}</div><div class="kit-sub" style="margin:0">${K.esc(b.buddy.name)}</div></div></div>
    <div class="kit-bar"><i style="width:${pct}%;background:linear-gradient(90deg,#c08be8,#7c3aed)"></i></div><div class="kit-sub" style="text-align:center;margin:6px 0 10px">${b.combined}/${b.goal} together this week</div>
    <button class="kit-btn block" id="bd-claim" ${b.combined >= b.goal && !b.claimed ? "" : "disabled"}>${b.claimed ? "Weekly goal collected ✓" : b.combined >= b.goal ? "🎁 Collect buddy goal (🪙25)" : "Reach the weekly goal for a gift"}</button>
    <button class="kit-btn alt block" id="bd-cheer" ${b.cheeredToday ? "disabled" : ""}>${b.cheeredToday ? "You cheered them today 💜" : b.buddy.hitsToday ? "📣 Cheer your buddy!" : "📣 Nudge: come play today!"}</button>
    ${b.cheersForMe ? `<div class="kit-bonus">💜 ${b.cheersForMe} cheer${b.cheersForMe === 1 ? "" : "s"} for you today!</div>` : ""}
    <div class="kit-bonus" id="bd-msg"></div><button class="kit-btn alt" id="bd-remove" style="padding:6px 12px;font-size:.75rem">Change buddy</button></div>`;
  $("bd-claim").onclick = async () => { const r = await LB.claimBuddyGoal(); if (r.ok) { $("bd-msg").textContent = "🎉 +🪙25 for both of you being awesome!"; if (window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3); setTimeout(() => this.render(el), 1200); } };
  $("bd-cheer").onclick = async () => { const r = await LB.cheerBuddy(); if (r.ok) { $("bd-msg").textContent = "💜 Sent!"; setTimeout(() => this.render(el), 800); } };
  $("bd-remove").onclick = async () => { if (confirm("Stop being buddies? Your buddy will be unpaired too.")) { await LB.removeBuddy(); this.render(el); } };
}});

/* ---- 3. Spell Book ---- */
TABS.push({ id: "spells", label: "🪄 Spells", async render(el) {
  const d = await LB.getSpells();
  el.innerHTML = `<div class="kit-card">${boHeader("Learning unlocks magic! Each spell can be used once per game page. Look for the 🪄 bar at the bottom of Game Room games.")}
    ${d.spells.map(s => `<div class="bh-perk ${s.unlocked ? "" : "off"}" style="align-items:flex-start;padding:10px 0"><span style="font-size:1.6rem">${s.unlocked ? s.emoji : "🔒"}</span><span><b>${K.esc(s.name)}</b> — ${K.esc(s.desc)}<br><small style="color:#7a6a5a">${s.unlocked ? "Unlocked! ✨" : "Unlock: " + K.esc(s.unlock)}</small></span></div>`).join("")}
    <div class="kit-sub" style="margin:8px 0 0;text-align:center">Your progress: ✅ ${d.progress.passed} checks passed · 🎓 ${d.progress.tutor} tutor topics · 🔁 ${d.progress.srs} reviews mastered · 📜 ${d.progress.certs} certificates</div></div>`;
}});

/* ---- 2. My World ---- */
TABS.push({ id: "world", label: "🌍 My World", async render(el) {
  const w = await LB.getWorldState();
  el.innerHTML = `<div class="kit-card">${boHeader(window.AIGSkin.worldText(w))}${window.AIGSkin.worldHtml(w, true)}
    <div style="text-align:center;font-family:'Baloo 2',sans-serif;font-weight:800;margin-top:10px">World level ${w.level + 1}/${w.maxLevel + 1}</div>
    <div class="kit-sub" style="text-align:center;margin:4px 0 0">${w.next ? `${w.toNext} more right answers to grow it further!` : "Your world is fully grown! 🏰"}${w.idle && w.idle < 99 ? ` Last played ${w.idle} day${w.idle === 1 ? "" : "s"} ago.` : ""}</div></div>`;
}});

/* ---- shell ---- */
function show(id) {
  current = id;
  $("bh-tabs").innerHTML = TABS.map(t => `<button class="bh-tab ${t.id === id ? "on" : ""}" data-t="${t.id}">${t.label}</button>`).join("");
  $("bh-tabs").querySelectorAll(".bh-tab").forEach(b => b.onclick = () => show(b.dataset.t));
  const el = $("bh-main"); el.innerHTML = '<div class="kit-card"><div class="kit-sub" style="margin:0;text-align:center">Loading…</div></div>';
  TABS.find(t => t.id === id).render(el);
}
if (!player) $("bh-overlay").innerHTML = K.signedOutHtml("🏠");
else show(new URLSearchParams(location.search).get("tab") || "home");
