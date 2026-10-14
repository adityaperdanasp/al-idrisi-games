"""Chapter 3 (Types of Noun) -- second batch: new word lists, concrete vs abstract, collective, compound, nouns in sentences."""
from common import *

PROPER = ["Bali", "Surabaya", "Java", "Sumatra", "Borobudur", "Bandung", "Yogyakarta", "Sunday", "Friday", "December", "April", "Mount Bromo", "Komodo", "Pacific Ocean", "Asia",
          "Australia", "Singapore", "Tokyo", "Lego", "Google", "Toyota", "Nike", "Nadia", "Rafi", "Mr Rahman", "Mrs Putri"]
COMMON = ["lake", "island", "pencil", "bridge", "doctor", "street", "market", "kitchen", "tiger", "mango", "sofa", "bus", "ladder", "pillow", "farmer", "cloud", "museum", "bottle"]
ABSTRACT = ["bravery", "sadness", "hope", "wisdom", "peace", "friendship", "honesty", "patience", "laughter", "danger", "beauty", "childhood", "strength", "silence", "jealousy", "curiosity"]
CONCRETE_ONLY = ["apple", "drum", "desk", "bicycle", "umbrella", "window", "candle", "river", "button", "ladder", "kite", "scarf"]
COLLECT = [("troop", "monkeys"), ("colony", "ants"), ("herd", "elephants"), ("crew", "sailors"), ("choir", "singers"), ("team", "players"), ("bundle", "sticks"), ("set", "tools"),
           ("pile", "books"), ("class", "students"), ("flock", "geese"), ("bunch", "grapes"), ("band", "musicians"), ("cluster", "stars"), ("shoal", "fish"), ("audience", "listeners")]
COMPOUND = [("sun", "flower", "sunflower"), ("rain", "coat", "raincoat"), ("tooth", "paste", "toothpaste"), ("book", "shelf", "bookshelf"), ("foot", "ball", "football"),
            ("air", "port", "airport"), ("moon", "light", "moonlight"), ("star", "fish", "starfish"), ("door", "bell", "doorbell"), ("water", "fall", "waterfall"),
            ("birth", "day", "birthday"), ("pop", "corn", "popcorn")]
SENT = [("Nadia visited Borobudur with her class.", "Borobudur", "proper"), ("A troop of monkeys climbed the tall tree.", "troop", "collective"), ("Her honesty made everyone trust her.", "honesty", "abstract"),
        ("The doctor wrote a note for the teacher.", "doctor", "common"), ("We watched the waterfall from the bridge.", "waterfall", "compound"), ("Singapore is a small island.", "Singapore", "proper"),
        ("The crew of sailors showed great bravery.", "crew", "collective"), ("He packed a toothbrush and a towel.", "toothbrush", "compound"), ("There was silence in the hall.", "silence", "abstract"),
        ("My brother left his umbrella on the bus.", "umbrella", "common"), ("The audience clapped for the band.", "audience", "collective"), ("I felt a lot of excitement before the match.", "excitement", "abstract")]
TYPENAME = {"proper": "Proper noun", "common": "Common noun", "abstract": "Abstract noun", "collective": "Collective noun", "compound": "Compound noun"}
FIVE = ["Proper noun", "Common noun", "Abstract noun", "Collective noun", "Compound noun"]
NOUN_OR_NOT = [("The dog ran across the park.", "dog", ["ran", "across", "the"]), ("A tiny bird sang a song.", "bird", ["tiny", "sang", "a"]), ("My mother baked a cake.", "mother", ["baked", "my", "a"]),
               ("Leo kicked the ball over the fence.", "ball", ["kicked", "over", "the"]), ("The river was cold and clear.", "river", ["was", "cold", "and"]), ("She opened the window slowly.", "window", ["opened", "slowly", "she"])]


