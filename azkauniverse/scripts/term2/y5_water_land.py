"""Level 5 (Lakes, Deserts & Rivers) -- second batch: new lakes, deserts and rivers (none repeated from batch one) plus Indonesian rivers and lakes."""
from common import *

CONT = ["Asia", "Africa", "North America", "South America", "Europe", "Australia", "Antarctica"]
ISL = ["Sumatra", "Java", "Kalimantan", "Sulawesi", "Papua", "Bali"]
LAKES2 = [("Lake Titicaca", "South America", "the highest large lake that ships can sail on"), ("Lake Ladoga", "Europe", "the largest lake in Europe"),
          ("Lake Eyre", "Australia", "the largest lake in Australia, which is often dry"), ("Lake Chad", "Africa", "a lake that has shrunk a lot in recent years"),
          ("Lake Nasser", "Africa", "a huge man-made lake behind the Aswan High Dam"), ("The Dead Sea", "Asia", "the saltiest lake, where people float easily"),
          ("Lake Erie", "North America", "the shallowest of the Great Lakes"), ("Lake Ontario", "North America", "the smallest of the Great Lakes by area"),
          ("Lake Geneva", "Europe", "a big lake shared by Switzerland and France"), ("Lake Van", "Asia", "a big salt lake in Turkey")]
DESERTS2 = [("Atacama Desert", "South America", "one of the driest places on Earth, in Chile"), ("Thar Desert", "Asia", "a desert shared by India and Pakistan"),
            ("Mojave Desert", "North America", "a desert in the south-west of the USA"), ("Sonoran Desert", "North America", "a desert in the USA and Mexico, famous for tall cactuses"),
            ("Taklamakan Desert", "Asia", "a big sandy desert in western China"), ("Namib Desert", "Africa", "a very old desert along the coast of Namibia"),
            ("Simpson Desert", "Australia", "a desert with long red sand dunes"), ("Gibson Desert", "Australia", "a desert in Western Australia"),
            ("Negev Desert", "Asia", "a desert in southern Israel"), ("Karakum Desert", "Asia", "a desert that covers much of Turkmenistan"),
            ("Chihuahuan Desert", "North America", "one of the largest deserts in North America")]
RIVERS2 = [("Volga", "Europe", "the longest river in Europe"), ("Rhine", "Europe", "a river that flows from the Swiss Alps through Germany to the North Sea"),
           ("Thames", "Europe", "the river that flows through London"), ("Seine", "Europe", "the river that flows through Paris"),
           ("Zambezi", "Africa", "the river that has the Victoria Falls"), ("Niger", "Africa", "a long river that flows through West Africa"),
           ("Orinoco", "South America", "a big river that flows through Venezuela"), ("Colorado", "North America", "the river that carved the Grand Canyon"),
           ("St. Lawrence", "North America", "the river that links the Great Lakes to the Atlantic Ocean"), ("Indus", "Asia", "the main river of Pakistan"),
           ("Mekong", "Asia", "a long river that flows through China and Southeast Asia"), ("Irrawaddy", "Asia", "the main river of Myanmar")]
RIVERS_ID = [("Kapuas", "Kalimantan", "the longest river in Indonesia"), ("Mahakam", "Kalimantan", "a big river in East Kalimantan"), ("Musi", "Sumatra", "the river that flows through Palembang"),
             ("Batang Hari", "Sumatra", "the longest river on Sumatra"), ("Bengawan Solo", "Java", "the longest river on Java"), ("Brantas", "Java", "a big river in East Java"),
             ("Citarum", "Java", "the longest river in West Java"), ("Ciliwung", "Java", "the river that flows through Jakarta"), ("Mamberamo", "Papua", "the biggest river in Papua"),
             ("Digul", "Papua", "a long river in southern Papua")]
LAKES_ID = [("Lake Toba", "Sumatra"), ("Lake Singkarak", "Sumatra"), ("Lake Maninjau", "Sumatra"), ("Lake Poso", "Sulawesi"), ("Lake Tempe", "Sulawesi"), ("Lake Sentani", "Papua"), ("Lake Batur", "Bali")]


def distinct(items, k, keyf=lambda x: x[1]):
    groups = {}
    for it in items: groups.setdefault(keyf(it), []).append(it)
    keys = rng.sample(list(groups), min(k, len(groups)))
    return [(rng.choice(groups[g])[0], g) for g in keys]


