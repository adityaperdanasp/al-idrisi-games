# Al Idrisi Games — Project Notes

Hub berisi 4 game edukasi buatan Adit buat kelas anaknya Azka (Grade 4 SD, Green Montessori School, ~26 murid+guru, roster di `players.js`):
- **multipleazka** — Math Race (multiplayer N-seat racing, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering)
- **azkauniverse** — SolarQuest (AI Science Adventure)
- **mathville** — Grade 4 math (9 curriculum chapters, town-map + alternate Drive Mode free-roam driving game)
- **dinorace** — snapshot dari project terpisah (`~/Documents/dinorace`, domain `dinorace.lol`); **bukan sinkron otomatis**, kalau game asli diedit harus di-copy ulang manual

## Deploy

Tiap game = Vercel project sendiri, plus hub-nya sendiri juga Vercel project.
- Hub: `playalidrisi.fun/` — path `/{game}/` di domain ini adalah file yang sama dari repo hub (bukan proxy)
- Legacy standalone domains (harus identik kontennya): `multipleazka.fun`, `azkasocial.fun` (alias `azkacraft`), `azkasolar.quest` (alias `azkauniverse`)
- `mathville` & `dinorace`: **cuma ada di hub**, gak punya standalone domain

**Dua target deploy buat mathrace/azkacraft/azkauniverse** tiap kali edit:
1. `git push origin main` → update `playalidrisi.fun/{game}/` (hub auto-deploy)
2. `cd {game} && vercel --prod --yes` → update domain standalone-nya

`mathville/` dan `dinorace/` cukup push #1 aja (gak ada standalone target).

Verifikasi cepat: `diff <(curl -s https://playalidrisi.fun/{game}/somefile.js) <(curl -s https://{standalone-domain}/somefile.js)`.

⚠️ Hub auto-deploy pernah sekali gak jalan (push sukses, Vercel gak auto-build, root cause gak jelas). Kalau curl production gak nunjukin perubahan setelah push, cek `vercel ls` (umur deployment terakhir) sebelum asumsi udah ke-apply; fallback `vercel --prod --yes` manual dari root hub.

## Data & arsitektur

- **Login hub sekarang Sign Up / Sign In** (`index.html`, layar `#sc-screen-select`), BUKAN lagi picker roster statis — diganti karena hub udah dibuka ke tester luar + gak ada parental consent buat nampilin nama murid publik. Nama bebas diketik + PIN 4 digit. Akun disimpen di Firebase `testerAccounts/{nameKey}` (`nameKey` = nama di-lowercase + sanitize non-alfanumerik jadi `-`), dan `nameKey` itu jugalah player id yang dipakai di semua tempat lain (`players/{id}/badges/...`, dst) — bentuknya sama kayak id roster statis yang lama, jadi skema data downstream (badges/topicStats/leaderboard) gak perlu berubah.
  - Sign Up: tolak kalau nama (key) udah dipakai, tulis `{name, pin, createdAt}`, langsung login.
  - Sign In: cocokin `pin` sama yang tersimpan.
  - Identitas lama dari SEBELUM switch ini (dari roster statis, gak punya PIN) dipaksa logout otomatis & harus Sign Up ulang sekali (`checkSavedIdentity()`) — deteksinya dengan cek apakah id itu punya record di `testerAccounts`.
  - Avatar color: dulu index-based dari posisi di roster (bug: id baru yang gak ada di roster jadi `-1`/invisible), sekarang **hash function** dari nama — jadi otomatis kerja buat nama baru apapun tanpa perlu didaftarin dulu.
