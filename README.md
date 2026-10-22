# WalianHub — Website Resmi Kelurahan Walian

Website informasi Kelurahan Walian, Kecamatan Tomohon Selatan, Kota Tomohon, Sulawesi Utara.
Dikembangkan oleh KKT Angkatan 149 Universitas Sam Ratulangi.

## Lihat website

### **https://walian-hub.pages.dev/**

Project Cloudflare Pages aktif adalah `walian-hub`, terhubung ke repository `GibranAlkatiri/WalianHub`, branch produksi `main`. Konfigurasi ini diperiksa pada 19 Oktober 2026. Domain `walianhub.pages.dev` dan `walianhub-8ib.pages.dev` adalah alamat historis.

Website masih memiliki data yang perlu dilengkapi dan `SIAP_DIINDEKS` masih `false`. Pengelola mengubah layanan, destinasi, pengumuman, dan pengaturan melalui `/admin/`. Konten produksi disimpan di D1, sehingga `git pull` memperbarui kode dan data awal repository, bukan salinan konten CMS yang sedang tayang.

## Status

- **Beranda, Profil, Layanan, dan Wisata:** tersedia.
- **Navigasi Wisata otomatis:** sampai 4 destinasi menuju section Beranda; mulai 5 menuju `/wisata`, dengan 4 pilihan di Beranda dan tombol "Semua Wisata".
- `/wisata` selalu dapat dibuka, termasuk ketika jumlah destinasi turun atau kosong, agar tautan lama tetap berlaku.
- **CMS dan animasi:** panel konten tersedia di `/admin/` untuk pengelolaan layanan, destinasi, pengumuman, dan profil kelurahan.
- **Ringkasan wilayah:** hero menyediakan akses Layanan dan Kontak. Ringkasan KK, penduduk, jumlah lingkungan, dan luas berada dalam bagian Wilayah dan penduduk pada Profil. KK, penduduk, dan luas dijumlahkan otomatis dari kolom per lingkungan yang sudah diisi; angka kosong disembunyikan, angka 0 yang diisi tetap dicatat. Keterangan cakupan membedakan jumlah parsial dari data seluruh lingkungan. Isian total penduduk manual serta formulir dan tampilan agama sudah dihapus; data lama tetap dapat dibaca dan kolom yang dihentikan diabaikan saat menyimpan Beranda.
- **Video Profil:** video YouTube mendampingi pengantar Profil di kanan pada desktop dan di bawah pada ponsel. Tanpa tautan video yang didukung, blok video tidak ditampilkan.

## Isi website

Folder `src/content/` menyimpan data awal dan kontrak isian untuk build lokal. Pada produksi dengan mode D1 aktif, versi terbit dari database menggantikan data awal tersebut saat halaman diminta. Tabel berikut menunjukkan sumber data awal; pengelola mengubah konten yang tayang melalui panel CMS.

| Isi | File |
|---|---|
| Nama, alamat, kontak, jam layanan, tautan penting | `src/content/pengaturan/situs.json` |
| Teks dan foto hero | `src/content/pengaturan/beranda.json` |
| Profil: ringkasan, Lurah, video, struktur organisasi, wilayah dan lingkungan, visi dan misi | `src/content/pengaturan/profil.json` |
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

**Urutan dan pilihan Beranda:** layanan menampilkan item yang ditandai `unggulan`, menurut `urutan`. Wisata sampai 4 menampilkan semuanya, termasuk yang tidak unggulan. Mulai 5, empat kartu mengutamakan `unggulan`, lalu dilengkapi dari destinasi lain menurut `urutan`. Halaman Wisata selalu menampilkan semua destinasi menurut `urutan` lalu nama. Koleksi kosong tetap memiliki pesan yang jelas.

Data awal diperiksa oleh `src/content.config.ts` saat build. API CMS memvalidasi draf dan memeriksa kontrak lengkap sebelum publikasi D1; draf belum lengkap tetap privat. Pembacaan D1 yang gagal menghasilkan pesan gangguan, bukan memulihkan data awal yang sudah usang.

## Untuk pembuat CMS

`src/content.config.ts` adalah **kontrak data** antara tampilan dan CMS. Formulir CMS mengikuti nama field, tipe, daftar pilihan, aturan wajib/kosong, dan validasi tersebut. Isian konten terpisah dari tampilan; label formulir boleh memakai Bahasa Indonesia. Teks antarmuka seperti "Cek Lokasi", tata letak, dan aturan navigasi tetap dikelola frontend.

