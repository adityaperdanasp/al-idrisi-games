from common import *

FORMS = [("Light energy", "Energy that allows us to see"), ("Sound energy", "Energy that we can hear"), ("Heat energy", "Energy related to temperature"),
         ("Electrical energy", "Energy that comes from moving electric charges"), ("Chemical energy", "Energy stored in food and fuels"), ("Movement energy", "Energy that makes objects move")]
# (object, energy in, [energy out]) - school workbook examples plus common ones
DEVICES = [("Lamp", "Electrical", ["Light", "Heat"], ["Electrical → Sound + Movement", "Electrical → Chemical"]), ("Electric fan", "Electrical", ["Movement"], ["Electrical → Light", "Electrical → Chemical"]),
           ("Radio", "Electrical", ["Sound"], ["Electrical → Heat only", "Electrical → Chemical"]), ("Battery-powered toy", "Chemical", ["Movement"], ["Chemical → Light", "Chemical → Food"]),
           ("Solar panel", "Light", ["Electrical"], ["Light → Sound", "Light → Movement"]), ("Electric kettle", "Electrical", ["Heat"], ["Electrical → Sound", "Electrical → Chemical"]),
           ("Bicycle rider", "Chemical", ["Movement"], ["Chemical → Light", "Chemical → Electrical"]), ("Toaster", "Electrical", ["Heat"], ["Electrical → Sound", "Electrical → Chemical"]),
           ("Television", "Electrical", ["Light", "Sound"], ["Electrical → Chemical", "Electrical → Movement only"]), ("Speaker", "Electrical", ["Sound"], ["Electrical → Chemical", "Electrical → Light only"]),
           ("Candle", "Chemical", ["Heat", "Light"], ["Chemical → Sound", "Chemical → Electrical"]), ("Torch", "Chemical", ["Light"], ["Chemical → Sound", "Chemical → Movement"]),
           ("Drum being hit", "Movement", ["Sound"], ["Movement → Chemical", "Movement → Light"]), ("Microphone", "Sound", ["Electrical"], ["Sound → Chemical", "Sound → Light"]),
           ("Plant in sunlight", "Light", ["Chemical"], ["Light → Sound", "Light → Movement"]), ("Car engine", "Chemical", ["Movement", "Heat"], ["Chemical → Light only", "Chemical → Sound only"])]
OUTS = ["Light", "Heat", "Movement", "Sound", "Electrical", "Chemical"]

def fmt(parts): return " + ".join(f"{p} energy" for p in parts)

