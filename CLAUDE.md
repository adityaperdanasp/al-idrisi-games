# Al Idrisi Games — Project Notes

Hub UI sekarang di-rebrand jadi **"BrainBox"** (nama tampilan, favicon, badge, hero title semua diganti) — tapi identifier teknis (nama repo, Firebase project `al-idrisi-games`, domain `playalidrisi.fun`, Android package `fun.playalidrisi.twa`) **sengaja gak diubah**, cuma teks/branding yang user lihat. Jangan bingung sama project **terpisah** `~/Documents/brain-box` (domain `brainbox.lol`, repo/Firebase/Vercel sendiri) — itu app lain yang kebetulan juga namanya "Brain Box" dari awal, gak ada hubungannya sama sekali secara infra dengan hub ini.

Hub berisi 4 game edukasi buatan Adit buat kelas anaknya Azka (Grade 4 SD, Green Montessori School, ~26 murid+guru, roster di `players.js`):
- **multipleazka** — Math Race (multiplayer N-seat racing, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering)
- **azkauniverse** — SolarQuest (AI Science Adventure)
- **mathville** — Grade 4 math (9 curriculum chapters, town-map + alternate Drive Mode free-roam driving game)
- **dinorace** — 2-Player Dino Racing. **Full-merge diputuskan 2026-08-03**: dulu snapshot manual dari project terpisah (`~/Documents/dinorace`, domain `dinorace.lol`, Firebase project sendiri `dinorace-d9b8c`), sekarang Firebase-nya udah disatuin ke project hub (`al-idrisi-games`) — lihat detail lengkap di bagian "DinoRace merge" di bawah. GitHub repo asli (`~/Documents/dinorace`) & Vercel project `dinorace.lol` MASIH ada & masih di-maintain manual (dual-deploy, lihat bawah), cuma Firebase-nya doang yang udah jadi satu.

## Deploy

Tiap game = Vercel project sendiri, plus hub-nya sendiri juga Vercel project.
- Hub: `playalidrisi.fun/` — path `/{game}/` di domain ini adalah file yang sama dari repo hub (bukan proxy)
- Legacy standalone domains (harus identik kontennya): `multipleazka.fun`, `azkasocial.fun` (alias `azkacraft`), `azkasolar.quest` (alias `azkauniverse`), `dinorace.lol`
- `mathville`: **cuma ada di hub**, gak punya standalone domain

**Dua target deploy buat mathrace/azkacraft/azkauniverse/dinorace** tiap kali edit:
1. `git push origin main` → update `playalidrisi.fun/{game}/` (hub auto-deploy)
2. `cd {game} && vercel --prod --yes` → update domain standalone-nya (buat dinorace: `cd ~/Documents/dinorace && vercel --prod --yes`, project/repo terpisah dari hub, BUKAN folder `dinorace/` di dalam repo ini)

`mathville/` cukup push #1 aja (gak ada standalone target).

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
- **`firebase.js`** — Firebase project `al-idrisi-games` (hub), dipakai bareng oleh mathrace/azkacraft/azkauniverse/mathville buat multiplayer + progress. `dinorace` **sekarang juga pakai project ini** (per merge 2026-08-03, lihat bagian "DinoRace merge" di bawah) — bukan lewat `firebase.js` (dinorace punya inline `firebaseConfig` sendiri di `index.html`-nya, config value-nya di-copy manual dari `firebase.js`, bukan reference ke file itu), tapi projectId/databaseURL-nya sama.

### DinoRace merge (2026-08-03)

