// BrainBox — admin/reporting endpoint: unique players who played on a
// given day (default: yesterday, Asia/Jakarta), for the daily Telegram
// digest. Read-only, no client-facing UI ever calls this.
//
// Reads /leaderboard/{gameId}/{playerId}/lastPlayed via the legacy RTDB
// database secret (?auth= query param) — same auth pattern already
// proven to work in send-push-reminder.js. Do NOT switch this to a
// service-account OAuth2 token: that was tried for reading /pushTokens
// and the RTDB REST API rejected it ("Unauthorized request.") even with
// the correct scope, likely an IAM role gap on this project's service
// account. FIREBASE_SERVICE_ACCOUNT_JSON is for signing FCM sends only,
// unrelated to reading the RTDB.
//
// Auth: header `x-cron-secret: <CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`.
// Query: ?date=YYYY-MM-DD (Asia/Jakarta calendar day; defaults to yesterday).
//
// Response: { date, uniquePlayers, totalPlays, perGame: { [gameId]: { uniquePlayers, totalPlays } } }
const DB_URL = "https://al-idrisi-games-default-rtdb.asia-southeast1.firebasedatabase.app";
const GAME_IDS = ["mathrace", "language-arts", "solarquest", "mathville"];
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function dayBoundsUtcMs(dateStr) {
  // dateStr is a YYYY-MM-DD calendar day in Asia/Jakarta (UTC+7, no DST).
  // Midnight WIB on that date = (that UTC calendar instant) - 7h.
  const startUtc = new Date(`${dateStr}T00:00:00.000Z`).getTime() - WIB_OFFSET_MS;
  const endUtc = startUtc + 24 * 60 * 60 * 1000;
  return [startUtc, endUtc];
}

function yesterdayDateStr() {
  const nowWib = new Date(Date.now() + WIB_OFFSET_MS);
  nowWib.setUTCDate(nowWib.getUTCDate() - 1);
  return nowWib.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers["x-cron-secret"] ||
    (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (cronSecret && headerSecret !== cronSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbSecret = process.env.FIREBASE_DATABASE_SECRET;
  if (!dbSecret) {
    res.status(500).json({ error: "Server not configured: FIREBASE_DATABASE_SECRET missing" });
    return;
  }

  const date = (req.query && req.query.date) || yesterdayDateStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  const [startMs, endMs] = dayBoundsUtcMs(date);

  try {
    const perGame = {};
    const uniquePlayerIds = new Set();
    let totalPlays = 0;

    for (const gameId of GAME_IDS) {
      const r = await fetch(`${DB_URL}/leaderboard/${gameId}.json?auth=${dbSecret}`);
      const data = await r.json();
      if (data && data.error) throw new Error(`Firebase RTDB read failed (${gameId}): ${data.error}`);

      let gameUnique = 0;
      let gamePlays = 0;
      for (const [playerId, entry] of Object.entries(data || {})) {
        const lastPlayed = entry && entry.lastPlayed;
        if (typeof lastPlayed === "number" && lastPlayed >= startMs && lastPlayed < endMs) {
          uniquePlayerIds.add(playerId);
          gameUnique++;
          gamePlays++; // one "last played in range" counts as one play for this report
          totalPlays++;
        }
      }
      perGame[gameId] = { uniquePlayers: gameUnique, totalPlays: gamePlays };
    }

    res.status(200).json({
      date,
      uniquePlayers: uniquePlayerIds.size,
      totalPlays,
      perGame
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
