# Al Idrisi Games — Session Summary (untuk lanjut di session baru)

## Project overview
`~/Documents/al-idrisi-games` — hub berisi 3 game edukasi buatan Adit untuk kelas anaknya Azka (~26 murid+guru, roster di `players.js`):
- **multipleazka** — Math Race (multiplayer N-seat racing game, Firebase Realtime DB)
- **azkacraft** — Language & Arts (storybook-style lessons + voice cheering system)
- **azkauniverse** — SolarQuest (AI Science Adventure)
- **dinorace** (BARU) — game balapan dino 2-player, awalnya proyek terpisah (`~/Documents/dinorace`, domain `dinorace.lol`), sekarang **di-copy** juga ke dalam hub ini (`al-idrisi-games/dinorace/`) supaya bisa dimainkan di `playalidrisi.fun/dinorace/`. **Ini snapshot, bukan sinkron otomatis** — kalau nanti edit game asli di `dinorace.lol`, harus di-copy ulang manual ke sini kalau mau ikut ke-update.

Tiap game itu Vercel project terpisah, plus hub-nya sendiri juga Vercel project. Domain:
- Hub: `playalidrisi.fun/` — path `/{game}/` di domain ini adalah **file yang sama** dari repo hub (bukan proxy ke project game terpisah)
- Legacy standalone domains (project Vercel terpisah dari hub, tapi kontennya harus identik): `multipleazka.fun`, `azkasocial.fun` (alias project `azkacraft`), `azkasolar.quest` (alias project `azkauniverse`)
- `dinorace` **cuma ada di hub** (`playalidrisi.fun/dinorace/`), gak punya standalone domain sendiri di hub ini (beda dari `dinorace.lol` yang tetep hidup independen)

**PENTING — dua target deploy buat 3 game utama (mathrace/azkacraft/azkauniverse):** tiap kali edit file di salah satunya, harus **both**:
1. `git push origin main` → update `playalidrisi.fun/{game}/` (via hub auto-deploy)
2. `cd {game} && vercel --prod --yes` → update domain standalone-nya

`dinorace/` cukup ikut push #1 aja (gak ada standalone target di hub ini).

Verifikasi cepat: `diff <(curl -s https://playalidrisi.fun/{game}/somefile.js) <(curl -s https://{standalone-domain}/somefile.js)` — rutin tiap abis deploy.

**⚠️ Hub auto-deploy PERNAH sekali gak jalan** (push sukses tapi Vercel gak auto-build) — kejadian 1x sesi ini, gak jelas root cause-nya (bukan ignore-build-step, koneksi Git dikonfirmasi masih nyambung). Fix sementara: `vercel --prod --yes` manual dari root hub. Kalau kejadian lagi, verifikasi dengan `vercel ls` (cek umur deployment terakhir) sebelum asumsi push udah otomatis ke-apply.

**Deploy pattern:**
- Hub (root files: `index.html`, `style.css`, `leaderboard.html/css`, `hub-bgm.js`, `player.js`, `players.js`, `firebase.js`, `leaderboard.js`, `dashboard/`, `api/`, `dinorace/`): auto-deploy via GitHub integration
- Tiap game (mathrace/azkacraft/azkauniverse): **manual** `cd <game-dir> && vercel --prod --yes` setelah push

Shared player identity: `window.AIGPlayer.getPlayer()` dari `player.js` → `{id, name, role}`.

## ⚠️ Ada sesi lain yang kerja PARALEL di repo ini (aktif sepanjang sesi ini)
Beberapa kali kelihatan commit dari sesi lain nyelip di antara commit sendiri (`d988abc`, `484e58f` — kerjaan dashboard: charts, KPI, AI-generated insight via `api/generate-insight.js`, rebuild total dashboard per "Sirka design handoff"). **Sebelum commit apapun, SELALU `git status --short` dulu**, cuma `git add` file yang benar-benar diedit sendiri sesi ini — jangan `git add -A`. File `.claude/launch.json` juga sempat ke-overwrite gara-gara 2 sesi rebutan port preview yang sama (8642) — kalau nemu launch.json isinya beda dari yang diharapkan, itu tandanya sesi lain masih aktif, jangan kaget.