DinoRace awalnya 3 sistem yang bener-bener terpisah dari hub: GitHub repo sendiri (`adityaperdanasp/dinorace`), Firebase project sendiri (`dinorace-d9b8c`), Vercel project sendiri (domain `dinorace.lol`). Keputusan eksplisit: **disatuin**, tapi bertahap —
- **Firebase**: udah disatuin. `dinorace/index.html` (di KEDUA tempat — repo asli `~/Documents/dinorace` DAN folder `dinorace/` di repo ini) sekarang connect ke Firebase project `al-idrisi-games`, path RTDB tetep `dinorace_games/{code}` (nama gak diubah, cuma pindah "rumah"). Path ini udah ditambahin eksplisit ke RTDB security rules hub (`"dinorace_games": { "$code": { ".read": true, ".write": true } }`, dipublish 2026-08-03) — diverifikasi langsung via write/read/delete REST call ke path itu, multiplayer create/join dinorace udah bisa jalan.
- **GitHub & Vercel**: SENGAJA belum digabung — masih 2 repo/2 Vercel project terpisah (`al-idrisi-games` dan `dinorace`), disinkron manual pola dual-deploy yang sama kayak azkacraft/azkauniverse (edit di `~/Documents/dinorace`, verifikasi, push ke repo asli + `vercel --prod` buat `dinorace.lol`, BARU copy file yang sama ke `al-idrisi-games/dinorace/` + tambahin balik `.hub-back-btn` yang emang beda sengaja antara 2 versi ini, commit+push ke repo hub). Kalau ke depannya mau full-merge GitHub juga (repo `dinorace` lama diarsipin, `al-idrisi-games/dinorace/` jadi satu-satunya source of truth), itu keputusan terpisah yang belum diambil.
- Fitur yang ditambahin bareng merge ini: translasi penuh ke Bahasa Inggris (dulu Indonesia), soal matematika ringan tiap 10 detik (`QUESTION_INTERVAL_MS`, generator lokal, gak fetch dari game lain — DinoRace beda origin dari hub jadi cross-origin fetch ke `azkacraft/questions.json` dkk berisiko kena CORS), immune 2 detik (`QUESTION_IMMUNE_MS`) abis jawab soal (numpang field `invincibleUntil` yang emang udah ada buat hit-invuln pasca nabrak, bukan mekanisme baru).
- **Round 2 gameplay tweaks (2026-08-03)**, per feedback abis dicoba:
  - **Scene progression by distance** (`updateScene()`, murni kosmetik — cuma ganti class di `#trackWrap`, gak nyentuh obstacle/collision/schedule sama sekali, jadi identik di semua player karena distance itu shared clock berbasis elapsed time): 0-500m tampilan default, 500-1000m jadi scene luar angkasa (`scene-space`), 1000m+ jadi gurun pasir (`scene-desert`). Pas nyampe persis 1000m, sekali doang `triggerMeteorShower()` jalan (toast + beberapa emoji ☄️ jatuh di `#trackWrap`) — visual doang, gak ngefek ke collision, keputusan eksplisit biar gak nambah kompleksitas hit-detection.
  - **`LIVES_MAX` 5 → 3**, plus **1x kesempatan revive** per race: nyawa abis pertama kali TIDAK langsung game over — `startReviveChallenge()` (overlay `#reviveOverlay`, terpisah dari overlay soal biasa) minta `REVIVE_CORRECT_NEEDED` (3) jawaban benar berturut-turut sebelum bisa lanjut (salah cuma reroll soal baru, gak ngurangin progress `reviveCorrectCount`, sama pola kayak soal biasa). Ditandain `respawnUsed` (boolean, bukan counter — cuma 1x per race). Berhasil → `lives` balik ke `LIVES_MAX` full + immune 2 detik, lanjut main normal (bisa kena hit lagi kayak biasa setelahnya, gak permanent invuln).
  - **`generateMathQuestion()` di-upgrade**: dulu ada soal penjumlahan 1 digit yang kelewat gampang — sekarang `+`/`-` pake rentang 2 digit, `x` tetep 3-12, dan nambah operasi **pembagian** (`÷`, selalu hasil bulat) buat variasi. Dipake sama-sama oleh soal biasa (tiap 10 detik) dan revive challenge.
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
players/{playerId}/assignedTopics/[...]  // array "math:place-value"/"lang:3"/"sci:star-lifecycle", ditulis Parent Portal (/parents), dibaca MathVille's Focus Round picker
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

