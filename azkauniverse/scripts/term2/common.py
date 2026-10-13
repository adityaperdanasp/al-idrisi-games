"""Helpers for the Term 2 Science & Social Studies bank (azkauniverse/questions.json).
Run build.py to regenerate + validate. Seeded RNG -> deterministic output."""
import random, math
rng = random.Random(20261014)

def shuffled(xs):
    xs = list(xs); rng.shuffle(xs); return xs

def pick(pool, n, exclude=()):
    pool = [p for p in dict.fromkeys(pool) if p not in exclude]
    return rng.sample(pool, min(n, len(pool)))

def mc(question, answer, wrong, minwrong=2, image=None, **kw):
    wrong = [w for w in dict.fromkeys(wrong) if w != answer]
    assert len(wrong) >= minwrong, (question, wrong)
    opts = shuffled([answer] + wrong[:3])
    q = {"type": "mc", "question": question, "options": opts, "answer": opts.index(answer)}
    if image: q["image"] = image
    q.update(kw); return q

def fill(question, answer, acceptable=None, image=None):
    acc = [a.lower() for a in (acceptable or [])]
    if answer.lower() not in acc: acc.insert(0, answer.lower())
    q = {"type": "fill", "question": question, "answer": answer.lower() if answer.islower() else answer, "acceptable": acc}
    if image: q["image"] = image
    return q

def match(prompt, pairs):
    return {"type": "match", "prompt": prompt, "pairs": [{"term": a, "match": b} for a, b in pairs]}

def flash(front, back):
    return {"type": "flashcard", "front": front, "back": back}

# ---------- tiny SVG toolkit ----------
INK = "#201a3e"
def svg(w, h, inner, shown_w=None):
    sw = shown_w or w
    return '<svg viewBox="0 0 %d %d" width="%d" height="%d" xmlns="http://www.w3.org/2000/svg" role="img">%s</svg>' % (w, h, sw, int(sw * h / w), inner)

def T(x, y, s, size=13, bold=True, fill=INK, anchor="middle"):
    return '<text x="%s" y="%s" font-size="%s" font-family="Arial,Helvetica,sans-serif" font-weight="%s" fill="%s" text-anchor="%s">%s</text>' % (x, y, size, 800 if bold else 400, fill, anchor, s)

def box(x, y, w, h, fill="#fff", stroke=INK, sw=2, rx=8):
    return '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (x, y, w, h, rx, fill, stroke, sw)

def line(x1, y1, x2, y2, c=INK, w=2, dash=None):
    return '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"%s/>' % (x1, y1, x2, y2, c, w, (' stroke-dasharray="%s"' % dash) if dash else "")

def circle(cx, cy, r, fill="#fff", stroke="none", sw=0):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (cx, cy, r, fill, stroke, sw)

def energy_chain(labels, blank=None):
    """Vertical chain of boxes joined by arrows. `blank` = index shown as '?'."""
    n = len(labels); bh, gap, w = 30, 22, 220
    h = n * bh + (n - 1) * gap + 16
    s = ""
    for i, lab in enumerate(labels):
        y = 8 + i * (bh + gap)
        q = (i == blank)
        s += box(10, y, w - 20, bh, "#fff3d6" if not q else "#ffe0e0", INK, 2)
        s += T(w / 2, y + 20, "?" if q else lab, 13)
        if i < n - 1:
            ya = y + bh
            s += line(w / 2, ya + 2, w / 2, ya + gap - 6, INK, 2) + '<polygon points="%s,%s %s,%s %s,%s" fill="%s"/>' % (w / 2 - 5, ya + gap - 8, w / 2 + 5, ya + gap - 8, w / 2, ya + gap - 1, INK)
    return svg(w, h, s)

def moon_phase(k, waxing=True, r=34, letter=None, label=None, cx=None, cy=None, raw=False):
    """k = lit fraction 0..1 (0 new, .5 half, 1 full). Waxing = lit on the right (as in the school workbook)."""
    cx = cx if cx is not None else 50; cy = cy if cy is not None else 50
    s = '<g%s>' % ("" if waxing else ' transform="translate(%s,0) scale(-1,1)"' % (2 * cx))
    s += circle(cx, cy, r, "#2d3550", "#9aa3c2", 1.5)
    if k >= 0.999:
        s += circle(cx, cy, r, "#f4f1d0")
    elif k > 0.001:
        rx = abs(1 - 2 * k) * r
        sweep = 1 if k > 0.5 else 0
        s += '<path d="M %s %s A %s %s 0 0 1 %s %s A %s %s 0 0 %s %s %s Z" fill="#f4f1d0"/>' % (cx, cy - r, r, r, cx, cy + r, rx, r, sweep, cx, cy - r)
    s += '</g>'
    if letter: s += T(cx, cy + r + 16, letter, 14)
    if label: s += T(cx, cy + r + 16, label, 11)
    return s if raw else svg(100, 100, s, 130)