- **`player.js`** — localStorage key `aig_player`, `{id, name, role}`. `AIGPlayer.deriveParentPlayer(child)` masih ada buat identitas "orang tua" turunan, TAPI belum jelas apa masih ada jalur UI buat munculin opsi ini di flow Sign Up/Sign In yang baru (dulu dari tap kartu murid di picker lama) — cek lagi kalau mau andalin fitur parent-identity, kemungkinan perlu di-wire ulang.
- **`players.js`** (`window.AIG_PLAYERS`) — roster statis LAMA, sekarang **gak lagi drive tampilan picker hub** (`renderPicker()` jadi no-op karena elemen DOM target-nya udah gak ada — ada komentar "MOCKUP NOTE" di kode persis soal ini). Masih ke-load & kepake di tempat lain yang belum diaudit ulang (kemungkinan: dashboard guru buat daftar murid, `parentEmail`). Anggap ini transisi belum tuntas — kalau nemu bug aneh soal murid/guru yang "gak muncul", cek dulu apa itu masih gantungan ke roster statis yang gak sinkron sama akun `testerAccounts` yang baru.
- **`firebase.js`** — Firebase project `al-idrisi-games` (hub), dipakai bareng oleh mathrace/azkacraft/azkauniverse/mathville buat multiplayer + progress. `dinorace` pakai Firebase project sendiri (`dinorace-d9b8c`).
- **`leaderboard.js`** — semua fungsi guard `player.role === "parent"` terpusat.
- **MathVille multiplayer** (keputusan eksplisit): numpang Firebase project hub di path baru `mathvilleGames/{code}`, BUKAN project Firebase terpisah kayak game lain.
- **MathVille progress**: `saveChapterProgress()` di `mathville/script.js` wajib panggil `AIGLeaderboard.setProgress("mathville", {chapters, xpTotal})` — kalau cuma localStorage, dashboard gak bakal lihat progressnya.
- **Gotcha overlay di dalam `.screen`**: overlay (difficulty-picker, dll) yang markup-nya nempel DI DALAM salah satu `<section class="screen">` bakal ikut `display:none` selama section itu bukan yang `.active` — walau overlay-nya sendiri udah di-unhide (class `hidden` dihapus), tetep gak keliatan karena ancestor-nya nyembunyiin semua isinya. Ini pernah bikin Drive Mode di MathVille gagal muncul total (dari tombol map MAUPUN dari hub deep-link `?drive=1`) — fixnya panggil `showScreen(idScreenTerkait)` DULU sebelum unhide overlay yang nempel di situ. Kalau bikin overlay baru yang harus muncul SEBELUM masuk ke screen tujuannya, taruh di luar semua `.screen` (sibling langsung di `#app`), atau pastiin urutan `showScreen()` dipanggil duluan.

Skema Firebase RTDB (project hub):
```
leaderboard/{gameId}/{playerId}/{name, timesPlayed, lastPlayed}
players/{playerId}/badges/{gameId}/{...progress spesifik tiap game}
players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}
players/{childId}/parentSessions/{YYYY-MM-DD}/{parentName, lastGamePlayed, at}
insights/{studentId}/{draft, status: pending|approved, approvedAt, sentAt, sentTo}
mathvilleGames/{code}/{...multiplayer round state}
```

Dashboard (`dashboard/dashboard.js`, `dashboard/index.html`): nambahin game baru harus wire tiap tempat game-id di-branch (`GAMES`, `prettifyTopic`, `CHART_COLORS`, `GAME_ICONS`, `xpTotalFor`, `xpRowHtml`, `buildTemplateDraft`, `buildInsightFacts`, heatmap toggle button).

AI Tutor hint: `api/generate-hint.js` (Vercel serverless, Claude Haiku, `ANTHROPIC_API_KEY` server-side only). Dipakai multipleazka/azkacraft/azkauniverse/mathville — gagal API = card hint disembunyiin, gak pernah nge-block game.

## Android app (TWA)

Hub punya versi Android via Bubblewrap (Trusted Web Activity, bukan native app terpisah — cuma wrapper yang buka `playalidrisi.fun` fullscreen).
- Package: `fun.playalidrisi.twa`. Project + keystore ada di `~/Documents/al-idrisi-games-android-keystore/` (di LUAR repo ini, jangan commit ke sini).
- Keystore password ada di `PASSWORD_KEEP_SAFE.txt` di folder yang sama — **jangan pernah hilang**, kalau hilang gak bisa update app itu lagi selamanya (harus rilis app baru dengan package id lain).
- Domain verification (`.well-known/assetlinks.json` di repo ini) udah live, jadi app-nya buka fullscreen tanpa address bar.
- Tooling: JDK 17 + Android SDK cmdline-tools ke-install via Homebrew (`brew install openjdk@17`, `brew install --cask android-commandlinetools`) — BUKAN via bubblewrap sendiri (biar gak download ulang berkali-kali). `~/.bubblewrap/config.json` udah di-point ke situ. Catatan environment quirk: bubblewrap butuh symlink `$ANDROID_HOME/bin -> cmdline-tools/latest/bin` (dibuat manual) biar validasi path-nya lolos, dan jdkPath di config HARUS ke folder `.jdk` root (bukan `.../Contents/Home` — bubblewrap nambahin itu sendiri di macOS).
- ⚠️ Google Play policy: TWA gak boleh dipakai buat app yang target anak di bawah 13 tahun (Play for Families policy) — APK-nya tetep jalan buat sideload/testing, tapi kalau mau submit ke Play Store beneran perlu app format lain atau ikutin ketentuan Families program.
- ⚠️ **Bug yang ketemu setelah testing di HP beneran**: semua warna jadi item/gelap pas dibuka lewat app Android. Penyebab: gak ada `color-scheme` meta/CSS di manapun, jadi Android WebView otomatis "force dark" invert semua warna pas HP-nya lagi system dark mode — behavior ini spesifik Android WebView/Chrome, gak muncul di testing desktop Chrome sama sekali. Fix: tambahin `<meta name="color-scheme" content="...">` di tiap index.html + `color-scheme:` di tiap style.css. Hub/mathville/multipleazka/azkacraft pake `"light"` (emang didesain terang doang); azkauniverse pake `"light dark"` (punya 2 tema resmi: colorful/dark-space & pastel/terang, dua-duanya intentional). **Kalau nambah game/halaman baru, jangan lupa declare color-scheme dari awal** — bug ini gak kelihatan sama sekali kecuali dites di app Android/TWA beneran, testing browser desktop apapun gak bakal nangkep ini.
- Ada project Android SERUPA buat `brain-box` (app terpisah, bukan bagian repo ini) di `~/Documents/brain-box-android-keystore/` — package `lol.brainbox.twa`, udah ada APK signed juga dari sesi sebelumnya.

