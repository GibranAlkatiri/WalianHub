// Ringkasan publik hanya berasal dari angka per lingkungan.
export interface AngkaLingkungan {
  kepalaKeluarga?: number | null;
  jumlahPenduduk?: number | null;
  luasKm2?: number | null;
}
const angkaValid = (nilai: unknown): nilai is number => typeof nilai === 'number' && Number.isFinite(nilai) && nilai >= 0;
const metrik = [
  ['kepalaKeluarga', 'KK'], ['jumlahPenduduk', 'Penduduk'], ['luasKm2', 'Luas'],
] as const;

export function statistikKelurahan(lingkungan: AngkaLingkungan[]) {
  const jumlahTerisi = (key: keyof AngkaLingkungan) => {
    const angka = lingkungan.map(item => item[key]).filter(angkaValid);
    return angka.length ? angka.reduce((sum, nilai) => sum + nilai, 0) : null;
  };
  return {
    family: jumlahTerisi('kepalaKeluarga'),
    population: jumlahTerisi('jumlahPenduduk'),
    environment: lingkungan.length || null,
    area: jumlahTerisi('luasKm2'),
  };
}

export function cakupanStatistikKelurahan(lingkungan: AngkaLingkungan[]) {
  return metrik.map(([key, label]) => ({ label, terisi: lingkungan.filter(item => angkaValid(item[key])).length }))
    .filter(item => item.terisi > 0)
    .map(item => `${item.label}: ${item.terisi} dari ${lingkungan.length} lingkungan`)
    .join('; ');
}
