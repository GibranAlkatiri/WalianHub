import { z } from 'astro/zod';
import { namaHari } from './jam-layanan';

/** Teks contoh tetap diperbolehkan; isian wajib tidak boleh hanya berisi spasi. */
export const teksWajib = z.string().trim().min(1, 'Isian ini wajib diisi');

/** Tautan opsional boleh kosong. Tautan terisi harus memakai HTTP atau HTTPS. */
export const tautanWeb = z.string().trim().url('Tulis alamat lengkap, misalnya https://contoh.go.id')
  .refine((nilai) => /^https?:\/\//i.test(nilai), 'Tautan harus memakai http:// atau https://');
export const tautanOpsional = z.union([tautanWeb, z.literal('')]).optional();

export const tanggalIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((nilai) => {
    const tanggal = new Date(`${nilai}T00:00:00Z`);
    return !Number.isNaN(tanggal.getTime()) && tanggal.toISOString().slice(0, 10) === nilai;
  }, 'Tanggal tidak valid');

/** YAML dapat membaca tanggal sebagai Date; JSON dan CMS menggunakan YYYY-MM-DD. */
export const tanggalKonten = z.preprocess(
  (nilai) => nilai instanceof Date && !Number.isNaN(nilai.getTime()) ? nilai.toISOString().slice(0, 10) : nilai,
  tanggalIso.transform((nilai) => new Date(`${nilai}T00:00:00Z`)),
);

export const jam = z.string().regex(/^([01]\d|2[0-3])\.[0-5]\d$/, 'Format jam harus "08.00"');

export const jadwalHari = z.object({
  hari: z.enum(namaHari),
  buka: jam.nullable(),
  tutup: jam.nullable(),
  istirahat: z.object({ mulai: jam, selesai: jam }).nullable(),
}).superRefine((nilai, ctx) => {
  const salah = (message: string, path: string[]) => ctx.addIssue({ code: 'custom', message, path });
  if ((nilai.buka === null) !== (nilai.tutup === null)) {
    salah('Jam buka dan jam tutup harus diisi keduanya, atau dikosongkan keduanya', ['tutup']);
    return;
  }
  if (nilai.buka === null || nilai.tutup === null) {
    if (nilai.istirahat) salah('Hari tutup tidak boleh memiliki jam istirahat', ['istirahat']);
    return;
  }
  // Format selalu HH.MM dengan dua digit, sehingga dapat dibandingkan langsung.
  if (nilai.buka >= nilai.tutup) salah('Jam tutup harus setelah jam buka', ['tutup']);
  if (nilai.istirahat && (
    nilai.istirahat.mulai >= nilai.istirahat.selesai ||
    nilai.istirahat.mulai < nilai.buka || nilai.istirahat.selesai > nilai.tutup
  )) salah('Jam istirahat harus berurutan dan berada di dalam jam layanan', ['istirahat']);
});
