import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { sqliteD1 } from './helpers/d1-sqlite.js';
import { onRequest } from '../functions/api/layanan.js';
import { publishedLayanan } from '../server/published-layanan.js';
import { parseLayananTemplates, renderLayanan } from '../server/layanan-template.js';
import { layananOperation } from '../server/cms-layanan.js';
import { load } from 'js-yaml';

const schema=readFileSync(new URL('../migrations/0001_content.sql',import.meta.url),'utf8');
const collection=load(readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8')).collections.find((item)=>item.name==='layanan');
const base={judul:'Layanan warga',ringkasan:'Panduan warga',ikon:'house',unggulan:true,urutan:1,persyaratan:['KTP'],alur:['Datang'],diperbarui:'2026-10-10',body:'Catatan **penting**.'};
const templates=parseLayananTemplates([
  ['cms-card','<article><a href="/layanan#__CMS_SLUG__">__CMS_TITLE__</a><p>__CMS_SUMMARY__</p>__CMS_ICON__</article>'],
  ['cms-item','<details id="__CMS_SLUG__"><h3>__CMS_TITLE__</h3><p>__CMS_SUMMARY__</p>__CMS_ICON____CMS_REQUIREMENTS____CMS_STEPS__</details>'],
  ['cms-item-note','<details id="__CMS_SLUG__"><h3>__CMS_TITLE__</h3>__CMS_ICON__<p>__CMS_SUMMARY__</p>__CMS_REQUIREMENTS____CMS_STEPS__<div>__CMS_BODY__</div></details>'],
  ['cms-requirements','<ul>__CMS_LIST_ITEMS__</ul>'],['cms-requirements-empty','<p>Persyaratan menyusul.</p>'],
  ['cms-steps','<ol>__CMS_LIST_ITEMS__</ol>'],['cms-steps-empty','<p>Alur menyusul.</p>'],
  ['cms-icon-card-house','<svg class="size-6"></svg>'],['cms-icon-item-house','<svg class="size-5"></svg>'],
  ['cms-icon-card-file-text','<svg class="size-6"></svg>'],['cms-icon-item-file-text','<svg class="size-5"></svg>'],
].map(([name,body])=>`<template id="${name}">${body}</template>`).join(''));
function setup(){
  const db=sqliteD1(schema);db.raw.query('INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (?,?,?,?)').run('fixture','test/repo','a'.repeat(40),'2026-10-10');
  db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan','contoh','src/content/layanan/contoh.md',JSON.stringify(base),'b'.repeat(40),'fixture');
  const env={CMS_DB:db,CMS_LAYANAN_D1:'1',CMS_PUBLIC_LAYANAN_D1:'1'};
  const call=(method='GET',extra={})=>onRequest({request:new Request('https://preview.example/api/layanan',{method}),env:{...env,...extra}});
  const operation=(action,body)=>layananOperation(db,collection,action,'contoh',body);
  const guard=(entry)=>({revision:entry.revision,publishedSha:entry.publishedSha});
  return{db,env,call,operation,guard};
}
describe('Layanan publik dari D1',()=>{
  test('setiap permintaan membaca versi terbit terkini tanpa membocorkan draf, SHA atau provenance',async()=>{
    const s=setup();try{
      const before=await s.call();expect(before.headers.get('cache-control')).toContain('no-store');expect(before.headers.get('cloudflare-cdn-cache-control')).toBe('no-store');
      const entry=await s.operation('entry');let draft=await s.operation('save',{...s.guard(entry),data:{...base,judul:'Draf rahasia'}});
      const hidden=await(await s.call()).text();expect(hidden).not.toContain('Draf rahasia');expect(hidden).not.toContain('snapshot_id');expect(hidden).not.toContain(entry.publishedSha);
      await s.operation('publish',s.guard(draft));expect((await(await s.call()).json()).entries[0].data.judul).toBe('Draf rahasia');
      draft=await s.operation('withdraw',s.guard(await s.operation('entry')));await s.operation('publish',s.guard(draft));expect((await(await s.call()).json()).entries).toHaveLength(0);
      const retained=await s.operation('entry');expect(retained.data.judul).toBe('Draf rahasia');
      draft=await s.operation('save',{...s.guard(retained),data:retained.data});await s.operation('publish',s.guard(draft));expect((await(await s.call()).json()).entries).toHaveLength(1);
      draft=await s.operation('delete',s.guard(await s.operation('entry')));await s.operation('publish',s.guard(draft));expect((await(await s.call()).json()).entries).toHaveLength(0);
    }finally{s.db.close();}
  });
  test('flag, binding dan schema yang hilang tidak mengembalikan konten lama; endpoint hanya baca',async()=>{
    const s=setup();try{
      expect((await s.call('GET',{CMS_PUBLIC_LAYANAN_D1:'0'})).status).toBe(404);
      expect((await s.call('GET',{CMS_DB:undefined})).status).toBe(503);
      expect((await s.call('GET',{CMS_LAYANAN_D1:'0'})).status).toBe(503);
      expect((await s.call('POST')).status).toBe(405);const head=await s.call('HEAD');expect(head.status).toBe(200);expect(await head.text()).toBe('');
      s.db.raw.exec('DROP VIEW cms_published_content;');const failed=await s.call();expect(failed.status).toBe(503);expect(await failed.text()).not.toContain('SQLITE');
    }finally{s.db.close();}
  });
  test('urutan dan judul menentukan daftar; hanya layanan unggulan masuk Beranda tanpa batas empat',async()=>{
    const s=setup();try{
      for(let i=0;i<6;i++)s.db.raw.query('INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,snapshot_id) VALUES (?,?,?,?,?,?)').run('layanan','baru-'+i,'src/content/layanan/baru-'+i+'.md',JSON.stringify({...base,judul:'Baru '+i,urutan:i,unggulan:i!==5}),'c'.repeat(40),'fixture');
      const entries=await publishedLayanan(s.env);expect(entries[0].data.judul).toBe('Baru 0');expect(entries[1].data.judul).toBe('Baru 1');
      const rendered=renderLayanan(entries,templates);expect(rendered.total).toBe(7);expect(rendered.featured).toBe(6);expect(rendered.cards).not.toContain('Baru 5');expect(rendered.items).toContain('Baru 5');
    }finally{s.db.close();}
  });
  test('HTML pada judul, ringkasan, daftar dan Markdown tidak dapat menjalankan skrip',()=>{
    const attack='<img src=x onerror=alert(1)>';
    const output=renderLayanan([{slug:'aman',data:{...base,judul:attack,ringkasan:'__CMS_BODY__',persyaratan:[attack],alur:['</li><script>alert(1)</script>'],body:'**Catatan**\n\n[tautan](javascript:alert(1))\n\n<script>alert(1)</script>\n\n![foto](data:text/html,unsafe)'}}],templates);
    expect(output.items).not.toContain('<script>');expect(output.items).not.toContain('<img src=x');expect(output.items).not.toContain('href="javascript:');expect(output.items).not.toContain('src="data:');expect(output.items).toContain('&lt;img');expect(output.items).toContain('<strong>Catatan</strong>');expect(output.items).toContain('__CMS_BODY__');
    expect(output.cards).toContain('__CMS_BODY__');expect(output.cards).not.toContain('<strong>Catatan</strong>');
  });
  test('daftar kosong dan catatan kosong menghasilkan template yang tepat',()=>{
    const empty=renderLayanan([],templates);expect(empty.total).toBe(0);expect(empty.items).toBe('');expect(empty.updated).toBe('');
    const output=renderLayanan([{slug:'aman',data:{...base,body:'',alur:[],persyaratan:[],unggulan:false}}],templates);expect(output.featured).toBe(0);expect(output.cards).toBe('');expect(output.items).toContain('Persyaratan menyusul');expect(output.items).not.toContain('<div>');
    expect(()=>parseLayananTemplates('')).toThrow();
    expect(()=>renderLayanan([{slug:'aman',data:{...base}}],{...templates,'cms-card':'__CMS_UNKNOWN__'})).toThrow();
  });
});
