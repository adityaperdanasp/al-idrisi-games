from common import *

CONT = ["Asia", "Africa", "North America", "South America", "Europe", "Australia", "Antarctica"]
LAKES = [("Lake Baikal", "Asia", "the deepest lake in the world", "Russia"), ("Great Bear Lake", "North America", "the biggest lake that lies completely inside Canada", "Canada"),
         ("Great Slave Lake", "North America", "the deepest lake in North America", "Canada"), ("Lake Superior", "North America", "the largest of the Great Lakes", "USA and Canada"),
         ("Lake Michigan", "North America", "the only Great Lake that is completely inside the USA", "USA"), ("Lake Huron", "North America", "the Great Lake with the longest shoreline", "USA and Canada"),
         ("Caspian Sea", "Europe and Asia", "the largest lake in the world", "Russia, Kazakhstan, Iran and others"), ("Lake Malawi", "Africa", "the African lake known as the 'Lake of Stars'", "Malawi, Mozambique and Tanzania"),
         ("Lake Tanganyika", "Africa", "the longest freshwater lake in the world", "Tanzania, DR Congo, Burundi and Zambia"), ("Lake Victoria", "Africa", "the largest lake in Africa", "Uganda, Kenya and Tanzania")]
DESERTS = [("Sahara", "Africa", "the largest hot desert in the world"), ("Arabian Desert", "Asia", "a huge desert on the Arabian Peninsula"), ("Gobi Desert", "Asia", "a cold desert in Mongolia and China"),
           ("Kalahari Desert", "Africa", "a desert in southern Africa"), ("Great Victoria Desert", "Australia", "the largest desert in Australia"), ("Patagonian Desert", "South America", "the largest desert in Argentina"),
           ("Syrian Desert", "Asia", "a desert covering parts of Syria, Jordan, Iraq and Saudi Arabia"), ("Great Basin Desert", "North America", "the largest desert in the USA"), ("Arctic Polar Desert", "Arctic region", "a very cold desert around the North Pole"),
           ("Antarctic Polar Desert", "Antarctica", "the largest desert in the world")]
RIVERS = [("Nile", "Africa", "flows north into the Mediterranean Sea"), ("Amazon", "South America", "carries more water than any other river"), ("Yangtze", "Asia", "the longest river in Asia (in China)"),
          ("Mississippi", "North America", "the great river of the USA, flowing to the Gulf of Mexico"), ("Yenisei", "Asia", "a big Siberian river flowing north to the Arctic Ocean"),
          ("Yellow River", "Asia", "a muddy river in China, also called the Huang He"), ("Mackenzie", "North America", "the longest river in Canada"), ("Congo", "Africa", "the deepest river in the world"),
          ("Amur", "Asia", "a river along part of the Russia-China border"), ("Danube", "Europe", "flows through many countries to the Black Sea"), ("Ganges", "Asia", "a holy river in India"),
          ("Murray-Darling", "Australia", "Australia's longest river system")]

