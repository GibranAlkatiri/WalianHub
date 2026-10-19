// Penyajian saja: field CMS dan data tersimpan tidak diubah.
const agama = [
  ['kristen', 'Kristen'], ['katolik', 'Katolik'], ['islam', 'Islam'],
  ['hindu', 'Hindu'], ['buddha', 'Buddha'], ['konghucu', 'Konghucu'],
] as const;
type JumlahAgama = Partial<Record<(typeof agama)[number][0], number | null>>;
const positif = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function dataDemografi(jumlah: JumlahAgama = {}) {
  const rows = agama.map(([key, label]) => ({ label, jumlah: positif(jumlah[key]) ? jumlah[key]! : 0 }));
  const total = rows.reduce((sum, item) => sum + item.jumlah, 0);
  return { total, rows: rows.map((item) => ({ ...item, persen: total ? item.jumlah / total * 100 : 0 })) };
}
export function statistikKelurahan(lingkungan: { jumlahPenduduk?: number | null; luasKm2?: number | null }[], jumlahPenduduk?: number | null) {
  // Jumlah sebagian lingkungan tidak disajikan sebagai total kelurahan.
  const totalLengkap = (key: 'jumlahPenduduk' | 'luasKm2') => {
    if (!lingkungan.length || lingkungan.some((item) => typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key]! < 0)) return null;
    const total = lingkungan.reduce((sum, item) => sum + item[key]!, 0);
    return positif(total) ? total : null;
  };
  return { population: positif(jumlahPenduduk) ? jumlahPenduduk : totalLengkap('jumlahPenduduk'), environment: lingkungan.length || null, area: totalLengkap('luasKm2') };
}
