"""Level 1 (Energy Transformation) -- second batch: new devices, energy chains, sources, situations."""
from common import *

OUTS = ["Light", "Heat", "Movement", "Sound", "Electrical", "Chemical"]
# (object, energy in, [energy out]) -- each transformation is standard textbook science
DEV2 = [("Hairdryer", "Electrical", ["Heat", "Movement", "Sound"]), ("Heater", "Electrical", ["Heat"]), ("Washing machine", "Electrical", ["Movement"]), ("LED light", "Electrical", ["Light"]),
        ("Doorbell", "Electrical", ["Sound"]), ("Blender", "Electrical", ["Movement", "Sound"]), ("Campfire", "Chemical", ["Heat", "Light"]), ("Firework", "Chemical", ["Light", "Sound", "Heat"]),
        ("Glow stick", "Chemical", ["Light"]), ("Burning match", "Chemical", ["Heat", "Light"]), ("Windmill generator", "Movement", ["Electrical"]), ("Hydroelectric dam", "Movement", ["Electrical"]),
        ("Clapping hands", "Movement", ["Sound"]), ("Rubbing your hands together", "Movement", ["Heat"]), ("Solar garden light (by day)", "Light", ["Electrical"]), ("Child eating a banana and running", "Chemical", ["Movement", "Heat"]),
        ("Electric guitar amplifier", "Electrical", ["Sound"]), ("Rice cooker", "Electrical", ["Heat"]), ("Computer screen", "Electrical", ["Light"]), ("Alarm clock ringing", "Electrical", ["Sound"]),
        ("Candle flame", "Chemical", ["Heat", "Light"]), ("Bicycle dynamo", "Movement", ["Electrical"]), ("Fireplace log", "Chemical", ["Heat", "Light"]), ("Electric drill", "Electrical", ["Movement", "Sound", "Heat"])]


def fmt(parts, suffix=" energy"): return " + ".join(p + suffix for p in parts)
def arrow(i, outs): return "%s → %s" % (i, " + ".join(outs))


def wrongs_for(i, outs):
    cand = ["%s → %s" % (x, y) for x in OUTS for y in OUTS if (x != i and y != x) or (x == i and y not in outs and y != i)]
    cand = [c for c in cand if c != arrow(i, outs)]
    # never offer a partial answer that would also be correct (same input and a subset of the outputs)
    cand = [c for c in cand if not (c.startswith(i + " → ") and set(c.split(" → ")[1].split(" + ")) <= set(outs))]
    return pick(cand, 3)


