/* =================================================================
   AIGSpellFix -- "Correcting spelling mistakes" practice built from the words Azka found hard on school worksheets
   (spot the circled/wrong word, pick the one correct spelling out of three, fix it, match wrong -> right).
   Original sentences written for this app. 48 words x 3 sentences. Every question is derived from the data below:
     tricky    mc, 3 spellings, only one is right            (1 per word)
     fixMc     mc, choose the correct spelling of the wrong word in a sentence      (1 per sentence)
     fixType   typed: fix the wrong word in the sentence                            (1 per sentence)
     whichWrong mc: which word in the sentence is spelled wrong                     (1 per sentence)
     match     match 4 wrong spellings with the right ones                          (sets)
   A "*" in front of a wrong spelling means it is a real word that is only wrong in context (advise/advice, guest/guessed):
   it is used inside sentences but never in the no-context formats.
   Loaded after spelling.js. Mini-games get the MC kinds only (quick*): short plain-text prompts.
   ================================================================= */
(function (root) {
  "use strict";
  const DATA = `
earlier|earlyer, earleir, earlyar|I woke up earlier than usual today. || The bus came earlier than the timetable said. || She finished her homework earlier than her brother.
weighed|wayed, weihed, wayd|The baker weighed the flour carefully. || We weighed the watermelon on the scales. || He weighed himself before the race.
identical|identicle, identicall, idenical|The two twins wore identical shirts. || Those two pictures look identical. || My bag is identical to hers.
exhibition|exebition, exhibishon, exibition|We visited an art exhibition on Sunday. || The school held an exhibition of science projects. || The museum has a new dinosaur exhibition.
portrait|portrate, portret, portriat|The artist painted a portrait of the queen. || Grandma hung a family portrait in the hall. || She drew a portrait of her best friend.
qualifications|kwalifications, qualifacations, qualificasions|The teacher has many qualifications. || You need good qualifications to become a doctor. || She listed her qualifications on the form.
opportunity|opertunity, oppertunity, opportunety|It was a great opportunity to learn to swim. || Do not miss this opportunity to join the club. || She took the opportunity to say thank you.
advice|*advise, advic, adwice|My friend gave me some good advice. || Ask your teacher for advice. || Thank you for your helpful advice.
advise|*advice, advize, adwise|The doctor will advise you what to do. || I advise you to wear a coat. || Can you advise me which book to read?
handwriting|handriting, handwritting, handwritng|Her handwriting is neat and clear. || I practise my handwriting every day. || The doctor's handwriting was hard to read.
really|realy, reely, realley|I am really happy today. || The soup is really hot. || Do you really like pizza?
expert|exspert, expurt, expirt|My uncle is an expert on trains. || Ask an expert if you are not sure. || The expert explained how volcanoes form.
flexible|flexable, flexibel, flexeble|Gymnasts are very flexible. || A rubber band is flexible. || Please be flexible if our plans change.
championship|champianship, champonship, champeenship|Our team won the championship. || The school championship starts on Friday. || He trained hard for the championship.
accidentally|acidentally, accidently, accidentaly|I accidentally dropped my cup. || She accidentally sent the message twice. || He accidentally left his bag on the bus.
potatoes|potatos, patatoes, potatoos|We ate roast potatoes for dinner. || Mum peeled the potatoes. || The farmer grew potatoes and carrots.
women|wommen, wimin, womin|Many women work at the hospital. || The women walked to the market. || Three women sat on the bench.
therefore|therfore, theirfore, therefor|It was raining, therefore we stayed inside. || He was tired and therefore went to bed. || She studied hard and therefore passed the test.
naughty|norty, nauty, naughtey|The naughty puppy chewed my shoe. || Please do not be naughty in class. || The naughty monkey stole a banana.
fortunate|fortunet, fortunete, fortunat|We were fortunate to have sunny weather. || He is fortunate to have good friends. || It was fortunate that I had an umbrella.
wedge|wege, wedje, weadge|I cut a wedge of cheese. || She ate a wedge of watermelon. || Put a wedge under the door to hold it open.
switch|swich, swithc, swhich|Where is the light switch? || Press the switch to start the machine. || Flip the switch and the fan will turn.
author|awther, authur, authar|Who is your favourite author? || The author signed my book. || The author wrote a story about a dragon.
operation|operashion, opperation, operasion|The doctor explained the operation to my uncle. || The operation took two hours. || The nurse helped during the operation.
bought|bort, bougt, bawt|I bought a new pair of shoes. || Mum bought some fruit at the market. || She bought a ticket for the show.
technique|techneek, tecnique, techniqe|She learned a new painting technique. || Good technique helps you swim faster. || The coach showed us the correct technique.
ribbon|ribon, ribbin, riben|A pink ribbon decorated the cake. || She wore a red ribbon in her hair. || The winner got a blue ribbon.
guessed|*guest, guesed, gessed|I guessed which hand held the coin. || She guessed my age correctly. || He guessed the answer and was right.
especially|especialy, expecially, espesially|I like fruit, especially mangoes. || It is especially cold today. || The park is lovely, especially in spring.
jewellery|jewelery, jewlery, jewellry|The shop sells beautiful jewellery. || She keeps her jewellery in a small box. || Gold jewellery sparkled in the window.
precious|preshous, precius, pretious|The crown was covered in precious stones. || Time with family is precious. || She kept the precious ring safe.
expensive|exspensive, expencive, expensiv|The new phone was too expensive. || That jacket is expensive. || A big house in the city is expensive.
guilty|gilty, guiltey, guilti|I felt guilty about breaking the cup. || The guilty boy told the truth. || The judge said he was guilty.
accurate|accurat, acurate, accuratte|The map is very accurate. || We took accurate measurements. || Her answer was accurate.
against|agenst, agianst, againts|We played against a strong team. || He leaned against the wall. || Are you for or against the idea?
achieve|acheive, acheave, achive|With effort, we can achieve our goals. || She worked hard to achieve her dream. || You can achieve anything you try.
doubt|dowt, doubbt, dout|There is no doubt that dogs are loyal. || She had a doubt about the answer. || Without a doubt, this is the best cake.
forty|fourty, fortey, fority|Forty children joined the picnic. || The bus holds forty passengers. || Count from ten to forty.
strange|straynge, straingee, strainge|A strange light appeared in the sky. || It felt strange to be alone in the house. || What a strange noise!
heart|hart, haert, heert|Her heart raced before the race. || Draw a heart on the card. || A kind heart is better than gold.
circle|cercle, sercle, circel|Draw a circle with a compass. || The kids sat in a circle. || The moon looked like a bright circle.
believe|beleive, beleave, belive|Do you believe in magic? || I believe it will rain soon. || Please believe me, I am telling the truth.
February|Febuary, Febrary, Februry|February is the shortest month. || Our school fair is in February. || It rained every day in February.
medicine|medisene, medicene, medecine|Take your medicine after lunch. || The medicine tasted sweet. || The nurse gave him some medicine.
remember|rememba, remmember, rember|Remember to lock the door. || Can you remember her name? || I remember my first day at school.
knowledge|knowlege, nowledge, nolidge|Books give us knowledge. || She has great knowledge of birds. || Knowledge is power, they say.
quarter|qarter, qwarter, quater|A quarter of the class wore red. || It is a quarter past four. || A quarter of an hour is fifteen minutes.
breathe|brethe, breave, *breath|Breathe in slowly through your nose. || Fish breathe through gills. || It is hard to breathe in smoky air.
`;
  const ITEMS = DATA.trim().split("\n").map(line => {
    const a = line.indexOf("|"), b = line.indexOf("|", a + 1);
    const w = line.slice(0, a).trim(), wr = line.slice(a + 1, b).trim(), ss = line.slice(b + 1).trim();
    const wrong = wr.split(",").map(x => x.trim()).filter(Boolean);
    return { w, wrongAll: wrong.map(x => x.replace(/^\*/, "")), wrongPlain: wrong.filter(x => !x.startsWith("*")), sentences: ss.split("||").map(x => x.trim()) };
  });
  const BY = Object.fromEntries(ITEMS.map(it => [it.w.toLowerCase(), it]));

  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rand(0, i); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  const plain = s => String(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Put `bad` where the right word is, keeping a capital letter at the start of a sentence.
  function breakSentence(it, i, bad) {
    const s = it.sentences[i], re = new RegExp("\\b" + reEsc(it.w) + "\\b", "i");
    return s.replace(re, m => (m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? bad[0].toUpperCase() + bad.slice(1) : bad));
  }
  const quote = s => `“${s}”`;
  const cap = (it, w) => (it.w[0] === it.w[0].toUpperCase() ? w[0].toUpperCase() + w.slice(1) : w);

  function tricky(it) {
    const wr = pick(it.wrongPlain.map(x => cap(it, x)), 2);
    return { type: "mc", prompt: "Only one of these spellings is correct. Which one?", options: shuffle([it.w, ...wr]), answer: it.w, spellWord: it.w, fix: "tricky" };
  }
  function fixMc(it, i) {
    const bad = cap(it, pick(it.wrongAll, 1)[0]), others = it.wrongAll.map(x => cap(it, x)).filter(x => x !== bad);
    const pool = [...new Set([...others, ...it.wrongPlain.map(x => cap(it, x)), bad])].filter(x => x.toLowerCase() !== it.w.toLowerCase());
    const opts = shuffle([it.w, ...pick(pool, 3)]);
    return { type: "mc", prompt: `One word is spelled wrong. Choose the correct spelling:<br><i>${quote(breakSentence(it, i, bad))}</i>`, options: [...new Set(opts)].slice(0, 4), answer: it.w, spellWord: it.w, fix: "fixMc" };
  }
  function fixType(it, i) {
    const bad = cap(it, pick(it.wrongAll, 1)[0]);
    return { type: "fill", prompt: `Fix the spelling mistake. Type the correct word:<br><i>${quote(breakSentence(it, i, bad))}</i>`, answer: it.w, spellWord: it.w, fix: "fixType" };
  }
  function whichWrong(it, i) {
    const bad = cap(it, pick(it.wrongPlain, 1)[0]), sentence = breakSentence(it, i, bad);
    const seenT = new Set(), toks = sentence.replace(/[“”.,!?]/g, "").split(/\s+/).filter(t => { const l = t.toLowerCase(); if (!t || l === bad.toLowerCase() || seenT.has(l)) return false; seenT.add(l); return true; });
    const long = toks.filter(t => t.length >= 2).sort((x, y) => y.length - x.length), short = toks.filter(t => t.length < 2);
    const others = pick(long.slice(0, 6), 3).concat(pick(short, 3)).slice(0, 3);
    if (others.length < 3) return null;
    return { type: "mc", prompt: `Which word in this sentence is spelled wrong?<br><i>${quote(sentence)}</i>`, options: shuffle([bad, ...others]), answer: bad, spellWord: it.w, fix: "whichWrong" };
  }
  function matchSet(its) {
    const chosen = its.map(it => [cap(it, pick(it.wrongPlain, 1)[0]), it.w]);
    return { type: "match", prompt: "Match each wrong spelling with the correct spelling.", pairs: chosen.map(([l, r]) => ({ left: l, right: r })), fix: "match" };
  }

  // Every distinct question, as small descriptors (used for counting and QA); build(desc) makes a playable question.
  function all() {
    const out = [];
    ITEMS.forEach(it => {
      out.push({ k: "tricky", w: it.w });
      it.sentences.forEach((_, i) => { out.push({ k: "fixMc", w: it.w, i }); out.push({ k: "fixType", w: it.w, i }); out.push({ k: "whichWrong", w: it.w, i }); });
    });
    for (let s = 0; s < 24; s++) out.push({ k: "match", s });
    return out;
  }
  function build(d) {
    if (d.k === "match") return matchSet(pick(ITEMS, 4));
    const it = BY[d.w.toLowerCase()];
    return d.k === "tricky" ? tricky(it) : d.k === "fixMc" ? fixMc(it, d.i) : d.k === "fixType" ? fixType(it, d.i) : whichWrong(it, d.i);
  }
  const has = w => !!BY[String(w).toLowerCase()];
  const words = () => ITEMS.map(it => it.w);
  // Random question for one word. `mcOnly` keeps to multiple-choice (mini-games).
  function forWord(w, mcOnly) {
    const it = BY[String(w).toLowerCase()]; if (!it) return null;
    const i = rand(0, it.sentences.length - 1), kinds = mcOnly ? ["tricky", "fixMc", "fixMc", "whichWrong"] : ["tricky", "fixMc", "fixType", "fixType", "whichWrong"];
    const k = kinds[rand(0, kinds.length - 1)];
    return (k === "whichWrong" ? whichWrong(it, i) : k === "fixMc" ? fixMc(it, i) : k === "fixType" ? fixType(it, i) : tricky(it)) || fixMc(it, i);
  }
  // Mini-game shape: short plain text, 4 (or 3) options.
  function quick(w) {
    for (let t = 0; t < 6; t++) {
      const q = forWord(w, true); if (!q) return null;
      const prompt = plain(q.prompt);
      if (prompt.length <= 150) return { prompt, options: q.options, correctLabel: q.answer, spellWord: q.spellWord };
    }
    return null;
  }
  const matchRandom = () => matchSet(pick(ITEMS, 4));

  root.AIGSpellFix = { ITEMS, all, build, has, words, forWord, quick, matchRandom };
  if (typeof module !== "undefined" && module.exports) module.exports = root.AIGSpellFix;
})(typeof window !== "undefined" ? window : globalThis);
