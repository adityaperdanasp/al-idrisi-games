/* =================================================================
   Focus Round -- 20 questions in the three themes Azka is working on, mixed together:
   🧮 math story problems (7) · 🔤 spelling (7) · ✏️ fix-the-spelling worksheet words (6: choose / type / match).
   Question list comes from round.js (AIGFocusRound.build). No timer, no lives -- calm practice.
   Answers feed the same progress as everywhere else: per-word spelling progress, topic stats (coins/season/quota).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit, esc = K.esc, player = K.signedIn();
const R = window.AIGFocusRound, TH = R.THEMES;

function intro() {
  $("fr-main").innerHTML = `<div class="kit-card fr-hero"><div class="fr-big">🎯</div><div class="kit-q">Focus Round</div>
    <div class="kit-sub">20 questions, no timer. Three things we are getting better at:</div>
    <div class="fr-themes"><span>🧮<br>Math story problems</span><span>🔤<br>Spelling</span><span>✏️<br>Fix the spelling</span></div>
    <div class="kit-sub">Stuck on a story problem? Tap <b>💡 Bo, help me!</b></div>
    <button class="kit-btn block" id="fr-go" type="button">Start! ▶</button></div>`;
  $("fr-go").onclick = () => play(R.build());
}

const sameNum = (a, b) => String(a).replace(/[,\s]/g, "") === String(b).replace(/[,\s]/g, "");

function play(qs) {
  let i = 0, score = 0; const tally = { story: [0, 0], spell: [0, 0], fix: [0, 0] }, missed = [];
  const finish = () => {
    const good = score >= Math.ceil(qs.length * 0.7);
    if (good) try { AIGJoy && AIGJoy.confetti && AIGJoy.confetti(50); } catch (e) {}
    const rows = ["story", "spell", "fix"].map(t => `<div><span>${TH[t].em} ${TH[t].name}</span><b>${tally[t][0]} / ${tally[t][1]}</b></div>`).join("");
    const weakest = ["story", "spell", "fix"].map(t => [t, tally[t][1] ? tally[t][0] / tally[t][1] : 1]).sort((a, b) => a[1] - b[1])[0];
    const tip = weakest[1] < 1 ? `Next time, give extra love to <b>${TH[weakest[0]].em} ${TH[weakest[0]].name}</b>.` : "Perfect round in all three! 🌟";
    $("fr-main").innerHTML = `<div class="kit-card fr-hero"><div class="fr-big">${good ? "🏆" : "💪"}</div><div class="kit-q">Focus Round done!</div>
      <div class="kit-sub">Score: ${score} out of ${qs.length}</div><div class="fr-sum">${rows}</div>
      <div class="kit-sub">${tip}</div>
      ${missed.length ? `<div class="kit-sub">Words to practice again: <b>${[...new Set(missed)].map(esc).join(", ")}</b></div>` : ""}
      <div class="kit-sub" id="fr-coins"></div>
      <button class="kit-btn block" id="fr-again" type="button">Play again</button><button class="kit-btn block" id="fr-home" type="button">Back to home</button></div>`;
    $("fr-again").onclick = () => play(R.build()); $("fr-home").onclick = () => { location.href = "../"; };
    try { K.finish("focus-round", Math.min(25, score), $("fr-coins")); } catch (e) {}
  };
  const show = () => {
    if (i >= qs.length) return finish();
    const q = qs[i], typed = q.type === "fill", isMatch = q.type === "match", isStory = q.theme === "story";
    const mixed = isMatch ? q.pairs.map(x => x.right).sort(() => Math.random() - 0.5) : [];
    const promptHtml = q.plain ? esc(q.prompt) : q.prompt;
    $("fr-main").innerHTML = `<div class="kit-card">
      <div class="fr-hud"><span>Question ${i + 1} / ${qs.length}</span><span>⭐ ${score}</span></div>
      <div class="fr-bar"><i style="width:${Math.round(i / qs.length * 100)}%"></i></div>
      <span class="fr-badge ${q.theme}">${TH[q.theme].em} ${TH[q.theme].name}</span>
      <div class="fr-q" id="typein-prompt">${promptHtml}</div>
      ${isMatch ? `<div class="fr-match">${q.pairs.map((x, k) => `<div class="fr-mrow"><span class="fr-mleft">${esc(x.left)}</span><select class="fr-msel" data-k="${k}"><option value="">Choose the correct spelling</option>${mixed.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select></div>`).join("")}</div><button class="kit-btn block" id="fr-mcheck" type="button">Check answer</button>`
        : typed ? `<input class="fr-in" id="fr-in" type="text" ${isStory ? 'inputmode="numeric"' : ""} autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="${isStory ? "Type your answer" : "Type the word here"}"><button class="kit-btn block" id="fr-check" type="button">Check answer</button>`
        : `<div class="fr-opts">${q.options.map(o => `<button class="fr-opt" type="button" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}
      <div id="fr-after"></div></div>`;
    if (isStory && window.AIGStoryHelp) try { AIGStoryHelp.attach({ prompt: q.prompt, meta: q.meta }); } catch (e) {}
    let answered = false;
    const settle = (ok, given) => {
      if (answered) return; answered = true;
      if (ok) score++; tally[q.theme][1]++; if (ok) tally[q.theme][0]++;
      if (!ok && q.spellWord) missed.push(q.spellWord);
      try {
        if (q.spellWord) SP().record(q.spellWord, ok);
        if (isStory) AIGLeaderboard.recordTopicAttempt("mathville", "Story Problems", ok);
        else AIGLeaderboard.recordTopicAttempt("language-arts", "Spelling Words", ok);
      } catch (e) {}
      let extra = "";
      if (isStory) { if (!ok && window.AIGStoryHelp) extra = AIGStoryHelp.explainHtml({ meta: q.meta }); const h = $("story-help"); if (h) h.remove(); }
      else if (q.spellWord) extra = SP().afterAnswerHtml(q.spellWord, ok).replace(/sp-note sp-/g, "fr-note fr-");
      const ans = isMatch ? q.pairs.map(x => esc(x.left) + " → <b>" + esc(x.right) + "</b>").join("<br>") : "<b>" + esc(q.answer) + "</b>";
      $("fr-after").innerHTML = `<div class="fr-fb">${ok ? "✅ Correct!" : "❌ Answer: " + ans}</div>${extra}<button class="kit-btn block" id="fr-next" type="button">${i + 1 >= qs.length ? "Finish" : "Next"}</button>`;
      document.querySelectorAll(".fr-opt").forEach(b => { b.disabled = true; if (b.dataset.o === q.answer) b.classList.add("ok"); else if (b.dataset.o === given) b.classList.add("bad"); });
      document.querySelectorAll(".fr-msel").forEach(el => { el.disabled = true; const x = q.pairs[+el.dataset.k]; el.style.background = el.value === x.right ? "#c9f2c7" : "#ffd0d0"; });
      ["fr-mcheck", "fr-check"].forEach(id => { const b = $(id); if (b) b.disabled = true; }); const inp = $("fr-in"); if (inp) inp.disabled = true;
      $("fr-next").onclick = () => { i++; show(); };
    };
    if (isMatch) $("fr-mcheck").onclick = () => { const sels = [...document.querySelectorAll(".fr-msel")]; if (sels.some(el => !el.value)) return; settle(sels.every(el => el.value === q.pairs[+el.dataset.k].right), "match"); };
    else if (typed) {
      const go = () => { const v = $("fr-in").value.trim(); if (!v) return; settle(isStory ? sameNum(v, q.answer) : v.toLowerCase() === String(q.answer).toLowerCase(), v); };
      $("fr-check").onclick = go; $("fr-in").onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); go(); } }; $("fr-in").focus();
    } else document.querySelectorAll(".fr-opt").forEach(b => b.onclick = () => settle(b.dataset.o === q.answer, b.dataset.o));
  };
  show();
}
const SP = () => window.AIGSpelling;
if (!player) $("fr-main").innerHTML = K.signedOutHtml("🎯"); else { (K.ready ? K.ready() : Promise.resolve()).catch(() => {}).then(intro); }
