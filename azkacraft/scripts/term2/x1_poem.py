"""Chapter 1 (Poem) -- second batch. All-new wording/word lists, same Term 2 skills (rhyme, simile, personification, syllables, acrostic, mood, stanza)."""
from common import *

TERMS = [
    ("Metaphor", "A comparison that says one thing IS another, without using 'like' or 'as'.", "The classroom was a zoo."),
    ("Alliteration", "When several words close together begin with the same sound.", "Sally sells seashells by the seashore."),
    ("Onomatopoeia", "A word that sounds like the noise it describes.", "Buzz, splash, bang and sizzle are onomatopoeia."),
    ("Verse", "Another word for a stanza - a group of lines in a poem.", "The poem has three verses."),
    ("Refrain", "A line or group of lines that is repeated in a poem or song.", "Row, row, row your boat - the repeated line is the refrain."),
    ("Couplet", "Two lines in a row that rhyme.", "I saw a cat upon the mat / And then it ran away - and that!"),
]

RHYMES2 = [
    ["bike", "hike", "like", "strike", "spike"], ["gold", "cold", "hold", "bold", "fold"], ["pool", "cool", "school", "rule", "tool"],
    ["mouse", "house", "blouse", "grouse"], ["bell", "well", "shell", "tell", "smell"], ["book", "look", "cook", "hook", "brook"],
    ["fish", "dish", "wish", "swish"], ["tin", "pin", "win", "chin", "grin"], ["cow", "now", "how", "plow", "brow"],
    ["bone", "phone", "stone", "cone", "zone"], ["card", "yard", "hard", "guard"], ["nut", "cut", "hut", "shut", "but"],
    ["pen", "ten", "hen", "men", "when"], ["ship", "lip", "drip", "trip", "grip"], ["peach", "beach", "reach", "teach", "speech"],
    ["farm", "charm", "arm", "alarm", "harm"], ["lamp", "camp", "stamp", "damp", "champ"], ["wheel", "meal", "seal", "real", "feel"],
    ["green", "clean", "queen", "seen", "mean"], ["glass", "grass", "pass", "class", "mass"], ["mind", "kind", "find", "blind", "behind"],
    ["boot", "fruit", "suit", "root", "shoot"], ["tent", "bent", "went", "spent", "rent"], ["hop", "stop", "shop", "top", "drop"],
    ["dark", "park", "bark", "mark", "spark"], ["bird", "word", "heard", "third"], ["gate", "late", "plate", "wait", "eight"],
    ["goal", "soul", "bowl", "role", "whole"], ["jump", "bump", "lump", "pump", "stump"],
]
OLD_RHYMES = [["moon", "spoon", "June", "tune", "balloon"], ["tree", "bee", "sea", "key", "knee"], ["light", "night", "kite", "bright", "flight"],
              ["cake", "lake", "make", "snake", "bake"], ["star", "car", "far", "jar", "guitar"], ["cat", "hat", "bat", "mat", "rat"],
              ["blue", "glue", "true", "shoe", "zoo"], ["day", "play", "stay", "way", "tray"], ["ball", "tall", "wall", "fall", "small"],
              ["rain", "train", "plane", "chain", "brain"], ["sun", "fun", "run", "bun", "done"], ["snow", "glow", "slow", "grow", "show"],
              ["bear", "chair", "hair", "pair", "stair"], ["boat", "coat", "goat", "note", "float"], ["clock", "rock", "sock", "block", "knock"],
              ["bed", "red", "head", "bread", "thread"], ["sing", "ring", "wing", "king", "spring"], ["frog", "log", "dog", "fog", "jog"],
              ["stream", "dream", "cream", "team", "beam"], ["hill", "still", "bill", "will", "chill"]]
ALL_FAMS = RHYMES2 + OLD_RHYMES