## Struktur data (player/progress)

**`player.js`** — localStorage key `aig_player`, isi `{id, name, role}`. `AIGPlayer.deriveParentPlayer(child)` derive identitas "orang tua" dari 1 murid tanpa nulis entry baru.

**`players.js`** — `window.AIG_PLAYERS`, roster statis. `parentEmail` baru keisi buat Azka doang (24 murid lain kosong — masih PR).

**`firebase.js`** — Firebase project `al-idrisi-games` (hub), terpisah dari Firebase tiap game buat multiplayer. `dinorace` pakai Firebase project SENDIRI (`dinorace-d9b8c`), gak numpuk ke sini.

**`leaderboard.js`** — semua fungsi punya guard `player.role === "parent"` terpusat (parent main gak nyentuh badge/topicStats/progress anak, cuma nyatet `parentSessions/{date}` buat engagement metric).

Skema Firebase RTDB (project hub):
```
leaderboard/{gameId}/{playerId}/{name, timesPlayed, lastPlayed}
players/{playerId}/badges/{gameId}/{...progress spesifik tiap game}
players/{playerId}/topicStats/{gameId}/{topicKey}/{correct, wrong, lastWrongAt}
players/{childId}/parentSessions/{YYYY-MM-DD}/{parentName, lastGamePlayed, at}
insights/{studentId}/{draft, status: pending|approved, approvedAt, sentAt, sentTo}
```

## Kerjaan selesai sesi ini (kronologis)

1. **Math Race — reorder Create Game flow**: code/QR muncul duluan pas Create, baru nyusul pilih kendaraan. Sempat ada race condition (opponent finish keburu duluan pas masih milih kendaraan) — udah difix pakai guard `raceIsActive()`.
2. **Math Race — vehicle-pick disinkron ke room-full**: sekarang SEMUA player (host + joiner) baru masuk layar pilih kendaraan **bareng-bareng** pas kursi penuh (bukan pas masing-masing gabung). Cocok buat 2 & 3 player, dites.
3. **Math Race — Difficulty system (Easy/Medium/Hard)**: personal per-player setting (kayak Answer style/Timer dulu). Ngatur range angka soal, mix kali/bagi, dan **timer per soal** (10s/9s/7s). Timer On/Off toggle lama **dihapus total** — sekarang timer selalu jalan sesuai Difficulty.
4. **Math Race — AI opponent buat Solo mode**: opponent yang tadinya diem di garis start sekarang **jalan beneran** dengan kecepatan konstan sesuai Difficulty (~90/55/40 detik buat finish). Kalau opponent finish duluan → kalah beneran, ada layar "Opponent finished first!".
5. **DinoRace masuk ke hub**: file di-copy ke `al-idrisi-games/dinorace/`, muncul icon dino kecil (pake helm astronot) di peta bintang azkauniverse yang nge-link ke sana. Icon-nya di-hide otomatis di domain standalone (`azkasolar.quest`) karena `/dinorace/` cuma ada di hub. DinoRace ditambahin tombol 🏠 buat balik ke hub (sebelumnya gak ada jalan balik).
6. **Unifikasi sticker/badge UX** di 3 game: locked sticker/badge sekarang disamarkan konsisten (🔒 + "???") di ketiga game, azkauniverse "Badge Collection" di-rename jadi "Sticker Book", toast "sticker baru!" ditambahin ke azkacraft & azkauniverse (sebelumnya cuma ada di multipleazka).
7. **Math Race — soal pintar tanpa LLM**: soal berikutnya (`weightedRand()`) condong ke topik yang sering salah (`topicStats.wrong`), gak butuh API/biaya. **Catatan penting**: bobotnya berdasarkan `wrong` KUMULATIF SEPANJANG MASA, gak pernah didiskon walau anak udah membaik — bisa jadi improvement ke depan (rasio wrong/total, atau kedaluwarsa data lama).
8. **Dashboard — parent engagement di draft insight otomatis**: `generateDraft()` sekarang nyantumin berapa hari minggu ini ortu ikut main bareng.
9. **Mockup "AI Tutor" (belum wired ke API beneran)** ditaruh di 3 game — Math Race (layar hasil race), azkacraft (layar Brain Rest), azkauniverse (layar Level Complete). Pola konsisten: badge "✨ AI Tutor" → animasi loading (dots + teks) → fade-in ke hint contoh (teks hardcoded, cuma buat nunjukin gimana rasanya kalau beneran jalan). **Status sekarang: uncommitted**, belum di-deploy.
10. **(Sesi lain, bukan saya)**: dashboard di-rebuild total per "Sirka design handoff" — charts, KPI, AI-generated insight pakai `api/generate-insight.js`. Belum saya review detail.

