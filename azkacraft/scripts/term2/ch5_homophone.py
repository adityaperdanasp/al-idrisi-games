from common import *

SETS = [  # (sentence with ___, correct, other homophones)
    ("The baby ___ when she is hungry.", "bawls", ["balls"]), ("He ___ out the candle when it was time to sleep.", "blew", ["blue"]),
    ("I remembered that I needed to ___ some bread.", "buy", ["by", "bye"]), ("I poured milk and honey over my ___.", "cereal", ["serial"]),
    ("The baby is ___ in five months.", "due", ["dew"]), ("Aziz felt poorly from having the ___.", "flu", ["flew"]),
    ("The wound on my leg took a long time to ___.", "heal", ["heel"]), ("There was a long ___ in the song.", "pause", ["paws"]),
    ("They were a rich family with their own ___.", "maid", ["made"]), ("The small writing was very hard to ___.", "read", ["reed"]),
    ("Reindeer are used to pull the ___.", "sleigh", ["slay"]), ("The children needed ___ coats.", "their", ["there", "they're"]),
    ("Pippa and Kayden are going swimming. ___ very excited.", "They're", ["Their", "There"]), ("___ are you going on holiday?", "Where", ["Were", "Wear"]),
    ("Jess decided to ___ her favourite blue shoes.", "wear", ["were", "where"]), ("The children were hoping ___ enjoy the film.", "to", ["too", "two"]),
    ("The dog was ___ tired to go for a walk.", "too", ["to", "two"]), ("I have ___ cats and a rabbit.", "two", ["to", "too"]),
    ("We swam in the ___ at the weekend.", "sea", ["see"]), ("Can you ___ the bird in the tree?", "see", ["sea"]),
    ("She is not ___; she is very strong.", "weak", ["week"]), ("I will visit you next ___.", "week", ["weak"]),
    ("Come over ___ and sit next to me.", "here", ["hear"]), ("Can you ___ the music from the next room?", "hear", ["here"]),
    ("Please ___ your name at the top of the page.", "write", ["right"]), ("Turn ___ at the end of the road.", "right", ["write"]),
    ("The ___ old man had no money for food.", "poor", ["pour", "pore"]), ("Please ___ the milk into the jug.", "pour", ["poor"]),
    ("I ate the ___ apple, including the core.", "whole", ["hole"]), ("There is a ___ in my sock.", "hole", ["whole"]),
    ("The ___ slept in the castle.", "knight", ["night"]), ("It is very dark at ___.", "night", ["knight"]),
    ("I ___ the answer to that question.", "know", ["no"]), ("There is ___ milk left in the fridge.", "no", ["know"]),
    ("She ___ the race by a long way.", "won", ["one"]), ("I have ___ younger brother.", "one", ["won"]),
    ("My ___ is in the third grade.", "son", ["sun"]), ("The ___ is very hot today.", "sun", ["son"]),
    ("The dog wagged its ___.", "tail", ["tale"]), ("Please read me a fairy ___.", "tale", ["tail"]),
    ("I ate a juicy ___ for lunch.", "pear", ["pair"]), ("I bought a new ___ of shoes.", "pair", ["pear"]),
    ("The ___ landed safely on the runway.", "plane", ["plain"]), ("The wall was ___ white with no pictures.", "plain", ["plane"]),
    ("We have to ___ for the bus.", "wait", ["weight"]), ("What is the ___ of this parcel?", "weight", ["wait"]),
    ("Nice to ___ you!", "meet", ["meat"]), ("Chicken is a kind of ___.", "meat", ["meet"]),
    ("We need ___ to bake the bread.", "flour", ["flower"]), ("She picked a red ___ from the garden.", "flower", ["flour"]),
    ("A ___ lives in the forest.", "bear", ["bare"]), ("The floor was ___ because the rug was gone.", "bare", ["bear"]),
    ("A ___ ran across the road.", "deer", ["dear"]), ("She is my ___ friend.", "dear", ["deer"]),
    ("She ___ the ball to her friend.", "threw", ["through"]), ("We walked ___ the park.", "through", ["threw"]),
    ("The ___ delivered a letter.", "mail", ["male"]), ("Lily ___ the book and then closed it.", "read", ["red"]),
    ("I ate ___ much cake.", "too", ["to", "two"]),
]
DEFS = [("too", "as well as / also"), ("wear", "to have or carry on your body"), ("their", "belonging to them"), ("there", "in or at that place"), ("two", "a small, even number"),
        ("were", "the past tense of 'be'"), ("they're", "short for 'they are'"), ("where", "in what place?"), ("to", "towards, or part of a verb like 'to run'"),
        ("see", "to notice with your eyes"), ("sea", "a large area of salt water"), ("hear", "to notice a sound with your ears"), ("here", "in this place"),
        ("night", "the dark part of the day"), ("knight", "a soldier in armour in the olden days"), ("sun", "the star our Earth goes around"), ("son", "someone's male child"),
        ("tail", "the part at the back of an animal"), ("tale", "a story"), ("pear", "a juicy fruit"), ("pair", "two things that go together"),
        ("weak", "not strong"), ("week", "seven days"), ("flour", "powder used to bake bread"), ("flower", "the colourful part of a plant")]
