"""Level 7 (History of Jakarta) -- second batch: timeline, key people, Betawi food/arts/traditions, Jakarta facts."""
from common import *

FOOD2 = [("Gado-gado", "Boiled vegetables served with peanut sauce"), ("Asinan Betawi", "Pickled vegetables or fruit in a sweet, sour and spicy sauce"),
         ("Kue rangi", "A small coconut cake cooked in a mould over a fire"), ("Bir pletok", "A drink made from ginger and spices, with no alcohol"),
         ("Dodol Betawi", "A sweet, sticky treat made from glutinous rice flour, coconut milk and palm sugar"), ("Soto tangkar", "A Betawi soup made with beef ribs")]
CULT2 = [("Topeng Betawi", "A Betawi theatre show in which the actors wear masks"), ("Tanjidor", "A Betawi band that plays with brass instruments and drums"),
         ("Palang pintu", "A lively wedding tradition at the bride's door with poems and a martial-arts show"), ("Roti buaya", "A bread shaped like a crocodile given at Betawi weddings"),
         ("Si Pitung", "A Betawi folk hero famous for standing up to unfair rule"), ("Rumah kebaya", "A traditional Betawi house whose porch roof has folds like a kebaya")]
TIMELINE = [("Tarumanagara", "An ancient kingdom that ruled this area long before Jakarta"), ("Sunda Kelapa", "The main port of the Sunda Kingdom"), ("Jayakarta", "The name given to the city in 1527"),
            ("Batavia", "The name used when the Dutch ruled, from 1619"), ("Jakarta", "The name used since 1942")]


