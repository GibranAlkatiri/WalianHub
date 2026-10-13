# Aturan kerja AI dan pembagian frontend/backend WalianHub

Baca dokumen ini sebelum mengubah berkas. Aturan berlaku untuk seluruh repository, termasuk salinannya di fork. Jika memakai asisten AI lain, minta asisten tersebut membaca `AGENTS.md` terlebih dahulu.

Keputusan terbaru 13 Oktober 2026: pengguna mengikuti arahan ketua tim untuk memakai login username/password awal dan menyerahkan kelanjutan keamanan kepada ketua tim. Baca [LOGIN-AWAL-SERAH-TERIMA.md](LOGIN-AWAL-SERAH-TERIMA.md) terlebih dahulu. Branch `backend/staff-approval-preview` sekarang menjadi arsip prototipe; jangan merge atau mengaktifkan akun staf, email login, maupun Turnstile dari branch ini tanpa penugasan baru. [SERAH-TERIMA-ADMIN.md](SERAH-TERIMA-ADMIN.md) dan [ADMIN-AKUN-STAF.md](ADMIN-AKUN-STAF.md) menyimpan riwayat rancangan sebelumnya. Pertahankan pekerjaan dan ide terbaru saat memulai kelanjutan; periksa branch, status, dan diff sebelum mengedit.

## 1. Pembagian yang disepakati

| Peran | Penanggung jawab | Tugas |
|---|---|---|
| Frontend | Pemilik proyek, `GibranAlkatiri` | Tampilan website, animasi, tampilan panel CMS, kenyamanan penggunaan, dan aksesibilitas |
| Backend | Pemilik proyek, `GibranAlkatiri` | Login, API, sesi, koneksi GitHub, penyimpanan konten/media, dan publikasi CMS |

Pembaruan 13 Oktober 2026: pengguna menyatakan bahwa `gleey` menyerahkan tanggung jawab website kepada pemilik proyek. GitHub, Cloudflare, dan Cloudinary dikelola melalui akun pemilik. Rekan dapat melanjutkan pekerjaan yang ditugaskan pemilik; perubahan tanggung jawab ini tidak memberi izin otomatis untuk merge atau publikasi produksi. Untuk pekerjaan akun staf, pemilik sudah mengizinkan integrasi backend dan formulir/tampilan login serta pengelolaan akses staf.

Tentukan peran dari penugasan pengguna dan konteks pekerjaan. Nama branch membantu mengenali pekerjaan, tetapi tidak memberikan izin mengubah area orang lain. Jangan mengganti peran sendiri untuk melewati batas ini.

Pekerjaan frontend mengikuti [TAHAPAN-UI-CMS.md](TAHAPAN-UI-CMS.md). Pekerjaan backend mengikuti [CMS-SETUP.md](CMS-SETUP.md) dan kontrak data pada kode terbaru. [CMS.md](CMS.md) adalah rencana historis, bukan gambaran arsitektur yang sedang digunakan.

## 2. Berkas milik frontend

**AI yang ditugaskan mengerjakan backend dilarang mengubah, menghapus, memindahkan, atau memformat ulang area berikut tanpa persetujuan eksplisit pemilik frontend:**

| Area | Isi |
|---|---|
| `src/components/`, `src/layouts/`, `src/pages/` | Komponen dan halaman website |
| `src/styles/`, `src/assets/`, `src/icons/` | Gaya, aset desain, dan ikon |
| `public/images/`, favicon dan ikon aplikasi di `public/` | Aset tampilan website |
| `public/admin/admin.css`, `public/admin/preview.css` | Tampilan editor CMS dan panel pratinjau |
| `public/admin/login.css`, jika dibuat | Tampilan halaman login setelah pemisahan kode |
| `public/admin/ui-cms.js`, jika dibuat | Perilaku tampilan CMS; bukan autentikasi atau penyimpanan |
| `src/lib/animasi.ts`, `carousel.ts`, `panel-program.ts`, `slideshow.ts`, `teks-ketik.ts` | Animasi dan interaksi |
| `src/lib/data-wisata.ts`, `format.ts`, `jam-layanan.ts`, `navigasi.ts`, `url.ts`, `wisata.ts` | Perilaku dan penyajian data pada website |

Lokasi `public/admin/` tidak otomatis berarti seluruh isinya milik backend. CSS panel CMS termasuk frontend.

## 3. Berkas milik backend

AI frontend boleh membaca area berikut untuk memahami integrasi. Perubahan perilaku backend harus ditangani atau disetujui penanggung jawab backend.

