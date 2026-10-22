import { mediaEnabled, cloudinaryCredentials, UUID, MediaError } from './cms-media.js';

export const VIDEO_LIMIT = 40 * 1024 * 1024;
export const VIDEO_SECONDS = 300;
export const videoEnabled = env => mediaEnabled(env) && env.CMS_VIDEO_CLOUDINARY === '1'
  && env.CMS_SESSION_AUTH === '1' && env.CMS_PENGATURAN_D1 === '1';
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,'0')).join('');
const unavailable = () => new MediaError('Video belum dapat diproses. Coba kembali; isian Anda tetap ada.');
const digestStream = () => {
  if (typeof crypto.DigestStream !== 'function') throw new MediaError('Pemrosesan video belum tersedia pada server ini. Hubungi pengelola panel.');
  return new crypto.DigestStream('SHA-256');
};

function mp4Header(bytes) {
  const text = new TextDecoder();
  return bytes.length >= 16 && new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0) >= 16
    && text.decode(bytes.slice(4,8)) === 'ftyp'
    && ['isom','iso2','mp41','mp42','avc1'].includes(text.decode(bytes.slice(8,12)));
}

// Multipart dialirkan dengan backpressure. Tidak menampung MP4 40 MB di memori Worker.
async function videoBody(request, params, createDigest) {
  const reader = request.body?.getReader();
  if (!reader) throw new MediaError('Pilih video MP4 terlebih dahulu.',422);
  const prefix = [];
  let prefixSize = 0;
  while (prefixSize < 16) {
    const {value,done} = await reader.read();
    if (done) {await reader.cancel();throw new MediaError('Berkas MP4 tidak valid.',422);}
    prefix.push(value);prefixSize += value.length;
    if (prefixSize > params.bytes) {await reader.cancel();throw new MediaError('Ukuran video tidak sesuai.',422);}
  }
  const header = new Uint8Array(16);
  let headerOffset = 0;
  for (const part of prefix) {const take = Math.min(part.length,16-headerOffset);header.set(part.subarray(0,take),headerOffset);headerOffset += take;if(headerOffset === 16)break;}
  if (!mp4Header(header)) {await reader.cancel();throw new MediaError('Pilih berkas MP4 yang valid, bukan berkas yang hanya diganti namanya.',422);}
  let digest;
  try {digest = createDigest();} catch(error) {await reader.cancel();throw error;}
  digest.digest.catch(() => {});
  const writer = digest.getWriter(), encoder = new TextEncoder();
  const boundary = 'walian-' + crypto.randomUUID();
  let complete = false, failure;
  async function* parts() {
    let size = 0;
    try {
      for (const [key,value] of Object.entries({public_id:params.key,type:'authenticated',overwrite:'false'})) {
        yield encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
      }
      yield encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${params.id}.mp4"\r\nContent-Type: video/mp4\r\n\r\n`);
      const checked = async bytes => {
        size += bytes.byteLength;
        if (size > params.bytes || size > VIDEO_LIMIT) throw new MediaError('Video melebihi ukuran yang diizinkan.',413);
        await writer.write(bytes);
        return bytes;
      };
      for (const part of prefix) yield await checked(part);
      prefix.length = 0;
      while (true) {
        const {value,done} = await reader.read();if(done)break;
        yield await checked(value);
      }
      if (size !== params.bytes) throw new MediaError('Unggahan video belum lengkap. Coba kembali.',422);
      await writer.close();
      if (hex(await digest.digest) !== params.sha) throw new MediaError('Isi video berubah saat diunggah. Pilih ulang berkasnya.',422);
      complete = true;
      yield encoder.encode(`\r\n--${boundary}--\r\n`);
    } catch(error) {failure = error;throw error;}
    finally {
      if (!complete) await writer.abort().catch(() => {});
      await reader.cancel().catch(() => {});reader.releaseLock();
    }
  }
  const iterator = parts();
  const body = new ReadableStream({
    async pull(controller) {try {const item = await iterator.next();if(item.done)controller.close();else controller.enqueue(item.value);}catch(error){controller.error(error);}},
    async cancel() {await iterator.return();},
  });
  return {body,boundary,finished:()=>complete,failure:()=>failure,cancel:async()=>{await reader.cancel().catch(()=>{});await iterator.return();}};
}

