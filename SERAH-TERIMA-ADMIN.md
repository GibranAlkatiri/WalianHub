# Serah-terima keamanan admin WalianHub

Tanggal: 13 Oktober 2026. Branch: `backend/staff-approval-preview`. **Keputusan terbaru: prototipe akun staf diarsipkan.** Pengguna mengikuti arahan ketua tim untuk kembali ke username/password awal, termasuk menghapus verifikasi Cloudflare pada CMS produksi. Baca [LOGIN-AWAL-SERAH-TERIMA.md](LOGIN-AWAL-SERAH-TERIMA.md) terlebih dahulu. Catatan di bawah adalah riwayat pekerjaan yang dipertahankan, bukan instruksi melanjutkan atau menerapkannya sekarang.

## Mulai di sini untuk rekan dan AI

1. Baca [AGENTS.md](AGENTS.md), dokumen ini, dan [ADMIN-AKUN-STAF.md](ADMIN-AKUN-STAF.md).
2. Periksa branch, status, diff, dan commit terbaru sebelum mengedit. Simpan perubahan lokal rekan. Gunakan fetch dan fast-forward bila memungkinkan; jangan reset atau force push untuk menghilangkan pekerjaan baru.
3. Pertahankan keputusan produk di bawah. Jika pengguna atau rekan mengusulkan ide baru, catat alasan dan dampaknya, lalu integrasikan dengan pekerjaan terbaru. Jangan otomatis mengembalikan kode dari commit lama atau mengganti mekanisme login karena dokumen historis berbeda.
4. Branch ini menjadi arsip prototipe. Mulai pekerjaan keamanan ketua tim dari `main` terbaru pada branch baru; jangan menggabungkan atau mengaktifkan prototipe tanpa penugasan baru. Instruksi uji/deploy di bawah hanya berlaku jika prototipe diaktifkan kembali atas keputusan pengguna.

Pemilik proyek menangani frontend dan backend; rekan melanjutkan sesuai penugasan pemilik. Lingkup integrasi yang sudah diizinkan adalah autentikasi, sesi, akun staf, email, formulir login, dan halaman pengelolaan akses staf. Perubahan tampilan website publik di luar lingkup itu tetap mengikuti aturan koordinasi pada AGENTS.

## Keputusan produk sebelumnya, kini menjadi riwayat

| Bagian | Keputusan |
|---|---|
| Identitas | Pengelola mempunyai akun sendiri; setiap staf memakai akun dan password masing-masing. Password akun pemilik tidak dibagikan kepada staf. |
| Pendaftaran | Nama + email → verifikasi kepemilikan email → menunggu persetujuan pemilik. Pendaftaran saja tidak memberi akses CMS. |
| Persetujuan | Pemilik memilih Setujui atau Tolak. Persetujuan cukup sekali untuk akun yang tetap aktif. |
| Password | Setelah disetujui, staf menerima tautan untuk membuat password sendiri. Login berikutnya memakai email + password tanpa persetujuan ulang. |
| Kenyamanan | Pengguna boleh memilih ingat email pada perangkatnya, sehingga selanjutnya cukup mengetik password. Password/token sesi tidak disimpan di localStorage. |
| Pencabutan | Pemilik dapat mencabut akses; sesi serta tautan password lama tidak berlaku lagi. |
| Email | Pengguna belum mempunyai domain pengirim atau layanan email. Google Apps Script MailApp pada akun pengguna sudah diaktifkan; tidak memakai OAuth Google/Resend untuk alur ini. |
| Urutan publikasi | Uji pada preview terlebih dahulu. Commit/push sekarang untuk serah-terima, kemudian lanjutkan pengujian. Produksi setelah pengujian dan pemeriksaan selesai. |

Implementasi pengelola saat ini memakai password lalu konfirmasi email setiap login baru. Pengguna telah mencoba alur ini dan membuka CMS. Sesi CMS berlangsung 8 jam, tetapi API pengelolaan staf memerlukan sesi pengelola yang dibuat dalam 15 menit terakhir. Batas 15 menit adalah pilihan teknis pada prototipe dan perlu dinilai saat uji kenyamanan; jangan menyamakan batas itu dengan masa sesi CMS. Konfirmasi email bergantung pada keamanan inbox, bukan MFA tahan phishing. Jangan menghapus perlindungan tersebut otomatis untuk mengatasi masalah tampilan/sesi.

