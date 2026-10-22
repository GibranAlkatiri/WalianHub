import { expect,test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createVideoUploadHandler } from '../functions/api/video.js';
import { createVideoReadHandler } from '../functions/videos/[file].js';
import { createCmsHandler } from '../functions/api/cms.js';
import { VIDEO_LIMIT,videoRange } from '../server/cms-video.js';
import { onRequestPost } from '../functions/api/auth.js';
import { sha256 } from '../server/cms-session.js';
import { sqliteD1 } from './helpers/d1-sqlite.js';
import { fakeCloudinary } from './helpers/cms-cloudinary.js';
import { createVideoDigest } from './helpers/video-digest.js';

// Pemeriksaan header diikuti decode/metadata provider. Fixture minimal tidak dikirim ke internet.
export const mp4=Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,2,0,105,115,111,109,105,115,111,50,0,0,0,8,109,100,97,116]);
const config=readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8');
const schema=['0001_content.sql','0002_sessions.sql','0003_media.sql','0004_media_cleanup.sql','0005_video.sql'].map(n=>readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8')).join('\n');
const content=JSON.parse(readFileSync(new URL('../src/content/pengaturan/profil.json',import.meta.url),'utf8'));
async function setup(){
  const db=sqliteD1(schema),provider=fakeCloudinary();
  const env={CMS_DB:db,CMS_SESSION_AUTH:'1',CMS_PENGATURAN_D1:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_VIDEO_CLOUDINARY:'1',
    CMS_USERNAME:'walian',CMS_PASSWORD_HASH:await sha256('demo'),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret',ASSETS:{fetch:async()=>new Response(config)}};
  db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('video-fixture','test/repo','a'.repeat(40),'2026-10-23');
  db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('pengaturan','profil','src/content/pengaturan/profil.json',JSON.stringify(content),'b'.repeat(40),'video-fixture');
  const login=await onRequestPost({env,request:new Request('https://cms.example/api/auth',{method:'POST',headers:{origin:'https://cms.example','content-type':'application/json'},body:JSON.stringify({username:'walian',password:'demo'})})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const upload=createVideoUploadHandler(provider.fetch,createVideoDigest),read=createVideoReadHandler(provider.fetch),cms=createCmsHandler(async()=>{throw new Error('GitHub tidak boleh dipakai.');});
  const put=(options={})=>{
    const bytes=options.bytes||mp4,id=options.id||crypto.randomUUID();
    const sha=options.sha||createHash('sha256').update(bytes).digest('hex');
    const params=new URLSearchParams({id,sha256:sha,bytes:String(options.length??bytes.length),collection:'pengaturan',slug:'profil',...options.params});
    return upload({env:{...env,...options.env},request:new Request('https://cms.example/api/video?'+params,{method:'POST',headers:{cookie,origin:'https://cms.example','content-type':'video/mp4',...options.headers},body:options.body||bytes})});
  };
  const get=(path,options={})=>read({env:{...env,...options.env},request:new Request('https://cms.example'+path,{method:options.method||'GET',headers:{...(options.auth?{cookie}:{}),...options.headers}})});
  const call=(action,data,entry)=>{
    const post=data!==undefined;
    return cms({env,request:new Request('https://cms.example/api/cms'+(post?'':`?action=${action}&collection=pengaturan&slug=profil`),{method:post?'POST':'GET',headers:{cookie,...(post?{origin:'https://cms.example','content-type':'application/json'}:{})},...(post?{body:JSON.stringify({action,collection:'pengaturan',slug:'profil',...data,...(entry?{revision:entry.revision,publishedSha:entry.publishedSha}:{})})}:{})})});
  };
  return {db,env,provider,cookie,put,get,call};
}

test('video privat mengikuti draf, terbit, penggantian, dan penghapusan isian Profil; byte range mendukung seek',async()=>{
  const s=await setup();try{
    expect((await(await s.call('config')).json()).video_max_bytes).toBe(VIDEO_LIMIT);
    const upload=await s.put();expect(upload.status).toBe(200);const video=await upload.json();
    expect((await s.get(video.path)).status).toBe(404);
    expect((await s.get(video.path,{auth:true})).status).toBe(200);
    const data=structuredClone(content);data.videoProfil={url:video.path,judul:'Potensi Walian',deskripsi:''};
    let current=await(await s.call('entry')).json();
    let draft=await(await s.call('save',{data},current)).json();expect(draft.revision).toStartWith('d1:');
    expect((await s.get(video.path)).status).toBe(404);
    expect((await s.call('publish',{},draft)).status).toBe(200);
    const part=await s.get(video.path,{headers:{range:'bytes=4-11'}});expect(part.status).toBe(206);expect(part.headers.get('content-range')).toBe(`bytes 4-11/${mp4.length}`);expect(new Uint8Array(await part.arrayBuffer())).toEqual(mp4.slice(4,12));
    const before=s.provider.requests.length;const head=await s.get(video.path,{method:'HEAD'});expect(head.status).toBe(200);expect(head.headers.get('content-length')).toBe(String(mp4.length));expect(s.provider.requests).toHaveLength(before);
    expect((await s.get(video.path,{headers:{range:'bytes=999-'}})).status).toBe(416);
    expect((await s.get(video.path,{headers:{range:'bytes=0-1,4-5'}})).status).toBe(416);
    const next=await(await s.put()).json();current=await(await s.call('entry')).json();data.videoProfil.url=next.path;
    draft=await(await s.call('save',{data},current)).json();expect((await s.get(video.path)).status).toBe(200);expect((await s.get(next.path)).status).toBe(404);
    expect((await s.call('publish',{},draft)).status).toBe(200);expect((await s.get(video.path)).status).toBe(404);expect((await s.get(next.path)).status).toBe(200);
    current=await(await s.call('entry')).json();data.videoProfil.url='';draft=await(await s.call('save',{data},current)).json();expect((await s.call('publish',{},draft)).status).toBe(200);expect((await s.get(next.path)).status).toBe(404);
    expect(s.db.raw.query('SELECT count(*) AS n FROM cms_media').get().n).toBe(0);
  }finally{s.db.close();}
});

test('video memerlukan sesi, origin yang sama, flag aktif, tujuan benar, ukuran dan MP4 valid',async()=>{
  const s=await setup();try{
    for(const [options,status] of [
      [{headers:{cookie:''}},401],[{headers:{origin:'https://evil.example'}},403],
      [{params:{slug:'beranda'}},422],[{headers:{'content-type':'image/png'}},415],
      [{length:VIDEO_LIMIT+1},413],[{bytes:new Uint8Array(32)},422],
      [{env:{CMS_VIDEO_CLOUDINARY:'0'}},404],[{env:{CMS_PENGATURAN_D1:'0'}},404],
    ])expect((await s.put(options)).status).toBe(status);
    expect(s.provider.requests).toHaveLength(0);
    const wrongHash=await s.put({sha:'f'.repeat(64)});expect(wrongHash.status).toBe(422);expect(await wrongHash.text()).not.toContain('provider-test-secret');
    expect(s.db.raw.query('SELECT count(*) AS n FROM cms_videos WHERE ready=1').get().n).toBe(0);
    s.provider.options.videoMetadata={duration:301};expect((await s.put()).status).toBe(422);
    s.provider.options.videoMetadata={video:{codec:'hevc'}};expect((await s.put()).status).toBe(422);
  }finally{s.db.close();}
});

test('respons hilang dapat dicoba lagi dengan ID sama tanpa menimpa video; kegagalan provider/database tidak membocorkan rahasia',async()=>{
  const s=await setup();try{
    const id=crypto.randomUUID();s.provider.options.loseResponse=true;
    expect((await s.put({id})).status).toBe(503);expect(s.provider.objects.size).toBe(1);
    const success=await s.put({id});expect(success.status).toBe(200);expect(s.provider.objects.size).toBe(1);
    expect((await s.put({id,sha:'a'.repeat(64)})).status).toBe(409);
    s.provider.options.outage=true;const failed=await s.put();expect(failed.status).toBe(503);expect(await failed.text()).not.toContain('provider-test-secret');
    s.db.raw.exec('DROP TABLE cms_videos');const broken=await s.put();expect(broken.status).toBe(503);expect(await broken.text()).not.toContain('SELECT');
  }finally{s.db.close();}
});

test('URL video palsu atau belum siap ditolak saat simpan; provider range yang salah gagal tertutup',async()=>{
  const s=await setup();try{
    const data=structuredClone(content);data.videoProfil.url='/videos/'+crypto.randomUUID()+'.mp4';
    const current=await(await s.call('entry')).json();expect((await s.call('save',{data},current)).status).toBe(422);
    data.videoProfil.url='javascript:alert(1)';expect((await s.call('save',{data},current)).status).toBe(422);
    const path=(await(await s.put()).json()).path;
    const read=createVideoReadHandler(async()=>new Response(mp4,{headers:{'content-type':'video/mp4'}}));
    const r=await read({env:s.env,request:new Request('https://cms.example'+path,{headers:{cookie:s.cookie,range:'bytes=0-2'}})});
    expect(r.status).toBe(503);
  }finally{s.db.close();}
});

test('rentang suffix/open-ended dan rentang rusak ditangani tanpa unduhan penuh',()=>{
  expect(videoRange('bytes=-5',20)).toEqual({start:15,end:19});
  expect(videoRange('bytes=2-',20)).toEqual({start:2,end:19});
  for(const value of ['bytes=-0','bytes=8-2','bytes=20-','bytes=0-1,4-5','bytes=-','bytes=999999999999999999999-'])expect(()=>videoRange(value,20)).toThrow();
});

test('header MP4 yang terpecah tetap valid; unggahan terpotong atau melewati ukuran deklarasi ditolak',async()=>{
  const s=await setup();try{
    const body=(size)=>new ReadableStream({start(controller){for(let i=0;i<mp4.length;i+=size)controller.enqueue(mp4.slice(i,i+size));controller.close();}});
    expect((await s.put({body:body(3)})).status).toBe(200);
    expect((await s.put({length:40,body:body(16)})).status).toBe(422);
    expect((await s.put({length:28,body:body(16)})).status).toBe(413);
    expect(s.db.raw.query('SELECT count(*) AS n FROM cms_videos WHERE ready=1').get().n).toBe(1);
  }finally{s.db.close();}
});
