/* =================================================================
   Term 2 Math (Grade 4) -- question generators (this file is loaded as mathville/generators.js by every game page) for the 10 chapters of
   the Green Montessori "2026-2027 S1-T2 UE4 WB Math" workbook:

     1 Basic Math Operations   6 Perimeter
     2 Pictograph              7 Area
     3 Bar Graph               8 Square Numbers
     4 Line Graph              9 Factors & Prime Numbers
     5 Measuring Angles       10 Multiples, LCM & GCF

   Replaces the Term 1 chapters. The workbook has no answer key, so every
   answer here is COMPUTED from the same numbers that are drawn
   (scripts/qa-term2-math.js re-derives them independently).

   Two public surfaces:
     MATHVILLE_T2.makeStep(chapterId, difficulty)  -> a full MathVille step
        { uiType: "typein"|"tap", prompt, answer | options+correctLabel,
          image?: inline-SVG html }          (used by buildRound)
     MATHVILLE_T2.quick[key](difficulty)           -> { prompt, answer }
        text-only, numeric answer -- the shape every mini-game's
        buildMc() expects (used via MATHVILLE_GENERATORS in generators.js)

   difficulty: "easy" (mental maths) | "medium" | "hard" (workbook level,
   the default for chapter rounds).
   ================================================================= */