| Area | Isi |
|---|---|
| `functions/` | API dan Cloudflare Pages Functions; saat ini login pada `functions/api/auth.js` |
| `tests/auth-password.test.js` dan pengujian API baru | Pemeriksaan autentikasi dan backend |
| `public/admin/auth-client.js`, jika dibuat | Permintaan login, penyimpanan/penghapusan sesi, dan pemuatan CMS setelah login |
| Konfigurasi Cloudflare dan kredensial pada layanan | Environment variable, token, akses repository, dan pengaturan deployment |

Rahasia tidak ditulis ke repository, dokumen, screenshot, atau keluaran perintah. Dokumen hanya menyebut nama environment variable dan kebutuhan izinnya.

## 4. Berkas bersama: koordinasikan sebelum mengedit

| Berkas/area | Batas perubahan |
|---|---|
| `public/admin/index.html` | Saat ini HTML, CSS, dan JavaScript login masih bercampur. Tentukan satu pengedit untuk satu pekerjaan. Frontend menangani HTML/tampilan; backend menangani logika login. Pemisahan direncanakan pada tahap 0 UI. |
| `public/admin/config.yml` | Backend menangani koneksi repository, branch, media, dan publikasi. Frontend mengusulkan label, petunjuk, dan pengelompokan formulir. Nama field, tipe, nilai default, dan validasi adalah kontrak bersama. |
| `src/content.config.ts`, `src/lib/validasi-konten.ts`, `src/lib/bagan.ts` | Schema dan aturan data; perubahan dapat memengaruhi CMS dan website sekaligus |
| `src/content/`, `public/uploads/` | Konten dan media; perubahan untuk demo/uji harus dibedakan dari data yang akan dipublikasikan |
| `src/lib/konfigurasi.ts`, `astro.config.mjs` | Saklar website, URL situs, dan integrasi hosting |
| `package.json`, `bun.lock`, `tsconfig.json`, `.gitignore`, `.github/` | Dependensi, pengujian, CI, dan pengaturan proyek |
| Pengujian kontrak konten/Wisata serta dokumen lintas tim | Bukti integrasi dan pedoman bersama |

Untuk berkas bersama:

1. Jelaskan berkas dan bagian yang perlu berubah, alasan, serta dampaknya ke peran lain.
2. Pastikan lingkup perubahan lintas peran disetujui dan berkas tersebut tidak sedang diedit rekan.
3. Gunakan patch yang kecil. Jangan menjalankan formatter massal pada berkas bersama.
4. Periksa hasil gabungan dan kontrak datanya sebelum merge.

Berkas baru yang belum tercantum harus diklasifikasikan menurut fungsinya sebelum dibuat. Berkas campuran ditempatkan sebagai area bersama; jangan memakai lokasi baru untuk menghindari pembagian tanggung jawab.

## 5. Saat tugas backend meminta perubahan frontend

AI backend harus menolak **bagian perubahan frontend yang belum diizinkan**, menjelaskan batasnya, lalu menawarkan perubahan yang sesuai dengan tugas backend. Contoh jawaban:

> Perubahan pada `public/admin/admin.css` termasuk area frontend milik GibranAlkatiri. Saya tidak akan mengubahnya tanpa persetujuan pemilik frontend. Saya dapat melanjutkan pemeriksaan API/login dan menyiapkan catatan masalah UI untuk ditangani frontend.

Tetap kerjakan bagian backend yang sah. Catatan atau usulan patch boleh disiapkan, tetapi jangan menerapkannya ke berkas frontend. Jangan mengganti framework, menghapus stylesheet, atau merombak markup untuk mengatasi masalah backend tanpa koordinasi.

Aturan yang sama berlaku bagi AI frontend yang ingin mengubah autentikasi, sesi, atau publikasi backend. Persetujuan lintas area harus menyebut pekerjaan atau berkas yang diizinkan; instruksi rutin seperti "rapikan CMS" bukan persetujuan otomatis untuk mengambil alih seluruh area.

## 6. Repository, pull, dan branch

Kondisi yang dikonfirmasi pada 7 Oktober 2026:

- Repository kode bersama: `GibranAlkatiri/WalianHub`.
- Animasi dan CMS digabung ke `main` melalui PR #4, commit `3d5c680`.
- Repository yang terhubung ke Cloudflare `walianhub.pages.dev`: `gleey/WalianHub`, branch `main`.
- `backend.repo` CMS tetap `gleey/WalianHub`, sesuai tujuan produksi tersebut.