SENT_FIX = [("When Isabella and Lily woke up, they couldn't believe there eyes.", "there", "their"), ("The girls put they're shoes and coats on.", "they're", "their"),
            ("The sky was blew and they couldn't sea any grass.", "blew", "blue"), ("They had waited all weak for the snow.", "weak", "week"),
            ("It was finally hear.", "hear", "here"), ("\"Write, let's get too work!\" said Lily.", "Write", "Right"), ("It was covered with pour prints from the dog.", "pour", "paw"),
            ("Lily ran downstairs and found her brother already their.", "their", "there"), ("The wind blue the door open.", "blue", "blew"), ("I can't wait to sea you!", "sea", "see")]

def build():
    Q = [flash("Homophone", "Words that sound the same but have different spellings and different meanings.", "There, their and they're are homophones."),
         flash("their / there / they're", "'Their' = belonging to them. 'There' = in that place. 'They're' = they are.", "They're putting their coats over there."),
         flash("to / too / two", "'To' = towards. 'Too' = also or very. 'Two' = the number 2.", "I want to go too, but it is too late for two of us."),
         flash("were / where / wear", "'Were' = past tense of be. 'Where' = which place. 'Wear' = to put on clothes.", "Where were you when I wanted to wear my coat?")]
    Q.append(mc("What is a homophone?", "A word that sounds the same as another word but is spelled differently", ["A word with the opposite meaning", "A word with the same meaning", "A word that rhymes with another"]))
    for sent, ans, wrong in SETS:
        alts = wrong if len(wrong) >= 2 else wrong
        Q.append(mc("Circle the correct homophone:<br><i>%s</i>" % sent, ans, alts, minwrong=1))
    for i in range(0, len(DEFS) - 3, 4):
        Q.append(match("Match each homophone with its meaning.", DEFS[i:i + 4]))
    Q.append(match("Match each homophone with its meaning.", [DEFS[0], DEFS[1], DEFS[2], DEFS[3]]))
    for w, m in DEFS:
        others = [d for d in DEFS if d[0] != w]
        Q.append(mc("Which word means <i>%s</i>?" % m, w, [o[0] for o in pick(others, 3)]))
    for sent, wrong, right in SENT_FIX:
        Q.append(fill("Fix the homophone mistake. What should the wrong word <b>%s</b> be?<br><i>%s</i>" % (wrong, sent.replace("\"", "'")), right.lower() if right[0].islower() else right))
    for pair in (("their", "they're"), ("there", "their"), ("to", "too"), ("two", "to"), ("wear", "where"), ("were", "where")):
        Q.append(mc("Which sentence uses <b>%s</b> correctly?" % pair[0],
                    {"their": "The children needed their coats.", "there": "Put your bag over there.", "to": "I want to go to the park.", "two": "I have two sisters.", "wear": "I will wear my blue shoes.", "were": "We were very happy."}[pair[0]],
                    {"their": ["The children needed there coats.", "The children needed they're coats."], "there": ["Put your bag over their.", "Put your bag over they're."], "to": ["I want too go too the park.", "I want two go two the park."],
                     "two": ["I have to sisters.", "I have too sisters."], "wear": ["I will where my blue shoes.", "I will were my blue shoes."], "were": ["We where very happy.", "We wear very happy."]}[pair[0]], minwrong=2))
    return Q
