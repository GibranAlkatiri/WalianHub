// Identitas tetap tim KKT. Data ini milik frontend dan tidak terhubung ke CMS.
// Isian yang belum diberikan cukup dihilangkan; jangan mengarang identitas.
export interface AnggotaKkt {
  id: string;
  nama: string;
  panggilan: string;
  jabatan: string;
  fakultas?: string;
  prodi?: string;
}

export const anggotaKkt: readonly AnggotaKkt[] = [
  { id: 'aglen', nama: 'Jeversend S. Aglen Wowiling', panggilan: 'Aglen', jabatan: 'Koordinator Posko', fakultas: 'Teknik', prodi: 'Teknik Mesin' },
  { id: 'gin', nama: 'Regina A. Kalara', panggilan: 'Regina', jabatan: 'Sekretaris', fakultas: 'Teknik', prodi: 'Arsitektur' },
  { id: 'orica', nama: 'Orica Lumanaw', panggilan: 'Orica', jabatan: 'Bendahara', fakultas: 'Pertanian', prodi: 'Agroteknologi' },
  { id: 'reyna', nama: 'Reyna Gratia Rondo', panggilan: 'Reyna', jabatan: 'Koordinator Program', fakultas: 'Pertanian', prodi: 'Agribisnis' },
  { id: 'luna', nama: 'Christa Luna Lumentah', panggilan: 'Luna', jabatan: 'Anggota Program', fakultas: 'Ekonomi dan Bisnis', prodi: 'Manajemen' },
  { id: 'feitri', nama: 'Feitri Maria Taaraungan', panggilan: 'Feitri', jabatan: 'Anggota Program 2', fakultas: 'MIPA', prodi: 'Kimia' },
  { id: 'gee', nama: 'Geraldy J. Clayden Pilat', panggilan: 'Geraldy', jabatan: 'Koordinator Humas', fakultas: 'MIPA', prodi: 'Fisika' },
  { id: 'karin', nama: 'Bernadeth K. A. A. Simarmata', panggilan: 'Bernadeth', jabatan: 'Anggota Humas', fakultas: 'MIPA', prodi: 'Sistem Informasi' },
  { id: 'grace', nama: 'Grace Tandi Payung', panggilan: 'Grace', jabatan: 'Anggota Humas 2', fakultas: 'Teknik', prodi: 'Teknik Informatika' },
  { id: 'putri', nama: 'Marchanda V. P. Mandagi', panggilan: 'Marchanda', jabatan: 'Koordinator Publikasi & Dokumentasi', fakultas: 'Kedokteran', prodi: 'Ilmu Keperawatan' },
  { id: 'liv', nama: 'Olivia Mailafasya Lantapa', panggilan: 'Olivia', jabatan: 'Anggota Publikasi & Dokumentasi 2', fakultas: 'Kedokteran', prodi: 'Ilmu Keperawatan' },
  { id: 'grey', nama: 'Graciano Paulus Tilaar', panggilan: 'Graciano', jabatan: 'Koordinator Perlengkapan', fakultas: 'Teknik', prodi: 'Teknik Informatika' },
  { id: 'afril', nama: 'Afrilia Turangan', panggilan: 'Afrilia', jabatan: 'Anggota Perlengkapan', fakultas: 'Kedokteran', prodi: 'Ilmu Keperawatan' },
  { id: 'gibran', nama: 'M. Gibran Alkatiri', panggilan: 'Gibran', jabatan: 'Koordinator Pelaporan', fakultas: 'Teknik', prodi: 'Teknik Informatika' },
  { id: 'jess', nama: 'Jessica Manese', panggilan: 'Jessica', jabatan: 'Anggota Pelaporan', fakultas: 'Kedokteran', prodi: 'Ilmu Keperawatan' },
];

export function identitasKkt(anggota: AnggotaKkt) {
  return [
    ['Fakultas', anggota.fakultas],
    ['Program studi', anggota.prodi],
  ].filter((baris): baris is [string, string] => Boolean(baris[1]));
}
