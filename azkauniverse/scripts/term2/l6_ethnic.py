from common import *

ISLANDS = ["Sumatra", "Java", "Kalimantan", "Sulawesi", "Papua"]
GROUPS = [("Javanese", "Central Java"), ("Sundanese", "West Java"), ("Balinese", "Bali"), ("Minangkabau", "West Sumatra"), ("Bugis", "South Sulawesi"), ("Dayak", "West Kalimantan"),
          ("Batak", "North Sumatra"), ("Asmat", "Papua"), ("Madurese", "Madura"), ("Minahasa", "North Sulawesi"), ("Betawi", "Jakarta"), ("Acehnese", "Aceh")]
CULT = [("Rumah Gadang (house with horn-shaped roofs)", "Minangkabau"), ("Ulos cloth", "Batak"), ("Batik", "Javanese"), ("Kecak dance", "Balinese"), ("Reog Ponorogo", "Javanese"),
        ("Angklung", "Sundanese"), ("Rendang", "Minangkabau"), ("Tor-tor dance", "Batak"), ("Ondel-ondel", "Betawi"), ("Jaipongan dance", "Sundanese"), ("Mandau (traditional sword)", "Dayak"),
        ("Honai (round hut)", "Papuan"), ("Saman dance", "Acehnese"), ("Pendet dance", "Balinese"), ("Gudeg", "Javanese"), ("Tongkonan house", "Toraja")]
SPEAK = [("Madurese", "Madura"), ("Javanese", "Java"), ("Minahasa", "North Sulawesi"), ("Batak", "North Sumatra"), ("Dayak", "Kalimantan"), ("Asmat", "Papua")]

def build():
    Q = [flash("Ethnic group", "A group of people who share the same culture, language and traditions."), flash("Bhinneka Tunggal Ika", "Indonesia's national motto. It means \"Unity in Diversity\" - we are different, but we are one nation."),
         flash("Where is the motto written?", "On a ribbon held in the claws of the Garuda Pancasila, Indonesia's national emblem."), flash("Indonesia's five main islands", "Sumatra, Java, Kalimantan, Sulawesi and Papua."),
         flash("How many provinces?", "Indonesia has 38 provinces, and many ethnic groups with their own unique cultures."), flash("What makes up a culture?", "Language, clothing, food, traditional arts (music, songs and dances), and types of houses."),
         flash("Being united", "Even though we are different, we respect and help each other, because we are one nation: Indonesia.")]
    Q.append(mc("Indonesia is a large country made up of many what?", "Islands", ["Deserts", "Lakes", "Volcanoes only"]))
    Q.append(mc("How many provinces does Indonesia have?", "38", ["12", "100", "5"]))
    Q.append(mc("What is Indonesia's national motto?", "Bhinneka Tunggal Ika", ["Merdeka Selalu", "Pancasila Jaya", "Satu Nusa"]))
    Q.append(mc("What does 'Bhinneka Tunggal Ika' mean?", "Unity in Diversity", ["Long live Indonesia", "Together we win", "One island, one people"]))
    Q.append(mc("On which national symbol is the motto written?", "The Garuda Pancasila", ["The red-and-white flag", "A banknote only", "The Monas"]))
    Q.append(mc("Where on the Garuda Pancasila is the motto?", "On a ribbon held in the eagle's claws", ["On its wing", "On its head", "On the shield"]))
    Q.append(mc("How many main islands does Indonesia have?", "Five", ["Three", "Seven", "Ten"]))
    for isl in ISLANDS:
        Q.append(mc("Which of these is one of Indonesia's five main islands?", isl, ["Bali", "Lombok", "Madura"]))
    Q.append(mc("Which of these is NOT one of the five main islands?", "Bali", ["Sumatra", "Kalimantan", "Papua"]))
    Q.append(mc("What is an ethnic group?", "People who share the same culture, language and traditions", ["People who live in one house", "People with the same job", "People who go to one school"]))
    Q.append(mc("Which things are part of a culture?", "Language, clothing, food, art and houses", ["Only food", "Only clothing", "Only the weather"]))
    Q.append(mc("How should we treat people from other ethnic groups?", "With respect, like our national motto says", ["Ignore them", "Make fun of their culture", "Tell them to change"]))
    Q.append(mc("Even though we are different, we are all one _____ .", "nation", ["family name", "town", "island"]) if False else mc("Even though we have different cultures, we are united as one...", "Nation", ["Island", "Town", "Family"]))
    for g, r in GROUPS:
        Q.append(mc(f"The {g} people come mainly from which region?", r, [x for _, x in GROUPS if x != r]))
        Q.append(mc(f"Which ethnic group comes mainly from {r}?", g, [x for x, _ in GROUPS if x != g]))
    for grp in (GROUPS[:4], GROUPS[4:8], GROUPS[8:12], [GROUPS[0], GROUPS[3], GROUPS[6], GROUPS[7]], [GROUPS[1], GROUPS[2], GROUPS[4], GROUPS[5]]):
        Q.append(match("Match each ethnic group to its main region.", grp))
    for c, g in CULT:
        Q.append(mc(f"{c} belongs to the culture of which ethnic group?", g, [x for _, x in CULT if x != g]))
    for grp in (CULT[:4], CULT[4:8], CULT[8:12], CULT[12:16]):
        Q.append(match("Match each cultural item to its ethnic group.", grp))
    for g, r in SPEAK:
        Q.append(fill(f"I come from {r}. I am a _____ . (ethnic group)", g.lower(), [g.lower(), g.lower() + " person"]) if g in ("Madurese", "Javanese", "Minahasa") else fill(f"I come from _____ . I am a {g}.", r.lower(), [r.lower()] + ([ "kalimantan", "west kalimantan"] if g == "Dayak" else ([ "sumatra", "north sumatra"] if g == "Batak" else []))))
    Q.append(fill("Indonesia has _____ provinces.", "38"))
    Q.append(fill("Our national motto is Bhinneka _____ Ika.", "tunggal"))
    Q.append(fill("Bhinneka Tunggal Ika means \"Unity in _____ \".", "diversity"))
    Q.append(fill("The national motto is written on the Garuda _____ . (one word)", "pancasila"))
    Q.append(fill("Indonesia's five main islands are Sumatra, Java, Kalimantan, Sulawesi and _____ .", "papua"))
    Q.append(mc("True or false? Every ethnic group in Indonesia has the same culture.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? The Minangkabau people come from West Sumatra.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? The Asmat people come from Papua.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? The Batak people come from Bali.", "False", ["True"], minwrong=1))
    return Q

FACTS = ["Indonesia has hundreds of ethnic groups, each with its own language and traditions.", "Bhinneka Tunggal Ika means \"Unity in Diversity\".", "The Minangkabau Rumah Gadang has a roof shaped like buffalo horns.",
         "Batik from Java is a cloth patterned with wax and dye - it is recognised by UNESCO.", "The Angklung is a bamboo instrument from the Sundanese people of West Java.", "The Batak people are famous for their woven ulos cloth.",
         "The Asmat people of Papua are famous for their wood carvings.", "Indonesia has 38 provinces spread across thousands of islands."]