- **Panel:** CMS khusus WalianHub di `public/admin/`, dengan formulir dari `config.yml`. Decap bukan editor yang sedang dimuat; beberapa berkas pratinjau lama masih tersimpan untuk kompatibilitas.
- **Login:** `/api/auth` memakai username dan hash password server, lalu cookie sesi HttpOnly selama delapan jam. Pada mode sesi, token GitHub tidak dikirim ke browser.
- **Konten:** `/api/cms` mengelola Layanan, Destinasi, Pengumuman, serta Pengaturan di D1. Revisi dan versi terbit dipisahkan; pemeriksaan revisi mencegah editor menimpa perubahan pengguna lain.
- **Foto:** `/api/media` mengunggah JPEG, PNG, atau WebP maksimal 5 MB ke Cloudinary dengan akses authenticated. Konten menyimpan path `/media/<id>.<format>`, dan `/media/` melayani foto sesuai status draf/terbit. ID konten tetap setelah unggah foto meskipun judul diganti.
- **Kompatibilitas:** backend GitHub masih tersedia ketika saklar D1 dimatikan. Mode ini memakai draf branch/PR dan pemeriksaan CI; publikasi D1 tidak membuat commit GitHub.

Pengubahan nama surat menggunakan field `judul` tanpa mengganti ID konten, sehingga tautan tetap berlaku. ID baru maksimal 100 karakter; nama ganda diberi akhiran angka dalam batas yang sama. Path `/uploads/` tetap didukung untuk media lama. `SIAP_DIINDEKS` tetap `false` selama data belum disetujui untuk diindeks.

### Video Profil

Buka Pengaturan → Profil → Video, pilih Berkas Video, lalu Simpan draf dan Terbitkan ketika sudah benar. CMS menerima unggahan MP4 H.264/AAC maksimal 40 MB, 1080p, dan 5 menit. Berkas sebaiknya dikompresi menjadi 720p terlebih dahulu; CMS tidak menjalankan kompresi video di browser. Unggahan masuk ke Cloudinary melalui server dan tetap `authenticated`. Nama field `videoProfil.url` dipertahankan untuk kompatibilitas, tetapi staf tidak perlu menempelkan tautan. Link lama tetap dibaca sampai diganti melalui unggahan.

Halaman menampilkan sampul lokal dan tombol putar; berkas video baru dimuat setelah tombol ditekan, tanpa SDK tambahan atau autoplay saat halaman dibuka. Video unggahan memakai kontrol browser tanpa merek YouTube. Server melayani `/videos/<uuid>.mp4` dengan pemeriksaan sesi/status terbit, dukungan byte range untuk seek, dan `Cache-Control: no-store`; URL bertanda tangan Cloudinary dan rahasia tetap di server. Sebelum diterbitkan hanya pengelola yang sudah login dapat memutar video. Penggantian draf mempertahankan video yang sudah tayang; menghapus isian dan menerbitkannya menutup akses publik ke video lama. Link Google Drive digunakan sebagai arsip sumber, bukan pemutar.

Aktivasi memerlukan migrasi `migrations/0005_video.sql` pada database Production dan Preview yang sudah memiliki migrasi 0001–0004, serta `CMS_VIDEO_CLOUDINARY=1`. Sesi server, `CMS_MEDIA_CLOUDINARY=1`, `CMS_PENGATURAN_D1=1`, binding `CMS_DB` dan kredensial Cloudinary yang ada tetap diperlukan. Cadangkan kedua database sebelum menerapkan migrasi. Tabel `cms_videos` ditambahkan tanpa mengubah tabel foto. Pastikan izin serta kuota video akun Cloudinary sesuai melalui pengujian Preview sebelum aktivasi Production. Jangan mematikan flag video setelah video diterbitkan tanpa mengganti sumbernya karena akses video akan ikut tertutup.

Endpoint `/api/video` memeriksa sesi dan origin, memvalidasi MP4/ukuran/checksum sambil mengalirkan unggahan, lalu memeriksa codec, durasi dan dimensi hasil decode Cloudinary sebelum menandainya siap. Native `crypto.DigestStream` Cloudflare digunakan agar Worker tidak menampung seluruh MP4 di memori. Respons yang hilang dapat dicoba lagi dengan ID dan checksum sama tanpa menimpa objek lain. Prefix penyimpanan `walianhub-video/` terpisah dari foto. Video lama/yatim dipertahankan privat dan belum dihapus otomatis; scheduler pembersihan foto tidak mengelola video. Catatan ini perlu diperhatikan saat memantau kuota Cloudinary.

