import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {load} from 'js-yaml';
import {sqliteD1} from './helpers/d1-sqlite.js';
import {fakeCloudinary,png} from './helpers/cms-cloudinary.js';
import {createCmsHandler} from '../functions/api/cms.js';
import {onRequestPost} from '../functions/api/auth.js';
import {createMediaHandler} from '../functions/api/media.js';
import {createImageHandler} from '../functions/media/[file].js';
import {sha256} from '../server/cms-session.js';
import {validatePengaturan} from '../server/cms-pengaturan.js';
import {publishedPengaturan} from '../server/published-pengaturan.js';
import {onRequest as publicSettings} from '../functions/api/pengaturan.js';
import {pengaturanImportSql} from '../scripts/lib/cms-pengaturan-import.js';
import {typedText} from '../server/pengaturan-template.js';
const configText=readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8'),config=load(configText),collection=config.collections.find((item)=>item.name==='pengaturan');
const content=Object.fromEntries(['situs','beranda','profil'].map((slug)=>[slug,JSON.parse(readFileSync(new URL('../src/content/pengaturan/'+slug+'.json',import.meta.url),'utf8'))]));
const schema=['0001_content.sql','0002_sessions.sql','0003_media.sql','0004_media_cleanup.sql'].map((name)=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8')).join('\n');
async function setup(){
  const db=sqliteD1(schema),provider=fakeCloudinary(),github=[];
  db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture',config.backend.repo,'a'.repeat(40),'2026-10-10');
  for(const[slug,data]of Object.entries(content))db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('pengaturan',slug,`src/content/pengaturan/${slug}.json`,JSON.stringify(data),'b'.repeat(40),'fixture');
  const env={CMS_DB:db,CMS_SESSION_AUTH:'1',CMS_MIGRATION_PREVIEW:'1',CMS_PENGATURAN_D1:'1',CMS_PUBLIC_PENGATURAN_D1:'1',CMS_MEDIA_CLOUDINARY:'1',CMS_USERNAME:'walian',CMS_PASSWORD_HASH:await sha256('demo'),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'123456',CLOUDINARY_API_SECRET:'provider-test-secret',ASSETS:{fetch:async()=>new Response(configText)}};
  const login=await onRequestPost({env,request:new Request('https://cms.example/api/auth',{method:'POST',headers:{origin:'https://cms.example','content-type':'application/json'},body:JSON.stringify({username:'walian',password:'demo'})})}),cookie=login.headers.get('set-cookie').split(';')[0];
  const cms=createCmsHandler(async(...args)=>{github.push(args);throw new Error('GitHub must not be contacted');}),upload=createMediaHandler(provider.fetch),image=createImageHandler(provider.fetch);
  const call=(action,slug='beranda',params={},method='GET',headers={})=>{
    const data={collection:'pengaturan',action,slug,...params},url=new URL('https://cms.example/api/cms');if(method==='GET')for(const[key,value]of Object.entries(data))url.searchParams.set(key,value);
    return cms({env,request:new Request(url,{method,headers:{cookie,...(method==='POST'?{origin:url.origin,'content-type':'application/json'}:{}),...headers},...(method==='POST'?{body:JSON.stringify(data)}:{})})});
  };
  const get=async(slug='beranda')=>(await call('entry',slug)).json(),write=(action,entry,extra={})=>call(action,entry.slug,{revision:entry.revision,publishedSha:entry.publishedSha,...extra},'POST');
  const photo=async(slug='beranda')=>(await upload({env,request:new Request(`https://cms.example/api/media?collection=pengaturan&slug=${slug}&id=${crypto.randomUUID()}`,{method:'POST',headers:{cookie,origin:'https://cms.example','content-type':'image/png'},body:png})})).json();
  const publicImage=(path,privateAccess=false)=>image({env,request:new Request('https://cms.example'+path,{headers:privateAccess?{cookie}:{}})});
  return {db,env,github,call,get,write,photo,publicImage};
}
test('Pengaturan situs/beranda/profil menyimpan revisi privat dan terbit tanpa GitHub; draf belum lengkap dapat dibatalkan',async()=>{
  const s=await setup();try{
    expect((await(await s.call('config')).json()).site_url).toBe('https://cms.example/');expect((await(await s.call('list')).json()).entries).toHaveLength(3);
    for(const slug of ['situs','beranda','profil']){
      const original=(await publishedPengaturan(s.env))[slug];let entry=await s.get(slug);
      let draft=await(await s.write('save',entry,{data:{}})).json();expect(draft.revision).toStartWith('d1:');expect((await s.write('publish',draft)).status).toBe(422);expect((await publishedPengaturan(s.env))[slug]).toEqual(original);
      expect((await s.write('delete',draft)).status).toBe(409);expect((await s.write('withdraw',draft)).status).toBe(409);expect((await s.write('discard',draft)).status).toBe(200);
      const changed=structuredClone(content[slug]);if(slug==='situs')changed.alamat='Alamat baru';if(slug==='beranda')changed.hero.judul='Judul baru';if(slug==='profil')changed.ringkasan='Ringkasan baru';
      entry=await s.get(slug);draft=await(await s.write('save',entry,{data:changed})).json();expect((await s.write('publish',entry)).status).toBe(409);expect((await s.write('publish',draft)).status).toBe(200);
      const published=(await publishedPengaturan(s.env))[slug];expect(slug==='situs'?published.alamat:slug==='beranda'?published.hero.judul:published.ringkasan).toBe(slug==='situs'?'Alamat baru':slug==='beranda'?'Judul baru':'Ringkasan baru');
    }
    expect(s.github).toHaveLength(0);
  }finally{s.db.close();}
});
test('foto latar dan lurah hanya publik setelah terbit, revisi lama tetap terlihat, foto dihapus langsung privat',async()=>{
  const s=await setup();try{
    for(const slug of ['beranda','profil']){
      const photo=await s.photo(slug),data=structuredClone(content[slug]);expect(photo.path).toStartWith('/media/');expect((await s.publicImage(photo.path)).status).toBe(404);expect((await s.publicImage(photo.path,true)).status).toBe(200);
      if(slug==='beranda')data.hero.foto=[{gambar:photo.path,keterangan:'Kantor',posisi:'kiri'}];else data.lurah.foto=photo.path;
      let draft=await(await s.write('save',await s.get(slug),{data})).json();expect((await s.publicImage(photo.path)).status).toBe(404);expect((await s.write('publish',draft)).status).toBe(200);expect((await s.publicImage(photo.path)).status).toBe(200);
      const otherSlug=slug==='beranda'?'profil':'beranda',foreign=structuredClone(content[otherSlug]);if(otherSlug==='beranda')foreign.hero.foto=[{gambar:photo.path,keterangan:'Kantor',posisi:'tengah'}];else foreign.lurah.foto=photo.path;
      expect((await s.write('save',await s.get(otherSlug),{data:foreign})).status).toBe(422);
      if(slug==='beranda')data.hero.foto=[];else data.lurah.foto='';draft=await(await s.write('save',await s.get(slug),{data})).json();expect((await s.publicImage(photo.path)).status).toBe(200);expect((await s.write('publish',draft)).status).toBe(200);expect((await s.publicImage(photo.path)).status).toBe(404);
    }
    expect(s.github).toHaveLength(0);
  }finally{s.db.close();}
});
test('Pengaturan memeriksa sesi, origin, slug, tipe dan konflik editor serta gagal tertutup saat DB rusak',async()=>{
  const s=await setup();try{
    expect((await s.call('list','beranda',{},'GET',{cookie:''})).status).toBe(401);expect((await s.call('entry','pengumuman')).status).toBe(404);
    const entry=await s.get();expect((await s.call('save','beranda',{...entry,data:content.beranda},'POST',{origin:'https://outside.example'})).status).toBe(403);
    const results=await Promise.all([s.write('save',entry,{data:content.beranda}),s.write('save',entry,{data:content.beranda})]);expect(results.map((r)=>r.status).sort()).toEqual([200,409]);
    expect((await s.write('save',await s.get(),{data:{hero:{judul:32}}})).status).toBe(422);expect((await s.write('save',await s.get(),{data:{other:'x'}})).status).toBe(422);
    s.db.raw.exec('DROP VIEW cms_published_content;');expect((await publicSettings({env:s.env,request:new Request('https://cms.example/api/pengaturan')})).status).toBe(503);expect(s.github).toHaveLength(0);
  }finally{s.db.close();}
});
test('API publik Pengaturan hanya mengembalikan versi terbit, tanpa revisi/draf; saklar dan metode diperiksa',async()=>{
  const s=await setup();try{
    await s.write('save',await s.get(),{data:{hero:{judul:'Rahasia draf'}}});
    const call=(method='GET',flags={})=>publicSettings({env:{...s.env,...flags},request:new Request('https://cms.example/api/pengaturan',{method})});
    const response=await call(),text=await response.text();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');expect(text).not.toContain('Rahasia draf');expect(text).not.toContain('published_blob_sha');expect(text).not.toContain('snapshot_id');expect(await(await call('HEAD')).text()).toBe('');expect((await call('POST')).status).toBe(405);expect((await call('GET',{CMS_PUBLIC_PENGATURAN_D1:'0'})).status).toBe(404);expect((await call('GET',{CMS_DB:undefined})).status).toBe(503);
    s.db.raw.exec("DELETE FROM cms_content WHERE slug='profil'");expect((await call()).status).toBe(503);
  }finally{s.db.close();}
});
test('kontrak Pengaturan mencakup jadwal, tanggal, pohon organisasi, angka, tautan dan maksimum lima foto',()=>{
  for(const slug of Object.keys(content))expect(validatePengaturan(content[slug],collection,slug,true)).toBeObject();
  const badSite=(edit)=>{const data=structuredClone(content.situs);edit(data);return ()=>validatePengaturan(data,collection,'situs',true);};
  for(const change of [(s)=>s.email='bukan-email',(s)=>s.whatsapp='+62123',(s)=>s.koordinat.lat=91,(s)=>s.jamLayanan.jadwal.pop(),(s)=>s.jamLayanan.jadwal[1].hari=s.jamLayanan.jadwal[0].hari,(s)=>s.jamLayanan.jadwal[0].tutup='07.00',(s)=>s.jamLayanan.tanggalLibur=[{tanggal:'2026-02-30',keterangan:'Invalid'}],(s)=>s.tautanPenting=[{label:'Link',url:'javascript:alert(1)'}]])expect(badSite(change)).toThrow();
  const badProfile=structuredClone(content.profil);badProfile.strukturOrganisasi=[{jabatan:'A',atasan:'B',nama:[],garisSamping:false},{jabatan:'B',atasan:'A',nama:[],garisSamping:false}];expect(()=>validatePengaturan(badProfile,collection,'profil',true)).toThrow();
  expect(()=>validatePengaturan({hero:{...content.beranda.hero,foto:Array.from({length:6},()=>({gambar:'',keterangan:'Kantor',posisi:'tengah'}))}},collection,'beranda',true)).toThrow();
  expect(()=>validatePengaturan({hero:{judul:'a',subjudul:'b',foto:[{gambar:'javascript:alert(1)',keterangan:'x'}]}},collection,'beranda',true)).toThrow();
  expect(typedText('<img> é👩‍💻')).toContain('&lt;');expect(typedText('<img> é👩‍💻')).not.toContain('<img>');expect(typedText('A B')).toContain('--jeda-huruf: 70ms');
});
test('impor Pengaturan mempertahankan draf GitHub dan koleksi lain; perubahan serentak ditolak dan impor ulang tidak menimpa editor',async()=>{
  const s=await setup();try{
    s.db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('destinasi','tetap','src/content/destinasi/tetap.md','{}','c'.repeat(40),'fixture');
    const untouched=s.db.raw.query("SELECT * FROM cms_content WHERE collection='destinasi'").get(),baseline=s.db.raw.query('SELECT * FROM cms_content ORDER BY collection,slug').all();
    const manifest={repository:config.backend.repo,mainSha:'d'.repeat(40),capturedAt:'2026-10-10',entries:Object.entries(content).map(([slug,data])=>({collection:'pengaturan',slug,path:`src/content/pengaturan/${slug}.json`,published:{data,sha:'e'.repeat(40)},draft:slug==='beranda'?{data:{hero:{judul:'Draf historis'}},sha:'f'.repeat(40),revision:'a'.repeat(40),action:'edit'}:null}))};
    const statements=pengaturanImportSql(manifest,baseline,config).trim().split('\n'),apply=()=>s.db.raw.transaction(()=>statements.forEach((sql)=>s.db.raw.query(sql).run()))();
    s.db.raw.exec("UPDATE cms_content SET version=2 WHERE slug='situs'");expect(apply).toThrow();s.db.raw.exec("UPDATE cms_content SET version=1 WHERE slug='situs'");apply();expect((await s.get()).data.hero.judul).toBe('Draf historis');expect((await publishedPengaturan(s.env)).beranda.hero.judul).toBe(content.beranda.hero.judul);expect(s.db.raw.query("SELECT * FROM cms_content WHERE collection='destinasi'").get()).toEqual(untouched);
    await s.write('save',await s.get(),{data:{hero:{judul:'Draf D1 terbaru'}}});apply();expect((await s.get()).data.hero.judul).toBe('Draf D1 terbaru');
    expect(()=>pengaturanImportSql({...manifest,entries:manifest.entries.slice(1)},baseline,config)).toThrow();
  }finally{s.db.close();}
});
