import { tautanPetaDestinasi } from '../src/lib/wisata.ts';
const escape = (value) => String(value ?? '').replace(/[&<>"']/g,(char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fill = (template,values) => template.replace(/__CMS_[A-Z]+(?:_[A-Z]+)*__/g,(marker) => { if (!Object.hasOwn(values,marker)) throw new Error('Template konten tidak lengkap.');return values[marker]; });
export const dateLabel = (date) => new Date(date + 'T00:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'});
export function parseCollectionTemplates(html) {
  const templates = Object.fromEntries([...html.matchAll(/<template id="([a-z-]+)">([\s\S]*?)<\/template>/g)].map(([,name,body]) => [name,body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replaceAll('/__CMS_IMAGE__','__CMS_IMAGE__').replaceAll('https://cms.invalid/__CMS_MAP__','__CMS_MAP__')]));
  for (const name of ['cms-destination-photo','cms-destination-empty','cms-destination-point','cms-announcement-normal','cms-announcement-important']) if (!templates[name]) throw new Error('Template konten belum tersedia.');
  for (const name of ['cms-announcement-normal','cms-announcement-important']) {
    const row = templates[name].match(/<li\b[\s\S]*?<\/li>/)?.[0];if (!row) throw new Error('Template pengumuman belum tersedia.');templates[name] = row;
  }
  return templates;
}
export function renderDestinasi(wisata, templates, home) {
  const list = home ? wisata.pilihan : wisata.semua;
  const cards = list.map(({data}) => {
    const card = fill(templates[data.gambar ? 'cms-destination-photo' : 'cms-destination-empty'],{__CMS_TITLE__:escape(data.nama),__CMS_CATEGORY__:escape(data.kategori),__CMS_SUMMARY__:escape(data.ringkasan),__CMS_IMAGE__:escape(data.gambar),__CMS_MAP__:escape(tautanPetaDestinasi(data.lokasi,data.lokasi.alamat))});
    return home ? '<div class="w-[85%] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none">' + card + '</div>' : card;
  }).join('');
  const points = home ? list.map(({data},index) => fill(templates['cms-destination-point'],{__CMS_INDEX__:String(index),__CMS_POINT_LABEL__:escape(`Tampilkan destinasi ${index + 1}: ${data.nama}`)}).replace('<button ',index === 0 ? '<button data-aktif="" aria-current="true" ' : '<button ')).join('') : '';
  return {cards,points,total:wisata.semua.length,count:list.length,href:wisata.href,all:wisata.pakaiHalaman,updated:wisata.semua.reduce((date,entry) => entry.data.diperbarui > date ? entry.data.diperbarui : date,'')};
}
export function renderPengumuman(items,templates) {
  return items.map((item) => fill(templates[item.penting ? 'cms-announcement-important' : 'cms-announcement-normal'],{__CMS_TITLE__:escape(item.judul),__CMS_TEXT__:escape(item.isi),__CMS_DATE__:escape(item.tanggal),__CMS_DATE_LABEL__:dateLabel(item.tanggal)})).join('');
}
