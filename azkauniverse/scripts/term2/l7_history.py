from common import *

DISHES = [("Soto Betawi", "A hearty soup with beef and coconut milk"), ("Ketoprak", "A dish made with rice cakes, tofu and peanut sauce"), ("Nasi uduk", "Rice cooked in coconut milk"),
          ("Kerak telor", "A spicy omelette made with sticky rice and shredded coconut")]
ARTS = [("Ondel-ondel", "A folk performance with large, decorated puppet-like figures"), ("Lenong", "A form of traditional Betawi theatre"), ("Gambang Kromong", "A musical genre that combines Chinese and Indonesian instruments"),
        ("Lebaran Betawi", "An annual event that showcases Betawi arts, crafts and food")]
NAMES = [("Sunda Kelapa", "The old port of the Sunda Kingdom"), ("Jayakarta", "The name given to the city in 1527"), ("Batavia", "The name used during Dutch rule"), ("Jakarta", "The name since 1942 and today's capital city")]
INFLU = ["Malay", "Sundanese", "Javanese", "Balinese", "Chinese", "Indian", "Arab", "European"]

def build():
    Q = [flash("The Betawi people", "The original inhabitants of Jakarta. They come from a mix of many groups - Malay, Sundanese, Javanese, Balinese, Chinese, Indian, Arab and European settlers."),
         flash("Ondel-ondel", "A Betawi folk performance with big, colourful, puppet-like figures carried by people - often seen in Jakarta parades."), flash("Lenong", "Traditional Betawi theatre."),
         flash("Gambang Kromong", "A Betawi music style that mixes Chinese and Indonesian instruments."), flash("Betawi food", "Soto Betawi (beef and coconut-milk soup), ketoprak (rice cakes, tofu and peanut sauce) and nasi uduk (rice cooked in coconut milk)."),
         flash("Lebaran Betawi", "A yearly festival that shows off Betawi arts, crafts and food and lets the community share its culture."),
         flash("Jakarta's old names", "Sunda Kelapa (old port) → Jayakarta (1527) → Batavia (Dutch times, 1619) → Jakarta (since 1942)."),
         flash("A new capital", "Indonesia is moving its capital city to a new city called Nusantara, but Jakarta will still be very important.")]
    Q.append(mc("Who are the Betawi people?", "The original inhabitants of Jakarta", ["Visitors from Bali", "Sailors from Europe only", "A family from Sumatra"]))
    Q.append(mc("Where are the Betawi people originally from?", "Jakarta", ["Surabaya", "Medan", "Makassar"]))
    Q.append(mc("The Betawi community is a blend of many cultures. This is seen in their...", "Language, cuisine and traditions", ["Only their clothes", "Only their houses", "Only their jobs"]))
    for g in INFLU:
        Q.append(mc(f"Which of these groups helped shape Betawi culture?", g, ["Vikings", "Aztecs", "Inuit"]) if g in ("Malay", "Chinese", "Arab", "Indian") else mc("Betawi culture was influenced by which of these groups?", g, ["Vikings", "Aztecs", "Inuit"]))
    Q.append(mc("Which of these groups did NOT influence Betawi culture?", "Vikings", ["Malay", "Chinese", "Arab"]))
    for n, d in ARTS:
        Q.append(mc(f"What is {n}?", d, [y for x, y in ARTS if x != n]))
        Q.append(mc(f"Which Betawi cultural expression is this? \"{d}\"", n, [x for x, _ in ARTS if x != n]))
    for n, d in DISHES:
        Q.append(mc(f"What is {n}?", d, [y for x, y in DISHES if x != n]))
        Q.append(mc(f"Which Betawi dish is this? \"{d}\"", n, [x for x, _ in DISHES if x != n]))
    Q.append(match("Match each Betawi cultural expression with its description.", ARTS))
    Q.append(match("Match each Betawi dish with its description.", DISHES[:3]))
    Q.append(match("Match each Betawi dish with its description.", DISHES))
    Q.append(match("Match each name of the city with its time.", [("Sunda Kelapa", "Old port of the Sunda Kingdom"), ("Jayakarta", "Name given in 1527"), ("Batavia", "Name used in Dutch times"), ("Jakarta", "Name used since 1942")]))
    for n, d in NAMES:
        Q.append(mc(f"Which name of the city is this? \"{d}\"", n, [x for x, _ in NAMES if x != n]))
    Q.append(mc("What was Jakarta called during Dutch rule?", "Batavia", ["Jayakarta", "Sunda Kelapa", "Nusantara"]))
    Q.append(mc("What was the old port city of the Sunda Kingdom called?", "Sunda Kelapa", ["Batavia", "Nusantara", "Surabaya"]))
    Q.append(mc("In which year was the city renamed Jayakarta?", "1527", ["1619", "1942", "1945"]))
    Q.append(mc("In which year did the Dutch build Batavia?", "1619", ["1527", "1942", "1999"]))
    Q.append(mc("In which year was the city renamed Jakarta?", "1942", ["1527", "1619", "1999"]))
    Q.append(mc("Who led the attack that took Sunda Kelapa and renamed it Jayakarta?", "Fatahillah", ["Gajah Mada", "Sukarno", "Sudirman"]))
    Q.append(mc("What does the name Jayakarta mean?", "Complete victory", ["Big city", "Old port", "Golden gate"]))
    Q.append(mc("Which old part of Jakarta still shows what Batavia looked like?", "Kota Tua (the Old Town)", ["Senayan", "Monas", "Ancol"]))
    Q.append(mc("What will Indonesia's new capital city be called?", "Nusantara", ["Batavia", "Jayakarta", "Sunda Kelapa"]))
    Q.append(mc("Why is the government working on new bridges and sea defences in Jakarta?", "To stop the city from sinking because of rising sea levels", ["To make the city smaller", "To close the port", "To move the Betawi people"]))
    Q.append(mc("Will Jakarta still be important after the capital moves?", "Yes - many people will still live, work and have fun there", ["No - it will be empty", "No - it will be abandoned", "Only as a village"]))
    Q.append(fill("The _____ people are the original inhabitants of Jakarta.", "betawi"))
    Q.append(fill("Soto Betawi is a hearty soup made with beef and _____ milk. (one word)", "coconut"))
    Q.append(fill("Nasi uduk is rice cooked in _____ milk. (one word)", "coconut"))
    Q.append(fill("Ketoprak is made with rice cakes, tofu and _____ sauce. (one word)", "peanut"))
    Q.append(fill("_____ is a Betawi folk performance with large, decorated puppet-like figures.", "ondel-ondel", ["ondel-ondel", "ondel ondel", "ondelondel"]))
    Q.append(fill("Lenong is a form of traditional _____ . (one word)", "theatre", ["theatre", "theater", "drama"]))
    Q.append(fill("Gambang Kromong mixes Chinese and _____ instruments. (one word)", "indonesian"))
    Q.append(fill("During Dutch rule Jakarta was called _____ .", "batavia"))
    Q.append(fill("Indonesia's new capital city will be called _____ .", "nusantara"))
    Q.append(fill("The city was renamed Jakarta in the year _____ .", "1942"))
    Q.append(mc("True or false? The Betawi people are the original inhabitants of Jakarta.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? Jakarta has always been called Jakarta.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? Betawi culture is a blend of many cultures.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? Nasi uduk is made with coconut milk.", "True", ["False"], minwrong=1))
    return Q

FACTS = ["The Betawi people are the original inhabitants of Jakarta.", "Ondel-ondel are giant, colourful puppets carried through the streets of Jakarta.", "Jakarta was once called Sunda Kelapa, Jayakarta and Batavia.",
         "Jayakarta means \"complete victory\" and was named in 1527.", "Soto Betawi is a soup made with beef and coconut milk.", "Gambang Kromong music mixes Chinese and Indonesian instruments.",
         "The Dutch called Jakarta 'Batavia' from 1619.", "Indonesia is moving its capital to a new city called Nusantara."]
