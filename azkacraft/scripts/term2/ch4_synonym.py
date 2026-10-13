from common import *

PAIRS = [("happy", "joyful"), ("big", "large"), ("small", "little"), ("fast", "quick"), ("angry", "mad"), ("smart", "clever"), ("beautiful", "pretty"), ("begin", "start"),
         ("quiet", "silent"), ("easy", "simple"), ("funny", "amusing"), ("sick", "ill"), ("cold", "chilly"), ("yummy", "delicious"), ("honest", "trustworthy"), ("journey", "trip"),
         ("money", "cash"), ("zero", "nothing"), ("region", "zone"), ("fun", "enjoyable"), ("scared", "frightened"), ("yell", "shout"), ("run", "sprint"), ("smile", "grin"),
         ("correct", "right"), ("tired", "sleepy"), ("huge", "enormous"), ("ugly", "hideous"), ("soaked", "drenched"), ("delighted", "thrilled"), ("thief", "burglar"),
         ("walk", "stroll"), ("present", "gift"), ("tiny", "small"), ("hard", "difficult"), ("tasty", "delicious"), ("shiny", "bright"), ("sad", "unhappy"), ("rich", "wealthy"),
         ("brave", "courageous"), ("choose", "pick"), ("end", "finish"), ("look", "stare"), ("kind", "caring"), ("clean", "spotless"), ("old", "ancient"), ("rude", "impolite"),
         ("jump", "leap"), ("tall", "high"), ("nice", "pleasant")]
ANT = {"happy": "sad", "big": "tiny", "small": "huge", "fast": "slow", "angry": "calm", "smart": "silly", "beautiful": "ugly", "begin": "finish", "quiet": "loud", "easy": "hard",
       "funny": "serious", "cold": "hot", "tired": "awake", "huge": "tiny", "hard": "easy"}
NOT_SYN = [("big", "tiny"), ("fast", "slow"), ("beautiful", "ugly"), ("difficult", "easy"), ("happy", "sad"), ("hot", "cold"), ("quiet", "loud"), ("old", "new"), ("brave", "scared"), ("rich", "poor")]
SENT = [("Susan saw a <b>large</b> dog jump over the fence.", "large", "huge", ["tiny", "slow", "sad"]), ("Robert went home early because he felt <b>sick</b>.", "sick", "ill", ["happy", "huge", "hilarious"]),
        ("The <b>thief</b> stole the jewels from the bank.", "thief", "burglar", ["gift", "stroll", "tiny"]), ("On Sunday, the family went for a <b>walk</b> in the woods.", "walk", "stroll", ["burglar", "gift", "ill"]),
        ("Anna wrapped up the <b>present</b> to give to her sister.", "present", "gift", ["stroll", "ill", "tiny"]), ("A <b>small</b> mouse ran behind the couch.", "small", "tiny", ["huge", "delicious", "difficult"]),
        ("Do you know any <b>funny</b> jokes?", "funny", "hilarious", ["tiny", "ill", "difficult"]), ("Max was <b>delighted</b> to win a prize.", "delighted", "thrilled", ["ill", "tiny", "huge"]),
        ("It was <b>hard</b> to get the children to leave the party.", "hard", "difficult", ["tiny", "gift", "stroll"]), ("The chocolate cake looked extremely <b>tasty</b>.", "tasty", "delicious", ["huge", "ill", "tiny"]),
        ("The boy is <b>smart</b>.", "smart", "clever", ["slow", "tiny", "loud"]), ("The elephant is <b>big</b>.", "big", "large", ["tiny", "quiet", "slow"]),
        ("Sarah was <b>happy</b> about her birthday.", "happy", "joyful", ["silent", "ill", "simple"]), ("The rabbit is <b>fast</b>.", "fast", "quick", ["slow", "silent", "tiny"]),
        ("The classroom was <b>quiet</b>.", "quiet", "silent", ["quick", "large", "joyful"]), ("The question was <b>easy</b>.", "easy", "simple", ["large", "silent", "joyful"]),
        ("Ali is a <b>smart</b> student.", "smart", "clever", ["quick", "large", "silent"]), ("The kitten felt <b>tired</b> after playing.", "tired", "sleepy", ["quick", "huge", "angry"]),
        ("The soup was <b>cold</b>.", "cold", "chilly", ["spicy", "silent", "huge"]), ("The brave firefighter rescued the cat.", "brave", "courageous", ["scared", "tiny", "lazy"])]