## Yang masih perlu ditindaklanjuti
1. **Commit + deploy mockup AI Tutor** (poin 9 di atas) — masih nunggu approval Adit soal posisi/teks sebelum di-deploy.
2. **AI tutor versi 2 (LLM beneran)** — didiskusiin konsepnya (pakai Claude Haiku 4.5, estimasi biaya <$5/bulan buat kelas ini), tapi **belum diimplementasi**. Rencana: hint muncul di layar HASIL (bukan live saat race, karena tekanan waktu 7-10 detik per soal terlalu riskan buat manggil API).
3. **Fix bobot weak-topic yang gak pernah didiskon** (poin 7) — kalau mau, ganti ke rasio atau kasih window waktu.
4. Testing multiplayer 2-device fisik beneran (disconnect handling, BGM stop/resume) — masih cuma divalidasi via kode+simulasi.
5. Cek arah icon vehicle lain (ship/train/truck/bus) — cuma plane yang udah dicek & difix (kebalik arahnya).
6. Dashboard: `parentEmail` baru keisi 1 dari ~25 murid (perlu Adit isi manual biar insight email bisa jalan ke semua ortu). Konfirmasi dari Adit: email approval **sudah pernah nyampe** ke inbox asli (gak perlu diverifikasi ulang).
7. Review hasil rebuild dashboard dari sesi lain (poin 10 kerjaan selesai) — belum sempat dicek detail dari sisi sesi ini.

## Gaya kerja user (penting buat lanjut)
- User (Adit) komunikasi campur Indonesia-Inggris. Kalau dikasih referensi desain/spec yang sangat spesifik, ikutin PERSIS, jangan improvisasi.
- **Sangat suka diskusi/compare opsi dulu sebelum eksekusi** — lempar ide, minta dibandingin, baru bilang "gas"/"lanjut". JANGAN coding duluan pas masih tahap "gimana menurut lo".
- Suka testing sendiri lalu kasih feedback per-poin. Suka nanya hal edukatif ("kalo pake AI kudu gimana", "ekspektasi hasilnya gimana") di tengah kerjaan teknis — jawab jujur & konkret, jangan oversell, termasuk sebutin keterbatasan/gap logic kalau ada (kayak poin 7 di atas).
- Mockup **wajib** di file asli (bukan artifact terpisah) — edit langsung + screenshot dari situ pakai Browser tool.
- **Selalu `git status --short` sebelum commit** — jangan asal `git add -A`, apalagi sekarang ada sesi lain yang aktif paralel.
- Testing di real device (iPhone/Safari) itu krusial buat bug yang gak muncul di desktop (audio, tap-highlight, dll) — kalau user connect device, pandu via Safari Web Inspector.
- **azkauniverse punya cache-busting manual** (`script.js?v=N`, `style.css?v=N` di index.html) — WAJIB naikin angka versi tiap edit file itu, kalau lupa perubahan gak akan muncul di browser (udah kejadian beberapa kali, buang waktu debug).
- Stale browser cache di Browser-pane preview (python http.server gak kirim cache-control) — cache-bust query param atau fetch+inject `<style>` sebelum nyimpulkan ada bug.
- Koordinat klik dari screenshot vs viewport bisa gak akurat di Browser-pane — kalau klik gak ke-trigger, coba `.click()` langsung via `javascript_tool` buat isolasi masalah.
- Kalau port preview bentrok sama sesi lain (`al-idrisi-hub` di port 8642), jangan maksa `preview_stop` punya orang lain — jalanin `python3 -m http.server <port lain>` sendiri via Bash lalu `navigate` langsung ke situ.