PHASES = [("New Moon", 0, True), ("Waxing Crescent", 0.25, True), ("First Quarter", 0.5, True), ("Waxing Gibbous", 0.75, True),
          ("Full Moon", 1, True), ("Waning Gibbous", 0.75, False), ("Third Quarter", 0.5, False), ("Waning Crescent", 0.25, False)]

def moon_cycle(letters=True, hide=None):
    s = ""
    for i, (name, k, wax) in enumerate(PHASES):
        x = 35 + (i % 4) * 70; y = 36 + (i // 4) * 88
        s += moon_phase(k, wax, 25, letter=("ABCDEFGH"[i] if letters else None), cx=x, cy=y, raw=True)
    return svg(300, 190, s)

def eclipse_diagram(kind):
    """kind 'solar' = Sun - Moon - Earth ; 'lunar' = Sun - Earth - Moon."""
    s = circle(40, 60, 30, "#ffd23f", "#e8912e", 2) + T(40, 108, "Sun", 11)
    if kind == "solar":
        s += '<polygon points="130,56 215,38 215,82 130,64" fill="#9aa3c2" opacity="0.55"/>'
        s += circle(130, 60, 7, "#8d93a8", INK, 1.5) + T(130, 84, "Moon", 11)
        s += circle(232, 60, 18, "#4aa3df", INK, 2) + T(232, 96, "Earth", 11)
    else:
        s += circle(120, 60, 18, "#4aa3df", INK, 2) + T(120, 96, "Earth", 11)
        s += '<polygon points="138,48 215,36 215,84 138,72" fill="#9aa3c2" opacity="0.55"/>'
        s += circle(232, 60, 8, "#c0392b", INK, 1.5) + T(232, 84, "Moon", 11)
    s += line(72, 60, 100 if kind == "lunar" else 120, 60, "#e8912e", 2, "4 4")
    return svg(270, 112, s)

def eclipse_pair():
    a = eclipse_diagram("solar"); b = eclipse_diagram("lunar")
    # embed both diagrams stacked with labels A and B
    def inner(sv): return sv[sv.index(">") + 1: sv.rindex("</svg>")]
    return svg(270, 250, '<g>%s</g><g transform="translate(0,130)">%s</g>%s%s' % (inner(a), inner(b), T(14, 20, "A", 15), T(14, 150, "B", 15)))

def shadow_times():
    """A = morning (long shadow, right), B = midday (short), C = late afternoon (long shadow, left)."""
    s = ""
    for i, (lab, sun, sh, d) in enumerate([("A", (14, 52), 46, 1), ("B", (50, 18), 8, 1), ("C", (86, 52), 46, -1)]):
        ox = 8 + i * 98
        base = 124
        s += line(ox, base, ox + 90, base, "#7a6a4f", 3)
        px = ox + 45
        s += line(px, base, px + d * sh, base, "#555", 7)
        s += line(px, base, px, base - 34, INK, 5) + circle(px, base - 40, 7, "#f2c9a0", INK, 1.5)
        s += circle(ox + sun[0], sun[1], 9, "#ffd23f", "#e8912e", 2)
        s += T(px, 150, lab, 14)
    return svg(300, 160, s)

def eye_diagram():
    s = circle(150, 100, 70, "#ffffff", INK, 3)
    s += '<path d="M 86 66 Q 52 100 86 134" fill="#d8efff" stroke="#3f7fd0" stroke-width="3"/>'          # cornea (A)
    s += '<rect x="90" y="62" width="9" height="26" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="1.5"/><rect x="90" y="112" width="9" height="26" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="1.5"/>'  # iris (B)
    s += '<rect x="90" y="88" width="9" height="24" fill="#111"/>'                                         # pupil (C)
    s += '<ellipse cx="118" cy="100" rx="11" ry="24" fill="#cfe8ff" stroke="#3f7fd0" stroke-width="2"/>'    # lens (D)
    s += '<path d="M 194 56 A 62 62 0 0 1 194 144" fill="none" stroke="#e4572e" stroke-width="7"/>'        # retina (E)
    s += '<rect x="216" y="106" width="44" height="16" rx="6" fill="#f7c948" stroke="#b78a00" stroke-width="2"/>'  # optic nerve (F)
    for (x1, y1, x2, y2, L) in [(66, 100, 30, 100, "A"), (94, 64, 70, 28, "B"), (94, 100, 40, 150, "C"), (118, 76, 132, 28, "D"), (198, 68, 238, 36, "E"), (240, 122, 262, 160, "F")]:
        s += line(x1, y1, x2, y2, "#777", 1.4) + T(x2 + (-8 if x2 < x1 else 8), y2 + (4 if L in "AC" else (-4 if L in "BDE" else 14)), L, 15)
    return svg(290, 190, s)
