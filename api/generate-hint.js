// Vercel serverless function — turns one missed question into a short,
// kid-friendly hint via the Claude API (Haiku 4.5), and can continue as a
// short back-and-forth if the kid taps a follow-up ("still confused",
// "give another example", etc.) or types their own question. Shown on
// the post-activity screen in all 4 games (never live mid-question).
//
// ANTHROPIC_API_KEY lives only here (server-side env var), never in
// client JS. If the key is missing or the call fails, the caller just
// hides the hint card — this endpoint failing never blocks the game.
//
// Request body:
//   First call:    { studentName, gameLabel, question, correctAnswer, kidAnswer, topic, topicStats? }
//   Follow-up:     ...same, plus { history: [{role,content},...], followUp: "kid's next message" }
// Response (both cases, same shape so the 3 not-yet-migrated games'
// existing single-shot frontend code keeps working unchanged):
//   { hint: "..." }
const SYSTEM_PROMPT = `You are Bo, a friendly brain-shaped mascot character who tutors kids in BrainBox, an educational game app. You write short, warm, encouraging explanations for a school-age kid who just missed one question.
Tone: like a curious, cheerful friend who LOVES learning (a little brain who gets so excited about ideas it practically drools over them) — not a textbook, and not a generic "AI assistant". Plain English, no markdown, no bullet points, no emoji unless it fits naturally. Don't introduce yourself by name every message — the UI already shows who's talking.
Keep replies SHORT: 1-3 sentences.
On the first message, explain WHY the correct answer is right in a way a kid can picture, using the specific numbers/words given — don't just restate the answer.
If topicStats shows this student has missed this same topic many times before (wrong count much higher than correct, or a history of misses), be extra patient and try a noticeably simpler angle than a one-off explanation would use.
If the student sends a follow-up (asking for another example, another way to explain it, or saying they're still confused), respond directly to what they asked — give a genuinely NEW example or a different angle, don't just repeat the same words back.
Never invent facts beyond what's given. Celebrate effort, not just correctness — a wrong answer is never something to be discouraged about. End on an encouraging note. Use the student's name sparingly (not in every message).`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { studentName, gameLabel, question, correctAnswer, kidAnswer, topic, topicStats, history, followUp } = req.body || {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Missing 'question'" });
    return;
  }
  if (correctAnswer === undefined || correctAnswer === null) {
    res.status(400).json({ error: "Missing 'correctAnswer'" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured: ANTHROPIC_API_KEY missing" });
    return;
  }

  const facts = { gameLabel, question, correctAnswer, kidAnswer: kidAnswer ?? "(no answer / timed out)", topic };
  if (topicStats && (topicStats.correct || topicStats.wrong)) {
    facts.topicStats = {
      correct: topicStats.correct || 0,
      wrong: topicStats.wrong || 0,
      currentCorrectStreak: topicStats.streak || 0
    };
  }

  const messages = [{
    role: "user",
    content: `Student name: ${studentName || "the student"}\nMissed question (JSON):\n${JSON.stringify(facts)}`
  }];
  if (Array.isArray(history)) {
    for (const turn of history) {
      if (turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string") {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
  }
  if (followUp && typeof followUp === "string") {
    messages.push({ role: "user", content: followUp });
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

    const hint = (data.content || []).find(b => b.type === "text")?.text?.trim();
    if (!hint) {
      res.status(502).json({ error: "AI did not return any text" });
      return;
    }
    res.status(200).json({ hint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
