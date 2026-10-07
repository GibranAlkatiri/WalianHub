# Tahapan perbaikan UI CMS WalianHub

Tanggal rencana: 7 Oktober 2026. Penanggung jawab tampilan: pemilik frontend. Penanggung jawab login, penyimpanan, dan publikasi: rekan backend.

Tujuan: staf kelurahan dapat menemukan menu, membaca petunjuk, mengisi formulir, dan memahami status pekerjaannya dengan mudah pada komputer maupun ponsel. UI berarti tampilan dan cara menggunakan panel; backend berarti proses di balik login, penyimpanan, serta publikasi.

Baca [AGENTS.md](AGENTS.md) untuk pembagian berkas sebelum mengerjakan tahap mana pun. Dokumen ini adalah rencana; perbaikan UI di bawah belum dilaksanakan.

## 1. Titik awal yang sudah diperiksa

Animasi dan CMS telah digabung ke `main` kode bersama melalui PR #4, commit `3d5c680`. Gabungan lolos build dan 22 tes. Login dan editor Decap dilihat pada desktop dan ponsel menggunakan backend uji dengan salinan konten.

| Masalah yang terlihat | Dampak bagi pengguna |
|---|---|
| Daftar konten turun ke bawah sidebar pada desktop | Ruang kosong besar; pengguna harus mencari daftar ke bawah |
| Editor memakai minimum lebar 800 px pada ponsel | Halaman mengecil dan tombol/teks sulit digunakan |
| Input pencarian dropdown ikon menutupi sebagian label | Pilihan ikon sulit dibaca |
| Tampilan dan logika login berada dalam satu file | Frontend dan backend berisiko mengedit bagian yang sama |

Pemeriksaan ini belum membuktikan login, penyimpanan, upload, atau publikasi pada Cloudflare. Rekan backend memeriksa fungsi tersebut pada lingkungan uji yang disepakati sambil frontend bekerja.

## 2. Cara mengikuti tahapan

- Kerjakan dalam branch frontend dari kode bersama terbaru.
- Selesaikan satu tahap, ambil bukti sebelum/sesudah, lalu minta penilaian pemilik frontend sebelum melanjutkan perubahan desain besar.
- Catat masalah dan keputusan di tabel kemajuan. Tahap yang belum cocok diperbaiki kembali.
- Gunakan salinan konten untuk mencoba formulir. Mode uji Decap tidak menyimpan ke GitHub; pesan "tersimpan" di mode tersebut tidak membuktikan publikasi sebenarnya.
- Pertahankan nama field, tipe data, validasi, dan perilaku backend. Perubahan kontrak masuk koordinasi lintas peran.

## 3. Gambaran urutan

| Tahap | Fokus | Hasil yang diharapkan |
|---|---|---|
| 0 | Persiapan dan pemisahan berkas | Kedua pengembang memakai kode yang sama dan memiliki area edit yang jelas |
| 1 | Navigasi dan daftar konten | Menu dan isi terlihat berdampingan pada desktop, tersusun jelas pada ponsel |
| 2 | Editor dan pratinjau | Formulir nyaman diisi; pratinjau mudah ditemukan dan dapat disembunyikan |
| 3 | Kontrol formulir | Dropdown, switch, daftar, tanggal, gambar, dan editor teks bekerja serta terbaca |
| 4 | Bahasa dan bantuan | Pengguna awam memahami istilah, petunjuk, dan status pekerjaannya |
| 5 | Gaya dan aksesibilitas | Warna, ukuran, jarak, fokus, serta pesan konsisten |
| 6 | Uji gabungan dan publikasi | Tampilan dan fungsi lolos pemeriksaan sebelum masuk versi bersama/produksi |

## Tahap 0 — Siapkan dasar kerja

Yang dikerjakan:

- Frontend dan backend mengambil `main` terbaru dari `GibranAlkatiri/WalianHub`, kemudian membuat branch masing-masing.
- Simpan screenshot awal halaman login, daftar Layanan/Destinasi, editor layanan, Profil, dan media. Gunakan konten kosong dan terisi.
- Pilih satu pengedit untuk pekerjaan pemisahan `public/admin/index.html`; lakukan koordinasi karena berkas ini masih dipakai kedua peran.
- Pindahkan CSS login ke `public/admin/login.css` dan logika login ke `public/admin/auth-client.js`. Frontend menangani gaya/HTML; backend memeriksa pemindahan logika. Pertahankan ID, urutan pemuatan, format sesi, dan permintaan API.
- Tetapkan tampilan yang dipakai: warna hijau/cream WalianHub, teks jelas, navigasi sederhana, dan tombol tindakan utama yang mudah ditemukan.

