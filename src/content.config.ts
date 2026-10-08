// Schema data: "kontrak" bentuk data antara frontend dan CMS.
// Setiap file di src/content/ diperiksa dengan schema ini saat build.
// Jika ada data yang tidak sesuai, build gagal dan website yang sedang tayang tidak berubah.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { cekBagan } from './lib/bagan';
import { teksWajib, tautanWeb, tautanOpsional, tanggalIso, tanggalKonten, jadwalHari } from './lib/validasi-konten';

/** Angka yang belum diketahui diisi null, lalu tampil sebagai "Data menyusul". */
const angkaAtauKosong = z.number().nonnegative().nullable();

/** Nomor WhatsApp dengan kode negara, tanpa tanda + dan tanpa spasi. */
const nomorWhatsapp = z
  .string()
  .trim()
  .regex(/^\d{8,15}$/, 'Tulis nomor WhatsApp dengan kode negara, tanpa + dan spasi. Contoh: 6281234567890');

const ikonTersedia = Object.keys(import.meta.glob('./icons/*.svg')).map((path) => path.split('/').at(-1)!.replace(/\.svg$/, ''));

// ---------- Data tunggal: src/content/pengaturan/ ----------

const situs = defineCollection({
  loader: glob({ pattern: 'situs.json', base: './src/content/pengaturan' }),
  schema: z.object({
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
  }),
});

const beranda = defineCollection({
  loader: glob({ pattern: 'beranda.json', base: './src/content/pengaturan' }),
  schema: z.object({
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
  }),
});

const profil = defineCollection({
  loader: glob({ pattern: 'profil.json', base: './src/content/pengaturan' }),
  schema: z.object({
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
  }),
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
