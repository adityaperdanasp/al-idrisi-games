"""Level 6 (Ethnic Groups in Indonesia) -- second batch: new ethnic groups and regions, cultural items, unity and diversity."""
from common import *

GROUPS2 = [("Banjar", "South Kalimantan"), ("Sasak", "Lombok"), ("Nias", "Nias Island"), ("Baduy", "Banten"), ("Dani", "Baliem Valley"), ("Ambonese", "Ambon (Maluku)"), ("Gorontalo", "Gorontalo"),
           ("Malay", "Riau"), ("Sumbanese", "Sumba"), ("Manggarai", "Flores"), ("Toraja", "Tana Toraja"), ("Tengger", "Mount Bromo area"), ("Lampung", "Lampung"), ("Kutai", "East Kalimantan")]
OLD_REGIONS = ["Central Java", "West Java", "Bali", "West Sumatra", "South Sulawesi", "West Kalimantan", "North Sumatra", "Papua", "Madura", "North Sulawesi", "Jakarta", "Aceh"]
ALL_REGIONS = [r for _, r in GROUPS2] + OLD_REGIONS
CULT2 = [("Wayang kulit (leather shadow puppets)", "Javanese"), ("Kuda lumping (horse dance)", "Javanese"), ("Rawon (black beef soup)", "Javanese"), ("Barong dance", "Balinese"),
         ("Legong dance", "Balinese"), ("Ngaben (cremation ceremony)", "Balinese"), ("Piring dance (plate dance)", "Minangkabau"), ("Sate Padang", "Minangkabau"), ("Soto Banjar", "Banjar"),
         ("The floating market (pasar terapung)", "Banjar"), ("Coto Makassar", "Makassarese"), ("Baju bodo", "Bugis"), ("Phinisi ship", "Bugis"), ("Rumah Betang (long house)", "Dayak"),
         ("Rumah Bolon", "Batak"), ("Lompat batu (stone jumping)", "Nias"), ("Tenun ikat of Sumba", "Sumbanese"), ("Bau Nyale festival", "Sasak"), ("Rambu Solo ceremony", "Toraja"),
         ("Binte Biluhuta (corn soup)", "Gorontalo"), ("Topeng Betawi (mask dance)", "Betawi"), ("Roti buaya", "Betawi"), ("Tanjidor music", "Betawi"), ("Bir pletok (ginger drink)", "Betawi")]


