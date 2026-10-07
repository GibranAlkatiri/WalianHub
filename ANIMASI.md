# Rencana penyempurnaan animasi WalianHub

Tanggal: 6 Oktober 2026.

Dokumen ini menjadi acuan untuk mencoba animasi satu per satu. Setiap kategori diselesaikan melalui percobaan, penilaian pengguna, dan penyesuaian sampai terasa cocok. Tahap berikutnya dimulai setelah pengguna menyatakan tahap aktif sudah cocok.

Status saat dokumen dibuat: **perencanaan selesai; implementasi tahap 1 belum dimulai**. Pembuatan dokumen ini tidak mengubah kode animasi. Animasi lokal yang sudah ada menjadi kondisi awal percobaan, bukan hasil yang sudah disetujui.

Status terkini (7 Oktober 2026): **seluruh implementasi tahap 1–7 selesai; commit/push ke branch terpisah diizinkan; penilaian visual bersama masih menunggu pengguna**. Pengguna meminta foto berganti setiap 2 detik dan mengizinkan tahap tersisa dikerjakan sekaligus. Foto kini memakai interval 2000 ms, fade 600 ms, serta zoom linear 2600 ms. Buka–tutup panel dan respons interaksi sudah diterapkan dan diuji. [CEK-ANIMASI.md](CEK-ANIMASI.md) berisi checklist tiap animasi, pratinjau gabungan CMS terbaru, temuan repo tujuan CMS, dan langkah pemeriksaan bersama setelah publikasi branch.

## 1. Cara menjalankan setiap tahap

1. Pilih satu contoh elemen dari kategori yang sedang dikerjakan.
2. Tentukan satu gerakan untuk dicoba. Bentuk gerakan, durasi, dan jeda belum ditetapkan dalam dokumen ini.
3. Implementasikan pada contoh tersebut dan sediakan pratinjau untuk dilihat pengguna.
4. Pengguna mencoba dan memberi masukan: misalnya terlalu lambat, terlalu cepat, terlalu samar, terlalu banyak bergerak, atau sudah cocok.
5. Ubah bagian yang diperlukan, catat hasilnya, lalu ulangi percobaan pada contoh yang sama.
6. Setelah contoh cocok, terapkan pola yang sama pada elemen sejenis dalam kategori tersebut. Periksa penerapannya satu per satu.
7. Selesaikan pemeriksaan fungsi dan tampilan, lalu tunggu penilaian pengguna untuk kategori secara keseluruhan.
8. Catat keputusan akhir dan pindah tahap hanya setelah pengguna menyatakan sudah cocok.

**Percobaan selesai atau build berhasil tidak berarti animasi sudah disetujui.** Jika belum ada penilaian pengguna, status tetap “Menunggu penilaian”. Jika pengguna masih belum puas, tahap tetap aktif.

Saat satu kategori diuji, kategori lain dipertahankan agar penilaian mudah dilakukan. Jika perubahan pada sistem bersama diperlukan, batasi dampaknya pada kategori aktif dan periksa kategori yang sebelumnya sudah disetujui.

## 2. Kategori dan urutan tahap

| Tahap | Kategori | Pemicu | Status |
|---|---|---|---|
| 1 | Teks pembuka halaman | Halaman dibuka | Cocok |
| 2 | Judul section | Masuk layar ketika scroll | Cocok |
| 3 | Isi section | Masuk layar ketika scroll | Cocok |
| 4 | Kartu dan daftar berulang | Masuk layar, dengan urutan antaritem | Cocok; pengguna meminta lanjut tahap 5 |
| 5 | Foto dan slideshow | Pergantian otomatis atau kontrol pengguna | Seluruh implementasi selesai; menunggu penilaian hasil |
| 6 | Buka–tutup panel | Klik atau keyboard | Implementasi selesai; menunggu penilaian hasil |
| 7 | Respons interaksi dan scroll | Hover, tekan, atau perubahan posisi scroll | Implementasi selesai; menunggu penilaian hasil |

Pilihan status: **Belum dimulai → Sedang dicoba → Menunggu penilaian → Perlu revisi / Cocok**. Status “Perlu revisi” kembali ke “Sedang dicoba” saat percobaan berikutnya dibuat.

Kategori mengelompokkan fungsi, bukan memaksa semua elemen memiliki gerakan identik. Teks pembuka halaman mempunyai pola tersendiri; judul section saat scroll mempunyai pola lain. Kartu boleh memakai urutan muncul, sedangkan paragraf atau foto dapat muncul sebagai satu blok.

## 3. Kondisi awal yang perlu diingat

- Judul dan subjudul Beranda sudah memakai animasi pembuka khusus.
- Judul Layanan, Profil, dan Wisata memakai sistem animasi scroll. Sistem itu langsung menampilkan elemen yang sudah terlihat saat halaman dibuka, sehingga judul tersebut biasanya tidak mendapat animasi pembuka.
- Animasi scroll sekarang banyak memakai fade yang sama; sebagian kartu mendapat sedikit pembesaran dan item dalam grup mendapat jeda berurutan.
- Foto hero, menu mobile, panel layanan, program unggulan, hover kartu, navbar, dan tombol kembali ke atas mempunyai perilaku tersendiri.
- Ada perubahan lokal animasi yang belum di-commit. Pertahankan sebagai titik awal; jangan menghapusnya secara menyeluruh untuk memulai percobaan.
- Dokumen ini dibuat pada checkout lokal sebelum update CMS di GitHub di-pull. Pull, commit, push, dan deployment tidak menjadi bagian otomatis dari percobaan animasi.

## 4. Tahap 1 — Teks pembuka halaman

**Tujuan:** judul dan subjudul mempunyai pola pembuka yang konsisten pada Beranda, Layanan, Profil, dan Wisata.

**Contoh pertama:** judul dan subjudul Beranda. Foto latar dan pergantian slideshow tetap di luar percobaan ini.

Setelah contoh cocok, urutan penerapan: **Layanan → Profil → Wisata**. Tombol, badge, status kantor, dan navbar tidak otomatis ikut dianimasikan pada tahap ini.

Pola yang dipilih pada contoh Beranda: efek mengetik, judul terlebih dahulu lalu subjudul, menggunakan perbaikan visibility dan fill backwards. Pengguna kemudian meminta penerapan serentak pada halaman lain agar serasi. Ketiganya menggunakan komponen dan parameter yang sama. Setelah penerapan selesai, pengguna menyatakan "keren" dan meminta masuk tahap 2; kategori ini diterima untuk melanjutkan.

| Halaman | Status penerapan pola terpilih |
|---|---|
| Beranda | Cocok; pengguna menyatakan "oke ini pas" |
| Layanan | Sudah diterapkan dan diuji; pengguna melanjutkan ke tahap 2 |
| Profil | Sudah diterapkan dan diuji; pengguna melanjutkan ke tahap 2 |
| Wisata | Sudah diterapkan dan diuji; pengguna melanjutkan ke tahap 2 |

Checklist:

- [x] Contoh Beranda sudah dicoba dan pengguna menyatakan cocok.
- [x] Pola yang sama sudah dicoba pada Layanan, Profil, dan Wisata.
- [x] Judul panjang atau beberapa baris tetap terbaca pada layar ponsel.
- [ ] Membuka halaman langsung, memuat ulang, dan berpindah melalui menu memberikan hasil yang sesuai.
- [x] Teks tidak berkedip, melompat, atau berubah posisi tata letaknya.
- [x] Teks pembuka tidak menerima animasi kedua dari sistem scroll.
- [x] Pengguna menyatakan kategori teks pembuka halaman sudah cocok.

## 5. Tahap 2 — Judul section saat scroll

**Tujuan:** judul section dikenali dengan gerakan yang konsisten dan berbeda dari pembuka halaman.

**Contoh pertama:** judul section Profil di Beranda. Setelah cocok, terapkan pada judul section lain yang memakai [SectionHeading.astro](src/components/ui/SectionHeading.astro), lalu periksa pada halaman terkait.

Putuskan apakah judul dan deskripsi section menjadi satu blok atau muncul berurutan. Tentukan juga kapan animasi dimulai saat section masuk layar dan apakah perlu diulang ketika kembali ke section tersebut.

**Percobaan 1, tidak dipilih:** label "Profil" dan judul "Mengenal Kelurahan Walian" muncul sebagai satu blok, naik 28 px dengan fade selama 850 ms. Pengguna menilai efek ini masih terlalu mirip dengan animasi sebelumnya dan meminta variasi seperti pop atau masuk dari kiri.

