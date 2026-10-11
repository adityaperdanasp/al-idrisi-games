/* =================================================================
   Geo Flight (PM round 11, item 8) -- a 10-question flight around the
   world: capitals, flags and continents. Every country you get right is
   stamped into your passport (players/{id}/geoStamps) for good.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();

// [code, flag, name, capital, continent]
const C = [
  ["ID", "🇮🇩", "Indonesia", "Jakarta", "Asia"], ["JP", "🇯🇵", "Japan", "Tokyo", "Asia"], ["CN", "🇨🇳", "China", "Beijing", "Asia"],
  ["IN", "🇮🇳", "India", "New Delhi", "Asia"], ["TH", "🇹🇭", "Thailand", "Bangkok", "Asia"], ["MY", "🇲🇾", "Malaysia", "Kuala Lumpur", "Asia"],
  ["SG", "🇸🇬", "Singapore", "Singapore", "Asia"], ["KR", "🇰🇷", "South Korea", "Seoul", "Asia"], ["PH", "🇵🇭", "Philippines", "Manila", "Asia"],
  ["VN", "🇻🇳", "Vietnam", "Hanoi", "Asia"], ["SA", "🇸🇦", "Saudi Arabia", "Riyadh", "Asia"], ["TR", "🇹🇷", "Turkey", "Ankara", "Asia"],
  ["PK", "🇵🇰", "Pakistan", "Islamabad", "Asia"], ["BD", "🇧🇩", "Bangladesh", "Dhaka", "Asia"], ["BN", "🇧🇳", "Brunei", "Bandar Seri Begawan", "Asia"],
  ["EG", "🇪🇬", "Egypt", "Cairo", "Africa"], ["KE", "🇰🇪", "Kenya", "Nairobi", "Africa"], ["NG", "🇳🇬", "Nigeria", "Abuja", "Africa"],
  ["ZA", "🇿🇦", "South Africa", "Pretoria", "Africa"], ["MA", "🇲🇦", "Morocco", "Rabat", "Africa"], ["ET", "🇪🇹", "Ethiopia", "Addis Ababa", "Africa"],
  ["FR", "🇫🇷", "France", "Paris", "Europe"], ["DE", "🇩🇪", "Germany", "Berlin", "Europe"], ["IT", "🇮🇹", "Italy", "Rome", "Europe"],
  ["ES", "🇪🇸", "Spain", "Madrid", "Europe"], ["GB", "🇬🇧", "United Kingdom", "London", "Europe"], ["NL", "🇳🇱", "Netherlands", "Amsterdam", "Europe"],
  ["GR", "🇬🇷", "Greece", "Athens", "Europe"], ["SE", "🇸🇪", "Sweden", "Stockholm", "Europe"], ["NO", "🇳🇴", "Norway", "Oslo", "Europe"],
  ["PT", "🇵🇹", "Portugal", "Lisbon", "Europe"], ["RU", "🇷🇺", "Russia", "Moscow", "Europe"],
  ["US", "🇺🇸", "United States", "Washington, D.C.", "North America"], ["CA", "🇨🇦", "Canada", "Ottawa", "North America"],
  ["MX", "🇲🇽", "Mexico", "Mexico City", "North America"], ["CU", "🇨🇺", "Cuba", "Havana", "North America"],
  ["BR", "🇧🇷", "Brazil", "Brasília", "South America"], ["AR", "🇦🇷", "Argentina", "Buenos Aires", "South America"], ["PE", "🇵🇪", "Peru", "Lima", "South America"],
  ["CL", "🇨🇱", "Chile", "Santiago", "South America"], ["CO", "🇨🇴", "Colombia", "Bogotá", "South America"],
  ["AU", "🇦🇺", "Australia", "Canberra", "Oceania"], ["NZ", "🇳🇿", "New Zealand", "Wellington", "Oceania"], ["FJ", "🇫🇯", "Fiji", "Suva", "Oceania"], ["PG", "🇵🇬", "Papua New Guinea", "Port Moresby", "Oceania"]
];
const CONTS = ["Asia", "Africa", "Europe", "North America", "South America", "Oceania"];

// Audit batch 5: modes (world tour with route choice, continent expedition, ASEAN challenge, flag
// speed round), a fuel gauge (wrong answers burn fuel, 0 = emergency landing), turbulence questions on
// a timer, fun facts, and a souvenir for every completed continent.
const FACTS = { ID: "Indonesia has more than 17,000 islands!", JP: "Japan has over 6,800 islands and the famous Mount Fuji.", CN: "The Great Wall of China is thousands of kilometres long.", IN: "India is home to the Taj Mahal.", EG: "Egypt's pyramids are over 4,000 years old.", FR: "The Eiffel Tower was built in 1889.", BR: "Brazil has most of the Amazon rainforest.", AU: "Australia is both a country and a continent!", KE: "Kenya is famous for wildlife safaris.", IT: "Pizza was invented in Italy.", US: "The USA has 50 states.", CA: "Canada has the longest coastline in the world.", NZ: "New Zealand has more sheep than people.", SG: "Singapore is a city and a country at the same time.", TH: "Thailand's capital has one of the longest city names in the world.", RU: "Russia is the largest country on Earth.", NO: "Norway has amazing fjords and the northern lights.", MX: "Mexico gave the world chocolate!", PE: "Peru is home to Machu Picchu.", GR: "The first Olympic Games were held in Greece." };
const SOUV = { Asia: "🏮", Africa: "🦁", Europe: "🏰", "North America": "🗽", "South America": "🦜", Oceania: "🦘" };
const ASEAN = ["ID", "MY", "SG", "TH", "PH", "VN", "BN"];
if (!player) $("gf-overlay").innerHTML = K.signedOutHtml("🌍");
else init();

async function init() {
  let stamps = await AIGLeaderboard.getGeoStamps();
  const tabs = document.querySelectorAll(".gf-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "fly" ? menu() : passport(); });
  menu();

  function menu() {
    $("gf-main").innerHTML = `<div class="kit-card" style="text-align:center"><div class="gf-flag">🛫</div><div class="kit-q">Ready for takeoff?</div><p class="kit-sub">${Object.keys(stamps).length}/${C.length} stamps collected. Watch your fuel — wrong answers burn it!</p>
      <button class="kit-btn block" data-mode="tour" type="button">🌍 World tour (you pick the route)</button>
      <div class="gf-conts">${CONTS.map(ct => `<button class="kit-btn alt" data-cont="${ct}" type="button">${SOUV[ct]} ${ct}</button>`).join("")}</div>
      <button class="kit-btn alt block" data-mode="asean" type="button">🌏 ASEAN challenge</button>
      <button class="kit-btn alt block" data-mode="flags" type="button">🚩 Flag speed round (30s)</button>
      <button class="kit-btn alt block" data-mode="cargo" type="button">📦 Cargo run — steer through storms, deliver to the right capital</button></div>`;
    $("gf-main").querySelectorAll("[data-mode]").forEach(b => b.onclick = () => b.dataset.mode === "flags" ? flags() : b.dataset.mode === "cargo" ? cargo() : fly(b.dataset.mode));
    $("gf-main").querySelectorAll("[data-cont]").forEach(b => b.onclick = () => fly("cont", b.dataset.cont));
  }
  function passport() {
    $("gf-main").innerHTML = CONTS.map(ct => {
      const list = C.filter(c => c[4] === ct), got = list.filter(c => stamps[c[0]]).length;
      return `<div class="kit-card"><div class="kit-sub" style="margin:0 0 8px;font-weight:800">${got >= list.length ? SOUV[ct] + " souvenir! · " : ""}${ct} — ${got}/${list.length}</div><div class="gf-pass">${list.map(c => `<div class="gf-stamp ${stamps[c[0]] ? "" : "lock"}" title="${K.esc(c[2])}">${stamps[c[0]] ? c[1] : "🔒"}</div>`).join("")}</div></div>`;
    }).join("");
  }
  function flags() {
    let right = 0, end = Date.now() + 30000, tick;
    const ask = () => {
      if (Date.now() >= end) return finish();
      const c = C[K.rand(0, C.length - 1)], options = K.shuffle([c[2], ...K.shuffle(C.filter(x => x !== c)).slice(0, 3).map(x => x[2])]);
      $("gf-main").innerHTML = `<div class="kit-card"><div class="kit-bar"><i id="gf-t"></i></div><div class="gf-flag">${c[1]}</div><div class="kit-q">Which country? (${right} so far)</div><div class="kit-opts">${options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div></div>`;
      $("gf-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = b.dataset.o === c[2]; K.record("geo-flight", "geography", ok); if (ok) right++; b.classList.add(ok ? "right" : "wrong"); setTimeout(ask, ok ? 250 : 700); });
    };
    tick = setInterval(() => { const t = $("gf-t"); if (t) t.style.width = Math.max(0, (end - Date.now()) / 300) + "%"; if (Date.now() >= end) { clearInterval(tick); finish(); } }, 200);
    let fin = false;
    function finish() { if (fin) return; fin = true; clearInterval(tick); $("gf-main").innerHTML = ""; $("gf-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🚩</div><h2>${right} flags in 30 seconds!</h2><div class="kit-bonus" id="gf-bonus"></div><button class="kit-btn block" id="gf-back" type="button">Back</button></div></div>`; $("gf-back").onclick = () => { $("gf-overlay").innerHTML = ""; menu(); }; if (right >= 10) K.toastAdv("Flag master!"); K.finish("geo-flight", Math.min(15, right), $("gf-bonus")); }
    ask();
  }
  function fly(mode, cont) {
    let pool = mode === "cont" ? C.filter(c => c[4] === cont) : mode === "asean" ? C.filter(c => ASEAN.includes(c[0])) : C.slice();
    let i = 0, right = 0, newStamps = 0, fuel = 100, cur = K.shuffle(pool)[0], used = new Set(), turb = new Set([K.rand(2, 4), K.rand(6, 8)]), tmr;
    const total = Math.min(10, pool.length);
    const ask = () => {
      clearInterval(tmr);
      if (i >= total || fuel <= 0) return land();
      const c = cur; used.add(c[0]);
      const kind = mode === "asean" || mode === "cont" ? ["capital", "flag"][K.rand(0, 1)] : ["capital", "flag", "continent"][K.rand(0, 2)];
      let prompt, options, answer;
      if (kind === "capital") { prompt = `What is the capital of ${c[2]}?`; answer = c[3]; options = K.shuffle([c[3], ...K.shuffle(C.filter(x => x !== c)).slice(0, 3).map(x => x[3])]); }
      else if (kind === "flag") { prompt = `Which country has this flag?`; answer = c[2]; options = K.shuffle([c[2], ...K.shuffle(C.filter(x => x !== c)).slice(0, 3).map(x => x[2])]); }
      else { prompt = `${c[1]} ${c[2]} is in which continent?`; answer = c[4]; options = K.shuffle([c[4], ...K.shuffle(CONTS.filter(x => x !== c[4])).slice(0, 3)]); }
      const bumpy = turb.has(i);
      $("gf-main").innerHTML = `<div class="gf-track ${bumpy ? "bumpy" : ""}"><span class="gf-plane" style="left:${5 + i * (90 / total)}%">✈️</span></div><div class="gf-fuel">⛽ Fuel <span class="kit-bar"><i style="width:${fuel}%;background:${fuel > 40 ? "#58b368" : "#e04b4b"}"></i></span>${bumpy ? " · 🌪️ TURBULENCE! 6 seconds" : ""}</div>
        <div class="kit-card">${bumpy ? '<div class="kit-bar" style="margin-bottom:6px"><i id="gf-tt"></i></div>' : ""}${kind === "flag" ? `<div class="gf-flag">${c[1]}</div>` : ""}<div class="kit-q">${K.esc(prompt)}</div><div class="kit-opts">${options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="gf-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div><div id="gf-route"></div></div>`;
      if (bumpy) { let t = 6; tmr = setInterval(() => { t -= 0.1; const el = $("gf-tt"); if (el) el.style.width = Math.max(0, t / 6 * 100) + "%"; if (t <= 0) { clearInterval(tmr); answer_(null); } }, 100); }
      const answer_ = b => {
        clearInterval(tmr);
        const ok = !!b && b.dataset.o === answer;
        K.record("geo-flight", "geography", ok);
        $("gf-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === answer) x.classList.add("right"); });
        if (b && !ok) b.classList.add("wrong");
        if (ok) { right++; fuel = Math.min(100, fuel + 8);
          if (!stamps[c[0]]) { stamps[c[0]] = true; newStamps++; AIGLeaderboard.addGeoStamp(c[0]); $("gf-msg").textContent = `${c[1]} New stamp: ${c[2]}!`;
            const ct = C.filter(x => x[4] === c[4]); if (ct.every(x => stamps[x[0]])) K.toastAdv(`${SOUV[c[4]]} ${c[4]} complete — souvenir unlocked!`); }
          else $("gf-msg").textContent = "✅ Correct!";
        } else { fuel -= 25; $("gf-msg").textContent = `${b ? "" : "⏰ "}Answer: ${answer} · ⛽ −25 fuel`; }
        if (FACTS[c[0]]) $("gf-msg").textContent += ` 💡 ${FACTS[c[0]]}`;
        i++;
        const left = pool.filter(x => !used.has(x[0]));
        if (i >= total || fuel <= 0 || !left.length) { setTimeout(ask, 1600); return; }
        if (mode === "tour") {
          const opts = K.shuffle(left).slice(0, 3);
          $("gf-route").innerHTML = `<div class="kit-sub" style="margin:10px 0 4px;font-weight:800;text-align:center">✈️ Where to next?</div><div class="gf-routes">${opts.map(o => `<button class="kit-btn alt" data-to="${o[0]}" type="button">${o[1]} ${K.esc(o[2])}</button>`).join("")}</div>`;
          $("gf-route").querySelectorAll("[data-to]").forEach(r => r.onclick = () => { cur = C.find(x => x[0] === r.dataset.to); ask(); });
        } else { cur = K.shuffle(left)[0]; setTimeout(ask, 1500); }
      };
      $("gf-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => answer_(b));
    };
    async function land() {
      $("gf-main").innerHTML = "";
      const crash = fuel <= 0;
      $("gf-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${crash ? "🪂" : "🛬"}</div><h2>${crash ? "Emergency landing!" : "Landed!"}</h2>
        <p class="kit-sub">${right}/${i} correct · ${newStamps} new stamp${newStamps === 1 ? "" : "s"} · ${Object.keys(stamps).length}/${C.length} total${crash ? "<br>You ran out of fuel — careful answers keep the tank full!" : ""}</p><div class="kit-bonus" id="gf-bonus"></div>
        <button class="kit-btn block" id="gf-again">Fly again</button><button class="kit-btn alt block" id="gf-pp">📘 See passport</button></div></div>`;
      $("gf-again").onclick = () => { $("gf-overlay").innerHTML = ""; menu(); };
      $("gf-pp").onclick = () => { $("gf-overlay").innerHTML = ""; tabs[1].click(); };
      K.finish("geo-flight", Math.min(20, Math.round(right * 1.2) + newStamps), $("gf-bonus"));
    }
    ask();
  }
}

// Audit round 2: 📦 Cargo run -- 6 deliveries. Before each landing you steer the plane (◀ ▶ or
// swipe) through 5 seconds of storm clouds; every storm you hit costs fuel. Then pick the right
// capital airport for the package's country. Run out of fuel (3) and the run ends.
function cargo() {
  const ls2 = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  let n = 0, fuel = 3, delivered = 0;
  const box = $("gf-main");
  const end = () => { const best = Number(ls2("gf_cargo_best", "0")); if (delivered > best) { try { localStorage.setItem("gf_cargo_best", String(delivered)); } catch (e) {} } box.innerHTML = `<div class="kit-card" style="text-align:center"><div class="kit-big">${fuel > 0 ? "📦" : "⛽"}</div><div class="kit-q">${delivered}/6 packages delivered</div><p class="kit-sub">${fuel > 0 ? "Every package found its capital!" : "Out of fuel — the plane had to land."} ${delivered > best ? "🌟 New best!" : `Best: ${best}`}</p><div class="kit-bonus" id="gf-cb"></div><button class="kit-btn block" type="button" onclick="location.reload()">Fly again</button></div>`; K.finish("geo-flight", delivered * 2, $("gf-cb")); };
  const storm = done => {
    box.innerHTML = `<div class="kit-card"><div class="kit-sub" style="font-weight:800;text-align:center">✈️ Flight ${n + 1}/6 · ⛽ ${"🟩".repeat(fuel)}${"⬜".repeat(3 - fuel)} · dodge the storms!</div><div class="gf-sky" id="gf-sky"><span class="gf-plane" id="gf-pl">✈️</span></div><div class="gf-ctl"><button type="button" id="gf-l">◀</button><button type="button" id="gf-r">▶</button></div></div>`;
    let lane = 1, rocks = [], t0 = performance.now(), next = 0, raf = 0; const sky = $("gf-sky"), pl = $("gf-pl");
    const set = l => { lane = Math.max(0, Math.min(2, l)); pl.style.left = (lane * 33.3 + 16.6) + "%"; }; set(1);
    $("gf-l").onclick = () => set(lane - 1); $("gf-r").onclick = () => set(lane + 1);
    let sx = 0; sky.addEventListener("touchstart", e => { sx = e.changedTouches[0].clientX; }, { passive: true }); sky.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 25) set(lane + (dx > 0 ? 1 : -1)); }, { passive: true });
    const tick = now => {
      const t = now - t0;
      if (t > next && t < 4400) { const el = document.createElement("span"); el.className = "gf-storm"; el.textContent = "⛈️"; const l = Math.floor(Math.random() * 3); el.style.left = (l * 33.3 + 16.6) + "%"; sky.appendChild(el); rocks.push({ el, l, y: -10 }); next = t + 520 + Math.random() * 300; }
      rocks.forEach(r => { r.y += 1.7; r.el.style.top = r.y + "%"; if (!r.hit && r.y > 74 && r.y < 90 && r.l === lane) { r.hit = true; fuel--; r.el.textContent = "💥"; pl.classList.remove("bump"); void pl.offsetWidth; pl.classList.add("bump"); } });
      if (t > 5200 || fuel <= 0) { cancelAnimationFrame(raf); return fuel <= 0 ? end() : done(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  const deliver = () => {
    if (n >= 6) return end();
    storm(() => {
      const c = C[K.rand(0, C.length - 1)], opts = K.shuffle([c].concat(K.shuffle(C.filter(x => x[0] !== c[0])).slice(0, 2)));
      box.innerHTML = `<div class="kit-card"><div class="kit-sub" style="font-weight:800;text-align:center">📦 Package ${n + 1}/6 for ${c[1]} ${K.esc(c[2])}</div><div class="kit-q">Land at the right capital airport!</div>${opts.map(o => `<button class="kit-opt" type="button" data-c="${o[0]}" style="width:100%;margin-top:6px">🛬 ${K.esc(o[3])}</button>`).join("")}</div>`;
      box.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { const ok = b.dataset.c === c[0]; K.record("geo-flight", "capitals", ok); box.querySelectorAll("[data-c]").forEach(x => { x.disabled = true; if (x.dataset.c === c[0]) x.classList.add("right"); }); if (ok) delivered++; else { b.classList.add("wrong"); fuel--; } n++; setTimeout(() => fuel <= 0 ? end() : deliver(), ok ? 800 : 1500); });
    });
  };
  deliver();
}
