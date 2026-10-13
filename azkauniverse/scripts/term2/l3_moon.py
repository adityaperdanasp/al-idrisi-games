from common import *

PH = [("New Moon", "The Moon cannot be seen from Earth because its lit side faces away from us."), ("Waxing Crescent", "A thin sliver of light that is growing bigger each night."),
      ("First Quarter", "Half of the Moon's face is lit as it keeps growing."), ("Waxing Gibbous", "More than half of the Moon is lit and still growing."),
      ("Full Moon", "The whole front side of the Moon is lit - a big round circle."), ("Waning Gibbous", "More than half is lit but it is getting smaller each night."),
      ("Third Quarter", "Half of the Moon's face is lit as it keeps shrinking (also called last quarter)."), ("Waning Crescent", "A thin sliver of light that is getting smaller each night.")]

def build():
    Q = [flash("Why does the Moon change shape?", "It does not really change! We only see the part of the Moon that the Sun is shining on, and that part changes as the Moon orbits the Earth."),
         flash("Phases of the Moon", "The different shapes of the Moon we see from Earth. There are eight main phases, and they repeat every 29 and a half days."),
         flash("The eight phases in order", "New moon, waxing crescent, first quarter, waxing gibbous, full moon, waning gibbous, third (last) quarter, waning crescent."),
         flash("Waxing and waning", "Waxing means the lit part is growing bigger. Waning means the lit part is getting smaller."),
         flash("What is the Moon?", "A rocky ball in space, smaller than Earth, with no air or water. It orbits the Earth and reflects light from the Sun."),
         flash("How long is one cycle of phases?", "About 29 and a half days - roughly one month.")]
    Q.append(mc("What causes the changing patterns of the Moon's appearance?", "Sunlight shining on different parts of the Moon", ["Earth's shadow", "The Moon's rotation", "The Moon's temperature"]))
    Q.append(mc("Why can't we see the entire Moon at all times?", "The Sun's light only shines on part of the Moon we can see", ["The Moon is too far away", "The Moon rotates too quickly", "The Moon is covered in clouds"]))
    Q.append(mc("What do we call the different shapes the Moon appears in?", "Phases of the Moon", ["Moon patterns", "Sun phases", "Lunar cycles"]))
    Q.append(mc("How many main phases of the Moon are there?", "Eight", ["Four", "Six", "Ten"]))
    Q.append(mc("How long does it take for the Moon to go through one complete cycle of phases?", "29 and a half days", ["7 days", "14 days", "365 days"]))
    Q.append(mc("What does the Moon do as it moves around the Earth?", "It orbits the Earth", ["It stays still", "It orbits the Sun only", "It spins around Mars"]))
    Q.append(mc("Does the Moon make its own light?", "No - it reflects light from the Sun", ["Yes - it glows by itself", "Yes - it is hot", "Only at night"]))
    Q.append(mc("What is the Moon made of?", "Rock", ["Gas", "Water", "Ice cream"]) if False else mc("What is the Moon like?", "A rocky ball with no air or water", ["A ball of hot gas", "A planet with oceans", "A star"]))
    Q.append(mc("Is the Moon bigger or smaller than Earth?", "Smaller", ["Bigger", "The same size"]))
    Q.append(mc("Which phase comes right AFTER the new moon?", "Waxing crescent", ["Full moon", "Waning crescent", "Third quarter"]))
    Q.append(mc("Which phase comes right BEFORE the full moon?", "Waxing gibbous", ["First quarter", "Waning gibbous", "New moon"]))
    Q.append(mc("Which phase comes right AFTER the full moon?", "Waning gibbous", ["Waxing gibbous", "Third quarter", "New moon"]))
    Q.append(mc("Which phase comes right BEFORE the new moon?", "Waning crescent", ["Waxing crescent", "Full moon", "First quarter"]))
    Q.append(mc("What does 'waxing' mean?", "The lit part is growing bigger", ["The lit part is getting smaller", "The Moon is hiding", "The Moon is red"]))
    Q.append(mc("What does 'waning' mean?", "The lit part is getting smaller", ["The lit part is growing bigger", "The Moon is full", "The Moon is far away"]))
    Q.append(mc("During which phase can we NOT see the Moon?", "New moon", ["Full moon", "First quarter", "Waning gibbous"]))
    Q.append(mc("During which phase do we see the whole lit face of the Moon?", "Full moon", ["New moon", "First quarter", "Waxing crescent"]))
    Q.append(mc("How many days between one full moon and the next?", "About 29 and a half", ["About 7", "About 14", "About 100"]))
    Q.append(mc("Scientists use the Moon's phases to...", "Predict the next full moon or new moon", ["Make clocks run faster", "Find lost keys", "Change the weather"]))
    for n, d in PH:
        Q.append(mc(f"Which phase is this? \"{d}\"", n, [x for x, _ in PH if x != n]))
        Q.append(mc(f"What is the {n.lower()}?", d, [y for x, y in PH if x != n]))
    for i, (n, k, wax) in enumerate(PHASES_ := [(a, b, c) for a, b, c in [("New Moon", 0, True), ("Waxing Crescent", .25, True), ("First Quarter", .5, True), ("Waxing Gibbous", .75, True), ("Full Moon", 1, True), ("Waning Gibbous", .75, False), ("Third Quarter", .5, False), ("Waning Crescent", .25, False)]]):
        Q.append(mc("What phase of the Moon is shown in the picture?", n, [x for x, _, _ in PHASES_ if x != n], image=moon_phase(k, wax)))
    for i, (n, k, wax) in enumerate(PHASES):
        L = "ABCDEFGH"[i]
        Q.append(mc(f"Look at the 8 phases of the Moon. Which one is the {n.lower()}?", f"Picture {L}", [f"Picture {c}" for c in "ABCDEFGH" if c != L], image=moon_cycle()))
    Q.append(match("Match each phase with its description.", PH[:4]))
    Q.append(match("Match each phase with its description.", PH[4:]))
    Q.append(match("Match each word with its meaning.", [("Waxing", "Growing bigger"), ("Waning", "Getting smaller"), ("Crescent", "A thin curved sliver"), ("Gibbous", "More than half lit")]))
    Q.append(match("Match each moon phase to how much we can see lit.", [("New Moon", "None"), ("First Quarter", "Half"), ("Full Moon", "All of the front side"), ("Waxing Crescent", "A thin sliver")]))
    Q.append(fill("The different shapes of the Moon are called the _____ of the Moon.", "phases", ["phases", "phase"]))
    Q.append(fill("The Moon takes about 29 and a half days to complete a cycle, which is about one _____ . (one word)", "month"))
    Q.append(fill("When the lit part of the Moon is growing it is called _____ . (waxing or waning)", "waxing"))
    Q.append(fill("When the lit part of the Moon is getting smaller it is called _____ . (waxing or waning)", "waning"))
    Q.append(fill("When the whole front side of the Moon is lit we call it a _____ moon.", "full"))
    Q.append(fill("The Moon is a rocky ball that _____ the Earth.", "orbits", ["orbits", "circles", "goes around", "orbit"]))
    Q.append(fill("The Moon reflects light from the _____ . (one word)", "sun"))
    Q.append(mc("True or false? The Moon makes its own light.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? The Moon has air and water.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? The Moon's phases repeat in a cycle.", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? The Sun always lights up half of the Moon.", "True", ["False"], minwrong=1))
    return Q

FACTS = ["The Moon takes about 29 and a half days to go through all its phases.", "We always see the same side of the Moon from Earth.", "There is no air or water on the Moon.",
         "The Moon is smaller than Earth and made of rock.", "Waxing means growing and waning means shrinking.", "A new moon is invisible because its lit side faces away from us.",
         "The Moon reflects light from the Sun - it does not make light itself.", "People have used the Moon's phases to make calendars for thousands of years."]
