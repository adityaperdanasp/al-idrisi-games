"""Chapter 2 (Writing a Letter) -- second batch: new letters, purposes, formal/informal, punctuation, word bank."""
from common import *

TERMS = [
    ("Recipient", "The person a letter is written to.", "In a letter to Grandma, Grandma is the recipient."),
    ("Paragraph", "A group of sentences about one idea in a letter. Start a new one for a new idea.", "One paragraph to say thank you, another to tell your news."),
    ("Postscript (P.S.)", "A short extra note added after the signature.", "P.S. Please say hello to the cat!"),
    ("Opening sentence", "The first sentence of the message - it tells the reader why you are writing.", "I am writing to say thank you for the lovely book."),
    ("Purpose", "The reason you are writing a letter.", "To thank someone, to invite someone, to say sorry or to ask for something."),
    ("Tone", "The feeling of your words - friendly and chatty, or polite and serious.", "A letter to a friend has a friendly tone."),
]

SAMPLES = [  # (letter part, example text from a new letter)
    ("Greeting", "Dear Uncle Hasan,"), ("Greeting", "Hello Nadia,"), ("Greeting", "Dear Mrs Putri,"),
    ("Complimentary close", "With love from,"), ("Complimentary close", "Your friend,"), ("Complimentary close", "Yours sincerely,"),
    ("Signature", "Azka"), ("Signature", "Rani"),
    ("Date", "Saturday 14th March 2026"), ("Date", "3rd October 2026"),
    ("Sender's address", "12 Melati Street, Bandung"), ("Sender's address", "45 Kenanga Road, Jakarta"),
    ("Message (body)", "I had a wonderful time at your house last weekend."), ("Message (body)", "I am writing to invite you to my birthday party."),
]
PART_NAMES = ["Greeting", "Complimentary close", "Signature", "Date", "Sender's address", "Message (body)"]

PURPOSE = [
    ("Thank you for the football you gave me. I play with it every day!", "To say thank you", ["To say sorry", "To ask for help", "To invite someone"]),
    ("Would you like to come to my house for a sleepover on Friday?", "To invite someone", ["To say thank you", "To complain", "To say goodbye"]),
    ("I am very sorry that I broke your window with my ball.", "To say sorry", ["To invite someone", "To say thank you", "To ask a question"]),
    ("Could you please tell me what time the school library opens?", "To ask for information", ["To say sorry", "To say thank you", "To tell a joke"]),
    ("The toy I bought last week stopped working after one day.", "To make a complaint", ["To invite someone", "To say thank you", "To say sorry"]),
    ("I wanted to tell you about our trip to the zoo. We saw a giraffe!", "To share news", ["To complain", "To say sorry", "To ask for money"]),
    ("Get well soon! I hope you feel much better by the weekend.", "To wish someone well", ["To complain", "To invite someone", "To say sorry"]),
    ("Happy birthday! I hope you have a day full of fun and cake.", "To send birthday wishes", ["To ask for help", "To make a complaint", "To say sorry"]),
    ("I would like to join the school choir. Please tell me how to sign up.", "To ask to join something", ["To say sorry", "To thank someone", "To complain"]),
    ("We would be delighted if you could join us for dinner on Sunday.", "To invite someone", ["To complain", "To say sorry", "To say goodbye"]),
]

INFORMAL_GREET = ["Hi Dina,", "Hey Rafi,", "Dear Nenek,", "Dear Uncle Hasan,", "Hello Mia,", "Hi Grandpa,"]
FORMAL_GREET = ["Dear Mrs Putri,", "Dear Headteacher,", "Dear Manager,", "Dear Sir,", "Dear Madam,", "Dear Mr Rahman,"]
INFORMAL_CLOSE = ["Love from,", "Your friend,", "Big hugs,", "Write back soon,", "Your cousin,", "Hugs and kisses,"]
FORMAL_CLOSE = ["Yours sincerely,", "Yours faithfully,", "Kind regards,", "Best regards,"]
INFORMAL_SENT = ["Guess what? I got a puppy!", "Thanks a million for the cool present!", "It was so much fun to see you.", "Say hi to everyone for me!", "I miss you loads - write back soon!", "We had pizza and played games all night."]
FORMAL_SENT = ["I would like to request some information about the swimming lessons.", "I am writing to complain about the broken playground swings.", "I would be most grateful for your help.",
               "Please find my application attached.", "I am writing in response to your advertisement.", "I would appreciate a reply at your earliest convenience."]

