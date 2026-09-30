// Jadwal jam layanan kantor kelurahan, dan status buka, istirahat, atau tutup menurut waktu WITA.
// File ini tidak memakai modul Astro, karena ikut dijalankan di browser pengunjung.

export const namaHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
export type NamaHari = (typeof namaHari)[number];

export interface JadwalHari {
  hari: NamaHari;
  /** Format "08.00". null jika kantor tutup sepanjang hari. */
  buka: string | null;
  tutup: string | null;
  /** null jika hari itu tanpa istirahat. */
  istirahat: { mulai: string; selesai: string } | null;
}

export interface DataJamLayanan {
  jadwal: JadwalHari[];
  /** Tanggal libur dalam format "2026-12-25". */
  tanggalLibur: { tanggal: string; keterangan: string }[];
}

export type StatusLayanan = 'buka' | 'istirahat' | 'tutup';

/** WITA = UTC+8, tanpa perubahan jam musiman. */
const SELISIH_WITA_MS = 8 * 60 * 60 * 1000;

/** "08.00" → 480 (menit sejak pukul 00.00). */
function keMenit(jam: string): number {
  const [j, m] = jam.split('.').map(Number);
  return j * 60 + m;
}

function teksJam(buka: string, tutup: string): string {
  return `${buka} - ${tutup} WITA`;
}

/** Status kantor pada waktu tertentu, selalu dihitung dalam WITA di mana pun pengunjung berada. */
export function statusLayanan(data: DataJamLayanan, sekarang: Date): { status: StatusLayanan; teks: string } {
  const wita = new Date(sekarang.getTime() + SELISIH_WITA_MS);
  const tanggal = wita.toISOString().slice(0, 10);
  const hari = namaHari[(wita.getUTCDay() + 6) % 7];
  const menit = wita.getUTCHours() * 60 + wita.getUTCMinutes();
  const jadwal = data.jadwal.find((item) => item.hari === hari);
  const tutup = { status: 'tutup', teks: 'Kantor tutup' } as const;

  if (data.tanggalLibur.some((libur) => libur.tanggal === tanggal)) return tutup;
  if (!jadwal?.buka || !jadwal.tutup) return tutup;
  if (menit < keMenit(jadwal.buka) || menit >= keMenit(jadwal.tutup)) return tutup;

  const teks = `${hari}: ${teksJam(jadwal.buka, jadwal.tutup)}`;
  const { istirahat } = jadwal;
  if (istirahat && menit >= keMenit(istirahat.mulai) && menit < keMenit(istirahat.selesai)) {
    return { status: 'istirahat', teks };
  }
  return { status: 'buka', teks };
}

/** Jadwal satu minggu yang diringkas, contoh "Senin–Kamis" dan "08.00 - 16.30 WITA". Jam istirahat tidak ditampilkan. */
export function ringkasJadwal(jadwal: JadwalHari[]): { hari: string; jam: string }[] {
  const kelompok: { awal: NamaHari; akhir: NamaHari; jam: string }[] = [];
  for (const hari of namaHari) {
    const item = jadwal.find((j) => j.hari === hari);
    const jam = item?.buka && item.tutup ? teksJam(item.buka, item.tutup) : 'Tutup';
    const terakhir = kelompok.at(-1);
    if (terakhir && terakhir.jam === jam) terakhir.akhir = hari;
    else kelompok.push({ awal: hari, akhir: hari, jam });
  }
  return kelompok.map((k) => ({ hari: k.awal === k.akhir ? k.awal : `${k.awal}–${k.akhir}`, jam: k.jam }));
}
