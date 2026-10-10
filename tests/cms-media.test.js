import { describe,test,expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createCmsHandler,serializeContent } from '../functions/api/cms.js';
import { createMediaHandler } from '../functions/api/media.js';
import { createImageHandler } from '../functions/media/[file].js';
import { onRequestPost } from '../functions/api/auth.js';
import { sha256 } from '../server/cms-session.js';
import { mediaPaths } from '../server/cms-media.js';
import { sqliteD1 } from './helpers/d1-sqlite.js';
import { fakeGithub } from './helpers/cms-github.js';
import { fakeCloudinary,png } from './helpers/cms-cloudinary.js';
const config = readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8');
const schema = ['0001_content.sql','0002_sessions.sql','0003_media.sql'].map((name)=>readFileSync(new URL('../migrations/' + name,import.meta.url),'utf8')).join('\n');
const data = {judul:'Layanan foto',ringkasan:'Panduan warga',ikon:'file-text',unggulan:true,urutan:1,persyaratan:[],alur:[],diperbarui:'2026-10-10',body:''};
const destinasi = {nama:'Contoh wisata',kategori:'Alam',ringkasan:'Tempat wisata',gambar:'',lokasi:{alamat:'Walian',lat:1,lng:124},unggulan:true,urutan:1,diperbarui:'2026-10-10',body:''};
async function setup() {
  const db = sqliteD1(schema),provider = fakeCloudinary();
  db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture','test/repo','a'.repeat(40),'2026-10-10');
  db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan','contoh','src/content/layanan/contoh.md',JSON.stringify(data),'b'.repeat(40),'fixture');
  const github = fakeGithub({'src/content/destinasi/contoh.md':serializeContent(destinasi,'contoh.md')},'GibranAlkatiri/WalianHub');
  const env = {CMS_SESSION_AUTH:'1',CMS_LAYANAN_D1:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_DB:db,CMS_USERNAME:'walian',CMS_PASSWORD_HASH:await sha256('demo'),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret',GITHUB_TOKEN:'github-test-only',ASSETS:{fetch:async()=>new Response(config)}};
  const login = await onRequestPost({env,request:new Request('https://cms.example/api/auth',{method:'POST',headers:{origin:'https://cms.example','content-type':'application/json'},body:JSON.stringify({username:'walian',password:'demo'})})});
  const cookie = login.headers.get('set-cookie').split(';')[0],cms = createCmsHandler(github.fetch),upload = createMediaHandler(provider.fetch),image = createImageHandler(provider.fetch,github.fetch);
  const call = (action,params = {},method = 'GET') => {
    const url = new URL('https://cms.example/api/cms');
    if (method === 'GET') for (const [key,value] of Object.entries({action,collection:'layanan',slug:'contoh',...params})) url.searchParams.set(key,value);
    return cms({env,request:new Request(url,{method,headers:{cookie,...(method === 'POST'?{origin:url.origin,'content-type':'application/json'}:{})},...(method === 'POST'?{body:JSON.stringify({action,collection:'layanan',slug:'contoh',...params})}:{})})});
  };
  const put = (extra = {}) => {
    const {collection = 'layanan',slug = 'contoh',id = crypto.randomUUID(),bytes = png,type = 'image/png',headers = {},binding = {},method = 'POST'} = extra;
    return upload({env:{...env,...binding},request:new Request(`https://cms.example/api/media?collection=${collection}&slug=${slug}&id=${id}`,{method,headers:{cookie,origin:'https://cms.example','content-type':type,...headers},...(method === 'POST'?{body:bytes}:{})})});
  };
  const get = (path,authenticated = false,extra = {}) => image({env:{...env,...extra.env},request:new Request('https://cms.example' + path,{method:extra.method || 'GET',headers:authenticated ? {cookie} : {}})});
  const guard = (entry) => ({revision:entry.revision,publishedSha:entry.publishedSha});
  const entry = async (collection='layanan') => (await call('entry',{collection})).json();
  return {db,provider,github,env,cookie,call,put,get,guard,entry};
}
describe('Foto Cloudinary mengikuti status konten CMS',()=>{
  test('unggahan biner langsung, metadata tanpa rahasia dan percobaan ulang tanpa duplikasi',async()=>{
    const s=await setup();try {
      const id=crypto.randomUUID(),first=await s.put({id});expect(first.status).toBe(200);const photo=await first.json();
      expect(photo.path).toBe(`/media/${id}.png`);expect(photo.bytes).toBe(png.length);expect(s.github.requests).toHaveLength(0);
      expect((await(await s.call('config')).json()).media_upload).toBe('/api/media');
      const row=s.db.raw.query('SELECT * FROM cms_media WHERE id=?').get(id);expect(row.ready).toBe(1);expect(row.sha256).toHaveLength(64);expect(row.provider_key).toBe(`walianhub/${id}-${row.sha256}`);expect(JSON.stringify(row)).not.toContain('provider-test-secret');
      expect((await s.put({id})).status).toBe(200);expect(s.provider.objects.size).toBe(1);expect(s.provider.requests).toHaveLength(1);
    } finally {s.db.close();}
  });
  test('gambar draf privat, revisi tidak menutup versi terbit, tarik/terbit ulang/hapus langsung berlaku',async()=>{
    const s=await setup();try {
      s.env.GITHUB_TOKEN='';const photo=await(await s.put()).json();expect((await s.get(photo.path)).status).toBe(404);expect((await s.get(photo.path,true)).status).toBe(200);
      let entry=await s.entry(),draft=await(await s.call('save',{...s.guard(entry),data:{...data,body:`![Contoh](${photo.path})`}},'POST')).json();
      expect((await s.get(photo.path)).status).toBe(404);expect((await s.call('publish',s.guard(draft),'POST')).status).toBe(200);
      const visible=await s.get(photo.path);expect(visible.status).toBe(200);expect(visible.headers.get('cache-control')).toContain('no-store');expect(visible.headers.has('location')).toBe(false);expect(await visible.bytes()).toEqual(png);
      const newer=await(await s.put()).json();entry=await s.entry();draft=await(await s.call('save',{...s.guard(entry),data:{...entry.data,body:`![Baru](${newer.path})`}},'POST')).json();
      expect((await s.get(newer.path)).status).toBe(404);expect((await s.get(photo.path)).status).toBe(200);
      const withdrawal=await(await s.call('withdraw',s.guard(draft),'POST')).json();expect((await s.call('publish',s.guard(withdrawal),'POST')).status).toBe(200);
      expect((await s.get(photo.path)).status).toBe(404);expect((await s.get(newer.path)).status).toBe(404);expect((await s.get(newer.path,true)).status).toBe(200);
      entry=await s.entry();draft=await(await s.call('save',{...s.guard(entry),data:entry.data},'POST')).json();await s.call('publish',s.guard(draft),'POST');expect((await s.get(newer.path)).status).toBe(200);
      entry=await s.entry();const deletion=await(await s.call('delete',s.guard(entry),'POST')).json();await s.call('publish',s.guard(deletion),'POST');expect((await s.get(newer.path)).status).toBe(404);
      expect(s.github.requests).toHaveLength(0);
    } finally {s.db.close();}
  });
  test('menu GitHub menyimpan alamat gambar, bukan berkas foto, sampai menunya dimigrasikan',async()=>{
    const s=await setup();try {
      const photo=await(await s.put({collection:'destinasi'})).json();let entry=await s.entry('destinasi');
      const draft=await(await s.call('save',{collection:'destinasi',...s.guard(entry),data:{...destinasi,gambar:photo.path},uploads:[]},'POST')).json();
      expect((await s.get(photo.path)).status).toBe(404);expect(s.github.requests.filter((item)=>item.path==='git/blobs'&&item.body.encoding==='base64')).toHaveLength(0);
      expect((await s.call('publish',{collection:'destinasi',...s.guard(draft)},'POST')).status).toBe(200);expect((await s.get(photo.path)).status).toBe(200);
      entry=await s.entry('destinasi');const deletion=await(await s.call('delete',{collection:'destinasi',...s.guard(entry)},'POST')).json();await s.call('publish',{collection:'destinasi',...s.guard(deletion)},'POST');expect((await s.get(photo.path)).status).toBe(404);
    } finally {s.db.close();}
  });
  test('sesi, origin, tujuan, metode dan saklar tidak bisa dilewati',async()=>{
    const s=await setup();try {
      expect((await s.put({headers:{cookie:''}})).status).toBe(401);expect((await s.put({headers:{cookie:'invalid'}})).status).toBe(401);
      expect((await s.put({headers:{origin:'https://attacker.example'}})).status).toBe(403);expect((await s.put({headers:{'sec-fetch-site':'cross-site'}})).status).toBe(403);
      expect((await s.put({collection:'unknown'})).status).toBe(404);expect((await s.put({slug:'../secret'})).status).toBe(404);
      expect((await s.put({collection:'pengaturan',slug:'unknown'})).status).toBe(404);expect((await s.put({id:'unsafe'})).status).toBe(422);
      expect((await s.put({method:'GET'})).status).toBe(405);expect((await s.put({binding:{CMS_MEDIA_CLOUDINARY:'0'}})).status).toBe(404);
      expect((await s.put({binding:{CMS_SESSION_AUTH:'0'}})).status).toBe(503);expect((await s.put({binding:{CMS_DB:undefined}})).status).toBe(503);expect(s.provider.objects.size).toBe(0);
    } finally {s.db.close();}
  });
  test('draf foto menu lama di Preview tidak membuat PR baru atau masuk ke main',async()=>{
    const s=await setup();try {
      s.env.CMS_MIGRATION_PREVIEW='1';const main=s.github.refs.get('main'),photo=await(await s.put({collection:'destinasi'})).json(),entry=await s.entry('destinasi');
      const saved=await s.call('save',{collection:'destinasi',...s.guard(entry),data:{...destinasi,gambar:photo.path}},'POST');expect(saved.status).toBe(200);const draft=await saved.json();expect(draft.warning).toContain('Foto dan draf sudah tersimpan');
      expect(s.github.pulls).toHaveLength(0);const result=await s.call('publish',{collection:'destinasi',...s.guard(draft)},'POST');expect(result.status).toBe(409);expect(s.github.refs.get('main')).toBe(main);
      expect((await s.get(photo.path)).status).toBe(404);expect((await s.get(photo.path,true)).status).toBe(200);
    } finally {s.db.close();}
  });
  test('WebP tersimpan dengan jenis yang benar; HEAD dan metode penulisan menjaga akses gambar',async()=>{
    const s=await setup();try {
      const bytes=new Uint8Array(readFileSync(new URL('../public/images/beranda/kantor-kelurahan-walian.webp',import.meta.url)));
      const photo=await(await s.put({type:'image/webp',bytes})).json();expect(photo.path).toEndWith('.webp');
      const response=await s.get(photo.path,true);expect(response.headers.get('content-type')).toBe('image/webp');expect(await response.bytes()).toEqual(bytes);
      expect((await s.get(photo.path,false,{method:'HEAD'})).status).toBe(404);const head=await s.get(photo.path,true,{method:'HEAD'});expect(head.status).toBe(200);expect(await head.text()).toBe('');
      expect((await s.get(photo.path,true,{method:'POST'})).status).toBe(405);
    } finally {s.db.close();}
  });
  test('jenis, signature berkas dan ukuran dibatasi sebelum menghubungi penyimpanan',async()=>{
    const s=await setup();try {
      expect((await s.put({type:'image/svg+xml',bytes:new TextEncoder().encode('<svg/>')})).status).toBe(415);
      expect((await s.put({bytes:new TextEncoder().encode('<script>bad</script>')})).status).toBe(422);
      expect((await s.put({bytes:new Uint8Array()})).status).toBe(422);
      expect((await s.put({type:'image/jpeg'})).status).toBe(422);expect((await s.put({headers:{'content-length':'5242881'}})).status).toBe(413);
      expect((await s.put({bytes:new Uint8Array(5242881)})).status).toBe(413);expect(s.provider.objects.size).toBe(0);
    } finally {s.db.close();}
  });
  test('foto milik konten lain dan ID yang digunakan ulang tidak menimpa berkas atau draf',async()=>{
    const s=await setup();try {
      const id=crypto.randomUUID(),photo=await(await s.put({id})).json();expect((await s.put({id,slug:'lain'})).status).toBe(409);
      const changed=png.slice();changed[30]^=1;expect((await s.put({id,bytes:changed})).status).toBe(409);expect(s.provider.objects.size).toBe(1);
      const entry=await s.entry('destinasi');expect((await s.call('save',{collection:'destinasi',...s.guard(entry),data:{...destinasi,gambar:photo.path}},'POST')).status).toBe(422);
      expect(mediaPaths({nested:[photo.path,`![Foto](${photo.path})`,photo.path + '.html']})).toEqual([photo.path]);
      expect((await s.get('/media/../../secret')).status).toBe(404);
    } finally {s.db.close();}
  });
  test('respons unggahan hilang dapat dicoba ulang; unggahan bersamaan tetap satu objek',async()=>{
    const s=await setup();try {
      const id=crypto.randomUUID();s.provider.options.loseResponse=true;expect((await s.put({id})).status).toBe(503);expect(s.provider.objects.size).toBe(1);
      const results=await Promise.all([s.put({id}),s.put({id})]);expect(results.map((item)=>item.status)).toEqual([200,200]);expect(s.provider.objects.size).toBe(1);
      expect(s.db.raw.query('SELECT COUNT(*) AS total FROM cms_media WHERE ready=1').get().total).toBe(1);
    } finally {s.db.close();}
  });
  test('penyimpanan rusak gagal tanpa fallback GitHub atau bocoran rahasia',async()=>{
    const s=await setup();try {
      s.provider.options.outage=true;let response=await s.put();expect(response.status).toBe(503);expect(await response.text()).not.toContain('provider-test-secret');
      response=await s.put({binding:{CLOUDINARY_API_SECRET:''}});expect(response.status).toBe(503);expect(s.github.requests).toHaveLength(0);
      s.db.raw.exec('DROP TABLE cms_media');response=await s.put();expect(response.status).toBe(503);expect(await response.text()).not.toContain('SQLITE');
    } finally {s.db.close();}
  });
});
