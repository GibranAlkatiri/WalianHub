# Panduan Setup CMS — Kelurahan Walian

Dokumen ini untuk **penanggung jawab teknis** (maintainer). Berisi langkah instalasi, konfigurasi autentikasi, deploy Cloudflare Pages, CI, pemeliharaan, dan pemulihan.

## 1. Arsitektur

```
┌─────────────┐   popup: username+password   ┌──────────────────┐
│ Panel Decap  │◀──────────────────────────▶│ Pages Function   │
│ /admin/      │   handshake token ke Decap   │ /api/auth        │
└──────┬──────┘                              └──────────────────┘
       │ GitHub API (token milik server)
       ▼
┌──────────────┐     push ke main     ┌──────────────────┐
│  Repository  │─────────────────────▶│  Cloudflare Pages  │
│  main branch │                      │  (auto build)      │
└──────────────┘                      └──────────────────┘
```

- **Panel**: file statis di `public/admin/` — tidak ada server backend.
- **Login**: `functions/api/auth.js` (Cloudflare Pages Function) — 1 username + password, disimpan sebagai environment variable. Staf tidak perlu akun GitHub.
- **Backend**: `github` — Decap CMS berkomunikasi langsung dengan GitHub API memakai token milik server (bukan token tiap staf).
- **Editorial workflow**: draf disimpan di branch terpisah + PR, bukan langsung ke `main`.
- **Deploy**: push/merge ke `main` → Cloudflare Pages otomatis build dan deploy.
- **Preview**: setiap PR/branch mendapat URL preview otomatis dari Cloudflare.

## 2. Prasyarat

- Repository: `GibranAlkatiri/WalianHub`
- Akun Cloudflare (gratis)
- Akun GitHub pemilik repository (hanya untuk membuat token akses server — staf tidak perlu akun GitHub)

## 3. Deploy ke Cloudflare Pages

### 3.1 Hubungkan repository

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pilih repository `GibranAlkatiri/WalianHub`
3. Konfigurasi build:
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
4. Klik **Save and Deploy**

### 3.2 URL

Setelah deploy pertama berhasil:
- **Production**: `https://walianhub.pages.dev` (atau custom domain nanti)
- **Preview**: setiap branch/PR mendapat `https://<branch>.walianhub.pages.dev`

> Jika nama project berbeda dari `walianhub`, update `site` di `astro.config.mjs` dan `site_url`/`display_url` di `public/admin/config.yml`.

### 3.3 Custom domain (opsional)

1. Cloudflare Dashboard → Pages project → **Custom domains** → **Set up a custom domain**
2. Masukkan domain (misal `walian.tomohon.go.id`)
3. Tambahkan DNS record sesuai petunjuk
4. Update `site` di `astro.config.mjs` ke domain baru

## 4. Autentikasi — username + password (1 admin)

Decap CMS tidak punya login password bawaan, jadi panel memakai Pages Function
`functions/api/auth.js` sebagai pengganti OAuth proxy. Cara kerja:

1. Staf klik **Login with GitHub** di `/admin/` (label tombol bawaan Decap, tidak bisa diganti).
2. Decap membuka popup ke `/api/auth` — popup menampilkan form **username + password**.
3. Jika benar, server menyerahkan GitHub token milik server lewat handshake
   postMessage yang diharapkan Decap, lalu popup menutup sendiri dan panel terbuka.

Token GitHub tidak pernah tersimpan di browser staf secara permanen selain sesi
Decap itu sendiri, dan tidak pernah masuk repository.

### 4.1 Buat GitHub token server

1. Buka **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. Isi:
   - **Token name**: `Walian CMS`
   - **Repository access**: Only select repositories → `GibranAlkatiri/WalianHub`
   - **Permissions → Contents**: **Read and write**
3. Generate, salin token (hanya tampil sekali).

> Dibutuhkan karena backend `github` Decap selalu memanggil GitHub API.
> Satu token ini dipakai untuk semua penulisan konten panel.

### 4.2 Buat hash password

Password tidak disimpan polos — yang disimpan SHA-256 hex-nya:

```bash
echo -n 'password-pilihan-anda' | sha256sum   # salin 64 karakter hex
```

### 4.3 Environment variables

Cloudflare Dashboard → Pages project → **Settings → Environment variables**
(isi untuk **Production** dan **Preview**):

| Variable | Contoh | Keterangan |
|---|---|---|
| `CMS_USERNAME` | `walian` | Username login panel (1 user) |
| `CMS_PASSWORD_HASH` | `64 hex sha256` | Hash password dari langkah 4.2 |
| `GITHUB_TOKEN` | `github_pat_...` | Token dari langkah 4.1 — rahasia |

