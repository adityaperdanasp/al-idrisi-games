/* =================================================================
   Weekly Report Card — a PRINTABLE (window.print(), no library needed)
   sibling to the in-app Weekly Recap overlay. Recap is designed for
   screenshotting on a phone; this is designed for an actual parent to
   print (or save as PDF via the browser's print dialog) and stick on
   the fridge, so it uses a real page layout with print-specific CSS
   instead of a modal card. Reuses the exact same data Weekly Recap
   already reads (getWeeklyRecap, getTitle, getPlayerLevel) -- zero new
   Firebase writes.
   ================================================================= */

const player = window.AIGPlayer && AIGPlayer.getPlayer();
if (!player || player.role === "parent") {
  document.getElementById("rc-sheet").style.display = "none";
  document.getElementById("rc-print-btn").style.display = "none";
  document.querySelector(".rc-print-hint").style.display = "none";
  document.getElementById("rc-signedout").style.display = "block";
} else {
  loadReportCard();
}

function noteFor(weeklyCorrect, streak) {
  if (weeklyCorrect >= 60) return `Outstanding week! ${weeklyCorrect} correct answers is fantastic focus -- keep it up!`;
  if (weeklyCorrect >= 30) return `Great effort this week with ${weeklyCorrect} correct answers. Consistent practice is really paying off!`;
  if (weeklyCorrect >= 10) return `Nice progress this week! A little more daily practice will help build momentum.`;
  if (streak >= 3) return `Practice volume was light this week, but that ${streak}-day streak shows real dedication -- let's build on it!`;
  return `A quiet week -- let's aim to open BrainBox a little more often next week and see what we can achieve together!`;
}

async function loadReportCard() {
  document.getElementById("rc-name").textContent = player.name;
  document.getElementById("rc-week-of").textContent = `Week of ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;

  if (!window.AIGLeaderboard) return;

  const [recap, title, level] = await Promise.all([
    AIGLeaderboard.getWeeklyRecap(),
    AIGLeaderboard.getTitle(),
    AIGLeaderboard.getPlayerLevel()
  ]);

  if (title) document.getElementById("rc-title-badge").textContent = `${title.emoji} ${title.name}`;
  document.getElementById("rc-stat-level").textContent = level ? level.level : "1";

  if (recap) {
    document.getElementById("rc-stat-correct").textContent = recap.weeklyCorrect;
    document.getElementById("rc-stat-streak").textContent = recap.streak;
    document.getElementById("rc-stat-cards").textContent = `${recap.cardsOwned}/${recap.cardsTotal}`;
    document.getElementById("rc-note-text").textContent = noteFor(recap.weeklyCorrect, recap.streak);
  } else {
    document.getElementById("rc-note-text").textContent = "No activity recorded yet this week -- jump into a game to get started!";
  }
}

document.getElementById("rc-print-btn").addEventListener("click", () => window.print());
