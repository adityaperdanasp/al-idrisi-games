// BrainBox — Vercel Cron: daily "players yesterday" digest, pushed
// straight to Telegram. Runs server-side only (schedule in vercel.json,
// 0 0 * * * UTC = 07:00 WIB) — nothing external ever needs to hold a
// credential to pull this data. Replaces the earlier plan of handing a
// PLAYER_COUNT_SECRET to a third-party bot: that bot now just reads the
// message Telegram delivers to the chat, same as any other message.
//
// Reuses the same read logic as api/admin/player-count.js (kept as a
// separate manual/on-demand endpoint for ad-hoc checks) — both read
// /leaderboard via FIREBASE_DATABASE_SECRET (?auth= query param), the
// proven-working auth pattern for this project's RTDB (a service-account
// OAuth2 token was tried first for a similar read in
// send-push-reminder.js and got rejected — see that file's comments).
//
// Env vars (Vercel dashboard only):
//   FIREBASE_DATABASE_SECRET — legacy RTDB secret (same as other api/ files)
//   CRON_SECRET              — matched against the Authorization header Vercel Cron sends
//   TELEGRAM_BOT_TOKEN       — BotFather token for the bot posting this digest
//   TELEGRAM_CHAT_ID         — chat/group to post the digest into
const DB_URL = "https://al-idrisi-games-default-rtdb.asia-southeast1.firebasedatabase.app";
const GAME_IDS = ["mathrace", "language-arts", "solarquest", "mathville"];
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function dayBoundsUtcMs(dateStr) {
  const startUtc = new Date(`${dateStr}T00:00:00.000Z`).getTime() - WIB_OFFSET_MS;
  const endUtc = startUtc + 24 * 60 * 60 * 1000;
  return [startUtc, endUtc];
}

function yesterdayDateStr() {
  const nowWib = new Date(Date.now() + WIB_OFFSET_MS);
  nowWib.setUTCDate(nowWib.getUTCDate() - 1);
  return nowWib.toISOString().slice(0, 10);
}

async function countYesterday(dbSecret, date) {
  const [startMs, endMs] = dayBoundsUtcMs(date);
  const perGame = {};
  const uniquePlayerIds = new Set();
  let totalPlays = 0;

  for (const gameId of GAME_IDS) {
    const r = await fetch(`${DB_URL}/leaderboard/${gameId}.json?auth=${dbSecret}`);
    const data = await r.json();
    if (data && data.error) throw new Error(`Firebase RTDB read failed (${gameId}): ${data.error}`);

    let gameUnique = 0;
    for (const [playerId, entry] of Object.entries(data || {})) {
      const lastPlayed = entry && entry.lastPlayed;
      if (typeof lastPlayed === "number" && lastPlayed >= startMs && lastPlayed < endMs) {
        uniquePlayerIds.add(playerId);
        gameUnique++;
        totalPlays++;
      }
    }
    perGame[gameId] = gameUnique;
  }
  return { date, uniquePlayers: uniquePlayerIds.size, totalPlays, perGame };
}

function formatMessage({ date, uniquePlayers, totalPlays, perGame }) {
  const breakdown = Object.entries(perGame)
    .filter(([, count]) => count > 0)
    .map(([gameId, count]) => `${gameId}: ${count}`)
    .join(" • ");
  let msg = `📊 ${date} — BrainBox: ${uniquePlayers} player unik, ${totalPlays} sesi`;
  if (breakdown) msg += `\n(${breakdown})`;
  return msg;
}

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.description || "Telegram send failed");
  return data;
}

module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbSecret = process.env.FIREBASE_DATABASE_SECRET;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!dbSecret || !botToken || !chatId) {
    res.status(500).json({ error: "Server not configured: missing FIREBASE_DATABASE_SECRET / TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID" });
    return;
  }

  const date = (req.query && req.query.date) || yesterdayDateStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  try {
    const stats = await countYesterday(dbSecret, date);
    const text = formatMessage(stats);
    await sendTelegram(botToken, chatId, text);
    res.status(200).json({ ok: true, sent: text, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
