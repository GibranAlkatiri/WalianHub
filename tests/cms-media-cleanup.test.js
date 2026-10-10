import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sqliteD1} from './helpers/d1-sqlite.js';
import {cleanupMedia,MEDIA_GRACE_MS,cloudIdentity} from '../server/cms-media-cleanup.js';
import {createCleanupHandler} from '../functions/api/media-cleanup.js';
import {scheduledCleanup} from '../workers/media-cleanup.js';
import {png} from './helpers/cms-cloudinary.js';
import {createImageHandler} from '../functions/media/[file].js';
import {assertMediaReferences} from '../server/cms-media.js';
const schema=['0001_content.sql','0002_sessions.sql','0003_media.sql','0004_media_cleanup.sql'].map(name=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8')).join('\n');
const now=Date.now(),old=now-2*MEDIA_GRACE_MS;
function setup(){
  const databases=[sqliteD1(schema),sqliteD1(schema)];
  for(const db of databases)db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture','test/repo','a'.repeat(40),'2026-10-10');
  const env={CMS_DB:databases[0],CMS_MEDIA_CLEANUP_PEER_DB:databases[1],CMS_MEDIA_CLEANUP_ENABLED:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_LAYANAN_D1:'1',CMS_DESTINASI_D1:'1',CMS_PENGUMUMAN_D1:'1',CMS_PENGATURAN_D1:'1',CLOUDINARY_CLOUD_NAME:'test-cloud',CMS_MEDIA_CLEANUP_SHARED_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret',CMS_MEDIA_CLEANUP_TOKEN:'scheduler-test-token-'.repeat(3)};
  const requests=[];
  env.CMS_MEDIA_CLEANUP_PEER_URL='https://preview.example/api/media-cleanup';
  const peer=async()=>Response.json({ok:true,schema:1,collectionsD1:true,cloudIdentity:await cloudIdentity('test-cloud')});
  const provider=async(input,init)=>{
    expect(input).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/destroy');
    const form=init.body;expect(form.get('type')).toBe('authenticated');expect(form.get('invalidate')).toBe('true');expect(form.get('api_key')).toBe('123456');
    const signed=`invalidate=true&public_id=${form.get('public_id')}&timestamp=${form.get('timestamp')}&type=authenticatedprovider-test-secret`;
    expect(form.get('signature')).toBe(createHash('sha1').update(signed).digest('hex'));
    requests.push(form.get('public_id'));return Response.json({result:'ok'});
  };
  return{databases,env,requests,provider,peer,close(){databases.forEach(db=>db.close());}};
}
function photo(db,{id=crypto.randomUUID(),created=old,cloud='test-cloud'}={}){
  const key=`walianhub/${id}-${'b'.repeat(64)}`,path=`/media/${id}.png`;
  db.raw.query(`INSERT INTO cms_media(id,public_path,collection,slug,source_path,provider_key,content_type,format,byte_length,sha256,ready,created_at,provider_cloud) VALUES (?,?,?,?,?,?,?,'png',10,?,1,?,?)`).run(id,path,'destinasi','contoh','src/content/destinasi/contoh.md',key,'image/png','b'.repeat(64),new Date(created).toISOString(),cloud);
  return{id,key,path};
}
function content(db,path,{draft=false,slug='contoh'}={}){
  db.raw.query(`INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,draft_json,draft_blob_sha,draft_action,draft_revision,snapshot_id)
    VALUES ('destinasi',?,?,?,?,?,?,?,?, 'fixture')`).run(slug,`src/content/destinasi/${slug}.md`,draft?null:JSON.stringify({gambar:path}),draft?null:'c'.repeat(40),draft?JSON.stringify({gambar:path}):null,draft?'d'.repeat(40):null,draft?'edit':null,draft?'d'.repeat(40):null);
}
async function mature(s){await cleanupMedia(s.env,{dryRun:false,now:old,fetchProvider:s.provider,fetchPeer:s.peer});}
const collect=(s,extra={})=>cleanupMedia(s.env,{dryRun:false,now,fetchProvider:s.provider,fetchPeer:s.peer,...extra});

test('dry-run tidak mengubah database atau menghubungi provider',async()=>{
  const s=setup();try{photo(s.databases[0]);const report=await cleanupMedia(s.env,{now,fetchProvider:s.provider,fetchPeer:s.peer});expect(report.pending).toBe(1);expect(s.requests).toHaveLength(0);for(const db of s.databases)expect(db.raw.query('SELECT COUNT(*) n FROM cms_media_cleanup').get().n).toBe(0);}finally{s.close();}
});
test('foto terbit dan draf di Production maupun Preview dilindungi, termasuk JSON bertingkat dan Markdown',async()=>{
  const s=setup();try{const a=photo(s.databases[0]),b=photo(s.databases[0]),c=photo(s.databases[1]);content(s.databases[0],a.path);content(s.databases[1],`![Foto](${b.path})`,{draft:true});content(s.databases[1],c.path,{slug:'kedua'});expect((await collect(s)).protected).toBe(3);expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('foto yatim menunggu tujuh hari penuh, lalu dihapus dengan invalidasi CDN dan tombstone kedua database',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);expect((await collect(s)).pending).toBe(1);expect((await collect(s,{now:now+MEDIA_GRACE_MS-1})).deleted).toBe(0);expect((await collect(s,{now:now+MEDIA_GRACE_MS})).deleted).toBe(1);expect(s.requests).toEqual([p.key]);for(const db of s.databases)expect(db.raw.query('SELECT state FROM cms_media_cleanup').get().state).toBe('deleted');expect((await collect(s,{now:now+2*MEDIA_GRACE_MS})).total).toBe(0);}finally{s.close();}
});
test('foto dari Preview dibersihkan dan objek bersama hanya dihapus sekali',async()=>{
  const s=setup();try{const p=photo(s.databases[1]);photo(s.databases[0],{id:p.id});await mature(s);expect((await collect(s)).deleted).toBe(1);expect(s.requests).toHaveLength(1);}finally{s.close();}
});
test('pemakaian di antara jadwal harian memulai ulang masa tunggu',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);await mature(s);content(s.databases[0],p.path);s.databases[0].raw.query("DELETE FROM cms_content WHERE slug='contoh'").run();expect((await collect(s)).pending).toBe(1);expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('penyimpanan dan reuse upload-ID serentak diblokir sebelum permintaan hapus',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);await mature(s);const fetchProvider=async(...args)=>{expect(()=>content(s.databases[0],p.path)).toThrow('CMS_MEDIA_REMOVED');expect(()=>photo(s.databases[1],{id:p.id})).toThrow('CMS_MEDIA_REMOVED');return s.provider(...args);};expect((await collect(s,{fetchProvider})).deleted).toBe(1);}finally{s.close();}
});
test('referensi yang muncul saat claim lintas database membatalkan penghapusan',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);photo(s.databases[1],{id:p.id});await mature(s);const peer=s.databases[1],original=peer.prepare;let inserted=false;peer.prepare=(sql)=>{if(sql.includes("VALUES (?,?,'deleting'")&&!inserted){inserted=true;content(peer,p.path,{draft:true});}return original(sql);};const report=await collect(s);expect(report.deleted).toBe(0);expect(report.failed).toBe(1);expect(s.requests).toHaveLength(0);expect(s.databases[0].raw.query('SELECT state FROM cms_media_cleanup').get().state).toBe('pending');}finally{s.close();}
});
test('upload baru dengan provider key lama mengulang masa tunggu',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);await mature(s);photo(s.databases[1],{id:p.id,created:now});expect((await collect(s)).pending).toBe(1);expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('provider gagal atau respons hilang mempertahankan claim, dan not found aman untuk retry',async()=>{
  const s=setup();try{photo(s.databases[0]);await mature(s);expect((await collect(s,{fetchProvider:async()=>{throw new Error('provider-test-secret');}})).failed).toBe(1);for(const db of s.databases)expect(db.raw.query('SELECT state FROM cms_media_cleanup').get().state).toBe('deleting');expect((await collect(s,{fetchProvider:async()=>Response.json({result:'not found'})})).deleted).toBe(1);}finally{s.close();}
});
test('database/schema Preview hilang membatalkan seluruh proses; bukan dianggap kosong',async()=>{
  const s=setup();try{photo(s.databases[0]);await mature(s);s.databases[1].raw.exec('DROP VIEW cms_media_current_references; DROP TABLE cms_content;');await expect(collect(s)).rejects.toThrow();expect(s.requests).toHaveLength(0);expect(s.databases[0].raw.query('SELECT last_status FROM cms_media_cleanup_run').get().last_status).toBe('aborted');}finally{s.close();}
});
test('run serentak ditolak dan konfigurasi cloud/binding/flag yang tidak sesuai gagal tertutup',async()=>{
  const s=setup();try{s.databases[0].raw.query('INSERT INTO cms_media_cleanup_run(id,owner,expires_at) VALUES (1,?,?)').run('another-run',now+1000);expect((await collect(s)).busy).toBe(true);for(const change of [{CMS_MEDIA_CLEANUP_PEER_DB:null},{CMS_MEDIA_CLEANUP_SHARED_CLOUD_NAME:'other-cloud'},{CMS_DESTINASI_D1:'0'}])await expect(cleanupMedia({...s.env,...change},{dryRun:false,now})).rejects.toThrow('CLEANUP_CONFIGURATION');}finally{s.close();}
});
test('objek di luar format milik CMS dan data media rusak tidak pernah dihapus',async()=>{
  const s=setup();try{photo(s.databases[0]);s.databases[0].raw.query("UPDATE cms_media SET provider_key='other-app/photo'").run();await expect(collect(s)).rejects.toThrow('CLEANUP_MEDIA_DATA');expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('foto yang cloud asalnya tidak diketahui atau berbeda dipertahankan',async()=>{
  const s=setup();try{photo(s.databases[0],{cloud:null});photo(s.databases[1],{cloud:'other-cloud'});const report=await collect(s,{fetchProvider:async()=>new Response(null,{status:404})});expect(report.unknownSource).toBe(2);expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('Preview yang tidak tersedia, berganti cloud atau keluar dari D1 menghentikan run sebelum mutasi',async()=>{
  const s=setup();try{photo(s.databases[0]);await mature(s);for(const fetchPeer of [async()=>new Response(null,{status:503}),async()=>Response.json({ok:true,schema:1,collectionsD1:false,cloudIdentity:await cloudIdentity('test-cloud')}),async()=>Response.json({ok:true,schema:1,collectionsD1:true,cloudIdentity:await cloudIdentity('other-cloud')})])await expect(collect(s,{fetchPeer})).rejects.toThrow('CLEANUP_PEER');expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('hilangnya trigger pengaman membuat seluruh proses gagal tertutup',async()=>{
  const s=setup();try{photo(s.databases[0]);await mature(s);s.databases[1].raw.exec('DROP TRIGGER cms_media_cleanup_upload');await expect(collect(s)).rejects.toThrow('CLEANUP_SCHEMA');expect(s.requests).toHaveLength(0);}finally{s.close();}
});
test('foto lama diverifikasi dengan checksum asli sebelum masuk masa tunggu',async()=>{
  const s=setup();try{const p=photo(s.databases[0],{cloud:null}),sha=createHash('sha256').update(png).digest('hex');s.databases[0].raw.query('UPDATE cms_media SET sha256=?,provider_key=?,byte_length=?').run(sha,`walianhub/${p.id}-${sha}`,png.length);const fetchProvider=async(input,init)=>new URL(input).hostname==='res.cloudinary.com'?new Response(png,{headers:{'content-type':'image/png'}}):s.provider(input,init);const report=await collect(s,{fetchProvider});expect(report.verifiedSources).toBe(1);expect(report.pending).toBe(1);expect(report.deleted).toBe(0);expect(s.databases[0].raw.query('SELECT provider_cloud FROM cms_media').get().provider_cloud).toBe('test-cloud');}finally{s.close();}
});
test('foto yang sudah dibersihkan tidak dapat dibaca atau dipakai lagi dalam konten',async()=>{
  const s=setup();try{const p=photo(s.databases[0]);await mature(s);await collect(s);const image=createImageHandler(s.provider);expect((await image({env:s.env,request:new Request('https://cms.example'+p.path)})).status).toBe(404);await expect(assertMediaReferences(s.env,{gambar:p.path},'destinasi','contoh')).rejects.toThrow('Foto tidak tersedia');}finally{s.close();}
});
test('endpoint memerlukan token khusus, default dry-run eksplisit dan tidak membocorkan error provider/database',async()=>{
  const s=setup();try{const handler=createCleanupHandler(s.provider,s.peer),call=(body,authorization='Bearer '+s.env.CMS_MEDIA_CLEANUP_TOKEN,method='POST')=>handler({env:s.env,request:new Request('https://cms.example/api/media-cleanup',{method,headers:{authorization,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})})});expect((await call({dryRun:false},'Bearer wrong')).status).toBe(401);expect((await call({})).status).toBe(400);expect((await call({dryRun:true},undefined,'GET')).status).toBe(200);expect((await call({dryRun:true})).status).toBe(200);s.env.CMS_MEDIA_CLEANUP_PEER_DB=null;const response=await call({dryRun:false});expect(response.status).toBe(503);expect(await response.text()).not.toContain('provider-test-secret');}finally{s.close();}
});
test('scheduler memeriksa Preview dahulu, mengirim token server dan hanya mencatat hitungan',async()=>{
  const env={CMS_MEDIA_CLEANUP_URL:'https://cms.example/api/media-cleanup',CMS_MEDIA_CLEANUP_PEER_URL:'https://preview.example/api/media-cleanup',CMS_MEDIA_CLEANUP_TOKEN:'test-token-'.repeat(5)},calls=[];
  const result=await scheduledCleanup(env,async(url,init)=>{
    calls.push(url);expect(init.redirect).toBe('error');expect(init.headers.authorization).toBe('Bearer '+env.CMS_MEDIA_CLEANUP_TOKEN);
    if(url===env.CMS_MEDIA_CLEANUP_PEER_URL)return Response.json({ok:true,schema:1,collectionsD1:true,cloudIdentity:await cloudIdentity('test-cloud'),secret:'provider-test-secret'});
    const body=JSON.parse(init.body);expect(body.dryRun).toBe(false);expect(body.peerMetadata.source).toBe(env.CMS_MEDIA_CLEANUP_PEER_URL);expect(body.peerMetadata.observedAt).toBeGreaterThanOrEqual(now);expect(body.peerMetadata.secret).toBeUndefined();
    return Response.json({ok:true,dryRun:false,busy:false,total:1,protected:1,pending:0,eligible:0,deleted:0,failed:0,unknownSource:0,verifiedSources:0,secret:'provider-test-secret'});
  });expect(calls).toEqual([env.CMS_MEDIA_CLEANUP_PEER_URL,env.CMS_MEDIA_CLEANUP_URL]);expect(result.protected).toBe(1);expect(JSON.stringify(result)).not.toContain('secret');await expect(scheduledCleanup({...env,CMS_MEDIA_CLEANUP_URL:'http://cms.example/api/media-cleanup'})).rejects.toThrow();
});
test('scheduler tidak mengirim perintah Production jika Preview tidak tersedia atau metadata tidak valid',async()=>{
  const env={CMS_MEDIA_CLEANUP_URL:'https://cms.example/api/media-cleanup',CMS_MEDIA_CLEANUP_PEER_URL:'https://preview.example/api/media-cleanup',CMS_MEDIA_CLEANUP_TOKEN:'test-token-'.repeat(5)};
  for(const response of [new Response(null,{status:503}),Response.json({ok:true,schema:1,collectionsD1:false,cloudIdentity:'a'.repeat(64)})]){
    let calls=0;await expect(scheduledCleanup(env,async(url)=>{calls++;expect(url).toBe(env.CMS_MEDIA_CLEANUP_PEER_URL);return response;})).rejects.toThrow();expect(calls).toBe(1);
  }
});
test('hasil pemeriksaan Preview yang baru dari scheduler diterima tanpa fetch antar-Pages',async()=>{
  const s=setup();try{
    const p=photo(s.databases[0]);content(s.databases[1],p.path,{draft:true});
    const peerMetadata={...await (await s.peer()).json(),source:s.env.CMS_MEDIA_CLEANUP_PEER_URL,observedAt:now};
    const handler=createCleanupHandler(s.provider,async()=>{throw new Error('Pages fetch must not run');});
    const call=(proof,authorization='Bearer '+s.env.CMS_MEDIA_CLEANUP_TOKEN)=>handler({env:s.env,request:new Request('https://cms.example/api/media-cleanup',{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({dryRun:true,peerMetadata:proof})})});
    const response=await call({...peerMetadata,observedAt:Date.now()});expect(response.status).toBe(200);expect((await response.json()).protected).toBe(1);expect((await call(peerMetadata,'Bearer CMS-login-session')).status).toBe(401);expect(s.requests).toHaveLength(0);
  }finally{s.close();}
});
test('pemeriksaan Preview kedaluwarsa, dari URL/cloud lain atau schema rusak ditolak sebelum mutasi',async()=>{
  const s=setup();try{
    photo(s.databases[0]);const peerMetadata={...await (await s.peer()).json(),source:s.env.CMS_MEDIA_CLEANUP_PEER_URL,observedAt:now};
    for(const change of [{observedAt:now-60001},{observedAt:now+1},{source:'https://other.example/api/media-cleanup'},{cloudIdentity:'a'.repeat(64)},{schema:2},{collectionsD1:false},{extra:'unexpected'}])await expect(collect(s,{peerMetadata:{...peerMetadata,...change}})).rejects.toThrow('CLEANUP_PEER');
    expect(s.requests).toHaveLength(0);for(const db of s.databases)expect(db.raw.query('SELECT COUNT(*) n FROM cms_media_cleanup').get().n).toBe(0);
  }finally{s.close();}
});
