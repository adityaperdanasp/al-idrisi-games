"""Chapter 8 (Reading Comprehension) -- second batch: six new original passages with literal, vocabulary, inference and sequence questions."""
from common import *


def P(pid, title, paras, qs):
    out = [passage(pid, title, paras)]
    for q in qs:
        q = dict(q); q["passageId"] = pid; out.append(q)
    return out


def build():
    Q = [flash("Sequence", "The order in which things happen. Words like first, next, then and finally help you follow it.", "First the bees collect nectar; finally they seal the honey."),
         flash("Theme (lesson)", "The big message of a story, like 'honesty is rewarded' or 'never give up'.", "The Honest Fisherman teaches that being honest is a good choice."),
         flash("Fact and opinion", "A fact can be checked and proven. An opinion is what someone thinks or feels.", "'Komodo dragons live in Indonesia' is a fact. 'They are scary' is an opinion.")]
    Q += P("seasons", "Two Seasons in Indonesia", [
        "Many countries have four seasons: spring, summer, autumn and winter. Indonesia is different. Because it sits close to the equator, it is warm all year round, and it has just two seasons: the dry season and the rainy season.",
        "The dry season lasts from about May to October. There is less rain, the sky is often blue, and the winds blow from the south-east. Farmers harvest crops such as rice, and children fly kites in the open fields.",
        "The rainy season arrives around November and stays until April. Dark clouds gather in the afternoon, and heavy rain can fall for hours. Rivers grow full, and the rice fields turn bright green. In some places, floods can happen, so people clear their drains early.",
        "Although the temperature changes only a little, the two seasons shape how people live. They decide when to plant, when to harvest and even when to celebrate."],
        [mc("Why does Indonesia have only two seasons?", "It is close to the equator and warm all year", ["It is very cold", "It has no rain at all", "It is far from the sea"]),
         mc("How many seasons does Indonesia have?", "Two", ["Three", "Four", "One"]),
         mc("When does the dry season happen?", "About May to October", ["November to April", "January to March", "All year"]),
         fill("In the rainy season, the rice fields turn bright ___.", "green"),
         mc("What does the word <b>harvest</b> mean in the second paragraph?", "Gather the crops", ["Plant the seeds", "Sell toys", "Dig a well"]),
         mc("Why do people clear their drains early in the rainy season?", "To help stop floods", ["To grow rice", "To fly kites", "To keep warm"]),
         match("Match each season to what happens.", [("Dry season", "Children fly kites in the fields"), ("Rainy season", "Heavy rain falls for hours")]),
         mc("What is the main idea of the text?", "Indonesia has a dry season and a rainy season that shape how people live", ["Floods are fun", "Kites are made in May", "Rice needs snow to grow"])])
    Q += P("fisherman", "The Honest Fisherman", [
        "Long ago, a poor fisherman named Pak Joko lived by the sea. Every morning he rowed out in his small boat and cast his net. Some days he caught many fish; other days only a few.",
        "One morning, while he was mending his net, his knife slipped from his hand and sank into the deep water. Pak Joko was upset. The knife was old, but it was the only one he had.",
        "Suddenly, a kind sea spirit rose from the waves holding a shiny golden knife. “Is this yours?” she asked. Pak Joko shook his head. “No, mine is plain and rusty.” Next she showed him a silver one. “That is not mine either,” he said.",
        "At last she held up his old knife. “Yes, that is mine! Thank you!” Pleased with his honesty, the spirit gave him all three knives. Pak Joko shared the silver and golden ones with his village and lived happily for the rest of his days."],
        [mc("What was Pak Joko's job?", "He was a fisherman", ["He was a farmer", "He was a teacher", "He was a cook"]),
         mc("What happened to his knife?", "It slipped into the sea", ["It was stolen", "It broke in two", "He sold it"]),
         mc("Why did Pak Joko say no to the golden knife?", "It was not his", ["It was too heavy", "He did not like gold", "It was broken"]),
         mc("Which word best describes Pak Joko?", "Honest", ["Greedy", "Lazy", "Rude"]),
         mc("What does the word <b>rusty</b> most likely mean?", "Covered in brown marks from age and water", ["Very sharp", "Made of gold", "Brand new"]),
         fill("The sea spirit gave Pak Joko three ___ in the end.", "knives"),
         mc("What lesson does the story teach?", "Honesty is rewarded", ["Fishing is easy", "Never go near the sea", "Gold is always best"]),
         mc("What did Pak Joko do with the silver and golden knives?", "He shared them with his village", ["He sold them", "He threw them away", "He hid them"]),
         match("Match each character to what they do.", [("Pak Joko", "Tells the truth about his knife"), ("The sea spirit", "Shows him three knives")])])
    Q += P("sciencefair", "The Science Fair", [
        "Citra stared at her volcano model. The paper mountain had collapsed in the middle, and the red 'lava' had dripped all over the table. The science fair started in ten minutes.",
        "“It's ruined,” she whispered. Her friend Budi peered over her shoulder. “It's not ruined; it just needs help,” he said. Together they stuffed the hole with newspaper, wrapped it in fresh paper and painted it brown.",
        "When the judges arrived, Citra's hands shook. But as she poured vinegar onto the baking soda, the volcano bubbled and foamed beautifully, and the judges clapped. “Tell us how it works,” asked one of them. Citra explained how the two ingredients make a gas called carbon dioxide, which pushes the foam up.",
        "Citra did not win first prize, but she won the prize for the best explanation. “I could not have done it without Budi,” she smiled."],
        [mc("What went wrong with Citra's volcano at the start?", "The mountain collapsed in the middle", ["It caught fire", "It was too small", "She forgot to bring it"]),
         mc("How did Budi help?", "He helped her mend and repaint the model", ["He made a new one", "He told the judges", "He took it home"]),
         mc("How did Citra feel when the judges arrived?", "Nervous", ["Bored", "Angry", "Sleepy"]),
         mc("What does the word <b>peered</b> mean in the second paragraph?", "Looked closely", ["Jumped", "Shouted", "Walked away"]),
         fill("Vinegar and baking soda make a gas called carbon ___.", "dioxide"),
         mc("What prize did Citra win?", "The prize for the best explanation", ["First prize", "The funniest model", "The biggest volcano"]),
         mc("What can we infer about Citra and Budi?", "They are good friends", ["They are rivals", "They are strangers", "They are teachers"]),
         mc("Which event happened FIRST?", "The volcano collapsed", ["The judges clapped", "Citra won a prize", "Citra explained the gas"]),
         match("Match each child to what they do.", [("Citra", "Explains how the volcano works"), ("Budi", "Helps mend the model")])])
    Q += P("bees", "How Bees Make Honey", [
        "Honey is one of the sweetest foods in the world, and it is made by bees. It takes a lot of teamwork.",
        "First, worker bees fly from flower to flower and drink a sugary liquid called nectar. They store it in a special 'honey stomach'. A single bee may visit hundreds of flowers in one day.",
        "Next, the bees return to the hive and pass the nectar to other bees. These bees chew it and mix it with a special juice from their bodies. The mixture is placed in small wax cells.",
        "Finally, the bees flap their wings to blow warm air over the cells. This dries out the water, turning the thin nectar into thick honey. When a cell is full, the bees seal it with a lid of wax to keep the honey fresh."],
        [mc("What do bees collect from flowers to make honey?", "Nectar", ["Pollen only", "Water", "Wax"]),
         mc("Where do bees store nectar while they fly?", "In a honey stomach", ["In the hive", "In their wings", "In a wax lid"]),
         mc("What do the bees do when they return to the hive?", "They pass the nectar to other bees, who chew and mix it", ["They fly away again", "They eat all of it", "They put it in the sun"]),
         mc("How do bees dry the nectar?", "By flapping their wings", ["By blowing bubbles", "By putting it in the sun", "By adding sugar"]),
         mc("Which word signals the LAST step in the text?", "Finally", ["First", "Next", "Because"]),
         fill("Bees seal a full cell with a lid of ___.", "wax"),
         mc("What is the main idea of the text?", "Bees work together in steps to turn nectar into honey", ["Bees are afraid of flowers", "Honey is made in a factory", "Bees sleep in wax cells"]),
         mc("What does the word <b>hive</b> mean?", "A home for bees", ["A kind of flower", "A type of honey", "A bee's wing"]),
         match("Match each step to what the bees do.", [("Step 1", "Collect nectar from flowers"), ("Step 2", "Chew and mix the nectar"), ("Step 3", "Dry it by flapping their wings")])])
    Q += P("umbrella", "The Lost Umbrella", [
        "On Monday morning, it rained so hard that the school yard looked like a lake. Rafi opened his bag and gasped. His red umbrella was gone.",
        "“Did you leave it on the bus?” asked Mia. “No, I had it when I got off,” said Rafi. “I put it by the classroom door.” They walked to the door. All they found was a small puddle and a muddy footprint shaped like a paw.",
        "Following the paw prints, they tiptoed round the corner of the building. There, under the bench, sat Coco, the school cat, curled up beneath the red umbrella as if it were her tent.",
        "Rafi laughed. “I suppose she needs it more than I do!” He left the umbrella with Coco and borrowed his friend's. At lunch time, the sun came out and Coco strolled away, leaving the umbrella dry."],
        [mc("What was the weather like on Monday morning?", "Very rainy", ["Sunny", "Snowy", "Windy and dry"]),
         mc("What did Rafi lose?", "His red umbrella", ["His bag", "His lunch", "His shoes"]),
         mc("What clue helped them find the umbrella?", "A paw-shaped footprint", ["A torn bag", "A note from Mia", "A wet towel"]),
         mc("Where was the umbrella found?", "Under the bench", ["On the bus", "At home", "In the classroom"]),
         mc("What does the word <b>tiptoed</b> mean?", "Walked quietly on the tips of their toes", ["Ran very fast", "Jumped up and down", "Crawled on the floor"]),
         mc("How did Rafi feel about finding Coco with his umbrella?", "He found it funny", ["He was furious", "He was frightened", "He was jealous"]),
         mc("Why did Rafi let Coco keep the umbrella for a while?", "She was staying dry under it", ["He did not like it", "It was broken", "It belonged to Mia"]),
         fill("Rafi's umbrella was the colour ___.", "red"),
         match("Match each character to what happens to them.", [("Rafi", "Loses his umbrella"), ("Coco", "Shelters under the umbrella")])])
    Q += P("komodo", "Komodo Dragons", [
        "The Komodo dragon is the largest lizard in the world. It lives only on a few islands in Indonesia, including Komodo and Rinca. A full-grown dragon can be three metres long and weigh as much as a grown man.",
        "Despite its heavy body, the Komodo dragon can run fast over short distances and is also a good swimmer. Its long yellow tongue flicks in and out to taste the air, helping it find food from far away.",
        "Komodo dragons are carnivores. They eat deer, wild pigs and sometimes even buffalo. A dragon's bite carries germs, and its prey usually becomes weak and cannot escape.",
        "Today, there are fewer than 4,000 Komodo dragons left in the wild. The government has made their islands a national park to keep them safe. Visitors can watch them, but must stay with a ranger."],
        [mc("Where do Komodo dragons live?", "On a few islands in Indonesia", ["In Australia", "In every forest", "In the Arctic"]),
         mc("What is special about the Komodo dragon?", "It is the largest lizard in the world", ["It can fly", "It lives in the sea", "It is a kind of snake"]),
         fill("A Komodo dragon uses its long yellow ___ to taste the air.", "tongue"),
         mc("What does the word <b>carnivores</b> mean?", "Animals that eat meat", ["Animals that eat plants", "Animals that sleep all day", "Animals that live in water"]),
         mc("Why have the dragons' islands been made a national park?", "To keep the dragons safe", ["To grow rice", "To build hotels", "To catch fish"]),
         mc("What can we infer from 'fewer than 4,000 left in the wild'?", "Komodo dragons are in danger of dying out", ["There are too many dragons", "They are easy to find", "They live everywhere"]),
         mc("What must visitors do?", "Stay with a ranger", ["Feed the dragons", "Swim with them", "Take them home"]),
         mc("Which of these is a FACT from the text?", "A Komodo dragon can swim", ["Komodo dragons make good pets", "Komodo dragons are scary", "Komodo dragons are the best animals"]),
         match("Match each Komodo dragon fact to its detail.", [("Length", "About three metres"), ("Food", "Deer and wild pigs"), ("Home", "Komodo and Rinca")])])
    return Q
