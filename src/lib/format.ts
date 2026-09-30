// Fungsi bantu untuk menampilkan data dalam format Indonesia.

/** Contoh: 28 September 2026 (zona waktu WITA). */
export function formatTanggal(tanggal: Date): string {
  return tanggal.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  });
}

/** Tanggal untuk atribut datetime pada <time>, contoh: 2026-09-28. */
export function tanggalIso(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

/** Contoh: 4535 → "4.535". Angka yang belum ada (null) dikembalikan sebagai null. */
export function formatAngka(angka: number | null | undefined): string | null {
  return angka == null ? null : angka.toLocaleString('id-ID');
}
