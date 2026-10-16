/* =================================================================
   AIGSpellingExtra -- example sentences, memory tricks and word-origin facts for azkacraft/spelling.js.
   EX: one sentence per word (all 279). TIP: a memory trick for tricky words. FACT: a short origin fact.
   Written for a Grade 4 reader. Loaded together with spelling.js (azkacraft + the 10 mini-games).
   ================================================================= */
(function (root) {
  "use strict";
  const parse = s => { const m = {}; s.trim().split("\n").forEach(l => { const i = l.indexOf("|"); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); return m; };

  const EX = parse(`
ocean|We watched the big waves roll across the ocean.
enough|Do we have enough chairs for everyone?
beautiful|The garden looks beautiful in the morning sun.
because|I took an umbrella because it was raining.
island|Bali is a famous island in Indonesia.
friend|My best friend sits next to me in class.
tomorrow|We are going to the zoo tomorrow.
yesterday|Yesterday I finished my homework early.
February|My cousin's birthday is in February.
Wednesday|We have swimming lessons every Wednesday.
Thursday|On Thursday our class reads in the library.
Saturday|On Saturday we play football in the park.
library|I borrowed a dinosaur book from the library.
different|My twin brother and I like different games.
favourite|Pizza is my favourite food.
neighbour|Our neighbour has a very friendly cat.
people|Many people came to watch the match.
through|The train went through a long tunnel.
thought|I thought it was Friday, but it was Thursday.
caught|The goalkeeper caught the ball with both hands.
laugh|The joke made the whole class laugh.
daughter|The teacher's daughter drew a lovely picture.
answer|Raise your hand if you know the answer.
believe|I believe you can do it.
beginning|The beginning of the story is very exciting.
business|My uncle runs a small bakery business.
calendar|I crossed off each day on the calendar.
certain|I am certain that I locked the door.
choose|You can choose one sticker from the box.
clothes|Please put your clothes in the basket.
cousin|My cousin lives in Bandung.
dangerous|It is dangerous to cross the road without looking.
describe|Can you describe your favourite toy?
disappear|The rabbit seemed to disappear into the hat.
discover|Scientists discover new animals every year.
earth|The earth goes around the sun.
eight|My little sister is eight years old.
exercise|We do exercise every morning at school.
famous|That singer is famous all over Indonesia.
forty|There are forty chairs in the hall.
fourth|I came fourth in the running race.
guess|Can you guess what is in the box?
guard|The guard stood at the gate all night.
half|I ate half of the sandwich and saved the rest.
heart|Your heart beats faster when you run.
height|We measured the height of the tree.
imagine|Imagine you are flying over the mountains.
interesting|The museum had an interesting exhibit about robots.
knife|Be careful with a sharp knife.
knock|Please knock before you come in.
knowledge|Reading books gives you a lot of knowledge.
listen|Listen carefully to the instructions.
minute|The bus will arrive in one minute.
mountain|We climbed a tall mountain on our holiday.
museum|We saw an old canoe at the museum.
natural|Honey is a natural food made by bees.
necessary|It is necessary to wear a helmet on a bike.
ordinary|It was an ordinary day until the circus came.
paragraph|Write one paragraph about your holiday.
pencil|My pencil needs sharpening.
perhaps|Perhaps we can go to the beach on Sunday.
picture|She drew a picture of her family.
popular|Football is a popular sport in my school.
potato|Dad cooked a baked potato for dinner.
promise|I promise to tidy my room.
purpose|What is the purpose of this tool?
quarter|I ate a quarter of the pizza.
question|May I ask you a question?
recent|Have you read any recent news about space?
remember|Please remember to bring your book tomorrow.
restaurant|We had dinner at a nice restaurant.
rhythm|The drum kept a steady rhythm.
scissors|Use the scissors to cut the paper.
separate|Please put the red and blue cards in separate piles.
special|My birthday is a special day.
straight|Draw a straight line with the ruler.
strength|The weightlifter showed great strength.
surprise|The party was a big surprise.
sentence|Begin each sentence with a capital letter.
though|Though it was raining, we still played outside.
thousand|A thousand people came to the festival.
trouble|I had trouble opening the jar.
unusual|A purple cow would be very unusual.
vegetable|Carrot is my favourite vegetable.
weather|The weather is hot and sunny today.
weight|The weight of the bag was five kilograms.
whale|A blue whale is the biggest animal on Earth.
whistle|The referee blew his whistle.
wrote|She wrote a letter to her grandmother.
yacht|A white yacht sailed across the bay.
address|Write your name and address at the top.
although|Although it was late, we kept playing.
beach|We built a sandcastle on the beach.
breakfast|I eat rice and eggs for breakfast.
breathe|Breathe in slowly through your nose.
bridge|The bridge crosses the wide river.
brought|She brought her lunch to school.
building|The tallest building in the city has fifty floors.
bury|Dogs like to bury bones in the garden.
busy|The market is very busy on Sundays.
castle|The knight lived in a huge stone castle.
century|A century is one hundred years.
chocolate|I would like a piece of chocolate, please.
circle|The children sat in a circle on the floor.
climb|Monkeys climb trees very fast.
collect|I collect shiny stickers.
column|The temple had a tall stone column.
complete|Please complete all the questions on the page.
continue|Continue reading from page ten.
country|Indonesia is a country with thousands of islands.
courage|It takes courage to speak in front of the class.
cupboard|The plates are in the kitchen cupboard.
decide|I cannot decide which book to read first.
delicious|Mum's fried rice is delicious.
diamond|The ring had a sparkling diamond.
difficult|The last maths question was difficult.
disease|Washing hands helps stop the spread of disease.
doubt|I have no doubt that you will win.
eighth|He finished eighth in the swimming race.
engine|The engine of the bus made a loud noise.
enjoy|I enjoy riding my bike after school.
environment|We must look after our environment.
equal|Two halves are equal parts of a whole.
evening|We watch a film together in the evening.
exactly|It is exactly three o'clock.
excellent|Your drawing is excellent!
except|Everyone came except Dimas.
experience|Flying in a plane was a new experience for me.
extreme|The desert has extreme heat in the day.
fierce|The fierce tiger roared loudly.
fought|The two knights fought bravely.
fruit|Mango is a sweet tropical fruit.
garden|We grow tomatoes in our garden.
general|The general idea of the story is friendship.
gentle|Be gentle with the baby kitten.
giant|The giant stepped over the house.
glove|He lost one glove in the snow.
government|The government built a new road.
grammar|Good grammar makes your writing clear.
group|Our group finished the project first.
guide|The guide showed us around the museum.
happen|What will happen at the end of the story?
history|In history class we learned about old kingdoms.
honest|An honest person always tells the truth.
hospital|The nurse works at the hospital.
hour|The film lasts one hour.
huge|A huge wave hit the shore.
increase|The price will increase next month.
instead|I had tea instead of juice.
journey|The journey to my grandma's house takes two hours.
juice|I drink orange juice every morning.
kitchen|Mum is cooking in the kitchen.
language|Indonesian is the language we speak at school.
lightning|A flash of lightning lit up the sky.
lovely|What a lovely surprise!
machine|The washing machine is very loud.
material|Cotton is a soft material for clothes.
measure|Use a ruler to measure the line.
medicine|He took some medicine for his cough.
mention|Please do not mention the surprise to her.
mystery|The missing key is a mystery.
neither|Neither of the twins likes spinach.
notice|Did you notice the new poster?
number|Pick a number between one and ten.
occasion|A wedding is a special occasion.
often|We often play badminton after school.
opposite|Hot is the opposite of cold.
orange|An orange has a thick, bright skin.
person|Each person gets one ticket.
physical|Running and jumping are physical activities.
piece|Can I have a piece of cake?
planet|Mars is a red planet.
plural|The plural of cat is cats.
pollution|Pollution makes the river dirty.
possible|Is it possible to finish this by Friday?
practice|Piano practice makes you better.
prefer|I prefer tea to coffee.
present|She gave me a birthday present.
pretty|The pretty bird sang in the tree.
probably|It will probably rain this afternoon.
problem|We worked together to solve the problem.
protect|A helmet will protect your head.
queen|The queen waved to the crowd.
quiet|Please be quiet in the library.
quite|The soup is quite hot.
reason|Tell me the reason you were late.
receive|Did you receive my letter?
reign|The queen's reign lasted fifty years.
rough|The bark of the tree feels rough.
route|We took the shortest route to school.
safety|Wear a seat belt for your safety.
sauce|I like sweet sauce on my noodles.
science|In science class we grew a bean plant.
season|Rainy season starts in November.
secret|Can you keep a secret?
serious|The teacher looked very serious.
several|Several children raised their hands.
shoulder|The bird sat on his shoulder.
signal|The green light is a signal to go.
silent|The library was completely silent.
similar|The two twins look very similar.
sincerely|She sincerely thanked everyone for their help.
society|A kind society looks after everyone.
soldier|The soldier stood guard at the gate.
square|A square has four equal sides.
stomach|My stomach rumbled before lunch.
strange|We heard a strange noise last night.
strategy|Our strategy is to pass the ball quickly.
success|Hard work leads to success.
suddenly|Suddenly the lights went out.
sugar|Do not put too much sugar in the tea.
suppose|I suppose we could go to the park.
swimming|Swimming is good exercise.
terrible|The storm last night was terrible.
tongue|The doctor asked me to stick out my tongue.
tough|The steak was tough to chew.
toward|The dog ran toward the gate.
tradition|Eating special food at Eid is a family tradition.
treasure|The pirates buried the treasure on an island.
tropical|Indonesia has a tropical climate.
truly|I truly love my family.
umbrella|Take your umbrella when it rains.
useful|A map is useful when you are lost.
usually|I usually wake up at six o'clock.
village|My grandparents live in a quiet village.
visit|We visit our cousins every holiday.
voyage|The voyage across the sea took three days.
warning|The sign gave a warning about the wet floor.
wealthy|The wealthy king lived in a golden palace.
wonderful|We had a wonderful day at the beach.
worried|Mum was worried when I came home late.
wreck|The old ship was a wreck at the bottom of the sea.
writing|Her writing is neat and clear.
young|The young puppy loves to play.
transparent|Clear glass is transparent.
translucent|Frosted glass is translucent, so we cannot see clearly through it.
opaque|A wooden door is opaque.
shadow|My shadow is longer in the evening.
eclipse|During a solar eclipse the Moon covers the Sun.
crescent|A crescent moon looks like a thin smile.
orbit|The Moon makes one orbit around the Earth each month.
energy|A battery stores energy.
electrical|A fan is an electrical machine.
chemical|Baking soda and vinegar cause a chemical reaction.
pupil|Your pupil gets smaller in bright light.
retina|The retina is at the back of the eye.
province|Jakarta is a special province in Indonesia.
culture|Every region has its own culture and dances.
ethnic|Indonesia has many ethnic groups.
festival|The village festival has music and food.
independence|Indonesia celebrates independence on 17 August.
colonial|The old colonial building is in Kota Tua.
monument|Monas is a famous monument in Jakarta.
stadium|The stadium was full of cheering fans.
landmark|Monas is a famous landmark in Jakarta.
continent|Asia is the biggest continent.
desert|Camels can live in the desert.
synonym|Big is a synonym of large.
antonym|Hot is an antonym of cold.
homophone|Their and there are homophones.
adjective|The word red is an adjective.
stanza|The poem has three stanzas.
simile|A simile compares two things, like "as bright as the sun".
rhyme|Cat and hat rhyme.
dialogue|The play has a lot of dialogue.
speaker|The speaker told a funny story.
greeting|Dear Aunty Susie is a friendly greeting.
signature|Please write your signature at the bottom.
perimeter|The perimeter of the square is twenty centimetres.
triangle|A triangle has three sides.
rectangle|The door is shaped like a rectangle.
rhombus|A rhombus has four equal sides.
angle|An angle of ninety degrees is a right angle.
protractor|Use a protractor to measure the angle.
multiply|Multiply six by seven to get forty-two.
divide|Divide twelve by three to get four.
subtract|Subtract five from ten to get five.
graph|The graph shows how many books we read.
fraction|A half is a fraction of a whole.
`);

  const TIP = parse(`
because|Big Elephants Can Always Understand Small Elephants.
friend|A friend is there until the END: fri-END.
necessary|One Collar and two Sleeves: one C, two S's.
separate|There is "a rat" in sep-A-RAT-e.
believe|Never believe a LIE: be-LIE-ve.
rhythm|Rhythm Helps Your Two Hips Move.
island|An island is LAND with water around it: is-LAND.
neighbour|Never Eat Insects, Go Have Breakfast Or Ugly Rice: N-E-I-G-H-B-O-U-R.
favourite|There is OUR in favOURite.
cousin|A cousin is IN the family: cous-IN.
business|It is "busy" + "ness": busi-ness.
disappear|One S, two P's: dis-a-PP-ear.
heart|Your HEART has an EAR in it: h-EAR-t.
height|HEIGHT has EIGHT inside it: h-EIGHT.
weight|WEIGHT has EIGHT inside it: w-EIGHT.
listen|LISTEN and SILENT use the same letters!
weather|WEATHER has EAT in the middle: w-EAT-her.
museum|You SEE things in a museum: mu-SE-um.
breakfast|You BREAK your FAST in the morning: break-fast.
climb|The B is silent, like in thumb and comb.
doubt|The B is silent, like in thumb and comb.
environment|There is IRON in envIRONment.
government|It is "govern" + "ment".
hour|HOUR sounds like OUR, and the H is silent.
honest|The H is silent: on-est.
lightning|Lightning is quick, so there is no time for an E.
piece|Have a PIECE of PIE: p-IE-ce.
receive|I before E, except after C: re-CEI-ve.
enough|Enough, rough and tough all end in -ough, which says "uff".
rough|Enough, rough and tough all end in -ough, which says "uff".
tough|Enough, rough and tough all end in -ough, which says "uff".
shoulder|You SHOULD lift your shoulder: sh-OULD-er.
stomach|You can get a stomach ACHE: stom-ACH.
strength|There is LENGTH-like "ength" in strength: str-ENGTH.
success|Two C's and two S's: suCCeSS.
address|Two D's and two S's: aDDreSS.
usually|There is an ALLY in usuALLY.
writing|Drop the E from write, then add -ing: writing.
young|YOU are young: YOU-ng.
transparent|A PARENT can see right through you: trans-PARENT.
desert|Dessert has two S's because you want Seconds!
rectangle|There is an ANGLE inside rectANGLE.
triangle|There is an ANGLE inside triANGLE.
perimeter|It is "peri" + "METER": you measure it.
calendar|It ends with -AR: calend-AR.
scissors|There are TWO S's in the middle: sci-SS-ors.
whistle|The T is silent: whis-le.
although|It is "al" + "though": only one L.
breathe|The verb has an E on the end: breath + e.
independence|It ends with -ENCE and has "depend" inside.
continent|It ends with -ENT: contin-ENT.
`);

  const FACT = parse(`
ocean|The word comes from "Okeanos", the Greek name for the huge river people once thought circled the world.
planet|From a Greek word meaning "wanderer", because planets seem to wander among the stars.
calendar|From a Latin word for the first day of the Roman month.
chocolate|The word comes from the Aztec word "xocolatl".
museum|From a Greek word for a place of the Muses, the goddesses of art and music.
hospital|From the Latin word for "guest", the same root as hotel.
century|From the Latin word "centum", which means one hundred.
yacht|From the Dutch word "jacht", which means a chase.
umbrella|From the Latin word "umbra", which means shadow.
pupil|From a Latin word meaning "little doll", because you can see a tiny picture of yourself in someone's pupil.
stadium|From a Greek word for a running track about 190 metres long.
Wednesday|Named after Woden, an old Norse god.
Thursday|Named after Thor, the Norse god of thunder.
Saturday|Named after Saturn, a Roman god.
February|From a Latin word for a purifying festival.
potato|From "batata", a word used by the Taino people of the Caribbean.
orange|The fruit was named first, and later the colour was named after it.
science|From the Latin word "scientia", which means knowledge.
castle|From a Latin word for a small fort.
diamond|From a Greek word meaning "unbreakable".
energy|From a Greek word for activity or work.
monument|From a Latin word meaning "to remind".
eclipse|From a Greek word meaning "to fail to appear".
crescent|From a Latin word for "growing".
retina|From a Latin word for "net".
orbit|From a Latin word for the track of a wheel.
sugar|The word travelled from Sanskrit through Arabic before it reached English.
minute|From a Latin phrase meaning "small part" of an hour.
`);

  root.AIGSpellingExtra = { EX, TIP, FACT };
  if (typeof module !== "undefined" && module.exports) module.exports = root.AIGSpellingExtra;
})(typeof window !== "undefined" ? window : globalThis);