def build():
    Q = [flash("Fatahillah", "The commander who took Sunda Kelapa in 1527 and renamed it Jayakarta. Jakarta's birthday, 22 June, comes from this date."),
         flash("VOC and Batavia", "The VOC was the Dutch East India Company. Its leader Jan Pieterszoon Coen took the city in 1619 and renamed it Batavia."),
         flash("Queen of the East", "A nickname for Batavia, because it was a rich trading city with canals and tall buildings."),
         flash("Independence in Jakarta", "On 17 August 1945, Sukarno, together with Mohammad Hatta, proclaimed Indonesia's independence in Jakarta. Jakarta became the capital of Indonesia."),
         flash("Betawi weddings", "Betawi weddings are full of tradition: palang pintu at the door, roti buaya (crocodile bread) and lively music."),
         flash("Betawi language", "Betawi people speak their own dialect, which is based on Malay and has words from Chinese, Arabic, Portuguese and other languages.")]
    for n, d in FOOD2:
        Q.append(mc("What is %s?" % n, d, pick([y for x, y in FOOD2 if x != n], 3)))
        Q.append(mc("Which Betawi food or drink is this? \"%s\"" % d, n, pick([x for x, _ in FOOD2 if x != n], 3)))
    for n, d in CULT2:
        Q.append(mc("What is %s?" % n, d, pick([y for x, y in CULT2 if x != n], 3)))
        Q.append(mc("Which Betawi tradition is this? \"%s\"" % d, n, pick([x for x, _ in CULT2 if x != n], 3)))
    for n, d in TIMELINE:
        Q.append(mc("Which part of Jakarta's story is this? \"%s\"" % d, n, pick([x for x, _ in TIMELINE if x != n], 3)))
    # sequence
    Q.append(mc("Which name of the city came FIRST?", "Sunda Kelapa", ["Jakarta", "Batavia", "Jayakarta"]))
    Q.append(mc("Which name of the city came LAST (and is used today)?", "Jakarta", ["Batavia", "Jayakarta", "Sunda Kelapa"]))
    Q.append(mc("Which name came right after Jayakarta?", "Batavia", ["Jakarta", "Sunda Kelapa", "Nusantara"]))
    Q.append(mc("Which name came right before Batavia?", "Jayakarta", ["Jakarta", "Sunda Kelapa", "Nusantara"]))
    Q.append(mc("Which happened first?", "The city was named Jayakarta (1527)", ["The city was named Batavia (1619)", "The city was named Jakarta (1942)"], minwrong=2))
    Q.append(mc("Which happened last?", "The city was named Jakarta (1942)", ["The city was named Jayakarta (1527)", "The city was named Batavia (1619)"], minwrong=2))
    # people and events
    Q.append(mc("Who took Sunda Kelapa in 1527?", "Fatahillah", ["Jan Pieterszoon Coen", "Sukarno", "Hatta"]))
    Q.append(mc("Which company ruled Batavia in the 1600s?", "The VOC (Dutch East India Company)", ["The Sunda Kingdom", "The Betawi Council", "The Japanese army"]))
    Q.append(mc("Who led the VOC when the Dutch took the city in 1619?", "Jan Pieterszoon Coen", ["Fatahillah", "Sukarno", "Sudirman"]))
    Q.append(mc("Why was Batavia nicknamed the 'Queen of the East'?", "It was a rich trading city with canals and tall buildings", ["It was ruled by a queen", "It was the smallest city", "It was built on a mountain"]))
    Q.append(mc("What kind of waterways did the Dutch build in Batavia, like in their homeland?", "Canals", ["Mountains", "Deserts", "Volcanoes"]))
    Q.append(mc("Who renamed the city 'Jakarta' in 1942?", "The Japanese, who were ruling at that time", ["The Dutch", "The Portuguese", "The Sunda Kingdom"]))
    Q.append(mc("On which date is Jakarta's birthday celebrated?", "22 June", ["17 August", "1 January", "28 October"]))
    Q.append(mc("Where was Indonesia's independence proclaimed on 17 August 1945?", "In Jakarta", ["In Bandung", "In Surabaya", "In Bali"]))
    Q.append(mc("Who proclaimed Indonesia's independence on 17 August 1945?", "Sukarno, together with Mohammad Hatta", ["Fatahillah and Coen", "Sudirman and Suharto", "Gajah Mada and Hayam Wuruk"]))
    Q.append(mc("What happened to Jakarta after independence?", "It became the capital city of Indonesia", ["It became a small village", "It was renamed Batavia again", "It moved to the sea"]))
    Q.append(mc("The ancient Tarumanagara kingdom is important to Jakarta's history because...", "It ruled this area long before the city was named Jakarta", ["It built Monas", "It named the city Batavia", "It was a Dutch company"]))
    # city facts
    Q.append(mc("About how many people live in Jakarta?", "More than ten million", ["About one thousand", "About fifty thousand", "About one hundred"]))
    Q.append(mc("Which old port in Jakarta still has wooden phinisi ships?", "Sunda Kelapa", ["Ancol", "Senayan", "Menteng"]))
    Q.append(mc("What does the Betawi language borrow words from?", "Malay, Chinese, Arabic, Portuguese and more", ["Only Dutch", "Only English", "Only Latin"]))
    Q.append(mc("What does it show that Betawi culture has foods and words from many places?", "Many peoples came to live and trade in Jakarta", ["Nobody visited Jakarta", "Jakarta is a desert", "Jakarta has no culture"]))
    # fill
    Q.append(fill("The commander who took Sunda Kelapa in 1527 was _____ .", "fatahillah"))
    Q.append(fill("The Dutch company that ruled Batavia was the _____ . (three letters)", "voc"))
    Q.append(fill("Jakarta's birthday is on 22 _____ . (a month)", "june"))
    Q.append(fill("Batavia was nicknamed the Queen of the _____ . (one word)", "east"))
    Q.append(fill("Indonesia's independence was proclaimed on 17 _____ 1945. (a month)", "august"))
    Q.append(fill("Gado-gado is made of boiled vegetables with _____ sauce. (one word)", "peanut"))
    Q.append(fill("Roti buaya is a bread shaped like a _____ . (an animal)", "crocodile", ["crocodile", "croc"]))
    Q.append(fill("Bir pletok is a drink made from _____ and spices. (one word)", "ginger"))
    Q.append(fill("A Betawi wedding tradition at the bride's door is called palang _____ . (one word)", "pintu"))
    Q.append(fill("Si Pitung is a Betawi folk _____ . (one word)", "hero"))
    # true/false
    for st in ["Jakarta's birthday is on 22 June.", "Batavia was the name used when the Dutch ruled.", "Gado-gado comes with peanut sauce.", "Sukarno and Hatta proclaimed Indonesia's independence.",
               "Sunda Kelapa was a port long before Jakarta.", "Roti buaya is a bread shaped like a crocodile.", "The Japanese renamed the city Jakarta in 1942."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["Fatahillah led the VOC in 1619.", "Jakarta was called Batavia before it was called Jayakarta.", "Bir pletok is made from fish.", "Palang pintu is a Betawi dessert.", "Indonesia's independence was proclaimed in Bali."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    Q.append(match("Match each Betawi food or drink with its description.", FOOD2[:4]))
    Q.append(match("Match each Betawi tradition with its description.", CULT2[:4]))
    Q.append(match("Match each person with what they did.", [("Fatahillah", "Took Sunda Kelapa in 1527"), ("Jan Pieterszoon Coen", "Led the Dutch takeover in 1619"), ("Sukarno", "Proclaimed independence with Hatta"), ("Si Pitung", "Is a Betawi folk hero")]))
    Q.append(match("Match each name of the city with the group that used it.", [("Sunda Kelapa", "The Sunda Kingdom"), ("Batavia", "The Dutch"), ("Jakarta", "Today's capital city"), ("Jayakarta", "Fatahillah's new name")]))
    return Q
