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
      <button class="kit-btn alt block" data-mode="flags" type="button">🚩 Flag speed round (30s)</button></div>`;
    $("gf-main").querySelectorAll("[data-mode]").forEach(b => b.onclick = () => b.dataset.mode === "flags" ? flags() : fly(b.dataset.mode));
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
