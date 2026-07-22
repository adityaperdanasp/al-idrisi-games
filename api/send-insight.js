// Vercel serverless function — sends an approved parent insight via Resend.
// RESEND_API_KEY lives only here (server-side env var), never in client JS.
// Optional RESEND_FROM env var overrides the sender once a custom domain is
// verified in Resend; falls back to their shared sandbox address otherwise.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { to, studentName, draft } = req.body || {};
  const recipients = (Array.isArray(to) ? to : [to]).filter(e => typeof e === "string" && e.includes("@"));
  if (!recipients.length) {
    res.status(400).json({ error: "Missing or invalid 'to' email address(es)" });
    return;
  }
  if (!draft || typeof draft !== "string") {
    res.status(400).json({ error: "Missing 'draft' text" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: RESEND_API_KEY missing" });
    return;
  }
  const from = process.env.RESEND_FROM || "Al Idrisi Games <onboarding@resend.dev>";

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Progress ${studentName || "anak Anda"} di Al Idrisi Games`,
        text: draft
      })
    });

    const data = await resendRes.json();
    if (!resendRes.ok) {
      res.status(resendRes.status).json({ error: data.message || "Resend API error", details: data });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
