/* =================================================================
   WEEKLY FOCUS -- temporary extra practice content, added 2026-09-22
   after Azka's parent shared photos of 2 real school worksheets
   showing him weak in: (1) multi-step multiplication/division word
   problems, and (2) long division with a 2-digit divisor, including
   the "0 in the middle of the quotient" technique his teacher's own
   handwritten note flagged. Lives in its own file (not questions.js/
   generators.js) specifically so it is trivial to delete once the
   week is over -- nothing else depends on this file existing, every
   read of window.WEEKLY_FOCUS_POOL/isWeeklyFocusActive in script.js
   is guarded with a typeof/existence check.

   Only wired into Plane Mode (mathville/script.js rollPlaneQuestion()),
   solo only -- 2P deliberately keeps its faster/lighter question mix
   (see the comment above rollPlaneQuestion() for why), and Math Race
   gets a SEPARATE, much smaller change directly in multipleazka/
   script.js (temporarily biasing its existing fact generator toward
   division + bigger numbers) since its 10-second-per-question format
   cannot fit a written word problem or a 5-digit/2-digit long
   division at all.
   ================================================================= */

// Active through the end of 2026-09-29 (7 days from launch) in the
// Jakarta timezone (Azka's actual timezone) -- after that,
// isWeeklyFocusActive() simply starts returning false and
// rollPlaneQuestion() quietly stops pulling from this pool, no code
// needs to be touched/reverted.
const WEEKLY_FOCUS_END = new Date("2026-09-29T23:59:59+07:00").getTime();
function isWeeklyFocusActive() {
  return Date.now() < WEEKLY_FOCUS_END;
}

// -- Multi-step multiplication/division word problems (new content,
// same archetype as the K5-style worksheet: chained operations,
// factory/workshop/warehouse contexts) --
const WEEKLY_FOCUS_WORD_PROBLEMS = [
  { prompt: "A textile mill has 6 production floors. Each floor works the same way. There are 3 quality inspectors and 14 sewers working in each floor. How many sewers are there in total?", answer: "84" },
  { prompt: "A print shop has 9 press stations. Each station runs identically. There are 2 shift leads and 8 printers working in each station. How many printers are there in total?", answer: "72" },
  { prompt: "A bottling plant has 7 filling lines. Each line runs the same way. There are 2 line managers and 16 bottlers working in each line. How many bottlers are there in total?", answer: "112" },
  { prompt: "A furniture workshop has 5 carving benches. Each bench works the same way. There are 2 trainers and 11 carvers working in each bench. How many carvers are there in total?", answer: "55" },
  { prompt: "A bakery chain has 8 kitchens, each working at the same speed. If they make 3,624 loaves in one day, how many loaves does each kitchen make that day?", answer: "453" },
  { prompt: "A toy workshop has 5 assembly benches, each working at the same speed. If they make 2,865 toy cars in one day, how many toy cars does each bench make that day?", answer: "573" },
  { prompt: "A juice factory has 9 bottling lines, each working at the same speed. If they make 6,858 cartons in one day, how many cartons does each line make that day?", answer: "762" },
  { prompt: "A shoe factory has 6 stitching rooms, each working at the same speed. If they make 4,692 pairs of shoes in one day, how many pairs of shoes does each room make that day?", answer: "782" },
  { prompt: "A bottling plant has 7 filling lines, each working at the same speed. If all 7 operate 14 hours a day and together they make 49 bottles a day, how many hours does it take for ONE line to produce ONE bottle?", answer: "2" },
  { prompt: "A textile mill has 6 production floors, each working at the same speed. If all 6 operate 18 hours a day and together they make 36 shirts a day, how many hours does it take for ONE line to produce ONE shirt?", answer: "3" },
  { prompt: "A print shop has 8 press stations, each working at the same speed. If all 8 operate 18 hours a day and together they make 48 posters a day, how many hours does it take for ONE line to produce ONE poster?", answer: "3" },
  { prompt: "A warehouse pays each forklift operator $22 per hour. If a forklift operator works 8 hours in a day, how much do they get paid that day?", answer: "176" },
  { prompt: "A warehouse pays each packing supervisor $28 per hour. If a packing supervisor works 9 hours in a day, how much do they get paid that day?", answer: "252" },
  { prompt: "A warehouse pays each night-shift guard $19 per hour. If a night-shift guard works 10 hours in a day, how much do they get paid that day?", answer: "190" },
  { prompt: "A catering company is staffing a big event. There are 24 servers, each paid $65 per day. What is the total daily pay for all of them?", answer: "1,560" },
  { prompt: "A construction site is finishing a building. There are 36 workers, each paid $85 per day. What is the total daily pay for all of them?", answer: "3,060" },
  { prompt: "A farm co-op is bringing in the harvest. There are 45 pickers, each paid $55 per day. What is the total daily pay for all of them?", answer: "2,475" },
  { prompt: "A library is organizing a book sale. There are 14 boxes, each with 32 items, plus 25 extra loose books. How many items are there in total?", answer: "473" },
  { prompt: "A school is setting up a science fair. There are 18 tables, each with 15 items, plus 40 extra kits. How many items are there in total?", answer: "310" },
  { prompt: "A ceramics workshop packs its mugs for delivery. 3,696 mugs are split evenly into 24 crates. If shipping costs $3 per item, how much does it cost to ship the mugs in just ONE crate?", answer: "462" },
  { prompt: "An electronics store restocks its warehouse. 2,907 tablets are split evenly into 17 crates. If shipping costs $4 per item, how much does it cost to ship the tablets in just ONE crate?", answer: "684" },
];