(function (root) {
  "use strict";
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const choice = arr => arr[rand(0, arr.length - 1)];
  const shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rand(0, i); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pickN = (arr, n) => shuffle(arr).slice(0, n);
  const fmt = n => Number(n).toLocaleString("en-US");
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const factorsOf = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
  const primeFactors = n => { const r = []; let x = n; for (let p = 2; p * p <= x; p++) while (x % p === 0) { r.push(p); x /= p; } if (x > 1) r.push(x); return r; };
  const tier = d => (d === "easy" || d === "medium" ? d : "hard");
  const byTier = (d, e, m, h) => { d = tier(d); return d === "easy" ? e : d === "medium" ? m : h; };
  const weighted = list => { const total = list.reduce((s, x) => s + x[1], 0); let r = Math.random() * total; for (const [v, w] of list) { if ((r -= w) < 0) return v; } return list[0][0]; };

  /* ---------- step builders ---------- */
  const typein = (prompt, answer, image, meta) => ({ uiType: "typein", prompt, answer: String(answer), image: image || "", meta });
  const tap = (prompt, options, correct, image, meta) => ({ uiType: "tap", prompt, options: shuffle(options.map(String)), correctLabel: String(correct), image: image || "", meta });
  // 4 distinct non-negative numeric options around `correct` (always includes it).
  function numOptions(correct, extra) {
    const others = new Set();
    (extra || []).forEach(v => { if (v >= 0 && v !== correct) others.add(v); });
    let guard = 0;
    while (others.size < 3 && guard++ < 80) {
      const mag = Math.max(1, Math.round(Math.abs(correct) * (0.08 + Math.random() * 0.3)));
      const c = correct + (Math.random() < 0.5 ? -mag : mag);
      if (c >= 0 && c !== correct) others.add(c);
    }
    let b = 1; while (others.size < 3) { if (correct + b !== correct) others.add(correct + b); b++; }
    return shuffle([correct, ...[...others].slice(0, 3)]);
  }

  /* ---------- tiny SVG toolkit (cream card, dark ink -> readable in light AND dark theme) ---------- */
  const INK = "#2b2118", PAPER = "#fffdf2", GRID = "#d9cdb4", BAR = ["#e4572e", "#f7a531", "#4f9d69", "#3f7fd0", "#8e5bd0", "#c0498a"];
  let svgSeq = 0;
  function svgWrap(w, h, inner, label) {
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label || "diagram"}" style="width:100%;max-width:${w}px;height:auto;display:block;margin:0 auto"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>${inner}</svg>`;
  }
  const T = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${o.size || 12}" font-family="Arial,Helvetica,sans-serif" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || "middle"}"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${s}</text>`; };
  const L = (x1, y1, x2, y2, c, w, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c || INK}" stroke-width="${w || 2}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const R = (x, y, w, h, fill, stroke, sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || "none"}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 2}"` : ""}/>`;
  const P = (pts, fill, stroke, sw) => `<polygon points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="${fill || "none"}" stroke="${stroke || INK}" stroke-width="${sw || 2}" stroke-linejoin="round"/>`;
  const rad = d => (d * Math.PI) / 180;

  /* =================================================================
     1. BASIC MATH OPERATIONS  (6-digit +/-, long division, 2-step & x/÷ word problems)
     ================================================================= */
  function genAdd6(d) {
    const digits = byTier(d, 2, 4, 6);
    const a = rand(Math.pow(10, digits - 1), Math.pow(10, digits) - 1), b = rand(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    return { prompt: `${fmt(a)} + ${fmt(b)} = ?`, answer: fmt(a + b), meta: { op: "add", a, b } };
  }
  function genSub6(d) {
    const digits = byTier(d, 2, 4, 6);
    let a = rand(Math.pow(10, digits - 1), Math.pow(10, digits) - 1), b = rand(Math.pow(10, digits - 2), Math.pow(10, digits) - 1);
    if (b > a) { const t = a; a = b; b = t; }
    if (a === b) a += 1;
    return { prompt: `${fmt(a)} − ${fmt(b)} = ?`, answer: fmt(a - b), meta: { op: "sub", a, b } };
  }
  function genDiv1(d) {
    const divisor = byTier(d, rand(2, 5), rand(2, 9), choice([2, 5, 6, 8, 3, 4, 7, 9]));
    const quotient = byTier(d, rand(11, 99), rand(100, 999), rand(1000, 12000));
    const rem = (tier(d) === "hard" && Math.random() < 0.35) ? rand(1, divisor - 1) : 0;
    const dividend = divisor * quotient + rem;
    if (rem) return { prompt: `What is the remainder when ${fmt(dividend)} is divided by ${divisor}?`, answer: String(rem), meta: { op: "rem", dividend, divisor, rem } };
    return { prompt: `${fmt(dividend)} ÷ ${divisor} = ?`, answer: fmt(quotient), meta: { op: "div", dividend, divisor, quotient } };
  }
  function genDiv2(d) {
    const divisor = byTier(d, choice([10, 11, 12]), rand(11, 25), choice([12, 24, 36, 42, 15, 18, 21, 25, 32, 45]));
    const quotient = byTier(d, rand(3, 12), rand(20, 99), rand(100, 999));
    const rem = (tier(d) === "hard" && Math.random() < 0.3) ? rand(1, divisor - 1) : 0;
    const dividend = divisor * quotient + rem;
    if (rem) return { prompt: `${fmt(dividend)} ÷ ${divisor}: what is the remainder?`, answer: String(rem), meta: { op: "rem", dividend, divisor, rem } };
    return { prompt: `Find the quotient: ${fmt(dividend)} ÷ ${divisor}`, answer: fmt(quotient), meta: { op: "div", dividend, divisor, quotient } };
  }
  const THINGS_2STEP = [
    (T, a, b) => ({ p: `In the library there are ${fmt(T)} books. ${fmt(a)} are children's books and ${fmt(b)} are for teenagers. How many books are for adults?`, r: T - a - b }),
    (T, a, b) => ({ p: `${fmt(T)} people come to a music gig. ${fmt(a)} leave at the interval and ${fmt(b)} leave just before the final song. How many people are left after the final song?`, r: T - a - b }),
    (T, a, b) => ({ p: `A snack factory must make ${fmt(T)} bags an hour. A machine breaks down and it makes only ${fmt(a)} bags, then ${fmt(b)} bags in the next hour. How many bags is it short of ${fmt(T)}?`, r: T - a - b }),
    (T, a, b) => ({ p: `A farm shop has ${fmt(a)} eggs in one crate and ${fmt(b)} in another. On market day ${fmt(T)} are sold. How many eggs are left over?`, r: a + b - T, sum: true }),
    (T, a, b) => ({ p: `A bakery bakes ${fmt(a)} rolls in the morning and ${fmt(b)} in the afternoon. ${fmt(T)} rolls are sold. How many rolls are left?`, r: a + b - T, sum: true }),
    (T, a, b) => ({ p: `Rani saves ${fmt(a)} rupiah in January and ${fmt(b)} rupiah in February, then spends ${fmt(T)} rupiah on a book. How much does she have left?`, r: a + b - T, sum: true })
  ];
  function genTwoStep(d) {
    const dig = byTier(d, 2, 3, 4);
    const lo = Math.pow(10, dig - 1), hi = Math.pow(10, dig) - 1;
    const t = choice(THINGS_2STEP);
    let T, a, b;
    const probe = t(1, 1, 1);
    if (probe.sum) { a = rand(lo, hi); b = rand(lo, hi); T = rand(Math.min(a, b), a + b - 1); }
    else { a = rand(lo, Math.floor(hi / 3)); b = rand(lo, Math.floor(hi / 3)); T = a + b + rand(lo, Math.floor(hi / 3)); }
    const o = t(T, a, b);
    return { prompt: o.p, answer: fmt(o.r), meta: { op: "twostep", T, a, b, r: o.r } };
  }
  const MULDIV_TPL = [
    () => { const g = rand(3, 9), s = rand(4, 9); return { p: `There are ${s} chocolates in a bag. Josef has ${g} bags to sell. How many chocolates is that in total?`, r: g * s }; },
    () => { const m = rand(3, 8); return { p: `Sarah gets $${m} pocket money every day of the week for doing her chores. How much pocket money does she get in a week?`, r: m * 7 }; },
    () => { const rows = rand(4, 9), per = rand(5, 12); return { p: `A farmer plants carrots in rows of ${per}. He plants ${rows} rows. How many carrots is that in total?`, r: rows * per }; },
    () => { const w = rand(3, 9), per = rand(4, 9); return { p: `Mary downloaded the same number of apps each week. She downloaded ${w * per} apps over ${w} weeks. How many apps did she download each week?`, r: per }; },
    () => { const b = rand(3, 9), f = rand(4, 8); return { p: `Joe plants ${b} bushes in his garden. Each bush blooms ${f} flowers. How many flowers are there in total?`, r: b * f }; },
    () => { const per = rand(2, 6); return { p: `If I save $${per * 7} in one week (saving an equal amount each day), how much do I save each day?`, r: per }; },
    () => { const boxes = rand(4, 9), per = rand(6, 12); return { p: `${boxes * per} pencils are packed equally into ${boxes} boxes. How many pencils are in each box?`, r: per }; }
  ];
  function genMulDiv(d) {
    const o = choice(MULDIV_TPL)();
    return { prompt: o.p, answer: fmt(o.r), meta: { op: "muldiv", r: o.r } };
  }

  /* =================================================================
     2. PICTOGRAPH
     ================================================================= */
  const PICTO_THEMES = [
    { kind: "shop", rows: ["Shop A", "Shop B", "Shop C", "Shop D", "Shop E"], emoji: "📓", unit: "notepads", Ks: [10, 20, 50] },
    { kind: "week", rows: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"], emoji: "☕", unit: "cups of coffee", Ks: [20, 40, 80] },
    { kind: "day", rows: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], emoji: "🍎", unit: "apples", Ks: [10, 20, 40] },
    { kind: "class", rows: ["Class 4A", "Class 4B", "Class 4C", "Class 4D", "Class 4E"], emoji: "📚", unit: "books borrowed", Ks: [10, 20, 30] },
    { kind: "farm", rows: ["Farm A", "Farm B", "Farm C", "Farm D", "Farm E"], emoji: "🐄", unit: "cows", Ks: [10, 20, 50] },
    { kind: "team", rows: ["Team Red", "Team Blue", "Team Green", "Team Gold", "Team Pink"], emoji: "⚽", unit: "goals", Ks: [4, 10, 20] },
    { kind: "stall", rows: ["Stall 1", "Stall 2", "Stall 3", "Stall 4", "Stall 5"], emoji: "🥭", unit: "mangoes", Ks: [10, 20, 50] }
  ];
  function makePictoData(d) {
    const th = choice(PICTO_THEMES);
    const nRows = byTier(d, 3, 4, 5);
    const K = byTier(d, choice(th.Ks.slice(0, 2)), choice(th.Ks), choice(th.Ks.slice(1)));
    const halves = tier(d) !== "easy";
    const pool = halves ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [2, 4, 6, 8, 10];
    const hu = pickN(pool, nRows); // half-units, all distinct -> all totals distinct
    return { th, K, rows: th.rows.slice(0, nRows), hu, vals: hu.map(h => (h * K) / 2) };
  }
  function pictoSvg(D) {
    const id = "pc" + (++svgSeq);
    const rowH = 36, top = 12, labelW = 82, step = 29, n = D.rows.length;
    const H = top + n * rowH + 52, W = 340;
    let s = "";
    D.rows.forEach((r, i) => {
      const y = top + i * rowH;
      s += L(10, y + rowH, W - 10, y + rowH, GRID, 1);
      s += T(10, y + 24, r, { size: 12, bold: true, anchor: "start" });
      const full = Math.floor(D.hu[i] / 2), half = D.hu[i] % 2;
      for (let k = 0; k < full; k++) s += T(labelW + 8 + k * step, y + 26, D.th.emoji, { size: 22, anchor: "start" });
      if (half) s += `<clipPath id="${id}-${i}"><rect x="${labelW + 8 + full * step}" y="${y}" width="12" height="${rowH}"/></clipPath><g clip-path="url(#${id}-${i})">${T(labelW + 8 + full * step, y + 26, D.th.emoji, { size: 22, anchor: "start" })}</g>`;
    });
    const ly = top + n * rowH + 28;
    s += T(10, ly, D.th.emoji, { size: 20, anchor: "start" }) + T(36, ly - 2, `= ${D.K} ${D.th.unit}`, { size: 12, anchor: "start" });
    const hx = 190;
    s += `<clipPath id="${id}-k"><rect x="${hx}" y="${ly - 22}" width="10" height="30"/></clipPath><g clip-path="url(#${id}-k)">${T(hx, ly, D.th.emoji, { size: 20, anchor: "start" })}</g>` + T(hx + 18, ly - 2, `= ${D.K / 2}`, { size: 12, anchor: "start" });
    return svgWrap(W, H, s, `Pictograph of ${D.th.unit}`);
  }
  function genPictograph(d) {
    const D = makePictoData(d), img = pictoSvg(D), u = D.th.unit, kind = D.th.kind, n = D.rows.length;
    const kinds = ["read", "read", "which", "diff", "extreme", tier(d) !== "easy" ? "total" : "read"];
    const k = choice(kinds);
    if (k === "read") { const i = rand(0, n - 1); return typein(`How many ${u} are shown for ${D.rows[i]}?`, fmt(D.vals[i]), img, { D, i }); }
    if (k === "which") { const i = rand(0, n - 1); return tap(`Which ${kind} has ${fmt(D.vals[i])} ${u}?`, D.rows, D.rows[i], img, { D, i }); }
    if (k === "diff") { let i = rand(0, n - 1), j = rand(0, n - 1); while (j === i) j = rand(0, n - 1); if (D.vals[i] < D.vals[j]) { const t = i; i = j; j = t; } return typein(`How many more ${u} for ${D.rows[i]} than ${D.rows[j]}?`, fmt(D.vals[i] - D.vals[j]), img, { D, i, j }); }
    if (k === "extreme") { const most = Math.random() < 0.5; const v = most ? Math.max(...D.vals) : Math.min(...D.vals); return tap(`Which ${kind} has the ${most ? "most" : "fewest"} ${u}?`, D.rows, D.rows[D.vals.indexOf(v)], img, { D, most }); }
    return typein(`What is the total number of ${u} shown for all the ${kind}s?`, fmt(D.vals.reduce((a, b) => a + b, 0)), img, { D, total: true });
  }

  /* =================================================================
     3. BAR GRAPH
     ================================================================= */
  const BAR_THEMES = [
    { title: "Favourite pets", axis: "Number of children", who: "children", cats: ["Dog", "Cat", "Fish", "Bird", "Rabbit", "Turtle"], verb: "chose" },
    { title: "Favourite sports", axis: "Number of children", who: "children", cats: ["Football", "Swimming", "Badminton", "Basketball", "Hockey", "Tennis"], verb: "chose" },
    { title: "Favourite subjects", axis: "Number of children", who: "children", cats: ["Maths", "Science", "English", "PE", "Art", "Music"], verb: "chose" },
    { title: "Favourite foods", axis: "Number of children", who: "children", cats: ["Pizza", "Noodles", "Curry", "Satay", "Rice", "Burger"], verb: "chose" },
    { title: "Fruit sold at the market", axis: "Kilograms sold", who: "kg", cats: ["Mango", "Banana", "Apple", "Grapes", "Orange", "Melon"], verb: "sold" },
    { title: "Books read this term", axis: "Number of books", who: "books", cats: ["Ali", "Budi", "Citra", "Dewi", "Eka", "Fajar"], verb: "read" }
  ];
  function makeBarData(d) {
    const th = choice(BAR_THEMES), n = byTier(d, 4, 5, 5);
    const cfg = byTier(d, { max: 10, step: 2, minor: 1, unit: 1 }, { max: 20, step: 5, minor: 1, unit: 1 }, { max: 50, step: 10, minor: 2, unit: 2 });
    const pool = []; for (let v = cfg.unit * (cfg.unit === 1 ? 2 : 1); v <= cfg.max - cfg.unit; v += cfg.unit) pool.push(v);
    const vals = pickN(pool, n); // distinct -> unique most / fewest
    return { th, cfg, cats: th.cats.slice(0, n), vals };
  }
  function barSvg(D) {
    const W = 340, H = 214, x0 = 52, y0 = 30, cw = 268, ch = 150, n = D.cats.length, { max, step, minor } = D.cfg;
    let s = T(W / 2, 16, D.th.title, { size: 13, bold: true });
    for (let v = 0; v <= max; v += minor) { const y = y0 + ch - (v / max) * ch; s += L(x0, y, x0 + cw, y, v % step === 0 ? "#b9a98a" : GRID, v % step === 0 ? 1.2 : 0.6); }
    for (let v = 0; v <= max; v += step) { const y = y0 + ch - (v / max) * ch; s += T(x0 - 6, y + 4, v, { size: 10, anchor: "end" }); }
    s += L(x0, y0, x0, y0 + ch, INK, 2) + L(x0, y0 + ch, x0 + cw, y0 + ch, INK, 2);
    const slot = cw / n, bw = Math.min(34, slot * 0.6);
    D.cats.forEach((c, i) => {
      const bh = (D.vals[i] / max) * ch, bx = x0 + slot * i + (slot - bw) / 2;
      s += R(bx, y0 + ch - bh, bw, bh, BAR[i % BAR.length], INK, 1.5);
      s += T(bx + bw / 2, y0 + ch + 14, c, { size: 9 });
    });
    s += T(12, y0 + ch / 2, D.th.axis, { size: 10, rot: -90 });
    return svgWrap(W, H, s, D.th.title + " bar graph");
  }
  function barReadQ(th, cat) {
    if (th.who === "kg") return `How many kilograms of ${cat.toLowerCase()} were sold? (read the bar)`;
    if (th.who === "books") return `How many books did ${cat} read? (read the bar)`;
    return `How many children chose ${cat.toLowerCase()}? (read the bar)`;
  }
  function genBarGraph(d) {
    const D = makeBarData(d), img = barSvg(D), n = D.cats.length, { th } = D;
    const k = choice(["read", "read", "extreme", "diff", tier(d) === "easy" ? "read" : "total", "which"]);
    if (k === "read") { const i = rand(0, n - 1); return typein(barReadQ(th, D.cats[i]), D.vals[i], img, { D, i }); }
    if (k === "which") { const i = rand(0, n - 1); return tap(`The ${th.who === "kg" ? "amount" : "number"} for one bar is ${D.vals[i]}. Which bar is it?`, D.cats, D.cats[i], img, { D, i }); }
    if (k === "extreme") { const most = Math.random() < 0.5; const v = most ? Math.max(...D.vals) : Math.min(...D.vals); return tap(`Which bar is the ${most ? "tallest" : "shortest"}?`, D.cats, D.cats[D.vals.indexOf(v)], img, { D, most }); }
    if (k === "diff") { let i = rand(0, n - 1), j = rand(0, n - 1); while (j === i) j = rand(0, n - 1); if (D.vals[i] < D.vals[j]) { const t = i; i = j; j = t; } return typein(`How much higher is the ${D.cats[i]} bar than the ${D.cats[j]} bar?`, D.vals[i] - D.vals[j], img, { D, i, j }); }
    return typein(`What is the total of all the bars?`, D.vals.reduce((a, b) => a + b, 0), img, { D, total: true });
  }

  /* =================================================================
     4. LINE GRAPH
     ================================================================= */
  const LINE_THEMES = [
    { title: "Time spent playing basketball", y: "Time (minutes)", xs: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"], max: 80, step: 20, minor: 5, unit: "minutes", what: "play" },
    { title: "Company profits", y: "Profit ($)", xs: ["2015", "2016", "2017", "2018", "2019", "2020"], max: 120000, step: 40000, minor: 10000, unit: "dollars", what: "earn" },
    { title: "Temperature during the day", y: "Temperature (°C)", xs: ["6am", "9am", "12pm", "3pm", "6pm", "9pm"], max: 40, step: 10, minor: 5, unit: "°C", what: "temp" },
    { title: "Height of a bean plant", y: "Height (cm)", xs: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"], max: 60, step: 20, minor: 5, unit: "cm", what: "height" },
    { title: "Savings in the piggy bank", y: "Savings ($)", xs: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], max: 100, step: 20, minor: 5, unit: "dollars", what: "savings" }
  ];
  function makeLineData(d) {
    const th = choice(LINE_THEMES), n = byTier(d, 5, 6, 6), steps = Math.round(th.max / th.minor);
    for (let tries = 0; tries < 200; tries++) {
      const vals = Array.from({ length: n }, () => rand(2, steps - 1) * th.minor);
      const mx = Math.max(...vals), mn = Math.min(...vals);
      if (vals.filter(v => v === mx).length !== 1 || vals.filter(v => v === mn).length !== 1) continue;
      let allMoving = true; for (let i = 1; i < n; i++) if (vals[i] === vals[i - 1]) allMoving = false;
      if (!allMoving) continue;
      const inc = vals.slice(1).map((v, i) => v - vals[i]); const mi = Math.max(...inc);
      if (inc.filter(v => v === mi).length !== 1 || mi <= 0) continue;
      return { th, xs: th.xs.slice(0, n), vals };
    }
    return { th, xs: th.xs.slice(0, n), vals: [20, 35, 50, 30, 45, 60].slice(0, n).map(v => Math.min(v * th.max / 80, th.max - th.minor)) };
  }
  function lineSvg(D) {
    const W = 340, H = 214, x0 = 56, y0 = 30, cw = 266, ch = 150, { max, step, minor } = D.th, n = D.xs.length;
    let s = T(W / 2, 16, D.th.title, { size: 13, bold: true });
    for (let v = 0; v <= max; v += minor) { const y = y0 + ch - (v / max) * ch; s += L(x0, y, x0 + cw, y, v % step === 0 ? "#b9a98a" : GRID, v % step === 0 ? 1.2 : 0.6); }
    for (let v = 0; v <= max; v += step) { const y = y0 + ch - (v / max) * ch; s += T(x0 - 6, y + 4, fmt(v), { size: 10, anchor: "end" }); }
    s += L(x0, y0, x0, y0 + ch, INK, 2) + L(x0, y0 + ch, x0 + cw, y0 + ch, INK, 2);
    const px = i => x0 + 18 + (i * (cw - 36)) / (n - 1), py = v => y0 + ch - (v / max) * ch;
    s += `<polyline points="${D.vals.map((v, i) => px(i).toFixed(1) + "," + py(v).toFixed(1)).join(" ")}" fill="none" stroke="#e4572e" stroke-width="3" stroke-linejoin="round"/>`;
    D.vals.forEach((v, i) => { s += `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="4.5" fill="#2b2118"/>` + T(px(i), y0 + ch + 14, D.xs[i], { size: 9 }); });
    s += T(12, y0 + ch / 2, D.th.y, { size: 10, rot: -90 });
    return svgWrap(W, H, s, D.th.title + " line graph");
  }
  function genLineGraph(d) {
    const D = makeLineData(d), img = lineSvg(D), n = D.xs.length, u = D.th.unit === "dollars" ? "$" : "";
    const val = v => (u ? "$" + fmt(v) : fmt(v));
    const k = choice(["read", "read", "extreme", "trend", "diff", "count", tier(d) === "hard" ? "biggest" : "read"]);
    if (k === "read") { const i = rand(0, n - 1); return typein(`What value does the line show for ${D.xs[i]}?${D.th.unit === "dollars" ? " (in dollars)" : ""}`, fmt(D.vals[i]), img, { D, i }); }
    if (k === "extreme") { const hi = Math.random() < 0.5; const v = hi ? Math.max(...D.vals) : Math.min(...D.vals); return tap(`Which point on the graph is the ${hi ? "highest" : "lowest"}?`, D.xs, D.xs[D.vals.indexOf(v)], img, { D, hi }); }
    if (k === "trend") { const i = rand(0, n - 2); const up = D.vals[i + 1] > D.vals[i]; return tap(`From ${D.xs[i]} to ${D.xs[i + 1]}, did the value go up or down?`, ["It went up", "It went down", "It stayed the same"], up ? "It went up" : "It went down", img, { D, i }); }
    if (k === "diff") { let i = rand(0, n - 1), j = rand(0, n - 1); while (j === i || D.vals[i] === D.vals[j]) { i = rand(0, n - 1); j = rand(0, n - 1); } if (D.vals[i] < D.vals[j]) { const t = i; i = j; j = t; } return typein(`How much more is ${D.xs[i]} than ${D.xs[j]}?${D.th.unit === "dollars" ? " (in dollars)" : ""}`, fmt(D.vals[i] - D.vals[j]), img, { D, i, j }); }
    if (k === "count") { const t = choice(D.vals); return typein(`For how many points is the value at least ${val(t)}?`, D.vals.filter(v => v >= t).length, img, { D, t }); }
    const inc = D.vals.slice(1).map((v, i) => v - D.vals[i]); const mi = Math.max(...inc), idx = inc.indexOf(mi);
    const opts = D.xs.slice(1).map((x, i) => `${D.xs[i]} to ${x}`);
    return tap(`Between which two points was the biggest increase?`, opts, opts[idx], img, { D, idx });
  }


  /* =================================================================
     5. MEASURING ANGLES
     ================================================================= */
  const pt = (vx, vy, a, len) => [vx + len * Math.cos(rad(a)), vy - len * Math.sin(rad(a))];
  const arcPath = (vx, vy, r, a0, a1) => { // counter-clockwise (visually) from angle a0 to a1 (degrees)
    const sweep = ((a1 - a0) % 360 + 360) % 360, p0 = pt(vx, vy, a0, r), p1 = pt(vx, vy, a0 + sweep, r);
    return `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
  };
  function angleClassOf(deg) { return deg < 90 ? "Acute" : deg === 90 ? "Right" : deg < 180 ? "Obtuse" : deg === 180 ? "Straight" : "Reflex"; }
  function plainAngleSvg(deg) {
    const vx = 150, vy = 105, len = 78, a0 = rand(0, 359);
    const pa = pt(vx, vy, a0, len), pb = pt(vx, vy, a0 + deg, len);
    let s = L(vx, vy, pa[0], pa[1], INK, 3.5) + L(vx, vy, pb[0], pb[1], INK, 3.5);
    if (deg === 90) {
      const u = pt(0, 0, a0, 16), v = pt(0, 0, a0 + 90, 16);
      s += `<polyline points="${(vx + u[0]).toFixed(1)},${(vy + u[1]).toFixed(1)} ${(vx + u[0] + v[0]).toFixed(1)},${(vy + u[1] + v[1]).toFixed(1)} ${(vx + v[0]).toFixed(1)},${(vy + v[1]).toFixed(1)}" fill="none" stroke="#e4572e" stroke-width="2.5"/>`;
    } else s += `<path d="${arcPath(vx, vy, 24, a0, a0 + deg)}" fill="none" stroke="#e4572e" stroke-width="3"/>`;
    return svgWrap(300, 210, s, "an angle");
  }
  const VX = 170, VY = 170, PR = 138;
  function protractorSvg(deg) {
    let s = `<path d="M ${VX - PR} ${VY} A ${PR} ${PR} 0 0 1 ${VX + PR} ${VY} Z" fill="#e8f1ff" fill-opacity="0.7" stroke="${INK}" stroke-width="1.5"/>`;
    for (let a = 0; a <= 180; a += 5) {
      const p0 = pt(VX, VY, a, PR), p1 = pt(VX, VY, a, PR - (a % 10 === 0 ? 11 : 6));
      s += L(p0[0].toFixed(1), p0[1].toFixed(1), p1[0].toFixed(1), p1[1].toFixed(1), INK, a % 10 === 0 ? 1.2 : 0.7);
      if (a % 10 === 0) { const t = pt(VX, VY, a, PR - 22), edge = a === 0 || a === 180; s += T((t[0] + (a === 0 ? -2 : a === 180 ? 2 : 0)).toFixed(1), (t[1] + (edge ? -5 : 3)).toFixed(1), a, { size: 8 }); }
    }
    const e = pt(VX, VY, deg, 152);
    s += L(VX - 4, VY, VX + 152, VY, INK, 3) + L(VX, VY, e[0].toFixed(1), e[1].toFixed(1), "#e4572e", 3) + `<circle cx="${VX}" cy="${VY}" r="3.5" fill="${INK}"/>`;
    return svgWrap(340, 190, s, "angle on a protractor");
  }
  function missingAngleSvg(total, part) {
    const vx = 170, vy = 150, len = 128;
    const e0 = pt(vx, vy, 0, len), e1 = pt(vx, vy, part, len), e2 = pt(vx, vy, total, len);
    let s = L(vx, vy, e0[0], e0[1], INK, 3) + L(vx, vy, e1[0].toFixed(1), e1[1].toFixed(1), INK, 3) + L(vx, vy, e2[0].toFixed(1), e2[1].toFixed(1), INK, 3);
    s += `<path d="${arcPath(vx, vy, 92, 0, total)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<path d="${arcPath(vx, vy, 30, 0, part)}" fill="none" stroke="#3f7fd0" stroke-width="3"/>` + `<path d="${arcPath(vx, vy, 30, part, total)}" fill="none" stroke="#e4572e" stroke-width="3"/>`;
    const tp = pt(vx, vy, part / 2, 62), tq = pt(vx, vy, (part + total) / 2, 62), tt = pt(vx, vy, total / 2, 108);
    s += T(tp[0].toFixed(1), (tp[1] + 4).toFixed(1), part + "°", { size: 13, bold: true, fill: "#3f7fd0" }) + T(tq[0].toFixed(1), (tq[1] + 5).toFixed(1), "?", { size: 17, bold: true, fill: "#e4572e" }) + T(tt[0].toFixed(1), (tt[1] + 4).toFixed(1), total + "°", { size: 13, bold: true });
    return svgWrap(340, 170, s, "find the missing angle");
  }
  function reflexSvg(inner) {
    const vx = 170, vy = 112, a0 = rand(0, 359), len = 96;
    const pa = pt(vx, vy, a0, len), pb = pt(vx, vy, a0 + inner, len), ti = pt(vx, vy, a0 + inner / 2, 52), to = pt(vx, vy, a0 + inner + (360 - inner) / 2, 76);
    let s = L(vx, vy, pa[0].toFixed(1), pa[1].toFixed(1), INK, 3.5) + L(vx, vy, pb[0].toFixed(1), pb[1].toFixed(1), INK, 3.5);
    s += `<path d="${arcPath(vx, vy, 30, a0, a0 + inner)}" fill="none" stroke="#3f7fd0" stroke-width="3"/>` + `<path d="${arcPath(vx, vy, 56, a0 + inner, a0 + 360)}" fill="none" stroke="#e4572e" stroke-width="3"/>`;
    s += T(ti[0].toFixed(1), (ti[1] + 4).toFixed(1), inner + "°", { size: 13, bold: true, fill: "#3f7fd0" }) + T(to[0].toFixed(1), (to[1] + 6).toFixed(1), "?", { size: 18, bold: true, fill: "#e4572e" });
    return svgWrap(340, 224, s, "find the reflex angle");
  }
  function genAngleClassify(d) {
    const pool = byTier(d, [30, 45, 60, 90, 120, 135, 150, 20, 75, 110], [25, 40, 55, 70, 90, 100, 115, 130, 145, 160, 180], [20, 35, 50, 90, 105, 125, 140, 170, 180, 200, 235, 270, 300, 330]);
    const deg = choice(pool), cls = angleClassOf(deg);
    const opts = byTier(d, ["Acute", "Right", "Obtuse"], ["Acute", "Right", "Obtuse", "Straight"], ["Acute", "Right", "Obtuse", "Reflex"]);
    return tap("What type of angle is marked?", opts.includes(cls) ? opts : [cls, ...opts.slice(0, opts.length - 1)], cls, plainAngleSvg(deg), { deg });
  }
  function genAngleMeasure(d) {
    const stepA = byTier(d, 10, 5, 5), deg = rand(2, Math.floor(175 / stepA)) * stepA;
    const wrong = new Set(); [180 - deg, deg + stepA * 2, deg - stepA * 2, deg + 10, deg - 10, deg + 20].forEach(v => { if (v > 0 && v < 180 && Math.abs(v - deg) >= 8) wrong.add(v); });
    const opts = [deg, ...pickN([...wrong], 3)];
    return tap("Read the protractor. How big is the angle (in degrees)?", opts.map(v => v + "°"), deg + "°", protractorSvg(deg), { deg });
  }
  function genAngleMissing(d) {
    const total = byTier(d, choice([90, 180]), choice([90, 100, 120, 145, 180]), rand(60, 180)), part = rand(15, Math.max(16, total - 15));
    const t = total, p = Math.min(part, t - 15);
    return typein(`The whole angle is ${t}° and one part is ${p}°. Find the missing angle (in degrees).`, t - p, missingAngleSvg(t, p), { total: t, part: p });
  }
  function genAngleReflex(d) {
    const inner = rand(4, 34) * 5;
    return typein(`The inside angle is ${inner}°. What is the reflex angle marked "?" (in degrees)? Hint: a full turn is 360°.`, 360 - inner, reflexSvg(inner), { inner });
  }

  /* =================================================================
     6. PERIMETER  /  7. AREA   (shared shape drawing)
     ================================================================= */
  function rectSvg(l, w, unit, o) {
    o = o || {}; const sc = Math.min(210 / l, 110 / w), rw = l * sc, rh = w * sc, x = (340 - rw) / 2 - 8, y = 26 + (120 - rh) / 2;
    let s = R(x, y, rw, rh, o.fill || "#fbe3c3", INK, 2.5);
    s += T(x + rw / 2, y + rh + 17, o.lq ? "?" : `${l} ${unit}`, { size: 13, bold: true, fill: o.lq ? "#e4572e" : INK });
    if (!o.square) s += T(x + rw + 8, y + rh / 2 + 4, o.wq ? "?" : `${w} ${unit}`, { size: 13, bold: true, anchor: "start", fill: o.wq ? "#e4572e" : INK });
    else s += T(x + rw + 8, y + rh / 2 + 4, `${l} ${unit}`, { size: 13, bold: true, anchor: "start" });
    return svgWrap(340, 180, s, "rectangle");
  }
  function triSvg(a, b, c, unit, o) { // sides a (left), b (right), c (base)
    o = o || {};
    const ax = (b * b + c * c - a * a) / (2 * c), ay = Math.sqrt(Math.max(0.01, b * b - ax * ax));
    const sc = Math.min(220 / Math.max(c, Math.abs(ax), c - ax), 120 / ay), bx0 = 60, by0 = 150;
    const A = [bx0, by0], B = [bx0 + c * sc, by0], C = [bx0 + ax * sc, by0 - ay * sc];
    let s = P([A, B, C], "#d6ecd0", INK, 2.5);
    s += T(((A[0] + B[0]) / 2).toFixed(1), by0 + 17, `${c} ${unit}`, { size: 13, bold: true });
    s += T(((A[0] + C[0]) / 2 - 14).toFixed(1), ((A[1] + C[1]) / 2).toFixed(1), `${a} ${unit}`, { size: 13, bold: true });
    s += T(((B[0] + C[0]) / 2 + 14).toFixed(1), ((B[1] + C[1]) / 2).toFixed(1), `${b} ${unit}`, { size: 13, bold: true, anchor: "start" });
    return svgWrap(340, 180, s, "triangle");
  }
  function areaTriSvg(b, h, unit) {
    const sc = Math.min(200 / b, 110 / h), bw = b * sc, hh = h * sc, x0 = (340 - bw) / 2, y0 = 148, ap = x0 + bw * (0.25 + Math.random() * 0.5);
    let s = P([[x0, y0], [x0 + bw, y0], [ap, y0 - hh]], "#d6ecd0", INK, 2.5) + L(ap, y0, ap, y0 - hh, "#e4572e", 2, "5 4");
    s += T(x0 + bw / 2, y0 + 17, `base = ${b} ${unit}`, { size: 12, bold: true }) + T(ap + 6, y0 - hh / 2 + 4, `h = ${h} ${unit}`, { size: 12, bold: true, anchor: "start", fill: "#c0392b" });
    return svgWrap(340, 176, s, "triangle with height");
  }
  function areaParSvg(b, h, unit) {
    const sc = Math.min(180 / b, 100 / h), bw = b * sc, hh = h * sc, off = Math.min(46, bw * 0.3), x0 = (340 - bw - off) / 2, y0 = 148;
    let s = P([[x0, y0], [x0 + bw, y0], [x0 + bw + off, y0 - hh], [x0 + off, y0 - hh]], "#cfe0f7", INK, 2.5) + L(x0 + off, y0, x0 + off, y0 - hh, "#e4572e", 2, "5 4");
    s += T(x0 + bw / 2, y0 + 17, `base = ${b} ${unit}`, { size: 12, bold: true }) + T(x0 + off + 6, y0 - hh / 2 + 4, `h = ${h} ${unit}`, { size: 12, bold: true, anchor: "start", fill: "#c0392b" });
    return svgWrap(340, 176, s, "parallelogram with height");
  }
  function areaRhombusSvg(d1, d2, unit) {
    const sc = Math.min(220 / d1, 130 / d2), w = d1 * sc, h = d2 * sc, cx = 170, cy = 92;
    let s = P([[cx - w / 2, cy], [cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2]], "#f3d6f0", INK, 2.5) + L(cx - w / 2, cy, cx + w / 2, cy, "#e4572e", 2, "5 4") + L(cx, cy - h / 2, cx, cy + h / 2, "#e4572e", 2, "5 4");
    s += T(cx + w / 4, cy - 6, `d₁ = ${d1} ${unit}`, { size: 12, bold: true }) + T(cx + 6, cy + h / 4, `d₂ = ${d2} ${unit}`, { size: 12, bold: true, anchor: "start", fill: "#c0392b" });
    return svgWrap(340, 184, s, "rhombus with diagonals");
  }
  function polyomino(k, cols, rows) {
    const cells = new Set(); const key = (c, r) => c + "," + r;
    cells.add(key(rand(1, cols - 2), rand(1, rows - 2)));
    let guard = 0;
    while (cells.size < k && guard++ < 500) {
      const [c, r] = choice([...cells]).split(",").map(Number), [dc, dr] = choice([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const nc = c + dc, nr = r + dr; if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) cells.add(key(nc, nr));
    }
    const list = [...cells].map(s => s.split(",").map(Number));
    let per = 0; list.forEach(([c, r]) => { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { if (!cells.has(key(c + dc, r + dr))) per++; }); });
    return { list, area: list.length, per };
  }
  function gridSvg(poly, cols, rows) {
    const cs = Math.min(30, Math.floor(300 / cols)), W = 340, H = rows * cs + 24, x0 = (W - cols * cs) / 2, y0 = 12;
    let s = ""; poly.list.forEach(([c, r]) => { s += R(x0 + c * cs, y0 + r * cs, cs, cs, "#f7c59f"); });
    for (let c = 0; c <= cols; c++) s += L(x0 + c * cs, y0, x0 + c * cs, y0 + rows * cs, "#b9a98a", 1);
    for (let r = 0; r <= rows; r++) s += L(x0, y0 + r * cs, x0 + cols * cs, y0 + r * cs, "#b9a98a", 1);
    poly.list.forEach(([c, r]) => { s += R(x0 + c * cs, y0 + r * cs, cs, cs, "none", INK, 1.2); });
    return svgWrap(W, H, s, "shape on a grid");
  }
  const UNITS = ["cm", "m"];
  function genPerimeter(d) {
    const unit = choice(UNITS), hi = byTier(d, 9, 16, 24), kind = weighted([["rect", 1.3], ["square", 0.7], ["tri", tier(d) === "easy" ? 0.3 : 0.9], ["missing", tier(d) === "easy" ? 0.4 : 0.9], ["grid", tier(d) === "easy" ? 0.5 : 0.8]]);
    if (kind === "rect") { const l = rand(4, hi), w = rand(2, l - 1 > 2 ? l - 1 : 3); return typein(`Find the perimeter of the rectangle (in ${unit}).`, 2 * (l + w), rectSvg(l, w, unit), { l, w }); }
    if (kind === "square") { const s = rand(3, hi); return typein(`Find the perimeter of the square (in ${unit}).`, 4 * s, rectSvg(s, s, unit, { square: true }), { s }); }
    if (kind === "tri") { let a, b, c; do { a = rand(3, hi); b = rand(3, hi); c = rand(3, hi); } while (a + b <= c || a + c <= b || b + c <= a); return typein(`Add the three sides to find the perimeter of the triangle (in ${unit}).`, a + b + c, triSvg(a, b, c, unit), { a, b, c }); }
    if (kind === "missing") {
      const l = rand(4, hi), w = rand(2, l - 1 > 2 ? l - 1 : 3);
      return Math.random() < 0.5
        ? typein(`A rectangle has a perimeter of ${2 * (l + w)} ${unit}. Its length is ${l} ${unit}. What is its width (in ${unit})?`, w, "", { l, w })
        : typein(`A square has a perimeter of ${4 * l} ${unit}. How long is each side (in ${unit})?`, l, "", { s: l });
    }
    const k = rand(5, 9), poly = polyomino(k, 7, 5);
    return typein(`Each square is 1 cm by 1 cm. What is the perimeter of the shaded shape (in cm)?`, poly.per, gridSvg(poly, 7, 5), { poly });
  }
  function genArea(d) {
    const unit = choice(UNITS), t = tier(d);
    const kinds = [["rect", 1.4], ["square", 1]];
    if (t === "easy") kinds.push(["grid", 1]); else kinds.push(["tri", 1.2], ["par", 1.2]);
    if (t === "hard") kinds.push(["rhombus", 1.1], ["range", 1.1]);
    const kind = weighted(kinds), hi = byTier(d, 9, 14, 20);
    if (kind === "rect") { const l = rand(4, hi), w = rand(2, l - 1 > 2 ? l - 1 : 3); return typein(`Find the area of the rectangle (in ${unit}²).`, l * w, rectSvg(l, w, unit), { l, w }); }
    if (kind === "square") { const s = rand(2, byTier(d, 10, 12, 15)); return typein(`Find the area of the square (in ${unit}²).`, s * s, rectSvg(s, s, unit, { square: true }), { s }); }
    if (kind === "grid") { const poly = polyomino(rand(5, 10), 7, 5); return typein(`Each square is 1 cm². What is the area of the shaded shape (in cm²)?`, poly.area, gridSvg(poly, 7, 5), { poly }); }
    if (kind === "tri") { let b, h; do { b = rand(3, hi); h = rand(3, hi); } while ((b * h) % 2); return typein(`Area of a triangle = ½ × base × height. Find the area (in ${unit}²).`, (b * h) / 2, areaTriSvg(b, h, unit), { b, h }); }
    if (kind === "par") { const b = rand(4, hi), h = rand(2, Math.max(3, hi - 4)); return typein(`Area of a parallelogram = base × height. Find the area (in ${unit}²).`, b * h, areaParSvg(b, h, unit), { b, h }); }
    if (kind === "rhombus") { let d1, d2; do { d1 = rand(4, hi); d2 = rand(3, hi); } while ((d1 * d2) % 2); return typein(`Area of a rhombus = ½ × d₁ × d₂ (the two diagonals). Find the area (in ${unit}²).`, (d1 * d2) / 2, areaRhombusSvg(d1, d2, unit), { d1, d2 }); }
    // range: classify a triangle / parallelogram by its area
    let b, h, isTri = Math.random() < 0.5; do { b = rand(4, 20); h = rand(3, 15); } while (isTri && (b * h) % 2);
    const area = isTri ? (b * h) / 2 : b * h, bin = rand(0, 2), r1 = rand(3, 9), r2 = rand(6, 14);
    let t1, t2; if (bin === 0) { t1 = area + r1; t2 = t1 + r2; } else if (bin === 1) { t1 = Math.max(1, area - r1); t2 = area + r2; } else { t2 = area - r1; t1 = Math.max(1, t2 - r2); }
    if (t1 >= t2 || t1 >= area && bin !== 0) { t1 = area + 4; t2 = t1 + 8; }
    const opts = [`Below ${t1} cm²`, `${t1} to ${t2} cm²`, `Over ${t2} cm²`];
    const correct = area < t1 ? opts[0] : area > t2 ? opts[2] : opts[1];
    return tap(`Work out the area, then pick the group it belongs to.`, opts, correct, isTri ? areaTriSvg(b, h, "cm") : areaParSvg(b, h, "cm"), { b, h, area, t1, t2 });
  }

  /* =================================================================
     8. SQUARE NUMBERS
     ================================================================= */
  function squareGridSvg(n) {
    const cs = Math.min(26, Math.floor(260 / n)), W = 340, H = n * cs + 24, x0 = (W - n * cs) / 2, y0 = 12;
    let s = ""; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) s += R(x0 + c * cs, y0 + r * cs, cs, cs, BAR[(r + c) % 2 ? 1 : 3], INK, 1.2);
    return svgWrap(W, H, s, `${n} by ${n} grid of squares`);
  }
  const sup = n => String(n).split("").map(c => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("");
  function genSquare(d) {
    const mx = byTier(d, 10, 12, 12), kind = weighted([["value", 1.2], ["sum", 1.2], ["root", 0.9], ["identify", 0.9], ["grid", tier(d) === "hard" ? 0.4 : 0.9], ["next", 0.5]]);
    if (kind === "value") { const n = rand(2, mx); return typein(`What is ${n}${sup(2)} (${n} squared)? Hint: ${n} × ${n}.`, n * n, "", { n }); }
    if (kind === "sum") { const a = rand(2, mx), b = rand(2, mx); if (tier(d) === "hard" && Math.random() < 0.4) { const c = rand(2, 6); return typein(`${a}${sup(2)} + ${b}${sup(2)} + ${c}${sup(2)} = ?`, a * a + b * b + c * c, "", { a, b, c }); } return typein(`${a}${sup(2)} + ${b}${sup(2)} = ?`, a * a + b * b, "", { a, b }); }
    if (kind === "root") { const n = rand(2, mx); return typein(`Which number multiplied by itself gives ${n * n}?`, n, "", { n }); }
    if (kind === "identify") {
      const n = rand(3, mx), sq = n * n, non = new Set(); while (non.size < 3) { const c = sq + rand(-9, 9); if (c > 1 && c !== sq && !Number.isInteger(Math.sqrt(c))) non.add(c); }
      return tap("Which of these is a square number?", [sq, ...non], sq, "", { sq });
    }
    if (kind === "grid") { const n = rand(2, byTier(d, 7, 9, 10)); return typein(`How many small squares are in this ${n} by ${n} grid? (that is ${n}${sup(2)})`, n * n, squareGridSvg(n), { n }); }
    const n = rand(2, mx); return typein(`What is the next square number after ${n * n}?`, (n + 1) * (n + 1), "", { n });
  }

  /* =================================================================
     9. FACTORS & PRIME NUMBERS
     ================================================================= */
  function treeBuild(n) { if (isPrime(n)) return { v: n, leaf: true }; const fs = factorsOf(n).filter(f => f > 1 && f < n), a = choice(fs); return { v: n, kids: [treeBuild(a), treeBuild(n / a)] }; }
  const leavesOf = t => (t.leaf ? 1 : t.kids.reduce((s, k) => s + leavesOf(k), 0));
  const depthOf = t => (t.leaf ? 0 : 1 + Math.max(...t.kids.map(depthOf)));
  function treeSvg(tree, blank) {
    let li = 0; const nodes = [], dx = 52, x0 = 30, dy = 50, y0 = 28, D = depthOf(tree), W = Math.max(340, x0 * 2 + (leavesOf(tree) - 1) * dx), H = y0 * 2 + D * dy + 10;
    (function place(t, depth) { if (t.leaf) { t.x = x0 + li++ * dx; } else { t.kids.forEach(k => place(k, depth + 1)); t.x = (t.kids[0].x + t.kids[1].x) / 2; } t.y = y0 + depth * dy; nodes.push(t); })(tree, 0);
    let s = ""; nodes.forEach(t => { if (!t.leaf) t.kids.forEach(k => { s += L(t.x, t.y + 14, k.x, k.y - 14, INK, 2); }); });
    nodes.forEach(t => {
      if (t === blank) s += R(t.x - 17, t.y - 14, 34, 28, "#fff3f0", "#e4572e", 2.5) + T(t.x, t.y + 6, "?", { size: 18, bold: true, fill: "#e4572e" });
      else if (t.leaf) s += `<circle cx="${t.x}" cy="${t.y}" r="15" fill="#d6ecd0" stroke="${INK}" stroke-width="2"/>` + T(t.x, t.y + 5, t.v, { size: 14, bold: true });
      else s += T(t.x, t.y + 6, t.v, { size: 16, bold: true });
    });
    return svgWrap(W, H, s, "prime factor tree");
  }
  function genFactors(d) {
    const kind = weighted([["list", 1.2], ["count", 0.6], ["prime", 1.1], ["isfactor", 0.7], ["primefac", 1], ["tree", tier(d) === "easy" ? 0.2 : 1]]);
    const maxN = byTier(d, 30, 60, 100);
    if (kind === "list") { let n; do { n = rand(4, maxN); } while (factorsOf(n).length > 8 || (isPrime(n) && Math.random() < 0.6)); return typein(`List all the factors of ${n}. (Example: the factors of 18 are 1, 2, 3, 6, 9, 18)`, factorsOf(n).join(", "), "", { n }); }
    if (kind === "count") { const n = rand(6, maxN); return typein(`How many factors does ${n} have?`, factorsOf(n).length, "", { n }); }
    if (kind === "prime") { const n = rand(2, maxN), ip = isPrime(n); return tap(`Is ${n} a prime number?`, ["Prime", "Not prime"], ip ? "Prime" : "Not prime", "", { n }); }
    if (kind === "isfactor") { const n = rand(12, maxN), fs = factorsOf(n).filter(f => f > 1 && f < n); if (!fs.length) return genFactors(d); const f = choice(fs), non = new Set(); while (non.size < 3) { const c = rand(2, Math.min(n - 1, 20)); if (n % c) non.add(c); } return tap(`Which of these numbers is a factor of ${n}?`, [f, ...non], f, "", { n, f }); }
    if (kind === "primefac") { let n; do { n = rand(8, byTier(d, 36, 100, 144)); } while (isPrime(n)); return typein(`Write ${n} as a product of prime factors (for example 12 = 2 × 2 × 3).`, primeFactors(n).join(" × "), "", { n }); }
    let tree, tries = 0; do { tree = treeBuild(choice([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 72, 75, 80, 81, 90, 96, 100])); tries++; } while ((leavesOf(tree) > 6 || depthOf(tree) > 4) && tries < 60);
    const all = []; (function walk(t) { all.push(t); if (!t.leaf) t.kids.forEach(walk); })(tree);
    const blank = choice(all.filter(t => t !== tree)); return typein(`Fill in the blank in the prime factor tree. What number goes in the ? box?`, blank.v, treeSvg(tree, blank), { tree: tree.v, blank: blank.v });
  }

  /* =================================================================
     10. MULTIPLES, LCM & GCF
     ================================================================= */
  // Mostly pairs that DO share a factor bigger than 1 (like the workbook's 24 & 36, 5 & 30, 39 & 21).
  function gcfPair(mx) {
    if (Math.random() < 0.15) { let a, b; do { a = rand(4, mx); b = rand(4, mx); } while (a === b); return [a, b]; }
    for (let t = 0; t < 60; t++) { const g = rand(2, Math.max(2, Math.floor(mx / 3))), x = rand(1, Math.floor(mx / g)), y = rand(1, Math.floor(mx / g)); if (x !== y && g * x >= 4 && g * y >= 4) return [g * x, g * y]; }
    return [12, 18];
  }
  function genMultiples(d) {
    const kind = weighted([["list", 1], ["lcm2", 1.3], ["lcm3", tier(d) === "hard" ? 0.7 : 0], ["gcf", 1.3], ["lcmword", 1.2], ["gcfword", 0.8], ["other", 0.5]]);
    const mx = byTier(d, 10, 15, 20);
    if (kind === "list") { const n = rand(2, mx); return typein(`List the first 5 multiples of ${n}. (Example: the first five multiples of 2 are 2, 4, 6, 8, 10)`, [1, 2, 3, 4, 5].map(i => n * i).join(", "), "", { n }); }
    if (kind === "lcm2") { let a, b; do { a = rand(2, mx); b = rand(2, mx); } while (a === b || lcm(a, b) > byTier(d, 60, 120, 240)); return typein(`Find the lowest common multiple (LCM) of ${a} and ${b}.`, lcm(a, b), "", { a, b }); }
    if (kind === "lcm3") { const sets = [[2, 3, 5], [5, 6, 10], [3, 6, 11], [10, 15, 6], [4, 6, 9], [2, 5, 8], [3, 4, 10], [6, 8, 12]]; const s = choice(sets); return typein(`Find the lowest common multiple (LCM) of ${s[0]}, ${s[1]} and ${s[2]}.`, lcm(lcm(s[0], s[1]), s[2]), "", { s }); }
    if (kind === "gcf") { const [a, b] = gcfPair(byTier(d, 30, 50, 100)); return typein(`Find the greatest common factor (GCF) of ${a} and ${b}.`, gcd(a, b), "", { a, b }); }
    if (kind === "lcmword") {
      const t = rand(0, 3);
      if (t === 0) { const a = choice([12, 15, 18, 20, 30]), b = choice([8, 9, 10, 12, 18]); if (a === b) return genMultiples(d); return typein(`A smoke alarm beeps every ${a} minutes and an oven timer beeps every ${b} minutes. They beep together now. After how many minutes will they beep together again?`, lcm(a, b), "", { a, b, w: 1 }); }
      if (t === 1) { const a = choice([9, 12, 15, 6]), b = choice([4, 8, 10, 14]); if (a === b) return genMultiples(d); return typein(`Oliver puts his sweets in piles of ${a} and James puts his in piles of ${b}. They have the same number of sweets. What is the smallest number of sweets each could have?`, lcm(a, b), "", { a, b, w: 1 }); }
      if (t === 2) { const a = 8, b = 6, which = Math.random() < 0.5; return typein(`Kofi buys bread rolls in packs of ${a} and burgers in packs of ${b}. He wants exactly as many rolls as burgers. What is the smallest number of ${which ? "packs of bread rolls" : "packs of burgers"} he can buy?`, which ? lcm(a, b) / a : lcm(a, b) / b, "", { a, b, which }); }
      const a = choice([7, 6, 9, 10]), b = choice([15, 14, 12, 8]); return typein(`Jenny is paid by one job every ${a} days and by another job every ${b} days. She was paid by both today. After how many days will she be paid by both jobs on the same day again?`, lcm(a, b), "", { a, b, w: 1 });
    }
    if (kind === "gcfword") { const g = rand(3, 12), x = rand(2, 5), y = rand(2, 5); if (x === y || gcd(x, y) > 1) return genMultiples(d); return typein(`${x * g} apples and ${y * g} oranges are shared equally into baskets, with nothing left over and the same mix in every basket. What is the greatest number of baskets that can be filled?`, g, "", { g, x, y }); }
    const n = choice([9, 6, 4, 8, 12]), L2 = lcm(n, choice([5, 7, 10, 3])); // "LCM of n and ? is L2" -> which could ? be
    const goods = []; for (let c = 2; c <= L2; c++) if (lcm(n, c) === L2 && c !== n) goods.push(c);
    const bads = []; for (let c = 2; c <= 24; c++) if (lcm(n, c) !== L2 && c !== n) bads.push(c);
    if (!goods.length) return genMultiples(d);
    const good = choice(goods); return tap(`The LCM of ${n} and another number is ${L2}. Which number could the other number be?`, [good, ...pickN(bads, 3)], good, "", { n, L2, good });
  }

  /* =================================================================
     11. STORY PROBLEMS (+ - x /) -- Azka's extra practice (2026-10-14)
     One-step, two-step and "which operation?" word problems. Every template returns the
     arithmetic as `expr`, so scripts/qa-azka-focus.js can re-evaluate each answer independently.
     ================================================================= */
  const NAMES = ["Azka", "Rani", "Budi", "Sari", "Dimas", "Mia", "Rafi", "Nadia", "Bayu", "Citra", "Fajar", "Lina"];
  // Parent Portal "Personalisasi soal cerita" (synced into localStorage by joy.js): own names / favourite things.
  const persona = () => { try { return JSON.parse(localStorage.getItem("azka_persona") || "null"); } catch (e) { return null; } };
  const nameList = () => { const p = persona(); return p && Array.isArray(p.names) && p.names.length >= 3 ? p.names : NAMES; };
  const nm = () => choice(nameList());
  const two = () => { const L = nameList(); const a = choice(L); let b = choice(L), t = 0; while (b === a && t++ < 30) b = choice(L); return [a, b]; };
  const R3 = (d, e, m, h) => { const r = byTier(d, e, m, h); return rand(r[0], r[1]); };
  const rp = n => "Rp" + fmt(n * 1000);   // n is in thousands of rupiah
  const COLL = ["stickers", "marbles", "football cards", "coins", "seashells", "Minecraft cards", "bookmarks", "toy cars"];
  const collList = () => { const p = persona(); return p && Array.isArray(p.things) && p.things.length ? p.things.concat(COLL.slice(0, 2)) : COLL; };
  const FOOD = ["cookies", "doughnuts", "mangoes", "bananas", "rolls", "pancakes", "apples", "oranges"];
  const mk = (p, r, expr, op, disp) => (disp ? { p, r, expr, op, disp } : { p, r, expr, op });

  const ONE = {
    add: [
      d => { const n = nm(), it = choice(collList()), a = R3(d, [3, 9], [25, 90], [120, 650]), b = R3(d, [2, 9], [14, 70], [90, 480]); return mk(`${n} has ${fmt(a)} ${it}. A friend gives ${n} ${fmt(b)} more. How many ${it} does ${n} have now?`, a + b, `${a}+${b}`, "add"); },
      d => { const a = R3(d, [5, 14], [20, 60], [150, 480]), b = R3(d, [2, 9], [8, 40], [60, 320]); return mk(`There are ${fmt(a)} children on a school bus. At the next stop ${fmt(b)} more children get on. How many children are on the bus now?`, a + b, `${a}+${b}`, "add"); },
      d => { const a = R3(d, [6, 15], [40, 160], [260, 900]), b = R3(d, [4, 12], [30, 140], [180, 700]); return mk(`The class library has ${fmt(a)} storybooks and ${fmt(b)} comic books. How many books are there altogether?`, a + b, `${a}+${b}`, "add"); },
      d => { const [x, y] = two(), a = R3(d, [2, 9], [12, 55], [80, 400]), b = R3(d, [2, 9], [12, 55], [80, 400]); return mk(`${x} scored ${fmt(a)} points in the first game and ${y} scored ${fmt(b)} points. How many points did they score in total?`, a + b, `${a}+${b}`, "add"); },
      d => { const a = R3(d, [6, 15], [40, 170], [250, 800]), b = R3(d, [4, 12], [25, 110], [150, 600]); return mk(`A farmer has ${fmt(a)} chickens and ${fmt(b)} ducks. How many birds does the farmer have in all?`, a + b, `${a}+${b}`, "add"); },
      d => { const n = nm(), a = R3(d, [200, 900], [1200, 4500], [5000, 25000]), b = R3(d, [100, 800], [900, 3800], [4000, 19000]); return mk(`${n} walked ${fmt(a)} steps in the morning and ${fmt(b)} steps in the afternoon. How many steps did ${n} walk in total?`, a + b, `${a}+${b}`, "add"); },
      d => { const a = R3(d, [6, 15], [35, 90], [120, 420]), b = R3(d, [4, 12], [25, 80], [90, 360]), f = choice(FOOD); return mk(`A bakery makes ${fmt(a)} ${f} in the morning and ${fmt(b)} ${f} in the afternoon. How many ${f} does it make in one day?`, a + b, `${a}+${b}`, "add"); },
      d => { const n = nm(), a = R3(d, [5, 14], [20, 70], [110, 380]), b = R3(d, [5, 14], [20, 70], [110, 380]); return mk(`${n} read ${fmt(a)} pages on Monday and ${fmt(b)} pages on Tuesday. How many pages did ${n} read in the two days?`, a + b, `${a}+${b}`, "add"); },
      d => { const a = R3(d, [8, 20], [40, 160], [220, 700]), b = R3(d, [6, 18], [30, 140], [200, 650]); return mk(`A shop sold ${fmt(a)} T-shirts on Saturday and ${fmt(b)} T-shirts on Sunday. How many T-shirts did it sell on the weekend?`, a + b, `${a}+${b}`, "add"); },
      d => { const n = nm(), a = R3(d, [3, 9], [12, 70], [100, 600]), b = R3(d, [3, 9], [12, 70], [100, 600]); return mk(`${n} saved ${rp(a)} last month and ${rp(b)} this month. How much has ${n} saved altogether (in rupiah)?`, (a + b) * 1000, `(${a}+${b})*1000`, "add", `${a * 1000}+${b * 1000}`); }
    ],
    sub: [
      d => { const n = nm(), it = choice(collList()), a = R3(d, [10, 20], [60, 190], [300, 950]), b = R3(d, [2, 9], [12, 55], [80, 290]); return mk(`${n} has ${fmt(a)} ${it} and gives ${fmt(b)} of them to a friend. How many ${it} does ${n} have left?`, a - b, `${a}-${b}`, "sub"); },
      d => { const n = nm(), a = R3(d, [10, 20], [50, 200], [500, 2000]), b = R3(d, [2, 9], [10, 45], [80, 380]); return mk(`${n} has ${rp(a)} and buys a book for ${rp(b)}. How much money does ${n} have left (in rupiah)?`, (a - b) * 1000, `(${a}-${b})*1000`, "sub", `${a * 1000}-${b * 1000}`); },
      d => { const a = R3(d, [15, 28], [60, 190], [300, 900]), b = R3(d, [3, 12], [14, 55], [60, 260]); return mk(`There are ${fmt(a)} people on a train. At the station ${fmt(b)} people get off. How many people are still on the train?`, a - b, `${a}-${b}`, "sub"); },
      d => { const a = R3(d, [12, 24], [60, 180], [260, 800]), b = R3(d, [3, 10], [14, 55], [60, 240]), f = choice(FOOD); return mk(`A tray holds ${fmt(a)} ${f}. The children eat ${fmt(b)} of them. How many ${f} are left on the tray?`, a - b, `${a}-${b}`, "sub"); },
      d => { const n = nm(), a = R3(d, [12, 24], [80, 200], [300, 900]), b = R3(d, [3, 10], [20, 70], [80, 280]); return mk(`${n} wants to collect ${fmt(a)} stickers and already has ${fmt(b)}. How many more stickers does ${n} need?`, a - b, `${a}-${b}`, "sub"); },
      d => { const [x, y] = two(), a = R3(d, [58, 70], [66, 80], [72, 90]), b = R3(d, [3, 9], [6, 15], [10, 25]); return mk(`${x}'s grandfather is ${a} years old and ${y}'s grandfather is ${a - b} years old. How many years older is ${x}'s grandfather?`, b, `${a}-${a - b}`, "sub"); },
      d => { const n = nm(), a = R3(d, [30, 60], [100, 300], [320, 900]), b = R3(d, [8, 25], [25, 90], [120, 310]); return mk(`${n}'s book has ${fmt(a)} pages. ${n} has read ${fmt(b)} pages. How many pages are left to read?`, a - b, `${a}-${b}`, "sub"); },
      d => { const a = R3(d, [10, 20], [50, 120], [200, 700]), b = R3(d, [3, 9], [10, 45], [40, 190]); return mk(`At a party there are ${fmt(a)} balloons. ${fmt(b)} balloons pop. How many balloons are still whole?`, a - b, `${a}-${b}`, "sub"); },
      d => { const n = nm(), a = R3(d, [30, 60], [100, 300], [320, 900]), b = R3(d, [8, 25], [25, 90], [100, 310]); return mk(`A ribbon is ${fmt(a)} cm long. ${n} cuts off ${fmt(b)} cm. How many cm of ribbon are left?`, a - b, `${a}-${b}`, "sub"); },
      d => { const a = R3(d, [15, 30], [80, 200], [300, 900]), b = R3(d, [4, 12], [20, 70], [80, 290]); return mk(`A zoo has ${fmt(a)} visitors in the morning. ${fmt(b)} visitors go home at noon. How many visitors stay at the zoo?`, a - b, `${a}-${b}`, "sub"); }
    ],
    mul: [
      d => { const a = R3(d, [2, 5], [4, 9], [7, 12]), b = R3(d, [2, 6], [5, 12], [13, 45]); return mk(`There are ${a} bags with ${b} sweets in each bag. How many sweets are there in total?`, a * b, `${a}*${b}`, "mul"); },
      d => { const a = R3(d, [2, 5], [6, 12], [13, 30]), b = R3(d, [3, 8], [6, 12], [8, 16]); return mk(`A hall has ${a} rows of chairs with ${b} chairs in each row. How many chairs are in the hall?`, a * b, `${a}*${b}`, "mul"); },
      d => { const n = nm(), a = R3(d, [2, 5], [3, 9], [10, 20]); return mk(`${n} gets ${rp(a)} pocket money every day. How much pocket money does ${n} get in one week (7 days), in rupiah?`, a * 7 * 1000, `${a}*7*1000`, "mul", `${a * 1000}*7`); },
      d => { const a = R3(d, [2, 5], [4, 9], [8, 15]), b = R3(d, [3, 8], [6, 12], [12, 36]); return mk(`A teacher has ${a} boxes of pencils. Each box has ${b} pencils. How many pencils does the teacher have?`, a * b, `${a}*${b}`, "mul"); },
      d => { const a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [2, 6], [4, 9], [15, 80]); return mk(`One notebook costs ${rp(b)}. How much do ${a} notebooks cost (in rupiah)?`, a * b * 1000, `${a}*${b}*1000`, "mul", `${a}*${b * 1000}`); },
      d => { const a = R3(d, [2, 5], [4, 9], [6, 14]), b = R3(d, [3, 8], [6, 12], [12, 40]), f = choice(FOOD); return mk(`A baker puts ${b} ${f} on each tray. How many ${f} are on ${a} trays?`, a * b, `${a}*${b}`, "mul"); },
      d => { const n = nm(), a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [3, 9], [8, 25], [20, 60]); return mk(`${n} reads ${b} pages every day for ${a} days. How many pages does ${n} read in total?`, a * b, `${a}*${b}`, "mul"); },
      d => { const a = R3(d, [2, 5], [4, 9], [6, 15]), b = R3(d, [3, 6], [5, 10], [10, 30]); return mk(`Each pack has ${b} stickers. How many stickers are in ${a} packs?`, a * b, `${a}*${b}`, "mul"); },
      d => { const a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [4, 8], [8, 12], [10, 16]); return mk(`A pizza is cut into ${b} slices. How many slices are there in ${a} pizzas?`, a * b, `${a}*${b}`, "mul"); },
      d => { const a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [10, 25], [20, 45], [30, 80]); return mk(`A bus can carry ${b} passengers. How many passengers can ${a} buses carry?`, a * b, `${a}*${b}`, "mul"); }
    ],
    div: [
      d => { const k = R3(d, [2, 5], [3, 9], [6, 12]), q = R3(d, [2, 6], [5, 15], [12, 80]), n = nm(); return mk(`${n} shares ${fmt(k * q)} stickers equally among ${k} friends. How many stickers does each friend get?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 9], [6, 12]), q = R3(d, [2, 6], [5, 14], [12, 60]); return mk(`${fmt(k * q)} oranges are packed equally into ${k} boxes. How many oranges are in each box?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 9], [4, 10]), q = R3(d, [3, 8], [6, 15], [12, 50]), n = nm(); return mk(`${n} has a book with ${fmt(k * q)} pages and wants to finish it in ${k} days, reading the same number of pages each day. How many pages must ${n} read each day?`, q, `${k * q}/${k}`, "div"); },
      d => { const p = R3(d, [2, 5], [3, 9], [4, 15]), q = R3(d, [2, 6], [4, 12], [10, 40]), n = nm(); return mk(`${n} has ${rp(p * q)}. A pen costs ${rp(p)}. How many pens can ${n} buy?`, q, `${p * q}/${p}`, "div", `${p * q * 1000}/${p * 1000}`); },
      d => { const k = R3(d, [3, 6], [6, 10], [8, 14]), q = R3(d, [2, 5], [4, 10], [10, 40]); return mk(`A cinema has ${fmt(k * q)} seats in rows of ${k}. How many rows are there?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 9], [6, 12]), q = R3(d, [2, 6], [4, 12], [10, 50]); return mk(`A teacher gives out ${fmt(k * q)} sweets equally to ${k} kids. How many sweets does each kid get?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 8], [5, 9]), q = R3(d, [4, 9], [20, 60], [70, 190]); return mk(`A cyclist rides ${fmt(k * q)} kilometres in ${k} days, riding the same distance each day. How many kilometres does the cyclist ride each day?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [4, 8], [6, 12]), q = R3(d, [2, 6], [5, 14], [12, 60]); return mk(`${fmt(k * q)} apples are put equally into ${k} baskets. How many apples are in each basket?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 8], [5, 10]), q = R3(d, [3, 8], [6, 15], [12, 45]); return mk(`${fmt(k * q)} students are split equally into ${k} teams. How many students are in each team?`, q, `${k * q}/${k}`, "div"); },
      d => { const k = R3(d, [2, 5], [3, 8], [5, 10]), q = R3(d, [4, 12], [10, 40], [30, 90]); return mk(`A rope ${fmt(k * q)} cm long is cut into ${k} equal pieces. How many cm long is each piece?`, q, `${k * q}/${k}`, "div"); }
    ]
  };
  const TWO = [
    d => { const n = nm(), a = R3(d, [8, 15], [40, 120], [200, 600]), b = R3(d, [4, 9], [15, 60], [100, 300]), c = R3(d, [2, 7], [10, 50], [60, 250]), it = choice(collList()); return mk(`${n} has ${fmt(a)} ${it}, then buys ${fmt(b)} more and gives ${fmt(c)} to a friend. How many ${it} does ${n} have now?`, a + b - c, `${a}+${b}-${c}`, "add-sub"); },
    d => { const a = R3(d, [20, 40], [150, 400], [800, 2500]), b = R3(d, [3, 9], [20, 70], [100, 400]), c = R3(d, [2, 8], [15, 60], [90, 380]); return mk(`A shop has ${fmt(a)} bottles of juice. It sells ${fmt(b)} in the morning and ${fmt(c)} in the afternoon. How many bottles are left?`, a - b - c, `${a}-${b}-${c}`, "sub-sub"); },
    d => { const a = R3(d, [2, 5], [3, 9], [6, 12]), b = R3(d, [3, 8], [6, 12], [12, 40]), c = R3(d, [2, 9], [8, 30], [40, 120]); return mk(`There are ${a} bags with ${b} marbles in each bag, plus ${fmt(c)} loose marbles. How many marbles are there altogether?`, a * b + c, `${a}*${b}+${c}`, "mul-add"); },
    d => { const a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [4, 8], [8, 16], [12, 36]), c = R3(d, [2, 5], [4, 14], [10, 50]); return mk(`A farmer packs ${a} crates with ${b} eggs in each crate. ${c} eggs break. How many eggs are not broken?`, a * b - c, `${a}*${b}-${c}`, "mul-sub"); },
    d => { const k = R3(d, [2, 4], [3, 6], [4, 9]), q = R3(d, [3, 8], [6, 14], [12, 45]), c = R3(d, [2, 9], [8, 25], [30, 90]), n = nm(); return mk(`${n} shares ${fmt(k * q)} stickers equally among ${k} friends, then ${n}'s mum gives each friend ${fmt(c)} more. How many stickers does each friend have now?`, q + c, `${k * q}/${k}+${c}`, "div-add"); },
    d => { const a = R3(d, [3, 8], [6, 15], [20, 60]), b = R3(d, [3, 8], [6, 15], [20, 60]), c = R3(d, [2, 5], [3, 8], [4, 9]); return mk(`A class has ${a} boys and ${b} girls. Each child gets ${c} pencils. How many pencils are needed in total?`, (a + b) * c, `(${a}+${b})*${c}`, "add-mul"); },
    d => { const a = R3(d, [10, 20], [30, 80], [160, 400]), b = R3(d, [2, 8], [5, 25], [30, 150]), c = R3(d, [2, 5], [3, 8], [4, 9]); return mk(`A shop has ${fmt(a)} boxes of juice. ${fmt(b)} boxes are sold. Each remaining box has ${c} bottles. How many bottles are left?`, (a - b) * c, `(${a}-${b})*${c}`, "sub-mul"); },
    d => { const a = R3(d, [2, 4], [3, 6], [4, 8]), b = R3(d, [2, 5], [3, 8], [6, 12]), c = R3(d, [2, 5], [3, 8], [5, 12]); return mk(`A cinema shows ${a} films a day. Each film has ${b} showings and each showing sells ${c} tickets. How many tickets are sold in a day?`, a * b * c, `${a}*${b}*${c}`, "mul-mul"); },
    d => { const n = nm(), a = R3(d, [2, 5], [4, 9], [6, 12]), b = R3(d, [3, 8], [6, 12], [12, 40]), c = R3(d, [2, 5], [3, 8], [5, 9]); return mk(`${n} reads ${b} pages a day for ${a} days. Then ${n} reads ${c} pages a day for 2 more days. How many pages did ${n} read in all?`, a * b + c * 2, `${a}*${b}+${c}*2`, "mul-add"); },
    d => { const a = R3(d, [12, 30], [60, 200], [300, 900]), b = R3(d, [4, 12], [20, 70], [80, 300]), c = R3(d, [2, 9], [10, 50], [40, 220]); return mk(`A library has ${fmt(a)} books. It buys ${fmt(b)} new books and lends out ${fmt(c)}. How many books are on the shelves now?`, a + b - c, `${a}+${b}-${c}`, "add-sub"); },
    d => { const p = R3(d, [2, 5], [3, 9], [4, 12]), q = R3(d, [2, 5], [3, 8], [5, 12]), c = R3(d, [1, 5], [3, 12], [6, 25]), n = nm(); return mk(`Pencils cost ${rp(p)} each. ${n} buys ${q} pencils and pays with ${rp(p * q + c)}. How much change does ${n} get (in rupiah)?`, c * 1000, `(${p * q + c}-${p}*${q})*1000`, "mul-sub", `${(p * q + c) * 1000}-${p * 1000}*${q}`); },
    d => { const k = R3(d, [2, 5], [3, 8], [4, 9]), q = R3(d, [3, 6], [5, 12], [9, 30]); const c = rand(1, Math.min(q - 1, byTier(d, 4, 8, 20))); return mk(`${fmt(k * q)} marbles are shared equally among ${k} children. Each child then loses ${c} marbles. How many marbles does each child have now?`, q - c, `${k * q}/${k}-${c}`, "div-sub"); },
    d => { const a = R3(d, [3, 8], [6, 15], [12, 40]), b = R3(d, [2, 5], [3, 8], [5, 14]), c = R3(d, [3, 9], [10, 40], [50, 200]); return mk(`There are ${a} tables with ${b} chairs at each table. ${fmt(c)} more chairs are brought in. How many chairs are there now?`, a * b + c, `${a}*${b}+${c}`, "mul-add"); },
    d => { const k = R3(d, [2, 4], [3, 6], [4, 8]), q = R3(d, [2, 6], [4, 10], [8, 30]), j = R3(d, [2, 5], [3, 6], [4, 8]); return mk(`A baker packs ${fmt(k * q)} rolls equally into ${k} bags. How many rolls are in ${j} bags?`, q * j, `${k * q}/${k}*${j}`, "div-mul"); },
    d => { const k = R3(d, [2, 4], [2, 6], [3, 8]), q = R3(d, [3, 9], [6, 20], [12, 60]), a = rand(1, k * q - 1), b = k * q - a, [x, y] = two(); return mk(`${x} has ${fmt(a)} stickers and ${y} has ${fmt(b)} stickers. They put them together and share them equally among ${k} friends. How many stickers does each friend get?`, q, `(${a}+${b})/${k}`, "add-div"); },
    d => { const k = R3(d, [2, 5], [3, 6], [4, 9]), q = R3(d, [3, 8], [6, 15], [12, 50]), b = R3(d, [2, 6], [5, 25], [20, 90]); return mk(`There are ${fmt(k * q + b)} sweets. ${fmt(b)} of them are eaten and the rest are shared equally among ${k} kids. How many sweets does each kid get?`, q, `(${k * q + b}-${b})/${k}`, "sub-div"); },
    d => { const a = R3(d, [10, 30], [60, 200], [300, 800]), b = R3(d, [3, 9], [15, 60], [80, 250]), c = R3(d, [3, 9], [15, 60], [80, 250]); return mk(`A train has ${fmt(a)} passengers. ${fmt(b)} more get on at the first station and ${fmt(c)} more get on at the second station. How many passengers are on the train now?`, a + b + c, `${a}+${b}+${c}`, "add-add"); },
    d => { const n = nm(), b = R3(d, [2, 4], [3, 6], [4, 9]), c = R3(d, [2, 5], [3, 9], [6, 15]), e = R3(d, [2, 6], [5, 20], [20, 80]); return mk(`${n} has ${rp(b * c + e)}. ${n} buys ${b} erasers that cost ${rp(c)} each. How much money does ${n} have left (in rupiah)?`, e * 1000, `(${b * c + e}-${b}*${c})*1000`, "mul-sub", `${(b * c + e) * 1000}-${b}*${c * 1000}`); },
    d => { const a = R3(d, [2, 5], [3, 7], [4, 9]), b = R3(d, [2, 6], [3, 8], [4, 10]), m = a * b, ks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12].filter(k => m % k === 0 && k < m), k = choice(ks); return mk(`A factory makes ${a} toys every minute for ${b} minutes. The toys are packed equally into ${k} boxes. How many toys are in each box?`, m / k, `${a}*${b}/${k}`, "mul-div"); },
    d => { const a = R3(d, [20, 40], [150, 400], [800, 2500]), b = R3(d, [4, 12], [30, 100], [150, 500]), c = R3(d, [2, 9], [15, 80], [100, 400]); return mk(`A water tank has ${fmt(a)} litres. ${fmt(b)} litres leak out, then ${fmt(c)} litres are poured in. How many litres are in the tank now?`, a - b + c, `${a}-${b}+${c}`, "sub-add"); },
    d => { const n = nm(), p = R3(d, [3, 8], [10, 30], [25, 80]), q = R3(d, [2, 4], [3, 6], [4, 9]), c = R3(d, [2, 9], [8, 40], [20, 120]); return mk(`A book costs ${rp(p)}. ${n} buys ${q} books and a bag that costs ${rp(c)}. How much does ${n} pay in total (in rupiah)?`, (p * q + c) * 1000, `(${p}*${q}+${c})*1000`, "mul-add", `${p * 1000}*${q}+${c * 1000}`); },
    d => { const a = R3(d, [2, 5], [3, 8], [4, 10]), b = R3(d, [4, 10], [10, 30], [20, 50]), c = R3(d, [2, 5], [4, 14], [10, 40]); return mk(`${a} buses each carry ${b} children, but ${c} seats on the buses are empty. How many children are on the buses?`, a * b - c, `${a}*${b}-${c}`, "mul-sub"); },
    d => { const k = R3(d, [2, 5], [3, 6], [4, 8]), q = R3(d, [12, 30], [40, 120], [150, 400]), c = R3(d, [2, 9], [8, 30], [25, 90]); return mk(`A rope ${fmt(k * q)} cm long is cut into ${k} equal pieces. Then ${c} cm is cut off one piece. How long is that piece now (in cm)?`, q - c, `${k * q}/${k}-${c}`, "div-sub"); },
    d => { const b = R3(d, [5, 15], [30, 100], [150, 500]), c = R3(d, [4, 12], [20, 90], [100, 400]), e = R3(d, [3, 20], [15, 120], [100, 600]), a = b + c + e; return mk(`A farmer picks ${fmt(a)} mangoes. ${fmt(b)} are sold at the market and ${fmt(c)} are given to neighbours. How many mangoes are left?`, e, `${a}-${b}-${c}`, "sub-sub"); },
    d => { const a = R3(d, [3, 8], [6, 15], [12, 40]), b = R3(d, [2, 5], [3, 9], [5, 14]), c = R3(d, [2, 6], [3, 9], [4, 12]); return mk(`There are ${a} packs of juice boxes with ${b} boxes in each pack. Each box costs ${rp(c)}. How much do all the juice boxes cost (in rupiah)?`, a * b * c * 1000, `${a}*${b}*${c}*1000`, "mul-mul", `${a}*${b}*${c * 1000}`); }
  ];
  const OPS = [["add", "Add (+)"], ["sub", "Subtract (−)"], ["mul", "Multiply (×)"], ["div", "Divide (÷)"]];
  const OPNAME = Object.fromEntries(OPS);
  const KEYWORDS = [
    ["\"in total\" or \"altogether\"", "add"], ["\"how many are there in all?\"", "add"], ["\"gets on\" or \"is given more\"", "add"],
    ["\"how many are left?\"", "sub"], ["\"gives away\" or \"spends\"", "sub"], ["\"how many more are needed?\" or \"how much older?\"", "sub"],
    ["\"in each bag\" or \"every day\" with a total wanted", "mul"], ["\"groups of\" or \"times as many\"", "mul"], ["\"shared equally among\"", "div"], ["\"how many in each group?\" after sharing equally", "div"],
    ["\"how many can be bought?\" with a total and a price each", "div"], ["\"packed equally into boxes\"", "div"]
  ];
  const stripAmt = s => s;
  function genStoryOne(d) {
    const op = choice(["add", "sub", "mul", "div"]), o = choice(ONE[op])(d);
    return { prompt: o.p, answer: fmt(o.r), meta: o.disp ? { op: o.op, expr: o.expr, r: o.r, disp: o.disp } : { op: o.op, expr: o.expr, r: o.r } };
  }
  function genStoryTwo(d) {
    const o = choice(TWO)(d);
    return { prompt: o.p, answer: fmt(o.r), meta: o.disp ? { op: o.op, expr: o.expr, r: o.r, disp: o.disp } : { op: o.op, expr: o.expr, r: o.r } };
  }
  function genStory(d) { return Math.random() < byTier(d, 0.85, 0.6, 0.45) ? genStoryOne(d) : genStoryTwo(d); }
  function genStoryOp(d) {
    if (Math.random() < 0.3) { const [t, op] = choice(KEYWORDS); return tap(`In a story problem, the words ${t} usually tell you to...`, OPS.map(x => x[1]), OPNAME[op], "", { kw: t, op }); }
    const op = choice(["add", "sub", "mul", "div"]), o = choice(ONE[op])(d);
    return tap(`${o.p.replace(/ How (many|much)[^?]*\?$/, "")} Which operation would you use to find the answer?`.replace(/\s+/g, " "), OPS.map(x => x[1]), OPNAME[o.op], "", { op: o.op, expr: o.expr });
  }
  /* ---- Story chains ("Petualangan"): 5 connected questions in one little story; numbers flow from step to step. ---- */
  const CHAINS = [
    { id: "market", title: "Market Day", build: d => {
      const n = nm(), k = R3(d, [2, 3], [2, 4], [3, 5]), q = R3(d, [2, 2], [2, 3], [2, 3]), c = k * q, p = R3(d, [2, 3], [2, 5], [3, 8]), cost = p * c;
      const e = R3(d, [10, 16], [12, 25], [20, 40]), M = cost + e, nb = rand(2, e - 3), m = R3(d, [2, 2], [2, 4], [3, 6]);
      return [
        mk(`${n} goes to the Blockville market and buys ${c} pencils at ${rp(p)} each. How much do the pencils cost (in rupiah)?`, cost * 1000, `${p}*${c}*1000`, "mul", `${p * 1000}*${c}`),
        mk(`${n} started with ${rp(M)}. How much money is left after buying the pencils (in rupiah)?`, e * 1000, `(${M}-${cost})*1000`, "sub", `${M * 1000}-${cost * 1000}`),
        mk(`With the money that is left, ${n} buys a notebook for ${rp(nb)}. How much money does ${n} have now (in rupiah)?`, (e - nb) * 1000, `(${e}-${nb})*1000`, "sub", `${e * 1000}-${nb * 1000}`),
        mk(`${n} shares the ${c} pencils equally among ${k} friends. How many pencils does each friend get?`, q, `${c}/${k}`, "div"),
        mk(`Each friend finds ${m} more pencils in their bag. How many pencils does each friend have now?`, q + m, `${q}+${m}`, "add")];
    } },
    { id: "trip", title: "School Trip", build: d => {
      const g = R3(d, [2, 3], [3, 4], [3, 5]), per = R3(d, [5, 6], [5, 8], [6, 9]), st = g * per, b = R3(d, [2, 3], [3, 4], [3, 5]);
      const s = Math.ceil((st + 8) / b) + rand(0, 3), total = b * s, t = R3(d, [2, 3], [2, 4], [3, 6]), x = R3(d, [2, 3], [2, 4], [3, 5]);
      return [
        mk(`The class goes on a trip to the zoo with ${b} buses. Each bus has ${s} seats. How many seats are there in all?`, total, `${b}*${s}`, "mul"),
        mk(`There are ${st} students on the trip. How many seats stay empty?`, total - st, `${b}*${s}-${st}`, "mul-sub"),
        mk(`At the zoo, the ${st} students split equally into ${g} groups. How many students are in each group?`, per, `${st}/${g}`, "div"),
        mk(`Each student pays ${rp(t)} for a ticket. How much do all ${st} students pay (in rupiah)?`, st * t * 1000, `${st}*${t}*1000`, "mul", `${st}*${t * 1000}`),
        mk(`The guide gives each group ${x} stickers. How many stickers does the guide give out in all?`, g * x, `${g}*${x}`, "mul")];
    } },
    { id: "bakery", title: "Bake Sale", build: d => {
      const tr = R3(d, [3, 4], [3, 6], [4, 8]), c = R3(d, [8, 10], [8, 15], [10, 20]), total = tr * c, z = choice([2, 3, 4, 5]);
      const mmax = Math.floor((total - 6) / z), m = rand(Math.max(2, Math.floor(mmax / 2)), mmax), L = z * m, sold = total - L;
      const pr = R3(d, [3, 4], [3, 8], [5, 12]), cost = rand(2, z * pr - 2);
      return [
        mk(`A bakery bakes ${tr} trays of cookies with ${c} cookies on each tray. How many cookies does it bake?`, total, `${tr}*${c}`, "mul"),
        mk(`By lunchtime, ${sold} cookies are sold. How many cookies are left?`, L, `${tr}*${c}-${sold}`, "mul-sub"),
        mk(`The cookies that are left are packed equally into ${z} boxes. How many cookies are in each box?`, m, `${L}/${z}`, "div"),
        mk(`Each box is sold for ${rp(pr)}. How much money do the ${z} boxes bring in (in rupiah)?`, z * pr * 1000, `${z}*${pr}*1000`, "mul", `${z}*${pr * 1000}`),
        mk(`The ingredients cost ${rp(cost)}. How much profit does the bakery make from these boxes (in rupiah)?`, (z * pr - cost) * 1000, `(${z * pr}-${cost})*1000`, "sub", `${z * pr * 1000}-${cost * 1000}`)];
    } },
    { id: "reading", title: "Reading Challenge", build: d => {
      const n = nm(), a = R3(d, [5, 8], [6, 12], [8, 16]), dd = R3(d, [3, 4], [4, 6], [5, 9]), read = a * dd, w = choice([2, 3, 4, 5]);
      const per = rand(3, R3(d, [6, 6], [10, 10], [15, 15])), rem = w * per, B = read + rem, f = choice([3, 4, 5, 6]), days = R3(d, [3, 4], [4, 7], [5, 9]), Y = f * days;
      return [
        mk(`${n} reads ${a} pages of a storybook every day for ${dd} days. How many pages does ${n} read in all?`, read, `${a}*${dd}`, "mul"),
        mk(`The storybook has ${B} pages. How many pages are still left to read?`, rem, `${B}-${a}*${dd}`, "mul-sub"),
        mk(`${n} wants to finish the rest in ${w} equal days. How many pages must ${n} read each day?`, per, `${rem}/${w}`, "div"),
        mk(`The next book has ${Y} pages. How many pages are there in the two books together?`, B + Y, `${B}+${Y}`, "add"),
        mk(`${n} will read ${f} pages a day in the second book. How many days will it take to finish it?`, days, `${Y}/${f}`, "div")];
    } },
    { id: "cards", title: "Card Collector", build: d => {
      const n = nm(), k = R3(d, [2, 3], [2, 4], [3, 5]), c = rand(30, 80), w = rand(10, 30), T = k * Math.floor((c + w - 4) / k), g = c + w - T, q = T / k, p = R3(d, [2, 3], [2, 5], [3, 8]);
      return [
        mk(`${n} has ${c} football cards and wins ${w} more in a game. How many cards does ${n} have now?`, c + w, `${c}+${w}`, "add"),
        mk(`Then ${n} gives ${g} cards to a friend. How many cards does ${n} have left?`, T, `${c}+${w}-${g}`, "add-sub"),
        mk(`${n} puts the cards equally into ${k} albums. How many cards go in each album?`, q, `${T}/${k}`, "div"),
        mk(`${n} adds ${p} new cards to each album. How many cards are in each album now?`, q + p, `${q}+${p}`, "add"),
        mk(`How many cards are there in all ${k} albums now?`, k * (q + p), `${k}*${q + p}`, "mul")];
    } },
    { id: "garden", title: "Garden Day", build: d => {
      const n = nm(), r = R3(d, [3, 4], [3, 6], [4, 8]), c = R3(d, [5, 8], [6, 12], [8, 15]), planted = r * c, z = choice([2, 3, 4, 5]);
      const T = z * Math.floor((planted - 3) / z), lost = planted - T, m = T / z, pr = R3(d, [2, 3], [2, 5], [3, 8]), y = R3(d, [2, 3], [2, 4], [3, 6]);
      return [
        mk(`${n} plants ${r} rows of tomato plants with ${c} plants in each row. How many plants are there?`, planted, `${r}*${c}`, "mul"),
        mk(`${lost} plants are eaten by snails. How many plants are left?`, T, `${r}*${c}-${lost}`, "mul-sub"),
        mk(`The plants that are left are shared equally between ${z} neighbours. How many plants does each neighbour get?`, m, `${T}/${z}`, "div"),
        mk(`Each plant is sold for ${rp(pr)}. How much do one neighbour's ${m} plants cost (in rupiah)?`, m * pr * 1000, `${m}*${pr}*1000`, "mul", `${m}*${pr * 1000}`),
        mk(`That neighbour buys ${y} more plants at the same price. What is the total cost of all of that neighbour's plants (in rupiah)?`, (m + y) * pr * 1000, `(${m}+${y})*${pr}*1000`, "add-mul", `(${m}+${y})*${pr * 1000}`)];
    } }
  ];
  // One connected story as an array of typein steps, with a banner ("Market Day - Part 2 of 5") in the image slot.
  function genStoryChain(d, id) {
    const c = (id && CHAINS.find(x => x.id === id)) || choice(CHAINS), list = c.build(d || "medium");
    return list.map((o, i) => typein(o.p, fmt(o.r), `<div class="sh-chain">📖 ${c.title} · Part ${i + 1} of ${list.length}</div>`, Object.assign({ op: o.op, expr: o.expr, r: o.r, chain: { id: c.id, i: i + 1, n: list.length } }, o.disp ? { disp: o.disp } : {})));
  }
  function genStoryStep(d) { return Math.random() < 0.8 ? (() => { const g = genStory(d); return typein(g.prompt, g.answer, "", g.meta); })() : genStoryOp(d); }
  const storyQuick = d => { const g = genStory(d); return { prompt: g.prompt, answer: g.answer }; };

  /* =================================================================
     CHAPTERS (order = workbook order = town-map / drive-mode order)
     ================================================================= */
  const CHAPTERS = [
    { id: "basic-ops", title: "Basic Math Operations", emoji: "🧮", location: "Bakery", icon: "🥐", gen: [[genAdd6, 1], [genSub6, 1], [genDiv1, 1], [genDiv2, 1], [genTwoStep, 1.5], [genMulDiv, 1]],
      intro: "Big numbers, big batches! Add and subtract 6-digit numbers, divide by 1-digit and 2-digit numbers, and solve word problems that take two steps.",
      story: "The baker's order slips got mixed up -- add, subtract, share and multiply the batches so nobody goes hungry at the festival.",
      demo: { type: "steps", mono: true, label: "568,337 + 441,053 — carry when a column tops 9", lines: ["  568337", "+ 441053", "————————", " 1009390"] } },
    { id: "pictograph", title: "Pictograph", emoji: "🖼️", location: "Market Square", icon: "🧺", gen: [[genPictograph, 1]],
      intro: "A pictograph uses little pictures to show numbers. Check the key to see what ONE picture is worth -- and a half picture is worth half!",
      story: "The market stalls each put up a picture-chart of what they sold. Read them to see which stall is the festival champion.",
      demo: { type: "steps", label: "Key: 🍎 = 20 apples", lines: ["Row shows 🍎🍎🍎 and a half 🍎", "3 whole pictures = 3 × 20 = 60", "Half a picture = 10", "Total = 60 + 10 = 70 apples"] } },
    { id: "bar-graph", title: "Bar Graph", emoji: "📊", location: "Town Hall", icon: "🏛️", gen: [[genBarGraph, 1]],
      intro: "In a bar graph, the HEIGHT of each bar shows how many. Look at the numbers up the side (the scale) and follow the top of the bar across.",
      story: "The mayor held a vote for festival favourites. Read the bar graph to announce the winners!",
      demo: { type: "steps", label: "Reading a bar", lines: ["Find the top of the bar", "Look straight across to the scale", "The scale goes up in 2s here", "A bar between 6 and 8 is 7"] } },
    { id: "line-graph", title: "Line Graph", emoji: "📈", location: "Weather Station", icon: "🌦️", gen: [[genLineGraph, 1]],
      intro: "A line graph shows how something CHANGES over time. A line going up means it increased; going down means it decreased.",
      story: "The weather station keeper tracks everything with line graphs -- help read them before the festival weekend.",
      demo: { type: "steps", label: "Reading a line graph", lines: ["Each dot is a measurement", "Line goes UP  → it increased", "Line goes DOWN → it decreased", "Flat line → no change"] } },
    { id: "angles", title: "Measuring Angles", emoji: "📐", location: "Windmill", icon: "🎡", gen: [[genAngleClassify, 1.2], [genAngleMeasure, 1.6], [genAngleMissing, 1.4], [genAngleReflex, 0.7]],
      intro: "Angles are measured in degrees with a protractor. Line up the zero, read the scale, and remember: acute < 90°, right = 90°, obtuse between 90° and 180°, reflex over 180°.",
      story: "The windmill blades must be set at exactly the right angles before the wind festival begins.",
      demo: { type: "steps", label: "Finding a missing angle", lines: ["Whole angle = 88°", "One part   = 58°", "Missing part = 88 − 58", "= 30°"] } },
    { id: "perimeter", title: "Perimeter", emoji: "🧵", location: "Farm Fence", icon: "🚧", gen: [[genPerimeter, 1]],
      intro: "Perimeter is the distance AROUND a shape. Add up the lengths of all the sides.",
      story: "The farmer needs fencing for the festival animals -- work out how much fence goes all the way around.",
      demo: { type: "steps", label: "Perimeter of a rectangle 9 cm × 4 cm", lines: ["9 + 4 + 9 + 4", "= 2 × (9 + 4)", "= 2 × 13", "= 26 cm"] } },
    { id: "area", title: "Area", emoji: "🟩", location: "Wheat Field", icon: "🌾", gen: [[genArea, 1]],
      intro: "Area is how much SPACE is inside a shape, measured in square units. Rectangle: length × width. Triangle: ½ × base × height. Parallelogram: base × height. Rhombus: ½ × diagonal × diagonal.",
      story: "The wheat fields come in all shapes. How much ground does each one cover?",
      demo: { type: "steps", label: "Area of a triangle: base 8 cm, height 6 cm", lines: ["Area = ½ × base × height", "= ½ × 8 × 6", "= 24 ÷ 2", "= 24 cm² ÷ ... wait: ½ × 48 = 24 cm²"] } },
    { id: "square-numbers", title: "Square Numbers", emoji: "🔲", location: "Tile Workshop", icon: "🧱", gen: [[genSquare, 1]],
      intro: "A square number is a number multiplied by itself: 4² = 4 × 4 = 16. Picture a square made of small tiles -- 4 rows of 4 tiles is 16 tiles.",
      story: "The tile workshop only makes square floors. How many tiles does each floor need?",
      demo: { type: "steps", mono: true, label: "The first square numbers", lines: ["1² = 1 × 1 = 1", "2² = 2 × 2 = 4", "3² = 3 × 3 = 9", "4² = 4 × 4 = 16"] } },
    { id: "factors-primes", title: "Factors & Prime Numbers", emoji: "🌳", location: "Factor Grove", icon: "🌳", gen: [[genFactors, 1]],
      intro: "Factors are numbers that divide another number exactly. A prime number has exactly TWO factors: 1 and itself. Every other number can be built from primes with a factor tree.",
      story: "The grove keeper says only prime-numbered trees may be tapped for syrup this festival season.",
      demo: { type: "steps", label: "Breaking 24 down into its prime factors", lines: ["24 = 2 × 12", "12 = 2 × 6", "6 = 2 × 3", "24 = 2 × 2 × 2 × 3"] } },
    { id: "multiples-lcm-gcf", title: "Multiples, LCM & GCF", emoji: "🧩", location: "Twin Bridges", icon: "🌉", gen: [[genMultiples, 1]],
      intro: "Multiples are the answers in a times table. The LCM is the smallest multiple two numbers share; the GCF is the biggest factor they share.",
      story: "Two work crews need to meet on the bridge at the same time -- find when their schedules line up.",
      demo: { type: "steps", label: "LCM and GCF of 12 and 18", lines: ["Multiples of 12: 12, 24, 36 …", "Multiples of 18: 18, 36 …", "LCM = 36 (smallest shared multiple)", "GCF = 6 (biggest shared factor)"] } },
    { id: "story-problems", title: "Story Problems", emoji: "📖", location: "Story Cottage", icon: "🏡", gen: [[genStoryStep, 1]],
      intro: "Story problems hide a maths sum inside a little story. Read slowly, find the numbers, and use the clue words to choose: add (+), subtract (−), multiply (×) or divide (÷).",
      story: "The storyteller of Blockville has lost her numbers! Read each tale, spot the sum hiding inside, and help her finish the festival stories.",
      demo: { type: "steps", label: "\"There are 4 bags with 6 sweets in each bag. How many sweets in total?\"", lines: ["\"in each\" + a total → multiply", "4 × 6 = 24", "There are 24 sweets in total"] } }
  ];
  CHAPTERS[6].demo.lines = ["Area = ½ × base × height", "= ½ × 8 × 6", "= ½ × 48", "= 24 cm²"];

  function makeStep(chapterId, difficulty) {
    const ch = CHAPTERS.find(c => c.id === chapterId); if (!ch) throw new Error("unknown chapter " + chapterId);
    const g = weighted(ch.gen)(difficulty || "hard");
    return g.uiType ? g : typein(g.prompt, g.answer, "", g.meta); // basic-ops generators return {prompt, answer}
  }

  /* =================================================================
     QUICK generators (text only, numeric answer) for Drive/Plane/Ninja
     and every mini-game -- same {prompt, answer} contract as before.
     ================================================================= */
  const q = (prompt, answer) => ({ prompt, answer: fmt(answer) });
  const QUICK = {
    "t2-add": d => { const g = genAdd6(d); return { prompt: g.prompt, answer: g.answer }; },
    "t2-sub": d => { const g = genSub6(d); return { prompt: g.prompt, answer: g.answer }; },
    "t2-div": d => { const g = Math.random() < 0.5 ? genDiv1(d) : genDiv2(d); return { prompt: g.prompt, answer: g.answer }; },
    "t2-twostep": d => { const g = genTwoStep(d); return { prompt: g.prompt, answer: g.answer }; },
    "t2-muldiv": d => { const g = genMulDiv(d); return { prompt: g.prompt, answer: g.answer }; },
    "t2-angle": d => {
      const total = byTier(d, choice([90, 180]), choice([90, 120, 145, 180]), rand(60, 180)), part = rand(10, total - 10), whole = total === 180 && Math.random() < 0.5;
      return whole ? q(`Two angles on a straight line add up to 180°. One is ${part}°. What is the other angle?`, 180 - part) : q(`A ${total}° angle is split into two parts. One part is ${part}°. How big is the other part?`, total - part);
    },
    "t2-perimeter": d => {
      const hi = byTier(d, 9, 16, 24), k = rand(0, 2);
      if (k === 0) { const l = rand(4, hi), w = rand(2, l - 1 > 2 ? l - 1 : 3); return q(`A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter in cm?`, 2 * (l + w)); }
      if (k === 1) { const s = rand(3, hi); return q(`A square has sides of ${s} m. What is its perimeter in m?`, 4 * s); }
      let a, b, c; do { a = rand(3, hi); b = rand(3, hi); c = rand(3, hi); } while (a + b <= c || a + c <= b || b + c <= a); return q(`A triangle has sides of ${a} cm, ${b} cm and ${c} cm. What is its perimeter in cm?`, a + b + c);
    },
    "t2-area": d => {
      const hi = byTier(d, 9, 14, 20), k = tier(d) === "easy" ? rand(0, 1) : rand(0, 4);
      if (k === 0) { const l = rand(3, hi), w = rand(2, hi); return q(`A rectangle is ${l} cm long and ${w} cm wide. What is its area in cm²?`, l * w); }
      if (k === 1) { const s = rand(2, byTier(d, 10, 12, 15)); return q(`A square has sides of ${s} cm. What is its area in cm²?`, s * s); }
      if (k === 2) { let b, h; do { b = rand(3, hi); h = rand(3, hi); } while ((b * h) % 2); return q(`A triangle has a base of ${b} cm and a height of ${h} cm. What is its area in cm²?`, (b * h) / 2); }
      if (k === 3) { const b = rand(4, hi), h = rand(2, Math.max(3, hi - 4)); return q(`A parallelogram has a base of ${b} cm and a height of ${h} cm. What is its area in cm²?`, b * h); }
      let d1, d2; do { d1 = rand(4, hi); d2 = rand(3, hi); } while ((d1 * d2) % 2); return q(`A rhombus has diagonals of ${d1} cm and ${d2} cm. What is its area in cm²?`, (d1 * d2) / 2);
    },
    "t2-square": d => {
      const mx = byTier(d, 10, 12, 12), k = rand(0, 2), a = rand(2, mx), b = rand(2, mx);
      if (k === 0) return q(`${a}${sup(2)} = ?`, a * a);
      if (k === 1) return q(`${a}${sup(2)} + ${b}${sup(2)} = ?`, a * a + b * b);
      return q(`Which number multiplied by itself gives ${a * a}?`, a);
    },
    "t2-factors": d => {
      const mx = byTier(d, 24, 60, 100), k = rand(0, 2);
      if (k === 0) { const n = rand(6, mx); return q(`How many factors does ${n} have?`, factorsOf(n).length); }
      if (k === 1) { const n = rand(10, mx); return q(`What is the sum of the factors of ${n}?`, factorsOf(n).reduce((a, b) => a + b, 0)); }
      const lo = rand(2, 20), hi = lo + rand(8, 25); let c = 0; for (let i = lo; i <= hi; i++) if (isPrime(i)) c++; return q(`How many prime numbers are there from ${lo} to ${hi} (including both ends)?`, c);
    },
    "t2-multiple": d => { const n = rand(2, byTier(d, 9, 12, 20)), k = rand(3, byTier(d, 8, 10, 12)); return q(`What is the ${k}th multiple of ${n}?`, n * k); },
    "t2-lcm": d => { let a, b; do { a = rand(2, byTier(d, 10, 15, 20)); b = rand(2, byTier(d, 10, 15, 20)); } while (a === b || lcm(a, b) > byTier(d, 60, 120, 240)); return q(`Find the LCM of ${a} and ${b}.`, lcm(a, b)); },
    "t2-gcf": d => { const [a, b] = gcfPair(byTier(d, 30, 50, 100)); return q(`Find the GCF of ${a} and ${b}.`, gcd(a, b)); }
  };
  const QUICK_KEYS = Object.keys(QUICK);

  const api = { chapters: CHAPTERS, makeStep, quick: QUICK, quickKeys: QUICK_KEYS, story: storyQuick, storyChain: genStoryChain, _gen: { genStoryChain, genStory, genStoryOne, genStoryTwo, genStoryOp, genAdd6, genSub6, genDiv1, genDiv2, genTwoStep, genMulDiv, genPictograph, genBarGraph, genLineGraph, genAngleClassify, genAngleMeasure, genAngleMissing, genAngleReflex, genPerimeter, genArea, genSquare, genFactors, genMultiples } };
  root.MATHVILLE_T2 = api;
  // Every page that loads mathville/generators.js gets the quick generators under the same global as before.
  const GENS = Object.assign({}, QUICK); Object.defineProperty(GENS, "QUICK_KEYS", { value: QUICK_KEYS, enumerable: false });
  // "Fokus Azka" (child-side switch, key azka_focus in localStorage): while it is ON, every mini-game's
  // math question becomes a story problem. Read at call time so toggling takes effect immediately.
  const focusOn = () => { try { return localStorage.getItem("azka_focus") === "1"; } catch (e) { return false; } };
  Object.keys(GENS).forEach(k => { const orig = GENS[k]; GENS[k] = d => (focusOn() ? storyQuick(d) : orig(d)); });
  root.AIGFocus = { KEY: "azka_focus", on: focusOn, set: v => { try { localStorage.setItem("azka_focus", v ? "1" : "0"); } catch (e) {} } };
  root.MATHVILLE_GENERATORS = GENS;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
