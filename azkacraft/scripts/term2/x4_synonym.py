"""Chapter 4 (Synonyms) -- second batch: all-new word pairs, clusters, antonyms, stronger-word and sentence questions."""
from common import *

PAIRS2 = [("cry", "weep"), ("laugh", "giggle"), ("talk", "speak"), ("buy", "purchase"), ("fix", "repair"), ("help", "assist"), ("idea", "thought"), ("house", "home"),
          ("strong", "powerful"), ("calm", "peaceful"), ("dirty", "filthy"), ("rubbish", "trash"), ("mistake", "error"), ("speedy", "rapid"), ("pal", "friend"), ("tale", "story"),
          ("cheerful", "jolly"), ("shut", "close"), ("grab", "seize"), ("toss", "throw"), ("rest", "relax"), ("pretend", "fake"), ("injure", "hurt"), ("enemy", "foe"),
          ("stop", "halt"), ("unusual", "strange"), ("trouble", "problem"), ("wonderful", "marvellous"), ("terrible", "awful"), ("quarrel", "argue"), ("silly", "foolish"),
          ("hurry", "rush"), ("wander", "roam"), ("anger", "rage"), ("close", "near"), ("courage", "bravery"), ("reply", "answer"), ("tidy", "neat"), ("messy", "untidy"),
          ("empty", "vacant"), ("ruin", "spoil"), ("observe", "watch"), ("scream", "shriek"), ("wise", "sensible"), ("nap", "doze"), ("smell", "scent"), ("tremble", "shake"),
          ("hug", "cuddle"), ("adore", "love"), ("despise", "hate"), ("cheap", "inexpensive"), ("costly", "expensive"), ("enough", "sufficient"), ("necessary", "essential"),
          ("famous", "well-known"), ("genuine", "real"), ("hot", "boiling"), ("freezing", "icy")]

CLUSTERS = [["happy", "glad", "cheerful", "pleased"], ["big", "large", "huge", "gigantic"], ["small", "tiny", "little", "miniature"], ["fast", "quick", "rapid", "speedy"],
            ["sad", "unhappy", "miserable", "gloomy"], ["angry", "furious", "cross", "annoyed"], ["pretty", "lovely", "beautiful", "attractive"], ["clever", "smart", "intelligent", "wise"],
            ["scared", "afraid", "frightened", "terrified"], ["tired", "sleepy", "exhausted", "weary"], ["good", "great", "excellent", "fine"], ["dirty", "filthy", "grubby", "messy"]]
OPPOSITE_OF_CLUSTER = ["sad", "small", "big", "slow", "happy", "calm", "ugly", "silly", "brave", "awake", "bad", "clean"]

SENT = [("The old man sat on a <b>big</b> rock by the sea.", "large", ["tiny", "soft", "cold"]), ("My sister gave me a <b>tiny</b> toy car.", "miniature", ["gigantic", "noisy", "sleepy"]),
        ("The children were <b>glad</b> when school ended early.", "pleased", ["upset", "tired", "scared"]), ("He felt <b>miserable</b> after losing his bag.", "unhappy", ["delighted", "proud", "calm"]),
        ("The <b>speedy</b> train arrived early.", "fast", ["slow", "heavy", "dirty"]), ("Please <b>shut</b> the door quietly.", "close", ["open", "paint", "break"]),
        ("Dad will <b>fix</b> my bicycle tomorrow.", "repair", ["break", "sell", "borrow"]), ("Can you <b>help</b> me carry these bags?", "assist", ["ignore", "drop", "hide"]),
        ("The teacher asked us to <b>reply</b> to the letter.", "answer", ["ignore", "burn", "fold"]), ("She began to <b>weep</b> when she heard the sad news.", "cry", ["laugh", "sing", "shout"]),
        ("The crowd started to <b>shriek</b> with excitement.", "scream", ["whisper", "yawn", "hum"]), ("We saw a <b>strange</b> light in the sky.", "unusual", ["ordinary", "pretty", "slow"]),
        ("The soup was <b>scorching</b> hot.", "boiling", ["freezing", "sweet", "tasty"]), ("The path was <b>filthy</b> after the storm.", "dirty", ["clean", "narrow", "straight"]),
        ("My brother is very <b>foolish</b> sometimes.", "silly", ["wise", "tall", "hungry"]), ("It is <b>essential</b> to drink water every day.", "necessary", ["unusual", "tasty", "optional"]),
        ("The shop sells <b>inexpensive</b> notebooks.", "cheap", ["costly", "heavy", "noisy"]), ("The room was <b>untidy</b>, with toys everywhere.", "messy", ["neat", "dark", "warm"]),
        ("The thunder made the windows <b>tremble</b>.", "shake", ["freeze", "sing", "glow"]), ("We heard a <b>marvellous</b> story about a dragon.", "wonderful", ["terrible", "short", "boring"]),
        ("A <b>foe</b> of the king crept into the castle.", "enemy", ["friend", "servant", "cook"]), ("The explorers had to <b>halt</b> at the river.", "stop", ["start", "dance", "swim"]),
        ("I need to <b>purchase</b> some fruit for the party.", "buy", ["sell", "eat", "wash"]), ("The cat likes to <b>doze</b> in the sun.", "nap", ["jump", "hunt", "run"]),
        ("He gave a <b>jolly</b> laugh.", "cheerful", ["angry", "quiet", "weak"])]

