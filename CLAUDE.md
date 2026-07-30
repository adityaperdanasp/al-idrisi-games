# Al Idrisi Games — Project Notes

Hub UI sekarang di-rebrand jadi **"BrainBox"** (nama tampilan, favicon, badge, hero title semua diganti) — tapi identifier teknis (nama repo, Firebase project `al-idrisi-games`, domain `playalidrisi.fun`, Android package `fun.playalidrisi.twa`) **sengaja gak diubah**, cuma teks/branding yang user lihat. Jangan bingung sama project **terpisah** `~/Documents/brain-box` (domain `brainbox.lol`, repo/Firebase/Vercel sendiri) — itu app lain yang kebetulan juga namanya "Brain Box" dari awal, gak ada hubungannya sama sekali secara infra dengan hub ini.

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

⚠️ **Vercel "Deployment Protection" (SSO wall) buat project `al-idrisi-games` udah DIMATIIN** (via API `PATCH /v9/projects/...` set `ssoProtection: null`) — supaya preview deployment branch bisa dibuka langsung tanpa login Vercel (kepake buat testing Drive Mode power-ups sebelum merge). Efek sampingnya: preview URL apapun dari project ini sekarang bisa diakses siapa aja yang punya link. Kalau mau lebih private lagi ke depannya, tinggal nyalain lagi dari situ.

**Git branch untuk fitur besar yang mau dites dulu sebelum production**: bikin branch (`git checkout -b feature/...`), push branch itu (bukan `main`) — Vercel otomatis bikin preview deployment di URL **stabil** polanya `https://{project}-git-{branch-slug}-{team}.vercel.app` (update otomatis tiap push ke branch yang sama, gak perlu link baru-baru). Setelah user oke, baru `git checkout main && git merge {branch} --no-edit && git push && vercel --prod --yes`.

## Data & arsitektur

- **Login hub sekarang Sign Up / Sign In** (`index.html`, layar `#sc-screen-select`), BUKAN lagi picker roster statis — diganti karena hub udah dibuka ke tester luar + gak ada parental consent buat nampilin nama murid publik. Nama bebas diketik + PIN 4 digit. Akun disimpen di Firebase `testerAccounts/{nameKey}` (`nameKey` = nama di-lowercase + sanitize non-alfanumerik jadi `-`), dan `nameKey` itu jugalah player id yang dipakai di semua tempat lain (`players/{id}/badges/...`, dst) — bentuknya sama kayak id roster statis yang lama, jadi skema data downstream (badges/topicStats/leaderboard) gak perlu berubah.
  - Sign Up: tolak kalau nama (key) udah dipakai, tulis `{name, pin, createdAt}`, langsung login.
  - Sign In: cocokin `pin` sama yang tersimpan.
  - Identitas lama dari SEBELUM switch ini (dari roster statis, gak punya PIN) dipaksa logout otomatis & harus Sign Up ulang sekali (`checkSavedIdentity()`) — deteksinya dengan cek apakah id itu punya record di `testerAccounts`.
  - Avatar color: dulu index-based dari posisi di roster (bug: id baru yang gak ada di roster jadi `-1`/invisible), sekarang **hash function** dari nama — jadi otomatis kerja buat nama baru apapun tanpa perlu didaftarin dulu.
