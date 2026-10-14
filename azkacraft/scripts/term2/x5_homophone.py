"""Chapter 5 (Homophones) -- second batch: new homophone pairs/sets (none repeated from the first batch)."""
from common import *

SETS2 = [  # (sentence, correct, other homophones)
    ("The rabbit and the ___ raced across the field.", "hare", ["hair"]), ("She brushed her long ___ before school.", "hair", ["hare"]),
    ("The thief tried to ___ the jewels.", "steal", ["steel"]), ("The bridge is made of strong ___.", "steel", ["steal"]),
    ("The white dove is a sign of ___.", "peace", ["piece"]), ("Mum gave me a ___ of cake.", "piece", ["peace"]),
    ("He filled the ___ with water at the well.", "pail", ["pale"]), ("Her face looked ___ after the long trip.", "pale", ["pail"]),
    ("The boat has a big white ___.", "sail", ["sale"]), ("The shop has a ___ on toys this week.", "sale", ["sail"]),
    ("We watched the ___ come in at the beach.", "tide", ["tied"]), ("He ___ his shoelaces in a neat bow.", "tied", ["tide"]),
    ("I ___ like some juice, please.", "would", ["wood"]), ("The table is made of ___.", "wood", ["would"]),
    ("I was so ___ in the long lesson.", "bored", ["board"]), ("Please write the answer on the ___.", "board", ["bored"]),
    ("Press the ___ to stop the bike.", "brake", ["break"]), ("Be careful not to ___ the glass.", "break", ["brake"]),
    ("The prisoner lived in a small ___.", "cell", ["sell"]), ("Farmers ___ their milk at the market.", "sell", ["cell"]),
    ("The flower has a lovely ___.", "scent", ["cent", "sent"]), ("I ___ a letter to my aunt.", "sent", ["scent", "cent"]),
    ("Please ___ a colour for the poster.", "choose", ["chews"]), ("The puppy ___ on my slipper.", "chews", ["choose"]),
    ("The golf ___ was green and wide.", "course", ["coarse"]), ("The sand felt ___ under my feet.", "coarse", ["course"]),
    ("The old door made a loud ___ as it opened.", "creak", ["creek"]), ("We went fishing in the ___.", "creek", ["creak"]),
    ("Mum will ___ her hair red.", "dye", ["die"]), ("Plants will ___ without water.", "die", ["dye"]),
    ("She ___ her lunch quickly.", "ate", ["eight"]), ("A spider has ___ legs.", "eight", ["ate"]),
    ("The bus ___ costs one dollar.", "fare", ["fair"]), ("It is not ___ to cheat.", "fair", ["fare"]),
    ("My ___ are cold.", "feet", ["feat"]), ("Climbing that mountain was a great ___.", "feat", ["feet"]),
    ("Today is a ___ day for a picnic.", "great", ["grate"]), ("Please ___ some cheese for the pasta.", "grate", ["great"]),
    ("Our ___ stayed for dinner.", "guest", ["guessed"]), ("I ___ the answer right.", "guessed", ["guest"]),
    ("A ___ of cows crossed the road.", "herd", ["heard"]), ("I ___ a strange noise last night.", "heard", ["herd"]),
    ("The kite flew ___ than the tree.", "higher", ["hire"]), ("We will ___ a van to move house.", "hire", ["higher"]),
    ("It takes an ___ to bake the bread.", "hour", ["our"]), ("___ teacher is very kind.", "Our", ["Hour"]),
    ("I ___ the answer already.", "knew", ["new"]), ("I got a ___ bike for my birthday.", "new", ["knew"]),
    ("She tied a ___ in the rope.", "knot", ["not"]), ("That is ___ my bag.", "not", ["knot"]),
    ("We have a spelling ___ today.", "lesson", ["lessen"]), ("Medicine can ___ the pain.", "lessen", ["lesson"]),
    ("The lion has a long golden ___.", "mane", ["main"]), ("The ___ road is closed today.", "main", ["mane"]),
    ("I ___ the bus this morning.", "missed", ["mist"]), ("A cold ___ covered the hills.", "mist", ["missed"]),
    ("She was in ___ for her grandfather.", "mourning", ["morning"]), ("I wake up early every ___.", "morning", ["mourning"]),
    ("A ___ lives in a convent.", "nun", ["none"]), ("There is ___ left in the jar.", "none", ["nun"]),
    ("We climbed to the ___ of the mountain.", "peak", ["peek"]), ("Take a quick ___ at the picture.", "peek", ["peak"]),
    ("The lion hunted its ___.", "prey", ["pray"]), ("We ___ for peace in the world.", "pray", ["prey"]),
    ("The ___ fell all day.", "rain", ["reign", "rein"]), ("The queen's ___ lasted forty years.", "reign", ["rain", "rein"]),
    ("Please ___ the gift in paper.", "wrap", ["rap"]), ("He loves to ___ along to music.", "rap", ["wrap"]),
    ("Is that ___ gold?", "real", ["reel"]), ("The wedding ___ was gold.", "ring", ["wring"]),
    ("Please ___ out the wet cloth.", "wring", ["ring"]), ("We rode our bikes down the ___.", "road", ["rode", "rowed"]),
    ("Yesterday I ___ my bike to school.", "rode", ["road", "rowed"]), ("She plays the ___ of a princess.", "role", ["roll"]),
    ("I ate a bread ___ for lunch.", "roll", ["role"]), ("The plant's ___ goes deep into the soil.", "root", ["route"]),
    ("What ___ do you take to school?", "route", ["root"]), ("She picked a red ___ with sharp thorns.", "rose", ["rows"]),
    ("The seats are in ___.", "rows", ["rose"]), ("The tomato ___ was tasty.", "sauce", ["source"]),
    ("A river's ___ is high in the hills.", "source", ["sauce"]), ("The last ___ of the play was funny.", "scene", ["seen"]),
    ("Have you ___ my bag?", "seen", ["scene"]), ("It will ___ like a good day.", "seem", ["seam"]),
    ("The ___ on my shirt tore.", "seam", ["seem"]), ("My foot is ___ after the long run.", "sore", ["soar"]),
    ("Eagles ___ high above the mountains.", "soar", ["sore"]), ("The ___ of my shoe came off.", "sole", ["soul"]),
    ("He has a kind ___.", "soul", ["sole"]), ("Dad cooked a ___ for dinner.", "steak", ["stake"]),
    ("He hammered a ___ into the ground.", "stake", ["steak"]), ("The car was ___ at the red light.", "stationary", ["stationery"]), ("I bought pens at the ___ shop.", "stationery", ["stationary"]),
    ("This pudding is very ___.", "sweet", ["suite"]), ("The hotel ___ had two bedrooms.", "suite", ["sweet"]),
    ("The king sat on his ___.", "throne", ["thrown"]), ("The ball was ___ over the wall.", "thrown", ["throne"]),
    ("I stubbed my ___ on the step.", "toe", ["tow"]), ("A truck will ___ the broken car.", "tow", ["toe"]),
    ("The nurse found a ___ in my arm.", "vein", ["vain", "vane"]), ("He is too ___ about his looks.", "vain", ["vein", "vane"]),
    ("The belt goes round your ___.", "waist", ["waste"]), ("Please do not ___ food.", "waste", ["waist"]),
    ("My shoes are ___ out.", "worn", ["warn"]), ("Please ___ me before you leave.", "warn", ["worn"]),
    ("The ___ flew on a broom.", "witch", ["which"]), ("___ one do you want?", "Which", ["Witch"]),
    ("We drank red ___ at dinner.", "wine", ["whine"]), ("The puppy began to ___ at the door.", "whine", ["wine"]),
    ("The ___ of an egg is yellow.", "yolk", ["yoke"]), ("The ___ has soft wool.", "ewe", ["yew", "you"]),
]
# keep 2 of every 3 pairs of sentences so the batch has about the right size
SETS2 = [s for i, s in enumerate(SETS2) if i % 5 in (0, 2, 3)]

