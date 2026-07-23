# Al Idrisi Games — Session Summary (untuk lanjut di session baru)

## Project overview
`~/Documents/al-idrisi-games` — hub berisi 3 game edukasi buatan Adit untuk kelas anaknya Azka (~26 murid+guru, roster di `players.js`):
- **multipleazka** — Math Race (multiplayer N-seat racing game, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering system)
- **azkauniverse** — SolarQuest (AI Science Adventure)

Tiap game itu Vercel project terpisah, plus hub-nya sendiri juga Vercel project. Domain:
- Hub: `playalidrisi.fun/` — path `/{game}/` di domain ini adalah **file yang sama** dari repo hub (bukan proxy ke project game terpisah)
- Legacy standalone domains (project Vercel terpisah dari hub, tapi kontennya harus identik): `multipleazka.fun`, `azkasocial.fun` (alias project `azkacraft`), `azkasolar.quest` (alias project `azkauniverse`)

**PENTING — dua target deploy buat SEMUA 3 game:** tiap kali edit file di `multipleazka/`, `azkacraft/`, atau `azkauniverse/`, harus **both**:
1. `git push origin main` → update `playalidrisi.fun/{game}/` (via hub auto-deploy)
2. `cd {game} && vercel --prod --yes` → update domain standalone-nya
Verifikasi cepat: `diff <(curl -s https://playalidrisi.fun/{game}/somefile.js) <(curl -s https://{standalone-domain}/somefile.js)` — udah jadi kebiasaan rutin tiap abis deploy, dan per QA terakhir SEMUA identik.

**Deploy pattern:**
- Hub (root files: `index.html`, `style.css`, `leaderboard.html/css`, `hub-bgm.js`, `player.js`, `players.js`, `firebase.js`, `leaderboard.js`, `dashboard/`, `api/`): auto-deploy via GitHub integration
- Tiap game: **manual** `cd <game-dir> && vercel --prod --yes` setelah push

Shared player identity: `window.AIGPlayer.getPlayer()` dari `player.js` → `{id, name, role}`.

## ⚠️ Ada sesi lain yang sempat kerja paralel di repo ini
Di pertengahan sesi sebelumnya sempat ada commit-commit yang bukan dari sesi itu (fitur dashboard guru/ortu dasar). Kemungkinan user buka >1 sesi Claude bersamaan. **Sebelum commit apapun, selalu `git status --short` dulu**, cuma `git add` file yang benar-benar diedit sendiri — jangan `git add -A`. Belum ada tanda sesi lain aktif belakangan ini, tapi tetap waspada.

## Struktur data (player/progress) — UPDATED, ada penambahan identitas parent

**`player.js`** — localStorage key `aig_player`, isi `{id, name, role}` milik player yang lagi dipilih di device ini.
- `AIGPlayer.getPlayer() / setPlayer() / clearPlayer()`
- **BARU:** `AIGPlayer.deriveParentPlayer(child)` — derive identitas "orang tua" dari 1 entry murid, TANPA nulis entry baru ke `players.js`. Return `{id: "{childId}-parent", name: "{childName}'s Parent", role: "parent", childId}`. Deterministik (childId sama selalu hasilin id sama).

**`players.js`** — `window.AIG_PLAYERS`, roster statis: `{id, name, role: "teacher"|"student", parentEmail}`. Cuma Azka yang keisi parentEmail-nya (2 alamat) — 24 murid lain kosong.

**`firebase.js`** — init Firebase project `al-idrisi-games` (hub sendiri, terpisah dari Firebase tiap game buat multiplayer).

**`leaderboard.js`** — helper baca/tulis Firebase, named app `"aig"`. **SEMUA fungsi di bawah sekarang punya guard `player.role === "parent"` di satu tempat pusat — otomatis melindungi SEMUA 3 game tanpa perlu sentuh script.js masing-masing:**
- `recordPlay(gameId)` → kalau role BUKAN parent: seperti biasa, increment `leaderboard/{gameId}/{playerId}/timesPlayed`, return Promise resolve ke angka timesPlayed baru. **Kalau role parent:** SKIP leaderboard sepenuhnya, alih-alih tulis `players/{childId}/parentSessions/{YYYY-MM-DD}: {parentName, lastGamePlayed, at}` (pakai tanggal sebagai key → otomatis capped 1x/hari per anak), return `Promise.resolve(null)`.
- `getProgress(gameId)` / `setProgress(gameId, data)` → return `null`/no-op kalau role parent (badges gak pernah tercipta buat identitas parent)
- `recordTopicAttempt(gameId, topicKey, isCorrect)` → no-op kalau role parent (topicStats anak gak pernah kesentuh dari jawaban ortu)
- `watchGame(gameId, callback)` → gak berubah