**Tidak ada `.env` yang di-commit ke repository.** Semua secret hanya di Cloudflare.

### 4.4 Ganti password / cabut akses

- **Ganti password**: hitung hash baru (langkah 4.2), update `CMS_PASSWORD_HASH`, redeploy.
- **Cabut akses**: hapus/rotasi `GITHUB_TOKEN` dan update di Cloudflare.

Karena hanya 1 user, tidak ada konsep tambah/hapus akun — cukup ganti passwordnya.

## 5. Izin akun pengelola konten

Tidak perlu menambah collaborator GitHub untuk staf — staf login dengan
username+password di atas, dan penulisan ke repo memakai token server.

Yang perlu akses GitHub hanya **pemegang akun pemilik repository**
(untuk membuat/merotasi `GITHUB_TOKEN`).

## 6. Branch Protection (check wajib)

Agar konten tidak bisa dipublish tanpa validasi:

1. Buka **Repository → Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Centang:
   - **Require status checks to pass before merging**
   - Cari dan tambahkan check: `check` (dari `ci.yml`)
   - **Require branches to be up to date before merging**
4. Simpan

Ini memastikan setiap PR (termasuk dari CMS) harus pass `bun test` + `bun run build` sebelum merge.

## 7. Workflow CI/CD

### CI — Pemeriksaan PR (`ci.yml`)

```yaml
on: pull_request ke main
→ bun install → bun test → bun run build
```

Berjalan otomatis saat CMS membuat/update PR draf. Jika gagal, konten tidak bisa dipublish.

### Deploy — Cloudflare Pages (otomatis)

Cloudflare Pages memantau repository dan otomatis build + deploy saat:
- Push/merge ke `main` → production deploy
- Push ke branch lain / PR → preview deploy

Tidak perlu workflow GitHub Actions untuk deploy.

### Catatan tentang event trigger

Commit yang dibuat melalui GitHub API menggunakan token server (bukan `GITHUB_TOKEN`), sehingga akan memicu Cloudflare Pages build dengan benar karena Cloudflare memantau semua push event.

## 8. Pemeliharaan

### Update Decap CMS

Panel memuat Decap CMS dari CDN (`unpkg.com/decap-cms@^3.0`). Untuk update:
- Minor/patch: otomatis (semver range `^3.0`)
- Major: ubah versi di `public/admin/index.html`

### Menambah/mengubah field

1. Update schema di `src/content.config.ts`
2. Update field di `public/admin/config.yml`
3. Update test jika diperlukan
4. Jalankan `bun test && bun run build` untuk memastikan kompatibel
5. Commit dan push

### Menambah koleksi baru

1. Tambah collection di `content.config.ts`
2. Tambah collection di `config.yml`
3. Buat folder/file konten default
4. Update halaman Astro jika perlu

## 9. Pemulihan (Recovery)

### Konten rusak setelah publish

```bash
git log --oneline -10               # cari commit bermasalah
git revert <commit-sha>             # buat revert commit
bun test && bun run build           # pastikan valid
git push origin main                # Cloudflare auto-deploy
```

### Deploy gagal

1. Cek **Cloudflare Dashboard → Pages → project → Deployments** untuk error
2. Website sebelumnya tetap tersedia — Cloudflare melayani deployment terakhir yang berhasil
3. Perbaiki masalah di commit baru, push ke `main`

### Konflik edit bersamaan

Decap CMS editorial workflow menggunakan branch + PR. Jika dua orang edit file yang sama:
- GitHub akan menampilkan merge conflict di PR
- Maintainer perlu resolve conflict manual
- File `profil.json` dan `pengumuman.json` paling rentan karena single-file

Rekomendasi: koordinasikan editing file pengaturan — satu orang selesaikan dulu sebelum orang lain mulai.

### Backup konfigurasi

Semua konfigurasi CMS ada di repository (tracked):
- `public/admin/index.html`
- `public/admin/config.yml`
- `functions/api/auth.js`
- `tests/auth-password.test.js`

Yang di luar repository:
- Environment variables Cloudflare (`CMS_USERNAME`, `CMS_PASSWORD_HASH`, `GITHUB_TOKEN`)
- GitHub fine-grained token (`Walian CMS`)
- Cloudflare Pages project settings

Dokumentasikan siapa pemegang akun Cloudflare dan GitHub pemilik repository.

## 10. Biaya

| Layanan | Biaya |
|---|---|
| Cloudflare Pages (hosting + Functions) | Gratis (500 build/bulan, bandwidth unlimited, 100rb request Functions/hari) |
| GitHub Actions (CI) | Gratis (2000 menit/bulan) |
| Decap CMS | Gratis (open source) |

Total biaya pemeliharaan: **Rp 0**.
