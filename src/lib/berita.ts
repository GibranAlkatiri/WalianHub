// Fungsi bantu untuk mengambil dan memotong daftar berita per halaman.
import { getCollection, type CollectionEntry } from 'astro:content';

export const BERITA_PER_HALAMAN = 9;

/** Semua berita yang bukan draf, diurutkan dari tanggal terbaru. */
export async function ambilBeritaTerbit(): Promise<CollectionEntry<'berita'>[]> {
  const berita = await getCollection('berita', ({ data }) => !data.draf);
  return berita.sort((a, b) => b.data.tanggal.getTime() - a.data.tanggal.getTime());
}

export function jumlahHalaman(total: number): number {
  return Math.max(1, Math.ceil(total / BERITA_PER_HALAMAN));
}

/** Mengambil berita untuk halaman tertentu (dimulai dari 1). */
export function potongHalaman<T>(daftar: T[], nomor: number): T[] {
  const awal = (nomor - 1) * BERITA_PER_HALAMAN;
  return daftar.slice(awal, awal + BERITA_PER_HALAMAN);
}

/** Alamat halaman daftar berita, tanpa base path. */
export function alamatDaftarBerita(slugKategori?: string, nomor = 1): string {
  const dasar = slugKategori ? `/berita/kategori/${slugKategori}` : '/berita';
  return nomor > 1 ? `${dasar}/halaman/${nomor}` : dasar;
}
