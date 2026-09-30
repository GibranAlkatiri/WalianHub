// Daftar kategori berita. Satu-satunya tempat untuk menambah atau mengganti kategori.
export const namaKategori = ['Pengumuman', 'Kegiatan', 'Pembangunan', 'Sosial & Kesehatan'] as const;

export type KategoriBerita = (typeof namaKategori)[number];

/** Nama kategori untuk alamat halaman, contoh "Sosial & Kesehatan" → "sosial-kesehatan". */
export function slugKategori(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
