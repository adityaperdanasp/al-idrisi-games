# AzkaSocial — Storybook Language & Arts Quest

A storybook-themed quiz game built for Azka (Grade 4). The 7 chapters follow
the table of contents of *GMS Workbook: Language Arts, Upper Elementary,
Grade 4 Term 1* (Green Montessori School): Spelling, Antonyms, Prefixes and
Suffixes, Contractions, Capitalization and Punctuation, Reading
Comprehension, and Creative Writing.

## File structure

| File | Purpose |
|---|---|
| `index.html` | All screens (landing, multiplayer setup, quest map, sticker book, game, brain rest). Structure only. |
| `style.css` | All styling — Colorful/Pastel themes, Fredoka font, storybook bookshelf UI, page-flip animation, sticker book, Brain Rest cat. |
| `script.js` | Core game logic: theme toggle, chapter progression, localStorage saves, question rendering + rotation, answer correction timing, Brain Rest timer. |
| `firebase.js` | Firebase config + Multiplayer sync (pairing codes, realtime progress). Only loaded/used in Multiplayer mode — Solo mode never touches it. |
| `qrcode.js` | QR code generation (for hosting) and camera-based QR scanning (for joining). |
| `voice.js` | Plays the pre-recorded MP3 clips in `audio/` for praise/encouragement, with an automatic fallback to the browser's SpeechSynthesis API if a clip fails to load. Never calls the ElevenLabs API at runtime. |
| `audio/praise/`, `audio/encourage/` | 20 pre-recorded ElevenLabs MP3 clips each — one is picked at random on every correct/wrong answer. Generated once via `scripts/generate-voice-lines.sh`, so playing them costs zero ElevenLabs credits. |
| `scripts/generate-voice-lines.sh` | One-time (or re-run when you want new lines) script that calls the ElevenLabs API to (re)generate the clips in `audio/`. Not used by the live app, and intentionally **not committed to git** since it holds your API key — it stays on your machine only. |
| `questions.json` | The question bank, organized by chapter, with a large pool per chapter — the game randomly draws 5 questions from that pool each playthrough. |
| `manifest.json` | Web app manifest for "Add to Home Screen". |
| `icons/` | Real generated app icons (192×192, 512×512, apple-touch-icon) + the source SVG they were rendered from. |

## Solo Mode is fully standalone

Solo Mode never calls `firebase.js`, never needs a network connection to a
pairing partner, and never blocks on anything but a local `fetch` of
`questions.json`. All progress (unlocked chapters, stars, XP, stickers) is
saved to `localStorage` under the key `azkacraft-progress`. You can play
Solo entirely offline after the first load — even the voice lines are
local MP3 files, not live API calls.

## Question bank structure (`questions.json`)

```json
{
  "chapters": [
    {
      "id": 1,
      "title": "Correct the Spelling Mistake",
      "topic": "Spelling",
      "snippet": "A short 1-2 sentence fun fact shown + spoken before each question.",
      "stickerId": "sticker-spelling",
      "questions": [ /* a pool of 10+ questions — see types below */ ]
    }
  ]
}
```

Each question has a `"type"` field. Supported types and their shape:

- **`mc`** — `{ type, prompt, options: [...], answer }`
- **`fill`** — `{ type, prompt, answer }` (typed answer, matched case-insensitively, trimmed)
- **`match`** / **`craft-match`** — `{ type, prompt, pairs: [{ left, right }, ...] }`
- **`flashcard`** — `{ type, word, definition, example }` (self-check, no wrong state)
- **`sentence-builder`** — `{ type, prompt, words: [...], answer }` (words are shuffled and shown as tappable chips)

To add real content: open `questions.json`, find the chapter by `id`, and
add to its `questions` array — the more questions in a chapter's pool, the
more variety Azka sees across replays. Chapters run in `id` order and
unlock sequentially as each is completed. Each playthrough, `script.js`
(`pickSessionQuestions`) randomly draws `QUESTIONS_PER_SESSION` (5) questions
from that chapter's full pool, then mixes their types so the same type never
repeats twice in a row.

## Voice lines (praise / encouragement)

