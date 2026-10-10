import {describe,test,expect} from 'bun:test';
import {readFileSync,readdirSync} from 'node:fs';
import {load} from 'js-yaml';
import {sqliteD1} from './helpers/d1-sqlite.js';
import {fakeGithub} from './helpers/cms-github.js';
import {fakeCloudinary,png} from './helpers/cms-cloudinary.js';
import {createCmsHandler,parseContent,serializeContent} from '../functions/api/cms.js';
import {onRequestPost} from '../functions/api/auth.js';
import {createMediaHandler} from '../functions/api/media.js';
import {createImageHandler} from '../functions/media/[file].js';
import {sha256} from '../server/cms-session.js';
import {validateDestinasi,validatePengumuman} from '../server/cms-collections.js';
import {publishedDestinasi,publishedPengumuman} from '../server/published-collections.js';
import {onRequest as publicDestinasi} from '../functions/api/destinasi.js';
import {onRequest as publicPengumuman} from '../functions/api/pengumuman.js';
import {collectionsImportSql} from '../scripts/lib/cms-collections-import.js';
const configText=readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8'),config=load(configText);
const schema=['0001_content.sql','0002_sessions.sql','0003_media.sql'].map((name)=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8')).join('\n');
const wisata={nama:'Wisata Walian',kategori:'Alam',ringkasan:'Tujuan wisata warga',lokasi:{alamat:'Walian',lat:1.313,lng:124.838},gambar:'',unggulan:true,urutan:1,diperbarui:'2026-10-10',body:''};
const news={daftar:[{judul:'Info warga',tanggal:'2026-10-10',isi:'Informasi pelayanan.\nBaris kedua.',penting:true}]};
async function setup(){
  const db=sqliteD1(schema),github=fakeGithub({'src/content/destinasi/contoh.md':serializeContent(wisata,'contoh.md'),'src/content/pengaturan/situs.json':'{}'},config.backend.repo),provider=fakeCloudinary();
  db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture',config.backend.repo,'a'.repeat(40),'2026-10-10');
  for(const [name,slug,path,data]of [['destinasi','contoh','src/content/destinasi/contoh.md',wisata],['pengumuman','pengumuman','src/content/pengaturan/pengumuman.json',news]])db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run(name,slug,path,JSON.stringify(data),'b'.repeat(40),'fixture');
  const env={CMS_DB:db,CMS_SESSION_AUTH:'1',CMS_MIGRATION_PREVIEW:'1',CMS_DESTINASI_D1:'1',CMS_PENGUMUMAN_D1:'1',CMS_PUBLIC_DESTINASI_D1:'1',CMS_PUBLIC_PENGUMUMAN_D1:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_USERNAME:'walian',CMS_PASSWORD_HASH:await sha256('demo'),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret',ASSETS:{fetch:async()=>new Response(configText)}};
  const login=await onRequestPost({env,request:new Request('https://cms.example/api/auth',{method:'POST',headers:{origin:'https://cms.example','content-type':'application/json'},body:JSON.stringify({username:'walian',password:'demo'})})}),cookie=login.headers.get('set-cookie').split(';')[0];
  const cms=createCmsHandler(github.fetch),upload=createMediaHandler(provider.fetch),image=createImageHandler(provider.fetch,github.fetch);
  const call=(name,action,params={},method='GET',headers={})=>{
    const data={collection:name,slug:name==='pengumuman'?'pengumuman':'contoh',action,...params},url=new URL('https://cms.example/api/cms');
    if(method==='GET')for(const[key,value]of Object.entries(data))url.searchParams.set(key,value);
    return cms({env,request:new Request(url,{method,headers:{cookie,...(method==='POST'?{origin:url.origin,'content-type':'application/json'}:{}),...headers},...(method==='POST'?{body:JSON.stringify(data)}:{})})});
  };
  const get=async(name='destinasi',slug)=> (await call(name,'entry',slug?{slug}:{})).json();
  const write=(name,action,entry,extra={})=>call(name,action,{slug:entry.slug,revision:entry.revision,publishedSha:entry.publishedSha,...extra},'POST');
  const photo=async()=>{const id=crypto.randomUUID();return (await upload({env,request:new Request(`https://cms.example/api/media?collection=destinasi&slug=contoh&id=${id}`,{method:'POST',headers:{cookie,origin:'https://cms.example','content-type':'image/png'},body:png})})).json();};
  const imageGet=(path,privateAccess=false)=>image({env,request:new Request('https://cms.example'+path,{headers:privateAccess?{cookie}:{}})});
  return{db,github,provider,env,cookie,call,get,write,photo,imageGet};
}
describe('Destinasi dan Pengumuman D1',()=>{
  test('CRUD destinasi dan foto tidak menyentuh GitHub, draf/revisi privat, tarik dan hapus langsung menutup publik',async()=>{
    const s=await setup();try{
      expect((await(await s.call('destinasi','config')).json()).site_url).toBe('https://cms.example/');
      expect((await(await s.call('destinasi','list')).json()).entries[0].title).toBe(wisata.nama);
      const photo=await s.photo();expect((await s.imageGet(photo.path)).status).toBe(404);expect((await s.imageGet(photo.path,true)).status).toBe(200);
      let item=await s.get(),draft=await(await s.write('destinasi','save',item,{data:{...wisata,nama:'Revisi privat',gambar:photo.path}})).json();
      expect((await publishedDestinasi(s.env)).semua[0].data.nama).toBe(wisata.nama);expect((await s.imageGet(photo.path)).status).toBe(404);
      expect((await s.write('destinasi','publish',draft)).status).toBe(200);expect((await publishedDestinasi(s.env)).semua[0].data.nama).toBe('Revisi privat');expect((await s.imageGet(photo.path)).status).toBe(200);
      const second=await s.photo();draft=await(await s.write('destinasi','save',await s.get(),{data:{...wisata,gambar:second.path}})).json();expect((await s.imageGet(photo.path)).status).toBe(200);expect((await s.imageGet(second.path)).status).toBe(404);
      const withdrawn=await(await s.write('destinasi','withdraw',draft)).json();expect((await s.write('destinasi','publish',withdrawn)).status).toBe(200);expect((await publishedDestinasi(s.env)).semua).toHaveLength(0);expect((await s.imageGet(photo.path)).status).toBe(404);
      const retained=await s.get();expect(retained.data.gambar).toBe(second.path);draft=await(await s.write('destinasi','save',retained,{data:retained.data})).json();expect((await s.write('destinasi','publish',draft)).status).toBe(200);expect((await s.imageGet(second.path)).status).toBe(200);
      draft=await(await s.write('destinasi','delete',await s.get())).json();expect((await s.write('destinasi','publish',draft)).status).toBe(200);expect((await s.imageGet(second.path)).status).toBe(404);expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('draf belum lengkap boleh disimpan; penerbitan wajib sesuai kontrak dan koordinat Maps diambil otomatis',async()=>{
    const s=await setup();try{
      let draft=await(await s.write('destinasi','save',await s.get(),{data:{nama:'Belum selesai'}})).json();expect((await s.write('destinasi','publish',draft)).status).toBe(422);
      draft=await(await s.write('destinasi','save',draft,{data:{...wisata,lokasi:{alamat:'https://www.google.com/maps/@1.25,124.75,15z',lat:0,lng:0}}})).json();expect(draft.data.lokasi.lat).toBe(1.25);expect(draft.data.lokasi.lng).toBe(124.75);
      expect((await s.write('destinasi','publish',draft)).status).toBe(200);expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('editor serentak, revisi basi dan persaingan terbit/simpan tidak menimpa data',async()=>{
    const s=await setup();try{
      for(const slug of ['contoh','baru']){
        const entry=await s.get('destinasi',slug),results=await Promise.all([s.write('destinasi','save',entry,{data:{...wisata,nama:'A'}}),s.write('destinasi','save',entry,{data:{...wisata,nama:'B'}})]);expect(results.map((r)=>r.status).sort()).toEqual([200,409]);
        const winner=await results.find((r)=>r.status===200).json();expect((await s.write('destinasi','publish',entry)).status).toBe(409);const race=await Promise.all([s.write('destinasi','publish',winner),s.write('destinasi','save',winner,{data:wisata})]);expect(race.map((r)=>r.status).sort()).toEqual([200,409]);
      }
    }finally{s.db.close();}
  });
  test('pengumuman file tunggal: revisi privat, terbit, batal revisi, hapus baris dan daftar kosong',async()=>{
    const s=await setup();try{
      let item=await s.get('pengumuman'),draft=await(await s.write('pengumuman','save',item,{data:{daftar:[{...news.daftar[0],judul:'Draf rahasia'}]}})).json();expect((await publishedPengumuman(s.env))[0].judul).toBe('Info warga');
      expect((await s.write('pengumuman','delete',draft)).status).toBe(409);expect((await s.write('pengumuman','withdraw',draft)).status).toBe(409);
      expect((await s.write('pengumuman','publish',draft)).status).toBe(200);expect((await publishedPengumuman(s.env))[0].judul).toBe('Draf rahasia');
      draft=await(await s.write('pengumuman','save',await s.get('pengumuman'),{data:{daftar:[]}})).json();expect((await s.write('pengumuman','discard',draft)).status).toBe(200);expect(await publishedPengumuman(s.env)).toHaveLength(1);
      draft=await(await s.write('pengumuman','save',await s.get('pengumuman'),{data:{daftar:[]}})).json();expect((await s.write('pengumuman','publish',draft)).status).toBe(200);expect(await publishedPengumuman(s.env)).toHaveLength(0);expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('sesi, origin, slug file tunggal, jenis isian, ukuran dan kepemilikan foto diperiksa',async()=>{
    const s=await setup();try{
      expect((await s.call('destinasi','list',{},'GET',{cookie:''})).status).toBe(401);
      const item=await s.get();expect((await s.call('destinasi','save',{...item,data:wisata},'POST',{origin:'https://outside.example'})).status).toBe(403);
      expect((await s.call('pengumuman','entry',{slug:'situs'})).status).toBe(404);expect((await s.call('destinasi','entry',{slug:'../situs'})).status).toBe(404);expect((await s.call('destinasi','publish')).status).toBe(404);
      expect((await s.write('destinasi','save',item,{data:{...wisata,lokasi:{...wisata.lokasi,lat:91}}})).status).toBe(422);
      expect((await s.write('destinasi','save',item,{data:{...wisata,body:'x'.repeat(300000)}})).status).toBe(413);
      expect((await s.write('destinasi','save',item,{data:wisata,uploads:[{}]})).status).toBe(422);
      const photo=await s.photo();expect((await s.write('destinasi','save',await s.get('destinasi','lain'),{data:{...wisata,gambar:photo.path}})).status).toBe(422);expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('API publik hanya versi terbit tanpa metadata; HEAD, metode, flag dan outage gagal tertutup',async()=>{
    const s=await setup();try{
      const call=(fn,method='GET',extra={})=>fn({env:{...s.env,...extra},request:new Request('https://cms.example/api/public',{method})});
      for(const fn of [publicDestinasi,publicPengumuman]){
        const response=await call(fn);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');const text=await response.text();expect(text).not.toContain('snapshot_id');expect(text).not.toContain('published_blob_sha');expect((await call(fn,'POST')).status).toBe(405);expect(await(await call(fn,'HEAD')).text()).toBe('');expect((await call(fn,'GET',{CMS_DB:undefined})).status).toBe(503);
      }
      expect((await call(publicDestinasi,'GET',{CMS_PUBLIC_DESTINASI_D1:'0'})).status).toBe(404);
      s.db.raw.exec('DROP VIEW cms_published_content;');expect((await call(publicDestinasi)).status).toBe(503);expect((await call(publicPengumuman)).status).toBe(503);expect((await s.call('destinasi','list')).status).toBe(200);
      s.db.raw.exec('DROP TABLE cms_content;');expect((await s.call('destinasi','list')).status).toBe(503);expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('flag mati tetap memakai GitHub, Pengaturan belum dimigrasikan',async()=>{
    const s=await setup();try{
      s.env.GITHUB_TOKEN='test-only';s.env.CMS_DESTINASI_D1='0';expect((await s.call('destinasi','entry')).status).toBe(200);expect(s.github.requests.length).toBeGreaterThan(0);
      expect((await s.call('pengaturan','entry',{slug:'situs'})).status).toBe(200);
      s.env.CMS_SESSION_AUTH='0';expect((await s.call('pengumuman','config',{},'GET',{authorization:'Bearer test-only'})).status).toBe(503);
    }finally{s.db.close();}
  });
});
describe('Kontrak dan impor tahap 6',()=>{
  test('konten repository valid; tanggal, kategori, koordinat, isian asing dan protokol gambar invalid ditolak',()=>{
    const collection=config.collections.find((item)=>item.name==='destinasi');
    for(const file of readdirSync(new URL('../src/content/destinasi',import.meta.url)))expect(validateDestinasi(parseContent(readFileSync(new URL('../src/content/destinasi/'+file,import.meta.url),'utf8'),file),collection,true).nama).toBeTruthy();
    expect(validatePengumuman(JSON.parse(readFileSync(new URL('../src/content/pengaturan/pengumuman.json',import.meta.url),'utf8')),{},true).daftar).toBeArray();
    for(const bad of [{...wisata,kategori:'Invalid'},{...wisata,ringkasan:'x'.repeat(161)},{...wisata,diperbarui:'2026-02-30'},{...wisata,gambar:'javascript:alert(1)'},{...wisata,lokasi:{...wisata.lokasi,lat:91}},{...wisata,secret:'x'}])expect(()=>validateDestinasi(bad,collection,true)).toThrow();
    for(const bad of [{daftar:[{...news.daftar[0],tanggal:'2026-02-30'}]},{daftar:[{...news.daftar[0],judul:' '}]},{daftar:[{...news.daftar[0],penting:'true'}]}])expect(()=>validatePengumuman(bad,{},true)).toThrow();
  });
  test('impor memperbarui seed lama serta mempertahankan draf; tidak mengubah koleksi lain, tidak menimpa perubahan, tidak memulihkan hapusan',async()=>{
    const s=await setup();try{
      s.db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan','tetap','src/content/layanan/tetap.md','{}','c'.repeat(40),'fixture');
      const untouched=s.db.raw.query("SELECT * FROM cms_content WHERE collection='layanan'").get(),baseline=s.db.raw.query('SELECT * FROM cms_content ORDER BY collection,slug').all();
      const manifest={repository:config.backend.repo,mainSha:'d'.repeat(40),capturedAt:'2026-10-10',entries:[{collection:'destinasi',slug:'contoh',path:'src/content/destinasi/contoh.md',published:{data:{...wisata,nama:'Terbit terbaru'},sha:'e'.repeat(40)},draft:{data:{...wisata,nama:'Draf terbaru'},sha:'f'.repeat(40),revision:'a'.repeat(40),action:'edit'}},{collection:'pengumuman',slug:'pengumuman',path:'src/content/pengaturan/pengumuman.json',published:{data:news,sha:'b'.repeat(40)},draft:null}]};
      const statements=collectionsImportSql(manifest,baseline,config).trim().split('\n'),apply=()=>s.db.raw.transaction(()=>statements.forEach((sql)=>s.db.raw.query(sql).run()))();
      s.db.raw.exec("UPDATE cms_content SET version=2 WHERE collection='destinasi'");expect(apply).toThrow();expect((await s.get()).data.nama).toBe(wisata.nama);s.db.raw.exec("UPDATE cms_content SET version=1 WHERE collection='destinasi'");
      apply();expect((await s.get()).data.nama).toBe('Draf terbaru');expect((await publishedDestinasi(s.env)).semua[0].data.nama).toBe('Terbit terbaru');expect(s.db.raw.query("SELECT * FROM cms_content WHERE collection='layanan'").get()).toEqual(untouched);
      s.db.raw.exec("DELETE FROM cms_content WHERE collection='destinasi'");apply();expect((await publishedDestinasi(s.env)).semua).toHaveLength(0);
      expect(()=>collectionsImportSql(manifest,[{...baseline[0],version:2}],config)).toThrow();
    }finally{s.db.close();}
  });
});
