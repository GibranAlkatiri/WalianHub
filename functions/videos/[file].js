import { readSession, SessionError } from '../../server/cms-session.js';
import { UUID, MediaError } from '../../server/cms-media.js';
import { videoEnabled, videoRange, downloadVideo } from '../../server/cms-video.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
export function createVideoReadHandler(fetchProvider = fetch) {
  return async ({request,env}) => {
    const path=new URL(request.url).pathname;
    if (!videoEnabled(env) || !new RegExp('^/videos/'+UUID+'\\.mp4$').test(path)) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...PUBLIC_HEADERS,allow:'GET, HEAD'}});
    try {
      const row=await env.CMS_DB.prepare('SELECT * FROM cms_videos WHERE public_path=? AND ready=1').bind(path).first();
      if (!row || row.provider_cloud !== String(env.CLOUDINARY_CLOUD_NAME || '').trim()) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
      let authenticated=false;
      if(request.headers.has('cookie'))try{await readSession(request,env);authenticated=true;}catch(error){if(!(error instanceof SessionError)||error.status!==401)throw error;}
      if(!authenticated){
        const content=await env.CMS_DB.prepare("SELECT published_json FROM cms_content WHERE collection='pengaturan' AND slug='profil'").first();
        if(!content?.published_json || JSON.parse(content.published_json)?.videoProfil?.url!==path) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
      }
      let range;
      try {range=videoRange(request.headers.get('range'),row.byte_length);}catch(error){if(error instanceof MediaError&&error.status===416)return new Response(null,{status:416,headers:{...PUBLIC_HEADERS,'content-range':`bytes */${row.byte_length}`}});throw error;}
      const headers={...PUBLIC_HEADERS,'content-type':'video/mp4','content-disposition':'inline','cross-origin-resource-policy':'same-origin','x-robots-tag':'noindex',
        'accept-ranges':'bytes','content-length':String(range?range.end-range.start+1:row.byte_length),...(range?{'content-range':`bytes ${range.start}-${range.end}/${row.byte_length}`}:{})};
      if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
      const source=await downloadVideo(row,env,range,fetchProvider);
      return new Response(source.body,{status:range?206:200,headers});
    }catch{return new Response(null,{status:503,headers:PUBLIC_HEADERS});}
  };
}
export const onRequest=createVideoReadHandler();