Skema Firebase RTDB (project hub):
```
leaderboard/{gameId}/{playerId}/{name, timesPlayed, lastPlayed}
players/{playerId}/badges/{gameId}/{...progress spesifik tiap game, termasuk badges/wins buat mathrace}
players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}
players/{childId}/parentSessions/{YYYY-MM-DD}/{parentName, lastGamePlayed, at}   ← BARU, engagement metric
insights/{studentId}/{draft, status: pending|approved, approvedAt, sentAt, sentTo}   ← dashboard guru/ortu
```

## Dashboard guru/ortu
File: `dashboard/index.html`, `dashboard/config.js` (PIN akses, sekarang "2580"), `dashboard/style.css`, `dashboard/dashboard.js`, `api/send-insight.js`.
- Alur: generate draft insight per murid (dari topicStats) → status "pending" → guru approve → status "approved" → kalau `parentEmail` keisi, tombol "Kirim Email ke Ortu" → `/api/send-insight` (Resend API, env var udah ke-configure di Vercel).
- **BARU:** kolom **"Ditemani Ortu"** di tabel murid + section **"Keterlibatan Orang Tua"** di detail overlay — nunjukin berapa hari (Senin-Minggu ini) identitas parent main bareng anak itu, dibaca langsung dari `players/{id}/parentSessions` (data yang sama yang udah ke-fetch buat kolom lain, gak ada Firebase query tambahan). Helper: `parentSessionsThisWeek(studentId)`.
- Belum pernah dites end-to-end beneran (belum ada bukti email approval sukses nyampe ke inbox asli).
- Validasi email di `parseEmails()` cuma cek `.includes("@")`, lemah tapi gak fatal.

## Kerjaan yang sudah selesai sesi ini (kronologis, lanjutan dari sesi sebelumnya)

### Opsi C: Identitas Parent (SUDAH SELESAI DIKERJAKAN & DI-DEPLOY)
Sesi sebelumnya berhenti di "sedang didiskusikan" — sekarang SUDAH dieksekusi penuh:

1. **Hub picker** (`index.html`): tap kartu MURID → muncul modal "Playing as {nama}? 🧒 Just me / 🧑 My parent is playing with/for me" (elemen `#sc-whois-overlay`). Guru gak kena modal ini (langsung masuk). Pilih "parent" → `AIGPlayer.deriveParentPlayer(child)` dipanggil, identitas parent di-set. `scColorFor()` di-update biar avatar identitas parent reuse warna anaknya (lookup by `childId`, bukan `id`, biar gak fallback ke index -1).

2. **Math Race — role auto-derive**: layar `screen-role` (dulu ada 2 tombol Kids/Parent) di-**redesign total** jadi welcome screen simpel — logo, subtitle dinamis, 1 tombol **"Let's Race! 🏁"**, doodle/confetti decoration dipertahankan, tombol Sticker Book dipertahankan. `state.role` sekarang di-derive OTOMATIS dari `AIGPlayer.getPlayer().role === "parent"` (bukan dari klik tombol lagi). CSS `.role-btn`/`.role-buttons`/`.role-emoji`/`.role-title` yang lama udah dihapus (dead code cleanup).

3. **Layar "Get Ready!" baru** (`screen-get-ready`): muncul ~2.5 detik non-interaktif sebelum vehicle-select, reuse `playCountdownBeep(false)` (gak ada asset suara baru). Implementasi: `showVehicleSelect(onDone)` sekarang cuma wrapper tipis yang manggil `showGetReady(() => showVehicleSelectGrid(onDone))` — 3 call site lama (create/join/solo) TIDAK perlu diubah sama sekali.

4. **`players/{childId}/parentSessions`** — counter baru, capped 1x/hari, terpisah total dari data akademik anak (lihat bagian struktur data di atas). Diverifikasi langsung ke Firebase asli (bukan cuma baca kode) sebanyak 2x di sesi ini (waktu implementasi + waktu QA pass), keduanya OK, data test udah dibersihkan lagi tiap kali.

5. **Dashboard**: metrik "Ditemani Ortu" udah terintegrasi (lihat bagian Dashboard di atas).

### QA pass sistematis (yang kedua kalinya dilakuin di project ini, setelah Opsi C selesai)
Checklist: smoke test (semua game+hub+leaderboard+dashboard, console error, network 404) → integration test (verify Firebase asli buat parent identity, lalu cleanup) → regression check (login murid biasa masih normal, volume BGM 4 titik masih konsisten 0.30, badge/topicStats anak gak kesentuh salah) → deploy consistency (diff hub vs 3 domain standalone).

