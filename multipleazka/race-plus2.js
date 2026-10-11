/* =================================================================
   Math Race PLUS -- Pack 2 (layered on race-plus.js via RacePlus.hooks).
   Lanes + combo, manual nitro, drift corners, ramps, shortcut gates,
   final sprint, boss race, survival + "race of the day" modes, vehicle
   skills, brain skills + passives (loadout), skill tree, car levels +
   parts + plate/glow, 4 block-world vehicles, VS screen, HUD, post-race
   summary with Bo explanations, share card, XP / level / race pass,
   daily + weekly boards, mastery badges, sticker drops, tutorial and
   comfort options. Every hook is try/catch-wrapped in race-plus.js, so a
   problem here can never break the base race. */
(function () {
  "use strict";
  if (!window.RacePlus || !RacePlus.api || typeof state === "undefined") return;
  const RP = RacePlus, A = RP.api, H = RP.hooks, LB = window.AIGLeaderboard, $ = id => document.getElementById(id);
  const { popup, showToast, shakeScreen, carUpdate, lvl, saveMeta, bumpMission, myCar, TRAITS, TRACKS, WEATHERS, RIVALS, hashStr, mulberry32, todayStr, esc } = A;
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, pick = a => a[rnd(0, a.length - 1)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ---------------- data ----------------
  Object.assign(VEHICLE_EMOJI, { minecart: "🛒", boat: "⛵", pig: "🐷", glider: "🦅", creeper: "👾" });
  Object.assign(TRAITS, {
    minecart: { s: 1.03, p: 0.01, o: 0.8, t: "rail-fast, sturdy" }, boat: { s: 1, p: 0, o: 0.6, t: "floaty and steady" },
    pig: { s: 0.98, p: 0, o: 0.5, t: "tough little pig" }, glider: { s: 1.07, p: 0.02, o: 1.1, t: "very fast, a bit wobbly" }, creeper: { s: 1, p: 0, o: 1, t: "boss" }
  });
  const VEH_NAMES = { car: "Race Car", plane: "Plane", ship: "Ship", bus: "Bus", truck: "Truck", train: "Train", skateboard: "Skateboard", helicopter: "Helicopter", rocket: "Rocket", minecart: "Minecart", boat: "Boat", pig: "Pig Kart", glider: "Glider" };
  const LANES = { safe: { m: 0.82, pen: 0, e: "🛡", n: "Safe" }, fast: { m: 1.12, pen: 0.02, e: "⚡", n: "Fast" }, risky: { m: 1.6, pen: 0.06, e: "🔥", n: "Risky" } };
  const BRAIN = { freeze: { e: "❄️", n: "Freeze", d: "+4 seconds on this question" }, fifty: { e: "✂️", n: "50/50", d: "Removes 2 wrong answers" }, skip: { e: "⏭️", n: "Skip", d: "Hop ahead without answering" }, hint: { e: "💡", n: "Hint", d: "A clue about the answer" } };
  const PASSIVES = { second: { e: "🛡️", n: "Second Chance", lvl: 1, d: "Your first mistake costs no progress" }, quick: { e: "🏁", n: "Quick Start", lvl: 3, d: "First 2 answers go ×1.5" }, lucky: { e: "🍀", n: "Lucky Charm", lvl: 5, d: "Start with a boost" }, calm: { e: "🧘", n: "Calm", lvl: 7, d: "+1 second on every question" } };
  const VSKILL = {
    car: { e: "🔥", n: "Turbo", d: "Next correct answer ×2", fn: (R, x) => { R.boostReady = true; } },
    plane: { e: "🛫", n: "Fly", d: "Jump the next obstacle", fn: (R, x) => { x.ramp = 1; } },
    ship: { e: "🌊", n: "Calm Waters", d: "+3s and clears oil", fn: (R, x) => { R.oilQ = 0; R.clockBonus += 3; } },
    bus: { e: "📯", n: "Honk", d: "Slows your rival", fn: (R, x) => slowRival(4.5) },
    truck: { e: "💥", n: "Smash", d: "Smash through the next obstacle", fn: (R, x) => { x.ramp = 1; } },
    train: { e: "🚄", n: "Express", d: "Next 2 answers ×1.5", fn: (R, x) => { x.express = 2; } },
    skateboard: { e: "🛹", n: "Kickflip", d: "Protects your streak once", fn: () => { state.powerupShieldReady = true; } },
    helicopter: { e: "🚁", n: "Hover", d: "+5s on the next question", fn: R => { R.clockBonus += 5; } },
    rocket: { e: "🚀", n: "Blast", d: "Jump ahead 8%", fn: R => { state.progress = Math.min(0.97, state.progress + 0.08); carUpdate(); } },
    minecart: { e: "⛏️", n: "Rails", d: "Next 2 answers ×1.5", fn: (R, x) => { x.express = 2; } },
    boat: { e: "💦", n: "Splash", d: "Slows your rival", fn: () => slowRival(3.5) },
    pig: { e: "🐽", n: "Oink Dash", d: "Jump ahead 5%", fn: R => { state.progress = Math.min(0.97, state.progress + 0.05); carUpdate(); } },
    glider: { e: "🪽", n: "Glide", d: "Jump the next obstacle", fn: (R, x) => { x.ramp = 1; R.clockBonus += 2; } }
  };
  const PARTS = { spoiler: { e: "🪽", n: "Spoiler", d: "+4% speed per level", costs: [25, 60, 120] }, magnet: { e: "🧲", n: "Magnet", d: "Grabs power-ups just ahead", costs: [30, 70, 140] }, shield: { e: "🛡️", n: "Shield Gen", d: "Forgives your first mistake", costs: [40, 100, 200] } };
  const TREE = { speed: { e: "⚡", n: "Speed", d: "+2% speed per level" }, brain: { e: "🧠", n: "Brain", d: "+0.4s on every question (Lv3: +1 skill charge)" }, luck: { e: "🍀", n: "Luck", d: "+1 bonus coin per race per level, more pickups pay off" } };
  const TITLES = ["Rookie", "Driver", "Racer", "Speedster", "Ace", "Champion", "Legend"];
  const PASS = [{ c: 5 }, { c: 5 }, { c: 10 }, { c: 10 }, { c: 15 }, { g: 1 }, { c: 15 }, { c: 20 }, { c: 20 }, { g: 2 }, { c: 30 }, { g: 3 }];
  const GLOWS = { none: "None", blue: "#3aa0ff", green: "#3fe06a", pink: "#ff5fc0", gold: "#ffd23f", red: "#ff4d4d" };

  const levelOf = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
  const titleOf = L => TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 2))];
  const carLevel = v => { const c = RP.meta && RP.meta.cars && RP.meta.cars[v]; return c ? Math.min(10, Math.floor(Math.sqrt((c.xp || 0) / 12)) + 1) : 1; };
  const meta = () => RP.meta || { garage: {}, parts: {}, skills: {}, loadout: { brain: ["freeze", "fifty"], passive: "second" }, look2: {}, cars: {}, tracks: {}, mastered: {}, passClaimed: {}, daily: {}, weekly: {}, prevWeekly: {} };
  const mondayKey = (d) => { const t = new Date(d || Date.now()); const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };

  // ---------------- tiny sfx ----------------
  let actx = null;
  function beep(f, d, type, v, slide) {
    try { if (ls.get("mr2_mute", "0") === "1") return; actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.type = type || "square"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d); g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {}
  }

  // ---------------- comfort options ----------------
  function applyComfort() { const h = document.documentElement; h.classList.toggle("mr2-calm", ls.get("mr2_calm", "0") === "1"); h.classList.toggle("mr2-big", ls.get("mr2_big", "0") === "1"); }
  applyComfort();

  // ---------------- mode selector ----------------
  RP.rmode = ls.get("mr2_rmode", "race");
  document.querySelectorAll("#rmode-seg .seg-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.rmode === RP.rmode);
    b.addEventListener("click", () => { RP.rmode = b.dataset.rmode; ls.set("mr2_rmode", RP.rmode); document.querySelectorAll("#rmode-seg .seg-btn").forEach(x => x.classList.toggle("active", x === b)); });
  });

  // ---------------- helpers ----------------
  function slowRival(sec) {
    const R = RP.race; if (!R) return;
    if (state.solo) { R.aiSlowUntil = performance.now() + sec * 1000; showToast("💨 Your rival slows down!"); }
    else if (state.code && typeof db !== "undefined") { try { db.ref(`games/${state.code}/players/${state.seatKey}/attack`).set({ at: Date.now(), type: "oil" }); showToast("💨 Slowing the others!"); } catch (e) {} }
  }
  function offer(o) {
    let el = $("mr2-offer");
    if (!el) { el = document.createElement("div"); el.id = "mr2-offer"; el.className = "mr2-overlay hidden"; $("screen-race").appendChild(el); }
    el.innerHTML = `<div class="mr2-card"><div class="mr2-e">${o.e}</div><div class="mr2-t">${o.t}</div><p>${o.p}</p><div class="mr2-opts"></div></div>`;
    const box = el.querySelector(".mr2-opts");
    o.opts.forEach(op => { const b = document.createElement("button"); b.className = op.ghost ? "ghost-btn" : "primary-btn"; b.innerHTML = op.label; b.onclick = () => { el.classList.add("hidden"); try { op.fn && op.fn(); } catch (e) { console.warn(e); } window.nextQuestion(); }; box.appendChild(b); });
    el.classList.remove("hidden");
  }
  function explain(text, ans) {
    let m = text.match(/^(\d+) × (\d+) = \?$/);
    if (m) { const a = +m[1], b = m[2]; return `${a} × ${b} means ${a} groups of ${b}: ${Array(Math.min(a, 6)).fill(b).join(" + ")}${a > 6 ? " + …" : ""} = ${ans}`; }
    m = text.match(/^(\d+) ÷ (\d+) = \?$/); if (m) return `${m[1]} ÷ ${m[2]}: how many ${m[2]}s fit in ${m[1]}? ${m[2]} × ${ans} = ${m[1]}`;
    m = text.match(/^□ × (\d+) = (\d+)$/); if (m) return `Flip it around: ${m[2]} ÷ ${m[1]} = ${ans}`;
    m = text.match(/^(\d+) × □ = (\d+)$/); if (m) return `Flip it around: ${m[2]} ÷ ${m[1]} = ${ans}`;
    m = text.match(/^(\d+) ÷ □ = (\d+)$/); if (m) return `${m[1]} ÷ ${ans} = ${m[2]}, because ${ans} × ${m[2]} = ${m[1]}`;
    m = text.match(/^(\d+) \+ (\d+) = \?$/); if (m) return `Add the tens, then the ones: ${m[1]} + ${m[2]} = ${ans}`;
    m = text.match(/^(\d+) − (\d+) = \?$/); if (m) return `Count up from ${m[2]} to ${m[1]}, or take away tens then ones: ${ans}`;
    if (/\(|\+ \d+ = \?$/.test(text)) return "Do the brackets or the × first, then the + : " + ans;
    if (/total/.test(text)) return "Count the rows, count the columns, then multiply: " + ans;
    return "Look for the numbers: groups → multiply, sharing → divide. The answer is " + ans;
  }

  // ---------------- per-race state ----------------
  function applyLoadout(R) {
    const m = meta(), x = R.x, L = levelOf(m.xp);
    let passive = m.loadout && m.loadout.passive; if (!PASSIVES[passive] || PASSIVES[passive].lvl > L) passive = "second";
    x.passive = passive; x.brain = {}; const extra = ((m.skills && m.skills.brain) || 0) >= 3 ? 1 : 0;
    ((m.loadout && m.loadout.brain) || []).slice(0, 2).forEach(k => { if (BRAIN[k]) x.brain[k] = 1 + extra; });
    x.forgives = (passive === "second" ? 1 : 0) + (((m.parts && m.parts.shield) || 0) >= 1 ? 1 : 0);
  }
  // Decided in the startRace wrapper (not in newRace): resetRaceState() runs BEFORE
  // state.solo is set on the very first solo race of a session.
  function applyMode(R) {
    const x = R.x; if (!x || x.modeSet) return; x.modeSet = true; const mode = RP.rmode;
    if (mode === "survival" && state.solo) { x.survival = true; R.pitDone = true; R.pitOffer = false; if (RP.cup.on) { RP._cupWas = true; RP.cup.on = false; } }
    else if (mode === "daily" && state.solo) {
      x.daily = true; if (RP.cup.on) { RP._cupWas = true; RP.cup.on = false; }
      const rng = mulberry32(hashStr("daily|" + todayStr())); R.track = TRACKS[Math.floor(rng() * TRACKS.length)]; R.weather = ["clear", "rain", "fog", "storm", "clear"][Math.floor(rng() * 5)]; R.aiProfile = ["sprinter", "steady", "closer", "chaos"][Math.floor(rng() * 4)];
      [0.26, 0.66, 0.82].forEach((p, i) => { if (R.obst[i]) R.obst[i].p = p; }); [0.13, 0.4, 0.58].forEach((p, i) => { if (R.picks[i]) { R.picks[i].p = p; R.picks[i].type = ["boost", "shield", "clock"][i]; } });
      state.difficulty = "medium";
    } else if (RP.cup.on && state.solo && RP.cup.race === 2) x.boss = true;
  }
  H.newRace.push(R => {
    R.x = { lane: "fast", nitro: 0, nitroNext: false, express: 0, ramp: 0, skillAt: 0, log: [], lives: 3, lap: 0, score: 0, tire: null, tireAsked: false, finalDone: false, gateDone: false, gateNext: false, cornerDone: [false, false], adaptBackup: null,
      boss: false, survival: false, daily: false, bossAtk: null, modeSet: false };
    applyLoadout(R);
    if (R.x.passive === "lucky") R.boostReady = true;
  });

  // ---------------- HUD ----------------
  function buildHud() {
    let hud = $("mr2-hud"); if (!hud) {
      hud = document.createElement("div"); hud.id = "mr2-hud"; hud.className = "mr2-hud"; $("streak-badge").after(hud);
      hud.innerHTML = `<div class="mr2-lanes" id="mr2-lanes">${Object.entries(LANES).map(([k, l]) => `<button type="button" data-l="${k}" class="${k === "fast" ? "on" : ""}">${l.e} ${l.n}</button>`).join("")}</div>
        <div class="mr2-btns"><button type="button" id="mr2-nitro" class="mr2-nitro" disabled><i id="mr2-nitro-fill"></i><span>🚀 NITRO</span></button><button type="button" id="mr2-skill" class="mr2-skillbtn"></button><span id="mr2-brain"></span></div>
        <div class="mr2-info"><span id="mr2-combo">COMBO ×1</span><span id="mr2-speed">0 km/h</span><span id="mr2-lives" class="mr2-lives"></span></div>`;
      hud.querySelectorAll("#mr2-lanes button").forEach(b => b.addEventListener("click", () => { const R = RP.race; if (!R || !R.x) return; R.x.lane = b.dataset.l; refreshHud(); beep(520, 0.05); }));
      $("mr2-nitro").addEventListener("click", () => { const R = RP.race; if (!R || !R.x || R.x.nitro < 100 || state.gameOver) return; R.x.nitro = 0; R.x.nitroNext = true; showToast("🚀 NITRO armed! Your next correct answer rockets ahead."); beep(300, 0.3, "sawtooth", 0.05, 900); refreshHud(); });
      $("mr2-skill").addEventListener("click", () => useSkill());
    }
    let pos = $("mr2-pos"); if (!pos) { pos = document.createElement("div"); pos.id = "mr2-pos"; pos.className = "mr2-pos"; $("screen-race").appendChild(pos); }
    return hud;
  }
  function refreshHud() {
    const R = RP.race; if (!R || !R.x) return; const x = R.x;
    document.querySelectorAll("#mr2-lanes button").forEach(b => b.classList.toggle("on", b.dataset.l === x.lane));
    const n = $("mr2-nitro"); if (n) { n.disabled = x.nitro < 100; $("mr2-nitro-fill").style.width = x.nitro + "%"; n.classList.toggle("ready", x.nitro >= 100); }
    const combo = 1 + Math.min(4, Math.floor(state.streak / 2)); const c = $("mr2-combo"); if (c) { c.textContent = `COMBO ×${combo}`; c.className = "c" + combo; }
    const sp = $("mr2-speed"); if (sp) sp.textContent = `${Math.round(40 + combo * 14 + (x.nitroNext ? 60 : 0) + (R.boostReady ? 30 : 0))} km/h`;
    const lv = $("mr2-lives"); if (lv) lv.textContent = x.survival ? "❤️".repeat(Math.max(0, x.lives)) + "🖤".repeat(Math.max(0, 3 - x.lives)) : "";
    const sk = $("mr2-skill"), vs = VSKILL[state.vehicle] || VSKILL.car;
    if (sk) { const left = Math.max(0, Math.ceil((x.skillAt - performance.now()) / 1000)); sk.disabled = left > 0; sk.innerHTML = left > 0 ? `${vs.e} ${left}s` : `${vs.e} ${vs.n}`; sk.title = vs.d; }
    const bb = $("mr2-brain"); if (bb) { bb.innerHTML = Object.entries(x.brain).map(([k, n]) => `<button type="button" data-b="${k}" ${n < 1 ? "disabled" : ""} title="${BRAIN[k].d}">${BRAIN[k].e}<b>${n}</b></button>`).join(""); bb.querySelectorAll("button").forEach(b => b.onclick = () => useBrain(b.dataset.b)); }
  }
  function useSkill() {
    const R = RP.race; if (!R || !R.x || state.gameOver || state.answerLocked) return; const x = R.x;
    if (performance.now() < x.skillAt) return; const vs = VSKILL[state.vehicle] || VSKILL.car;
    x.skillAt = performance.now() + 25000; try { vs.fn(R, x); } catch (e) { console.warn(e); }
    showToast(`${vs.e} ${vs.n}! ${vs.d}`); beep(660, 0.15, "square", 0.05, 1200); refreshHud();
  }
  function useBrain(k) {
    const R = RP.race; if (!R || !R.x || state.gameOver || state.answerLocked) return; const x = R.x; if (!(x.brain[k] > 0)) return; x.brain[k]--;
    if (k === "freeze") { if (typeof timerRemaining === "number") timerRemaining += 4; showToast("❄️ Time frozen! +4 seconds"); }
    else if (k === "fifty") {
      const btns = [...document.querySelectorAll("#answer-options .answer-btn")].filter(b => Number(b.textContent) !== state.currentAnswer && !b.disabled);
      if (btns.length >= 2) { btns.sort(() => Math.random() - 0.5).slice(0, 2).forEach(b => { b.disabled = true; b.classList.add("mr2-gone"); }); showToast("✂️ Two wrong answers removed!"); }
      else showToast(`💡 Clue: the answer has ${String(state.currentAnswer).length} digit(s)`);
    }
    else if (k === "hint") { const s = String(state.currentAnswer); showToast(`💡 Clue: it has ${s.length} digit(s) and ends in ${s.slice(-1)}`); }
    else if (k === "skip") {
      state.answerLocked = true; clearQuestionTimer(); document.querySelectorAll(".answer-btn, .key").forEach(b => (b.disabled = true));
      state.progress = Math.min(0.97, state.progress + (STEP[state.role] || 0.1) * 0.6); carUpdate(); showToast("⏭️ Skipped ahead!"); setTimeout(window.nextQuestion, 500);
    }
    beep(440, 0.1); refreshHud();
  }

  // ---------------- race screen setup ----------------
  H.raceScreen.push(R => {
    buildHud(); const x = R.x; if (!x) return;
    const lane2 = $("lane-p2"); if (lane2) lane2.classList.toggle("mr2-hide", !!x.survival);
    if (x.boss) { const n = $("lane-name-p2"); if (n) n.textContent = "👾 Creeper Kart (BOSS)"; setTimeout(() => showToast("👾 BOSS RACE! Beat the Creeper Kart!"), 3600); }
    if (x.survival) setTimeout(() => showToast("♾️ SURVIVAL! 3 lives — how many laps can you do?"), 3600);
    if (x.daily) $("mr-trackinfo").textContent += " · 📅 Today";
    // plate + glow
    const car = myCar(); if (car) {
      const l2 = meta().look2 || {}; const g = GLOWS[l2.glow]; if (g && l2.glow !== "none") car.style.filter = (car.style.filter || "") + ` drop-shadow(0 0 7px ${g})`;
      let plate = document.querySelector(".mr2-plate"); if (plate) plate.remove();
      const pl = (l2.plate || ((window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "")).toUpperCase().slice(0, 7);
      const parts = meta().parts || {}; const badges = (parts.spoiler ? "🪽" : "") + (parts.magnet ? "🧲" : "") + (parts.shield ? "🛡️" : "");
      if (pl) { plate = document.createElement("div"); plate.className = "mr2-plate"; plate.textContent = pl + badges; car.parentElement.appendChild(plate); }
    }
    const v = state.vehicle, tr = TRAITS[v] || TRAITS.car; refreshHud();
    clearInterval(RP.hudT); RP.hudT = setInterval(() => { if (state.gameOver) { clearInterval(RP.hudT); return; } refreshHud(); posBadge(); }, 500);
  });
  const origUpdateCar = window.updateCar;
  window.updateCar = function (slot, player, isMine) {
    origUpdateCar(slot, player, isMine);
    try { if (isMine) { const plate = document.querySelector(".mr2-plate"), car = $("car-" + slot); if (plate && car) plate.style.left = car.style.left; } } catch (e) {}
  };
  function posBadge() {
    const pos = $("mr2-pos"), R = RP.race; if (!pos || !R || !R.x) return;
    if (R.x.survival) { pos.textContent = `♾️ Lap ${R.x.lap + 1} · Score ${R.x.score + R.correct}`; return; }
    const others = state.solo ? (typeof soloOpponentProgress === "number" ? [soloOpponentProgress] : []) : Object.values(RP.others);
    const rank = 1 + others.filter(o => o > state.progress).length; pos.textContent = ["🥇 1st", "🥈 2nd", "🥉 3rd"][rank - 1] || `${rank}th`;
    pos.className = "mr2-pos r" + rank;
  }

  // ---------------- gameplay hooks ----------------
  H.mult.push(ctx => {
    const R = ctx.R, x = R.x; if (!x) return 1; let m = LANES[x.lane].m;
    const combo = 1 + Math.min(4, Math.floor((state.streak + 1) / 2)); m *= 1 + 0.08 * (combo - 1);
    if (x.nitroNext) { m *= 1.8 + 0.1 * lvl("nitro"); x.nitroNext = false; const s = $("screen-race"); s.classList.remove("mr-zoom"); void s.offsetWidth; s.classList.add("mr-zoom"); }
    if (x.express > 0) { m *= 1.5; x.express--; }
    if (R.q.final) m *= 2.2;
    if (R.q.corner && ctx.ms < 2000) { m *= 1.35; popup("🌀 Drift bonus!", "good"); }
    if (x.passive === "quick" && R.correct < 2) m *= 1.5;
    const meta_ = meta(); m *= 1 + 0.01 * (carLevel(state.vehicle) - 1) + 0.04 * ((meta_.parts && meta_.parts.spoiler) || 0) + 0.02 * ((meta_.skills && meta_.skills.speed) || 0);
    if (x.tire) m *= x.tire.s;
    return m;
  });
  H.penalty.push(ctx => {
    const R = ctx.R, x = R.x; if (!x) return 0;
    if (x.forgives > 0) { x.forgives--; popup("🛡️ Mistake forgiven!", "good"); return -1; }
    let p = LANES[x.lane].pen + (x.tire ? x.tire.pen : 0); if (R.q.final) p += 0.08;
    return p;
  });
  H.blocker.push((o, ctx) => { const x = ctx.R.x; if (x && x.ramp > 0) { x.ramp--; return true; } return false; });
  H.time.push(R => {
    const x = R.x; if (!x) return 0; const m = meta(); let t = 0.4 * ((m.skills && m.skills.brain) || 0);
    if (x.passive === "calm") t += 1; if (x.gateNext) t += 3; if (x.survival) t -= Math.min(3, x.lap * 0.5);
    return t;
  });
  H.pre.push(ctx => {
    const R = ctx.R, x = R.x; if (!x || !x.survival || !ctx.isCorrect) return;
    if (state.progress + (STEP[ctx.role] || 0.1) * (ctx.mult || 1) * 1.3 >= 0.97) { x.lap++; x.score += 10; state.progress = 0.02; R.obst.forEach(o => { o.cleared = false; o.el && o.el.classList.remove("dodged", "hit"); }); R.picks.forEach(p => { p.got = false; p.el && p.el.classList.remove("gone"); }); R.pitDone = true; carUpdate(); showToast(`🏁 Lap ${x.lap + 1}! Faster now!`); beep(784, 0.2); }
  });
  H.beforeQ.push(R => {
    const x = R.x; if (!x || x.survival) return false;
    if (!x.gateDone && state.progress >= 0.3 && state.progress < 0.48 && !R.dodgeNext) {
      x.gateDone = true;
      offer({ e: "🚪", t: "SHORTCUT!", p: "A hard question: right = jump ahead 12%, wrong = back 5%.", opts: [{ label: "🚪 Take it!", fn: () => { x.gateNext = true; x.adaptBackup = R.adapt; R.adapt += 3; } }, { label: "No thanks", ghost: true }] });
      return true;
    }
    if (R.pitDone && !R.pitActive && !x.tireAsked && !R.pitOffer) {
      x.tireAsked = true;
      offer({ e: "🛞", t: "PICK YOUR TIRES", p: "Fresh rubber for the second half!", opts: [
        { label: "🔴 Soft — +12% speed, mistakes cost more", fn: () => { x.tire = { s: 1.12, pen: 0.03 }; showToast("🔴 Soft tires on!"); } },
        { label: "🟡 Medium — +6% speed", fn: () => { x.tire = { s: 1.06, pen: 0 }; showToast("🟡 Medium tires on!"); } },
        { label: "⚪ Hard — safe, mistakes cost less", fn: () => { x.tire = { s: 1, pen: -0.02 }; showToast("⚪ Hard tires on!"); } }] });
      return true;
    }
    return false;
  });
  H.qStart.push(R => {
    const x = R.x; if (!x) return; const lab = $("your-turn-label");
    if (!R.q.dodge && !R.q.lightning && !R.pitActive) {
      if (x.gateNext) { R.q.gate = true; x.gateNext = false; lab.textContent = "🚪 SHORTCUT QUESTION"; }
      else if (!x.survival && state.progress >= 0.88 && !x.finalDone) { x.finalDone = true; R.q.final = true; lab.textContent = "💥 FINAL SPRINT! Double or nothing!"; showToast("💥 FINAL SPRINT!"); beep(220, 0.3, "sawtooth", 0.05, 660); }
      else if (R.track.curve) {
        const z = state.progress >= 0.33 && state.progress < 0.42 ? 0 : state.progress >= 0.7 && state.progress < 0.78 ? 1 : -1;
        if (z >= 0 && !x.cornerDone[z]) { x.cornerDone[z] = true; R.q.corner = true; lab.textContent = "🌀 CORNER! Answer in 2s to drift!"; }
      }
    }
    if (x.bossAtk) {
      const a = x.bossAtk; x.bossAtk = null;
      if (a === "scramble") { const box = $("answer-options").querySelector(".choices-grid") || $("answer-options"), kids = [...box.children]; if (kids.length > 1 && kids.every(k => k.classList.contains("answer-btn"))) { kids.sort(() => Math.random() - 0.5).forEach(k => box.appendChild(k)); showToast("🧨 Creeper scrambled the answers!"); } }
      else { const qt = $("question-text"); qt.classList.add("mr2-blur"); setTimeout(() => qt.classList.remove("mr2-blur"), 1700); showToast("🌫 Creeper fogged the question!"); }
    }
    if (x.survival) { const t = $("your-turn-label"); if (!R.q.dodge && !R.q.lightning) t.textContent = `♾️ Lap ${x.lap + 1}`; }
    refreshHud();
  });
  H.after.push(ctx => {
    const R = ctx.R, x = R.x; if (!x) return;
    R.log = R.log || []; R.log.push({ t: R.qText || "", a: R.qAns, v: ctx.value, ok: ctx.isCorrect, ms: Math.round(ctx.ms) });
    if (ctx.isCorrect) {
      x.nitro = Math.min(100, x.nitro + 22 + 3 * lvl("nitro"));
      if (state.streak > 0 && state.streak % 5 === 0 && !x.survival) { x.ramp = Math.max(x.ramp, 1); showToast("🛫 RAMP! You'll jump the next obstacle!"); }
      const mg = (meta().parts && meta().parts.magnet) || 0;
      if (mg) R.picks.forEach(pk => { if (!pk.got && pk.p > state.progress && pk.p <= state.progress + 0.03 + 0.02 * mg) A.collect(pk); });
      if (R.q.gate) { state.progress = Math.min(0.97, state.progress + 0.12); carUpdate(); popup("🚪 Shortcut! +12%", "good"); beep(880, 0.2); }
    } else if (state.answerMode === "choice" || state.wrongAttempts === 1) {
      if (R.q.gate) { state.progress = Math.max(0, state.progress - 0.05); carUpdate(); }
      if (x.survival && !ctx.wasDodge) { x.lives--; shakeScreen(); refreshHud(); }
      else if (x.survival && ctx.wasDodge) { x.lives--; refreshHud(); }
    }
    if (R.q.gate && x.adaptBackup !== null) { R.adapt = x.adaptBackup; x.adaptBackup = null; }
    if (x.survival && x.lives <= 0 && !state.gameOver && !x.ended) { x.ended = true; setTimeout(() => { if (!state.gameOver) window.loseSoloRace(); }, 400); }
    refreshHud();
  });

  // ---------------- VS screen + loadout ----------------
  const baseStartRace = window.startRace;
  window.startRace = function () {
    const R = RP.race; if (R && R.x) applyMode(R);
    if (state.solo && R && R.x && !RP.noVS) { try { return showVS(() => baseStartRace()); } catch (e) { console.warn(e); } }
    return baseStartRace();
  };
  let vsTimer = null;
  function showVS(done) {
    const R = RP.race, x = R.x, m = meta(), L = levelOf(m.xp); let o = $("mr2-vs"); if (o) o.remove();
    o = document.createElement("div"); o.id = "mr2-vs"; o.className = "mr2-vs";
    const rv = x.boss ? { e: "👾", n: "Creeper Kart" } : x.survival ? null : RIVALS[RP.rival];
    const name = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "You";
    const chosen = new Set(Object.keys(x.brain)); let passive = x.passive;
    o.innerHTML = `<div class="mr2-vs-card">
      <div class="mr2-vs-mode">${x.survival ? "♾️ SURVIVAL" : x.daily ? "📅 RACE OF THE DAY" : x.boss ? "👾 BOSS RACE" : "🏁 RACE"}</div>
      <div class="mr2-vs-row"><div class="mr2-vs-side"><div class="mr2-vs-car">${VEHICLE_EMOJI[state.vehicle] || "🏎️"}</div><b>${esc(name)}</b><small>Lv ${L} ${titleOf(L)}</small></div>
        <div class="mr2-vs-vs">VS</div>
        <div class="mr2-vs-side">${rv ? `<div class="mr2-vs-car">${rv.e}</div><b>${rv.n}</b><small>${x.boss ? "special attacks!" : "rival"}</small>` : `<div class="mr2-vs-car">⏱️</div><b>Survive!</b><small>3 lives</small>`}</div></div>
      <div class="mr2-vs-track">${R.track.e} ${R.track.name} · ${WEATHERS[R.weather].e} ${WEATHERS[R.weather].n}</div>
      <div class="mr2-vs-h">🧠 Pick 2 brain skills</div><div class="mr2-chips" id="mr2-vs-brain"></div>
      <div class="mr2-vs-h">⭐ Passive</div><div class="mr2-chips" id="mr2-vs-pass"></div>
      <p class="mr2-vs-hint" id="mr2-vs-desc"></p>
      ${m.tutorial ? "" : `<div class="mr2-tut"><b>How to race</b><br>🛡⚡🔥 pick a lane every question · 🚀 fill NITRO with correct answers · ✨ use your car skill · 🧠 brain skills help on hard ones · 🚧 answer fast at obstacles!</div>`}
      <button class="primary-btn" id="mr2-vs-go" type="button">START! 🏁</button></div>`;
    document.body.appendChild(o);
    function draw() {
      $("mr2-vs-brain").innerHTML = Object.entries(BRAIN).map(([k, b]) => `<button type="button" class="mr2-chip ${chosen.has(k) ? "on" : ""}" data-k="${k}">${b.e} ${b.n}</button>`).join("");
      $("mr2-vs-pass").innerHTML = Object.entries(PASSIVES).map(([k, p]) => `<button type="button" class="mr2-chip ${passive === k ? "on" : ""}" data-p="${k}" ${p.lvl > L ? "disabled" : ""}>${p.e} ${p.n}${p.lvl > L ? ` 🔒Lv${p.lvl}` : ""}</button>`).join("");
      o.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k; if (chosen.has(k)) chosen.delete(k); else { if (chosen.size >= 2) chosen.delete([...chosen][0]); chosen.add(k); } $("mr2-vs-desc").textContent = BRAIN[k].d; draw(); });
      o.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { passive = b.dataset.p; $("mr2-vs-desc").textContent = PASSIVES[passive].d; draw(); });
    }
    draw();
    const go = () => {
      clearTimeout(vsTimer); if (!$("mr2-vs")) return;
      m.loadout = { brain: [...chosen], passive: passive }; m.tutorial = true; saveMeta(); applyLoadout(R); o.remove(); done();
    };
    $("mr2-vs-go").onclick = go; clearTimeout(vsTimer); vsTimer = setTimeout(go, 20000); beep(330, 0.15); setTimeout(() => beep(494, 0.2), 150);
  }
  const origGoHome = window.goHome;
  window.goHome = function () { try { const v = $("mr2-vs"); if (v) v.remove(); clearTimeout(vsTimer); clearInterval(RP.hudT); const p = $("mr2-pos"); if (p) p.textContent = ""; } catch (e) {} return origGoHome(); };
  const homeBtn2 = $("home-btn"); if (homeBtn2) homeBtn2.addEventListener("click", () => { const v = $("mr2-vs"); if (v) v.remove(); clearTimeout(vsTimer); });

  // ---------------- countdown lights + engine sound ----------------
  (function () {
    const num = $("race-countdown-number"), box = $("race-countdown"); if (!num || !box) return;
    const lights = document.createElement("div"); lights.className = "mr2-lights"; lights.innerHTML = "<i></i><i></i><i></i>"; box.insertBefore(lights, box.firstChild);
    new MutationObserver(() => {
      const v = num.textContent.trim(); const n = v === "3" ? 1 : v === "2" ? 2 : v === "1" ? 3 : 0;
      lights.className = "mr2-lights l" + n + (v === "GO!" ? " go" : "");
      if (v === "GO!") beep(180, 0.5, "sawtooth", 0.05, 900); else if (n) beep(200 + n * 90, 0.12, "sawtooth", 0.035, 260 + n * 120);
    }).observe(num, { childList: true, characterData: true, subtree: true });
  })();

  // ---------------- rewards: xp / level / mastery / drops / boss ----------------
  H.award.push(actx => {
    const R = actx.R, x = R.x, m = RP.meta; if (!x || !m) return;
    if (!m.name) m.name = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "";
    const pts = actx.win ? 3 : 1;
    // XP + level
    const gain = R.correct * 2 + (actx.win ? 10 : 0) + 5 + (x.survival ? x.lap * 5 : 0); x.xpGain = gain;
    const before = levelOf(m.xp); m.xp = (m.xp || 0) + gain; const after = levelOf(m.xp); x.levelUp = after > before ? after : 0;
    if (x.levelUp) { actx.coins += after * 2; actx.note += ` · ⬆️ LEVEL ${after}! +${after * 2}🪙`; }
    // car xp
    const v = state.vehicle || "car"; const c = m.cars[v] = m.cars[v] || { xp: 0, races: 0, wins: 0 }; const cb = carLevel(v); c.xp += R.correct + (actx.win ? 8 : 0); c.races++; if (actx.win) c.wins++; if (carLevel(v) > cb) actx.note += ` · 🚗 ${VEH_NAMES[v] || v} Lv ${carLevel(v)}!`;
    // luck
    actx.coins += (m.skills && m.skills.luck) || 0;
    // boss
    if (x.boss && actx.win) { actx.coins += 25; actx.note += " · 👾 BOSS DEFEATED +25🪙"; m.bossWins = (m.bossWins || 0) + 1; }
    // survival
    if (x.survival) { const sc = x.score + R.correct; actx.coins += Math.floor(sc / 5); if (sc > (m.survivalBest || 0)) { m.survivalBest = sc; actx.note += " · 🏆 NEW BEST!"; } x.finalScore = sc; }
    // daily
    if (x.daily && actx.win) { const t = actx.el || 999; if (m.daily.date !== todayStr() || !m.daily.best || t < m.daily.best) m.daily = { date: todayStr(), best: t }; actx.note += ` · 📅 ${t}s`; }
    // weekly tournament points
    const wk = mondayKey(); if (m.weekly.week !== wk) { m.prevWeekly = m.weekly; m.weekly = { week: wk, pts: 0 }; } m.weekly.pts += pts + (x.boss && actx.win ? 3 : 0);
    // mastery
    try { if (typeof myTopicStats === "object" && myTopicStats) for (let n = 2; n <= 12; n++) { const s = myTopicStats["times-" + n]; if (s && s.correct >= 15 && s.wrong / Math.max(1, s.correct + s.wrong) <= 0.15 && !m.mastered[n]) { m.mastered[n] = true; actx.coins += 8; actx.note += ` · 🏅 Master of ${n}!`; setTimeout(() => showToast(`🏅 Master of ${n}! +8🪙`), 1200); } } } catch (e) {}
    // restore cup toggle if we forced it off
    if (RP._cupWas) { RP.cup.on = true; RP._cupWas = false; }
    x.pts = pts;
  });
  H.awardMeta.push(actx => { try { dropSticker(actx); } catch (e) {} });
  async function dropSticker(actx) {
    if (!LB || !LB.getCosmetics || Math.random() > (actx.win ? 0.55 : 0.3)) return;
    const cos = await LB.getCosmetics(); if (!cos) return; const pool = [];
    ["mathrace-sticker", "mathrace-paint", "mathrace-trail"].forEach(t => (cos.costumes[t] || []).forEach(it => { if (!it.owned && it.id !== "none" && it.id !== "default") pool.push([t, it]); }));
    if (!pool.length) return; const [t, it] = pick(pool); const r = await LB.unlockCosmetic(t, it.id, {}); if (r && r.ok) setTimeout(() => showToast(`🎁 Pack drop: ${it.preview || ""} ${it.name}!`), 1800);
  }

  // ---------------- post-race summary + share ----------------
  H.over.push(actx => {
    const R = actx.R, x = R.x; if (!x) return; const card = document.querySelector("#screen-over .card"); if (!card) return;
    const old = $("mr2-summary"); if (old) old.remove();
    const log = R.log || [], ok = log.filter(e => e.ok), bad = log.filter(e => !e.ok && e.t), acc = log.length ? Math.round(ok.length / log.length * 100) : 0;
    const fast = ok.length ? Math.min(...ok.map(e => e.ms)) : 0, avg = ok.length ? Math.round(ok.reduce((a, e) => a + e.ms, 0) / ok.length) : 0;
    if (x.survival) { const w = $("winner-text"); if (w) w.textContent = "Game Over!"; const s = $("over-sub"); if (s) s.textContent = `Score ${x.finalScore || 0} · ${x.lap + 1} lap${x.lap ? "s" : ""} · +${actx.coins} 🪙${actx.note}`; }
    const m = RP.meta, L = levelOf((m && m.xp) || 0), nextXp = 40 * L * L, curXp = 40 * (L - 1) * (L - 1), pct = m ? Math.round(((m.xp - curXp) / (nextXp - curXp)) * 100) : 0;
    const sum = document.createElement("div"); sum.id = "mr2-summary"; sum.className = "mr2-summary";
    const seen = new Set();
    sum.innerHTML = `<div class="mr2-sum-h">📊 Race report</div>
      <div class="mr2-stats"><div><b>${acc}%</b><span>accuracy</span></div><div><b>${(fast / 1000).toFixed(1)}s</b><span>fastest</span></div><div><b>${(avg / 1000).toFixed(1)}s</b><span>average</span></div><div><b>+${x.xpGain || 0}</b><span>XP</span></div></div>
      <div class="mr2-lvl">Lv ${L} ${titleOf(L)}<div class="mr2-lvlbar"><i style="width:${clamp(pct, 0, 100)}%"></i></div></div>
      ${bad.length ? `<div class="mr2-sum-h">🧠 Let's learn from these</div>` + bad.filter(e => !seen.has(e.t) && seen.add(e.t)).slice(0, 4).map(e => `<div class="mr2-mistake"><img src="../icon-192.png" alt="Bo"><div><b>${esc(e.t)}</b> → ${esc(e.a)}<br><small>${esc(explain(e.t, e.a))}</small></div></div>`).join("") : `<div class="mr2-sum-h">🎉 No mistakes! Super!</div>`}
      <button class="ghost-btn" id="mr2-share" type="button">📸 Share my result</button>`;
    const sb = $("scoreboard"); if (sb) sb.before(sum); else card.appendChild(sum);
    $("mr2-share").onclick = () => shareCard(actx, { acc, fast, L });
  });
  function shareCard(actx, s) {
    const R = actx.R, x = R.x, c = document.createElement("canvas"); c.width = 640; c.height = 360; const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, 360); grd.addColorStop(0, "#5aa9f0"); grd.addColorStop(0.62, "#bfe3ff"); grd.addColorStop(0.62, "#5fb83a"); grd.addColorStop(1, "#3f8a2a"); g.fillStyle = grd; g.fillRect(0, 0, 640, 360);
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(24, 24, 592, 312); g.strokeStyle = "#111"; g.lineWidth = 6; g.strokeRect(24, 24, 592, 312);
    g.fillStyle = "#ffd23f"; g.font = "bold 34px monospace"; g.fillText("MATH RACE", 48, 76);
    g.fillStyle = "#fff"; g.font = "bold 26px monospace"; const name = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().name) || "Racer";
    g.fillText(`${name} · Lv ${s.L} ${titleOf(s.L)}`, 48, 116);
    g.font = "70px sans-serif"; g.fillText(VEHICLE_EMOJI[state.vehicle] || "🏎️", 48, 205); g.fillText(R.track.e, 150, 205);
    g.font = "bold 40px monospace"; g.fillStyle = actx.win ? "#7dff8a" : "#ffd23f"; g.fillText(x.survival ? `SURVIVAL ${x.finalScore || 0} pts` : actx.win ? "🏆 I WON!" : "🏁 FINISHED", 48, 262);
    g.font = "19px monospace"; g.fillStyle = "#fff"; g.fillText(`Accuracy ${s.acc}%  ·  Best streak ${R.bestStreak}  ·  ${(R.log || []).filter(e => e.ok).length} correct`, 48, 300);
    g.fillStyle = "#ccc"; g.font = "16px monospace"; g.fillText("BrainBox · playalidrisi.fun", 48, 326);
    c.toBlob(async blob => {
      try { const file = new File([blob], "math-race.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "My Math Race result" }); return; } } catch (e) {}
      const url = URL.createObjectURL(blob); const o = document.createElement("div"); o.className = "mr2-overlay"; o.innerHTML = `<div class="mr2-card"><div class="mr2-t">📸 Your result</div><img src="${url}" style="width:100%;border:3px solid #111"><p>Press and hold the picture to save it!</p><div class="mr2-opts"><a class="primary-btn" href="${url}" download="math-race.png">Download</a><button class="ghost-btn" id="mr2-share-x">Close</button></div></div>`; document.body.appendChild(o); o.querySelector("#mr2-share-x").onclick = () => o.remove();
    });
  }

  // ---------------- garage tabs ----------------
  RP.garageTabs = {};
  const bar = (v, max) => `<div class="mr-bar"><i style="width:${clamp(v / max * 100, 4, 100)}%"></i></div>`;
  RP.garageTabs.cars = async (body, m, wallet, money) => {
    const owned = LB && LB.getOwnedVehicles ? await LB.getOwnedVehicles("mathrace") : {}; const l2 = m.look2 || (m.look2 = { plate: "", glow: "none" });
    const L = levelOf(m.xp);
    body.innerHTML = money + `<h3 class="mr2-h">🛠 Parts</h3>` + Object.entries(PARTS).map(([k, p]) => { const l = (m.parts && m.parts[k]) || 0, cost = p.costs[l]; return `<div class="mr-row"><span>${p.e} ${p.n} Lv ${l}/3<br><small>${p.d}</small>${bar(l, 3)}</span>${cost ? `<button data-part="${k}">🪙 ${cost}</button>` : "<button disabled>MAX</button>"}</div>`; }).join("")
      + `<h3 class="mr2-h">🪪 Plate &amp; glow</h3><div class="mr-row"><span>Plate text<br><small>up to 7 letters</small></span><input id="mr2-plate" maxlength="7" value="${esc(l2.plate || "")}" placeholder="${esc((m.name || "").slice(0, 7))}" style="width:96px"></div><div class="mr-row"><span>Underglow</span><div id="mr2-glows">${Object.entries(GLOWS).map(([k, c]) => `<button type="button" class="mr2-sw ${l2.glow === k ? "on" : ""}" data-g="${k}" style="background:${k === "none" ? "#ddd" : c}">${k === "none" ? "✕" : ""}</button>`).join("")}</div></div>`
      + `<h3 class="mr2-h">🏛 Showroom</h3><div class="mr2-show">` + Object.keys(VEH_NAMES).map(v => { const t = TRAITS[v] || TRAITS.car, own = v === "car" || owned[v], c = (m.cars && m.cars[v]) || { xp: 0, races: 0, wins: 0 }, sk = VSKILL[v] || VSKILL.car;
        return `<div class="mr2-vcard ${own ? "" : "lock"}"><div class="mr2-vem">${VEHICLE_EMOJI[v]}</div><b>${VEH_NAMES[v]}</b><small>${own ? `Lv ${carLevel(v)} · ${c.races || 0} races · ${c.wins || 0} wins` : "🔒 locked — buy it in the ride picker"}</small><small>${sk.e} ${sk.n}: ${sk.d}</small><div class="mr2-stat">⚡ ${bar((t.s - 0.9) * 10, 2)}</div><div class="mr2-stat">🎯 ${bar(1 - t.p * 20 + 0.1, 1.2)}</div></div>`; }).join("") + `</div>`;
    body.querySelectorAll("button[data-part]").forEach(b => b.onclick = async () => { const k = b.dataset.part, cost = PARTS[k].costs[m.parts[k] || 0]; const r = await LB.spendMathRaceCoins(cost); if (!r.ok) { alert("Not enough coins yet!"); return; } m.parts[k] = (m.parts[k] || 0) + 1; saveMeta(); RP.api.renderGarage(); });
    $("mr2-plate").onchange = e => { l2.plate = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 7); saveMeta(); };
    body.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { l2.glow = b.dataset.g; saveMeta(); RP.api.renderGarage(); });
  };
  RP.garageTabs.skills = async (body, m, wallet, money) => {
    const L = levelOf(m.xp), sk = m.skills || (m.skills = { speed: 0, brain: 0, luck: 0 }), spent = (sk.speed || 0) + (sk.brain || 0) + (sk.luck || 0), pts = L - 1 - spent;
    body.innerHTML = `<p>🎖 <b>Lv ${L} ${titleOf(L)}</b> · skill points: <b>${pts}</b></p>` + Object.entries(TREE).map(([k, t]) => `<div class="mr-row"><span>${t.e} ${t.n} ${sk[k] || 0}/3<br><small>${t.d}</small>${bar(sk[k] || 0, 3)}</span>${(sk[k] || 0) >= 3 ? "<button disabled>MAX</button>" : `<button data-sk="${k}" ${pts < 1 ? "disabled" : ""}>+1 ⭐</button>`}</div>`).join("")
      + `<h3 class="mr2-h">⭐ Passives</h3>` + Object.entries(PASSIVES).map(([k, p]) => `<div class="mr-row"><span>${p.e} ${p.n}<br><small>${p.d}</small></span><button disabled>${p.lvl <= L ? "✔ unlocked" : "🔒 Lv " + p.lvl}</button></div>`).join("")
      + `<h3 class="mr2-h">🏅 Times-table mastery</h3><div class="mr2-mast">${Array.from({ length: 11 }, (_, i) => i + 2).map(n => { const s = typeof myTopicStats === "object" && myTopicStats && myTopicStats["times-" + n]; const done = m.mastered && m.mastered[n]; return `<div class="mr2-mst ${done ? "on" : ""}"><b>${n}×</b><small>${done ? "Master!" : s ? `${Math.min(15, s.correct || 0)}/15` : "0/15"}</small></div>`; }).join("")}</div><p><small>Get 15 right at ≥85% accuracy to master a table.</small></p>`;
    body.querySelectorAll("button[data-sk]").forEach(b => b.onclick = () => { sk[b.dataset.sk] = (sk[b.dataset.sk] || 0) + 1; saveMeta(); RP.api.renderGarage(); });
  };
  RP.garageTabs.pass = async (body, m, wallet) => {
    const L = levelOf(m.xp), cl = m.passClaimed || (m.passClaimed = {});
    body.innerHTML = `<p>🎟 <b>Race Pass</b> — reach new levels to unlock rewards. You are <b>Lv ${L}</b> (${(m.xp || 0)} XP).</p>` + PASS.map((p, i) => { const n = i + 1, got = cl[n], can = L >= n && !got; return `<div class="mr-row"><span>Level ${n} · ${titleOf(n)}<br><small>${p.c ? "🪙 " + p.c : "💎 " + p.g}</small></span>${got ? "<button disabled>Done ✔</button>" : can ? `<button data-pass="${n}">Claim</button>` : `<button disabled>🔒</button>`}</div>`; }).join("");
    body.querySelectorAll("button[data-pass]").forEach(b => b.onclick = async () => { const n = +b.dataset.pass, p = PASS[n - 1]; if (cl[n]) return; cl[n] = true; try { await LB.creditWallet({ coins: p.c || 0, gems: p.g || 0 }); } catch (e) {} saveMeta(); RP.api.renderGarage(); });
  };
  RP.garageTabs.board = async (body, m, wallet) => {
    body.innerHTML = "<p>Loading the class boards…</p>"; let rows = []; try { rows = await LB.getMathRaceBoard(); } catch (e) {}
    const today = todayStr(), wk = mondayKey(), last = mondayKey(new Date(Date.now() - 7 * 86400000));
    const me = (window.AIGPlayer && AIGPlayer.getPlayer() && AIGPlayer.getPlayer().id) || "";
    const daily = rows.filter(r => r.daily && r.daily.date === today && r.daily.best).sort((a, b) => a.daily.best - b.daily.best).slice(0, 10);
    const week = rows.map(r => ({ ...r, pts: r.weekly.week === wk ? r.weekly.pts : 0 })).filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 10);
    const prev = rows.map(r => ({ ...r, pts: r.weekly.week === last ? r.weekly.pts : r.prevWeekly.week === last ? r.prevWeekly.pts : 0 })).filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts);
    const rank = prev.findIndex(r => r.id === me); const prize = rank >= 0 && rank < 3 && m.tourClaimed !== last ? [{ c: 40, g: 1 }, { c: 25 }, { c: 15 }][rank] : null;
    const list = (arr, f) => arr.length ? arr.map((r, i) => `<div class="mr-row ${r.id === me ? "me" : ""}"><span>${["🥇", "🥈", "🥉"][i] || i + 1 + "."} ${esc(r.name)}</span><b>${f(r)}</b></div>`).join("") : "<p><small>No results yet — be the first!</small></p>";
    const d = (() => { const rng = mulberry32(hashStr("daily|" + today)); const t = TRACKS[Math.floor(rng() * TRACKS.length)]; return `${t.e} ${t.name}`; })();
    body.innerHTML = `<h3 class="mr2-h">📅 Race of the Day — ${d}</h3><p><small>Pick mode “📅 Today” before you race. Medium difficulty, same track for the whole class. Your best: ${m.daily && m.daily.date === today ? m.daily.best + "s" : "—"}</small></p>${list(daily, r => r.daily.best + "s")}
      <h3 class="mr2-h">🏆 Weekly tournament (win = 3 pts, finish = 1)</h3>${list(week, r => r.pts + " pts")}
      ${prize ? `<div class="mr-row"><span>🎁 You placed #${rank + 1} last week!</span><button id="mr2-prize">Claim ${prize.c}🪙${prize.g ? " +" + prize.g + "💎" : ""}</button></div>` : ""}
      <h3 class="mr2-h">♾️ Your Survival best</h3><p><b>${m.survivalBest || 0}</b> points</p>`;
    const pb = $("mr2-prize"); if (pb) pb.onclick = async () => { m.tourClaimed = last; try { await LB.creditWallet({ coins: prize.c, gems: prize.g || 0 }); } catch (e) {} saveMeta(); RP.api.renderGarage(); };
  };
  RP.garageTabs.more = async (body, m) => {
    const cb = (k, label) => `<label class="mr-row"><span>${label}</span><input type="checkbox" data-o="${k}" ${ls.get(k, "0") === "1" ? "checked" : ""}></label>`;
    body.innerHTML = `<h3 class="mr2-h">Comfort</h3>${cb("mr2_calm", "Calm mode (less shaking &amp; zooming)")}${cb("mr2_big", "Bigger question text")}${cb("mr2_mute", "Mute race sounds")}
      <h3 class="mr2-h">Help</h3><div class="mr-row"><span>Show the “How to race” tips again</span><button id="mr2-tut">Replay</button></div>
      <h3 class="mr2-h">Boss wins</h3><p>👾 Boss races won: <b>${m.bossWins || 0}</b> (turn on Cup mode — the 3rd race is a boss!)</p>`;
    body.querySelectorAll("[data-o]").forEach(i => i.onchange = () => { ls.set(i.dataset.o, i.checked ? "1" : "0"); applyComfort(); });
    $("mr2-tut").onclick = () => { m.tutorial = false; saveMeta(); alert("You'll see the tips on your next race!"); };
  };

  // keep meta name fresh + roll the weekly window on load
  setTimeout(() => { const m = RP.meta; if (m) { const wk = mondayKey(); if (m.weekly && m.weekly.week && m.weekly.week !== wk) { m.prevWeekly = m.weekly; m.weekly = { week: wk, pts: 0 }; saveMeta(); } } }, 2500);
})();
