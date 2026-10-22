import { readSession, sameOrigin, SessionError } from '../../server/cms-session.js';
import { MediaError } from '../../server/cms-media.js';
import { videoEnabled, uploadVideo } from '../../server/cms-video.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
export function createVideoUploadHandler(fetchProvider = fetch,createDigest) {
  return async ({request,env}) => {
    const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...PUBLIC_HEADERS,'content-type':'application/json; charset=utf-8'}});
    if (!videoEnabled(env)) return json({error:'Unggah video belum diaktifkan.'},404);
    if (request.method !== 'POST') return new Response(null,{status:405,headers:{...PUBLIC_HEADERS,allow:'POST'}});
    try {
      await readSession(request,env);sameOrigin(request);
      return json(await uploadVideo(request,env,fetchProvider,createDigest));
    } catch(error) {
      const known=error instanceof MediaError || error instanceof SessionError;
      return json({error:known?error.message:'Video belum dapat diproses. Coba kembali.'},known?error.status:503);
    }
  };
}
export const onRequest=createVideoUploadHandler();
