"""Level 3 (Phases of the Moon) -- second batch: cycle order, timing, picture questions, Moon facts."""
from common import *

NAMES = [p[0] for p in PHASES]
LIT = {"New Moon": "None of the Moon's face is lit", "Waxing Crescent": "A thin sliver is lit", "First Quarter": "Half of the face is lit", "Waxing Gibbous": "More than half is lit, but not all",
       "Full Moon": "All of the face is lit", "Waning Gibbous": "More than half is lit, but not all", "Third Quarter": "Half of the face is lit", "Waning Crescent": "A thin sliver is lit"}


def build():
    Q = [flash("Satellite", "An object that orbits a bigger object in space. The Moon is Earth's natural satellite."),
         flash("Craters", "The round bowl-shaped dents on the Moon's surface, made by space rocks that crashed into it."),
         flash("Crescent and gibbous", "A crescent Moon has less than half of its face lit. A gibbous Moon has more than half lit but not all."),
         flash("First person on the Moon", "Neil Armstrong walked on the Moon in 1969 during the Apollo 11 mission.")]
    # N phases after
    for n in (2, 3):
        word = {2: "two", 3: "three"}[n]
        for i, name in enumerate(NAMES):
            ans = NAMES[(i + n) % 8]
            Q.append(mc("Which phase comes %s phases after the %s?" % (word, name.lower()), ans, pick([x for x in NAMES if x != ans], 3)))
    # timing
    TIM = [("new moon", "7", "First Quarter"), ("new moon", "15", "Full Moon"), ("new moon", "22", "Third Quarter"), ("new moon", "29", "New Moon"),
           ("full moon", "7", "Third Quarter"), ("full moon", "15", "New Moon"), ("full moon", "22", "First Quarter"), ("first quarter", "7", "Full Moon"), ("first quarter", "14", "Third Quarter"),
           ("third quarter", "7", "New Moon")]
    for start, days, ans in TIM:
        Q.append(mc("%s What phase will the Moon be in about %s days from now?" % (("Tonight is a %s." % start) if "quarter" not in start else ("Tonight the Moon is at the %s." % start), days), ans, [x for x in ["New Moon", "First Quarter", "Full Moon", "Third Quarter"] if x != ans]))
    # pictures
    for name, k, wax in PHASES:
        if 0 < k < 1:
            Q.append(mc("Look at the picture. Is the Moon waxing or waning? (In this workbook, the lit part on the right means waxing.)", "Waxing" if wax else "Waning", ["Waning" if wax else "Waxing"], image=moon_phase(k, wax), minwrong=1))
    for name, k, wax in PHASES:
        Q.append(mc("How much of the Moon's face is lit in the picture?", LIT[name], [v for v in dict.fromkeys(LIT.values()) if v != LIT[name]][:3], image=moon_phase(k, wax)))
    # facts
    Q.append(mc("Who was the first person to walk on the Moon?", "Neil Armstrong", ["Yuri Gagarin", "Galileo", "Albert Einstein"]))
    Q.append(mc("In which year did people first walk on the Moon?", "1969", ["1900", "1945", "2001"]))
    Q.append(mc("What are the round dents on the Moon's surface called?", "Craters", ["Oceans", "Volcanoes", "Rivers"]))
    Q.append(mc("What made the craters on the Moon?", "Space rocks crashing into it", ["Rivers", "Rain", "Earthquakes on Earth"]))
    Q.append(mc("Why can there be no sound on the Moon?", "There is no air to carry sound", ["It is too bright", "It is too small", "It is too cold for people"]))
    Q.append(mc("Is there wind or weather on the Moon?", "No - it has no air", ["Yes - strong winds all year", "Yes - rain every month", "Only at night"]))
    Q.append(mc("What does the Moon orbit?", "The Earth", ["The Sun only", "Mars", "Jupiter"]))
    Q.append(mc("What do we call an object that orbits a planet?", "A satellite", ["A comet", "A star", "A galaxy"]))
    Q.append(mc("Which side of the Moon do we always see from Earth?", "The same side", ["A different side each night", "Only the back", "Only the top"]))
    Q.append(mc("Which phase is it when the whole face of the Moon is lit?", "Full moon", ["New moon", "Third quarter", "Waxing crescent"]))
    Q.append(mc("When the Moon looks like a thin curve of light and is getting bigger, it is a...", "Waxing crescent", ["Waning gibbous", "Full moon", "Third quarter"]))
    Q.append(mc("When the Moon looks half lit and is getting smaller, it is the...", "Third quarter", ["First quarter", "Full moon", "New moon"]))
    Q.append(mc("A gibbous Moon has...", "More than half of its face lit", ["Less than half lit", "None lit", "Exactly half lit"]))
    Q.append(mc("A crescent Moon has...", "Less than half of its face lit", ["More than half lit", "All of it lit", "Exactly half lit"]))
    Q.append(mc("Why do we see different phases of the Moon over the month?", "We see different amounts of its sunlit side as it orbits Earth", ["The Moon grows and shrinks", "Earth's shadow covers it every night", "Clouds cover part of it"]))
    # fill and true/false
    Q.append(fill("The phase after the full moon is the waning _____ . (one word)", "gibbous"))
    Q.append(fill("The phase halfway between new and full when the Moon is growing is called the first _____ . (one word)", "quarter"))
    Q.append(fill("A thin curved sliver of the Moon is called a _____ moon. (one word)", "crescent"))
    Q.append(fill("The first person to walk on the Moon was Neil _____ .", "armstrong"))
    Q.append(fill("The round dents on the Moon are called _____ .", "craters", ["craters", "crater"]))
    Q.append(fill("The Moon has no air, so there is no _____ there. (one word: you hear it)", "sound"))
    Q.append(fill("The Moon is Earth's natural _____ . (one word)", "satellite"))
    Q.append(fill("When we cannot see the Moon at all, it is a _____ moon. (new or full)", "new"))
    for st in ["A full moon is a big round circle of light.", "The Moon takes about a month to go through its phases.", "The Moon has craters.", "A crescent Moon has less than half of its face lit.",
               "A waxing Moon is getting bigger."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["The Moon has oceans and rivers.", "We can hear sounds on the Moon.", "A gibbous Moon has less than half of its face lit.", "The Moon is bigger than the Earth.", "A new moon is the brightest phase."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    Q.append(match("Match each word with its meaning.", [("Satellite", "An object that orbits a planet"), ("Crater", "A round dent made by a crash"), ("Crescent", "Less than half lit"), ("Gibbous", "More than half lit")]))
    Q.append(match("Match each phase with how it looks.", [("New Moon", "Cannot be seen"), ("First Quarter", "Half lit, growing"), ("Full Moon", "A whole bright circle"), ("Third Quarter", "Half lit, shrinking")]))
    Q.append(match("Match each fact with the right word.", [("The Moon's dents", "Craters"), ("The first Moon walker", "Neil Armstrong"), ("The Moon's path around Earth", "Orbit"), ("The Moon's growing phases", "Waxing")]))
    return Q