**Awalnya di-pilot di MathVille doang, sekarang udah di-rollout juga ke azkacraft & azkauniverse** (masing-masing punya copy kode sendiri-sendiri, bukan shared component — lihat bagian "Bo (maskot AI)" di bawah buat status lengkap per game) — kartu AI Tutor jadi mini chat thread: 3 tombol quick-reply ("Another example"/"Explain differently"/"Still confused") + kolom teks bebas, plus SEKARANG selalu muncul (congrats kalau perfect, bukan cuma pas ada yang salah). **multipleazka (Math Race) masih satu-satunya yang belum di-upgrade** (masih single-shot, fetch tanpa history/followUp).

⚠️ **Gotcha kolom teks bebas + Enter key**: jangan cuma andalin `<form>`'s `submit` event + `preventDefault()` buat nyekat Enter — di device asli, implicit "Enter submits form" browser kadang nyampe ke default GET-to-self action LEBIH DULU sebelum listener submit sempet preventDefault, bikin reload halaman penuh (yang keliatan kayak "balik ke halaman lain" kalau ada logic auto-redirect pas fresh load). Fix-nya: tangkep `keydown` (`e.key === "Enter"`) LANGSUNG di elemen input-nya, `preventDefault()` + `stopPropagation()` di situ, jangan nunggu event `submit`.

### Bo (maskot AI) — status rollout per game

Ada 2 hal terpisah yang sama-sama dibrandingin "Bo", jangan ketuker:

1. **Widget chat bebas** (floating avatar + bubble "Bo here!", tap kapan aja buat ngobrol apa aja, backend `api/bo-chat.js`):
   - azkacraft — udah paling lama ada (`.game-bo`/`#game-bo-chat`, persistent di layar soal).
   - azkauniverse — udah ada (`#game-bo` di `#screen-play`, share panel `#ship-bo-chat` yang juga dipake ship-marker di quest map).
   - mathville — udah ada di BANYAK tempat: `#game-bo` global (toggle visibility per screen di `showScreen()`, disembunyiin di screen yang udah punya Bo sendiri: drive/plane/reward/landing/pair), mobil Drive Mode (`.drive-bo-face`), traveler truck di Town Map (`.map-traveler-bo-face`) — semua share 1 panel `#drive-bo-chat` (sengaja ditaro TOP-LEVEL di luar semua `.screen`, bukan di dalem `#screen-drive` kayak awalnya — kena gotcha overlay-in-inactive-screen).
   - hub (`index.html`) — udah ada 2 entry point ke chat yang SAMA: `#sc-greeting` (avatar kecil "Tap Bo!") dan `#sc-hero-icon` (Bo gede di judul "Brain Box", di-`role=button`-in, forward click ke `#sc-greeting`).
   - **multipleazka (Math Race) — BELUM ADA SAMA SEKALI.** Gap paling gede yang masih outstanding.
2. **AI Tutor hint** (kartu personalized pas jawaban salah, badge sekarang semua "✨ Bo" bukan "✨ AI Tutor" lagi):
   - mathville — versi INTERAKTIF (chip quick-reply + kolom teks bebas + history multi-turn), DAN sekarang **selalu muncul** (bukan cuma pas ada yang salah) — kalau round-nya perfect, munculin pesan congrats random dari `BO_CONGRATS_MESSAGES` alih-alih hint. Collapsed jadi 1 pesan dulu (`.chat-open` toggle + `#ai-hint-tap-cue`), tap buat expand ke full chat.
   - azkacraft & azkauniverse — UDAH di-upgrade ke pola interaktif yang sama (chip + follow-up + congrats-on-perfect), reuse fungsi (`appendAiHintMessage`/`sendAiHintFollowUp`/`setupAiHintCardOpen`) yang di-porting manual ke tiap game punya `script.js` sendiri (bukan shared module, jaga-jaga field name beda-beda kayak biasa).
   - multipleazka — MASIH versi lama single-shot (fetch sekali, 1 hint, abis). Belum di-upgrade.

⚠️ **Safari focus-ring bug**: SVG/div yang di-`role=button tabindex=0` (misal `#sc-hero-icon`) bisa nunjukin halo abu-abu jelek pas di-tap di iOS Safari — `-webkit-tap-highlight-color: transparent` doang GAK NGARUH ke ini (itu cuma nyekat overlay tap-flash, bukan focus ring bawaan WebKit). Fix: `outline: none` di `:focus`, `:focus-visible` buat tetep kasih ring ke keyboard user.

