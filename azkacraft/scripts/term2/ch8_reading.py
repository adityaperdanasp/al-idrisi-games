from common import *

def P(pid, title, paras, qs):
    out = [passage(pid, title, paras)]
    for q in qs:
        q = dict(q); q["passageId"] = pid; out.append(q)
    return out

def build():
    Q = [flash("Main idea", "What a text is mostly about - the big idea that all the details support.", "In 'Rocks Come in Three Kinds', the main idea is that there are three types of rock."),
         flash("Inference", "A smart guess you make using clues in the text plus what you already know.", "Dina's heart beat fast, so we can infer she felt nervous."),
         flash("Context clue", "Words near a hard word that help you work out what it means.", "'She was hesitant, so she waited at the door before going in.' - waited helps us understand hesitant.")]
    Q += P("rocks", "Rocks Come in Three Kinds", [
        "Are all rocks the same? Not at all! Rocks can be smooth or rough, tiny or huge, grey or red. Scientists sort rocks into three kinds by looking at how they were made: sedimentary, igneous and metamorphic.",
        "Sedimentary rocks are made from sand, mud, shells and tiny pieces of other rocks that settle at the bottom of rivers, lakes and seas. Over many thousands of years the layers are pressed together until they harden. These rocks often feel grainy and can crumble easily. Sometimes they even hold the print of a plant or an animal - a fossil.",
        "Igneous rocks begin as hot, melted rock called magma. When magma cools and hardens, it becomes igneous rock. Granite and basalt are igneous rocks, and so is obsidian, which looks like black glass.",
        "Metamorphic rocks are rocks that have been changed. When heat and pressure deep in the Earth squeeze an older rock, it turns into something new and very hard. A rock can change from one kind to another again and again. Scientists call this the rock cycle."],
        [mc("What is the best title for this text?", "Rocks Come in Three Kinds", ["How to Find Fossils", "The Hottest Place on Earth", "Why Rivers Flow"]),
         mc("How are igneous rocks made?", "When hot, melted rock cools and hardens", ["When layers of mud are pressed together", "When fossils dry out", "When rivers carry sand"]),
         fill("Rocks made from layers of sand and mud are called ___ rocks.", "sedimentary"),
         mc("What does the word <b>fossil</b> most likely mean in this text?", "The print of a plant or animal in rock", ["A kind of black glass", "A hot melted rock", "A smooth river stone"]),
         mc("Which rock looks like black glass?", "Obsidian", ["Granite", "Basalt", "Sandstone"]),
         match("Match each kind of rock to how it forms.", [("Sedimentary", "Layers pressed together"), ("Igneous", "Magma cools and hardens"), ("Metamorphic", "Changed by heat and pressure")]),
         mc("What can we infer about sedimentary rocks from the words 'grainy' and 'crumble'?", "They are not as hard as some other rocks", ["They are always black", "They are made from lava", "They are very rare"]),
         mc("What is the 'rock cycle'?", "Rocks changing from one kind into another over time", ["A bicycle race for rocks", "A way to collect rocks", "The shape of a round rock"])])
    Q += P("camouflage", "Hiding and Standing Out", [
        "Plants and animals have a hard job: they have to stay alive in a wild world. Over a very long time, many of them have changed in clever ways to survive.",
        "Some animals use camouflage. Their fur or skin is almost the same colour as the place they live, so hungry hunters, called predators, find it hard to see them. A deer's brown coat blends in with the trees. A rabbit in a snowy place may grow white fur in winter and brown fur in summer.",
        "Other animals mimic something else. A walking stick insect looks just like a twig, so birds fly right past it. Some moths have spots on their wings that look like the eyes of an owl, which can scare a predator away.",
        "Not every living thing wants to hide. Many plants grow bright flowers to stand out, because the colours attract bees that carry pollen. Some plants grow sharp thorns, and a porcupine has spines on its back. These protect them from anything that tries to eat them."],
        [mc("What does <b>camouflage</b> mean?", "Colouring that helps an animal blend in with its surroundings", ["Making loud noises", "Running very fast", "Growing sharp teeth"]),
         mc("Why does a deer's brown coat help it?", "Predators find it hard to see it among the trees", ["It keeps the deer warm in winter", "It makes the deer faster", "It scares birds away"]),
         fill("A walking stick insect looks just like a ___.", "twig"),
         mc("What does the word <b>predator</b> mean in this text?", "An animal that hunts other animals", ["A plant with thorns", "A baby animal", "An insect that eats leaves"]),
         mc("Why do many plants have bright flowers?", "To attract bees", ["To hide from predators", "To scare birds away", "To stay warm"]),
         match("Match each living thing to how it protects itself.", [("Rabbit", "Changes fur colour with the seasons"), ("Walking stick", "Looks like a twig"), ("Porcupine", "Has sharp spines"), ("Rose bush", "Has thorns")]),
         mc("Which heading would fit the fourth paragraph best?", "Standing Out and Fighting Back", ["Camouflage", "Why Rabbits Turn White", "How Moths Fly"]),
         mc("The text says some moths have spots like owl's eyes. How do these spots help?", "They can scare away predators", ["They help moths see in the dark", "They make the moths colder", "They attract bees"])])
    Q += P("food-moves", "Food on the Move", [
        "“Ibu, why do we eat rice every day?” Bayu asked, poking at his plate.",
        "“Because we grow it here,” said Ibu. “The weather is warm and wet, which rice loves. There is plenty to go around.”",
        "“Do children everywhere eat rice?” “No. Some places are too cold or too dry to grow it. So rice is put on ships and trucks and sent to them. And their apples and wheat are sent to us.”",
        "Bayu stared at the shiny red apple in the bowl. “This apple travelled here?” “Yes, all the way across the sea,” Ibu smiled. “Food and many other things are made or grown where it is easiest, then sent to where people need them.”",
        "“Wow,” said Bayu. “I never knew my lunch had such a long journey!” He took a big bite of his apple. “It tastes even better now.”"],
        [mc("Why do Bayu and his family eat rice every day?", "They grow it nearby and there is plenty", ["It is cheap to buy", "Bayu likes it best", "There is no other food"]),
         mc("What does the word <b>plenty</b> mean in the second paragraph?", "A lot", ["A little", "Nothing", "One"]),
         fill("Rice is sent to places that are too cold or too ___ to grow it. (one word)", "dry"),
         mc("How did the apple reach Bayu's home?", "It was sent across the sea", ["A neighbour grew it", "It fell from a tree", "Bayu bought it from a farm nearby"]),
         mc("Which sentence from the story shows Bayu is surprised?", "“I never knew my lunch had such a long journey!”", ["“Ibu, why do we eat rice every day?”", "“Because we grow it here.”", "“Yes, all the way across the sea.”"]),
         mc("What is the main idea of the story?", "Food travels from where it is easy to grow to where it is needed", ["Rice is better than apples", "Bayu does not like rice", "Ships are very fast"]),
         mc("Why does the apple taste 'even better now'?", "Bayu now knows about its long journey", ["It was washed", "It is a different apple", "It is sweeter than rice"]),
         match("Match the speaker to what they do or say.", [("Bayu", "Asks why they eat rice every day"), ("Ibu", "Explains how food travels")])])
    Q += P("humming", "The Humming in the Wall", [
        "Dina woke up to a soft humming. It sounded like a lullaby, slow and gentle, and it was coming from somewhere near her bed. She checked under the pillow and behind the curtain. Nothing.",
        "She tiptoed to the wall by her bookshelf and pressed her ear against it. The humming was louder there. Dina felt a little hesitant. She wanted to know what it was, but a small voice in her head whispered, “What if it is something scary?”",
        "She took a deep breath and pushed the bookshelf aside. Behind it was a small hole, and inside the hole sat a family of tiny owls, huddled together and humming in their sleep!",
        "Dina smiled. “So you were singing me awake,” she whispered. She put a soft blanket near the hole, and every morning after that she woke up to the owls' lullaby."],
        [mc("What woke Dina up?", "A soft humming", ["A loud bang", "The sun", "Her alarm clock"]),
         mc("Where was the humming loudest?", "By the wall near her bookshelf", ["Under her pillow", "Behind the curtain", "Outside the window"]),
         mc("What does the word <b>hesitant</b> mean in this story?", "Not sure about doing something", ["Very excited", "Fast asleep", "Very hungry"]),
         mc("How do we know Dina was hesitant?", "She wanted to know but worried it might be scary", ["She ran away", "She shouted for help", "She went back to sleep"]),
         fill("Dina found a family of tiny ___ behind the bookshelf.", "owls"),
         mc("What can we infer about Dina at the end of the story?", "She became fond of the owls", ["She was frightened of them", "She told them to leave", "She forgot about them"]),
         mc("How did Dina feel when she found the owls?", "Happy and surprised", ["Angry", "Sad", "Bored"]),
         mc("Which title also fits the story?", "Dina and the Singing Owls", ["The Broken Bookshelf", "A Hot Summer", "The Lost Blanket"])])
    Q += P("kite-day", "Kite Day at the Beach", [
        "Every year, on the first Saturday of the holidays, the whole town came to the beach for Kite Day. Rafi had been waiting for it for weeks. This year, he had made his own kite from red paper, thin sticks and a long tail of ribbons.",
        "At the beach, the wind was strong and the sky was full of colour. Rafi ran along the sand as fast as he could, holding the string tight. The kite jerked, spun, and crashed into the sea. “Oh no!” Rafi cried. His chin trembled.",
        "His big sister Nadia put a hand on his shoulder. “Don't give up,” she said. “Let's dry it in the sun and try again.”",
        "An hour later, they launched the kite once more. This time Rafi waited for a strong gust, then let the string out slowly. The red kite soared up, up, up, until it was a tiny dot among the clouds. Rafi grinned so widely his cheeks hurt."],
        [mc("What did Rafi make his kite from?", "Red paper, thin sticks and ribbons", ["Cloth and rope", "Plastic and wire", "Leaves and grass"]),
         mc("What happened to the kite the first time?", "It crashed into the sea", ["It flew away", "It got stuck in a tree", "It tore in half"]),
         mc("How did Rafi feel when his kite crashed?", "Upset", ["Angry at Nadia", "Bored", "Excited"]),
         mc("What does Nadia's advice 'Don't give up' tell us about her?", "She is kind and encouraging", ["She is jealous", "She is lazy", "She does not like kites"]),
         mc("What did Rafi do differently the second time?", "He waited for a strong gust and let the string out slowly", ["He used a bigger kite", "He ran faster", "He asked someone else to fly it"]),
         fill("The kite became a tiny ___ among the clouds. (one word)", "dot"),
         mc("What is the lesson of this story?", "If you do not succeed at first, try again", ["Never go near the sea", "Kites are hard to make", "Only older children can fly kites"]),
         mc("Which word best describes Rafi at the end?", "Joyful", ["Frightened", "Tired", "Confused"])])
    Q += P("night-market", "The Night Market", [
        "As the sun slipped behind the rooftops, the street came alive. Lanterns flickered on, one by one, and soon the whole lane glowed warm and golden.",
        "The air was full of smells. Sizzling satay drifted from one stall, sweet fried bananas from another, and the sharp tang of lime from a drinks cart. Sellers called out to everyone who passed, and a drummer tapped a happy beat beside the fountain.",
        "Maya held her grandmother's hand tightly as they moved through the crowd. There were bright scarves hanging like rainbows, tiny wooden toys, and a table piled high with glittering bracelets. “Choose one,” said Nenek. Maya's eyes went from gold to silver to the blue one that sparkled like the sea.",
        "By the time they walked home, the lanterns were fading and Maya's bag was heavy with treats. She yawned. It had been the best night ever."],
        [mc("When does the market come alive?", "When the sun sets", ["At lunchtime", "At sunrise", "During the rain"]),
         mc("Which sense does the second paragraph describe most?", "Smell", ["Touch", "Sight only", "Taste only"]),
         fill("The scarves hung like ___.", "rainbows"),
         mc("Which phrase is a simile?", "sparkled like the sea", ["lanterns flickered on", "a drummer tapped a beat", "Maya yawned"]),
         mc("Who does Maya go to the market with?", "Her grandmother", ["Her sister", "Her teacher", "Her friend"]),
         mc("What does <b>glittering</b> most likely mean?", "Shining and sparkling", ["Very heavy", "Dull and plain", "Very old"]),
         mc("How does Maya feel at the end of the story?", "Happy and sleepy", ["Cross", "Frightened", "Lost"]),
         mc("Which title fits the text best?", "The Night Market", ["A Rainy Day", "The Lost Bracelet", "Grandma's Garden"])])
    return Q
