# Login awal dan serah-terima keamanan

Keputusan terbaru, 13 Oktober 2026: pemilik mengikuti arahan ketua tim untuk memakai login **username dan password** seperti awal. Ketua tim akan menentukan kelanjutan keamanan. Pemilik juga secara eksplisit memilih agar verifikasi email Cloudflare sebelum login CMS dilepas.

## Keadaan produksi

- Website: https://walianhub-8ib.pages.dev/; CMS: https://walianhub-8ib.pages.dev/admin/.
- Project Cloudflare `walianhub`, repository `GibranAlkatiri/WalianHub`, branch `main`. SHA produksi saat diperiksa: `039fa5af95803b9be21bf51e8b668ab19ceb46d5`.
- Kode produksi sudah memakai username/password awal; prototipe akun staf belum pernah digabung atau diaktifkan di sana. Tidak ada rollback commit tampilan atau pemulihan data yang diperlukan.
- `CMS_USERNAME` dan `CMS_PASSWORD_HASH` tetap memakai konfigurasi sebelumnya. Password yang dibuat lewat email pada preview akun staf bukan password CMS produksi. Rahasia tidak dicantumkan pada dokumen atau PR; serahkan kredensial kepada ketua tim melalui jalur pribadi yang disepakati.
- `CMS_SESSION_AUTH=1` tetap aktif. Cookie sesi server tetap Secure, HttpOnly, SameSite=Strict, masa berlaku 8 jam; percobaan login tetap dibatasi. Jangan mematikan flag sesi untuk menyederhanakan form: mode legacy dapat mengembalikan token GitHub ke browser.
- `CMS_STAFF_AUTH` tidak diaktifkan pada produksi. Tidak ada pendaftaran staf, persetujuan, Turnstile, atau konfirmasi email dalam login produksi saat ini.

## Perubahan Cloudflare yang sudah dilakukan

Konfigurasi aplikasi Access dicadangkan secara lokal sebelum diubah. Hanya tujuan produksi `walianhub-8ib.pages.dev/admin*`, `/api/auth`, `/api/cms`, dan `/api/media` yang dilepas dari aplikasi tersebut. Aplikasi Access, kebijakan email, App Launcher, dan tujuan wildcard preview `*.walianhub-8ib.pages.dev` tetap ada. Perubahan tujuan menggunakan [API pembaruan aplikasi Access](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/update/).

Hasil pemeriksaan anonim sesudah perubahan: website publik 200, halaman CMS 200 tanpa redirect Access, `/api/auth` 401 dengan mode session, dan `/api/cms` 401. Halaman login sekarang dapat dilihat umum; akses konten CMS tetap memerlukan username/password. Tidak ada penggantian kredensial, deployment kode, migrasi/penghapusan D1, atau perubahan foto Cloudinary.

Form login produksi juga diperiksa di browser pada desktop 1440 px dan ponsel 390 px: username bertipe teks, form terlihat, panel belum terbuka tanpa login, tidak ada galat JavaScript atau gulir horizontal. Seluruh 18 tes login/password dan sesi pada kode awal lulus. Pemeriksaan ini tidak menggunakan password produksi pengguna.

Cadangan konfigurasi Access dan hasil pemeriksaan ada di `.wrangler/recovery/password-only-access-before.json`, `password-only-access-after.json`, dan `password-only-route-check.json` pada komputer pemilik. Berkas ini lokal, mengandung konfigurasi privat, tidak masuk repository; jangan menyalin isinya ke percakapan atau PR.

## Pekerjaan sebelumnya tetap disimpan

Branch `backend/staff-approval-preview` menyimpan prototipe per akun beserta tes dan dokumen riwayat. PR #46 dihentikan sebagai jalur penggabungan prototipe; jangan menganggap branch ini sebagai versi yang harus diterapkan ketua tim. Project `walianhub-admin-preview`, database uji, widget, dan Apps Script tetap tersimpan untuk kemungkinan evaluasi kemudian. Keberadaannya tidak mengaktifkan fitur akun staf di produksi. Preview uji masih dapat menjalankan prototipe; gunakan URL produksi di atas untuk login awal.

Jangan hapus project/database/widget/skrip sebagai bagian serah-terima tanpa permintaan pengelola. Jika pemilik nanti meminta penghentian seluruh layanan uji, periksa pemakaian, simpan data yang perlu dipertahankan, dan koordinasikan penonaktifan endpoint email oleh pemilik Google.

## Arahan untuk ketua tim dan AI berikutnya

1. Baca dokumen ini dan `AGENTS.md`. Catatan `SERAH-TERIMA-ADMIN.md` serta `ADMIN-AKUN-STAF.md` adalah riwayat prototipe; keputusan login awal ini lebih baru.
2. Simpan perubahan lokal, fetch repository yang benar, lalu mulai branch keamanan baru dari `origin/main` terbaru. Jangan memakai reset atau force push untuk menimpa ide/perubahan rekan. Folder utama pemilik mempunyai perubahan dokumen/log lokal; pertahankan berkas tersebut.
3. Pertahankan tampilan terbaru, foto lurah transparan, empat kartu ringkasan, konten D1, dan media. Pengembalian ini hanya menyangkut cara login, bukan seluruh website ke commit awal.
4. Verifikasi login dengan username/password produksi yang diberikan secara pribadi. Pemeriksaan otomatis tanpa kredensial membuktikan bahwa halaman login bisa dibuka dan API anonim ditolak; belum membuktikan login pengguna dengan password produksi.
5. Audit penyimpanan password pada kode awal: saat ini SHA-256 biasa, satu akun konfigurasi. Jangan menyebut setelan ini setara dengan prototipe scrypt/per akun. Ketua tim dapat mengusulkan penguatan sesuai keputusan baru, pada branch tersendiri dan dengan uji preview.
6. Catat keputusan serta ide baru dengan tanggal dan bukti pengujian. Merge/deploy fitur berikutnya tetap mengikuti izin publikasi, pemeriksaan, dan CI pada `AGENTS.md`.

Tidak ada janji bahwa instruksi markdown mengunci file. Instruksi ini memberi konteks agar AI tidak otomatis menerapkan prototipe lama atau mengembalikan tampilan terbaru saat melanjutkan keamanan.