export async function uploadVideo(request,env,fetchProvider = fetch,createDigest = digestStream) {
  const url = new URL(request.url), id = url.searchParams.get('id'), sha = url.searchParams.get('sha256');
  const bytes = Number(url.searchParams.get('bytes'));
  if (url.searchParams.get('collection') !== 'pengaturan' || url.searchParams.get('slug') !== 'profil') throw new MediaError('Video hanya untuk Profil kelurahan.',422);
  if (!new RegExp('^' + UUID + '$').test(id || '') || !/^[a-f0-9]{64}$/.test(sha || '')) throw new MediaError('Identitas unggahan video tidak valid.',422);
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > VIDEO_LIMIT) throw new MediaError('Video maksimal 40 MB. Gunakan MP4 yang sudah dikompresi.',413);
  if (request.headers.get('content-type')?.split(';')[0] !== 'video/mp4') throw new MediaError('Pilih video MP4.',415);
  const length = request.headers.get('content-length');
  if (length !== null && Number(length) !== bytes) throw new MediaError('Ukuran unggahan video tidak sesuai.',422);
  const auth = cloudinaryCredentials(env), path = `/videos/${id}.mp4`, key = `walianhub-video/${id}-${sha}`;
  let row;
  try {
    await env.CMS_DB.prepare(`INSERT INTO cms_videos(id,public_path,collection,slug,provider_key,provider_cloud,sha256,byte_length)
      VALUES (?,?,'pengaturan','profil',?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id,path,key,auth.cloud,sha,bytes).run();
    row = await env.CMS_DB.prepare('SELECT * FROM cms_videos WHERE id = ?').bind(id).first();
  } catch {throw new MediaError('Pencatatan video belum tersedia. Hubungi pengelola untuk memeriksa migrasi database.');}
  if (!row || row.provider_key !== key || row.provider_cloud !== auth.cloud || row.byte_length !== bytes || row.public_path !== path) throw new MediaError('Identitas unggahan sudah digunakan. Pilih ulang video.',409);
  if (row.ready) {await request.body?.cancel();return {path,bytes,duration:row.duration};}
  const multipart = await videoBody(request,{id,sha,bytes,key},createDigest);
  try {
    const response = await fetchProvider(`https://api.cloudinary.com/v1_1/${auth.cloud}/video/upload`,{
      method:'POST',headers:{authorization:'Basic '+btoa(auth.key+':'+auth.secret),'content-type':`multipart/form-data; boundary=${multipart.boundary}`},
      body:multipart.body,signal:AbortSignal.timeout(120000),duplex:'half',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if ([401,403].includes(response.status)) throw new MediaError('Cloudinary menolak akses video. Hubungi pengelola panel.');
      if (response.status === 413) throw new MediaError('Video melebihi batas akun Cloudinary. Gunakan berkas yang lebih kecil.',413);
      throw new MediaError('Cloudinary belum dapat menyimpan video. Coba kembali.');
    }
    if (!multipart.finished()) throw multipart.failure() || unavailable();
    const asset = await response.json();
    if (asset.public_id !== key || asset.resource_type !== 'video' || asset.type !== 'authenticated' || asset.format !== 'mp4'
      || asset.bytes !== bytes || asset.video?.codec !== 'h264' || (asset.audio && asset.audio.codec !== 'aac')
      || !Number.isFinite(asset.duration) || asset.duration <= 0 || asset.duration > VIDEO_SECONDS
      || !Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width <= 0 || asset.height <= 0
      || asset.width > 1920 || asset.height > 1920 || asset.width * asset.height > 1920 * 1080) {
      throw new MediaError('Video harus MP4 H.264/AAC, maksimal 1080p dan 5 menit. Gunakan versi yang sudah dikompresi.',422);
    }
    await env.CMS_DB.prepare('UPDATE cms_videos SET ready=1,duration=?,width=?,height=? WHERE id=? AND sha256=?').bind(asset.duration,asset.width,asset.height,id,sha).run();
    return {path,bytes,duration:asset.duration};
  } catch(error) {
    if (multipart.failure() instanceof MediaError) throw multipart.failure();
    if (error instanceof MediaError) throw error;
    throw unavailable();
  } finally {await multipart.cancel().catch(()=>{});}
}

export function videoRange(value,total) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new MediaError('Rentang video tidak valid.',416);
  let start = match[1] ? Number(match[1]) : Math.max(0,total-Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]),total-1) : total-1) : total-1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) throw new MediaError('Rentang video tidak tersedia.',416);
  return {start,end};
}

export async function downloadVideo(row,env,range,fetchProvider = fetch) {
  const auth = cloudinaryCredentials(env);
  if (row.provider_cloud !== auth.cloud) throw unavailable();
  const source = row.provider_key + '.mp4';
  const signature = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(source+auth.secret)))))
    .slice(0,8).replaceAll('/','_').replaceAll('+','-');
  const response = await fetchProvider(`https://res.cloudinary.com/${auth.cloud}/video/authenticated/s--${signature}--/v1/${source}`,{
    headers:range?{range:`bytes=${range.start}-${range.end}`}:{},signal:AbortSignal.timeout(20000),
  });
  if (response.status !== (range?206:200) || response.headers.get('content-type')?.split(';')[0] !== 'video/mp4'
    || (response.headers.has('content-length') && Number(response.headers.get('content-length')) !== (range?range.end-range.start+1:row.byte_length))
    || (range && response.headers.get('content-range') !== `bytes ${range.start}-${range.end}/${row.byte_length}`)) {
    await response.body?.cancel();throw unavailable();
  }
  return response;
}