ANTONYMS = [("empty", "full"), ("early", "late"), ("open", "shut"), ("always", "never"), ("wet", "dry"), ("heavy", "light"), ("bright", "dim"), ("thick", "thin"), ("inside", "outside"),
            ("borrow", "lend"), ("win", "lose"), ("arrive", "depart"), ("cheap", "expensive"), ("hard", "soft"), ("young", "old"), ("careful", "careless"), ("polite", "rude"), ("push", "pull"),
            ("strong", "weak"), ("clean", "dirty")]

STRONGER = [("big", "enormous", ["small", "average", "tidy"]), ("hot", "boiling", ["warm", "mild", "cool"]), ("cold", "freezing", ["chilly", "cool", "mild"]), ("angry", "furious", ["cross", "annoyed", "calm"]),
            ("scared", "terrified", ["nervous", "worried", "calm"]), ("tired", "exhausted", ["sleepy", "drowsy", "awake"]), ("good", "excellent", ["fine", "okay", "nice"]), ("pretty", "gorgeous", ["nice", "plain", "okay"]),
            ("walk", "march", ["stroll", "wander", "stop"]), ("said", "shouted", ["whispered", "murmured", "asked"])]


def build():
    Q = [flash("Shades of meaning", "Synonyms are close but not identical - some are stronger than others (warm, hot, boiling).", "big < huge < enormous"),
         flash("Word choice", "Picking the best word for what you want to say. A synonym can make writing clearer and more exciting.", "'The soup was boiling' is stronger than 'The soup was warm'."),
         flash("Opposite words", "Antonyms. The opposite of full is empty; the opposite of early is late.", "hard / soft, young / old, win / lose")]
    Q.append(mc("Which word is the BEST synonym for <b>enormous</b>?", "gigantic", ["tiny", "quiet", "angry"]))
    Q.append(mc("A thesaurus helps you to find...", "Words that mean the same", ["How to spell names", "Words that rhyme", "Answers to sums"]))
    allw = [w for p in PAIRS2 for w in p]
    for i, (a, b) in enumerate(PAIRS2):
        wrong = pick([w for j, p in enumerate(PAIRS2) if j != i for w in p], 3)
        if i % 2 == 0:
            Q.append(mc("Which word has a similar meaning to <b>%s</b>?" % a, b, wrong))
        else:
            Q.append(mc("Which word means almost the same as <b>%s</b>?" % b, a, wrong))
    for i in range(0, 56, 4):
        Q.append(match("Match each word with its synonym.", PAIRS2[i:i + 4]))
    for sent, ans, wrong in SENT:
        Q.append(mc("Choose the word that means the same as the <b>bold</b> word and still makes sense:<br><i>%s</i>" % sent, ans, wrong))
    for cl, opp in zip(CLUSTERS, OPPOSITE_OF_CLUSTER):
        Q.append(mc("Which word does NOT belong with the others?<br><i>%s</i>" % ", ".join(shuffled(cl[:3] + [opp])), opp, cl[:3]))
        others = [w for w in OPPOSITE_OF_CLUSTER if w != opp and w not in cl]
        Q.append(mc("Which word is a synonym of <b>%s</b>?" % cl[0], cl[1], [opp] + pick(others, 2)))
    for a, b in ANTONYMS:
        wrongs = pick([w for p in ANTONYMS for w in p if w not in (a, b)], 3)
        Q.append(mc("Which word is the OPPOSITE of <b>%s</b>?" % a, b, wrongs))
    for a, b, wrong in STRONGER:
        Q.append(mc("Which word is STRONGER than <b>%s</b>?" % a, b, wrong))
    for a, b in PAIRS2[:12]:
        Q.append(fill("Type a synonym for <b>%s</b> from this list: %s" % (a, ", ".join(shuffled([b] + pick([w for p in PAIRS2 if a not in p for w in p], 3)))), b))
    for a, b in PAIRS2[:16]:
        Q.append(mc("Synonym or not?<br><b>%s</b> - <b>%s</b>" % (a, b), "Synonyms", ["Not synonyms"], minwrong=1))
    for a, b in [("hot", "cold"), ("early", "late"), ("empty", "full"), ("win", "lose"), ("borrow", "lend"), ("cheap", "expensive"), ("young", "old"), ("push", "pull")]:
        Q.append(mc("Synonym or not?<br><b>%s</b> - <b>%s</b>" % (a, b), "Not synonyms", ["Synonyms"], minwrong=1))
    return Q