- **`player.js`** — localStorage key `aig_player`, `{id, name, role}`. `AIGPlayer.deriveParentPlayer(child)` masih ada buat identitas "orang tua" turunan, TAPI belum jelas apa masih ada jalur UI buat munculin opsi ini di flow Sign Up/Sign In yang baru (dulu dari tap kartu murid di picker lama) — cek lagi kalau mau andalin fitur parent-identity, kemungkinan perlu di-wire ulang.
- **`players.js`** (`window.AIG_PLAYERS`) — roster statis LAMA, sekarang **gak lagi drive tampilan picker hub** (`renderPicker()` jadi no-op karena elemen DOM target-nya udah gak ada — ada komentar "MOCKUP NOTE" di kode persis soal ini). Masih ke-load & kepake di tempat lain yang belum diaudit ulang (kemungkinan: dashboard guru buat daftar murid, `parentEmail`). Anggap ini transisi belum tuntas — kalau nemu bug aneh soal murid/guru yang "gak muncul", cek dulu apa itu masih gantungan ke roster statis yang gak sinkron sama akun `testerAccounts` yang baru.
- **`firebase.js`** — Firebase project `al-idrisi-games` (hub), dipakai bareng oleh mathrace/azkacraft/azkauniverse/mathville buat multiplayer + progress. `dinorace` pakai Firebase project sendiri (`dinorace-d9b8c`).
- **`leaderboard.js`** — semua fungsi guard `player.role === "parent"` terpusat. Juga expose `AIGLeaderboard.getTopicStats(gameId, topicKey)` (baca `{correct, wrong, streak}`) — dipakai AI Tutor buat personalisasi hint (lihat bawah).
- **MathVille multiplayer** (keputusan eksplisit): numpang Firebase project hub di path baru `mathvilleGames/{code}`, BUKAN project Firebase terpisah kayak game lain.
- **MathVille progress**: `saveChapterProgress()` di `mathville/script.js` wajib panggil `AIGLeaderboard.setProgress("mathville", {chapters, xpTotal})` — kalau cuma localStorage, dashboard gak bakal lihat progressnya.
- **Firebase RTDB security rules** (project hub) sekarang eksplisit per-path (`.read`/`.write: true` masing-masing): `leaderboard`, `players`, `insights`, `mathvilleGames`, `testerAccounts`, `pushTokens`. **Path baru HARUS ditambahin eksplisit ke rules** — gak ada wildcard fallback, default-nya deny semua yang gak terdaftar (ini pernah bikin `/pushTokens` gagal baca/tulis total sampe ketauan).
- **Gotcha overlay di dalam `.screen`**: overlay (difficulty-picker, dll) yang markup-nya nempel DI DALAM salah satu `<section class="screen">` bakal ikut `display:none` selama section itu bukan yang `.active` — walau overlay-nya sendiri udah di-unhide (class `hidden` dihapus), tetep gak keliatan karena ancestor-nya nyembunyiin semua isinya. Ini pernah bikin Drive Mode di MathVille gagal muncul total (dari tombol map MAUPUN dari hub deep-link `?drive=1`) — fixnya panggil `showScreen(idScreenTerkait)` DULU sebelum unhide overlay yang nempel di situ. Kalau bikin overlay baru yang harus muncul SEBELUM masuk ke screen tujuannya, taruh di luar semua `.screen` (sibling langsung di `#app`), atau pastiin urutan `showScreen()` dipanggil duluan.

Skema Firebase RTDB (project hub):
```
leaderboard/{gameId}/{playerId}/{name, timesPlayed, lastPlayed}
players/{playerId}/badges/{gameId}/{...progress spesifik tiap game}
players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt, streak}
players/{childId}/parentSessions/{YYYY-MM-DD}/{parentName, lastGamePlayed, at}
insights/{studentId}/{draft, status: pending|approved, approvedAt, sentAt, sentTo}
mathvilleGames/{code}/{...multiplayer round state}
pushTokens/{sanitizedTokenKey}/{token, playerId, updatedAt}
```

Dashboard (`dashboard/dashboard.js`, `dashboard/index.html`): nambahin game baru harus wire tiap tempat game-id di-branch (`GAMES`, `prettifyTopic`, `CHART_COLORS`, `GAME_ICONS`, `xpTotalFor`, `xpRowHtml`, `buildTemplateDraft`, `buildInsightFacts`, heatmap toggle button).

### AI Tutor (hint pas anak salah jawab)

`api/generate-hint.js` (Vercel serverless, model `claude-haiku-4-5`, `ANTHROPIC_API_KEY` server-side only, dipakai di 4 game). Gagal API = card hint disembunyiin, gak pernah nge-block game.

**Sekarang bisa interaktif + personalized** (backward-compatible — request tanpa field baru tetap jalan persis kayak dulu, respons tetap `{hint}`):
- Optional `topicStats` di request body (dari `AIGLeaderboard.getTopicStats`) — kalau anak sering salah di topik itu, hint-nya lebih sabar/pake sudut pandang lebih sederhana.
- Optional `history` (array `{role, content}`) + `followUp` (pesan baru dari anak) — buat lanjutin percakapan multi-turn, bukan cuma 1 hint terus abis.

**Baru di-pilot di MathVille aja** (`mathville/index.html` + `script.js`, fungsi `loadAiHint`/`sendAiHintFollowUp`/`appendAiHintMessage`) — kartu AI Tutor sekarang mini chat thread: 3 tombol quick-reply ("Another example"/"Explain differently"/"Still confused") + kolom teks bebas. 3 game lain (multipleazka/azkacraft/azkauniverse) MASIH pakai UI single-shot lama (fetch tanpa history/followUp) — belum di-upgrade, tiap game punya copy kode hint sendiri-sendiri (bukan shared component), jadi upgrade ke game lain = kerjaan terpisah per game.

