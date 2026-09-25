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
else start();

function start() {
  const ING = [["🥛", "milk"], ["🌾", "flour"], ["🍯", "honey"], ["🧈", "butter"], ["🍚", "rice"], ["🧃", "juice"], ["🍫", "chocolate chips"], ["🥜", "peanuts"]];
  // [cup marks, allowed denominators]
  const LEVELS = [[4, [2, 4]], [4, [2, 4]], [6, [2, 3, 6]], [6, [2, 3, 6]], [8, [2, 4, 8]], [8, [2, 4, 8]], [12, [2, 3, 4, 6, 12]], [12, [2, 3, 4, 6, 12]]];
  let idx = 0, firstTry = 0, tries = 0, fill = 0, order = null;

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
    return { S, fr, target: total, ing: ING[i % ING.length] };
  }
  const label = ([n, d]) => `${n}/${d}`;

  function paintCup() {
    const cup = $("fk-cup"); cup.innerHTML = "";
    for (let m = 1; m <= order.S; m++) {
      const seg = document.createElement("div");
      seg.className = "fk-seg" + (m <= fill ? " on" : "");
      seg.onclick = () => { fill = (fill === m) ? m - 1 : m; paintCup(); };
      cup.appendChild(seg);
    }
    $("fk-read").innerHTML = `${fill}<small>of ${order.S} marks</small>`;
  }
  function show() {
    order = makeOrder(idx); fill = 0; tries = 0;
    $("fk-n").textContent = idx + 1;
    $("fk-em").textContent = order.ing[0];
    $("fk-recipe").textContent = order.fr.map(label).join(" + ") + " cup of " + order.ing[1];
    $("fk-hint").textContent = order.fr.length > 1 ? "Add the parts together — pour the total!" : `The cup has ${order.S} marks. Tap the mark to fill up to.`;
    $("fk-msg").textContent = "";
    paintCup();
  }
  $("fk-pour").onclick = () => {
    tries++;
    const ok = fill === order.target;
    K.record("fractions-kitchen", "fractions", ok);
    if (ok) {
      if (tries === 1) firstTry++;
      $("fk-ft").textContent = firstTry;
      $("fk-msg").textContent = tries === 1 ? "✅ Perfect pour!" : "✅ Got it!";
      $("fk-pour").disabled = true;
      setTimeout(() => { $("fk-pour").disabled = false; idx++; if (idx >= 8) finish(); else show(); }, 900);
    } else {
      $("fk-msg").textContent = fill > order.target ? "Oops, too much! Pour a bit less." : "Not enough yet — fill a bit more.";
    }
  };
  async function finish() {
    $("fk-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${firstTry >= 7 ? "🌟" : "🥣"}</div><h2>Kitchen closed!</h2>
      <p class="kit-sub">${firstTry}/8 orders perfect on the first try.</p><div class="kit-bonus" id="fk-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">New shift</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("fractions-kitchen", 4 + firstTry * 2, $("fk-bonus"));
  }
  show();
}
