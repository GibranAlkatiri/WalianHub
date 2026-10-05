# Panduan Staf — Panel Konten Kelurahan Walian

Panduan ini untuk **pengelola konten** (staf kelurahan). Tidak perlu coding. Semua dilakukan lewat browser.

## 1. Masuk ke panel

1. Buka: **https://walianhub.pages.dev/admin/**
2. Isi **username** dan **password** yang diberikan penanggung jawab teknis, klik **Masuk**
3. Panel terbuka langsung — tidak ada tombol GitHub apa pun

> Username dan password hanya satu untuk semua pengelola. Jangan disebar ke luar kelurahan. Jika tidak bisa login, hubungi penanggung jawab teknis.

## 2. Menu utama

Setelah login, panel menampilkan beberapa menu:

| Menu | Isi |
|---|---|
| **Pengaturan** | Identitas Situs, Beranda, Profil, Pengumuman |
| **Layanan** | Daftar surat/layanan kelurahan |
| **Destinasi Wisata** | Tempat wisata di Kelurahan Walian |

## 3. Mengedit pengaturan

### Identitas Situs
- Nama kelurahan, alamat, kontak
- Jam layanan (per hari, format HH.MM contoh `08.00`)
- Hari tutup: kosongkan jam buka dan tutup
- Jam istirahat: klik untuk buka, isi mulai dan selesai
- Tanggal libur: tambah tanggal + keterangan
- Media sosial, tautan penting

### Beranda
- Judul dan subjudul hero
- Foto latar (maksimal 5). Urutan di panel = urutan tampil
- Setiap foto perlu keterangan (untuk pembaca layar)

### Profil
- Ringkasan kelurahan
- Nama dan foto Lurah
- Struktur organisasi — setiap jabatan perlu atasan (`Lurah` atau jabatan lain dari daftar)
- Data lingkungan — angka boleh dikosongkan jika belum diketahui
- Visi, misi, program unggulan

### Pengumuman
- Klik **Tambah** untuk pengumuman baru
- Isi: judul, tanggal, isi, centang "Penting" jika perlu
- Pengumuman terbaru ditaruh di atas
- Hapus pengumuman yang sudah tidak relevan

## 4. Mengelola layanan

### Menambah layanan baru
1. Klik menu **Layanan** → **Layanan Baru**
2. Isi:
   - **Judul**: nama layanan (contoh: "Surat Keterangan Domisili")
   - **Ringkasan**: deskripsi singkat, maksimal 120 karakter
   - **Ikon**: pilih ikon yang sesuai dari daftar
   - **Tampil di Beranda**: centang jika ingin tampil di halaman utama (maks 4)
   - **Urutan**: angka kecil = tampil lebih awal
   - **Persyaratan**: klik Tambah untuk setiap syarat
   - **Alur Pelayanan**: klik Tambah untuk setiap langkah
   - **Diperbarui**: tanggal terakhir update
   - **Catatan tambahan**: teks bebas (opsional)
3. Klik **Save** / **Simpan**

### Mengedit layanan
1. Klik layanan dari daftar
2. Ubah field yang diperlukan
3. Simpan

### Menghapus layanan
1. Buka layanan
2. Klik **Delete** / **Hapus**
3. Konfirmasi

> **Penting**: Mengganti judul layanan tidak mengubah alamat URL lama. Link yang sudah dibagikan tetap bekerja.

## 5. Mengelola destinasi wisata

Sama seperti layanan:
1. **Destinasi Baru** → isi nama, kategori, ringkasan (maks 160 karakter), gambar, lokasi (alamat + koordinat)
2. Koordinat bisa didapat dari Google Maps:
   - Buka Google Maps → klik kanan lokasi → **Koordinat** akan muncul
   - Angka pertama = Latitude, angka kedua = Longitude
3. **Tampil di Beranda**: centang untuk destinasi unggulan
4. Simpan

## 6. Mengunggah foto

- Klik field gambar → **Choose an image** / pilih gambar
- Format: JPEG, PNG, atau WebP
- Ukuran maksimal: 5 MB per file
- Foto akan disimpan di folder `uploads`
- Jika tidak ada foto, website menampilkan gambar default

> Jangan hapus foto yang masih dipakai di konten lain. Jika ragu, tanyakan ke penanggung jawab teknis.

## 7. Alur simpan dan terbit

Panel CMS menggunakan sistem **draf → terbit**:

### Menyimpan draf
1. Setelah mengisi/mengubah konten, klik **Save** / **Simpan**
2. Status berubah menjadi **Draft**
3. Konten belum tampil di website publik
4. Draf tersimpan sebagai Pull Request di GitHub

### Menerbitkan
1. Ubah status dari **Draft** ke **In Review** (opsional) → **Ready**
2. Klik **Publish** / **Terbitkan**
3. Sistem menjalankan pemeriksaan otomatis (tes + build)
4. Jika lolos, konten masuk ke website

### Memeriksa hasil
- Setelah terbit, tunggu 1–3 menit
- Buka website: **https://walianhub.pages.dev/**
- Pastikan perubahan sudah tampil
- Jika belum tampil setelah 5 menit, cek tab **Actions** di GitHub repository

## 8. Jika terjadi masalah

### Pemeriksaan gagal (konten tidak bisa diterbitkan)
- Periksa pesan error di panel atau di tab Actions GitHub
- Kemungkinan penyebab:
  - Field wajib kosong
  - Format jam tidak sesuai (harus HH.MM)
  - Ringkasan terlalu panjang
  - Atasan di struktur organisasi tidak valid
- Perbaiki field yang bermasalah, simpan ulang

### Website tidak berubah setelah terbit
1. Buka: `https://github.com/GibranAlkatiri/WalianHub/actions` (CI checks)
2. Lihat status workflow terakhir
3. Jika ada tanda ❌, deploy gagal — hubungi penanggung jawab teknis
4. Jika ada tanda ✓ tapi website belum berubah — tunggu beberapa menit (cache)

### Tidak bisa login
- Pastikan username dan password diketik dengan benar (perhatikan huruf besar/kecil)
- Muat ulang halaman lalu coba lagi
- Bersihkan cache browser
- Hubungi penanggung jawab teknis (mungkin password diganti)

### Dua orang edit hal yang sama
- Simpan pekerjaan secepatnya
- Jika muncul pesan konflik, hubungi penanggung jawab teknis
- **Tips**: koordinasikan siapa yang sedang mengedit pengaturan

## 9. Skenario demo

Latihan untuk memastikan panel berfungsi:

1. ✏️ Login ke panel
2. ✏️ Buka satu layanan → ganti judul dan satu syarat → simpan
3. ✏️ Tambah satu pengumuman baru → simpan
4. ✏️ Buka Profil → ganti nama satu pejabat → simpan
5. ✏️ Isi data satu lingkungan (jumlah KK/penduduk) → simpan
6. ✏️ Buka satu destinasi → unggah foto baru → periksa koordinat Maps → simpan
7. ✏️ Terbitkan semua draf
8. ✏️ Buka website dan pastikan perubahan tampil
9. ✏️ Coba isi field dengan data tidak valid (jam salah, ringkasan >120 karakter) — pastikan panel menolak

## 10. Kontak

| Peran | Tanggung jawab |
|---|---|
| **Pengelola konten** | Membuat, mengubah, menerbitkan konten |
| **Penanggung jawab teknis** | Setup, troubleshoot, update CMS, kelola akses |

Jika ada pertanyaan atau masalah yang tidak bisa diselesaikan lewat panduan ini, hubungi penanggung jawab teknis.
