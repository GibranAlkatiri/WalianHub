# Panduan Setup CMS — Kelurahan Walian

Dokumen ini untuk **penanggung jawab teknis** (maintainer). Berisi langkah instalasi, konfigurasi autentikasi, deploy Cloudflare Pages, CI, pemeliharaan, dan pemulihan.

## 1. Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Panel Decap  │────▶│  GitHub API  │────▶│  Repository  │
│ /admin/      │     │  (OAuth)     │     │  main branch │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                          push ke main
                                                │
                                      ┌─────────▼─────────┐
                                      │  Cloudflare Pages  │
                                      │  (auto build)      │
                                      └───────────────────┘
```

- **Panel**: file statis di `public/admin/` — tidak ada server backend.
- **Backend**: `github` — Decap CMS berkomunikasi langsung dengan GitHub API.
- **Editorial workflow**: draf disimpan di branch terpisah + PR, bukan langsung ke `main`.
- **Deploy**: push/merge ke `main` → Cloudflare Pages otomatis build dan deploy.
- **Preview**: setiap PR/branch mendapat URL preview otomatis dari Cloudflare.

## 2. Prasyarat

- Repository: `GibranAlkatiri/WalianHub`
- Akun Cloudflare (gratis)
- Akun GitHub untuk setiap pengelola konten

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

## 4. Autentikasi — GitHub OAuth App

Decap CMS dengan backend `github` memerlukan OAuth App untuk login.

### 4.1 Buat OAuth App

1. Buka **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Isi:
   - **Application name**: `Walian CMS`
   - **Homepage URL**: `https://walianhub.pages.dev`
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
3. Klik **Register application**
4. Catat **Client ID**
5. Generate **Client Secret** — simpan dengan aman, tidak bisa dilihat ulang

### 4.2 Aktifkan Netlify sebagai OAuth proxy

Meskipun hosting di Cloudflare, Decap CMS tetap bisa memakai Netlify sebagai OAuth proxy (hanya untuk login, bukan hosting):

1. Buat akun di [netlify.com](https://netlify.com) (gratis)
2. Buat site kosong (tidak perlu import repo)
3. Buka **Site settings → Access & identity → OAuth → Install provider**
4. Pilih **GitHub**, masukkan Client ID dan Client Secret dari langkah 4.1
5. Simpan

> **Alternatif tanpa Netlify**: Deploy OAuth proxy sendiri ke Cloudflare Workers menggunakan [decap-oauth-cloudflare-workers](https://github.com/i40west/netlify-cms-cloudflare-pages) atau [decap-oauth-client](https://github.com/sterlingwes/decap-oauth-client), lalu tambahkan `base_url` di `config.yml`. Untuk tahap awal, Netlify proxy paling sederhana.

### 4.3 Environment variables

| Variable | Lokasi | Keterangan |
|---|---|---|
| GitHub OAuth Client ID | OAuth App di GitHub | Publik, sudah di Netlify |
| GitHub OAuth Client Secret | Netlify site settings | Rahasia, jangan commit |

**Tidak ada `.env` yang perlu ditambahkan ke repository.** Semua secret tersimpan di Netlify dan GitHub.

## 5. Izin akun pengelola konten

Pengelola konten memerlukan **write access** ke repository:

1. Buka **Repository → Settings → Collaborators → Add people**
2. Tambahkan akun GitHub pengelola
3. Pilih role **Write** (bukan Admin)

Dengan editorial workflow, pengelola membuat PR — maintainer atau pengelola sendiri bisa merge setelah CI check pass.

### Pencabutan akses

- Hapus collaborator dari repository settings
- Revoke akses di OAuth App settings jika diperlukan

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

Commit yang dibuat melalui GitHub API menggunakan OAuth token pengguna (bukan `GITHUB_TOKEN`), sehingga akan memicu Cloudflare Pages build dengan benar karena Cloudflare memantau semua push event.

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

Yang di luar repository:
- OAuth App settings (GitHub)
- OAuth proxy credentials (Netlify)
- Cloudflare Pages project settings

Dokumentasikan siapa pemilik akun Netlify, Cloudflare, dan OAuth App.

## 10. Biaya

| Layanan | Biaya |
|---|---|
| Cloudflare Pages | Gratis (500 build/bulan, bandwidth unlimited) |
| GitHub Actions (CI) | Gratis (2000 menit/bulan) |
| Netlify (OAuth proxy saja) | Gratis (tier starter) |
| Decap CMS | Gratis (open source) |

Total biaya pemeliharaan: **Rp 0**.
