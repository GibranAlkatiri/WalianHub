// Bagan struktur organisasi: daftar jabatan dari CMS disusun menjadi pohon, dimulai dari kotak Lurah.
// Setiap jabatan mencatat atasannya, jadi alur bagan ikut berubah saat atasan diganti atau jabatan ditambah.

/** Kotak paling atas. Jabatan yang langsung di bawah Lurah diisi atasan "Lurah". */
export const PUNCAK = 'Lurah';

export interface JabatanBagan {
  jabatan: string;
  nama: string[];
  atasan: string;
  /** Kotak di cabang samping garis (misalnya Sekretaris), bukan di baris bawahan. */
  garisSamping: boolean;
}

export interface SimpulBagan {
  jabatan: string;
  /** Nama pejabat. Kosong berarti jabatan belum terisi. */
  nama: string[];
  samping: SimpulBagan[];
  bawahan: SimpulBagan[];
}

/** Pesan kesalahan jika daftar jabatan tidak bisa disusun menjadi satu bagan. Daftar kosong berarti aman. */
export function cekBagan(daftar: JabatanBagan[]): string[] {
  const pesan: string[] = [];
  const semua = daftar.map((item) => item.jabatan);
  daftar.forEach((item, i) => {
    if (item.jabatan === PUNCAK || semua.indexOf(item.jabatan) !== i) {
      pesan.push(`Jabatan "${item.jabatan}" ditulis lebih dari sekali. Setiap jabatan di bagan harus berbeda.`);
    }
    if (item.atasan !== PUNCAK && !semua.includes(item.atasan)) {
      pesan.push(`Atasan "${item.atasan}" untuk jabatan "${item.jabatan}" tidak ditemukan. Isi dengan "${PUNCAK}" atau nama jabatan lain di bagan.`);
    }
    if (item.garisSamping && daftar.some((lain) => lain.atasan === item.jabatan)) {
      pesan.push(`Jabatan "${item.jabatan}" memakai garis samping, jadi tidak bisa menjadi atasan jabatan lain.`);
    }
  });
  // Setiap jabatan harus tersambung sampai ke Lurah, tanpa saling menjadi atasan.
  const atasanDari = new Map(daftar.map((item) => [item.jabatan, item.atasan]));
  for (const item of daftar) {
    const dilewati = new Set([item.jabatan]);
    let atasan = item.atasan;
    while (atasan !== PUNCAK && atasanDari.has(atasan)) {
      if (dilewati.has(atasan)) {
        pesan.push(`Jabatan "${item.jabatan}" tidak tersambung ke ${PUNCAK}, karena atasannya saling berputar.`);
        break;
      }
      dilewati.add(atasan);
      atasan = atasanDari.get(atasan)!;
    }
  }
  return [...new Set(pesan)];
}

/** Menyusun daftar jabatan menjadi pohon. Urutan kotak dari kiri ke kanan mengikuti urutan di daftar. */
export function susunBagan(namaLurah: string, daftar: JabatanBagan[]): SimpulBagan {
  const isiNama = (nama: string[]) => nama.map((item) => item.trim()).filter(Boolean);
  const buat = (jabatan: string, nama: string[]): SimpulBagan => {
    const anak = daftar.filter((item) => item.atasan === jabatan);
    return {
      jabatan,
      nama: isiNama(nama),
      samping: anak.filter((item) => item.garisSamping).map((item) => buat(item.jabatan, item.nama)),
      bawahan: anak.filter((item) => !item.garisSamping).map((item) => buat(item.jabatan, item.nama)),
    };
  };
  return buat(PUNCAK, [namaLurah]);
}