## Lokasi kode dan batas berkas

| Area | Isi pada branch ini |
|---|---|
| Backend | `functions/api/auth.js`, `functions/api/staff.js`, `server/cms-session.js`, `server/cms-staff.js`, `server/cms-password.js`, `server/cms-mail.js`, `server/cms-turnstile.js`, dan canonicalization pada `functions/_middleware.js`. |
| Database | Migration baru `migrations/0005_staff_auth.sql`: identitas, sesi staf, tautan sekali pakai, pembatasan percobaan, serta audit persetujuan. Belum diterapkan pada produksi. |
| Klien autentikasi/integrasi | `public/admin/auth-client.js`, `public/admin/staff-auth-client.js`, dan patch kecil pada `public/admin/index.html`. |
| Tampilan | `public/admin/login.css`, `public/admin/staf.html`, `public/admin/staf.css`, `public/admin/staf.js`, serta tautan Akses staf pada `public/admin/cms.js`. Halaman pengelolaan menggabungkan tampilan dan permintaan API; koordinasikan satu pengedit. |
| Pengiriman email | `scripts/cms-mail-google.gs` adalah kode yang disalin ke Google Apps Script; rahasia ada di Script Properties dan environment layanan, bukan berkas ini. |
| Pengujian | `tests/cms-staff-auth.test.js`, `tests/cms-staff-mail.test.js`, dan seluruh tes integrasi lama. |

Schema/nama field konten CMS, konfigurasi repository CMS, aset publik, dan layout website tidak dirombak oleh pekerjaan login ini. Tidak ada dependensi baru. Root workspace pemilik masih mempunyai dokumen dan log lokal tersendiri; berkas `.wrangler/`, `.env*`, `.dev.vars*`, token, serta helper/snapshot lokal tidak ikut commit ini.

## Preview dan produksi adalah project berbeda