CORRECT_LINES = [  # (correct line, wrong variations)
    ("Dear Uncle Hasan,", ["dear uncle hasan,", "Dear uncle Hasan", "Dear Uncle Hasan."]), ("Yours sincerely,", ["yours sincerely,", "Yours Sincerely.", "Yours sincerely"]),
    ("Saturday 14th March 2026", ["saturday 14th march 2026", "Saturday 14th march 2026", "saturday 14th March 2026"]), ("12 Melati Street, Bandung", ["12 melati street, bandung", "12 Melati street bandung", "12 melati Street, Bandung"]),
    ("Thank you for the lovely gift.", ["thank you for the lovely gift", "Thank you for the lovely gift,", "thank you for the lovely gift."]), ("I am writing to say sorry.", ["i am writing to say sorry.", "I am writing to say sorry", "I Am Writing To Say Sorry."]),
    ("Love from, Rani", ["love from, rani", "Love From Rani.", "Love from rani"]), ("Hello Nadia,", ["hello nadia,", "Hello nadia.", "Hello Nadia"]),
]
WORDS2 = [("friend", ["freind", "frend", "fiend"]), ("different", ["diffrent", "diferent", "differant"]), ("surprise", ["suprise", "surprize", "serprise"]), ("beautiful", ["beutiful", "beatiful", "beautifull"]),
          ("weather", ["wether", "wheather", "weahter"]), ("together", ["togeather", "togther", "toghether"]), ("special", ["speshal", "spesial", "specal"]), ("believe", ["beleive", "belive", "beleave"]),
          ("receive", ["recieve", "receeve", "resieve"]), ("remember", ["rember", "remeber", "rememmber"]), ("sincerely", ["sincerly", "sinserely", "sincerelly"]), ("exciting", ["exiting", "excitting", "exsiting"]),
          ("invitation", ["invatation", "invitashun", "invittation"]), ("delicious", ["delishous", "delicous", "delisious"]), ("arrive", ["arive", "arrieve", "arrivve"]), ("interested", ["intrested", "interrested", "intersted"]),
          ("necessary", ["neccessary", "necesary", "necessery"]), ("separate", ["seperate", "separete", "sepparate"]), ("except", ["excpet", "exept", "ecxept"]), ("visit", ["vizit", "visitt", "vissit"])]
CLOZE2 = [("I hope you are ___. (not ill)", "well"), ("Please write back ___. (in a short time)", "soon"), ("Dear Sir ___ Madam,", "or"),
          ("Lots of ___ from your cousin. (a warm feeling, 4 letters)", "love"), ("I am writing to ___ you to my party. (ask you to come)", "invite"),
          ("I am sorry ___ I was late. (starts with t)", "that"), ("I look ___ to seeing you.", "forward"),
          ("It was ___ to see you last week. (starts with g, means very good)", "great"), ("Thank you for ___ me to your house. (asking me to come)", "inviting")]

