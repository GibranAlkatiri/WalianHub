import { describe, test, expect } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { load } from 'js-yaml';
import { createCmsHandler, serializeContent, parseContent } from '../functions/api/cms.js';
import { onRequestPost } from '../functions/api/auth.js';
import { sha256 } from '../server/cms-session.js';
import { validateLayanan } from '../server/cms-layanan.js';
import { sqliteD1 } from './helpers/d1-sqlite.js';
import { fakeGithub } from './helpers/cms-github.js';
import { captureSnapshot, snapshotSql } from '../scripts/lib/cms-snapshot.js';
import { layananImportSql } from '../scripts/lib/cms-layanan-import.js';

const config = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
const collection = load(config).collections.find((item) => item.name === 'layanan');
const schema = ['0001_content.sql', '0002_sessions.sql'].map((name) => readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8')).join('\n');
const data = { judul:'Contoh layanan', ringkasan:'Persyaratan warga', ikon:'house', unggulan:true, urutan:1, persyaratan:['KTP'], alur:['Datang ke kelurahan'], diperbarui:'2026-10-10', body:'Catatan warga' };
const applyImport = (db, sql) => db.raw.transaction(() => { for (const statement of sql.trim().split('\n')) db.raw.query(statement).run(); })();
async function setup() {
  const db = sqliteD1(schema);
  db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture', 'test/repo', 'a'.repeat(40), '2026-10-10');
  db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan','contoh','src/content/layanan/contoh.md',JSON.stringify(data),'b'.repeat(40),'fixture');
  const github = fakeGithub({'src/content/destinasi/contoh.md':serializeContent({nama:'Wisata'},'contoh.md')}, 'GibranAlkatiri/WalianHub');
  const handler = createCmsHandler(github.fetch);
  const env = { CMS_LAYANAN_D1:'1', CMS_SESSION_AUTH:'1', CMS_DB:db, CMS_USERNAME:'walian', CMS_PASSWORD_HASH:await sha256('demo'), GITHUB_TOKEN:'server-test-only', ASSETS:{fetch:async()=>new Response(config)} };
  const response = await onRequestPost({env, request:new Request('https://cms.example/api/auth',{method:'POST',headers:{origin:'https://cms.example','content-type':'application/json'},body:JSON.stringify({username:'walian',password:'demo'})})});
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const call = (action, params = {}, method = 'GET', headers = {}) => {
    const url = new URL('https://cms.example/api/cms');
    if (method === 'GET') for (const [key,value] of Object.entries({action,collection:'layanan',slug:'contoh',...params})) url.searchParams.set(key,value);
    return handler({env,request:new Request(url,{method,headers:{cookie,...(method==='POST'?{origin:url.origin,'content-type':'application/json'}:{}),...headers},...(method==='POST'?{body:JSON.stringify({action,collection:'layanan',slug:'contoh',...params})}:{})})});
  };
  const get = async (slug = 'contoh') => (await call('entry',{slug})).json();
  const params = (entry) => ({slug:entry.slug,revision:entry.revision,publishedSha:entry.publishedSha});
  const write = (action, entry, extra = {}) => call(action,{...params(entry),...extra},'POST');
  const publicData = () => db.raw.query("SELECT slug,data_json FROM cms_published_content WHERE collection='layanan'").all().map((row)=>({slug:row.slug,data:JSON.parse(row.data_json)}));
  return {db,env,github,call,get,write,publicData};
}

describe('CRUD Layanan D1', () => {
  test('baca dan tulis layanan bekerja tanpa token atau permintaan GitHub', async () => {
    const s=await setup();try {
      s.env.GITHUB_TOKEN='';
      expect((await s.call('config')).status).toBe(200);
      s.env.CMS_PUBLIC_LAYANAN_D1='1';expect((await (await s.call('config')).json()).site_url).toBe('https://cms.example/');
      expect((await (await s.call('list')).json()).entries).toHaveLength(1);
      const entry=await s.get(); const saved=await s.write('save',entry,{data:{...data,judul:'Revisi baru'}});
      expect(saved.status).toBe(200); const draft=await saved.json();
      expect(s.publicData()[0].data.judul).toBe(data.judul);
      expect(draft).toMatchObject({status:'draft',published:true,deleted:false});
      expect((await s.write('publish',draft)).status).toBe(200);
      expect(s.publicData()[0].data.judul).toBe('Revisi baru');
      expect((await s.get()).revision).toBeNull();expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('draf belum lengkap disimpan privat; terbit memvalidasi kontrak server', async () => {
    const s=await setup();try {
      const result=await s.write('save',await s.get('baru'),{data:{judul:'Draf baru'}});expect(result.status).toBe(200);
      const draft=await result.json();expect(draft.published).toBe(false);
      expect(s.publicData()).toHaveLength(1);
      expect((await s.write('publish',draft)).status).toBe(422);
      expect((await s.get('baru')).revision).toBe(draft.revision);
      const complete=await (await s.write('save',draft,{data})).json();expect((await s.write('publish',complete)).status).toBe(200);
      expect(s.publicData()).toHaveLength(2);
    }finally{s.db.close();}
  });
  test('withdraw mempertahankan revisi, buang draf dan terbit ulang mengikuti status', async () => {
    const s=await setup();try {
      const draft=await (await s.write('save',await s.get(),{data:{...data,judul:'Revisi tetap ada'}})).json();
      const withdrawn=await (await s.write('withdraw',draft)).json();expect(withdrawn.deleted).toBe(true);
      expect(s.publicData()).toHaveLength(1);
      expect((await s.write('publish',withdrawn)).status).toBe(200);expect(s.publicData()).toHaveLength(0);
      const retained=await s.get();expect(retained).toMatchObject({withdrawn:true,status:'draft',published:false,data:{judul:'Revisi tetap ada'}});
      expect((await s.write('publish',retained)).status).toBe(409);
      const saved=await (await s.write('save',retained,{data:retained.data})).json();expect((await s.write('publish',saved)).status).toBe(200);
      expect(s.publicData()[0].data.judul).toBe('Revisi tetap ada');
      const second=await (await s.write('save',await s.get(),{data:{...data,judul:'Buang revisi'}})).json();
      expect((await s.write('discard',second)).status).toBe(200);expect((await s.get()).data.judul).toBe('Revisi tetap ada');
    }finally{s.db.close();}
  });
  test('hapus terbit, batal hapus, hapus draf dan perlindungan slug lama', async () => {
    const s=await setup();try {
      const original=await s.get();let removal=await (await s.write('delete',original)).json();
      expect(s.publicData()).toHaveLength(1);expect((await s.write('discard',removal)).status).toBe(200);
      removal=await (await s.write('delete',await s.get())).json();expect((await s.write('publish',removal)).status).toBe(200);
      expect(s.publicData()).toHaveLength(0);expect((await (await s.call('list')).json()).entries).toHaveLength(0);
      expect((await s.write('save',original,{data})).status).toBe(409);
      const newDraft=await (await s.write('save',await s.get(),{data})).json();expect((await s.write('discard',newDraft)).status).toBe(200);
      expect((await (await s.call('list')).json()).entries).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('dua penyimpanan serentak pada entri lama maupun baru hanya menerima satu', async () => {
    const s=await setup();try {
      for (const slug of ['contoh','baru']) {
        const entry=await s.get(slug);
        const responses=await Promise.all([s.write('save',entry,{data:{...data,judul:'Editor A'}}),s.write('save',entry,{data:{...data,judul:'Editor B'}})]);
        expect(responses.map((r)=>r.status).sort()).toEqual([200,409]);
        const winner=await responses.find((r)=>r.status===200).json();expect((await s.get(slug)).revision).toBe(winner.revision);
      }
      expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('penerbitan, buang draf dan save yang bersaing tidak menimpa editor lain', async () => {
    const s=await setup();try {
      for(const action of ['publish','discard']) {
        const draft=await (await s.write('save',await s.get(),{data})).json();
        const results=await Promise.all([s.write(action,draft),s.write('save',draft,{data:{...data,judul:'Editor lain'}})]);
        expect(results.map((r)=>r.status).sort()).toEqual([200,409]);
      }
      const stale=await s.get();const draft=await (await s.write('save',stale,{data})).json();
      expect((await s.write('withdraw',stale)).status).toBe(409);
      expect((await s.write('publish',draft)).status).toBe(200);
      expect((await s.write('save',stale,{data})).status).toBe(409);
    }finally{s.db.close();}
  });
  test('sesi, origin, slug, payload dan foto tidak dapat melewati pemeriksaan', async () => {
    const s=await setup();try {
      expect((await s.call('list',{},'GET',{cookie:''})).status).toBe(401);
      const entry=await s.get();
      expect((await s.call('save',{...entry,data},'POST',{origin:'https://outside.example'})).status).toBe(403);
      expect((await s.call('entry',{slug:'../pengaturan/situs'})).status).toBe(404);
      expect((await s.call('publish')).status).toBe(404);expect((await s.call('list',{},'POST')).status).toBe(404);
      expect((await s.write('save',entry,{data:{...data,judul:12}})).status).toBe(422);
      expect((await s.write('save',entry,{data:{...data,body:'x'.repeat(300000)}})).status).toBe(413);
      expect((await s.write('save',entry,{data,uploads:[{path:'public/uploads/a.png',content:'invalid'}]})).status).toBe(422);
      expect((await s.get()).revision).toBeNull();expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('schema rusak gagal tertutup tanpa fallback GitHub; koleksi lain tetap pada backend lama', async () => {
    const s=await setup();try {
      expect((await s.call('entry',{collection:'destinasi'})).status).toBe(200);expect(s.github.requests.length).toBeGreaterThan(0);
      s.github.requests.length=0;s.db.raw.exec('DROP VIEW cms_published_content; DROP TABLE cms_content;');
      const result=await s.call('list');expect(result.status).toBe(503);expect(await result.text()).not.toContain('SQLITE');
      expect(s.github.requests).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('flag mati mempertahankan GitHub; flag D1 memerlukan sesi server', async () => {
    const s=await setup();try {
      s.env.CMS_LAYANAN_D1='0';expect((await s.call('list')).status).toBe(200);expect(s.github.requests.length).toBeGreaterThan(0);
      s.env.CMS_LAYANAN_D1='1';s.env.CMS_SESSION_AUTH='0';
      expect((await s.call('config',{},'GET',{authorization:'Bearer server-test-only'})).status).toBe(503);
    }finally{s.db.close();}
  });
});

describe('Kontrak dan impor Layanan',()=>{
  test('semua konten layanan dan opsi ikon saat ini valid untuk diterbitkan',()=>{
    for(const file of readdirSync(new URL('../src/content/layanan',import.meta.url))) {
      const raw=readFileSync(new URL('../src/content/layanan/'+file,import.meta.url),'utf8');
      expect(validateLayanan(parseContent(raw,file),collection,true).judul).toBeTruthy();
    }
    for(const option of collection.fields.find((field)=>field.name==='ikon').options) expect(readFileSync(new URL('../src/icons/'+option.value+'.svg',import.meta.url),'utf8')).toContain('<svg');
    for(const value of [{...data,ringkasan:'x'.repeat(121)},{...data,judul:' '},{...data,ikon:'invalid'},{...data,diperbarui:'2026-02-30'},{...data,unggulan:'true'},{...data,persyaratan:[' ']}]) expect(()=>validateLayanan(value,collection,true)).toThrow();
    expect(validateLayanan({...data,diperbarui:'2024-02-29'},collection,true).diperbarui).toBe('2024-02-29');
  });
  test('impor terverifikasi mempertahankan published dan draft tanpa menyentuh menu lain',async()=>{
    const path='src/content/layanan/contoh.md';
    const github=fakeGithub({'public/admin/config.yml':config,[path]:serializeContent(data,path),'src/content/pengaturan/situs.json':'{}'},'GibranAlkatiri/WalianHub');
    const captured=await captureSnapshot('GibranAlkatiri/WalianHub','main',github.fetch);
    const db=sqliteD1(schema);try {
      const manifest={...captured.manifest,entries:captured.manifest.entries.map((item)=>item.collection==='layanan'?{...item,draft:{data:{...data,judul:'Draf pribadi'},sha:'c'.repeat(40),revision:'d'.repeat(40),action:'edit'}}:item)};
      const sql=layananImportSql(manifest);applyImport(db,sql);
      expect(db.raw.query('SELECT count(*) AS n FROM cms_content').get().n).toBe(1);
      const row=db.raw.query('SELECT * FROM cms_content').get();expect(JSON.parse(row.published_json).judul).toBe(data.judul);expect(JSON.parse(row.draft_json).judul).toBe('Draf pribadi');
      applyImport(db,sql);expect(db.raw.query('SELECT count(*) AS n FROM cms_content').get().n).toBe(1);
      db.raw.exec('UPDATE cms_content SET version=version+1;');expect(()=>applyImport(db,sql)).toThrow();
      expect(db.raw.query('SELECT version FROM cms_content').get().version).toBe(2);
      db.raw.exec('DELETE FROM cms_content;');applyImport(db,sql);expect(db.raw.query('SELECT count(*) AS n FROM cms_content').get().n).toBe(0);
      expect(()=>applyImport(db,layananImportSql({...manifest,capturedAt:'2026-10-11'}))).toThrow();
    }finally{db.close();}
    const all=sqliteD1(schema);try {
      applyImport(all,snapshotSql(captured.manifest));const before=all.raw.query("SELECT * FROM cms_content WHERE collection!='layanan'").all();
      applyImport(all,layananImportSql(captured.manifest));expect(all.raw.query("SELECT * FROM cms_content WHERE collection!='layanan'").all()).toEqual(before);
    }finally{all.close();}
  });
});