| Lingkungan | Tujuan |
|---|---|
| Preview akun staf | [Login uji](https://walianhub-admin-preview.pages.dev/admin/), project `walianhub-admin-preview`, database terpisah bernama `walianhub-staff-auth-preview`. |
| Produksi aktif | [Website publik](https://walianhub-8ib.pages.dev/), project `walianhub`, repository `GibranAlkatiri/WalianHub`, branch `main`. |

Branch pekerjaan dimulai dari main `039fa5af95803b9be21bf51e8b668ab19ceb46d5` (PR #45). Main tersebut sudah memuat pemulihan tampilan pilihan pemilik (PR #44, acuan desain PR #40) dan foto lurah transparan (PR #45). Pertahankan tampilan serta empat kartu ringkasan: lingkungan, kepala keluarga, jumlah penduduk, luas wilayah. Jangan menghapus template/kontrak empat kartu untuk menyelesaikan masalah login.

Preview ini diunggah langsung dari worktree, sebelum commit, ke project uji. Pada project **uji** tersebut, production branch bernama `preview`; `--branch preview` memakai environment Production milik project uji. Itu berbeda dari environment Production project website aktif. URL preview otomatis sebuah PR pada project `walianhub` dapat mempunyai binding dan kebijakan Access berbeda; jangan menganggapnya sudah mempunyai akun staf/migration/config yang sama.

Preview dibuat dengan seed konten repository, bukan salinan semua konten produksi. Pengujian akun dan konten teks memakai D1 tersendiri. Cloudinary/media upload belum diaktifkan pada project uji; pengujian upload nyata dengan autentikasi staf masih perlu lingkungan media uji yang disetujui. Jangan menghubungkan database atau menjalankan pembersihan foto produksi untuk membuat tes preview lewat.

## Bukti yang sudah tersedia

- Seluruh 181 tes dan build telah lulus; jalankan kembali pemeriksaan pada commit/kelanjutan terbaru. Tes baru mencakup role spoofing, akses sebelum persetujuan, konfirmasi pengelola, reset password, pencabutan sesi, persetujuan bersamaan, CSRF, pembatasan percobaan, kegagalan email, dan tanda tangan email.
- Runtime Cloudflare telah berhasil menjalankan scrypt dan login akun staf sintetis: API CMS menerima sesi staf; API pengelolaan staf menolak staf dengan 403; permintaan anonim ditolak. Akun sintetis sudah dihapus. Ini membuktikan uji runtime, bukan keseluruhan alur staf nyata.
- Tampilan login, pendaftaran, dan CMS dilihat pada desktop 1440 px serta ponsel 390 px, tanpa gulir horizontal atau galat JavaScript pada pemeriksaan tersebut.
- Regresi tautan akun saat ada sesi dan formulir masuk ulang diperiksa memakai respons identitas tiruan khusus pengujian tampilan. Halaman pengelolaan tanpa sesi juga diperiksa: 401 menampilkan tombol masuk ulang. Jangan menyebut pengujian tampilan tiruan ini sebagai bukti konfirmasi email/izin pengelola nyata.
- Email uji nyata diterima pengguna. Salah satu inbox memasukkannya ke Spam. Pengiriman dengan teks Unicode sempat gagal; normalisasi payload JSON ASCII serta charset UTF-8 telah dipasang dan diuji tanpa mengubah teks yang dibaca penerima.
- Pengguna membuat password pengelola, menyelesaikan konfirmasi email, dan membuka CMS. Catatan preview terakhir pada **13 Oktober 2026 13:30 UTC**: pemilik approved, password ada, sesi aktif; staf uji emailVerified, status pending, password belum dibuat, sesi tidak ada. Alamat email tidak ditulis ke dokumen publik; identitas pemilik ada pada `CMS_OWNER_EMAIL`, akun uji dapat dilihat pengelola melalui panel.

## Masalah terbuka dan pekerjaan pertama malam ini

Pengguna melihat pesan **"Sesi berakhir. Silakan masuk kembali."** ketika membuka Kelola akses staf, meskipun sesi pengelola masih tercatat aktif di server. Penyebab pada browser pengguna belum dibuktikan; jangan menyimpulkan hanya karena beda jendela. Dua kasus perlu dibedakan:

- Pesan sesi berakhir: cookie tidak ada/tidak dikenali, token invalid/kedaluwarsa, atau versi kredensial berubah.
- Pesan **"Masuk kembali untuk mengatur akses staf."**: sesi CMS masih valid, tetapi konfirmasi pengelola melewati batas 15 menit.

Perbaikan yang sudah dipasang: halaman akses staf memberi tombol **Masuk ulang sebagai pengelola** untuk 401/403; `?reauth=staff` menahan pembukaan CMS otomatis agar login baru bisa dilakukan. Tautan email verifikasi/password juga tidak lagi tertutup pembukaan panel otomatis ketika cookie sudah ada. Pengguna belum mengonfirmasi bahwa akses daftar/persetujuan melalui alur ini berhasil. Ini tugas pertama yang perlu dituntaskan, bukan alasan membuka API pengelolaan tanpa autentikasi.

Urutan kelanjutan:

1. Minta pengelola memakai panel yang terbuka sesudah konfirmasi email, lalu menu Akses staf. Periksa request `/api/auth` dan `/api/staff` di browser yang sama, hostname, role, cookie Secure/HttpOnly/SameSite, serta umur sesi. Jangan meminta password, cookie, atau tautan email ke percakapan/log.
2. Pastikan pengelola dapat melihat pendaftaran dan menekan Setujui; periksa audit dan transisi pending → approved. Saat terakhir diperiksa, belum ada persetujuan staf nyata. Jangan mengubah status langsung di database untuk menggantikan uji tombol persetujuan.
3. Setelah persetujuan, pastikan staf menerima email pembuatan password, membuat password sendiri, dan login memakai email/password. Gunakan jendela samaran untuk sesi staf bila pemilik dan staf diuji pada satu perangkat.
4. Uji logout/login berikutnya tanpa persetujuan ulang; uji batas hak staf serta pencabutan sesi. Tes otomatis telah meliputi perilaku ini, tetapi uji staf nyata belum selesai.
5. Validasi ulang tes/build dan browser jika kode berubah; catat hasil kelanjutan serta ide/perubahan keputusan pada bagian kemajuan di bawah.
6. Sebelum publikasi, siapkan cadangan/pemulihan D1, provisioning pemilik yang terverifikasi, migration dan environment produksi, pemeriksaan media serta endpoint alternatif, dan rencana rollback Access + autentikasi. Tidak ada migrasi akun ke produksi yang dikerjakan pada sesi ini.

Pendaftaran ulang akun yang sudah pending/approved tidak mengirim verifikasi baru. Respons umum pendaftaran/pemulihan tidak membocorkan keberadaan akun. Pada status pending, email yang tiba di inbox pemilik adalah pemberitahuan permintaan, bukan email password staf. Email password baru dikirim setelah Setujui atau tindakan Kirim tautan password pada akun approved. Jangan salah menilai alur tersebut sebagai perubahan tujuan email staf.

## Menjalankan kelanjutan

Setelah pekerjaan lokal disimpan, pada clone yang benar:

```powershell
git fetch origin
git switch backend/staff-approval-preview
git pull --ff-only origin backend/staff-approval-preview
bun install --frozen-lockfile
bun test
bun run build
git diff --check
```

Pada clone baru, `git switch` dapat membuat tracking branch dari remote. Pada komputer pemilik, branch ini sudah dipakai worktree `.wrangler/worktrees/backend-staff-auth`; jalankan perintah branch dari worktree itu, bukan mencoba switch folder utama. Bila terdapat perubahan lokal/konflik, hentikan langkah switch/pull dan simpan pekerjaan; jangan reset/force.

Dengan akses Cloudflare yang secara terpisah telah diberikan pengelola, deployment **hanya ke project uji**:

```powershell
bunx wrangler pages deploy dist --project-name walianhub-admin-preview --branch preview
```

Perintah tersebut tidak menerapkan migration atau membuat environment secara otomatis. Binding `CMS_DB`, flags, origin, secret email, dan widget Turnstile project uji sudah disiapkan pada akun pemilik. Helper provisioning/bootstrap dan snapshot di `.wrangler/` adalah berkas lokal yang tidak tersedia pada clone rekan. Uji unit dapat berjalan tanpa kredensial/email nyata; jangan menyalin akun pemilik, secret lokal, atau password untuk menjalankan uji lokal. Bootstrap pemilik untuk lingkungan baru perlu proses operasional terverifikasi; pendaftar publik pertama tidak otomatis menjadi pemilik.

Gunakan nama environment dan panduan [ADMIN-AKUN-STAF.md](ADMIN-AKUN-STAF.md). Jangan mencetak isi konfigurasi environment atau menyertakan rahasia pada Git/PR. Periksa riwayat migration sebelum menyentuh database yang sudah berisi tabel; jangan menerapkan ulang semua migration awal pada produksi secara buta.

## Kemajuan kelanjutan

Tambahkan entri bertanggal di sini: masalah yang diperiksa, keputusan baru dari pengguna, berkas yang diubah, bukti tes/browser/email, serta pekerjaan yang masih tersisa. Pertahankan entri lama sebagai riwayat; tandai temuan yang sudah diselesaikan dengan bukti yang baru.

- 13 Oktober 2026: kode dan dokumentasi disiapkan untuk commit/push branch kolaborasi atas permintaan pengguna. Uji pengguna masih berhenti pada persetujuan staf. Produksi belum diubah oleh pekerjaan akun staf ini; draft PR bukan izin merge/deploy.
- 13 Oktober 2026, keputusan berikutnya: pengguna memilih kembali ke username/password saja dan menyerahkan kelanjutan keamanan kepada ketua tim. Cakupan Access pada jalur CMS produksi sudah dilepas setelah cadangan dibuat; perlindungan preview tetap ada. Akun staf tetap menjadi arsip terpisah dan tidak diterapkan pada produksi. Baca catatan terbaru sebelum mengambil langkah dari riwayat ini.
