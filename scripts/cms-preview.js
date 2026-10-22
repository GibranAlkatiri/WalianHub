import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { load } from 'js-yaml';
import { createCmsHandler, parseContent } from '../functions/api/cms.js';
import { fakeGithub } from '../tests/helpers/cms-github.js';
import { sqliteD1 } from '../tests/helpers/d1-sqlite.js';
import { onRequestGet, onRequestPost, onRequestDelete } from '../functions/api/auth.js';
import { sha256 } from '../server/cms-session.js';
import { gitBlobSha } from './lib/cms-snapshot.js';
import { createVideoUploadHandler } from '../functions/api/video.js';
import { createVideoReadHandler } from '../functions/videos/[file].js';
import { fakeCloudinary } from '../tests/helpers/cms-cloudinary.js';
import { createVideoDigest } from '../tests/helpers/video-digest.js';
import { onRequest as publicPage } from '../functions/_middleware.js';
import { onRequest as publicSettings } from '../functions/api/pengaturan.js';

const repo = resolve(import.meta.dir, '..');
const files = {};
for await (const path of new Bun.Glob('src/content/**/*.{md,json}').scan({ cwd: repo })) files[path.replaceAll('\\', '/')] = await readFile(resolve(repo, path), 'utf8');
const config = await readFile(resolve(repo, 'public/admin/config.yml'), 'utf8');
const github = fakeGithub(files, load(config).backend.repo);
const handler = createCmsHandler(github.fetch);
const videoPreview = process.env.CMS_PREVIEW_VIDEO === '1';
const migrations = ['0001_content.sql','0002_sessions.sql',...(videoPreview?['0003_media.sql','0004_media_cleanup.sql','0005_video.sql']:[])];
const sessions = sqliteD1((await Promise.all(migrations.map(name=>readFile(resolve(repo,'migrations',name),'utf8')))).join('\n'));
sessions.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('local-demo', 'local/demo', '0'.repeat(40), new Date().toISOString());
for (const [path, raw] of Object.entries(files).filter(([path]) => path.startsWith('src/content/layanan/'))) {
  const slug = path.split('/').at(-1).replace(/\.md$/, '');
  sessions.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan', slug, path, JSON.stringify(parseContent(raw, path)), gitBlobSha(Buffer.from(raw)), 'local-demo');
}
const legacy = process.env.CMS_PREVIEW_AUTH === 'legacy';
const env = { CMS_LAYANAN_D1: legacy || process.env.CMS_PREVIEW_STORAGE === 'github' ? '0' : '1', CMS_SESSION_AUTH: legacy ? '0' : '1', CMS_DB: sessions, CMS_USERNAME: 'walian', CMS_PASSWORD_HASH: await sha256('demo'), GITHUB_TOKEN: 'local-preview-only', ASSETS: { fetch: async () => new Response(config) } };
const provider=fakeCloudinary();
if(videoPreview){
  if(legacy)throw new Error('Pratinjau video memerlukan mode sesi.');
  Object.assign(env,{CMS_PENGATURAN_D1:'1',CMS_PUBLIC_PENGATURAN_D1:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_VIDEO_CLOUDINARY:'1',CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret'});
  for(const slug of ['situs','beranda','profil']){
    const path=`src/content/pengaturan/${slug}.json`,raw=files[path];
    sessions.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('pengaturan',slug,path,raw,gitBlobSha(Buffer.from(raw)),'local-demo');
  }
  provider.options.videoMetadata={duration:181.185,width:1280,height:720};
}
const videoUpload=createVideoUploadHandler(provider.fetch,createVideoDigest),videoRead=createVideoReadHandler(provider.fetch);
const distRoot=resolve(repo,'dist');
const publicAsset=async(request)=>{
  const pathname=new URL(request.url).pathname;
  const path=resolve(distRoot,'.'+pathname+(pathname.endsWith('/')?'index.html':/\.[a-z0-9]+$/i.test(pathname)?'':'/index.html'));
  if(!path.startsWith(distRoot+(process.platform==='win32'?'\\':'/')))return new Response(null,{status:404});
  const file=Bun.file(path);return await file.exists()?new Response(file):new Response(null,{status:404});
};
const types = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.yml': 'text/yaml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = Bun.serve({
  hostname: '127.0.0.1', port: Number(process.env.CMS_PREVIEW_PORT || 54584),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cms') return handler({ request, env });
    if (videoPreview && url.pathname === '/api/video') return videoUpload({request,env});
    if (videoPreview && url.pathname.startsWith('/videos/')) return videoRead({request,env});
    if (videoPreview && url.pathname === '/api/pengaturan') return publicSettings({request,env});
    if (videoPreview && !url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/')) {
      const response=await publicPage({request,env:{...env,ASSETS:{fetch:publicAsset}},next:()=>publicAsset(request)});
      const headers=new Headers(response.headers);
      const csp=(await readFile(resolve(repo,'public/_headers'),'utf8')).split('\n').find(line=>line.trim().startsWith('Content-Security-Policy:')).split('Content-Security-Policy:')[1].trim();
      headers.set('content-security-policy',csp);
      return new Response(response.body,{status:response.status,headers});
    }
    if (url.pathname === '/api/auth') {
      const route = { GET: onRequestGet, POST: onRequestPost, DELETE: onRequestDelete }[request.method];
      return route ? route({ request, env }) : new Response(null, { status: 405 });
    }
    const path = resolve(repo, 'public', '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!path.startsWith(resolve(repo, 'public') + (process.platform === 'win32' ? '\\' : '/'))) return new Response('Not found', { status: 404 });
    try {
      let data = await readFile(path);
      if (url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
        const preview = '<script>window.WALIAN_DEMO=true;</script>';
        data = Buffer.from(data.toString().replace('<body>', '<body>' + preview).replace('Khusus pengelola konten kelurahan.', 'Pratinjau lokal: username walian, password demo.'));
      }
      return new Response(data, { headers: { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } });
    } catch { return new Response('Not found', { status: 404 }); }
  },
});
console.log(`PREVIEW ${server.url}admin/`);
