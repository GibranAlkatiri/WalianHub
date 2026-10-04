import { wisata } from './data-wisata';

// Menu utama di header, menu HP, dan footer.
// Wisata menggulir ke Beranda sampai empat destinasi, lalu membuka halaman daftar mulai lima.
export const menuUtama = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: 'Layanan', href: '/layanan' },
  { label: 'Wisata', href: wisata.href, halaman: '/wisata' },
];

/** Tujuan tombol "Hubungi Kami": section Kontak di Beranda. */
export const tautanKontak = '/#kontak';

/** Pesan pembuka otomatis saat pengunjung membuka chat WhatsApp kantor kelurahan. */
export const pesanWhatsapp = 'Halo Kantor Kelurahan Walian, saya ingin bertanya tentang ';

/** Pesan pembuka otomatis untuk tombol pengaduan di halaman Layanan. */
export const pesanPengaduan = 'Halo Kantor Kelurahan Walian, saya ingin menyampaikan keluhan atau masukan: ';
