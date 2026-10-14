"""Chapter 9 (Identifying the Speaker in Dialogue) -- second batch: six new script-style dialogues and three narrative dialogues."""
from common import *

COLON2 = [
    ("At the Zoo", [("Ayu", "Look at the giraffe!"), ("Bima", "It is so tall!"), ("Ayu", "I want to feed it."), ("Keeper", "Please stay behind the fence."), ("Bima", "Sorry, we will!")]),
    ("The Birthday Surprise", [("Mum", "Close your eyes, Rani."), ("Rani", "Why do I have to?"), ("Dad", "You will see in a moment."), ("Rani", "Is that a cake?"), ("Mum", "Happy birthday, sweetheart!"), ("Rani", "Thank you!")]),
    ("At the Bakery", [("Baker", "Good morning! What would you like?"), ("Citra", "Two rolls and a loaf, please."), ("Baker", "That will be eight thousand rupiah."), ("Citra", "Here you are."), ("Baker", "Thank you. Have a nice day!")]),
    ("Science Class", [("Teacher", "What happens when ice melts?"), ("Dina", "It turns into water."), ("Teacher", "Well done, Dina."), ("Eko", "Does it melt faster in the sun?"), ("Teacher", "Yes, it does, Eko.")]),
    ("Lost in the Park", [("Fajar", "Where is Mum?"), ("Lia", "I don't know. Let's ask that policeman."), ("Policeman", "Are you two lost?"), ("Fajar", "Yes, we can't find our mum."), ("Policeman", "Don't worry. I will help you.")]),
    ("The Broken Vase", [("Dad", "Who broke the vase?"), ("Gita", "It wasn't me!"), ("Bayu", "I'm sorry, Dad. It was me."), ("Dad", "Thank you for telling the truth, Bayu."), ("Gita", "I'll help you clean up.")]),
]
ADDRESSED = [("The Birthday Surprise", 0, "Rani", ["Dad", "Mum", "The baker"]), ("Science Class", 2, "Dina", ["Eko", "The teacher", "The class"]), ("Science Class", 4, "Eko", ["Dina", "The class", "The principal"]),
             ("The Broken Vase", 3, "Bayu", ["Gita", "Dad", "Mum"])]
NARR2 = [
    ("The Rainy Walk", "“Do you have an umbrella?” asked Sari.<br>Doni shook his head. “I left it at home.”<br>“Then share mine,” said Sari. “There is room for two.”<br>“Thank you!” Doni grinned.",
     [("Sari", "Do you have an umbrella?", "'asked Sari' names the speaker"), ("Doni", "I left it at home.", "Doni's name comes right before the quote"),
      ("Sari", "Then share mine.", "'said Sari' names the speaker"), ("Doni", "Thank you!", "Doni's name comes right after the quote")]),
    ("The Treasure Map", "“I found a map!” shouted Tomi.<br>Lala looked closely. “It shows an island with a big X.”<br>“Let's follow it,” said Tomi.<br>“Wait! We need a torch first,” warned Lala.",
     [("Tomi", "I found a map!", "'shouted Tomi' names the speaker"), ("Lala", "It shows an island with a big X.", "Lala's name comes right before the quote"),
      ("Tomi", "Let's follow it.", "'said Tomi' names the speaker"), ("Lala", "Wait! We need a torch first.", "'warned Lala' names the speaker")]),
    ("Cooking Together", "Grandma opened the oven. “The cake is ready,” she said.<br>“It smells wonderful!” cried Rina.<br>“Can I decorate it?” asked Joko.<br>“Of course,” said Grandma. “Rina can help too.”",
     [("Grandma", "The cake is ready.", "the sentence before it says Grandma opened the oven, and 'she said' follows"), ("Rina", "It smells wonderful!", "'cried Rina' names the speaker"),
      ("Joko", "Can I decorate it?", "'asked Joko' names the speaker"), ("Grandma", "Of course.", "'said Grandma' names the speaker")]),
]


def build():
    Q = [flash("Speaker tag", "The words that say who is speaking, like 'said Rani' or 'asked Mum'.", "“Look!” said Ayu. - 'said Ayu' is the speaker tag."),
         flash("Script (play) style", "A dialogue written with the speaker's name before a colon, like Ayu: “Look!”", "Ayu: “Look at the giraffe!”")]
    for title, ds in COLON2:
        names = list(dict.fromkeys(s for s, _ in ds))
        text = lines(*["<b>%s:</b> “%s”" % (s, l) for s, l in ds])
        # three "who said" questions per dialogue
        for i in (0, len(ds) // 2, len(ds) - 1):
            s, l = ds[i]
            Q.append(mc("<i>%s</i><br>%s<br><br>Who said: “%s”?" % (title, text, l), s, [n for n in names if n != s], minwrong=1))
        Q.append(mc("<i>%s</i><br>%s<br><br>How many different people speak?" % (title, text), str(len(names)), [str(x) for x in range(1, 6) if x != len(names)][:3]))
        s0, l0 = ds[1]
        Q.append(fill("<i>%s</i><br>%s<br><br>Who said: “%s”? (Type the name.)" % (title, text, l0), s0))
        pairs, seen = [], set()
        for s, l in ds:
            if l not in seen and len(pairs) < 4 and s not in [p[1] for p in pairs]:
                pairs.append((l, s)); seen.add(l)
        if len(pairs) >= 3:
            Q.append(match("Who said it? Match each line from <i>%s</i> to its speaker." % title, pairs))
    for title, i, who, wrong in ADDRESSED:
        ds = dict(COLON2)[title]
        text = lines(*["<b>%s:</b> “%s”" % (s, l) for s, l in ds])
        Q.append(mc("<i>%s</i><br>%s<br><br>Who is being spoken to when the line says: “%s”?" % (title, text, ds[i][1]), who, wrong))
    for title, text, ls in NARR2:
        names = list(dict.fromkeys(s for s, _, _ in ls))
        for i, (s, l, clue) in enumerate(ls):
            Q.append(mc("<i>%s</i><br>%s<br><br>Who says line %d: “%s”" % (title, text, i + 1, l) + "?", s, [n for n in names if n != s] + (["Nobody"] if len(names) < 3 else []), minwrong=1))
        s, l, clue = ls[1]
        Q.append(mc("<i>%s</i><br>%s<br><br>How do you know who says: “%s”?" % (title, text, l), clue[0].upper() + clue[1:],
                    ["The speaker is the person who is quietest", "It is always the first person in the story", "The quote has no clue at all"]))
    Q.append(match("Match each speaker clue to what it tells you.", [("A name before a colon (Ayu:)", "That person is speaking"), ("'asked Mum'", "Mum is the speaker"), ("A new paragraph or line", "The speaker has changed"), ("“Thank you,” said Dina.", "Dina said it")]))
    Q.append(mc("In a play script, what comes before the colon?", "The speaker's name", ["The time", "The place", "The title"]))
    Q.append(mc("In <i>“I can help,” said Bayu.</i> who is speaking?", "Bayu", ["Nobody", "I", "The reader"]))
    Q.append(mc("When two people talk in a story, what helps you keep track of who is speaking?", "Speaker tags and a new line for each speaker", ["Long words", "Capital letters only", "The page number"]))
    Q.append(mc("In <i>Tomi ran to the door. “Who is there?”</i> who asks 'Who is there?'", "Tomi", ["The door", "Nobody", "The reader"]))
    return Q
