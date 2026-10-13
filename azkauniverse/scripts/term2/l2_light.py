from common import *

TRANSPARENT = ["clear window glass", "clean water", "clear plastic wrap", "a clear glass bottle", "clear glasses (spectacle lenses)", "a clear plastic bottle"]
TRANSLUCENT = ["tissue paper", "frosted glass", "baking paper", "a thin white curtain", "an ice cube", "a lampshade"]
OPAQUE = ["a wooden door", "cardboard", "a brick wall", "a metal tin can", "a pencil", "a chair", "your body", "a leaf"]
EYE = [("Cornea", "A clear window at the front of the eye that lets light in and helps focus it"), ("Iris", "The coloured part of the eye that controls how much light gets in"),
       ("Pupil", "The dark opening in the middle of the iris that lets light in"), ("Lens", "The part behind the pupil that focuses light onto the back of the eye"),
       ("Retina", "The layer at the back of the eye that senses light and turns it into signals"), ("Optic nerve", "The nerve that carries signals from the eye to the brain"),
       ("Sclera", "The tough white outer part of the eyeball"), ("Eyelid", "A moving flap of skin that closes to protect the eye"), ("Eyelashes", "Small hairs on the eyelid that keep dust out of the eye")]
LETTERS = {"A": "Cornea", "B": "Iris", "C": "Pupil", "D": "Lens", "E": "Retina", "F": "Optic nerve"}

