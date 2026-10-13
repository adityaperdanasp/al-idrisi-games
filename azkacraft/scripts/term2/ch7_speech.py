from common import *

OPEN, CLOSE = "“", "”"
PAIRS = [("My mum wanted to know why I needed to go to the shop.", "“Why do you need to go to the shop?” my mum asked."),
         ("I told her that I needed to buy some flowers.", "“I need to buy some flowers,” I told her."),
         ("My mum said we could go.", "“We can go,” my mum said."),
         ("I excitedly explained that the flowers were for my teacher.", "“The flowers are for my teacher!” I explained excitedly."),
         ("My mum told me that this was a very nice idea.", "“That is a very nice idea,” my mum told me."),
         ("I said that we should go now.", "“We should go now,” I said."),
         ("My mum laughed and said she would race me to the car.", "“I will race you to the car!” my mum laughed."),
         ("Leo whispered that they needed to leave right now.", "“We need to leave right now,” whispered Leo."),
         ("Mia asked if they had found the map yet.", "“Have we found the map yet?” asked Mia."),
         ("The teacher told the class to take out their books.", "“Please take out your books,” the teacher told the class."),
         ("Sam shouted that the bus was leaving.", "“The bus is leaving!” shouted Sam."),
         ("Dad said that dinner was ready.", "“Dinner is ready,” Dad said."),
         ("Ella said she was ready.", "“I'm ready!” said Ella."),
         ("Ben asked where the key was.", "“Where is the key?” asked Ben."),
         ("Sara suggested looking in the kitchen.", "“Let's look in the kitchen,” suggested Sara.")]

def variants(c):
    v = []
    v.append(c.replace(OPEN, "").replace(CLOSE, ""))  # no speech marks
    v.append(c.replace("," + CLOSE, CLOSE + ",").replace("?" + CLOSE, CLOSE + "?").replace("!" + CLOSE, CLOSE + "!"))  # punctuation outside
    first = c[1]; v.append(OPEN + first.lower() + c[2:] if first.isupper() and first != "I" else c.replace(OPEN, OPEN + "- "))  # lowercase start
    v.append(c.replace(CLOSE, "").replace(",", ""))
    return [x for x in dict.fromkeys(v) if x != c]

def build():
    Q = [flash("Direct speech", "Writing the exact words someone says, inside speech marks (“ ”).", "“We need to leave now,” whispered Leo."),
         flash("Reported speech", "Telling what someone said WITHOUT using their exact words - no speech marks.", "Leo whispered that they needed to leave."),
         flash("Speech marks", "The marks (“ ”), also called inverted commas, that go around the spoken words.", "“Good morning!” said Mia."),
         flash("Reporting clause", "The part that says who is speaking, like 'said Mia' or 'I asked'.", "“Look!” said Sara. - 'said Sara' is the reporting clause.")]
    Q.append(mc("What do speech marks (“ ”) go around?", "The exact words someone says", ["The name of the speaker", "The whole paragraph", "The title of a story"]))
    Q.append(mc("Which is another name for speech marks?", "Inverted commas", ["Full stops", "Brackets", "Apostrophes only"]))
    Q.append(mc("What punctuation usually comes before the closing speech mark when the speech is followed by 'said Leo'?", "A comma, question mark or exclamation mark", ["A full stop only", "A colon", "Nothing"]))
    Q.append(mc("When a new person starts speaking, what should you do?", "Start a new line", ["Keep writing on the same line", "Write it in capitals", "Leave a long gap"]))
    for rep, dire in PAIRS:
        Q.append(mc("Which sentence turns the reported speech into direct speech?<br><i>%s</i>" % rep, dire, variants(dire)))
    for rep, dire in PAIRS[:10]:
        Q.append(mc("Which sentence uses DIRECT speech?", dire, [r for r, _ in pick([p for p in PAIRS if p[0] != rep], 3)]))
        Q.append(mc("Which sentence uses REPORTED speech (no speech marks)?", rep, [d for _, d in pick([p for p in PAIRS if p[1] != dire], 3)]))
    SPEAKER = ["my mum", "I", "my mum", "I", "my mum", "I", "my mum", "Leo", "Mia", "the teacher", "Sam", "Dad", "Ella", "Ben", "Sara"]
    for (rep, dire), who in zip(PAIRS, SPEAKER):
        Q.append(mc("Who is speaking?<br><i>%s</i>" % dire, who, [x for x in dict.fromkeys(SPEAKER) if x != who][:3]))
    for rep, dire in PAIRS[:8]:
        words = dire.rstrip(".").split()
        Q.append(sb(words, prompt="Put the words in order to make a direct speech sentence.", answer=dire.rstrip(".")))
    Q.append(mc("Which is correct?", "“Hurry up!” called Sam.", ["Hurry up! called Sam.", "“Hurry up”! called Sam.", "“Hurry up! Called Sam.”"]))
    Q.append(mc("Which is correct?", "Mia said, “Good morning, Tom!”", ["Mia said, Good morning, Tom!", "Mia said “good morning, Tom!”", "Mia said “Good morning, Tom”!"]))
    Q.append(mc("Which sentence has the speech marks in the right place?", "“Can we go to the shop?” I asked.", ["Can we “go to the shop?” I asked.", "“Can we go” to the shop? I asked.", "Can we go to the shop? “I asked.”"]))
    Q.append(mc("In <i>“We need to find it,” said Ben.</i> which word is the speaker?", "Ben", ["need", "find", "said"]))
    Q.append(mc("Why is there a question mark inside the speech marks in <i>“Where is the key?” asked Ben.</i>?", "Because the spoken words are a question", ["Because Ben is a boy", "Because it is the end of the story", "No reason"]))
    Q.append(mc("Which word is the reporting clause verb in <i>“Look!” whispered Noah.</i>?", "whispered", ["Look", "Noah", "the"]))
    return Q
