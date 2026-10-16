/* =================================================================
   AIGSpelling -- Azka's spelling practice (2026-10-14).
   ~270 tricky Grade-4 words (spelling NOT matching sound: ocean, enough, island ...) plus this term's vocabulary.
   Used by: azkacraft chapter 10 "Spell It Right" (typed + multiple choice) and, via question-pools.js,
   by every mini-game while "Fokus Azka" is ON (multiple choice only).
   Words Azka gets wrong come back sooner (localStorage key azka_spell -> mirrored to the cloud save).
   ================================================================= */
(function (root) {
  "use strict";
  const RAW = `
ocean|a very large body of salt water
enough|as much as you need
beautiful|very pretty to look at
because|for the reason that
island|land with water all around it
friend|a person you like and enjoy being with
tomorrow|the day after today
yesterday|the day before today
February|the second month of the year
Wednesday|the day after Tuesday
Thursday|the day after Wednesday
Saturday|the day before Sunday
library|a place where you borrow books
different|not the same
favourite|the one you like best
neighbour|a person who lives next door
people|more than one person
through|from one side to the other side
thought|past tense of think
caught|past tense of catch
laugh|the sound you make when something is funny
daughter|a girl who is someone's child
answer|what you say when someone asks a question
believe|to think that something is true
beginning|the start of something
business|work that people do to earn money
calendar|a chart that shows days and months
certain|completely sure
choose|to pick something
clothes|things you wear
cousin|the child of your aunt or uncle
dangerous|likely to cause harm
describe|to say what something is like
disappear|to go out of sight
discover|to find something for the first time
earth|the planet we live on
eight|the number after seven
exercise|activity that keeps your body fit
famous|known by many people
forty|the number 40
fourth|number four in order
guess|to give an answer without being sure
guard|a person who protects a place
half|one of two equal parts
heart|the body part that pumps blood
height|how tall something is
imagine|to make a picture in your mind
interesting|holding your attention
knife|a tool with a sharp blade for cutting
knock|to tap on a door
knowledge|the things that you know
listen|to pay attention to a sound
minute|sixty seconds
mountain|a very high hill
museum|a place that shows old or important things
natural|made by nature, not by people
necessary|needed
ordinary|normal and not special
paragraph|a group of sentences about one idea
pencil|a thin tool for writing with a lead
perhaps|maybe
picture|a drawing or a photograph
popular|liked by many people
potato|a round vegetable that grows underground
promise|to say you will definitely do something
purpose|the reason for doing something
quarter|one of four equal parts
question|something you ask
recent|happened a short time ago
remember|to keep something in your mind
restaurant|a place where you pay to eat a meal
rhythm|a regular beat in music
scissors|a tool with two blades for cutting paper
separate|apart from each other
special|different from usual in a good way
straight|not bent or curved
strength|how strong you are
surprise|something you did not expect
sentence|words that make a complete idea
though|even if
thousand|ten hundreds
trouble|a problem or difficulty
unusual|not common
vegetable|a plant you eat, like a carrot
weather|rain, sun, wind and clouds
weight|how heavy something is
whale|a huge animal that lives in the sea
whistle|to make a high sound with your lips
wrote|past tense of write
yacht|a boat with sails
address|the place where someone lives
although|in spite of the fact that
beach|sand beside the sea
breakfast|the first meal of the day
breathe|to take air in and out
bridge|something built to cross a river
brought|past tense of bring
building|a house, school or shop
bury|to put something under the ground
busy|having a lot to do
castle|a big old building with thick walls
century|one hundred years
chocolate|a sweet brown treat
circle|a perfectly round shape
climb|to go up using your hands and feet
collect|to gather things together
column|a tall round pillar
complete|finished; with nothing missing
continue|to keep going
country|a nation, like Indonesia
courage|being brave when something is scary
cupboard|a cabinet for keeping things
decide|to make up your mind
delicious|tasting very good
diamond|a hard, sparkling jewel
difficult|not easy
disease|an illness
doubt|not being sure
eighth|number eight in order
engine|a machine that makes things move
enjoy|to like doing something
environment|the world around us
equal|the same in size or amount
evening|the time between afternoon and night
exactly|completely correct
excellent|extremely good
except|but not including
experience|something that happens to you
extreme|very great or very strong
fierce|wild and angry
fought|past tense of fight
fruit|apples, mangoes and bananas
garden|a place where plants grow
general|usual and widespread
gentle|soft and kind
giant|a very big person in stories
glove|a covering for your hand
government|the people who run a country
grammar|the rules of a language
group|a number of people or things together
guide|someone who shows the way
happen|to take place
history|what happened in the past
honest|always telling the truth
hospital|a place where sick people are treated
hour|sixty minutes
huge|extremely big
increase|to get bigger
instead|in place of something else
journey|a long trip
juice|a drink made from fruit
kitchen|the room where food is cooked
language|words people use to talk
lightning|a bright flash in the sky in a storm
lovely|very nice or beautiful
machine|a thing with parts that does work
material|what something is made of
measure|to find the size of something
medicine|something you take to feel better
mention|to say something briefly
mystery|something strange that is not explained
neither|not one and not the other
notice|to see something
number|a word or symbol for how many
occasion|a special event
often|many times
opposite|completely different or facing
orange|a round juicy fruit
person|a human being
physical|to do with the body
piece|a part of something
planet|a big round object that goes around a star
plural|more than one
pollution|dirt in the air, water or land
possible|able to happen
practice|doing something again to get better
prefer|to like one thing more than another
present|a gift
pretty|nice to look at
probably|most likely
problem|something that is hard to solve
protect|to keep safe
queen|a woman who rules a country
quiet|making very little noise
quite|fairly or very
reason|why something happens
receive|to get something that is given
reign|the time a king or queen rules
rough|not smooth
route|the way you go from one place to another
safety|being free from danger
sauce|a liquid served with food
science|learning about the world by testing ideas
season|spring, summer, autumn or winter
secret|something you keep hidden
serious|not joking
several|more than two but not many
shoulder|the part of the body where your arm joins
signal|a sign that tells you something
silent|making no sound
similar|almost the same
sincerely|in an honest way
society|a large group of people living together
soldier|a person in an army
square|a shape with four equal sides
stomach|the part of the body where food goes
strange|odd or unusual
strategy|a plan to win or succeed
success|achieving what you wanted
suddenly|quickly and without warning
sugar|a sweet white or brown powder
suppose|to think that something is probably true
swimming|moving through water using your arms and legs
terrible|very bad
tongue|the part in your mouth used for tasting
tough|strong and hard to break
toward|in the direction of
tradition|a custom passed down over many years
treasure|a collection of gold and jewels
tropical|very hot and wet, like near the equator
truly|really
umbrella|something that keeps the rain off you
useful|helpful
usually|most of the time
village|a very small town
visit|to go and see a person or place
voyage|a long trip by sea
warning|a sign that danger is near
wealthy|having a lot of money
Wednesday's|belonging to Wednesday
wonderful|really good
worried|feeling that something bad may happen
wreck|to destroy something
writing|making words with a pen
young|not old
transparent|clear, so you can see through it
translucent|lets some light through but is not clear
opaque|lets no light through
shadow|a dark shape made when light is blocked
eclipse|when the Moon or Earth hides the Sun's light
crescent|a thin curved moon shape
orbit|to travel in a circle around something
energy|the power to make things happen
electrical|to do with electricity
chemical|to do with substances and how they change
pupil|the dark round hole in the middle of your eye
retina|the back of the eye that senses light
province|a large region of a country
culture|the way of life of a group of people
ethnic|belonging to a group with the same traditions
festival|a happy celebration
independence|being free from rule by another country
colonial|to do with a country ruled by another
monument|a statue or building to remember something
stadium|a place with seats for watching sports
landmark|a well-known place that is easy to remember
continent|one of the seven huge areas of land
desert|a very dry place with little rain
synonym|a word with nearly the same meaning
antonym|a word with the opposite meaning
homophone|a word that sounds like another but is spelled differently
adjective|a word that describes a noun
stanza|a group of lines in a poem
simile|a comparison using like or as
rhyme|words that end with the same sound
dialogue|a conversation between people
speaker|the person who is talking
greeting|the words you say or write to say hello
signature|your name written by yourself
perimeter|the distance around a shape
triangle|a shape with three sides
rectangle|a shape with four sides and four right angles
rhombus|a shape with four equal sides that leans over
angle|the space between two lines that meet
protractor|a tool for measuring angles
multiply|to make a number bigger by times
divide|to share into equal groups
subtract|to take one number away from another
graph|a picture that shows numbers
fraction|a part of a whole number
`;
  const MANUAL = {
    ocean: ["osean", "oshun", "ocian"], enough: ["enuff", "enogh", "enouf"], beautiful: ["beutiful", "beatiful", "bootiful"], because: ["becuase", "becouse", "becos"],
    island: ["iland", "islend", "ieland"], friend: ["freind", "frend", "friand"], tomorrow: ["tommorow", "tomorow", "tomoro"], yesterday: ["yesturday", "yestaday", "yesterdae"],
    February: ["Febuary", "Febrary", "Febuwary"], Wednesday: ["Wensday", "Wendsday", "Wednsday"], library: ["libary", "liberry", "lybrary"], different: ["diffrent", "diferent", "difrent"],
    favourite: ["favrite", "favourit", "faverite"], neighbour: ["nabour", "neighbor", "naybour"], people: ["peeple", "peaple", "poeple"], through: ["thru", "throgh", "throu"],
    thought: ["thougt", "thoght", "thawt"], caught: ["cought", "caugt", "cawt"], laugh: ["laff", "lagh", "larf"], daughter: ["dawter", "daugter", "dorter"],
    answer: ["anser", "ansur", "answir"], believe: ["beleive", "belive", "beleave"], business: ["bisness", "busness", "buisness"], calendar: ["calender", "calandar", "calendur"],
    certain: ["certin", "sertain", "certan"], clothes: ["cloths", "clothz", "closes"], cousin: ["cuzin", "cousen", "cusin"], dangerous: ["dangerus", "dangrous", "dangerouse"],
    heart: ["hart", "heert", "haert"], height: ["hight", "heigth", "hieght"], knife: ["nife", "knif", "knyfe"], knock: ["nock", "knok", "knoc"], knowledge: ["nolege", "knowlege", "nollidge"],
    listen: ["lissen", "listin", "lisen"], minute: ["minit", "minut", "minuet"], mountain: ["mountin", "mowntain", "mountian"], museum: ["musuem", "mewseum", "musium"],
    necessary: ["neccessary", "necesary", "nessessary"], pencil: ["pensil", "pencel", "pencle"], perhaps: ["perhapse", "prehaps", "perhaps "], promise: ["promis", "promiss", "promice"],
    quarter: ["quater", "quartar", "kwarter"], question: ["questin", "quesion", "kwestion"], remember: ["rember", "remeber", "remmember"], restaurant: ["restarant", "resturant", "restaurent"],
    rhythm: ["rythm", "rhythem", "rithm"], scissors: ["sissors", "scisors", "scizzors"], separate: ["seperate", "separete", "sepparate"], special: ["speshal", "specal", "speccial"],
    straight: ["strait", "straite", "stright"], strength: ["strenth", "strengh", "strenght"], surprise: ["suprise", "surprize", "serprise"], sentence: ["sentance", "sentense", "sentanse"],
    though: ["tho", "thogh", "thouhg"], thousand: ["thosand", "thousend", "thowsand"], trouble: ["trubble", "troble", "truble"], vegetable: ["vegtable", "vegetible", "vejetable"],
    weather: ["wether", "wheather", "weathre"], weight: ["wieght", "wate", "weigt"], whale: ["wale", "whael", "whail"], whistle: ["wistle", "whissle", "whistel"], wrote: ["rote", "wroat", "wrot"],
    yacht: ["yot", "yaht", "yatch"], address: ["adress", "addres", "adresss"], although: ["allthough", "althogh", "altho"], breakfast: ["brekfast", "breakfest", "brakfast"],
    breathe: ["breath", "breeth", "brethe"], bridge: ["brige", "bridg", "briddge"], brought: ["brout", "brougt", "brawt"], building: ["bilding", "buiding", "buildding"],
    castle: ["cassle", "castel", "casle"], century: ["sentury", "centery", "cencury"], chocolate: ["choclate", "chocolat", "chocolet"], climb: ["clime", "clim", "climbe"],
    courage: ["currage", "couradge", "corage"], cupboard: ["cubboard", "cupbord", "cuboard"], delicious: ["delishous", "delicous", "delisious"], diamond: ["diamund", "dimond", "diamand"],
    doubt: ["dout", "doubbt", "dowt"], engine: ["enjin", "engin", "enjine"], environment: ["enviroment", "envirnment", "enviornment"], except: ["excpet", "exept", "excep"],
    experience: ["experiance", "expirience", "experiense"], fierce: ["feirce", "fierse", "feirse"], fought: ["fout", "fougt", "fawt"], fruit: ["frute", "fruite", "froot"],
    gentle: ["gental", "gentel", "jentle"], government: ["goverment", "governmant", "guvernment"], grammar: ["grammer", "gramar", "gramur"], guide: ["gide", "guyde", "gwide"],
    history: ["histry", "histery", "hystory"], honest: ["onest", "honist", "honnest"], hospital: ["hospitle", "hosptial", "hospitel"], hour: ["our", "howr", "hower"],
    journey: ["jurney", "journy", "jerney"], kitchen: ["kichen", "kitchin", "kitchun"], language: ["langauge", "languege", "langwage"], lightning: ["lightening", "litning", "lighning"],
    machine: ["machin", "masheen", "machene"], measure: ["mesure", "meashure", "measur"], medicine: ["medecine", "medisin", "medicin"], mystery: ["mistery", "mysterie", "misterey"],
    neither: ["niether", "neether", "nither"], notice: ["notis", "noticce", "nowtice"], occasion: ["ocasion", "occassion", "ocassion"], often: ["offen", "ofen", "oftan"],
    orange: ["orenge", "orrange", "orang"], person: ["persin", "perzon", "pearson"], physical: ["fysical", "physicle", "phisical"], piece: ["peice", "peace", "pece"],
    planet: ["planit", "plannet", "planat"], pollution: ["polution", "pollushun", "pollusion"], possible: ["posible", "possable", "possibel"], practice: ["practise", "practis", "praktice"],
    prefer: ["prefur", "preffer", "prefere"], present: ["presant", "prezent", "presen"], pretty: ["pritty", "prety", "prettey"], probably: ["probly", "probaly", "probabley"],
    problem: ["problum", "problam", "probblem"], protect: ["protec", "protekt", "protact"], queen: ["quean", "qeen", "kween"], quiet: ["quite", "quiat", "quyet"],
    reason: ["reeson", "reasen", "reasun"], receive: ["recieve", "receve", "resceive"], reign: ["rain", "rein", "raign"], rough: ["ruff", "rouf", "rogh"],
    route: ["rout", "roote", "roat"], safety: ["safty", "safetey", "saftey"], sauce: ["sorce", "sawce", "souce"], science: ["sience", "scince", "sciance"],
    season: ["seeson", "seasen", "sezon"], secret: ["secrit", "secert", "seacret"], serious: ["serius", "seerious", "serous"], several: ["severel", "sevral", "sevarel"],
    shoulder: ["sholder", "shoulda", "shoulde"], signal: ["signel", "singal", "sygnal"], silent: ["silant", "sylent", "silint"], similar: ["similer", "simmilar", "similiar"],
    sincerely: ["sincerly", "sinsearly", "sincerley"], society: ["sociaty", "socity", "sosiety"], soldier: ["souldier", "soljer", "soldeir"], square: ["squair", "squere", "skware"],
    stomach: ["stomak", "stommach", "stomech"], strange: ["strainge", "strang", "straenge"], strategy: ["stratagy", "stratigy", "strategi"], success: ["sucess", "succes", "suckcess"],
    suddenly: ["suddenley", "sudenly", "suddenlly"], sugar: ["shugar", "suger", "sugr"], suppose: ["supose", "suppuse", "supoze"], swimming: ["swiming", "swimmin", "swimmming"],
    terrible: ["terible", "terribel", "terrable"], tongue: ["tung", "tounge", "tonge"], tough: ["tuff", "toughh", "touf"], toward: ["towerd", "toward ", "towrd"],
    tradition: ["tradishun", "tradision", "traditon"], treasure: ["tresure", "treasur", "trezure"], tropical: ["tropicle", "tropicall", "tropikal"], truly: ["truely", "trully", "truley"],
    umbrella: ["umbrela", "umbrelle", "umbralla"], useful: ["usefull", "useful ", "yousful"], usually: ["usally", "usualy", "usuly"], village: ["villige", "villege", "vilage"],
    visit: ["vizit", "visitt", "visite"], voyage: ["voyege", "voiage", "voyedge"], warning: ["warnning", "worning", "warnin"], wealthy: ["welthy", "wealthey", "wealthee"],
    wonderful: ["wonderfull", "wunderful", "wonderfal"], worried: ["worryed", "worreid", "woried"], wreck: ["reck", "wrek", "wreke"], writing: ["writting", "ritting", "wrighting"],
    young: ["yung", "youg", "yonge"], transparent: ["transperent", "transparant", "tranparent"], translucent: ["translusent", "translucant", "transluscent"], opaque: ["opake", "opaqe", "opacue"],
    shadow: ["shaddow", "shadoe", "shadou"], eclipse: ["eclips", "eclispe", "ecklipse"], crescent: ["cressent", "crescant", "creschent"], orbit: ["orbbit", "orbitt", "orbet"],
    energy: ["enerjy", "energey", "enargy"], electrical: ["electrikal", "electricle", "electrcal"], chemical: ["chemicle", "kemical", "chemicall"], pupil: ["pupple", "pupel", "pupill"],
    retina: ["retena", "retinna", "reteena"], province: ["provence", "provins", "provinse"], culture: ["culcher", "cultur", "kulture"], ethnic: ["ethnick", "etnic", "ethnik"],
    festival: ["festeval", "festivle", "festivel"], independence: ["independance", "independense", "indepandence"], colonial: ["colonal", "colonail", "colonnial"], monument: ["monnument", "monumment", "monumant"],
    stadium: ["stadeum", "staduim", "stadim"], landmark: ["landmarck", "landmerk", "landmak"], continent: ["continant", "contenent", "continet"], desert: ["dessert", "desart", "deserrt"],
    synonym: ["synonim", "sinonym", "synonem"], antonym: ["antonim", "antinym", "antonom"], homophone: ["homofone", "homephone", "homophon"], adjective: ["adjecive", "adjectiv", "ajective"],
    stanza: ["stanzza", "stansa", "stanzar"], simile: ["similie", "simily", "similee"], rhyme: ["rime", "rhime", "ryhme"], dialogue: ["dialog", "dialouge", "diologue"],
    speaker: ["speeker", "spiker", "speakar"], greeting: ["greating", "greetting", "greting"], signature: ["signiture", "signatur", "signeture"], perimeter: ["perimiter", "perimeeter", "parimeter"],
    triangle: ["triangel", "trianggle", "triangal"], rectangle: ["rectangel", "rectanggle", "rectangal"], rhombus: ["rombus", "rhombas", "rhombuss"], angle: ["angel", "anggle", "angal"],
    protractor: ["protracter", "protractur", "protracktor"], multiply: ["multipy", "multiplie", "multyply"], divide: ["divid", "devide", "dividde"], subtract: ["subtrack", "subtrac", "subract"],
    graph: ["graf", "grahp", "grapf"], fraction: ["fracshun", "fractoin", "fracton"]
  };
  const WORDS = RAW.trim().split("\n").map(l => l.split("|")).filter(p => p.length === 2 && !/'s$/.test(p[0])).map(([w, d]) => ({ w: w.trim(), d: d.trim() }));
  const VALID = new Set(WORDS.map(x => x.w.toLowerCase()));

  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rand(0, i); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pickN = (arr, n) => shuffle(arr).slice(0, n);
  const plain = s => String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  /* ---- plausible wrong spellings: hand-picked first, rule-made as backup ---- */
  const RULES = [[/ea/, "ee"], [/ee/, "ea"], [/ie/, "ei"], [/ei/, "ie"], [/ough/, "uff"], [/tion/, "shun"], [/ph/, "f"], [/ck/, "k"], [/ght/, "t"], [/kn/, "n"], [/wr/, "r"],
    [/ai/, "ay"], [/ay/, "ai"], [/oa/, "ow"], [/igh/, "ite"], [/mb/, "m"], [/ful$/, "full"], [/ou/, "ow"], [/c(?=[ei])/, "s"], [/ss/, "s"], [/([bdgmnprt])\1/, "$1"]];
  function mutations(word) {
    const out = new Set(), lw = word.toLowerCase();
    RULES.forEach(([re, rep]) => { if (re.test(lw)) { const m = lw.replace(re, rep); if (m !== lw) out.add(m); } });
    for (let i = 1; i < lw.length - 1; i++) { const sw = lw.slice(0, i) + lw[i + 1] + lw[i] + lw.slice(i + 2); if (sw !== lw) out.add(sw); }
    for (let i = 1; i < lw.length; i++) { if (/[aeiou]/.test(lw[i]) || lw[i] === "e") out.add(lw.slice(0, i) + lw.slice(i + 1)); }
    for (let i = 1; i < lw.length; i++) { if (!/[aeiou]/.test(lw[i]) && lw[i] !== lw[i - 1]) out.add(lw.slice(0, i) + lw[i] + lw.slice(i)); }
    return [...out].filter(x => x.length >= 3 && x !== lw && !VALID.has(x));
  }
  function wrongSpellings(entry) {
    const lw = entry.w.toLowerCase(), cap = entry.w[0] !== lw[0];
    const manual = (MANUAL[entry.w] || []).map(x => x.trim()).filter(x => x && x.toLowerCase() !== lw && !VALID.has(x.toLowerCase()));
    const fix = x => (cap ? x[0].toUpperCase() + x.slice(1) : x);
    let list = manual.map(x => (cap ? fix(x) : x));
    if (list.length < 3) list = list.concat(shuffle(mutations(entry.w)).map(fix));
    return [...new Set(list)].slice(0, 6);
  }

  /* ---- weak-word memory + per-word progress (garden) ---- */
  const KEY = "azka_spell", KEY2 = "azka_spell2";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
  const save = m => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
  const load2 = () => { try { return JSON.parse(localStorage.getItem(KEY2) || "{}") || {}; } catch (e) { return {}; } };
  const save2 = m => { try { localStorage.setItem(KEY2, JSON.stringify(m)); } catch (e) {} };
  function record(word, ok) {
    // per-word progress for the Word Garden: ok = total right, st = right in a row, miss = total wrong
    const s2 = load2(), r2 = s2[word] || { ok: 0, st: 0, miss: 0, t: 0 };
    if (ok) { r2.ok++; r2.st++; } else { r2.miss++; r2.st = 0; }
    r2.t = Date.now(); s2[word] = r2; save2(s2);
    // spaced-repetition schedule for words that were missed (unchanged behaviour)
    const m = load(), r = m[word] || { m: 0, c: 0, d: 0 }, DAY = 86400000;
    if (ok) { r.c++; if (r.m > 0) r.d = Date.now() + (r.c >= 3 ? 7 : r.c >= 2 ? 3 : 1) * DAY; } else { r.m++; r.c = 0; r.d = Date.now() + DAY / 2; }
    if (ok && r.m === 0) return;
    if (ok && r.c >= 4) delete m[word]; else m[word] = r;
    save(m);
  }
  // Stage of a word: 0 = never practised, 1 = seen, 2 = learning (right at least once), 3 = mastered (3 right in a row)
  function stage(word) { const r = load2()[word]; if (!r) return 0; if (r.st >= 3) return 3; if (r.ok > 0) return 2; return 1; }
  const tierOf = w => (w.length <= 5 ? 1 : w.length <= 7 ? 2 : 3);
  function masteredCount() { const s2 = load2(); return Object.keys(s2).filter(w => s2[w].st >= 3).length; }
  // Word ladder: short words first; longer/harder words unlock as more words are mastered.
  function level() { const n = masteredCount(); return n >= 30 ? 3 : n >= 10 ? 2 : 1; }
  // Words the parent typed into the Parent Portal ("kata dari sekolah"); synced into localStorage by joy.js.
  function schoolEntries() {
    let list = [];
    try { list = (root.AIGJoy && AIGJoy.schoolWords && AIGJoy.schoolWords()) || JSON.parse(localStorage.getItem("azka_school_words") || "[]") || []; } catch (e) { list = []; }
    const out = [];
    list.forEach(w => {
      w = String(w || "").trim(); if (w.length < 2) return;
      const found = WORDS.find(x => x.w.toLowerCase() === w.toLowerCase());
      out.push(found ? Object.assign({ school: true }, found) : { w, d: `a word from your school list (${w.length} letters, starts with "${w[0]}")`, school: true, custom: true });
    });
    return out;
  }
  function chooseWord(exclude) {
    exclude = exclude || [];
    const m = load(), now = Date.now(), s2 = load2(), lvl = level();
    const school = schoolEntries().filter(x => !exclude.includes(x.w) && stage(x.w) < 3);
    if (school.length && Math.random() < 0.5) return choice(school);
    const due = WORDS.filter(x => m[x.w] && m[x.w].d <= now && !exclude.includes(x.w));
    if (due.length && Math.random() < 0.55) return choice(due);
    const rest = WORDS.filter(x => !exclude.includes(x.w) && (s2[x.w] || tierOf(x.w) <= lvl));
    const pool = rest.length ? rest : WORDS.filter(x => !exclude.includes(x.w));
    return choice(pool.length ? pool : WORDS);
  }
  const choice = a => a[rand(0, a.length - 1)];
  const esc = x => String(x == null ? "" : x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const X = () => root.AIGSpellingExtra || { EX: {}, TIP: {}, FACT: {} };
  // Small card shown after an answer: a memory trick + example when wrong, an occasional origin fact when right.
  function afterAnswerHtml(word, ok) {
    if (!word) return "";
    const x = X(), tip = x.TIP[word], ex = x.EX[word], fact = x.FACT[word];
    let h = "";
    if (!ok) {
      if (tip) h += `<div class="sp-note sp-tip">💡 <b>Memory trick:</b> ${esc(tip)}</div>`;
      if (ex) h += `<div class="sp-note sp-ex">✏️ <i>${esc(ex)}</i></div>`;
    } else if (fact && Math.random() < 0.4) {
      h += `<div class="sp-note sp-fact">🔎 <b>Did you know?</b> ${esc(fact)}</div>`;
    }
    return h;
  }

  /* ---- question builders ---- */
  const defHtml = e => `<i>${e.d}</i>`;
  function mcQuestion(e) {
    const opts = shuffle([e.w, ...wrongSpellings(e).slice(0, 3)]);
    return { type: "mc", prompt: `Which is the correct spelling of the word that means ${defHtml(e)}?`, options: opts, answer: e.w, spellWord: e.w };
  }
  // Text-to-speech: prefer a clear English voice (Google/local), adjustable speed (slow = 🐢).
  let VOICE = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices() || [];
      if (!vs.length) return null;
      const en = vs.filter(v => /^en[-_](US|GB|AU|IN)/i.test(v.lang) || /^en$/i.test(v.lang));
      return en.find(v => /google/i.test(v.name) && /en[-_]US/i.test(v.lang)) || en.find(v => /en[-_]US/i.test(v.lang) && v.localService) || en.find(v => /en[-_]US/i.test(v.lang)) || en[0] || null;
    } catch (e) { return null; }
  }
  try { if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { VOICE = pickVoice(); }; } catch (e) {}
  const rateOf = slow => { let r = 0.8; try { const v = parseFloat(localStorage.getItem("azka_tts_rate")); if (v >= 0.4 && v <= 1.2) r = v; } catch (e) {} return slow ? Math.max(0.45, r - 0.3) : r; };
  const say = (w, slow) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = "en-US"; u.rate = rateOf(slow); if (!VOICE) VOICE = pickVoice(); if (VOICE) u.voice = VOICE; speechSynthesis.speak(u); } catch (e) {} };
  function typedListen(e) {
    return { type: "fill", prompt: `<button type="button" class="btn btn-secondary" data-w="${e.w.replace(/"/g, "&quot;")}" onclick="AIGSpelling.say(this.dataset.w)">🔊 Hear the word</button> <button type="button" class="btn btn-secondary" data-w="${e.w.replace(/"/g, "&quot;")}" onclick="AIGSpelling.say(this.dataset.w, true)" aria-label="Hear it slowly">🐢</button><br>Type the word that means ${defHtml(e)} <small>(${e.w.length} letters, starts with <b>${e.w[0].toLowerCase()}</b>)</small>`, answer: e.w, spellWord: e.w };
  }
  function typedMissing(e) {
    const lw = e.w, idx = [];
    const inner = [...Array(lw.length).keys()].slice(1, -1);
    const want = lw.length >= 8 ? 2 : 1;
    const vowels = inner.filter(i => /[aeiou]/i.test(lw[i]));
    const pool = shuffle(vowels.length >= want ? vowels : inner);
    pool.slice(0, want).forEach(i => idx.push(i));
    const shown = [...lw].map((ch, i) => (idx.includes(i) ? "_" : ch.toLowerCase())).join(" ");
    return { type: "fill", prompt: `Fill in the missing letters, then type the whole word: <b>${shown}</b><br>It means ${defHtml(e)}`, answer: e.w, spellWord: e.w };
  }
  function typedScramble(e) {
    let letters = [...e.w.toLowerCase()], tries = 0, s;
    do { s = shuffle(letters).join(""); tries++; } while (s === e.w.toLowerCase() && tries < 20);
    return { type: "fill", prompt: `Unscramble the letters to spell the word: <b>${[...s].join(" ")}</b><br>It means ${defHtml(e)}`, answer: e.w, spellWord: e.w };
  }
  function oneQuestion(exclude) {
    const e = chooseWord(exclude), r = Math.random();
    if (r < 0.30) return mcQuestion(e);
    if (r < 0.58) return typedListen(e);
    if (r < 0.84) return typedMissing(e);
    return typedScramble(e);
  }
  function buildSession(n) {
    const used = [], out = [];
    while (out.length < n) { const q = oneQuestion(used); used.push(q.spellWord); out.push(q); }
    return out;
  }
  // Multiple choice only, in the shape every mini-game's pool uses.
  function quickMc() {
    const e = chooseWord(), q = mcQuestion(e);
    return { prompt: plain(q.prompt), options: q.options, correctLabel: q.answer, spellWord: e.w };
  }
  // Short card pair for tile games (e.g. Memory Match): definition <-> word.
  function shortPair(maxPrompt, maxAnswer) {
    for (let i = 0; i < 30; i++) { const e = choice(WORDS); if (e.d.length <= maxPrompt && e.w.length <= maxAnswer) return { prompt: e.d, correctLabel: e.w }; }
    return null;
  }
  const entryOf = w => WORDS.find(x => x.w.toLowerCase() === String(w).toLowerCase()) || schoolEntries().find(x => x.w.toLowerCase() === String(w).toLowerCase()) || null;
  function anyFormat(e) {
    const r = Math.random();
    if (r < 0.34) return mcQuestion(e);
    if (r < 0.6) return typedListen(e);
    if (r < 0.85) return typedMissing(e);
    return typedScramble(e);
  }
  // "Revenge round": the words you missed (most missed first); tops up with normal words if there are fewer than n.
  function buildRevenge(n) {
    const m = load();
    const weak = Object.keys(m).map(w => ({ e: entryOf(w), m: m[w].m || 1 })).filter(x => x.e).sort((a, b) => b.m - a.m).slice(0, n).map(x => x.e);
    const used = weak.map(e => e.w), out = weak.map(anyFormat);
    while (out.length < n) { const e = chooseWord(used); used.push(e.w); out.push(anyFormat(e)); }
    return { questions: out, weakCount: weak.length };
  }
  // "Spelling Bee": listen and type, words from the ladder level (school words first). Timer lives in the UI.
  function buildBee(n) {
    const used = [], out = [];
    while (out.length < n) { const e = chooseWord(used); used.push(e.w); out.push(typedListen(e)); }
    return out;
  }
  // Every practisable word with its stage, for the Word Garden.
  function gardenWords() {
    const school = schoolEntries(), seen = new Set(WORDS.map(x => x.w.toLowerCase()));
    const extra = school.filter(x => !seen.has(x.w.toLowerCase()));
    const sl = new Set(school.map(x => x.w.toLowerCase()));
    return WORDS.concat(extra).map(e => ({ w: e.w, d: e.d, school: sl.has(e.w.toLowerCase()), stage: stage(e.w), tier: tierOf(e.w) }));
  }
  root.AIGSpelling = { WORDS, wrongSpellings, mutations, record, say, buildSession, oneQuestion, quickMc, shortPair, mcQuestion, typedListen, typedMissing, typedScramble, weak: () => load(), progress: load2, stage, level, tierOf, masteredCount, afterAnswerHtml, schoolEntries, entryOf, buildRevenge, buildBee, gardenWords, chooseWord, extra: X };
  if (typeof module !== "undefined" && module.exports) module.exports = root.AIGSpelling;
})(typeof window !== "undefined" ? window : globalThis);