### Focus Round — mixed-topic practice, "sendiri" secara URL tapi numpang engine MathVille

Fitur baru: anak (atau orang tua lewat Parent Portal) pilih sampe 8 topik LINTAS 3 game (mathville/azkacraft/azkauniverse), dapet 1 round 20 soal campur. Punya card sendiri di hub landing page (pastel lavender, sejajar 4 game lain — BUKAN nempel di icon/topbar MathVille lagi, itu udah dicabut).

**Arsitektur**: `focus-round/index.html` cuma halaman **redirect tipis** (`location.replace` ke `mathville/index.html?focus=1`) — SENGAJA gak fork/duplicate seluruh engine render-soal (4 tipe UI: typein/mc/tap/match, reward, AI hint, dst) ke folder baru, karena itu berarti maintain 2 salinan kode yang sama (kelas bug yang sama kayak "azkacraft/azkauniverse field name beda" yang udah nyakitin sebelumnya). Semua logic beneran (`buildFocusRoundSteps`, `ensureFocusPools`, picker UI) tetep hidup di `mathville/script.js`/`mathville/index.html`, di-expose lewat `window.openFocusRoundPicker()` yang dipanggil deep-link `?focus=1`.

**Sumber soal**:
- Topik math (9 chapter) — reuse `buildRound(chapterId)` mathville APA ADANYA (dipanggil 2x per chapter buat variasi), termasuk soal tipe "match" bisa nongol di Focus Round persis kayak di chapter aslinya.
- Topik language (5 dari 7 chapter azkacraft) — fetch `azkacraft/questions.json`, cuma ambil `type:"mc"`. **Reading Comprehension (id 6) dan Creative Writing (id 7) SENGAJA gak dimasukin ke picker** — soal mc mereka semua ngerujuk ke sebuah "passage"/cerita ("According to the text...") yang gak ditampilin di sini, jadi gak bisa dijawab berdiri sendiri.
- Topik science (5 level azkauniverse) — fetch `azkauniverse/questions.json`, `type:"mc"` yang gak ada `image`.
- Plane Mode's cross-game pool (`ensurePlaneQuestionPools()`) punya exclusion yang sama persis (chapter id 6 & 7 by id, bukan cek `type==="passage"` literal) — dulu sempet kelolos Creative Writing, udah di-port fix-nya dari Focus Round (2026-08-03).

`players/{id}/assignedTopics` (array of `"math:place-value"`/`"lang:3"`/`"sci:star-lifecycle"`) — ditulis Parent Portal, dibaca sekali sama picker pas pertama kali dibuka tiap page load (`applyAssignedTopics()`), pre-check topik yang di-assign KALAU belom ada yang di-checklist manual (gak nimpa pilihan anak).

### Parent Portal (`/parents`)

Halaman baru di root hub, `parents/index.html` + `script.js` + `style.css` sendiri — numpang Firebase project & schema yang sama (gak ada schema baru selain `assignedTopics`), tapi styling-nya ngikutin hub (Baloo2+Nunito, lavender), BUKAN tema game manapun.

**Auth**: sign in pake nama+PIN ANAK (cek ke `testerAccounts/{nameKey}`, sama persis kayak Sign In hub) — **BUKAN** PIN dashboard guru (`AIG_DASHBOARD_PIN`, 1 PIN buat liat SEMUA murid). Salah pilih ini = privacy bug (orang tua bisa liat data anak orang lain).

**Isinya 2 bagian**:
1. Assign — picker Focus Round yang sama persis (20 topik, max 8), simpen ke `players/{childId}/assignedTopics`.
2. Report — "Needs Practice" (topik akurasi <70% dari ≥3 percobaan, PERSIS sama rumus & `prettifyTopic()` kayak `dashboard/dashboard.js`, di-duplicate manual karena gak ada shared module) + XP per game.

