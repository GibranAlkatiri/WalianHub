import { publicCollectionEnabled, publishedPengumuman } from '../../server/published-collections.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
export async function onRequest({request,env}) {
  const headers = {...PUBLIC_HEADERS,'content-type':'application/json; charset=utf-8'};
  if (!publicCollectionEnabled(env,'pengumuman')) return new Response(null,{status:404,headers});
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...headers,allow:'GET, HEAD'}});
  try { return new Response(request.method === 'HEAD' ? null : JSON.stringify({daftar:await publishedPengumuman(env)}),{headers}); }
  catch { return new Response(request.method === 'HEAD' ? null : JSON.stringify({error:'Pengumuman belum dapat dimuat. Silakan coba kembali.'}),{status:503,headers}); }
}
