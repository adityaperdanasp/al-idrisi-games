// Vercel serverless function — turns raw progress stats into a warm,
// natural-language draft for parents, via the Claude API (Haiku 4.5).
// ANTHROPIC_API_KEY lives only here (server-side env var), never in client JS.
// If the key is missing or the call fails, dashboard.js falls back to its own
// template-based draft — this endpoint failing never blocks the feature.
const SYSTEM_PROMPT = `Kamu menulis ringkasan progress belajar anak untuk orang tua murid SD, dalam Bahasa Indonesia.
Nada: hangat, ringkas, bukan laporan teknis. 3-5 kalimat, satu paragraf, tanpa markdown/bullet.
Sebut aktivitas main game secara singkat, lalu area yang masih perlu latihan di rumah (kalau ada),
lalu apresiasi kalau ada keterlibatan orang tua minggu ini. Kalau tidak ada aktivitas tercatat, katakan itu apa adanya.
Jangan mengarang data yang tidak ada di fakta yang diberikan.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { studentName, facts } = req.body || {};
  if (!studentName || typeof studentName !== "string") {
    res.status(400).json({ error: "Missing 'studentName'" });
    return;
  }
  if (!facts || typeof facts !== "object") {
    res.status(400).json({ error: "Missing 'facts'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY missing" });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Nama murid: ${studentName}\nFakta progress (JSON):\n${JSON.stringify(facts)}`
        }]
      })
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error", details: data });
      return;
    }

    const draft = (data.content || []).find(b => b.type === "text")?.text?.trim();
    if (!draft) {
      res.status(502).json({ error: "AI tidak mengembalikan teks" });
      return;
    }
    res.status(200).json({ draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
