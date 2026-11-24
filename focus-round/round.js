/* Focus Round question builder: 20 questions in three themes, interleaved
   (story problem -> spelling -> fix-the-spelling ...): 7 math story problems, 7 general spelling, 6 worksheet "tricky word" questions.
   Pure logic (no DOM) so scripts/qa-azka-focus.js can test it. Needs, at call time: MATHVILLE_T2 (mathville/generators.js),
   AIGSpelling (azkacraft/spelling.js) and AIGSpellFix (azkacraft/spelling-fix.js). */
(function (root) {
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmt = n => Number(n).toLocaleString("en-US");
  const THEMES = { story: { em: "🧮", name: "Story Problem" }, spell: { em: "🔤", name: "Spelling" }, fix: { em: "✏️", name: "Fix the Spelling" } };
  const ORDER = ["story", "spell", "fix"];
  const TIERS = ["easy", "easy", "medium", "medium", "medium", "medium", "hard"]; // 7 story problems, gently ramping up

  function storyMc(n) {
    const pool = shuffle([n + 1, n - 1, n + 10, n - 10, n + 2, n - 2, n + 100, n - 100, n * 2, Math.round(n / 2)].filter(x => x >= 0 && x !== n && Number.isInteger(x)));
    const opts = shuffle([n, ...[...new Set(pool)].slice(0, 3)]).map(fmt);
    return opts;
  }
  function story(k) {
    const g = root.MATHVILLE_T2._gen.genStory(TIERS[Math.min(k, TIERS.length - 1)]);
    const n = Number(String(g.answer).replace(/,/g, ""));
    const asMc = k % 3 === 1; // roughly every third story problem is multiple choice, the rest are typed
    const base = { theme: "story", prompt: g.prompt, answer: g.answer, meta: g.meta, plain: true };
    return asMc ? Object.assign(base, { type: "mc", options: storyMc(n) }) : Object.assign(base, { type: "fill" });
  }
  function spell(used) {
    const SP = root.AIGSpelling, FX = root.AIGSpellFix;
    let q = null;
    for (let t = 0; t < 14; t++) { q = SP.oneQuestion(used); if (!FX || !FX.has(q.spellWord)) break; } // general spelling here; worksheet words get their own theme
    used.push(q.spellWord);
    return Object.assign({ theme: "spell" }, q);
  }
  function fixPicker() {
    const FX = root.AIGSpellFix, SP = root.AIGSpelling;
    const stageOf = w => { try { return SP.stage(w); } catch (e) { return 0; } };
    const words = FX.words().map(w => ({ w, k: stageOf(w) + Math.random() * 1.6 })).sort((a, b) => a.k - b.k).map(x => x.w); // not-yet-mastered words first
    const out = [], matchAt = rand(1, 4); let i = 0;
    return () => { if (out.length === matchAt) { out.push(1); return Object.assign({ theme: "fix" }, FX.matchRandom()); } out.push(1); return Object.assign({ theme: "fix" }, FX.forWord(words[i++], false)); };
  }
  function build() {
    const used = [], nextFix = fixPicker(), qs = []; let ks = 0;
    for (let i = 0; i < 20; i++) {
      const th = ORDER[i % 3];
      qs.push(th === "story" ? story(ks++) : th === "spell" ? spell(used) : nextFix());
    }
    return qs;
  }
  const api = { THEMES, build };
  root.AIGFocusRound = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
