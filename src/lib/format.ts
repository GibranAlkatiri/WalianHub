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

/** Tautan chat WhatsApp. Nomor ditulis dengan kode negara, contoh 6281234567890. */
export function tautanWhatsapp(nomor: string, pesan?: string): string {
  return `https://wa.me/${nomor}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`;
}

/** Nomor WhatsApp untuk ditampilkan, contoh 6281356418736 → "0813-5641-8736". */
export function formatNomorWhatsapp(nomor: string): string {
  const lokal = nomor.startsWith('62') ? `0${nomor.slice(2)}` : nomor;
  return lokal.replace(/(\d{4})(?=\d)/g, '$1-');
}
