import { susunBagan } from '../src/lib/bagan.ts';
import { ringkasJadwal } from '../src/lib/jam-layanan.ts';
import { formatAngka,formatNomorWhatsapp,tautanWhatsapp } from '../src/lib/format.ts';
import { JEDA_HURUF_JUDUL,JEDA_HURUF_SUBJUDUL,jedaSubjudulKetik } from '../src/lib/teks-ketik.ts';
import { dateLabel } from './collections-template.js';
export const escapeHtml = (value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fill = (html,values)=>html.replace(/__CMS_[A-Z]+(?:_[A-Z]+)*__/g,(key)=>{if(!Object.hasOwn(values,key))throw new Error('Template Pengaturan tidak lengkap: '+key);return values[key];});
// Extract a balanced element from our own build artifact, including nested divs.
function element(html,pattern) {
  const start = pattern.exec(html);if(!start)throw new Error('Fragmen Pengaturan tidak tersedia.');
  const tag = /^<(\w+)/.exec(start[0])[1],tokens = new RegExp('</?'+tag+'\\b[^>]*>','g');tokens.lastIndex=start.index;
  let depth=0,token;while((token=tokens.exec(html))){depth+=token[0].startsWith('</')?-1:1;if(depth===0)return html.slice(start.index,tokens.lastIndex);}
  throw new Error('Fragmen Pengaturan terpotong.');
}
const replaceContents = (html,value)=>html.slice(0,html.indexOf('>')+1)+value+html.slice(html.lastIndexOf('</'));
function row(html,marker,tag='li') {
  for(const match of html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','g'))){const item=element(html.slice(match.index),new RegExp('^<'+tag+'\\b[^>]*>'));if(item.includes(marker))return item;}
  throw new Error('Baris Pengaturan tidak tersedia.');
}
export function parsePengaturanTemplates(html) {
  const t = Object.fromEntries([...html.matchAll(/<template id="([a-z-]+)">([\s\S]*?)<\/template>/g)].map(([,id,body])=>[id,body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replaceAll('/__CMS_IMAGE__','__CMS_IMAGE__').replaceAll('https://cms.invalid/','').replaceAll('Kelurahan Walian','__CMS_SITE_NAME__').replaceAll('Lurah Walian','__CMS_LURAH_LABEL__').replaceAll('Kota Tomohon','Kota __CMS_CITY_NAME__')]));
  for(const name of ['hero','hero-slide','hero-empty','hero-point','intro-photo','intro-empty','contact','footer','complaint','profile-heading','structure','node-root','node-child','node-side','region','region-empty','region-row','vision',...['environment','family','population','area'].flatMap((kind)=>['stat-'+kind,'stat-empty-'+kind])])if(!t['cms-'+name])throw new Error('Template Pengaturan belum tersedia.');
  t.slide=element(t['cms-hero-slide'],/<div\b[^>]*id="hero-foto-0"[^>]*>/).replaceAll('hero-foto-0','hero-foto-__CMS_INDEX__').replaceAll('object-center','object-__CMS_POSITION__');
  t.point=element(t['cms-hero-point'],/<button\b[^>]*data-hero-pilih="0"[^>]*>/).replaceAll('data-hero-pilih="0"','data-hero-pilih="__CMS_INDEX__"').replaceAll('hero-foto-0','hero-foto-__CMS_INDEX__').replace(/aria-label="[^"]*"/,'aria-label="__CMS_POINT_LABEL__"');
  t.fallback=element(t['cms-hero-empty'],/<div\b[^>]*class="absolute inset-0 overflow-hidden bg-sage-100"[^>]*>/);
  for(const name of ['cms-contact','cms-footer','cms-complaint']){
    t[name]=t[name].replaceAll('cms@cms.invalid','__CMS_EMAIL__').replaceAll('628000000001','__CMS_PHONE__').replaceAll(formatNomorWhatsapp('628000000001'),'__CMS_PHONE_LABEL__');
    if(name==='cms-contact'){
      t[name]=t[name].replace(/data-status-layanan="[^"]*"/,'data-status-layanan="__CMS_SCHEDULE__"').replace(/<iframe([^>]*?)src="[^"]*"/,'<iframe$1src="__CMS_MAP_EMBED__"');
      t.contactPhone=row(t[name],'__CMS_PHONE__');t[name]=t[name].replace(t.contactPhone,'__CMS_CONTACT_PHONE__');
      t.contactEmail=row(t[name],'__CMS_EMAIL__');t[name]=t[name].replace(t.contactEmail,'__CMS_CONTACT_EMAIL__');
    }else if(name==='cms-footer'){
      t.footerPhone=row(t[name],'__CMS_PHONE_LABEL__');t[name]=t[name].replace(t.footerPhone,'__CMS_FOOTER_PHONE__');
      t.footerEmail=row(t[name],'__CMS_EMAIL__');t[name]=t[name].replace(t.footerEmail,'__CMS_FOOTER_EMAIL__');
      t.link=row(t[name],'__CMS_LINK_URL__');t[name]=t[name].replace(t.link,'__CMS_LINKS__');
      t.social=Object.fromEntries(['facebook','instagram','youtube','tiktok'].map((platform)=>[platform,row(t[name],'aria-label="'+platform+'"')]));
      const social=element(t[name],/<ul\b[^>]*class="mt-6 flex gap-2"[^>]*>/);t[name]=t[name].replace(social,replaceContents(social,'__CMS_SOCIAL__'));
    }else{
      t.complaintPhone=element(t[name],/<a\b[^>]*href="https:\/\/wa.me\/[^"]*"[^>]*>/);t[name]=t[name].replace(t.complaintPhone,'__CMS_COMPLAINT_PHONE__');
    }
  }
  for(const kind of ['root','child','side'])t['cms-node-'+kind]=t['cms-node-'+kind].replace('<span class="block">__CMS_NAMES__</span>','__CMS_NAMES__').replace('data-motion-delay="200"','data-motion-delay="__CMS_DELAY__"').replace(/<\/li>$/,'__CMS_BRANCHES__</li>');
  const region=t['cms-region-row'];
  t.environmentRow=row(region,'__CMS_ENVIRONMENT_NAME__','tr');t.environmentCard=row(region,'__CMS_ENVIRONMENT_NAME__');
  for(const key of ['environmentRow','environmentCard','cms-region'])t[key]=t[key].replaceAll('1.234.567','__CMS_FAMILY__').replaceAll('2.345.678','__CMS_POPULATION__').replaceAll('3.456.789','__CMS_AREA__');
  t.mission=row(t['cms-vision'],'__CMS_MISSION__');t['cms-vision']=t['cms-vision'].replace(t.mission,'__CMS_MISSIONS__');
  t.programs=element(t['cms-vision'],/<div\b[^>]*data-motion="content"[^>]*class="mt-8 rounded-2xl[^>]*>/);
  t.program=row(t.programs,'__CMS_PROGRAM__');t.programs=t.programs.replace(t.program,'__CMS_PROGRAMS__').replace('1 program unggulan','__CMS_PROGRAM_COUNT__ program unggulan');t['cms-vision']=t['cms-vision'].replace(element(t['cms-vision'],/<div\b[^>]*data-motion="content"[^>]*class="mt-8 rounded-2xl[^>]*>/),'__CMS_PROGRAM_PANEL__');
  t.visionSource=element(t['cms-vision'],/<p\b[^>]*data-motion="content"[^>]*class="mt-6 text-sm[^>]*>/);t['cms-vision']=t['cms-vision'].replace(t.visionSource,'__CMS_SOURCE_LINK__');
  return t;
}
export function typedText(text,delay=0,interval=JEDA_HURUF_JUDUL) {
  const segmenter=new Intl.Segmenter('id',{granularity:'grapheme'});let index=0;
  return text.split(/(\s+)/).filter(Boolean).map((word)=>{
    if(/^\s+$/.test(word)){index+=Array.from(segmenter.segment(word)).length;return escapeHtml(word);}
    return '<span class="inline-block max-w-full">'+Array.from(segmenter.segment(word),({segment})=>'<span class="hero-huruf" style="--jeda-huruf: '+(delay+index++*interval)+'ms">'+escapeHtml(segment)+'</span>').join('')+'</span>';
  }).join('');
}
export function renderPengaturan(data,t,wisataHref) {
  const {situs:s,beranda:b,profil:p}=data,photos=b.hero.foto.filter((foto)=>foto.gambar.trim());
  const values={__CMS_SITE_NAME__:escapeHtml(s.namaKelurahan),__CMS_DISTRICT__:escapeHtml(s.kecamatan),__CMS_CITY_NAME__:escapeHtml(s.kota),__CMS_PROVINCE__:escapeHtml(s.provinsi),__CMS_ADDRESS__:escapeHtml(s.alamat),__CMS_CREDIT__:escapeHtml(s.kredit),__CMS_LURAH_LABEL__:escapeHtml('Lurah '+s.namaKelurahan.replace(/^Kelurahan\s+/i,'')),__CMS_LURAH_NAME__:escapeHtml(p.lurah.nama),__CMS_SUMMARY__:escapeHtml(p.ringkasan),__CMS_IMAGE__:escapeHtml(p.lurah.foto||''),__CMS_PHONE__:escapeHtml(s.whatsapp),__CMS_PHONE_LABEL__:escapeHtml(formatNomorWhatsapp(s.whatsapp||'')),__CMS_EMAIL__:escapeHtml(s.email),__CMS_SCHEDULE__:escapeHtml(JSON.stringify(s.jamLayanan)),__CMS_DIRECTIONS__:escapeHtml(s.googleMapsUrl||`https://www.google.com/maps/dir/?api=1&destination=${s.koordinat.lat},${s.koordinat.lng}`),__CMS_MAP_EMBED__:escapeHtml(`https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${s.koordinat.lat},${s.koordinat.lng}!6i15`),__CMS_YEAR__:escapeHtml(p.sumberData.tahun),__CMS_SOURCE__:escapeHtml(p.sumberData.sumber),__CMS_VISION__:escapeHtml(p.visi),__CMS_VISION_SOURCE__:escapeHtml(p.sumberVisiMisi||'')};
  values.__CMS_CONTACT_PHONE__=s.whatsapp?fill(t.contactPhone,values):'';values.__CMS_CONTACT_EMAIL__=s.email?fill(t.contactEmail,values):'';
  values.__CMS_FOOTER_PHONE__=s.whatsapp?fill(t.footerPhone,values):'';values.__CMS_FOOTER_EMAIL__=s.email?fill(t.footerEmail,values):'';
  values.__CMS_COMPLAINT_PHONE__=s.whatsapp?fill(t.complaintPhone,values):'';
  values.__CMS_LINKS__=s.tautanPenting.map((link)=>fill(t.link,{__CMS_LINK_LABEL__:escapeHtml(link.label),__CMS_LINK_URL__:escapeHtml(link.url)})).join('');
  values.__CMS_SOCIAL__=s.mediaSosial.map((link)=>fill(t.social[link.platform],{__CMS_SOCIAL_URL__:escapeHtml(link.url)})).join('');
  values.__CMS_HOURS__=ringkasJadwal(s.jamLayanan.jadwal).map((hours)=>'<p class="text-ink-muted">'+escapeHtml(hours.hari+': '+hours.jam)+'</p>').join('');
  values.__CMS_HERO_TITLE__=escapeHtml(b.hero.judul);values.__CMS_HERO_SUBTITLE__=escapeHtml(b.hero.subjudul);
  values.__CMS_TYPED_TITLE__=typedText(b.hero.judul);values.__CMS_TYPED_SUBTITLE__=typedText(b.hero.subjudul,jedaSubjudulKetik(b.hero.judul),JEDA_HURUF_SUBJUDUL);
  values.__CMS_SLIDES__=photos.length?photos.map((foto,index)=>{
    let slide=fill(t.slide,{__CMS_IMAGE__:escapeHtml(foto.gambar),__CMS_IMAGE_LABEL__:escapeHtml(foto.keterangan),__CMS_INDEX__:String(index),__CMS_POSITION__:{kiri:'left',tengah:'center',kanan:'right'}[foto.posisi]});
    if(index)slide=slide.replace(/\sdata-aktif(?:="[^"]*")?/,' aria-hidden="true"').replace('loading="eager"','loading="lazy"').replace('fetchpriority="high"','');return slide;
  }).join(''):fill(t.fallback,values);
  values.__CMS_POINTS__=photos.map((foto,index)=>{
    const button=fill(t.point,{__CMS_INDEX__:String(index),__CMS_POINT_LABEL__:escapeHtml(`Tampilkan foto ${index+1}: ${foto.keterangan}`)});return index?button.replace(/\sdata-aktif(?:="[^"]*")?/,'').replace('aria-current="true"',''):button;
  }).join('');values.__CMS_SLIDE_STATUS__=escapeHtml(`Foto 1 dari ${photos.length}: ${photos[0]?.keterangan||''}`);
  let hero=t['cms-hero'];if(photos.length<2){hero=hero.replace(/\sdata-hero-slideshow(?:="[^"]*")?/,'');hero=hero.replace(element(hero,/<div\b[^>]*data-hero-kontrol[^>]*>/),'');}
  if(!photos.length)hero=hero.replace(/(<span\b[^>]*data-label-foto) hidden/,'$1');
  const node=(item,kind='root',depth=0)=>{
    const branches=(item.samping.length?'<ul class="bagan-samping">'+item.samping.map((child)=>node(child,'side',depth+1)).join('')+'</ul>':'')+(item.bawahan.length?'<ul class="bagan-cabang">'+item.bawahan.map((child)=>node(child,'child',depth+1)).join('')+'</ul>':'');
    return fill(t['cms-node-'+kind],{__CMS_JOB__:escapeHtml(item.jabatan),__CMS_NAMES__:item.nama.length?item.nama.map((name)=>'<span class="block">'+escapeHtml(name)+'</span>').join(''):'[kosong]',__CMS_DELAY__:String(200+Math.min(depth,3)*180),__CMS_BRANCHES__:branches});
  };
  values.__CMS_TREE__=node(susunBagan(p.lurah.nama,p.strukturOrganisasi));
  const sum=(key)=>{const numbers=p.lingkungan.map((item)=>item[key]).filter((number)=>number!==null);return numbers.length?numbers.reduce((a,b)=>a+b,0):null;};
  const totals={__CMS_FAMILY__:sum('kepalaKeluarga'),__CMS_POPULATION__:sum('jumlahPenduduk'),__CMS_AREA__:sum('luasKm2')};
  Object.assign(values,Object.fromEntries(Object.entries(totals).map(([key,number])=>[key,escapeHtml(formatAngka(number)??'–')])));
  values.__CMS_STATS__=[p.lingkungan.length||null,totals.__CMS_FAMILY__,totals.__CMS_POPULATION__,totals.__CMS_AREA__].map((number,index)=>fill(t['cms-stat-'+(number===null?'empty-':'')+['environment','family','population','area'][index]],{__CMS_NUMBER__:escapeHtml(formatAngka(number))})).join('');
  const environment=(item,template)=>fill(template,{__CMS_ENVIRONMENT_NAME__:escapeHtml(item.nama),__CMS_HEAD__:escapeHtml(item.kepala||'[kosong]'),__CMS_DEPUTY__:escapeHtml(item.wakil||'[kosong]'),__CMS_FAMILY__:escapeHtml(formatAngka(item.kepalaKeluarga)??'–'),__CMS_POPULATION__:escapeHtml(formatAngka(item.jumlahPenduduk)??'–'),__CMS_AREA__:escapeHtml(formatAngka(item.luasKm2)??'–')});
  values.__CMS_ENVIRONMENT_ROWS__=p.lingkungan.map((item)=>environment(item,t.environmentRow)).join('');values.__CMS_ENVIRONMENT_CARDS__=p.lingkungan.map((item)=>environment(item,t.environmentCard)).join('');
  values.__CMS_MISSIONS__=p.misi.map((mission,index)=>fill(t.mission.replace('>1</span>','>__CMS_NUMBER__</span>'),{__CMS_MISSION__:escapeHtml(mission),__CMS_NUMBER__:String(index+1)})).join('');
  values.__CMS_PROGRAMS__=p.programUnggulan.map((program,index)=>fill(t.program.replace('>1.</span>','>__CMS_NUMBER__.</span>'),{__CMS_PROGRAM__:escapeHtml(program),__CMS_NUMBER__:String(index+1)})).join('');
  values.__CMS_PROGRAM_COUNT__=String(p.programUnggulan.length);values.__CMS_PROGRAM_PANEL__=p.programUnggulan.length?fill(t.programs,values):'';values.__CMS_SOURCE_LINK__=p.sumberVisiMisi?fill(t.visionSource,values):'';
  const title='Profil '+s.namaKelurahan;values.__CMS_PROFILE_TITLE__=escapeHtml(title);values.__CMS_TYPED_PROFILE_TITLE__=typedText(title);values.__CMS_TYPED_SUMMARY__=typedText(p.ringkasan,jedaSubjudulKetik(title),JEDA_HURUF_SUBJUDUL);
  const contact=fill(t['cms-contact'],values).replace(/href="https:\/\/wa.me\/[^"]*"/,()=>`href="${escapeHtml(tautanWhatsapp(s.whatsapp||'',`Halo Kantor ${s.namaKelurahan}, saya ingin bertanya tentang `))}"`);
  const complaint=fill(t['cms-complaint'],values).replace(/href="https:\/\/wa.me\/[^"]*"/,()=>`href="${escapeHtml(tautanWhatsapp(s.whatsapp||'',`Halo Kantor ${s.namaKelurahan}, saya ingin menyampaikan keluhan atau masukan: `))}"`);
  let footer=fill(t['cms-footer'],values);if(wisataHref)footer=footer.replace(/href="\/(?:wisata|#wisata)"/g,()=>`href="${escapeHtml(wisataHref)}"`);
  return {hero:fill(hero,values),intro:fill(t[p.lurah.foto?'cms-intro-photo':'cms-intro-empty'],values),contact,footer,complaint,heading:fill(t['cms-profile-heading'],values),structure:fill(t['cms-structure'],values),region:fill(t[p.lingkungan.length?'cms-region':'cms-region-empty'],values),vision:fill(t['cms-vision'],values),updated:dateLabel(p.diperbarui)};
}
