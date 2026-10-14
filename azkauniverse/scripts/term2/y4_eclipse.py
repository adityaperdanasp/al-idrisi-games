"""Level 4 (Solar & Lunar Eclipses) -- second batch: scenarios, types, diagrams, safety, why eclipses are rare."""
from common import *


def build():
    Q = [flash("Why not every month?", "The Moon's orbit is tilted compared with the path of the Sun in our sky, so the Moon usually passes just above or below the line-up. Eclipses only happen when the Sun, Moon and Earth line up exactly."),
         flash("Totality", "The short time during a total solar eclipse when the Moon completely covers the Sun. It lasts only a few minutes."),
         flash("Path of totality", "The narrow strip of Earth where people can see a total solar eclipse. Everyone outside it only sees a partial eclipse."),
         flash("Pinhole viewer", "A safe way to watch a solar eclipse: let the Sun shine through a tiny hole in card so a small image falls on a sheet below. You look at the image, never at the Sun.")]
    # scenarios by moon phase
    Q.append(mc("It is a new moon. Which eclipse could happen?", "A solar eclipse", ["A lunar eclipse", "No eclipse can ever happen", "Both at the same time"]))
    Q.append(mc("It is a full moon. Which eclipse could happen?", "A lunar eclipse", ["A solar eclipse", "No eclipse can ever happen", "Both at the same time"]))
    Q.append(mc("It is a first quarter Moon. Can an eclipse happen at this phase?", "No - eclipses only happen at new moon or full moon", ["Yes - a solar eclipse", "Yes - a lunar eclipse", "Yes - both kinds"]))
    Q.append(mc("It is a waning crescent. Can a lunar eclipse happen now?", "No - a lunar eclipse needs a full moon", ["Yes - any night", "Yes - at the end of the month", "Only in winter"]))
    Q.append(mc("Which line-up shows a solar eclipse?", "Sun - Moon - Earth", ["Sun - Earth - Moon", "Moon - Sun - Earth", "Earth - Sun - Moon"]))
    Q.append(mc("Which line-up shows a lunar eclipse?", "Sun - Earth - Moon", ["Sun - Moon - Earth", "Moon - Sun - Earth", "Earth - Moon - Sun"]))
    # why rare
    Q.append(mc("Why do eclipses not happen every month?", "The Moon's orbit is tilted, so the Sun, Moon and Earth do not usually line up exactly", ["The Moon stops moving", "Clouds hide them", "The Sun goes out for a month"]))
    Q.append(mc("The Sun is about 400 times wider than the Moon. Why do they look about the same size in the sky?", "The Sun is also about 400 times farther away", ["The Moon is hotter", "The Moon is brighter", "The Sun is smaller than it looks"]))
    # types by description
    Q.append(mc("The sky goes dark in the daytime and the Sun's glowing corona appears. Which eclipse is this?", "A total solar eclipse", ["A partial lunar eclipse", "An annular solar eclipse", "A penumbral lunar eclipse"]))
    Q.append(mc("The Moon is a little too far away to cover the Sun, so a bright ring is left. Which eclipse is this?", "An annular solar eclipse", ["A total solar eclipse", "A total lunar eclipse", "A partial solar eclipse"]))
    Q.append(mc("Only a bite-shaped part of the Sun is hidden. Which eclipse is this?", "A partial solar eclipse", ["A total solar eclipse", "A penumbral lunar eclipse", "An annular lunar eclipse"]))
    Q.append(mc("The Moon turns a deep orange-red colour. Which eclipse is this?", "A total lunar eclipse", ["A total solar eclipse", "A partial solar eclipse", "An annular solar eclipse"]))
    Q.append(mc("A dark curved bite appears on one side of the Moon. Which eclipse is this?", "A partial lunar eclipse", ["A total solar eclipse", "An annular solar eclipse", "A new moon"]))
    Q.append(mc("The Moon only dims a little and it is hard to notice. Which eclipse is this?", "A penumbral lunar eclipse", ["A total lunar eclipse", "A total solar eclipse", "An annular solar eclipse"]))
    # where / how long
    Q.append(mc("Who can see a lunar eclipse?", "Anyone on the night side of Earth where the Moon is above the horizon", ["Only people in one tiny strip", "Only people near the equator", "Only astronauts"]))
    Q.append(mc("Who can see a total solar eclipse?", "Only people inside a narrow path where the Moon's darkest shadow falls", ["Everyone on Earth at once", "Only people at the North Pole", "Nobody"]))
    Q.append(mc("How long does a total solar eclipse last at any one place?", "A few minutes at most", ["Several hours", "A whole day", "A whole week"]))
    Q.append(mc("A lunar eclipse can last...", "Several hours from start to finish", ["Only a few seconds", "A whole month", "Exactly one second"]))
    Q.append(mc("During a total solar eclipse, what happens to the temperature?", "It drops a little and the birds may go quiet", ["It rises very quickly", "It snows", "Nothing changes at all"]))
    Q.append(mc("During a solar eclipse, the Moon's shadow falls on...", "A small part of the Earth", ["The whole Sun", "The whole Earth at once", "Mars"]))
    Q.append(mc("During a lunar eclipse, the Moon is in the shadow of...", "The Earth", ["The Sun", "Mars", "A cloud"]))
    # safety
    Q.append(mc("Which is a SAFE way to look at a solar eclipse?", "Through a pinhole viewer or proper eclipse glasses", ["Through a camera lens without a filter", "Through binoculars with no filter", "With your naked eyes for a short moment"]))
    Q.append(mc("Why must you NEVER look at the Sun through binoculars during an eclipse?", "They make the sunlight much stronger and can badly hurt your eyes", ["They make the Moon red", "They make the eclipse shorter", "They are too heavy"]))
    Q.append(mc("A friend says it is fine to take a quick look at the partial eclipse without glasses. What should you say?", "No - you can damage your eyes, so always use eclipse glasses or a viewer", ["Yes - the Moon blocks the harm", "Yes - if you blink fast", "Yes - if you wear a hat"]))
    Q.append(mc("With a pinhole viewer, you should look at...", "The small image of the Sun on a sheet or card, with your back to the Sun", ["The Sun through the hole", "The Moon through the hole", "Nothing at all"]))
    Q.append(mc("Which is safe to watch without any special equipment?", "A lunar eclipse", ["A partial solar eclipse", "A total solar eclipse just before totality", "An annular solar eclipse"]))
    # diagrams
    Q.append(mc("Look at the picture. Which object is in the middle?", "The Moon", ["The Earth", "The Sun"], image=eclipse_diagram("solar"), minwrong=2))
    Q.append(mc("Look at the picture. Which object is in the middle?", "The Earth", ["The Moon", "The Sun"], image=eclipse_diagram("lunar"), minwrong=2))
    Q.append(mc("What kind of eclipse does this picture show?", "A solar eclipse", ["A lunar eclipse", "No eclipse"], image=eclipse_diagram("solar"), minwrong=2))
    Q.append(mc("What kind of eclipse does this picture show?", "A lunar eclipse", ["A solar eclipse", "No eclipse"], image=eclipse_diagram("lunar"), minwrong=2))
    Q.append(mc("Look at the picture. Whose shadow falls on the Earth?", "The Moon's shadow", ["The Sun's shadow", "Mars's shadow"], image=eclipse_diagram("solar"), minwrong=2))
    Q.append(mc("Look at the picture. Whose shadow falls on the Moon?", "The Earth's shadow", ["The Sun's shadow", "Mars's shadow"], image=eclipse_diagram("lunar"), minwrong=2))
    Q.append(mc("In which picture does the Moon block the light of the Sun?", "Picture A", ["Picture B", "Both pictures"], image=eclipse_pair(), minwrong=2))
    Q.append(mc("In which picture does the Earth block the light of the Sun?", "Picture B", ["Picture A", "Both pictures"], image=eclipse_pair(), minwrong=2))
    # fill
    Q.append(fill("The Moon's orbit is _____ , so eclipses do not happen every month. (one word)", "tilted", ["tilted", "tipped", "slanted"]))
    Q.append(fill("During a total solar eclipse, the Moon blocks the Sun's _____ . (one word: what we see)", "light", ["light", "sunlight", "disc", "disk"]))
    Q.append(fill("You can watch a solar eclipse safely with special eclipse _____ . (one word)", "glasses", ["glasses", "glass"]))
    Q.append(fill("A total solar eclipse lasts only a few _____ . (a unit of time)", "minutes", ["minutes", "minute"]))
    Q.append(fill("An _____ eclipse leaves a bright ring of the Sun around the Moon. (one word)", "annular"))
    Q.append(fill("A lunar eclipse happens when the Earth is between the Sun and the _____ .", "moon"))
    Q.append(fill("A solar eclipse happens when the Moon is between the Sun and the _____ .", "earth"))
    # true / false
    for st in ["A solar eclipse happens at a new moon.", "A lunar eclipse can be seen from anywhere on the night side of Earth.", "The Moon's orbit is tilted.", "A total solar eclipse lasts only a few minutes.",
               "A pinhole viewer is a safe way to watch a solar eclipse.", "The umbra is the darkest part of a shadow."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["A lunar eclipse happens at new moon.", "It is safe to look at a partial solar eclipse through binoculars.", "A solar eclipse happens every month.", "Everyone on Earth can see a total solar eclipse at once."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    Q.append(match("Match each eclipse description to its type.", [("Moon covers the Sun completely", "Total solar eclipse"), ("A ring of the Sun is left", "Annular solar eclipse"), ("Only part of the Sun is hidden", "Partial solar eclipse")]))
    Q.append(match("Match each lunar eclipse description to its type.", [("The Moon turns red", "Total lunar eclipse"), ("Part of the Moon is dark", "Partial lunar eclipse"), ("The Moon only dims slightly", "Penumbral lunar eclipse")]))
    Q.append(match("Match each moon phase to the eclipse that can happen.", [("New moon", "Solar eclipse"), ("Full moon", "Lunar eclipse")]))
    return Q
