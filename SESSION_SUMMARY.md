# Session Summary — al-idrisi-games

Running handoff doc for this project. Update it at the end of a long session (or
before switching sessions) so the next session can pick up context fast without
re-deriving it. Keep entries newest-first; trim old entries once they're no
longer relevant (check git log for exact diffs instead of keeping stale detail
here).

For durable facts/decisions that outlive a single session, see [CLAUDE.md](CLAUDE.md) —
this file is more "what happened and why", CLAUDE.md is "how the project works".

---

## 2026-07-26 — 2026-07-27

**Sign Up / Sign In system** (replaces old static-roster picker)
- Reason: no parental consent to publicly show student names + hub now open to
  outside testers, so a fixed roster can't cover unknown users.
- Free-typed name + 4-digit PIN, Sign Up/Sign In tabs with distinct subtitles.
- `testerAccounts/{sanitizedName}` in Firebase; old pre-signup identities get
  silently logged out and forced through Sign Up once (`checkSavedIdentity()`).
- Avatar color lookup rewritten from array-index (`-1` for non-roster players)
  to a hash function, fixing invisible avatars for new testers.

**Firebase leaderboard reset**
- Full reset of all leaderboard/XP/badge/topicStats across all 4 games, at
  Adit's explicit request. `testerAccounts` (signup credentials) preserved.

**azkauniverse (SolarQuest) — image-based questions**
- Added optional `image` field (inline SVG) to mc/fill question types.
- 6 new original-SVG diagram questions across atom-structure, earth-rotation,
  globes-maps chapters, mapped from Adit's shared worksheet screenshots.
- Deployed to both `playalidrisi.fun` and standalone `azkasolar.quest`.

**MathVille — image-based questions**
- Same `image` field pattern ported to MathVille's more complex step-building
  pipeline (`buildRound()` mixes static + generator content across 4 UI types).
- New content: associative-property diagrams (multiplication), factor trees
  (prime-numbers), divisibility table (division), clinic icon (mixed-operation),
  reading-scale gauges (measurement) — directly filled two gaps flagged in
  questions.js's own "extraction notes" (associative property, reading scales).
- Caught two bugs before shipping: divisibility-table SVG circles clipped past
  the viewBox edge (widened it), and a gauge answer of "3.5 kg" was actually
  unanswerable since MathVille's keypad has no decimal-point key (changed to
  a whole-number reading).

**Math Race (multipleazka) — ship vehicle facing backward**
- Investigated the "vehicle icons (ship/train/truck/bus) direction unchecked"
  TODO — turned out to be about Math Race, not MathVille (MathVille only has
  one fixed 🚚 icon, no vehicle picker).
- Rendered each vehicle emoji at large size to check: 🚢 ship's default bow
  already points right (like ✈️ plane), but the blanket `scaleX(-1)` flip was
  sending it backward. Fixed with a CSS override, verified via computed
  `transform` matrix. Truck/train confirmed correctly oriented; bus is
  ambiguous (near-symmetric emoji, couldn't determine).

**MathVille multiplayer — 2-device sync test**
- iOS Simulator crashed when used as a second independent test device (told
  not to retry). Fell back to two browser tabs (same profile — a real
  limitation, not equivalent to two physical phones) both hitting live
  Firebase concurrently.
- Verified end-to-end: create → join via deep-link code → both sides
  independently sync to map → host starts a chapter → both get the identical
  question set → simultaneous play → synced results panel with correct "me"
  highlighting on each side → clean return to map. No bugs found.

**Android app (Trusted Web Activity via Bubblewrap)**
- Built `fun.playalidrisi.twa` — wraps `playalidrisi.fun` as an installable
  Android app. Signed APK + AAB live at
  `~/Documents/al-idrisi-games-android-keystore/` (outside the repo).
- Toolchain: JDK 17 + Android SDK installed via Homebrew (not bubblewrap's own
  downloader — avoid re-downloading). See CLAUDE.md's "Android app (TWA)"
  section for the exact env quirks (symlink fix, JDK path gotcha).
- `.well-known/assetlinks.json` added to the repo and deployed, so the app
  opens full-screen (verified domain ownership).
- **Important open question, not yet resolved**: Google Play policy says TWAs
  aren't allowed for apps targeting children under 13 — this hub is for Grade
  4 students. Play Store submission is blocked on this until a decision is
  made (sideload-only, rebuild as native/Capacitor, or list as general
  audience — see chat for the tradeoffs discussed).
- Stopgap shipped: a plain sideload page at `playalidrisi.fun/android/` with
  the APK + install instructions, so parents/teachers can install directly
  without Play Store.
- **A near-identical Android setup already exists for a separate, unrelated
  project** — `brain-box` (`lol.brainbox.twa`), keystore at
  `~/Documents/brain-box-android-keystore/`. Don't confuse the two keystores.

### Disk cleanup done this session
- Deleted `~/Library/Containers/com.apple.mediaanalysisd` (48GB Photos
  analysis cache, safe/regenerable) to make room for the Android SDK. Freed
  disk went from 4.8GB to 55GB available.

### Not yet done / open threads
- Play Store submission decision (see above) — needs Adit's call.
- Real-device (physical iPhone) multiplayer test still not done — the 2-tab
  test substantially de-risked the sync logic but isn't a full substitute.
- Bus vehicle icon orientation in Math Race — inconclusive, emoji too
  symmetric to tell by inspection.
- Dashboard `parentEmail` still only filled for 1 of ~25 students (manual,
  Adit's task).
- AI Tutor cost monitoring — no budget cap on the Anthropic API yet.