⚠️ **Gotcha kolom teks bebas + Enter key**: jangan cuma andalin `<form>`'s `submit` event + `preventDefault()` buat nyekat Enter — di device asli, implicit "Enter submits form" browser kadang nyampe ke default GET-to-self action LEBIH DULU sebelum listener submit sempet preventDefault, bikin reload halaman penuh (yang keliatan kayak "balik ke halaman lain" kalau ada logic auto-redirect pas fresh load). Fix-nya: tangkep `keydown` (`e.key === "Enter"`) LANGSUNG di elemen input-nya, `preventDefault()` + `stopPropagation()` di situ, jangan nunggu event `submit`.

## MathVille Drive Mode (free-roam alternatif tap-map)

Mobil dikontrol joystick kiri (analog drag), dikejar 1 dino (2 dino kalau difficulty **Hard**) yang AI-nya ngehindar obstacle. Nabrak obstacle = poin + quiz kilat; nabrak city = masuk chapter itu; digigit dino 3x = game over.

**Fitur tambahan (per playtesting)**:
- **Nitro boost** — tombol ⚡ kanan bawah (mirror posisi joystick kiri), tahan buat 1.6x speed, drain fuel meter yang isi ulang sendiri pas gak dipake.
- **Water gun** — joystick kanan terpisah (`drive-aim-joystick`) buat aim bebas 360°, nembak jet air sempit-panjang (kayak mobil pemadam — range 128px, cone 18°) ke arah dino. Kena air TOTAL 3 detik (akumulatif lintas beberapa semburan, bukan harus 1 semburan gak putus — tank cuma tahan 1.5detik/semburan + cooldown 1.5detik) bikin dino -30% speed selama 2 detik.
- **2 dino di Hard difficulty aja** — `driveState.dinos` array (dulu singular `driveState.dino`), masing-masing dino punya wet-progress/slow-state sendiri, TAPI bite-immunity 3 detik itu **car-wide** (`driveState.carImmuneUntil`), bukan per-dino — sempet ada bug digigit dino A gak nge-block dino B gigit sekejap kemudian, sekarang udah dibenerin.
- Dino 5% lebih lambat **cuma di Hard** (`DRIVE_HARD_DINO_SLOW_MULT`, bukan `DINO_SPEED` global) — awalnya salah taro di konstanta global, ke-apply ke semua difficulty, udah difix.
- Obstacle-avoidance dino diperkuat (range 55→80px, max turn 60°→~78°) — dino sempet keliatan nabrak obstacle karena reaksinya kependekan/kurang tajam.

**Chapter intro demo**: SEMUA 9 chapter sekarang punya contoh soal kecil sebelum practice round mulai (`INTRO_DEMOS` di `mathville/script.js`), bukan cuma Place Value. 2 tipe: `"grid"` (digit/place-label boxes, khusus Place Value) dan `"steps"` (vertical worked-example, opsional `mono:true` buat column arithmetic yang butuh alignment).

**Bug fix (2026-07-30)**: `buildPlaceValueStep()` sempet generate soal ambigu — nanya "which place is the digit 7 in 9,793,708" padahal digit 7-nya muncul 2x di angka itu (kids justifiably confused, salah satu jawaban yang "benar" ditolak). Fix: reject digit yang muncul lebih dari sekali di angka (`numStr.indexOf(digit) !== numStr.lastIndexOf(digit)`), sama kayak reject digit "0" yang udah ada sebelumnya. Udah divalidasi 20k simulasi, max 13x retry sebelum dapet angka valid (gak ada risiko infinite loop).

### PLANNED — Plane mode (shmup) buat Drive Mode, BELUM DIMULAI

User mau nambahin pilihan kendaraan di Drive Mode: **Mobil** (yang sekarang, gak disentuh sama sekali) vs **Pesawat** (shmup/bullet-hell ala Raiden/Strikers 1945/DoDonPachi — vertical scroll, auto-fire, dodge peluru musuh, power-up, boss). Dipilih pas masuk Drive Mode, mirip pola difficulty picker yang udah ada (Easy/Medium/Hard) — jadi ini cabang kode BARU yang jalan paralel, bukan refactor logic mobil yang ada.

**Eksplisit disepakati SEBELUM mulai**:
- **TIDAK ada multiplayer real-time** — Firebase RTDB gak didesain buat broadcast posisi 60fps, bakal lag. Kalau nanti mau progress/skor kebanding antar pemain, pakai pola yang SAMA kayak Math Race sekarang (sinkron progress/skor akhir doang, bukan posisi live).
- Drive Mode (mobil) yang ada **wajib tetap jalan identik** setelah fitur ini deploy — pesawat cuma opsi tambahan, bukan pengganti.
- Soal matematika tetap jadi hook utama: jawab bener = "math missile"/power-up yang bersihin layar, bukan cuma +progress pasif kayak sekarang.