// -- Long division, 2-digit divisor, quotient-only / remainder-only
// (kept as 2 separate clean-single-number questions -- Plane Mode's
// MC builder can't present a combined "quotient AND remainder"
// answer, see isCleanQuickAnswer()'s own comment in script.js).
// Half of these are deliberately constructed so the quotient has a
// 0 digit that ISN'T the leading digit -- exactly the "0 in the
// middle" case the teacher's note called out.
const WEEKLY_FOCUS_DIVISION_QUESTIONS = [
  { prompt: "40,263 ÷ 13 = ? (just the quotient)", answer: "3,097" },
  { prompt: "91,804 ÷ 34 = ? (just the quotient)", answer: "2,700" },
  { prompt: "82,736 ÷ 33 = ? (just the quotient)", answer: "2,507" },
  { prompt: "66,843 ÷ 22 = ? (just the quotient)", answer: "3,038" },
  { prompt: "35,694 ÷ 17 = ? (just the quotient)", answer: "2,099" },
  { prompt: "29,221 ÷ 14 = ? (just the quotient)", answer: "2,087" },
  { prompt: "33,285 ÷ 13 = ? (just the quotient)", answer: "2,560" },
  { prompt: "46,064 ÷ 20 = ? (just the quotient)", answer: "2,303" },
  { prompt: "51,984 ÷ 17 = ? (just the quotient)", answer: "3,057" },
  { prompt: "35,087 ÷ 21 = ? (just the quotient)", answer: "1,670" },
  { prompt: "86,010 ÷ 22 = ? (just the quotient)", answer: "3,909" },
  { prompt: "60,782 ÷ 29 = ? (just the quotient)", answer: "2,095" },
  { prompt: "39,346 ÷ 19 = ? (just the quotient)", answer: "2,070" },
  { prompt: "65,751 ÷ 16 = ? (just the quotient)", answer: "4,109" },
  { prompt: "47,539 ÷ 12 = ? (just the quotient)", answer: "3,961" },
  { prompt: "7,167 ÷ 19 = ? (just the quotient)", answer: "377" },
  { prompt: "85,048 ÷ 27 = ? (just the quotient)", answer: "3,149" },
  { prompt: "30,819 ÷ 19 = ? (just the quotient)", answer: "1,622" },
  { prompt: "42,906 ÷ 28 = ? (just the quotient)", answer: "1,532" },
  { prompt: "10,499 ÷ 22 = ? (just the quotient)", answer: "477" },
  { prompt: "48,331 ÷ 26 = ? (just the quotient)", answer: "1,858" },
  { prompt: "69,694 ÷ 18 = ? (just the quotient)", answer: "3,871" },
  { prompt: "27,519 ÷ 30 = ? (just the quotient)", answer: "917" },
  { prompt: "21,812 ÷ 12 = ? (just the quotient)", answer: "1,817" },
  { prompt: "66,092 ÷ 21 = ? (just the quotient)", answer: "3,147" },
  { prompt: "62,884 ÷ 32 = ? (just the quotient)", answer: "1,965" },
  { prompt: "46,667 ÷ 16 = ? (just the quotient)", answer: "2,916" },
  { prompt: "59,076 ÷ 20 = ? (just the quotient)", answer: "2,953" },
  { prompt: "40,263 ÷ 13 = ? (just the remainder)", answer: "2" },
  { prompt: "91,804 ÷ 34 = ? (just the remainder)", answer: "4" },
  { prompt: "82,736 ÷ 33 = ? (just the remainder)", answer: "5" },
  { prompt: "66,843 ÷ 22 = ? (just the remainder)", answer: "7" },
  { prompt: "35,694 ÷ 17 = ? (just the remainder)", answer: "11" },
  { prompt: "29,221 ÷ 14 = ? (just the remainder)", answer: "3" },
  { prompt: "33,285 ÷ 13 = ? (just the remainder)", answer: "5" },
  { prompt: "47,539 ÷ 12 = ? (just the remainder)", answer: "7" },
  { prompt: "7,167 ÷ 19 = ? (just the remainder)", answer: "4" },
  { prompt: "85,048 ÷ 27 = ? (just the remainder)", answer: "25" },
  { prompt: "30,819 ÷ 19 = ? (just the remainder)", answer: "1" },
  { prompt: "42,906 ÷ 28 = ? (just the remainder)", answer: "10" },
  { prompt: "10,499 ÷ 22 = ? (just the remainder)", answer: "5" },
  { prompt: "48,331 ÷ 26 = ? (just the remainder)", answer: "23" },
];

const WEEKLY_FOCUS_POOL = [...WEEKLY_FOCUS_WORD_PROBLEMS, ...WEEKLY_FOCUS_DIVISION_QUESTIONS];

window.WEEKLY_FOCUS_POOL = WEEKLY_FOCUS_POOL;
window.isWeeklyFocusActive = isWeeklyFocusActive;

