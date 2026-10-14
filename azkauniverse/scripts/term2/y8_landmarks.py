"""Level 8 (Jakarta Landmarks) -- second batch: more Jakarta landmarks, places to visit and why landmarks matter."""
from common import *

LM2 = [("Istiqlal Mosque", "The biggest mosque in Southeast Asia, whose name means independence"),
       ("Jakarta Cathedral", "A grand church with Gothic towers, across the road from Istiqlal Mosque"),
       ("Fatahillah Square", "The big open square in Kota Tua, with the Jakarta History Museum"),
       ("National Museum (Museum Gajah)", "A big museum nicknamed 'Elephant Museum' because of the elephant statue outside"),
       ("Taman Mini Indonesia Indah (TMII)", "A park with pavilions showing the cultures and houses of Indonesia's provinces"),
       ("Ancol", "A seaside fun park on Jakarta Bay"),
       ("Ragunan Zoo", "A big zoo in South Jakarta"),
       ("Setu Babakan", "A cultural village where visitors can enjoy Betawi culture"),
       ("Selamat Datang Monument", "A statue of two people waving flowers, at the roundabout near Hotel Indonesia"),
       ("Istana Merdeka", "The presidential palace in Jakarta"),
       ("Sunda Kelapa", "The old harbour where wooden phinisi ships are still moored"),
       ("West Irian Liberation Monument", "A statue of a man breaking chains, at Lapangan Banteng")]


def build():
    Q = [flash("Why visit landmarks?", "Landmarks help us learn about a city's past and let people of many backgrounds meet in the same places."),
         flash("Istiqlal and the Cathedral", "Istiqlal Mosque and Jakarta Cathedral stand across the road from each other. Many people see them as a symbol of living together in peace."),
         flash("Fatahillah Square", "The main square of Kota Tua, with the Jakarta History Museum in the old Batavia Town Hall. Visitors can rent colourful bicycles there."),
         flash("Taman Mini Indonesia Indah", "A park that shows Indonesia in miniature, with pavilions about the provinces, their houses, clothes and traditions.")]
    for n, d in LM2:
        Q.append(mc("What is %s?" % n, d, pick([y for x, y in LM2 if x != n], 3)))
        Q.append(mc("Which Jakarta place is this? \"%s\"" % d, n, pick([x for x, _ in LM2 if x != n], 3)))
    Q.append(match("Match each landmark with its description.", LM2[:4]))
    Q.append(match("Match each landmark with its description.", LM2[4:8]))
    Q.append(match("Match each landmark with its description.", LM2[8:12]))
    Q.append(mc("What does the name 'Istiqlal' mean?", "Independence", ["Peace", "Welcome", "Victory"]))
    Q.append(mc("Which mosque is the biggest in Southeast Asia?", "Istiqlal Mosque", ["Jakarta Cathedral", "Fatahillah Square", "Istana Merdeka"]))
    Q.append(mc("Why do many people see Istiqlal and Jakarta Cathedral as a special pair?", "They stand across from each other, a symbol of living together in peace", ["They are the same building", "They are both stadiums", "They are both markets"]))
    Q.append(mc("Which museum is nicknamed 'Elephant Museum'?", "The National Museum (Museum Gajah)", ["The Jakarta History Museum", "Monas museum", "The Sudirman Museum"]))
    Q.append(mc("Where can you find a park with pavilions from every Indonesian province?", "Taman Mini Indonesia Indah", ["Kota Tua", "Ragunan", "Senayan"]))
    Q.append(mc("Where in Jakarta can you find a seaside fun park?", "Ancol", ["Ragunan", "Kota Tua", "Menteng"]))
    Q.append(mc("Where would you go to see zoo animals in Jakarta?", "Ragunan Zoo", ["Setu Babakan", "Fatahillah Square", "Istiqlal"]))
    Q.append(mc("Where could you learn about Betawi culture in a village setting?", "Setu Babakan", ["Ancol", "GBK", "Istana Merdeka"]))
    Q.append(mc("The Selamat Datang Monument shows two people waving flowers. What does 'Selamat Datang' mean?", "Welcome", ["Goodbye", "Thank you", "Good luck"]))
    Q.append(mc("Which place has wooden phinisi ships?", "Sunda Kelapa harbour", ["Monas", "Ragunan Zoo", "Istiqlal Mosque"]))
    Q.append(mc("Which building is where the president works in Jakarta?", "Istana Merdeka", ["The National Museum", "Ancol", "Setu Babakan"]))
    Q.append(mc("In which part of Jakarta is Monas?", "In the middle of Merdeka Square", ["At Ancol beach", "Inside Ragunan Zoo", "At the airport"]))
    Q.append(mc("In which area can you see old Dutch buildings and the Jakarta History Museum?", "Kota Tua (Old Town)", ["Ancol", "TMII", "Ragunan"]))
    Q.append(mc("Which of these is a museum?", "The National Museum", ["Ancol", "Ragunan Zoo", "Sunda Kelapa"]))
    Q.append(mc("Which of these is a place of worship?", "Jakarta Cathedral", ["Ragunan Zoo", "Ancol", "Fatahillah Square"]))
    Q.append(mc("Which of these is mainly a place for fun by the sea?", "Ancol", ["Istiqlal Mosque", "The National Museum", "Setu Babakan"]))
    Q.append(mc("Which of these shows Indonesia's many cultures in one park?", "Taman Mini Indonesia Indah", ["Ancol", "Fatahillah Square", "GBK"]))
    Q.append(mc("Why is it good to look after landmarks?", "They help future generations learn about our history and culture", ["They are only for tourists", "They are not useful", "They will never change"]))
    Q.append(fill("The biggest mosque in Southeast Asia is _____ Mosque. (one word)", "istiqlal"))
    Q.append(fill("The old square in Kota Tua is called _____ Square. (one word)", "fatahillah"))
    Q.append(fill("TMII shows the cultures of Indonesia's _____ . (one word: the regions of the country)", "provinces", ["provinces", "province"]))
    Q.append(fill("Ancol is a fun park by the _____ . (one word)", "sea", ["sea", "beach", "ocean", "bay"]))
    Q.append(fill("'Selamat Datang' means _____ . (one word)", "welcome"))
    Q.append(fill("Ragunan is a _____ in South Jakarta. (a place with animals)", "zoo"))
    Q.append(fill("The old harbour with phinisi ships is Sunda _____ . (one word)", "kelapa"))
    for st in ["Istiqlal Mosque is the biggest mosque in Southeast Asia.", "Fatahillah Square is in Kota Tua.", "Ragunan Zoo is in Jakarta.", "The Selamat Datang Monument is near Hotel Indonesia.",
               "Taman Mini Indonesia Indah has pavilions about Indonesia's provinces.", "Istana Merdeka is the presidential palace in Jakarta.", "Ancol is by the sea."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["Setu Babakan is a big shopping mall.", "Jakarta Cathedral is a sports stadium.", "Ancol is in the mountains.", "Monas is a zoo.", "The National Museum is nicknamed the Giraffe Museum."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    return Q