Pembaruan 13 Oktober 2026: produksi aktif adalah `https://walianhub-8ib.pages.dev`, project Cloudflare `walianhub`, repository `GibranAlkatiri/WalianHub`, branch `main`. Keterangan 7 Oktober di atas bersifat historis. Titik awal branch keamanan admin ini adalah commit `039fa5af95803b9be21bf51e8b668ab19ceb46d5` (PR #45, foto lurah tanpa latar). Periksa SHA terbaru sebelum publikasi. Fork `gleey/WalianHub` bukan tujuan produksi aktif untuk pekerjaan ini.

Izin commit/push prototipe untuk serah-terima merupakan keputusan sebelumnya. Keputusan terbaru mengarsipkan prototipe dan mempertahankan kode login username/password pada `main`; pengguna secara eksplisit memilih menghapus langkah verifikasi Cloudflare pada CMS produksi. Perubahan tersebut hanya menghapus cakupan jalur produksi dari aplikasi Access. Merge prototipe, migrasi akun staf, dan publikasi fitur keamanan baru tetap memerlukan penugasan serta izin baru.

Perubahan pada repo kode bersama belum otomatis masuk ke fork atau situs Cloudflare. Periksa SHA terbaru; commit di atas hanya menjadi titik awal, bukan commit yang harus selalu dipakai.

### Jika memakai repository kode bersama secara langsung

Pastikan pekerjaan lokal sudah disimpan. Kemudian:

```bash
git remote -v
git status --short
git switch main
git pull --ff-only origin main
```

### Jika memakai fork `gleey/WalianHub`

`git pull origin main` hanya mengambil kode dari fork itu. Periksa apakah remote sumber kode bersama sudah ada:

```bash
git remote -v
```

Jika belum ada remote yang menunjuk `GibranAlkatiri/WalianHub`, tambahkan sekali:

```bash
git remote add upstream https://github.com/GibranAlkatiri/WalianHub.git
```

Jika `upstream` sudah ada dengan URL lain, jangan menimpanya; gunakan nama remote yang belum dipakai. Dengan `upstream` yang benar, buat branch pekerjaan dari kode bersama terbaru:

```bash
git fetch upstream
git switch -c backend/cms-integrasi upstream/main
```

Nama branch contoh harus belum dipakai. Untuk branch pekerjaan yang sudah ada, simpan perubahan lokal, fetch sumber kode bersama, lalu merge `upstream/main` ke branch tersebut. Selesaikan konflik dan uji hasilnya. Jika fast-forward atau merge gagal, jangan memakai reset/force untuk menghapus pekerjaan rekan.

Frontend memakai branch tersendiri, misalnya `frontend/cms-ui`. Backend memakai branch tersendiri, misalnya `backend/cms-integrasi`. AI tidak mengerjakan perubahan fitur langsung di `main`.

## 7. Pemeriksaan sebelum commit, PR, dan merge

1. Periksa `git status`, diff, dan kesesuaian berkas dengan peran yang ditugaskan.
2. Untuk perubahan kode/konten, jalankan `bun test` dan `bun run build`. Untuk perubahan dokumen saja, periksa tautan, perintah, dan `git diff --check`; tidak perlu membuat tes baru.
3. Perubahan UI memerlukan pemeriksaan browser pada desktop dan ponsel sesuai rencana UI. Build berhasil tidak membuktikan layout sudah benar.
4. Commit/push hanya berkas pekerjaan sendiri; jangan memasukkan perubahan lokal rekan.
5. Buka PR ke repository dan branch tujuan yang disepakati. Reviewer memeriksa lingkup berkas, hasil tes, serta dampak ke peran lain.
6. Merge dan publikasi produksi dilakukan setelah izin pengguna, pemeriksaan yang diperlukan, dan CI berhasil. Jangan melewati proteksi branch atau memakai force push.
7. Periksa repository/project produksi aktif sebelum deployment. Sinkronisasi ke fork `gleey` hanya dilakukan bila diminta secara terpisah oleh pengelolanya; fork tersebut bukan tujuan produksi aktif pada pekerjaan ini.

## 8. Batas kemampuan aturan ini

`AGENTS.md` adalah instruksi kerja bagi AI yang membaca dan mematuhinya. Dokumen ini tidak mengunci file atau mengubah izin GitHub. Penegakan pada GitHub memerlukan pengaturan reviewer/CODEOWNERS dan proteksi branch yang sesuai pada masing-masing repository; pengaturan tersebut belum dibuat sebagai bagian dari dokumen ini.
