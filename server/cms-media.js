export const mediaEnabled = (env) => env.CMS_MEDIA_CLOUDINARY === '1';
export const MEDIA_LIMIT = 5 * 1024 * 1024;
export const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const mediaPattern = new RegExp('/media/' + UUID + '\\.(?:jpg|png|webp)(?![\\w./%])', 'g');
export class MediaError extends Error { constructor(message, status = 503) { super(message); this.status = status; } }
const unavailable = () => new MediaError('Foto belum dapat diproses. Coba kembali; isian Anda tetap ada.');
export function mediaPaths(data) {
  const result = new Set();
  const visit = (value) => {
    if (typeof value === 'string') for (const match of value.matchAll(mediaPattern)) result.add(match[0]);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(data); return [...result];
}
export async function assertMediaReferences(env, data, collection, slug) {
  const paths = mediaPaths(data);
  if (!paths.length) return;
  if (!mediaEnabled(env) || !env.CMS_DB) throw unavailable();
  for (const path of paths) {
    let row;
    try { row = await env.CMS_DB.prepare('SELECT collection,slug,ready FROM cms_media WHERE public_path = ?').bind(path).first(); }
    catch { throw unavailable(); }
    if (!row?.ready || row.collection !== collection || row.slug !== slug) throw new MediaError('Foto tidak tersedia untuk konten ini. Pilih ulang fotonya.', 422);
  }
}
async function digest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map((byte)=>byte.toString(16).padStart(2,'0')).join('');
}
function credentials(env) {
  const cloud = String(env.CLOUDINARY_CLOUD_NAME || '').trim(), key = String(env.CLOUDINARY_API_KEY || '').trim(), secret = String(env.CLOUDINARY_API_SECRET || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cloud) || !/^\d+$/.test(key) || !secret) throw new MediaError('Penyimpanan foto belum tersedia. Hubungi pengelola panel.');
  return {cloud,key,secret};
}
async function limitedBytes(request) {
  if (Number(request.headers.get('content-length')) > MEDIA_LIMIT) throw new MediaError('Setiap foto maksimal 5 MB.',413);
  const reader = request.body?.getReader(); if (!reader) throw new MediaError('Pilih foto terlebih dahulu.',422);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MEDIA_LIMIT) { await reader.cancel(); throw new MediaError('Setiap foto maksimal 5 MB.',413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new MediaError('Foto kosong. Pilih ulang fotonya.',422);
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk,offset);offset += chunk.byteLength;}
  return bytes;
}
function imageFormat(bytes, type) {
  const png = bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((byte,i)=>bytes[i] === byte);
  const jpg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  const webp = bytes.length >= 20 && new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP' && new DataView(bytes.buffer).getUint32(4,true) + 8 === bytes.length;
  if (type === 'image/png' && png) return 'png';
  if (type === 'image/jpeg' && jpg) return 'jpg';
  if (type === 'image/webp' && webp) return 'webp';
  throw new MediaError('Pilih foto JPEG, PNG, atau WebP yang valid.',422);
}
// A stable upload ID makes retrying a lost response safe without overwriting.
export async function uploadMedia(request, env, owner, fetchProvider = fetch) {
  const id = new URL(request.url).searchParams.get('id');
  if (!new RegExp('^' + UUID + '$').test(id || '')) throw new MediaError('Identitas unggahan tidak valid.',422);
  const auth = credentials(env), type = request.headers.get('content-type')?.split(';')[0];
  if (!['image/jpeg','image/png','image/webp'].includes(type)) throw new MediaError('Pilih foto JPEG, PNG, atau WebP.',415);
  const bytes = await limitedBytes(request), format = imageFormat(bytes,type), sha = await digest(bytes);
  // Include the content hash: separate environments cannot claim a different
  // existing object by reusing a known public upload ID.
  const path = `/media/${id}.${format}`, providerKey = `walianhub/${id}-${sha}`;
  try {
    await env.CMS_DB.prepare(`INSERT INTO cms_media(id,public_path,collection,slug,source_path,provider_key,content_type,format,byte_length,sha256)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id,path,owner.collectionName,owner.slug,owner.path,providerKey,type,format,bytes.length,sha).run();
    const row = await env.CMS_DB.prepare('SELECT * FROM cms_media WHERE id = ?').bind(id).first();
    if (!row || row.sha256 !== sha || row.collection !== owner.collectionName || row.slug !== owner.slug || row.public_path !== path || row.source_path !== owner.path) throw new MediaError('Unggahan telah berubah. Pilih ulang foto agar tidak menimpa berkas lain.',409);
    if (!row.ready) {
      const form = new FormData();
      form.set('file',new Blob([bytes],{type}),id + '.' + format);
      form.set('public_id',providerKey);form.set('type','authenticated');form.set('overwrite','false');
      const response = await fetchProvider(`https://api.cloudinary.com/v1_1/${auth.cloud}/image/upload`,{method:'POST',headers:{authorization:'Basic ' + btoa(auth.key + ':' + auth.secret)},body:form,signal:AbortSignal.timeout(25000)});
      if (!response.ok) throw unavailable();
      const asset = await response.json();
      if (asset.public_id !== providerKey || asset.type !== 'authenticated' || asset.resource_type !== 'image' || (asset.format === 'jpeg' ? 'jpg' : asset.format) !== format || asset.bytes !== bytes.length) throw unavailable();
      await env.CMS_DB.prepare('UPDATE cms_media SET ready = 1 WHERE id = ? AND sha256 = ?').bind(id,sha).run();
    }
    return {path,bytes:bytes.length};
  } catch (error) { if (error instanceof MediaError) throw error; throw unavailable(); }
}
export async function downloadMedia(row,env,fetchProvider = fetch) {
  const auth = credentials(env);
  try {
    const source = row.provider_key + '.' + row.format;
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(source + auth.secret)));
    const signature = btoa(String.fromCharCode(...hash)).slice(0,8).replaceAll('/','_').replaceAll('+','-');
    // Signed CDN delivery remains server-side; the browser only sees /media/.
    const url = `https://res.cloudinary.com/${auth.cloud}/image/authenticated/s--${signature}--/v1/${source}`;
    const response = await fetchProvider(url,{signal:AbortSignal.timeout(15000)});
    if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== row.content_type) throw unavailable();
    return response;
  } catch { throw unavailable(); }
}