DEFS2 = [("hare", "a fast animal like a big rabbit"), ("hair", "the soft strands that grow on your head"), ("steel", "a strong metal"), ("steal", "to take something that is not yours"),
         ("piece", "a part of something"), ("peace", "calm and quiet, with no fighting"), ("pale", "light in colour, not bright"), ("pail", "a bucket"),
         ("sail", "a sheet that catches the wind on a boat"), ("sale", "a time when things cost less"), ("tide", "the rise and fall of the sea"), ("tied", "fastened with a knot"),
         ("wood", "the hard material from trees"), ("would", "a word like 'will' used for wishes or politeness"), ("bored", "tired and unhappy because nothing is interesting"), ("board", "a flat piece of wood"),
         ("brake", "the part that makes a bike or car stop"), ("break", "to smash into pieces"), ("cell", "a small room in a prison"), ("sell", "to give something in exchange for money"),
         ("scent", "a smell"), ("sent", "past tense of send"), ("creek", "a small stream"), ("creak", "a squeaky noise from an old door")]
FIX2 = [("I tied a not in my rope.", "not", "knot"), ("The pale was full of water.", "pale", "pail"), ("We had a great time at the fare.", "fare", "fair"),
        ("The sale on the boat was white.", "sale", "sail"), ("She herd a strange noise.", "herd", "heard"), ("I wood like some water, please.", "wood", "would"),
        ("My feat are sore.", "feat", "feet"), ("The queen's rain lasted fifty years.", "rain", "reign"), ("The bored is on the wall.", "bored", "board"), ("He rowed his bike down the road.", "rowed", "rode")]