**Entry point**: link kecil "For parents →" di paling bawah landing page hub (`.sc-footer-link`), sengaja dibikin gak menonjol biar anak gak notice/ke-klik gak sengaja — bukan ditaro di tempat yang keliatan kayak game card.

Beda sama pipeline "guru generate insight draft → approve → kirim email" yang UDAH ADA duluan di dashboard guru (`generateDraft`/tab approvals) — Parent Portal ini channel BARU yang live/self-serve, bukan gantiin. Guru tetep pegang kendali narasi lewat jalur email kalau mau.

⚠️ **Bug yang ketauan & udah difix pas ngembangin ini**: `submitAnswer()` di mathville manggil Firebase (`recordTopicAttempt`) secara SYNC tanpa try/catch — kalau itu throw (misal koneksi jelek di device asli), seluruh round macet permanen di soal itu (setTimeout buat lanjut gak pernah kejadwal), tanpa error yang keliatan ke user. Root cause dari laporan "abis soal terakhir diem aja" yang sempet gak ketemu lewat testing biasa. Udah dibungkus try/catch di `submitAnswer()` DAN handler match-type (GCF & LCM).

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

### Plane mode (shmup) buat Drive Mode — Fase 1-6 udah di `main`, tweak round (v2) di branch `feature/plane-mode-v2`

Pilihan kendaraan di Drive Mode: **Mobil** (yang sekarang, gak disentuh sama sekali) vs **Pesawat** (shmup/bullet-hell ala Raiden/Strikers 1945/DoDonPachi — vertical scroll, auto-fire, dodge peluru musuh, power-up, boss). Dipilih lewat overlay baru `#drive-vehicle-overlay` (di `mathville/index.html`, sengaja ditaro di luar semua `.screen` — langsung child `#app` — biar gak kena bug "overlay nested in inactive screen" yang udah didokumentasikan di atas) sebelum masuk Drive Mode. Pilih Mobil → flow persis sama kayak sebelumnya (difficulty picker → `goToDrive()`). Pilih Pesawat → `launchPlaneMode()`, layar baru `#screen-plane`.

**Kode plane mode 100% terpisah dari `driveState`/`goToDrive`/`startDriveLoop`** — gak ada shared state/function sama sekali, jadi Drive Mode gak mungkin ke-affect oleh perubahan di sini. Semua logic ada di satu blok di `mathville/script.js` (cari komentar "PLANE MODE"), constants prefix `PLANE_*`, state global `planeState`.

**Eksplisit disepakati SEBELUM mulai** (masih berlaku buat fase selanjutnya):
- **TIDAK ada multiplayer real-time** — Firebase RTDB gak didesain buat broadcast posisi 60fps. Kalau nanti mau kebanding antar pemain, pakai pola SAMA kayak Math Race (sinkron skor akhir doang).
- Drive Mode (mobil) **wajib tetap jalan identik** — udah divalidasi manual di preview branch, full playthrough gak ada regresi.
- Soal matematika tetap jadi hook utama — **udah dikerjain lebih awal dari rencana** (harusnya Fase 4, dipindah maju karena tanpa ini bukan game belajar namanya, cuma arcade shooter).

