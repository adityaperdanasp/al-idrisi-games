// ONE-OFF admin endpoint -- adds the "sessions" path to the hub's Firebase
// RTDB security rules (needed for the new session-duration tracking in
// leaderboard.js's startSession()). Same pattern as the rest of api/
// (plain fetch, no deps), auth'd the same way api/send-push-reminder.js
// is (CRON_SECRET as a bearer token, reused here rather than adding a new
// env var just for this). Safe to delete once run -- it's not needed
// again unless another top-level RTDB path gets added later.
module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbSecret = process.env.FIREBASE_DATABASE_SECRET;
  if (!dbSecret) {
    res.status(500).json({ error: "Server not configured: FIREBASE_DATABASE_SECRET missing" });
    return;
  }

  const dbUrl = "https://al-idrisi-games-default-rtdb.asia-southeast1.firebasedatabase.app";

  try {
    const rulesRes = await fetch(`${dbUrl}/.settings/rules.json?auth=${dbSecret}`);
    const rulesText = await rulesRes.text();
    if (!rulesRes.ok) {
      res.status(502).json({ error: "Failed to read current rules", detail: rulesText });
      return;
    }
    const rules = JSON.parse(rulesText);

    if (rules.rules && rules.rules.sessions) {
      res.status(200).json({ ok: true, alreadyPresent: true, rules });
      return;
    }

    rules.rules = rules.rules || {};
    rules.rules.sessions = {
      "$playerId": { ".read": true, ".write": true }
    };

    const putRes = await fetch(`${dbUrl}/.settings/rules.json?auth=${dbSecret}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules)
    });
    const putText = await putRes.text();
    if (!putRes.ok) {
      res.status(502).json({ error: "Failed to write updated rules", detail: putText });
      return;
    }

    res.status(200).json({ ok: true, alreadyPresent: false, rules });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
