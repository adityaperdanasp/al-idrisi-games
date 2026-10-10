/* =====================================================================
   BrainBox 2.0 -- "Block World" theme runtime (hub).
   Everything here is original pixel art drawn from small text grids; no
   third-party textures, logos or names. Pure presentation: it re-skins
   and re-arranges the existing hub elements (same ids, same handlers)
   and adds the reveal / avatar creator / hotbar / advancement toasts.
   ===================================================================== */
(function () {
  "use strict";
  const BW = (window.BW = {});
  const $ = id => document.getElementById(id);
  const LB = () => window.AIGLeaderboard;
  const player = () => (window.AIGPlayer && AIGPlayer.getPlayer()) || null;
  const SVGNS = 'xmlns="http://www.w3.org/2000/svg"';

  // ---------------- sprites ----------------
  function sprite(rows, pal, opts) {
    opts = opts || {};
    const w = Math.max(...rows.map(r => r.length)), h = rows.length; let rects = "";
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const c = r[x];
        if (c === "." || !pal[c]) { x++; continue; }
        let e = x; while (e < r.length && r[e] === c) e++;
        rects += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[c]}"/>`; x = e;
      }
    });
    return `<svg ${SVGNS} viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" class="bw-sprite ${opts.cls || ""}" style="${opts.style || ""}">${rects}</svg>`;
  }
  BW.sprite = sprite;
  const S = {
    bo: { rows: ["..PPPPPPPP..", ".PLLPPpPPPP.", ".PLPPPPpPPP.", "PPPPPPPPPPPP", "PPEEPPPPEEPP", "PPEKPPPPKEPP", "PPPPPPPPPPPP", "PPPPmmmmPPPP", ".PPPPPPPPBP.", ".PPPpPPpPPP.", "..PPPPPPPP.."], pal: { P: "#f281a0", p: "#d65f84", L: "#ffc4d2", E: "#fff", K: "#2b1b24", m: "#a8325a", B: "#8fd3f0" } },
    emerald: { rows: ["...gg...", "..gLGg..", ".gLGGGg.", "gLGGGGGd", "gGGGGGdd", ".gGGGdd.", "..gGdd..", "...dd..."], pal: { g: "#0b6b2a", L: "#9dffb4", G: "#2fd160", d: "#128c3e" } },
    diamond: { rows: ["..wwww..", ".wLLCCw.", "wLCCCCCw", "wCCCCCCw", ".wCCCCw.", "..wCCw..", "...ww..."], pal: { w: "#0e7c8c", L: "#d9fbff", C: "#4fe0f0" } },
    heart: { rows: [".rr.rr.", "rRRrRRr", "rRRRRRr", ".rRRRr.", "..rRr..", "...r..."], pal: { r: "#7a0f16", R: "#ee3340" } },
    grass: { rows: ["GGGGGGGG", "GgGGgGGG", "dGdGGdGd", "dddddddd", "dDddddDd", "dddDdddd", "ddddddDd", "dDdddddd"], pal: { G: "#5fb83a", g: "#4a9a2c", d: "#8a5a34", D: "#6e4426" } },
    chest: { rows: ["..BBBBBBBBBB..", ".BbbbbbbbbbbB.", "BbbbbbbbbbbbbB", "BBBBBBggBBBBBB", "BbbbbbGGbbbbbB", "BbbbbbGGbbbbbB", "BbbbbbbbbbbbbB", "BBBBBBBBBBBBBB"], pal: { B: "#4a2d12", b: "#a8702f", g: "#d8d8d8", G: "#f5c542" } },
    chestOpen: { rows: ["BBBBBBBBBBBBBB", "BbbbbbbbbbbbbB", ".BBBBBBBBBBBB.", "..............", "yyyyyyyyyyyyyy", "BBBBBBggBBBBBB", "BbbbbbGGbbbbbB", "BbbbbbbbbbbbbB", "BBBBBBBBBBBBBB"], pal: { B: "#4a2d12", b: "#a8702f", g: "#d8d8d8", G: "#f5c542", y: "#fff2a8" } },
    globe: { rows: ["..bbbb..", ".bGGbbb.", "bGGGbbGb", "bbGbbGGb", "bbbbbGGb", "bGbbbbbb", ".bGGbbb.", "..bbbb.."], pal: { b: "#3d8fe0", G: "#58b36a" } },
    creeper: { rows: ["GGGGGGGG", "GgGGGGgG", "GKKGGKKG", "GKKGGKKG", "GGGKKGGG", "GGKKKKGG", "GGKGGKGG", "GgGGGGgG"], pal: { G: "#4caf50", g: "#3d8f40", K: "#122214" } },
    trophy: { rows: ["yyyyyyyy", "yYyyyyYy", ".yyyyyy.", "..yyyy..", "...yy...", "...yy...", "..yyyy..", ".yyyyyy."], pal: { y: "#f5c542", Y: "#d99a1e" } }
  };
  Object.keys(S).forEach(k => { BW["svg_" + k] = (opts) => sprite(S[k].rows, S[k].pal, opts); });

  // ---------------- avatar ----------------
  const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];
  const HAIRS = ["#3b2314", "#1c1c1c", "#c8a04a", "#b5451b", "#e8e8e8", "#4a2a8a"];
  const SHIRTS = ["#3a8dde", "#e04b4b", "#4caf50", "#f2b632", "#9b59b6", "#ff7eb6", "#2c3e50", "#00bcd4"];
  const HATS = ["none", "cap", "crown", "beanie", "band"];
  const HAT_NAMES = ["No hat", "Cap", "Crown", "Beanie", "Band"];
  BW.AV = { SKINS, HAIRS, SHIRTS, HATS, HAT_NAMES };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  BW.defaultAvatar = function (name) { const h = hash(name || "x"); return { skin: h % 5, hair: (h >> 3) % 6, shirt: (h >> 6) % 8, hat: 0 }; };
  function headRows(cfg) {
    const rows = ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SWDSSDWS", "SSSSSSSS", "SSSMMSSS", "SSSSSSSS", "SSSSSSSS"];
    const hat = HATS[cfg.hat] || "none";
    if (hat === "cap") { rows[0] = "CCCCCCCC"; rows[1] = "CCCCCCCC"; rows[2] = "CCCCCCCC"; }
    else if (hat === "crown") { rows[0] = "G.G.G.G."; rows[1] = "GGGGGGGG"; }
    else if (hat === "beanie") { rows[0] = "BBBBBBBB"; rows[1] = "BBBBBBBB"; rows[2] = "BBBBBBBB"; }
    else if (hat === "band") { rows[2] = "RRRRRRRR"; }
    return rows;
  }
  function avatarPal(cfg) {
    const skin = SKINS[cfg.skin] || SKINS[0];
    return { H: HAIRS[cfg.hair] || HAIRS[0], S: skin, W: "#fff", D: "#2b2b4a", M: "#a85a3a", C: SHIRTS[cfg.shirt] || SHIRTS[0], G: "#f5c542", B: "#6a8fe0", R: "#e04b4b", T: SHIRTS[cfg.shirt] || SHIRTS[0], P: "#3b4a9c", p: "#2f3b80", Z: "#8a8a8a", A: skin };
  }
  BW.avatarSvg = function (cfg, full, cls) {
    cfg = Object.assign(BW.defaultAvatar(""), cfg || {});
    const head = headRows(cfg);
    if (!full) return sprite(head, avatarPal(cfg), { cls: "bw-avatar-head " + (cls || "") });
    const headWide = head.map(r => "..." + r + "...");
    const body = [];
    for (let i = 0; i < 8; i++) { const arm = i < 2 ? "TT" : "AA"; body.push("." + arm + "TTTTTTTT" + arm + "."); }
    const legs = [];
    for (let i = 0; i < 6; i++) legs.push("...PPPPpppp...");
    legs.push("...ZZZZZZZZ...");
    legs.push("...ZZZZZZZZ...");
    return sprite(headWide.concat(body, legs), avatarPal(cfg), { cls: "bw-avatar-full " + (cls || "") });
  };

  // ---------------- tiny sfx ----------------
  let actx = null;
  function tone(freq, dur, type, vol, slide) {
    try {
      if (localStorage.getItem("bw_mute") === "1") return;
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
      g.gain.setValueAtTime(vol || 0.04, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  BW.sfx = function (kind) {
    if (kind === "click") tone(520, 0.06, "square", 0.035, 380);
    else if (kind === "pop") { tone(660, 0.08, "square", 0.04); setTimeout(() => tone(990, 0.1, "square", 0.04), 70); }
    else if (kind === "win") [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "square", 0.045), i * 90));
    else if (kind === "chest") { tone(180, 0.25, "sawtooth", 0.05, 90); setTimeout(() => BW.sfx("win"), 250); }
  };
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("button, a, .sc-game-card, [role=button]")) BW.sfx("click"); }, true);

  // ---------------- advancement toast ----------------
  BW.toast = function (title, desc, iconHtml) {
    const t = document.createElement("div"); t.className = "bw-adv";
    t.innerHTML = `<div class="bw-adv-icon">${iconHtml || BW.svg_trophy()}</div><div><div class="bw-adv-title">Advancement Made!</div><div class="bw-adv-desc"></div></div>`;
    t.querySelector(".bw-adv-desc").textContent = title + (desc ? " — " + desc : "");
    document.body.appendChild(t); BW.sfx("pop");
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 500); }, 3800);
  };

  // ---------------- time of day ----------------
  function setTime() { const h = new Date().getHours(); document.documentElement.dataset.bwTime = h >= 6 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night"; }
  setTime(); setInterval(setTime, 5 * 60 * 1000);
  document.documentElement.classList.add("bw");

  // ---------------- avatar persistence ----------------
  const avKey = () => "bw_avatar_" + ((player() && player().id) || "guest");
  BW.getAvatar = function () { try { const v = JSON.parse(localStorage.getItem(avKey())); if (v) return v; } catch (e) {} return BW.defaultAvatar((player() && player().name) || ""); };
  BW.saveAvatar = function (cfg) { try { localStorage.setItem(avKey(), JSON.stringify(cfg)); } catch (e) {} try { LB() && LB().saveBlockAvatar && LB().saveBlockAvatar(cfg); } catch (e) {} BW.refreshAvatar(); };
  BW.refreshAvatar = function () {
    const cfg = BW.getAvatar(), head = $("bw-head"), big = $("bw-avatar-big"), me = $("bw-slot-me-ico");
    if (head) head.innerHTML = BW.avatarSvg(cfg, false);
    if (big) big.innerHTML = BW.avatarSvg(cfg, true);
    if (me) me.innerHTML = BW.avatarSvg(cfg, false);
  };

  // ---------------- text: coins -> emerald sprite ----------------
  const EM = BW.svg_emerald({ cls: "bw-em" });
  function emeraldize(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.indexOf("🪙") > -1 && !(n.parentNode && /SCRIPT|STYLE|TEXTAREA/.test(n.parentNode.nodeName))) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => {
      const parts = n.nodeValue.split("🪙"), frag = document.createDocumentFragment();
      parts.forEach((p, i) => { if (i) { const s = document.createElement("span"); s.className = "bw-em-wrap"; s.innerHTML = EM; frag.appendChild(s); } if (p) frag.appendChild(document.createTextNode(p)); });
      n.parentNode.replaceChild(frag, n);
    });
  }
  BW.emeraldize = emeraldize;

  // ---------------- hub enhancement ----------------
  const MAIN = [["multipleazka/", "Math Race"], ["mathville/", "MathVille"], ["azkacraft/", "Language & Arts"], ["azkauniverse/", "SolarQuest"], ["ninja-runner/", "Ninja Runner"]];
  function build() {
    const landing = $("sc-screen-landing"); if (!landing || landing.dataset.bwBuilt) return; landing.dataset.bwBuilt = "1";
    // pixel Bo logo
    const icon = $("sc-hero-icon");
    if (icon) { /* keep the element (the page already bound its click -> Bo chat); swap its art */
      const m = BW.svg_bo().match(/<svg[^>]*>([\s\S]*)<\/svg>/); icon.setAttribute("viewBox", "0 0 12 11"); icon.setAttribute("shape-rendering", "crispEdges"); icon.classList.add("bw-bo-logo"); if (m) icon.innerHTML = m[1]; }
    const title = document.querySelector(".sc-hero-title");
    if (title) { const w1 = title.querySelector(".w1"), w2 = title.querySelector(".w2"); if (w1) w1.textContent = "BRAIN"; if (w2) w2.textContent = "BOX"; const v = document.createElement("span"); v.className = "bw-ver"; v.textContent = "2.0"; title.appendChild(v); }
    // player chip: block head + keep original (hidden) for frame class etc.
    const chip = $("sc-player-chip");
    if (chip) { const head = document.createElement("span"); head.id = "bw-head"; head.className = "bw-head"; chip.insertBefore(head, chip.firstChild); }
    // wallet icons
    const wal = $("sc-wallet-badge");
    if (wal) { const sp = wal.querySelectorAll("span"); if (sp[0]) sp[0].innerHTML = EM; if (sp[2]) sp[2].innerHTML = BW.svg_diamond({ cls: "bw-em" }); }
    // village scene + play button + season pill inside hero
    const hero = document.querySelector(".sc-hero");
    if (hero) {
      const scene = document.createElement("div"); scene.className = "bw-scene";
      scene.innerHTML = `<div class="bw-season">Season 1 · Term 4</div><div class="bw-ground"><div class="bw-sun" aria-hidden="true"></div><div class="bw-cloud c1"></div><div class="bw-cloud c2"></div><div id="bw-avatar-big" class="bw-avatar-big"></div><div class="bw-bo-walk" id="bw-bo-walk">${BW.svg_bo()}</div><div class="bw-tree">🌳</div></div>`;
      hero.appendChild(scene);
      const day = Math.floor(Date.now() / 86400000) % MAIN.length, pick = MAIN[day];
      const play = document.createElement("a"); play.className = "bw-play"; play.href = pick[0]; play.id = "bw-play";
      play.innerHTML = `<span class="bw-play-big">▶ LANJUT PETUALANGAN</span><span class="bw-play-sub">Hari ini: ${pick[1]}</span>`;
      hero.appendChild(play);
    }
    // hotbar
    const bar = document.createElement("nav"); bar.className = "bw-hotbar"; bar.id = "bw-hotbar";
    bar.innerHTML = `
      <button class="bw-slot active" id="bw-slot-main" type="button"><span class="bw-slot-ico">${BW.svg_grass()}</span><span class="bw-slot-lbl">Main</span></button>
      <a class="bw-slot" href="bo-home/?tab=world"><span class="bw-slot-ico">${BW.svg_globe()}</span><span class="bw-slot-lbl">Dunia</span></a>
      <button class="bw-slot" id="bw-slot-rewards" type="button"><span class="bw-slot-ico">${BW.svg_chest()}</span><span class="bw-slot-lbl">Hadiah</span><span class="bw-slot-dot" id="bw-slot-dot" hidden></span></button>
      <a class="bw-slot" href="profile/"><span class="bw-slot-ico" id="bw-slot-me-ico"></span><span class="bw-slot-lbl">Aku</span></a>`;
    landing.appendChild(bar);
    $("bw-slot-main").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    $("bw-slot-rewards").addEventListener("click", () => { const b = $("sc-rewards-btn"); if (b) b.click(); });
    const dot = $("sc-rewards-dot"), sd = $("bw-slot-dot");
    if (dot && sd) { const sync = () => { sd.hidden = dot.hidden; sd.textContent = dot.textContent; }; new MutationObserver(sync).observe(dot, { attributes: true, childList: true, characterData: true, subtree: true }); sync(); }
    // class goal -> Creeper boss header
    const cg = $("sc-classgoal-card"); if (cg) { const t = cg.querySelector(".sc-goal-title"); if (t) t.innerHTML = `${BW.svg_creeper({ cls: "bw-boss-ico" })} Boss Kelas: Creeper Raksasa`; }
    // advancement on claims
    document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button.sc-quest-claim-btn"); if (b && /^\s*Claim/i.test(b.textContent)) setTimeout(() => BW.toast("Hadiah diambil!", "Terus kumpulkan reward 🎉"), 400); });
    BW.refreshAvatar(); emeraldize(landing);
  }
  // emeraldize everything that appears later (panels render async)
  let pending = false;
  new MutationObserver(() => { if (pending) return; pending = true; setTimeout(() => { pending = false; try { emeraldize(document.body); } catch (e) {} }, 120); }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  // ---------------- reveal + avatar creator ----------------
  const seenKey = () => "bw_v2_seen_" + ((player() && player().id) || "guest");
  function overlay(html, cls) { const o = document.createElement("div"); o.className = "bw-reveal " + (cls || ""); o.innerHTML = html; document.body.appendChild(o); return o; }
  function swatches(list, key, cfg, onPick) { return list.map((c, i) => `<button type="button" class="bw-sw ${cfg[key] === i ? "on" : ""}" data-k="${key}" data-i="${i}" style="background:${c}"></button>`).join(""); }
  BW.openCreator = function (onDone, opts) {
    opts = opts || {}; const cfg = Object.assign({}, BW.getAvatar());
    const o = overlay(`<div class="bw-panel"><div class="bw-h">${opts.title || "Buat Karaktermu!"}</div><div class="bw-preview" id="bw-pv"></div>
      <div class="bw-row"><span>Kulit</span><div id="bw-r-skin"></div></div><div class="bw-row"><span>Rambut</span><div id="bw-r-hair"></div></div>
      <div class="bw-row"><span>Baju</span><div id="bw-r-shirt"></div></div><div class="bw-row"><span>Topi</span><div id="bw-r-hat"></div></div>
      <button class="bw-btn" id="bw-av-ok" type="button">${opts.ok || "SIMPAN ✔"}</button></div>`, "bw-creator");
    function draw() {
      $("bw-pv").innerHTML = BW.avatarSvg(cfg, true);
      $("bw-r-skin").innerHTML = swatches(SKINS, "skin", cfg); $("bw-r-hair").innerHTML = swatches(HAIRS, "hair", cfg); $("bw-r-shirt").innerHTML = swatches(SHIRTS, "shirt", cfg);
      $("bw-r-hat").innerHTML = HATS.map((h, i) => `<button type="button" class="bw-chip ${cfg.hat === i ? "on" : ""}" data-k="hat" data-i="${i}">${HAT_NAMES[i]}</button>`).join("");
      o.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { cfg[b.dataset.k] = +b.dataset.i; draw(); });
    }
    draw();
    $("bw-av-ok").onclick = () => { BW.saveAvatar(cfg); o.remove(); BW.sfx("pop"); onDone && onDone(); };
  };
  function chestStep(done) {
    const o = overlay(`<div class="bw-panel bw-center"><div class="bw-h">Hadiah Selamat Datang!</div><div class="bw-chest" id="bw-chest">${BW.svg_chest()}</div><div class="bw-sub" id="bw-chest-sub">Tap peti untuk membukanya!</div><div class="bw-loot" id="bw-loot" hidden></div><button class="bw-btn" id="bw-enter" type="button" hidden>MASUK DUNIA ▶</button></div>`, "bw-chestwrap");
    let opened = false;
    $("bw-chest").onclick = async () => {
      if (opened) return; opened = true; BW.sfx("chest"); $("bw-chest").classList.add("open"); $("bw-chest").innerHTML = BW.svg_chestOpen();
      $("bw-chest-sub").textContent = "Wah, isinya banyak!";
      $("bw-loot").hidden = false; $("bw-loot").innerHTML = `<div>${EM} <b>50</b> Zamrud</div><div>${BW.svg_diamond({ cls: "bw-em" })} <b>3</b> Berlian</div><div>🖼️ Frame <b>Pioneer 2.0</b></div>`;
      $("bw-enter").hidden = false;
      try { await LB().claimV2Welcome(); } catch (e) { console.warn(e); }
    };
    $("bw-enter").onclick = () => { o.remove(); done && done(); };
  }
  BW.runReveal = function () {
    const p = player(); if (!p || p.role === "parent") return;
    try { if (localStorage.getItem(seenKey())) return; } catch (e) {}
    const o = overlay(`<div class="bw-stars"></div><div class="bw-panel bw-center bw-intro"><div class="bw-bo-big">${BW.svg_bo()}</div><div class="bw-logo"><span>BRAIN</span><span class="b">BOX</span> <em>2.0</em></div><div class="bw-sub">Dunia baru sudah terbuka!</div><button class="bw-btn" id="bw-start" type="button">MULAI ▶</button></div>`, "bw-introwrap");
    BW.sfx("win");
    $("bw-start").onclick = () => { o.remove(); BW.openCreator(() => chestStep(() => { try { localStorage.setItem(seenKey(), "1"); } catch (e) {} BW.refreshAvatar(); BW.toast("Selamat datang di BrainBox 2.0", "Petualangan dimulai!"); }), { title: "Buat Karaktermu!", ok: "LANJUT ▶" }); };
  };

  // ---------------- boot ----------------
  function boot() {
    build();
    const landing = $("sc-screen-landing");
    if (!landing) return;
    const check = () => { if (landing.classList.contains("active") && player()) { BW.refreshAvatar(); setTimeout(BW.runReveal, 500); } };
    new MutationObserver(check).observe(landing, { attributes: true, attributeFilter: ["class"] }); check();
    // let users re-open the creator from the big avatar
    document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#bw-avatar-big")) BW.openCreator(); });
    try { const c = LB() && LB().getBlockAvatar && LB().getBlockAvatar(); if (c && c.then) c.then(v => { if (v) { try { localStorage.setItem(avKey(), JSON.stringify(v)); } catch (e) {} BW.refreshAvatar(); } }).catch(() => {}); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
