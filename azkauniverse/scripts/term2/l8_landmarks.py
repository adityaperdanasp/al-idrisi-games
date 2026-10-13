from common import *

LM = [("Monumen Nasional (Monas)", "A 132-metre tall monument topped with a golden flame that stands for Indonesia's struggle for independence"),
      ("The General Sudirman Statue", "A bronze statue on Jalan Jenderal Sudirman honouring a hero of Indonesia's fight against colonial rule"),
      ("Gelora Bung Karno (GBK)", "A big sports complex named after Indonesia's first president, with a huge stadium built for the 1962 Asian Games"),
      ("Istiqlal Mosque", "The biggest mosque in Southeast Asia, next to Jakarta Cathedral"), ("Kota Tua (Old Town)", "The old centre of Batavia with Fatahillah Square and old Dutch buildings"),
      ("Selamat Datang Monument", "The \"Welcome Monument\" statue at the Hotel Indonesia roundabout")]

def build():
    Q = [flash("Landmark", "An object or place that is well known and easily remembered."), flash("Monument", "A statue or building built to remember an important person or time."),
         flash("Stadium", "A large structure with many rows of seats around an area where sports are played and sometimes other public events happen."),
         flash("Monas", "The National Monument. It is 132 metres tall, topped by a golden flame, and has a museum at its base about Indonesia's fight for freedom."),
         flash("The General Sudirman Statue", "A bronze statue on Jalan Jenderal Sudirman that honours General Sudirman, a key independence hero who kept fighting colonial rule even though he had tuberculosis."),
         flash("Gelora Bung Karno (GBK)", "A major sports complex named after Sukarno. Its main stadium was built for the 1962 Asian Games and is one of the biggest in Southeast Asia."),
         flash("Why do landmarks matter?", "They are symbols of a city's history, pride and spirit - like Jakarta's Monas, the Sudirman Statue and GBK.")]
    Q.append(mc("What is a landmark?", "A well-known object or place that is easy to remember", ["A kind of road", "A type of food", "A small garden"]))
    Q.append(mc("What is a monument?", "A statue or building that helps us remember an important person or time", ["A shop for toys", "A very tall tree", "A kind of boat"]))
    Q.append(mc("What is a stadium?", "A large structure with rows of seats around an area for sports", ["A shopping mall", "A school", "A bridge"]))
    Q.append(mc("Jakarta is the ___ city of Indonesia.", "Capital (for now)", ["Smallest", "Oldest island", "Newest"]) if False else mc("Jakarta is a big and busy city in Indonesia. What is it at the moment?", "The capital city", ["A small village", "An island", "A mountain"]))
    for n, d in LM[:3]:
        Q.append(mc(f"Which Jakarta landmark is this? \"{d}\"", n, [x for x, _ in LM if x != n]))
        Q.append(mc(f"What is {n}?", d, [y for x, y in LM if x != n]))
    for n, d in LM[3:]:
        Q.append(mc(f"Which Jakarta landmark is this? \"{d}\"", n, [x for x, _ in LM if x != n]))
    Q.append(match("Match each landmark with its description.", LM[:3]))
    Q.append(match("Match each landmark with its description.", LM[:4]))
    Q.append(match("Match each landmark with its description.", LM[2:6]))
    Q.append(match("Match each word with its meaning.", [("Landmark", "A place that is well known and easily remembered"), ("Monument", "A statue or building that remembers a person or time"), ("Stadium", "A large structure with rows of seats for sports")]))
    Q.append(mc("How tall is Monas?", "132 metres", ["32 metres", "13 metres", "1,320 metres"]))
    Q.append(mc("What is at the top of Monas?", "A golden flame", ["A flag", "A clock", "A bell"]))
    Q.append(mc("What does the golden flame of Monas stand for?", "The nation's enduring spirit", ["Fire safety", "The Sun", "A lighthouse"]))
    Q.append(mc("What does Monas symbolise?", "Indonesia's struggle for independence", ["The size of Jakarta", "The sea", "The Dutch army"]))
    Q.append(mc("What is inside the base of Monas?", "A museum about Indonesia's fight for freedom", ["A swimming pool", "A cinema", "A zoo"]))
    Q.append(mc("How can visitors reach the top of Monas?", "By taking an elevator", ["By climbing a rope", "By helicopter only", "They cannot"]))
    Q.append(mc("What can visitors see from the top of Monas?", "Panoramic views of the city", ["A volcano", "The ocean floor", "Nothing"]))
    Q.append(mc("The General Sudirman Statue is on which street?", "Jalan Jenderal Sudirman", ["Jalan Gajah Mada", "Jalan Thamrin", "Jalan Sukarno"]))
    Q.append(mc("What is the General Sudirman Statue made of?", "Bronze", ["Wood", "Plastic", "Ice"]))
    Q.append(mc("Who was General Sudirman?", "A key independence hero and military leader", ["The first president", "A famous singer", "A Dutch governor"]))
    Q.append(mc("What did General Sudirman fight against?", "Colonial rule", ["A flood", "A neighbouring country's team", "A volcano"]))
    Q.append(mc("What illness did General Sudirman have while he led the fight?", "Tuberculosis", ["A broken leg", "Chickenpox", "The flu"]))
    Q.append(mc("What does the General Sudirman Statue show about him?", "His determination and leadership", ["That he liked cooking", "That he was a tourist", "That he was very tall"]))
    Q.append(mc("Gelora Bung Karno (GBK) is named after which person?", "Sukarno, Indonesia's first president", ["Sudirman", "Suharto", "Fatahillah"]))
    Q.append(mc("For which event was the GBK stadium originally built?", "The 1962 Asian Games", ["The 2000 Olympics", "A school fair", "A World Cup"]))
    Q.append(mc("What kind of events does GBK host?", "Sports events and also concerts and big gatherings", ["Only farming shows", "Only school classes", "Nothing now"]))
    Q.append(mc("What does GBK show about Indonesia?", "Its passion for sports and national pride", ["Its love of snow", "Its love of mountains only", "Nothing"]))
    Q.append(mc("Which of these is a stadium?", "Gelora Bung Karno", ["Monas", "The Sudirman Statue", "Kota Tua"]))
    Q.append(mc("Which of these is a monument?", "Monas", ["Gelora Bung Karno", "A shopping mall", "A market"]))
    Q.append(mc("Which of these is the biggest mosque in Southeast Asia?", "Istiqlal Mosque", ["Kota Tua", "Monas", "Ancol"]))
    Q.append(mc("In which part of Jakarta can you find old Dutch buildings and Fatahillah Square?", "Kota Tua (Old Town)", ["Senayan", "Menteng", "Ragunan"]))
    Q.append(fill("Monas is _____ metres tall. (a number)", "132"))
    Q.append(fill("At the top of Monas is a golden _____ .", "flame"))
    Q.append(fill("Monas symbolises Indonesia's struggle for _____ . (one word)", "independence", ["independence", "freedom"]))
    Q.append(fill("The General Sudirman Statue honours one of Indonesia's key independence _____ . (one word)", "heroes", ["heroes", "hero"]))
    Q.append(fill("General Sudirman fought against _____ rule.", "colonial", ["colonial", "dutch"]))
    Q.append(fill("GBK is named after Indonesia's first president, _____ . (one name)", "sukarno", ["sukarno", "soekarno", "bung karno"]))
    Q.append(fill("The GBK stadium was built for the 1962 _____ Games. (one word)", "asian"))
    Q.append(fill("A statue or building that helps us remember an important person or time is a _____ .", "monument"))
    Q.append(fill("A large structure with many rows of seats for sports is a _____ .", "stadium"))
    Q.append(fill("A place that is well known and easily remembered is a _____ .", "landmark"))
    Q.append(mc("True or false? Monas is 132 metres tall.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? The Sudirman Statue is made of gold.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? GBK hosts sports events and concerts.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? Monas has a museum at its base.", "True", ["False"], minwrong=1))
    return Q

FACTS = ["Monas is 132 metres tall and topped with a golden flame.", "You can ride an elevator to the top of Monas for views over Jakarta.", "The General Sudirman Statue is made of bronze.",
         "General Sudirman kept leading his troops even though he was sick with tuberculosis.", "The GBK stadium was built for the 1962 Asian Games.", "GBK is named after Bung Karno, Indonesia's first president.",
         "Istiqlal is the largest mosque in Southeast Asia.", "Kota Tua is the old centre of Batavia."]
