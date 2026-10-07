# WalianHub — Website Resmi Kelurahan Walian

Website informasi Kelurahan Walian, Kecamatan Tomohon Selatan, Kota Tomohon, Sulawesi Utara.
Dikembangkan oleh KKT Angkatan 149 Universitas Sam Ratulangi.

## Lihat website

### **https://walianhub.pages.dev/**

Ini adalah **versi pratinjau**. Teks di dalam [kurung siku] dan data destinasi masih contoh. Data contoh sengaja dipertahankan untuk demo: staf nantinya dapat mengoreksi nama/jenis surat, persyaratan, profil, kontak, dan destinasi melalui CMS. Validasi data resmi dilakukan bersama kelurahan saat demo. Kode CMS sudah tersedia; login dan publikasi pada lingkungan produksi masih perlu dibuktikan.
Cloudflare terhubung ke branch `main` pada `gleey/WalianHub`. Perubahan di repository kode bersama `GibranAlkatiri/WalianHub` perlu disinkronkan ke repo tersebut sebelum memperbarui situs.

## Status

- **Beranda, Profil, Layanan, dan Wisata:** tersedia.
- **Navigasi Wisata otomatis:** sampai 4 destinasi menuju section Beranda; mulai 5 menuju `/wisata`, dengan 4 pilihan di Beranda dan tombol "Semua Wisata".
- `/wisata` selalu dapat dibuka, termasuk ketika jumlah destinasi turun atau kosong, agar tautan lama tetap berlaku.
- **CMS dan animasi:** kode telah digabung ke `main` melalui PR #4. Berikutnya: pemeriksaan fungsi backend dan [perbaikan UI CMS](TAHAPAN-UI-CMS.md). Bahasa Inggris dan halaman detail destinasi tetap ditunda.

## Kerja tim dan asisten AI

Baca [AGENTS.md — pembagian frontend/backend](AGENTS.md) sebelum mengubah berkas. Dokumen ini menentukan area tiap peran, cara mengambil kode dari repo bersama/fork, dan langkah ketika pekerjaan menyentuh area rekan.

Untuk tampilan panel, ikuti [TAHAPAN-UI-CMS.md — rencana perbaikan untuk pengguna awam](TAHAPAN-UI-CMS.md). Untuk login, koneksi GitHub, dan hosting, gunakan [CMS-SETUP.md](CMS-SETUP.md).

## Isi website

Semua isi website ada di folder `src/content/`. Untuk mengganti isi, tampilan tidak perlu diubah.

| Isi | File |
|---|---|
| Nama, alamat, kontak, jam layanan, tautan penting | `src/content/pengaturan/situs.json` |
| Teks dan foto hero | `src/content/pengaturan/beranda.json` |
| Profil: ringkasan, Lurah, struktur organisasi, wilayah dan lingkungan, visi dan misi | `src/content/pengaturan/profil.json` |
| Layanan (satu file per layanan) | `src/content/layanan/*.md` |
| Pengumuman untuk warga (tampil di halaman Layanan) | `src/content/pengaturan/pengumuman.json` |
| Destinasi wisata (satu file per destinasi) | `src/content/destinasi/*.md` |

**Aturan penulisan data:**

- Tanggal ditulis `YYYY-MM-DD`, contoh `2026-10-01`.
- Nomor WhatsApp ditulis dengan kode negara, tanpa `+` dan tanpa spasi, contoh `6281234567890`. WhatsApp dan email boleh dikosongkan (`""`) atau tidak dicantumkan; tombol/tautannya tidak tampil.
- Field gambar boleh dikosongkan. Jika kosong, atau fotonya gagal dimuat, otomatis tampil gambar default dengan label "Foto belum tersedia".
- Teks yang belum ada ditulis di dalam [kurung siku]. Angka yang belum ada diisi `null` (tampil sebagai "Data menyusul").
- Nama file layanan menjadi identitas tautan/anchor, misalnya `surat-keterangan-domisili.md` → `/layanan#surat-keterangan-domisili`. Judul atau jenis surat boleh diganti tanpa mengganti nama file, sehingga tautan lama tetap bekerja. Destinasi memakai identitas file, tanpa halaman detail tersendiri.
- Isian teks wajib tidak boleh kosong atau hanya berisi spasi; teks contoh tetap valid. Persyaratan dan alur boleh berupa daftar kosong (`[]`), lalu tampil pesan "sedang disiapkan".
- Tanggal harus benar secara kalender. Jam tutup harus setelah jam buka; istirahat harus berurutan dan berada di dalam jam layanan. Hari tutup memakai `buka: null`, `tutup: null`, `istirahat: null`.
- Koordinat harus berada di rentang geografis; jumlah penduduk dan KK berupa bilangan bulat nonnegatif atau `null`. Tautan terisi memakai alamat HTTP/HTTPS lengkap; email terisi harus valid.
- Pilih ikon dari nama file di `src/icons/` tanpa `.svg`. Ikon yang tidak tersedia ditolak saat build.

