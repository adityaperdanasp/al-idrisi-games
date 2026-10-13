from common import *

def build():
    Q = [flash("Solar eclipse", "When the Moon passes between the Sun and the Earth and blocks some or all of the Sun's light. It happens only at a new moon."),
         flash("Lunar eclipse", "When the Earth passes between the Sun and the Moon, so Earth's shadow falls on the Moon. It happens only at a full moon."),
         flash("Umbra and penumbra", "The umbra is the dark, central part of a shadow. The penumbra is the lighter outer part of the shadow."),
         flash("Three types of solar eclipse", "Total (the Moon completely covers the Sun), annular (the Moon is farther away and leaves a ring of Sun), and partial (only part of the Sun is covered)."),
         flash("Three types of lunar eclipse", "Total (the Moon is in Earth's umbra and can look red - a 'blood moon'), partial (only part of the Moon is in the umbra), and penumbral (the Moon only dims slightly)."),
         flash("Staying safe", "NEVER look directly at the Sun - not even during an eclipse. Use special eclipse glasses or a solar viewer. Sunglasses are not enough!"),
         flash("The corona", "The Sun's glowing outer layer. You can only see it during a total solar eclipse, when the Moon hides the bright disc of the Sun.")]
    Q.append(mc("What is a solar eclipse?", "When the Moon passes between the Sun and Earth and blocks the Sun's light", ["When the Earth passes between the Sun and Moon", "When the Sun goes out", "When the Moon turns red"]))
    Q.append(mc("What is a lunar eclipse?", "When the Earth passes between the Sun and the Moon", ["When the Moon passes between the Sun and Earth", "When the Sun gets dark", "When the Moon is new"]))
    Q.append(mc("In a solar eclipse, which object is in the MIDDLE?", "The Moon", ["The Earth", "The Sun", "A planet"]))
    Q.append(mc("In a lunar eclipse, which object is in the MIDDLE?", "The Earth", ["The Moon", "The Sun", "Mars"]))
    Q.append(mc("A solar eclipse can only happen during which moon phase?", "New moon", ["Full moon", "First quarter", "Third quarter"]))
    Q.append(mc("A lunar eclipse can only happen during which moon phase?", "Full moon", ["New moon", "First quarter", "Waning crescent"]))
    Q.append(mc("Which object's shadow causes a lunar eclipse?", "The Earth", ["The Moon", "Mars", "A cloud"]))
    Q.append(mc("Which object's shadow causes a solar eclipse?", "The Moon", ["The Earth", "Jupiter", "A cloud"]))
    Q.append(mc("How many types of solar eclipse are there?", "Three", ["One", "Two", "Five"]))
    Q.append(mc("How many types of lunar eclipse are there?", "Three", ["One", "Two", "Five"]))
    Q.append(mc("In a TOTAL solar eclipse, the Moon...", "Completely covers the Sun", ["Covers only a small part of the Sun", "Is far from the Earth", "Turns red"]))
    Q.append(mc("An ANNULAR solar eclipse happens when the Moon is...", "Farther away from Earth and does not completely cover the Sun", ["Closer to Earth and covers all the Sun", "Behind the Sun", "In Earth's shadow"]))
    Q.append(mc("What does an annular eclipse look like?", "A bright ring of the Sun around the Moon", ["A complete black sky", "A red Moon", "A half Sun only"]))
    Q.append(mc("In a PARTIAL solar eclipse...", "Only part of the Sun is covered by the Moon", ["The whole Sun is covered", "The Moon is red", "The Earth is in shadow"]))
    Q.append(mc("What can you see around the dark Moon during a total solar eclipse?", "The Sun's corona", ["The planets crashing", "Rainbows", "A second Moon"]))
    Q.append(mc("Why is it dangerous to look directly at the Sun?", "It can harm your eyes and may cause blindness", ["It makes you sleepy", "It gives you a sunburn on your tongue", "It is not dangerous during an eclipse"]))
    Q.append(mc("Which is the SAFE way to watch a solar eclipse?", "Wear special eclipse glasses or use a solar viewer", ["Wear ordinary sunglasses", "Look quickly at the Sun", "Use a pair of binoculars"]))
    Q.append(mc("Are ordinary sunglasses safe for looking at a solar eclipse?", "No - they do not give enough protection", ["Yes - any sunglasses work", "Yes - if they are dark blue", "Only in the afternoon"]))
    Q.append(mc("Is it safe to watch a lunar eclipse without special equipment?", "Yes - it will not damage your eyes", ["No - you need eclipse glasses", "No - it is as bright as the Sun", "Only with a telescope"]))
    Q.append(mc("Why can a total lunar eclipse look red?", "Red light from the Sun bends through Earth's atmosphere onto the Moon", ["The Moon gets hot and glows red", "Mars is in front of it", "The Moon is painted"]))
    Q.append(mc("What is a reddish Moon during a total lunar eclipse sometimes called?", "A blood moon", ["A blue moon", "A harvest moon", "A new moon"]))
    Q.append(mc("What is the umbra?", "The dark centre of a shadow", ["The bright edge of a shadow", "The Sun's atmosphere", "A type of Moon"]))
    Q.append(mc("What is the penumbra?", "The lighter outer part of a shadow", ["The darkest part of a shadow", "The corona", "A planet"]))
    Q.append(mc("In a penumbral lunar eclipse, the Moon...", "Only dims slightly", ["Disappears completely", "Turns bright blue", "Splits in two"]))
    Q.append(mc("In a partial lunar eclipse, the Moon...", "Moves only partly into the Earth's umbra", ["Moves completely behind the Sun", "Is not in any shadow", "Becomes a new moon"]))
    Q.append(mc("Which eclipse is visible only from a small area on Earth where the Moon's shadow falls?", "A total solar eclipse", ["A lunar eclipse", "A penumbral eclipse", "A full moon"]))
    Q.append(mc("Which is seen from more places on Earth: a total or a partial solar eclipse?", "A partial solar eclipse", ["A total solar eclipse", "They are the same", "Neither"]))
    Q.append(mc("Roughly how often do lunar eclipses happen?", "About three times a year (but not all are total)", ["Every night", "Once every 100 years", "Never"]))
    Q.append(mc("A solar eclipse is very...", "Rare - many people look forward to seeing one", ["Common - it happens every day", "Boring", "Easy to see anywhere"]))
    Q.append(mc("You can make a safe solar viewer using...", "Paper, aluminium foil, glue and scissors", ["A mirror and a telescope", "Sunglasses and a torch", "A bucket"]))
    Q.append(mc("What is the brightest light on Earth that people should never stare at?", "The Sun", ["The Moon", "A candle", "A star"]))
    Q.append(mc("The diagram shows the Sun, Moon and Earth. What is happening?", "A solar eclipse - the Moon is between the Sun and Earth", ["A lunar eclipse", "A new year", "Nothing - they are not lined up"], image=eclipse_diagram("solar")))
    Q.append(mc("The diagram shows the Sun, Earth and Moon. What is happening?", "A lunar eclipse - the Earth is between the Sun and Moon", ["A solar eclipse", "A full year", "Nothing - they are not lined up"], image=eclipse_diagram("lunar")))
    Q.append(mc("Which diagram shows a SOLAR eclipse?", "Diagram A", ["Diagram B", "Both of them"], minwrong=2) if False else mc("Which diagram shows a SOLAR eclipse?", "Diagram A", ["Diagram B", "Neither diagram"], image=eclipse_pair(), minwrong=2))
    Q.append(mc("Which diagram shows a LUNAR eclipse?", "Diagram B", ["Diagram A", "Neither diagram"], image=eclipse_pair(), minwrong=2))
    Q.append(match("Match each eclipse to what happens.", [("Solar eclipse", "The Moon is between the Sun and Earth"), ("Lunar eclipse", "The Earth is between the Sun and the Moon")]))
    Q.append(match("Match each type of solar eclipse to its description.", [("Total", "The Moon completely covers the Sun"), ("Annular", "A ring of the Sun is still visible"), ("Partial", "Only part of the Sun is covered")]))
    Q.append(match("Match each type of lunar eclipse to its description.", [("Total", "The Moon is fully in the umbra and can look red"), ("Partial", "Only part of the Moon is in the umbra"), ("Penumbral", "The Moon only dims slightly")]))
    Q.append(match("Match each word with its meaning.", [("Umbra", "The dark centre of a shadow"), ("Penumbra", "The lighter outer part of a shadow"), ("Corona", "The Sun's glowing outer layer"), ("Eclipse", "When one object's shadow falls on another in space")]))
    Q.append(fill("A _____ eclipse happens when the Moon passes between the Sun and the Earth.", "solar"))
    Q.append(fill("A _____ eclipse happens when the Earth passes between the Sun and the Moon.", "lunar"))
    Q.append(fill("The three types of solar eclipse are total, annular and _____ .", "partial"))
    Q.append(fill("The dark centre of a shadow is called the _____ .", "umbra"))
    Q.append(fill("The lighter outer part of a shadow is called the _____ .", "penumbra"))
    Q.append(fill("A total lunar eclipse can make the Moon look _____ . (a colour)", "red"))
    Q.append(fill("A solar eclipse happens during a _____ moon. (new or full)", "new"))
    Q.append(fill("A lunar eclipse happens during a _____ moon. (new or full)", "full"))
    Q.append(fill("During a total solar eclipse, the Sun's glowing outer layer, the _____ , becomes visible.", "corona"))
    Q.append(mc("True or false? Sunglasses give enough protection to look at a solar eclipse.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? A lunar eclipse will not damage your eyes.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? A solar eclipse happens at full moon.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? A lunar eclipse happens at full moon.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? In a total solar eclipse the Moon completely blocks the Sun's disc.", "True", ["False"], minwrong=1))
    return Q

FACTS = ["During a total solar eclipse, the sky gets dark in the middle of the day.", "Never look straight at the Sun, even during an eclipse - use special eclipse glasses.",
         "A lunar eclipse can turn the Moon red because sunlight bends through Earth's air.", "An annular solar eclipse leaves a 'ring of fire' around the Moon.",
         "Lunar eclipses happen only at full moon; solar eclipses happen only at new moon.", "The Moon's shadow in a total solar eclipse covers only a small area of Earth.",
         "The umbra is the darkest part of a shadow and the penumbra is the lighter part.", "It is safe to watch a lunar eclipse with just your eyes."]
