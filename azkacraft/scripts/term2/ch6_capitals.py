from common import *

CORRECT = [("My name is Lily and I live in Jakarta.", ["my name is lily and i live in jakarta.", "My name is lily and I live in jakarta.", "my Name Is Lily And I Live In Jakarta."]),
           ("On Monday we are going to the beach.", ["on monday we are going to the beach.", "On monday we are going to the beach.", "On Monday We Are going to the beach."]),
           ("I miss you all.", ["i miss you all.", "I Miss You All.", "i Miss you all."]), ("Luvakass is an alien from the planet Inko.", ["luvakass is an alien from the planet inko.", "Luvakass is an alien from the planet inko.", "luvakass is an Alien from the planet Inko."]),
           ("It is very different to Inko.", ["it is very different to inko.", "It is very different to inko.", "it is very different to Inko."]),
           ("Mum and Dad love the sea.", ["mum and dad love the sea.", "Mum and dad love The Sea.", "mum And Dad love the sea."]),
           ("We visited England, Wales and Ireland in August.", ["we visited england, wales and ireland in august.", "We visited england, wales and ireland in august.", "We visited England, Wales and Ireland in august."]),
           ("Water falls out of the sky a lot.", ["water falls out of the sky a lot.", "Water Falls Out Of The Sky A Lot.", "water Falls out of the sky a lot."]),
           ("Sara and David have taught me a lot.", ["sara and david have taught me a lot.", "Sara and david have taught me a lot.", "sara And David have taught me a lot."]),
           ("Ramadan comes after Sya'ban.", ["ramadan comes after sya'ban.", "Ramadan comes after sya'ban.", "ramadan comes after Sya'ban."]),
           ("Azka and I played football on Friday.", ["azka and i played football on friday.", "Azka and i played football on friday.", "Azka and I played football on friday."]),
           ("The river flows through Jakarta to the sea.", ["the river flows through jakarta to the sea.", "The river flows through jakarta to the sea.", "The River Flows Through Jakarta To The Sea."])]
NEEDS = [("we went to jakarta last week", ["we", "jakarta"], "Both 'We' and 'Jakarta'"), ("my friend rani lives in bandung", None, None)]
MISS = [("Which word needs a capital letter in the middle of the sentence?<br><i>We visited paris in the summer.</i>", "paris", ["visited", "summer", "the"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>My birthday is in october.</i>", "october", ["birthday", "is", "in"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>We play football every saturday.</i>", "saturday", ["football", "play", "every"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>Today i feel very happy.</i>", "i", ["feel", "very", "happy"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>Lucy and tim went to the park.</i>", "tim", ["went", "park", "and"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>The Eiffel Tower is in france.</i>", "france", ["tower", "is", "in"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>My dog is called max.</i>", "max", ["dog", "called", "is"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>We celebrate eid with our family.</i>", "eid", ["celebrate", "family", "with"], False),
        ("Which word needs a capital letter in the middle of the sentence?<br><i>The ship sailed across the pacific ocean.</i>", "pacific", ["ship", "sailed", "across"], False)]
REWRITE = [("i have now been on earth for two weeks", "I have now been on Earth for two weeks."), ("it is very different to inko", "It is very different to Inko."),
           ("people drive around in metal boxes", "People drive around in metal boxes."), ("food is eaten by putting it in your face", "Food is eaten by putting it in your face."),
           ("water falls out of the sky a lot", "Water falls out of the sky a lot."), ("i miss you all", "I miss you all."), ("mason and akira got wet in the rain", "Mason and Akira got wet in the rain."),
           ("my name is lily", "My name is Lily."), ("we went to jakarta on friday", "We went to Jakarta on Friday."), ("today is monday", "Today is Monday."),
           ("rani and i are best friends", "Rani and I are best friends."), ("the cat sat on the mat", "The cat sat on the mat."), ("azka lives in indonesia", "Azka lives in Indonesia."),
           ("luvakass", "Luvakass"), ("mum and dad", "Mum and Dad"), ("inko", "Inko")]
ENDS = [("Where do you live", "?"), ("What a lovely day", "!"), ("The cat is asleep", "."), ("Can you help me", "?"), ("Watch out", "!"), ("I like pizza", "."),
        ("How old are you", "?"), ("Stop that now", "!"), ("We went to the park", "."), ("Is it raining", "?"), ("Happy birthday", "!"), ("The bus is late", ".")]

def build():
    Q = [flash("Capital letter", "A big letter (A, B, C...). We use one at the start of every sentence and for names, places, days, months and the word 'I'.", "My friend Sara lives in Jakarta."),
         flash("Full stop", "The dot (.) that ends a sentence that is a statement.", "The cat sat on the mat."),
         flash("Proper noun", "The special name of a person, place or thing - it always needs a capital letter.", "Lily, Monday, Indonesia, Ramadan."),
         flash("Question mark", "The mark (?) at the end of a question. The exclamation mark (!) ends a strong feeling.", "Where do you live? What a lovely day!")]
    Q.append(mc("When do we use a capital letter?", "At the start of a sentence and for names of people and places", ["Only at the end of a sentence", "For every long word", "Never in a letter"]))
    Q.append(mc("Which of these ALWAYS needs a capital letter?", "The word 'I'", ["The word 'and'", "The word 'happy'", "The word 'because'"]))
    Q.append(mc("Which kind of word needs a capital letter, even in the middle of a sentence?", "A day of the week, like Monday", ["A colour, like blue", "An animal, like cat", "A number, like seven"]))
    Q.append(mc("Which needs a capital letter?", "March", ["spring", "river", "morning"]))
    Q.append(mc("Which needs a capital letter?", "Jakarta", ["city", "street", "market"]))
    Q.append(mc("Which sentence ending is correct for a question?", "Where do you live?", ["Where do you live.", "Where do you live", "Where do you live!"]))
    for c, wrong in CORRECT:
        Q.append(mc("Which sentence is written correctly?", c, wrong))
    for p, a, w, _first in MISS:
        Q.append(mc(p, a, w))
    for p, a in REWRITE:
        Q.append(fill("Rewrite with the correct capital letters%s: <i>\"%s\"</i>" % (" and full stop" if a.endswith(".") else "", p), a))
    for s, e in ENDS:
        allm = {".": "a full stop (.)", "?": "a question mark (?)", "!": "an exclamation mark (!)"}
        Q.append(mc("Which mark goes at the end?<br><i>%s</i>" % s, allm[e], [v for k, v in allm.items() if k != e], minwrong=2))
    Q.append(match("Match the sentence to its correct ending mark.", [("Where is my bag", "?"), ("The sun is hot", "."), ("What a great goal", "!")]))
    Q.append(match("Match each name to what kind of word it is.", [("Monday", "A day"), ("Jakarta", "A city"), ("Ramadan", "A month"), ("Azka", "A person")]))
    Q.append(sb(["My", "friend", "Rani", "lives", "in", "Bandung"], answer="My friend Rani lives in Bandung"))
    Q.append(sb(["We", "went", "to", "Jakarta", "on", "Friday"], answer="We went to Jakarta on Friday"))
    Q.append(sb(["I", "miss", "you", "all"], answer="I miss you all"))
    return Q
