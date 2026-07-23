# Al Idrisi Games — Session Summary (untuk lanjut di session baru)

## Project overview
`~/Documents/al-idrisi-games` — hub berisi 3 game edukasi buatan Adit untuk kelas anaknya Azka (~26 murid+guru, roster di `players.js`):
- **multipleazka** — Math Race (multiplayer N-seat racing game, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering system)
- **azkauniverse** — SolarQuest (AI Science Adventure)

Tiap game itu Vercel project terpisah, plus hub-nya sendiri juga Vercel project. Domain:
- Hub: `playalidrisi.fun/` — path `/{game}/` di domain ini adalah **file yang sama** dari repo hub (bukan proxy ke project game terpisah)
- Legacy standalone domains (project Vercel terpisah dari hub, tapi kontennya harus identik): `multipleazka.fun`, `azkasocial.fun` (alias project `azkacraft`), `azkasolar.quest` (alias project `azkauniverse`)

**PENTING — dua target deploy buat SEMUA 3 game (bukan cuma azkacraft):** tiap kali edit file di `multipleazka/`, `azkacraft/`, atau `azkauniverse/`, harus **both**:
1. `git push origin main` → update `playalidrisi.fun/{game}/` (via hub auto-deploy)
2. `cd {game} && vercel --prod --yes` → update domain standalone-nya
Kelupaan salah satu bikin dua domain beda isi (udah kejadian sekali sesi sebelumnya). Verifikasi cepat: `diff <(curl -s https://playalidrisi.fun/{game}/somefile.js) <(curl -s https://{standalone-domain}/somefile.js)`.

**Deploy pattern:**
- Hub (root files: `index.html`, `style.css`, `leaderboard.html/css`, `hub-bgm.js`, `player.js`, `players.js`, `firebase.js`, `leaderboard.js`, `dashboard/`, `api/`): auto-deploy via GitHub integration (`git push origin main` sudah cukup)
- Tiap game: **manual** `cd <game-dir> && vercel --prod --yes` setelah push

Shared player identity: `window.AIGPlayer.getPlayer()` dari `player.js` → `{id, name, role}`.

## ⚠️ ADA SESI LAIN YANG BEKERJA PARALEL DI REPO INI
Sepanjang sesi ini, terdeteksi commit-commit yang BUKAN dari sesi ini masuk ke `main` (fitur dashboard guru/ortu — lihat bagian "Dashboard" di bawah). Kemungkinan besar user buka beberapa sesi Claude bersamaan di project yang sama. **Sebelum commit apapun, selalu `git status --short` dulu** dan cuma `git add` file yang benar-benar kamu edit sendiri — jangan `git add -A`/`git add .` sembarangan, supaya gak numpuk kerjaan sesi lain yang mungkin belum siap ke-commit.

## Struktur data (player/progress)

**`player.js`** — localStorage key `aig_player`, isi `{id, name, role}` milik player yang lagi dipilih di device ini. `AIGPlayer.getPlayer() / setPlayer() / clearPlayer()`.

**`players.js`** — `window.AIG_PLAYERS`, array statis roster: `{id, name, role: "teacher"|"student", parentEmail}`. `parentEmail` bisa comma-separated (multi-ortu). **Cuma Azka yang keisi** parentEmail-nya (2 alamat) — 24 murid lain kosong string, jadi fitur kirim-email dashboard baru bisa dites nyata buat Azka doang sampai data lain diisi manual.

**`firebase.js`** — init Firebase project `al-idrisi-games` (punya hub sendiri, terpisah dari Firebase project masing-masing game yang dipakai buat multiplayer pairing).

**`leaderboard.js`** — helper baca/tulis ke Firebase project hub, named app `"aig"`:
- `recordPlay(gameId)` → increment `leaderboard/{gameId}/{playerId}/timesPlayed` + `name`, `lastPlayed`. **Sekarang return Promise** yang resolve ke angka `timesPlayed` terbaru (dulu gak return apa-apa) — dipakai buat cek milestone badge tanpa read terpisah. Perubahan ini non-breaking, caller lama yang fire-and-forget tetap jalan normal.
- `watchGame(gameId, callback)` → live-listen `leaderboard/{gameId}` (dipakai leaderboard.html)
- `getProgress(gameId)` / `setProgress(gameId, data)` → baca/tulis `players/{playerId}/badges/{gameId}`
- `recordTopicAttempt(gameId, topicKey, isCorrect)` → tulis ke `players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}` — buat dashboard nunjukin kelemahan spesifik per topik (misal "perkalian 7 masih sering salah"). Dipanggil dari ketiga game.

