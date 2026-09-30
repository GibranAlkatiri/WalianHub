// Schema data: "kontrak" bentuk data antara frontend dan CMS.
// Setiap file di src/content/ diperiksa dengan schema ini saat build.
// Jika ada data yang tidak sesuai, build gagal dan website yang sedang tayang tidak berubah.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { namaKategori } from './lib/kategori-berita';
import { namaHari } from './lib/jam-layanan';

/** Angka yang belum diketahui diisi null, lalu tampil sebagai "Data menyusul". */
const angkaAtauKosong = z.number().nonnegative().nullable();

/** Nomor WhatsApp dengan kode negara, tanpa tanda + dan tanpa spasi. */
const nomorWhatsapp = z
  .string()
  .regex(/^\d{8,15}$/, 'Tulis nomor WhatsApp dengan kode negara, tanpa + dan spasi. Contoh: 6281234567890');

/** Jam dalam format "08.00". */
const jam = z.string().regex(/^([01]\d|2[0-3])\.[0-5]\d$/, 'Format jam harus "08.00"');

// ---------- Data tunggal: src/content/pengaturan/ ----------

const situs = defineCollection({
  loader: glob({ pattern: 'situs.json', base: './src/content/pengaturan' }),
  schema: z.object({
    namaKelurahan: z.string(),
    kecamatan: z.string(),
    kota: z.string(),
    provinsi: z.string(),
    alamat: z.string(),
    koordinat: z.object({ lat: z.number(), lng: z.number() }),
    googleMapsUrl: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().optional(),
    jamLayanan: z.object({
      jadwal: z
        .array(
          z
            .object({
              hari: z.enum(namaHari),
              buka: jam.nullable(),
              tutup: jam.nullable(),
              istirahat: z.object({ mulai: jam, selesai: jam }).nullable(),
            })
            .refine((h) => (h.buka === null) === (h.tutup === null), 'Jam buka dan jam tutup harus diisi keduanya, atau dikosongkan keduanya'),
        )
        .length(7)
        .refine((jadwal) => new Set(jadwal.map((h) => h.hari)).size === 7, 'Setiap hari harus ada tepat satu kali'),
      tanggalLibur: z
        .array(z.object({ tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus "2026-12-25"'), keterangan: z.string() }))
        .default([]),
    }),
    mediaSosial: z
      .array(
        z.object({
          platform: z.enum(['facebook', 'instagram', 'youtube', 'tiktok']),
          url: z.string(),
        }),
      )
      .default([]),
    tautanPenting: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    kredit: z.string(),
  }),
});

const beranda = defineCollection({
  loader: glob({ pattern: 'beranda.json', base: './src/content/pengaturan' }),
  schema: z.object({
    hero: z.object({
      label: z.string(),
      judul: z.string(),
      subjudul: z.string(),
      /** Foto latar hero, sesuai urutan. Lebih dari satu foto berganti otomatis. Kosong: gambar default. */
      foto: z
        .array(
          z.object({
            gambar: z.string(),
            /** Isi foto, contoh "Kantor Kelurahan Walian". Tampil di pojok hero dan dibacakan screen reader. */
            keterangan: z.string().min(1, 'Keterangan foto wajib diisi'),
            /** Bagian foto yang tetap terlihat saat foto terpotong di layar sempit. */
            posisi: z.enum(['kiri', 'tengah', 'kanan']).default('tengah'),
          }),
        )
        .max(5)
        .default([]),
    }),
    aksesCepat: z
      .array(
        z.object({
          label: z.string(),
          ikon: z.string(),
          tautan: z.string(),
          /** "status-layanan" menampilkan status jam layanan langsung, bukan tulisan label. */
          jenis: z.enum(['tautan', 'status-layanan']).default('tautan'),
        }),
      )
      .max(3),
  }),
});

const profil = defineCollection({
  loader: glob({ pattern: 'profil.json', base: './src/content/pengaturan' }),
  schema: z.object({
    ringkasan: z.string(),
    visi: z.string(),
    misi: z.array(z.string()),
    batasWilayah: z.object({
      utara: z.string(),
      selatan: z.string(),
      timur: z.string(),
      barat: z.string(),
    }),
    petaWilayah: z.string().optional(),
    luasKm2: angkaAtauKosong,
    lingkungan: z.array(z.object({ nama: z.string(), kepalaLingkungan: z.string() })).default([]),
    penduduk: z.object({
      jumlahJiwa: angkaAtauKosong,
      kepalaKeluarga: angkaAtauKosong,
      lakiLaki: angkaAtauKosong.optional(),
      perempuan: angkaAtauKosong.optional(),
      tahun: z.string(),
      sumber: z.string(),
    }),
    diperbarui: z.coerce.date(),
  }),
});

// ---------- Koleksi: satu file Markdown untuk setiap item ----------

const layanan = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/layanan' }),
  schema: z.object({
    judul: z.string(),
    ringkasan: z.string().max(120),
    ikon: z.string().default('file-text'),
    unggulan: z.boolean().default(false),
    urutan: z.number().default(100),
    persyaratan: z.array(z.string()),
    alur: z.array(z.string()),
    lamaProses: z.string(),
    biaya: z.string(),
    diperbarui: z.coerce.date(),
  }),
});

const destinasi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinasi' }),
  schema: z.object({
    nama: z.string(),
    kategori: z.enum(['Alam', 'Budaya', 'Kuliner', 'Religi', 'Olahraga', 'Lainnya']),
    ringkasan: z.string().max(160),
    gambar: z.string().optional(),
    galeri: z.array(z.string()).default([]),
    lokasi: z.object({
      alamat: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      googleMapsUrl: z.string().optional(),
    }),
    jamBuka: z.string().optional(),
    hargaTiket: z.string().optional(),
    fasilitas: z.array(z.string()).default([]),
    kontakPengelola: z
      .object({ nama: z.string().optional(), whatsapp: nomorWhatsapp.optional() })
      .optional(),
    caraMenuju: z.string().optional(),
    unggulan: z.boolean().default(false),
    urutan: z.number().default(100),
    diperbarui: z.coerce.date(),
  }),
});

const berita = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/berita' }),
  schema: z.object({
    judul: z.string(),
    tanggal: z.coerce.date(),
    kategori: z.enum(namaKategori),
    ringkasan: z.string().max(200),
    gambar: z.string().optional(),
    keteranganGambar: z.string().optional(),
    penting: z.boolean().default(false),
    draf: z.boolean().default(false),
  }),
});

export const collections = { situs, beranda, profil, layanan, destinasi, berita };
