from common import *

TERMS = [
    ("Informal letter", "A friendly letter to someone you already know, like family or a friend.", "Dear Aunty Susie, thank you for the lovely present!"),
    ("Formal letter", "A serious letter, usually to someone you don't know, to ask for something or share an opinion.", "Dear Mr Brown, I am writing to ask about the school trip."),
    ("Greeting", "The words that open a letter and address the person you are writing to.", "Dear Grandma, / Hi Sam, / Hello Amy,"),
    ("Complimentary close", "The words just before your name that say goodbye.", "Lots of love, / See you soon, / Best wishes,"),
    ("Signature", "Your name, written at the end of the letter.", "Lots of love, Ella"),
    ("Sender's address", "Where the letter is coming FROM - it goes at the top of the letter.", "99 Toytown Avenue, Arklow"),
]

PARTS = [("Sender's address", "99 Toytown Avenue, Arklow"), ("Date", "Friday 2nd July 2021"), ("Greeting", "Dear Aunty Susie,"),
         ("Message (body)", "Thank you very much for the present you sent me."), ("Complimentary close", "Lots of love,"), ("Signature", "Ella")]

INFORMAL_GREET = ["Hi Sam,", "Hello Amy,", "Dear Grandma,", "Dearest Charming,", "Hi there,", "My dear friend,"]
FORMAL_GREET = ["Dear Mr Brown,", "Dear Sir or Madam,", "Dear Principal,", "To whom it may concern,"]
INFORMAL_CLOSE = ["Lots of love,", "See you soon,", "Talk soon,", "Thinking of you,", "Until next time,", "Love from,", "Speak soon,", "All the best,"]
FORMAL_CLOSE = ["Yours faithfully,", "Yours sincerely,", "Kind regards,", "Respectfully yours,"]
INFORMAL_SENT = ["I can't wait to see you again soon!", "We had a fun day and ate yummy food.", "I hope you are well.", "Guess what happened yesterday?", "Thank you so much for the present - I love it!",
                 "Mum made me a rainbow cake with eight candles."]
FORMAL_SENT = ["I am writing to enquire about the school trip.", "I would be grateful if you could reply as soon as possible.", "Please accept my sincere apologies for the delay.",
               "I look forward to hearing from you.", "I am writing to express my opinion about the new playground.", "Thank you for taking the time to read my letter."]
STARTERS = ["After that,", "Although I...", "Before I tell you about...", "Did you know that...?", "Do you remember when...?", "I am writing because...", "I am writing to tell you that...", "I hope that...", "When I next..."]
WORDS = [("address", ["adress", "addres", "adresss"]), ("although", ["allthough", "althogh", "altho"]), ("answer", ["anser", "ansur", "answir"]),
         ("because", ["becuase", "becaus", "beacause"]), ("before", ["befor", "beefore", "bifore"]), ("enough", ["enuff", "enogh", "enouf"]),
         ("favourite", ["favorit", "favourit", "favrite"]), ("mention", ["menshun", "mension", "mentoin"]), ("please", ["pleese", "pleas", "plese"]),
         ("possible", ["posible", "possable", "possibel"]), ("promise", ["promis", "promiss", "promice"]), ("since", ["sence", "sinse", "cince"]),
         ("therefore", ["therefor", "thearfore", "therfore"]), ("though", ["tho", "thogh", "thouhg"]), ("thought", ["thougt", "thoght", "thuoght"]),
         ("until", ["untill", "untel", "untill"]), ("dear", ["deer", "dere", "deare"])]

