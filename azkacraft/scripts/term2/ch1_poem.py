from common import *

TERMS = [
    ("Poem", "A piece of writing that uses words in a creative way to share ideas, feelings, experiences or stories.", "A poem can be about almost anything - even a little bird in a tree!"),
    ("Stanza", "A group of lines in a poem, like a paragraph (also called a verse).", "This poem has two stanzas, each with four lines."),
    ("Rhyme", "When words end with the same sound.", "Moon and spoon rhyme; so do tree and bee."),
    ("Rhythm", "The beat or pattern of sounds you hear when you read a poem aloud.", "The rhythm of 'The Midnight Train' sounds like clanking wheels."),
    ("Simile", "A comparison of two things using the word 'like' or 'as'.", "The snow is as white as cotton."),
    ("Personification", "Giving human actions or feelings to something that is not human.", "The wind whispered through the trees."),
    ("Haiku", "A short poem with 3 lines of 5, 7 and 5 syllables.", "A frog haiku: five syllables, then seven, then five."),
    ("Acrostic poem", "A poem where the first letter of each line spells out a word.", "R-A-I-N: Rumbling thunder / And flashes of light / In the dark clouds / Now it is pouring."),
    ("Syllable", "A beat in a word - the parts you clap. 'Frog' has 1; 'but-ter-fly' has 3.", "How many syllables are in 'elephant'? el-e-phant: three."),
    ("Mood", "The feeling a poem creates in the reader, like peaceful, scary or exciting.", "Soft words about a sleeping village create a peaceful mood."),
]

RHYMES = [
    ["moon", "spoon", "June", "tune", "balloon"], ["tree", "bee", "sea", "key", "knee"], ["light", "night", "kite", "bright", "flight"],
    ["cake", "lake", "make", "snake", "bake"], ["star", "car", "far", "jar", "guitar"], ["cat", "hat", "bat", "mat", "rat"],
    ["blue", "glue", "true", "shoe", "zoo"], ["day", "play", "stay", "way", "tray"], ["ball", "tall", "wall", "fall", "small"],
    ["rain", "train", "plane", "chain", "brain"], ["sun", "fun", "run", "bun", "done"], ["snow", "glow", "slow", "grow", "show"],
    ["bear", "chair", "hair", "pair", "stair"], ["boat", "coat", "goat", "note", "float"], ["clock", "rock", "sock", "block", "knock"],
    ["bed", "red", "head", "bread", "thread"], ["sing", "ring", "wing", "king", "spring"], ["frog", "log", "dog", "fog", "jog"],
    ["stream", "dream", "cream", "team", "beam"], ["hill", "still", "bill", "will", "chill"],
]

SIMILES = ["The snow is as white as cotton.", "The boy runs like a cheetah.", "The water is as cold as ice.", "The baby is as quiet as a mouse.",
           "The stars shine like diamonds.", "Her smile was as bright as the sun.", "He is as strong as an ox.", "The cat moved like a shadow.",
           "The road was as long as a snake.", "Her voice was as sweet as honey.", "The pillow felt like a soft cloud.", "He was as busy as a bee."]
PERSON = ["The sun smiled down on us.", "The flowers danced in the breeze.", "The clock shouted at me.", "The rain tapped on my window.",
          "The leaves waved goodbye.", "The moon watched over the sleeping village.", "The wind whispered through the trees.", "The old house groaned in the storm.",
          "The stars laughed in the sky.", "The river ran away to the sea.", "The tree stood tall and proud and waved at the birds.", "The clouds marched across the sky."]
PLAIN = ["The sun is hot.", "The flowers grew in the garden.", "The clock made a loud sound.", "The rain fell from the clouds.", "The leaves fell from the tree.",
         "The wind blew hard.", "The river is long.", "The moon is bright tonight.", "The house is very old.", "The stars came out at night.", "The cat sat on the mat.", "We walked to the park."]
METAPHOR = ["The classroom was a zoo.", "Time is a thief.", "The sea is a blanket of blue.", "Her eyes are stars."]

