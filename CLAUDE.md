# Al Idrisi Games — Project Notes

Hub UI sekarang di-rebrand jadi **"BrainBox"** (nama tampilan, favicon, badge, hero title semua diganti) — tapi identifier teknis (nama repo, Firebase project `al-idrisi-games`, domain `playalidrisi.fun`, Android package `fun.playalidrisi.twa`) **sengaja gak diubah**, cuma teks/branding yang user lihat. Jangan bingung sama project **terpisah** `~/Documents/brain-box` (domain `brainbox.lol`, repo/Firebase/Vercel sendiri) — itu app lain yang kebetulan juga namanya "Brain Box" dari awal, gak ada hubungannya sama sekali secara infra dengan hub ini.

Hub berisi game edukasi buatan Adit buat kelas anaknya Azka (Grade 4 SD, Green Montessori School, ~26 murid+guru, roster di `players.js`). Ringkasan lengkap:
- **multipleazka** — Math Race (multiplayer N-seat racing, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering)
- **azkauniverse** — SolarQuest (AI Science Adventure)
- **mathville** — Grade 4 math (9 curriculum chapters, town-map + alternate Drive Mode free-roam driving game)
- **dinorace** — 2-Player Dino Racing. **Full-merge diputuskan 2026-08-03**: dulu snapshot manual dari project terpisah (`~/Documents/dinorace`, domain `dinorace.lol`, Firebase project sendiri `dinorace-d9b8c`), sekarang Firebase-nya udah disatuin ke project hub (`al-idrisi-games`) — lihat detail lengkap di bagian "DinoRace merge" di bawah. GitHub repo asli (`~/Documents/dinorace`) & Vercel project `dinorace.lol` MASIH ada & masih di-maintain manual (dual-deploy, lihat bawah), cuma Firebase-nya doang yang udah jadi satu.

### Daftar lengkap game & mode interaktif (2026-08-05)