def build():
    Q = [flash("Man-made lake", "A lake that people built by putting a dam across a river, like Lake Nasser in Egypt."),
         flash("Salt lake", "A lake with so much salt in the water that most fish cannot live in it. The Dead Sea is a famous salt lake."),
         flash("River mouth and source", "A river starts at its source (often in hills or mountains) and ends at its mouth, where it flows into a sea or lake."),
         flash("Rivers of Indonesia", "Kapuas (Kalimantan), Musi and Batang Hari (Sumatra), Bengawan Solo and Citarum (Java), and Mamberamo (Papua) are all famous Indonesian rivers.")]
    for n, c, f in LAKES2:
        Q.append(mc("On which continent is %s?" % n.replace("The Dead Sea", "the Dead Sea"), c, [x for x in CONT if x != c]))
        Q.append(mc("Which lake is %s?" % f, n, [x[0] for x in LAKES2 if x[0] != n]))
    for n, c, f in DESERTS2:
        Q.append(mc("On which continent is the %s?" % n, c, [x for x in CONT if x != c]))
        Q.append(mc("Which desert is %s?" % f, n, [x[0] for x in DESERTS2 if x[0] != n]))
    for n, c, f in RIVERS2:
        Q.append(mc("On which continent does the %s River flow?" % n, c, [x for x in CONT if x != c]))
        qtext = ("Which river %s?" % f.split(" that ", 1)[1]) if " that " in f and f.startswith(("the river that", "a river that", "a big river that", "a long river that")) else ("Which river %s?" % ("has " + f.split("has ", 1)[1] if f.startswith("the river that has") else "is " + f))
        Q.append(mc(qtext, n, [x[0] for x in RIVERS2 if x[0] != n]))
    for n, isl, f in RIVERS_ID:
        Q.append(mc("On which island is the %s River?" % n, isl, pick([x for x in ISL if x != isl], 3)))
    for n, isl in LAKES_ID:
        Q.append(mc("On which island is %s?" % n, isl, [x for x in ISL if x != isl]))
    for _ in range(3): Q.append(match("Match each lake with its continent.", distinct(LAKES2, 4)))
    for _ in range(3): Q.append(match("Match each desert with its continent.", distinct(DESERTS2, 4)))
    for _ in range(3): Q.append(match("Match each river with its continent.", distinct(RIVERS2, 4)))
    Q.append(match("Match each Indonesian river with its island.", [("Kapuas", "Kalimantan"), ("Musi", "Sumatra"), ("Bengawan Solo", "Java"), ("Mamberamo", "Papua")]))
    Q.append(match("Match each Indonesian lake with its island.", [("Lake Toba", "Sumatra"), ("Lake Poso", "Sulawesi"), ("Lake Sentani", "Papua"), ("Lake Batur", "Bali")]))
    Q.append(mc("Which river flows through Jakarta?", "The Ciliwung", ["The Mahakam", "The Kapuas", "The Digul"]))
    Q.append(mc("What is a man-made lake?", "A lake that people made by building a dam across a river", ["A lake made by a volcano", "A lake of lava", "A lake that dries up every year"]))
    Q.append(mc("Where does a river end?", "At its mouth, where it flows into a sea or lake", ["At its source in the hills", "In a desert only", "Nowhere"]))
    Q.append(mc("Where does a river begin?", "At its source, often in hills or mountains", ["At its mouth", "In the sea", "In the clouds only"]))
    Q.append(fill("The Atacama Desert is in the continent of _____ . (two words)", "south america", ["south america"]))
    Q.append(fill("The Thar Desert is in the continent of _____ .", "asia"))
    Q.append(fill("The Namib Desert is in the continent of _____ .", "africa"))
    Q.append(fill("The Mojave Desert is in the continent of _____ . (two words)", "north america", ["north america"]))
    Q.append(fill("Lake Ladoga is in the continent of _____ .", "europe"))
    Q.append(fill("Lake Eyre is in the continent of _____ . (one word)", "australia"))
    Q.append(fill("Lake Titicaca is in the continent of _____ . (two words)", "south america", ["south america"]))
    Q.append(fill("The Volga River is in the continent of _____ .", "europe"))
    Q.append(fill("The Mekong River is in the continent of _____ .", "asia"))
    Q.append(fill("The longest river in Indonesia is the _____ . (one word)", "kapuas"))
    Q.append(fill("The Bengawan Solo is the longest river on the island of _____ .", "java"))
    Q.append(fill("A river flows into the sea at its _____ . (one word)", "mouth"))
    for st in ["Lake Erie is one of the Great Lakes.", "The Thames flows through London.", "The Dead Sea is very salty.", "The Atacama is one of the driest deserts on Earth.", "The Kapuas is a river in Kalimantan.",
               "Lake Toba is on the island of Sumatra.", "A dam can make a man-made lake."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["The Thar Desert is in South America.", "The Volga is a river in Africa.", "Lake Titicaca is in Australia.", "The Ciliwung flows through Surabaya.", "The Namib Desert is in Europe.",
               "The Colorado River is in Asia.", "Lake Geneva is in Africa."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    return Q