def build():
    Q = [flash("National language", "Bahasa Indonesia is the national language. Many ethnic groups speak their own regional language at home, but Bahasa Indonesia helps everyone understand each other."),
         flash("Sumpah Pemuda", "The Youth Pledge of 28 October 1928, in which young people promised one homeland, one nation and one language: Indonesia."),
         flash("Pancasila", "The five principles that guide the Indonesian nation. It is shown on the Garuda Pancasila emblem."),
         flash("Diversity", "Having many different kinds of people, cultures and traditions in one place. Indonesia has more than 1,300 ethnic groups.")]
    for g, r in GROUPS2:
        Q.append(mc("The %s people come mainly from which region?" % g, r, pick([x for x in ALL_REGIONS if x != r], 3)))
        Q.append(mc("Which ethnic group comes mainly from %s?" % r, g, pick([x for x, _ in GROUPS2 if x != g] + ["Batak", "Betawi", "Minangkabau", "Bugis"], 3)))
    for grp in (GROUPS2[:4], GROUPS2[4:8], GROUPS2[8:12], [GROUPS2[0], GROUPS2[5], GROUPS2[9], GROUPS2[13]]):
        Q.append(match("Match each ethnic group to its main region.", grp))
    for c, g in CULT2:
        wrong = pick([x for _, x in CULT2 if x != g], 3)
        Q.append(mc("%s belongs to the culture of which ethnic group?" % c, g, wrong))
    # matches with distinct groups
    def distinct_cult(k):
        groups = {}
        for c, g in CULT2: groups.setdefault(g, []).append(c)
        keys = rng.sample(list(groups), k)
        return [(rng.choice(groups[g]), g) for g in keys]
    for _ in range(4):
        Q.append(match("Match each cultural item to its ethnic group.", distinct_cult(4)))
    # facts
    Q.append(mc("About how many ethnic groups does Indonesia have?", "More than 1,300", ["About 5", "About 20", "Exactly 2"]))
    Q.append(mc("About how many languages are spoken in Indonesia?", "More than 700", ["Exactly 1", "About 10", "About 50"]))
    Q.append(mc("Which language do people all over Indonesia use to understand each other?", "Bahasa Indonesia", ["Dutch", "Latin", "French"]))
    Q.append(mc("What is the Sumpah Pemuda?", "The Youth Pledge of 1928 for one homeland, one nation and one language", ["A song about the sea", "A famous dance", "A kind of food"]))
    Q.append(mc("In which year was the Sumpah Pemuda made?", "1928", ["1900", "1945", "1999"]))
    Q.append(mc("How many principles does Pancasila have?", "Five", ["Three", "Seven", "Ten"]))
    Q.append(mc("Which bird is the national emblem of Indonesia?", "The Garuda", ["The eagle of America", "The cassowary", "The pigeon"]))
    Q.append(mc("What colours are on the Indonesian flag?", "Red and white", ["Red and blue", "Green and white", "Yellow and red"]))
    Q.append(mc("On which date is Indonesia's Independence Day?", "17 August", ["1 January", "28 October", "25 December"]))
    Q.append(mc("The motto 'Bhinneka Tunggal Ika' reminds us to...", "Respect each other's differences and stay united", ["Be the same as everyone", "Only play with our own group", "Forget our traditions"]))
    Q.append(mc("A new classmate speaks a different regional language at home. What is the best thing to do?", "Be friendly and learn something about their culture", ["Laugh at how they speak", "Ignore them", "Tell them their culture is wrong"]))
    Q.append(mc("At a school culture day, children wear costumes from different regions. What does this show?", "Unity in diversity", ["That everyone is the same", "That only one culture is good", "That nobody likes traditions"]))
    Q.append(mc("Which of these helps unite the people of Indonesia?", "A shared language and a shared flag", ["Fighting over differences", "Staying apart", "Ignoring each other"]))
    Q.append(mc("How many provinces does Indonesia have?", "38", ["10", "27", "100"]))
    # fill
    Q.append(fill("The _____ people come from the island of Lombok. (one word)", "sasak"))
    Q.append(fill("The _____ people come from South Kalimantan. (one word)", "banjar"))
    Q.append(fill("The Toraja people come from Tana _____ . (one word)", "toraja"))
    Q.append(fill("The national language of Indonesia is Bahasa _____ . (one word)", "indonesia"))
    Q.append(fill("Indonesia's Independence Day is on 17 _____ . (a month)", "august"))
    Q.append(fill("The Youth Pledge was made in the year _____ . (a number)", "1928"))
    Q.append(fill("Indonesia has more than _____ ethnic groups. (a number: 1,300 written 1300)", "1300", ["1300", "1,300"]))
    Q.append(fill("Pancasila has _____ principles. (a number as a word or digit)", "five", ["five", "5"]))
    Q.append(fill("The Indonesian flag is red and _____ . (a colour)", "white"))
    # true / false
    for st in ["The Sasak people come from Lombok.", "Bahasa Indonesia is the national language of Indonesia.", "Wayang kulit belongs to Javanese culture.", "The Barong dance belongs to Balinese culture.",
               "Indonesia has more than 1,300 ethnic groups.", "The Toraja people have a house called the Tongkonan."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["The Banjar people come from Papua.", "Rumah Bolon belongs to Balinese culture.", "Independence Day is on 28 October.", "Everyone in Indonesia speaks exactly the same regional language.",
               "Bau Nyale is a Minangkabau festival."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    return Q
