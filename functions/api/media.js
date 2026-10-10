import { load, JSON_SCHEMA } from 'js-yaml';
import { sessionEnabled, readSession, sameOrigin, SessionError } from '../../server/cms-session.js';
import { mediaEnabled, uploadMedia, MediaError } from '../../server/cms-media.js';
import { target, CmsError } from './cms.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
const headers = {...PUBLIC_HEADERS,'content-type':'application/json; charset=utf-8'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers});
export function createMediaHandler(fetchProvider = fetch) {
  return async ({request,env}) => {
    if (!mediaEnabled(env)) return json({error:'Tidak ditemukan.'},404);
    if (request.method !== 'POST') return new Response(null,{status:405,headers:{...headers,allow:'POST'}});
    try {
      if (!sessionEnabled(env)) throw new MediaError('Penyimpanan foto memerlukan sesi panel.');
      await readSession(request,env);sameOrigin(request);
      const url = new URL(request.url),asset = await env.ASSETS.fetch(new Request(new URL('/admin/config.yml',url)));
      if (!asset.ok) throw new MediaError('Konfigurasi foto belum tersedia.');
      const config = load(await asset.text(),{schema:JSON_SCHEMA});
      const owner = target(config,url.searchParams.get('collection'),url.searchParams.get('slug'));
      return json(await uploadMedia(request,env,owner,fetchProvider));
    } catch (error) {
      const expected = error instanceof MediaError || error instanceof SessionError || error instanceof CmsError;
      return json({error:expected ? error.message : 'Foto belum dapat diproses. Coba kembali; isian Anda tetap ada.'},expected ? error.status : 503);
    }
  };
}
export const onRequest = createMediaHandler();
