import { publicLayananEnabled, publishedLayanan, PUBLIC_HEADERS } from '../../server/published-layanan.js';
const headers = {...PUBLIC_HEADERS, 'content-type':'application/json; charset=utf-8'};
export async function onRequest({ request, env }) {
  if (!publicLayananEnabled(env)) return new Response(null, {status:404,headers});
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(JSON.stringify({error:'Metode tidak didukung.'}), {status:405,headers:{...headers,allow:'GET, HEAD'}});
  try {
    const body = JSON.stringify({ entries:await publishedLayanan(env) });
    return new Response(request.method === 'HEAD' ? null : body, {headers});
  } catch {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({error:'Informasi layanan belum dapat dimuat. Silakan coba kembali.'}), {status:503,headers});
  }
}
