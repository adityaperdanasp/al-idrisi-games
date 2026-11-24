// QA for Azka's Fokus content: story problems (mathville/generators.js) and the spelling bank (azkacraft/spelling.js).
// Run: node scripts/qa-azka-focus.js [N]
global.localStorage = { getItem() { return null; }, setItem() {} };
const FX = require("../azkacraft/spelling-fix.js"), T = require("../mathville/generators.js"), S = require("../azkacraft/spelling.js"), H = require("../mathville/story-help.js");
const N = Number(process.argv[2] || 3000), fails = [];
const fail = m => { if (fails.length < 30) fails.push(m); };
const num = s => Number(String(s).replace(/,/g, ""));
// ---- story problems ----
let n1 = 0, n2 = 0, nop = 0; const prompts = new Set();
for (const d of ["easy", "medium", "hard"]) for (let i = 0; i < N; i++) {
  for (const [name, fn] of [["one", T._gen.genStoryOne], ["two", T._gen.genStoryTwo]]) {
    const g = fn(d); name === "one" ? n1++ : n2++; prompts.add(g.prompt);
    let v; try { v = Function('"use strict";return (' + g.meta.expr + ")")(); } catch (e) { fail("bad expr " + g.meta.expr); continue; }
    if (!Number.isInteger(v) || v <= 0) fail(`non-positive/non-integer ${v} :: ${g.prompt}`);
    if (v !== g.meta.r || num(g.answer) !== v) fail(`answer mismatch ${g.answer} vs ${v} :: ${g.prompt}`);
    if (/NaN|undefined|Infinity/.test(g.prompt)) fail("bad prompt " + g.prompt);
    try {
      const shown = g.meta.disp || g.meta.expr, ws = H.workSteps(shown), last = ws[ws.length - 1];
      if (!last || last.v !== v) fail(`story-help working ends at ${last && last.v}, answer ${v} :: ${g.prompt}`);
      if (g.meta.disp && Function('"use strict";return (' + g.meta.disp + ")")() !== v) fail("disp != answer :: " + g.prompt);
      if (!H.explainHtml({ meta: g.meta }).includes("sh-explain")) fail("explainHtml empty :: " + g.prompt);
    } catch (e) { fail("story-help threw " + e.message + " :: " + g.prompt); }
    if (g.meta.op === "div" || g.meta.op === "div-add" || g.meta.op === "div-sub" || g.meta.op === "div-mul") { /* division exact is guaranteed by integer check above */ }
  }
  const op = T._gen.genStoryOp(d); nop++;
  if (!op.options || !op.options.includes(op.correctLabel) || new Set(op.options).size !== op.options.length) fail("bad op step " + op.prompt);
  if (op.meta && op.meta.expr) { const sign = { add: "+", sub: "-", mul: "*", div: "/" }[op.meta.op]; if (sign && !op.meta.expr.includes(sign)) fail("op label vs expr " + op.meta.expr); }
  const st = T.makeStep("story-problems", d); if (!st.prompt || !(st.uiType === "typein" || st.uiType === "tap")) fail("bad makeStep");
  const q = T.story(d); if (!/^-?[\d,]+$/.test(q.answer)) fail("quick answer not numeric " + q.answer);
}
// ---- story chains ----
let nchain = 0;
for (const d of ["easy", "medium", "hard"]) for (let i = 0; i < Math.max(300, N / 4); i++) for (const id of ["market", "trip", "bakery", "reading", "cards", "garden"]) {
  const steps = T.storyChain(d, id); nchain++;
  if (steps.length !== 5) { fail("chain length " + id); continue; }
  steps.forEach((st, ix) => {
    const m = st.meta; let v;
    try { v = Function('"use strict";return (' + m.expr + ")")(); } catch (e) { fail("chain bad expr " + m.expr); return; }
    if (!Number.isInteger(v) || v <= 0) fail(`chain ${id} #${ix + 1} non-positive/non-integer ${v} :: ${st.prompt}`);
    if (v !== m.r || num(st.answer) !== v) fail(`chain ${id} #${ix + 1} answer mismatch ${st.answer} vs ${v}`);
    if (m.disp && Function('"use strict";return (' + m.disp + ")")() !== v) fail(`chain ${id} #${ix + 1} disp mismatch :: ${st.prompt}`);
    if (!st.image.includes("Part " + (ix + 1) + " of 5")) fail("chain banner " + id);
    if (/NaN|undefined|Infinity/.test(st.prompt)) fail("chain bad prompt " + st.prompt);
    try { const ws = H.workSteps(m.disp || m.expr); if (ws[ws.length - 1].v !== v) fail(`chain help mismatch ${id} #${ix + 1}`); } catch (e) { fail("chain help threw " + e.message); }
  });
}
// every one-step template should hit the operation it claims (sub => minus etc.)
// ---- spelling ----
const words = S.WORDS, seen = new Set();
words.forEach(e => {
  const lw = e.w.toLowerCase();
  if (seen.has(lw)) fail("duplicate word " + e.w); seen.add(lw);
  if (!e.d || e.d.length < 5) fail("short definition " + e.w);
  if (new RegExp("\\b" + lw + "\\b", "i").test(e.d)) fail(`definition contains the word: ${e.w} :: ${e.d}`);
  const bad = S.wrongSpellings(e);
  if (bad.length < 3) fail(`only ${bad.length} wrong spellings for ${e.w}`);
  if (bad.some(b => b.toLowerCase() === lw)) fail("wrong spelling equals word " + e.w);
  if (new Set(bad.map(b => b.toLowerCase())).size !== bad.length) fail("duplicate wrong spellings " + e.w);
});
for (let i = 0; i < 2000; i++) {
  const q = S.oneQuestion([]);
  if (q.type === "mc") { if (!q.options.includes(q.answer) || new Set(q.options).size !== q.options.length || q.options.length < (q.fix === "tricky" ? 3 : 4) || q.options.length > 4) fail("bad spelling mc " + q.prompt); }
  else if (!q.answer || /undefined|NaN/.test(q.prompt)) fail("bad spelling fill " + q.prompt);
  if (q.type === "fill" && /Fill in the missing/.test(q.prompt)) { const shown = (q.prompt.match(/<b>([^<]+)<\/b>/) || [])[1].replace(/ /g, ""); const re = new RegExp("^" + shown.replace(/_/g, ".") + "$", "i"); if (!re.test(q.answer)) fail(`missing-letter mask mismatch ${shown} vs ${q.answer}`); }
  if (q.type === "fill" && /Unscramble/.test(q.prompt)) { const sc = (q.prompt.match(/<b>([^<]+)<\/b>/) || [])[1].replace(/ /g, ""); if ([...sc].sort().join("") !== [...q.answer.toLowerCase()].sort().join("")) fail("scramble letters mismatch " + q.answer); }
  const qm = S.quickMc(); if (qm.prompt.length > 150 || /[<>]/.test(qm.prompt) || qm.options.length < 3 || qm.options.length > 4 || !qm.options.includes(qm.correctLabel) || new Set(qm.options).size !== qm.options.length) fail("quickMc shape " + qm.prompt);
}
// ---- worksheet words (spelling-fix.js): 500+ distinct questions in mc / typed / match ----
const descs = FX.all(), kinds = {}, uniq = new Set();
if (descs.length < 500) fail("spell-fix only " + descs.length + " questions");
FX.words().forEach(w => { if (!S.WORDS.some(e => e.w.toLowerCase() === w.toLowerCase())) fail("spell-fix word missing from WORDS: " + w); });
descs.forEach(d => {
  const q = FX.build(d); if (!q) { fail("spell-fix build null " + JSON.stringify(d)); return; }
  kinds[d.k] = (kinds[d.k] || 0) + 1;
  const plainP = String(q.prompt).replace(/<[^>]*>/g, "");
  if (/undefined|NaN|\[object/.test(plainP)) fail("spell-fix bad prompt " + plainP);
  if (q.type === "mc") {
    if (!q.options.includes(q.answer)) fail("spell-fix answer not in options " + plainP);
    if (new Set(q.options.map(o => o.toLowerCase())).size !== q.options.length) fail("spell-fix duplicate options " + plainP);
    if (q.options.length < 3 || q.options.length > 4) fail("spell-fix option count " + plainP);
  } else if (q.type === "fill") {
    if (!q.answer) fail("spell-fix fill no answer " + plainP);
    if (d.k === "fixType" && new RegExp("\\b" + q.answer + "\\b", "i").test(plainP.replace(/<[^>]*>/g, ""))) fail("spell-fix fill shows its own answer " + plainP);
  } else if (q.type === "match") {
    const L = q.pairs.map(x => x.left.toLowerCase()), R = q.pairs.map(x => x.right.toLowerCase());
    if (q.pairs.length !== 4 || new Set(L).size !== 4 || new Set(R).size !== 4) fail("spell-fix match pairs not unique");
    q.pairs.forEach(x => { if (x.left.toLowerCase() === x.right.toLowerCase()) fail("spell-fix match left==right " + x.left); });
  } else fail("spell-fix unknown type " + q.type);
  if (d.k !== "match") uniq.add(plainP + "|" + (q.answer || ""));
});
FX.words().forEach(w => {
  for (let t = 0; t < 40; t++) { const q = FX.quick(w); if (!q || q.prompt.length > 150 || /[<>]/.test(q.prompt) || !q.options.includes(q.correctLabel) || new Set(q.options).size !== q.options.length) fail("spell-fix quick shape " + w + " :: " + (q && q.prompt)); }
  for (let t = 0; t < 20; t++) { const q = FX.forWord(w, false); if (!q || !q.spellWord) fail("spell-fix forWord " + w); }
});
for (let t = 0; t < 300; t++) { const sess = S.buildSession(10); if (sess.length !== 10 || sess.some(q => !q || !q.prompt)) fail("buildSession bad"); }
let matchSeen = 0; for (let t = 0; t < 300; t++) if (S.buildSession(10).some(q => q.type === "match")) matchSeen++;
if (matchSeen < 40) fail("match questions rarely appear in sessions: " + matchSeen + "/300");
console.log(JSON.stringify({ spellFixQuestions: descs.length, spellFixKinds: kinds, spellFixDistinct: uniq.size, matchSessions: matchSeen, storyOne: n1, storyTwo: n2, storyOp: nop, chainStories: nchain, uniqueStoryPrompts: prompts.size, words: words.length, failures: fails.length }));
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
console.log("ALL OK");
