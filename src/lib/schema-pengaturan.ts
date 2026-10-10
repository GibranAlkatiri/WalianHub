// Kontrak Pengaturan yang dipakai build website dan API CMS.
import { z } from 'astro/zod';
import { cekBagan } from './bagan';
import { teksWajib, tautanWeb, tautanOpsional, tanggalIso, tanggalKonten, jadwalHari } from './validasi-konten';
const angkaAtauKosong = z.number().nonnegative().nullable();
const nomorWhatsapp = z
  .string()
  .trim()
  .regex(/^\d{8,15}$/, 'Tulis nomor WhatsApp dengan kode negara, tanpa + dan spasi. Contoh: 6281234567890');

export const situsSchema = z.object({
    namaKelurahan: teksWajib,
    kecamatan: teksWajib,
    kota: teksWajib,
    provinsi: teksWajib,
    alamat: teksWajib,
    koordinat: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    googleMapsUrl: tautanOpsional,
    /** Nomor WhatsApp kantor dengan kode negara, contoh 6281234567890. */
    whatsapp: z.string().trim().pipe(z.union([nomorWhatsapp, z.literal('')])).optional(),
    /** Kosongkan jika belum ada. Selama kosong, email tidak ditampilkan. */
    email: z.string().trim().pipe(z.union([z.string().email('Alamat email tidak valid'), z.literal('')])).optional(),
    jamLayanan: z.object({
      jadwal: z
        .array(jadwalHari)
        .length(7)
        .refine((jadwal) => new Set(jadwal.map((h) => h.hari)).size === 7, 'Setiap hari harus ada tepat satu kali'),
      tanggalLibur: z
        .array(z.object({ tanggal: tanggalIso, keterangan: teksWajib }))
        .default([]),
    }),
    mediaSosial: z
      .array(
        z.object({
          platform: z.enum(['facebook', 'instagram', 'youtube', 'tiktok']),
          url: tautanWeb,
        }),
      )
      .default([]),
    tautanPenting: z.array(z.object({ label: teksWajib, url: tautanWeb })).default([]),
    kredit: teksWajib,
  });

export const berandaSchema = z.object({
    hero: z.object({
      judul: teksWajib,
      subjudul: teksWajib,
      /** Foto latar hero, sesuai urutan. Lebih dari satu foto berganti otomatis. Kosong: gambar default. */
      foto: z
        .array(
          z.object({
            gambar: z.string().trim(),
            /** Isi foto, contoh "Kantor Kelurahan Walian". Tidak tampil di layar, tetapi dibacakan screen reader. */
            keterangan: teksWajib,
            /** Bagian foto yang tetap terlihat saat foto terpotong di layar sempit. */
            posisi: z.enum(['kiri', 'tengah', 'kanan']).default('tengah'),
          }),
        )
        .max(5)
        .default([]),
    }),
  });

export const profilSchema = z.object({
    ringkasan: teksWajib,
    /** Lurah yang sedang menjabat. Foto kosong: gambar default. Sebaiknya foto tegak (rasio 3:4). */
    lurah: z.object({ nama: teksWajib, foto: z.string().trim().optional() }),
    /**
     * Bagan struktur organisasi di bawah kotak Lurah. Setiap jabatan mencatat atasannya ("Lurah" atau jabatan lain).
     * Nama kosong tampil sebagai "[kosong]". Jika atasan tidak ditemukan atau saling berputar, build gagal.
     */
    strukturOrganisasi: z
      .array(
        z.object({
          jabatan: teksWajib,
          nama: z.array(z.string()).default([]),
          atasan: teksWajib,
          garisSamping: z.boolean().default(false),
        }),
      )
      .default([])
      .superRefine((daftar, ctx) => {
        for (const message of cekBagan(daftar)) ctx.addIssue({ code: 'custom', message });
      }),
    /** Tahun dan sumber data penduduk dan luas wilayah. */
    sumberData: z.object({ tahun: teksWajib, sumber: teksWajib }),
    /** Data setiap lingkungan. Total kelurahan dijumlahkan dari angka yang sudah diisi. Nama kosong tampil sebagai "[kosong]". */
    lingkungan: z
      .array(
        z.object({
          nama: teksWajib,
          kepala: z.string().trim(),
          wakil: z.string().trim(),
          kepalaKeluarga: z.number().int().nonnegative().nullable(),
          jumlahPenduduk: z.number().int().nonnegative().nullable(),
          luasKm2: angkaAtauKosong,
        }),
      )
      .default([]),
    /** Visi dan misi Pemerintah Kota Tomohon, yang diikuti Kelurahan Walian. */
    visi: teksWajib,
    misi: z.array(teksWajib),
    /** Program unggulan Kota Tomohon, tampil setelah tombol "Selengkapnya" ditekan. */
    programUnggulan: z.array(teksWajib).default([]),
    /** Alamat halaman sumber visi dan misi. Kosong: tautan sumber tidak ditampilkan. */
    sumberVisiMisi: tautanOpsional,
    diperbarui: tanggalKonten,
  });
