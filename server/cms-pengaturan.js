import { situsSchema, berandaSchema, profilSchema } from '../src/lib/schema-pengaturan.ts';
import { LayananError } from './cms-layanan.js';
export const pengaturanSchemas = {situs:situsSchema,beranda:berandaSchema,profil:profilSchema};
const fail = (message) => { throw new LayananError(message); };
// A draft may omit required values, but cannot change field types or names.
function draftObject(value, fields) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some((name)=>!fields.some((field)=>field.name===name))) fail('Isian Pengaturan tidak valid.');
  return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,draftValue(item,fields.find((field)=>field.name===name))]));
}
function draftValue(value, field) {
  if (value === null && field.required === false && ['object','number','string'].includes(field.widget)) return null;
  if (field.widget === 'object') return draftObject(value,field.fields);
  if (field.widget === 'list' || field.widget === 'daftarNama') {
    if (!Array.isArray(value)) fail(`Isian ${field.label} harus berupa daftar.`);
    return value.map((item)=>field.fields ? draftObject(item,field.fields) : draftValue(item,field.field || {widget:'string',label:field.label}));
  }
  if (field.widget === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (field.value_type === 'int' && !Number.isInteger(value)) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) fail(`Angka ${field.label} tidak valid.`);
    return value;
  }
  if (field.widget === 'boolean') { if (typeof value !== 'boolean') fail(`Pilihan ${field.label} tidak valid.`);return value; }
  if (typeof value !== 'string') fail(`Isian ${field.label} harus berupa teks.`);
  const text = value.trim();
  if (field.widget === 'select' && text && !field.options.some((option)=>(typeof option==='string'?option:option.value)===text)) fail(`Pilihan ${field.label} tidak tersedia.`);
  if (field.widget === 'image' && text && !/^\/(?!\/)[^\s\\?#]+\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(text)) {
    let url;try {url=new URL(text);} catch {}if (!url || !['http:','https:'].includes(url.protocol)) fail('Alamat foto tidak valid.');
  }
  return text;
}
export function validatePengaturan(value, collection, slug, publish = false) {
  const schema = pengaturanSchemas[slug], file = collection.files?.find((file)=>file.name===slug);
  if (!schema || !file) throw new LayananError('Pengaturan tidak dikenali.',404);
  if (new TextEncoder().encode(JSON.stringify(value)).length > 256*1024) throw new LayananError('Isian Pengaturan terlalu panjang.',413);
  const data = draftObject(value,file.fields);
  if (!publish) return data;
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];fail(`${issue.path.join('.') || file.label}: ${issue.message}.`);
  }
  // JSON dates remain YYYY-MM-DD, the same representation as the editor.
  if (slug === 'profil') result.data.diperbarui = result.data.diperbarui.toISOString().slice(0,10);
  return result.data;
}
