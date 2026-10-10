import { pengaturanSchemas } from './cms-pengaturan.js';
import { collectionD1Enabled } from './cms-collections.js';
export async function publishedPengaturan(env) {
  if (!env.CMS_DB || !collectionD1Enabled(env,'pengaturan')) throw new Error('Pengaturan belum tersedia.');
  const rows = await env.CMS_DB.prepare("SELECT slug,data_json FROM cms_published_content WHERE collection = 'pengaturan'").all();
  const result = {};
  for (const {slug,data_json} of rows.results) {
    if (!Object.hasOwn(pengaturanSchemas,slug)) throw new Error('Pengaturan tidak dikenali.');
    const data = pengaturanSchemas[slug].parse(JSON.parse(data_json));
    if (slug === 'profil') data.diperbarui = data.diperbarui.toISOString().slice(0,10);
    result[slug] = data;
  }
  if (Object.keys(result).length !== 3) throw new Error('Pengaturan belum lengkap.');
  return result;
}
