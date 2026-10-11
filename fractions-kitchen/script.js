/* =================================================================
   Fractions Kitchen (PM round 11, item 3) -- 8 recipe orders. Each shows
   a fraction of a cup (later two fractions to ADD); the measuring cup is
   cut into equal marks and you tap the mark to fill up to. Later cups are
   cut differently from the fraction's denominator (½ cup on an 8-mark cup)
   so equivalent fractions matter.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("fk-overlay").innerHTML = K.signedOutHtml("🥣");
else setTimeout(pickMode, 0); // deferred: the consts below must exist first
// Audit batch 5: hold-to-pour, customers with patience and tips (busy mode), a blind-cup challenge
// (no marks), equivalent-fraction hints, golden special orders, finished dishes with reactions, and a
// recipe book that fills up shift by shift.
const DISHES = ["🥞 Pancakes", "🍚 Rice bowl", "🍪 Cookies", "🎂 Birthday cake", "🥤 Smoothie", "🍮 Pudding", "🍕 Pizza", "🥧 Pie", "🍲 Soup", "🧁 Cupcakes"];
const CUSTOMERS = ["👵", "👨‍🍳", "🧒", "👩", "🧔", "👦", "👧", "🤖"];
let MODE = "normal";
const lsk = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lskw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function pickMode() {
  const book = JSON.parse(lsk("fk_book", "[]") || "[]");
  $("fk-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">👩‍🍳</div><h2>Fractions Kitchen</h2><p class="kit-sub">Shift ${Number(lsk("fk_shift", "0")) + 1} · 📖 ${book.length}/${DISHES.length} recipes in your book</p>
    <button class="kit-btn block" data-m="normal" type="button">🍽️ Normal shift</button><button class="kit-btn block" data-m="busy" type="button">⏱️ Busy kitchen (customers wait 25s, tips!)</button><button class="kit-btn alt block" data-m="blind" type="button">🙈 Blind cup challenge (no marks)</button>
    <div class="fk-book">${DISHES.map(d => `<span class="${book.includes(d) ? "on" : ""}">${book.includes(d) ? d : "❔"}</span>`).join("")}</div></div></div>`;
  $("fk-overlay").querySelectorAll("[data-m]").forEach(b => b.onclick = () => { MODE = b.dataset.m; $("fk-overlay").innerHTML = ""; start(); });
}
function eqHint(fr, S) { return fr.map(([n, d]) => `${n}/${d} = ${n * (S / d)}/${S}`).join(" and "); }

function start() {
  const ING = [["🥛", "milk"], ["🌾", "flour"], ["🍯", "honey"], ["🧈", "butter"], ["🍚", "rice"], ["🧃", "juice"], ["🍫", "chocolate chips"], ["🥜", "peanuts"]];
  // [cup marks, allowed denominators]
  const LEVELS = [[4, [2, 4]], [4, [2, 4]], [6, [2, 3, 6]], [6, [2, 3, 6]], [8, [2, 4, 8]], [8, [2, 4, 8]], [12, [2, 3, 4, 6, 12]], [12, [2, 3, 4, 6, 12]]];
  let idx = 0, firstTry = 0, tries = 0, fill = 0, order = null, tips = 0, patT = null, pat = 0, holdT = null;

  function makeOrder(i) {
    const [S, dens] = LEVELS[i];
    const parts = i >= 6 ? 2 : 1;
    let fr, total;
    for (let guard = 0; guard < 60; guard++) {
      fr = []; total = 0;
      for (let p = 0; p < parts; p++) {
        const d = dens[K.rand(0, dens.length - 1)];
        const n = K.rand(1, d - 1 || 1);
        fr.push([n, d]); total += n * (S / d);
      }
      if (total >= 1 && total <= S) break;
    }
    return { S, fr, target: total, ing: ING[i % ING.length], gold: Math.random() < 0.15, who: CUSTOMERS[K.rand(0, CUSTOMERS.length - 1)] };
  }
  const label = ([n, d]) => `${n}/${d}`;

  function paintCup() {
    const cup = $("fk-cup"); cup.innerHTML = "";
    for (let m = 1; m <= order.S; m++) {
      const seg = document.createElement("div");
      seg.className = "fk-seg" + (m <= fill ? " on" : "") + (MODE === "blind" ? " blind" : "");
      seg.onclick = () => { fill = (fill === m) ? m - 1 : m; paintCup(); };
      cup.appendChild(seg);
    }
    $("fk-read").innerHTML = MODE === "blind" ? `🙈<small>no marks!</small>` : `${fill}<small>of ${order.S} marks</small>`;
  }
  function show() {
    order = makeOrder(idx); fill = 0; tries = 0;
    $("fk-n").textContent = idx + 1;
    $("fk-em").textContent = (order.gold ? "✨" : "") + order.ing[0];
    $("fk-recipe").textContent = `${order.who} wants ` + order.fr.map(label).join(" + ") + " cup of " + (order.gold ? "golden " : "") + order.ing[1] + (order.gold ? " (special order — double tip!)" : "");
    clearInterval(patT); $("fk-pat").hidden = MODE !== "busy";
    if (MODE === "busy") { pat = 25; patT = setInterval(() => { pat -= 0.25; $("fk-patb").style.width = Math.max(0, pat / 25 * 100) + "%"; if (pat <= 0) { clearInterval(patT); $("fk-msg").textContent = `${order.who} got tired of waiting and left 😢`; K.record("fractions-kitchen", "fractions", false); setTimeout(() => { idx++; if (idx >= 8) finish(); else show(); }, 1400); } }, 250); }
    $("fk-hint").textContent = order.fr.length > 1 ? "Add the parts together — pour the total!" : `The cup has ${order.S} marks. Tap the mark to fill up to.`;
    $("fk-msg").textContent = "";
    paintCup();
  }
  $("fk-pour").onclick = () => {
    tries++;
    const ok = fill === order.target;
    K.record("fractions-kitchen", "fractions", ok);
    if (ok) {
      clearInterval(patT);
      if (tries === 1) firstTry++;
      let tip = 0; if (MODE === "busy") tip = pat > 15 ? 2 : pat > 6 ? 1 : 0; if (order.gold && tries === 1) tip = Math.max(1, tip) * 2; tips += tip;
      const dish = DISHES[(idx + Number(lsk("fk_shift", "0"))) % DISHES.length];
      $("fk-em").textContent = dish.split(" ")[0] + " " + order.who + (tries === 1 ? "😋" : "🙂");
      $("fk-ft").textContent = firstTry;
      $("fk-msg").textContent = (tries === 1 ? "✅ Perfect pour!" : "✅ Got it!") + (tip ? ` +${tip} 🪙 tip!` : "");
      $("fk-pour").disabled = true;
      setTimeout(() => { $("fk-pour").disabled = false; idx++; if (idx >= 8) finish(); else show(); }, 900);
    } else {
      $("fk-msg").textContent = (fill > order.target ? "Oops, too much! Pour a bit less." : "Not enough yet — fill a bit more.") + (tries >= 2 ? ` Hint: ${eqHint(order.fr, order.S)}.` : "");
    }
  };
  // hold-to-pour: keep pressing to fill mark by mark
  const hp = $("fk-hold");
  const stopHold = () => { clearInterval(holdT); holdT = null; };
  hp.onpointerdown = e => { e.preventDefault(); if (holdT) return; holdT = setInterval(() => { if (fill < order.S) { fill++; paintCup(); } else stopHold(); }, 320); };
  hp.onpointerup = hp.onpointerleave = hp.onpointercancel = stopHold;
  async function finish() {
    clearInterval(patT);
    lskw("fk_shift", String(Number(lsk("fk_shift", "0")) + 1));
    const book = JSON.parse(lsk("fk_book", "[]") || "[]"), dish = DISHES.find(d => !book.includes(d));
    if (dish && firstTry >= 5) { book.push(dish); lskw("fk_book", JSON.stringify(book)); setTimeout(() => K.toastAdv(`New recipe: ${dish}!`), 600); }
    $("fk-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${firstTry >= 7 ? "🌟" : "🥣"}</div><h2>Kitchen closed!</h2>
      <p class="kit-sub">${firstTry}/8 orders perfect on the first try${tips ? ` · 🪙 ${tips} in tips` : ""}.${firstTry >= 5 && dish ? `<br>📖 New recipe for your book: ${dish}` : firstTry < 5 ? "<br>Get 5 perfect pours to earn a new recipe!" : ""}</p><div class="kit-bonus" id="fk-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">New shift</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("fractions-kitchen", 4 + firstTry * 2 + tips, $("fk-bonus"));
  }
  show();
}
