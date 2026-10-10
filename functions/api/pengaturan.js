import { publicCollectionEnabled } from '../../server/cms-collections.js';
import { publishedPengaturan } from '../../server/published-pengaturan.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
export async function onRequest({request,env}) {
  const headers={...PUBLIC_HEADERS,'content-type':'application/json; charset=utf-8'};
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...headers,allow:'GET, HEAD'}});
  if (!publicCollectionEnabled(env,'pengaturan')) return new Response(null,{status:404,headers});
  try {const data=await publishedPengaturan(env);return new Response(request.method==='HEAD'?null:JSON.stringify(data),{headers});}
  catch {return new Response(request.method==='HEAD'?null:JSON.stringify({error:'Informasi belum dapat dimuat. Silakan muat ulang.'}),{status:503,headers});}
}
