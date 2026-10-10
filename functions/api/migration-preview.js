const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  // A preview flag never opens this probe on the production domain.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const preview = url.hostname.endsWith('.walianhub-8ib.pages.dev') && env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== 'main';
  if (env.CMS_MIGRATION_PREVIEW !== '1' || (!local && !preview)) return new Response(null, { status: 404, headers });
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Metode tidak didukung.' }), { status: 405, headers: { ...headers, allow: 'GET' } });
  if (!env.CMS_DB) return new Response(JSON.stringify({ error: 'D1 pengujian belum terhubung.' }), { status: 503, headers });
  try {
    const result = await env.CMS_DB.prepare('SELECT slug, data_json, version FROM cms_published_content WHERE collection = ? ORDER BY slug').bind('layanan').all();
    return new Response(JSON.stringify({ entries: result.results.map(({ slug, data_json, version }) => ({ slug, data: JSON.parse(data_json), version })) }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Data pengujian belum tersedia.' }), { status: 503, headers });
  }
}