## Yang masih perlu ditindaklanjuti
1. MathVille: 2-device multiplayer sudah divalidasi via 2 tab browser independen (join, map sync, shared round questions, simultaneous play, hasil akhir dgn "me" highlight, semua real lewat Firebase) — tapi masih same-profile/same-engine, BUKAN 2 iPhone fisik beneran (iOS Simulator sempat dicoba buat device kedua tapi crash). Real-device test masih worth dilakuin kalau ada waktu, tapi risiko sync-logic-nya udah jauh lebih rendah sekarang.
2. Vehicle icons — **closed**. Ship sudah difix sesi sebelumnya. Bus dicek ulang (render 🚌 normal vs `scaleX(-1)` side-by-side): dua-duanya identik secara visual di font emoji yang ada di environment ini (Noto-style, kemungkinan sama kayak Android WebView) — emoji-nya emang genuinely symmetric depan-belakang, bukan bug rendering. Keputusan: biarin pakai blanket flip yang sama kayak car/truck/train (konsisten dgn keluarga emoji-nya), gak ada perubahan kode yang diperlukan. iOS Simulator dicoba buat cek versi Apple Color Emoji tapi crash-loop lagi (sama kayak sesi multiplayer test) — kalau suatu saat mau dipastiin di Apple emoji, screenshot dari iPhone beneran diperlukan.
3. AI Tutor cost monitoring — **closed via Anthropic Console, bukan kode**. Anthropic sudah punya built-in spend limit/usage alert per workspace/API key (Console → Settings → Limits / Usage & Cost), jadi gak perlu custom budget-cap code di `api/generate-hint.js`. Ini setting akun yang Adit perlu set sendiri login ke [console.anthropic.com](https://console.anthropic.com) — Claude gak bisa login/ubah billing setting atas nama Adit. Langkah: Console → workspace terkait → Limits → set monthly spend cap + email alert threshold.

## Gaya kerja user (penting)
- Adit komunikasi campur Indonesia-Inggris.
- Kalau dikasih referensi desain/spec spesifik, ikutin **persis**, jangan improvisasi.
- **Suka diskusi/compare opsi dulu sebelum eksekusi** — lempar ide, minta dibandingin, baru bilang "gas"/"lanjut"/"kerjain". Jangan coding duluan pas masih tahap "gimana menurut lo".
- Mockup **wajib** di file asli (bukan artifact terpisah) — edit langsung + screenshot dari situ.
- **Selalu `git status --short` sebelum commit**, jangan `git add -A` — ada history sesi lain kerja paralel di repo yang sama.
- Testing di real device (iPhone/Safari) krusial buat bug yang gak muncul di desktop.
- Cache-busting manual tiap game (`script.js?v=N`, `style.css?v=N` di index.html) — **wajib naikin versi tiap edit file itu**, kalau lupa perubahan gak muncul di browser.
- Browser-pane bisa serve stale cache bahkan di HTML document-nya sendiri, bukan cuma linked JS/CSS — pakai `?cb=N` di URL kalau re-testing habis edit.
- Chapter/level locking: MathVille **jangan pernah** dikunci — semua chapter selalu terbuka.
