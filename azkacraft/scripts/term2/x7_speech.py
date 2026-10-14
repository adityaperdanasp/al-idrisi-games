"""Chapter 7 (Direct Speech) -- second batch: new reported/direct pairs, speech verbs, punctuation rules."""
from common import *

OPEN, CLOSE = "“", "”"
PAIRS2 = [("Aisha told her brother that dinner was ready.", "“Dinner is ready,” Aisha told her brother."),
          ("Dimas asked if he could borrow a pencil.", "“Can I borrow a pencil?” asked Dimas."),
          ("The coach said that the match would start at four.", "“The match will start at four,” said the coach."),
          ("Rani whispered that the baby was asleep.", "“The baby is asleep,” whispered Rani."),
          ("Dad shouted that the water was too hot.", "“The water is too hot!” shouted Dad."),
          ("Nadia asked where the library was.", "“Where is the library?” asked Nadia."),
          ("Grandma said that she loved the flowers.", "“I love the flowers,” said Grandma."),
          ("The captain ordered everyone to hold on tight.", "“Hold on tight!” ordered the captain."),
          ("Azka replied that he had finished his homework.", "“I have finished my homework,” replied Azka."),
          ("Mum asked who had eaten the last cake.", "“Who has eaten the last cake?” asked Mum."),
          ("The pilot announced that they would land soon.", "“We will land soon,” announced the pilot."),
          ("Tom cheered that his team had won.", "“My team has won!” cheered Tom."),
          ("Lina asked if anyone wanted a snack.", "“Does anyone want a snack?” asked Lina."),
          ("The teacher explained that the test was on Friday.", "“The test is on Friday,” explained the teacher."),
          ("Bayu groaned that he had forgotten his bag.", "“I have forgotten my bag,” groaned Bayu.")]
SPEAKERS = ["Aisha", "Dimas", "the coach", "Rani", "Dad", "Nadia", "Grandma", "the captain", "Azka", "Mum", "the pilot", "Tom", "Lina", "the teacher", "Bayu"]
LEAD = [("Mia said, “Good morning, Tom!”", ["Mia said, Good morning, Tom!", "Mia said “good morning, Tom!”", "Mia said, “Good morning, Tom”!"]),
        ("Sam asked, “Can I have some water?”", ["Sam asked, Can I have some water?", "Sam asked “can I have some water?”", "Sam asked, “Can I have some water”?"]),
        ("Dad shouted, “Watch out for the car!”", ["Dad shouted, Watch out for the car!", "Dad shouted “watch out for the car!”", "Dad shouted, “Watch out for the car”!"]),
        ("Rani whispered, “Don't wake the baby.”", ["Rani whispered, Don't wake the baby.", "Rani whispered “don't wake the baby.”", "Rani whispered, “Don't wake the baby”."]),
        ("The teacher said, “Please open your books.”", ["The teacher said, Please open your books.", "The teacher said “please open your books.”", "The teacher said, “Please open your books”."]),
        ("Lina cried, “That is my bag!”", ["Lina cried, That is my bag!", "Lina cried “that is my bag!”", "Lina cried, “That is my bag”!"])]
VERBS = [("“Help! I am stuck!” the boy ___.", "shouted", ["whispered", "giggled", "yawned"]), ("“I miss you,” she ___ softly.", "whispered", ["shouted", "roared", "cheered"]),
         ("“We won the match!” the players ___.", "cheered", ["whispered", "sighed", "grumbled"]), ("“Is the shop open?” Dina ___.", "asked", ["shouted", "ordered", "announced"]),
         ("“Please be quiet,” the librarian ___.", "whispered", ["roared", "cheered", "laughed"]), ("“This food is awful,” Ben ___.", "groaned", ["cheered", "giggled", "sang"])]


def variants(c):
    v = []
    v.append(c.replace(OPEN, "").replace(CLOSE, ""))
    v.append(c.replace("," + CLOSE, CLOSE + ",").replace("?" + CLOSE, CLOSE + "?").replace("!" + CLOSE, CLOSE + "!"))
    first = c[1]
    v.append(OPEN + first.lower() + c[2:] if first.isupper() and first != "I" else c.replace(OPEN, OPEN + "- "))
    v.append(c.replace(CLOSE, "").replace(",", ""))
    return [x for x in dict.fromkeys(v) if x != c]


def build():
    Q = [flash("Speech verb", "A stronger or more exact word than 'said': shouted, whispered, asked, cheered, groaned.", "“Quiet!” whispered Mia."),
         flash("Start of speech", "Spoken words start with a capital letter inside the speech marks.", "Mia said, “Good morning, Tom!”"),
         flash("New speaker, new line", "Every time a different person speaks, start a new line.", "“Hello!” said Ali.<br>“Hi!” said Mia.")]
    for rep, dire in PAIRS2:
        Q.append(mc("Which sentence turns the reported speech into direct speech?<br><i>%s</i>" % rep, dire, variants(dire)))
    for rep, dire in PAIRS2[:10]:
        Q.append(mc("Which sentence uses DIRECT speech?", dire, [r for r, _ in pick([p for p in PAIRS2 if p[0] != rep], 3)]))
        Q.append(mc("Which sentence uses REPORTED speech (no speech marks)?", rep, [d for _, d in pick([p for p in PAIRS2 if p[1] != dire], 3)]))
    for (rep, dire), who in zip(PAIRS2, SPEAKERS):
        Q.append(mc("Who is speaking?<br><i>%s</i>" % dire, who, [x for x in dict.fromkeys(SPEAKERS) if x != who][:3]))
    for rep, dire in PAIRS2[:8]:
        Q.append(sb(dire.rstrip(".").split(), prompt="Put the words in order to make a direct speech sentence.", answer=dire.rstrip(".")))
    for good, wrong in LEAD:
        Q.append(mc("Which sentence is punctuated correctly?", good, wrong))
    for p, a, w in VERBS:
        Q.append(mc("Choose the best speech verb:<br><i>%s</i>" % p, a, w))
    Q.append(mc("What goes just BEFORE the opening speech marks in <i>Mia said, “Good morning!”</i>?", "A comma", ["A full stop", "A colon", "Nothing"]))
    Q.append(mc("Which letter should the first spoken word start with, inside the speech marks?", "A capital letter", ["A small letter", "A number", "A comma"]))
    Q.append(mc("Which sentence has the quote and the speaker in the right order?", "“It is time to go,” said Dad.", ["“It is time to go,” Dad said”.", "It is time to go, “said Dad.”", "“It is time to go, said Dad.”"]))
    Q.append(mc("Which is a better word than <i>said</i> for someone speaking very loudly?", "shouted", ["whispered", "mumbled", "sighed"]))
    Q.append(mc("Which is a better word than <i>said</i> for someone speaking very quietly?", "whispered", ["shouted", "roared", "cheered"]))
    Q.append(mc("How many people speak in this dialogue?<br><i>“Hello!” said Ali.<br>“Hi!” said Mia.<br>“Shall we play?” asked Ali.</i>", "2", ["1", "3", "4"]))
    return Q
