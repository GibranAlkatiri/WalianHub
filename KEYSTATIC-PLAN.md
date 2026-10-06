# Rencana Migrasi CMS: Decap → Keystatic

**Untuk pelaksana (partner)**: dokumen ini mandiri. Ikuti fase 0→5 berurutan.
Jangan loncat fase. Setiap fase punya perintah persis + kriteria lolos.

## 0. Informasi proyek (jangan diubah tanpa konfirmasi)

- Repo: `https://github.com/gleey/WalianHub.git`, branch utama `main`.
- Situs: Astro 7.3.5 + Tailwind 4 + Bun. Output statis, 5 halaman.
- Hosting: Cloudflare Pages, project `walianhub`, URL `https://walianhub.pages.dev`.
- CMS sekarang: Decap CMS di `public/admin/` + login 1 user via
  `functions/api/auth.js`. Akan diganti Keystatic.
- Toolchain: **Bun 1.4.2**. Cloudflare Build env `BUN_VERSION=1.4.2` sudah ada —
  jangan hapus/ubah.
- Bun tidak ada di PATH default di mesin ini; setiap perintah bun diawali:
  `export PATH="$HOME/.bun/bin:$PATH"`.

## 1. Setup awal (wajib sebelum fase migrasi)

1. Clone dan masuk direktori (ganti `<repo-dir>` dengan path lokal):
   ```bash
   git clone https://github.com/gleey/WalianHub.git
   cd WalianHub   # <repo-dir>
   git checkout main && git pull
   ```
2. Install dan verifikasi baseline (harus hijau sebelum mulai):
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   bun install
   bun test        # ekspektasi: semua pass
   bun run build   # ekspektasi: 5 halaman, Complete!
   ```
3. Buat branch kerja + backup (jangan kerja langsung di `main`):
   ```bash
   git branch backup-decap-cms   # backup, jangan dihapus sampai serah terima
   git checkout -b keystatic-migrasi
   git push -u origin keystatic-migrasi
   ```
4. Akses yang dibutuhkan (minta ke pemilik repo bila belum ada):
   - Write access ke repo `gleey/WalianHub` (untuk push branch + PR).
   - Akses Cloudflare Pages project `walianhub` (untuk env + redeploy).
   - Secret GitHub App Keystatic (dibuat di Fase 3, disimpan di Cloudflare env —
     **jangan commit ke repo**).

Aturan keras selama migrasi:
- **Jangan ubah bentuk file konten** di `src/content/` (JSON/Markdown + frontmatter).
  Zod schema `src/content.config.ts` adalah gate build — kalau Keystatic menulis
  format beda dan build gagal, itu bug migrasi, bukan alasan ubah schema.
- Jangan commit: `.env*`, `dist/`, `node_modules/`, token/secret apa pun.
- Semua perubahan CMS lewat PR `keystatic-migrasi` → `main`, tunggu CI hijau.

## 2. Keputusan arsitektur (sudah final, jangan diubah)

Keystatic storage `github` (repo sama `gleey/WalianHub`):

- Konten tetap file di repo — `src/content/` dipakai ulang tanpa ubah bentuk.
- Editorial workflow setara Decap (branch + commit via GitHub App).
- Auth Keystatic via GitHub App (bukan OAuth user Decap).
- Alternatif yang ditolak: mode `local` (tidak bisa push dari production),
  `cloud` (tergantung layanan Keystatic Cloud, menambah vendor).

## 3. Fase 1 — Dependensi + konfigurasi dasar

Posisi: di branch `keystatic-migrasi`.

1. Tambah paket:
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   bun add @keystatic/core @keystatic/astro
   ```
2. `astro.config.mjs`: tambah `import keystatic from '@keystatic/astro';`
   dan `integrations: [keystatic()]` di samping plugin tailwind yang sudah ada.
3. Buat `keystatic.config.ts` di root — kerangka minimal:
   ```ts
   import { config } from '@keystatic/core';

   export default config({
     storage: { kind: 'github', repo: { owner: 'gleey', name: 'WalianHub' } },
     // singletons + collections diisi di Fase 2
     singletons: {},
     collections: {},
   });
   ```
