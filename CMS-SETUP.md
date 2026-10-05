# Panduan Setup CMS — Kelurahan Walian

Dokumen ini untuk **penanggung jawab teknis** (maintainer). Berisi langkah instalasi, konfigurasi autentikasi, environment, CI/branch protection, pemeliharaan, dan pemulihan.

## 1. Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Panel Decap  │────▶│  GitHub API  │────▶│  Repository  │
│ /admin/      │     │  (OAuth)     │     │  main branch │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                          push ke main
                                                │
                                         ┌──────▼──────┐
                                         │ GitHub Pages │
                                         │ (deploy.yml) │
                                         └─────────────┘
```

- **Panel**: file statis di `public/admin/` — tidak ada server backend.
- **Backend**: `github` — Decap CMS berkomunikasi langsung dengan GitHub API.
- **Editorial workflow**: draf disimpan di branch terpisah + PR, bukan langsung ke `main`.
- **Deploy**: push/merge ke `main` → GitHub Actions (`deploy.yml`) → GitHub Pages.

## 2. Prasyarat

- Repository: `GibranAlkatiri/WalianHub`
- GitHub Pages aktif (source: GitHub Actions)
- Akun GitHub untuk setiap pengelola konten

## 3. Autentikasi — GitHub OAuth App

Decap CMS dengan backend `github` memerlukan OAuth App untuk login.

### 3.1 Buat OAuth App

1. Buka **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Isi:
   - **Application name**: `Walian CMS`
   - **Homepage URL**: `https://gibranalkatiri.github.io/WalianHub`
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
3. Klik **Register application**
4. Catat **Client ID**
5. Generate **Client Secret** — simpan dengan aman, tidak bisa dilihat ulang

### 3.2 Aktifkan Netlify Identity (sebagai OAuth proxy)

Decap CMS memakai Netlify sebagai OAuth proxy secara default:

1. Buat akun di [netlify.com](https://netlify.com) (gratis)
2. Buat site baru (bisa import repo atau buat site kosong)
3. Buka **Site settings → Access & identity → OAuth → Install provider**
4. Pilih **GitHub**, masukkan Client ID dan Client Secret dari langkah 3.1
5. Simpan

> **Alternatif tanpa Netlify**: Bisa deploy OAuth proxy sendiri menggunakan [decap-cms-github-oauth-provider](https://github.com/vencax/netlify-cms-github-oauth-provider) atau [decap-oauth-client](https://github.com/sterlingwes/decap-oauth-client), lalu ubah `base_url` di `config.yml`. Untuk tahap awal, Netlify OAuth proxy adalah opsi paling sederhana.

### 3.3 Environment variables

| Variable | Lokasi | Keterangan |
|---|---|---|
| GitHub OAuth Client ID | OAuth App di GitHub | Publik, sudah di Netlify |
| GitHub OAuth Client Secret | Netlify site settings | Rahasia, jangan commit |

**Tidak ada `.env` yang perlu ditambahkan ke repository.** Semua secret tersimpan di Netlify dan GitHub.

## 4. Izin akun pengelola konten

Pengelola konten memerlukan **write access** ke repository:

1. Buka **Repository → Settings → Collaborators → Add people**
2. Tambahkan akun GitHub pengelola
3. Pilih role **Write** (bukan Admin)

Dengan editorial workflow, pengelola membuat PR — maintainer atau pengelola sendiri bisa merge setelah CI check pass.

### Pencabutan akses

- Hapus collaborator dari repository settings
- Revoke akses di OAuth App settings jika diperlukan

## 5. Branch Protection (check wajib)

Agar konten tidak bisa dipublish tanpa validasi:

1. Buka **Repository → Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Centang:
   - **Require status checks to pass before merging**
   - Cari dan tambahkan check: `check` (dari `ci.yml`)
   - **Require branches to be up to date before merging**
4. Simpan

Ini memastikan setiap PR (termasuk dari CMS) harus pass `bun test` + `bun run build` sebelum merge.

## 6. Workflow CI/CD

### CI — Pemeriksaan PR (`ci.yml`)

```yaml
on: pull_request ke main
→ bun install → bun test → bun run build
```

Berjalan otomatis saat CMS membuat/update PR draf. Jika gagal, konten tidak bisa dipublish.

### Deploy — Build dan pasang (`deploy.yml`)

```yaml
on: push ke main / manual
→ bun install → bun test → bun run build → upload → deploy Pages
```

Berjalan setelah PR dimerge ke `main`.

### Catatan tentang event trigger

Commit yang dibuat melalui GitHub API menggunakan OAuth token pengguna (bukan `GITHUB_TOKEN`), sehingga akan memicu workflow deploy dengan benar. Jika suatu saat token berubah, verifikasi bahwa push ke `main` memicu workflow di tab **Actions**.

## 7. Pemeliharaan

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

## 8. Pemulihan (Recovery)

### Konten rusak setelah publish

```bash
git log --oneline -10               # cari commit bermasalah
git revert <commit-sha>             # buat revert commit
bun test && bun run build           # pastikan valid
git push origin main                # deploy ulang
```

### Deploy gagal

1. Cek tab **Actions** di GitHub untuk error
2. Website sebelumnya tetap tersedia — tidak ada downtime
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

Dokumentasikan siapa pemilik akun Netlify dan OAuth App.

## 9. Biaya

| Layanan | Biaya |
|---|---|
| GitHub Pages | Gratis (repo publik) |
| GitHub Actions | Gratis (2000 menit/bulan) |
| Netlify (OAuth proxy) | Gratis (tier starter) |
| Decap CMS | Gratis (open source) |

Total biaya pemeliharaan: **Rp 0**.