Cara memeriksa: halaman login terlihat sama seperti sebelum pemisahan; tombol lihat password, pesan gagal, status memuat, dan penghapusan sesi tetap bekerja. Backend memeriksa login sebenarnya pada lingkungan uji.

Syarat lanjut: berkas sudah terbagi, baseline tersimpan, dan tidak ada perubahan fungsi akibat pemindahan kode.

## Tahap 1 — Rapikan navigasi dan daftar konten

Yang dikerjakan:

- Pada desktop, sidebar di kiri dan daftar konten di kanan dengan bagian atas sejajar.
- Pada ponsel, navigasi ringkas tetap mudah diakses; tidak memakan sebagian besar layar.
- Letakkan nama menu, penjelasan singkat, pencarian, serta tombol tambah dalam urutan yang jelas.
- Buat daftar konten terisi dan pesan kosong mudah dipahami. Beri penanda menu yang sedang aktif.
- Pastikan nama panjang, judul panjang, dan banyak item tidak memotong tombol penting.

Cara memeriksa: buka Layanan, Destinasi, Pengumuman, dan Pengaturan. Pengguna dapat menjawab "saya sedang di menu apa?" dan "bagaimana menambah/mengubah isi?" tanpa mencari terlalu lama.

Syarat lanjut: ruang kosong akibat salah layout hilang; daftar dan navigasi berfungsi pada desktop serta ponsel.

## Tahap 2 — Rapikan editor dan pratinjau

Yang dikerjakan:

- Hilangkan pemaksaan lebar desktop pada ponsel.
- Pada desktop, formulir dan pratinjau dapat berdampingan dengan ukuran yang nyaman.
- Pada ponsel, utamakan formulir; sediakan cara yang jelas untuk membuka/menutup pratinjau.
- Pastikan tombol kembali, simpan, dan status publikasi tetap dapat dijangkau.
- Atur scroll agar pengguna bisa mencapai field terakhir; hindari panel yang menutupi field atau tombol.

Cara memeriksa: buka layanan sederhana dan Profil yang panjang. Scroll sampai akhir, ubah ukuran layar, serta ganti tampilan editor/pratinjau. Pastikan isi yang sedang diketik tetap ada.

Syarat lanjut: formulir dapat digunakan tanpa tampilan mengecil dan tanpa gulir horizontal seluruh halaman. Tombol penting tetap terlihat atau mudah dicapai.

## Tahap 3 — Benahi kontrol formulir

| Kontrol | Yang harus bisa dilakukan pengguna |
|---|---|
| Dropdown ikon/kategori | Membaca pilihan, mencari, memilih, dan menutup daftar tanpa label tertutup |
| Switch pilihan Beranda/Penting | Mengetahui kondisi aktif/nonaktif dan mengubahnya lewat klik atau keyboard |
| Daftar syarat, langkah, foto, dan organisasi | Menambah, mengubah, mengurutkan, serta menghapus item dengan jelas |
| Tanggal dan angka | Memahami format serta pesan ketika nilai tidak valid |
| Gambar | Memilih/mengganti foto dan memahami keadaan kosong atau gambar gagal |
| Editor catatan | Membaca toolbar, menulis teks, serta berpindah mode yang tersedia |

Cara memeriksa: coba mouse, sentuhan, dan keyboard. Isi contoh pendek/panjang, kosongkan field opsional, serta buka dropdown di dekat bagian bawah layar. Periksa nilai setelah berpindah field.

Syarat lanjut: semua jenis kontrol terbaca dan dapat digunakan; CSS tidak menimpa input tersembunyi atau bagian internal widget.

## Tahap 4 — Perjelas bahasa dan petunjuk

Yang dikerjakan:

