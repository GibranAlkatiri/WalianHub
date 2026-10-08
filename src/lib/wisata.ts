/** Sampai empat destinasi, seluruhnya cukup ditampilkan di Beranda. */
export const BATAS_WISATA_BERANDA = 4;

interface PilihanDestinasi {
  id: string;
  data: { nama: string; unggulan: boolean; urutan: number };
}

/** Satu aturan untuk kartu Beranda, menu desktop/HP, dan footer. */
export function susunWisata<T extends PilihanDestinasi>(daftar: T[]) {
  const semua = [...daftar].sort(
    (a, b) => a.data.urutan - b.data.urutan || a.data.nama.localeCompare(b.data.nama, 'id') || a.id.localeCompare(b.id),
  );
  const pakaiHalaman = semua.length > BATAS_WISATA_BERANDA;
  // Pada daftar besar, dahulukan pilihan staf. Jika kurang dari empat, lengkapi dari urutan daftar.
  const pilihan = pakaiHalaman
    ? [...semua.filter((item) => item.data.unggulan), ...semua.filter((item) => !item.data.unggulan)].slice(0, BATAS_WISATA_BERANDA)
    : semua;

  return { semua, pilihan, pakaiHalaman, href: pakaiHalaman ? '/wisata' : '/#wisata' };
}

/**
 * Tautan tombol "Cek Lokasi". Jika kolom Alamat berisi tautan (mis. Google
 * Maps, termasuk tautan pendek maps.app.goo.gl yang tidak bisa diurai jadi
 * angka), tautan itu dipakai langsung agar titiknya persis. Jika tidak,
 * dirakit dari angka lat/lng sebagai fallback.
 */
export const tautanPetaDestinasi = (
  lokasi: { lat: number; lng: number },
  alamat?: string,
) => {
  const trimAlamat = (alamat ?? '').trim();
  if (/^https?:\/\//i.test(trimAlamat)) return trimAlamat;
  return `https://www.google.com/maps/search/?api=1&query=${lokasi.lat},${lokasi.lng}`;
};
