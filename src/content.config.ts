// Schema data: "kontrak" bentuk data antara frontend dan CMS.
// Setiap file di src/content/ diperiksa dengan schema ini saat build.
// Jika ada data yang tidak sesuai, build gagal dan website yang sedang tayang tidak berubah.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { situsSchema, berandaSchema, profilSchema } from './lib/schema-pengaturan';
import { teksWajib, tanggalKonten } from './lib/validasi-konten';

const ikonTersedia = Object.keys(import.meta.glob('./icons/*.svg')).map((path) => path.split('/').at(-1)!.replace(/\.svg$/, ''));

// ---------- Data tunggal: src/content/pengaturan/ ----------

const situs = defineCollection({
  loader: glob({ pattern: 'situs.json', base: './src/content/pengaturan' }),
  schema: situsSchema,
});

const beranda = defineCollection({
  loader: glob({ pattern: 'beranda.json', base: './src/content/pengaturan' }),
  schema: berandaSchema,
});

const profil = defineCollection({
  loader: glob({ pattern: 'profil.json', base: './src/content/pengaturan' }),
  schema: profilSchema,
});

const pengumuman = defineCollection({
  loader: glob({ pattern: 'pengumuman.json', base: './src/content/pengaturan' }),
  schema: z.object({
    /** Pengumuman untuk warga di halaman Layanan, yang terbaru di atas. Kosong: bagian Pengumuman tidak tampil. */
    daftar: z
      .array(
        z.object({
          judul: teksWajib,
          tanggal: tanggalKonten,
          /** Isi singkat pengumuman. Baris baru di sini juga menjadi baris baru di halaman. */
          isi: teksWajib,
          /** true berarti diberi label "Penting". */
          penting: z.boolean().default(false),
        }),
      )
      .default([]),
  }),
});

// ---------- Koleksi: satu file Markdown untuk setiap item ----------

const layanan = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/layanan' }),
  schema: z.object({
    judul: teksWajib,
    ringkasan: teksWajib.max(120),
    ikon: z.string().trim().refine((nama) => ikonTersedia.includes(nama), 'Pilih ikon yang tersedia di src/icons/').default('file-text'),
    unggulan: z.boolean().default(false),
    urutan: z.number().default(100),
    persyaratan: z.array(teksWajib).default([]),
    alur: z.array(teksWajib).default([]),
    diperbarui: tanggalKonten,
  }),
});

const destinasi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinasi' }),
  schema: z.object({
    nama: teksWajib,
    kategori: z.enum(['Alam', 'Budaya', 'Kuliner', 'Religi', 'Olahraga', 'Lainnya']),
    ringkasan: teksWajib.max(160),
    gambar: z.string().trim().optional(),
    /** Titik lokasi wajib diisi. Tombol "Cek Lokasi" membuka Google Maps tepat di titik ini. */
    lokasi: z.object({
      alamat: teksWajib,
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    unggulan: z.boolean().default(false),
    urutan: z.number().default(100),
    diperbarui: tanggalKonten,
  }),
});

export const collections = { situs, beranda, profil, pengumuman, layanan, destinasi };