**Progress fase:**
1. ✅ **Engine inti** (done) — arena scroll vertikal (`#plane-world`, parallax starfield 2 layer beda speed), joystick (`setupAnalogStick("plane-joystick", ...)`, reuse function yang sama persis kayak Drive Mode), auto-fire tiap `PLANE_FIRE_INTERVAL_MS`, musuh (`👾`) spawn+turun, collision peluru-vs-musuh (skor), collision kapal-vs-musuh. Divalidasi lewat state manipulation langsung (browser-pane gak bisa nge-tick `requestAnimationFrame` beneran di tab background/hidden — itu keterbatasan tooling testing, bukan bug).
2. ✅ **Bullet hell layer** (done) — musuh punya timer nembak sendiri-sendiri (`enemy.nextFireAt`, staggered `PLANE_ENEMY_FIRE_MIN_MS`–`MAX_MS`) nembak peluru ke bawah (`.plane-enemy-bullet`, warna beda dari peluru pemain biar kebeda), sistem 3 nyawa (`PLANE_MAX_LIVES`, HUD `#plane-lives` pola sama kayak `#drive-lives`), kena hit (peluru musuh ATAU nabrak badan musuh) = `planeTakeHit()` — 1 nyawa ilang + invuln `PLANE_HIT_INVULN_MS` + ship kedip (`.plane-ship.hit`, mirror `.drive-car.bitten`). Nabrak musuh sekarang gak instant-death lagi, musuhnya ikut hancur (kamikaze) sama kayak kena tembak. Nyawa habis → `endPlaneMode(true)` ("Game Over").
3. ✅ **Math question hook** (done, dipercepat dari Fase 4) — tiap `PLANE_QUESTION_INTERVAL_MS` (~15 detik) game pause, `showPlaneQuestion()` nampilin soal MC via `#plane-question-overlay` (nested DI DALAM `#screen-plane`, bukan reuse `#drive-question-overlay` punya Drive Mode langsung — kena gotcha overlay-nested-in-inactive-screen kalau dipaksa reuse cross-screen). Soal-nya REUSE generator yang sama persis kayak Drive Mode (`rollDriveQuestion(driveDifficulty)` + `buildQuickMc()`), jadi kualitas/variasi soal konsisten, gak bikin bank soal baru. Jawaban bener = bonus +3 skor + "bomb" (semua musuh & peluru musuh di layar kehapus instan) — itu alasan konkret buat pengen jawab bener, bukan cuma interupsi. Jawaban salah = gak ada penalti, gak ada reward, lanjut aja. Attempt dicatat ke `AIGLeaderboard.recordTopicAttempt("mathville", "plane-mode", isCorrect)` — topic key sendiri, gak kecampur sama stats "drive-mode". **Gotcha teknis**: setelah manggil `showPlaneQuestion()` (yang set `paused=true`), kode di `frame()` HARUS tetep jalan sampe baris `requestAnimationFrame(frame)` di paling bawah — kalau di-`return` lebih awal abis manggil itu, loop-nya berhenti permanen (gak ada lagi yang re-arm rAF walau soal udah dijawab & `paused` balik `false`).
4. ✅ **Juice** (done) — `spawnPlaneExplosion(x, y, big?)` bikin emoji 💥 yang scale-up+fade (`.plane-explosion`, `.5s`), dipanggil di tiap titik musuh hancur (kena peluru pemain, bomb reward, kamikaze) plus versi gede (`.big`) pas kapal sendiri crash. `shakePlaneWorld()` — CSS shake `.3s` di `#plane-world` (perlu force-reflow lewat `void world.offsetWidth` antara remove+re-add class, kalau enggak animasi gak re-trigger pas kena hit 2x beruntun), dipanggil dari `planeTakeHit()` (jadi otomatis ke-trigger di kedua jalur "kena hit": peluru musuh & kamikaze) plus manual di bomb reward biar keliatan lebih "nampol".
5. ✅ **Progression** (done) — enemy kill (bukan boss) punya 22% chance drop power-up (`⚡` rapid-fire 8 detik / `🛡️` shield 6 detik, jatuh kayak enemy biasa, nempel pas ketauan ship), wave difficulty naik tiap `PLANE_DIFFICULTY_RAMP_MS` (10 detik) — spawn interval turun & enemy speed naik, dua-duanya di-cap biar gak jadi mustahil. Begitu skor nyampe `PLANE_BOSS_SCORE_THRESHOLD` (15), spawn enemy biasa berhenti total, satu boss (🐉, `PLANE_BOSS_MAX_HP=8`) muncul — geser kiri-kanan mantul di tepi (bukan turun kayak enemy biasa), nembak lebih sering, butuh beberapa kali kena baru mati. HP bar boss (`#plane-boss-hp`) muncul otomatis pas boss spawn.
6. ✅ **Polish** (done) — ngalahin boss sekarang beneran menang (`endPlaneMode(false)`, sebelumnya dead code yang gak pernah kepanggil) + kasih XP asli lewat `saveChapterProgress("plane-mode", 3, PLANE_WIN_XP=20)` — path `players/{id}/badges/mathville` yang sama kayak semua chapter — plus confetti kayak menang di Drive Mode. **Catatan**: Drive Mode sendiri masih belum kasih XP pas menang (gap yang sama, cuma `recordTopicAttempt` doang) — sengaja gak diretrofit sekalian, di luar scope kerjaan plane-mode ini.