Cloudflare Stream dapat menjadi pilihan untuk video dengan beberapa tingkat kualitas, tetapi memerlukan aktivasi serta biaya penyimpanan/pemutaran. URL Stream belum didukung oleh pemutar ini. Jangan menempelkan tautan privat atau bertoken ke field publik CMS. Perubahan kode ini tidak memindahkan file atau mengubah video produksi secara otomatis.

Cloudflare R2 juga dapat menyimpan MP4 yang sudah dikompresi, tetapi memerlukan bucket, domain media produksi, dan izin CSP khusus untuk domain tersebut; alamat pengembangan `r2.dev` tidak dipilih untuk produksi. Dukungan URL R2 belum diaktifkan. Database konten tetap D1. Rujukan: [unggah Cloudinary](https://cloudinary.com/documentation/upload_parameters), [Web Crypto Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#digeststream), [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), dan [biaya Stream](https://developers.cloudflare.com/stream/pricing/).

Uji sumber pada 23 Oktober 2026: berkas 1080p H.264/AAC, 30 fps, 181,186 detik (240.106.595 byte) dikompresi lokal menjadi MP4 720p H.264/AAC, tetap 30 fps, 181,185 detik (31.766.534 byte; sekitar 87% lebih kecil), dengan metadata MP4 di depan (`faststart`). Salinan sumber dan hasil uji berada di luar repository. Hasil belum diunggah ke Cloudinary atau R2. Unggahan 31,8 MB diuji di CMS lokal dengan provider tiruan; streaming/checksum juga diperiksa pada runtime lokal Cloudflare dengan DigestStream native. Pengujian lokal tidak menjamin kuota akun atau kecepatan jaringan setiap pengunjung.

Pratinjau unggah lengkap memakai penyimpanan sementara/provider tiruan, tanpa kredensial Cloudinary asli: pada PowerShell, set `$env:CMS_PREVIEW_VIDEO='1'`, lalu jalankan `bun run preview:cms`. Jalankan `bun run build` terlebih dahulu agar halaman Profil tersedia. Akun demo tetap `walian` / `demo`. Data dan video uji hilang setelah server pratinjau dihentikan; jangan memakai mode ini di produksi.

## Konfigurasi operasional

Production dan Preview memakai database berbeda. Pada project `walian-hub`, mode sesi, empat koleksi D1, pembacaan publik D1, serta Cloudinary diperiksa aktif pada 19 Oktober 2026. Pengaturan server dikelola melalui Cloudflare; rahasia tidak ditulis ke repository atau keluaran perintah.

| Binding atau environment variable | Kegunaan |
|---|---|
| `CMS_DB` | Database konten, sesi, dan metadata media untuk lingkungan tersebut |
| `CMS_USERNAME`, `CMS_PASSWORD_HASH` | Username dan hash SHA-256 password pengelola |
| `CMS_SESSION_AUTH` | `1` untuk sesi server; perubahan kredensial membatalkan sesi lama |
| `CMS_LAYANAN_D1`, `CMS_DESTINASI_D1`, `CMS_PENGUMUMAN_D1`, `CMS_PENGATURAN_D1` | `1` untuk penyimpanan koleksi di D1 |
| `CMS_PUBLIC_LAYANAN_D1`, `CMS_PUBLIC_DESTINASI_D1`, `CMS_PUBLIC_PENGUMUMAN_D1`, `CMS_PUBLIC_PENGATURAN_D1` | `1` untuk membaca versi terbit D1 pada halaman publik |
| `CMS_MEDIA_CLOUDINARY` | `1` untuk penyimpanan foto Cloudinary |
| `CMS_VIDEO_CLOUDINARY` | `1` untuk unggah/pemutaran video Profil; memerlukan migrasi 0005 dan mode D1/sesi |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Identitas dan kredensial penyimpanan foto di server |
| `GITHUB_TOKEN` | Akses server untuk backend GitHub lama; tidak diperlukan untuk operasi koleksi D1 |
| `CMS_LOGIN_LIMIT_DISABLED` | Hanya nilai `1` yang mematikan sementara pembatasan percobaan login; kosongkan kembali setelah penanganan selesai |

Jangan menyalin kredensial Production ke contoh atau pengujian lokal. `bun run preview:cms` menyediakan panel uji lokal dengan data sementara; mode tersebut tidak membuktikan konfigurasi Cloudflare produksi.

### Pembersihan media

Worker terpisah di `workers/` menjadwalkan pembersihan foto yatim setelah masa tunggu tujuh hari. Foto yang masih dirujuk draf maupun versi terbit di kedua database dilindungi. Worker memeriksa metadata Preview sebelum mengirim perintah Production dan membatalkan proses jika pemeriksaan gagal.

Konfigurasi repository memakai endpoint berikut, berdasarkan project dan alias Preview yang diperiksa pada 19 Oktober 2026:

- Production: `https://walian-hub.pages.dev/api/media-cleanup`.
- Preview: `https://backend-pengaturan-kunci-asi.walian-hub.pages.dev/api/media-cleanup`. Ini alias yang dikembalikan Cloudflare, dengan nama branch yang dipotong; periksa kembali jika Preview diganti atau dihapus.

`workers/wrangler.media-cleanup.jsonc` mengatur kedua alamat tersebut. Sebelum deployment Worker, samakan `CMS_MEDIA_CLEANUP_PEER_URL` pada Pages Production dengan alamat Preview yang sama. Production juga memerlukan `CMS_MEDIA_CLEANUP_PEER_DB` yang menunjuk database Preview, `CMS_MEDIA_CLEANUP_SHARED_CLOUD_NAME` yang cocok dengan Cloudinary kedua lingkungan, dan token khusus `CMS_MEDIA_CLEANUP_TOKEN` yang sama pada Worker serta endpoint terkait. Token ini terpisah dari sesi login panel dan tidak dicatat dalam log.

Preview saat ini dilindungi Cloudflare Access; permintaan tanpa kredensial layanan mendapat pengalihan ke halaman login. Konfigurasikan pasangan secret `CMS_MEDIA_CLEANUP_PEER_ACCESS_CLIENT_ID` dan `CMS_MEDIA_CLEANUP_PEER_ACCESS_CLIENT_SECRET` pada Worker dan Pages Production untuk autentikasi service token yang diizinkan kebijakan Access Preview. Kode mengirim header Access hanya ke endpoint Preview, tetap memakai bearer token cleanup, dan menolak konfigurasi yang hanya mengisi salah satu secret. Jangan mematikan perlindungan Access untuk menjalankan scheduler. Tanpa pasangan secret ini, endpoint publik tetap didukung, tetapi Preview yang dilindungi akan menggagalkan pemeriksaan sebelum penghapusan.

Pada pemeriksaan 19 Oktober 2026, `CMS_MEDIA_CLEANUP_ENABLED` masih `0` di Production dan Preview, sedangkan alamat pada Worker yang sudah terpasang serta alamat peer Production masih menunjuk domain lama. Mengubah konfigurasi repository tidak memperbarui pengaturan layanan tersebut. Pertahankan keadaan nonaktif sampai pengelola menyetujui pembaruan Cloudflare, kedua database dan endpoint diverifikasi, serta dry-run berhasil. Endpoint hanya menerima POST dengan pilihan `dryRun` eksplisit; gunakan `dryRun: true` untuk pemeriksaan tanpa penghapusan.

### Cadangan dan pemulihan

Cadangkan database Production dan Preview secara terpisah melalui ekspor D1 atau fitur pemulihan D1 sebelum migrasi. Simpan ekspor di lokasi privat di luar repository; metadata media D1 perlu dijaga bersama objek Cloudinary. Pemulihan memerlukan database dan foto yang saling sesuai.

`scripts/cms-backup.js` adalah alat snapshot backend GitHub lama, bukan cadangan D1 atau Cloudinary produksi. Jangan menganggap hasil alat tersebut sebagai salinan lengkap website yang tayang. `wrangler.migration.jsonc` khusus pengujian lokal dan tidak menentukan binding produksi.

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

Dibangun dengan [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com), dan [Bun](https://bun.sh). Astro membangun aset statis; Cloudflare Pages Functions menyajikan konten D1, login, API, dan media. Hosting statis saja tidak menjalankan fungsi CMS tersebut. Push ke `main` pada `GibranAlkatiri/WalianHub` memicu deployment Production project `walian-hub`; branch lain mendapat Preview sesuai pengaturan Cloudflare. CI untuk PR menuju `main` berjalan via GitHub Actions (`.github/workflows/ci.yml`).

Jalankan `bun test` untuk pemeriksaan logika dan `bun run build` untuk validasi data awal serta hasil website. Perubahan kode membutuhkan build dan deployment. Perubahan konten yang diterbitkan melalui D1 tampil pada permintaan halaman berikutnya tanpa menunggu build GitHub.
