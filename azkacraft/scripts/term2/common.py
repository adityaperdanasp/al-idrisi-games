"""Shared helpers for the Term 2 Language Arts question bank (azkacraft/questions.json).
Run build.py to regenerate; validate.py checks structure. Seeded RNG -> deterministic output."""
import random, json
rng = random.Random(20261013)

def shuffled(xs):
    xs = list(xs); rng.shuffle(xs); return xs

def mc(prompt, answer, wrong, minwrong=2, **kw):
    wrong = [w for w in dict.fromkeys(wrong) if w != answer]
    assert len(wrong) >= minwrong, (prompt, wrong)
    opts = shuffled([answer] + wrong[:3])
    q = {"type": "mc", "prompt": prompt, "options": opts, "answer": answer}
    q.update(kw); return q

def fill(prompt, answer, **kw):
    q = {"type": "fill", "prompt": prompt, "answer": answer}; q.update(kw); return q

def match(prompt, pairs, **kw):
    q = {"type": "match", "prompt": prompt, "pairs": [{"left": a, "right": b} for a, b in pairs]}; q.update(kw); return q

def flash(word, definition, example):
    return {"type": "flashcard", "word": word, "definition": definition, "example": example}

def sb(words, prompt="Put the words in order to make a sentence.", answer=None, **kw):
    q = {"type": "sentence-builder", "prompt": prompt, "words": shuffled(words), "answer": answer or " ".join(words)}
    q.update(kw); return q

def passage(pid, title, paragraphs):
    return {"type": "passage", "passageId": pid, "title": title, "body": "".join("<p>%s</p>" % p for p in paragraphs)}

def lines(*ls):
    return "<br>".join(ls)

def pick(pool, n, exclude=()):
    pool = [p for p in pool if p not in exclude]
    return rng.sample(pool, min(n, len(pool)))
