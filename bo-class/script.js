/* =================================================================
   Bo's Classroom (PM round 13, item 10) -- short animated lessons that
   introduce a topic BEFORE you practise it: 3 slides on Bo's chalkboard
   (emoji that pop in one by one), then 3 practice questions. Finish a
   lesson for a ✅ stamp and a one-time 10 coins. Lessons live in LESSONS
   below (id, emoji, title, slides, quiz).
   ================================================================= */
const $ = id => document.getElementById(id);
const K = window.AIGKit;
const player = K.signedIn();
const rep = (e, n) => Array.from({ length: n }, () => e);

const LESSONS = [
  { id: "poem", emoji: "🎶", title: "Poems, rhyme & similes", slides: [
    { vis: ["🐦", "🌳", "|", "A little bird sits in a tree,"], text: "A poem uses words in a creative way to share ideas, feelings or stories. Each line is a row of words, and a group of lines is a stanza." },
    { vis: ["moon", "|", "spoon", "|", "tree", "|", "bee"], text: "Rhyming words end with the same sound: moon and spoon, tree and bee. Rhythm is the beat you hear when you read aloud." },
    { vis: ["as white as", "|", "cotton", "|", "like a", "|", "cheetah"], text: "A simile compares two things using 'like' or 'as'. Personification gives human actions to things that are not human: 'The wind whispered.'" }],
    quiz: [["Which word rhymes with 'light'?", ["night", "moon", "tree"], 0], ["'The snow is as white as cotton' is a…", ["Simile", "Stanza", "Haiku"], 0], ["'The sun smiled down on us' uses…", ["Personification", "A simile", "Rhyme only"], 0]] },
  { id: "letter", emoji: "✉️", title: "Writing a letter", slides: [
    { vis: ["📍", "Address", "|", "📅", "Date"], text: "A letter starts with the sender's address and the date at the top." },
    { vis: ["Dear", "Aunty", "Susie,", "|", "💬", "message"], text: "Then the greeting (Dear Aunty Susie,) and your message. A friendly letter sounds chatty and kind." },
    { vis: ["Lots of love,", "|", "Ella"], text: "End with a complimentary close, like 'Lots of love,' and then your signature - your name." }],
    quiz: [["Which is a greeting?", ["Dear Aunty Susie,", "Lots of love,", "99 Toytown Avenue"], 0], ["Which closing is friendly (informal)?", ["See you soon,", "Yours faithfully,", "To whom it may concern,"], 0], ["Your name at the end of a letter is the…", ["Signature", "Greeting", "Address"], 0]] },
  { id: "noun-types", emoji: "🏷️", title: "Types of noun", slides: [
    { vis: ["Lucy", "London", "Spain"], text: "A proper noun is the special name of a person, place or thing, and it starts with a capital letter." },
    { vis: ["cat", "book", "love", "trust"], text: "A common noun is a general name (cat, book). An abstract noun is something you cannot touch, like love, anger or trust." },
    { vis: ["a pack of wolves", "|", "farmhouse"], text: "A collective noun names a group (a pack of wolves, a hive of bees). A compound noun is two words joined: farm + house = farmhouse." }],
    quiz: [["Which is a proper noun?", ["London", "city", "happiness"], 0], ["'Trust' is an…", ["Abstract noun", "Proper noun", "Compound noun"], 0], ["A 'flock' of birds uses a…", ["Collective noun", "Compound noun", "Proper noun"], 0]] },
  { id: "synonyms", emoji: "🔀", title: "Synonyms", slides: [
    { vis: ["happy", "=", "joyful"], text: "Synonyms are words with the same or nearly the same meaning: happy and joyful." },
    { vis: ["big", "large", "huge", "enormous"], text: "One idea can have many synonyms. Picking a stronger word makes your writing more exciting." },
    { vis: ["small", "≠", "huge"], text: "Careful! Words with OPPOSITE meanings (small / huge) are antonyms, not synonyms." }],
    quiz: [["Which word means the same as 'quick'?", ["fast", "slow", "quiet"], 0], ["A synonym for 'beautiful' is…", ["pretty", "ugly", "noisy"], 0], ["Synonyms have…", ["Similar meanings", "Opposite meanings", "The same spelling"], 0]] },
  { id: "homophones", emoji: "👂", title: "Homophones", slides: [
    { vis: ["their", "there", "they're"], text: "Homophones sound the same but are spelled differently and mean different things." },
    { vis: ["their", "=", "belonging to them", "|", "there", "=", "in that place"], text: "Their = belonging to them. There = in that place. They're = they are." },
    { vis: ["to", "too", "two"], text: "To = towards. Too = also or very. Two = the number 2. Check the meaning to choose the right spelling!" }],
    quiz: [["'The dog was ___ tired to walk.'", ["too", "to", "two"], 0], ["'___ going to the beach.' (they are)", ["They're", "Their", "There"], 0], ["Which word means 'belonging to them'?", ["their", "there", "they're"], 0]] },
  { id: "capitals", emoji: "🔠", title: "Capital letters & full stops", slides: [
    { vis: ["Mia", "likes", "Jakarta", "."], text: "Start every sentence with a capital letter and end it with a full stop (or ? or !)." },
    { vis: ["Monday", "Ramadan", "Lily", "Indonesia"], text: "Names of people, places, days and months always get a capital letter." },
    { vis: ["I", "am", "here"], text: "The word 'I' is ALWAYS a capital letter, even in the middle of a sentence." }],
    quiz: [["Which sentence is written correctly?", ["We went to Jakarta on Friday.", "we went to jakarta on friday.", "We went to jakarta on friday."], 0], ["Which needs a capital letter?", ["Monday", "morning", "house"], 0], ["A question ends with a…", ["Question mark", "Comma", "Full stop"], 0]] },
  { id: "direct-speech", emoji: "💬", title: "Direct speech", slides: [
    { vis: ["Mia said", "“Hello!”"], text: "Direct speech shows the exact words someone says, inside speech marks." },
    { vis: ["“We need to go,”", "whispered Leo."], text: "Put the spoken words in speech marks. Punctuation (, ? !) goes INSIDE the closing mark. Then say who spoke." },
    { vis: ["New speaker", "=", "new line"], text: "Reported speech has no speech marks: Leo whispered that they needed to go. Start a new line for each new speaker." }],
    quiz: [["Which uses direct speech?", ["“Hurry up!” called Sam.", "Sam called that we must hurry.", "Sam hurry up called."], 0], ["Speech marks go around…", ["The exact words spoken", "The speaker's name", "The whole page"], 0], ["When a new person speaks you…", ["Start a new line", "Keep going on the same line", "Use capital letters only"], 0]] },
  { id: "speaker", emoji: "🗣️", title: "Who is speaking?", slides: [
    { vis: ["Mia:", "“Good morning!”"], text: "In a play script, the name before the colon tells you who is speaking." },
    { vis: ["said Ben", "|", "whispered Leo"], text: "In a story, look for the speaker's name in the reporting clause, like 'said Ben' or 'whispered Leo'." },
    { vis: ["new line", "→", "new speaker"], text: "No name? A new line means the speaker switched. Use the story clues to work out who it is - be a speaker detective!" }],
    quiz: [["In 'Mia: Hello!' who is speaking?", ["Mia", "Hello", "Nobody"], 0], ["In '“Look!” said Sara.' who speaks?", ["Sara", "Look", "Said"], 0], ["A new line in a dialogue usually means…", ["A different person speaks", "The story ends", "The speaker is tired"], 0]] },
  { id: "basic-ops", emoji: "🧮", title: "Big numbers & long division", slides: [
    { vis: ["5", "6", "8", ",", "3", "3", "7"], text: "A 6-digit number like 568,337 has hundred-thousands, ten-thousands, thousands, hundreds, tens and ones. Line the digits up in columns." },
    { vis: ["7", "+", "3", "=", "10", "→", "carry", "1"], text: "Add (or subtract) column by column, starting from the right. If a column makes 10 or more, write the ones digit and carry the 1 to the next column." },
    { vis: ["12,456", "÷", "12", "=", "1,038"], text: "Long division: divide, multiply, subtract, bring down. Check it: 1,038 × 12 = 12,456." }],
    quiz: [["What is 250,000 + 150,000?", ["400,000", "300,000", "410,000"], 0], ["In 700 − 258, the top ones digit is smaller. What do you do?", ["Borrow from the next column", "Add instead", "Skip it"], 0], ["32,456 ÷ 2 = ?", ["16,228", "16,208", "15,228"], 0]] },
  { id: "pictograph", emoji: "🖼️", title: "Pictographs", slides: [
    { vis: ["🍎", "🍎", "🍎", "🍎"], text: "A pictograph uses little pictures to show numbers." },
    { vis: ["🍎", "=", "20", "apples"], text: "Always read the KEY first! It tells you what ONE picture is worth. A half picture is worth half as much." },
    { vis: ["🍎", "🍎", "🍎", "+", "½🍎", "=", "70"], text: "If 🍎 = 20, then 3 whole pictures are 3 × 20 = 60, and half a picture is 10. The row shows 60 + 10 = 70 apples." }],
    quiz: [["If 🍎 = 10 and a row has 4 whole 🍎, how many apples is that?", ["40", "14", "4"], 0], ["If one picture = 20 and a row has 2 whole pictures and 1 half picture, the total is…", ["50", "40", "22"], 0], ["Why do we need a key?", ["To know what one picture is worth", "To colour the chart", "To count the rows"], 0]] },
  { id: "bar-graph", emoji: "📊", title: "Bar graphs", slides: [
    { vis: ["📊"], text: "A bar graph uses bars. The HEIGHT of a bar shows how many." },
    { vis: ["10", "|", "8", "|", "6", "|", "4", "|", "2"], text: "Look at the scale up the side. Follow the top of the bar across to the number. If the scale goes up in 2s, a bar halfway between 6 and 8 is 7." },
    { vis: ["tallest", "=", "most", "|", "shortest", "=", "fewest"], text: "The tallest bar is the biggest amount; the shortest bar is the smallest. To compare two bars, subtract their values." }],
    quiz: [["Which bar shows the most popular choice?", ["The tallest", "The shortest", "The widest"], 0], ["On a scale that goes up in 2s, a bar halfway between 6 and 8 shows…", ["7", "6.5", "14"], 0], ["One bar is 12 and another is 5. How much taller is the first?", ["7", "17", "6"], 0]] },
  { id: "line-graph", emoji: "📈", title: "Line graphs", slides: [
    { vis: ["📈"], text: "A line graph shows how something CHANGES over time, like minutes played each day." },
    { vis: ["⬆️", "increase", "|", "⬇️", "decrease", "|", "➡️", "same"], text: "Line going UP means the value increased. Going DOWN means it decreased. Flat means it did not change." },
    { vis: ["40", "→", "65", "=", "+25"], text: "To find the change, subtract: Day 1 is 40 minutes and Day 2 is 65 minutes, so Day 2 is 65 − 40 = 25 minutes more." }],
    quiz: [["The line goes DOWN between two points. The value…", ["Decreased", "Increased", "Stayed the same"], 0], ["Day 1: 40 minutes, Day 2: 65 minutes. How many more minutes on Day 2?", ["25", "105", "15"], 0], ["A flat line between two points means…", ["No change", "A big increase", "A mistake"], 0]] },
  { id: "angles", emoji: "📐", title: "Measuring angles", slides: [
    { vis: ["acute", "<", "90°", "|", "right", "=", "90°", "|", "obtuse", "90°–180°", "|", "reflex", ">", "180°"], text: "We name angles by their size: acute is less than 90°, right is exactly 90°, obtuse is between 90° and 180°, and reflex is more than 180°." },
    { vis: ["0", "→", "protractor", "→", "read the scale"], text: "Use a protractor: put the centre on the vertex, line one side up with the 0, then read the number where the other side crosses the scale." },
    { vis: ["88°", "−", "58°", "=", "30°"], text: "Missing angle: whole angle minus the known part. A straight line is 180° and a full turn is 360°." }],
    quiz: [["An angle of 120° is…", ["Obtuse", "Acute", "Right"], 0], ["A reflex angle is…", ["More than 180°", "Less than 90°", "Exactly 90°"], 0], ["The whole angle is 88° and one part is 58°. The other part is…", ["30°", "146°", "40°"], 0]] },
  { id: "perimeter", emoji: "🧵", title: "Perimeter", slides: [
    { vis: ["🟦"], text: "Perimeter is the distance AROUND the edge of a shape." },
    { vis: ["9", "+", "4", "+", "9", "+", "4"], text: "A rectangle 9 cm long and 4 cm wide has sides 9, 4, 9 and 4. Add all the sides." },
    { vis: ["2", "×", "(", "9", "+", "4", ")", "=", "26"], text: "A shortcut for a rectangle: 2 × (length + width) = 26 cm. For a square, 4 × one side." }],
    quiz: [["A square has sides of 5 cm. What is its perimeter?", ["20 cm", "10 cm", "25 cm"], 0], ["A rectangle is 9 cm long and 4 cm wide. Perimeter?", ["26 cm", "13 cm", "36 cm"], 0], ["A triangle has sides 7, 8 and 6 cm. Perimeter?", ["21 cm", "15 cm", "42 cm"], 0]] },
  { id: "area", emoji: "🟩", title: "Area", slides: [
    { vis: ["🟩", "🟩", "🟩", "|", "🟩", "🟩", "🟩"], text: "Area is the space INSIDE a shape, counted in square units (cm²). A rectangle 3 wide and 2 tall has 6 squares." },
    { vis: ["length", "×", "width", "|", "½", "×", "base", "×", "height"], text: "Rectangle: length × width. Triangle: half of base × height. Parallelogram: base × height." },
    { vis: ["½", "×", "d₁", "×", "d₂", "|", "rhombus"], text: "A rhombus has two diagonals. Its area is half of one diagonal times the other: ½ × d₁ × d₂." }],
    quiz: [["A rectangle is 8 cm by 5 cm. Area?", ["40 cm²", "26 cm²", "13 cm²"], 0], ["A triangle has base 10 cm and height 6 cm. Area?", ["30 cm²", "60 cm²", "16 cm²"], 0], ["A rhombus has diagonals 8 cm and 6 cm. Area?", ["24 cm²", "48 cm²", "14 cm²"], 0]] },
  { id: "square-numbers", emoji: "🔲", title: "Square numbers", slides: [
    { vis: ["🟦", "🟦", "|", "🟦", "🟦"], text: "2 rows of 2 tiles make a square with 4 tiles. So 2² = 2 × 2 = 4." },
    { vis: ["1", "4", "9", "16", "25", "36", "49", "64", "81", "100"], text: "The first square numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100. They come from 1², 2², 3² … 10²." },
    { vis: ["3²", "+", "4²", "=", "9", "+", "16", "=", "25"], text: "Square first, then add: 3² + 4² = 9 + 16 = 25." }],
    quiz: [["5² = ?", ["25", "10", "52"], 0], ["Which is a square number?", ["49", "48", "50"], 0], ["3² + 4² = ?", ["25", "14", "49"], 0]] },
  { id: "factors-primes", emoji: "🌳", title: "Factors & prime numbers", slides: [
    { vis: ["18", "=", "1×18", "|", "2×9", "|", "3×6"], text: "Factors divide a number exactly with nothing left over. The factors of 18 are 1, 2, 3, 6, 9 and 18." },
    { vis: ["2", "3", "5", "7", "11", "13"], text: "A PRIME number has exactly two factors: 1 and itself. 2, 3, 5, 7, 11 and 13 are prime. 1 is not prime." },
    { vis: ["24", "→", "2×12", "→", "2×2×6", "→", "2×2×2×3"], text: "A factor tree splits a number again and again until only primes are left: 24 = 2 × 2 × 2 × 3." }],
    quiz: [["Which number is a factor of 18?", ["6", "5", "7"], 0], ["Which is a prime number?", ["13", "15", "21"], 0], ["24 written as prime factors is…", ["2 × 2 × 2 × 3", "2 × 3 × 4", "2 × 12"], 0]] },
  { id: "multiples-lcm-gcf", emoji: "🧩", title: "Multiples, LCM & GCF", slides: [
    { vis: ["4", "8", "12", "16", "20"], text: "Multiples are the numbers in a times table. The first five multiples of 4 are 4, 8, 12, 16 and 20." },
    { vis: ["4,8,12", "|", "6,12,18", "→", "LCM", "=", "12"], text: "The LCM (lowest common multiple) is the smallest multiple two numbers share. Multiples of 4: 4, 8, 12. Multiples of 6: 6, 12. The LCM is 12." },
    { vis: ["12", "→", "1,2,3,4,6,12", "|", "18", "→", "1,2,3,6,9,18", "→", "GCF", "=", "6"], text: "The GCF (greatest common factor) is the biggest factor two numbers share. For 12 and 18 it is 6." }],
    quiz: [["What are the first three multiples of 4?", ["4, 8, 12", "1, 2, 4", "4, 6, 8"], 0], ["What is the LCM of 4 and 6?", ["12", "24", "2"], 0], ["What is the GCF of 12 and 18?", ["6", "3", "36"], 0]] },
  { id: "energy", emoji: "⚡", title: "Energy transformation", slides: [
    { vis: ["💡", "🔊", "🔥", "⚡", "🍎", "🏃"], text: "Energy is the ability to make things happen. It has forms: light, sound, heat, electrical, chemical and movement." },
    { vis: ["🔌", "→", "💡", "+", "🔥"], text: "Energy transformation is when energy changes form. A lamp changes electrical energy into light and heat." },
    { vis: ["☀️", "→", "🔆", "→", "⚡", "→", "💡"], text: "An energy chain shows the steps: Sun → solar panel → electrical energy → light bulb → light and heat. Energy is never lost, only changed!" }],
    quiz: [["Which energy is stored in food?", ["Chemical", "Sound", "Light"], 0], ["A solar panel changes…", ["Light into electricity", "Sound into light", "Heat into sound"], 0], ["A lamp changes electrical energy mainly into…", ["Light and heat", "Sound and movement", "Food"], 0]] },
  { id: "light-eye", emoji: "👁️", title: "Light and the eye", slides: [
    { vis: ["🔦", "→", "➡️", "➡️", "➡️"], text: "Light travels in straight lines from a source. We see things because light bounces off them and enters our eyes." },
    { vis: ["transparent", "|", "translucent", "|", "opaque"], text: "Transparent materials (clear glass) let light through. Translucent ones (tissue paper) let some through. Opaque ones (wood) block it and make shadows." },
    { vis: ["cornea", "pupil", "iris", "lens", "retina", "nerve"], text: "Light enters the eye through the cornea and pupil, the lens focuses it, and the retina sends signals along the optic nerve to the brain." }],
    quiz: [["Which material is opaque?", ["Wood", "Clear glass", "Tissue paper"], 0], ["The opening that lets light into the eye is the…", ["Pupil", "Retina", "Optic nerve"], 0], ["A shadow forms when…", ["An opaque object blocks light", "Light bends", "The Sun is hot"], 0]] },
  { id: "moon-phases", emoji: "🌙", title: "Phases of the Moon", slides: [
    { vis: ["☀️", "→", "🌙", "→", "🌍"], text: "The Moon does not make light. We see it because sunlight shines on it, and we only see the lit part." },
    { vis: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"], text: "As the Moon orbits Earth, the lit part we see changes. The eight phases are new moon, waxing crescent, first quarter, waxing gibbous, full moon, waning gibbous, third quarter and waning crescent." },
    { vis: ["29½", "days", "=", "one cycle"], text: "Waxing means growing and waning means shrinking. The whole cycle takes about 29 and a half days." }],
    quiz: [["How many main phases of the Moon are there?", ["8", "4", "12"], 0], ["What causes the Moon's phases?", ["Sunlight lighting different parts we can see", "Earth's shadow", "The Moon spinning fast"], 0], ["Waning means the lit part is…", ["Getting smaller", "Getting bigger", "Red"], 0]] },
  { id: "eclipses", emoji: "🌑", title: "Solar and lunar eclipses", slides: [
    { vis: ["☀️", "🌙", "🌍"], text: "In a solar eclipse the Moon is between the Sun and Earth and blocks the Sun's light. It happens at new moon." },
    { vis: ["☀️", "🌍", "🌙"], text: "In a lunar eclipse the Earth is between the Sun and Moon, so Earth's shadow falls on the Moon. It happens at full moon, and the Moon can look red." },
    { vis: ["😎", "❌", "👓", "✅"], text: "NEVER look straight at the Sun. Use special eclipse glasses or a solar viewer - ordinary sunglasses are not safe. A lunar eclipse is safe to watch." }],
    quiz: [["In a solar eclipse, what is in the middle?", ["The Moon", "The Earth", "The Sun"], 0], ["A lunar eclipse happens at…", ["Full moon", "New moon", "Half moon only"], 0], ["Which is safe for watching a solar eclipse?", ["Eclipse glasses", "Sunglasses", "Binoculars"], 0]] },
  { id: "landforms", emoji: "🏞️", title: "Lakes, deserts and rivers", slides: [
    { vis: ["🏞️", "💧", "🏜️", "🌊"], text: "A lake is water with land all around. A river is a long stream flowing to the sea. A desert is a place with very little rain - hot or cold!" },
    { vis: ["Caspian Sea", "Baikal", "Victoria"], text: "The Caspian Sea is the largest lake, Lake Baikal in Russia is the deepest, and Lake Victoria is the largest in Africa." },
    { vis: ["Sahara", "Antarctic", "Nile", "Amazon"], text: "The Sahara is the biggest hot desert and Antarctica the biggest desert of all. The Nile flows through Africa and the Amazon carries the most water." }],
    quiz: [["What is a desert?", ["A place with very little rain", "A very deep lake", "A long river"], 0], ["The Amazon River is in…", ["South America", "Asia", "Europe"], 0], ["Which is the largest lake in the world?", ["Caspian Sea", "Lake Victoria", "Lake Michigan"], 0]] },
  { id: "ethnic-groups", emoji: "🎭", title: "Ethnic groups in Indonesia", slides: [
    { vis: ["Sumatra", "Java", "Kalimantan", "Sulawesi", "Papua"], text: "Indonesia has five main islands and 38 provinces. Each region is home to different ethnic groups with their own cultures." },
    { vis: ["Batak", "Minangkabau", "Javanese", "Sundanese", "Balinese", "Asmat"], text: "A culture includes language, clothing, food, music and dances, and houses. For example the Batak are from North Sumatra, the Minangkabau from West Sumatra, and the Asmat from Papua." },
    { vis: ["Bhinneka", "Tunggal", "Ika"], text: "Our motto, Bhinneka Tunggal Ika, means Unity in Diversity. It is written on the Garuda Pancasila. We are different, but one nation!" }],
    quiz: [["What does Bhinneka Tunggal Ika mean?", ["Unity in Diversity", "Long live Indonesia", "One island"], 0], ["The Asmat people come from…", ["Papua", "Bali", "Aceh"], 0], ["How many provinces does Indonesia have?", ["38", "5", "100"], 0]] },
  { id: "jakarta-history", emoji: "🏙️", title: "History of Jakarta", slides: [
    { vis: ["Betawi"], text: "The Betawi people are the original inhabitants of Jakarta. Their culture is a blend of Malay, Sundanese, Javanese, Chinese, Arab, Indian and European influences." },
    { vis: ["Sunda Kelapa", "→", "Jayakarta", "→", "Batavia", "→", "Jakarta"], text: "The city was once the port Sunda Kelapa, then Jayakarta in 1527, Batavia under Dutch rule from 1619, and Jakarta since 1942." },
    { vis: ["🎎", "🍲", "🎭"], text: "Betawi culture includes ondel-ondel giant puppets, lenong theatre, gambang kromong music, and food like soto Betawi, ketoprak and nasi uduk." }],
    quiz: [["Who are the original inhabitants of Jakarta?", ["The Betawi", "The Bugis", "The Batak"], 0], ["What did the Dutch call Jakarta?", ["Batavia", "Jayakarta", "Sunda Kelapa"], 0], ["Nasi uduk is rice cooked in…", ["Coconut milk", "Soup", "Peanut sauce"], 0]] },
  { id: "jakarta-landmarks", emoji: "🗼", title: "Jakarta landmarks", slides: [
    { vis: ["🗼", "132 m", "🔥"], text: "Monas, the National Monument, is 132 metres tall with a golden flame on top. It stands for Indonesia's struggle for independence, with a museum at its base." },
    { vis: ["🧍", "Jalan Jenderal Sudirman"], text: "The General Sudirman Statue is made of bronze. It honours a hero who fought colonial rule even though he was ill with tuberculosis." },
    { vis: ["🏟️", "1962", "Asian Games"], text: "Gelora Bung Karno (GBK) is a sports complex named after Sukarno. Its stadium was built for the 1962 Asian Games. A landmark is a place that is easy to remember!" }],
    quiz: [["How tall is Monas?", ["132 metres", "32 metres", "1,320 metres"], 0], ["GBK is named after…", ["Sukarno", "Sudirman", "Fatahillah"], 0], ["A statue or building that remembers a person or time is a…", ["Monument", "Stadium", "Market"], 0]] }
];
// Audit batch 4: checkpoint question mid-lesson, tap-to-count on busy slides, Bo reads each slide,
// a "show me again" branch after a wrong answer, skip-to-quiz, lesson of the day + streak,
// a link to a game that uses the topic, a summary card, and a graduation certificate.
const GAME_FOR = { "basic-ops": ["../mathville/", "MathVille"], "pictograph": ["../mathville/", "MathVille"], "bar-graph": ["../mathville/", "MathVille"], "line-graph": ["../mathville/", "MathVille"], "angles": ["../mathville/", "MathVille"], "perimeter": ["../mathville/", "MathVille"], "area": ["../mathville/", "MathVille"], "square-numbers": ["../mathville/", "MathVille"], "factors-primes": ["../mathville/", "MathVille"], "multiples-lcm-gcf": ["../mathville/", "MathVille"], poem: ["../azkacraft/", "Language & Arts"], letter: ["../azkacraft/", "Language & Arts"], "noun-types": ["../azkacraft/", "Language & Arts"], synonyms: ["../azkacraft/", "Language & Arts"], homophones: ["../azkacraft/", "Language & Arts"], capitals: ["../azkacraft/", "Language & Arts"], "direct-speech": ["../azkacraft/", "Language & Arts"], speaker: ["../azkacraft/", "Language & Arts"], energy: ["../azkauniverse/", "SolarQuest"], "light-eye": ["../azkauniverse/", "SolarQuest"], "moon-phases": ["../azkauniverse/", "SolarQuest"], eclipses: ["../azkauniverse/", "SolarQuest"], landforms: ["../azkauniverse/", "SolarQuest"], "ethnic-groups": ["../azkauniverse/", "SolarQuest"], "jakarta-history": ["../azkauniverse/", "SolarQuest"], "jakarta-landmarks": ["../azkauniverse/", "SolarQuest"] };
const lsc = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lscw = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const cday = o => new Date(Date.now() - (o || 0) * 86400000).toISOString().slice(0, 10);
const say = t => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {} };

