from common import *

COLON = [  # (title, [(speaker, line)])
    ("At the Pet Shop", [("Nora", "Look at those rabbits!"), ("Sam", "They are very cute."), ("Nora", "I like the white one."), ("Sam", "I like the brown one."), ("Nora", "What would you name it?"), ("Sam", "I would call it Coco.")]),
    ("A Busy Morning", [("Teacher", "Good morning, everyone."), ("Maya", "Good morning, Miss!"), ("Teacher", "Please take out your English books."), ("Maya", "I forgot my book at home."), ("Teacher", "That is okay. You can share with Daniel."), ("Daniel", "You can use my book, Maya."), ("Maya", "Thank you, Daniel!")]),
    ("The Missing Lunchbox", [("Aisha", "Has anyone seen my lunchbox?"), ("Ryan", "What does it look like?"), ("Aisha", "It is blue with a yellow star."), ("Luca", "I saw a blue lunchbox near the library."), ("Aisha", "Really? Let's go and look for it."), ("Ryan", "I will come with you."), ("Luca", "I hope you find it!")]),
    ("Orange Juice", [("Emma", "Would you like some orange juice?"), ("Leo", "Yes, please. Thank you!"), ("Emma", "Here you are."), ("Leo", "Thanks!")]),
    ("Football Practice", [("Coach", "Warm up with two laps, everyone."), ("Rafi", "Can I be the goalkeeper today?"), ("Coach", "Yes, Rafi. Dimas, you play in defence."), ("Dimas", "Okay, Coach!"), ("Rafi", "I'll save every shot.")]),
    ("At the Library", [("Zara", "Do you have a book about space?"), ("Librarian", "Yes, it is on the third shelf."), ("Omar", "Can I borrow it after Zara?"), ("Zara", "Of course, I will return it on Friday."), ("Librarian", "Please remember to bring your card.")]),
    ("The Picnic", [("Mum", "Who wants a sandwich?"), ("Anya", "Me, please!"), ("Kai", "Can I have the cheese one?"), ("Mum", "Here you go, Kai."), ("Anya", "Look, a butterfly!")]),
]
NARR = [  # (title, [(speaker, line, clue)])
    ("The Lost Key", [("Ben", "We need to find it before Mum comes home,", "said Ben, looking under the sofa - the reporting clause names Ben"), ("Sara", "Maybe it is in here.", "Sara opened the drawer, and the quote comes right after her name"),
                       ("Ben", "It isn't there! Check the kitchen!", "it is a new line, so the speaker switches back to Ben, and the urgent tone matches his earlier worry")]),
    ("The Strange Noise", [("Noah", "Did you hear that?", "whispered Noah names the speaker"), ("Ella", "Yes. What was it?", "Ella looked toward the window - her name is before the quote"),
                            ("Noah", "I'm not sure. Let's take a look.", "a new line switches back to Noah, who spoke first"), ("Ella", "Wait! Don't open the door yet.", "a new line switches to Ella, the other person")]),
    ("Catching the Bus", [("Sam", "Hurry! The bus is leaving!", "called Sam names the speaker"), ("Ella", "I'm ready!", "Ella grabbed her coat - her name comes before the quote"),
                           ("Sam", "Did you bring your lunch?", "a new line switches back to Sam, who asked the first question"), ("Ella", "Oh no! I left it on the table.", "a new line switches to Ella, who answers Sam")]),
]

def build():
    Q = [flash("Dialogue", "A conversation between two or more people. Each time a new person speaks, we start a new line.", "Mia: “Good morning, Tom!”  Tom: “Good morning, Mia!”"),
         flash("Speaker clue", "A hint that tells you who is speaking: a name before the colon, a name in the reporting clause (like 'said Ben'), or a new line meaning the speaker has switched.", "“Hurry!” called Sam. - 'called Sam' is a speaker clue.")]
    Q.append(mc("In a dialogue, what does the name before the colon (:) tell us?", "Who is speaking", ["What time it is", "Where they are", "How old they are"]))
    Q.append(mc("A new line in a dialogue usually means...", "A different person is speaking", ["The story has ended", "The speaker is shouting", "The same person is whispering"]))
    Q.append(mc("In <i>“We need to leave,” whispered Leo.</i> which words tell you the speaker?", "whispered Leo", ["We need", "to leave", "the quotation marks"]))
    for title, ds in COLON:
        names = list(dict.fromkeys(s for s, _ in ds))
        text = lines(*["<b>%s:</b> “%s”" % (s, l) for s, l in ds])
        for i, (s, l) in enumerate(ds):
            if i in (0, 1, 3, len(ds) - 1) or len(ds) <= 4:
                Q.append(mc("<i>%s</i><br>%s<br><br>Who said: “%s”?" % (title, text, l), s, [n for n in names if n != s], minwrong=1))
        pairs = []
        seen = set()
        for s, l in ds:
            if l not in seen and len(pairs) < 4:
                pairs.append((l, s)); seen.add(l)
        Q.append(match("Who said it? Match each line from <i>%s</i> to its speaker." % title, pairs))
        s0, l0 = ds[2]
        Q.append(fill("<i>%s</i><br>%s<br><br>Who said: “%s”? (Type the name.)" % (title, text, l0), s0))
    for title, ds in NARR:
        names = list(dict.fromkeys(s for s, _, _ in ds))
        narr = {"The Lost Key": "“We need to find it before Mum comes home,” said Ben, looking under the sofa.<br>Sara opened the drawer. “Maybe it is in here.”<br>“It isn't there! Check the kitchen!”",
                "The Strange Noise": "“Did you hear that?” whispered Noah.<br>Ella looked toward the window. “Yes. What was it?”<br>“I'm not sure. Let's take a look.”<br>“Wait! Don't open the door yet.”",
                "Catching the Bus": "“Hurry! The bus is leaving!” called Sam.<br>Ella grabbed her coat. “I'm ready!”<br>“Did you bring your lunch?”<br>“Oh no! I left it on the table.”"}[title]
        for i, (s, l, clue) in enumerate(ds):
            Q.append(mc("<i>%s</i><br>%s<br><br>Who says line %d: “%s”?" % (title, narr, i + 1, l), s, [n for n in names if n != s], minwrong=1))
        i3 = 2
        s3, l3, c3 = ds[i3]
        good = c3
        wrongs = ["its name is written right after the quote", "the speaker is the one who spoke last in the story", "it is a question, so it must be the teacher"]
        Q.append(mc("<i>%s</i><br>%s<br><br>How do you know who says line %d?" % (title, narr, i3 + 1), good[0].upper() + good[1:], [w[0].upper() + w[1:] for w in wrongs]))
    Q.append(match("Match each speaker clue to what it tells you.", [("A name before a colon (Mia:)", "That person is speaking"), ("said Leo", "The reporting clause names the speaker"), ("A new line", "The speaker has switched"), ("An urgent tone that matches earlier words", "A clue about who is speaking")]))
    Q.append(match("Who said it? In <i>“Hurry!” called Sam. Ella grabbed her coat. “I'm ready!”</i>", [("Hurry!", "Sam"), ("I'm ready!", "Ella")]))
    Q.append(mc("In <i>Mia shook her head. “But we haven't found the map yet!”</i> who says 'But we haven't found the map yet!'?", "Mia", ["The map", "Nobody", "We"]))
    Q.append(mc("What is a good detective clue for finding who is speaking when no name is given?", "Look at the new line and who spoke before", ["Count the letters in the quote", "Look at the page number", "Guess"]))
    return Q
