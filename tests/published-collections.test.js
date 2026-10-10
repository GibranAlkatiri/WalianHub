import {test,expect} from 'bun:test';
import {renderDestinasi,renderPengumuman,parseCollectionTemplates} from '../server/collections-template.js';
import {susunWisata} from '../src/lib/wisata.ts';
const templates=parseCollectionTemplates([
  ['cms-destination-photo','<article><img src="/__CMS_IMAGE__" alt="__CMS_TITLE__"><h3>__CMS_TITLE__</h3><p>__CMS_SUMMARY__</p><span>__CMS_CATEGORY__</span><a href="https://cms.invalid/__CMS_MAP__">Cek Lokasi</a></article>'],
  ['cms-destination-empty','<article><h3>__CMS_TITLE__</h3><p>__CMS_SUMMARY__</p><a href="https://cms.invalid/__CMS_MAP__">Cek Lokasi</a><span>Foto belum tersedia</span></article>'],
  ['cms-destination-point','<button data-carousel-titik="__CMS_INDEX__" aria-label="__CMS_POINT_LABEL__"></button>'],
  ['cms-announcement-normal','<section><ul><li><time datetime="__CMS_DATE__">__CMS_DATE_LABEL__</time><h3>__CMS_TITLE__</h3><p>__CMS_TEXT__</p></li></ul></section>'],
  ['cms-announcement-important','<section><ul><li><span>Penting</span><time datetime="__CMS_DATE__">__CMS_DATE_LABEL__</time><h3>__CMS_TITLE__</h3><p>__CMS_TEXT__</p></li></ul></section>'],
].map(([name,body])=>`<template id="${name}">${body}</template>`).join(''));
const entries=(n)=>Array.from({length:n},(_,index)=>({id:'wisata-'+index,slug:'wisata-'+index,data:{nama:'Wisata '+index,kategori:'Alam',ringkasan:'Ringkasan '+index,gambar:index===0?'/media/00000000-0000-4000-8000-000000000000.png':'',lokasi:{alamat:'Walian',lat:1,lng:124},unggulan:index===n-1,urutan:index,diperbarui:'2026-10-10'}}));
test('kartu dan carousel 0/1/4/5 destinasi memakai aturan dan tautan website yang sama',()=>{
  for(const count of [0,1,4,5,8]){
    const wisata=susunWisata(entries(count)),home=renderDestinasi(wisata,templates,true),list=renderDestinasi(wisata,templates,false);
    expect(home.count).toBe(Math.min(count,4));expect(home.points.match(/<button/g)?.length||0).toBe(home.count);expect(list.cards.match(/<article/g)?.length||0).toBe(count);
    expect(home.href).toBe(count>4?'/wisata':'/#wisata');expect(home.all).toBe(count>4);expect(home.updated).toBe(count?'2026-10-10':'');
    if(count){expect(home.points).toContain('aria-current="true"');expect(home.cards).not.toContain('//media/');}
  }
});
test('nama, foto, tautan lokasi, kategori, dan pengumuman di-escape sekali tanpa menjalankan HTML atau marker lain',()=>{
  const data={...entries(1)[0].data,nama:'"><script>alert(1)</script>',ringkasan:'__CMS_IMAGE__',kategori:'<img onerror=bad>',gambar:'/images/x" onerror="bad.png',lokasi:{alamat:'https://maps.example/" onclick="bad',lat:1,lng:124}};
  const output=renderDestinasi(susunWisata([{id:'aman',data}]),templates,true);
  expect(output.cards).not.toContain('<script>');expect(output.cards).not.toContain('src="/images/x"');expect(output.cards).toContain('&lt;script&gt;');expect(output.cards).toContain('__CMS_IMAGE__');expect(output.cards).not.toContain('href="https://maps.example/" onclick=');
  const announcements=renderPengumuman([{judul:'<script>bad</script>',isi:'__CMS_DATE__\nBaris kedua',tanggal:'2026-10-10',penting:true}],templates);
  expect(announcements).not.toContain('<section>');expect(announcements).not.toContain('<script>');expect(announcements).toContain('Penting');expect(announcements).toContain('10 Oktober 2026');expect(announcements).toContain('__CMS_DATE__\nBaris kedua');expect(renderPengumuman([],templates)).toBe('');
  expect(()=>parseCollectionTemplates('')).toThrow();expect(()=>renderDestinasi(susunWisata(entries(1)),{...templates,'cms-destination-photo':'__CMS_UNKNOWN__'},true)).toThrow();
});