if (!player) $("bc-overlay").innerHTML = K.signedOutHtml("🎓");
else init();

async function init() {
  const done = await Promise.race([AIGLeaderboard.getLessons().catch(() => ({})), new Promise(r => setTimeout(() => r({}), 2500))]); // offline: start without stamps
  const menu = () => {
    const tod = LESSONS[Math.floor(Date.now() / 86400000) % LESSONS.length], streak = lsc("bc_day", "") === cday() || lsc("bc_day", "") === cday(1) ? Number(lsc("bc_streak", "0")) : 0;
    const all = LESSONS.every(l => done[l.id]);
    $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-q">Pick a lesson</div><p class="kit-sub" style="text-align:center">${Object.keys(done).length}/${LESSONS.length} lessons finished · 🔥 ${streak}-day lesson streak</p>
      <button class="bc-tod" data-i="${LESSONS.indexOf(tod)}" type="button">⭐ Lesson of the day: ${tod.emoji} ${K.esc(tod.title)} <small>(+streak)</small></button>
      ${all ? `<div class="bc-cert">🎓 <b>Graduate of Bo's Classroom!</b><br>${K.esc((player && player.name) || "You")} finished all ${LESSONS.length} lessons.</div>` : ""}
      ${Object.keys(done).length ? `<button class="kit-btn block" id="bc-recap" type="button">⚡ 1-minute recap quiz${Number(lsc("bc_recap_best", "0")) ? ` (best ${lsc("bc_recap_best", "0")})` : ""}</button>` : ""}
      <div class="bc-lessons">${LESSONS.map((l, i) => `<button class="bc-l ${done[l.id] ? "done" : ""}" data-i="${i}"><span class="e">${l.emoji}</span>${l.title}<br><small>${done[l.id] ? `${"⭐".repeat(done[l.id].score || 0)}${"☆".repeat(3 - (done[l.id].score || 0))}` : "3 slides"}</small></button>`).join("")}</div></div>`;
    const rb = $("bc-recap"); if (rb) rb.onclick = recap;
    $("bc-main").querySelectorAll(".bc-tod").forEach(b => b.onclick = () => teach(LESSONS[+b.dataset.i]));
    $("bc-main").querySelectorAll(".bc-l").forEach(b => b.onclick = () => teach(LESSONS[+b.dataset.i]));
  };
  function visHtml(list) { return list.map((v, i) => v === "|" ? `<span class="sep" style="animation-delay:${i * .22}s">|</span>` : `<span style="animation-delay:${i * .22}s">${K.esc(v)}</span>`).join(" "); }
  function teach(l) {
    let i = 0, checked = false;
    const draw = () => {
      const s = l.slides[i];
      if (i === 2 && !checked) { checked = true; return checkpoint(l, () => draw()); }
      $("bc-main").innerHTML = `<div class="kit-card"><div class="bc-board"><div class="bc-vis">${visHtml(s.vis)}</div><div class="txt">${K.esc(s.text)}</div></div><div class="bc-dots">${l.slides.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
        <div style="display:flex;gap:8px">${i ? '<button class="kit-btn alt" id="bc-prev" style="flex:1">← Back</button>' : ""}<button class="kit-btn" id="bc-next" style="flex:2">${i === l.slides.length - 1 ? "Try the questions ✏️" : "Next →"}</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="kit-btn alt" id="bc-replay" style="padding:6px 12px;font-size:.75rem">🔁 Replay</button><button class="kit-btn alt" id="bc-say" style="padding:6px 12px;font-size:.75rem">🔊 Bo, read it</button><button class="kit-btn alt" id="bc-skip" style="padding:6px 12px;font-size:.75rem">I know this — quiz me</button></div>
        ${s.vis.filter(v => v !== "|").length >= 5 && s.vis.every(v => !/^\d+$/.test(v)) ? `<div class="bc-count"><span id="bc-cnt">Tap the pictures to count them: 0</span></div>` : ""}</div>`;
      $("bc-say").onclick = () => say(s.text); $("bc-skip").onclick = () => quiz(l);
      let cnt = 0; $("bc-main").querySelectorAll(".bc-vis span:not(.sep)").forEach(sp => sp.onclick = () => { if (sp.dataset.c || !$("bc-cnt")) return; sp.dataset.c = 1; sp.style.opacity = ".4"; cnt++; $("bc-cnt").textContent = `Tap the pictures to count them: ${cnt}`; if (cnt === s.vis.filter(v => v !== "|").length) $("bc-cnt").textContent = `✅ ${cnt}! Great counting!`; });
      $("bc-next").onclick = () => { if (i >= l.slides.length - 1) quiz(l); else { i++; draw(); } };
      const p = $("bc-prev"); if (p) p.onclick = () => { i--; draw(); };
      $("bc-replay").onclick = draw;
    };
    draw();
  }
  // Audit round 2: a 60-second recap mixing questions from every lesson you've finished.
  function recap() {
    const pool = LESSONS.filter(l => done[l.id]).flatMap(l => l.quiz.map(q => [l, q]));
    let right = 0, n = 0; const end = Date.now() + 60000;
    const tick = setInterval(() => { const b = $("bc-rt"); if (b) b.style.width = Math.max(0, (end - Date.now()) / 600) + "%"; if (Date.now() >= end) { clearInterval(tick); fin(); } }, 200);
    const fin = () => { clearInterval(tick); const best = Number(lsc("bc_recap_best", "0")); if (right > best) lscw("bc_recap_best", String(right)); $("bc-main").innerHTML = `<div class="kit-card" style="text-align:center"><div class="kit-big">⚡</div><div class="kit-q">${right} right in 1 minute!</div><p class="kit-sub">${right > best ? "🌟 New best!" : `Best: ${best}`}</p><button class="kit-btn block" id="bc-rback">Back to lessons</button></div>`; $("bc-rback").onclick = menu; };
    const ask = () => {
      if (Date.now() >= end) return;
      const [l, [q, opts, a]] = pool[Math.floor(Math.random() * pool.length)];
      const sh = K.shuffle(opts.map((t, k) => ({ t, ok: k === a })));
      $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-bar" style="margin-bottom:8px"><i id="bc-rt" style="width:100%"></i></div><div class="kit-sub" style="margin:0 0 4px;font-weight:800">⚡ ${right} right · ${l.emoji} ${K.esc(l.title)}</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${sh.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o.t)}</button>`).join("")}</div></div>`;
      $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = sh[+b.dataset.k].ok; K.record("bo-class", l.id, ok); $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (sh[k].ok) x.classList.add("right"); }); if (ok) right++; else b.classList.add("wrong"); n++; setTimeout(ask, ok ? 350 : 1100); });
    };
    ask();
  }
  function checkpoint(l, next) {
    const [q, opts, a] = l.quiz[0];
    $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 4px;font-weight:800">⏸️ Quick check before the last slide!</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${opts.map((t, k) => `<button class="kit-opt" data-k="${k}" type="button">${K.esc(t)}</button>`).join("")}</div><div class="kit-sub" id="bc-cm" style="text-align:center"></div></div>`;
    $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => { const ok = +b.dataset.k === a; $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (k === a) x.classList.add("right"); }); if (!ok) b.classList.add("wrong"); $("bc-cm").textContent = ok ? "You're getting it! 🎉" : "That's okay — the next slide explains it."; setTimeout(next, ok ? 900 : 1800); });
  }
  function quiz(l) {
    let i = 0, right = 0;
    const ask = () => {
      if (i >= l.quiz.length) return finish(l, right);
      const [q, opts, a] = l.quiz[i], shuffled = K.shuffle(opts.map((t, k) => ({ t, ok: k === a })));
      $("bc-main").innerHTML = `<div class="kit-card"><div class="kit-sub" style="margin:0 0 4px;font-weight:800">${l.emoji} ${K.esc(l.title)} — question ${i + 1}/3</div><div class="kit-q">${K.esc(q)}</div><div class="kit-opts" style="grid-template-columns:1fr">${shuffled.map((o, k) => `<button class="kit-opt" data-k="${k}">${K.esc(o.t)}</button>`).join("")}</div><div class="kit-sub" id="bc-msg" style="text-align:center;margin:8px 0 0;min-height:1.2em"></div></div>`;
      $("bc-main").querySelectorAll(".kit-opt").forEach(b => b.onclick = () => {
        const ok = shuffled[+b.dataset.k].ok;
        K.record("bo-class", l.id, ok);
        $("bc-main").querySelectorAll(".kit-opt").forEach((x, k) => { x.disabled = true; if (shuffled[k].ok) x.classList.add("right"); });
        if (ok) right++; else b.classList.add("wrong");
        $("bc-msg").textContent = ok ? "🎓 Yes! Exactly." : `Not quite. Remember: ${l.slides[l.slides.length - 1].text}`;
        setTimeout(() => { i++; ask(); }, ok ? 900 : 3200);
      });
    };
    ask();
  }
  async function finish(l, right) {
    const r = await Promise.race([AIGLeaderboard.finishLesson(l.id, right), new Promise(x => setTimeout(() => x({ ok: false, first: false, coins: 0 }), 4000))]);
    done[l.id] = { score: right };
    if (lsc("bc_day", "") !== cday()) { lscw("bc_streak", String(lsc("bc_day", "") === cday(1) ? Number(lsc("bc_streak", "0")) + 1 : 1)); lscw("bc_day", cday()); }
    if (LESSONS.every(x => done[x.id])) K.toastAdv("You graduated from Bo's Classroom!");
    const g = GAME_FOR[l.id];
    $("bc-main").innerHTML = "";
    $("bc-overlay").innerHTML = `<div class="kit-overlay"><div class="kit-modal"><div class="kit-big">${right === 3 ? "🌟" : "🎓"}</div><h2>Lesson complete!</h2><p class="kit-sub">${right}/3 questions right. ${r.first ? `First time finishing: +🪙${r.coins}` : ""}</p><div class="bc-sum">📝 <b>You learned:</b> ${K.esc(l.slides[l.slides.length - 1].text)}</div>${g ? `<a class="kit-btn block" href="${g[0]}">🎮 Practise it in ${g[1]}</a>` : ""}<div class="kit-bonus" id="bc-bonus"></div>
      <button class="kit-btn block" id="bc-back">More lessons</button></div></div>`;
    $("bc-back").onclick = () => { $("bc-overlay").innerHTML = ""; menu(); };
    if (r.first && window.AIGSkin) AIGSkin.burst(innerWidth / 2, innerHeight / 3);
  }
  menu();
}