**Hasil: 0 bug ditemukan.** Semua smoke/integration/regression/deploy-consistency check PASS. Satu-satunya yang di-flag: **belum ada verifikasi manual di iPhone/Safari asli** buat semua perubahan audio/tap/animasi sejak fix `AudioContext` besar di sesi sebelumnya (termasuk: BGM baru multipleazka+azkauniverse, BGM stop/resume saat race, tap-highlight fixes, hover-bounce, modal whois baru, layar Get Ready). **Ini task berikutnya yang lagi jalan** — user lagi otw connect iPhone via Safari Web Inspector buat verifikasi manual (2 prompt panduan udah dikasih ke user, satu spesifik project ini, satu template general reusable buat project lain).

## Yang masih perlu ditindaklanjuti
1. **SEDANG BERLANGSUNG: verifikasi manual di iPhone/Safari asli** — checklist yang perlu dicek (lihat draft prompt terakhir di riwayat chat kalau perlu detail persis): modal whois (murid vs "...'s Parent"), subtitle Math Race berubah sesuai identitas, layar Get Ready + suara tick, BGM stop/resume, tap-highlight gak muncul kotak abu-abu, BGM 3 game lain kedengeran normal. Kalau user lapor hasil, tanggapi per-poin.
2. Testing multiplayer 2-device beneran (bukan simulasi console) buat disconnect handling & BGM stop/resume — logic udah diverifikasi via kode+simulasi browser+Firebase asli, tapi belum pernah dicoba 2 device fisik sekaligus.
3. Dashboard guru/ortu: belum ada bukti email approval beneran terkirim; `parentEmail` baru keisi 1 dari 25 murid — kalau mau dashboard berguna penuh (termasuk metrik parentSessions per semua anak), perlu diisi manual oleh user.
4. File `SESSION_SUMMARY.md` ini cuma buat handoff — boleh dihapus dari repo kalau mau.

## Gaya kerja user (penting buat lanjut)
- User (Adit) komunikasi campur Indonesia-Inggris, kadang emosi/marah kalau hasil kerja meleset jauh dari instruksi — kalau dikasih referensi desain/spec yang sangat spesifik, ikutin PERSIS, jangan improvisasi.
- **User SANGAT suka diskusi/compare opsi dulu sebelum eksekusi** — lempar ide, minta dibandingin sama opsi lain (kadang sampai varian C/D), tanya "mana yang lebih gampang/aman buat lo", baru bilang "gas"/"lanjut" kalau udah yakin. JANGAN coding duluan pas masih tahap "gimana menurut lo" — tunggu sinyal eksplisit.
- User suka testing sendiri lalu kasih feedback per-poin bernomor — tanggapi tiap poin secara eksplisit.
- **Testing di real device (iPhone/Safari) itu KRUSIAL** — mayoritas bug besar project ini (audio volume, tap-highlight, AudioContext suspended) cuma muncul di situ. Kalau user connect device, pandu via Safari Web Inspector (Mac WAJIB pakai Safari, Chrome DevTools GAK BISA remote-debug Safari iOS). User sekarang udah punya 2 prompt siap-pakai (project-spesifik + general template) buat minta dipandu verifikasi manual — kalau muncul lagi di sesi baru, ikutin pola yang sama: pandu connect dulu, terus checklist per-fitur dengan instruksi PERSIS apa yang di-tap dan apa yang harus dilihat/didengar.
- User juga suka nanya hal-hal edukatif di luar coding langsung (misal "ada jenis test apa aja", "push test yang mana") — di tengah kerjaan teknis. Jawab natural, gak perlu terlalu formal, kaitkan ke konteks project kalau relevan.
- Kalau mockup diminta, **jangan pakai artifact terpisah/isolated** — mockup harus LANGSUNG di halaman asli (edit file asli + screenshot dari situ pakai Browser tool). Pernah di-reject keras di sesi sebelumnya.
- **Selalu `git status --short` sebelum commit** — jangan asal `git add -A`.
- Stale browser cache di Browser-pane preview (python http.server gak kirim cache-control) — kalau screenshot kelihatan gak berubah padahal kode udah diedit, cache-bust query param atau fetch+inject `<style>`/reload paksa sebelum nyimpulkan ada bug.
- **Koordinat klik dari screenshot vs viewport bisa gak akurat** di Browser-pane tool (beberapa kali klik "meleset" padahal terlihat pas di screenshot) — kalau klik keliatan gak ke-trigger, coba panggil `.click()` langsung via `javascript_tool` buat isolasi apakah itu bug logic atau cuma masalah koordinat, sebelum nyimpulkan ada bug.
