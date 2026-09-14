#!/usr/bin/env node
// QA check for mathville/questions.js -- run this after generating or
// hand-editing any question bank, BEFORE committing. Consolidates the
// checks that were done ad hoc (and manually, via one-off scripts) every
// time a batch of MathVille questions got added this project's history:
//
//   1. Duplicate prompts within a chapter.
//   2. "A <vowel-word>" instead of "An <vowel-word>" (the round-2
//      mixed-operation generator bug, e.g. "A office"/"A aquarium").
//   3. Naive "s" pluralization of an irregular noun ("fishs" instead of
//      "fish").
//   4. Answers that would fail gradeTypein() -- exact match AND the
//      natural no-comma-typed version a kid on a numeric keypad would
//      actually type (the extractNumbers() comma-split bug: "7,398"
//      typed as "7398" gets marked wrong).
//   5. Comma-formatted SINGLE-value answers specifically (the most
//      common trigger for #4, e.g. "32,000 g").
//
// Deliberately EXCLUDES "rounding" from the gradeTypein checks -- those
// answers are parsed by parseEmbeddedMC() into a multiple-choice step at
// render time, never passed through gradeTypein/extractNumbers at all,
// so a comma in "c. 25,000" is correct and expected, not a bug.
//
// Usage: node scripts/qa-mathville-questions.js
// Exit code 0 = clean, 1 = issues found (prints a report either way).

const fs = require("fs");
const path = require("path");

const QUESTIONS_PATH = path.join(__dirname, "..", "mathville", "questions.js");

// Mirrors mathville/script.js's extractNumbers() EXACTLY -- keep these
// two in sync. A comma-grouped thousands run ("7,398") is matched as ONE
// token; a genuine multi-value list ("17, 19, 23") still splits into
// separate numbers since ", " (comma+space) never matches `,\d{3}`
// (which requires a digit immediately after the comma, no space).
function extractNumbers(s) {
  const matches = String(s).match(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g) || [];
  return matches.map(n => Number(n.replace(/,/g, "")));
}
function normalizeText(s) { return String(s).toLowerCase().replace(/[×X]/g, "x").replace(/[^\w.,\s-]/g, "").replace(/\s+/g, " ").trim(); }
function gradeTypein(userInput, correctAnswer) {
  if (!userInput) return false;
  const correctCore = String(correctAnswer).split(" (")[0].trim();
  const userNums = extractNumbers(userInput);
  const correctNums = extractNumbers(correctCore);
  if (correctNums.length > 1) {
    if (userNums.length !== correctNums.length) return false;
    const a = [...userNums].sort((x, y) => x - y), b = [...correctNums].sort((x, y) => x - y);
    return a.every((v, i) => v === b[i]);
  }
  if (correctNums.length === 1) return userNums.length === 1 && userNums[0] === correctNums[0];
  return normalizeText(userInput) === normalizeText(correctCore);
}

function loadBank() {
  const src = fs.readFileSync(QUESTIONS_PATH, "utf8");
  const window = {};
  eval(src); // same sandboxed-eval technique used throughout this repo's own content-generation scripts
  return window.MATHVILLE_BANK;
}

// Chapters whose answers are ever graded via gradeTypein (typein UI
// steps). "rounding" is excluded -- see file header. "gcf-lcm" mixes
// typein word-problems with match-type pairs (not gradeTypein-checked),
// but running the check against ALL its entries is harmless: match
// entries just always pass trivially since their "answer" is a single
// short value anyway.
const TYPEIN_CHAPTERS = ["prime-numbers", "gcf-lcm", "mixed-operation", "multiplication", "division", "measurement", "addition-subtraction", "word-problems"];

function run() {
  const bank = loadBank();
  const issues = [];
  let totalChecked = 0;

  bank.chapters.forEach(ch => {
    const arr = ch.questions || ch.staticQuestions;
    if (!arr) return;

    const seen = new Set();
    arr.forEach((q, i) => {
      if (seen.has(q.prompt)) issues.push({ chapter: ch.id, kind: "duplicate", detail: q.prompt });
      seen.add(q.prompt);

      // Only flags "A <vowel-word>" at the START of a sentence (sentence
      // boundary = string start or after ". "/"! "/"? "). A bare mid-
      // sentence "A" is usually a LABEL, not the indefinite article --
      // e.g. "Truck A every 4 days" or "Driver A every 9 days" -- and
      // must not be flagged.
      if (/(?:^|[.!?]\s)A [aeiouAEIOU]/.test(q.prompt)) issues.push({ chapter: ch.id, kind: "article (A/An)", detail: q.prompt });
      if (/\bfishs\b/i.test(q.prompt)) issues.push({ chapter: ch.id, kind: "irregular plural", detail: q.prompt });

      if (TYPEIN_CHAPTERS.includes(ch.id) && q.answer) {
        totalChecked++;
        const core = String(q.answer).split(" (")[0].trim();
        if (!gradeTypein(core, q.answer)) {
          issues.push({ chapter: ch.id, kind: "gradeTypein exact-fail", detail: `${q.prompt} -> "${q.answer}"` });
        }
        const noComma = core.replace(/,/g, "");
        if (noComma !== core && !gradeTypein(noComma, q.answer)) {
          issues.push({ chapter: ch.id, kind: "comma-split risk (natural typing fails)", detail: `${q.prompt} -> "${q.answer}"` });
        }
      }
    });
  });

  console.log(`Checked ${totalChecked} typein-graded answers across ${bank.chapters.length} chapters.`);
  if (!issues.length) {
    console.log("✅ No issues found.");
    return 0;
  }

  console.log(`\n❌ ${issues.length} issue(s) found:\n`);
  const byKind = {};
  issues.forEach(i => { (byKind[i.kind] = byKind[i.kind] || []).push(i); });
  Object.entries(byKind).forEach(([kind, list]) => {
    console.log(`-- ${kind} (${list.length}) --`);
    list.slice(0, 15).forEach(i => console.log(`  [${i.chapter}] ${i.detail}`));
    if (list.length > 15) console.log(`  ... and ${list.length - 15} more`);
    console.log("");
  });
  return 1;
}

process.exit(run());