**Rencana fase (belum mulai satu pun)**:
1. Engine inti — arena scroll vertikal, kontrol joystick (reuse pola Drive Mode), auto-fire, musuh dasar + gerak, collision peluru-musuh, skor
2. Bullet hell layer — musuh nembak balik, collision peluru-musuh vs pesawat, sistem nyawa/shield
3. Juice — ledakan, parallax background, screen shake, hit-flash
4. Progression — power-up, wave difficulty, boss, integrasi soal (jawab = bomb/power-up)
5. Polish — tie ke leaderboard/XP yang udah ada

Rencana workflow: git branch + Vercel preview deploy dulu (pola yang sama kayak fitur Drive Mode sebelumnya), baru merge ke `main` setelah dikonfirmasi.

## Android app — 2 versi berbeda, jangan ketuker

1. **TWA lama** (Bubblewrap, `fun.playalidrisi.twa`) — project + keystore di `~/Documents/al-idrisi-games-android-keystore/` (di LUAR repo), password di `PASSWORD_KEEP_SAFE.txt` di folder sama. Status belum jelas masih dipakai apa udah digantiin sepenuhnya sama Capacitor (poin 2) — belum ada keputusan eksplisit soal ini, cek dulu kalau mau utak-atik.
2. **Capacitor baru** (`~/Documents/al-idrisi-games-android-capacitor/`, TERPISAH dari repo hub) — package `com.brainbox.app`, appName "BrainBox". **Bukan TWA** — `capacitor.config.json` di-set `server.url: "https://playalidrisi.fun"`, jadi WebView-nya selalu nunjukin live site, BUKAN bundle lokal. Artinya semua update konten/gameplay otomatis kepake tiap app dibuka, **gak perlu rebuild APK sama sekali** kecuali ubah hal native (icon, nama, permission, push notif setup, min SDK).
   - Build butuh **JDK 21** (bukan JDK17 yang dipake TWA/bubblewrap) — Capacitor 8.x gak jalan di JDK17. Install terpisah (`brew install openjdk@21`), gak ganggu setup JDK17 yang lama.
   - Icon native (launcher + adaptive icon foreground) di-generate dari `~/Documents/brain-box/icon-candidates/icon-v3-512.png` pake Pillow (crop ke ~68% safe-zone buat foreground layer, background adaptive icon `#F6E3B4`).
   - Debug-signed aja (bukan release keystore) — cukup buat sideload manual (`adb install -r`) ke device tester, gak perlu Play Store/signing beneran karena distribusinya cuma buat kelas, bukan publik luas. Kalau native-level berubah (bukan cuma konten), APK baru harus di-rebuild & di-reinstall manual (uninstall dulu kalau signature/keystore beda).
   - APK terakhir ada di `~/Documents/al-idrisi-games-android-capacitor/dist/brainbox-capacitor-debug.apk`.

### Offline mode (service worker, `sw.js`)

Network-first: online selalu ambil versi terbaru (gak masking update), fallback ke cache CUMA kalau request-nya gagal total (offline beneran). Terdaftar dari `index.html`. Cuma cache response `status===200` (jangan cache 206 Partial Content dari audio/video range-request — `Cache.put()` throw kalau dipaksa).

### Push notification

- App native (Capacitor) minta izin notif + register FCM pas dibuka, token disimpen ke `pushTokens/{sanitizedToken}` (key dari token yang di-sanitize, BUKAN playerId — karena registrasi bisa kejadian sebelum Sign Up/Sign In).
- Popup token cuma muncul SEKALI per device (`localStorage.aig_push_token_shown`) — biar gak spam tiap buka app.
- `api/send-push-reminder.js` (Vercel Cron, jadwal `vercel.json` → `0 13 * * *` UTC = **20:00 WIB tiap hari**) broadcast reminder ke semua token di `/pushTokens`. FCM legacy HTTP API udah deprecated, jadi ini sign JWT sendiri pake Node `crypto` (RS256) buat dapet OAuth token, BUKAN pake `firebase-admin` npm package (biar konsisten sama api/ folder lain yang semua plain-fetch, no deps).
- **Baca `/pushTokens` butuh full-admin bypass rules** — udah dicoba service-account OAuth2 token (scope `firebase.database`) tapi RTDB REST API nolak terus ("Unauthorized request.", kemungkinan IAM role gap). Solusi yang jalan: **legacy RTDB database secret** (`FIREBASE_DATABASE_SECRET` env var, dari Firebase Console → Project Settings → Service accounts → Database secrets → generate) dipake via `?auth=` query param.
- Env vars Vercel: `FIREBASE_SERVICE_ACCOUNT_JSON` (buat sign FCM), `FIREBASE_DATABASE_SECRET` (buat baca pushTokens), `CRON_SECRET` (verifikasi request beneran dari Vercel Cron, bukan hit publik sembarangan) — semua "Sensitive" type (write-only, gak bisa dibaca ulang lewat `vercel env pull` walau udah di-set, itu emang behavior normalnya bukan bug).

