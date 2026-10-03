# WalianHub — Website Resmi Kelurahan Walian

Website informasi Kelurahan Walian, Kecamatan Tomohon Selatan, Kota Tomohon, Sulawesi Utara.
Dikembangkan oleh KKT Angkatan 149 Universitas Sam Ratulangi.

## Lihat website

### **https://gibranalkatiri.github.io/WalianHub/**

Ini adalah **versi pratinjau**. Teks yang ditulis di dalam [kurung siku] masih contoh dan akan diganti dengan data resmi dari kelurahan.
Website di link ini diperbarui otomatis setiap ada perubahan di branch `main`.

## Status

- **Beranda dan halaman Profil:** selesai.
- **Berikutnya:** halaman Layanan, lalu halaman Wisata.

## Isi website

Semua isi website ada di folder `src/content/`. Untuk mengganti isi, tampilan tidak perlu diubah.

| Isi | File |
|---|---|
| Nama, alamat, kontak, jam layanan, tautan penting | `src/content/pengaturan/situs.json` |
| Teks dan foto hero | `src/content/pengaturan/beranda.json` |
| Profil: ringkasan, Lurah, struktur organisasi, wilayah dan lingkungan, visi dan misi | `src/content/pengaturan/profil.json` |
| Layanan (satu file per layanan) | `src/content/layanan/*.md` |
| Destinasi wisata (satu file per destinasi) | `src/content/destinasi/*.md` |

**Aturan penulisan data:**

- Tanggal ditulis `YYYY-MM-DD`, contoh `2026-10-01`.
- Nomor WhatsApp ditulis dengan kode negara, tanpa `+` dan tanpa spasi, contoh `6281234567890`.
- Field gambar boleh dikosongkan. Jika kosong, atau fotonya gagal dimuat, otomatis tampil gambar default dengan label "Foto belum tersedia".
- Teks yang belum ada ditulis di dalam [kurung siku]. Angka yang belum ada diisi `null` (tampil sebagai "Data menyusul").
- Nama file layanan dan destinasi menjadi alamat halaman (slug). Tulis dengan huruf kecil dan tanda hubung, dan jangan diubah setelah terbit.

Setiap isi diperiksa oleh `src/content.config.ts` setiap kali website dibangun. Jika ada data yang tidak sesuai, proses build gagal dengan pesan yang jelas, dan website yang sedang tayang tidak berubah.

## Untuk pembuat CMS

`src/content.config.ts` adalah **kontrak data** antara tampilan dan CMS. CMS cukup mengisi atau mengubah file di `src/content/` dengan nama dan jenis field yang sama persis, dan tampilan tidak perlu diubah.

- **Git-based CMS (disarankan):** CMS mengedit file di `src/content/` langsung di GitHub. Setiap perubahan membangun ulang website secara otomatis. Gratis dan tanpa server.
- **CMS dengan API:** cukup ganti bagian `loader` di `src/content.config.ts` agar mengambil data dari API dengan bentuk data yang sama.

## Gambar dan ikon

- Tidak memakai foto dari internet. Semua tempat yang membutuhkan gambar memakai gambar default (`public/images/default.svg`) sampai foto resmi dipasang.
- Ikon ada di `src/icons/` (Lucide dan Simple Icons, berlisensi terbuka). Untuk menambah ikon, unduh file SVG dari https://lucide.dev dan simpan di folder itu.

## Struktur folder

```
src/
├── components/        Potongan tampilan: layout (header, footer), ui (tombol, card), home (section Beranda), profil (section Profil)
├── content/           Isi website
├── content.config.ts  Kontrak bentuk data
├── icons/             Ikon SVG
├── layouts/           Kerangka HTML setiap halaman
├── lib/               Fungsi bantu dan saklar pengaturan
├── pages/             Halaman website
└── styles/global.css  Warna, font, dan gaya dasar
public/                Gambar default dan favicon
```

## Teknologi

Dibangun dengan [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com), dan [Bun](https://bun.sh). Hasilnya berupa website statis (file HTML, CSS, dan gambar), sehingga bisa dipasang di hosting mana saja. Proses build dan pemasangan ke GitHub Pages dijalankan oleh GitHub Actions (`.github/workflows/deploy.yml`).
