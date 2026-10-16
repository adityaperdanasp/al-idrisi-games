/* =================================================================
   AIGStoryHelp -- "Bo, help me!" for story problems (MathVille typein steps that carry step.meta = {op, expr, r, disp}).
   Level 1: highlight the numbers + point at the clue words.  Level 2: pick the operation.  Level 3: a bar model.
   After a wrong answer: explainHtml(step) shows the working (each step with real numbers) and a bar model per step.
   Pure helper: no network, no game state. `disp` (optional) is the same sum written with the real numbers when the
   template works in thousands of rupiah.
   ================================================================= */
(function (root) {
  "use strict";
  const fmt = n => Number(n).toLocaleString("en-US");
  const SYM = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  const OPNAME = { "+": "Add (+)", "-": "Subtract (−)", "*": "Multiply (×)", "/": "Divide (÷)" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- tiny expression parser: numbers, + - * / and parentheses ---------- */
  function parse(expr) {
    const s = String(expr).replace(/\s+/g, ""); let i = 0;
    function num() { const j = i; while (i < s.length && /[0-9.]/.test(s[i])) i++; if (j === i) throw new Error("num"); return { t: "n", v: Number(s.slice(j, i)) }; }
    function atom() { if (s[i] === "(") { i++; const e = add(); if (s[i] !== ")") throw new Error("paren"); i++; return e; } return num(); }
    function mul() { let l = atom(); while (s[i] === "*" || s[i] === "/") { const o = s[i++]; const r = atom(); l = { t: "b", o, l, r }; } return l; }
    function add() { let l = mul(); while (s[i] === "+" || s[i] === "-") { const o = s[i++]; const r = mul(); l = { t: "b", o, l, r }; } return l; }
    const e = add(); if (i !== s.length) throw new Error("trail"); return e;
  }
  const apply = (o, a, b) => (o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : a / b);
  // Binary operations in the order they are worked out, with the numbers actually used.
  function workSteps(expr) {
    const out = [];
    (function walk(n) { if (n.t === "n") return n.v; const a = walk(n.l), b = walk(n.r), v = apply(n.o, a, b); out.push({ a, b, o: n.o, v }); return v; })(parse(expr));
    return out;
  }
  const exprOf = step => { const m = step && step.meta; return m && (m.disp || m.expr) ? (m.disp || m.expr) : null; };

  /* ---------- bar models ---------- */
  const INK = "#3b2a1a";
  function box(x, y, w, h, fill, label, fs) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${INK}" stroke-width="2"/>` + (label != null ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" font-size="${fs || 14}" font-weight="800" font-family="Arial,sans-serif" fill="${INK}" text-anchor="middle">${esc(label)}</text>` : "");
  }
  function brace(x1, x2, y, label) {
    return `<path d="M${x1} ${y + 7} V${y} H${x2} V${y + 7}" fill="none" stroke="${INK}" stroke-width="2"/>` + `<text x="${(x1 + x2) / 2}" y="${y - 5}" font-size="15" font-weight="800" font-family="Arial,sans-serif" fill="#c0392b" text-anchor="middle">${esc(label)}</text>`;
  }
  function barSvg(st) {
    const W = 300, X0 = 8, TW = W - 16;
    const svg = (h, inner) => `<svg viewBox="0 0 ${W} ${h}" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
    const { a, b, o } = st;
    if (o === "+") {
      const wa = Math.max(0.2, a / (a + b)) * TW, wb = TW - wa;
      return svg(70, brace(X0, X0 + TW, 18, "?") + box(X0, 30, wa, 32, "#cfe8ff", fmt(a)) + box(X0 + wa, 30, wb, 32, "#ffe3bf", fmt(b)));
    }
    if (o === "-") {
      const wb = Math.min(0.75, Math.max(0.2, b / a)) * TW, wl = TW - wb;
      return svg(70, box(X0, 6, TW, 22, "#cfe8ff", fmt(a)) + box(X0, 34, wl, 28, "#fff3c4", "?") + box(X0 + wl, 34, wb, 28, "#ffd0d0", "−" + fmt(b)));
    }
    if (o === "*") {
      const cnt = Math.min(a, b), size = Math.max(a, b), show = Math.min(cnt, 8), bw = Math.min(70, (TW - 4) / (show + (cnt > show ? 1 : 0)));
      let s = brace(X0, X0 + bw * (show + (cnt > show ? 1 : 0)), 20, "?");
      for (let i = 0; i < show; i++) s += box(X0 + i * bw, 32, bw - 3, 32, i % 2 ? "#e4f7d9" : "#cfe8ff", fmt(size), size >= 1000 ? 10 : 12);
      if (cnt > show) s += `<text x="${X0 + show * bw + bw / 2}" y="54" font-size="20" font-weight="800" fill="${INK}" text-anchor="middle">…</text>`;
      return svg(70, s);
    }
    // division: split a into b equal parts (small b) or count how many b fit in a
    if (b <= 8) {
      const bw = TW / b;
      let s = box(X0, 6, TW, 20, "#cfe8ff", fmt(a));
      for (let i = 0; i < b; i++) s += box(X0 + i * bw, 32, bw - 3, 30, "#fff3c4", "?");
      return svg(70, s);
    }
    let s = box(X0, 6, TW, 20, "#cfe8ff", fmt(a));
    for (let i = 0; i < 3; i++) s += box(X0 + i * 62, 32, 59, 30, "#fff3c4", fmt(b), 11);
    s += `<text x="${X0 + 3 * 62 + 14}" y="54" font-size="20" font-weight="800" fill="${INK}">… ?</text>`;
    return svg(70, s);
  }

  /* ---------- explain after a wrong answer ---------- */
  function explainHtml(step) {
    try {
      const ex = exprOf(step); if (!ex) return "";
      const ws = workSteps(ex); if (!ws.length) return "";
      const rows = ws.map((s, i) => `<div class="sh-row"><div class="sh-line">${ws.length > 1 ? "Step " + (i + 1) + ": " : ""}<b>${fmt(s.a)} ${SYM[s.o]} ${fmt(s.b)} = ${fmt(s.v)}</b></div>${i < 3 ? barSvg(s) : ""}</div>`).join("");
      return `<div class="sh-explain"><div class="sh-title">💡 Here is how to work it out</div>${rows}</div>`;
    } catch (e) { return ""; }
  }

  /* ---------- hint ladder ---------- */
  const CLUES = [
    [/\b(altogether|in total|in all|together|more|how many .* now|both|combined)\b/i, "add", "words like “altogether”, “in total” or “more” usually mean ADD"],
    [/\b(left|gives?|gave|spends?|spent|loses?|lost|sold|eaten|pop|leak|cuts? off|lends?|still|empty|change|older|difference|remain)/i, "subtract", "words like “left”, “gives away” or “change” usually mean SUBTRACT"],
    [/\b(each|every|per|packs?|rows? of|groups? of|boxes? of|bags? with|trays?|costs? .* each)\b/i, "multiply", "“each”, “every” or equal groups usually mean MULTIPLY"],
    [/\b(equally|shared?|split|divided?|into .* (bags|boxes|baskets|groups|teams|pieces|albums)|how many (can|pens|rows|days)|per child|each friend get)/i, "divide", "“shared equally” or “split into” usually mean DIVIDE"]
  ];
  function clue(prompt) { const hit = CLUES.find(c => c[0].test(prompt)); return hit ? hit[2] : "Read the story again slowly and ask: what is the question asking for?"; }
  function numbersHtml(prompt) { return esc(prompt).replace(/\d[\d,]*/g, m => `<mark class="sh-num">${m}</mark>`); }

  function attach(step, opts) {
    opts = opts || {};
    const old = document.getElementById("story-help"); if (old) old.remove();
    const ex = exprOf(step); if (!ex) return;
    let ws; try { ws = workSteps(ex); } catch (e) { return; }
    if (!ws.length) return;
    const promptEl = document.getElementById("typein-prompt"); if (!promptEl) return;
    const wrap = document.createElement("div"); wrap.id = "story-help"; wrap.className = "sh-wrap";
    wrap.innerHTML = `<button type="button" class="sh-btn">💡 Bo, help me!</button><div class="sh-body"></div>`;
    promptEl.insertAdjacentElement("afterend", wrap);
    const btn = wrap.querySelector(".sh-btn"), body = wrap.querySelector(".sh-body");
    let level = 0;
    const first = ws[0];
    btn.onclick = () => {
      level++;
      if (opts.onHelp) try { opts.onHelp(level); } catch (e) {}
      if (level === 1) {
        promptEl.innerHTML = numbersHtml(step.prompt);
        body.innerHTML = `<div class="sh-msg">🔎 Look at the <mark class="sh-num">numbers</mark>. Clue: ${esc(clue(step.prompt))}.</div>`;
        btn.textContent = "💡 Next hint";
      } else if (level === 2) {
        const first1 = ws.length > 1 ? "first " : "";
        body.innerHTML = `<div class="sh-msg">🤔 Which operation do you do ${first1}to solve it?</div><div class="sh-ops">${["+", "-", "*", "/"].map(o => `<button type="button" class="sh-op" data-o="${o}">${OPNAME[o]}</button>`).join("")}</div><div class="sh-msg sh-fb"></div>`;
        btn.style.display = "none";
        body.querySelectorAll(".sh-op").forEach(b => b.onclick = () => {
          const ok = b.dataset.o === first.o, fb = body.querySelector(".sh-fb");
          if (ok) { body.querySelectorAll(".sh-op").forEach(x => x.disabled = true); b.classList.add("ok"); fb.textContent = "Yes! 🎉 Now picture it:"; btn.style.display = ""; btn.textContent = "💡 Show me a picture"; }
          else { b.classList.add("bad"); fb.textContent = "Not quite. Think about the clue words and try again."; }
        });
      } else if (level === 3) {
        body.insertAdjacentHTML("beforeend", `<div class="sh-row">${barSvg(first)}<div class="sh-line"><b>${fmt(first.a)} ${SYM[first.o]} ${fmt(first.b)} = ?</b></div></div>`);
        btn.textContent = "Now you try! ✍️"; btn.disabled = true;
      }
    };
  }
  function remove() { const el = document.getElementById("story-help"); if (el) el.remove(); }

  const api = { parse, workSteps, barSvg, explainHtml, clue, numbersHtml, attach, remove, fmt };
  root.AIGStoryHelp = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
