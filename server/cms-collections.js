import { layananOperation, LayananError } from './cms-layanan.js';
import { validatePengaturan } from './cms-pengaturan.js';
const fail = (message, status = 422) => { throw new LayananError(message, status); };
export const collectionD1Enabled = (env, name) => ({layanan:env.CMS_LAYANAN_D1, destinasi:env.CMS_DESTINASI_D1, pengumuman:env.CMS_PENGUMUMAN_D1, pengaturan:env.CMS_PENGATURAN_D1})[name] === '1';
export const publicCollectionEnabled = (env, name) => ({destinasi:env.CMS_PUBLIC_DESTINASI_D1, pengumuman:env.CMS_PUBLIC_PENGUMUMAN_D1, pengaturan:env.CMS_PUBLIC_PENGATURAN_D1})[name] === '1';
const object = (value, keys) => {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some((key) => !keys.includes(key))) fail('Isian konten tidak valid.');
};
const text = (data, keys) => { for (const key of keys) { if (data[key] !== undefined && typeof data[key] !== 'string') fail(`Isian ${key} harus berupa teks.`);if (typeof data[key] === 'string' && key !== 'body') data[key] = data[key].trim(); } };
const required = (value, label) => { if (!value) fail(`${label} perlu diisi sebelum diterbitkan.`); };
const date = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) fail('Tanggal harus memakai YYYY-MM-DD.');
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) fail('Tanggal tidak valid.');
};
const length = (data) => { if (new TextEncoder().encode(JSON.stringify(data)).length > 256 * 1024) fail('Isian konten terlalu panjang.',413); };
const coordinate = (value, bound) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= bound;
export function validateDestinasi(value, collection, publish = false) {
  object(value,['nama','kategori','ringkasan','gambar','lokasi','unggulan','urutan','diperbarui','body']);
  const data = {unggulan:false,urutan:100,body:'',...value};
  text(data,['nama','kategori','ringkasan','gambar','diperbarui','body']);
  if (typeof data.unggulan !== 'boolean' || typeof data.urutan !== 'number' || !Number.isFinite(data.urutan)) fail('Pilihan beranda atau urutan tidak valid.');
  if (data.gambar && !/^\/(?!\/)[^\s\\?#]+\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(data.gambar) && !/^https?:\/\//i.test(data.gambar)) fail('Alamat gambar tidak valid.');
  if (data.gambar && /^https?:\/\//i.test(data.gambar)) { try { new URL(data.gambar); } catch { fail('Alamat gambar tidak valid.'); } }
  if (data.lokasi !== undefined) {
    object(data.lokasi,['alamat','lat','lng']);data.lokasi = {...data.lokasi};text(data.lokasi,['alamat']);
    let address = data.lokasi.alamat || '';try { address = decodeURIComponent(address); } catch {}
    const match = /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(address) || /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i.exec(address) || /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(address);
    if (match && coordinate(Number(match[1]),90) && coordinate(Number(match[2]),180)) Object.assign(data.lokasi,{lat:Number(match[1]),lng:Number(match[2])});
    for (const [key,bound] of [['lat',90],['lng',180]]) if (data.lokasi[key] !== undefined && !coordinate(data.lokasi[key],bound)) fail('Koordinat lokasi tidak valid.');
  }
  length(data);if (!publish) return data;
  required(data.nama,'Nama');required(data.ringkasan,'Ringkasan');if (data.ringkasan.length > 160) fail('Ringkasan maksimal 160 karakter.');
  const categories = collection.fields.find((field) => field.name === 'kategori')?.options?.map((option) => typeof option === 'string' ? option : option.value) || [];
  if (!categories.includes(data.kategori)) fail('Pilih kategori yang tersedia.');
  required(data.lokasi?.alamat,'Alamat');if (!coordinate(data.lokasi.lat,90) || !coordinate(data.lokasi.lng,180)) fail('Koordinat lokasi perlu diisi.');
  date(data.diperbarui);return data;
}
export function validatePengumuman(value, collection, publish = false) {
  object(value,['daftar']);const data = {daftar:[],...value};
  if (!Array.isArray(data.daftar)) fail('Pengumuman harus berupa daftar.');
  data.daftar = data.daftar.map((item) => {
    object(item,['judul','tanggal','isi','penting']);const row = {judul:'',tanggal:'',isi:'',penting:false,...item};text(row,['judul','tanggal','isi']);
    if (typeof row.penting !== 'boolean') fail('Pilihan penting tidak valid.');
    if (publish) { required(row.judul,'Judul');required(row.isi,'Isi');date(row.tanggal); }
    return row;
  });length(data);return data;
}
export async function collectionOperation(db, collection, action, slug, body) {
  try {
    const validate = collection.name === 'pengaturan' ? (value,c,publish)=>validatePengaturan(value,c,slug,publish) : collection.name === 'destinasi' ? validateDestinasi : validatePengumuman;
    const result = await layananOperation(db,collection,action,slug,body,validate);
    if (result.message) result.message = result.message.replace('Layanan',collection.name === 'destinasi' ? 'Destinasi' : collection.name === 'pengaturan' ? 'Pengaturan' : 'Pengumuman');
    return result;
  } catch (error) {
    if (error instanceof LayananError) error.message = error.message.replaceAll('layanan','konten').replaceAll('Layanan','Konten');
    throw error;
  }
}