## Domain migration — DIBAHAS, BELUM DIEKSEKUSI

User mau pindahin `brainbox.lol` dari project **brain-box** (yang lama) ke hub ini (`al-idrisi-games`), dengan cara beli domain baru (`AIBrainbox.fun`) buat project brain-box yang lama biar gak kehilangan domain sama sekali. Rencana aman (belum dijalanin per 2026-07-28):
1. User beli `AIBrainbox.fun` sendiri (registrar, aku gak bisa wakilin)
2. Tambahin ke project **brain-box** dulu di Vercel, verifikasi DNS
3. **Baru setelah itu** lepas `brainbox.lol` dari brain-box
4. Tambahin `brainbox.lol` ke project **al-idrisi-games** (project ini)

Kalau lanjut ke poin 4: perlu cek/update kode yang hardcode `"playalidrisi.fun"` di seluruh repo ini (deteksi "lagi di hub apa nggak" di azkauniverse/mathville, redirect di multipleazka/azkacraft, halaman `android/`, dll) biar tetep kebaca bener kalau diakses lewat domain baru.

## Yang masih perlu ditindaklanjuti
1. MathVille: 2-device multiplayer sudah divalidasi via 2 tab browser independen — real-device test (2 HP fisik) masih belum, tapi risiko sync-logic udah rendah.
2. Vehicle icons — closed, gak ada perubahan kode diperlukan (lihat histori commit kalau butuh detail).
3. AI Tutor cost monitoring — closed via Anthropic Console spend limit, bukan kode.
4. **AI Tutor interaktif+personalized** baru di MathVille — replikasi ke multipleazka/azkacraft/azkauniverse kalau hasil pilot-nya bagus (masing-masing punya copy kode sendiri, bukan shared).
5. **Domain migration** `brainbox.lol` — nunggu user beli `AIBrainbox.fun` dan pindahin project brain-box dulu.
6. **TWA lama vs Capacitor baru** — belum ada keputusan eksplisit apa TWA lama (`fun.playalidrisi.twa`) masih dipertahankan atau digantiin total sama Capacitor app yang baru.
7. Vercel Deployment Protection buat project ini masih DIMATIIN (preview URL publik) — nyalain lagi kalau udah gak butuh testing preview-branch buat sementara waktu.

## Gaya kerja user (penting)
- Adit komunikasi campur Indonesia-Inggris.
- Kalau dikasih referensi desain/spec spesifik, ikutin **persis**, jangan improvisasi.
- **Suka diskusi/compare opsi dulu sebelum eksekusi** — lempar ide, minta dibandingin, baru bilang "gas"/"lanjut"/"kerjain". Jangan coding duluan pas masih tahap "gimana menurut lo".
- Mockup **wajib** di file asli (bukan artifact terpisah) — edit langsung + screenshot dari situ.
- **Selalu `git status --short` sebelum commit**, jangan `git add -A` — ada history sesi lain kerja paralel di repo yang sama.
- Testing di real device (iPhone/Safari, tablet Android) krusial buat bug yang gak muncul di desktop/simulasi — beberapa bug (immunity per-dino, Enter-key reload) cuma ketauan dari laporan user main di device asli, gak kebaca dari testing browser-pane biasa.
- Cache-busting manual tiap game (`script.js?v=N`, `style.css?v=N` di index.html) — **wajib naikin versi tiap edit file itu**, kalau lupa perubahan gak muncul di browser.
- Browser-pane bisa serve stale cache bahkan di HTML document-nya sendiri, bukan cuma linked JS/CSS — pakai `?cb=N` di URL kalau re-testing habis edit.
- Chapter/level locking: MathVille **jangan pernah** dikunci — semua chapter selalu terbuka.
- Fitur besar/eksperimental: pakai git branch + Vercel preview deployment dulu buat direct testing user, baru merge ke `main` setelah dikonfirmasi oke.