**Percobaan 2, revisi 1, aktif:** blok label dan judul masuk dari kiri, bergerak dari `translateX(-32px) scale(0.94)` ke `translateX(4px) scale(1.02)` pada offset 0,72, kemudian menetap tanpa transform. Opacity awal 0,2 lalu menjadi 1. Durasi dipercepat dari 800 ms menjadi 500 ms setelah masukan pengguna. Tanpa jeda tambahan, easing `cubic-bezier(0.22, 1, 0.36, 1)`, dengan titik pembesaran di sisi kiri. Pembesaran sedikit melewati ukuran akhir memberi efek pop dan pantulan kecil. Animasi berjalan satu kali saat pertama masuk layar; muat ulang dari atas untuk mengulangi percobaan.

Setelah contoh diterima dan pengguna meminta penyeragaman, varian `heading` menjadi default komponen SectionHeading. Label, judul, dan deskripsi pendek dalam komponen bergerak sebagai satu blok. Judul rata kiri memakai titik pembesaran di sisi kiri; judul rata tengah memakai titik pembesaran di tengah agar susunannya terasa seimbang. Paragraf isi di luar komponen, foto Lurah, dan kartu tetap mengikuti kategori masing-masing.

**Pemeriksaan percobaan 1:** build berhasil. Uji Chrome pada desktop 1280×900 dengan scroll bertahap dan ponsel 390×844 dengan scroll cepat berhasil: kondisi menunggu sesuai, animasi memakai gerakan dan durasi yang dipilih, judul kembali terlihat penuh tanpa transform setelah selesai, dan tidak berulang ketika keluar lalu masuk layar lagi. Tautan `#profil` langsung menampilkan judul tanpa menunggu animasi. Mode pengurangan gerakan serta JavaScript dimatikan tetap menampilkan judul secara normal. Screenshot akhir desktop dan ponsel diperiksa. Penilaian kenyamanan masih menunggu pengguna.

**Pemeriksaan percobaan 2:** build berhasil. Uji browser pada desktop 1280×900 dan ponsel 390×844 memastikan kondisi menunggu cocok dengan frame awal, animasi menggunakan gerakan baru dan durasi 800 ms, tidak menimbulkan overflow horizontal saat masuk maupun saat membesar, serta kembali terlihat penuh tanpa transform setelah selesai. Pengujian scroll bertahap, scroll cepat, tidak mengulang ketika kembali ke section, tautan anchor, pengurangan gerakan, dan tanpa JavaScript berhasil. Hanya satu judul section yang memakai varian percobaan. Penilaian pengguna masih ditunggu.

**Pemeriksaan revisi kecepatan:** build berhasil; uji terarah di Chrome pada ukuran ponsel memastikan pratinjau memakai durasi 500 ms, gerakan kiri + pop tetap sama, tidak membuat overflow horizontal, dan judul terlihat normal setelah selesai tanpa mengulang animasi. Pengguna kemudian menyatakan "cukup sepertinya seperti ini"; pola dan kecepatan contoh diterima.

**Penerapan selesai:** seluruh judul section di Beranda, Profil, Layanan, dan Wisata memakai pola terpilih. Termasuk Layanan, Wisata, Kontak, Struktur Organisasi, Wilayah, Visi Misi, Pengumuman, Panduan Pengurusan Surat, Pengaduan, serta Daftar Destinasi. Pengumuman saat ini tidak dirender karena datanya kosong; komponen yang sama akan memberi efek ini ketika pengumuman tersedia.

**Pemeriksaan penyeragaman:** build berhasil. Pada Chrome desktop 1280×900 dan ponsel 390×844, seluruh 10 judul section yang saat ini dirender diperiksa satu per satu: Beranda 4, Profil 3, Layanan 2, Wisata 1. Setiap animasi yang berjalan memakai gerakan kiri + pop dan durasi 500 ms, judul kembali terlihat penuh tanpa transform setelah selesai, tidak membuat overflow horizontal selama gerakan, dan tidak mengulang ketika kembali ke section. Titik pembesaran judul rata tengah sesuai pusat blok. Judul yang sudah terlihat saat halaman dibuka langsung ditampilkan tanpa animasi, sesuai perilaku sebelumnya. Penilaian keseluruhan kategori menunggu pengguna.

**Revisi jeda, 7 Oktober 2026:** pengguna meminta sedikit tambahan delay. Percobaan menambahkan jeda 100 ms setelah judul masuk layar sebelum gerakan dimulai; durasi gerakan tetap 500 ms. Perubahan berlaku pada seluruh judul section, sementara judul yang terlihat saat halaman dibuka, tautan anchor, fokus keyboard, dan pengurangan gerakan tetap langsung menampilkan informasi. Penilaian pengguna atas jeda ini masih ditunggu.

**Keputusan akhir, 7 Oktober 2026:** pengguna menyatakan "oke keren, tahap 2 selesai" dan meminta lanjut ke tahap 3. Pola seluruh judul section dengan jeda 100 ms diterima. Pemeriksaan visual otomatis revisi jeda belum dilakukan; build dan git diff --check berhasil, dan pengguna menerima hasil pratinjau.

Checklist:

- [x] Satu judul section sudah dicoba dan pengguna menyatakan cocok.
- [x] Penerapan pada judul section lain sudah diperiksa.
- [x] Scroll pelan dan cepat tetap menghasilkan kemunculan yang wajar.
- [x] Judul section yang langsung terlihat pada layar awal tetap terbaca.
- [x] Melompat ke section melalui tautan tidak menunda informasi yang dicari.
- [x] Polanya terasa berbeda dari pembuka halaman tanpa mengganggu konsistensi.
- [x] Pengguna menyatakan kategori judul section sudah cocok.

## 6. Tahap 3 — Isi section

**Tujuan:** paragraf, foto, dan informasi pendukung muncul dengan tenang setelah atau bersama judul section.

**Contoh pertama:** ringkasan dan foto Lurah pada section Profil di Beranda. Mulai dari satu elemen, lalu coba hubungannya dengan elemen pendamping.

**Percobaan pertama, 7 Oktober 2026:** hanya paragraf ringkasan Profil di Beranda memakai varian `content`: fade dari opacity 0,4 sambil naik 16 px ke posisi normal, durasi 600 ms, jeda awal 200 ms sejak masuk layar, easing `cubic-bezier(0.22, 1, 0.36, 1)`. Pengguna menilai "keren juga, simple", kemudian meminta alternatif. Belum menjadi keputusan akhir kategori.

**Pemeriksaan percobaan pertama:** build dan git diff --check berhasil. Chrome tanpa jendela pada desktop 1280×900 dan ponsel 390×844 memastikan hanya satu paragraf memakai varian baru, frame awal serta jeda/durasi sesuai, hasil akhir terlihat penuh tanpa transform, tidak ada overflow horizontal, dan animasi tidak berulang saat kembali ke section. Pola judul tahap 2 tetap berdurasi 500 ms dengan jeda 100 ms. Tautan anchor langsung menampilkan paragraf; reduced motion dan JavaScript dimatikan tetap menampilkan teks penuh tanpa gerakan. Tidak ada exception JavaScript di browser; screenshot akhir desktop/ponsel diperiksa. Pengujian memakai server tambahan di port 4322. Penilaian kenyamanan pengguna masih ditunggu.

**Alternatif masuk dari kanan, 7 Oktober 2026, aktif:** pengguna mengizinkan percobaan alternatif pertama. Paragraf bergeser dari `translateX(20px)` ke posisi normal sambil fade dari opacity 0,4 ke 1; durasi 600 ms, jeda 200 ms, dan easing tetap sama. Section Profil memakai `overflow-x-clip` agar gerakan tetap berada dalam lebar halaman pada ponsel. Foto Lurah dan judul section mempertahankan pola masing-masing.

**Pemeriksaan alternatif:** build dan git diff --check berhasil. Chrome tanpa jendela desktop 1280×900 dan ponsel 390×844 memastikan frame awal, durasi, dan jeda sesuai; tidak ada overflow horizontal sebelum, selama, maupun sesudah gerakan; paragraf kembali terlihat penuh tanpa transform dan tidak mengulang saat scroll kembali. Pola judul tahap 2 tetap 500 ms dengan jeda 100 ms. Anchor, reduced motion, serta JavaScript dimatikan tetap menampilkan teks penuh. Tidak ada exception JavaScript; screenshot akhir diperiksa. Pratinjau dan uji browser memakai port 4321. Penilaian pengguna ditunggu.