Skema Firebase RTDB (project hub):
```
leaderboard/{gameId}/{playerId}/{name, timesPlayed, lastPlayed}
players/{playerId}/badges/{gameId}/{...progress spesifik tiap game, termasuk badges/wins buat mathrace}
players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}
insights/{studentId}/{draft, status: pending|approved, approvedAt, sentAt, sentTo}   ← dashboard guru/ortu
```

## Dashboard guru/ortu (fitur dari SESI LAIN yang paralel — belum di-QA penuh oleh sesi ini)
File: `dashboard/index.html`, `dashboard/config.js`, `dashboard/style.css`, `dashboard/dashboard.js`, `api/send-insight.js`.
- Alur: generate draft insight per murid (dari topicStats) → status "pending" → guru approve → status "approved" → kalau `parentEmail` keisi, ada tombol "Kirim Email ke Ortu" → panggil `/api/send-insight` (pakai Resend API, env var `RESEND_API_KEY`/`RESEND_FROM` udah ke-configure di Vercel production).
- **Belum pernah dites end-to-end beneran** (belum ada bukti email sukses nyampe ke inbox asli) — kode & config-nya udah kelihatan benar pas dicek.
- Validasi email di `parseEmails()` cuma cek `.includes("@")`, lemah tapi gak fatal.

## Kerjaan yang sudah selesai sesi ini (tambahan dari sesi sebelumnya, urutan kronologis)

### BGM ditambah ke Math Race & SolarQuest
- File baru `multipleazka/bgm.js` dan `azkauniverse/bgm.js` — pola sama persis kayak `hub-bgm.js`/`azkacraft/bgm.js` (Web Audio API GainNode, retry-resume tiap gesture, `kickAudioContext()` buat iOS)
- Volume 0.30 di SEMUA 4 titik BGM sekarang (hub, azkacraft menu+game, multipleazka, azkauniverse) — udah di-cross-check konsisten
- Math Race: BGM **stop otomatis pas race mulai**, **resume otomatis** setelah confetti selesai (device pemenang, delay 3 detik) ATAU langsung (device yang kalah, gak ada confetti buat ditunggu) — logic ada di `startRace()`, `endGame()`, `endSoloRace()`, `celebrateWin()` di `multipleazka/script.js`
- Beberapa kali ganti file musik atas request user (semua dari `~/Downloads/`, di-copy ke `{game}/audio/bgm/bgm.mp3` atau `audio/bgm/hub.mp3`) — kalau user minta ganti lagi, tinggal ulangi pola copy+deploy yang sama

### QA pass sistematis (baru pertama kali dilakuin di project ini)
Ditemukan & di-fix: **#11 — gak ada deteksi disconnect di multiplayer Math Race**. Kalau device lawan disconnect (nutup tab/app/sinyal ilang) sebelum race selesai, device yang masih aktif dulu nunggu tanpa resolusi selamanya. **Fix:** pakai Firebase `onDisconnect()` — `registerDisconnectHandling(code, seatKey)` dipanggil pas create/join game, nandain `disconnected: true` di seat sendiri otomatis kalau koneksi putus (gak perlu polling/heartbeat manual). Device lain detect ini di `attachGameListener()`, munculin overlay "Your opponent left the race" + tombol "Back to Menu" (`handleOpponentLeft()`). Kerja baik di kasus disconnect pas race maupun masih pairing.

Temuan lain yang OK (gak ada bug): konsistensi volume BGM, konsistensi domain (`playalidrisi.fun/{game}` vs domain standalone — identik), instrumentasi `recordTopicAttempt` di ketiga game.

Temuan yang **cuma observasi, bukan bug**: Math Race gak punya `getProgress`/`setProgress` (XP/badges) kayak 2 game lain — cuma `recordPlay` doang. Ini yang jadi trigger obrolan "badge system" di bawah.

### Redesign UI Math Race (role-select & vehicle-select)
- **Role select** (`screen-role`): dari card putih-outline-polos jadi card full-color (oranye Kids / biru Parent), checkered flag decoration, card sejajar horizontal (grid 2 kolom, bukan stack), plus dekorasi kata "Race"/"Start"/"Finish" tersebar acak (3 zona biar gak tabrakan) dan confetti ambient tiap 10 detik selama di layar itu (`initRoleScreenDecor()` di `script.js`)
- **Vehicle select** (`screen-vehicle`): tiap kendaraan dikasih warna pastel sendiri (6 warna beda), selected state pakai badge centang bulat biru
- Fix tap-highlight abu-abu jelek di iOS Safari juga buat trophy button hub (`sc-trophy`) — pola fix yang sama kayak elemen lain sebelumnya