SIM_COMPLETE = [("The clouds are as white as ___.", "cotton", ["coal", "mud", "a rock"]), ("She runs like a ___.", "cheetah", ["snail", "stone", "pillow"]),
                ("The water is as cold as ___.", "ice", ["fire", "soup", "sand"]), ("The baby is as quiet as a ___.", "mouse", ["lion", "drum", "storm"]),
                ("The stars shine like ___.", "diamonds", ["mud", "stones", "coal"]), ("He is as strong as an ___.", "ox", ["ant", "feather", "mouse"]),
                ("The sun is as hot as a ___.", "furnace", ["fridge", "snowman", "cloud"]), ("The cat was as soft as a ___.", "pillow", ["rock", "nail", "brick"])]

POEMS = [
    ("The Little Boat", ["A little boat sails out to sea,", "Rocking gently, wild and free.", "The waves go splish, the gulls go cry,", "A silver moon climbs up the sky."],
     {"about": "A little boat sailing at night", "rhyme": ("sea", "free"), "mood": "Peaceful", "pers": None}),
    ("Rainy Day", ["The rain taps softly on my door,", "Then taps a little more and more.", "The puddles giggle in the street,", "And splash beneath my muddy feet."],
     {"about": "A rainy day", "rhyme": ("door", "more"), "mood": "Cheerful", "pers": "The puddles giggle in the street"}),
    ("The Night Train", ["The iron beast awakes from sleep,", "With heavy wheels that rumble deep.", "It roars across the sleeping land,", "As loud as thunder, strong and grand."],
     {"about": "A train travelling at night", "rhyme": ("sleep", "deep"), "mood": "Exciting", "sim": "As loud as thunder, strong and grand"}),
    ("My Garden", ["Red flowers bloom beside the wall,", "The sunflowers grow so very tall.", "The bees hum softly all day long,", "And every bird sings out a song."],
     {"about": "A garden full of flowers", "rhyme": ("wall", "tall"), "mood": "Happy", "pers": None}),
    ("The Moon", ["The moon is a lantern, hung up high,", "She watches the world from the dark night sky.", "She smiles on the sea and the sleepy town,", "Then slowly, quietly, she goes down."],
     {"about": "The moon at night", "rhyme": ("high", "sky"), "mood": "Peaceful", "pers": "She smiles on the sea and the sleepy town"}),
    ("A Bright New Day", ["The morning sun begins to rise,", "Golden light fills up the skies.", "Birds sing softly in the tree,", "A brand-new day is calling me."],
     {"about": "The start of a new day", "rhyme": ("rise", "skies"), "mood": "Happy", "pers": None}),
]

SYLL = [("frog", 1), ("pond", 1), ("sun", 1), ("garden", 2), ("water", 2), ("rainbow", 2), ("sunshine", 2), ("butterfly", 3), ("elephant", 3), ("banana", 3),
        ("umbrella", 3), ("tomorrow", 3), ("computer", 3), ("dragonfly", 3), ("beautiful", 3), ("caterpillar", 4), ("watermelon", 4), ("hippopotamus", 5), ("river", 2)]

ACRO = {"RAIN": ["Rumbling thunder in the sky", "Over the hills the clouds roll by", "Into puddles the drops fall", "Now the rain is over all"],
        "MOON": ["Mellow light above the town", "Over the hills it settles down", "Over the sea it gently glows", "Nightly watching as it goes"],
        "STAR": ["Shining brightly far away", "Twinkling at the end of day", "Always glowing in the night", "Reaching out with silver light"],
        "FROG": ["Floating on the pond so green", "Resting on a lily pad", "Ouch! A fly! He leaps again", "Gulp! The frog is very glad"],
        "TREE": ["Tall and green against the sky", "Roots that dig down deep and wide", "Every bird comes here to rest", "Each branch is a cosy nest"],
        "SNOW": ["Soft and white it drifts around", "Not a whisper, not a sound", "On the rooftops, on the ground", "Winter's blanket, all around"]}

