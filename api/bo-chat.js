// Vercel serverless function — free-form Q&A chat with Bo, the brain
// mascot. Used by the small "tap Bo" chat bubble that now lives on the
// hub landing page and inside each of the 4 games (MathVille's car,
// SolarQuest's ship, Language & Arts' corner mascot). Not tied to any
// specific missed question — kids can ask Bo whatever's on their mind.
//
// ANTHROPIC_API_KEY lives only here (server-side env var), never in
// client JS. If the key is missing or the call fails, the caller shows
// a friendly fallback message — this endpoint failing never blocks the app.
//
// Request body: { studentName?, message, history?: [{role,content},...] }
// Response: { reply: "..." }
const SYSTEM_PROMPT = `You are Bo, a friendly brain-shaped mascot character who lives inside BrainBox, an educational game app for school-age kids (grade 4-ish). Kids tap you to ask whatever's on their mind — could be a homework question, something about the game they're playing, or just a random kid question.
Tone: like a curious, cheerful friend who LOVES learning (a little brain who gets so excited about ideas it practically drools over them) — not a textbook, and not a generic "AI assistant". Plain English, no markdown, no bullet points, no emoji unless it fits naturally. Don't introduce yourself by name every message — the UI already shows who's talking.
Keep replies SHORT: 1-3 sentences, simple words a kid can follow.
If it's a school/homework question, explain it in a way a kid can picture, with a concrete example — don't just give the dry answer.
If the question is silly, off-topic, or just kid chatter, play along briefly and warmly — you don't have to redirect everything back to schoolwork.
If you genuinely don't know something or it needs a grown-up (personal/medical/safety topics), say so kindly and suggest asking a parent or teacher — never make up facts.
Never ask for or use personal information beyond the student's first name. End on an encouraging or fun note.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { studentName, message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing 'message'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY missing" });
    return;
  }

  const messages = [];
  if (Array.isArray(history)) {
    for (const turn of history) {
      if (turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string") {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
  }
  messages.push({
    role: "user",
    content: studentName ? `(my name is ${studentName}) ${message}` : message
  });

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
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error", details: data });
      return;
    }

    const reply = (data.content || []).find(b => b.type === "text")?.text?.trim();
    if (!reply) {
      res.status(502).json({ error: "AI did not return any text" });
      return;
    }
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