- Gunakan istilah Bahasa Indonesia yang konsisten pada label dan petunjuk yang dapat dikustomisasi.
- Jelaskan istilah penting: "Draf" berarti belum tampil untuk warga; "Terbitkan" berarti perubahan akan ditampilkan setelah proses publikasi berhasil.
- Berikan contoh singkat di dekat isian yang mudah membingungkan, misalnya urutan, foto Beranda, dan atasan organisasi.
- Bedakan field wajib dan opsional; hindari petunjuk panjang yang mengulang nama field.
- Bedakan pesan sedang memuat, belum tersimpan, berhasil, dan gagal. Pesan gagal menjelaskan langkah berikutnya yang bisa dilakukan.

Koordinasi: label dan petunjuk dalam `config.yml` merupakan pekerjaan berkas bersama. Periksa dukungan bahasa widget bawaan sebelum menjanjikan seluruh antarmuka bisa diterjemahkan. Nama field penyimpanan tetap sama.

Cara memeriksa: minta orang yang belum pernah memakai CMS mencari satu layanan, mengganti ringkasan, dan memahami beda simpan draf/terbitkan pada mode uji. Catat bagian yang membuatnya berhenti atau bertanya.

Syarat lanjut: tugas dasar dipahami dengan petunjuk yang tersedia, tanpa harus membaca kode atau istilah GitHub.

## Tahap 5 — Seragamkan gaya dan aksesibilitas

Yang dikerjakan:

- Seragamkan font, ukuran teks, jarak, bentuk kontrol, serta warna dengan website WalianHub.
- Bedakan tombol utama, tombol tambahan, dan tindakan hapus. Status tidak hanya dibedakan melalui warna.
- Pastikan teks, ikon, dan indikator fokus jelas di atas latar masing-masing.
- Gunakan Tab, Enter/Spasi, dan Escape sesuai perilaku kontrol; periksa fokus setelah panel/dialog ditutup.
- Pastikan tombol nyaman disentuh dan gerakan menghormati pengaturan pengurangan animasi perangkat.

Cara memeriksa: bandingkan login, daftar, editor, media, dan pesan gagal. Coba keyboard, ponsel, serta pembesaran browser 200%.

Syarat lanjut: tampilan konsisten, teks tetap terbaca, dan kontrol dapat dipakai tanpa mouse.

## Tahap 6 — Uji gabungan sebelum publikasi

Frontend memeriksa layout pada lebar 320, 390, 768, dan 1280 px; konten kosong/terisi/panjang; widget; keyboard; serta pratinjau.

Backend memeriksa login benar/salah, pemulihan sesi, logout, memuat konten, menyimpan/membuka kembali draf, upload media, serta publikasi pada lingkungan uji yang disepakati.

Bersama-sama:

- Jalankan `bun test`, `bun run build`, dan pemeriksaan diff.
- Pastikan JSON/Markdown hasil simpan tetap sesuai schema dan tampilan website menerima hasilnya.
- Periksa perubahan frontend dan backend digabung tanpa konflik maupun perubahan kontrak yang tidak disepakati.
- Buka PR ke repo kode bersama dan tunggu CI serta review yang diperlukan berhasil.
- Setelah merge, koordinasikan sinkronisasi ke `gleey/WalianHub` dengan pengelola produksi. Cloudflare mengikuti repo tersebut; merge di repo kode bersama saja belum memperbarui situs.

Syarat selesai: bukti UI dan fungsi tersedia, hasil diterima, serta hasil deployment yang dituju sudah diperiksa. Mode demo tidak dihitung sebagai bukti login/publikasi produksi.

## 4. Catatan kemajuan

Status yang digunakan: **Belum mulai → Dikerjakan → Menunggu penilaian → Perlu revisi / Diterima**.

| Tahap | Status | Bukti/screenshot/PR | Hasil penilaian |
|---|---|---|---|
| 0. Persiapan dan pemisahan berkas | Belum mulai | — | — |
| 1. Navigasi dan daftar | Belum mulai | — | — |
| 2. Editor dan pratinjau | Belum mulai | — | — |
| 3. Kontrol formulir | Belum mulai | — | — |
| 4. Bahasa dan petunjuk | Belum mulai | — | — |
| 5. Gaya dan aksesibilitas | Belum mulai | — | — |
| 6. Uji gabungan dan publikasi | Belum mulai | — | — |

Untuk setiap masalah, catat: halaman, ukuran layar, langkah mencoba, hasil yang diharapkan, hasil yang terlihat, dan screenshot. Satu masalah yang jelas lebih mudah diperbaiki daripada catatan umum seperti "CMS berantakan".
