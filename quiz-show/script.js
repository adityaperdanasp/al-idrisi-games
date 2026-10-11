/* =================================================================
   Quiz Show Live — a PRESENTATION layer over standard Q&A rather than a
   brand new core mechanic: spinning category wheel, a prize ladder with
   2 safe checkpoints (Who Wants to Be a Millionaire style -- missing a
   question drops you back to your last checkpoint, not to zero), a
   "Final Answer?" confirmation step before reveal, and 2 one-time
   lifelines (50/50, Skip). The drama/pacing is the new thing here, not
   the underlying question format.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("qs-signedout-overlay").classList.remove("hidden");
  document.getElementById("qs-start-overlay").classList.add("hidden");
} else {
  initQuizShow();
}

function initQuizShow() {
  const PRIZE_LADDER = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
  const CHECKPOINT_INDICES = [4]; // 0-indexed -- rung 5 (index 4) is the only mid-game safe haven
  const GEN_KEYS = ["addition-subtraction-add", "addition-subtraction-sub", "multiplication", "division", "measurement", "rounding"];
  // The wheel has 2 extra slices (Language, Science) beyond the 6 math
  // GEN_KEYS, so it spins the SAME way it always did but can now land on
  // a mixed-subject question too -- SLICE_KEYS (not GEN_KEYS) is what
  // renderWheel/spinWheelTo iterate over.
  const SLICE_KEYS = [...GEN_KEYS, "lang", "sci"];
  const CATEGORY_LABELS = { "addition-subtraction-add": "Addition", "addition-subtraction-sub": "Subtract", multiplication: "Multiply", division: "Division", measurement: "Measure", rounding: "Rounding", lang: "Language", sci: "Science" };
  const WHEEL_COLORS = ["#8c2f6b", "#2f4c8c", "#3f7a4e", "#a85a1f", "#6b3f9b", "#b8342f", "#1f6b5e", "#2f8ca8"];
  if (window.AIGQuestionPools) window.AIGQuestionPools.ensurePools();

  const state = { qIndex: 0, prizeIndex: -1, lastCheckpointIndex: -1, hint5050Used: false, skipUsed: false, pickedBtn: null, currentQ: null, audUsed: false, phoneUsed: false, timer: null, beat: null, walked: false };
  // Audit batch 8: two new lifelines (📊 Ask the audience, 📞 Phone Bo), a 30-second clock from
  // question 7 with a heartbeat, "take the money" to walk away with your current prize, audience
  // applause on right answers, and a best-prize record.
  const life = document.querySelector(".qs-lifelines") || document.getElementById("qs-lifeline-5050").parentElement;
  life.insertAdjacentHTML("beforeend", `<button class="qs-lifeline-btn" id="qs-lifeline-swap" type="button" disabled title="Win Fastest Finger to earn it">🔄 Swap</button>`);
  life.insertAdjacentHTML("beforeend", `<button class="qs-lifeline-btn" id="qs-lifeline-aud" type="button">📊 Audience</button><button class="qs-lifeline-btn" id="qs-lifeline-phone" type="button">📞 Phone Bo</button><button class="qs-lifeline-btn qs-walk" id="qs-walk" type="button">💼 Take the money</button>`);
  const extra = document.createElement("div"); extra.className = "qs-extra"; extra.id = "qs-extra"; document.getElementById("qs-q-card").appendChild(extra);
  function beep(f, d) { try { const a = window.__qsA || (window.__qsA = new (window.AudioContext || window.webkitAudioContext)()), o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.frequency.value = f; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d); } catch (e) {} }
  function stopClock() { clearInterval(state.timer); clearInterval(state.beat); state.timer = state.beat = null; }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function difficultyForIndex(i) { return i <= 2 ? "easy" : i <= 5 ? "medium" : "hard"; }

  // Same MC-building approach as the other new mini-games' buildMc.
  function buildMc(q) {
    if (q.prompt.startsWith("Compare")) {
      return { prompt: q.prompt, options: shuffle(["<", "=", ">"]), correctLabel: q.answer };
    }
    const m = String(q.answer).trim().match(/^(-?[\d,]+(?:\.\d+)?)(\s+[a-zA-Z]+)?$/);
    const correctNum = Number(m[1].replace(/,/g, ""));
    const suffix = m[2] || "";
    const options = new Set([correctNum]);
    let guard = 0;
    while (options.size < 4 && guard++ < 40) {
      const magnitude = Math.max(1, Math.round(Math.abs(correctNum) * (0.1 + Math.random() * 0.3)));
      const cand = correctNum + magnitude * (Math.random() < 0.5 ? -1 : 1);
      if (cand >= 0 && cand !== correctNum) options.add(cand);
    }
    let bump = 1;
    while (options.size < 4) options.add(correctNum + bump++);
    return {
      prompt: q.prompt,
      options: shuffle([...options]).map(n => n.toLocaleString("en-US") + suffix),
      correctLabel: correctNum.toLocaleString("en-US") + suffix
    };
  }

  // Each slice's OUTER div rotates to point at its position on the wheel
  // (needed to place the label along the right radial line), but the
  // label TEXT itself is a child span counter-rotated by the same
  // angle in the opposite direction -- so it always renders upright and
  // horizontal no matter where it sits on the wheel, instead of
  // appearing sideways/upside-down on the lower half like a plain
  // radially-rotated label would (found from a real-device screenshot
  // showing exactly that -- "Division"/"Round"/"Add" unreadable).
  function renderWheel() {
    const wheel = document.getElementById("qs-wheel");
    wheel.innerHTML = "";
    const n = SLICE_KEYS.length;
    const sliceDeg = 360 / n;
    wheel.style.background = `conic-gradient(${SLICE_KEYS.map((k, i) => `${WHEEL_COLORS[i]} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`).join(",")})`;
    SLICE_KEYS.forEach((k, i) => {
      const angle = i * sliceDeg + sliceDeg / 2;
      const slice = document.createElement("div");
      slice.className = "qs-wheel-slice";
      slice.style.transform = `rotate(${angle}deg)`;
      const text = document.createElement("span");
      text.className = "qs-wheel-slice-text";
      text.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
      text.textContent = CATEGORY_LABELS[k];
      slice.appendChild(text);
      wheel.appendChild(slice);
    });
  }

  function spinWheelTo(targetKeyIndex, onDone) {
    const wheel = document.getElementById("qs-wheel");
    const n = SLICE_KEYS.length;
    const sliceDeg = 360 / n;
    // Land the CENTER of the target slice under the top pointer (0deg) --
    // spin several full turns first purely for visual drama.
    const targetRotation = 360 * 4 + (360 - (targetKeyIndex * sliceDeg + sliceDeg / 2));
    wheel.style.transition = "none";
    wheel.style.transform = "rotate(0deg)";
    void wheel.offsetWidth;
    wheel.style.transition = "transform 3s cubic-bezier(.17,.67,.16,.99)";
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    setTimeout(onDone, 3100);
  }

  function renderLadder() {
    const ladder = document.getElementById("qs-ladder");
    ladder.innerHTML = "";
    PRIZE_LADDER.forEach((prize, i) => {
      const rung = document.createElement("div");
      rung.className = "qs-ladder-rung"
        + (i <= state.prizeIndex ? " done" : i === state.qIndex ? " current" : "")
        + (CHECKPOINT_INDICES.includes(i) ? " checkpoint" : "");
      rung.textContent = `$${prize}`;
      ladder.appendChild(rung);
    });
    document.getElementById("qs-prize-value").textContent = `$${state.prizeIndex >= 0 ? PRIZE_LADDER[state.prizeIndex] : 0}`;
  }

  function rollMathAtSlice(sliceIndex) {
    const key = GEN_KEYS[sliceIndex];
    const raw = MATHVILLE_GENERATORS[key](difficultyForIndex(state.qIndex));
    return { sliceIndex, key, ...buildMc(raw) };
  }

  // Picks which of the 8 wheel slices to land on, THEN builds that
  // slice's question -- the wheel always lands on the category the next
  // question actually belongs to, math or not. Falls back to a random
  // math slice if the Language/Science pool isn't ready or came back
  // empty, so a slow/offline fetch never blocks the wheel.
  function rollQuestion() {
    const sliceIndex = rand(0, SLICE_KEYS.length - 1);
    const sliceKey = SLICE_KEYS[sliceIndex];
    if (sliceKey === "lang" || sliceKey === "sci") {
      const pick = window.AIGQuestionPools && (sliceKey === "lang" ? window.AIGQuestionPools.pickLanguage() : window.AIGQuestionPools.pickScience());
      if (pick) return { sliceIndex, key: sliceKey === "lang" ? "language" : "science", ...pick };
      return rollMathAtSlice(rand(0, GEN_KEYS.length - 1));
    }
    return rollMathAtSlice(sliceIndex);
  }

  function startRound() {
    document.getElementById("qs-q-card").classList.add("hidden");
    const q = rollQuestion();
    state.currentQ = q;
    spinWheelTo(q.sliceIndex, () => showQuestion(q));
  }

  function showQuestion(q) {
    stopClock(); extra.innerHTML = "";
    document.getElementById("qs-q-prompt").textContent = q.prompt;
    if (state.qIndex >= 6) { let t = 30; extra.innerHTML = `<div class="qs-clock">⏱️ <b id="qs-t">30</b>s</div>`; state.beat = setInterval(() => beep(90, 0.15), t > 10 ? 900 : 450);
      state.timer = setInterval(() => { t--; const el = document.getElementById("qs-t"); if (el) el.textContent = t; if (t <= 0) { stopClock(); const w = [...document.querySelectorAll("#qs-q-grid .qs-q-btn")].find(b => b.textContent !== q.correctLabel); if (w) { state.pickedBtn = { btn: w, opt: w.textContent }; lockInAnswer(); } } }, 1000); }
    const grid = document.getElementById("qs-q-grid");
    grid.innerHTML = "";
    state.pickedBtn = null;
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "qs-q-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => pickAnswer(btn, opt));
      grid.appendChild(btn);
    });
    document.getElementById("qs-q-card").classList.remove("hidden");
  }

  function pickAnswer(btn, opt) {
    if (btn.classList.contains("removed")) return;
    document.querySelectorAll("#qs-q-grid .qs-q-btn").forEach(b => b.classList.remove("picked"));
    btn.classList.add("picked");
    state.pickedBtn = { btn, opt };
    document.getElementById("qs-final-sub").textContent = `You picked "${opt}" for $${PRIZE_LADDER[state.qIndex]}.`;
    document.getElementById("qs-final-overlay").classList.remove("hidden");
  }

  document.getElementById("qs-final-no-btn").addEventListener("click", () => {
    document.getElementById("qs-final-overlay").classList.add("hidden");
  });
  document.getElementById("qs-final-yes-btn").addEventListener("click", () => {
    document.getElementById("qs-final-overlay").classList.add("hidden");
    lockInAnswer();
  });

  function lockInAnswer() {
    stopClock();
    const q = state.currentQ;
    const { btn, opt } = state.pickedBtn;
    const isCorrect = opt === q.correctLabel;
    document.querySelectorAll("#qs-q-grid .qs-q-btn").forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correctLabel) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("quiz-show", q.key, isCorrect);

    setTimeout(() => {
      if (isCorrect) {
        const clap = document.createElement("div"); clap.className = "qs-clap"; clap.textContent = "👏👏👏"; document.body.appendChild(clap); setTimeout(() => clap.remove(), 1200); beep(660, 0.12); setTimeout(() => beep(880, 0.15), 120);
        state.prizeIndex = state.qIndex;
        if (CHECKPOINT_INDICES.includes(state.qIndex)) state.lastCheckpointIndex = state.qIndex;
        state.qIndex++;
        renderLadder();
        if (state.qIndex >= PRIZE_LADDER.length) { finishShow(true); return; }
        startRound();
      } else {
        finishShow(false);
      }
    }, 1200);
  }

  document.getElementById("qs-lifeline-5050").addEventListener("click", () => {
    if (state.hint5050Used || !state.currentQ) return;
    state.hint5050Used = true;
    document.getElementById("qs-lifeline-5050").disabled = true;
    const q = state.currentQ;
    const wrongBtns = [...document.querySelectorAll("#qs-q-grid .qs-q-btn")].filter(b => b.textContent !== q.correctLabel);
    shuffle(wrongBtns).slice(0, 2).forEach(b => b.classList.add("removed"));
  });

  document.getElementById("qs-lifeline-skip").addEventListener("click", () => {
    if (state.skipUsed) return;
    state.skipUsed = true;
    document.getElementById("qs-lifeline-skip").disabled = true;
    startRound(); // fresh question at the SAME rung -- no penalty
  });

  document.getElementById("qs-lifeline-aud").addEventListener("click", () => {
    if (state.audUsed || !state.currentQ) return; state.audUsed = true; document.getElementById("qs-lifeline-aud").disabled = true;
    const q = state.currentQ, btns = [...document.querySelectorAll("#qs-q-grid .qs-q-btn")].filter(b => !b.classList.contains("removed"));
    let left = 100; const votes = btns.map(b => { const v = b.textContent === q.correctLabel ? 45 + Math.floor(Math.random() * 25) : 0; left -= v; return v; });
    btns.forEach((b, i) => { if (!votes[i]) { const v = i === btns.length - 1 ? left : Math.floor(Math.random() * left); votes[i] = Math.max(0, v); left -= votes[i]; } });
    extra.innerHTML += `<div class="qs-aud">${btns.map((b, i) => `<div><span>${b.textContent}</span><i style="width:${votes[i]}%"></i><b>${votes[i]}%</b></div>`).join("")}</div>`;
  });
  document.getElementById("qs-lifeline-phone").addEventListener("click", () => {
    if (state.phoneUsed || !state.currentQ) return; state.phoneUsed = true; document.getElementById("qs-lifeline-phone").disabled = true;
    const a = String(state.currentQ.correctLabel);
    extra.innerHTML += `<div class="qs-phone">📞 Bo: “Hmm… ${/^\d/.test(a) ? `I think it has ${a.replace(/[^\d]/g, "").length} digit${a.replace(/[^\d]/g, "").length > 1 ? "s" : ""} and ends in ${a.replace(/[^\d]/g, "").slice(-1)}` : `I'm pretty sure it starts with “${a[0]}”`}. Good luck!”</div>`;
  });
  document.getElementById("qs-walk").addEventListener("click", () => { if (state.prizeIndex < 0) return; state.walked = true; stopClock(); finishShow(false); });
  function finishShow(reachedTop) {
    stopClock();
    if (window.AIGSynthBgm) AIGSynthBgm.stop();
    const finalPrizeIndex = reachedTop ? PRIZE_LADDER.length - 1 : state.walked ? state.prizeIndex : state.lastCheckpointIndex;
    const finalPrize = finalPrizeIndex >= 0 ? PRIZE_LADDER[finalPrizeIndex] : 0;
    document.getElementById("qs-q-card").classList.add("hidden");
    const emoji = reachedTop ? "🏆" : finalPrize >= 75 ? "🥳" : finalPrize > 0 ? "🙂" : "💪";
    const title = reachedTop ? "You won the top prize!" : "Game Over!";
    document.getElementById("qs-end-emoji").textContent = emoji;
    document.getElementById("qs-end-title").textContent = title;
    document.getElementById("qs-end-sub").textContent = reachedTop
      ? `You answered all 10 questions and won $${finalPrize}!`
      : `You walk away with $${finalPrize}${state.walked ? " — smart move!" : finalPrize > 0 ? " (your last checkpoint)" : ""}.`;
    try { const b = Number(localStorage.getItem("qs_best") || 0); if (finalPrize > b) { localStorage.setItem("qs_best", String(finalPrize)); document.getElementById("qs-end-sub").textContent += " 🏅 New best prize!"; } else if (b) document.getElementById("qs-end-sub").textContent += ` (Best: $${b})`; } catch (e) {}
    const bonusEl = document.getElementById("qs-end-bonus");
    bonusEl.textContent = "";
    if (window.AIGLeaderboard) {
      AIGLeaderboard.awardQuizShowBonus(finalPrize, PRIZE_LADDER[PRIZE_LADDER.length - 1]).then(result => {
        if (result && result.bonus) {
          bonusEl.textContent = `Bonus: 🪙${result.bonus.coins || 0}${result.bonus.gems ? ` 💎${result.bonus.gems}` : ""}`;
        }
      }).catch(() => {});
    }
    document.getElementById("qs-end-overlay").classList.remove("hidden");
  }

  // Audit round 2: Fastest Finger -- before the hot seat, race Bo-Bot on 3 quick questions (Bo-Bot
  // buzzes in after 3-6s). Win 2 and you earn the 🔄 Swap lifeline (replace a question) for the show.
  function fastestFinger(done) {
    const o = document.createElement("div"); o.className = "qs-overlay"; document.body.appendChild(o);
    let n = 0, me = 0, bot = 0, timer = null;
    const ask = () => {
      clearInterval(timer);
      if (n >= 3) { const won = me >= 2; o.innerHTML = `<div class="qs-card"><div class="qs-modal-emoji">${won ? "🏆" : "🤖"}</div><div class="qs-modal-title">${won ? "You won Fastest Finger!" : "Bo-Bot was faster"}</div><p class="qs-modal-sub">You ${me} – ${bot} Bo-Bot. ${won ? "You earned the 🔄 Swap lifeline!" : "You still get the hot seat — good luck!"}</p><button class="qs-btn qs-btn-primary" id="qs-ff-go">Take the hot seat</button></div>`; o.querySelector("#qs-ff-go").onclick = () => { o.remove(); done(won); }; return; }
      const q = rollQuestion(), botMs = 3000 + Math.random() * 3000, t0 = Date.now();
      o.innerHTML = `<div class="qs-card"><div class="qs-modal-sub" style="font-weight:800">⚡ Fastest Finger ${n + 1}/3 · You ${me} – ${bot} 🤖</div><div class="qs-ff-bar"><i id="qs-ffb"></i></div><div class="qs-modal-title" style="font-size:1.1rem">${q.prompt}</div><div class="qs-ff-grid">${q.options.map(x => `<button class="qs-q-btn" type="button">${x}</button>`).join("")}</div></div>`;
      timer = setInterval(() => { const k = (Date.now() - t0) / botMs; const b = o.querySelector("#qs-ffb"); if (b) b.style.width = Math.min(100, k * 100) + "%"; if (k >= 1) { clearInterval(timer); bot++; n++; o.querySelector(".qs-modal-sub").textContent = `🤖 Bo-Bot buzzed first! It was ${q.correctLabel}`; setTimeout(ask, 1300); } }, 80);
      o.querySelectorAll(".qs-q-btn").forEach(b => b.onclick = () => { clearInterval(timer); const ok = b.textContent === q.correctLabel; if (window.AIGLeaderboard) AIGLeaderboard.recordTopicAttempt("quiz-show", q.key, ok); if (ok) me++; else bot++; n++; b.classList.add(ok ? "correct" : "wrong"); setTimeout(ask, 800); });
    };
    ask();
  }
  document.getElementById("qs-lifeline-swap").addEventListener("click", () => {
    if (!state.swapReady || !state.currentQ) return; state.swapReady = false; document.getElementById("qs-lifeline-swap").disabled = true;
    const q = rollQuestion(); state.currentQ = q; showQuestion(q);
  });
  function startShow() {
    fastestFinger(won => { state.swapReady = won; document.getElementById("qs-lifeline-swap").disabled = !won; startShowReal(); });
    document.getElementById("qs-end-overlay").classList.add("hidden");
    document.getElementById("qs-start-overlay").classList.add("hidden");
  }
  function startShowReal() {
    if (window.AIGSynthBgm) AIGSynthBgm.start();
    state.qIndex = 0;
    state.prizeIndex = -1;
    state.lastCheckpointIndex = -1;
    state.hint5050Used = false;
    state.skipUsed = false; state.audUsed = false; state.phoneUsed = false; state.walked = false;
    ["qs-lifeline-aud", "qs-lifeline-phone"].forEach(id => { document.getElementById(id).disabled = false; });
    document.getElementById("qs-lifeline-5050").disabled = false;
    document.getElementById("qs-lifeline-skip").disabled = false;
    renderWheel();
    renderLadder();
    document.getElementById("qs-end-overlay").classList.add("hidden");
    document.getElementById("qs-start-overlay").classList.add("hidden");
    startRound();
  }

  document.getElementById("qs-start-btn").addEventListener("click", startShow);
  document.getElementById("qs-play-again-btn").addEventListener("click", startShow);
}
