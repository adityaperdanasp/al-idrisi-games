// QA for mathville/term2.js: generates many questions per chapter/difficulty and re-derives answers
// independently from the underlying numbers. Run: node scripts/qa-term2-math.js [N]
const T = require("../mathville/generators.js");
const N = Number(process.argv[2] || 1500);
const fails = []; let checked = 0;
const num = s => Number(String(s).replace(/,/g, ""));
const gcd = (a, b) => (b ? gcd(b, a % b) : a), lcm = (a, b) => a / gcd(a, b) * b;
const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const factors = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
function fail(ch, d, why, st) { if (fails.length < 25) fails.push(`[${ch}/${d}] ${why} :: ${st && st.prompt}`); else if (fails.length === 25) fails.push("... more"); }
function structural(ch, d, st) {
  const bad = x => /NaN|undefined|Infinity|\[object/.test(String(x));
  if (!st || !st.prompt || bad(st.prompt)) return "bad prompt";
  if (st.image) { if (bad(st.image)) return "bad svg (NaN/undefined)"; if (!/^<svg[\s\S]*<\/svg>$/.test(st.image)) return "svg not wrapped"; if ((st.image.match(/<svg/g) || []).length !== 1) return "svg count"; }
  if (st.uiType === "typein") { if (st.answer === "" || bad(st.answer)) return "bad answer"; }
  else if (st.uiType === "tap") {
    if (!Array.isArray(st.options) || st.options.length < 2 || st.options.length > 6) return "options count " + (st.options && st.options.length);
    if (new Set(st.options).size !== st.options.length) return "duplicate options " + st.options;
    if (!st.options.includes(st.correctLabel)) return "correct not in options";
    if (st.options.some(bad)) return "bad option";
  } else return "unknown uiType " + st.uiType;
  return null;
}
function semantic(ch, st) {
  const m = st.meta || {}, a = st.answer;
  if (m.op === "add") return num(a) === m.a + m.b;
  if (m.op === "sub") return num(a) === m.a - m.b && m.a > m.b;
  if (m.op === "div") return m.divisor * num(a) === m.dividend;
  if (m.op === "rem") return num(a) === m.dividend % m.divisor;
  if (m.op === "twostep") return num(a) === m.r && m.r > 0;
  if (m.op === "muldiv") return num(a) === m.r && m.r > 0;
  if (m.D && m.D.hu) { // pictograph
    const D = m.D; if (D.vals.some((v, i) => v !== D.hu[i] * D.K / 2 || !Number.isInteger(v))) return false;
    if (m.total) return num(a) === D.vals.reduce((x, y) => x + y, 0);
    if (m.j !== undefined) return num(a) === D.vals[m.i] - D.vals[m.j] && D.vals[m.i] > D.vals[m.j];
    if (st.uiType === "tap") { if (m.most !== undefined) { const v = m.most ? Math.max(...D.vals) : Math.min(...D.vals); return st.correctLabel === D.rows[D.vals.indexOf(v)]; } return st.correctLabel === D.rows[m.i] && D.vals.filter(v => v === D.vals[m.i]).length === 1; }
    return num(a) === D.vals[m.i];
  }
  if (m.D && m.D.cfg) { // bar
    const D = m.D; if (D.vals.some(v => v <= 0 || v >= D.cfg.max || v % D.cfg.unit)) return false;
    if (m.total) return num(a) === D.vals.reduce((x, y) => x + y, 0);
    if (m.j !== undefined) return num(a) === D.vals[m.i] - D.vals[m.j] && D.vals[m.i] > D.vals[m.j];
    if (st.uiType === "tap") { if (m.most !== undefined) { const v = m.most ? Math.max(...D.vals) : Math.min(...D.vals); return st.correctLabel === D.cats[D.vals.indexOf(v)] && D.vals.filter(x => x === v).length === 1; } return st.correctLabel === D.cats[m.i] && D.vals.filter(v => v === D.vals[m.i]).length === 1; }
    return num(a) === D.vals[m.i];
  }
  if (m.D && m.D.xs) { // line
    const D = m.D; if (D.vals.some(v => v <= 0 || v >= D.th.max || v % D.th.minor)) return false;
    if (m.t !== undefined) return num(a) === D.vals.filter(v => v >= m.t).length;
    if (m.j !== undefined) return num(a) === D.vals[m.i] - D.vals[m.j] && D.vals[m.i] > D.vals[m.j];
    if (m.idx !== undefined) { const inc = D.vals.slice(1).map((v, i) => v - D.vals[i]); return inc.filter(v => v === Math.max(...inc)).length === 1 && st.correctLabel === `${D.xs[m.idx]} to ${D.xs[m.idx + 1]}`; }
    if (m.hi !== undefined) { const v = m.hi ? Math.max(...D.vals) : Math.min(...D.vals); return D.vals.filter(x => x === v).length === 1 && st.correctLabel === D.xs[D.vals.indexOf(v)]; }
    if (st.uiType === "tap") return (st.correctLabel === "It went up") === (D.vals[m.i + 1] > D.vals[m.i]) && D.vals[m.i + 1] !== D.vals[m.i];
    return num(a) === D.vals[m.i];
  }
  if (m.deg !== undefined && st.uiType === "tap" && /protractor/.test(st.prompt)) { const labs = st.options.map(o => parseInt(o, 10)); return st.correctLabel === m.deg + "°" && labs.every(v => v > 0 && v < 180) && Math.min(...labs.flatMap((x, i) => labs.slice(i + 1).map(y => Math.abs(x - y)))) >= 8; }
  if (m.deg !== undefined) { const c = m.deg < 90 ? "Acute" : m.deg === 90 ? "Right" : m.deg < 180 ? "Obtuse" : m.deg === 180 ? "Straight" : "Reflex"; return st.correctLabel === c; }
  if (m.total !== undefined && m.part !== undefined) return num(a) === m.total - m.part && m.total - m.part >= 15 && m.part >= 15;
  if (m.inner !== undefined) return num(a) === 360 - m.inner && m.inner > 0 && m.inner < 180;
  if (Array.isArray(m.s)) return num(a) === lcm(lcm(m.s[0], m.s[1]), m.s[2]);
  if (m.w === 1) return num(a) === lcm(m.a, m.b);
  if (m.which !== undefined) return num(a) === (m.which ? lcm(m.a, m.b) / m.a : lcm(m.a, m.b) / m.b);
  if (m.l !== undefined && m.w !== undefined && /perimeter/i.test(st.prompt)) return num(a) === 2 * (m.l + m.w) || num(a) === m.w;
  if (m.s !== undefined && /perimeter/i.test(st.prompt)) return num(a) === 4 * m.s || num(a) === m.s;
  if (m.a !== undefined && m.b !== undefined && m.c !== undefined && /perimeter/i.test(st.prompt)) return num(a) === m.a + m.b + m.c && m.a + m.b > m.c && m.a + m.c > m.b && m.b + m.c > m.a;
  if (m.poly) { const set = new Set(m.poly.list.map(p => p.join(","))); let per = 0; m.poly.list.forEach(([c, r]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => { if (!set.has((c + dc) + "," + (r + dr))) per++; })); const want = /perimeter/.test(st.prompt) ? per : set.size; return num(a) === want && set.size === m.poly.list.length; }
  if (m.area !== undefined) { const ok = m.area === (/triangle/.test(st.prompt) ? 0 : 0) || true; const area = m.area; const lab = st.correctLabel; const exp = area < m.t1 ? `Below ${m.t1} cm²` : area > m.t2 ? `Over ${m.t2} cm²` : `${m.t1} to ${m.t2} cm²`; return lab === exp && m.t1 < m.t2 && area !== m.t1 && area !== m.t2; }
  if (m.b !== undefined && m.h !== undefined) return num(a) === (/triangle/i.test(st.prompt) ? m.b * m.h / 2 : m.b * m.h) && (!/triangle/i.test(st.prompt) || (m.b * m.h) % 2 === 0);
  if (m.d1 !== undefined) return num(a) === m.d1 * m.d2 / 2 && (m.d1 * m.d2) % 2 === 0;
  if (m.l !== undefined && m.w !== undefined) return num(a) === m.l * m.w;
  if (m.s !== undefined) return num(a) === m.s * m.s;
  if (m.sq !== undefined) return st.correctLabel === String(m.sq) && Number.isInteger(Math.sqrt(m.sq)) && st.options.filter(o => Number.isInteger(Math.sqrt(num(o)))).length === 1;
  if (m.n !== undefined && /squared/.test(st.prompt)) return num(a) === m.n * m.n;
  if (m.n !== undefined && /next square/.test(st.prompt)) return num(a) === (m.n + 1) ** 2;
  if (m.n !== undefined && /multiplied by itself/.test(st.prompt)) return num(a) === m.n;
  if (m.n !== undefined && /grid/.test(st.prompt)) return num(a) === m.n * m.n;
  if (m.a !== undefined && m.b !== undefined && /²|²|[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(st.prompt)) return num(a) === m.a * m.a + m.b * m.b + (m.c ? m.c * m.c : 0);
  if (m.n !== undefined && /List all the factors/.test(st.prompt)) return a === factors(m.n).join(", ");
  if (m.n !== undefined && /How many factors/.test(st.prompt)) return num(a) === factors(m.n).length;
  if (m.n !== undefined && /prime number\?/.test(st.prompt)) return st.correctLabel === (isPrime(m.n) ? "Prime" : "Not prime");
  if (m.f !== undefined) return m.n % m.f === 0 && st.options.filter(o => m.n % num(o) === 0).length === 1;
  if (m.n !== undefined && /product of prime/.test(st.prompt)) { const f = a.split(" × ").map(Number); return f.every(isPrime) && f.reduce((x, y) => x * y, 1) === m.n; }
  if (m.tree !== undefined) { const lv = [...st.image.matchAll(/r="15"[^>]*\/><text[^>]*>(\d+)</g)].map(x => +x[1]); return m.blank > 1 && m.tree % m.blank === 0 && num(a) === m.blank; }
  if (m.n !== undefined && /first 5 multiples/.test(st.prompt)) return a === [1, 2, 3, 4, 5].map(i => m.n * i).join(", ");
  if (m.a !== undefined && m.b !== undefined && /LCM|lowest/i.test(st.prompt)) return num(a) === lcm(m.a, m.b);
  if (m.a !== undefined && m.b !== undefined && /GCF|greatest common/i.test(st.prompt)) return num(a) === gcd(m.a, m.b);
  if (m.g !== undefined) return num(a) === m.g && gcd(m.x, m.y) === 1;
  if (m.good !== undefined) return lcm(m.n, m.good) === m.L2 && st.options.filter(o => lcm(m.n, num(o)) === m.L2).length === 1;
  return null; // not covered
}
const diffs = ["easy", "medium", "hard"]; const cover = {};
for (const ch of T.chapters) for (const d of diffs) for (let i = 0; i < N; i++) {
  let st; try { st = T.makeStep(ch.id, d); } catch (e) { fail(ch.id, d, "THROW " + e.message, {}); continue; }
  checked++; const s = structural(ch.id, d, st); if (s) { fail(ch.id, d, s, st); continue; }
  const sem = semantic(ch.id, st); cover[ch.id] = cover[ch.id] || { ok: 0, na: 0 };
  if (sem === false) fail(ch.id, d, "WRONG ANSWER " + st.answer + (st.correctLabel ? "/" + st.correctLabel : ""), st); else if (sem === null) cover[ch.id].na++; else cover[ch.id].ok++;
}
// quick generators: numeric contract + re-derive a few
const numRe = /^-?[\d,]+(\.\d+)?(\s+[a-zA-Z]+)?$/;
for (const key of T.quickKeys) for (const d of diffs) for (let i = 0; i < N; i++) {
  let g; try { g = T.quick[key](d); } catch (e) { fail("quick:" + key, d, "THROW " + e.message, {}); continue; }
  checked++; if (!g.prompt || /NaN|undefined/.test(g.prompt + g.answer)) fail("quick:" + key, d, "bad text", g); else if (!numRe.test(String(g.answer).trim())) fail("quick:" + key, d, "non-numeric answer " + g.answer, g); else if (num(g.answer) < 0) fail("quick:" + key, d, "negative", g);
  let m;
  if (key === "t2-lcm" && (m = g.prompt.match(/LCM of (\d+) and (\d+)/)) && num(g.answer) !== lcm(+m[1], +m[2])) fail("quick:" + key, d, "wrong lcm", g);
  if (key === "t2-gcf" && (m = g.prompt.match(/GCF of (\d+) and (\d+)/)) && num(g.answer) !== gcd(+m[1], +m[2])) fail("quick:" + key, d, "wrong gcf", g);
  if (key === "t2-multiple" && (m = g.prompt.match(/the (\d+)th multiple of (\d+)/)) && num(g.answer) !== +m[1] * +m[2]) fail("quick:" + key, d, "wrong multiple", g);
  if (key === "t2-factors" && (m = g.prompt.match(/How many factors does (\d+)/)) && num(g.answer) !== factors(+m[1]).length) fail("quick:" + key, d, "wrong factor count", g);
  if (key === "t2-factors" && (m = g.prompt.match(/sum of the factors of (\d+)/)) && num(g.answer) !== factors(+m[1]).reduce((a, b) => a + b, 0)) fail("quick:" + key, d, "wrong factor sum", g);
  if (key === "t2-factors" && (m = g.prompt.match(/prime numbers are there from (\d+) to (\d+)/))) { let c = 0; for (let x = +m[1]; x <= +m[2]; x++) if (isPrime(x)) c++; if (num(g.answer) !== c) fail("quick:" + key, d, "wrong prime count", g); }
  if (key === "t2-add" && (m = g.prompt.replace(/,/g, "").match(/^(\d+) \+ (\d+)/)) && num(g.answer) !== +m[1] + +m[2]) fail("quick:" + key, d, "wrong add", g);
  if (key === "t2-sub" && (m = g.prompt.replace(/,/g, "").match(/^(\d+) − (\d+)/)) && num(g.answer) !== +m[1] - +m[2]) fail("quick:" + key, d, "wrong sub", g);
  if (key === "t2-square" && (m = g.prompt.match(/^(\d+)² \+ (\d+)²/)) && num(g.answer) !== m[1] ** 2 + m[2] ** 2) fail("quick:" + key, d, "wrong sq sum", g);
  if (key === "t2-area" && (m = g.prompt.match(/rhombus has diagonals of (\d+) cm and (\d+)/)) && num(g.answer) !== +m[1] * +m[2] / 2) fail("quick:" + key, d, "wrong rhombus", g);
  if (key === "t2-area" && (m = g.prompt.match(/triangle has a base of (\d+) cm and a height of (\d+)/)) && num(g.answer) !== +m[1] * +m[2] / 2) fail("quick:" + key, d, "wrong tri", g);
}
console.log(JSON.stringify({ checked, failures: fails.length, coverage: cover }, null, 1));
if (fails.length) { console.log(fails.join("\n")); process.exit(1); }
console.log("ALL OK");