def build():
    Q = [flash(w, d, e) for w, d, e in TERMS]
    for w, d, e in TERMS:
        others = [t for t in TERMS if t[0] != w]
        Q.append(mc("What is a %s?" % w.lower() if w[0] not in "AEIOU" else "What is an %s?" % w.lower(), d, [o[1] for o in pick(others, 3)]))
    for part, ex in PARTS:
        Q.append(mc("In a letter, which part is this? <i>\"%s\"</i>" % ex, part, [p for p, _ in PARTS if p != part][:3]))
    Q.append(match("Match each part of a letter to an example.", pick(PARTS, 4)))
    Q.append(match("Match each part of a letter to an example.", pick(PARTS, 4)))
    Q.append(match("Match each part of a letter to an example.", pick(PARTS, 3)))
    # order of parts
    order = [p for p, _ in PARTS]
    Q.append(mc("Which part of a letter comes LAST?", "Signature", ["Date", "Greeting", "Sender's address"]))
    Q.append(mc("Which part of a letter comes right AFTER the greeting?", "The message (body)", ["The date", "The signature", "The complimentary close"]))
    Q.append(mc("Which part of a letter comes right BEFORE the signature?", "Complimentary close", ["Greeting", "Date", "Sender's address"]))
    Q.append(mc("Where does the sender's address go?", "At the top of the letter", ["At the bottom of the letter", "After the signature", "In the middle of the message"]))
    # formal/informal
    for g in INFORMAL_GREET:
        Q.append(mc("Which kind of letter would start with <i>\"%s\"</i>?" % g, "An informal letter (to a friend or family)", ["A formal letter (to a stranger)", "Neither - it is not a greeting", "A shopping list"]))
    for g in FORMAL_GREET:
        Q.append(mc("Which kind of letter would start with <i>\"%s\"</i>?" % g, "A formal letter (to someone you don't know)", ["An informal letter (to a close friend)", "A diary entry", "A poem"]))
    for c in INFORMAL_CLOSE:
        Q.append(mc("Which is an INFORMAL way to say goodbye in a letter?", c, pick(FORMAL_CLOSE, 3)))
    for c in FORMAL_CLOSE:
        Q.append(mc("Which closing is better for a FORMAL letter?", c, pick(INFORMAL_CLOSE, 3)))
    for s in INFORMAL_SENT:
        Q.append(mc("Which sentence sounds like it is from an INFORMAL letter?", s, pick(FORMAL_SENT, 3)))
    for s in FORMAL_SENT:
        Q.append(mc("Which sentence sounds like it is from a FORMAL letter?", s, pick(INFORMAL_SENT, 3)))
    # punctuation / capitals
    Q.append(mc("Which greeting is written correctly?", "Dear Aunty Susie,", ["dear aunty susie", "Dear aunty susie.", "Dear Aunty Susie"]))
    Q.append(mc("Which greeting is written correctly?", "Dear Grandma,", ["dear Grandma,", "Dear grandma", "Dear Grandma."]))
    Q.append(mc("What punctuation mark comes after the greeting <i>Dear Sam</i>?", "A comma (,)", ["A full stop (.)", "A question mark (?)", "No punctuation"]))
    Q.append(mc("Which closing is written correctly?", "Lots of love,", ["lots of love.", "Lots Of Love", "lots of Love,"]))
    Q.append(mc("Which line is written correctly?", "Love from, Ella", ["love from, ella", "Love From Ella.", "love from Ella"]))
    Q.append(mc("Why do we use a capital letter for the name in a signature?", "Because it is someone's name", ["Because it is the end of the letter", "Because it is long", "Because it rhymes"]))
    Q.append(mc("Which date is written correctly?", "Friday 2nd July 2021", ["friday 2nd july 2021", "Friday 2nd july 2021", "friday 2nd July 2021"]))
    # sentence starters
    for s in STARTERS:
        Q.append(mc("Which sentence starter would help you open a friendly letter? <i>\"%s\"</i>" % s if False else "Which of these is a sentence starter you could use in a friendly letter?", s, ["Yours faithfully,", "99 Toytown Avenue", "Dear Sir or Madam,"]))
    # thank-you letter
    Q.append(mc("<i>Dear Aunty Susie,<br>Thank you very much for the present you sent me for my birthday.</i><br><br>Why is Ella writing this letter?", "To say thank you", ["To ask for help", "To complain", "To say sorry"]))
    Q.append(mc("<i>Dear Aunty Susie,<br>Thank you very much for the present...</i><br><br>Who is Ella writing to?", "Aunty Susie", ["Her mum", "Her teacher", "Her friend Sam"]))
    Q.append(mc("<i>I hope you are well and I can't wait to see you again soon. Lots of love, Ella</i><br><br>Which words are the complimentary close?", "Lots of love,", ["I hope you are well", "see you again soon", "Ella"]))
    Q.append(mc("A thank-you letter should say...", "What you are thankful for and why you liked it", ["Only your address", "A long list of questions", "Nothing about the present"]))
    Q.append(mc("Who would you write a FORMAL letter to?", "The principal of a school you have never met", ["Your best friend", "Your cousin", "Your grandma"]))
    Q.append(mc("Who would you write an INFORMAL letter to?", "Your cousin who lives far away", ["A shop manager you have never met", "The mayor", "A stranger"]))
    # spelling of letter words
    for w, wrong in WORDS:
        Q.append(mc("Which is the correct spelling?", w, wrong))
    CLOZE = [("I stayed inside ___ it was raining.", "because"), ("Wash your hands ___ you eat.", "before"), ("___ it was late, we kept playing.", "although"), ("Wait here ___ I come back.", "until"),
             ("Could you ___ pass the salt?", "please"), ("I have had ___ food, thank you.", "enough"), ("Blue is my ___ colour.", "favourite"), ("Write your name and ___ at the top of the letter.", "address"),
             ("I ___ to write to you every week.", "promise"), ("I ___ you were at school today.", "thought")]
    for p, w in CLOZE:
        Q.append(fill("Type the missing word (it is from the letter-writing word bank):<br><i>%s</i>" % p, w))
    # ordering
    Q.append(sb(["Dear", "Grandma", ",", "thank", "you", "for", "the", "lovely", "scarf"], prompt="Put the words in order to make a sentence for a thank-you letter.", answer="Dear Grandma , thank you for the lovely scarf") if False else sb(["Thank", "you", "very", "much", "for", "the", "present"], answer="Thank you very much for the present"))
    Q.append(sb(["I", "hope", "you", "are", "well"], answer="I hope you are well"))
    Q.append(sb(["I", "can't", "wait", "to", "see", "you", "again", "soon"], answer="I can't wait to see you again soon"))
    Q.append(sb(["We", "had", "a", "fun", "day", "with", "my", "family"], answer="We had a fun day with my family"))
    return Q