### Badge/sticker system — Math Race (`multipleazka/badges.js`, file baru)
6 badge: 🏁 First Race, 🔥 Warm Up (5x main), 🏆 Road Warrior (15x main), 💯 Perfect Run (finish tanpa salah — tracknya pakai `state.raceWrongTotal`, counter baru yang reset tiap race), ⚡ Speedster (finish <25 detik), 🥇 Champion (menang 3x multiplayer, BUKAN solo). Disimpen di `players/{id}/badges/mathrace` (path yang sama persis dipakai 2 game lain, gak ada schema baru — cuma bentuk field-nya beda: `{badges: {id: {earned, earnedAt}}, wins: N}`).
- Toast notifikasi muncul di `screen-over` pas dapet badge baru (`showBadgeToast()`, queue-based kalau lebih dari 1 badge sekaligus)
- Halaman **Sticker Book** baru (`screen-stickers`) — bisa diakses dari `screen-role` (tombol "🎒 My Stickers", kapan aja) atau dari `screen-over` abis race. Badge yang belum kebuka ditampilin sebagai `🔒`/`???`

## 🔨 SEDANG DIDISKUSIKAN — BELUM DIKERJAKAN (lanjutin dari sini!)

User mau bikin identitas login terpisah buat ORANG TUA, karena sekarang kalau ortu mau main harus numpang nama anaknya, dan progress/badge anak bisa "kecemar" data pas ortu yang jawab. Sempet dibahas 3 opsi:
- **Opsi A** (ditolak): skip pencatatan pas toggle "Parent" dipilih DALAM Math Race — cuma nutup celah di Math Race doang, azkacraft/SolarQuest tetep gak terlindungi.
- **Opsi B** (ditolak, tapi bisa jadi pertimbangan lagi kalau prioritas berubah): 1 akun "Parent" bersama, zero-tracking total. Simpel tapi gak bisa kasih metrik keterlibatan ortu.
- **Opsi C (INI YANG DIPILIH)**: identitas parent **per-anak** (misal "Azka's Parent"), BUKA zero-tracking — sengaja ada pencatatan terbatas buat metrik dashboard **"orang tua Azka menemani Azka main Xx minggu ini"** (salah satu tujuan dashboard: liat seberapa banyak ortu terlibat bantu anak belajar).
- Dengan Opsi C, **role toggle "Kids"/"Parent" di DALAM Math Race jadi gak perlu lagi** — role bisa di-derive OTOMATIS dari identitas login (login sebagai "Azka" → auto kids-pace, login sebagai "Azka's Parent" → auto parent-pace). Ini juga nutup celah data-integrity yang lama (orang bisa asal pilih role yang gak sesuai identitas aslinya).
  - **Konsekuensi:** layar `screen-role` yang baru aja di-redesign (racetrack card + doodle + confetti) **JADI GAK KEPAKE LAGI** kalau arah ini dieksekusi — user udah disadarkan soal ini dan tampak oke ngelanjut.

**3 keputusan yang perlu dikonfirmasi user SEBELUM mulai coding Opsi C** (masih ngambang di akhir sesi ini):
1. **Interaksi picker**: gimana cara pilih "aku" vs "orang tuaku" tanpa bikin grid picker hub jadi 2x lebih penuh (25 murid → 50 kotak kalau naif ditambahin semua). Usulan yang udah dilontarkan (belum di-ACC user): tap nama anak dulu → muncul 1 langkah kecil "Main sebagai: Aku / Orang Tuaku" (2 tombol), baru lanjut masuk game.
2. **Aturan hitung "sesi ditemani"**: tiap race yang diselesaikan pas login sebagai identitas parent dihitung 1 sesi? Atau di-cap max 1x/hari (biar gak digelembungin kalau main berkali-kali beruntun)?
3. **Konfirmasi generate otomatis**: identitas "X's Parent" di-derive dari daftar murid yang sudah ada (bukan ditulis manual satu-satu di `players.js`) — user belum bilang "ya" eksplisit ke poin ini, cuma sejauh ini gak keberatan.