COUPLETS = [  # (first line, second line without last word, last word, wrong options)
    ("I watched a spider climb the wall,", "It was so tiny and so", "small", ["huge", "loud", "wet"]),
    ("The ducks all splash and swim and quack,", "Then waddle home and don't look", "back", ["up", "down", "far"]),
    ("We built a castle in the sand,", "With a flag held up in my", "hand", ["shoe", "bed", "bag"]),
    ("The kitten curled up on my bed,", "And on my pillow rests her", "head", ["tail", "paws", "nose"]),
    ("A rainbow shines when skies are clear,", "I smile whenever it is", "here", ["gone", "far", "dark"]),
    ("The farmer fed the hungry cow,", "Then gave the sheep some hay right", "now", ["soon", "later", "never"]),
    ("Big drops of rain began to fall,", "I ran to shelter in the", "hall", ["sun", "road", "pond"]),
    ("My teacher reads a tale to me,", "We sit and count, one, two, ___"[:-4], "three", ["four", "ten", "six"]),
    ("The wind is blowing through the trees,", "It makes the leaves fall in the", "breeze", ["mud", "shade", "dark"]),
    ("I flew my kite up on the hill,", "The wind was gone, the air stood", "still", ["wild", "fast", "loud"]),
    ("The night is dark, the stars are bright,", "I say goodnight and turn off the", "light", ["door", "bed", "clock"]),
    ("A frog sat on a floating log,", "And croaked a song beside a", "dog", ["pond", "bird", "tree"]),
]

SIM2 = ["The soup was as hot as lava.", "She was as quick as lightning.", "The little lamb was as soft as a cloud.", "His hands were as cold as snow.",
        "The night was as dark as ink.", "The puppy ran like the wind.", "The leaves fell like golden rain.", "My brother snores like a bear.",
        "The ice was as smooth as glass.", "The tower stood as tall as a giant.", "The baby slept like a log.", "The moon was as round as a coin."]
PERS2 = ["The sun peeked over the hills.", "The mountains wrapped themselves in a blanket of snow.", "The wind sang a lullaby to the sleepy town.", "The waves chased each other up the beach.",
         "The old bridge sighed as the trucks rolled by.", "The flowers nodded their heads in the rain.", "The lights on the road winked at the drivers.", "The fire danced and crackled in the dark.",
         "The sleepy streetlamp yawned.", "The cake begged to be eaten.", "The thunder grumbled across the sky.", "The kettle whistled a happy tune."]
META2 = ["Her smile is a ray of sunshine.", "The stars are tiny diamonds in the sky.", "My bedroom is a jungle of toys.", "The snow is a white blanket on the ground.",
         "Life is a rollercoaster.", "His heart is a lion.", "The road was a ribbon of silver.", "The lake is a mirror.", "My brother is a walking dictionary.", "The clouds are fluffy sheep.",
         "The classroom was a beehive.", "The moon is a silver coin."]
PLAIN2 = ["The bus stopped at the corner.", "The children played in the garden.", "The rain fell all night.", "The mountain is very high.", "My grandma lives in a small village.",
          "The market opens at seven.", "The dog barked at the postman.", "We had rice for lunch.", "The river flows into the sea.", "The leaves are green in summer.",
          "The cat slept on the sofa.", "A bird sat on the fence."]

POEMS2 = [
    ("Morning Market", ["The sellers shout, the baskets sway,", "The mangoes glow like gold today.", "The scooters hum, the bells all ring,", "The market wakes and starts to sing."],
     {"about": "A busy morning market", "rhyme": ("sway", "today"), "rhyme2": ("ring", "sing"), "mood": "Cheerful", "sim": "The mangoes glow like gold today.", "pers": "The market wakes and starts to sing."}),
    ("Storm at Sea", ["The thunder growls, the waves rise high,", "Dark clouds are rolling through the sky.", "The little boat is tossed about,", "And gulls fly home with a frightened shout."],
     {"about": "A storm at sea", "rhyme": ("high", "sky"), "rhyme2": ("about", "shout"), "mood": "Scary", "pers": "The thunder growls, the waves rise high,"}),
    ("Grandma's Kitchen", ["The kitchen smells of ginger and spice,", "Of warm fresh bread and sweet brown rice.", "Grandma hums as she stirs the pot,", "Her cooking makes the whole house hot!"],
     {"about": "Cooking in Grandma's kitchen", "rhyme": ("spice", "rice"), "rhyme2": ("pot", "hot"), "mood": "Warm and happy", "pers": None}),
    ("Little Snail", ["A little snail climbs up the wall,", "So slowly that he's late for all.", "He carries his house upon his back,", "And leaves behind a shiny track."],
     {"about": "A slow little snail", "rhyme": ("wall", "all"), "rhyme2": ("back", "track"), "mood": "Gentle", "pers": None}),
    ("Starry Night", ["The stars are lanterns in the sky,", "The moon rolls slowly, soft and high.", "The village sleeps without a sound,", "While silver light falls all around."],
     {"about": "A quiet night with stars", "rhyme": ("sky", "high"), "rhyme2": ("sound", "around"), "mood": "Peaceful", "sim": None, "pers": None, "meta": "The stars are lanterns in the sky,"}),
    ("The Race", ["Ready, steady, off we go!", "Feet fly fast and spirits glow.", "Past the tree and round the bend,", "Who will win? We'll see at the end!"],
     {"about": "A running race", "rhyme": ("go", "glow"), "rhyme2": ("bend", "end"), "mood": "Exciting", "pers": None}),
]

