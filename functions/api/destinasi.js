import { publicCollectionEnabled, publishedDestinasi } from '../../server/published-collections.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
export async function onRequest({request,env}) {
  const headers = {...PUBLIC_HEADERS,'content-type':'application/json; charset=utf-8'};
  if (!publicCollectionEnabled(env,'destinasi')) return new Response(null,{status:404,headers});
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...headers,allow:'GET, HEAD'}});
  try {
    const wisata = await publishedDestinasi(env);
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({entries:wisata.semua.map(({slug,data}) => ({slug,data})),href:wisata.href}),{headers});
  } catch { return new Response(request.method === 'HEAD' ? null : JSON.stringify({error:'Informasi wisata belum dapat dimuat. Silakan coba kembali.'}),{status:503,headers}); }
}