**Desain data yang perlu HATI-HATI kalau lanjut Opsi C** (biar gak balik ke masalah semula): counter "sesi ditemani ortu" HARUS di path/field yang terpisah dari `topicStats`/`badges`/`timesPlayed` milik anak — jangan sampai sesi yang dimainkan identitas parent malah numpuk ke statistik akademik anak. Prinsipnya: identitas parent boleh nulis 1 counter baru (engagement), tapi haram nulis apapun ke data performa (topicStats/badges/leaderboard timesPlayed) — itu tetap harus murni milik anak.

**Task tambahan yang udah disepakati user, nunggu dieksekusi bareng Opsi C**: tambahin layar transisi "Get Ready!" (~2-3 detik, non-interaktif, reuse pola suara tick dari `playRaceCountdown` yang udah ada) SEBELUM `screen-vehicle` muncul, biar anak gak kaget langsung diburu timer 10 detik begitu masuk. Timer 10 detik vehicle-select baru mulai jalan SETELAH layar "Get Ready!" ini selesai, bukan dari awal.

## Yang mungkin masih perlu ditindaklanjuti
1. **LANJUTKAN OPSI C** — ini prioritas utama, tinggal nunggu user jawab 3 poin konfirmasi di atas, baru mulai implementasi (picker UI, derive-role otomatis, hapus/ganti `screen-role`, tambah layar "Get Ready!", desain skema data "sesi ditemani").
2. Testing di iPhone/Safari asli buat semua perubahan visual/audio terbaru (redesign Math Race, badge toast, dll) — belum di-reverify di device asli sejak fix `AudioContext` besar kemarin.
3. Testing multiplayer 2-device beneran (bukan simulasi console) buat disconnect handling & BGM stop/resume — logicnya udah diverifikasi via kode+simulasi browser, tapi belum pernah dicoba 2 device fisik.
4. Dashboard guru/ortu: belum ada bukti email approval beneran terkirim; `parentEmail` baru keisi buat 1 dari 25 murid.
5. File `SESSION_SUMMARY.md` ini cuma buat handoff — boleh dihapus dari repo kalau mau (bukan bagian dari app).

## Gaya kerja user (penting buat lanjut)
- User (Adit) komunikasi campur Indonesia-Inggris, kadang emosi/marah kalau hasil kerja meleset jauh dari instruksi — kalau dikasih referensi desain/spec yang sangat spesifik, ikutin PERSIS, jangan improvisasi.
- **User SANGAT suka diskusi/compare opsi dulu sebelum eksekusi** — pola percakapan yang berulang: dia lempar ide, minta dibandingin sama opsi lain (kadang sampai C/D varian), tanya "mana yang lebih gampang/aman buat lo", baru bilang "gas"/"lanjut" kalau udah yakin. JANGAN langsung coding pas masih tahap "gimana menurut lo" — tunggu sinyal eksplisit ("gas", "lanjutin", "kerjain", "deploy") baru eksekusi.
- User suka testing sendiri lalu kasih feedback spesifik per-poin bernomor — tanggapi tiap poin secara eksplisit di respons berikutnya.
- Testing di real device (terutama iPhone/Safari) itu KRUSIAL — mayoritas bug besar sepanjang project ini (audio volume, tap-highlight, AudioContext suspended) cuma muncul di Safari iOS asli. Kalau perlu, pandu user connect device via Safari Web Inspector (Mac wajib pakai Safari, Chrome DevTools GAK BISA remote-debug Safari iOS).
- Kalau mockup diminta, **jangan pakai artifact terpisah/isolated** — mockup harus dilakukan LANGSUNG di halaman asli (edit file asli + screenshot dari situ pakai Browser tool), karena artifact isolated gak include chrome/dekorasi halaman asli sehingga user gak bisa menilai secara fair. Ini pernah di-reject keras di sesi sebelumnya.
- **Selalu `git status --short` sebelum commit** — ada kemungkinan besar sesi lain jalan paralel di repo yang sama (lihat bagian dashboard di atas), jangan asal `git add -A`.
- Setelah edit CSS/JS lokal, sering ketemu "stale browser cache" waktu testing di Browser pane preview (python http.server gak kirim cache-control header, browser suka nyimpen versi lama) — kalau screenshot preview kelihatan gak berubah padahal kode udah diedit, coba cache-bust query param ATAU fetch+inject `<style>`/reload paksa sebelum nyimpulkan ada bug.
