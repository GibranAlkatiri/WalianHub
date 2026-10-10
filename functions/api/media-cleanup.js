import { cleanupMedia, cloudIdentity, CLEANUP_SCHEMA } from '../../server/cms-media-cleanup.js';
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
async function authorized(request,env) {
  const secret = env.CMS_MEDIA_CLEANUP_TOKEN;
  if (typeof secret !== 'string' || secret.length < 32) return false;
  const actual = request.headers.get('authorization') || '';
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [a,b] = await Promise.all([digest(actual),digest('Bearer '+secret)]);
  let difference = 0;for (let i=0;i<a.length;i++) difference |= a[i]^b[i];
  return difference === 0;
}
export function createCleanupHandler(fetchProvider=fetch,fetchPeer=fetch) {
  return async ({request,env}) => {
    if (!env.CMS_MEDIA_CLEANUP_TOKEN) return json({error:'Tidak ditemukan.'},404);
    if (!await authorized(request,env)) return json({error:'Akses ditolak.'},401);
    if(request.method==='GET')try{
      const objects=await env.CMS_DB.prepare('SELECT name FROM sqlite_master').all();
      if(!objects.success||CLEANUP_SCHEMA.some(name=>!objects.results.some(object=>object.name===name)))throw new Error('CLEANUP_SCHEMA');
      return json({ok:true,schema:1,collectionsD1:env.CMS_MEDIA_CLOUDINARY==='1'&&['LAYANAN','DESTINASI','PENGUMUMAN','PENGATURAN'].every(name=>env[`CMS_${name}_D1`]==='1'),cloudIdentity:await cloudIdentity(String(env.CLOUDINARY_CLOUD_NAME||'').trim())});
    }catch{return json({error:'Konfigurasi belum tersedia.'},503);}
    if (request.method !== 'POST') return new Response(null,{status:405,headers:{...headers,allow:'POST'}});
    if (env.CMS_MEDIA_CLEANUP_ENABLED !== '1') return json({error:'Tidak ditemukan.'},404);
    try {
      if (Number(request.headers.get('content-length') || 0)>1024) return json({error:'Permintaan terlalu panjang.'},413);
      const text=await request.text();if(text.length>1024)return json({error:'Permintaan terlalu panjang.'},413);
      let body;try{body=JSON.parse(text);}catch{return json({error:'Permintaan tidak valid.'},400);}
      if (!body || typeof body.dryRun!=='boolean' || Object.keys(body).some(key=>key!=='dryRun')) return json({error:'Permintaan tidak valid.'},400);
      return json({ok:true,...await cleanupMedia(env,{dryRun:body.dryRun,fetchProvider,fetchPeer})});
    } catch (error) {
      const safeCodes=['CLEANUP_CONFIGURATION','CLEANUP_PEER','CLEANUP_DATABASE','CLEANUP_SCHEMA','CLEANUP_MEDIA_DATA'];
      return json({error:'Pembersihan ditunda. Periksa konfigurasi dan database.',reason:safeCodes.includes(error?.message)?error.message:'CLEANUP_RUNTIME'},503);
    }
  };
}
export const onRequest = createCleanupHandler();
