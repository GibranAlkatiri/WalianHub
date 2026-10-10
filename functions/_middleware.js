import { publicLayananEnabled, publishedLayanan, PUBLIC_HEADERS } from '../server/published-layanan.js';
import { parseLayananTemplates, renderLayanan } from '../server/layanan-template.js';
import { publicCollectionEnabled, publishedDestinasi, publishedPengumuman } from '../server/published-collections.js';
import { parseCollectionTemplates, renderDestinasi, renderPengumuman, dateLabel } from '../server/collections-template.js';
import { publishedPengaturan } from '../server/published-pengaturan.js';
import { parsePengaturanTemplates, renderPengaturan } from '../server/pengaturan-template.js';

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  const home = ['/', '/index.html'].includes(path);
  const services = ['/layanan', '/layanan/', '/layanan/index.html'].includes(path);
  const destinations = ['/wisata','/wisata/','/wisata/index.html'].includes(path);
  const profile = ['/profil','/profil/','/profil/index.html'].includes(path);
  const serviceD1 = (home || services) && publicLayananEnabled(env);
  const destinationD1 = (home || services || destinations || profile) && publicCollectionEnabled(env,'destinasi');
  const announcementD1 = services && publicCollectionEnabled(env,'pengumuman');
  const settingsD1 = (home || services || destinations || profile) && publicCollectionEnabled(env,'pengaturan');
  if (!serviceD1 && !destinationD1 && !announcementD1 && !settingsD1) return context.next();
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status:405, headers:{...PUBLIC_HEADERS, allow:'GET, HEAD'} });
  // Static validators must not turn a fresh D1 read into a stale 304 response.
  const headers = new Headers(request.headers);
  for (const name of ['if-none-match', 'if-modified-since', 'range', 'if-range', 'accept-encoding']) headers.delete(name);
  const asset = await env.ASSETS.fetch(new Request(request.url, { headers }));
  if (!asset.ok || !asset.headers.get('content-type')?.includes('text/html')) return asset;
  let settings,settingsTemplates;
  const settingsUnavailable = async () => {
    await asset.body?.cancel();
    return new Response(request.method === 'HEAD' ? null : '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informasi belum tersedia</title><main><h1>Informasi website belum dapat dimuat.</h1><p>Silakan muat ulang sebentar lagi.</p><a href="">Muat ulang</a></main></html>',{status:503,headers:{...PUBLIC_HEADERS,'content-type':'text/html; charset=utf-8','retry-after':'5'}});
  };
  if (settingsD1) try {
    const [data,template] = await Promise.all([publishedPengaturan(env),env.ASSETS.fetch(new Request(new URL('/cms-templates/pengaturan',request.url)))]);
    if (!template.ok) throw new Error('Template tidak tersedia.');settings=data;settingsTemplates=parsePengaturanTemplates(await template.text());
  } catch {return settingsUnavailable();}
  let content, status = 200, error = false;
  if (serviceD1) try {
    const [entries, template] = await Promise.all([
      publishedLayanan(env), env.ASSETS.fetch(new Request(new URL('/cms-templates/layanan', request.url))),
    ]);
    if (!template.ok) throw new Error('Template tidak tersedia.');
    content = renderLayanan(entries, parseLayananTemplates(await template.text()), home ? 'home' : 'list');
  } catch {
    // Never resurrect withdrawn services from the old build during an outage.
    content = { cards:'', items:'', total:0, featured:0, updated:'' };status = 503;error = true;
  }
  let wisata, wisataContent = {cards:'',points:'',count:0,total:0,all:false,href:'/#wisata',updated:''}, wisataError = false;
  let announcements = '', announcementError = false;
  let templates;
  if ((destinationD1 && (home || destinations)) || announcementD1) {
    try {
      const asset = await env.ASSETS.fetch(new Request(new URL('/cms-templates/collections',request.url)));
      if (!asset.ok) throw new Error('Template tidak tersedia.');templates = parseCollectionTemplates(await asset.text());
    } catch { templates = null; }
  }
  if (destinationD1) try {
    wisata = await publishedDestinasi(env);
    wisataContent.href = wisata.href;
    if (home || destinations) {
      if (!templates) throw new Error('Template tidak tersedia.');
      wisataContent = renderDestinasi(wisata,templates,home);
    }
  } catch { wisataError = true;status = 503; }
  if (announcementD1) try {
    if (!templates) throw new Error('Template tidak tersedia.');
    announcements = renderPengumuman(await publishedPengumuman(env),templates);
  } catch { announcementError = true;status = 503; }
  const visible = (element, show) => show ? element.removeAttribute('hidden') : element.setAttribute('hidden', '');
  const rewriter = new HTMLRewriter();
  if (settingsD1) {
    let parts;try {parts=renderPengaturan(settings,settingsTemplates,destinationD1 ? wisataContent.href : undefined);}catch {return settingsUnavailable();}
    const site=settings.situs;
    const title=home?`${site.namaKelurahan} · Kecamatan ${site.kecamatan}, Kota ${site.kota}`:`${profile?'Profil':services?'Layanan':'Wisata'} · ${site.namaKelurahan}`;
    const description=home?`Website resmi ${site.namaKelurahan}, Kecamatan ${site.kecamatan}, Kota ${site.kota}: informasi layanan, profil wilayah, dan wisata.`:profile?`Struktur organisasi, wilayah, penduduk, serta visi dan misi ${site.namaKelurahan}.`:services?`Informasi persyaratan, alur, dan pengumuman layanan ${site.namaKelurahan}.`:`Destinasi wisata di ${site.namaKelurahan}, Kota ${site.kota}.`;
    for (const [selector,text] of [['[data-cms-site-name]',site.namaKelurahan],['[data-cms-district]',site.kecamatan],['[data-cms-city]','Kota '+site.kota],['title',title],['[data-cms-profile-updated]','Terakhir diperbarui: '+parts.updated]]) rewriter.on(selector,{element(element){element.setInnerContent(text);}});
    for (const [selector,value] of [['meta[property="og:site_name"]',site.namaKelurahan],['meta[property="og:title"]',title],['meta[property="og:description"]',description],['meta[name="description"]',description]]) rewriter.on(selector,{element(element){element.setAttribute('content',value);}});
    if (home) {
      const image=settings.beranda.hero.foto.find((foto)=>foto.gambar.trim())?.gambar;
      rewriter.on('meta[property="og:image"]',{element(element){element.setAttribute('content',new URL(image && /\.(jpe?g|png|webp)$/i.test(image)?image:'/images/default-og.png',request.url).href);}})
        .on('meta[property="og:image:width"],meta[property="og:image:height"]',{element(element){if(image)element.remove();}});
    }
    rewriter.on('[data-status-layanan]',{element(element){element.setAttribute('data-status-layanan',JSON.stringify(site.jamLayanan));}});
    for(const [selector,key] of [['footer','footer'],...(home?[['[data-hero-foto]','hero'],['section#profil','intro'],['section#kontak','contact']]:[]),...(profile?[['[data-cms-profile-heading]','heading'],['section#struktur-organisasi','structure'],['section#wilayah','region'],['section#visi-misi','vision']]:[]),...(services?[['section#pengaduan','complaint']]:[])]) rewriter.on(selector,{element(element){element.replace(parts[key],{html:true});}});
  }
  if (serviceD1) rewriter
    .on('[data-cms-service-cards]', { element(element) { element.setInnerContent(content.cards, {html:true});visible(element, content.featured > 0); } })
    .on('[data-cms-service-list]', { element(element) { element.setInnerContent(content.items, {html:true});visible(element, content.total > 0); } })
    .on('[data-cms-services-empty]', { element(element) {
      visible(element, home ? content.featured === 0 : content.total === 0);
      element.setInnerContent(error ? 'Informasi layanan belum dapat dimuat. Silakan muat ulang.' : home && content.total > 0 ? 'Lihat daftar lengkap untuk informasi layanan kelurahan.' : 'Daftar layanan sedang disiapkan.');
      if (error) element.setAttribute('role', 'status');
    } })
    .on('[data-cms-all-services]', { element(element) { visible(element, !error && content.total > content.featured); } })
    .on('[data-cms-services-updated]', { element(element) {
      visible(element, !!content.updated);
      if (content.updated) element.setInnerContent('Terakhir diperbarui: ' + new Date(content.updated + 'T00:00:00Z').toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'}));
      else element.setInnerContent('');
    } });
  if (destinationD1) rewriter
    .on('[data-cms-destination-cards], [data-cms-destination-list]', {element(element) {
      element.setInnerContent(wisataContent.cards,{html:true});visible(element,wisataContent.count > 0);
      if (home) element.setAttribute('class',(element.getAttribute('class') || '').replace(/lg:grid-cols-[34]/g,wisataContent.count === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'));
    }})
    .on('[data-cms-destination-points]', {element(element) {element.setInnerContent(wisataContent.points,{html:true});}})
    .on('[data-cms-destinations-carousel]', {element(element) {visible(element,wisataContent.count > 0);}})
    .on('[data-cms-destinations-empty]', {element(element) {
      visible(element,wisataContent.count === 0);
      element.setInnerContent(wisataError ? 'Informasi wisata belum dapat dimuat. Silakan muat ulang.' : 'Informasi destinasi wisata sedang disiapkan.');
    }})
    .on('[data-cms-all-destinations]', {element(element) {visible(element,!wisataError && wisataContent.all);}})
    .on('[data-cms-destinations-updated]', {element(element) {visible(element,!!wisataContent.updated);element.setInnerContent(wisataContent.updated ? 'Terakhir diperbarui: ' + dateLabel(wisataContent.updated) : '');}})
    .on('a[href="/wisata"], a[href="/#wisata"]', {element(element) {element.setAttribute('href',wisataError ? '/#wisata' : wisataContent.href);}});
  if (announcementD1) rewriter
    .on('[data-cms-announcements]', {element(element) {visible(element,!!announcements || announcementError);}})
    .on('[data-cms-announcement-list]', {element(element) {element.setInnerContent(announcements,{html:true});visible(element,!!announcements);}})
    .on('[data-cms-announcements-error]', {element(element) {visible(element,announcementError);}});
  const dynamicHeaders = new Headers(asset.headers);
  for (const name of ['etag', 'last-modified', 'content-length', 'content-encoding']) dynamicHeaders.delete(name);
  for (const [name,value] of Object.entries(PUBLIC_HEADERS)) dynamicHeaders.set(name,value);
  if (serviceD1) dynamicHeaders.set('x-walian-layanan', 'd1');
  if (destinationD1) dynamicHeaders.set('x-walian-destinasi', 'd1');
  if (announcementD1) dynamicHeaders.set('x-walian-pengumuman', 'd1');
  if (settingsD1) dynamicHeaders.set('x-walian-pengaturan','d1');
  if (error || wisataError || announcementError) dynamicHeaders.set('retry-after', '5');
  if (request.method === 'HEAD') {
    await asset.body?.cancel();
    return new Response(null, {status, headers:dynamicHeaders});
  }
  return rewriter.transform(new Response(asset.body, {status, headers:dynamicHeaders}));
}