The 40 voice clips in `audio/praise/` and `audio/encourage/` are
pre-recorded once with ElevenLabs and shipped as static MP3 files —
`voice.js` just plays a random one on each answer, so **the live app
never calls the ElevenLabs API and never spends credits during play**.

To regenerate them (e.g. to switch voices or update the phrase list):

1. Open `scripts/generate-voice-lines.sh` and edit the `PRAISE` / `ENCOURAGE`
   arrays and/or `VOICE_ID` at the top.
2. Make sure `API_KEY` in that script is a valid ElevenLabs key (free tier
   works, but can only use ElevenLabs' premade voices via the API — custom
   picks from the Voice Library need a paid plan).
3. Run `bash scripts/generate-voice-lines.sh` — it overwrites the MP3s in
   `audio/praise/` and `audio/encourage/`.
4. Commit and deploy as usual. This is the only time the ElevenLabs API is
   ever called.

If a clip somehow fails to load in the browser, `voice.js` automatically
falls back to the browser's built-in SpeechSynthesis voice — the game
never breaks or goes silent.

## Multiplayer / QR join

1. One player picks **Multiplayer Quest → Host a Game**, chooses a chapter,
   and taps **Create Game**. This writes a game record to Firebase Realtime
   Database under `/games/<6-char-code>` and shows the code + a QR code.
2. The other player picks **Multiplayer Quest → Join a Game** and either
   types the 6-character code or taps **Scan QR Instead** to use their
   camera (via `qrcode.js` + the `jsQR` library).
3. The host picks the session's 5 questions once and shares their indices
   through Firebase (`games/<code>/questionIndices`), so both devices race
   the exact same 5 questions in the same order — not two different random
   draws. Each answer updates that player's progress in Firebase
   (`games/<code>/players/<role>`), so you could extend the UI to show a
   live opponent progress bar by reading that same path.
4. **Multiplayer requires a Firebase project** — see the setup comment at
   the top of `firebase.js`. Until you paste in real Firebase config values,
   Multiplayer will show a friendly alert instead of crashing; Solo Mode is
   completely unaffected either way.

## Brain Rest

After finishing every question in a chapter, the game shows a **Brain
Rest** screen: a wiggling cat animation, "Brain Rest!" text in Fredoka,
and a 10-second countdown before automatically returning to the Quest Map.
A **Skip ▶** button lets Azka continue immediately.

## Answer timing (as specified)

- ✅ Correct answer (any question type): green toast + praise phrase + speech, **1.5s** before the next question.
- ❌ Multiple Choice wrong: correct option highlighted green for **5s**, plus a warm phrase naming Azka.
- ❌ Fill-in-the-blank wrong: correct answer shown under the input for **5s**, plus a warm phrase.
- ❌ Matching wrong: correct answer shown on the incorrect row for **7s**, plus a warm phrase.
- Flashcard: self-check only — no wrong state, no special timing (advances 1.5s after "Got it!").

The encouragement toast is a **fixed top banner** (`.encourage-toast` in
`style.css`), positioned outside the question/answer card at all times, so
it never overlaps the correct-answer correction or any interactive
buttons/inputs.

## App icon / "Add to Home Screen"

`icons/icon-192.png`, `icons/icon-512.png`, and `icons/apple-touch-icon.png`
are real rendered PNGs (generated from `icons/icon-source.svg`, a
storybook-themed mascot holding a paintbrush), referenced by `manifest.json`
and the `<link>`/`<meta>` tags in `index.html`. To install on a phone:
open the deployed URL in Safari (iOS) or Chrome (Android), then use
**Share → Add to Home Screen** (iOS) or the **Install app** menu prompt
(Android/Chrome).

## Source material

The question bank in `questions.json` is adapted from *GMS Workbook:
Language Arts, Upper Elementary, Grade 4 Term 1* (Green Montessori School) —
not copy-pasted verbatim, but rewritten into quiz questions that test the
same facts, word lists, and reading passages (Jane Goodall, The Curse of
Cogston House, Aesop's fables, The Ocean, The Bicycle, and more). Each
chapter's pool has 12-23 questions so replays feel fresh.
