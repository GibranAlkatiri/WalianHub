import { HALAMAN_PENDUKUNG_SIAP } from './konfigurasi';

/**
 * Tujuan tautan menu: halaman pendukung jika sudah siap, atau anchor section di Beranda
 * selama Tahap 1 Langkah 1.
 */
export const tujuan = (halaman: string, anchor: string) => (HALAMAN_PENDUKUNG_SIAP ? halaman : `/#${anchor}`);

// Menu utama di header, menu HP, dan footer.
// Profil dan Layanan sudah menjadi halaman sendiri. Wisata masih menggulir ke section di Beranda sampai halamannya siap.
export const menuUtama = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: 'Layanan', href: '/layanan' },
  { label: 'Wisata', href: tujuan('/wisata', 'wisata') },
];

/** Tujuan tombol "Hubungi Kami": section Kontak di Beranda. */
export const tautanKontak = '/#kontak';

/** Pesan pembuka otomatis saat pengunjung membuka chat WhatsApp kantor kelurahan. */
export const pesanWhatsapp = 'Halo Kantor Kelurahan Walian, saya ingin bertanya tentang ';

/** Pesan pembuka otomatis untuk tombol pengaduan di halaman Layanan. */
export const pesanPengaduan = 'Halo Kantor Kelurahan Walian, saya ingin menyampaikan keluhan atau masukan: ';