Semua fase (1-6) kelar dan **udah di-merge ke `main` + deploy production** (`feature/plane-mode` → `main`, `vercel --prod`).

**Round tweak berikutnya (v2), per feedback abis dicoba** — di branch `feature/plane-mode-v2`, BELUM di-merge:
- Ship kurang responsif 25% (`PLANE_SHIP_SPEED` 1.6→1.2) — kerasa kegesitan/twitchy sebelumnya.
- **Game sekarang endless** — ngalahin boss GAK LAGI ngakhirin round (sebelumnya itu satu-satunya cara "menang"). `handleBossDefeat()` (baru) kasih XP+toast+confetti, terus rame in-in-in makin susah: enemy density `×1.20` compounding tiap boss kalah (mulai dari `1.10` di awal — permintaan "perbanyak 10% di awal, 20% tiap boss kalah"), threshold boss berikutnya `+15` makin jauh, interval soal makin rapat (turun tapi di-floor `PLANE_QUESTION_INTERVAL_MIN_MS=8000`). Satu-satunya cara round berakhir sekarang cuma nyawa habis — `endPlaneMode()` disederhanain (parameter `crashed` dihapus, dulu-dulunya cuma dipanggil `true` doang lewat jalur nyata, jalur `false`/"win" itu dead code).
- **Soal sekarang campuran 3 game** — 50% mathville (SELALU di-roll level "easy" spesifik, karena tiap generator di `generators.js` jamin tier itu mental-math-only, gak ada angka segede yang butuh kertas kayak "medium"/"hard"), 25% SolarQuest (`azkauniverse/questions.json`, cuma type `"mc"` yang gak ada `image`), 25% Language & Arts (`azkacraft/questions.json`, cuma type `"mc"`). Kedua pool di-fetch sekali secara lazy (`ensurePlaneQuestionPools()`, fire-and-forget dipanggil pas `launchPlaneMode()`) — kalau fetch belum kelar atau gagal, fallback ke soal mathville biasa, gak pernah nge-block game. **Awas kalau format questions.json azkauniverse/azkacraft berubah lagi** — field name-nya BEDA tiap game (azkauniverse: `question`+`answer` sebagai INDEX ke `options`; azkacraft: `prompt`+`answer` sebagai TEKS jawaban langsung; mathville: `prompt`+`correctLabel`) — `ensurePlaneQuestionPools()` yang nge-mapping ke bentuk seragam `{prompt, options, correctLabel}`.
- **High score persisten** — `PROGRESS.planeHighScore` (di localStorage/Firebase blob yang sama kayak semua chapter, `players/{id}/badges/mathville`), update live di HUD (`#plane-best`) begitu skor sesi ini lewatin best sebelumnya, juga tampil di layar Game Over.

Preview: `https://al-idrisi-games-git-feature-plane-mode-v2-ellilo.vercel.app/mathville/index.html`. Nunggu Adit coba dulu sebelum merge.

## Android app — Capacitor dipertahankan, TWA lama DEPRECATED (keputusan 2026-08-03)

**TWA lama** (Bubblewrap, `fun.playalidrisi.twa`) — project + keystore masih ada di `~/Documents/al-idrisi-games-android-keystore/` (di LUAR repo, gak dihapus, tapi udah gak dipakai/di-maintain lagi). Keputusan eksplisit: **Capacitor yang dipertahankan**, TWA dianggap deprecated.