def build():
    Q = [flash("What is energy?", "The ability to make things happen or cause change. Our bodies need it to move and grow, and machines need it to work."),
         flash("What is energy transformation?", "When energy changes from one form into another form. Energy does not disappear - it is transformed!"),
         flash("Name the six forms of energy in your workbook.", "Light, sound, heat, electrical, chemical and movement energy."),
         flash("What is an energy chain?", "A diagram that shows how energy changes from one form to another step by step, like Sun → Solar panel → Electrical energy → Light bulb → Light + Heat."),
         flash("Where does chemical energy come from in your body?", "From the food you eat. Food stores chemical energy that your body changes into movement and heat."),
         flash("What does a solar panel do?", "It transforms light energy from the Sun into electrical energy."),
         flash("Is energy ever lost?", "No - energy is only transformed. When a lamp shines, some electrical energy becomes light and some becomes heat.")]
    for f, d in FORMS:
        Q.append(mc(f"Which form of energy is this? \"{d}\"", f, [x for x, _ in FORMS if x != f]))
        Q.append(mc(f"{f} is...", d, [y for x, y in FORMS if x != f]))
    Q.append(match("Match each form of energy with its description.", FORMS))
    Q.append(match("Match each form of energy with its description.", shuffled(FORMS)[:4]))
    # devices
    for obj, i, outs, bad in DEVICES:
        a = f"{i} → " + " + ".join(outs)
        cross = [f"{x} → {y}" for x in OUTS for y in OUTS if x != y and x != i]
        Q.append(mc(f"What energy transformation happens in a {obj.lower()}?", a, list(bad) + pick([w for w in cross if w != a], 1)))
    for obj, i, outs, bad in DEVICES[:12]:
        Q.append(mc(f"A {obj.lower()} uses {i.lower()} energy. What energy does it give out?", fmt(outs), [f"{o} energy" for o in pick([o for o in OUTS if o not in outs], 3)]))
    for obj, i, outs, bad in DEVICES[:10]:
        Q.append(fill(f"A {obj.lower()} transforms {i.lower()} energy mainly into _____ energy.", outs[0].lower(), [o.lower() for o in outs]))
    Q.append(match("Match each object to its energy transformation.", [("Battery-powered toy", "Chemical → Movement"), ("Electric kettle", "Electrical → Heat"), ("Solar panel", "Light → Electrical"), ("Radio", "Electrical → Sound"), ("Torch", "Chemical → Light")]))
    Q.append(match("Match each object to its energy transformation.", [("Television", "Electrical → Light + Sound"), ("Candle", "Chemical → Heat + Light"), ("Drum", "Movement → Sound"), ("Plant in sunlight", "Light → Chemical")]))
    # situations
    SIT = [("A child eats breakfast and runs.", "Chemical → Movement"), ("A solar calculator is placed in sunlight.", "Light → Electrical"), ("A television is turned on.", "Electrical → Light + Sound"),
           ("A drum is hit.", "Movement → Sound"), ("A candle burns.", "Chemical → Heat + Light"), ("A fan is switched on.", "Electrical → Movement"), ("A toaster makes toast.", "Electrical → Heat"), ("A radio plays music.", "Electrical → Sound")]
    allt = [t for _, t in SIT]
    for s, a in SIT:
        Q.append(mc(f"{s} What is the energy transformation?", a, [t for t in allt if t != a]))
    # 'Think about it' items
    for txt, a in [("The Sun gives Earth ___ energy.", "light"), ("Food contains ___ energy.", "chemical"), ("A ringing bell produces ___ energy.", "sound"), ("A toaster uses ___ energy.", "electrical"), ("A moving bicycle has ___ energy.", "movement")]:
        Q.append(fill(txt.replace("___", "_____") + " (light, sound, heat, electrical, chemical or movement)", a, [a] + (["moving", "kinetic"] if a == "movement" else [])))
    Q.append(mc("What is energy transformation?", "Energy changing from one form to another", ["Energy disappearing", "Energy becoming smaller", "Energy stopping"]))
    Q.append(mc("Which energy is stored in food?", "Chemical", ["Light", "Sound", "Movement"]))
    Q.append(mc("A lamp transforms electrical energy mainly into:", "Light and heat", ["Sound and movement", "Chemical energy", "Food energy"]))
    Q.append(mc("A solar panel transforms:", "Light → electrical", ["Sound → light", "Heat → sound", "Movement → chemical"]))
    for st in ["Energy can change from one form to another.", "A lamp can transform electrical energy into light energy.", "Food contains chemical energy."]:
        Q.append(mc(f"True or false? {st}", "True", ["False"], minwrong=1))
    Q.append(mc("True or false? Energy is only found in electrical objects.", "False", ["True"], minwrong=1))
    Q.append(mc("True or false? Energy simply disappears when we stop using it.", "False", ["True"], minwrong=1))
    # energy chains (with diagrams)
    CH = [(["Sun", "Solar panel", "Electrical energy", "Light bulb", "Light + Heat"], 2, "Electrical energy", ["Chemical energy", "Sound energy", "Movement energy"]),
          (["Sun", "Solar panel", "Electrical energy", "Light bulb", "Light + Heat"], 1, "Solar panel", ["Battery", "Candle", "Fan"]),
          (["Battery", "Chemical energy", "Torch bulb", "Electrical energy", "Light energy"], 1, "Chemical energy", ["Sound energy", "Heat energy", "Movement energy"]),
          (["Sun", "Light energy", "Plant", "Chemical energy (stored)"], 1, "Light energy", ["Sound energy", "Electrical energy", "Movement energy"]),
          (["Electrical energy", "Electric fan", "Movement energy", "Moving air"], 2, "Movement energy", ["Light energy", "Chemical energy", "Sound energy"]),
          (["Food", "Chemical energy", "Your muscles", "Movement energy"], 1, "Chemical energy", ["Light energy", "Sound energy", "Electrical energy"])]
    for labs, b, ans, wrong in CH:
        Q.append(mc("Complete the energy chain. What goes in the ? box?", ans, wrong, image=energy_chain(labs, blank=b)))
    Q.append(mc("Look at the energy chain. What does the light bulb give out?", "Light + Heat", ["Sound", "Movement", "Chemical energy"], image=energy_chain(["Sun", "Solar panel", "Electrical energy", "Light bulb", "Light + Heat"])))
    return Q

FACTS = ["Energy cannot be made or destroyed - it only changes form.", "A solar panel turns sunlight into electricity.", "Plants store the Sun's energy as chemical energy in their food.",
         "A light bulb gives out heat as well as light - that is why it feels warm.", "Your body turns the chemical energy in food into movement and heat.",
         "A loudspeaker turns electrical energy into sound energy.", "A battery stores chemical energy that can become electrical energy.", "Rubbing your hands together turns movement energy into heat."]
