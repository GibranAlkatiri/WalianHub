import { collectionD1Enabled, publicCollectionEnabled, validateDestinasi, validatePengumuman } from './cms-collections.js';
import { susunWisata, tautanPetaDestinasi } from '../src/lib/wisata.ts';
export {publicCollectionEnabled, susunWisata, tautanPetaDestinasi};
const categories = {fields:[{name:'kategori',options:['Alam','Budaya','Kuliner','Religi','Olahraga','Lainnya']}]};
export async function publishedCollection(env, name) {
  if (!env.CMS_DB || !collectionD1Enabled(env,name)) throw new Error('Penyimpanan konten belum tersedia.');
  const rows = await env.CMS_DB.prepare('SELECT slug, data_json FROM cms_published_content WHERE collection = ?').bind(name).all();
  return rows.results.map(({slug,data_json}) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || (name === 'pengumuman' && slug !== 'pengumuman')) throw new Error('Konten tidak dikenali.');
    const data = (name === 'destinasi' ? validateDestinasi : validatePengumuman)(JSON.parse(data_json),categories,true);
    return {id:slug,slug,data};
  });
}
export async function publishedDestinasi(env) { return susunWisata(await publishedCollection(env,'destinasi')); }
export async function publishedPengumuman(env) {
  const entries = await publishedCollection(env,'pengumuman');
  return (entries[0]?.data.daftar || []).sort((a,b) => b.tanggal.localeCompare(a.tanggal));
}