def build():
    Q = [flash("Noun", "A word that names a person, place, thing or idea.", "teacher, Jakarta, football, kindness"),
         flash("Singular noun", "A noun that names ONE person, place or thing.", "a cat, a house, one orange"),
         flash("Plural noun", "A noun that names MORE than one thing - it often ends in -s.", "cats, houses, oranges")]
    Q.append(mc("What does a noun name?", "A person, place, thing or idea", ["An action", "A describing word", "A joining word"]))
    Q.append(mc("Which of these is a noun?", "kitchen", ["quickly", "jump", "beautiful"]))
    Q.append(mc("Which of these is a noun?", "teacher", ["happily", "run", "green"]))
    Q.append(mc("Which of these is a noun?", "friendship", ["bright", "slowly", "sing"]))
    Q.append(mc("Which word is a plural noun?", "oranges", ["orange", "an orange", "juicy"]))
    for sent, ans, wrong in NOUN_OR_NOT:
        Q.append(mc("Which word in the sentence is a noun?<br><i>%s</i>" % sent, ans, wrong))
    for w in PROPER:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Proper noun", ["Common noun", "Abstract noun", "Collective noun"]))
    for w in COMMON[:12]:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Common noun", ["Proper noun", "Abstract noun", "Collective noun"]))
    for w in ABSTRACT:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Abstract noun", ["Common noun", "Proper noun", "Collective noun"]))
    for h, w in COLLECT:
        CAT = {"troop": "a", "colony": "a", "herd": "a", "flock": "a", "shoal": "a", "crew": "p", "choir": "p", "team": "p", "class": "p", "band": "p", "audience": "p", "bundle": "t", "set": "t", "pile": "t", "bunch": "t", "cluster": "t"}
        Q.append(mc("Which collective noun completes the phrase? <i>a ___ of %s</i>" % w, h, [x for x, _ in pick([c for c in COLLECT if CAT[c[0]] != CAT[h]], 3)]))
    for a, b, whole in COMPOUND:
        Q.append(mc("Which compound noun is made from <b>%s</b> + <b>%s</b>?" % (a, b), whole, [w for _, _, w in pick([c for c in COMPOUND if c[2] != whole], 3)]))
    for a, b, whole in COMPOUND[:6]:
        Q.append(mc("<b>%s</b> is a compound noun. Which two words is it made of?" % whole, "%s + %s" % (a, b),
                    ["%s + %s" % (a, c[1]) for c in pick([c for c in COMPOUND if c[2] != whole], 3)]))
    # sentence types
    for s, w, t in SENT:
        Q.append(mc("What type of noun is <b>%s</b> in this sentence?<br><i>%s</i>" % (w, s), TYPENAME[t], [x for x in FIVE if x != TYPENAME[t]][:3]))
    # concrete vs abstract
    for w in CONCRETE_ONLY[:8]:
        Q.append(mc("Is <b>%s</b> a concrete noun or an abstract noun?" % w, "Concrete noun (you can see or touch it)", ["Abstract noun (you cannot touch it)"], minwrong=1))
    for w in ABSTRACT[:8]:
        Q.append(mc("Is <b>%s</b> a concrete noun or an abstract noun?" % w, "Abstract noun (you cannot touch it)", ["Concrete noun (you can see or touch it)"], minwrong=1))
    # odd one out
    for _ in range(6):
        Q.append(mc("Which word is NOT an abstract noun?", rng.choice(COMMON), pick(ABSTRACT, 3)))
        Q.append(mc("Which word is NOT a proper noun?", rng.choice(COMMON), pick(PROPER, 3)))
    for _ in range(4):
        Q.append(mc("Which of these is an abstract noun?", rng.choice(ABSTRACT), pick(COMMON, 3)))
        Q.append(mc("Which of these is a proper noun?", rng.choice(PROPER), pick(COMMON, 3)))
    # capitals with proper nouns
    Q.append(mc("Which sentence uses capital letters for proper nouns correctly?", "We flew to Bali on Friday.", ["We flew to bali on friday.", "We flew to Bali on friday.", "we flew to bali on Friday."]))
    Q.append(mc("Which sentence uses capital letters for proper nouns correctly?", "Rafi lives in Surabaya.", ["rafi lives in surabaya.", "Rafi lives in surabaya.", "rafi lives in Surabaya."]))
    Q.append(mc("Which sentence uses capital letters for proper nouns correctly?", "My birthday is in April.", ["My birthday is in april.", "my birthday is in April.", "My Birthday Is In April."]))
    Q.append(mc("Why does <b>Mount Bromo</b> start with capital letters?", "Because it is the name of a particular place", ["Because it is a long word", "Because it is a feeling", "Because it is a group"]))
    Q.append(mc("Why does <b>mountain</b> NOT need a capital letter in <i>We climbed a mountain</i>?", "Because it is a common noun, not a special name", ["Because it is short", "Because it is abstract", "Because it is plural"]))
    Q.append(match("Match each collective noun to its group.", [("a troop of", "monkeys"), ("a choir of", "singers"), ("a bunch of", "grapes"), ("a shoal of", "fish")]))
    Q.append(match("Match each collective noun to its group.", [("a colony of", "ants"), ("a crew of", "sailors"), ("a pile of", "books"), ("a band of", "musicians")]))
    Q.append(match("Match each noun to its type.", [("Bali", "Proper noun"), ("hope", "Abstract noun"), ("a team of", "Collective noun"), ("raincoat", "Compound noun")]))
    Q.append(match("Match each noun to its type.", [("Tokyo", "Proper noun"), ("bravery", "Abstract noun"), ("a flock of", "Collective noun"), ("doorbell", "Compound noun")]))
    Q.append(match("Match the two halves to make compound nouns.", [("sun", "flower"), ("rain", "coat"), ("tooth", "paste"), ("book", "shelf")]))
    Q.append(match("Match the two halves to make compound nouns.", [("foot", "ball"), ("air", "port"), ("moon", "light"), ("star", "fish")]))
    Q.append(sb(["A", "troop", "of", "monkeys", "swung", "from", "the", "trees"], answer="A troop of monkeys swung from the trees"))
    Q.append(sb(["Bravery", "and", "kindness", "are", "abstract", "nouns"], answer="Bravery and kindness are abstract nouns"))
    return Q