Setelah cocok, periksa blok informasi kontak, isi visi, daftar misi, program unggulan saat masuk layar, dan kolom footer. Animasi buka–tutup program unggulan baru dibahas pada tahap 6.

**Penyeragaman, 7 Oktober 2026:** pengguna menyatakan "waw yang ini sepertinya cocok" dan meminta "silahkan serasikan ke yang lain". Semua blok kategori isi memakai pola kanan 20 px + fade 0,4 → 1 selama 600 ms, dengan jeda awal 200 ms sejak masuk layar. Jeda isi tidak mendapat tambahan urutan grup kartu. Info kantor dan daftar misi muncul masing-masing sebagai satu blok; animasi anak dihapus agar tidak ganda. Empat kolom footer memakai pola yang sama, masing-masing saat masuk layar. Foto Lurah, blok peta dan petunjuk arah, isi visi, program unggulan beserta sumber, serta tombol pengaduan juga memakai pola ini. Section terkait dan footer membatasi overflow horizontal. Kartu, daftar layanan, statistik, simpul organisasi, serta efek buka–tutup tetap mengikuti kategori masing-masing.

**Pemeriksaan penyeragaman:** build dan git diff --check berhasil. Chrome tanpa jendela pada desktop 1280×900 dan ponsel 390×844 memeriksa 25 blok isi di empat halaman: Beranda 8, Profil 8, Layanan 5, Wisata 4 (footer muncul pada setiap halaman). Semua blok di luar layar awal menjalankan frame, durasi, dan jeda yang dipilih; yang sudah terlihat saat pemuatan langsung tampil. Semua kembali terlihat penuh tanpa transform, tanpa animasi ganda atau pengulangan saat scroll kembali. Tidak ada overflow sebelum, selama, atau setelah gerakan. Judul tahap 2 tetap memakai 500 ms dan jeda 100 ms. Anchor visi-misi langsung menampilkan semua isi; panel program tetap bisa dibuka/ditutup; fokus keyboard ke footer langsung menampilkan blok terkait. Reduced motion dan JavaScript dimatikan menampilkan seluruh blok pada keempat halaman. Tidak ada exception JavaScript; screenshot footer desktop/ponsel diperiksa. Penilaian kenyamanan keseluruhan menunggu pengguna.

**Keputusan akhir tahap 3 dan tempo, 7 Oktober 2026:** setelah seluruh animasi diperlambat dan ketikan dipercepat, pengguna menyatakan "okey lumayanlah, kita lanjut ke tahap selanjutnya". Tahap 3 diterima untuk melanjutkan ke tahap 4. Isi section menggunakan pola kanan + fade dengan durasi terbaru 750 ms dan jeda 200 ms.

Checklist:

- [x] Contoh pertama sudah dicoba dan pengguna menyatakan cocok.
- [x] Hubungan waktu antara judul section dan isinya terasa sesuai.
- [x] Paragraf panjang tetap mudah dibaca tanpa menunggu animasi selesai.
- [x] Foto dan teks tetap terasa selaras pada susunan ponsel maupun desktop.
- [x] Tidak ada animasi ganda dari pembungkus dan elemen di dalamnya.
- [x] Penerapan pada blok isi lainnya sudah diperiksa satu per satu.
- [x] Pengguna menyatakan kategori isi section sudah cocok.

## 7. Tahap 4 — Kartu dan daftar berulang

**Tujuan:** kumpulan item muncul dengan urutan yang terasa rapi dan tidak terlalu lama.

**Contoh pertama:** kartu layanan di Beranda. Coba satu kartu dulu, kemudian coba satu baris kartu sebagai grup.

