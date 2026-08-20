// TEMPORARY, ONE-OFF admin endpoint -- adds the "sessions" path to the
// hub's Firebase RTDB security rules (needed for the new session-duration
// tracking in leaderboard.js's startSession()). Guarded by its own
// throwaway ADMIN_ONE_OFF_SECRET env var (not CRON_SECRET -- that one's
// only known server-side, so it can't be supplied from here to trigger a
// manual run). Delete this file + the env var once it's been run once.
module.exports = async (req, res) => {
  const adminSecret = process.env.ADMIN_ONE_OFF_SECRET;
  if (!adminSecret || req.headers["authorization"] !== `Bearer ${adminSecret}`) {
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

    // Same shape as the existing "leaderboard"/"players" rules: readable
    // at the root (so a report tool can pull every player's sessions in
    // one query, not one fetch per known id), write restricted to each
    // player's own subtree.
    rules.rules = rules.rules || {};
    rules.rules.sessions = {
      ".read": true,
      "$playerId": { ".write": true }
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

    res.status(200).json({ ok: true, rules });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