GOOD = [("My dad is a ___ cook.", "great", ["terrible", "tiny", "silent"]), ("I am ___ at ballet.", "excellent", ["terrible", "ill", "slow"]), ("My favourite subject is art; it is ___.", "wonderful", ["awful", "horrid", "dull"]),
        ("My best friend is a ___ person.", "kind", ["rude", "mean", "grumpy"])]

EXTRA = [("big", "huge"), ("large", "huge"), ("big", "enormous"), ("huge", "tiny_no"), ("happy", "delighted"), ("joyful", "thrilled"), ("delighted", "thrilled"), ("funny", "hilarious"),
         ("amusing", "hilarious"), ("pretty", "lovely"), ("mad", "furious"), ("angry", "furious"), ("kind", "nice"), ("pleasant", "nice"), ("tall", "high")]
_parent = {}
def _find(x):
    _parent.setdefault(x, x)
    while _parent[x] != x:
        _parent[x] = _parent[_parent[x]]; x = _parent[x]
    return x
for _a, _b in PAIRS + EXTRA:
    _parent[_find(_a)] = _find(_b)
def related(w, other):
    return _find(w) == _find(other)

def build():
    Q = [flash("Synonym", "Words that have the same or nearly the same meaning.", "happy and joyful are synonyms; so are big and large."),
         flash("Antonym", "Words that have opposite meanings.", "hot and cold are antonyms - the opposite of synonyms."),
         flash("Thesaurus", "A book (or website) that lists synonyms for words.", "I looked in a thesaurus to find another word for 'big'.")]
    Q.append(mc("What is a synonym?", "A word with the same or nearly the same meaning", ["A word with the opposite meaning", "A word that sounds the same", "A word that rhymes"]))
    Q.append(mc("What is an antonym?", "A word with the opposite meaning", ["A word with the same meaning", "A word that rhymes", "A very long word"]))
    Q.append(mc("Do synonyms always mean EXACTLY the same thing?", "No - their meanings are very similar", ["Yes, always exactly", "No - they are opposites", "They never mean anything alike"]))
    allwords = [w for p in PAIRS for w in p]
    for a, b in PAIRS:
        wrong = [ANT[a]] if a in ANT else []
        wrong += pick([w for w in allwords if not related(w, a) and w != ANT.get(a)], 3)
        Q.append(mc("Which word has a similar meaning to <b>%s</b>?" % a, b, wrong))
        wrong2 = [ANT[b]] if b in ANT else []
        wrong2 += pick([w for w in allwords if not related(w, b) and w != ANT.get(b)], 3)
        if rng.random() < 0.6:
            Q.append(mc("Which is a synonym for <b>%s</b>?" % b, a, wrong2))
    for i in range(0, 48, 4):
        Q.append(match("Match each word with its synonym.", PAIRS[i:i + 4]))
    for p, w, s, wrong in SENT:
        Q.append(mc("Choose the word that means the same as the <b>bold</b> word and still makes sense:<br><i>%s</i>" % p, s, wrong))
    for p, a, w in GOOD:
        Q.append(mc("Choose the best word:<br><i>%s</i>" % p, a, w))
    for a, b in PAIRS[:20]:
        Q.append(mc("Synonym or not?<br><b>%s</b> - <b>%s</b>" % (a, b), "Synonyms", ["Not synonyms"], minwrong=1))
    for a, b in NOT_SYN:
        Q.append(mc("Synonym or not?<br><b>%s</b> - <b>%s</b>" % (a, b), "Not synonyms", ["Synonyms"], minwrong=1))
    for a, b in PAIRS[:12]:
        Q.append(fill("Type a synonym for <b>%s</b> from this list: %s" % (a, ", ".join(shuffled([b] + pick([w for w in allwords if not related(w, a)], 3)))), b))
    return Q
