# Akun staf dengan persetujuan pengelola

Status: perubahan untuk preview; belum mengganti autentikasi produksi.

Catatan kelanjutan dan batas izin publikasi: [SERAH-TERIMA-ADMIN.md](SERAH-TERIMA-ADMIN.md).

Alur staf: daftar nama dan email → verifikasi email → menunggu persetujuan pemilik → tautan pembuatan password → masuk dengan email dan password. Persetujuan tidak diulang pada login berikutnya. Email dapat diingat pada perangkat yang dipilih pengguna.

Pengelola memakai akun tersendiri. Password pengelola perlu diikuti konfirmasi melalui tautan email sekali pakai. Menu Akses staf menampilkan pendaftaran, Setujui, Tolak, Kirim tautan password, dan Cabut akses. Hanya sesi pengelola yang baru dibuat dalam 15 menit terakhir dapat mengatur staf. Akun staf tidak dapat mengubah peran atau menyetujui pendaftar lain.

## Pengaturan

- Terapkan migration `0005_staff_auth.sql` pada database preview tersendiri.
- `CMS_STAFF_AUTH=1` dan `CMS_SESSION_AUTH=1` mengaktifkan login baru. Mode lama tetap berlaku saat flag staf mati; saat flag staf hidup, konfigurasi rusak tidak kembali ke autentikasi token GitHub.
- `CMS_OWNER_EMAIL` menentukan satu akun pemilik. Akun pemilik dibuat secara operasional setelah identitas pengelola diperiksa; pendaftaran publik selalu membuat peran staf.
- `CMS_AUTH_ORIGIN` harus tepat sama dengan origin login. Tautan email dibentuk dari pengaturan server, bukan input pengguna.
- `CMS_MAIL_ENDPOINT` adalah Web app Google Apps Script `/exec`; `CMS_MAIL_SECRET` adalah rahasia HMAC minimal 32 karakter. Salin `scripts/cms-mail-google.gs` ke akun pengelola; simpan rahasia di Script Properties, bukan kode. Jalankan `autorizarEmail`, lalu deploy sebagai pemilik dengan akses Anyone. Pengiriman ditolak jika tanda tangan tidak valid, timestamp terlalu lama, atau permintaan telah dipakai. Skrip hanya meminta akses pengiriman email.
- `CMS_TURNSTILE_SITE_KEY` dan `CMS_TURNSTILE_SECRET` melindungi pendaftaran dan pemulihan password. Verifikasi server memeriksa action dan hostname.
- `CMS_AUTH_PREVIEW=1` menampilkan keterangan pratinjau pada login.
- Runtime memerlukan dukungan `node:crypto` dan `nodejs_compat`. Password memakai scrypt N=32768, r=8, p=3, salt acak; minimal 15 karakter. Uji penggunaan CPU dan memori di Cloudflare sebelum publikasi.

## Pemeriksaan sebelum produksi

1. Akun belum terverifikasi dan belum disetujui tidak dapat memakai CMS, API konten, atau upload.
2. Email sungguhan diterima oleh staf uji dan pemilik; tautan sekali pakai tidak dapat digunakan ulang. Link scanner tidak mengaktifkan tautan karena tindakan memerlukan POST dari halaman login.
3. Staf membuat password sendiri, lalu login lagi tanpa persetujuan ulang.
4. Pengelola menyetujui/menolak pendaftaran; staf tidak dapat mengakses menu/API pengelolaan staf. Password, hash, dan tautan tidak tampil pada daftar.
5. Reset password dan pencabutan akses membatalkan sesi lama. Permintaan persetujuan bersamaan diperiksa dengan versi.
6. Periksa browser desktop dan ponsel, tes, build, batas runtime, cadangan, dan pemulihan. Kuota serta kegagalan pengiriman email perlu diperiksa pada layanan sungguhan.
7. Pengguna mengizinkan commit/push dan draft PR untuk kolaborasi sebelum uji pengguna selesai. Merge, publikasi produksi, migrasi D1 produksi, dan penyesuaian Cloudflare Access tetap dilakukan setelah uji pengguna berhasil dan pemeriksaan/izin publikasi terpenuhi. Jangan membuka jalur admin/API sebelum login baru teruji. Hostname preview, URL deployment, dan domain lain harus diperiksa bersama.

Tautan verifikasi ada di fragmen URL dan dihapus dari address bar oleh klien sebelum digunakan. Browser tidak menyimpan password atau token sesi pada localStorage. Cookie sesi memakai Secure, HttpOnly, dan SameSite=Strict; setiap pembacaan sesi memeriksa status akun serta versi kredensial. Akses publik tetap membaca konten terbit.

Serializer email mengubah karakter non-ASCII menjadi escape JSON sebelum menandatangani payload HMAC; penerima tetap mendapatkan teks Unicode utuh. Header POST menyatakan charset UTF-8. Pertahankan penanganan ini: pengiriman nyata yang berisi karakter khusus pernah gagal sebelum perbaikan, dan tes memastikan tanda tangan serta isi pesan tetap cocok.

Tautan akun tetap menampilkan formulir verifikasi/password ketika browser mempunyai sesi CMS. Halaman akses staf menyediakan tautan `./?reauth=staff` pada kegagalan 401/403; parameter tersebut memaksa formulir masuk ulang tampil tanpa mengubah hak akses. Login yang berhasil merotasi sesi browser sebelumnya. Pengelola memerlukan password dan konfirmasi email baru; jangan memberikan sesi dari parameter URL.

Konfirmasi email pengelola adalah perlindungan tambahan yang bergantung pada keamanan inbox; tidak setara dengan passkey yang tahan phishing. Aktifkan verifikasi dua langkah pada akun Google pengelola dan pertahankan perlindungan Access produksi sampai uji migrasi selesai.
