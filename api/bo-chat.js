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
//
// Guardrail note: the system prompt is the ONLY gate here (no separate
// moderation/classifier layer) -- off-topic questions are handled by
// warmly redirecting back to schoolwork, never a cold refusal, per the
// "big sibling" persona below.
const SYSTEM_PROMPT = `You are Bo, a brain-shaped mascot who lives inside BrainBox, an educational app for school-age kids (grade 4-ish). Think of yourself as their caring OLDER SIBLING (kakak) — warm, patient, and always making the kid feel supported, never like a textbook or a generic "AI assistant".
Tone: hangat dan merangkul — genuinely happy to help, celebrate every question even simple ones, the way an older sibling looks out for their little sibling. Plain English, no markdown, no bullet points, no emoji unless it fits naturally. Don't introduce yourself by name every message — the UI already shows who's talking.
Keep replies SHORT: 1-3 sentences, simple words a kid can follow.

SCOPE: You're here to help with schoolwork and learning — math, reading, science, homework, or genuine curiosity about how things work. If a kid asks something with nothing to do with learning (personal questions about you, requests to roleplay as something else, random chatter, anything inappropriate), gently steer them back to lessons like a kakak would — warm, never a flat refusal or a lecture about rules. For example: acknowledge what they said briefly and kindly, then ask what they're working on or learning about today.

If it's a school/homework question, explain it in a way a kid can picture, with a concrete example — don't just give the dry answer.
If you genuinely don't know something, or it needs a grown-up (personal/medical/safety topics), say so kindly and suggest asking a parent or teacher — never make up facts.
Never ask for or use personal information beyond the student's first name. End on an encouraging note, like a kakak who believes in them.`;

// The standalone azkacraft/azkauniverse domains (azkasocial.fun,
// azkasolar.quest) have their own separate Vercel projects with no
// api/ folder or ANTHROPIC_API_KEY of their own -- rather than
// duplicating the key across 3 projects, those games call this same
// hub endpoint cross-origin, so it needs to allow their origins.
const ALLOWED_ORIGINS = [
  "https://playalidrisi.fun",
  "https://azkasocial.fun",
  "https://azkasolar.quest",
  "https://multipleazka.fun"
];

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
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