SYLL2 = [("cat", 1), ("train", 1), ("clap", 1), ("window", 2), ("pencil", 2), ("teacher", 2), ("table", 2), ("holiday", 3), ("tomato", 3), ("adventure", 3), ("hospital", 3),
         ("volcano", 3), ("kangaroo", 3), ("celebrate", 3), ("dinosaur", 3), ("information", 4), ("watermelon", 4), ("alligator", 4), ("vegetable", 4), ("education", 4),
         ("refrigerator", 5), ("imagination", 5), ("magnificent", 4), ("Indonesia", 5)]

ACRO2 = {"WIND": ["Whirling through the trees", "In the sky it flies", "Never staying still", "Dancing as it sighs"],
         "BIRD": ["Beating wings so fast", "In the sky so blue", "Resting in a tree", "Dreaming of the view"],
         "CAKE": ["Creamy, sweet and light", "A cherry on the top", "Kids all gather round", "Eating every drop"],
         "HOME": ["Happy, warm and bright", "Open every door", "My family is near", "Everyone I adore"],
         "SPRING": ["Showers fall like silver", "Petals open wide", "Robins sing their songs", "Insects come outside", "Nests in every tree", "Green is all I see"],
         "BEACH": ["Bright waves rolling in", "Every shell I find", "Always warm and sunny", "Castles made of sand", "Happy hours with friends"]}

HAIKU = [  # (three lines, (5,7,5))
    (["Morning sun rises", "Golden light on sleeping hills", "Birds begin to sing"], "sun"),
    (["A snail climbs the wall", "Slowly through the morning dew", "Dreaming of a leaf"], "snail"),
    (["Rain falls on the roof", "Soft taps like a gentle song", "The garden drinks deep"], "rain"),
    (["The old wooden boat", "Rocks on the silver water", "Waiting for the dawn"], "boat"),
]
FOURS = {"sun": "A haiku about the sunrise", "snail": "A haiku about a snail", "rain": "A haiku about rain", "boat": "A haiku about a boat"}

MOOD_LINES = [("The thunder roared and the lights went out.", "Scary", ["Peaceful", "Silly", "Cheerful"]),
              ("The baby slept softly in the warm blanket.", "Peaceful", ["Scary", "Angry", "Exciting"]),
              ("We cheered and jumped when our team scored the goal!", "Excited", ["Sleepy", "Sad", "Frightened"]),
              ("The old dog sat alone by the door, waiting and waiting.", "Sad", ["Cheerful", "Exciting", "Silly"]),
              ("Birthday balloons bounced up to the ceiling and everyone laughed.", "Happy", ["Scary", "Gloomy", "Angry"]),
              ("A cold wind howled through the empty house at midnight.", "Spooky", ["Cheerful", "Cosy", "Funny"]),
              ("The kitten wore a bucket on its head and wobbled around.", "Funny", ["Sad", "Scary", "Peaceful"]),
              ("The sun set quietly over the calm blue sea.", "Peaceful", ["Frightening", "Angry", "Rushed"])]

ONOM = [("The bees ___ around the flowers.", "buzzed", ["sang", "roared", "whispered"]), ("The balloon went ___ when it popped.", "bang", ["splash", "sizzle", "meow"]),
        ("The bacon ___ in the hot pan.", "sizzled", ["barked", "thudded", "buzzed"]), ("The cat said ___ and jumped on my lap.", "meow", ["woof", "moo", "quack"]),
        ("The stone fell into the pond with a ___.", "splash", ["sizzle", "buzz", "ring"]), ("The clock goes ___ all night.", "tick-tock", ["moo", "crash", "splash"]),
        ("The thunder went ___ across the sky.", "boom", ["quack", "tweet", "sizzle"]), ("The ducks go ___ by the river.", "quack", ["roar", "oink", "bang"])]
