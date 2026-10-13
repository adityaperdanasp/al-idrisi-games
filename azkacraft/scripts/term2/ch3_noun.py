from common import *

TERMS = [
    ("Common noun", "A general name for a person, place or thing.", "cat, hand, forest, cup, book"),
    ("Proper noun", "The special name of a particular person, place or thing - it always starts with a capital letter.", "Lucy, London, Spain, Xbox"),
    ("Abstract noun", "A noun for something you cannot touch, see or hold - like a feeling or idea.", "love, anger, trust, happiness"),
    ("Collective noun", "A word for a group of people, animals or things.", "a herd of cattle, a pack of wolves, a flock of birds"),
    ("Compound noun", "A noun made from two smaller words joined together.", "farmhouse, snowfall, newspaper, fishbowl"),
    ("Concrete noun", "A noun for something you can see, touch, hear, smell or taste.", "book, cup, rain, pizza"),
]
PROPER = ["Rob", "Tim", "Lucy", "Alice", "England", "London", "Wales", "Spain", "Ireland", "France", "Devon", "Barbie", "Sony", "Tesco", "Ribena", "Cadbury's", "Xbox", "Mia", "Indonesia", "Jakarta", "Monday", "Ramadan"]
COMMON = ["cat", "hand", "place", "cup", "log", "book", "room", "forest", "child", "man", "teacher", "river", "table", "mountain", "garden", "window", "girl"]
ABSTRACT = ["anger", "love", "trust", "faith", "fear", "hate", "pride", "happiness", "luck", "life", "skill", "courage", "kindness", "freedom", "honesty", "joy"]
COLLECT = [("herd", "cattle"), ("pack", "wolves"), ("gaggle", "geese"), ("hive", "bees"), ("litter", "kittens"), ("flock", "sheep"), ("fleet", "ships"), ("army", "ants"),
           ("range", "mountains"), ("pod", "dolphins"), ("swarm", "bees"), ("bunch", "flowers"), ("crowd", "people"), ("pride", "lions"), ("school", "fish"), ("bouquet", "flowers")]
COMPOUND = ["armpit", "farmhouse", "snowfall", "eyelid", "newspaper", "fishbowl", "catfish", "cowboy", "snowball", "teaspoon", "barman", "toothbrush", "football", "sunflower", "rainbow", "bedroom"]
CONCRETE = ["book", "cup", "rain", "pizza", "dog", "chair", "mountain", "teaspoon", "river", "bicycle"]
SENT = [("Mia found a comfortable spot to lay out our towels.", "Mia", "proper"), ("We arrived at the beach early in the morning.", "beach", "common"),
        ("A group of children built sandcastles near the water.", "group", "collective"), ("She felt a sense of happiness as we chatted.", "happiness", "abstract"),
        ("The seagulls flew overhead.", "seagulls", "common"), ("It was a day of joy and relaxation.", "joy", "abstract"),
        ("London is the capital of England.", "London", "proper"), ("A pack of wolves howled at the moon.", "pack", "collective"),
        ("Her courage surprised everyone.", "courage", "abstract"), ("We visited Jakarta last Ramadan.", "Jakarta", "proper")]
TYPENAME = {"proper": "Proper noun", "common": "Common noun", "abstract": "Abstract noun", "collective": "Collective noun", "compound": "Compound noun", "concrete": "Concrete noun"}

