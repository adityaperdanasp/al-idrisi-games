/* =================================================================
   MathQuest — question GENERATORS for the 6 "pure computation"
   chapters (place value, addition/subtraction, multiplication,
   division, measurement, rounding). These never run out of questions
   and never repeat exactly the same numbers twice in a row — same
   philosophy as Math Race's nextQuestion(), just parametrized per
   chapter instead of one fixed kali-bagi shape.

   The 3 "concept" chapters (prime numbers, GCF & LCM, mixed operation
   word problems) stay a hand-written static bank in questions.js —
   word problems don't generate believably at random, so those are
   authored instead.
   ================================================================= */
(function () {
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function choice(arr) { return arr[rand(0, arr.length - 1)]; }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function randDigits(digits) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return rand(min, max);
  }

  /* ---- Place Value ---- */
  function genPlaceValue() {
    let digit, num, idx, digitsCount, power;
    do {
      digitsCount = rand(4, 7);
      num = randDigits(digitsCount);
      const digitsArr = String(num).split("").map(Number);
      idx = rand(0, digitsArr.length - 1);
      digit = digitsArr[idx];
      power = digitsArr.length - 1 - idx;
    } while (digit === 0);
    const value = digit * Math.pow(10, power);
    return { prompt: `What is the value of the digit ${digit} in ${fmt(num)}?`, answer: fmt(value) };
  }

  /* ---- Addition & Subtraction ---- */
  function genAddition() {
    const digits = choice([5, 6]);
    const addendCount = choice([2, 3]);
    const nums = Array.from({ length: addendCount }, () => randDigits(digits));
    const sum = nums.reduce((a, b) => a + b, 0);
    return { prompt: nums.map(fmt).join(" + ") + " = ?", answer: fmt(sum) };
  }

  function genSubtraction() {
    const digits = choice([5, 6]);
    let a = randDigits(digits), b = randDigits(digits);
    if (b > a) [a, b] = [b, a];
    return { prompt: `${fmt(a)} - ${fmt(b)} = ?`, answer: fmt(a - b) };
  }

  /* ---- Multiplication ---- */
  function genMultiplication() {
    const variant = choice(["1x3", "1x4", "2x4"]);
    let a, b;
    if (variant === "1x3") { a = rand(100, 999); b = rand(2, 9); }
    else if (variant === "1x4") { a = rand(1000, 9999); b = rand(2, 9); }
    else { a = rand(1000, 9999); b = rand(10, 99); }
    return { prompt: `${fmt(a)} × ${b} = ?`, answer: fmt(a * b) };
  }

  /* ---- Division ---- */
  function genDivision() {
    const variant = choice(["fact", "whole", "long-exact", "long-remainder"]);
    if (variant === "fact") {
      const divisor = rand(1, 12), quotient = rand(1, 12);
      return { prompt: `${divisor * quotient} ÷ ${divisor} = ?`, answer: fmt(quotient) };
    }
    if (variant === "whole") {
      const divisor = rand(2, 9);
      const quotient = rand(1, 90) * 10;   // keeps the dividend a round tens/hundreds number
      return { prompt: `${fmt(divisor * quotient)} ÷ ${divisor} = ?`, answer: fmt(quotient) };
    }
    if (variant === "long-exact") {
      const divisor = rand(2, 9), quotient = rand(100, 999);
      return { prompt: `${fmt(divisor * quotient)} ÷ ${divisor} = ?`, answer: fmt(quotient) };
    }
    // long-remainder
    const divisor = rand(2, 9), quotient = rand(1000, 9999), remainder = rand(1, divisor - 1);
    return {
      prompt: `${fmt(divisor * quotient + remainder)} ÷ ${divisor} = ? (give quotient and remainder)`,
      answer: `${fmt(quotient)} remainder ${remainder}`
    };
  }

  /* ---- Measurement (length & weight) ---- */
  const LENGTH_CONVERSIONS = [
    { from: "m", to: "cm", factor: 100 },
    { from: "cm", to: "mm", factor: 10 },
    { from: "cm", to: "m", factor: 1 / 100 },
    { from: "mm", to: "cm", factor: 1 / 10 },
    { from: "mm", to: "m", factor: 1 / 1000 }
  ];
  const WEIGHT_CONVERSIONS = [
    { from: "kg", to: "g", factor: 1000 },
    { from: "g", to: "kg", factor: 1 / 1000 }
  ];

  function genMeasurement() {
    const kind = choice(["length", "weight", "compare"]);
    if (kind === "length") {
      const c = choice(LENGTH_CONVERSIONS);
      // Pick a whole-number source amount that also converts to a whole number.
      const amount = c.factor >= 1 ? rand(1, 99) : rand(1, 99) * (1 / c.factor);
      const result = amount * c.factor;
      return { prompt: `Convert: ${fmt(amount)} ${c.from} = ? ${c.to}`, answer: `${fmt(result)} ${c.to}` };
    }
    if (kind === "weight") {
      const c = choice(WEIGHT_CONVERSIONS);
      const amount = c.factor >= 1 ? rand(1, 99) : rand(1, 99) * 1000;
      const result = amount * c.factor;
      return { prompt: `Convert: ${fmt(amount)} ${c.from} = ? ${c.to}`, answer: `${fmt(result)} ${c.to}` };
    }
    // compare — kg vs g
    const kg = rand(1, 99);
    const gVariants = [kg * 1000, kg * 1000 + rand(1, 900), kg * 1000 - rand(1, 900)];
    const g = choice(gVariants);
    const symbol = g === kg * 1000 ? "=" : g > kg * 1000 ? "<" : ">"; // kg ___ g, so compare kg*1000 to g
    return { prompt: `Compare using <, >, or =: ${fmt(kg)} kg ___ ${fmt(g)} g`, answer: symbol };
  }

  /* ---- Rounding ---- */
  const ROUND_PLACES = [
    { label: "ten", factor: 10, max: 999 },
    { label: "hundred", factor: 100, max: 9999 },
    { label: "thousand", factor: 1000, max: 9999 },
    { label: "ten thousand", factor: 10000, max: 999999 }
  ];

  function genRounding() {
    const p = choice(ROUND_PLACES);
    const num = rand(p.factor, p.max);
    const rounded = Math.round(num / p.factor) * p.factor;
    return { prompt: `Round ${fmt(num)} to the nearest ${p.label}.`, answer: fmt(rounded) };
  }

  window.MATHVILLE_GENERATORS = {
    "place-value": genPlaceValue,
    "addition-subtraction-add": genAddition,
    "addition-subtraction-sub": genSubtraction,
    multiplication: genMultiplication,
    division: genDivision,
    measurement: genMeasurement,
    rounding: genRounding
  };
})();
