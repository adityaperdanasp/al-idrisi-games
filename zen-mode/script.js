/* =================================================================
   Zen Mode (PM round 11, item 20) -- for tired or frustrated days: no
   timer, no lives, no score pressure. A wrong answer just crosses out that
   choice and you try again. Normal per-answer coins still apply; ending the
   session pays a small calm-practice bonus.
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
if (!player) $("zm-overlay").innerHTML = K.signedOutHtml("🍃");
else K.ready().then(start);

function start() {
  const KIND = ["math", "lang", "sci"];
  const kind = { i: 0 };
  let right = 0, tried = 0, q = null, misses = 0;
  const KIND_PICK = () => KIND[K.rand(0, 2)];
  const CHEER = ["Nice and steady 🌿", "That's it! 🌸", "Lovely 🍃", "You've got this ☁️", "Great job, easy does it 🌼"];
  const GENTLE = ["No worries — try another one 🌱", "Take a breath and look again 🌬️", "It's okay, mistakes help us grow 🌻"];

  function next() {
    misses = 0;
    q = K.question({ subject: KIND_PICK(), difficulty: "easy" });
    $("zm-q").textContent = q.prompt;
    const box = $("zm-opts"); box.innerHTML = "";
    q.options.forEach(o => {
      const b = document.createElement("button");
      b.className = "kit-opt"; b.type = "button"; b.textContent = o;
      b.onclick = () => pick(b, o);
      box.appendChild(b);
    });
  }
  function pick(btn, o) {
    const ok = o === q.correctLabel;
    if (ok) {
      if (misses === 0) { right++; $("zm-r").textContent = right; K.record("zen-mode", q.key, true, q); }
      btn.classList.add("right");
      $("zm-msg").textContent = CHEER[K.rand(0, CHEER.length - 1)];
      $("zm-opts").querySelectorAll(".kit-opt").forEach(b => b.disabled = true);
      setTimeout(() => { $("zm-msg").textContent = ""; next(); }, 900);
    } else {
      if (misses === 0) K.record("zen-mode", q.key, false, q);
      misses++; btn.disabled = true; btn.style.opacity = ".35";
      $("zm-msg").textContent = GENTLE[K.rand(0, GENTLE.length - 1)];
    }
  }
  $("zm-done").onclick = async () => {
    const coins = Math.min(10, Math.floor(right / 3));
    $("zm-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">🌿</div><h2>Peaceful practice</h2>
      <p class="kit-sub">You got ${right} right first time. Thanks for taking care of your brain today!</p><div class="kit-bonus" id="zm-bonus"></div>
      <button class="kit-btn block" onclick="location.reload()">Keep going</button><a class="kit-btn alt block" href="../game-room/">Game Room</a></div></div>`;
    K.finish("zen-mode", coins, $("zm-bonus"));
  };
  next();
}