def build():
    Q = [flash(w, d, e) for w, d, e in TERMS]
    for w, d, e in TERMS:
        others = [t for t in TERMS if t[0] != w]
        Q.append(mc("What is the %s of a letter?" % w.lower() if w in ("Purpose", "Tone") else "What does <b>%s</b> mean in letter writing?" % w, d, [o[1] for o in pick(others, 3)]))
    # which part
    for part, text in SAMPLES:
        Q.append(mc("In a letter, which part is this?<br><i>%s</i>" % text, part, [p for p in PART_NAMES if p != part][:3]))
    # purpose
    for text, ans, wrong in PURPOSE:
        Q.append(mc("What is the purpose of this letter?<br><i>%s</i>" % text, ans, wrong))
    # formal/informal
    for g in INFORMAL_GREET:
        Q.append(mc("Which kind of letter starts like this?<br><i>%s</i>" % g, "An informal letter", ["A formal letter", "A poem", "A recipe"]) if g.startswith(("Hi", "Hey", "Hello")) else
                 mc("Who is this greeting probably written to?<br><i>%s</i>" % g, "Someone the writer knows well", ["A stranger", "A shop manager", "The government"]))
    for g in FORMAL_GREET:
        Q.append(mc("How should you write to the person in this greeting?<br><i>%s</i>" % g, "Politely and formally", ["Like texting a best friend", "With silly jokes", "With lots of hugs"]))
    for c in INFORMAL_CLOSE:
        Q.append(mc("Which closing is for a letter to a friend or family member?", c, pick(FORMAL_CLOSE, 3)))
    for c in FORMAL_CLOSE:
        Q.append(mc("Which closing is for a formal letter?", c, pick(INFORMAL_CLOSE, 3)))
    for s in INFORMAL_SENT:
        Q.append(mc("Which sentence is chatty and informal?", s, pick(FORMAL_SENT, 3)))
    for s in FORMAL_SENT:
        Q.append(mc("Which sentence is polite and formal?", s, pick(INFORMAL_SENT, 3)))
    Q.append(mc("In a formal letter, which is better?", "I would like to ask about the trip.", ["Gimme the info on the trip!", "Tell me about the trip, ok?", "Yo, what's the trip about?"]))
    Q.append(mc("In a letter to your best friend, which is better?", "I can't wait to see you!", ["I look forward to your reply.", "I remain yours faithfully.", "I would be grateful for your response."]))
    # correct lines
    for good, wrong in CORRECT_LINES:
        Q.append(mc("Which line is written correctly?", good, wrong))
    # words
    for w, wrong in WORDS2:
        Q.append(mc("Which is the correct spelling?", w, wrong))
    for p, w in CLOZE2:
        Q.append(fill("Type the missing word:<br><i>%s</i>" % p, w))
    # ordering parts
    Q.append(mc("Which part of a letter comes FIRST at the top?", "The sender's address", ["The signature", "The greeting", "The complimentary close"]))
    Q.append(mc("Which part comes between the date and the message?", "The greeting", ["The signature", "The sender's address", "The complimentary close"]))
    Q.append(mc("Where does a P.S. (postscript) go?", "After the signature", ["Before the greeting", "In the middle of the message", "At the top of the page"]))
    Q.append(mc("When should you start a new paragraph in a letter?", "When you move on to a new idea", ["After every sentence", "Never", "Only at the end"]))
    Q.append(match("Match each letter to its purpose.", [("Thank you for the book!", "Thank-you letter"), ("Please come to my party.", "Invitation"), ("I am sorry I broke it.", "Apology"), ("Please tell me the opening times.", "Request")]))
    Q.append(match("Match each part of a letter to where it goes.", [("Sender's address", "Top of the letter"), ("Greeting", "Before the message"), ("Complimentary close", "After the message"), ("Signature", "At the very end")]))
    Q.append(match("Match each ending to the kind of letter.", [("Yours sincerely,", "Formal"), ("Love from,", "Informal"), ("Kind regards,", "Formal"), ("Big hugs,", "Informal")]))
    Q.append(sb(["I", "am", "writing", "to", "say", "thank", "you"], answer="I am writing to say thank you"))
    Q.append(sb(["Please", "come", "to", "my", "birthday", "party"], answer="Please come to my birthday party"))
    Q.append(sb(["I", "am", "very", "sorry", "for", "being", "late"], answer="I am very sorry for being late"))
    Q.append(sb(["Write", "back", "to", "me", "soon"], answer="Write back to me soon"))
    Q.append(sb(["It", "was", "lovely", "to", "see", "you", "last", "week"], answer="It was lovely to see you last week"))
    return Q
