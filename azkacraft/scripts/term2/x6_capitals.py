"""Chapter 6 (Capital Letters & Full Stops, case-sensitive) -- second batch of sentences and rules."""
from common import *

CORRECT2 = [
    ("Rafi and Nadia went to Bali in July.", ["rafi and nadia went to bali in july.", "Rafi and nadia went to bali in July.", "Rafi And Nadia Went To Bali In July."]),
    ("On Sunday we visited Borobudur.", ["on sunday we visited borobudur.", "On sunday we visited Borobudur.", "On Sunday we visited borobudur."]),
    ("My teacher, Mrs Putri, speaks English and Indonesian.", ["my teacher, mrs putri, speaks english and indonesian.", "My teacher, mrs Putri, speaks english and Indonesian.", "My teacher, Mrs Putri, speaks english and indonesian."]),
    ("Eid is a happy time for my family.", ["eid is a happy time for my family.", "Eid Is A Happy Time For My Family.", "eid is a happy time for my Family."]),
    ("Can you pass me the salt?", ["can you pass me the salt?", "Can you pass me the salt.", "Can you pass me The Salt?"]),
    ("I live in Surabaya, but my cousin lives in Bandung.", ["i live in surabaya, but my cousin lives in bandung.", "I live in surabaya, but my cousin lives in bandung.", "I live in Surabaya, but my cousin lives in bandung."]),
    ("In December we go on holiday.", ["in december we go on holiday.", "In december we go on holiday.", "In December We Go On Holiday."]),
    ("Mount Bromo is a volcano in East Java.", ["mount bromo is a volcano in east java.", "Mount bromo is a volcano in east java.", "Mount Bromo is a Volcano in East Java."]),
    ("Dad bought a Lego set for my birthday.", ["dad bought a lego set for my birthday.", "Dad bought a lego set for my birthday.", "dad bought a Lego set for my Birthday."]),
    ("The Indian Ocean is very big.", ["the indian ocean is very big.", "The indian ocean is very big.", "the Indian Ocean is very big."]),
    ("Azka and I are going to the library.", ["azka and i are going to the library.", "Azka and i are going to the library.", "azka and I are going to the library."]),
    ("What a wonderful surprise!", ["what a wonderful surprise!", "What a wonderful surprise.", "What A Wonderful Surprise!"]),
]
MISS2 = [
    ("We went to the museum in jakarta.", "jakarta", ["museum", "went", "the"]), ("My sister's name is rani.", "rani", ["sister's", "name", "is"]),
    ("The festival of diwali is full of lights.", "diwali", ["festival", "lights", "full"]), ("School starts again in january.", "january", ["school", "starts", "again"]),
    ("She can speak spanish very well.", "spanish", ["speak", "very", "well"]), ("i want to be a pilot.", "i", ["want", "pilot", "be"]),
    ("We flew over the himalayas.", "himalayas", ["flew", "over", "the"]), ("My uncle works at google.", "google", ["uncle", "works", "at"]),
    ("Our new teacher is Miss sari.", "sari", ["new", "teacher", "is"]), ("The nile is a very long river.", "nile", ["very", "long", "river"]),
]
REWRITE2 = [
    ("my brother lives in singapore", "My brother lives in Singapore.", "full stop"), ("azka and rafi play football on saturday", "Azka and Rafi play football on Saturday.", "full stop"),
    ("we are going to bali in december", "We are going to Bali in December.", "full stop"), ("i like to read about the amazon river", "I like to read about the Amazon River.", "full stop"),
    ("nadia speaks english and indonesian", "Nadia speaks English and Indonesian.", "full stop"), ("mrs putri teaches us maths", "Mrs Putri teaches us maths.", "full stop"),
    ("on friday i visited yogyakarta", "On Friday I visited Yogyakarta.", "full stop"), ("eid is in the month of syawal", "Eid is in the month of Syawal.", "full stop"),
    ("my cat is called mimi", "My cat is called Mimi.", "full stop"), ("mount bromo is in java", "Mount Bromo is in Java.", "full stop"),
    ("dad and i went to jakarta in april", "Dad and I went to Jakarta in April.", "full stop"), ("do you like pizza", "Do you like pizza?", "question mark"),
    ("what a lovely garden", "What a lovely garden!", "exclamation mark"), ("i have a lego car", "I have a Lego car.", "full stop"),
    ("the students visit the zoo in june", "The students visit the zoo in June.", "full stop"), ("where is mimi", "Where is Mimi?", "question mark"),
]
ENDS2 = [("Where is my pencil", "?"), ("I love my new bike", "."), ("Look out", "!"), ("Can we go now", "?"), ("The bus arrives at eight", "."), ("What a big wave", "!"),
         ("Is it time for lunch", "?"), ("Please sit down", "."), ("Hooray, we won", "!"), ("Who ate the last cookie", "?")]
