// Vercel Cron endpoint — daily "come play BrainBox" push reminder.
// Runs on the schedule in vercel.json (20:00 WIB / 13:00 UTC), broadcasts
// to every device token stored at /pushTokens in the hub's Firebase RTDB
// (written by index.html when the native Android app registers for push).
//
// FCM's legacy HTTP API is deprecated, so this signs its own short-lived
// OAuth2 JWT from the service account (Node's built-in `crypto`, no
// firebase-admin/npm dependency needed — matches the rest of this repo's
// api/ functions, which are all plain fetch-based) and calls the current
// FCM HTTP v1 API directly.
//
// Env vars (Vercel dashboard only, never committed):
//   FIREBASE_SERVICE_ACCOUNT_JSON — the full service-account JSON, as one string
//   CRON_SECRET — matched against the Authorization header Vercel Cron sends
const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(serviceAccount) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${unsigned}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = signJwt(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Failed to get FCM access token");
  return data.access_token;
}

module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    res.status(500).json({ error: "Server not configured: FIREBASE_SERVICE_ACCOUNT_JSON missing" });
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    res.status(500).json({ error: "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON" });
    return;
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);

    const dbUrl = "https://al-idrisi-games-default-rtdb.asia-southeast1.firebasedatabase.app";
    const tokensRes = await fetch(`${dbUrl}/pushTokens.json`);
    const tokensData = await tokensRes.json();
    const entries = Object.values(tokensData || {}).filter(e => e && e.token);

    let sent = 0;
    let failed = 0;
    for (const entry of entries) {
      const sendRes = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              token: entry.token,
              notification: {
                title: "BrainBox",
                body: "Yuk main BrainBox hari ini! 🧠🎮"
              }
            }
          })
        }
      );
      if (sendRes.ok) sent++;
      else failed++;
    }

    res.status(200).json({ ok: true, sent, failed, total: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