def build():
    Q = []
    Q += [flash(w, d, e) for w, d, e in TERMS]
    # term definitions (both directions)
    for w, d, e in TERMS:
        others = [t for t in TERMS if t[0] != w]
        Q.append(mc("What is a %s?" % w.lower() if not w.startswith("A") else "What is an %s?" % w.lower(), d, [o[1] for o in pick(others, 3)]))
        Q.append(mc("Which word means: <i>%s</i>" % d.split(".")[0].rstrip(".").replace("<", ""), w, [o[0] for o in pick(others, 3)]))
    # rhymes
    for fam in RHYMES:
        for _ in range(2):
            target, good = rng.sample(fam, 2)
            wrong = [rng.choice(f) for f in pick([f for f in RHYMES if f is not fam], 3)]
            Q.append(mc("Which word rhymes with <b>%s</b>?" % target, good, wrong))
    # similes / personification / plain
    for s in SIMILES[:10]:
        Q.append(mc("Which sentence is a simile?", s, pick(PLAIN, 2) + pick(PERSON, 1)))
    for s in PERSON[:10]:
        Q.append(mc("Which sentence uses personification?", s, pick(PLAIN, 2) + pick(SIMILES, 1)))
    for s in PLAIN[:4]:
        Q.append(mc("Which sentence does NOT use a simile or personification?", s, pick(SIMILES, 2) + pick(PERSON, 1)))
    for s in METAPHOR:
        Q.append(mc("Which sentence compares two things WITHOUT using 'like' or 'as'?", s, pick(SIMILES, 3)))
    for p, a, w in SIM_COMPLETE:
        Q.append(mc("Complete the simile: <i>%s</i>" % p, a, w))
    for s in PERSON[:8]:
        verb = {"The sun smiled down on us.": "smiled", "The flowers danced in the breeze.": "danced", "The clock shouted at me.": "shouted", "The rain tapped on my window.": "tapped",
                "The leaves waved goodbye.": "waved", "The moon watched over the sleeping village.": "watched", "The wind whispered through the trees.": "whispered",
                "The old house groaned in the storm.": "groaned"}.get(s)
        if verb:
            Q.append(mc("Which word in <i>\"%s\"</i> is the human action?" % s, verb, [w for w in s.rstrip(".").split() if w != verb and w.lower() != "the"][:3]))
    # poems
    for title, ls, meta in POEMS:
        body = "<i>Read the poem.</i><br><b>%s</b><br>%s<br>" % (title, lines(*ls))
        Q.append(mc(body + "<br>How many lines are in this poem?", "4", ["2", "3", "8"]))
        Q.append(mc(body + "<br>Which two words rhyme in the first two lines?", "%s and %s" % meta["rhyme"], ["%s and %s" % (ls[0].split()[-1].strip(",."), ls[3].split()[-1].strip(",.")), "%s and %s" % (ls[1].split()[0].lower(), ls[2].split()[0].lower()), "%s and %s" % (ls[0].split()[0].lower(), ls[1].split()[0].lower())]))
        Q.append(mc(body + "<br>What is the poem about?", meta["about"], [m["about"] for _, _, m in pick([p for p in POEMS if p[0] != title], 3)]))
        Q.append(mc(body + "<br>What mood does the poem create?", meta["mood"], (["Angry", "Sad", "Sleepy"] if meta["mood"] == "Exciting" else ["Angry", "Frightening", "Sad"])))
        if meta.get("pers"):
            Q.append(mc(body + "<br>Which line uses personification?", meta["pers"] + ("," if meta["pers"] + "," in " ".join(ls) else ""), [l for l in ls if meta["pers"] not in l][:3]))
        if meta.get("sim"):
            Q.append(mc(body + "<br>Which line has a simile?", meta["sim"] + ".", [l for l in ls if meta["sim"] not in l][:3]))
        Q.append(sb(ls[0].rstrip(",.").split(), answer=ls[0].rstrip(",.")))
    # syllables
    for w, n in SYLL:
        Q.append(mc("How many syllables are in the word <b>%s</b>? (clap it out!)" % w, str(n), [str(x) for x in range(1, 6) if x != n][:3]))
    Q.append(mc("A haiku has three lines. How many syllables are in the MIDDLE line?", "7", ["5", "3", "10"]))
    Q.append(mc("What is the syllable pattern of a haiku?", "5, 7, 5", ["7, 5, 7", "3, 5, 3", "5, 5, 5"]))
    # acrostics
    for word, ls in ACRO.items():
        Q.append(mc("<i>Read the acrostic poem.</i><br>%s<br><br>What word do the first letters of the lines spell?" % lines(*ls), word, [w for w in ACRO if w != word][:3]))
        Q.append(mc("Which letter should the <b>third</b> line of an acrostic poem about <b>%s</b> start with?" % word, word[2], [c for c in "AEIOSTRNMLP" if c != word[2]][:3]))
    return Q
