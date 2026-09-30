// Schema data: "kontrak" bentuk data antara frontend dan CMS.
// Setiap file di src/content/ diperiksa dengan schema ini saat build.
// Jika ada data yang tidak sesuai, build gagal dan website yang sedang tayang tidak berubah.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { namaKategori } from './lib/kategori-berita';

/** Angka yang belum diketahui diisi null, lalu tampil sebagai "Data menyusul". */
const angkaAtauKosong = z.number().nonnegative().nullable();

/** Nomor WhatsApp dengan kode negara, tanpa tanda + dan tanpa spasi. */
const nomorWhatsapp = z
  .string()
  .regex(/^\d{8,15}$/, 'Tulis nomor WhatsApp dengan kode negara, tanpa + dan spasi. Contoh: 6281234567890');

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
    jamLayanan: z.array(z.object({ hari: z.string(), jam: z.string() })),
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
      gambar: z.string().optional(),
    }),
    aksesCepat: z.array(z.object({ label: z.string(), ikon: z.string(), tautan: z.string() })).max(3),
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
