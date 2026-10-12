# Batch penyederhanaan formulir CMS

Tanggal: 12 Oktober 2026. Branch: `frontend/cms-form-ringkas`, dari `origin/main` commit `9a8e8b7`.

Lingkup: frontend editor CMS. Pengguna menyetujui penyederhanaan formulir, memastikan berkas editor tidak sedang diedit rekan, dan meminta pembersihan branch lokal serta commit baru per batch. Modul baru `public/admin/compact-fields.js` termasuk frontend: menampilkan serta mengubah isian dalam memori editor, tanpa permintaan API atau penyimpanan sendiri.

## Pembagian batch

| Batch | Hasil | Status |
|---|---|---|
| 0 — Git | Cadangkan pekerjaan lokal, perbarui main, bereskan konflik referensi Windows, hapus 18 branch lokal yang sudah tergabung | Selesai lokal |
| 1 — Daftar teks | Persyaratan, alur, misi, dan program menjadi satu kotak; satu baris satu item | Commit `58c9122`, menunggu penilaian tampilan |
| 2 — Jadwal | Baris sejajar pada desktop, ringkasan yang dapat dibuka pada ponsel, Buka/Tutup, salin ke hari pilihan | Commit `e2c6f63`, menunggu penilaian tampilan |
| 3 — Daftar bertingkat | Libur, media sosial, tautan, pengumuman, foto, dan lingkungan dapat dilipat; input terkait berdampingan di desktop | Commit terpisah, menunggu penilaian tampilan |

Nama field, widget dalam konfigurasi, schema, dan format payload tetap sama. Tidak ada perubahan fungsi login, sesi, API, simpan, upload, atau publikasi. Perubahan `index.html` hanya memperbarui versi CSS. Item baru dibuka dan menerima fokus; ringkasan mengikuti isian; urutan dan hapus mempertahankan data item lain. Pesan validasi membuka tab dan item terkait, termasuk pesan dengan jalur field dari server.

Jadwal Jumat tidak ikut berubah kecuali dipilih sebagai tujuan salin. Memilih Tutup mengosongkan jam dan istirahat menjadi `null`; memilih Buka menawarkan jam sebelumnya atau jam dari hari aktif untuk diperiksa. Status lipatan merupakan keadaan tampilan, tidak ikut disimpan dalam konten.

## Pemeriksaan

- `bun test`: 160 lulus, 0 gagal.
- `bun run build`: 8 halaman berhasil.
- `git diff --check`: bersih.
- Browser Chrome pada 320, 390, 768, dan 1280 px: tidak ada overflow halaman atau exception JavaScript.
- Daftar teks: tempel beberapa baris, baris kosong, teks membungkus, daftar kosong, tab, serta simpan/buka kembali tetap menghasilkan array teks.
- Jadwal: edit jam, Buka/Tutup, istirahat, salin hari terpilih, simpan/buka kembali, serta preservasi Jumat dan hari tutup.
- Daftar bertingkat: tambah, urutkan, hapus, ringkasan, tab, input berdampingan, data numerik kosong, isi pengumuman dengan beberapa baris, fokus foto, serta item dengan validasi gagal.
- Keyboard Enter/Spasi, perubahan ukuran layar, pesan validasi server, thumbnail foto, dan penghapusan gambar diperiksa pada UI dengan fixture lokal.

Pengukuran tinggi formulir memakai salinan konten yang sama, tab yang sama, dan keadaan awal item dilipat. Angka bukan klaim untuk setiap konten atau ketika semua item dibuka.

| Formulir/tab | Sebelum, 390 px | Sesudah, 390 px | Pengurangan |
|---|---:|---:|---:|
| Layanan | 1.855 px | 1.435 px | 23% |
| Identitas Situs — Jam Layanan | 5.948 px | 1.200 px | 80% |
| Profil — Wilayah | 8.705 px | 1.312 px | 85% |
| Beranda | 1.028 px | 572 px | 44% |

Artefak pengukuran, screenshot, dan skrip browser berada di `.cms-backups/form-compact-20261012/`, yang diabaikan Git. Fixture browser mengisolasi API dan gambar; hasil ini membuktikan perilaku UI serta payload, bukan penyimpanan atau publikasi produksi. Panel native saat ini tidak memiliki pratinjau editor.

## Pembersihan Git dan pemulihan

Riwayat `main` yang berisi 130 commit dipertahankan. Main lokal diperbarui dengan fast-forward. Branch baru memiliki tiga commit fitur di atas; tidak ada perubahan riwayat yang sudah diterbitkan.

18 branch lokal yang sudah sepenuhnya tergabung di main dihapus dengan `git branch -d`. Untuk dua branch dengan tracking lama, upstream terlebih dahulu diselaraskan ke `origin/main` yang sudah memuat commit-nya. Tidak memakai force delete atau force push. Tiga branch pada worktree lain dipertahankan, begitu pula branch backend yang belum sepenuhnya tergabung. Branch GitHub tidak dihapus.

Windows memperlakukan nama path `CMS` dan `cms/...` sebagai benturan. Referensi remote lokal `origin/CMS` lama diarsipkan ke `refs/archive/windows-CMS` lalu dikeluarkan dari fetch melalui refspec lokal `^refs/heads/CMS`. Fetch branch `cms/...` kini berhasil. Branch `CMS` di GitHub tetap tersedia; pengecualian hanya berlaku untuk checkout ini.

Cadangan sebelum perubahan:

- Stash `cd76d6c30325c96738651e8b5a78622d71cfd6c1`: pekerjaan lokal sebelumnya, termasuk berkas yang belum dilacak.
- `.cms-backups/form-compact-20261012/history-before.bundle`: seluruh referensi/riwayat sebelum pembersihan, berhasil diverifikasi dengan `git bundle verify`.
- `.cms-backups/form-compact-20261012/refs-before.txt`: nama dan SHA branch sebelum pembersihan.
- `.cms-backups/form-compact-20261012/local-before.patch` dan salinan berkas: perubahan lokal sebelum pekerjaan.

Branch lokal dapat dibuat kembali dengan `git branch <nama-branch> <SHA-dari-refs-before.txt>`. Untuk memeriksa stash tanpa menerapkannya, gunakan `git stash show --stat --include-untracked cd76d6c30325c96738651e8b5a78622d71cfd6c1`. Jangan menerapkan seluruh stash di branch terbaru tanpa meninjau dahulu: sebagian perubahan editor lama sudah masuk main, dan patch stylesheet Decap lama tersimpan hanya sebagai cadangan.

Belum push, PR, merge, atau deployment. Penilaian UI dan publikasi mengikuti [AGENTS.md](AGENTS.md) serta [TAHAPAN-UI-CMS.md](TAHAPAN-UI-CMS.md).