def build():
    Q = [flash("Energy source", "Where energy comes from: the Sun gives light and heat, food gives chemical energy, and batteries store chemical energy. The Sun is our biggest energy source."),
         flash("Energy output", "The energy a device gives out. A lamp's output is light and heat (input: electrical energy → output: light + heat)."),
         flash("Energy input", "The energy a device needs to work. A fan's input is electrical energy, and its output is movement."),
         flash("Useful and wasted energy", "A device gives out useful energy (like light from a bulb) and often some wasted energy too (like heat). A bulb's light is useful; the heat it gives off is wasted.")]
    for obj, i, outs in DEV2:
        a = arrow(i, outs)
        Q.append(mc("What energy transformation is shown by: <b>%s</b>?" % obj, a, wrongs_for(i, outs)))
    for obj, i, outs in [d for d in DEV2 if len(d[2]) <= 2][:16]:
        if len(outs) == 1:
            wrong = [o + " energy" for o in pick([o for o in OUTS if o not in outs and o != i], 3)]
        else:
            rest = [o for o in OUTS if o not in outs]
            combos = [(x, y) for ix, x in enumerate(rest) for y in rest[ix + 1:]]
            wrong = [fmt(c) for c in pick(combos, 3)]
        Q.append(mc("<b>%s</b>: the input is %s energy. What energy does it give out?" % (obj, i.lower()), fmt(outs), wrong))
    for obj, i, outs in [d for d in DEV2 if len(d[2]) == 1][:14]:
        Q.append(fill("<b>%s</b>: %s energy → _____ energy." % (obj, i.lower()), outs[0].lower(), [outs[0].lower()]))
    GIVES = [("sound energy", ["Doorbell", "Alarm clock ringing", "Clapping hands", "Electric guitar amplifier", "Firework", "Blender"], ["Glow stick", "LED light", "Computer screen", "Solar garden light (by day)"]),
             ("light energy", ["LED light", "Glow stick", "Campfire", "Burning match", "Computer screen", "Firework", "Candle flame"], ["Washing machine", "Doorbell", "Clapping hands", "Rubbing your hands together"]),
             ("movement energy", ["Washing machine", "Blender", "Electric drill", "Child eating a banana and running"], ["Glow stick", "LED light", "Computer screen", "Candle flame"]),
             ("electrical energy", ["Windmill generator", "Hydroelectric dam", "Bicycle dynamo", "Solar garden light (by day)"], ["Heater", "Rice cooker", "Doorbell", "Campfire"])]
    for label, yes, no in GIVES:
        for y in rng.sample(yes, 2):
            Q.append(mc("Which of these gives out %s?" % label, y, no[:3]))
    # sources
    SRC = [("Which energy source gives us both light and heat every day?", "The Sun", ["A battery", "The Moon", "A fan"]),
           ("Where does your body get its chemical energy from?", "Food", ["Sunglasses", "Water only", "The wind"]),
           ("What stores chemical energy so a toy can move?", "A battery", ["A mirror", "A window", "A plastic spoon"]),
           ("What do plants need from the Sun to make their food?", "Light energy", ["Sound energy", "Electrical energy", "Movement energy"]),
           ("Moving air turns a windmill. Which energy does the wind have?", "Movement energy", ["Light energy", "Chemical energy", "Sound energy"]),
           ("Falling water turns a turbine. Which energy does the water have?", "Movement energy", ["Light energy", "Chemical energy", "Sound energy"])]
    for q, a, w in SRC: Q.append(mc(q, a, w))
    # situations
    SIT = [("A child claps her hands.", "Movement → Sound"), ("You rub your hands together on a cold day.", "Movement → Heat"), ("A firework explodes in the sky.", "Chemical → Light + Sound + Heat"),
           ("A solar garden light charges in the sun.", "Light → Electrical"), ("A windmill turns a generator.", "Movement → Electrical"), ("A rice cooker cooks rice.", "Electrical → Heat"),
           ("A glow stick is bent and starts to glow.", "Chemical → Light"), ("A doorbell is pressed.", "Electrical → Sound")]
    allt = [t for _, t in SIT]
    for s, a in SIT:
        Q.append(mc("%s What is the energy transformation?" % s, a, [t for t in allt if t != a]))
    # chains with diagrams
    CH = [(["Sun", "Plant", "Chemical energy", "You eat it", "Movement energy"], 2, "Chemical energy", ["Sound energy", "Light energy", "Electrical energy"]),
          (["Wind", "Windmill", "Movement energy", "Generator", "Electrical energy"], 2, "Movement energy", ["Light energy", "Sound energy", "Chemical energy"]),
          (["Battery", "Chemical energy", "Toy car", "Movement energy"], 2, "Toy car", ["Torch", "Radio", "Lamp"]),
          (["Mains socket", "Electrical energy", "Radio", "Sound energy"], 2, "Radio", ["Candle", "Solar panel", "Bicycle"]),
          (["Sun", "Light energy", "Solar panel", "Electrical energy"], 2, "Solar panel", ["Windmill", "Battery", "Radio"]),
          (["Food", "Chemical energy", "Your body", "Heat energy"], 3, "Heat energy", ["Light energy", "Chemical energy", "Sound energy"]),
          (["Falling water", "Movement energy", "Dam generator", "Electrical energy", "Light bulb"], 3, "Electrical energy", ["Sound energy", "Chemical energy", "Heat energy"]),
          (["Match", "Chemical energy", "Flame", "Heat + Light"], 2, "Flame", ["Battery", "Solar panel", "Fan"])]
    for labs, b, ans, wrong in CH:
        Q.append(mc("Complete the energy chain. What goes in the ? box?", ans, wrong, image=energy_chain(labs, blank=b)))
    Q.append(mc("Look at the energy chain. What does the generator make?", "Electrical energy", ["Sound energy", "Chemical energy", "Light only"], image=energy_chain(["Wind", "Windmill", "Movement energy", "Generator", "Electrical energy"])))
    Q.append(mc("Look at the energy chain. Which energy is the INPUT of the radio?", "Electrical energy", ["Sound energy", "Light energy", "Chemical energy"], image=energy_chain(["Mains socket", "Electrical energy", "Radio", "Sound energy"])))
    # facts & true/false
    for st in ["A hairdryer gives out heat and movement.", "Clapping your hands changes movement energy into sound energy.", "A battery stores chemical energy.",
               "A glow stick changes chemical energy into light.", "Rubbing your hands together makes heat."]:
        Q.append(mc("True or false? %s" % st, "True", ["False"], minwrong=1))
    for st in ["A solar panel changes sound into light.", "A candle gives out only sound.", "A radio changes light energy into movement.", "Plants get chemical energy from the wind.", "A battery stores sound energy."]:
        Q.append(mc("True or false? %s" % st, "False", ["True"], minwrong=1))
    Q.append(mc("Why does a light bulb feel warm?", "It gives out heat as well as light", ["It gives out sound", "It makes chemical energy", "It stores food"]))
    Q.append(mc("What happens to energy when a toy car stops moving?", "It has changed into other forms, like heat and sound", ["It disappears completely", "It goes back into the battery", "It turns into food"]))
    Q.append(mc("Which energy form can you hear?", "Sound energy", ["Heat energy", "Chemical energy", "Light energy"]))
    Q.append(mc("Which energy form can you see?", "Light energy", ["Sound energy", "Chemical energy", "Heat energy"]))
    Q.append(match("Match each energy form to an example.", [("Light energy", "Sunlight"), ("Sound energy", "A drum beat"), ("Heat energy", "A hot stove"), ("Chemical energy", "Food and batteries")]))
    Q.append(match("Match each device to its input energy.", [("Radio", "Electrical"), ("Torch", "Chemical"), ("Solar panel", "Light"), ("Windmill", "Movement")]))
    Q.append(match("Match each device to what it gives out.", [("Doorbell", "Sound"), ("LED light", "Light"), ("Heater", "Heat"), ("Washing machine", "Movement")]))
    Q.append(match("Match each situation to the energy change.", [("Clapping hands", "Movement → Sound"), ("Rubbing hands", "Movement → Heat"), ("Campfire", "Chemical → Heat + Light"), ("Windmill generator", "Movement → Electrical")]))
    return Q
