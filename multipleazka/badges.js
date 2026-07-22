// Math Race — badge/sticker system.
// Stored at players/{id}/badges/mathrace (same Firebase path pattern the
// other two games already use for cross-device progress), so it follows
// the child between devices automatically via getProgress/setProgress.
(function () {
  const BADGES = [
    { id: "firstRace", icon: "🏁", name: "First Race", desc: "Finish your very first race" },
    { id: "warmUp", icon: "🔥", name: "Warm Up", desc: "Play 5 races" },
    { id: "roadWarrior", icon: "🏆", name: "Road Warrior", desc: "Play 15 races" },
    { id: "perfectRun", icon: "💯", name: "Perfect Run", desc: "Finish a race with zero wrong answers" },
    { id: "speedster", icon: "⚡", name: "Speedster", desc: "Finish a race in under 25 seconds" },
    { id: "champion", icon: "🥇", name: "Champion", desc: "Win 3 races against another player" }
  ];

  const SPEEDSTER_SECONDS = 25;
  const WIN_TARGET = 3;

  // stats: { timesPlayed, perfectRun, finishTimeSec, isWin }
  // Returns { newlyEarned: [badge, ...] } — the badges just unlocked by
  // THIS race, if any (empty array otherwise).
  async function checkAndAward(stats) {
    if (!window.AIGLeaderboard) return { newlyEarned: [] };

    const existing = (await AIGLeaderboard.getProgress("mathrace")) || {};
    const badges = { ...(existing.badges || {}) };
    const wins = (existing.wins || 0) + (stats.isWin ? 1 : 0);

    const newlyEarned = [];
    function award(id) {
      if (badges[id]) return;
      badges[id] = { earned: true, earnedAt: Date.now() };
      const def = BADGES.find(b => b.id === id);
      if (def) newlyEarned.push(def);
    }

    if (stats.timesPlayed >= 1) award("firstRace");
    if (stats.timesPlayed >= 5) award("warmUp");
    if (stats.timesPlayed >= 15) award("roadWarrior");
    if (stats.perfectRun) award("perfectRun");
    if (stats.finishTimeSec > 0 && stats.finishTimeSec <= SPEEDSTER_SECONDS) award("speedster");
    if (wins >= WIN_TARGET) award("champion");

    await AIGLeaderboard.setProgress("mathrace", { ...existing, badges, wins });
    return { newlyEarned };
  }

  // For the Sticker Book screen — plain read, no side effects.
  async function getEarned() {
    if (!window.AIGLeaderboard) return {};
    const existing = await AIGLeaderboard.getProgress("mathrace");
    return (existing && existing.badges) || {};
  }

  window.AIGBadges = { BADGES, checkAndAward, getEarned };
})();
