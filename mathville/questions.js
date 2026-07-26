/* =================================================================
   MathQuest — question bank, extracted from Y4-T1-Math.pdf
   (Green Montessori School, Grade 4, Term 1).
   Chapter order matches the PDF's page order (= teaching order).
   Some answers were computed by hand where the source workbook is a
   blank student copy (no answer key printed) — flagged with `_check`
   where the source page was ambiguous (needs a human read of the PDF).
   ================================================================= */
window.MATHVILLE_BANK = {
  chapters: [
    {
      id: "place-value",
      title: "Place Value (Hundred to Million)",
      emoji: "🔢",
      intro: "Every digit in a number has a place — ones, tens, hundreds, thousands, and beyond. In this chapter you'll practice finding the VALUE of a digit based on where it sits in a big number, all the way up to millions.",
      mode: "generator",
      generatorKeys: ["place-value"],
      sampleQuestions: [
        { prompt: "What is the value of the digit 7 in 6,725?", answer: "700" },
        { prompt: "What is the value of the digit 7 in 15,987?", answer: "7" },
        { prompt: "What is the value of the digit 7 in 137,691?", answer: "7,000" },
        { prompt: "What is the value of the digit 7 in 4,785,613?", answer: "700,000" },
        { prompt: "What is the value of the digit 7 in 7,536,844?", answer: "7,000,000" },
        { prompt: "What is the value of the digit 9 in 9,622?", answer: "9,000" },
        { prompt: "What is the value of the digit 9 in 190,553?", answer: "90,000" },
        { prompt: "What is the value of the digit 9 in 900,752?", answer: "900,000" },
        { prompt: "What is the value of the digit 9 in 9,685,148?", answer: "9,000,000" },
        { prompt: "What is the value of the digit 9 in 5,754,925?", answer: "900" },
        { prompt: "What is the value of the digit 9 in 63,589?", answer: "9" }
      ]
    },
    {
      id: "addition-subtraction",
      title: "Addition & Subtraction",
      emoji: "➕",
      intro: "Time to add and subtract big numbers — 5 and 6 digits long! Line up the place values carefully in columns, and don't forget to carry or borrow when you need to.",
      mode: "generator",
      generatorKeys: ["addition-subtraction-add", "addition-subtraction-sub"],
      sampleQuestions: [
        { prompt: "584,445 + 31,496 + 318,587 = ?", answer: "934,528" },
        { prompt: "715,681 + 842,664 + 983,260 = ?", answer: "2,541,605" },
        { prompt: "74,765 - 26,591 = ?", answer: "48,174" },
        { prompt: "822,450 - 80,124 = ?", answer: "742,326" }
      ],
      // Word problems don't generate believably at random — kept as a small
      // hand-authored bonus set mixed in alongside the generator.
      staticQuestions: [
        {
          prompt: "Museum visitors table — Jan: Child 28, Adult 59, Senior 15. What is the total number of visitors in January?",
          answer: "102"
        },
        {
          prompt: "Compared to January (28 children), 34 children visited in February. How many MORE children visited in February?",
          answer: "6"
        },
        {
          prompt: "In February, Child=34, Senior=22, Total=139. How many adults visited in February?",
          answer: "83"
        },
        {
          prompt: "A school library has 384 fiction books and 259 non-fiction books. How many books are there in total?",
          answer: "643"
        },
        {
          prompt: "A bakery made 1,250 cupcakes. They sold 875 in the morning and 210 more in the afternoon. How many cupcakes are left?",
          answer: "165"
        },
        {
          prompt: "A bus had 48 passengers. At the first stop, 15 got off and 22 got on. How many passengers are on the bus now?",
          answer: "55"
        }
      ]
    },
    {
      id: "prime-numbers",
      title: "Prime Number (Multiples and Factoring)",
      emoji: "🌳",
      intro: "A prime number can only be divided evenly by 1 and itself — everything else is composite. In this chapter you'll spot primes, list factors and multiples, and build prime factorization trees.",
      questions: [
        { prompt: "Is 95 prime or not prime?", answer: "Not prime (5 × 19)" },
        { prompt: "Is 7 prime or not prime?", answer: "Prime" },
        { prompt: "Is 37 prime or not prime?", answer: "Prime" },
        { prompt: "Is 66 prime or not prime?", answer: "Not prime" },
        { prompt: "Is 31 prime or not prime?", answer: "Prime" },
        { prompt: "Is 47 prime or not prime?", answer: "Prime" },
        { prompt: "List all prime numbers between 16 and 25.", answer: "17, 19, 23" },
        { prompt: "List all prime numbers between 92 and 100.", answer: "97" },
        { prompt: "List all prime numbers between 70 and 80.", answer: "71, 73, 79" },
        { prompt: "List all prime numbers between 35 and 45.", answer: "37, 41, 43" },
        { prompt: "List all the factors of 18.", answer: "1, 2, 3, 6, 9, 18" },
        { prompt: "List all the factors of 30.", answer: "1, 2, 3, 5, 6, 10, 15, 30" },
        { prompt: "List all the factors of 36.", answer: "1, 2, 3, 4, 6, 9, 12, 18, 36" },
        { prompt: "List all the factors of 100.", answer: "1, 2, 4, 5, 10, 20, 25, 50, 100" },
        { prompt: "List the first 5 multiples of 9.", answer: "9, 18, 27, 36, 45" },
        { prompt: "List the first 5 multiples of 7.", answer: "7, 14, 21, 28, 35" },
        { prompt: "List the first 5 multiples of 6.", answer: "6, 12, 18, 24, 30" },
        { prompt: "Find the prime factorization of 24.", answer: "2 × 2 × 2 × 3" },
        { prompt: "Find the prime factorization of 27.", answer: "3 × 3 × 3" },
        { prompt: "Find the prime factorization of 48.", answer: "2 × 2 × 2 × 2 × 3" },
        { prompt: "Find the prime factorization of 40.", answer: "2 × 2 × 2 × 5" },
        { prompt: "Find the prime factorization of 90.", answer: "2 × 3 × 3 × 5" },
        { prompt: "Find the prime factorization of 121.", answer: "11 × 11" },
        { prompt: "Find the prime factorization of 70.", answer: "2 × 5 × 7" },
        { prompt: "Is 51 prime or not prime?", answer: "Not prime (3 × 17)" },
        { prompt: "Is 57 prime or not prime?", answer: "Not prime (3 × 19)" },
        { prompt: "Is 61 prime or not prime?", answer: "Prime" },
        { prompt: "Is 67 prime or not prime?", answer: "Prime" },
        { prompt: "Is 83 prime or not prime?", answer: "Prime" },
        { prompt: "Is 91 prime or not prime?", answer: "Not prime (7 × 13)" },
        { prompt: "Is 97 prime or not prime?", answer: "Prime" },
        { prompt: "List all prime numbers between 1 and 10.", answer: "2, 3, 5, 7" },
        { prompt: "List all prime numbers between 50 and 60.", answer: "53, 59" },
        { prompt: "List all prime numbers between 80 and 90.", answer: "83, 89" },
        { prompt: "List all prime numbers between 100 and 110.", answer: "101, 103, 107, 109" },
        { prompt: "List all the factors of 40.", answer: "1, 2, 4, 5, 8, 10, 20, 40" },
        { prompt: "List all the factors of 45.", answer: "1, 3, 5, 9, 15, 45" },
        { prompt: "List all the factors of 60.", answer: "1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60" },
        { prompt: "List all the factors of 64.", answer: "1, 2, 4, 8, 16, 32, 64" },
        { prompt: "List the first 5 multiples of 3.", answer: "3, 6, 9, 12, 15" },
        { prompt: "List the first 5 multiples of 8.", answer: "8, 16, 24, 32, 40" },
        { prompt: "List the first 5 multiples of 11.", answer: "11, 22, 33, 44, 55" },
        { prompt: "List the first 5 multiples of 12.", answer: "12, 24, 36, 48, 60" },
        { prompt: "Find the prime factorization of 36.", answer: "2 × 2 × 3 × 3" },
        { prompt: "Find the prime factorization of 45.", answer: "3 × 3 × 5" },
        { prompt: "Find the prime factorization of 50.", answer: "2 × 5 × 5" },
        { prompt: "Find the prime factorization of 60.", answer: "2 × 2 × 3 × 5" },
        { prompt: "Find the prime factorization of 84.", answer: "2 × 2 × 3 × 7" },
        { prompt: "Find the prime factorization of 100.", answer: "2 × 2 × 5 × 5" },
        { prompt: "Find the prime factorization of 144.", answer: "2 × 2 × 2 × 2 × 3 × 3" }
      ]
    },
    {
      id: "gcf-lcm",
      title: "GCF & LCM",
      emoji: "🔗",
      intro: "GCF (Greatest Common Factor) is the biggest number that divides evenly into two numbers. LCM (Least Common Multiple) is the smallest number that both numbers divide into. Both are super useful for working with fractions later on!",
      questions: [
        { prompt: "Find the Greatest Common Factor (GCF) of 20 and 25.", answer: "5" },
        { prompt: "Find the GCF of 28 and 12.", answer: "4" },
        { prompt: "Find the GCF of 15 and 24.", answer: "3" },
        { prompt: "Find the GCF of 14 and 11.", answer: "1" },
        { prompt: "Find the Least Common Multiple (LCM) of 3 and 4.", answer: "12" },
        { prompt: "Find the LCM of 2 and 7.", answer: "14" },
        { prompt: "Find the LCM of 4 and 10.", answer: "20" },
        { prompt: "Find the LCM of 4 and 5.", answer: "20" },
        { prompt: "Find the LCM of 6 and 10.", answer: "30" },
        { prompt: "Find the LCM of 6 and 18.", answer: "18" },
        { prompt: "Find the LCM of the set 2, 3, and 5.", answer: "30" },
        { prompt: "Find the LCM of the set 5, 6, and 10.", answer: "30" },
        { prompt: "Find the LCM of the set 11, 3, and 6.", answer: "66" },
        {
          prompt: "Sota sorts sweets into piles of 12, Liam into piles of 9, and they have the same total. What is the minimum number of sweets they could each have?",
          answer: "36"
        },
        {
          prompt: "Do-yoon buys bread rolls in packs of 8 and burgers in packs of 6. What is the minimum number of packs of each so every roll has a burger?",
          answer: "24 rolls and 24 burgers (buy 3 packs of rolls, 4 packs of burgers)"
        },
        {
          prompt: "A smoke alarm beeps every 30 minutes, an oven timer every 18 minutes. Both beep together at 9:00am. When do they next beep together?",
          answer: "10:30am (LCM of 30 and 18 is 90 minutes)"
        },
        {
          prompt: "The LCM of two numbers is 45, and one of the numbers is 9. Give a possible value for the other number.",
          answer: "5 or 15"
        },
        {
          prompt: "The LCM of two numbers is 66. Give three possible pairs of numbers.",
          answer: "(6, 11), (2, 33), (3, 22) — any pair whose LCM is 66"
        },
        { prompt: "Find the GCF of 16 and 24.", answer: "8" },
        { prompt: "Find the GCF of 18 and 27.", answer: "9" },
        { prompt: "Find the GCF of 21 and 35.", answer: "7" },
        { prompt: "Find the GCF of 45 and 60.", answer: "15" },
        { prompt: "Find the GCF of 32 and 48.", answer: "16" },
        { prompt: "Find the GCF of 9 and 27.", answer: "9" },
        { prompt: "Find the LCM of 5 and 8.", answer: "40" },
        { prompt: "Find the LCM of 9 and 12.", answer: "36" },
        { prompt: "Find the LCM of 7 and 14.", answer: "14" },
        { prompt: "Find the LCM of 8 and 20.", answer: "40" },
        { prompt: "Find the LCM of 6 and 8.", answer: "24" },
        { prompt: "Find the LCM of the set 4, 6, and 8.", answer: "24" },
        {
          prompt: "Two buses leave the station at 8:00am. Bus A returns every 20 minutes, Bus B every 15 minutes. When do they next leave together?",
          answer: "9:00am (LCM of 20 and 15 is 60 minutes)"
        },
        {
          prompt: "A gardener wants to plant rows of tulips and rows of daisies so both flower types line up evenly. Tulips come in bags of 12, daisies in bags of 8. What is the smallest total number of plants for both rows to match up?",
          answer: "24"
        },
        {
          prompt: "Two classes have 24 and 36 students. The teacher wants to split each class into equal-sized groups, with the same group size for both classes. What is the biggest possible group size?",
          answer: "12 (GCF of 24 and 36)"
        }
      ]
    },
    {
      id: "multiplication",
      title: "Multiplication",
      emoji: "✖️",
      intro: "Time to multiply! You'll review your times tables, learn the associative, commutative, and distributive properties (fancy names for handy shortcuts), and multiply big numbers in columns.",
      mode: "generator",
      generatorKeys: ["multiplication"],
      sampleQuestions: [
        { prompt: "822 × 9 = ?", answer: "7,398" },
        { prompt: "2,348 × 6 = ?", answer: "14,088" },
        { prompt: "5,807 × 87 = ?", answer: "505,209" }
      ],
      // Property questions (commutative/distributive) are concept checks,
      // not drill facts — kept static, mixed in alongside the generator.
      staticQuestions: [
        {
          prompt: "Fill in the blanks using the commutative property: __ × 3 = 3 × 73",
          answer: "73"
        },
        {
          prompt: "Fill in the blanks using the commutative property: 6 × 14 = 14 × __",
          answer: "6"
        },
        {
          prompt: "Fill in the blanks using the commutative property: 2 × __ = 5 × 2",
          answer: "5"
        },
        {
          prompt: "Use the distributive property to solve: 3 × 12",
          answer: "36 (= 3×10 + 3×2 = 30 + 6)"
        },
        {
          prompt: "Use the distributive property to solve: 8 × 26",
          answer: "208 (= 8×20 + 8×6 = 160 + 48)"
        },
        {
          prompt: "Use the distributive property to solve: 4 × 23",
          answer: "92 (= 4×20 + 4×3 = 80 + 12)"
        },
        {
          prompt: "Use the distributive property to solve: 7 × 25",
          answer: "175 (= 7×20 + 7×5 = 140 + 35)"
        }
      ]
    },
    {
      id: "division",
      title: "Division",
      emoji: "➗",
      intro: "Division is splitting a number into equal groups. You'll learn quick divisibility rules (how to tell if a number divides evenly without doing the whole calculation), practice division facts, and tackle long division — with and without remainders.",
      mode: "generator",
      generatorKeys: ["division"],
      sampleQuestions: [
        { prompt: "96 ÷ 12 = ?", answer: "8" },
        { prompt: "932 ÷ 4 = ?", answer: "233" },
        { prompt: "6,743 ÷ 4 = ? (with remainder)", answer: "1,685 remainder 3" }
      ],
      // Divisibility RULES are explanatory, not gradable in the 4 interaction
      // types (open-ended "give an example") — skipInRound keeps them out of
      // the playable question round; they're still shown as chapter trivia.
      staticQuestions: [
        { prompt: "What is the divisibility rule for 2? Give an example.", answer: "The number is even (ends in 0, 2, 4, 6, or 8) — e.g. 124", skipInRound: true },
        { prompt: "What is the divisibility rule for 3? Give an example.", answer: "The sum of its digits is divisible by 3 — e.g. 123 (1+2+3=6)", skipInRound: true },
        { prompt: "What is the divisibility rule for 5? Give an example.", answer: "The number ends in 0 or 5 — e.g. 125", skipInRound: true },
        { prompt: "What is the divisibility rule for 9? Give an example.", answer: "The sum of its digits is divisible by 9 — e.g. 189 (1+8+9=18)", skipInRound: true },
        { prompt: "What is the divisibility rule for 10? Give an example.", answer: "The number ends in 0 — e.g. 130", skipInRound: true },
        { prompt: "Which numbers is 4,680 divisible by: 2, 3, 5, 9, 10?", answer: "All of them: 2, 3, 5, 9, 10" },
        { prompt: "Which numbers is 113 divisible by: 2, 3, 5, 9, 10?", answer: "None of them" }
      ]
    },
    {
      id: "mixed-operation",
      title: "Mixed Operation",
      emoji: "🧮",
      intro: "Real-life problems don't tell you which operation to use — you have to figure it out! This short chapter mixes addition, subtraction, multiplication, and division in word problems about a busy clinic (and beyond).",
      questions: [
        {
          prompt: "A clinic has 4 doctors, each with 2 nurses, plus 2 receptionists (Ren and Ha-eun). How many people work at the clinic?",
          answer: "14"
        },
        {
          prompt: "On Monday, 23 patients made appointments with EACH of the 4 doctors, but 6 patients in total didn't show up. How many patients visited on Monday?",
          answer: "86 (23×4 = 92, minus 6 no-shows)"
        },
        {
          prompt: "On Tuesday, Ren answered 45 calls and Ha-eun answered 12 more calls than Ren. How many calls were answered in total?",
          answer: "102 (45 + 57)"
        },
        {
          prompt: "A school has 6 classrooms. Each classroom has 4 rows of 5 desks. How many desks are there in total?",
          answer: "120"
        },
        {
          prompt: "A farmer has 8 baskets with 15 apples each. He sells 3 whole baskets. How many apples does he have left?",
          answer: "75 (8×15=120, minus 3×15=45)"
        },
        {
          prompt: "A theater has 12 rows with 20 seats each. If 187 tickets were sold, how many seats are still empty?",
          answer: "53 (12×20=240, minus 187)"
        },
        {
          prompt: "A pet shop has 9 tanks with 7 fish each. 2 fish from each tank are sold. How many fish are left in total?",
          answer: "45 (9×7=63, minus 9×2=18)"
        },
        {
          prompt: "A bakery packs cookies into boxes of 6. If they baked 252 cookies, how many boxes can they fill?",
          answer: "42"
        }
      ]
    },
    {
      id: "measurement",
      title: "Measurement (Length & Weight)",
      emoji: "📏",
      intro: "Length is measured in millimeters, centimeters, meters, and kilometers; weight in grams and kilograms. In this chapter you'll convert between units and solve real-world measurement word problems.",
      mode: "generator",
      generatorKeys: ["measurement"],
      sampleQuestions: [
        { prompt: "Convert: 31 m = ? cm", answer: "3,100 cm" },
        { prompt: "Convert: 5 kg = ? g", answer: "5,000 g" },
        { prompt: "Compare using <, >, or =: 29 kg ___ 29,009 g", answer: "<" }
      ],
      // Word problems + unit-sense questions don't generate believably —
      // kept static, mixed in alongside the generator.
      staticQuestions: [
        {
          prompt: "A city hall building is 16 m tall, with a 2 m flagpole on top. What is the distance from the top of the flagpole to the ground?",
          answer: "18 m"
        },
        {
          prompt: "A dirt road is 169 m long. Workers finished paving 105 m. How much road is NOT paved?",
          answer: "64 m"
        },
        {
          prompt: "A baby giraffe is 180 cm tall. A grown giraffe is 3.2 m taller. What is the height of the grown giraffe, in meters?",
          answer: "5 m"
        },
        {
          prompt: "Grace has 4 pieces of ribbon, each 50 cm long. How much ribbon does she have in total?",
          answer: "200 cm (2 m)"
        },
        {
          prompt: "Ethan is building a 48 m fence and can finish 8 m per day. How many days will it take?",
          answer: "6 days"
        },
        { prompt: "Which unit would you use to weigh an eraser: grams or kilograms?", answer: "Grams" },
        { prompt: "Which unit would you use to weigh a baby: grams or kilograms?", answer: "Kilograms" },
        { prompt: "Which unit would you use to weigh a truck: grams or kilograms?", answer: "Kilograms" },
        { prompt: "Riku weighs 32 kilograms. Express his weight in grams.", answer: "32,000 g" }
      ]
    },
    {
      id: "rounding",
      title: "Rounding Numbers",
      emoji: "🎯",
      intro: "Rounding gives you a quick, 'close enough' number that's easier to work with — useful for estimating totals before you calculate exactly. In this chapter you'll round to the nearest ten, hundred, thousand, and beyond, and use estimation to solve word problems.",
      mode: "generator",
      generatorKeys: ["rounding"],
      sampleQuestions: [
        { prompt: "Round 804 to the nearest ten.", answer: "800" },
        { prompt: "Round 6,288 to the nearest hundred.", answer: "6,300" },
        { prompt: "Round 555,043 to the nearest ten thousand.", answer: "560,000" }
      ],
      // Estimation word problems don't generate believably — kept static,
      // mixed in alongside the generator.
      staticQuestions: [
        {
          prompt: "A candy factory makes 4,930 candy bars a day. About how many in 5 days? (a. 250  b. 2,500  c. 25,000)",
          answer: "c. 25,000"
        },
        {
          prompt: "A restaurant sold 8,416 hamburgers over 7 days. About how many per day? (a. 1,200  b. 120  c. 1,100)",
          answer: "a. 1,200"
        },
        {
          prompt: "952 boxes of salad were made, 761 were sold. About how many are left? (a. 100  b. 200  c. 300)",
          answer: "b. 200"
        },
        {
          prompt: "A coffee shop brewed 1,550 cups using 3 machines. About how many cups per machine? (a. 30  b. 500  c. 350)",
          answer: "b. 500"
        }
      ]
    }
  ]
};

/* ---------------------------------------------------------------------
   Extraction notes — pages that need a human re-check before use:
   - Multiplication ch. (p.22-23, associative property fill-ins): the
     printed blanks didn't line up cleanly with OCR extraction (each
     side should share one matching number) — only the clean
     commutative (p.24) and distributive (p.25) pages made it in above.
   - Measurement ch. (p.41, "Reading scales"): weight values are shown
     as a needle position on a drawn dial, not printed text — needs
     someone to look at the actual image and read the needle for each
     of the 6 scales before those can be turned into questions.
   - Rounding ch. (p.48, "round to the underlined digit"): the PDF
     underlines a specific digit per number to say which place to round
     to, but that underline didn't survive text extraction — needs a
     human look at the image to know which digit is underlined per item.
   ------------------------------------------------------------------- */