def build():
    Q = [flash("What is a lake?", "A large body of water surrounded by land."), flash("What is a desert?", "A place that gets very little rain. Most are hot, but some - like Antarctica - are freezing cold."),
         flash("What is a river?", "A long stream of water that flows across the land, usually to a sea, a lake or another river."),
         flash("Caspian Sea", "The largest lake in the world. It lies between Europe and Asia and is a salt lake."), flash("Lake Baikal", "The deepest lake in the world, in Russia. It holds about a fifth of the world's fresh lake water."),
         flash("The Sahara", "The largest HOT desert in the world, in northern Africa."), flash("Antarctic Polar Desert", "The largest desert in the world - Antarctica is very cold and gets almost no rain."),
         flash("The Nile and the Amazon", "The Nile in Africa is one of the longest rivers in the world. The Amazon in South America carries the most water."),
         flash("Indonesia's own giants", "Lake Toba on Sumatra is the world's largest volcanic lake. The Kapuas River on Kalimantan is Indonesia's longest river.")]
    Q.append(mc("What is a lake?", "A large body of water surrounded by land", ["A long stream flowing to the sea", "A very dry place", "A tall mountain"]))
    Q.append(mc("What is a desert?", "A place that gets very little rain", ["A place with lots of rivers", "A place with only ice", "A big city"]))
    Q.append(mc("What is a river?", "A long stream of water flowing across land", ["A body of water with land all around", "A desert", "A kind of sea"]))
    Q.append(mc("Are all deserts hot?", "No - some, like Antarctica, are very cold", ["Yes - all are hot", "Yes - all have sand", "No - all deserts have lots of rain"]))
    Q.append(mc("What do all deserts have in common?", "Very little rain", ["Lots of sand", "Hot weather", "Many rivers"]))
    for n, c, f, ctry in LAKES:
        Q.append(mc(f"On which continent is {n}?", c, [x for x in CONT if x != c and x not in c]))
        Q.append(mc(f"Which lake is {f}?", n, [x[0] for x in LAKES if x[0] != n and x[2] != f]))
    for n, c, f in DESERTS:
        Q.append(mc(f"On which continent is the {n}?", c, [x for x in CONT + ["Arctic region"] if x != c]))
        Q.append(mc(f"Which desert is {f}?", n, [x[0] for x in DESERTS if x[0] != n and x[2] != f]))
    for n, c, f in RIVERS:
        Q.append(mc(f"On which continent does the {n} River flow?" if "River" not in n else f"On which continent does the {n} flow?", c, [x for x in CONT if x != c]))
        Q.append(mc(f"Which river {f}?" if f.startswith(("flows", "carries")) else f"Which river is {f}?", n, [x[0] for x in RIVERS if x[0] != n and x[2] != f]))
    def distinct(items, k, key=lambda x: x[1]):
        groups = {}
        for it in items: groups.setdefault(key(it), []).append(it)
        keys = rng.sample(list(groups), min(k, len(groups)))
        return [(rng.choice(groups[g])[0], g) for g in keys]
    for _ in range(3): Q.append(match("Match each lake with its continent.", distinct(LAKES, 4)))
    for _ in range(3): Q.append(match("Match each desert with its continent.", distinct(DESERTS, 4)))
    for _ in range(4): Q.append(match("Match each river with its continent.", distinct(RIVERS, 4)))
    Q.append(match("Match each water or land feature with its description.", [("Lake", "Water surrounded by land"), ("River", "A stream flowing to the sea"), ("Desert", "A very dry place with little rain"), ("Sea", "A large area of salt water")]))
    Q.append(mc("Which is the largest lake in the world?", "Caspian Sea", ["Lake Superior", "Lake Victoria", "Lake Michigan"]))
    Q.append(mc("Which is the deepest lake in the world?", "Lake Baikal", ["Lake Victoria", "Caspian Sea", "Lake Huron"]))
    Q.append(mc("Which is the largest lake in Africa?", "Lake Victoria", ["Lake Baikal", "Lake Huron", "Great Bear Lake"]))
    Q.append(mc("Which Great Lake is the largest?", "Lake Superior", ["Lake Michigan", "Lake Huron", "Great Bear Lake"]))
    Q.append(mc("Which is the largest desert in the world?", "The Antarctic Polar Desert", ["The Sahara", "The Gobi", "The Arabian Desert"]))
    Q.append(mc("Which is the largest HOT desert in the world?", "The Sahara", ["The Gobi", "The Kalahari", "The Antarctic Polar Desert"]))
    Q.append(mc("Which river carries more water than any other river?", "The Amazon", ["The Nile", "The Yangtze", "The Danube"]))
    Q.append(mc("Which is the longest river in Asia?", "The Yangtze", ["The Danube", "The Nile", "The Congo"]))
    Q.append(mc("Which river is the deepest in the world?", "The Congo", ["The Nile", "The Mississippi", "The Ganges"]))
    Q.append(mc("Which river flows north through Africa into the Mediterranean Sea?", "The Nile", ["The Congo", "The Amazon", "The Danube"]))
    Q.append(mc("Which river is holy for many people in India?", "The Ganges", ["The Nile", "The Mackenzie", "The Amur"]))
    Q.append(mc("Which river flows through many countries in Europe to the Black Sea?", "The Danube", ["The Ganges", "The Yellow River", "The Amazon"]))
    Q.append(mc("Which is the largest volcanic lake in the world, found in Sumatra?", "Lake Toba", ["Lake Baikal", "Lake Victoria", "Lake Superior"]))
    Q.append(mc("Which is the longest river in Indonesia?", "The Kapuas (Kalimantan)", ["The Nile", "The Ciliwung", "The Citarum"]))
    Q.append(mc("Which river flows through the city of Jakarta?", "The Ciliwung", ["The Kapuas", "The Amazon", "The Yangtze"]))
    for n, c, _, _ in LAKES[:6]:
        Q.append(fill(f"{n} is on the continent of _____ . (one or two words)", c.lower().replace("north america", "north america"), [c.lower(), c.lower().replace("north america", "north america")]))
    Q.append(fill("The Sahara is a desert in the continent of _____ .", "africa"))
    Q.append(fill("The Gobi Desert is in the continent of _____ .", "asia"))
    Q.append(fill("The Great Victoria Desert is in _____ . (a continent or country)", "australia"))
    Q.append(fill("The Amazon River is in the continent of _____ . (two words)", "south america", ["south america"]))
    Q.append(fill("The Nile River flows through the continent of _____ .", "africa"))
    Q.append(fill("The Danube River is in the continent of _____ .", "europe"))
    Q.append(fill("The largest lake in the world is the _____ Sea.", "caspian"))
    Q.append(fill("A desert is a place that gets very little _____ .", "rain", ["rain", "rainfall", "water"]))
    Q.append(mc("True or false? All deserts are hot.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? The Caspian Sea is a lake.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? The Mississippi River is in Africa.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? Lake Victoria is in Africa.", "True", ["False"], minwrong=1))
    return Q

FACTS = ["The Caspian Sea is called a sea but it is really the world's largest lake.", "Lake Baikal in Russia is the deepest lake in the world - over 1,600 metres deep!", "The Sahara in Africa is about the size of the whole United States.",
         "Antarctica is the largest desert in the world because it gets so little rain and snow.", "The Amazon River carries more water than any other river on Earth.", "Lake Toba in Sumatra was formed by a giant volcano eruption.",
         "The Nile River flows north, from Africa's highlands up to the Mediterranean Sea.", "The Kapuas River in Kalimantan is the longest river in Indonesia."]