**Game utama, ada card di landing page hub** (`index.html`'s `.sc-game-list`):

| Nama tampilan | Folder/kode | Tipe |
|---|---|---|
| Math Race | `multipleazka` | Racing kuis matematika, multiplayer 2-3 pemain (Firebase RTDB realtime) |
| Language & Arts | `azkacraft` | Storybook lessons, 7 chapter (Spelling, Antonyms, Prefixes/Suffixes, Contractions, Capitalization, Reading Comprehension, Creative Writing) — Solo Adventure + Multiplayer |
| SolarQuest | `azkauniverse` | AI Science Adventure |
| MathVille | `mathville` | Town-map, 9 chapter kurikulum matematika — lihat sub-mode di bawah |
| Focus Round | `focus-round` (thin redirect) | Practice 20 soal campuran lintas 3 game (math/lang/science), numpang engine render MathVille |

**Sub-mode/mini-game di DALAM MathVille** (semua 100% kode terpisah dari Town Map, gak saling ganggu):

| Nama | Cara masuk | Tipe |
|---|---|---|
| Town Map | default masuk MathVille | 9 chapter kurikulum, tap kota buat practice round |
| Drive Mode | 🚗 icon topbar / deep-link `?drive=1` | Free-roam mobil, kejar-kejaran sama dino, nabrak city = masuk chapter |
| Plane Mode | pilih "Pesawat" di vehicle picker Drive Mode | Shmup/bullet-hell ala Raiden, soal MC jadi hook utama (bomb reward) |
| Ninja Runner | 🥷 icon topbar | Runner ala Sansu Ninja, 3 kartu subject (Math/Lang/Sci) random difficulty, 20 soal/round, review bareng Bo di akhir |

~~Red Light Green Light~~ — **DIHAPUS TOTAL** (2026-08-05), per keputusan eksplisit user ("cabut aja delete game ga jelas"). Beda sama Glass Bridge yang dipindah ke Language & Arts, RLGL gak dipindah kemana-mana, langsung dicabut abis: topbar icon, `#screen-redlight`, semua `rlglState`/JS, semua `.rlgl-*` CSS — diverifikasi zero leftover reference via grep.

**Game terpisah, TIDAK ada card di landing page hub (SENGAJA, easter egg):**

| Nama | Folder | Catatan |
|---|---|---|
| DinoRace | `dinorace` | 2-player racing murni (soal matematika udah dicabut 2026-08-05, lihat bagian di bawah) — cuma bisa diakses via `dinorace.lol` atau URL langsung `playalidrisi.fun/dinorace/`. **Ini sengaja, bukan gap** — user eksplisit konfirmasi "dinorace emang cuma easteregg game aja", jadi JANGAN tambahin card/link ke landing page hub kecuali diminta ulang. |

**Bo Bridge — dekorasi ambient DAN entry point ke game (jangan ketuker dua fungsi ini):**

| Nama | Lokasi | Catatan |
|---|---|---|
| Bo Bridge (animasi) | Language & Arts, Storybook Trail (banner `#bo-bridge-banner`) | Bo jalan ngelewatin kaca, looping terus — jalan otomatis, gak perlu diapa-apain |
| Glass Bridge Challenge (game) | TAP banner Bo Bridge yang sama | 10 kaca top-down, hold-to-move, soal MC Language & Arts per kaca, retak/jatuh+getar — lihat detail di bawah |
| Roaming car+ninja | Landing page hub | Murni dekorasi kejar-kejaran, tap mobil = shortcut ke Drive Mode MathVille. **Karakter yang ngejar sempet dino, diganti jadi ninja (2026-08-05)** matching MathVille's Ninja Runner — cuma swap SVG-nya doang (`#roam-dino-sprite`), id/class (`.dino-leg`/`.dino-leg-l`/`.dino-leg-r`) dan semua chase-AI JS-nya (`roamState.dino`, dll) SENGAJA gak diubah biar animasi jalan tetep sama persis. |

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
- Fitur yang ditambahin bareng merge ini: translasi penuh ke Bahasa Inggris (dulu Indonesia, ini TETEP dipertahankan), ~~soal matematika ringan tiap 10 detik~~ — **dicabut lagi, lihat bawah**.
- **Round 2 gameplay tweaks (2026-08-03)**, per feedback abis dicoba:
  - **Scene progression by distance** (`updateScene()`, murni kosmetik — cuma ganti class di `#trackWrap`, gak nyentuh obstacle/collision/schedule sama sekali, jadi identik di semua player karena distance itu shared clock berbasis elapsed time): 0-500m tampilan default, 500-1000m jadi scene luar angkasa (`scene-space`), 1000m+ jadi gurun pasir (`scene-desert`). Pas nyampe persis 1000m, sekali doang `triggerMeteorShower()` jalan (toast + beberapa emoji ☄️ jatuh di `#trackWrap`) — visual doang, gak ngefek ke collision, keputusan eksplisit biar gak nambah kompleksitas hit-detection. **Masih ada, gak disentuh sama revert soal di bawah.**
  - ~~`LIVES_MAX` 5 → 3, plus 1x kesempatan revive per race~~ — **dicabut bareng soal (revive-nya numpang soal buat "ngetes" pemain, gak ada gunanya lagi begitu gak ada soal). Lihat bawah.**

**Soal matematika & revive DICABUT LAGI (2026-08-05)**, per keputusan eksplisit user ("hapus soalnya, jadi pure game aja kaya awalnya tanpa soal") — balik ke murni racing tanpa kuis:
- Dihapus total: `askQuestion()`/`generateMathQuestion()` (soal MC tiap `QUESTION_INTERVAL_MS`), overlay `#questionOverlay`, immune pasca-jawab (`QUESTION_IMMUNE_MS`), DAN revive challenge (`startReviveChallenge()`/`REVIVE_CORRECT_NEEDED`/`respawnUsed`/overlay `#reviveOverlay`) — revive ikut kehapus karena mekanismenya "jawab 3 soal buat come back", gak ada revive tanpa soal.
- `LIVES_MAX` balik `3 → 5` (nilai aslinya sebelum revive "membenarkan" penurunan ke 3) — biar gak lebih susah dari sebelum ada fitur soal sama sekali.
- Translasi Inggris, scene progression (day/space/desert + meteor shower), `hitMe()`/`checkCollision()` hit-invuln dasar (`invincibleUntil`/`INVINCIBLE_MS`) semua TETEP ada — cuma bagian yang literally "soal" & "revive via soal" yang dicabut.
- Diverifikasi in-browser (solo mode): race jalan lewat interval 10 detik lama tanpa keganggu, 5 hearts, transisi scene space/desert tetep jalan, no console error.
- Dual-deploy per konvensi: edit di `~/Documents/dinorace` (commit `09d94fb`) → `vercel --prod` buat `dinorace.lol`, copy file yang sama ke `al-idrisi-games/dinorace/` (+ `.hub-back-btn` ditambahin balik) → commit `f349fa3` di repo hub → `vercel --prod` buat `playalidrisi.fun/dinorace/`. Kedua production domain diverifikasi via curl, nol referensi ke soal/revive.
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

### Plane mode (shmup) buat Drive Mode — Fase 1-6 + v2 + v3 + vehicle picker redesign, SEMUA udah di `main` & production

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

**Round tweak v2, per feedback abis dicoba** — **udah di-merge ke `main`** (branch `feature/plane-mode-v2` sekarang cuma sejarah, aman dihapus):
- Ship kurang responsif 25% (`PLANE_SHIP_SPEED` 1.6→1.2) — kerasa kegesitan/twitchy sebelumnya.
- **Game jadi endless** — ngalahin boss GAK LAGI ngakhirin round (sebelumnya itu satu-satunya cara "menang"). `handleBossDefeat()` kasih XP+toast+confetti, terus makin susah: enemy density `×1.20` compounding tiap boss kalah (mulai dari `1.10` di awal), threshold boss berikutnya `+15` makin jauh, interval soal makin rapat (di-floor `PLANE_QUESTION_INTERVAL_MIN_MS=8000`). Satu-satunya cara round berakhir sekarang cuma nyawa habis.
- **Soal campuran 3 game** — 50% mathville (level "easy", mental-math-only), 25% SolarQuest, 25% Language & Arts, di-fetch lazy (`ensurePlaneQuestionPools()`), fallback ke mathville kalau fetch gagal/belum kelar. **Awas**: field name beda tiap game (azkauniverse: `question`+`answer`-sebagai-index; azkacraft: `prompt`+`answer`-teks-langsung; mathville: `prompt`+`correctLabel`) — `ensurePlaneQuestionPools()` yang nyeragamin ke `{prompt, options, correctLabel}`.
- **High score persisten** — `PROGRESS.planeHighScore`, HUD `#plane-best`, tampil juga di Game Over.

**Round tweak v3, per feedback lagi** — **udah di-merge ke `main`** (branch `feature/plane-mode-v3` sekarang cuma sejarah, aman dihapus):
- Ship makin dikurangin sensitivitasnya (1.2→1.02→0.918 total, plus joystick pesawat diperbesar 110px→121px, drag radius ikut nyesuain) — beberapa putaran feedback "masih kegesitan".
- **Bug beneran ketemu & difix**: musuh gerak di lajur vertikal tetap dan peluru mereka SELALU lurus ke bawah dari posisi musuh — kalau kapal diem di satu titik yang "gak sejalur", dia gak pernah kena tembak sama sekali. Sekarang peluru musuh di-aim ke posisi kapal pas ditembakkan (boss juga, reuse `spawnPlaneEnemyBullet` yang sama).
- **Variasi boss** (4 tipe: 🐉🦂👹🦑, cycling per `bossesDefeated`, masing-masing HP/speed/fire-rate beda, 🦑 gerak figure-8) dan **variasi musuh biasa** (4 tipe: 👾👽🛸🦇, pola gerak beda tiap tipe: lurus/sinus/ngedeketin-kapal/zigzag).
- Plane Mode sekarang pake BGM Math Race (lebih energik) via `bgm.js`'s `switchTrack()` baru, balik ke BGM MathVille pas keluar ke map/Drive Mode.
- Chapter "Reading Comprehension" (Language & Arts) di-skip dari question pool Plane Mode — soal jenis "passage" butuh teks bacaan yang gak pernah ditampilin, jadi gak kejawab.
- Drive Mode (mobil): speed +10% (`DRIVE_SPEED`, ikut nambah `DINO_SPEED` juga karena derived dari situ) — **satu-satunya perubahan v3 yang nyentuh Drive Mode**.

**Vehicle picker redesign + difficulty easing** — **udah di-merge ke `main`** (branch `feature/vehicle-select` sekarang cuma sejarah, aman dihapus):
- Picker sekarang 2 langkah: pilih kategori (Mobil/Pesawat, gak berubah) → grid 3 kolom, 5 desain per kategori (mobil: Blaze/Comet/Turbo/Sunburst/Nova; pesawat: Falcon/Inferno/Viper/Solstice/Ghost), masing-masing SVG beda siluet + warna glow signature sendiri (`.vehicle-glow`). Cosmetic doang — logic gameplay identik lintas skin. Pilihan persisten di localStorage, ke-highlight lagi kalau buka picker lagi.
- `#drive-car` sekarang punya wrapper `#drive-car-sprite` biar ganti skin gak ikut nge-replace Bo-face/hint yang nempel di situ.
- Difficulty di-ease dari v3 (yang katanya kegantengan/susah): peluru musuh biasa sekarang punya ±24° random miss (bukan laser-akurat kayak v3), boss tetep akurat (±12°). Enemy density starting multiplier balik turun 10% (dari "+10% di atas baseline" jadi kira-kira baseline lagi).

Semua branch di atas (`feature/plane-mode`, `-v2`, `-v3`, `feature/vehicle-select`) statusnya **udah ke-merge penuh ke `main`** — kalau mau beres-beres, aman dihapus kapan aja (gak akan ilang riwayatnya, udah nempel di `main`).

## Language & Arts — Bo Bridge (ambient animation) + Glass Bridge Challenge (game via tap)

Ide awalnya dari brainstorm "game apa dari Squid Game yang bisa diadaptasi" — jadi mini-game "Glass Bridge Challenge" (top-down vertical walk, hold-to-move, soal MC per kaca, retak/jatuh, dst — sempet dibangun penuh di MathVille dulu, lalu dipindah ke Language & Arts). Sempet **dicabut total** (2026-08-05 pagi) diganti jadi cuma animasi hiasan "Bo Bridge" doang, TAPI **beberapa saat kemudian di-reintroduce lagi** (2026-08-05, sesi yang sama) per keputusan eksplisit user: tap banner Bo Bridge sekarang beneran BUKA game itu lagi. Jadi sekarang keduanya hidup berdampingan di 1 elemen yang sama — banner-nya tetep jalan sebagai animasi ambient terus-terusan, TAPI juga jadi tombol (`<button>`) yang kalau di-tap masuk ke `#screen-glass`.

**Bo Bridge (animasi, gak berubah)**: Bo (maskot brain pink) jalan ngelewatin sebaris kaca di `#bo-bridge-banner` tepat di bawah judul "Your Storybook Trail" (`#screen-map`), masuk dari satu ujung layar, keluar di ujung lain, LOOPING terus — kaca-kacanya muncul perlahan di depan Bo dan menghilang perlahan di belakangnya. `startBoBridgeAnim()`, rAF loop, berhenti otomatis begitu `#screen-map` gak lagi `.active`, restart otomatis kalau balik. Detail lengkap gak berubah dari sebelumnya.

**Glass Bridge Challenge (game, reintroduce)**: anak tahan tombol `#glass-move-btn` buat "jalan" naik kolom 10 kaca (`requestAnimationFrame` loop). Nyampe tiap kaca, gerakan pause otomatis, muncul soal MC 2 pilihan dari question bank Language & Arts sendiri (chapter 1-5, 6/7 di-skip — sama persis kayak sebelumnya, lihat `ensureGlassQuestionPool()`). Salah = kaca retak + soal baru di-reroll di kaca YANG SAMA, sampe `GLASS_MAX_ATTEMPTS` (3) percobaan. Percobaan ke-3 masih salah = kaca pecah, karakter jatuh, HP getar (`navigator.vibrate`). Nyampe kaca ke-10 = menang.
- **Player sprite**: BUKAN lagi emoji 🧍 (versi sebelum dicabut), dan BUKAN Bo. Iterasi pertama pas reintroduce cuma lingkaran oranye polos — direvisi lagi ("jangan lingkaran gt aja... pake gambar atau animasi orang") jadi SVG orang beneran tampak dari atas: kepala (+rambut), badan (torso ellipse), lengan di kedua sisi, kaki mengintip di bawah badan — detailnya setara top-down car-nya Drive Mode MathVille, bukan cuma bentuk abstrak. Lengan+kaki punya animasi walk-cycle (`.walking` class, swing bergantian kiri-kanan, pola sama persis kayak `roamLegSwing` yang dipake dino di landing page hub) yang nyala pas tombol `#glass-move-btn` ditahan, mati otomatis pas dilepas ATAU pas nyampe boundary kaca (biar gak "jalan di tempat" pas soal muncul).
- Entry point: tap `#bo-bridge-banner` (sekarang elemen `<button>`, bukan `<div>`, biar keyboard-accessible) → `launchGlassBridge()`. Tombol "Exit" balik ke `#screen-map` (banner ambient-nya lanjut jalan lagi di situ).
- Kode game 100% terpisah dari `startBoBridgeAnim()` — gak ada shared state, cuma numpang trigger dari click listener yang sama elemennya.
- **BGM**: `showScreen()` sekarang muter track `"game"` (energik) buat `screen-glass`, bukan `"menu"` (santai, default semua screen lain) — user sempet nanya bisa pakein lagu asli Squid Game, TAPI itu musik berhak cipta Netflix jadi gak bisa dipake/di-sourcing. Ini solusi sementara (reuse track yang udah ada, bukan bikin track baru) biar lebih kerasa tegang. Kalau mau lebih niat lagi ke depannya: user perlu nyariin sendiri track royalty-free (Pixabay Audio/Incompetech/freesound.org), taro di `azkacraft/audio/bgm/`, baru di-wire ke `bgm.js` sebagai track ke-3 — belum dijalanin.

**Asset Bo**: `azkacraft/bo-face-transparent.png` — hasil crop+background-removal dari `icon-512.png` (app icon Bo yang aslinya di dalem kartu kuning bulat), background kuning/gold-nya di-chroma-key hapus. ⚠️ Proses background-removal itu SEMPET korup 1 mata (kena hapus juga karena kebetulan ke-detect sebagai warna "gold" mirip background) — mata udah direkonstruksi manual (pupil hitam digambar ulang pake PIL). **Path-nya HARUS relatif tanpa `../`** (`bo-face-transparent.png`) — beda sama pola `../icon-192.png` yang dipake buat avatar chat Bo di tempat lain (yang itu emang cuma jalan di hub, 404 di `azkasocial.fun` standalone, pre-existing bug yang gak disentuh di sini) — `azkacraft/` folder ini di-deploy dual (hub: nested di bawah `playalidrisi.fun/azkacraft/`, standalone: JADI root-nya `azkasocial.fun`), jadi asset kudu relatif ke folder `azkacraft/` sendiri, BUKAN `../` ke atasnya.

**Styling banner**: tint tipis (`rgba(207,232,245,.35)`, gak ada border/box-shadow), plus `cursor:pointer` + subtle scale-down `:active` biar kerasa "bisa dipencet" — awalnya sempet card biru solid + border, direvisi per feedback "ga usah pake card biru... ga usah pake listing cardnya".

Dual-deploy ke hub (`playalidrisi.fun`) + standalone (`azkasocial.fun`).

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

## Ninja Runner mode (ala Sansu Ninja) — LIVE di production

Ide dari riset app edukasi Jepang (2026-08-05) — terinspirasi **算数忍者 (Sansu Ninja / "Math Ninja")**, app matematika Jepang populer (2.9 juta rating App Store, 4.4★). Awalnya di-iterasi lewat beberapa ronde demo visual (`visualize` widget tool, ephemeral chat-only) sebelum dibangun beneran — riwayat evolusi konsepnya (buat konteks kalau ada yang nanya "kenapa gini"):
1. Demo pertama: karakter lari + encounter soal + musuh blob ketebas kalau jawaban benar + reward card 3 rarity (Common/Rare/Legendary, SVG-based). **Catatan yang masih relevan**: mekanik "tebas musuh" itu BUKAN dikonfirmasi ada di Sansu Ninja asli (dari screenshot yang dicek gak keliatan elemen ini) — ide tambahan dari brainstorm kita sendiri.
2. Revisi: bukan musuh yang ketebas, tapi **kartu soalnya sendiri** yang kebelah diagonal pas jawaban benar — efek final yang dipakai.
3. Revisi: bukan pilih tingkat kesulitan (Easy/Medium/Hard sebagai 3 kartu terpisah), tapi **3 kartu = 3 SUBJECT** (Math cream/Language & Arts hijau/Science biru), masing-masing kartu dapet tingkat kesulitan RANDOM independen — anak milih berdasarkan subject yang disuka, bukan berdasarkan gampang/susahnya.
4. Reward card collection **DICORET dari scope** — gak jadi dibangun (kompleksitas Firebase + halaman koleksi terpisah dianggap gak worth-it buat versi pertama ini; kalau mau ditambah lagi nanti itu extension terpisah).

**Implementasi final (2026-08-05, `mathville/index.html`/`script.js`/`style.css`)**:
- **Entry point**: icon 🥷 di topbar MathVille (`btn-ninja`, visibility sama kayak `btn-map`/`btn-drive` — hidden di landing/pair, muncul di semua screen lain) → `launchNinjaRunner()` → `#screen-ninja`.
- **Karakter**: side-view ninja CSS (bukan top-down kayak Glass Bridge/Bo Bridge) — kaki+tangan gantian ayun pas `.running`, sword-guard idle (kaki freeze, pedang diangkat+wiggle) pas `.guard` (lagi jawab soal). ⚠️ **Gotcha yang ketemu & difix**: pedang punya z-index lebih rendah dari kepala/mask secara default, jadi pas rotasi ke pose guard dia ketutupan/invisible — fix-nya kasih `z-index:5` khusus di state `.guard .ninja-sword`.
- **3 kartu subject per round**: Math (cream `#f0dcc4`, ikon lingkaran), Language & Arts (hijau `#c1e1c1`, ikon bintang), Science (biru `#c1d4f6`, ikon bintang) — tiap kartu independen di-random Easy/Medium/Hard (`NINJA_DIFFS[rand(0,2)]`, bisa Hard+Hard+Medium, gak fixed slot). Poin per tier: Easy 10, Medium 25, Hard 50 (`NINJA_PTS`).
- **Sumber soal — numpang infrastruktur yang udah ada, gak bikin bank baru**:
  - Math: `buildQuickMc(rollDriveQuestion(difficulty))` — sama generator Drive Mode/Plane Mode, BENERAN difficulty-aware.
  - Language & Arts / Science: `pickFromPlanePool(planeLanguagePool / planeSolarPool)` — numpang cross-game pool yang tadinya dibangun buat Plane Mode (`ensurePlaneQuestionPools()`). ⚠️ **Simplifikasi yang didokumentasikan di kode**: pool ini gak ada tag difficulty, jadi buat 2 subject ini Easy/Medium/Hard cuma ngubah POIN doang (10/25/50), bukan soal yang beneran lebih susah — soal-nya sama aja regardless tier yang dipilih.
- **Jawaban benar**: kartu soal kebelah diagonal 2 bagian (`.ninja-qhalf-a`/`.ninja-qhalf-b`, `clip-path` + animasi translate+rotate+fade berlawanan arah), poin nambah, lanjut ke kartu subject berikutnya.
- **Jawaban salah**: bulatan jawaban goyang+merah sebentar (`.wrong-flash`), attempt dicatat ke `wrongLog`, langsung lanjut ke soal berikutnya (single-attempt per soal, bukan retry — biar round tetep fix 20 soal).
- ⚠️ **Gotcha yang ketemu & difix**: soal cerita panjang (word problem, terutama yang baru ditambahin ke Addition & Subtraction) bikin card soal lebih tinggi dari perkiraan, dan posisi bulatan jawaban yang tadinya `position:absolute; top:134px` (fixed offset) numpuk DI ATAS teks soal buat card yang tinggi. Fix: bungkus qcard+bubbles dalam `.ninja-encounter` (flex-column, gak pakai fixed top offset), jadi bulatan otomatis ngikutin tinggi card berapapun.
- **Musik**: `AIGBgm.playPlaneTrack()` (reuse track "game" yang lebih energik, sama yang dipake Plane Mode) pas masuk, `AIGBgm.playDefaultTrack()` pas keluar — user sempet nanya bisa pake lagu Squid Game asli, TAPI itu berhak cipta Netflix jadi gak bisa disourcing; solusinya reuse track yang udah ada, bukan generate/cari baru.
- **20 soal per round**, HUD `#ninja-qnum`/`#ninja-score` real-time. Abis soal ke-20: overlay finish "🏁 Your journey has completed." + skor final + `saveChapterProgress("ninja-runner", 3, NINJA_WIN_XP=20)` (XP + Firebase progress, pola sama kayak Plane Mode win).
- **Review bareng Bo**: overlay terpisah abis finish, cuma nampilin soal yang SALAH (dari `wrongLog`), satu-satu dengan Prev/Next (disabled di ujung), tampilin jawaban-kamu (merah) vs jawaban-benar (hijau). Kalau `wrongLog` kosong, tampilin pesan "Sempurna, gak ada yang salah!" tanpa nav Prev/Next. Bo pakai `icon-192.png` yang sama kayak avatar Bo lainnya (bukan `bo-face-transparent.png` yang di azkacraft — itu punya path khusus buat konteks lain).
- Semua diverifikasi in-browser: 3 subject narik soal beneran dari sumber masing-masing, jawaban benar/salah lewat klik UI asli, guard pose+pedang keliatan, XP/Firebase progress kesimpen, finish+review (dengan salah maupun sempurna) jalan, zero console error.

Referensi app yang dipakai buat riset: Sansu Ninja (App Store JP, `id838086772`), Todo Math (App Store US, `id666465255`).

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
9. **Parent Portal** (`/parents`) belum ada rate-limiting/lockout buat percobaan PIN salah berulang — 4 digit PIN + nama anak cukup buat dapet akses. Udah pernah ditawarin ke user (2026-08-05), **eksplisit dijawab "diemin aja"** — bukan lupa, JANGAN diusulin ulang kecuali user yang nanya duluan.

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
