export const publicLayananEnabled = (env) => env.CMS_PUBLIC_LAYANAN_D1 === '1';
export const PUBLIC_HEADERS = { 'cache-control': 'no-store, max-age=0', 'cdn-cache-control': 'no-store', 'cloudflare-cdn-cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export async function publishedLayanan(env) {
  if (!env.CMS_DB || env.CMS_LAYANAN_D1 !== '1') throw new Error('Penyimpanan layanan belum tersedia.');
  const result = await env.CMS_DB.prepare('SELECT slug, data_json FROM cms_published_content WHERE collection = ?').bind('layanan').all();
  return result.results.map(({ slug, data_json }) => {
    const data = JSON.parse(data_json);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || !data || Array.isArray(data) || typeof data !== 'object' || typeof data.judul !== 'string' || typeof data.ringkasan !== 'string' || !Array.isArray(data.persyaratan || []) || !Array.isArray(data.alur || [])) throw new Error('Data layanan belum dapat dibaca.');
    return { slug, data };
  }).sort((a, b) => (a.data.urutan ?? 100) - (b.data.urutan ?? 100) || a.data.judul.localeCompare(b.data.judul, 'id') || a.slug.localeCompare(b.slug));
}
