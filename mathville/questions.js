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
        },
        {
          prompt: "Sarah collected 234 stickers. Her friend gave her 178 more. How many stickers does she have now?",
          answer: "412"
        },
        {
          prompt: "A farmer had 560 chickens. He sold 245 of them. How many chickens are left?",
          answer: "315"
        },
        {
          prompt: "A library had 3,450 books. They received a donation of 1,275 more books. How many books does the library have now?",
          answer: "4,725"
        },
        {
          prompt: "A movie theater has 850 seats. 612 seats are taken. How many seats are empty?",
          answer: "238"
        },
        {
          prompt: "A shop had 1,200 candies. They sold 450 in the morning and 380 in the afternoon. How many candies are left?",
          answer: "370"
        },
        {
          prompt: "There are 1,542 red marbles and 987 blue marbles in a jar. How many marbles are there in total?",
          answer: "2,529"
        },
        {
          prompt: "A school has 2,300 students. 1,875 are in the elementary section. How many students are in other sections?",
          answer: "425"
        },
        {
          prompt: "A baker made 328 cookies on Monday and 415 on Tuesday. How many cookies did she make in total?",
          answer: "743"
        },
        {
          prompt: "A zoo has 640 animals. 128 of them are birds. How many animals are not birds?",
          answer: "512"
        },
        {
          prompt: "A train had 480 passengers. At the first stop, 95 got off and 60 got on. How many passengers are on the train now?",
          answer: "445"
        },
        {
          prompt: "A farmer planted 2,150 corn seeds and 1,890 wheat seeds. How many seeds did he plant in total?",
          answer: "4,040"
        },
        {
          prompt: "A stadium can hold 15,000 people. 11,342 tickets have been sold. How many tickets are left?",
          answer: "3,658"
        },
        {
          prompt: "A toy store sold 156 toy cars and 289 toy trains this month. How many toys did they sell in total?",
          answer: "445"
        },
        {
          prompt: "Emma had 540 dollars saved. She spent 215 dollars on a new bicycle. How much money does she have left?",
          answer: "325"
        },
        {
          prompt: "A garden had 320 flowers. 85 wilted and the gardener planted 140 new ones. How many flowers are in the garden now?",
          answer: "375"
        },
        {
          prompt: "A school collected 1,320 kg of paper and 875 kg of plastic for recycling. How many kilograms did they collect in total?",
          answer: "2,195"
        },
        {
          prompt: "A bakery had 900 loaves of bread. They sold 634 loaves by noon. How many loaves are left?",
          answer: "266"
        },
        {
          prompt: "There were 4,215 fans at the football game and 3,680 fans at the basketball game. How many fans attended both games combined?",
          answer: "7,895"
        },
        {
          prompt: "A parking lot has 750 spaces. 528 cars are currently parked. How many spaces are empty?",
          answer: "222"
        },
        {
          prompt: "A library had 6,500 books. They gave away 1,200 old books and bought 950 new ones. How many books does the library have now?",
          answer: "6,250"
        },
        {
          prompt: "A farmer harvested 1,864 apples and 2,047 oranges. How many pieces of fruit did he harvest in total?",
          answer: "3,911"
        },
        {
          prompt: "A company had 3,200 employees. 468 of them retired this year. How many employees remain?",
          answer: "2,732"
        },
        {
          prompt: "A classroom has 24 boys and 28 girls. How many students are there in total?",
          answer: "52"
        },
        {
          prompt: "A jar had 500 jellybeans. Tom ate 145 of them. How many jellybeans are left?",
          answer: "355"
        },
        {
          prompt: "A theater sold 380 tickets for the morning show and 295 for the afternoon show, but 60 people didn't show up. How many people actually watched the show?",
          answer: "615"
        },
        {
          prompt: "A bookstore has 1,675 fiction books and 1,340 non-fiction books. How many books are there in total?",
          answer: "3,015"
        },
        {
          prompt: "A water tank holds 8,000 liters. 3,250 liters have been used. How many liters are left?",
          answer: "4,750"
        },
        {
          prompt: "A soccer team scored 3 goals in the first half and 2 goals in the second half. How many goals did they score in total?",
          answer: "5"
        },
        {
          prompt: "A plane was flying at 35,000 feet. It descended 12,500 feet. What is its new altitude, in feet?",
          answer: "22,500"
        },
        {
          prompt: "A store had 2,400 shirts. They sold 890 shirts and received a new shipment of 650 shirts. How many shirts does the store have now?",
          answer: "2,160"
        },
        {
          prompt: "A charity collected 12,450 dollars in the first week and 9,875 dollars in the second week. How much money did they collect in total?",
          answer: "22,325"
        },
        {
          prompt: "A road trip is 1,250 km long. The family has already driven 780 km. How many kilometers are left?",
          answer: "470"
        },
        {
          prompt: "A farm has 342 cows and 518 sheep. How many animals are there in total?",
          answer: "860"
        },
        {
          prompt: "A video game has 1,000 coins to collect. A player has collected 645 coins. How many coins are left to collect?",
          answer: "355"
        },
        {
          prompt: "A concert hall has 5,000 seats. 3,200 tickets were sold, then 450 people canceled their tickets. How many tickets are now available?",
          answer: "2,250"
        },
        {
          prompt: "A pet shop has 89 goldfish and 156 guppies. How many fish are there in total?",
          answer: "245"
        },
        {
          prompt: "A mountain is 4,800 meters tall. A hiker has climbed 2,975 meters. How many more meters does she need to climb?",
          answer: "1,825"
        },
        {
          prompt: "A publisher printed 6,340 copies of one book and 4,215 copies of another. How many books did they print in total?",
          answer: "10,555"
        },
        {
          prompt: "A warehouse has 9,600 boxes. 4,380 boxes were shipped out. How many boxes remain?",
          answer: "5,220"
        },
        {
          prompt: "A school had 850 students. 65 students transferred out and 92 new students enrolled. How many students are there now?",
          answer: "877"
        },
        {
          prompt: "A carnival sold 720 popcorn boxes and 615 cotton candy sticks. How many items did they sell in total?",
          answer: "1,335"
        },
        {
          prompt: "An orchard had 5,400 apple trees. A storm destroyed 1,250 of them. How many trees are left?",
          answer: "4,150"
        },
        {
          prompt: "A museum had 2,180 visitors on Saturday and 1,945 visitors on Sunday. How many visitors came over the weekend?",
          answer: "4,125"
        },
        {
          prompt: "A cyclist plans to ride 340 km this month. So far, she has ridden 215 km. How many kilometers does she have left to ride?",
          answer: "125"
        },
        {
          prompt: "A store had 1,600 books. They donated 340 books to a school and received 275 new books. How many books does the store have now?",
          answer: "1,535"
        },
        {
          prompt: "A choir has 45 sopranos and 38 altos. How many singers are there in total?",
          answer: "83"
        },
        {
          prompt: "A company had a budget of 50,000 dollars. They spent 32,450 dollars on new equipment. How much money is left in the budget?",
          answer: "17,550"
        },
        {
          prompt: "A fisherman caught 128 fish on Monday and 96 fish on Tuesday. How many fish did he catch in total?",
          answer: "224"
        },
        {
          prompt: "A theater has 1,850 seats. During a show, 1,432 seats are occupied. How many seats are empty?",
          answer: "418"
        },
        {
          prompt: "A bakery started with 2,000 donuts. They sold 875 in the morning, then baked 420 more in the afternoon. How many donuts do they have now?",
          answer: "1,545"
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
        { prompt: "Find the prime factorization of 144.", answer: "2 × 2 × 2 × 2 × 3 × 3" },
        {
          prompt: "Look at the factor tree for 60. What number belongs in the box with the question mark?",
          answer: "5",
          image: "<svg viewBox='0 0 260 220' xmlns='http://www.w3.org/2000/svg'><line x1='130' y1='30' x2='70' y2='95' stroke='#C1793E' stroke-width='3'/><line x1='130' y1='30' x2='190' y2='95' stroke='#C1793E' stroke-width='3'/><circle cx='130' cy='30' r='26' fill='#E4572E' stroke='#3B2A1A' stroke-width='2.5'/><text x='130' y='31' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>60</text><circle cx='70' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='70' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>6</text><circle cx='190' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='190' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>10</text><line x1='70' y1='95' x2='35' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='70' y1='95' x2='105' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='35' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='35' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><circle cx='105' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='105' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><line x1='190' y1='95' x2='155' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='190' y1='95' x2='225' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='155' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='155' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><circle cx='225' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='225' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>?</text></svg>"
        },
        {
          prompt: "Look at the factor tree for 84. What number belongs in the box with the question mark?",
          answer: "7",
          image: "<svg viewBox='0 0 260 220' xmlns='http://www.w3.org/2000/svg'><line x1='130' y1='30' x2='70' y2='95' stroke='#C1793E' stroke-width='3'/><line x1='130' y1='30' x2='190' y2='95' stroke='#C1793E' stroke-width='3'/><circle cx='130' cy='30' r='26' fill='#E4572E' stroke='#3B2A1A' stroke-width='2.5'/><text x='130' y='31' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>84</text><circle cx='70' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='70' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>4</text><circle cx='190' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='190' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>21</text><line x1='70' y1='95' x2='35' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='70' y1='95' x2='105' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='35' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='35' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><circle cx='105' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='105' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><line x1='190' y1='95' x2='155' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='190' y1='95' x2='225' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='155' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='155' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><circle cx='225' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='225' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>?</text></svg>"
        },
        {
          prompt: "Look at the factor tree for 36. What number belongs in the box with the question mark?",
          answer: "4",
          image: "<svg viewBox='0 0 260 220' xmlns='http://www.w3.org/2000/svg'><line x1='130' y1='30' x2='70' y2='95' stroke='#C1793E' stroke-width='3'/><line x1='130' y1='30' x2='190' y2='95' stroke='#C1793E' stroke-width='3'/><circle cx='130' cy='30' r='26' fill='#E4572E' stroke='#3B2A1A' stroke-width='2.5'/><text x='130' y='31' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>36</text><circle cx='70' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='70' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>?</text><circle cx='190' cy='95' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='190' y='96' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>9</text><line x1='70' y1='95' x2='35' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='70' y1='95' x2='105' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='35' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='35' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><circle cx='105' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='105' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><line x1='190' y1='95' x2='155' y2='165' stroke='#C1793E' stroke-width='3'/><line x1='190' y1='95' x2='225' y2='165' stroke='#C1793E' stroke-width='3'/><circle cx='155' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='155' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><circle cx='225' cy='165' r='22' fill='#F7C548' stroke='#3B2A1A' stroke-width='2.5'/><text x='225' y='166' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text></svg>"
        }
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
        },
        {
          prompt: "Fill in the blank using the associative property: (3 × 4) × 5 = 3 × (4 × __)",
          answer: "5",
          image: "<svg viewBox='0 0 260 100' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='256' height='96' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='40' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><text x='80' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='120' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>4</text><text x='160' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='200' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>5</text><rect x='22' y='20' width='116' height='40' rx='10' fill='none' stroke='#E4572E' stroke-width='3' stroke-dasharray='5 4'/><text x='130' y='80' font-size='12' font-weight='700' fill='#C1793E' text-anchor='middle' dominant-baseline='middle'>solve inside the box first</text></svg>"
        },
        {
          prompt: "Fill in the blank using the associative property: 2 × (6 × 5) = (2 × __) × 5",
          answer: "6",
          image: "<svg viewBox='0 0 260 100' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='256' height='96' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='40' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><text x='80' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='120' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>6</text><text x='160' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='200' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>5</text><rect x='102' y='20' width='116' height='40' rx='10' fill='none' stroke='#E4572E' stroke-width='3' stroke-dasharray='5 4'/><text x='130' y='80' font-size='12' font-weight='700' fill='#C1793E' text-anchor='middle' dominant-baseline='middle'>solve inside the box first</text></svg>"
        },
        {
          prompt: "Fill in the blank using the associative property: (7 × 2) × 3 = 7 × (__ × 3)",
          answer: "2",
          image: "<svg viewBox='0 0 260 100' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='256' height='96' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='40' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>7</text><text x='80' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='120' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><text x='160' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>×</text><text x='200' y='40' font-size='22' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><rect x='22' y='20' width='116' height='40' rx='10' fill='none' stroke='#E4572E' stroke-width='3' stroke-dasharray='5 4'/><text x='130' y='80' font-size='12' font-weight='700' fill='#C1793E' text-anchor='middle' dominant-baseline='middle'>solve inside the box first</text></svg>"
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
        { prompt: "Which numbers is 113 divisible by: 2, 3, 5, 9, 10?", answer: "None of them" },
        {
          prompt: "Look at the worked example: is 90 divisible by 2, 3, 5, 9, and 10?",
          answer: "Yes to all — 90 is divisible by 2, 3, 5, 9, and 10",
          skipInRound: true,
          image: "<svg viewBox='0 0 280 90' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='276' height='86' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='30' y='30' font-size='16' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>90</text><text x='77.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;2</text><text x='77.0' y='55' font-size='20' font-weight='800' fill='#2E7D32' text-anchor='middle' dominant-baseline='middle'>&#10003;</text><line x1='55' y1='5' x2='55' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='121.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;3</text><text x='121.0' y='55' font-size='20' font-weight='800' fill='#2E7D32' text-anchor='middle' dominant-baseline='middle'>&#10003;</text><line x1='99' y1='5' x2='99' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='165.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;5</text><text x='165.0' y='55' font-size='20' font-weight='800' fill='#2E7D32' text-anchor='middle' dominant-baseline='middle'>&#10003;</text><line x1='143' y1='5' x2='143' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='209.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;9</text><text x='209.0' y='55' font-size='20' font-weight='800' fill='#2E7D32' text-anchor='middle' dominant-baseline='middle'>&#10003;</text><line x1='187' y1='5' x2='187' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='253.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;10</text><text x='253.0' y='55' font-size='20' font-weight='800' fill='#2E7D32' text-anchor='middle' dominant-baseline='middle'>&#10003;</text><line x1='231' y1='5' x2='231' y2='85' stroke='#D8C7AE' stroke-width='2'/></svg>"
        },
        {
          prompt: "Using the same divisibility rules, which numbers is 150 divisible by: 2, 3, 5, 9, 10?",
          answer: "2, 3, 5, 10",
          image: "<svg viewBox='0 0 280 90' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='276' height='86' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='30' y='45' font-size='18' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>150</text><text x='77.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;2</text><circle cx='77.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='55' y1='5' x2='55' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='121.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;3</text><circle cx='121.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='99' y1='5' x2='99' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='165.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;5</text><circle cx='165.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='143' y1='5' x2='143' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='209.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;9</text><circle cx='209.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='187' y1='5' x2='187' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='253.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;10</text><circle cx='253.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='231' y1='5' x2='231' y2='85' stroke='#D8C7AE' stroke-width='2'/></svg>"
        },
        {
          prompt: "Using the same divisibility rules, which numbers is 225 divisible by: 2, 3, 5, 9, 10?",
          answer: "3, 5, 9",
          image: "<svg viewBox='0 0 280 90' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' width='276' height='86' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><text x='30' y='45' font-size='18' font-weight='800' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>225</text><text x='77.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;2</text><circle cx='77.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='55' y1='5' x2='55' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='121.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;3</text><circle cx='121.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='99' y1='5' x2='99' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='165.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;5</text><circle cx='165.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='143' y1='5' x2='143' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='209.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;9</text><circle cx='209.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='187' y1='5' x2='187' y2='85' stroke='#D8C7AE' stroke-width='2'/><text x='253.0' y='20' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>&#247;10</text><circle cx='253.0' cy='55' r='11' fill='none' stroke='#C1793E' stroke-width='2' stroke-dasharray='3 3'/><line x1='231' y1='5' x2='231' y2='85' stroke='#D8C7AE' stroke-width='2'/></svg>"
        }
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
          answer: "14",
          image: "<svg viewBox='0 0 260 120' xmlns='http://www.w3.org/2000/svg'><rect x='10' y='30' width='240' height='80' rx='10' fill='#F7EEE0' stroke='#C1793E' stroke-width='3'/><rect x='115' y='10' width='30' height='30' rx='6' fill='#E4572E'/><rect x='125' y='18' width='10' height='14' fill='#F7EEE0'/><rect x='118' y='22' width='24' height='6' fill='#F7EEE0'/><circle cx='35' cy='58' r='12' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><path d='M 19 92 Q 35 68 51 92 Z' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><circle cx='70' cy='58' r='12' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><path d='M 54 92 Q 70 68 86 92 Z' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><circle cx='105' cy='58' r='12' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><path d='M 89 92 Q 105 68 121 92 Z' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><circle cx='140' cy='58' r='12' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><path d='M 124 92 Q 140 68 156 92 Z' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/><circle cx='170' cy='58' r='12' fill='#D8C7AE' stroke='#3B2A1A' stroke-width='2'/><path d='M 154 92 Q 170 68 186 92 Z' fill='#D8C7AE' stroke='#3B2A1A' stroke-width='2'/><circle cx='195' cy='58' r='12' fill='#D8C7AE' stroke='#3B2A1A' stroke-width='2'/><path d='M 179 92 Q 195 68 211 92 Z' fill='#D8C7AE' stroke='#3B2A1A' stroke-width='2'/><circle cx='225' cy='58' r='12' fill='#C1793E' stroke='#3B2A1A' stroke-width='2'/><path d='M 209 92 Q 225 68 241 92 Z' fill='#C1793E' stroke='#3B2A1A' stroke-width='2'/><text x='35' y='108' font-size='9' font-weight='700' fill='#3B2A1A' text-anchor='middle'>doctors</text><text x='182' y='108' font-size='9' font-weight='700' fill='#3B2A1A' text-anchor='middle'>nurses</text><text x='225' y='108' font-size='8' font-weight='700' fill='#3B2A1A' text-anchor='middle'>desk</text></svg>"
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
        { prompt: "Riku weighs 32 kilograms. Express his weight in grams.", answer: "32,000 g" },
        {
          prompt: "A bag of rice sits on this scale. What is its weight, in kilograms?",
          answer: "6 kg",
          image: "<svg viewBox='0 0 220 150' xmlns='http://www.w3.org/2000/svg'><path d='M 15.0 125.0 A 95 95 0 0 1 205.0 125.0' fill='none' stroke='#3B2A1A' stroke-width='4' stroke-linecap='round'/><line x1='15.0' y1='125.0' x2='28.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='42.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>0</text><line x1='33.1' y1='69.2' x2='43.7' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='55.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><line x1='80.6' y1='34.6' x2='84.7' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='89.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>4</text><line x1='139.4' y1='34.6' x2='135.3' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='131.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>6</text><line x1='186.9' y1='69.2' x2='176.3' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='165.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>8</text><line x1='205.0' y1='125.0' x2='192.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='178.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>10</text><rect x='20' y='125' width='180' height='14' rx='4' fill='#C1793E'/><text x='110' y='136' font-size='10' font-weight='700' fill='#F7EEE0' text-anchor='middle' dominant-baseline='middle'>kg</text><line x1='110' y1='125' x2='134.1' y2='50.8' stroke='#E4572E' stroke-width='5' stroke-linecap='round'/><circle cx='110' cy='125' r='9' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/></svg>"
        },
        {
          prompt: "A watermelon is placed on this scale. What is its weight, in kilograms?",
          answer: "8 kg",
          image: "<svg viewBox='0 0 220 150' xmlns='http://www.w3.org/2000/svg'><path d='M 15.0 125.0 A 95 95 0 0 1 205.0 125.0' fill='none' stroke='#3B2A1A' stroke-width='4' stroke-linecap='round'/><line x1='15.0' y1='125.0' x2='28.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='42.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>0</text><line x1='33.1' y1='69.2' x2='43.7' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='55.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><line x1='80.6' y1='34.6' x2='84.7' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='89.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>4</text><line x1='139.4' y1='34.6' x2='135.3' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='131.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>6</text><line x1='186.9' y1='69.2' x2='176.3' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='165.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>8</text><line x1='205.0' y1='125.0' x2='192.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='178.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>10</text><rect x='20' y='125' width='180' height='14' rx='4' fill='#C1793E'/><text x='110' y='136' font-size='10' font-weight='700' fill='#F7EEE0' text-anchor='middle' dominant-baseline='middle'>kg</text><line x1='110' y1='125' x2='173.1' y2='79.2' stroke='#E4572E' stroke-width='5' stroke-linecap='round'/><circle cx='110' cy='125' r='9' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/></svg>"
        },
        {
          prompt: "A letter is weighed on this kitchen scale before mailing. What is its weight, in grams?",
          answer: "70 g",
          image: "<svg viewBox='0 0 220 150' xmlns='http://www.w3.org/2000/svg'><path d='M 15.0 125.0 A 95 95 0 0 1 205.0 125.0' fill='none' stroke='#3B2A1A' stroke-width='4' stroke-linecap='round'/><line x1='15.0' y1='125.0' x2='28.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='42.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>0</text><line x1='33.1' y1='69.2' x2='43.7' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='55.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>20</text><line x1='80.6' y1='34.6' x2='84.7' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='89.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>40</text><line x1='139.4' y1='34.6' x2='135.3' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='131.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>60</text><line x1='186.9' y1='69.2' x2='176.3' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='165.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>80</text><line x1='205.0' y1='125.0' x2='192.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='178.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>100</text><rect x='20' y='125' width='180' height='14' rx='4' fill='#C1793E'/><text x='110' y='136' font-size='10' font-weight='700' fill='#F7EEE0' text-anchor='middle' dominant-baseline='middle'>g</text><line x1='110' y1='125' x2='155.8' y2='61.9' stroke='#E4572E' stroke-width='5' stroke-linecap='round'/><circle cx='110' cy='125' r='9' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/></svg>"
        },
        {
          prompt: "A suitcase is weighed at the airport check-in counter. What is its weight, in kilograms?",
          answer: "4 kg",
          image: "<svg viewBox='0 0 220 150' xmlns='http://www.w3.org/2000/svg'><path d='M 15.0 125.0 A 95 95 0 0 1 205.0 125.0' fill='none' stroke='#3B2A1A' stroke-width='4' stroke-linecap='round'/><line x1='15.0' y1='125.0' x2='28.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='42.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>0</text><line x1='33.1' y1='69.2' x2='43.7' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='55.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>1</text><line x1='80.6' y1='34.6' x2='84.7' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='89.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>2</text><line x1='139.4' y1='34.6' x2='135.3' y2='47.0' stroke='#3B2A1A' stroke-width='3'/><text x='131.0' y='60.3' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>3</text><line x1='186.9' y1='69.2' x2='176.3' y2='76.8' stroke='#3B2A1A' stroke-width='3'/><text x='165.0' y='85.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>4</text><line x1='205.0' y1='125.0' x2='192.0' y2='125.0' stroke='#3B2A1A' stroke-width='3'/><text x='178.0' y='125.0' font-size='12' font-weight='700' fill='#3B2A1A' text-anchor='middle' dominant-baseline='middle'>5</text><rect x='20' y='125' width='180' height='14' rx='4' fill='#C1793E'/><text x='110' y='136' font-size='10' font-weight='700' fill='#F7EEE0' text-anchor='middle' dominant-baseline='middle'>kg</text><line x1='110' y1='125' x2='173.1' y2='79.2' stroke='#E4572E' stroke-width='5' stroke-linecap='round'/><circle cx='110' cy='125' r='9' fill='#F7C548' stroke='#3B2A1A' stroke-width='2'/></svg>"
        }
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
