"""Level 2 (Light & the Eye) -- second batch: new materials, light sources, shadows, reflection, eye care."""
from common import *

TRANSPARENT = ["a clear plastic cup", "a magnifying glass lens", "swimming-pool water", "aquarium glass", "a clean car windscreen", "a clear glass jar"]
TRANSLUCENT = ["waxed paper", "a shower curtain", "a frosted bathroom window", "thin white cloth", "a frosted plastic folder", "a white plastic carrier bag"]
OPAQUE = ["a stone", "a book", "a rubber ball", "a metal spoon", "a coin", "a shoe", "a wooden desk", "aluminium foil", "a thick towel", "a mirror"]
LUMINOUS = ["the Sun", "a candle flame", "a torch that is switched on", "a lamp that is switched on", "a firefly", "a TV screen that is on", "lightning"]
NONLUM = ["the Moon", "a mirror", "a book", "a tree", "a diamond", "a metal spoon", "a bicycle reflector", "a planet like Mars"]


def build():
    Q = [flash("Light source", "Something that makes its own light, like the Sun, a candle flame, a torch or a firefly."),
         flash("Reflection", "When light bounces off a surface. A mirror reflects almost all the light that hits it, which is why you can see yourself in it."),
         flash("Shadow size", "A shadow gets bigger when the object is moved closer to the light source, and smaller when it is moved farther away."),
         flash("Looking after your eyes", "Wear sunglasses on very sunny days, never stare at the Sun, do not read in very dim light, rest your eyes from screens and do not rub them with dirty hands."),
         flash("Why do we blink?", "Blinking spreads tears over the eye. This keeps it moist and clean and helps wash away dust."),
         flash("Pupils in animals", "Many animals that hunt at night, like cats, have pupils that open wide in the dark to let in more light.")]
    for m in TRANSPARENT:
        Q.append(mc("Is %s transparent, translucent or opaque?" % m, "Transparent", ["Translucent", "Opaque"]))
    for m in TRANSLUCENT:
        Q.append(mc("Is %s transparent, translucent or opaque?" % m, "Translucent", ["Transparent", "Opaque"]))
    for m in OPAQUE:
        Q.append(mc("Is %s transparent, translucent or opaque?" % m, "Opaque", ["Transparent", "Translucent"]))
    for _ in range(3):
        Q.append(mc("Which of these is NOT opaque?", rng.choice(TRANSPARENT + TRANSLUCENT), pick(OPAQUE, 3)))
        Q.append(mc("Which of these lets some light through but is not clear?", rng.choice(TRANSLUCENT), pick(OPAQUE, 2) + pick(TRANSPARENT, 1)))
    Q.append(mc("You can clearly see a tree outside through a window. What kind of material is the window glass?", "Transparent", ["Translucent", "Opaque"]))
    Q.append(mc("You can see a blurry shape through a frosted bathroom window. What kind of material is it?", "Translucent", ["Transparent", "Opaque"]))
    Q.append(mc("You cannot see through a wooden door at all. What kind of material is the door?", "Opaque", ["Transparent", "Translucent"]))
    # light sources
    for s in rng.sample(LUMINOUS, 6):
        Q.append(mc("Does %s make its own light?" % s, "Yes - it is a light source", ["No - it only reflects light"], minwrong=1))
    for s in rng.sample(NONLUM, 6):
        Q.append(mc("Does %s make its own light?" % s, "No - it only reflects light", ["Yes - it is a light source"], minwrong=1))
    for _ in range(3):
        Q.append(mc("Which of these makes its OWN light?", rng.choice(LUMINOUS), pick(NONLUM, 3)))
        Q.append(mc("Which of these only REFLECTS light?", rng.choice(NONLUM), pick(LUMINOUS, 3)))
    # reflection
    Q.append(mc("What happens when light hits a mirror?", "It bounces back", ["It disappears", "It is turned into sound", "It goes straight through"]))
    Q.append(mc("Which of these reflects light best?", "A mirror", ["A black cloth", "A brick", "A piece of wood"]))
    Q.append(mc("Why can you see yourself in a mirror?", "The mirror reflects light from you back to your eyes", ["The mirror makes its own light", "The mirror is transparent", "Light stops at the mirror"]))
    Q.append(mc("A bicycle reflector helps at night because it...", "Reflects the light from car headlights", ["Makes its own light", "Makes a loud sound", "Absorbs all the light"]))
    Q.append(mc("Why do we see a red apple?", "Light bounces off the apple into our eyes", ["The apple makes red light", "Our eyes shine light on the apple", "Light stays inside the apple"]))
    # shadows
    Q.append(mc("What do you need to make a shadow?", "A light source and an opaque object", ["Only a light source", "A transparent object and darkness", "A mirror and a wall"]))
    Q.append(mc("A torch is moved closer to a toy. What happens to the toy's shadow?", "It gets bigger", ["It gets smaller", "It disappears", "It turns blue"]))
    Q.append(mc("A torch is moved farther away from a toy. What happens to the toy's shadow?", "It gets smaller", ["It gets bigger", "It disappears", "It stays the same size, but moves"]))
    Q.append(mc("Which material makes the faintest shadow?", "Transparent glass", ["A wooden board", "A metal plate", "A thick book"]))
    Q.append(mc("A sheet of tissue paper makes a shadow that is...", "Pale and fuzzy, because some light passes through", ["Completely black", "Bright yellow", "Missing"]))
    Q.append(mc("On which side of an object does its shadow fall?", "The side facing away from the light", ["The side facing the light", "Above the object", "Inside the object"]))
    Q.append(mc("Shadow puppets are cut from card because card is...", "Opaque, so it blocks the light", ["Transparent, so light passes through", "A light source", "A mirror"]))
    Q.append(mc("Why do you not have a shadow in a completely dark room?", "There is no light for your body to block", ["Your body is transparent", "Shadows only happen in the day", "Walls absorb shadows"]))
    Q.append(mc("The shape of a shadow is most like...", "The outline of the object that blocks the light", ["The colour of the light", "A perfect circle", "The size of the room"]))
    Q.append(mc("A tree casts a long shadow at 5 pm. What does this tell us about the Sun?", "It is low in the sky", ["It is high overhead", "It has gone out", "It is closer to the tree"]))
    # eye care and facts
    Q.append(mc("Which of these protects your eyes on a very sunny day?", "Wearing sunglasses", ["Looking at the Sun", "Rubbing your eyes", "Closing the curtains in the dark"]))
    Q.append(mc("Why should you not read in very dim light?", "It can make your eyes tired", ["It makes your eyes grow", "It makes your hair curly", "It uses up your tears"]))
    Q.append(mc("Which food contains a vitamin that helps keep your eyes healthy?", "Carrots", ["Plain sugar", "Chewing gum", "Salt"]))
    Q.append(mc("What should you do if dust gets in your eye?", "Blink and rinse it with clean water, and do not rub it", ["Rub it hard with dirty hands", "Poke it with a tissue", "Stare at the Sun"]))
    Q.append(mc("How can you rest your eyes after using a screen?", "Look at something far away for a while", ["Look at the screen closer", "Rub your eyes hard", "Read in the dark"]))
    Q.append(mc("What do eyelashes do?", "Keep dust out of the eye", ["Help us hear", "Make light", "Send signals to the brain"]))
    Q.append(mc("What do tears do for your eyes?", "Keep them moist and wash away dust", ["Make them bigger", "Make light for us", "Help us hear"]))
    Q.append(mc("A person who cannot see clearly may wear...", "Glasses", ["Gloves", "A scarf", "Boots"]))
    Q.append(mc("Which part of the eye works like the lens of a camera?", "The lens", ["The eyelid", "The iris", "The sclera"]))
    Q.append(mc("Which part of the eye works like the screen at the back of a camera?", "The retina", ["The pupil", "The cornea", "The eyelash"]))
    Q.append(mc("Which part of the eye is the black circle in the middle?", "The pupil", ["The iris", "The sclera", "The optic nerve"]))
    Q.append(mc("Which part of the eye is the tough white outer layer?", "The sclera", ["The pupil", "The retina", "The lens"]))
    Q.append(mc("Why do cats' pupils open wide in the dark?", "To let in more light", ["To let out heat", "To make a sound", "To keep dust out"]))
    Q.append(mc("Which sense do we use light for?", "Sight", ["Hearing", "Taste", "Smell"]))
    Q.append(mc("Which of these can NOT help us see in the dark?", "Closing our eyes", ["A torch", "A candle", "A lamp"]))
    # fill / true-false
    Q.append(fill("A material that lets no light through is _____ .", "opaque"))
    Q.append(fill("A firefly makes its own light, so it is a light _____ . (one word)", "source"))
    Q.append(fill("The Moon does not make light. It _____ light from the Sun. (one word)", "reflects", ["reflects", "reflect", "bounces"]))
    Q.append(fill("A mirror _____ light, so we can see ourselves in it. (one word)", "reflects", ["reflects", "reflect", "bounces"]))
    Q.append(fill("When a torch moves closer to an object, its shadow gets _____ . (bigger or smaller)", "bigger", ["bigger", "larger"]))
    Q.append(fill("When a torch moves farther from an object, its shadow gets _____ . (bigger or smaller)", "smaller", ["smaller"]))
    Q.append(fill("Blinking keeps the eye moist and _____ . (one word)", "clean"))
    for st in ["A candle flame is a source of light.", "A mirror makes its own light.", "Wood is opaque.", "A transparent object makes a faint shadow.", "The pupil lets light into the eye.",
               "Your eyes need light in order to see.", "Shadows are longer when the Sun is low in the sky."]:
        Q.append(mc("True or false? %s" % st, "False" if "mirror makes its own" in st else "True", ["True" if "mirror makes its own" in st else "False"], minwrong=1))
    Q.append(match("Match each object to what it is.", [("The Sun", "A star that makes its own light"), ("The Moon", "Reflects sunlight"), ("A mirror", "Reflects almost all light"), ("A candle flame", "Gives out light and heat")]))
    Q.append(match("Match each part of the eye with its job.", [("Eyelashes", "Keep dust out"), ("Eyelid", "Closes to protect the eye"), ("Tears", "Keep the eye moist"), ("Retina", "Senses light")]))
    Q.append(match("Match each material to the kind of shadow it makes.", [("Wood", "A dark shadow"), ("Tissue paper", "A pale shadow"), ("Clear glass", "A very faint shadow")]))
    return Q
