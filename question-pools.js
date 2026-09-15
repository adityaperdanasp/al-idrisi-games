/* =================================================================
   AIGQuestionPools — shared cross-subject question mixer for the PM
   Round 3/4 mini-games (math-tennis, number-line-jump, treasure-dig,
   fortress-math, escape-room, quiz-show, monster-battle, city-builder,
   boss-rush, dance-battle, cooking-rush, parkour-run, space-race,
   treasure-map). Per explicit user request, these games' questions
   should be a MIX of Math / Language & Arts / Science rather than
   pure math -- MathVille's Drive Mode ("mobil dikejar dino") is the
   one deliberate exception that stays pure math, and untouched here.

   This is a NEW shared module (unlike the rest of this codebase's
   convention of porting logic manually per-game to avoid drift) --
   worth sharing here because 14 games need the IDENTICAL fetch/pool
   logic, and MathVille's own ensurePlaneQuestionPools()/rollPlaneQuestion()
   (mathville/script.js) is left untouched, so nothing about Plane Mode
   or Ninja Runner changes.

   Usage from a game's script.js (one level under the repo root, same
   depth as mathville/azkacraft/azkauniverse):
     <script src="../question-pools.js"></script>
     ...
     const q = AIGQuestionPools.rollMixed(() => rollMathQuestion(difficulty));
     // q = { subject: "math"|"lang"|"sci", key, prompt, options, correctLabel }
   ================================================================= */

(function () {
  let languagePool = null;
  let sciencePool = null;
  let pending = null;

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  async function ensurePools() {
    if (languagePool && sciencePool) return;
    if (pending) return pending;
    pending = (async () => {
      try {
        const [lang, solar] = await Promise.all([
          fetch("../azkacraft/questions.json").then(r => r.json()),
          fetch("../azkauniverse/questions.json").then(r => r.json())
        ]);
        const langPool = [];
        (lang.chapters || []).forEach(ch => {
          // Reading Comprehension (6) and Creative Writing (7) both assume
          // a "passage" was just read ("According to the text...") that's
          // never shown here -- excluded by chapter id, same fix already
          // applied to Focus Round / Plane Mode's pools for the same reason.
          if (ch.id === 6 || ch.id === 7) return;
          (ch.questions || []).forEach(q => {
            // Some Antonyms-chapter entries (and one Capitalization one)
            // only have 3 options instead of the usual 4 -- fine in
            // azkacraft's own UI (which sizes its grid to whatever it gets),
            // but every one of these 15 games renders a fixed 2x2 grid, so
            // a 3-option pick leaves a visibly broken empty cell. Filtered
            // out here rather than patched per-game.
            if (q.type === "mc" && q.options && q.options.length === 4) {
              langPool.push({ prompt: q.prompt, options: q.options, correctLabel: q.answer });
            }
          });
        });
        const solarPool = [];
        (solar.levels || []).forEach(lvl => (lvl.questions || []).forEach(q => {
          if (q.type === "mc" && !q.image && q.options && q.options.length === 4) {
            solarPool.push({ prompt: q.question, options: q.options, correctLabel: q.options[q.answer] });
          }
        }));
        languagePool = langPool;
        sciencePool = solarPool;
      } catch (e) {
        // Offline, or the other game's questions.json changed shape --
        // fall back to empty pools (callers fall back to math) rather
        // than ever blocking a round on this fetch.
        languagePool = languagePool || [];
        sciencePool = sciencePool || [];
      }
    })();
    return pending;
  }

  function pickFrom(pool) {
    if (!pool || !pool.length) return null;
    const q = pool[rand(0, pool.length - 1)];
    return { prompt: q.prompt, options: shuffle([...q.options]), correctLabel: q.correctLabel };
  }

  function pickLanguage() { return pickFrom(languagePool); }
  function pickScience() { return pickFrom(sciencePool); }

  // Same as pickFrom, but only from entries short enough to fit a small
  // fixed-size tile (Memory Match's cards) -- most Language/Science MC
  // prompts are a full sentence, too long for that layout. Retries a
  // handful of times before giving up (small pools may have few/no short
  // entries at all, which is fine -- the caller falls back to math).
  function pickShortFrom(pool, maxPromptLen, maxAnswerLen) {
    if (!pool || !pool.length) return null;
    for (let i = 0; i < 8; i++) {
      const q = pool[rand(0, pool.length - 1)];
      if (q.prompt.length <= maxPromptLen && String(q.correctLabel).length <= maxAnswerLen) {
        return { prompt: q.prompt, correctLabel: q.correctLabel };
      }
    }
    return null;
  }

  function pickShortLanguage(maxPromptLen, maxAnswerLen) { return pickShortFrom(languagePool, maxPromptLen, maxAnswerLen); }
  function pickShortScience(maxPromptLen, maxAnswerLen) { return pickShortFrom(sciencePool, maxPromptLen, maxAnswerLen); }

  // Rolls a mixed-subject MC question: 50% math (via the caller's own
  // difficulty-aware generator -- every game already has one tuned to
  // its own pacing, so this doesn't reimplement math generation), 25%
  // Language & Arts, 25% Science. Falls back to math whenever a
  // non-math pool isn't ready yet or came back empty, so a slow/offline
  // fetch never blocks a round.
  function rollMixed(mathQuestionFn) {
    const r = Math.random();
    if (r < 0.5) return { subject: "math", ...mathQuestionFn() };
    if (r < 0.75) {
      const q = pickLanguage();
      return q ? { subject: "lang", key: "language", ...q } : { subject: "math", ...mathQuestionFn() };
    }
    const q = pickScience();
    return q ? { subject: "sci", key: "science", ...q } : { subject: "math", ...mathQuestionFn() };
  }

  window.AIGQuestionPools = { ensurePools, pickLanguage, pickScience, pickShortLanguage, pickShortScience, rollMixed };
})();
