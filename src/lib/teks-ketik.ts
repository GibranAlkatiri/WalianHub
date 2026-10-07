// Pola pembuka yang dipilih pada Beranda, dipakai juga pada halaman lainnya.
export const JEDA_HURUF_JUDUL = 35;
export const JEDA_HURUF_SUBJUDUL = 18;
const JEDA_ANTAR_TEKS = 200;

export function jedaSubjudulKetik(judul: string): number {
  const pemisah = new Intl.Segmenter('id', { granularity: 'grapheme' });
  return Array.from(pemisah.segment(judul)).length * JEDA_HURUF_JUDUL + JEDA_ANTAR_TEKS;
}