**Percobaan pertama, 7 Oktober 2026:** hanya kartu pertama, "Surat Keterangan Domisili", memakai varian `card`. Kartu muncul dari opacity 0,35 dengan `translateY(16px) scale(0.96)`, sedikit melewati ukuran akhir ke `translateY(-2px) scale(1.01)` pada offset 0,75, lalu kembali normal. Durasi 1000 ms, jeda awal 200 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`. Berjalan sekali saat pertama masuk layar. Tiga kartu lainnya mempertahankan pola lama agar contoh bisa dinilai terlebih dahulu.

**Pemeriksaan percobaan:** build dan git diff --check berhasil. Chrome tanpa jendela pada desktop 1280×900, tablet 768×900, dan ponsel 390×844 memastikan hanya kartu Domisili memakai varian baru, frame menunggu sesuai, durasi/jeda benar, tidak ada overflow selama gerakan, hasil akhir terlihat penuh tanpa transform, dan animasi tidak berulang saat scroll kembali. Transisi CSS dinonaktifkan saat kartu menunggu agar tidak menambahkan gerakan awal. Tampilan langsung pada anchor/fokus juga melewati transisi CSS sebelum hover kembali aktif. Hover setelah animasi dan tautan ke layanan Domisili bekerja; keyboard, anchor, reduced motion, serta JavaScript dimatikan tetap menampilkan kartu. Judul 625 ms, isi 750 ms, dan efek muncul lain 1375 ms tetap sesuai. Tidak ada exception JavaScript; screenshot desktop/ponsel diperiksa. Penilaian gerakan kartu menunggu pengguna; urutan satu grup belum dicoba.

**Revisi kecepatan aktif, 7 Oktober 2026:** pengguna menyatakan gerakan kartu bagus tetapi masih terlalu cepat. Durasi kartu Domisili ditambah dari 1000 ms menjadi 1300 ms; jeda tetap 200 ms dan bentuk gerakan tetap sama. Foto Lurah sudah memakai pola isi tahap 3, kanan + fade 750 ms dengan jeda 200 ms; kolom foto konten masih kosong sehingga gambar pengganti yang dianimasikan. Build dan uji Chrome desktop/tablet/ponsel revisi berhasil; penilaian kecepatan terbaru menunggu pengguna.

**Contoh diterima dan percobaan grup, 7 Oktober 2026:** pengguna menyatakan "nah itu keren" dan meminta mencoba empat kartu bertahap. Keempat kartu layanan memakai pola terpilih selama 1300 ms. Dalam satu batch kartu yang masuk layar bersama, jeda awal menjadi 200, 380, 560, dan 740 ms, sehingga urutan mulai terpisah 180 ms dan animasinya saling menyusul. Kartu yang baru masuk layar pada batch berikutnya mulai lagi dari jeda 200 ms; kartu di luar layar tidak menunggu urutan dari awal halaman. Tambahan urutan dibatasi 540 ms. Kategori kartu lain belum diseragamkan.

**Pemeriksaan grup:** build dan git diff --check berhasil. Chrome tanpa jendela desktop 1280×900 dan tablet 768×900 memastikan empat kartu mulai dalam urutan DOM dengan jeda 200/380/560/740 ms. Ponsel 390×844 melalui scroll bertahap memeriksa keempat kartu dengan jeda batch 200/380/560/200 ms; kartu terakhir mendapat jeda baru ketika masuk layar. Setiap kartu memakai 1300 ms, kembali terlihat penuh tanpa transform, tanpa overflow atau pengulangan saat scroll kembali. Hover, tautan layanan, keyboard pada kartu fokus, anchor pada seluruh grup, reduced motion, dan JavaScript dimatikan bekerja. Judul 625 ms, isi 750 ms, dan efek muncul lain 1375 ms tetap sesuai. Tidak ada exception JavaScript; screenshot desktop/ponsel diperiksa. Penilaian pola dan jeda grup menunggu pengguna.

**Penyeragaman, 7 Oktober 2026:** pengguna menyatakan "wah benar benar keren ini" dan meminta penyeragaman pada elemen yang cocok. Kartu destinasi Beranda/Wisata, statistik wilayah, daftar layanan, pengumuman, serta kartu lingkungan ponsel dan pembungkus tabel lingkungan desktop memakai varian `card` dengan gerakan terpilih. Default kartu layanan mengikuti pola tersebut. Jeda setiap batch mulai 200 ms dan bertambah 180 ms, dibatasi 740 ms sehingga grup besar tidak menunggu terlalu lama. Tabel bergerak sebagai satu blok; baris tidak menerima animasi kedua.

**Penyesuaian bagan:** tiap kotak jabatan memakai varian `node`, naik 6 px dan membesar 98% → 100,5% → normal selama 1300 ms agar gerakannya tetap dekat dengan garis bagan. Jeda dihitung dari tingkat jabatan: 200 ms + min(tingkat, 3) × 180 ms. Simpul atasan mendahului bawahan ketika terlihat bersama; simpul yang masuk melalui geseran tetap dianimasikan sekali. Garis, zoom, dan kontrol bagan mempertahankan perilakunya.

**Pemeriksaan penyeragaman:** build dan git diff --check berhasil. Chrome tanpa jendela memeriksa Beranda, Profil, Layanan, dan Wisata pada desktop 1280×900, tablet 768×900, dan ponsel 390×844. Jumlah kartu/simpul yang dirender: Beranda 7, Profil 19 pada desktop/tablet dan 28 pada ponsel, Layanan 4, Wisata 3. Scroll vertikal dan geseran horizontal carousel/bagan memastikan setiap elemen kembali terlihat penuh tanpa transform, tidak ada animasi ganda, pengulangan, atau overflow halaman selama gerakan. Semua durasi 1300 ms dan jeda dibatasi sesuai; frame simpul berbeda sesuai penyesuaian bagan. Judul 625 ms dan isi 750 ms tetap benar. Zoom bagan ponsel, interaksi layanan saat animasi berjalan, aturan satu layanan terbuka, anchor layanan, keyboard dan tautan Maps, reduced motion, serta JavaScript dimatikan berhasil. Tidak ada exception JavaScript; screenshot Wisata desktop dan Wilayah ponsel diperiksa. Pengumuman kosong saat ini: markup dan build sudah diperiksa, tetapi animasinya belum diuji di browser dengan pengumuman terisi. Penilaian keseluruhan kategori menunggu pengguna.

**Penyesuaian tampilan mobile, 7 Oktober 2026:** pengguna menanyakan langkah berikutnya dan meminta gambar sebelum teks pada mobile. Foto beserta nama Lurah di section Profil Beranda dipindahkan sebelum blok judul, ringkasan, dan tombol dalam urutan HTML. Pada ponsel/tablet tampil di atas teks; pada desktop foto tetap di kiri. Pola animasi yang dipilih dipertahankan. Build dan git diff --check berhasil; Chrome 390×844, 768×900, dan 1280×900 memastikan susunan sesuai tanpa overflow, dan screenshot ponsel/desktop diperiksa. Langkah berikutnya tetap tahap 5 (pergantian foto hero, zoom, interval/kontrol slideshow, lalu carousel wisata); permintaan ini belum menjadi penilaian akhir kategori tahap 4.

Setelah cocok, periksa kartu destinasi, statistik wilayah, pengumuman, daftar layanan, dan simpul organisasi. Bentuk serta cara baca bagan organisasi boleh memerlukan penyesuaian tersendiri; jangan memaksakan urutan kartu biasa pada hubungan atasan dan bawahan.

Gerakan saat kartu masuk layar dibahas di sini. Gerakan saat hover dibahas pada tahap 7.

Checklist:

- [x] Gerakan satu kartu sudah dicoba dan pengguna menyatakan cocok.
- [x] Urutan dan jeda satu grup sudah dicoba dan pengguna menyatakan cocok.
- [x] Susunan satu kolom, dua kolom, dan beberapa kolom memberikan urutan yang masuk akal.
- [x] Grup dengan banyak item tidak membuat item terakhir menunggu terlalu lama.
- [x] Kartu yang terlihat lewat geseran carousel dan simpul lewat geseran bagan tetap terbaca.
- [x] Kemunculan kartu tidak mengganggu hover atau penggunaan tautannya.
- [x] Penerapan pada jenis item lainnya sudah diperiksa satu per satu; pengumuman saat ini kosong, dicatat di atas.
- [x] Pengguna menerima tahap 4 untuk melanjutkan: "silahkan lanjut ke tahap 5", 7 Oktober 2026.

## 8. Tahap 5 — Foto dan slideshow

**Tujuan:** perpindahan gambar terasa halus dan tetap nyaman saat teks sedang dibaca.

**Percobaan pertama, 7 Oktober 2026:** pengguna meminta "silahkan lanjut ke tahap 5". Foto baru memudar masuk selama 1800 ms dengan easing `ease-in-out`, di atas foto lama yang tetap opacity 1 sampai pergantian selesai. Cara ini menghindari latar yang menggelap akibat dua foto memudar bersamaan. Foto lama mempertahankan animasi zoom selama transisi agar tidak mendadak berubah ukuran. Lapisan hijau dan gradasi tetap berada di atas kedua foto, sehingga teks tidak ikut memudar. Zoom 1,03 → 1 selama 6250 ms, interval 6250 ms, serta tombol jeda/lanjut tetap memakai pola sebelumnya dan belum menjadi keputusan tahap 5.

**Pratinjau percobaan pertama (riwayat):** server sementara menambahkan gambar pengganti SVG untuk mencoba dua gambar tanpa mengubah konten asli. Pratinjau ini sudah diganti dengan pratinjau lengkap tahap 5 di bawah.

**Pemeriksaan percobaan pertama:** build dan `git diff --check` berhasil. Chrome tanpa jendela pada desktop 1280×900, tablet 768×900, dan ponsel 390×900 memeriksa pergantian dua gambar: foto baru memakai fade 1800 ms, foto lama tetap opacity 1 dan mempertahankan zoom, lapisan hijau/gradasi tetap di atas foto, dan penanda foto keluar dibersihkan setelah transisi. Tidak ada overflow horizontal. Jeda/lanjut, pengurangan gerakan sejak pemuatan dan ketika diubah saat transisi, satu foto, serta JavaScript dimatikan berhasil; tidak ada exception JavaScript. Screenshot tengah transisi pada desktop dan ponsel diperiksa. Uji Chrome memerlukan eksekusi di luar sandbox karena koneksi CDP tidak merespons di dalam sandbox. Gambar kedua dalam uji/pratinjau adalah SVG pengganti; foto kedua asli belum tersedia. Penilaian kenyamanan menunggu pengguna.

Urutan percobaan, dengan penilaian pada setiap langkah:

1. Pergantian antara dua foto latar Beranda.
2. Gerakan zoom foto dan hubungannya dengan pergantian foto.
3. Waktu pergantian otomatis serta kontrol jeda/lanjut dan pemilihan foto.
4. Perpindahan carousel destinasi wisata menggunakan geseran dan kontrol yang tersedia.

**Penyelesaian seluruh tahap, 7 Oktober 2026:** pengguna meminta "silahkan lanjut untuk selesaikan tahap 5". Permintaan ini mengizinkan penerapan seluruh bagian yang tersisa tanpa penilaian terpisah sebelum setiap langkah. Seluruh implementasi selesai; penilaian akhir kenyamanan tetap dicatat terpisah dari hasil pemeriksaan teknis.

**Pola terkini:** fade 1800 ms dipertahankan. Zoom 1,03 → 1 menjadi linear selama 9800 ms: interval 8000 ms ditambah 1800 ms untuk fade keluar, sehingga foto lama terus bergerak sampai tertutup. Tombol jeda membekukan zoom dan putaran; fade yang sudah berjalan diselesaikan agar tidak berhenti pada dua foto setengah terlihat. Putaran/zoom dijeda saat tab disembunyikan atau hero keluar layar dan dilanjutkan saat kembali terlihat, kecuali pengguna sudah memilih jeda. Fokus keyboard dan pemilihan foto menjeda putaran sampai pengguna memilih lanjut. Pilihan cepat diselesaikan berurutan dengan mengambil pilihan terakhir, menghindari kilatan. Foto di-decode sebelum mulai tampil; gambar gagal tetap memakai fallback yang sudah tersedia.

**Kontrol:** foto hero mempunyai tombol pemilihan dengan penanda aktif dan nama foto, tombol jeda/lanjut, serta navigasi keyboard kiri/kanan/Home/End. Carousel wisata mempertahankan swipe dan snap native, menambahkan titik yang bisa diklik, tombol sebelumnya/berikutnya yang dinonaktifkan di ujung, dan navigasi keyboard. Geseran tombol memakai smooth native; reduced motion memakai perpindahan langsung. Pada desktop/tablet carousel kembali menjadi grid. Status pilihan tersedia bagi pembaca layar; status hero tidak mengumumkan pergantian otomatis. Kontrol baru disembunyikan jika JavaScript tidak tersedia; foto pertama dan swipe native tetap berfungsi.

**Pratinjau lengkap:** [slideshow dan carousel wisata](http://127.0.0.1:4321/WalianHub/?uji=slideshow), [konten asli satu foto](http://127.0.0.1:4321/WalianHub/), serta [kondisi tanpa foto](http://127.0.0.1:4321/WalianHub/?uji=kosong). HTML contoh dihasilkan oleh build Astro dari konten sementara, lalu konten asli dipulihkan persis dan dibangun kembali. Tiga foto contoh terdiri dari foto kantor, SVG pengganti, dan foto kantor yang diulang untuk menguji pemilihan cepat. File konten asli tidak mendapat foto tambahan. Server dan HTML contoh berada di folder sementara, bukan halaman yang dipublikasikan. Hasil build ini perlu diperbarui jika kode berubah.

**Pemeriksaan penyelesaian:** build akhir, `git diff --check`, dan 16 tes konten/wisata berhasil. Uji Chrome pada lebar 1280, 768, 390, dan 320 px memeriksa zoom 9800 ms, fade 1800 ms dengan foto lama tetap utuh, putaran 8000 ms, tombol jeda/lanjut melalui klik pointer, penjedaan di luar layar, pemilihan cepat, penanda aktif, dan keyboard. Reduced motion sejak pemuatan tidak memutar otomatis; perubahan preferensi di tengah fade menyelesaikan transisi tanpa tersangkut. Carousel diperiksa melalui tombol, klik cepat, keyboard End, perpindahan langsung pada reduced motion, swipe sentuh native, dan perubahan ukuran ke grid desktop. Fallback gambar gagal, satu foto, tanpa foto, serta tanpa JavaScript berhasil. Empat halaman pada desktop/ponsel tetap tanpa overflow dan tanpa exception JavaScript. Screenshot hero dan carousel diperiksa. Uji dibagi beberapa proses; koneksi Chrome memerlukan eksekusi di luar sandbox. Dua kegagalan server uji sementara (rute beranda dan respons 404) diperbaiki sebelum kondisi terkait diuji ulang; pemeriksaan swipe memakai event sentuh langsung setelah gesture sintetis tidak menghasilkan geseran. Penilaian pengguna belum menjadi keputusan akhir kategori.

Checklist penerapan:

- [x] Pergantian foto diterapkan dan diuji.
- [x] Zoom diselaraskan dengan fade dan diuji.
- [x] Interval, jeda/lanjut, dan pemilihan foto diterapkan dan diuji.
- [x] Teks serta lapisan hijau tetap utuh selama gambar berganti.
- [x] Kondisi tanpa foto, satu foto, dan beberapa foto berfungsi.
- [x] Carousel wisata diuji dengan kontrol, keyboard, dan swipe.
- [ ] Pengguna menyatakan kategori foto dan slideshow sudah cocok.

**Revisi tahap 5 terkini:** pengguna meminta foto berganti setiap 2 detik. Interval kini 2000 ms, fade 600 ms, zoom linear 2600 ms (interval + fade keluar), dan foto berikutnya dimuat lebih awal. Angka 8000/1800/9800 ms pada percobaan sebelumnya merupakan riwayat. Kontrol serta penanganan klik cepat tetap sama dan diuji ulang.

## 9. Tahap 6 — Buka–tutup panel

**Tujuan:** gerakan menjelaskan panel yang dibuka atau ditutup dan tetap cepat merespons.

Urutan awal percobaan: **menu mobile → detail layanan → program unggulan**. Pengguna mengizinkan seluruh tahap tersisa diselesaikan sekaligus, kemudian meminta pemeriksaan terakhir serta commit/push ke branch terpisah sebelum penilaian bersama.

**Penerapan selesai, 7 Oktober 2026:** menu mobile memakai fade + turun 8 px dan pop kecil, buka 420 ms/tutup 280 ms; klik cepat membalik dari posisi saat itu. Panel yang menutup langsung inert. Escape mengembalikan fokus ke hamburger; resize ke desktop menutup panel dan mengembalikan fokus ke logo jika sebelumnya ada di dalam menu.

Detail layanan mempertahankan `details` native dan aturan hanya satu terbuka. Browser pendukung mendapat tinggi otomatis 450 ms saat buka/320 ms saat tutup, dengan fade 350/250 ms. Browser lain tetap native. Tautan anchor membuka langsung, melewati transisi. Program unggulan memakai animasi tinggi sesuai isi + fade, buka 550 ms/tutup 400 ms; klik cepat membalik dari tinggi/opacity saat itu. Reduced motion dan resize menyelesaikan keadaan terakhir tanpa sisa tinggi tetap. Tanpa JavaScript, program tetap terbuka dan tombolnya disembunyikan.

**Pemeriksaan:** Chrome pada 1280, 768, 390, dan 320 px memeriksa klik cepat, Escape/fokus, keyboard Enter/Spasi, resize, reduced motion di tengah gerakan, aturan satu layanan terbuka, anchor, serta isi program tanpa terpotong. Semua berhasil. Penilaian visual akhir menggunakan [CEK-ANIMASI.md](CEK-ANIMASI.md).

Checklist:

- [x] Menu mobile diterapkan dan diuji.
- [x] Detail layanan diterapkan dan diuji.
- [x] Program unggulan diterapkan dan diuji.
- [x] Klik berulang sebelum animasi selesai tidak membuat panel tersangkut.
- [x] Membuka layanan lain tetap menutup layanan sebelumnya.
- [x] Isi panel tidak terpotong setelah animasi selesai.
- [x] Keyboard, fokus, Escape, dan perubahan ukuran layar tetap bekerja sesuai perilaku masing-masing panel.
- [ ] Pengguna menyatakan kategori buka–tutup panel sudah cocok.

## 10. Tahap 7 — Respons interaksi dan scroll

**Tujuan:** gerakan kecil memperjelas respons tindakan pengguna.

Percobaan dilakukan terpisah, dengan penilaian untuk setiap bagian:

1. Hover kartu layanan, lalu kartu destinasi beserta fotonya.
2. Respons tombol saat ditekan dan gerakan ikon pendamping.
3. Perubahan tampilan navbar saat meninggalkan bagian atas halaman.
4. Kemunculan dan hilangnya tombol kembali ke atas.
5. Indikator status kantor yang berdenyut, jika pengguna ingin menyesuaikannya.

**Penerapan selesai, 7 Oktober 2026:** kartu layanan/destinasi mempertahankan naik 2 px + bayangan selama 437,5 ms, mendapat bayangan ketika fokus, dan membatasi transisi pada translate/bayangan agar tidak mengambil alih animasi masuk. Panah merespons hover/fokus pada mode gerakan normal. Tombol mempertahankan tekanan scale 0,98 selama 250 ms. Foto destinasi asli memakai zoom 1,03 selama 1000 ms pada perangkat dengan kursor; SVG pengganti diam dan reduced motion meniadakan zoom.

Navbar memakai transisi warna/bayangan 375 ms, dengan ambang turun 24 px/kembali 8 px untuk menghindari kedipan; pemrosesan scroll mengikuti frame layar. Tombol kembali ke atas memakai fade + naik 16 px selama 375 ms, nonaktif ketika tersembunyi, dengan ambang kembali 64 px lebih rendah agar tidak berkedip. Klik menggulir halus atau langsung pada reduced motion, lalu fokus ke hamburger/logo. Lampu status buka memakai cincin kecil scale 1 → 1,65 setiap 2 detik; reduced motion menyisakan titik statis.

**Pemeriksaan:** hover/tekan, foto asli, lampu status, reduced motion, navbar tanpa perubahan tinggi, tombol atas/fokus, serta swipe sentuh berhasil. Empat halaman pada lebar 320–1280 px tanpa overflow dan tanpa exception JavaScript. Screenshot hero, program, dan carousel diperiksa; kenyamanan akhir menunggu pengguna.

Checklist:

- [x] Hover/fokus kartu diterapkan dan diuji bersama animasi masuk.
- [x] Respons tombol dan ikon diterapkan dan diuji.
- [x] Perubahan navbar diuji tanpa menggeser isi halaman.
- [x] Kemunculan tombol kembali ke atas diterapkan dan diuji.
- [x] Kontrol sentuh/swipe berfungsi tanpa bergantung pada hover.
- [x] Indikator status kantor diselaraskan dan diuji.
- [ ] Pengguna menyatakan kategori respons interaksi dan scroll sudah cocok.

## 11. Pemeriksaan bersama sebelum menutup tahap

Pemeriksaan disesuaikan dengan perubahan yang sedang dicoba; gunakan pratinjau visual untuk menilai animasi. Build atau tes otomatis membantu memeriksa fungsi, tetapi tidak menggantikan penilaian pengguna.

- [ ] Dicoba pada ukuran ponsel dan desktop; catat jika salah satunya belum diperiksa.
- [ ] Konten dan kontrol tetap bisa dipakai ketika animasi sedang berjalan.
- [ ] Preferensi perangkat untuk mengurangi gerakan dihormati.
- [ ] Informasi tetap tersedia jika JavaScript tidak berjalan.
- [ ] Tautan anchor dan navigasi keyboard tetap bekerja pada elemen terkait.
- [ ] Tidak ada kesalahan baru pada konsol browser dalam percobaan yang diperiksa.
- [ ] Build diperiksa jika implementasi memerlukan validasi kompilasi; jalankan tes terkait jika logika yang tercakup tes berubah.
- [ ] Kategori yang sudah cocok diperiksa ulang jika sistem bersamanya ikut berubah.
- [ ] Masukan pengguna dan keputusan akhir dicatat di bawah.

## 12. Catatan percobaan dan keputusan

**Tahap aktif:** peninjauan hasil akhir tahap 5–7; seluruh implementasi selesai sesuai permintaan pengguna. Tahap 1–4 sudah diterima. Penilaian akhir, termasuk revisi foto 2 detik, memakai [CEK-ANIMASI.md](CEK-ANIMASI.md).

**Tempo yang diterima:** pengguna sebelumnya meminta semua animasi diperlambat dan ketikan per huruf dipercepat, kemudian mengizinkan lanjut tahap berikutnya. Parameter terkini mengikuti catatan revisi tempo di bawah; angka pada percobaan sebelumnya adalah riwayat.

**Penerapan terkini:** judul dan paragraf pembuka pada Layanan, Profil, dan Wisata menggunakan komponen TeksKetik yang sudah diperbaiki. Kedua elemen dikeluarkan dari animasi scroll agar tidak mendapat dua animasi. Parameter bersama disimpan di `src/lib/teks-ketik.ts`, termasuk perhitungan jeda subjudul berdasarkan panjang judul. Status kantor, breadcrumb, dan tautan section tidak ikut mendapat efek mengetik.

**Bagian berikutnya:** pengguna meminta pemeriksaan terakhir, commit/push ke branch terpisah, lalu peninjauan bersama. Fetch terakhir tetap menunjukkan `origin/main` pada `184536d` dan `origin/CMS` pada `6f5d0c9` (16 commit di atas main). Branch `animasi-tahap-1-7` dibuat dari main terbaru. Tidak ada berkas animasi yang beririsan dengan perubahan remote. Gabungan di salinan sementara lolos build dan 16 tes main / 22 tes CMS. CMS lanjutan memakai fork `gleey/WalianHub`, sedangkan main memakai `GibranAlkatiri/WalianHub`; tujuan produksi perlu disepakati sebelum CMS digabung. Penilaian visual serta penggabungan ke main dilakukan setelah publikasi branch animasi.

**Gerakan tahap 1 yang dipilih:** efek mengetik, satu huruf muncul setiap 45 ms untuk judul dan setiap 25 ms untuk subjudul. Subjudul mulai setelah alokasi waktu judul ditambah 200 ms. Dengan teks Beranda saat ini, subjudul mulai pada 1,73 detik dan seluruh teks selesai sekitar 3,43 detik. Seluruh huruf sudah menempati ruangnya sejak awal; kata dibungkus sebagai satu unit agar susunan baris tidak berubah selama animasi. Pengurangan gerakan langsung menampilkan seluruh teks.

**Gerakan terpilih tahap 2:** blok label, judul, dan deskripsi pendek section masuk dari kiri dengan pembesaran 94% → 102% → 100%, bergeser -32 px → +4 px → 0, durasi 500 ms. Pola contoh Profil sudah disetujui dan diterapkan pada seluruh komponen SectionHeading. Percobaan aktif pada 7 Oktober menambahkan jeda awal 100 ms; jeda ini belum dinyatakan cocok oleh pengguna.

**Keputusan pengguna:** tahap 1 diterima. Gerakan kiri + pop pada tahap 2 dinilai "bagus", tetapi terlalu lambat. Setelah durasi dipercepat menjadi 500 ms, pengguna menyatakan "cukup sepertinya seperti ini", lalu meminta "silahkan serasikan" pada judul section lainnya. Penerapan sudah selesai dan diuji; penilaian hasil keseluruhan menunggu pengguna.

**Pratinjau:** [Beranda](http://127.0.0.1:4321/WalianHub/), [Profil](http://127.0.0.1:4321/WalianHub/profil/), [Layanan](http://127.0.0.1:4321/WalianHub/layanan/), dan [Wisata](http://127.0.0.1:4321/WalianHub/wisata/) aktif. Buka setiap halaman dari atas lalu scroll untuk melihat judul section muncul. Muat ulang dari atas untuk mengulangi animasi. Tautan langsung ke anchor dan judul yang sudah terlihat pada layar awal langsung menampilkan informasi tanpa menunggu efek.

**Pemeriksaan percobaan 1:** `bun run build` berhasil; pratinjau memberi HTTP 200 dan memuat kelas animasi judul/subjudul. Keyframe hasil build sesuai parameter percobaan; pemakaian kelas hanya ditemukan pada judul/subjudul Beranda. Pemeriksaan visual ponsel/desktop, keyboard, dan konsol browser belum dilakukan. Penilaian kenyamanan menunggu pengguna mencoba pratinjau.

**Pemeriksaan percobaan 2:** `bun run build` berhasil; pratinjau memberi HTTP 200 dengan efek mengetik dan tanpa kelas pembuka lama. HTML hasil build memuat teks lengkap untuk pembaca layar serta dua blok visual `aria-hidden`; jumlah huruf dan urutan jeda diperiksa. CSS hasil build membatasi animasi pada preferensi tanpa pengurangan gerakan. Pemeriksaan visual ponsel/desktop dan pembaca layar secara langsung belum dilakukan.

**Revisi 1 — huruf hilang:** pengguna melaporkan huruf tetap hilang setelah refresh atau seleksi teks. Bug berhasil direproduksi di Chrome: animasi sudah berstatus `finished`, tetapi beberapa huruf masih memiliki `opacity: 0`. Durasi 1 ms dengan `step-end` menghasilkan progres akhir sedikit di bawah 1 karena pembulatan waktu; `fill: both` mempertahankan frame tersembunyi. Perbaikan mengganti opacity dengan visibility dan memakai `fill: backwards` saja. Setelah animasi selesai, huruf memakai gaya normal yang terlihat, tanpa mempertahankan frame akhir animasi.

**Pemeriksaan revisi 1:** build berhasil. Uji browser Chrome pada desktop 1280×900 dan ponsel 390×844, masing-masing dua kali pemuatan halaman, termasuk seleksi teks saat mengetik dan setelah selesai. Seluruh 91 karakter non-spasi terlihat setelah selesai pada setiap percobaan; tidak ada karakter yang kembali hilang setelah seleksi. Screenshot akhir desktop dan ponsel diperiksa. Mode pengurangan gerakan juga langsung menampilkan seluruh huruf. Pengujian browser ini memakai Chrome tanpa jendela, bukan perangkat ponsel fisik; pemeriksaan pembaca layar langsung belum dilakukan.

**Pemeriksaan penerapan pada halaman lain:** build berhasil. Hasil build diuji melalui server sementara untuk otomatisasi, yang dihentikan setelah pengujian; server pratinjau Astro tetap dimatikan. Chrome pada desktop 1280×900 dan ponsel 390×844 menampilkan seluruh karakter setelah animasi dan seleksi teks: Layanan 150, Profil 159, Wisata 111 karakter non-spasi. Teks visual cocok dengan teks utuh untuk pembaca layar, tidak ada animasi scroll pada kedua elemen pembuka, ukuran dan posisi blok teks tidak berubah selama animasi, serta tidak ada overflow horizontal. Screenshot Layanan pada ponsel, Profil pada ponsel, dan Wisata pada desktop diperiksa. Pengurangan gerakan pada Profil langsung menampilkan seluruh teks. Beranda juga diperiksa ulang dan tetap selesai sekitar 3,43 detik.

Dengan kecepatan yang sama, panjang paragraf menghasilkan waktu total berbeda: Layanan sekitar 4,84 detik, Profil 5,16 detik, dan Wisata 3,61 detik. Ini belum menjadi penilaian kenyamanan pengguna; kecepatannya bisa disesuaikan jika diperlukan setelah mencoba.

Isi satu baris untuk setiap percobaan. Tambahkan baris ketika dilakukan revisi; pertahankan catatan sebelumnya agar alasan perubahan bisa dilihat.

| Percobaan | Tahap / elemen | Gerakan, durasi, dan jeda | Pratinjau / kondisi uji | Masukan pengguna | Keputusan |
|---|---|---|---|---|---|
| 1 | Tahap 1 / judul dan subjudul Beranda | Fade + naik 12 px; 900 ms; jeda subjudul 180 ms | Build berhasil; HTTP 200 saat percobaan 1 | Pengguna: "ini keren juga", lalu meminta mencoba huruf satu per satu | Disukai; mencoba alternatif sebelum memilih pola final |
| 2 | Tahap 1 / judul dan subjudul Beranda | Mengetik; 45 ms per huruf judul; 25 ms per huruf subjudul; tambahan jeda 200 ms | Build berhasil; HTTP 200 saat percobaan 2 | Huruf kadang hilang setelah refresh atau saat diblok | Perlu revisi; bug direproduksi di Chrome |
| 2, revisi 1 | Tahap 1 / judul dan subjudul Beranda | Kecepatan tetap; visibility dan fill backwards menggantikan opacity dan fill both | Build berhasil; uji refresh, seleksi, desktop, ponsel, dan reduced motion lolos; pratinjau kemudian dimatikan | Pengguna: "oke ini pas" | Cocok untuk Beranda; lanjut penerapan ke Layanan |
| 3 | Tahap 1 / pembuka Layanan, Profil, dan Wisata | Pola Beranda; judul 45 ms/huruf, paragraf 25 ms/huruf, tambahan jeda 200 ms | Build dan uji browser desktop/ponsel berhasil; server uji dihentikan | Pengguna: "keren", lalu meminta masuk tahap 2 | Tahap 1 diterima |
| 4 | Tahap 2 / label dan judul section Profil di Beranda | Naik 28 px + fade; 850 ms; sekali saat pertama masuk layar | Build dan uji scroll, anchor, reduced motion, dan tanpa JavaScript berhasil | Masih sama dengan animasi sebelumnya; pengguna meminta variasi | Tidak dipilih; diganti percobaan 2 |
| 5 | Tahap 2 / label dan judul section Profil di Beranda | Masuk dari kiri + pop ringan; -32 px / 94% → +4 px / 102% → normal; 800 ms | Build dan uji browser desktop/ponsel berhasil | "bagus", tetapi munculnya terlalu lambat | Gerakan disukai; kecepatan perlu revisi |
| 5, revisi 1 | Tahap 2 / label dan judul section Profil di Beranda | Gerakan kiri + pop tetap sama; durasi dipercepat menjadi 500 ms | [Beranda lokal](http://127.0.0.1:4321/WalianHub/); build dan uji browser terarah berhasil | "cukup sepertinya seperti ini" | Cocok untuk contoh Profil; lanjut penerapan ke judul section lain |
| 6 | Tahap 2 / seluruh komponen SectionHeading | Pola terpilih menjadi default; 500 ms; titik pembesaran mengikuti rata kiri/tengah | Build dan uji seluruh judul yang dirender pada desktop/ponsel berhasil; pratinjau aktif | Pengguna meminta penyeragaman | Penerapan selesai; menunggu penilaian keseluruhan |
| 6, revisi jeda | Tahap 2 / seluruh komponen SectionHeading | Jeda awal 100 ms; gerakan kiri + pop tetap 500 ms | Build dan git diff --check berhasil; pemeriksaan visual otomatis revisi belum dilakukan | "oke keren, tahap 2 selesai", 7 Oktober 2026 | Cocok; tahap 2 selesai |
| 7 | Tahap 3 / paragraf ringkasan Profil di Beranda | Fade 0,4 → 1 + naik 16 px; 600 ms; jeda awal 200 ms; sekali saat pertama masuk layar | Build dan uji Chrome desktop/ponsel, anchor, reduced motion, serta tanpa JavaScript berhasil | "keren juga, simple", lalu meminta alternatif, 7 Oktober 2026 | Disukai; mencoba alternatif sebelum memilih |
| 8 | Tahap 3 / paragraf ringkasan Profil di Beranda | Fade 0,4 → 1 + masuk dari kanan 20 px; 600 ms; jeda awal 200 ms | Build dan uji Chrome desktop/ponsel, overflow selama gerakan, anchor, reduced motion, dan tanpa JavaScript berhasil | "waw yang ini sepertinya cocok", lalu meminta penyeragaman, 7 Oktober 2026 | Cocok untuk contoh; diterapkan pada blok lain |
| 9 | Tahap 3 / seluruh blok isi terkait | Pola kanan + fade; 600 ms; jeda 200 ms; satu gerakan per blok | Build dan uji 25 blok di empat halaman pada desktop/ponsel, anchor, keyboard, panel program, reduced motion, dan tanpa JavaScript berhasil | Pengguna meminta melihat hasil pada bagian lain | Penerapan selesai; menunggu penilaian keseluruhan |
| 10 | Revisi tempo seluruh animasi dan ketikan | Durasi nonketikan ×1,25; judul 625 ms, isi 750 ms; ketikan judul 35 ms/huruf dan subjudul 18 ms/huruf | Build dan uji browser desktop/ponsel berhasil | "okey lumayanlah, kita lanjut ke tahap selanjutnya" | Tempo dan tahap 3 diterima; lanjut tahap 4 |
| 11 | Tahap 4 / kartu Domisili di Beranda | Naik 16 px + pop 96% → 101% → normal; fade 0,35 → 1; 1000 ms; jeda 200 ms | Build dan uji Chrome desktop/tablet/ponsel, hover, tautan, keyboard, anchor, reduced motion, serta tanpa JavaScript berhasil | Pengguna menilai gerakannya bagus, tetapi masih terlalu cepat | Gerakan disukai; durasi direvisi menjadi 1300 ms |
| 12 | Tahap 4 / revisi kecepatan kartu Domisili | Gerakan sama; durasi 1300 ms; jeda 200 ms | Build dan uji Chrome desktop/tablet/ponsel berhasil; hover, tautan, keyboard, anchor, reduced motion, dan tanpa JavaScript tetap bekerja | "nah itu keren", kemudian meminta mencoba empat kartu bertahap | Contoh diterima; lanjut percobaan grup |
| 13 | Tahap 4 / grup empat kartu layanan Beranda | Naik + pop 1300 ms; jeda awal 200 ms dan selisih 180 ms per batch yang masuk layar | Build dan uji Chrome desktop/tablet/ponsel berhasil; desktop/tablet 200/380/560/740 ms, ponsel mulai batch baru untuk kartu di bawah | "wah benar benar keren ini", meminta penyeragaman | Grup diterima; lanjut penyeragaman |
| 14 | Tahap 4 / seluruh jenis kartu dan simpul organisasi | Kartu: pola terpilih 1300 ms + jeda bertahap; simpul: pop lebih kecil, jeda menurut tingkat | Build dan uji empat halaman pada desktop/tablet/ponsel, carousel, bagan/zoom, layanan/anchor, keyboard, reduced motion, dan tanpa JavaScript berhasil; pengumuman kosong belum diuji terisi | Pengguna meminta penyeragaman pada elemen yang cocok | Penerapan selesai; menunggu penilaian keseluruhan kategori |
| 15 | Tahap 5 / pergantian foto hero | Foto baru fade 1800 ms di atas foto lama opacity 1; zoom/interval sebelumnya dipertahankan | Build dan uji Chrome desktop/tablet/ponsel berhasil; pratinjau dua gambar sementara pada port 4321 | "silahkan lanjut ke tahap 5", 7 Oktober 2026 | Tahap 4 diterima untuk melanjutkan; pergantian foto tahap 5 menunggu penilaian |
| 16 | Tahap 5 / seluruh foto dan slideshow | Fade 1800 ms; zoom linear 9800 ms; interval 8000 ms; pemilihan foto/jeda/keyboard; carousel dengan smooth native dan swipe | Build, 16 tes, dan uji browser 320–1280 px berhasil; contoh 0/1/3 foto, reduced motion, fallback, tanpa JavaScript, serta empat halaman diperiksa | "silahkan lanjut untuk selesaikan tahap 5" | Seluruh implementasi selesai; menunggu penilaian hasil akhir |
| 17 | Revisi tahap 5 dan tahap 6–7 | Foto setiap 2000 ms + fade 600 ms + zoom 2600 ms; menu 420/280 ms; layanan 450/320 ms; program 550/400 ms; hover/navbar/tombol/status diselaraskan | Build dan 16 tes main / 22 tes CMS; uji browser empat ukuran, keyboard, klik cepat, swipe, reduced motion, tanpa JavaScript berhasil | Pengguna meminta foto 2 detik, seluruh tahap tersisa sekaligus, dan checklist sebelum commit/push | Seluruh implementasi selesai; peninjauan akhir menggunakan CEK-ANIMASI.md |

Saat sebuah tahap dinyatakan cocok, catat hasil akhirnya:

| Tahap | Pola akhir dan parameter | Elemen yang sudah diterapkan | Konfirmasi pengguna | Catatan pemeriksaan |
|---|---|---|---|---|
| 1 / pola Beranda | Mengetik; 45 ms per huruf judul; 25 ms per huruf subjudul; tambahan jeda 200 ms; visibility dan fill backwards | Judul dan paragraf pembuka Beranda, Layanan, Profil, Wisata | "keren", lalu meminta masuk tahap 2, 6 Oktober 2026 | Build dan uji browser lolos; tahap 1 diterima |
| 2 / seluruh judul section | Masuk dari kiri + pop ringan; -32 px / 94% → +4 px / 102% → normal; jeda 100 ms; gerakan 500 ms; sekali saat pertama masuk layar | Seluruh label, judul, dan deskripsi pendek dalam komponen SectionHeading | "oke keren, tahap 2 selesai", 7 Oktober 2026 | Penerapan awal lolos build dan uji browser; revisi jeda lolos build dan git diff --check, diterima pengguna |
| 3 / isi section | Masuk dari kanan 20 px + fade 0,4 → 1; durasi terbaru 750 ms; jeda 200 ms | Ringkasan/foto Lurah, kontak/peta, visi/misi/program/sumber, pengaduan, footer | "okey lumayanlah, kita lanjut ke tahap selanjutnya", 7 Oktober 2026 | Build dan uji desktop/ponsel lolos; tahap 3 dan tempo terbaru diterima |
| 4 / kartu dan daftar | Naik + pop 96% → 101% → normal; 1300 ms; jeda 200 ms + urutan 180 ms, maksimum 740 ms; simpul memakai pop lebih kecil menurut tingkat | Kartu layanan/destinasi/statistik, daftar layanan/pengumuman, data lingkungan, simpul organisasi | "silahkan lanjut ke tahap 5", 7 Oktober 2026 | Build dan uji empat halaman desktop/tablet/ponsel lolos; pengumuman terisi belum diuji |

## 12.1. Revisi tempo keseluruhan — 7 Oktober 2026

Permintaan pengguna memperluas perubahan tempo ke semua animasi, termasuk kategori yang belum dievaluasi satu per satu. Bentuk gerakan tetap sama; durasi nonketikan ditambah 25%, sedangkan jeda kemunculan judul/isi tetap 100/200 ms. Status tahap 4–7 tetap belum dimulai karena perlambatan ini bukan penilaian akhir pola masing-masing kategori.

| Bagian | Sebelum | Parameter aktif |
|---|---|---|
| Judul section | 500 ms | 625 ms |
| Isi section | 600 ms | 750 ms |
| Kartu, simpul, dan efek muncul lain | 1100 ms | 1375 ms |
| Menu mobile buka / tutup | 380 / 260 ms | 475 / 325 ms |
| Program unggulan saat dibuka | 600 ms | 750 ms |
| Panel layanan tinggi / opacity | 440 / 360 ms | 550 / 450 ms |
| Panel layanan fallback | 420 ms | 525 ms |
| Hover kartu | 350 ms | 437,5 ms |
| Zoom foto destinasi | 800 ms | 1000 ms |
| Tombol | 200 ms | 250 ms |
| Navbar dan tombol kembali ke atas | 300 ms | 375 ms |
| Transisi default ikon/warna | 150 ms | 187,5 ms |
| Foto hero fade | 1000 ms | 1250 ms |
| Zoom hero / interval slideshow | 5 detik | 6,25 detik |
| Denyut lampu status | 1 detik | 1,25 detik |
| Ketikan judul per huruf | 45 ms | 35 ms |
| Ketikan subjudul per huruf | 25 ms | 18 ms |

Jeda subjudul otomatis dihitung ulang dari panjang judul dan kecepatan ketikan baru; tambahan jeda antarteks tetap 200 ms. Animasi visibility per huruf tetap 1 ms dengan fill backwards untuk mempertahankan perbaikan huruf hilang. Gulir halus native tetap mengikuti durasi yang ditentukan browser; interval pembaruan informasi status kantor tetap 30 detik.

**Pemeriksaan revisi:** build dan git diff --check berhasil. Chrome tanpa jendela pada desktop 1280×900 dan ponsel 390×844 memeriksa seluruh empat halaman: durasi judul 625 ms, isi 750 ms, efek muncul lain 1375 ms; ketikan 35/18 ms per huruf sesuai dan seluruh huruf tetap terlihat setelah animasi serta seleksi teks. Tidak ada overflow atau pengulangan animasi. Durasi CSS navbar, tombol kembali ke atas, tombol, hover kartu/foto, transisi default, slideshow, dan lampu status sesuai. Menu mobile memakai 475/325 ms dan klik buka–tutup cepat selesai dengan benar. Program unggulan memakai 750 ms; panel layanan memakai 550/450 ms dan hanya satu panel tetap terbuka. Anchor, keyboard, reduced motion, dan JavaScript dimatikan tetap berfungsi pada semua halaman. Tidak ada exception JavaScript baru. Penilaian kenyamanan tempo menunggu pengguna.

## 13. Acuan kode saat implementasi

| Bagian | File utama |
|---|---|
| Pembuka Beranda dan slideshow | [Hero.astro](src/components/home/Hero.astro) |
| Putaran foto, pilihan, jeda, dan penanganan transisi cepat | [slideshow.ts](src/lib/slideshow.ts) |
| Kontrol dan geseran carousel wisata | [carousel.ts](src/lib/carousel.ts), [FeaturedDestinations.astro](src/components/home/FeaturedDestinations.astro) |
| Buka–tutup tinggi panel program | [panel-program.ts](src/lib/panel-program.ts), [VisiMisi.astro](src/components/profil/VisiMisi.astro) |
| Penyusunan huruf untuk efek mengetik | [TeksKetik.astro](src/components/ui/TeksKetik.astro) |
| Parameter dan jeda pembuka bersama | [teks-ketik.ts](src/lib/teks-ketik.ts) |
| Pembuka Layanan | [layanan.astro](src/pages/layanan.astro) |
| Pembuka Profil | [KepalaHalaman.astro](src/components/profil/KepalaHalaman.astro) |
| Pembuka Wisata | [wisata.astro](src/pages/wisata.astro) |
| Judul section | [SectionHeading.astro](src/components/ui/SectionHeading.astro) |
| Sistem animasi scroll | [animasi.ts](src/lib/animasi.ts) |
| Gaya dan keyframe bersama | [global.css](src/styles/global.css) |
| Pemanggilan sistem animasi | [BaseLayout.astro](src/layouts/BaseLayout.astro) |
| Menu mobile | [MobileMenu.astro](src/components/layout/MobileMenu.astro) |
| Detail layanan | [ItemLayanan.astro](src/components/layanan/ItemLayanan.astro) |
| Program unggulan | [VisiMisi.astro](src/components/profil/VisiMisi.astro) |

Periksa kode aktual kembali ketika sebuah tahap dimulai, terutama jika checkout sudah menerima pembaruan sejak dokumen dibuat.