⚠️ **Bug yang ketemu & udah difix pas keputusan ini dibuat**: halaman download publik `playalidrisi.fun/android/` (`android/index.html`, serve `android/brainbox.apk`) ternyata masih nyajiin APK **TWA lama** (1.3MB) ke siapapun yang klik link download — bukan Capacitor yang seharusnya jadi app resmi. Sudah diganti (`android/brainbox.apk` sekarang APK Capacitor asli, 8.2MB, copy dari `~/Documents/al-idrisi-games-android-capacitor/dist/brainbox-capacitor-debug.apk`) + teks ukuran file di halaman-nya diupdate. **Kalau Capacitor di-rebuild lagi ke depan (native-level change), inget buat copy ulang APK barunya ke `android/brainbox.apk` di repo ini** — dua file itu gak sinkron otomatis.

`.well-known/assetlinks.json` (Digital Asset Links buat verifikasi TWA, isinya nunjuk ke package `fun.playalidrisi.twa`) dibiarin ada dulu (gak dihapus) karena masih ada kemungkinan tester punya TWA lama ke-install — tapi ini gak relevan lagi buat Capacitor (Capacitor bukan TWA, gak butuh asset-links verification), aman dihapus kapan aja kalau mau beres-beres lebih lanjut.

**Capacitor** (`~/Documents/al-idrisi-games-android-capacitor/`, TERPISAH dari repo hub) — package `com.brainbox.app`, appName "BrainBox". **Bukan TWA** — `capacitor.config.json` di-set `server.url: "https://playalidrisi.fun"`, jadi WebView-nya selalu nunjukin live site, BUKAN bundle lokal. Artinya semua update konten/gameplay otomatis kepake tiap app dibuka, **gak perlu rebuild APK sama sekali** kecuali ubah hal native (icon, nama, permission, push notif setup, min SDK).
   - Build butuh **JDK 21** (bukan JDK17 yang dipake TWA/bubblewrap) — Capacitor 8.x gak jalan di JDK17. Install terpisah (`brew install openjdk@21`), gak ganggu setup JDK17 yang lama.
   - Icon native (launcher + adaptive icon foreground) di-generate dari `~/Documents/brain-box/icon-candidates/icon-v3-512.png` pake Pillow (crop ke ~68% safe-zone buat foreground layer, background adaptive icon `#F6E3B4`).
   - Debug-signed aja (bukan release keystore) — cukup buat sideload manual (`adb install -r`) ke device tester, gak perlu Play Store/signing beneran karena distribusinya cuma buat kelas, bukan publik luas. Kalau native-level berubah (bukan cuma konten), APK baru harus di-rebuild & di-reinstall manual (uninstall dulu kalau signature/keystore beda).
   - APK terakhir ada di `~/Documents/al-idrisi-games-android-capacitor/dist/brainbox-capacitor-debug.apk` (sama isinya kayak `android/brainbox.apk` di repo ini, per fix di atas).

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
4. ~~AI Tutor interaktif+personalized baru di MathVille~~ — **udah di-rollout ke SEMUA 4 game** (azkacraft, azkauniverse, dan sekarang **multipleazka/Math Race**, 2026-08-03 — widget Bo dari nol + hint upgrade ke interaktif, lihat bagian "Bo (maskot AI)" di atas). Gap ini closed.
5. **Domain migration** `brainbox.lol` — nunggu user beli `AIBrainbox.fun` dan pindahin project brain-box dulu.
6. ~~TWA lama vs Capacitor baru~~ — **udah diputusin (2026-08-03): Capacitor yang dipertahankan**, TWA deprecated. Lihat bagian "Android app" di atas buat detail + bug download-page yang ketemu & difix bareng keputusan ini.
7. Vercel Deployment Protection buat project ini masih DIMATIIN (preview URL publik) — nyalain lagi kalau udah gak butuh testing preview-branch buat sementara waktu.
8. **Real-device QA** — full QA session udah dilakuin (browser automation, semua pass), tapi beberapa hal cuma bisa divalidasi bener di device fisik: gray focus-ring fix di `#sc-hero-icon` (iOS Safari khususnya), keyboard numerik PIN di Parent Portal, feel touch/scroll picker Focus Round.
9. **Parent Portal** (`/parents`) belum ada rate-limiting/lockout buat percobaan PIN salah berulang — 4 digit PIN + nama anak cukup buat dapet akses; worth diomongin risiko-nya ke guru kalau kelas makin gede.

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