**Urutan dan pilihan Beranda:** layanan menampilkan maksimal 4 item yang ditandai `unggulan`, menurut `urutan`. Wisata sampai 4 menampilkan semuanya, termasuk yang tidak unggulan. Mulai 5, empat kartu mengutamakan `unggulan`, lalu dilengkapi dari destinasi lain menurut `urutan`. Halaman Wisata selalu menampilkan semua destinasi menurut `urutan` lalu nama. Koleksi kosong tetap memiliki pesan yang jelas.

Setiap isi diperiksa oleh `src/content.config.ts` setiap kali website dibangun. Jika ada data yang tidak sesuai, proses build gagal dengan pesan yang jelas, dan website yang sedang tayang tidak berubah.

## Untuk pembuat CMS

Mulai dari [aturan pembagian kerja](AGENTS.md) dan [CMS-SETUP.md — konfigurasi CMS yang digunakan](CMS-SETUP.md). [CMS.md](CMS.md) menyimpan rencana awal serta rincian kontrak field; keterangan hosting dan status implementasi historisnya tidak menjadi acuan operasional terbaru.

`src/content.config.ts` adalah **kontrak data** antara tampilan dan CMS. Formulir CMS mengikuti nama field, tipe, daftar pilihan, aturan wajib/kosong, dan validasi tersebut. Isian konten terpisah dari tampilan; label formulir boleh memakai Bahasa Indonesia. Teks antarmuka seperti "Cek Lokasi", tata letak, dan aturan navigasi tetap dikelola frontend.

- **CMS yang digunakan:** Decap CMS berbasis Git. Panel ada di `public/admin/`, login melalui Cloudflare Pages Function `functions/api/auth.js`, dan konfigurasi formulir mengikuti kontrak konten. UI serta login/penyimpanan/publikasi produksi masih perlu diperiksa sesuai pembagian kerja.

Pengubahan nama surat menggunakan field `judul`; CMS sebaiknya mempertahankan identitas file setelah dibuat. Upload foto memakai path dari akar situs, misalnya `/uploads/destinasi/foto.webp`. Frontend menambahkan base path saat merender. `SIAP_DIINDEKS` tetap `false` selama versi demo.

## Gambar dan ikon

- Hero sudah memakai foto kantor. Foto lain yang kosong atau gagal dimuat memakai gambar default (`public/images/default.svg`) dan label "Foto belum tersedia".
- Ikon ada di `src/icons/` (Lucide dan Simple Icons, berlisensi terbuka). Untuk menambah ikon, unduh file SVG dari https://lucide.dev dan simpan di folder itu.

## Struktur folder

```
src/
├── components/        Potongan tampilan: layout (header, footer), ui (tombol, card), home (section Beranda), profil (section Profil), layanan (halaman Layanan)
├── content/           Isi website
├── content.config.ts  Kontrak bentuk data
├── icons/             Ikon SVG
├── layouts/           Kerangka HTML setiap halaman
├── lib/               Fungsi bantu dan saklar pengaturan
├── pages/             Halaman website
└── styles/global.css  Warna, font, dan gaya dasar
public/                Gambar default dan favicon
tests/                 Pengujian aturan Wisata dan validasi konten
```

## Teknologi

Dibangun dengan [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com), dan [Bun](https://bun.sh). Hasilnya berupa website statis (file HTML, CSS, dan gambar), sehingga bisa dipasang di hosting mana saja; login CMS menggunakan Cloudflare Pages Functions. Deploy Cloudflare mengikuti push ke `main` repo `gleey/WalianHub`. CI untuk PR menuju `main` berjalan via GitHub Actions (`.github/workflows/ci.yml`).

Jalankan `bun test` untuk pemeriksaan logika dan `bun run build` untuk validasi seluruh konten serta hasil website. Perubahan konten baru tampil setelah build dan deploy selesai.