MARKS = {".": "a full stop (.)", "?": "a question mark (?)", "!": "an exclamation mark (!)"}
RULES = [("Which word needs a capital letter?", "Sunday", ["tomorrow", "weekend", "morning"]), ("Which word needs a capital letter?", "English", ["language", "speaking", "words"]),
         ("Which word needs a capital letter?", "Indonesia", ["country", "island", "beach"]), ("Which word needs a capital letter?", "Mrs", ["teacher", "woman", "neighbour"]),
         ("Which word needs a capital letter?", "Christmas", ["festival", "present", "tree"]), ("Which word needs a capital letter?", "Lego", ["toy", "block", "brick"]),
         ("Why does <b>Jakarta</b> need a capital letter?", "It is the name of a city", ["It is a long word", "It is at the end", "It is a feeling"]),
         ("Why does the word <b>I</b> always have a capital letter?", "It is a special rule for the word I", ["It is the name of a place", "It is the first word of every page", "It is a very long word"]),
         ("Which of these always starts with a capital letter?", "The name of a month", ["The name of a colour", "The name of an animal", "The name of a fruit"]),
         ("Which of these does NOT need a capital letter?", "school (in <i>I like school</i>)", ["Monday", "Bali", "Azka"]),
         ("Which of these does NOT need a capital letter in the middle of a sentence?", "river", ["Amazon", "Nile", "Java"]),
         ("What do we put at the end of a sentence that tells us something?", "A full stop", ["A comma", "A capital letter", "A question mark"]),
         ("What do we put at the end of a question?", "A question mark", ["A full stop", "A comma", "An exclamation mark"]),
         ("What do we put at the end of a sentence that shows strong feeling?", "An exclamation mark", ["A full stop", "A comma", "A question mark"])]


def build():
    Q = [flash("Capital letters for titles", "Mr, Mrs, Miss and Dr start with a capital letter when they come before a name.", "Mrs Putri is our teacher."),
         flash("Capital letters for languages", "Names of languages and nationalities start with a capital letter.", "She speaks English, Indonesian and French."),
         flash("Capital letters for festivals", "Special days and festivals start with a capital letter.", "We celebrate Eid and Christmas.")]
    for good, wrong in CORRECT2:
        Q.append(mc("Which sentence is written correctly?", good, wrong))
    for sent, ans, wrong in MISS2:
        Q.append(mc("Which word needs a capital letter?<br><i>%s</i>" % sent, ans, wrong))
    for p, a, mark in REWRITE2:
        Q.append(fill("Rewrite with the correct capital letters and %s: <i>\"%s\"</i>" % (mark, p), a))
    for s, e in ENDS2:
        Q.append(mc("Which mark goes at the end?<br><i>%s</i>" % s, MARKS[e], [v for k, v in MARKS.items() if k != e]))
    for q, a, wrong in RULES:
        Q.append(mc(q, a, wrong))
    Q.append(match("Match each word to why it needs a capital letter.", [("Monday", "A day of the week"), ("Bali", "A place"), ("Nadia", "A person's name"), ("July", "A month")]))
    Q.append(match("Match each word to why it needs a capital letter.", [("Eid", "A festival"), ("English", "A language"), ("Mrs", "A title"), ("Singapore", "A country")]))
    Q.append(match("Match each sentence to its ending mark.", [("Who took my book", "?"), ("The bell rang", "."), ("Watch out", "!")]))
    Q.append(sb(["We", "visited", "Yogyakarta", "in", "June"], answer="We visited Yogyakarta in June"))
    Q.append(sb(["My", "name", "is", "Azka"], answer="My name is Azka"))
    Q.append(sb(["Dad", "and", "I", "went", "to", "Bali"], answer="Dad and I went to Bali"))
    Q.append(sb(["Mrs", "Putri", "teaches", "us", "English"], answer="Mrs Putri teaches us English"))
    return Q
