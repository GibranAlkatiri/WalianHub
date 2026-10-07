# Pemeriksaan animasi dan integrasi CMS

Tanggal: 7 Oktober 2026. Seluruh tahap 1–7 sudah diterapkan. Pengguna mengizinkan pemeriksaan terakhir, commit, dan push ke branch terpisah; penilaian visual bersama dilakukan setelahnya dari daftar di bawah.

## Pratinjau

Pratinjau ini menggabungkan perubahan animasi dengan snapshot CMS terbaru dalam salinan sementara. Cloudflare memakai alamat dari root, sehingga tautan tidak mempunyai awalan `/WalianHub`.

- [Beranda asli, satu foto](http://127.0.0.1:4322/)
- [Slideshow contoh, tiga foto](http://127.0.0.1:4322/?uji=slideshow)
- [Profil](http://127.0.0.1:4322/profil/)
- [Layanan](http://127.0.0.1:4322/layanan/)
- [Wisata](http://127.0.0.1:4322/wisata/)
- [Kondisi tanpa foto](http://127.0.0.1:4322/?uji=kosong)

Foto contoh memakai foto kantor, SVG pengganti, dan foto kantor yang diulang. Konten asli tidak ditambah foto. Server pratinjau sementara perlu dijalankan kembali jika sesi berakhir; setelah perubahan kode, hasil build dan contoh juga perlu diperbarui.

## Yang perlu dilihat pengguna

Buka dari bagian atas dan muat ulang untuk mengulangi animasi pembuka. Coba pada desktop dan ponsel. Untuk animasi scroll, coba scroll pelan, cepat, lalu kembali ke bagian yang sudah dilihat. Tautan langsung ke anchor memang menampilkan isi segera.

| Animasi | Cara mencoba | Hasil yang perlu dinilai |
|---|---|---|
| 1. Judul dan subjudul pembuka | Buka/muat ulang Beranda, Profil, Layanan, dan Wisata | Ketikan berurutan; semua huruf akhirnya terlihat; tidak bergeser atau terpotong; judul panjang tetap terbaca |
| 2. Judul section | Scroll melewati Profil, Layanan, Wisata, Kontak, dan section halaman lainnya | Masuk dari kiri dengan pop kecil; tempo 625 ms dan jeda 100 ms terasa cocok; berjalan sekali |
| 3. Isi section | Lihat ringkasan, foto/nama Lurah, kontak/peta, visi/misi, dan footer | Masuk dari kanan 20 px + fade selama 750 ms, jeda 200 ms; foto Lurah sebelum teks pada ponsel; paragraf tidak terasa lama menunggu |
| 4. Kartu dan bagan | Scroll kartu layanan/destinasi/statistik serta Profil; geser bagan pada ponsel | Pop 1300 ms dengan selisih 180 ms terasa rapi; item baru tidak menunggu urutan seluruh halaman; kotak bagan tetap dekat dengan garis |
| 5. Foto latar | Buka slideshow contoh; tunggu, klik titik, tekan jeda/lanjut; klik beberapa titik cepat | Pergantian mulai setiap 2 detik; fade 600 ms; zoom kecil 2600 ms; teks tetap utuh; pilihan terakhir tampil tanpa kilatan; foto tunggal tidak berganti sendiri |
| 5. Carousel wisata | Di ponsel swipe, klik titik, lalu panah sebelumnya/berikutnya | Kartu berhenti tepat, penanda mengikuti kartu, batas awal/akhir jelas; desktop/tablet menampilkan grid |
| 6. Menu mobile | Klik hamburger beberapa kali cepat; pilih tautan; buka lagi lalu tekan Escape | Turun 8 px + fade/pop, buka 420 ms dan tutup 280 ms; tidak tersangkut; Escape mengembalikan fokus ke hamburger; resize ke desktop menutup menu |
| 6. Detail layanan | Buka satu layanan lalu layanan lain; klik cepat; gunakan Tab dan Enter/Spasi; buka tautan anchor layanan | Isi bertambah tinggi saat dibuka 450 ms dan mengecil saat ditutup 320 ms; hanya satu terbuka; isi/syarat tidak terpotong; anchor langsung membuka informasi |
| 6. Program unggulan | Profil → Selengkapnya/Tutup; klik cepat dan coba Enter; ubah ukuran layar saat bergerak | Tinggi + fade, buka 550 ms dan tutup 400 ms; daftar tetap utuh; tombol/label sesuai; fokus tidak hilang |
| 7. Hover, tombol, ikon, foto | Pada desktop sorot kartu dan tombol; tekan tombol; gunakan Tab untuk melihat fokus | Kartu naik 2 px dengan bayangan; tombol mengecil 2% saat ditekan; panah merespons; foto destinasi asli membesar 3%; gambar pengganti tetap diam; ponsel tidak membutuhkan hover |
| 7. Navbar dan kembali ke atas | Scroll turun/naik dekat puncak; lanjut melewati satu layar; klik tombol panah atas | Header berubah transparan/putih tanpa bergeser atau berkedip di batas; tombol atas naik 16 px + fade 375 ms; kembali ke atas dan fokus berpindah ke header |
| 7. Lampu status kantor | Lihat status di Layanan atau Kontak Beranda | Saat buka, cincin hijau berdenyut kecil setiap 2 detik; teks/warna status tetap benar; tidak terlalu mencolok |

Tambahan: aktifkan pengurangan gerakan di perangkat. Foto tidak berganti otomatis, panel/perpindahan tampil langsung, dan denyut berhenti. Coba Tab, Enter/Spasi, Escape untuk menu, serta panah/Home/End pada pemilihan foto/carousel. Jika JavaScript dimatikan, foto pertama, informasi halaman, daftar program, detail layanan native, serta swipe wisata tetap tersedia.

Pengumuman pada konten lokal masih kosong; contoh pengumuman terisi belum termasuk penilaian visual pengguna.

Pemeriksaan otomatis selesai: build lokal dan gabungan berhasil; 16/16 tes pada main dan 22/22 tes pada CMS berhasil. Chrome pada lebar 320, 390, 768, dan 1280 px memeriksa klik cepat, keyboard, reduced motion, panel, scroll, foto, hover, dan swipe; empat halaman tanpa overflow atau exception JavaScript. Kondisi tanpa foto, gambar gagal, dan tanpa JavaScript juga berhasil. Screenshot akhir diperiksa. Hasil ini memastikan fungsi; kenyamanan gerakan dinilai pengguna lewat tabel di atas.

## Pemeriksaan bersama pekerjaan CMS

Snapshot yang diperiksa:

| Bagian | Commit | Temuan |
|---|---|---|
| Branch animasi | `animasi-tahap-1-7` | Dibuat dari `origin/main` terbaru, lalu berisi commit animasi dan dokumentasi |
| `origin/main` | `184536d` | Basis branch animasi; CMS awal dan migrasi Cloudflare sudah masuk |
| `origin/CMS` | `6f5d0c9` | Ada 16 commit lanjutan di atas main; termasuk admin, autentikasi, serta perubahan konten |

Tidak ada berkas perubahan animasi yang beririsan dengan berkas perubahan kedua snapshot remote tersebut. Gabungan diuji lewat arsip Git dan penyalinan perubahan frontend dalam direktori sementara. Branch animasi dibuat langsung dari main terbaru dengan mempertahankan perubahan frontend. Schema, file JSON/Markdown konten, config CMS, dan pengaturan hosting tidak ditimpa oleh pekerjaan animasi.

**Konfigurasi yang harus disepakati sebelum CMS digabung/publikasikan:** `origin/main` memakai `backend.repo: GibranAlkatiri/WalianHub`, sedangkan `origin/CMS` memakai `backend.repo: gleey/WalianHub`. Fork ini mungkin memang tempat uji teman. Pastikan repo tujuan produksi, branch `main`, token akses repo, dan project Cloudflare mengarah ke tujuan yang sama. Peninjauan animasi tidak mengubah konfigurasi milik teman tersebut.

Build/tes dan pratinjau memeriksa kompatibilitas frontend serta berkas admin statis. Login Cloudflare dan penyimpanan/publikasi CMS ke GitHub perlu dicoba oleh pemilik CMS pada lingkungan yang sesuai: buat draf, periksa diff file dan repo tujuannya, lalu pastikan gambar/teks yang diubah tampil pada preview. Konfigurasi autentikasi Cloudflare tidak dijalankan oleh server statis lokal ini.

## Publikasi branch dan pemeriksaan bersama

Pengguna mengizinkan commit dan push pada 7 Oktober 2026. Referensi GitHub diperiksa ulang dan masih sesuai snapshot di atas. Branch `animasi-tahap-1-7` memakai basis `origin/main` pada `184536d`; commit mencakup frontend animasi dan kedua dokumen pemeriksaan. Build, tes, dan diff diperiksa sebelum publikasi branch. Push hanya menambahkan branch animasi, tanpa menggabungkannya ke main atau CMS.

1. Tinjau [perbandingan branch animasi](https://github.com/GibranAlkatiri/WalianHub/compare/main...animasi-tahap-1-7) bersama dan coba setiap animasi sesuai tabel di atas.
2. Sepakati repo produksi CMS dan coba login serta penyimpanan/publikasi CMS pada lingkungan teman yang sesuai.
3. Sebelum penggabungan, ambil ulang referensi GitHub. Jika main atau CMS berubah, periksa ulang berkas yang beririsan dan uji hasil gabungannya.
4. Setelah hasil visual dan integrasi cocok, gunakan pull request (permintaan menggabungkan perubahan branch) untuk meninjau dan menggabungkan animasi ke main. Perubahan CMS lanjutan tetap ditinjau melalui branch teman.

Penilaian visual bersama dan penggabungan ke main masih menunggu pemeriksaan pengguna. Pemeriksaan snapshot tidak menjamin pembaruan CMS yang dibuat setelah tanggal ini.
