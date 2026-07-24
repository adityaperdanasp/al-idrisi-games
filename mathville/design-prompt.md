# Design prompt for MathVille (paste into Claude Design)

I'm building an educational math game called **MathVille** for my child's Grade 4 class (~26 students, ~9-10 years old, Indonesian school). It joins two sibling games already live at a shared hub:
- **SolarQuest** — AI space adventure, chapter-map structure, cosmic/space visual theme
- **Language & Arts** — storybook-style lessons, magical-book visual theme

MathVille needs its own distinct visual identity but should feel like part of the same family (playful, warm, kid-friendly, not corporate/dry).

## Structure
A chapter-map game (like SolarQuest), NOT a race. 9 chapters, in this fixed order:
1. Place Value (Hundred to Million)
2. Addition & Subtraction
3. Prime Numbers (Multiples and Factoring)
4. GCF & LCM
5. Multiplication
6. Division
7. Mixed Operation
8. Measurement (Length & Weight)
9. Rounding Numbers

Each chapter: intro/reading screen (explains the topic before questions start) → a round of questions → reward/stars screen.

## What I need designed
1. **Overall visual theme** — since the name is "MathVille" (a "ville" = little town/village), propose 2-3 concrical directions built around that idea — e.g. a cozy town map where each chapter is a different building/shop (bakery, market, clock tower, etc.), or a similar small-world concept. Should NOT reuse space or storybook themes (those are taken by the sibling games).
2. **Color palette** — distinct from SolarQuest (blues/purples/cosmic) and Language & Arts (warm orange/storybook), but same overall polish level and playfulness for a Grade 4 audience.
3. **Mascot / host character** — a friendly character (or animal) who introduces each chapter's intro text, similar role to a tour guide.
4. **Hub card thumbnail** — the icon/card that represents MathVille on the shared hub's game-selection screen, alongside the SolarQuest and Language & Arts cards.
5. **Chapter map screen** — a visual layout showing all 9 chapters as stops/locations the child progresses through, with clear locked/unlocked/completed states.
6. **Per-chapter iconography** — a distinct small icon per chapter fitting the theme (e.g. for Prime Numbers a factor-tree motif, for Measurement a ruler/scale motif, for Rounding a target/rounding-arrow motif, etc.)
7. **Question-screen components** for THREE interaction types (these need to look distinct from plain multiple-choice buttons):
   - **Drag-line matching**: two columns of items, child drags a line connecting a left item to its matching right item.
   - **Tap-the-correct-spot in a diagram**: e.g. tapping the correct part of a shape, or the correct point on a number line.
   - **Standard fill-in/multiple-choice**: same family styling as the two above, for chapters where computation doesn't visualize well (e.g. long division).
8. **Reward/stars screen** — consistent with the existing "AI Tutor" hint card pattern used in the sibling games (a small card that shows a personalized hint after a wrong answer).

## Constraints
- Must work well on both mobile and desktop browsers (kids play on phones/tablets and a classroom projector/laptop).
- Keep it simple enough to implement in plain HTML/CSS/JS (no game engine) — think "nicely illustrated web app," not a full 2D game engine art pipeline.
- Accessible color contrast, large tap targets for young kids.

## Existing design system (for consistency)
The hub and all 3 sibling games currently use:
- **Fonts**: "Fredoka" for in-game UI in all 3 games (SolarQuest, Language & Arts, Math Race); the hub's own landing page uses "Nunito" (body) + "Baloo 2" (headings). Please keep using **Fredoka** for MathVille's UI so it feels like the same family of games, unless you have a strong reason to deviate.
- **Colors**: each game has its own distinct palette — SolarQuest uses a cosmic dark-purple/navy gradient (`#0b0f2e → #1b1464 → #3a1b6e`) with orange/pink/yellow accents (`#ff9f1c`, `#ff5d8f`, `#ffd93d`); Math Race uses a dark navy theme (`#0f1b2d` background, `#16233a` text); Language & Arts cycles through several warm accent presets (orange `#FFB35C`, green `#22B573`, blue `#2F6FED`, etc.). **MathVille's palette should be new and distinct from all of these** — please don't reuse cosmic purple, Math Race's dark navy, or Language & Arts' warm-orange presets.