def build():
    Q = [flash("How does light travel?", "In straight lines from a light source such as the Sun, a torch or a lamp."),
         flash("How do we see an object?", "Light bounces (reflects) off the object and enters our eyes."),
         flash("Transparent", "A material that lets almost all light pass through, so you can see clearly through it - like clear glass or water."),
         flash("Translucent", "A material that lets SOME light through, but you cannot see clearly through it - like tissue paper or frosted glass."),
         flash("Opaque", "A material that does not let any light pass through - like wood, cardboard and metal."),
         flash("What is a shadow?", "A dark area made when an opaque object blocks the light from a light source."),
         flash("When are shadows shortest and longest?", "Shortest at midday (the Sun is high) and longest early in the morning and late in the afternoon (the Sun is low)."),
         flash("What does the pupil do?", "It is the opening that lets light into the eye. In bright light it gets smaller; in dim light it gets bigger."),
         flash("What does the retina do?", "It is at the back of the eye and senses light, then sends signals along the optic nerve to the brain.")]
    # materials
    for m in TRANSPARENT:
        Q.append(mc(f"Is {m} transparent, translucent or opaque?", "Transparent", ["Translucent", "Opaque"], minwrong=2))
    for m in TRANSLUCENT:
        Q.append(mc(f"Is {m} transparent, translucent or opaque?", "Translucent", ["Transparent", "Opaque"], minwrong=2))
    for m in OPAQUE:
        Q.append(mc(f"Is {m} transparent, translucent or opaque?", "Opaque", ["Transparent", "Translucent"], minwrong=2))
    for _ in range(4):
        Q.append(mc("Which of these is OPAQUE?", rng.choice(OPAQUE), pick(TRANSPARENT, 2) + pick(TRANSLUCENT, 1)))
        Q.append(mc("Which of these is TRANSPARENT?", rng.choice(TRANSPARENT), pick(OPAQUE, 2) + pick(TRANSLUCENT, 1)))
        Q.append(mc("Which of these is TRANSLUCENT?", rng.choice(TRANSLUCENT), pick(OPAQUE, 2) + pick(TRANSPARENT, 1)))
    Q.append(match("Match each word with its meaning.", [("Transparent", "Lets almost all light through"), ("Translucent", "Lets some light through"), ("Opaque", "Lets no light through")]))
    Q.append(match("Match each material to the right word.", [("Clear glass", "Transparent"), ("Tissue paper", "Translucent"), ("Wood", "Opaque")]))
    Q.append(match("Match each material to the right word.", [("Clean water", "Transparent"), ("A brick wall", "Opaque"), ("Baking paper", "Translucent")]))
    # light facts
    Q.append(fill("Light travels in _____ lines from a source of light.", "straight"))
    Q.append(fill("We can see an object because light _____ off it and enters our eyes. (one word: reflects/bounces)", "reflects", ["reflects", "bounces", "reflect", "bounce"]))
    Q.append(fill("Wood and cardboard are _____ objects, which light cannot travel through.", "opaque"))
    Q.append(fill("A material that lets all light pass through, like glass, is called _____ .", "transparent"))
    Q.append(fill("Tissue paper is _____ , which lets some light travel through.", "translucent"))
    Q.append(fill("When an opaque object blocks out the light, a _____ is formed.", "shadow"))
    Q.append(mc("What forms a shadow?", "An opaque object blocking light", ["A transparent object", "Light bending", "A hot object"]))
    Q.append(mc("Which kind of object can make a clear dark shadow?", "Opaque", ["Transparent", "Both are the same"], minwrong=2) if False else mc("Which kind of object makes the darkest shadow?", "Opaque", ["Transparent", "Translucent"]))
    Q.append(mc("What do we need in order to see anything?", "Light", ["Heat", "Sound", "Wind"]))
    Q.append(mc("Which of these is a source of light?", "The Sun", ["The Moon", "A mirror", "A window"]))
    Q.append(mc("Is the Moon a source of light?", "No - it reflects light from the Sun", ["Yes - it makes its own light", "Yes - it is hot", "No - it is dark"]))
    Q.append(mc("How does light travel?", "In straight lines", ["In curves", "In circles", "In zig-zags"]))
    Q.append(mc("When is your shadow SHORTEST?", "At midday", ["Early morning", "Late afternoon", "At sunset"]))
    Q.append(mc("When are shadows LONGEST?", "Early morning and late afternoon", ["At midday", "Never", "Only at night"]))
    Q.append(mc("Why are shadows long in the morning and evening?", "The Sun is low in the sky", ["The Sun is very high", "The Earth is hot", "Clouds are bigger"]))
    for lab, name in [("A", "morning"), ("B", "midday"), ("C", "late afternoon")]:
        Q.append(mc("Look at the three pictures. Which picture shows the time of day when the shadow is SHORTEST?", "B", ["A", "C"], image=shadow_times()))
        break
    Q.append(mc("Look at the three pictures. In picture A the Sun is low on the left. What time of day might it be?", "Early morning", ["Midday", "Midnight"], image=shadow_times()))
    Q.append(mc("Look at the three pictures. Which two pictures show LONG shadows?", "A and C", ["A and B", "B and C"], image=shadow_times()))
    # eye
    for n, d in EYE:
        Q.append(mc(f"What is the {n.lower()} of the eye?", d, [y for x, y in EYE if x != n]))
        Q.append(mc(f"Which part of the eye is this? \"{d}\"", n, [x for x, _ in EYE if x != n]))
    for L, n in LETTERS.items():
        Q.append(mc(f"Look at the diagram of the eye. What is the part labelled {L}?", n, [x for x in LETTERS.values() if x != n], image=eye_diagram()))
    Q.append(match("Match each part of the eye with its job.", [("Pupil", "Lets light into the eye"), ("Iris", "Controls how much light gets in"), ("Retina", "Senses light at the back of the eye"), ("Optic nerve", "Sends signals to the brain")]))
    Q.append(match("Match each part of the eye with its job.", [("Cornea", "Clear window at the front"), ("Lens", "Focuses light"), ("Eyelid", "Protects the eye"), ("Sclera", "The white of the eye")]))
    Q.append(mc("What happens to your pupils in bright light?", "They get smaller", ["They get bigger", "They disappear", "They turn red"]))
    Q.append(mc("What happens to your pupils in a dark room?", "They get bigger to let in more light", ["They get smaller", "They close", "Nothing"]))
    Q.append(mc("Which part of the eye carries messages to the brain?", "Optic nerve", ["Lens", "Iris", "Eyelid"]))
    Q.append(mc("Which part of the eye is the coloured part?", "Iris", ["Pupil", "Retina", "Lens"]))
    Q.append(fill("The _____ is the dark opening in the middle of the eye that lets light in.", "pupil"))
    Q.append(fill("The _____ is at the back of the eye and senses light.", "retina"))
    Q.append(fill("The _____ nerve carries signals from the eye to the brain. (one word)", "optic"))
    return Q

FACTS = ["Light is the fastest thing in the universe - it travels about 300,000 kilometres every second.", "Sunlight takes about 8 minutes to reach the Earth.", "Your pupils change size to control how much light enters your eyes.",
         "Glass is transparent because light can pass straight through it.", "Shadows are shortest at midday when the Sun is high overhead.", "The Moon does not make its own light - it reflects sunlight.",
         "The picture that lands on the back of your eye is actually upside down - your brain flips it!", "Wearing sunglasses protects your eyes from bright sunlight."]
