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

if (!player) $("gf-overlay").innerHTML = K.signedOutHtml("🌍");
else init();

async function init() {
  let stamps = await AIGLeaderboard.getGeoStamps();
  const tabs = document.querySelectorAll(".gf-tab");
  tabs.forEach(t => t.onclick = () => { tabs.forEach(x => x.classList.toggle("on", x === t)); t.dataset.t === "fly" ? menu() : passport(); });
  menu();

  function menu() {
    $("gf-main").innerHTML = `<div class="kit-card" style="text-align:center"><div class="gf-flag">🛫</div><div class="kit-q">Ready for takeoff?</div><p class="kit-sub">10 questions around the world. Every country you get right earns a passport stamp! (${Object.keys(stamps).length}/${C.length} stamps)</p><button class="kit-btn" id="gf-go">Take off ✈️</button></div>`;
    $("gf-go").onclick = fly;
  }
  function passport() {
    $("gf-main").innerHTML = CONTS.map(ct => {
      const list = C.filter(c => c[4] === ct), got = list.filter(c => stamps[c[0]]).length;
      return `<div class="kit-card"><div class="kit-sub" style="margin:0 0 8px;font-weight:800">${ct} — ${got}/${list.length}</div><div class="gf-pass">${list.map(c => `<div class="gf-stamp ${stamps[c[0]] ? "" : "lock"}" title="${K.esc(c[2])}">${stamps[c[0]] ? c[1] : "🔒"}</div>`).join("")}</div></div>`;
    }).join("");
  }
  function fly() {
    const order = K.shuffle(C).slice(0, 10);
    let i = 0, right = 0, newStamps = 0;
    const ask = () => {
      if (i >= order.length) return land();
      const c = order[i], kind = ["capital", "flag", "continent"][K.rand(0, 2)];
      let prompt, options, answer;
      if (kind === "capital") { prompt = `What is the capital of ${c[2]}?`; answer = c[3]; options = K.shuffle([c[3], ...K.shuffle(C.filter(x => x !== c)).slice(0, 3).map(x => x[3])]); }
      else if (kind === "flag") { prompt = `Which country has this flag?`; answer = c[2]; options = K.shuffle([c[2], ...K.shuffle(C.filter(x => x !== c)).slice(0, 3).map(x => x[2])]); }
      else { prompt = `${c[1]} ${c[2]} is in which continent?`; answer = c[4]; options = K.shuffle([c[4], ...K.shuffle(CONTS.filter(x => x !== c[4])).slice(0, 3)]); }
      $("gf-main").innerHTML = `<div class="gf-track"><span class="gf-plane" style="left:${5 + i * 10}%">✈️</span></div>
        <div class="kit-card">${kind === "flag" ? `<div class="gf-flag">${c[1]}</div>` : ""}<div class="kit-q">${K.esc(prompt)}</div><div class="kit-opts">${options.map(o => `<button class="kit-opt" data-o="${K.esc(o)}">${K.esc(o)}</button>`).join("")}</div><div class="kit-sub" id="gf-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("gf-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = async () => {
        const ok = b.dataset.o === answer;
        K.record("geo-flight", "geography", ok);
        $("gf-main").querySelectorAll(".kit-opt").forEach(x => { x.disabled = true; if (x.dataset.o === answer) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        if (ok) {
          right++;
          if (!stamps[c[0]]) { stamps[c[0]] = true; newStamps++; AIGLeaderboard.addGeoStamp(c[0]); $("gf-msg").textContent = `${c[1]} New stamp: ${c[2]}!`; }
          else $("gf-msg").textContent = "✅ Correct!";
        } else $("gf-msg").textContent = `Answer: ${answer}`;
        setTimeout(() => { i++; ask(); }, 1100);
      });
    };
    async function land() {
      $("gf-main").innerHTML = "";
      $("gf-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🛬</div><h2>Landed!</h2>
        <p class="kit-sub">${right}/10 correct · ${newStamps} new stamp${newStamps === 1 ? "" : "s"} · ${Object.keys(stamps).length}/${C.length} total</p><div class="kit-bonus" id="gf-bonus"></div>
        <button class="kit-btn block" id="gf-again">Fly again</button><button class="kit-btn alt block" id="gf-pp">📘 See passport</button></div></div>`;
      $("gf-again").onclick = () => { $("gf-overlay").innerHTML = ""; fly(); };
      $("gf-pp").onclick = () => { $("gf-overlay").innerHTML = ""; tabs[1].click(); };
      K.finish("geo-flight", Math.min(20, Math.round(right * 1.2) + newStamps), $("gf-bonus"));
    }
    ask();
  }
}