4. Verifikasi (belum ada konten yang berubah):
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   bun test && bun run build
   ```
5. Commit + push:
   ```bash
   git add package.json bun.lock astro.config.mjs keystatic.config.ts
   git commit -m "keystatic: setup dasar storage github"
   git push
   ```

Kriteria lolos Fase 1: `bun test` pass, `bun run build` 5 halaman Complete,
`git status` bersih, admin Decap lama (`/admin/`) masih bisa dibuka.

## 4. Fase 2 — Pemetaan schema (6 koleksi → Keystatic)

Prinsip: **tidak mengubah bentuk file konten** — Keystatic hanya membaca/menulis
format yang sama agar Zod schema `src/content.config.ts` tetap valid.
Referensi validasi: `src/content.config.ts`, `src/lib/validasi-konten.ts`,
dan `public/admin/config.yml` (mapping field Decap lama).

| Astro | Keystatic | Path / format |
|---|---|---|
| `situs` | `singleton`, `path: src/content/pengaturan/situs.json`, `format: { data: 'json' }` | JSON |
| `beranda` | `singleton`, `path: src/content/pengaturan/beranda.json`, `format: { data: 'json' }` | JSON |
| `profil` | `singleton`, `path: src/content/pengaturan/profil.json`, `format: { data: 'json' }` | JSON |
| `pengumuman` | `singleton`, `path: src/content/pengaturan/pengumuman.json`, `format: { data: 'json' }` | JSON |
| `layanan` | `collection`, `path: src/content/layanan/*`, frontmatter + `contentField: 'body'` | `.md` per item, slug = nama file |
| `destinasi` | `collection`, `path: src/content/destinasi/*`, frontmatter + `contentField: 'body'` | `.md` per item, slug = nama file |

Mapping field penting:

- `situs.jamLayanan.jadwal`: array 7 hari + jam format `HH.MM` — Keystatic:
  `fields.array(fields.object(...), length: {min:7, max:7})`, jam sebagai
  `fields.text` + validasi regex yang sama (`^([01]\d|2[0-3])\.[0-5]\d$`).
- `situs.whatsapp` / `email`: boleh kosong — `fields.text` opsional (bukan email
  widget yang memaksa format).
- `profil.strukturOrganisasi`: array object; validasi bagan (`cekBagan`) tetap di
  build via Zod `superRefine`, bukan di UI Keystatic.
- `profil.lingkungan`: angka boleh null — `fields.number` + `fields.conditional`
  checkbox "belum diketahui" → tulis null.
- `layanan.ringkasan` max 120, `destinasi.ringkasan` max 160 — validasi di UI Keystatic.
- `layanan.ikon`: `fields.select` — salin 15 opsi dari `public/admin/config.yml`
  (house, id-card, file-text, hand-heart, store, users, land-plot, landmark,
  leaf, calendar, phone, mail, map, map-pin, mountain).
- Image: `fields.image` dengan `directory: 'public/uploads'`, `publicPath: '/uploads/'`.
- Tanggal (`diperbarui`, `pengumuman.tanggal`, `tanggalLibur`): `fields.date`,
  tulis format `YYYY-MM-DD`.

Urutan kerja yang disarankan: `layanan` dulu (paling sederhana) → `destinasi` →
`situs` → `beranda` → `pengumuman` → `profil` (paling kompleks).
Setiap koleksi selesai: `bun run build` harus tetap hijau.

Kriteria lolos Fase 2: semua 6 schema terwakili, tidak ada field yang hilang
(cek silang vs `public/admin/config.yml`), build hijau.

## 5. Fase 3 — Auth GitHub App (ganti `/api/auth`)

1. Di GitHub, buat **GitHub App** untuk repo `gleey/WalianHub`:
   - Homepage URL: `https://walianhub.pages.dev`
   - Callback URL: `https://walianhub.pages.dev/api/keystatic/github/oauth/callback`
     (sesuaikan dengan pesan error Keystatic bila path berbeda — Keystatic
     menampilkan URL callback yang benar saat pertama dibuka).
   - Permissions → Contents: Read and write.
   - Install app ke repo `gleey/WalianHub`.
2. Buat secret acak 40 hex di lokal (jangan commit):
   ```bash
   openssl rand -hex 40
   ```
3. Di Cloudflare Dashboard → Pages `walianhub` → Settings → Variables and secrets,
   tambah (Production + Preview):
   - `KEYSTATIC_GITHUB_CLIENT_ID` = Client ID dari GitHub App
   - `KEYSTATIC_GITHUB_CLIENT_SECRET` = Client secret (tipe Secret)
   - `KEYSTATIC_SECRET` = output langkah 2 (tipe Secret)
   - `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` = app slug (terlihat di URL App)
4. Redeploy Cloudflare, buka `https://walianhub.pages.dev/keystatic`,
   login via GitHub App, buat 1 commit test (ubah 1 kata di 1 layanan).
   Pastikan commit muncul di repo.

Kriteria lolos Fase 3: login Keystatic berhasil dari production, commit test
muncul di `gleey/WalianHub`.

## 6. Fase 4 — Verifikasi paralel (Decap masih ada, jangan dihapus)

1. Buka URL **preview deployment** branch `keystatic-migrasi`
   (bukan production) → `/keystatic`.
2. Edit uji: 1 layanan + 1 destinasi + 1 field situs.
3. Di lokal, pull branch dan jalankan:
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   git pull
   bun run build   # Zod schema tidak diubah — harus tetap hijau
   git diff --stat # pastikan hanya 3 file konten yang berubah, config.yml Decap tidak ikut
   ```
4. Uji upload gambar → file masuk `public/uploads/`, path tersimpan `/uploads/...`.
5. Tampilkan 3 edit uji di preview Cloudflare, minta pemilik repo konfirmasi tampil benar.

Kriteria lolos Fase 4: 3 edit tampil benar di preview + build hijau.
**Dilarang lanjut ke Fase 5 sebelum ini lolos.**

## 7. Fase 5 — Hapus Decap (hanya setelah Fase 4 lolos)

1. Hapus file/direktori:
   ```bash
   git rm -r public/admin functions/api/auth.js tests/auth-password.test.js
   rm KEYSTATIC-PLAN.md   # plan ini dihapus sebelum merge agar tidak masuk main
   ```
   (File plan ini tidak di-merge ke `main` — hapus di branch sebelum buka PR.)
2. Di Cloudflare, hapus env lama: `CMS_USERNAME`, `CMS_PASSWORD_HASH`, `GITHUB_TOKEN`.
3. Update `CMS-SETUP.md` + `CMS-PANDUAN-STAF.md` ke alur Keystatic
   (URL `/keystatic`, login GitHub App, tanpa username+password lama).
4. Verifikasi akhir + PR:
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   bun test && bun run build
   git add -A && git commit -m "keystatic: hapus Decap, selesai migrasi" && git push
   ```
   Buka PR `keystatic-migrasi` → `main`, tunggu CI hijau, minta review pemilik repo.
5. Setelah merge: hapus branch `keystatic-migrasi` (lokal + remote).
   Branch `backup-decap-cms` disimpan sampai serah terima selesai, lalu hapus.

## 8. Troubleshooting (masalah yang sudah pernah terjadi di proyek ini)

| Gejala | Penyebab umum | Perintah / cek |
|---|---|---|
| Build Cloudflare gagal `Unknown lockfile` | `BUN_VERSION` hilang dari Build env | Settings → Builds → Build env vars harus ada `BUN_VERSION=1.4.2` |
| `/keystatic` 404 | Integration belum terpasang / route belum diinject | Cek `astro.config.mjs` ada `keystatic()`; `bun run build` tanpa error |
| Login Keystatic gagal / push ditolak | GitHub App belum diinstall ke repo atau permission kurang | Apps → Install ke `gleey/WalianHub`, Contents Read+Write |
| Build gagal setelah edit via Keystatic | Format tulisan Keystatic beda dari Zod schema | `git diff` file yang ditulis Keystatic; samakan field/format, jangan ubah `content.config.ts` |
| Env tidak terbaca di preview | Env hanya dicentang Production | Centang Preview juga, atau uji di URL production |
| `git push` ditolak | Branch protection / belum pull | `git pull --rebase`, push lagi; jangan force-push ke `main` |

## 9. Serah terima

- [ ] PR merge ke `main`, CI hijau, production deploy sukses.
- [ ] `CMS-SETUP.md` + `CMS-PANDUAN-STAF.md` sudah alur Keystatic.
- [ ] Staf berhasil login + 1x edit uji di production.
- [ ] Branch `backup-decap-cms` dihapus (setelah konfirmasi pemilik).
- [ ] File plan ini (`KEYSTATIC-PLAN.md`) tidak ada di `main`.

## 10. Estimasi

Fase setup+1: 0.5 hari · Fase 2: 1 hari · Fase 3–4: 0.5 hari · Fase 5 + serah terima: 0.5 hari.
**Total ±2 hari kerja**, termasuk testing staf.
