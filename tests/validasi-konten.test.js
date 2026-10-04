import { describe, expect, test } from 'bun:test';
import { jadwalHari, tanggalKonten, tanggalIso, tautanOpsional, teksWajib } from '../src/lib/validasi-konten';

describe('Kontrak isian CMS', () => {
  test('data contoh diperbolehkan dan teks wajib tidak boleh kosong', () => {
    expect(teksWajib.parse('  [Nama surat]  ')).toBe('[Nama surat]');
    expect(teksWajib.safeParse('   ').success).toBe(false);
  });
  test('tanggal kalender sungguhan, termasuk tahun kabisat dan Date dari YAML', () => {
    expect(tanggalIso.safeParse('2028-02-29').success).toBe(true);
    for (const nilai of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-10-4']) {
      expect(tanggalIso.safeParse(nilai).success).toBe(false);
    }
    expect(tanggalKonten.parse('2026-10-04').toISOString()).toBe('2026-10-04T00:00:00.000Z');
    expect(tanggalKonten.parse(new Date('2026-10-04')).toISOString()).toBe('2026-10-04T00:00:00.000Z');
    expect(tanggalKonten.safeParse(null).success).toBe(false);
  });
  test('tautan opsional kosong valid; tautan terisi harus alamat web lengkap', () => {
    for (const nilai of ['', undefined, 'https://contoh.go.id', 'http://contoh.go.id']) {
      expect(tautanOpsional.safeParse(nilai).success).toBe(true);
    }
    for (const nilai of ['javascript:alert(1)', 'contoh.go.id', 'ftp://contoh.go.id']) {
      expect(tautanOpsional.safeParse(nilai).success).toBe(false);
    }
  });
  const jadwal = { hari: 'Senin', buka: '08.00', tutup: '16.30', istirahat: { mulai: '12.00', selesai: '13.00' } };
  test('jadwal buka dan hari tutup valid', () => {
    expect(jadwalHari.safeParse(jadwal).success).toBe(true);
    expect(jadwalHari.safeParse({ ...jadwal, buka: null, tutup: null, istirahat: null }).success).toBe(true);
  });
  test('jam terbalik, istirahat di luar jadwal, dan hari tutup dengan istirahat ditolak', () => {
    for (const nilai of [
      { ...jadwal, tutup: '07.00' },
      { ...jadwal, buka: null },
      { ...jadwal, buka: null, tutup: null },
      { ...jadwal, istirahat: { mulai: '13.00', selesai: '12.00' } },
      { ...jadwal, istirahat: { mulai: '06.00', selesai: '07.00' } },
    ]) expect(jadwalHari.safeParse(nilai).success).toBe(false);
  });
});