ALLIT = [("Peter Piper picked a peck of pickled peppers.", "p"), ("Sally sells seashells by the seashore.", "s"), ("Big bears bounce on the bed.", "b"), ("Little Lucy loves lemon lollipops.", "l"),
         ("Tiny turtles tiptoe on tall trees.", "t"), ("Funny Fred found five fat frogs.", "f")]


def build():
    Q = [flash(w, d, e) for w, d, e in TERMS]
    for w, d, e in TERMS:
        others = [t for t in TERMS if t[0] != w]
        Q.append(mc("What is %s %s?" % ("an" if w[0] in "AEIOU" else "a", w.lower()), d, [o[1] for o in pick(others, 3)]))
        Q.append(mc("Which word means: <i>%s</i>" % d.rstrip("."), w, [o[0] for o in pick(others, 3)]))
    # rhymes
    for fam in RHYMES2:
        others = [f for f in ALL_FAMS if f is not fam]
        target, good = rng.sample(fam, 2)
        wrong = [rng.choice(f) for f in pick(others, 3)]
        Q.append(mc("Which word rhymes with <b>%s</b>?" % target, good, wrong))
        if RHYMES2.index(fam) % 2 == 0 and len(fam) >= 4:
            odd = rng.choice(rng.choice(others))
            three = rng.sample(fam, 3)
            Q.append(mc("Which word does NOT rhyme with the others?<br><i>%s</i>" % ", ".join(three + [odd]), odd, three))
    for a, b, last, wrong in COUPLETS[:8]:
        Q.append(mc("Complete the rhyming couplet:<br><i>%s<br>%s ___</i>" % (a, b), last, wrong))
    # simile / metaphor / personification / plain
    for s in SIM2[:6]:
        Q.append(mc("Which sentence is a simile?", s, pick(PLAIN2, 1) + pick(PERS2, 1) + pick(META2, 1)))
    for s in PERS2[:6]:
        Q.append(mc("Which sentence uses personification?", s, pick(PLAIN2, 1) + pick(SIM2, 1) + pick(META2, 1)))
    for s in META2[:6]:
        Q.append(mc("Which sentence is a metaphor (a comparison with no 'like' or 'as')?", s, pick(SIM2, 1) + pick(PERS2, 1) + pick(PLAIN2, 1)))
    for s in PLAIN2[:4]:
        Q.append(mc("Which sentence is plain - no simile, metaphor or personification?", s, pick(SIM2, 1) + pick(PERS2, 1) + pick(META2, 1)))
    for kind, lst in (("simile", SIM2), ("metaphor", META2), ("personification", PERS2)):
        for s in lst[8:10]:
            Q.append(mc("What figure of speech is this?<br><i>%s</i>" % s, kind.capitalize(), [k.capitalize() for k in ("simile", "metaphor", "personification") if k != kind] + ["Rhyme"]))
    # onomatopoeia / alliteration
    for p, a, w in ONOM[:6]:
        Q.append(mc("Choose the sound word (onomatopoeia):<br><i>%s</i>" % p, a, w))
    for s, l in ALLIT[:6]:
        Q.append(mc("Which sound is repeated at the start of the words in this tongue twister?<br><i>%s</i>" % s, "The %s sound" % l, ["The %s sound" % c for c in "mdrk" if c != l][:3]))
    # poems
    for title, ls, meta in POEMS2:
        body = "<i>Read the poem.</i><br><b>%s</b><br>%s<br>" % (title, lines(*ls))
        Q.append(mc(body + "<br>Which two words rhyme in lines 3 and 4?", "%s and %s" % meta["rhyme2"], ["%s and %s" % (ls[0].split()[-1].strip(",.!"), ls[2].split()[-1].strip(",.!")),
                                                                                                            "%s and %s" % (ls[0].split()[0].lower(), ls[3].split()[0].lower()), "%s and %s" % (ls[1].split()[-1].strip(",.!"), ls[3].split()[-1].strip(",.!"))]))
        Q.append(mc(body + "<br>Which two words rhyme in lines 1 and 2?", "%s and %s" % meta["rhyme"], ["%s and %s" % (ls[2].split()[-1].strip(",.!"), ls[3].split()[-1].strip(",.!")),
                                                                                                           "%s and %s" % (ls[0].split()[0].lower(), ls[1].split()[0].lower()), "%s and %s" % (ls[0].split()[-1].strip(",.!"), ls[3].split()[-1].strip(",.!"))]))
        Q.append(mc(body + "<br>What is the poem about?", meta["about"], [m["about"] for _, _, m in pick([p for p in POEMS2 if p[0] != title], 3)]))
        Q.append(mc(body + "<br>What mood does the poem create?", meta["mood"], [m for m in ["Angry", "Bored", "Sad", "Silly"] if m != meta["mood"]][:3]))
        if meta.get("sim"):
            Q.append(mc(body + "<br>Which line has a simile?", meta["sim"], [l for l in ls if l != meta["sim"]]))
        if meta.get("pers"):
            Q.append(mc(body + "<br>Which line uses personification?", meta["pers"], [l for l in ls if l != meta["pers"]]))
        if meta.get("meta"):
            Q.append(mc(body + "<br>Which line has a metaphor?", meta["meta"], [l for l in ls if l != meta["meta"]]))
        Q.append(sb(ls[1].rstrip(",.!").split(), answer=ls[1].rstrip(",.!")))
    # syllables
    for w, n in SYLL2[:12]:
        Q.append(mc("How many syllables are in <b>%s</b>? (clap it out!)" % w, str(n), [str(x) for x in range(1, 7) if x != n][:3]))
    # haiku
    for ls, key in HAIKU[:3]:
        Q.append(mc("<i>Read the poem.</i><br>%s<br><br>What kind of poem is this?" % lines(*ls), "A haiku", ["An acrostic poem", "A limerick", "A shopping list"]))
        Q.append(mc("<i>Read the poem.</i><br>%s<br><br>How many lines does this haiku have?" % lines(*ls), "3", ["2", "4", "5"]))
    Q.append(mc("A haiku has three lines. How many syllables are in the FIRST line?", "5", ["7", "3", "9"]))
    Q.append(mc("A haiku has three lines. How many syllables are in the LAST line?", "5", ["7", "3", "10"]))
    Q.append(mc("How many syllables does a whole haiku have altogether?", "17", ["12", "15", "20"]))
    Q.append(mc("Which line has 5 syllables?", "Birds begin to sing", ["Golden light on sleeping hills", "The old wooden boat rocks on the water", "I love to eat the sweetest mango"]))
    Q.append(mc("Which line could be the MIDDLE line (7 syllables) of a haiku?", "Golden light on sleeping hills", ["Birds begin to sing", "Rain falls", "Morning sun rises"]))
    # acrostics
    for word, ls in list(ACRO2.items())[:4]:
        Q.append(mc("<i>Read the acrostic poem.</i><br>%s<br><br>What word do the first letters of the lines spell?" % lines(*ls), word, [w for w in ACRO2 if w != word][:3]))
        Q.append(mc("The first letter of the <b>second</b> line of an acrostic about <b>%s</b> is..." % word, word[1], [c for c in "AEIOSTRNMLPD" if c != word[1]][:3]))
    # mood
    for line, mood, wrong in MOOD_LINES[:4]:
        Q.append(mc("What mood do these words create?<br><i>%s</i>" % line, mood, wrong))
    # stanza / verse questions
    Q.append(mc("A poem has 12 lines in 3 equal stanzas. How many lines are in each stanza?", "4", ["3", "6", "12"]))
    Q.append(mc("A poem has 8 lines in 2 equal stanzas. How many lines are in each stanza?", "4", ["2", "8", "6"]))
    Q.append(mc("How many lines are in a couplet?", "2", ["3", "4", "5"]))
    Q.append(mc("What is the repeated line in a song or poem called?", "A refrain", ["A title", "A stanza", "A syllable"]))
    Q.append(mc("In a poem, what do we call a group of lines separated from the others by a space?", "A stanza", ["A syllable", "A rhyme", "A haiku"]))
    return Q