def build():
    Q = [flash("Homophone spelling tip", "Look at the other words in the sentence. They tell you which spelling fits (a sail on a boat, a sale in a shop).", "The boat has a white sail. The shop has a sale."),
         flash("Same sound, different job", "Homophones sound alike but one may be a noun and the other a verb: break (verb) / brake (noun).", "Press the brake so you do not break the bike."),
         flash("Check by meaning", "Say the meaning of each word in your head. Choose the spelling whose meaning fits.", "steel = metal, steal = take")]
    for sent, ans, wrong in SETS2:
        Q.append(mc("Circle the correct homophone:<br><i>%s</i>" % sent, ans, wrong, minwrong=1))
    for i in range(0, len(DEFS2) - 3, 4):
        Q.append(match("Match each word with its meaning.", DEFS2[i:i + 4]))
    for w, m in DEFS2[:14]:
        others = [d for d in DEFS2 if d[0] != w]
        Q.append(mc("Which word means <i>%s</i>?" % m, w, [o[0] for o in pick(others, 3)]))
    for sent, wrong, right in FIX2:
        Q.append(fill("Fix the homophone mistake. What should the wrong word <b>%s</b> be?<br><i>%s</i>" % (wrong, sent), right))
    Q.append(mc("Which sentence is correct?", "The shop has a sale on shoes.", ["The shop has a sail on shoes.", "The shop has a sell on shoes.", "The shop has a cell on shoes."]))
    Q.append(mc("Which sentence is correct?", "I heard a loud noise.", ["I herd a loud noise.", "I hurd a loud noise.", "I heared a loud noise."]))
    Q.append(mc("Which sentence is correct?", "Our class had a great trip.", ["Hour class had a grate trip.", "Our class had a grate trip.", "Hour class had a great trip."]))
    Q.append(mc("Which sentence is correct?", "She wore a pale dress.", ["She wore a pail dress.", "She wore a pale dres.", "She wore a pail dres."]))
    Q.append(mc("Which sentence is correct?", "We walked down the road.", ["We walked down the rode.", "We walked down the rowed.", "We walkt down the road."]))
    Q.append(mc("Which sentence is correct?", "The knight rode his horse at night.", ["The night rode his horse at knight.", "The knight road his horse at night.", "The night road his horse at knight."]))
    return Q
