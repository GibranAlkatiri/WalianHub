import { describe, expect, test } from 'bun:test';
import { susunWisata, tautanPetaDestinasi } from '../src/lib/wisata';

const destinasi = (jumlah) => Array.from({ length: jumlah }, (_, i) => ({
  id: `destinasi-${i + 1}`,
  data: { nama: `Destinasi ${i + 1}`, unggulan: false, urutan: i + 1 },
}));

describe('Wisata mengikuti perubahan konten CMS', () => {
  for (const jumlah of [0, 1, 2, 3, 4]) {
    test(`${jumlah} destinasi tetap di Beranda, termasuk yang tidak ditandai unggulan`, () => {
      const hasil = susunWisata(destinasi(jumlah));
      expect(hasil.href).toBe('/#wisata');
      expect(hasil.pakaiHalaman).toBe(false);
      expect(hasil.pilihan).toHaveLength(jumlah);
    });
  }
  for (const jumlah of [5, 6, 12]) {
    test(`${jumlah} destinasi memakai halaman daftar dan empat kartu Beranda`, () => {
      const hasil = susunWisata(destinasi(jumlah));
      expect(hasil.href).toBe('/wisata');
      expect(hasil.semua).toHaveLength(jumlah);
      expect(hasil.pilihan).toHaveLength(4);
    });
  }
  test('pilihan staf didahulukan dan sisanya dilengkapi sesuai urutan', () => {
    const data = destinasi(6);
    data[5].data.unggulan = true;
    const hasil = susunWisata(data);
    expect(hasil.pilihan.map((item) => item.id)).toEqual(['destinasi-6', 'destinasi-1', 'destinasi-2', 'destinasi-3']);
    expect(data.map((item) => item.id)).toEqual(destinasi(6).map((item) => item.id));
  });
  test('lebih dari empat unggulan tetap dibatasi dan jumlah turun mengembalikan menu', () => {
    const data = destinasi(6).map((item) => ({ ...item, data: { ...item.data, unggulan: true } }));
    expect(susunWisata(data).pilihan.map((item) => item.id)).toEqual(['destinasi-1', 'destinasi-2', 'destinasi-3', 'destinasi-4']);
    expect(susunWisata(data.slice(0, 2)).href).toBe('/#wisata');
  });
  test('tombol lokasi memakai koordinat destinasi', () => {
    expect(tautanPetaDestinasi({ lat: -1.25, lng: 124.8 })).toBe('https://www.google.com/maps/search/?api=1&query=-1.25,124.8');
  });
});