def build():
    Q = [flash(w, d, "Examples: " + e) for w, d, e in TERMS]
    for w, d, e in TERMS:
        others = [t for t in TERMS if t[0] != w]
        Q.append(mc("What is a %s?" % w.lower(), d, [o[1] for o in pick(others, 3)]))
    four = ["Common noun", "Proper noun", "Abstract noun", "Collective noun"]
    for w in PROPER:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Proper noun", ["Common noun", "Abstract noun", "Collective noun"]))
    for w in COMMON[:14]:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Common noun", ["Proper noun", "Abstract noun", "Collective noun"]))
    for w in ABSTRACT:
        Q.append(mc("What type of noun is <b>%s</b>?" % w, "Abstract noun", ["Common noun", "Proper noun", "Collective noun"]))
    for h, w in COLLECT:
        Q.append(mc("What type of noun is <b>%s</b> in \"a %s of %s\"?" % (h, h, w), "Collective noun", ["Common noun", "Proper noun", "Abstract noun"]))
    for w in COMPOUND:
        Q.append(mc("What type of noun is <b>%s</b>? (two words joined together)" % w, "Compound noun", ["Proper noun", "Abstract noun", "Collective noun"]))
    # which of these is...
    for _ in range(6):
        Q.append(mc("Which of these is a <b>proper noun</b>?", rng.choice(PROPER), pick(COMMON, 2) + pick(ABSTRACT, 1)))
        Q.append(mc("Which of these is an <b>abstract noun</b>?", rng.choice(ABSTRACT), pick(COMMON, 2) + pick(PROPER, 1)))
        Q.append(mc("Which of these is a <b>compound noun</b>?", rng.choice(COMPOUND), pick(COMMON, 2) + pick(ABSTRACT, 1)))
        Q.append(mc("Which of these is a <b>common noun</b>?", rng.choice(COMMON), pick(PROPER, 2) + pick(ABSTRACT, 1)))
    Q.append(mc("Which noun can you NOT touch?", "love", ["table", "dog", "spoon"]))
    Q.append(mc("Which noun can you NOT touch?", "trust", ["river", "book", "bicycle"]))
    Q.append(mc("Which noun is a concrete noun?", "chair", ["anger", "faith", "pride"]))
    Q.append(mc("Which noun is a concrete noun?", "pizza", ["luck", "skill", "life"]))
    Q.append(mc("Which is an abstract noun, not a concrete noun?", "happiness", ["rain", "cup", "mountain"]))
    # in a sentence
    for s, w, t in SENT:
        Q.append(mc("What type of noun is <b>%s</b> in this sentence?<br><i>%s</i>" % (w, s), TYPENAME[t], [x for x in four if x != TYPENAME[t]]))
    Q.append(mc("Which word in the sentence is a PROPER noun?<br><i>Lucy took a photo of the mountain in Spain.</i>", "Lucy", ["photo", "mountain", "took"]))
    Q.append(mc("Which word in the sentence is an ABSTRACT noun?<br><i>She showed great courage on the stage.</i>", "courage", ["stage", "showed", "great"]))
    Q.append(mc("Which word in the sentence is a COLLECTIVE noun?<br><i>A flock of birds flew over the school.</i>", "flock", ["birds", "school", "flew"]))
    Q.append(mc("Which word in the sentence is a COMPOUND noun?<br><i>We watched the snowfall from the farmhouse window.</i>", "snowfall", ["watched", "from", "window"]))
    # collective matches
    for grp in (COLLECT[:4], COLLECT[4:8], COLLECT[8:12], COLLECT[12:16], pick(COLLECT, 4)):
        Q.append(match("Match each collective noun to the group it belongs with.", [(("a %s of" % h), w) for h, w in grp]))
    for h, w in COLLECT[:10]:
        Q.append(mc("A <b>%s</b> of ___" % h, w, [x for _, x in pick([c for c in COLLECT if c[1] != w], 3)]))
    # classify match
    Q.append(match("Match each noun to its type.", [("London", "Proper noun"), ("anger", "Abstract noun"), ("herd", "Collective noun"), ("farmhouse", "Compound noun")]))
    Q.append(match("Match each noun to its type.", [("Spain", "Proper noun"), ("trust", "Abstract noun"), ("pod", "Collective noun"), ("snowball", "Compound noun")]))
    Q.append(match("Match each noun to its type.", [("Lucy", "Proper noun"), ("happiness", "Abstract noun"), ("hive", "Collective noun"), ("cowboy", "Compound noun")]))
    Q.append(sb(["A", "pack", "of", "wolves", "howled"], answer="A pack of wolves howled"))
    Q.append(sb(["Love", "and", "trust", "are", "abstract", "nouns"], answer="Love and trust are abstract nouns"))
    return Q
